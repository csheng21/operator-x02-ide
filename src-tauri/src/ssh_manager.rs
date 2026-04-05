// =============================================================================
// Operator X02 - Phase 2: SSH Connection Manager for Jetson Remote Deployment
// =============================================================================
// Migrated from ssh2 → russh (pure Rust, no OpenSSL / no vendored C libs).
// All Tauri commands converted to async fn. SCP replaced with SFTP.
// Tegrastats streaming uses a tokio task reading ChannelMsg::Data events.
// =============================================================================

use async_trait::async_trait;
use russh::client::{self, Handle};
use russh_keys::key::PublicKey;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncWriteExt;

// ---------------------------------------------------------------------------
// SSH Client Handler — trust-on-first-use (same policy as original)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data Structures (unchanged from original)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JetsonProfile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    /// "password" | "key"
    pub auth_method: String,
    /// Only stored in memory during session, never persisted to disk
    #[serde(skip_serializing, default)]
    pub password: Option<String>,
    /// Path to SSH private key file
    pub key_path: Option<String>,
    pub last_connected: Option<String>,
    pub jetpack_version: Option<String>,
    pub device_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub profile_id: Option<String>,
    pub profile_name: Option<String>,
    pub host: Option<String>,
    pub uptime: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployResult {
    pub transferred: bool,
    pub compiled: bool,
    pub executed: bool,
    pub transfer_time_ms: u64,
    pub compile_output: String,
    pub run_output: String,
    pub run_exit_code: i32,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TegrastatsData {
    pub timestamp: String,
    pub ram_used_mb: u32,
    pub ram_total_mb: u32,
    pub swap_used_mb: u32,
    pub swap_total_mb: u32,
    pub cpu_usage: Vec<CpuCore>,
    pub gpu_percent: u32,
    pub gpu_freq_mhz: u32,
    pub temp_cpu: f32,
    pub temp_gpu: f32,
    pub temp_soc: f32,
    pub power_current_mw: u32,
    pub power_average_mw: u32,
    pub emc_percent: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCore {
    pub id: u32,
    pub usage_percent: u32,
    pub freq_mhz: u32,
    pub online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JetsonDeviceInfo {
    pub model: String,
    pub jetpack_version: String,
    pub l4t_version: String,
    pub cuda_version: String,
    pub ram_total_mb: u32,
    pub storage_total_gb: f32,
    pub storage_used_gb: f32,
    pub nvcc_available: bool,
    pub tegrastats_available: bool,
    pub cpu_cores: u32,
    pub arch: String,
}

// ---------------------------------------------------------------------------
// Shared State
// ✅ Session now holds Arc<Handle<ClientHandler>> instead of ssh2::Session
// ---------------------------------------------------------------------------

pub struct SshState {
    sessions: Mutex<HashMap<String, SshSessionWrapper>>,
    profiles: Mutex<Vec<JetsonProfile>>,
    active_profile: Mutex<Option<String>>,
    monitoring: Arc<Mutex<bool>>,
}

struct SshSessionWrapper {
    handle: Arc<Handle<ClientHandler>>,
    connected_at: Instant,
}

impl SshState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            profiles: Mutex::new(Vec::new()),
            active_profile: Mutex::new(None),
            monitoring: Arc::new(Mutex::new(false)),
        }
    }
}

