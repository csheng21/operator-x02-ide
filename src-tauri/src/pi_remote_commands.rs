// ============================================================================
// 🍓 RASPBERRY PI REMOTE INTEGRATION — Operator X02
// src-tauri/src/pi_remote_commands.rs
//
// Rewritten to use russh (pure Rust SSH) — eliminates openssl-sys vendored
// build that caused long compile times. No C compilation required.
//
// Crates: russh 0.44, russh-keys 0.44, russh-sftp 2.0, async-trait 0.1
// ============================================================================

use async_trait::async_trait;
use russh::client::{self, Handle};
use russh_keys::key::PublicKey;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

// ============================================================================
// SSH CLIENT HANDLER — accepts all host keys (trust-on-first-use)
// ============================================================================

struct ClientHandler;

#[async_trait]
impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

pub struct PiState {
    pub sessions: Mutex<HashMap<String, PiSession>>,
    pub saved_devices: Mutex<Vec<PiDeviceConfig>>,
}

impl PiState {
    pub fn new() -> Self {
        PiState {
            sessions: Mutex::new(HashMap::new()),
            saved_devices: Mutex::new(Vec::new()),
        }
    }
}

// ✅ Wrap Handle in Arc — Arc<T> is Clone when T: Send+Sync.
//    Clone the Arc out of MutexGuard before any .await to avoid
//    holding the lock across async points.
struct PiSession {
    handle: Arc<Handle<ClientHandler>>,
    config: PiDeviceConfig,
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiDeviceConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiDeviceInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub auth_type: String,
    pub status: String,
    pub model: Option<String>,
    pub os: Option<String>,
    pub memory_total: Option<String>,
    pub memory_free: Option<String>,
    pub cpu_temp: Option<String>,
    pub uptime: Option<String>,
    pub ip_address: Option<String>,
    pub gpio_available: bool,
    pub camera_available: bool,
    pub python_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PiCommandOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PiFileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub permissions: Option<String>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PiScannedDevice {
    pub ip: String,
    pub hostname: Option<String>,
    pub is_pi: bool,
    pub pi_model: Option<String>,
    pub ssh_open: bool,
    pub mac_prefix: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PiServiceEntry {
    pub name: String,
    pub description: String,
    pub status: String,
    pub enabled: bool,
    pub exec_start: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpioPin {
    pub bcm: u8,
    pub physical: u8,
    pub name: String,
    pub mode: String,
    pub value: Option<u8>,
    pub pull: Option<String>,
    pub assigned_label: Option<String>,
}

// ============================================================================
// MACRO: clone Arc<Handle> out of MutexGuard before any .await
// ============================================================================

macro_rules! get_handle {
    ($state:expr, $id:expr) => {{
        let sessions = $state.sessions.lock().unwrap();
        sessions
            .get(&$id)
            .map(|s| Arc::clone(&s.handle))
            .ok_or_else(|| "Not connected to Pi".to_string())?
    }};
}

// ============================================================================
// HELPER: Execute SSH command — capture stdout / stderr / exit_code
// ✅ Fix: `mut channel` required by russh channel.wait() API
// ============================================================================

async fn ssh_exec(handle: &Handle<ClientHandler>, command: &str) -> PiCommandOutput {
    let mut channel = match handle.channel_open_session().await {
        Ok(c) => c,
        Err(e) => {
            return PiCommandOutput {
                success: false,
                stdout: String::new(),
                stderr: format!("Channel error: {}", e),
                exit_code: None,
            }
        }
    };

    if let Err(e) = channel.exec(true, command).await {
        return PiCommandOutput {
            success: false,
            stdout: String::new(),
            stderr: format!("Exec error: {}", e),
            exit_code: None,
        };
    }

    let mut stdout_buf = Vec::new();
    let mut stderr_buf = Vec::new();
    let mut exit_code: Option<i32> = None;

    loop {
        match channel.wait().await {
            Some(russh::ChannelMsg::Data { data }) => {
                stdout_buf.extend_from_slice(&data);
            }
            Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                stderr_buf.extend_from_slice(&data);
            }
            Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = Some(exit_status as i32);
            }
            Some(russh::ChannelMsg::Close) | None => break,
            _ => {}
        }
    }

    PiCommandOutput {
        success: exit_code.map(|c| c == 0).unwrap_or(false),
        stdout: String::from_utf8_lossy(&stdout_buf).trim().to_string(),
        stderr: String::from_utf8_lossy(&stderr_buf).trim().to_string(),
        exit_code,
    }
}

// ============================================================================
// HELPER: Open SFTP subsystem
// ============================================================================

async fn open_sftp(
    handle: &Handle<ClientHandler>,
) -> Result<russh_sftp::client::SftpSession, String> {
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("SFTP channel error: {}", e))?;

    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| format!("SFTP subsystem error: {}", e))?;

    russh_sftp::client::SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| format!("SFTP init error: {}", e))
}

