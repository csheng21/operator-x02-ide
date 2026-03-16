// ============================================================================
// 🍓 RASPBERRY PI REMOTE INTEGRATION — Operator X02
// src-tauri/src/pi_remote_commands.rs
//
// Phase 1: SSH/SFTP remote dev, network scanner, system info, GPIO, services
// Crates required: ssh2, local-ip-address
// ============================================================================

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::net::{IpAddr, TcpStream};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

// ============================================================================
// STATE MANAGEMENT — Active SSH sessions stored in app state
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

struct PiSession {
    session: ssh2::Session,
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
    pub auth_type: String,     // "password" | "key"
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
    pub status: String,        // "connected" | "disconnected" | "error"
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
    pub status: String,        // "active" | "inactive" | "failed"
    pub enabled: bool,
    pub exec_start: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpioPin {
    pub bcm: u8,
    pub physical: u8,
    pub name: String,
    pub mode: String,          // "input" | "output" | "pwm" | "i2c" | "spi" | "uart" | "power" | "gnd"
    pub value: Option<u8>,
    pub pull: Option<String>,  // "up" | "down" | "none"
    pub assigned_label: Option<String>,
}

// ============================================================================
// HELPER: Run SSH command and capture output
// ============================================================================

fn ssh_exec(session: &ssh2::Session, command: &str) -> PiCommandOutput {
    match session.channel_session() {
        Ok(mut channel) => {
            if let Err(e) = channel.exec(command) {
                return PiCommandOutput {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("Failed to exec command: {}", e),
                    exit_code: None,
                };
            }
            let mut stdout = String::new();
            let _ = channel.read_to_string(&mut stdout);
            let mut stderr = String::new();
            let mut stderr_stream = channel.stderr();
            let _ = stderr_stream.read_to_string(&mut stderr);
            let _ = channel.wait_close();
            let exit_code = channel.exit_status().ok();
            PiCommandOutput {
                success: exit_code.map(|c| c == 0).unwrap_or(false),
                stdout: stdout.trim().to_string(),
                stderr: stderr.trim().to_string(),
                exit_code,
            }
        }
        Err(e) => PiCommandOutput {
            success: false,
            stdout: String::new(),
            stderr: format!("Channel error: {}", e),
            exit_code: None,
        },
    }
}

// ============================================================================
// CONNECTION COMMANDS
// ============================================================================

/// Connect to a Raspberry Pi via SSH
#[tauri::command]
pub async fn pi_connect(
    config: PiDeviceConfig,
    state: State<'_, PiState>,
) -> Result<PiDeviceInfo, String> {
    let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
        .map_err(|e| format!("Cannot reach {}:{} — {}", config.host, config.port, e))?;

    tcp.set_read_timeout(Some(Duration::from_secs(10))).ok();
    tcp.set_write_timeout(Some(Duration::from_secs(10))).ok();

    let mut sess = ssh2::Session::new()
        .map_err(|e| format!("SSH session error: {}", e))?;
    sess.set_tcp_stream(tcp);
    sess.handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;

    // Authenticate
    match config.auth_type.as_str() {
        "password" => {
            let pw = config.password.as_deref().unwrap_or("");
            sess.userauth_password(&config.user, pw)
                .map_err(|e| format!("Authentication failed: {}", e))?;
        }
        "key" => {
            let key_path = config.key_path.as_deref()
                .ok_or("Key path not provided")?;
            sess.userauth_pubkey_file(
                &config.user,
                None,
                Path::new(key_path),
                None,
            ).map_err(|e| format!("Key auth failed: {}", e))?;
        }
        _ => return Err("Unknown auth type".to_string()),
    }

    if !sess.authenticated() {
        return Err("Authentication unsuccessful".to_string());
    }

    // Gather system info
    let model_out = ssh_exec(&sess, "cat /proc/device-tree/model 2>/dev/null || cat /sys/firmware/devicetree/base/model 2>/dev/null || echo 'Unknown'");
    let os_out = ssh_exec(&sess, "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'");
    let mem_total = ssh_exec(&sess, "grep MemTotal /proc/meminfo | awk '{print $2 \" kB\"}'");
    let mem_free = ssh_exec(&sess, "grep MemAvailable /proc/meminfo | awk '{print $2 \" kB\"}'");
    let temp_out = ssh_exec(&sess, "vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.1f°C\", $1/1000}'");
    let uptime_out = ssh_exec(&sess, "uptime -p 2>/dev/null || uptime");
    let gpio_check = ssh_exec(&sess, "ls /dev/gpiomem /dev/gpiochip0 2>/dev/null | head -1");
    let cam_check = ssh_exec(&sess, "ls /dev/video0 /dev/video1 2>/dev/null | head -1; vcgencmd get_camera 2>/dev/null | grep -c 'detected=1' || echo 0");
    let python_out = ssh_exec(&sess, "python3 --version 2>&1 || python --version 2>&1");
    let ip_out = ssh_exec(&sess, "hostname -I | awk '{print $1}'");

    let device_info = PiDeviceInfo {
        id: config.id.clone(),
        name: config.name.clone(),
        host: config.host.clone(),
        port: config.port,
        user: config.user.clone(),
        auth_type: config.auth_type.clone(),
        status: "connected".to_string(),
        model: Some(model_out.stdout).filter(|s| !s.is_empty()),
        os: Some(os_out.stdout).filter(|s| !s.is_empty()),
        memory_total: Some(mem_total.stdout).filter(|s| !s.is_empty()),
        memory_free: Some(mem_free.stdout).filter(|s| !s.is_empty()),
        cpu_temp: Some(temp_out.stdout).filter(|s| !s.is_empty()),
        uptime: Some(uptime_out.stdout).filter(|s| !s.is_empty()),
        ip_address: Some(ip_out.stdout).filter(|s| !s.is_empty()),
        gpio_available: gpio_check.success && !gpio_check.stdout.is_empty(),
        camera_available: cam_check.success,
        python_version: Some(python_out.stdout).filter(|s| !s.is_empty()),
    };

    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(config.id.clone(), PiSession { session: sess, config });

    Ok(device_info)
}

/// Disconnect from a Pi
#[tauri::command]
pub async fn pi_disconnect(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap();
    if let Some(pi) = sessions.remove(&connection_id) {
        let _ = pi.session.disconnect(None, "Disconnected by user", None);
    }
    Ok(())
}

/// Check if a connection is still alive
#[tauri::command]
pub async fn pi_ping(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<bool, String> {
    let sessions = state.sessions.lock().unwrap();
    if let Some(pi) = sessions.get(&connection_id) {
        let result = ssh_exec(&pi.session, "echo pong");
        Ok(result.stdout == "pong")
    } else {
        Ok(false)
    }
}

// ============================================================================
// REMOTE EXECUTION
// ============================================================================

/// Execute a shell command on the Pi
#[tauri::command]
pub async fn pi_execute(
    connection_id: String,
    command: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    Ok(ssh_exec(&pi.session, &command))
}

/// Run a Python script on the Pi
#[tauri::command]
pub async fn pi_run_python(
    connection_id: String,
    script_path: String,
    args: Vec<String>,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let args_str = args.join(" ");
    let cmd = format!("python3 {} {}", script_path, args_str);
    Ok(ssh_exec(&pi.session, &cmd))
}

// ============================================================================
// REMOTE FILE OPERATIONS (SFTP)
// ============================================================================

/// List directory contents on the Pi
#[tauri::command]
pub async fn pi_list_directory(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<Vec<PiFileEntry>, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let sftp = pi.session.sftp()
        .map_err(|e| format!("SFTP error: {}", e))?;

    let dir_path = Path::new(&path);
    let entries = sftp.readdir(dir_path)
        .map_err(|e| format!("Cannot list directory: {}", e))?;

    let mut result = Vec::new();
    for (path_buf, stat) in entries {
        let name = path_buf.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip hidden files
        if name.starts_with('.') { continue; }

        let is_dir = stat.is_dir();
        result.push(PiFileEntry {
            name: name.clone(),
            path: path_buf.to_string_lossy().to_string(),
            is_dir,
            size: if !is_dir { Some(stat.size.unwrap_or(0)) } else { None },
            permissions: stat.perm.map(|p| format!("{:o}", p)),
            modified: stat.mtime.map(|t| t.to_string()),
        });
    }

    // Sort: dirs first, then files
    result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(result)
}

/// Read a remote file from the Pi
#[tauri::command]
pub async fn pi_read_file(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<String, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let sftp = pi.session.sftp()
        .map_err(|e| format!("SFTP error: {}", e))?;

    let mut file = sftp.open(Path::new(&path))
        .map_err(|e| format!("Cannot open file: {}", e))?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("Cannot read file: {}", e))?;

    Ok(content)
}

/// Write a file to the Pi via SFTP
#[tauri::command]
pub async fn pi_write_file(
    connection_id: String,
    path: String,
    content: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let sftp = pi.session.sftp()
        .map_err(|e| format!("SFTP error: {}", e))?;

    let mut file = sftp.create(Path::new(&path))
        .map_err(|e| format!("Cannot create file: {}", e))?;

    use std::io::Write;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Cannot write file: {}", e))?;

    Ok(())
}

/// Delete a file on the Pi
#[tauri::command]
pub async fn pi_delete_file(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let result = ssh_exec(&pi.session, &format!("rm -rf '{}'", path));
    if result.success {
        Ok(())
    } else {
        Err(result.stderr)
    }
}

/// Create a directory on the Pi
#[tauri::command]
pub async fn pi_create_directory(
    connection_id: String,
    path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let result = ssh_exec(&pi.session, &format!("mkdir -p '{}'", path));
    if result.success { Ok(()) } else { Err(result.stderr) }
}

/// Upload a local file to the Pi
#[tauri::command]
pub async fn pi_upload_file(
    connection_id: String,
    local_path: String,
    remote_path: String,
    state: State<'_, PiState>,
) -> Result<(), String> {
    let content = std::fs::read_to_string(&local_path)
        .map_err(|e| format!("Cannot read local file: {}", e))?;

    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let sftp = pi.session.sftp()
        .map_err(|e| format!("SFTP error: {}", e))?;

    let mut file = sftp.create(Path::new(&remote_path))
        .map_err(|e| format!("Cannot create remote file: {}", e))?;

    use std::io::Write;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Cannot write remote file: {}", e))?;

    Ok(())
}

// ============================================================================
// SYSTEM INFO
// ============================================================================

/// Get detailed Pi system information
#[tauri::command]
pub async fn pi_get_system_info(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<HashMap<String, String>, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let mut info = HashMap::new();

    let commands = vec![
        ("model",       "cat /proc/device-tree/model 2>/dev/null | tr -d '\\0'"),
        ("os",          "cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"),
        ("kernel",      "uname -r"),
        ("arch",        "uname -m"),
        ("hostname",    "hostname"),
        ("uptime",      "uptime -p 2>/dev/null || uptime"),
        ("cpu_temp",    "vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || cat /sys/class/thermal/thermal_zone0/temp | awk '{printf \"%.1f°C\", $1/1000}'"),
        ("cpu_usage",   "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d% -f1"),
        ("mem_total",   "grep MemTotal /proc/meminfo | awk '{print $2}'"),
        ("mem_free",    "grep MemAvailable /proc/meminfo | awk '{print $2}'"),
        ("disk_total",  "df -h / | tail -1 | awk '{print $2}'"),
        ("disk_used",   "df -h / | tail -1 | awk '{print $3}'"),
        ("disk_free",   "df -h / | tail -1 | awk '{print $4}'"),
        ("ip",          "hostname -I | awk '{print $1}'"),
        ("python3",     "python3 --version 2>&1"),
        ("pip3",        "pip3 --version 2>&1 | awk '{print $1, $2}'"),
        ("gpio_avail",  "ls /dev/gpiomem 2>/dev/null && echo yes || echo no"),
        ("camera_avail","vcgencmd get_camera 2>/dev/null || ls /dev/video0 2>/dev/null && echo yes || echo no"),
        ("throttled",   "vcgencmd get_throttled 2>/dev/null || echo N/A"),
    ];

    for (key, cmd) in commands {
        let result = ssh_exec(&pi.session, cmd);
        info.insert(key.to_string(), result.stdout);
    }

    Ok(info)
}

// ============================================================================
// NETWORK SCANNER — Find Raspberry Pis on local network
// ============================================================================

/// Known Raspberry Pi Foundation MAC OUI prefixes
const PI_MAC_PREFIXES: &[&str] = &[
    "b8:27:eb",  // Pi 1/2/3
    "dc:a6:32",  // Pi 4
    "e4:5f:01",  // Pi 4 (alt)
    "d8:3a:dd",  // Pi 400/CM4
    "2c:cf:67",  // Pi Zero 2W
];

/// Scan local subnet for Raspberry Pi devices
#[tauri::command]
pub async fn pi_scan_network(
    subnet: Option<String>,
) -> Result<Vec<PiScannedDevice>, String> {
    // Determine subnet to scan
    let base_ip = if let Some(s) = subnet {
        s
    } else {
        // Try to get local IP to derive subnet
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

    let mut found = Vec::new();

    // Parallel scan of .1 - .254
    let handles: Vec<_> = (1u8..=254).map(|i| {
        let ip = format!("{}.{}", base_ip, i);
        std::thread::spawn(move || {
            let is_open = TcpStream::connect_timeout(
                &format!("{}:22", ip).parse().unwrap(),
                Duration::from_millis(200),
            ).is_ok();

            if is_open {
                // Check if it's a Pi by querying ARP table (best-effort)
                let arp_output = std::process::Command::new("arp")
                    .arg("-n")
                    .arg(&ip)
                    .output()
                    .ok()
                    .and_then(|o| String::from_utf8(o.stdout).ok())
                    .unwrap_or_default()
                    .to_lowercase();

                let mac_prefix = PI_MAC_PREFIXES.iter()
                    .find(|&&prefix| arp_output.contains(prefix))
                    .map(|&s| s.to_string());

                let is_pi = mac_prefix.is_some() ||
                    arp_output.contains("raspberry") ||
                    arp_output.contains("raspberrypi");

                Some(PiScannedDevice {
                    ip,
                    hostname: None,
                    is_pi,
                    pi_model: None,
                    ssh_open: true,
                    mac_prefix,
                })
            } else {
                None
            }
        })
    }).collect();

    for handle in handles {
        if let Ok(Some(device)) = handle.join() {
            found.push(device);
        }
    }

    // Sort: Pi devices first, then by IP
    found.sort_by(|a, b| b.is_pi.cmp(&a.is_pi)
        .then(a.ip.cmp(&b.ip)));

    Ok(found)
}

// ============================================================================
// GPIO CONTROL
// ============================================================================

/// Get current GPIO pin layout from the Pi
#[tauri::command]
pub async fn pi_gpio_readall(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    // Use raspi-gpio or gpio readall
    let result = ssh_exec(&pi.session,
        "raspi-gpio get 2>/dev/null || gpio readall 2>/dev/null || echo 'GPIO tools not available. Install: sudo apt install raspi-gpio'");
    Ok(result)
}

/// Set a GPIO pin mode and value
#[tauri::command]
pub async fn pi_gpio_set(
    connection_id: String,
    pin: u8,
    mode: String,   // "output" | "input"
    value: Option<u8>,  // 0 or 1 for output
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let cmd = match (mode.as_str(), value) {
        ("output", Some(v)) => format!(
            "python3 -c \"from gpiozero import LED; import time; led = LED({}); {}; time.sleep(0.1)\"",
            pin,
            if v == 1 { "led.on()" } else { "led.off()" }
        ),
        ("input", _) => format!(
            "python3 -c \"from gpiozero import Button; b = Button({}); print(b.is_pressed)\"",
            pin
        ),
        _ => format!("raspi-gpio set {} {}",
            pin,
            match mode.as_str() { "output" => "op", _ => "ip" }
        ),
    };

    Ok(ssh_exec(&pi.session, &cmd))
}

/// Read a GPIO pin value
#[tauri::command]
pub async fn pi_gpio_read(
    connection_id: String,
    pin: u8,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let cmd = format!("raspi-gpio get {} 2>/dev/null || python3 -c \"import RPi.GPIO as GPIO; GPIO.setmode(GPIO.BCM); GPIO.setup({}, GPIO.IN); print(GPIO.input({})); GPIO.cleanup()\"", pin, pin, pin);
    Ok(ssh_exec(&pi.session, &cmd))
}

/// Run a Python gpiozero snippet on the Pi
#[tauri::command]
pub async fn pi_gpio_test_pin(
    connection_id: String,
    pin: u8,
    component: String,  // "led" | "button" | "servo" | "buzzer"
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let script = match component.as_str() {
        "led" => format!(
            "python3 -c \"from gpiozero import LED; from time import sleep; led = LED({}); led.blink(on_time=0.5, off_time=0.5, n=3); led.close()\"",
            pin
        ),
        "button" => format!(
            "python3 -c \"from gpiozero import Button; from time import sleep; b = Button({}); print('Press button now...'); b.wait_for_press(timeout=5); print('Button pressed!' if b.is_pressed else 'Timeout')\"",
            pin
        ),
        "buzzer" => format!(
            "python3 -c \"from gpiozero import Buzzer; from time import sleep; bz = Buzzer({}); bz.on(); sleep(0.5); bz.off()\"",
            pin
        ),
        _ => format!("raspi-gpio get {}", pin),
    };

    Ok(ssh_exec(&pi.session, &script))
}

// ============================================================================
// SYSTEMD SERVICE MANAGER
// ============================================================================

/// List systemd services on the Pi
#[tauri::command]
pub async fn pi_service_list(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<Vec<PiServiceEntry>, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let result = ssh_exec(&pi.session,
        "systemctl list-units --type=service --no-pager --no-legend --all 2>/dev/null | head -50");

    let mut services = Vec::new();
    for line in result.stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let name = parts[0].trim_end_matches(".service").to_string();
            if name.starts_with('@') || name.is_empty() { continue; }
            services.push(PiServiceEntry {
                name: name.clone(),
                description: parts[4..].join(" "),
                status: parts[2].to_string(),
                enabled: parts[1] == "enabled",
                exec_start: None,
            });
        }
    }

