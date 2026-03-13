// src-tauri/src/android_commands.rs
// ═══════════════════════════════════════════════════════════════════
// 📱 ANDROID DEVELOPMENT INTEGRATION — Operator X02 Code IDE
// ═══════════════════════════════════════════════════════════════════
// Provides: ADB device management, Logcat, Gradle builds, APK tools,
//           and Android ↔ Arduino bridge support
//
// Pattern: Same as arduino_commands.rs — wraps CLI tools via Command
// Dependencies: serde, serde_json, std::process::Command (already in project)
// New Cargo.toml deps: NONE
// ═══════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ============================================================================
// HELPER: Create hidden command (same pattern as main.rs)
// ============================================================================
#[cfg(target_os = "windows")]
fn android_hidden_cmd(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn android_hidden_cmd(program: &str) -> Command {
    Command::new(program)
}

// ============================================================================
// STRUCTS
// ============================================================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AndroidDevice {
    pub serial: String,
    pub state: String,
    pub model: String,
    pub product: String,
    pub transport: String,
    pub android_version: String,
    pub api_level: String,
    pub battery: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AdbResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogcatEntry {
    pub timestamp: String,
    pub pid: String,
    pub tid: String,
    pub level: String,
    pub tag: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GradleResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
    pub apk_path: Option<String>,
    pub duration_ms: u64,
}

// ============================================================================
// HELPER: Find ADB path
// ============================================================================
fn find_adb_path() -> Result<String, String> {
    // 1. Check if adb is on PATH
    let check = android_hidden_cmd("adb").arg("version").output();
    if let Ok(output) = check {
        if output.status.success() {
            return Ok("adb".to_string());
        }
    }

    // 2. Check ANDROID_HOME / ANDROID_SDK_ROOT
    for var in &["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(home) = std::env::var(var) {
            let p = format!("{}\\platform-tools\\adb.exe", home);
            if Path::new(&p).exists() { return Ok(p); }
        }
    }

    // 3. Check common Windows SDK locations
    #[cfg(target_os = "windows")]
    {
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let paths = vec![
            format!("{}\\Android\\Sdk\\platform-tools\\adb.exe", local),
            format!("{}\\Android\\sdk\\platform-tools\\adb.exe", local),
            "C:\\Android\\sdk\\platform-tools\\adb.exe".to_string(),
        ];
        for p in paths {
            if Path::new(&p).exists() { return Ok(p); }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let paths = vec![
            format!("{}/Android/Sdk/platform-tools/adb", home),
            format!("{}/Library/Android/sdk/platform-tools/adb", home),
        ];
        for p in paths {
            if Path::new(&p).exists() { return Ok(p); }
        }
    }

    Err("ADB not found. Install Android SDK Platform Tools or set ANDROID_HOME".to_string())
}

// ============================================================================
// HELPER: Run ADB command
// ============================================================================
fn run_adb(args: &[&str]) -> AdbResult {
    let adb_path = match find_adb_path() {
        Ok(p) => p,
        Err(e) => return AdbResult { stdout: String::new(), stderr: e, success: false },
    };

    println!("📱 ADB: {} {}", adb_path, args.join(" "));

    match android_hidden_cmd(&adb_path).args(args).output() {
        Ok(out) => AdbResult {
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            success: out.status.success(),
        },
        Err(e) => AdbResult {
            stdout: String::new(),
            stderr: format!("Failed to execute ADB: {}", e),
            success: false,
        },
    }
}

fn run_adb_device(device_id: &str, args: &[&str]) -> AdbResult {
    let adb_path = match find_adb_path() {
        Ok(p) => p,
        Err(e) => return AdbResult { stdout: String::new(), stderr: e, success: false },
    };

    let mut full_args = vec!["-s", device_id];
    full_args.extend_from_slice(args);
    println!("📱 ADB [{}]: {}", device_id, full_args.join(" "));

    match android_hidden_cmd(&adb_path).args(&full_args).output() {
        Ok(out) => AdbResult {
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            success: out.status.success(),
        },
        Err(e) => AdbResult {
            stdout: String::new(),
            stderr: format!("Failed to execute ADB: {}", e),
            success: false,
        },
    }
}

// ════════════════════════════════════════════════════════════════
// 📱 ADB DETECTION
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_check_adb() -> Result<String, String> {
    println!("📱 Checking ADB availability...");
    let adb_path = find_adb_path()?;
    let result = run_adb(&["version"]);
    if result.success {
        Ok(format!("{}\n{}", adb_path, result.stdout.trim()))
    } else {
        Err(format!("ADB found but not working: {}", result.stderr))
    }
}

#[tauri::command]
pub async fn android_get_sdk_path() -> Result<String, String> {
    for var in &["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Ok(home) = std::env::var(var) {
            if Path::new(&home).exists() { return Ok(home); }
        }
    }
    let adb_path = find_adb_path()?;
    if let Some(pt) = Path::new(&adb_path).parent() {
        if let Some(sdk) = pt.parent() {
            return Ok(sdk.to_string_lossy().to_string());
        }
    }
    Err("Android SDK path not found".to_string())
}