// ============================================================================
// CONNECTION COMMANDS
// ============================================================================

#[tauri::command]
pub async fn pi_connect(
    config: PiDeviceConfig,
    state: State<'_, PiState>,
) -> Result<PiDeviceInfo, String> {
    let ssh_config = Arc::new(client::Config::default());

    let mut handle = client::connect(
        ssh_config,
        (config.host.as_str(), config.port),
        ClientHandler,
    )
    .await
    .map_err(|e| format!("Cannot reach {}:{} — {}", config.host, config.port, e))?;

    let auth_ok = match config.auth_type.as_str() {
        "password" => {
            let pw = config.password.as_deref().unwrap_or("");
            handle
                .authenticate_password(&config.user, pw)
                .await
                .map_err(|e| format!("Authentication failed: {}", e))?
        }
        "key" => {
            let key_path = config.key_path.as_deref().ok_or("Key path not provided")?;
            let key_pair = russh_keys::load_secret_key(key_path, None)
                .map_err(|e| format!("Failed to load SSH key: {}", e))?;
            handle
                .authenticate_publickey(&config.user, Arc::new(key_pair))
                .await
                .map_err(|e| format!("Key authentication failed: {}", e))?
        }
        _ => return Err("Unknown auth type".to_string()),
    };

    if !auth_ok {
        return Err("Authentication unsuccessful".to_string());
    }

    let model_out  = ssh_exec(&handle, "cat /proc/device-tree/model 2>/dev/null || echo 'Unknown'").await;
    let os_out     = ssh_exec(&handle, "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'").await;
    let mem_total  = ssh_exec(&handle, "grep MemTotal /proc/meminfo | awk '{print $2 \" kB\"}'").await;
    let mem_free   = ssh_exec(&handle, "grep MemAvailable /proc/meminfo | awk '{print $2 \" kB\"}'").await;
    let temp_out   = ssh_exec(&handle, "vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.1f°C\", $1/1000}'").await;
    let uptime_out = ssh_exec(&handle, "uptime -p 2>/dev/null || uptime").await;
    let gpio_check = ssh_exec(&handle, "ls /dev/gpiomem /dev/gpiochip0 2>/dev/null | head -1").await;
    let cam_check  = ssh_exec(&handle, "vcgencmd get_camera 2>/dev/null | grep -c 'detected=1' || echo 0").await;
    let python_out = ssh_exec(&handle, "python3 --version 2>&1 || python --version 2>&1").await;
    let ip_out     = ssh_exec(&handle, "hostname -I | awk '{print $1}'").await;

    let device_info = PiDeviceInfo {
        id:               config.id.clone(),
        name:             config.name.clone(),
        host:             config.host.clone(),
        port:             config.port,
        user:             config.user.clone(),
        auth_type:        config.auth_type.clone(),
        status:           "connected".to_string(),
        model:            Some(model_out.stdout).filter(|s| !s.is_empty()),
        os:               Some(os_out.stdout).filter(|s| !s.is_empty()),
        memory_total:     Some(mem_total.stdout).filter(|s| !s.is_empty()),
        memory_free:      Some(mem_free.stdout).filter(|s| !s.is_empty()),
        cpu_temp:         Some(temp_out.stdout).filter(|s| !s.is_empty()),
        uptime:           Some(uptime_out.stdout).filter(|s| !s.is_empty()),
        ip_address:       Some(ip_out.stdout).filter(|s| !s.is_empty()),
        gpio_available:   gpio_check.success && !gpio_check.stdout.is_empty(),
        camera_available: cam_check.success,
        python_version:   Some(python_out.stdout).filter(|s| !s.is_empty()),
    };

    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(
        config.id.clone(),
        PiSession { handle: Arc::new(handle), config },
    );

    Ok(device_info)
}