    Ok(services)
}

/// Control a systemd service (start/stop/restart/enable/disable)
#[tauri::command]
pub async fn pi_service_control(
    connection_id: String,
    service_name: String,
    action: String,  // "start" | "stop" | "restart" | "enable" | "disable" | "status"
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let cmd = format!("sudo systemctl {} {}.service 2>&1", action, service_name);
    Ok(ssh_exec(&pi.session, &cmd))
}

/// Deploy a Python script as a systemd service
#[tauri::command]
pub async fn pi_create_service(
    connection_id: String,
    service_name: String,
    script_path: String,
    description: String,
    auto_restart: bool,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;

    let user_result = ssh_exec(&pi.session, "whoami");
    let user = user_result.stdout.trim().to_string();
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

    Ok(ssh_exec(&pi.session, &cmd))
}

/// Get service logs
#[tauri::command]
pub async fn pi_service_logs(
    connection_id: String,
    service_name: String,
    lines: Option<u32>,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let n = lines.unwrap_or(50);
    let cmd = format!("sudo journalctl -u {}.service -n {} --no-pager 2>&1", service_name, n);
    Ok(ssh_exec(&pi.session, &cmd))
}

// ============================================================================
// PACKAGE MANAGEMENT
// ============================================================================

/// Install a Python package on the Pi
#[tauri::command]
pub async fn pi_install_package(
    connection_id: String,
    package: String,
    use_pip: bool,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let cmd = if use_pip {
        format!("pip3 install {} 2>&1", package)
    } else {
        format!("sudo apt-get install -y {} 2>&1", package)
    };
    Ok(ssh_exec(&pi.session, &cmd))
}