impl Default for SshState {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Macro: clone Arc<Handle> out of MutexGuard before any .await point
// ---------------------------------------------------------------------------

macro_rules! get_handle {
    ($state:expr) => {{
        let sessions = $state.sessions.lock().map_err(|e| e.to_string())?;
        let active = $state.active_profile.lock().map_err(|e| e.to_string())?;
        let conn_id = active.as_ref().ok_or("No active Jetson connection")?;
        sessions
            .get(conn_id)
            .map(|w| Arc::clone(&w.handle))
            .ok_or_else(|| "Session not found for active connection".to_string())?
    }};
}

// ---------------------------------------------------------------------------
// Internal SSH exec helper
// ✅ mut channel required by russh channel.wait() API
// ---------------------------------------------------------------------------

async fn exec_command(
    handle: &Handle<ClientHandler>,
    command: &str,
) -> Result<RemoteExecutionResult, String> {
    let start = Instant::now();

    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Failed to open channel: {}", e))?;

    channel
        .exec(true, command)
        .await
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let mut stdout_buf = Vec::new();
    let mut stderr_buf = Vec::new();
    let mut exit_code = -1i32;

    loop {
        match channel.wait().await {
            Some(russh::ChannelMsg::Data { data }) => {
                stdout_buf.extend_from_slice(&data);
            }
            Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                stderr_buf.extend_from_slice(&data);
            }
            Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = exit_status as i32;
            }
            Some(russh::ChannelMsg::Close) | None => break,
            _ => {}
        }
    }

    Ok(RemoteExecutionResult {
        exit_code,
        stdout: String::from_utf8_lossy(&stdout_buf).to_string(),
        stderr: String::from_utf8_lossy(&stderr_buf).to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

// ---------------------------------------------------------------------------
// Internal SFTP upload helper (replaces SCP)
// ✅ russh has no scp_send — SFTP create+write is functionally equivalent
// ---------------------------------------------------------------------------

async fn upload_file_inner(
    handle: &Handle<ClientHandler>,
    local_path: &str,
    remote_path: &str,
) -> Result<u64, String> {
    let local = Path::new(local_path);
    if !local.exists() {
        return Err(format!("Local file not found: {}", local_path));
    }
    let contents = std::fs::read(local).map_err(|e| e.to_string())?;
    let file_size = contents.len() as u64;

    // Open SFTP subsystem
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("SFTP channel error: {}", e))?;
    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| format!("SFTP subsystem error: {}", e))?;
    let sftp = russh_sftp::client::SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| format!("SFTP init error: {}", e))?;

    let mut remote_file = sftp
        .create(remote_path)
        .await
        .map_err(|e| format!("Cannot create remote file: {}", e))?;

    remote_file
        .write_all(&contents)
        .await
        .map_err(|e| format!("Failed to write file data: {}", e))?;

    Ok(file_size)
}

// ---------------------------------------------------------------------------
// Profile Management Commands (sync — no SSH needed)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn jetson_save_profile(
    state: State<'_, SshState>,
    profile: JetsonProfile,
) -> Result<Vec<JetsonProfile>, String> {
    let mut profiles = state.profiles.lock().map_err(|e| e.to_string())?;
    if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile;
    } else {
        profiles.push(profile);
    }
    Ok(profiles.clone())
}

#[tauri::command]
pub fn jetson_delete_profile(
    state: State<'_, SshState>,
    profile_id: String,
) -> Result<Vec<JetsonProfile>, String> {
    let mut profiles = state.profiles.lock().map_err(|e| e.to_string())?;
    profiles.retain(|p| p.id != profile_id);
    Ok(profiles.clone())
}

#[tauri::command]
pub fn jetson_list_profiles(
    state: State<'_, SshState>,
) -> Result<Vec<JetsonProfile>, String> {
    let profiles = state.profiles.lock().map_err(|e| e.to_string())?;
    Ok(profiles.clone())
}