#[tauri::command]
pub async fn pi_disconnect(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let handle = {
        let mut sessions = state.sessions.lock().unwrap();
        sessions.remove(&connection_id).map(|s| s.handle)
    };
    if let Some(h) = handle {
        if let Ok(inner) = Arc::try_unwrap(h) {
            let _ = inner.disconnect(russh::Disconnect::ByApplication, "", "English").await;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn pi_ping(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<bool, String> {
    let handle = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&connection_id).map(|s| Arc::clone(&s.handle))
    };
    match handle {
        Some(h) => Ok(ssh_exec(&h, "echo pong").await.stdout == "pong"),
        None => Ok(false),
    }
}

// ============================================================================
// REMOTE EXECUTION
// ============================================================================

#[tauri::command]
pub async fn pi_execute(
    connection_id: String,
    command: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    Ok(ssh_exec(&handle, &command).await)
}

#[tauri::command]
pub async fn pi_run_python(
    connection_id: String,
    script_path: String,
    args: Vec<String>,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let cmd = format!("python3 {} {}", script_path, args.join(" "));
    Ok(ssh_exec(&handle, &cmd).await)
}

// ============================================================================
// REMOTE FILE OPERATIONS (SFTP)
// ============================================================================

#[tauri::command]
pub async fn pi_list_directory(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<Vec<PiFileEntry>, String> {
    let handle = get_handle!(state, connection_id);
    let sftp = open_sftp(&handle).await?;

    let entries = sftp
        .read_dir(&path)
        .await
        .map_err(|e| format!("Cannot list directory: {}", e))?;

    let mut result: Vec<PiFileEntry> = entries
        .into_iter()
        .filter(|e| !e.file_name().starts_with('.'))
        .map(|e| {
            let meta = e.metadata();
            let is_dir = meta.is_dir();
            PiFileEntry {
                name: e.file_name(),
                path: format!("{}/{}", path.trim_end_matches('/'), e.file_name()),
                is_dir,
                size: if !is_dir { meta.size } else { None },
                permissions: meta.permissions.map(|p| format!("{:o}", p)),
                modified: meta.mtime.map(|t| t.to_string()),
            }
        })
        .collect();

    result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(result)
}

#[tauri::command]
pub async fn pi_read_file(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<String, String> {
    let handle = get_handle!(state, connection_id);
    let sftp = open_sftp(&handle).await?;

    let mut file = sftp
        .open(&path)
        .await
        .map_err(|e| format!("Cannot open file: {}", e))?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .await
        .map_err(|e| format!("Cannot read file: {}", e))?;
    Ok(content)
}

#[tauri::command]
pub async fn pi_write_file(
    connection_id: String,
    path: String,
    content: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let handle = get_handle!(state, connection_id);
    let sftp = open_sftp(&handle).await?;

    let mut file = sftp
        .create(&path)
        .await
        .map_err(|e| format!("Cannot create file: {}", e))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| format!("Cannot write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn pi_delete_file(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let handle = get_handle!(state, connection_id);
    let result = ssh_exec(&handle, &format!("rm -rf '{}'", path)).await;
    if result.success { Ok(()) } else { Err(result.stderr) }
}

#[tauri::command]
pub async fn pi_create_directory(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let handle = get_handle!(state, connection_id);
    let result = ssh_exec(&handle, &format!("mkdir -p '{}'", path)).await;
    if result.success { Ok(()) } else { Err(result.stderr) }
}

#[tauri::command]
pub async fn pi_upload_file(
    connection_id: String,
    local_path: String,
    remote_path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let content = std::fs::read_to_string(&local_path)
        .map_err(|e| format!("Cannot read local file: {}", e))?;

    let handle = get_handle!(state, connection_id);
    let sftp = open_sftp(&handle).await?;

    let mut file = sftp
        .create(&remote_path)
        .await
        .map_err(|e| format!("Cannot create remote file: {}", e))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| format!("Cannot write remote file: {}", e))?;
    Ok(())
}

// ============================================================================
// SYSTEM INFO
// ============================================================================

#[tauri::command]
pub async fn pi_get_system_info(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<HashMap<String, String>, String> {
    let handle = get_handle!(state, connection_id);

    let commands = vec![
        ("model",        "cat /proc/device-tree/model 2>/dev/null | tr -d '\\0'"),
        ("os",           "cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"),
        ("kernel",       "uname -r"),
        ("arch",         "uname -m"),
        ("hostname",     "hostname"),
        ("uptime",       "uptime -p 2>/dev/null || uptime"),
        ("cpu_temp",     "vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || cat /sys/class/thermal/thermal_zone0/temp | awk '{printf \"%.1f°C\", $1/1000}'"),
        ("cpu_usage",    "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d% -f1"),
        ("mem_total",    "grep MemTotal /proc/meminfo | awk '{print $2}'"),
        ("mem_free",     "grep MemAvailable /proc/meminfo | awk '{print $2}'"),
        ("disk_total",   "df -h / | tail -1 | awk '{print $2}'"),
        ("disk_used",    "df -h / | tail -1 | awk '{print $3}'"),
        ("disk_free",    "df -h / | tail -1 | awk '{print $4}'"),
        ("ip",           "hostname -I | awk '{print $1}'"),
        ("python3",      "python3 --version 2>&1"),
        ("pip3",         "pip3 --version 2>&1 | awk '{print $1, $2}'"),
        ("gpio_avail",   "ls /dev/gpiomem 2>/dev/null && echo yes || echo no"),
        ("camera_avail", "vcgencmd get_camera 2>/dev/null || ls /dev/video0 2>/dev/null && echo yes || echo no"),
        ("throttled",    "vcgencmd get_throttled 2>/dev/null || echo N/A"),
    ];

    let mut info = HashMap::new();
    for (key, cmd) in commands {
        let result = ssh_exec(&handle, cmd).await;
        info.insert(key.to_string(), result.stdout);
    }
    Ok(info)
}

// ============================================================================
// NETWORK SCANNER
// ============================================================================

const PI_MAC_PREFIXES: &[&str] = &[
    "b8:27:eb",
    "dc:a6:32",
    "e4:5f:01",
    "d8:3a:dd",
    "2c:cf:67",
];

#[tauri::command]
pub async fn pi_scan_network(subnet: Option<String>) -> Result<Vec<PiScannedDevice>, String> {
    let base_ip = if let Some(s) = subnet {
        s
    } else {
        std::net::UdpSocket::bind("0.0.0.0:0")
            .and_then(|s| { s.connect("8.8.8.8:80")?; s.local_addr() })
            .map(|addr| {
                let ip = addr.ip().to_string();
                let parts: Vec<&str> = ip.split('.').collect();
                if parts.len() >= 3 {
                    format!("{}.{}.{}", parts[0], parts[1], parts[2])
                } else {
                    "192.168.1".to_string()
                }
            })
            .unwrap_or_else(|_| "192.168.1".to_string())
    };

    let handles: Vec<_> = (1u8..=254).map(|i| {
        let ip = format!("{}.{}", base_ip, i);
        std::thread::spawn(move || {
            let is_open = TcpStream::connect_timeout(
                &format!("{}:22", ip).parse().unwrap(),
                Duration::from_millis(200),
            ).is_ok();

            if is_open {
                let arp_output = std::process::Command::new("arp")
                    .arg("-n").arg(&ip).output().ok()
                    .and_then(|o| String::from_utf8(o.stdout).ok())
                    .unwrap_or_default().to_lowercase();

                let mac_prefix = PI_MAC_PREFIXES.iter()
                    .find(|&&prefix| arp_output.contains(prefix))
                    .map(|&s| s.to_string());

                let is_pi = mac_prefix.is_some()
                    || arp_output.contains("raspberry")
                    || arp_output.contains("raspberrypi");

                Some(PiScannedDevice { ip, hostname: None, is_pi, pi_model: None, ssh_open: true, mac_prefix })
            } else {
                None
            }
        })
    }).collect();

    let mut found: Vec<PiScannedDevice> =
        handles.into_iter().filter_map(|h| h.join().ok().flatten()).collect();
    found.sort_by(|a, b| b.is_pi.cmp(&a.is_pi).then(a.ip.cmp(&b.ip)));
    Ok(found)
}

// ============================================================================
// GPIO CONTROL
// ============================================================================

#[tauri::command]
pub async fn pi_gpio_readall(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    Ok(ssh_exec(&handle,
        "raspi-gpio get 2>/dev/null || gpio readall 2>/dev/null || echo 'GPIO tools not available. Install: sudo apt install raspi-gpio'",
    ).await)
}

#[tauri::command]
pub async fn pi_gpio_set(
    connection_id: String,
    pin: u8,
    mode: String,
    value: Option<u8>,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let cmd = match (mode.as_str(), value) {
        ("output", Some(v)) => format!(
            "python3 -c \"from gpiozero import LED; import time; led = LED({}); {}; time.sleep(0.1)\"",
            pin, if v == 1 { "led.on()" } else { "led.off()" }
        ),
        ("input", _) => format!(
            "python3 -c \"from gpiozero import Button; b = Button({}); print(b.is_pressed)\"", pin
        ),
        _ => format!("raspi-gpio set {} {}", pin, match mode.as_str() { "output" => "op", _ => "ip" }),
    };
    Ok(ssh_exec(&handle, &cmd).await)
}

#[tauri::command]
pub async fn pi_gpio_read(
    connection_id: String,
    pin: u8,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let cmd = format!(
        "raspi-gpio get {} 2>/dev/null || python3 -c \"import RPi.GPIO as GPIO; GPIO.setmode(GPIO.BCM); GPIO.setup({}, GPIO.IN); print(GPIO.input({})); GPIO.cleanup()\"",
        pin, pin, pin
    );
    Ok(ssh_exec(&handle, &cmd).await)
}

#[tauri::command]
pub async fn pi_gpio_test_pin(
    connection_id: String,
    pin: u8,
    component: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let script = match component.as_str() {
        "led"    => format!("python3 -c \"from gpiozero import LED; from time import sleep; led = LED({}); led.blink(on_time=0.5, off_time=0.5, n=3); led.close()\"", pin),
        "button" => format!("python3 -c \"from gpiozero import Button; b = Button({}); print('Press button now...'); b.wait_for_press(timeout=5); print('Button pressed!' if b.is_pressed else 'Timeout')\"", pin),
        "buzzer" => format!("python3 -c \"from gpiozero import Buzzer; from time import sleep; bz = Buzzer({}); bz.on(); sleep(0.5); bz.off()\"", pin),
        _        => format!("raspi-gpio get {}", pin),
    };
    Ok(ssh_exec(&handle, &script).await)
}

// ============================================================================
// SYSTEMD SERVICE MANAGER
// ============================================================================

#[tauri::command]
pub async fn pi_service_list(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<Vec<PiServiceEntry>, String> {
    let handle = get_handle!(state, connection_id);
    let result = ssh_exec(&handle,
        "systemctl list-units --type=service --no-pager --no-legend --all 2>/dev/null | head -50",
    ).await;

    let mut services = Vec::new();
    for line in result.stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let name = parts[0].trim_end_matches(".service").to_string();
            if name.starts_with('@') || name.is_empty() { continue; }
            services.push(PiServiceEntry {
                name,
                description: parts[4..].join(" "),
                status: parts[2].to_string(),
                enabled: parts[1] == "enabled",
                exec_start: None,
            });
        }
    }
    Ok(services)
}

#[tauri::command]
pub async fn pi_service_control(
    connection_id: String,
    service_name: String,
    action: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    Ok(ssh_exec(&handle, &format!("sudo systemctl {} {}.service 2>&1", action, service_name)).await)
}

#[tauri::command]
pub async fn pi_create_service(
    connection_id: String,
    service_name: String,
    script_path: String,
    description: String,
    auto_restart: bool,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let user = ssh_exec(&handle, "whoami").await.stdout.trim().to_string();
    let workdir = Path::new(&script_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("/home/{}", user));

    let restart_policy = if auto_restart { "on-failure" } else { "no" };
    let unit_content = format!(
        "[Unit]\nDescription={}\nAfter=multi-user.target\n\n[Service]\nExecStart=/usr/bin/python3 {}\nWorkingDirectory={}\nUser={}\nRestart={}\nRestartSec=5\nStandardOutput=journal\nStandardError=journal\n\n[Install]\nWantedBy=multi-user.target\n",
        description, script_path, workdir, user, restart_policy
    );
    let service_path = format!("/etc/systemd/system/{}.service", service_name);
    let escaped = unit_content.replace('\'', "'\\''");
    let cmd = format!(
        "echo '{}' | sudo tee {} && sudo systemctl daemon-reload && sudo systemctl enable {}.service && sudo systemctl start {}.service",
        escaped, service_path, service_name, service_name
    );
    Ok(ssh_exec(&handle, &cmd).await)
}

#[tauri::command]
pub async fn pi_service_logs(
    connection_id: String,
    service_name: String,
    lines: Option<u32>,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let n = lines.unwrap_or(50);
    Ok(ssh_exec(&handle, &format!("sudo journalctl -u {}.service -n {} --no-pager 2>&1", service_name, n)).await)
}

// ============================================================================
// PACKAGE MANAGEMENT
// ============================================================================

#[tauri::command]
pub async fn pi_install_package(
    connection_id: String,
    package: String,
    use_pip: bool,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    let cmd = if use_pip {
        format!("pip3 install {} 2>&1", package)
    } else {
        format!("sudo apt-get install -y {} 2>&1", package)
    };
    Ok(ssh_exec(&handle, &cmd).await)
}

#[tauri::command]
pub async fn pi_ensure_gpio_deps(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let handle = get_handle!(state, connection_id);
    Ok(ssh_exec(&handle,
        "python3 -c 'import gpiozero' 2>/dev/null && echo 'gpiozero OK' || pip3 install gpiozero 2>&1",
    ).await)
}

// ============================================================================
// DEVICE CONFIG PERSISTENCE
// ============================================================================

#[tauri::command]
pub async fn pi_save_devices(
    devices: Vec<PiDeviceConfig>,
    config_dir: String,
) -> Result<(), String> {
    let path = Path::new(&config_dir).join("pi_devices.json");
    let safe: Vec<PiDeviceConfig> = devices.into_iter().map(|mut d| { d.password = None; d }).collect();
    let json = serde_json::to_string_pretty(&safe).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pi_load_devices(config_dir: String) -> Result<Vec<PiDeviceConfig>, String> {
    let path = Path::new(&config_dir).join("pi_devices.json");
    if !path.exists() { return Ok(Vec::new()); }
    let json = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

// ============================================================================
// GPIO CODE GENERATION
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GpioPinAssignment {
    pub bcm: u8,
    pub label: String,
    pub component: String,
    pub mode: String,
}

#[tauri::command]
pub async fn pi_generate_gpio_code(
    assignments: Vec<GpioPinAssignment>,
    project_name: String,
) -> Result<String, String> {
    let mut lines = vec![
        "#!/usr/bin/env python3".to_string(),
        format!("\"\"\"Generated by Operator X02 — GPIO Layout: {}.gpio\"\"\"", project_name),
        String::new(),
        "from gpiozero import LED, Button, Servo, AngularServo, Buzzer, DistanceSensor".to_string(),
        "from signal import pause".to_string(),
        String::new(),
        "# --- Pin Assignments (from X02 GPIO Designer) ---".to_string(),
    ];

    for pin in &assignments {
        let line = match pin.component.as_str() {
            "led"    => format!("{} = LED({})  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "button" => format!("{} = Button({}, pull_up=True)  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "servo"  => format!("{} = AngularServo({}, min_angle=-90, max_angle=90)  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "buzzer" => format!("{} = Buzzer({})  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "relay"  => format!("{} = LED({}, active_high=False)  # Relay on BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            _        => format!("# {} on BCM GPIO{}", pin.label, pin.bcm),
        };
        lines.push(line);
    }

    lines.extend([
        String::new(),
        "# --- Main Logic ---".to_string(),
        "def main():".to_string(),
        "    print('Operator X02 GPIO project running...')".to_string(),
        "    pause()  # Keep running".to_string(),
        String::new(),
        "if __name__ == '__main__':".to_string(),
        "    main()".to_string(),
    ]);

    Ok(lines.join("\n"))
}