// ════════════════════════════════════════════════════════════════
// 📱 DEVICE MANAGEMENT
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_list_devices() -> Result<Vec<AndroidDevice>, String> {
    println!("📱 Listing connected Android devices...");
    let result = run_adb(&["devices", "-l"]);
    if !result.success {
        return Err(format!("ADB devices failed: {}", result.stderr));
    }

    let mut devices = Vec::new();
    for line in result.stdout.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() || line.starts_with("*") { continue; }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 { continue; }

        let serial = parts[0].to_string();
        let state = parts[1].to_string();
        let mut model = String::new();
        let mut product = String::new();
        let transport = if serial.contains(":") { "tcp".to_string() } else { "usb".to_string() };

        for part in &parts[2..] {
            if part.starts_with("model:") { model = part.replace("model:", "").replace("_", " "); }
            if part.starts_with("product:") { product = part.replace("product:", ""); }
        }

        let (mut android_version, mut api_level, mut battery) = (String::new(), String::new(), String::new());
        if state == "device" {
            let ver = run_adb_device(&serial, &["shell", "getprop", "ro.build.version.release"]);
            if ver.success { android_version = ver.stdout.trim().to_string(); }

            let api = run_adb_device(&serial, &["shell", "getprop", "ro.build.version.sdk"]);
            if api.success { api_level = api.stdout.trim().to_string(); }

            let batt = run_adb_device(&serial, &["shell", "dumpsys", "battery"]);
            if batt.success {
                for bl in batt.stdout.lines() {
                    if bl.trim().starts_with("level:") {
                        battery = format!("{}%", bl.trim().replace("level:", "").trim());
                        break;
                    }
                }
            }

            if model.is_empty() {
                let m = run_adb_device(&serial, &["shell", "getprop", "ro.product.model"]);
                if m.success { model = m.stdout.trim().to_string(); }
            }
        }

        devices.push(AndroidDevice { serial, state, model, product, transport, android_version, api_level, battery });
    }

    println!("📱 Found {} device(s)", devices.len());
    Ok(devices)
}

#[tauri::command]
pub async fn android_connect_wireless(ip: String, port: Option<u16>) -> Result<String, String> {
    let addr = format!("{}:{}", ip, port.unwrap_or(5555));
    let result = run_adb(&["connect", &addr]);
    if result.stdout.contains("connected") || result.stdout.contains("already") {
        Ok(format!("Connected to {}", addr))
    } else {
        Err(format!("Connection failed: {} {}", result.stdout, result.stderr))
    }
}