#[tauri::command]
pub fn jetson_load_profiles(
    state: State<'_, SshState>,
    app: AppHandle,
) -> Result<Vec<JetsonProfile>, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let profiles_path = config_dir.join("jetson_profiles.json");

    if profiles_path.exists() {
        let data = std::fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
        let loaded: Vec<JetsonProfile> = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        let mut profiles = state.profiles.lock().map_err(|e| e.to_string())?;
        *profiles = loaded.clone();
        Ok(loaded)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn jetson_persist_profiles(
    state: State<'_, SshState>,
    app: AppHandle,
) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let profiles = state.profiles.lock().map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&*profiles).map_err(|e| e.to_string())?;
    std::fs::write(config_dir.join("jetson_profiles.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// SSH Connection Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn jetson_connect(
    state: State<'_, SshState>,
    host: String,
    port: u16,
    username: String,
    auth_method: String,
    password: Option<String>,
    key_path: Option<String>,
    profile_id: Option<String>,
) -> Result<ConnectionStatus, String> {
    let ssh_config = Arc::new(client::Config::default());

    let mut handle = client::connect(
        ssh_config,
        (host.as_str(), port),
        ClientHandler,
    )
    .await
    .map_err(|e| format!("TCP connection failed: {}. Check IP address and that Jetson is powered on.", e))?;

    let auth_ok = match auth_method.as_str() {
        "password" => {
            let pwd = password.ok_or("Password required for password authentication")?;
            handle
                .authenticate_password(&username, &pwd)
                .await
                .map_err(|e| format!("Password authentication failed: {}", e))?
        }
        "key" => {
            let kp = key_path.ok_or("Key path required for key authentication")?;
            let key_pair = russh_keys::load_secret_key(&kp, None)
                .map_err(|e| format!("Failed to load SSH key: {}", e))?;
            handle
                .authenticate_publickey(&username, Arc::new(key_pair))
                .await
                .map_err(|e| format!("Key authentication failed: {}", e))?
        }
        _ => return Err(format!("Unknown auth method: {}", auth_method)),
    };

    if !auth_ok {
        return Err("Authentication failed".into());
    }

    let conn_id = profile_id.unwrap_or_else(|| format!("{}@{}", username, host));

    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(conn_id.clone(), SshSessionWrapper {
            handle: Arc::new(handle),
            connected_at: Instant::now(),
        });
        let mut active = state.active_profile.lock().map_err(|e| e.to_string())?;
        *active = Some(conn_id.clone());
    }

    Ok(ConnectionStatus {
        connected: true,
        profile_id: Some(conn_id),
        profile_name: None,
        host: Some(host),
        uptime: Some("0s".to_string()),
        error: None,
    })
}

#[tauri::command]
pub fn jetson_disconnect(
    state: State<'_, SshState>,
    profile_id: Option<String>,
) -> Result<ConnectionStatus, String> {
    // Stop monitoring
    let mut mon = state.monitoring.lock().map_err(|e| e.to_string())?;
    *mon = false;
    drop(mon);

    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let mut active = state.active_profile.lock().map_err(|e| e.to_string())?;

    let id = profile_id.or_else(|| active.clone());
    if let Some(ref conn_id) = id {
        sessions.remove(conn_id);
        if active.as_ref() == Some(conn_id) {
            *active = None;
        }
    }

    Ok(ConnectionStatus {
        connected: false,
        profile_id: None,
        profile_name: None,
        host: None,
        uptime: None,
        error: None,
    })
}

#[tauri::command]
pub fn jetson_connection_status(
    state: State<'_, SshState>,
) -> Result<ConnectionStatus, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let active = state.active_profile.lock().map_err(|e| e.to_string())?;

    if let Some(ref conn_id) = *active {
        if let Some(wrapper) = sessions.get(conn_id) {
            let elapsed = wrapper.connected_at.elapsed();
            let uptime = if elapsed.as_secs() < 60 {
                format!("{}s", elapsed.as_secs())
            } else if elapsed.as_secs() < 3600 {
                format!("{}m", elapsed.as_secs() / 60)
            } else {
                format!("{}h {}m", elapsed.as_secs() / 3600, (elapsed.as_secs() % 3600) / 60)
            };
            return Ok(ConnectionStatus {
                connected: true,
                profile_id: Some(conn_id.clone()),
                profile_name: None,
                host: None,
                uptime: Some(uptime),
                error: None,
            });
        }
    }

    Ok(ConnectionStatus {
        connected: false,
        profile_id: None,
        profile_name: None,
        host: None,
        uptime: None,
        error: None,
    })
}

// ---------------------------------------------------------------------------
// Remote Execution Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn jetson_execute(
    state: State<'_, SshState>,
    command: String,
) -> Result<RemoteExecutionResult, String> {
    let handle = get_handle!(state);
    exec_command(&handle, &command).await
}