/// Check if gpiozero is available, install if not
#[tauri::command]
pub async fn pi_ensure_gpio_deps(
    connection_id: String,
    state: State<'_, PiState>,
) -> Result<PiCommandOutput, String> {
    let sessions = state.sessions.lock().unwrap();
    let pi = sessions.get(&connection_id)
        .ok_or("Not connected to Pi")?;
    let cmd = "python3 -c 'import gpiozero' 2>/dev/null && echo 'gpiozero OK' || pip3 install gpiozero 2>&1";
    Ok(ssh_exec(&pi.session, cmd))
}

// ============================================================================
// DEVICE CONFIGURATION PERSISTENCE (saved to app config dir)
// ============================================================================

/// Save Pi device configs to disk
#[tauri::command]
pub async fn pi_save_devices(
    devices: Vec<PiDeviceConfig>,
    config_dir: String,
) -> Result<(), String> {
    let path = Path::new(&config_dir).join("pi_devices.json");
    // Strip passwords before saving (security)
    let safe_devices: Vec<PiDeviceConfig> = devices.into_iter().map(|mut d| {
        d.password = None;  // Never persist passwords
        d
    }).collect();
    let json = serde_json::to_string_pretty(&safe_devices)
        .map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

/// Load Pi device configs from disk
#[tauri::command]
pub async fn pi_load_devices(config_dir: String) -> Result<Vec<PiDeviceConfig>, String> {
    let path = Path::new(&config_dir).join("pi_devices.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let json = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

// ============================================================================
// GENERATE GPIO CODE
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GpioPinAssignment {
    pub bcm: u8,
    pub label: String,
    pub component: String,  // "led" | "button" | "servo" | "sensor_i2c" | "buzzer" | "relay"
    pub mode: String,       // "output" | "input" | "pwm"
}

/// Generate Python gpiozero code from a GPIO layout
#[tauri::command]
pub async fn pi_generate_gpio_code(
    assignments: Vec<GpioPinAssignment>,
    project_name: String,
) -> Result<String, String> {
    let mut imports = vec!["#!/usr/bin/env python3".to_string()];
    imports.push(format!("\"\"\"Generated by Operator X02 — GPIO Layout: {}.gpio\"\"\"", project_name));
    imports.push(String::new());
    imports.push("from gpiozero import LED, Button, Servo, AngularServo, Buzzer, DistanceSensor".to_string());
    imports.push("from signal import pause".to_string());
    imports.push(String::new());
    imports.push("# --- Pin Assignments (from X02 GPIO Designer) ---".to_string());

    for pin in &assignments {
        let line = match pin.component.as_str() {
            "led"     => format!("{} = LED({})  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "button"  => format!("{} = Button({}, pull_up=True)  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "servo"   => format!("{} = AngularServo({}, min_angle=-90, max_angle=90)  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "buzzer"  => format!("{} = Buzzer({})  # BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            "relay"   => format!("{} = LED({}, active_high=False)  # Relay on BCM GPIO{}", pin.label.to_lowercase(), pin.bcm, pin.bcm),
            _         => format!("# {} on BCM GPIO{}", pin.label, pin.bcm),
        };
        imports.push(line);
    }

    imports.push(String::new());
    imports.push("# --- Main Logic ---".to_string());
    imports.push("def main():".to_string());
    imports.push("    print('Operator X02 GPIO project running...')".to_string());
    imports.push("    pause()  # Keep running".to_string());
    imports.push(String::new());
    imports.push("if __name__ == '__main__':".to_string());
    imports.push("    main()".to_string());

    Ok(imports.join("\n"))
}