#[tauri::command]
pub async fn android_disconnect(device_id: String) -> Result<String, String> {
    Ok(run_adb(&["disconnect", &device_id]).stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_pair_device(ip: String, port: u16, code: String) -> Result<String, String> {
    let addr = format!("{}:{}", ip, port);
    let result = run_adb(&["pair", &addr, &code]);
    if result.stdout.contains("Successfully paired") {
        Ok("Paired successfully".to_string())
    } else {
        Err(format!("Pairing failed: {} {}", result.stdout, result.stderr))
    }
}

// ════════════════════════════════════════════════════════════════
// 📋 LOGCAT
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_logcat_dump(
    device_id: String,
    package_filter: Option<String>,
    level: Option<String>,
    max_lines: Option<u32>,
) -> Result<Vec<LogcatEntry>, String> {
    let n = max_lines.unwrap_or(200);
    let n_str = format!("{}", n);
    let mut args: Vec<&str> = vec!["shell", "logcat", "-d", "-v", "threadtime", "-t", &n_str];

    let level_filter;
    if let Some(ref lvl) = level {
        level_filter = format!("*:{}", lvl);
        args.push(&level_filter);
    }

    let result = run_adb_device(&device_id, &args);
    if !result.success {
        return Err(format!("Logcat failed: {}", result.stderr));
    }

    let mut entries = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("-") { continue; }

        // threadtime format: "MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE"
        let parts: Vec<&str> = line.splitn(7, char::is_whitespace).collect();
        if parts.len() >= 6 {
            let entry = LogcatEntry {
                timestamp: format!("{} {}", parts.first().unwrap_or(&""), parts.get(1).unwrap_or(&"")),
                pid: parts.get(2).unwrap_or(&"").to_string(),
                tid: parts.get(3).unwrap_or(&"").to_string(),
                level: parts.get(4).unwrap_or(&"").to_string(),
                tag: parts.get(5).unwrap_or(&"").trim_end_matches(':').to_string(),
                message: parts.get(6).unwrap_or(&"").to_string(),
            };

            if let Some(ref pkg) = package_filter {
                if !entry.tag.contains(pkg.as_str()) && !entry.message.contains(pkg.as_str()) { continue; }
            }
            entries.push(entry);
        }
    }
    Ok(entries)
}

#[tauri::command]
pub async fn android_logcat_clear(device_id: String) -> Result<(), String> {
    let r = run_adb_device(&device_id, &["logcat", "-c"]);
    if r.success { Ok(()) } else { Err(r.stderr) }
}

#[tauri::command]
pub async fn android_get_app_pid(device_id: String, package: String) -> Result<String, String> {
    let r = run_adb_device(&device_id, &["shell", "pidof", &package]);
    if r.success && !r.stdout.trim().is_empty() { Ok(r.stdout.trim().to_string()) }
    else { Err(format!("App {} not running", package)) }
}

// ════════════════════════════════════════════════════════════════
// 📲 APP MANAGEMENT
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_install_apk(device_id: String, apk_path: String) -> Result<String, String> {
    if !Path::new(&apk_path).exists() {
        return Err(format!("APK not found: {}", apk_path));
    }
    let r = run_adb_device(&device_id, &["install", "-r", &apk_path]);
    if r.stdout.contains("Success") { Ok("APK installed".to_string()) }
    else { Err(format!("Install failed: {} {}", r.stdout, r.stderr)) }
}

#[tauri::command]
pub async fn android_uninstall_app(device_id: String, package: String) -> Result<String, String> {
    let r = run_adb_device(&device_id, &["uninstall", &package]);
    Ok(format!("{} {}", r.stdout.trim(), r.stderr.trim()))
}

#[tauri::command]
pub async fn android_launch_app(device_id: String, package: String, activity: Option<String>) -> Result<String, String> {
    if let Some(act) = activity {
        let component = format!("{}/{}", package, act);
        let r = run_adb_device(&device_id, &["shell", "am", "start", "-n", &component]);
        Ok(r.stdout.trim().to_string())
    } else {
        let r = run_adb_device(&device_id, &["shell", "monkey", "-p", &package, "-c", "android.intent.category.LAUNCHER", "1"]);
        if r.success { Ok(format!("Launched {}", package)) }
        else { Err(format!("Launch failed: {}", r.stderr)) }
    }
}

#[tauri::command]
pub async fn android_force_stop(device_id: String, package: String) -> Result<(), String> {
    let r = run_adb_device(&device_id, &["shell", "am", "force-stop", &package]);
    if r.success { Ok(()) } else { Err(r.stderr) }
}

#[tauri::command]
pub async fn android_clear_data(device_id: String, package: String) -> Result<String, String> {
    Ok(run_adb_device(&device_id, &["shell", "pm", "clear", &package]).stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_list_packages(device_id: String, filter: Option<String>) -> Result<Vec<String>, String> {
    let r = run_adb_device(&device_id, &["shell", "pm", "list", "packages", "-3"]);
    if !r.success { return Err(r.stderr); }

    Ok(r.stdout.lines()
        .map(|l| l.trim().replace("package:", ""))
        .filter(|p| {
            if let Some(ref f) = filter { p.contains(f.as_str()) } else { true }
        })
        .collect())
}

// ════════════════════════════════════════════════════════════════
// 📸 DEVICE UTILITIES
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_screenshot(device_id: String, save_path: String) -> Result<String, String> {
    run_adb_device(&device_id, &["shell", "screencap", "-p", "/sdcard/x02_screenshot.png"]);
    let pull = run_adb_device(&device_id, &["pull", "/sdcard/x02_screenshot.png", &save_path]);
    run_adb_device(&device_id, &["shell", "rm", "/sdcard/x02_screenshot.png"]);
    if pull.success { Ok(save_path) } else { Err(format!("Screenshot failed: {}", pull.stderr)) }
}

#[tauri::command]
pub async fn android_shell(device_id: String, command: String) -> Result<AdbResult, String> {
    let parts: Vec<&str> = command.split_whitespace().collect();
    let mut args = vec!["shell"];
    args.extend(parts);
    Ok(run_adb_device(&device_id, &args))
}

#[tauri::command]
pub async fn android_push_file(device_id: String, local: String, remote: String) -> Result<String, String> {
    let r = run_adb_device(&device_id, &["push", &local, &remote]);
    if r.success { Ok(r.stdout.trim().to_string()) } else { Err(r.stderr) }
}

#[tauri::command]
pub async fn android_pull_file(device_id: String, remote: String, local: String) -> Result<String, String> {
    let r = run_adb_device(&device_id, &["pull", &remote, &local]);
    if r.success { Ok(r.stdout.trim().to_string()) } else { Err(r.stderr) }
}

#[tauri::command]
pub async fn android_open_deeplink(device_id: String, uri: String) -> Result<String, String> {
    let r = run_adb_device(&device_id, &["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", &uri]);
    Ok(r.stdout.trim().to_string())
}

// ════════════════════════════════════════════════════════════════
// 🔨 GRADLE BUILD
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_gradle_build(project_path: String, task: String) -> Result<GradleResult, String> {
    println!("🔨 Gradle {} in {}...", task, project_path);
    let start = std::time::Instant::now();

    let gradlew = if cfg!(target_os = "windows") {
        format!("{}\\gradlew.bat", project_path)
    } else {
        format!("{}/gradlew", project_path)
    };

    let cmd_name = if Path::new(&gradlew).exists() { gradlew } else { "gradle".to_string() };

    let output = android_hidden_cmd(&cmd_name)
        .arg(&task)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Gradle failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let success = output.status.success();
    let duration_ms = start.elapsed().as_millis() as u64;

    let mut apk_path = None;
    if success && task.contains("assemble") {
        let build_dir = format!("{}{}app{}build{}outputs{}apk", project_path,
            std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR,
            std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR,
            std::path::MAIN_SEPARATOR);
        let debug_apk = format!("{}{}debug{}app-debug.apk", build_dir,
            std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);
        let release_apk = format!("{}{}release{}app-release.apk", build_dir,
            std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);

        if task.contains("Debug") && Path::new(&debug_apk).exists() { apk_path = Some(debug_apk); }
        else if task.contains("Release") && Path::new(&release_apk).exists() { apk_path = Some(release_apk); }
    }

    Ok(GradleResult { stdout, stderr, success, apk_path, duration_ms })
}

// ════════════════════════════════════════════════════════════════
// 🚀 BUILD → INSTALL → RUN PIPELINE
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_build_and_run(project_path: String, device_id: String, build_type: Option<String>) -> Result<String, String> {
    let variant = build_type.unwrap_or_else(|| "debug".to_string());
    let task = format!("assemble{}{}", &variant[..1].to_uppercase(), &variant[1..]);

    // Build
    let build = android_gradle_build(project_path.clone(), task).await?;
    if !build.success { return Err(format!("Build failed:\n{}", build.stderr)); }

    // Install
    let apk = build.apk_path.ok_or("APK not found after build")?;
    android_install_apk(device_id.clone(), apk).await?;

    // Get package name from manifest
    let manifest = format!("{}{}app{}src{}main{}AndroidManifest.xml",
        project_path, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR,
        std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);
    let mut pkg = String::new();
    if let Ok(content) = std::fs::read_to_string(&manifest) {
        for line in content.lines() {
            if let Some(start) = line.find("package=\"") {
                let rest = &line[start + 9..];
                if let Some(end) = rest.find("\"") { pkg = rest[..end].to_string(); }
            }
        }
    }

    // Launch
    if !pkg.is_empty() {
        android_launch_app(device_id, pkg.clone(), None).await?;
        Ok(format!("Built {}ms | Installed | Launched {}", build.duration_ms, pkg))
    } else {
        Ok(format!("Built {}ms | Installed (launch manually)", build.duration_ms))
    }
}

// ════════════════════════════════════════════════════════════════
// 🔌 ANDROID ↔ ARDUINO BRIDGE
// ════════════════════════════════════════════════════════════════

#[tauri::command]
pub async fn android_arduino_bridge_status() -> Result<serde_json::Value, String> {
    // Android devices
    let android_result = run_adb(&["devices", "-l"]);
    let android_count = android_result.stdout.lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty() && l.contains("device"))
        .count();

    // Arduino CLI
    let arduino_cli = android_hidden_cmd("arduino-cli").arg("version").output()
        .map(|o| o.status.success()).unwrap_or(false);

    // Serial ports (Arduino boards)
    let serial_info = if arduino_cli {
        let r = android_hidden_cmd("arduino-cli").args(&["board", "list", "--format", "json"]).output();
        match r { Ok(out) => String::from_utf8_lossy(&out.stdout).to_string(), Err(_) => "[]".to_string() }
    } else { "[]".to_string() };

    Ok(serde_json::json!({
        "android_devices": android_count,
        "arduino_cli_available": arduino_cli,
        "serial_ports_json": serial_info,
        "bridge_ready": android_count > 0 && arduino_cli,
    }))
}

#[tauri::command]
pub async fn android_forward_port(device_id: String, local_port: u16, remote_port: u16) -> Result<String, String> {
    let local = format!("tcp:{}", local_port);
    let remote = format!("tcp:{}", remote_port);
    let r = run_adb_device(&device_id, &["forward", &local, &remote]);
    if r.success { Ok(format!("Forward localhost:{} -> device:{}", local_port, remote_port)) }
    else { Err(r.stderr) }
}

#[tauri::command]
pub async fn android_reverse_port(device_id: String, device_port: u16, local_port: u16) -> Result<String, String> {
    let dev = format!("tcp:{}", device_port);
    let loc = format!("tcp:{}", local_port);
    let r = run_adb_device(&device_id, &["reverse", &dev, &loc]);
    if r.success { Ok(format!("Reverse device:{} -> localhost:{}", device_port, local_port)) }
    else { Err(r.stderr) }
}