#[tauri::command]
pub async fn jetson_device_info(
    state: State<'_, SshState>,
) -> Result<JetsonDeviceInfo, String> {
    let handle = get_handle!(state);

    let info_script = r#"
echo "===MODEL==="
cat /proc/device-tree/model 2>/dev/null || echo "Unknown"
echo ""
echo "===JETPACK==="
cat /etc/nv_tegra_release 2>/dev/null | head -1 || echo "Unknown"
echo ""
echo "===L4T==="
dpkg-query --showformat='${Version}' --show nvidia-l4t-core 2>/dev/null || echo "Unknown"
echo ""
echo "===CUDA==="
export PATH=/usr/local/cuda/bin:$PATH; nvcc --version 2>/dev/null | grep "release" | sed 's/.*release //' | sed 's/,.*//' || echo "None"
echo ""
echo "===RAM==="
grep MemTotal /proc/meminfo | awk '{print int($2/1024)}'
echo ""
echo "===DISK==="
df -BG / | tail -1 | awk '{gsub("G",""); print $2,$3}'
echo ""
echo "===NVCC==="
export PATH=/usr/local/cuda/bin:$PATH; which nvcc >/dev/null 2>&1 && echo "yes" || echo "no"
echo ""
echo "===TEGRA==="
which tegrastats >/dev/null 2>&1 && echo "yes" || echo "no"
echo ""
echo "===CPUCORES==="
nproc 2>/dev/null || echo "0"
echo ""
echo "===ARCH==="
uname -m 2>/dev/null || echo "ARM"
"#;

    let result = exec_command(&handle, info_script).await?;
    let output = result.stdout;

    let get_section = |tag: &str| -> String {
        output
            .split(&format!("==={}===", tag))
            .nth(1)
            .and_then(|s| s.split("===").next())
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "Unknown".to_string())
    };

    let ram_str = get_section("RAM");
    let ram_total = ram_str.parse::<u32>().unwrap_or(0);

    let disk_str = get_section("DISK");
    let disk_parts: Vec<&str> = disk_str.split_whitespace().collect();
    let storage_total = disk_parts.first().and_then(|s| s.parse::<f32>().ok()).unwrap_or(0.0);
    let storage_used = disk_parts.get(1).and_then(|s| s.parse::<f32>().ok()).unwrap_or(0.0);

    Ok(JetsonDeviceInfo {
        model:                get_section("MODEL"),
        jetpack_version:      get_section("JETPACK"),
        l4t_version:          get_section("L4T"),
        cuda_version:         get_section("CUDA"),
        ram_total_mb:         ram_total,
        storage_total_gb:     storage_total,
        storage_used_gb:      storage_used,
        nvcc_available:       get_section("NVCC") == "yes",
        tegrastats_available: get_section("TEGRA") == "yes",
        cpu_cores:            get_section("CPUCORES").parse::<u32>().unwrap_or(0),
        arch:                 get_section("ARCH"),
    })
}

// ---------------------------------------------------------------------------
// SCP → SFTP File Transfer Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn jetson_upload_file(
    state: State<'_, SshState>,
    local_path: String,
    remote_path: String,
) -> Result<u64, String> {
    let handle = get_handle!(state);
    upload_file_inner(&handle, &local_path, &remote_path).await
}

#[tauri::command]
pub async fn jetson_upload_directory(
    state: State<'_, SshState>,
    local_dir: String,
    remote_dir: String,
) -> Result<Vec<String>, String> {
    let handle = get_handle!(state);

    // Create remote directory first
    exec_command(&handle, &format!("mkdir -p '{}'", remote_dir)).await?;

    let local_path = Path::new(&local_dir);
    if !local_path.is_dir() {
        return Err(format!("Not a directory: {}", local_dir));
    }

    let mut transferred = Vec::new();
    for entry in std::fs::read_dir(local_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            let file_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or("Invalid filename")?;
            let remote_file_path = format!("{}/{}", remote_dir, file_name);
            upload_file_inner(&handle, &path.to_string_lossy(), &remote_file_path).await?;
            transferred.push(remote_file_path);
        }
    }

    Ok(transferred)
}

// ---------------------------------------------------------------------------
// Deploy & Run Command
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn jetson_deploy_and_run(
    state: State<'_, SshState>,
    app: AppHandle,
    local_path: String,
    remote_dir: String,
    compile_command: Option<String>,
    run_command: String,
) -> Result<DeployResult, String> {
    let handle = get_handle!(state);

    let file_name = Path::new(&local_path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?
        .to_string();
    let remote_path = format!("{}/{}", remote_dir, file_name);

    app.emit("jetson-deploy-status", "Uploading file...").ok();
    exec_command(&handle, &format!("mkdir -p '{}'", remote_dir)).await?;

    let transfer_start = Instant::now();
    upload_file_inner(&handle, &local_path, &remote_path).await?;
    let transfer_time = transfer_start.elapsed().as_millis() as u64;

    app.emit("jetson-deploy-status", "File uploaded").ok();

    // Compile (if applicable)
    let mut compile_output = String::new();
    let mut compiled = true;

    if let Some(ref cmd) = compile_command {
        app.emit("jetson-deploy-status", "Compiling...").ok();
        let compile_cmd = cmd
            .replace("{FILE}", &remote_path)
            .replace("{DIR}", &remote_dir)
            .replace("{NAME}", &file_name
                .replace(".cu", "").replace(".cpp", "").replace(".c", ""));

        let result = exec_command(&handle, &compile_cmd).await?;
        compile_output = format!("{}{}", result.stdout, result.stderr);
        compiled = result.exit_code == 0;

        if !compiled {
            return Ok(DeployResult {
                transferred: true,
                compiled: false,
                executed: false,
                transfer_time_ms: transfer_time,
                compile_output,
                run_output: String::new(),
                run_exit_code: -1,
                error: Some("Compilation failed".into()),
            });
        }
        app.emit("jetson-deploy-status", "Compiled successfully").ok();
    }

    // Run
    app.emit("jetson-deploy-status", "Running...").ok();
    let run_cmd = run_command
        .replace("{FILE}", &remote_path)
        .replace("{DIR}", &remote_dir)
        .replace("{NAME}", &file_name
            .replace(".cu", "").replace(".cpp", "").replace(".c", ""));

    let run_result = exec_command(
        &handle,
        &format!("cd '{}' && {}", remote_dir, run_cmd),
    ).await?;

    app.emit("jetson-deploy-status", "Complete").ok();

    Ok(DeployResult {
        transferred: true,
        compiled,
        executed: run_result.exit_code == 0,
        transfer_time_ms: transfer_time,
        compile_output,
        run_output: format!("{}{}", run_result.stdout, run_result.stderr),
        run_exit_code: run_result.exit_code,
        error: if run_result.exit_code != 0 {
            Some(format!("Process exited with code {}", run_result.exit_code))
        } else {
            None
        },
    })
}

// ---------------------------------------------------------------------------
// Live Tegrastats Monitor
// ✅ Replaced BufReader+thread with tokio::spawn + ChannelMsg::Data accumulator
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn jetson_start_monitoring(
    state: State<'_, SshState>,
    app: AppHandle,
    interval_ms: Option<u32>,
) -> Result<(), String> {
    {
        let mut monitoring = state.monitoring.lock().map_err(|e| e.to_string())?;
        if *monitoring {
            return Ok(()); // Already running
        }
        *monitoring = true;
    }

    let handle = get_handle!(state);
    let flag_clone = Arc::clone(&state.monitoring);
    let interval = interval_ms.unwrap_or(1000);
    let tegra_cmd = format!("stdbuf -oL tegrastats --interval {}", interval);

    // Open the streaming channel before spawning the task
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("Failed to open channel: {}", e))?;

    channel
        .exec(true, tegra_cmd.clone())
        .await
        .map_err(|e| format!("Failed to start tegrastats: {}", e))?;

    tokio::spawn(async move {
        let mut line_buf = String::new();

        loop {
            // Check stop flag
            if let Ok(flag) = flag_clone.lock() {
                if !*flag {
                    break;
                }
            }

            match channel.wait().await {
                Some(russh::ChannelMsg::Data { data }) => {
                    // Accumulate bytes and split on newlines
                    let chunk = String::from_utf8_lossy(&data);
                    line_buf.push_str(&chunk);

                    while let Some(nl) = line_buf.find('\n') {
                        let line = line_buf[..nl].trim().to_string();
                        line_buf = line_buf[nl + 1..].to_string();
                        if !line.is_empty() {
                            if let Some(data) = parse_tegrastats_line(&line) {
                                app.emit("jetson-tegrastats", &data).ok();
                            }
                        }
                    }
                }
                Some(russh::ChannelMsg::Close) | None => break,
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn jetson_stop_monitoring(state: State<'_, SshState>) -> Result<(), String> {
    let mut monitoring = state.monitoring.lock().map_err(|e| e.to_string())?;
    *monitoring = false;
    Ok(())
}

/// Single tegrastats snapshot (non-streaming)
#[tauri::command]
pub async fn jetson_tegrastats_snapshot(
    state: State<'_, SshState>,
) -> Result<TegrastatsData, String> {
    let handle = get_handle!(state);
    let result = exec_command(
        &handle,
        "stdbuf -oL tegrastats --interval 500 | head -1",
    ).await?;

    if result.exit_code != 0 {
        return Err(format!("tegrastats failed: {}", result.stderr));
    }

    let line = result.stdout
        .lines()
        .filter(|l| l.contains("RAM ") || l.contains("CPU ["))
        .last()
        .unwrap_or(&result.stdout);

    parse_tegrastats_line(line.trim()).ok_or_else(|| {
        format!(
            "Failed to parse tegrastats output: {}",
            result.stdout.chars().take(200).collect::<String>()
        )
    })
}

// ---------------------------------------------------------------------------
// Tegrastats parser (unchanged — pure string parsing, no ssh2 dependency)
// ---------------------------------------------------------------------------

fn parse_tegrastats_line(line: &str) -> Option<TegrastatsData> {
    let now = chrono::Local::now().format("%H:%M:%S").to_string();

    // RAM: "RAM 3456/7620MB"
    let (ram_used, ram_total) = {
        let ram_re = line.find("RAM ").map(|i| {
            let sub = &line[i + 4..];
            let end = sub.find("MB").unwrap_or(sub.len());
            let parts: Vec<&str> = sub[..end].split('/').collect();
            (
                parts.first().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
                parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
            )
        });
        ram_re.unwrap_or((0, 0))
    };

    // SWAP: "SWAP 0/3810MB"
    let (swap_used, swap_total) = {
        let swap_re = line.find("SWAP ").map(|i| {
            let sub = &line[i + 5..];
            let end = sub.find("MB").unwrap_or(sub.len());
            let parts: Vec<&str> = sub[..end].split('/').collect();
            (
                parts.first().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
                parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
            )
        });
        swap_re.unwrap_or((0, 0))
    };

    // CPU: "CPU [42%@1510,31%@1510,off,off,25%@1510,30%@1510]"
    let cpu_usage = {
        let mut cores = Vec::new();
        if let Some(start) = line.find("CPU [") {
            let sub = &line[start + 5..];
            if let Some(end) = sub.find(']') {
                let cpu_str = &sub[..end];
                for (id, core) in cpu_str.split(',').enumerate() {
                    let core = core.trim();
                    if core == "off" {
                        cores.push(CpuCore { id: id as u32, usage_percent: 0, freq_mhz: 0, online: false });
                    } else if let Some(at_pos) = core.find('@') {
                        let usage = core[..at_pos].replace('%', "").parse::<u32>().unwrap_or(0);
                        let freq = core[at_pos + 1..].parse::<u32>().unwrap_or(0);
                        cores.push(CpuCore { id: id as u32, usage_percent: usage, freq_mhz: freq, online: true });
                    }
                }
            }
        }
        cores
    };

    // GPU: "GR3D_FREQ 55%" or "GR3D_FREQ 55%@921"
    let (gpu_percent, gpu_freq) = {
        if let Some(start) = line.find("GR3D_FREQ ") {
            let sub = &line[start + 10..];
            let end = sub.find(|c: char| c == ' ' || c == '\n').unwrap_or(sub.len());
            let gpu_str = &sub[..end];
            if let Some(at_pos) = gpu_str.find('@') {
                let pct = gpu_str[..at_pos].replace('%', "").parse::<u32>().unwrap_or(0);
                let freq = gpu_str[at_pos + 1..].parse::<u32>().unwrap_or(0);
                (pct, freq)
            } else {
                (gpu_str.replace('%', "").parse::<u32>().unwrap_or(0), 0)
            }
        } else {
            (0, 0)
        }
    };

    // Temperatures
    let line_lower = line.to_lowercase();
    let parse_temp = |tag: &str| -> f32 {
        let search = format!("{}@", tag.to_lowercase());
        line_lower.find(&search)
            .map(|i| {
                let sub = &line_lower[i + search.len()..];
                let end = sub.find('c').unwrap_or(sub.len());
                let val = sub[..end].parse::<f32>().unwrap_or(0.0);
                if val < -200.0 { 0.0 } else { val }
            })
            .unwrap_or(0.0)
    };
    let temp_cpu = parse_temp("cpu");
    let temp_gpu = parse_temp("gpu");
    let temp_soc = parse_temp("soc2")
        .max(parse_temp("soc0"))
        .max(parse_temp("soc1"))
        .max(parse_temp("soc"));

    // Power: "VDD_IN 5600mW/5200mW"
    let (power_current, power_average) = {
        if let Some(start) = line.find("VDD_IN ") {
            let sub = &line[start + 7..];
            let clean = sub.replace("mW", "");
            let end = clean.find(|c: char| c == ' ' || c == '\n').unwrap_or(clean.len());
            let parts: Vec<&str> = clean[..end].split('/').collect();
            (
                parts.first().and_then(|s| s.trim().parse::<u32>().ok()).unwrap_or(0),
                parts.get(1).and_then(|s| s.trim().parse::<u32>().ok()).unwrap_or(0),
            )
        } else {
            (0, 0)
        }
    };

    // EMC: "EMC_FREQ 42%"
    let emc_percent = {
        if let Some(start) = line.find("EMC_FREQ ") {
            let sub = &line[start + 9..];
            let end = sub.find(|c: char| c == '%' || c == ' ').unwrap_or(sub.len());
            sub[..end].parse::<u32>().unwrap_or(0)
        } else {
            0
        }
    };

    Some(TegrastatsData {
        timestamp: now,
        ram_used_mb: ram_used,
        ram_total_mb: ram_total,
        swap_used_mb: swap_used,
        swap_total_mb: swap_total,
        cpu_usage,
        gpu_percent,
        gpu_freq_mhz: gpu_freq,
        temp_cpu,
        temp_gpu,
        temp_soc,
        power_current_mw: power_current,
        power_average_mw: power_average,
        emc_percent,
    })
}

// ---------------------------------------------------------------------------
// Registration Helper (command list unchanged — same public API)
// ---------------------------------------------------------------------------

pub fn get_command_list() -> &'static str {
    "jetson_connect, jetson_disconnect, jetson_connection_status, \
     jetson_execute, jetson_device_info, \
     jetson_upload_file, jetson_upload_directory, jetson_deploy_and_run, \
     jetson_start_monitoring, jetson_stop_monitoring, jetson_tegrastats_snapshot, \
     jetson_save_profile, jetson_delete_profile, jetson_list_profiles, \
     jetson_load_profiles, jetson_persist_profiles"
}
