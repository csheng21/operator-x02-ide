// src-tauri/src/android_commands.rs
// Android Development Integration for Operator X02 Code IDE
// Provides ADB device management, Logcat, Gradle build, and APK tools

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ============================================================================
// HELPER: Create hidden command (matches main.rs pattern)
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
    pub state: String,         // "device", "offline", "unauthorized"
    pub model: String,
    pub product: String,
    pub transport: String,     // "usb" or "tcp"
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
    pub level: String,    // V, D, I, W, E, F
    pub tag: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApkInfo {
    pub package_name: String,
    pub version_name: String,
    pub version_code: String,
    pub min_sdk: String,
    pub target_sdk: String,
    pub permissions: Vec<String>,
    pub activities: Vec<String>,
    pub file_size: u64,
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
    let check = android_hidden_cmd("adb")
        .arg("version")
        .output();
    
    if let Ok(output) = check {
        if output.status.success() {
            return Ok("adb".to_string());
        }
    }
    
    // 2. Check common Android SDK locations (Windows)
    #[cfg(target_os = "windows")]
    {
        let user_profile = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let sdk_paths = vec![
            format!("{}\\Android\\Sdk\\platform-tools\\adb.exe", user_profile),
            format!("{}\\Android\\sdk\\platform-tools\\adb.exe", user_profile),
            "C:\\Android\\sdk\\platform-tools\\adb.exe".to_string(),
            "C:\\Program Files\\Android\\sdk\\platform-tools\\adb.exe".to_string(),
        ];
        
        // Also check ANDROID_HOME / ANDROID_SDK_ROOT
        if let Ok(home) = std::env::var("ANDROID_HOME") {
            let p = format!("{}\\platform-tools\\adb.exe", home);
            if Path::new(&p).exists() { return Ok(p); }
        }
        if let Ok(root) = std::env::var("ANDROID_SDK_ROOT") {
            let p = format!("{}\\platform-tools\\adb.exe", root);
            if Path::new(&p).exists() { return Ok(p); }
        }
        
        for p in sdk_paths {
            if Path::new(&p).exists() {
                return Ok(p);
            }
        }
    }
    
    // 3. Check common locations (macOS/Linux)
    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let sdk_paths = vec![
            format!("{}/Android/Sdk/platform-tools/adb", home),
            format!("{}/Library/Android/sdk/platform-tools/adb", home),
            "/usr/local/bin/adb".to_string(),
        ];
        
        for p in sdk_paths {
            if Path::new(&p).exists() {
                return Ok(p);
            }
        }
    }
    
    Err("ADB not found. Install Android SDK Platform Tools or add adb to PATH".to_string())
}

// ============================================================================
// HELPER: Run ADB command
// ============================================================================
fn run_adb(args: &[&str]) -> AdbResult {
    let adb_path = match find_adb_path() {
        Ok(p) => p,
        Err(e) => return AdbResult {
            stdout: String::new(),
            stderr: e,
            success: false,
        },
    };
    
    println!(" ADB: {} {}", adb_path, args.join(" "));
    
    let output = android_hidden_cmd(&adb_path)
        .args(args)
        .output();
    
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            AdbResult {
                stdout,
                stderr,
                success: out.status.success(),
            }
        }
        Err(e) => AdbResult {
            stdout: String::new(),
            stderr: format!("Failed to execute ADB: {}", e),
            success: false,
        },
    }
}

// Helper for device-specific ADB commands
fn run_adb_device(device_id: &str, args: &[&str]) -> AdbResult {
    let adb_path = match find_adb_path() {
        Ok(p) => p,
        Err(e) => return AdbResult {
            stdout: String::new(),
            stderr: e,
            success: false,
        },
    };
    
    let mut full_args = vec!["-s", device_id];
    full_args.extend_from_slice(args);
    
    println!(" ADB [{}]: {}", device_id, full_args.join(" "));
    
    let output = android_hidden_cmd(&adb_path)
        .args(&full_args)
        .output();
    
    match output {
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


// ============================================================================
//  ADB DETECTION & SETUP
// ============================================================================

#[tauri::command]
pub async fn android_check_adb() -> Result<String, String> {
    println!(" Checking ADB availability...");
    let adb_path = find_adb_path()?;
    
    let result = run_adb(&["version"]);
    if result.success {
        println!(" ADB found: {}", adb_path);
        Ok(format!("{}\
{}", adb_path, result.stdout.trim()))
    } else {
        Err(format!("ADB found but not working: {}", result.stderr))
    }
}

#[tauri::command]
pub async fn android_get_sdk_path() -> Result<String, String> {
    // Check environment variables
    if let Ok(home) = std::env::var("ANDROID_HOME") {
        if Path::new(&home).exists() { return Ok(home); }
    }
    if let Ok(root) = std::env::var("ANDROID_SDK_ROOT") {
        if Path::new(&root).exists() { return Ok(root); }
    }
    
    // Try to derive from adb path
    let adb_path = find_adb_path()?;
    if let Some(platform_tools) = Path::new(&adb_path).parent() {
        if let Some(sdk) = platform_tools.parent() {
            return Ok(sdk.to_string_lossy().to_string());
        }
    }
    
    Err("Android SDK path not found. Set ANDROID_HOME environment variable.".to_string())
}


// ============================================================================
//  DEVICE MANAGEMENT
// ============================================================================

#[tauri::command]
pub async fn android_list_devices() -> Result<Vec<AndroidDevice>, String> {
    println!(" Listing connected Android devices...");
    
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
        
        // Extract model and product from the -l output
        let mut model = String::new();
        let mut product = String::new();
        let mut transport = String::from("usb");
        
        for part in &parts[2..] {
            if part.starts_with("model:") {
                model = part.replace("model:", "").replace("_", " ");
            } else if part.starts_with("product:") {
                product = part.replace("product:", "");
            } else if part.starts_with("transport_id:") {
                // Keep transport as is
            }
        }
        
        // Detect if TCP connection
        if serial.contains(":") {
            transport = "tcp".to_string();
        }
        
        // Get additional info if device is online
        let mut android_version = String::new();
        let mut api_level = String::new();
        let mut battery = String::new();
        
        if state == "device" {
            // Get Android version
            let ver = run_adb_device(&serial, &["shell", "getprop", "ro.build.version.release"]);
            if ver.success { android_version = ver.stdout.trim().to_string(); }
            
            // Get API level
            let api = run_adb_device(&serial, &["shell", "getprop", "ro.build.version.sdk"]);
            if api.success { api_level = api.stdout.trim().to_string(); }
            
            // Get battery level
            let batt = run_adb_device(&serial, &["shell", "dumpsys", "battery"]);
            if batt.success {
                for bline in batt.stdout.lines() {
                    if bline.trim().starts_with("level:") {
                        battery = format!("{}%", bline.trim().replace("level:", "").trim());
                        break;
                    }
                }
            }
            
            // Get model if not from -l output
            if model.is_empty() {
                let m = run_adb_device(&serial, &["shell", "getprop", "ro.product.model"]);
                if m.success { model = m.stdout.trim().to_string(); }
            }
        }
        
        devices.push(AndroidDevice {
            serial,
            state,
            model,
            product,
            transport,
            android_version,
            api_level,
            battery,
        });
    }
    
    println!(" Found {} device(s)", devices.len());
    Ok(devices)
}

#[tauri::command]
pub async fn android_connect_wireless(ip: String, port: Option<u16>) -> Result<String, String> {
    let addr = format!("{}:{}", ip, port.unwrap_or(5555));
    println!(" Connecting wirelessly to {}...", addr);
    
    let result = run_adb(&["connect", &addr]);
    if result.stdout.contains("connected") || result.stdout.contains("already") {
        Ok(format!("Connected to {}", addr))
    } else {
        Err(format!("Connection failed: {} {}", result.stdout, result.stderr))
    }
}

#[tauri::command]
pub async fn android_disconnect(device_id: String) -> Result<String, String> {
    let result = run_adb(&["disconnect", &device_id]);
    Ok(result.stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_pair_device(ip: String, port: u16, code: String) -> Result<String, String> {
    let addr = format!("{}:{}", ip, port);
    println!(" Pairing with {} using code {}...", addr, code);
    
    let result = run_adb(&["pair", &addr, &code]);
    if result.stdout.contains("Successfully paired") {
        Ok("Paired successfully".to_string())
    } else {
        Err(format!("Pairing failed: {} {}", result.stdout, result.stderr))
    }
}


// ============================================================================
//  LOGCAT
// ============================================================================

#[tauri::command]
pub async fn android_logcat_dump(
    device_id: String,
    package: Option<String>,
    level: Option<String>,
    lines: Option<u32>,
) -> Result<Vec<LogcatEntry>, String> {
    println!(" Reading logcat from {}...", device_id);
    
    let max_lines = lines.unwrap_or(200);
    let mut args = vec!["shell", "logcat", "-d", "-v", "threadtime"];
    
    let lines_str = format!("-t {}", max_lines);
    let lines_parts: Vec<&str> = lines_str.split_whitespace().collect();
    args.push(lines_parts[0]);
    args.push(lines_parts[1]);
    
    // Add level filter
    let level_filter;
    if let Some(lvl) = &level {
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
        
        // Parse threadtime format: "MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG: MESSAGE"
        let parts: Vec<&str> = line.splitn(7, |c: char| c.is_whitespace()).collect();
        if parts.len() >= 6 {
            let entry = LogcatEntry {
                timestamp: format!("{} {}", parts.get(0).unwrap_or(&""), parts.get(1).unwrap_or(&"")),
                pid: parts.get(2).unwrap_or(&"").to_string(),
                tid: parts.get(3).unwrap_or(&"").to_string(),
                level: parts.get(4).unwrap_or(&"").to_string(),
                tag: parts.get(5).unwrap_or(&"").trim_end_matches(':').to_string(),
                message: parts.get(6).unwrap_or(&"").to_string(),
            };
            
            // Filter by package if specified
            if let Some(pkg) = &package {
                if !entry.tag.contains(pkg) && !entry.message.contains(pkg) {
                    continue;
                }
            }
            
            entries.push(entry);
        }
    }
    
    Ok(entries)
}

#[tauri::command]
pub async fn android_logcat_clear(device_id: String) -> Result<(), String> {
    let result = run_adb_device(&device_id, &["logcat", "-c"]);
    if result.success {
        Ok(())
    } else {
        Err(format!("Failed to clear logcat: {}", result.stderr))
    }
}

// Get PID for a package (for filtered logcat)
#[tauri::command]
pub async fn android_get_app_pid(device_id: String, package: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &["shell", "pidof", &package]);
    if result.success && !result.stdout.trim().is_empty() {
        Ok(result.stdout.trim().to_string())
    } else {
        Err(format!("App {} not running", package))
    }
}


// ============================================================================
//  APP MANAGEMENT
// ============================================================================

#[tauri::command]
pub async fn android_install_apk(device_id: String, apk_path: String) -> Result<String, String> {
    println!(" Installing APK: {} on {}", apk_path, device_id);
    
    if !Path::new(&apk_path).exists() {
        return Err(format!("APK file not found: {}", apk_path));
    }
    
    let result = run_adb_device(&device_id, &["install", "-r", &apk_path]);
    if result.stdout.contains("Success") {
        Ok("APK installed successfully".to_string())
    } else {
        Err(format!("Install failed: {} {}", result.stdout, result.stderr))
    }
}

#[tauri::command]
pub async fn android_uninstall_app(device_id: String, package: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &["uninstall", &package]);
    Ok(format!("{} {}", result.stdout.trim(), result.stderr.trim()))
}

#[tauri::command]
pub async fn android_launch_app(device_id: String, package: String, activity: Option<String>) -> Result<String, String> {
    let component = if let Some(act) = activity {
        format!("{}/{}", package, act)
    } else {
        // Use monkey to launch default activity
        let result = run_adb_device(&device_id, &[
            "shell", "monkey", "-p", &package, "-c",
            "android.intent.category.LAUNCHER", "1"
        ]);
        return if result.success {
            Ok(format!("Launched {}", package))
        } else {
            Err(format!("Launch failed: {}", result.stderr))
        };
    };
    
    let result = run_adb_device(&device_id, &["shell", "am", "start", "-n", &component]);
    Ok(result.stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_force_stop(device_id: String, package: String) -> Result<(), String> {
    let result = run_adb_device(&device_id, &["shell", "am", "force-stop", &package]);
    if result.success { Ok(()) } else { Err(result.stderr) }
}

#[tauri::command]
pub async fn android_clear_data(device_id: String, package: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &["shell", "pm", "clear", &package]);
    Ok(result.stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_list_packages(device_id: String, filter: Option<String>) -> Result<Vec<String>, String> {
    let mut args = vec!["shell", "pm", "list", "packages", "-3"]; // -3 = third-party only
    
    let result = run_adb_device(&device_id, &args);
    if !result.success {
        return Err(format!("Failed to list packages: {}", result.stderr));
    }
    
    let packages: Vec<String> = result.stdout.lines()
        .filter_map(|line| {
            let pkg = line.trim().replace("package:", "");
            if let Some(f) = &filter {
                if pkg.contains(f) { Some(pkg) } else { None }
            } else {
                Some(pkg)
            }
        })
        .collect();
    
    Ok(packages)
}


// ============================================================================
//  DEVICE UTILITIES
// ============================================================================

#[tauri::command]
pub async fn android_screenshot(device_id: String, save_path: String) -> Result<String, String> {
    println!(" Taking screenshot from {}...", device_id);
    
    // Capture on device
    let cap = run_adb_device(&device_id, &["shell", "screencap", "-p", "/sdcard/x02_screenshot.png"]);
    if !cap.success {
        return Err(format!("Screenshot capture failed: {}", cap.stderr));
    }
    
    // Pull to PC
    let pull = run_adb_device(&device_id, &["pull", "/sdcard/x02_screenshot.png", &save_path]);
    if !pull.success {
        return Err(format!("Screenshot pull failed: {}", pull.stderr));
    }
    
    // Clean up device
    run_adb_device(&device_id, &["shell", "rm", "/sdcard/x02_screenshot.png"]);
    
    Ok(save_path)
}

#[tauri::command]
pub async fn android_screen_record_start(device_id: String) -> Result<String, String> {
    // Start recording in background (max 180s)
    let result = run_adb_device(&device_id, &[
        "shell", "screenrecord", "--time-limit", "180",
        "/sdcard/x02_recording.mp4", "&"
    ]);
    Ok("Recording started (max 3 min)".to_string())
}

#[tauri::command]
pub async fn android_screen_record_stop(device_id: String, save_path: String) -> Result<String, String> {
    // Kill screenrecord
    run_adb_device(&device_id, &["shell", "pkill", "-f", "screenrecord"]);
    
    // Wait a moment for file to finalize
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    // Pull recording
    let pull = run_adb_device(&device_id, &["pull", "/sdcard/x02_recording.mp4", &save_path]);
    if pull.success {
        run_adb_device(&device_id, &["shell", "rm", "/sdcard/x02_recording.mp4"]);
        Ok(save_path)
    } else {
        Err(format!("Failed to pull recording: {}", pull.stderr))
    }
}

#[tauri::command]
pub async fn android_open_deeplink(device_id: String, uri: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &[
        "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", &uri
    ]);
    Ok(result.stdout.trim().to_string())
}

#[tauri::command]
pub async fn android_input_text(device_id: String, text: String) -> Result<(), String> {
    let escaped = text.replace(" ", "%s").replace("&", "\\&");
    let result = run_adb_device(&device_id, &["shell", "input", "text", &escaped]);
    if result.success { Ok(()) } else { Err(result.stderr) }
}

#[tauri::command]
pub async fn android_shell(device_id: String, command: String) -> Result<AdbResult, String> {
    let mut args = vec!["shell"];
    let cmd_parts: Vec<&str> = command.split_whitespace().collect();
    args.extend(cmd_parts);
    Ok(run_adb_device(&device_id, &args))
}

// ============================================================================
//  PUSH/PULL FILES
// ============================================================================

#[tauri::command]
pub async fn android_push_file(device_id: String, local: String, remote: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &["push", &local, &remote]);
    if result.success {
        Ok(result.stdout.trim().to_string())
    } else {
        Err(format!("Push failed: {}", result.stderr))
    }
}

#[tauri::command]
pub async fn android_pull_file(device_id: String, remote: String, local: String) -> Result<String, String> {
    let result = run_adb_device(&device_id, &["pull", &remote, &local]);
    if result.success {
        Ok(result.stdout.trim().to_string())
    } else {
        Err(format!("Pull failed: {}", result.stderr))
    }
}

// ============================================================================
//  GRADLE BUILD INTEGRATION
// ============================================================================

#[tauri::command]
pub async fn android_gradle_build(
    project_path: String,
    task: String,         // "assembleDebug", "assembleRelease", "clean", etc.
) -> Result<GradleResult, String> {
    println!(" Gradle {} in {}...", task, project_path);
    
    let start = std::time::Instant::now();
    
    // Use gradlew if available, otherwise gradle
    let gradlew = if cfg!(target_os = "windows") {
        format!("{}\\gradlew.bat", project_path)
    } else {
        format!("{}/gradlew", project_path)
    };
    
    let (cmd_name, cmd_args) = if Path::new(&gradlew).exists() {
        (gradlew.clone(), vec![&task[..]])
    } else {
        ("gradle".to_string(), vec![&task[..]])
    };
    
    // Auto-download gradle-wrapper.jar if missing
    let wrapper_jar = format!("{}{}gradle{}wrapper{}gradle-wrapper.jar",
        project_path, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);
    if !Path::new(&wrapper_jar).exists() {
        let wrapper_dir = Path::new(&wrapper_jar).parent().unwrap();
        if !wrapper_dir.exists() {
            let _ = std::fs::create_dir_all(wrapper_dir);
        }
        println!("  Downloading gradle-wrapper.jar...");
        let dl_output = android_hidden_cmd("cmd")
            .args(&["/C", "curl", "-sL", "-o", &wrapper_jar,
                "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar"])
            .output();
        match dl_output {
            Ok(o) if Path::new(&wrapper_jar).exists() => println!("  gradle-wrapper.jar downloaded!"),
            _ => println!("  Warning: Could not download gradle-wrapper.jar"),
        }
    }

    // Auto-download gradle-wrapper.jar if missing
    let wrapper_jar = format!("{}{}gradle{}wrapper{}gradle-wrapper.jar",
        project_path, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);
    if !Path::new(&wrapper_jar).exists() {
        let wrapper_dir = Path::new(&wrapper_jar).parent().unwrap();
        if !wrapper_dir.exists() {
            let _ = std::fs::create_dir_all(wrapper_dir);
        }
        println!("  Downloading gradle-wrapper.jar...");
        let dl_output = android_hidden_cmd("cmd")
            .args(&["/C", "curl", "-sL", "-o", &wrapper_jar,
                "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar"])
            .output();
        match dl_output {
            Ok(o) if Path::new(&wrapper_jar).exists() => println!("  gradle-wrapper.jar downloaded!"),
            _ => println!("  Warning: Could not download gradle-wrapper.jar"),
        }
    }

    // On Windows, .bat files must be run via cmd /C
    let output = if cfg!(target_os = "windows") && cmd_name.ends_with(".bat") {
        android_hidden_cmd("cmd")
            .args(&["/C", &cmd_name, &task])
            .current_dir(&project_path)
            .output()
            .map_err(|e| format!("Failed to run Gradle: {}", e))?
    } else {
        android_hidden_cmd(&cmd_name)
            .args(&cmd_args)
            .current_dir(&project_path)
            .output()
            .map_err(|e| format!("Failed to run Gradle: {}", e))?
    };
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let success = output.status.success();
    let duration_ms = start.elapsed().as_millis() as u64;
    
    // Try to find the APK path in output
    let mut apk_path = None;
    if success && task.contains("assemble") {
        // Look for APK in standard output locations
        let build_dir = format!("{}\\app\\build\\outputs\\apk", project_path);
        let debug_apk = format!("{}\\debug\\app-debug.apk", build_dir);
        let release_apk = format!("{}\\release\\app-release.apk", build_dir);
        
        if task.contains("Debug") && Path::new(&debug_apk).exists() {
            apk_path = Some(debug_apk);
        } else if task.contains("Release") && Path::new(&release_apk).exists() {
            apk_path = Some(release_apk);
        }
    }
    
    println!(" Gradle {}  {} in {}ms", task, if success { "SUCCESS" } else { "FAILED" }, duration_ms);
    
    Ok(GradleResult {
        stdout,
        stderr,
        success,
        apk_path,
        duration_ms,
    })
}

#[tauri::command]
pub async fn android_gradle_tasks(project_path: String) -> Result<Vec<String>, String> {
    let gradlew = if cfg!(target_os = "windows") {
        format!("{}\\gradlew.bat", project_path)
    } else {
        format!("{}/gradlew", project_path)
    };
    
    let cmd_name = if Path::new(&gradlew).exists() {
        gradlew
    } else {
        "gradle".to_string()
    };
    
    let output = android_hidden_cmd(&cmd_name)
        .args(&["tasks", "--all"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to list tasks: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let tasks: Vec<String> = stdout.lines()
        .filter(|l| l.contains(" - ") && !l.starts_with(" ") && !l.is_empty())
        .map(|l| l.split(" - ").next().unwrap_or("").trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();
    
    Ok(tasks)
}


// ============================================================================
//  BUILD  INSTALL  RUN PIPELINE
// ============================================================================

#[tauri::command]
pub async fn android_build_and_run(
    project_path: String,
    device_id: String,
    build_type: Option<String>,  // "debug" or "release"
) -> Result<String, String> {
    let variant = build_type.unwrap_or_else(|| "debug".to_string());
    let task = format!("assemble{}", capitalize_first(&variant));
    
    println!(" Build & Run: {}  {} on {}", task, variant, device_id);
    
    // Step 1: Build
    let build = android_gradle_build(project_path.clone(), task).await?;
    if !build.success {
        return Err(format!("Build failed:\
{}", build.stderr));
    }
    
    // Step 2: Find APK
    let apk = build.apk_path.ok_or("APK not found after build".to_string())?;
    
    // Step 3: Install
    let install = android_install_apk(device_id.clone(), apk).await?;
    
    // Step 4: Get package name from project
    let manifest_path = format!("{}\\app\\src\\main\\AndroidManifest.xml", project_path);
    let mut package_name = String::new();
    // Check manifest for package=
    if let Ok(manifest) = std::fs::read_to_string(&manifest_path) {
        for line in manifest.lines() {
            if line.contains("package=") {
                if let Some(start) = line.find("package=\"") {
                    let rest = &line[start + 9..];
                    if let Some(end) = rest.find("\"") {
                        package_name = rest[..end].to_string();
                    }
                }
            }
        }
    }
    // Fallback: check build.gradle.kts for namespace (Compose projects)
    if package_name.is_empty() {
        let gradle_path = format!("{}\\app\\build.gradle.kts", project_path);
        if let Ok(gradle) = std::fs::read_to_string(&gradle_path) {
            for line in gradle.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("namespace") && trimmed.contains("\"") {
                    if let Some(start) = trimmed.find("\"") {
                        let rest = &trimmed[start + 1..];
                        if let Some(end) = rest.find("\"") {
                            package_name = rest[..end].to_string();
                        }
                    }
                }
            }
        }
    }
    
    // Step 5: Launch app
    if !package_name.is_empty() {
        android_launch_app(device_id.clone(), package_name.clone(), None).await?;
        Ok(format!(" Built in {}ms  Installed  Launched {}", build.duration_ms, package_name))
    } else {
        Ok(format!(" Built in {}ms  Installed (launch manually)", build.duration_ms))
    }
}


// ============================================================================
//  ANDROID + ARDUINO SERIAL BRIDGE
// ============================================================================

/// List USB serial ports that might be Arduino AND detect Android devices
/// Useful for IoT projects where both are connected

// ============================================================================
// ADB AUTO-INSTALLER
// Downloads Android Platform Tools and configures PATH automatically
// ============================================================================

#[tauri::command]
pub async fn android_install_adb() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "Cannot find LOCALAPPDATA environment variable".to_string())?;

    let install_dir = format!("{}\\Android", local_app_data);
    let platform_tools_dir = format!("{}\\platform-tools", install_dir);
    let adb_path = format!("{}\\adb.exe", platform_tools_dir);

    // Already installed?
    if Path::new(&adb_path).exists() {
        if let Ok(path) = std::env::var("PATH") {
            if !path.contains("platform-tools") {
                std::env::set_var("PATH", format!("{};{}", path, platform_tools_dir));
            }
        }
        return Ok(format!("ADB already installed at {}", adb_path));
    }

    // Create install directory
    std::fs::create_dir_all(&install_dir)
        .map_err(|e| format!("Cannot create directory {}: {}", install_dir, e))?;

    let zip_path = format!("{}\\platform-tools-download.zip", install_dir);
    let url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";

    // Download using PowerShell
    let dl = android_hidden_cmd("powershell")
        .args(&[
            "-NoProfile", "-NonInteractive", "-Command",
            &format!(
                "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing",
                url, zip_path
            )
        ])
        .output()
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !dl.status.success() {
        let stderr = String::from_utf8_lossy(&dl.stderr);
        let _ = std::fs::remove_file(&zip_path);
        return Err(format!("Download failed: {}", stderr));
    }

    if !Path::new(&zip_path).exists() {
        return Err("Download completed but zip file not found".to_string());
    }

    let zip_size = std::fs::metadata(&zip_path).map(|m| m.len()).unwrap_or(0);
    if zip_size < 1_000_000 {
        let _ = std::fs::remove_file(&zip_path);
        return Err(format!("Downloaded file too small ({}B) - likely a network error", zip_size));
    }

    // Extract
    let extract = android_hidden_cmd("powershell")
        .args(&[
            "-NoProfile", "-NonInteractive", "-Command",
            &format!("Expand-Archive -Path '{}' -DestinationPath '{}' -Force", zip_path, install_dir)
        ])
        .output()
        .map_err(|e| format!("Failed to extract: {}", e))?;

    if !extract.status.success() {
        let stderr = String::from_utf8_lossy(&extract.stderr);
        let _ = std::fs::remove_file(&zip_path);
        return Err(format!("Extract failed: {}", stderr));
    }

    let _ = std::fs::remove_file(&zip_path);

    if !Path::new(&adb_path).exists() {
        return Err(format!("Extraction completed but adb.exe not found at {}", adb_path));
    }

    // Add to current process PATH
    if let Ok(path) = std::env::var("PATH") {
        std::env::set_var("PATH", format!("{};{}", path, platform_tools_dir));
    }
    std::env::set_var("ANDROID_HOME", &install_dir);

    // Add to user PATH permanently
    let _ = android_hidden_cmd("powershell")
        .args(&[
            "-NoProfile", "-NonInteractive", "-Command",
            &format!(
                "$p=[Environment]::GetEnvironmentVariable('Path','User'); if($p -notlike '*platform-tools*'){{[Environment]::SetEnvironmentVariable('Path',\"$p;{}\", 'User')}}; [Environment]::SetEnvironmentVariable('ANDROID_HOME','{}','User')",
                platform_tools_dir, install_dir
            )
        ])
        .output();

    // Verify
    let verify = android_hidden_cmd(&adb_path).arg("version").output();
    match verify {
        Ok(out) if out.status.success() => {
            let version = String::from_utf8_lossy(&out.stdout);
            Ok(format!("ADB installed successfully!\nPath: {}\n{}", adb_path, version.trim()))
        }
        _ => Ok(format!("ADB installed at {} (restart IDE if commands fail)", adb_path))
    }
}

#[tauri::command]
pub async fn android_arduino_bridge_status() -> Result<serde_json::Value, String> {
    // Get Android devices
    let android_result = run_adb(&["devices", "-l"]);
    let android_count = android_result.stdout.lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty() && l.contains("device"))
        .count();
    
    // Check if Arduino CLI is available
    let arduino_cli = android_hidden_cmd("arduino-cli")
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    
    // List serial ports (Arduino)
    let serial_ports = if arduino_cli {
        let result = android_hidden_cmd("arduino-cli")
            .args(&["board", "list", "--format", "json"])
            .output();
        match result {
            Ok(out) => String::from_utf8_lossy(&out.stdout).to_string(),
            Err(_) => "[]".to_string(),
        }
    } else {
        "[]".to_string()
    };
    
    Ok(serde_json::json!({
        "android_devices": android_count,
        "arduino_cli_available": arduino_cli,
        "serial_ports": serial_ports,
        "bridge_ready": android_count > 0 && arduino_cli,
    }))
}

/// Forward a TCP port from Android device to localhost
/// Used for Android  Arduino communication via network
#[tauri::command]
pub async fn android_forward_port(
    device_id: String,
    local_port: u16,
    remote_port: u16,
) -> Result<String, String> {
    let local = format!("tcp:{}", local_port);
    let remote = format!("tcp:{}", remote_port);
    
    let result = run_adb_device(&device_id, &["forward", &local, &remote]);
    if result.success {
        Ok(format!("Forwarded {}:{}  {}:{}", "localhost", local_port, device_id, remote_port))
    } else {
        Err(format!("Port forward failed: {}", result.stderr))
    }
}

/// Reverse port forward: device can reach PC's localhost
/// Essential for Arduino serial server on PC  Android app
#[tauri::command]
pub async fn android_reverse_port(
    device_id: String,
    device_port: u16,
    local_port: u16,
) -> Result<String, String> {
    let device = format!("tcp:{}", device_port);
    let local = format!("tcp:{}", local_port);
    
    let result = run_adb_device(&device_id, &["reverse", &device, &local]);
    if result.success {
        Ok(format!("Reversed {}:{}  {}:{}", device_id, device_port, "localhost", local_port))
    } else {
        Err(format!("Reverse port failed: {}", result.stderr))
    }
}


// ============================================================================
// HELPERS
// ============================================================================

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}



// ============================================================================
// ANDROID SETUP WIZARD v2
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AndroidEnvironment {
    pub jdk: ComponentStatus,
    pub android_sdk: ComponentStatus,
    pub android_studio: ComponentStatus,
    pub sdk_platform: ComponentStatus,
    pub build_tools: ComponentStatus,
    pub gradle_wrapper: ComponentStatus,
    pub adb: ComponentStatus,
    pub all_ready: bool,
    pub missing_count: u32,
    pub fresh_install: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentStatus {
    pub name: String,
    pub installed: bool,
    pub version: String,
    pub path: String,
    pub install_command: String,
    pub install_method: String,
    pub required: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetupResult {
    pub success: bool,
    pub component: String,
    pub message: String,
    pub env_vars_set: Vec<(String, String)>,
}

#[tauri::command]
pub async fn android_check_environment(project_path: String) -> Result<AndroidEnvironment, String> {
    println!("Checking Android environment...");
    let jdk = check_jdk().await;
    let android_studio = check_android_studio().await;
    let android_sdk = check_android_sdk().await;
    let sdk_platform = check_sdk_platform(&android_sdk.path).await;
    let build_tools = check_build_tools(&android_sdk.path).await;
    let gradle_wrapper = check_gradle_wrapper(&project_path).await;
    let adb = check_adb_status(&android_sdk.path).await;
    let fresh_install = !android_sdk.installed && !android_studio.installed;
    let components = [&jdk, &android_sdk, &sdk_platform, &build_tools, &gradle_wrapper, &adb];
    let missing_count = components.iter().filter(|c| c.required && !c.installed).count() as u32;
    let all_ready = missing_count == 0;
    Ok(AndroidEnvironment { jdk, android_sdk, android_studio, sdk_platform, build_tools, gradle_wrapper, adb, all_ready, missing_count, fresh_install })
}

async fn check_jdk() -> ComponentStatus {
    let mut s = ComponentStatus { name: "JDK 17".into(), installed: false, version: String::new(), path: String::new(), install_command: "winget install Microsoft.OpenJDK.17".into(), install_method: "winget".into(), required: true };
    if let Ok(jh) = std::env::var("JAVA_HOME") {
        let exe = if cfg!(target_os = "windows") { format!("{}\\bin\\java.exe", jh) } else { format!("{}/bin/java", jh) };
        if Path::new(&exe).exists() {
            s.path = jh.clone();
            if let Ok(o) = Command::new(&exe).arg("-version").output() {
                let v = String::from_utf8_lossy(&o.stderr).to_string();
                if let Some(l) = v.lines().next() { s.version = l.to_string(); s.installed = true; return s; }
            }
        }
    }
    if let Ok(o) = Command::new("java").arg("-version").output() {
        let v = String::from_utf8_lossy(&o.stderr).to_string();
        if let Some(l) = v.lines().next() { s.version = l.to_string(); s.installed = true; s.path = "PATH".into(); return s; }
    }
    if cfg!(target_os = "windows") {
        for dir in &["C:\\Program Files\\Microsoft", "C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Java"] {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let n = entry.file_name().to_string_lossy().to_string();
                    if n.contains("jdk-17") || n.contains("jdk17") {
                        let p = entry.path();
                        if p.join("bin").join("java.exe").exists() {
                            s.installed = true;
                            s.path = p.to_string_lossy().to_string();
                            s.version = format!("Found at {}", s.path);
                            return s;
                        }
                    }
                }
            }
        }
    }
    s
}

async fn check_android_studio() -> ComponentStatus {
    let mut s = ComponentStatus { name: "Android Studio".into(), installed: false, version: String::new(), path: String::new(), install_command: "winget install Google.AndroidStudio".into(), install_method: "winget".into(), required: false };
    if cfg!(target_os = "windows") {
        for p in &[
            "C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe",
            "C:\\Program Files\\Android\\Android Studio\\bin\\studio.exe",
        ] {
            if Path::new(p).exists() {
                s.installed = true;
                s.path = p.to_string();
                s.version = "Installed".into();
                return s;
            }
        }
    }
    s
}

async fn check_android_sdk() -> ComponentStatus {
    let mut s = ComponentStatus { name: "Android SDK".into(), installed: false, version: String::new(), path: String::new(), install_command: "Included with Android Studio".into(), install_method: "android_studio".into(), required: true };
    if let Ok(ah) = std::env::var("ANDROID_HOME") {
        if Path::new(&ah).join("platforms").exists() {
            s.installed = true;
            s.path = ah.clone();
            s.version = "SDK found".into();
            return s;
        }
        let sub = Path::new(&ah).join("Sdk");
        if sub.join("platforms").exists() {
            s.installed = true;
            s.path = sub.to_string_lossy().to_string();
            s.version = "Found (ANDROID_HOME needs fix)".into();
            return s;
        }
    }
    if cfg!(target_os = "windows") {
        if let Ok(la) = std::env::var("LOCALAPPDATA") {
            for suffix in &["\\Android\\Sdk", "\\Android\\sdk"] {
                let p = format!("{}{}", la, suffix);
                if Path::new(&p).join("platforms").exists() {
                    s.installed = true;
                    s.path = p;
                    s.version = "Found (ANDROID_HOME not set)".into();
                    return s;
                }
            }
        }
    }
    s
}

async fn check_sdk_platform(sdk_path: &str) -> ComponentStatus {
    let mut s = ComponentStatus { name: "SDK Platform (API 33+)".into(), installed: false, version: String::new(), path: String::new(), install_command: "SDK Manager -> SDK Platforms".into(), install_method: "sdkmanager".into(), required: true };
    if sdk_path.is_empty() { return s; }
    let pd = Path::new(sdk_path).join("platforms");
    if !pd.exists() { return s; }
    let mut best = 0u32;
    let mut best_name = String::new();
    if let Ok(entries) = std::fs::read_dir(&pd) {
        for e in entries.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if let Some(ns) = n.strip_prefix("android-") {
                let ns = ns.split('-').next().unwrap_or(ns);
                if let Ok(num) = ns.parse::<u32>() {
                    if num > best { best = num; best_name = n.clone(); }
                }
            }
        }
    }
    if best >= 33 {
        s.installed = true;
        s.version = format!("{} (API {})", best_name, best);
        s.path = pd.join(&best_name).to_string_lossy().to_string();
    } else if best > 0 {
        s.version = format!("Only API {} (need 33+)", best);
    }
    s
}

async fn check_build_tools(sdk_path: &str) -> ComponentStatus {
    let mut s = ComponentStatus { name: "Build Tools".into(), installed: false, version: String::new(), path: String::new(), install_command: "SDK Manager -> SDK Tools".into(), install_method: "sdkmanager".into(), required: true };
    if sdk_path.is_empty() { return s; }
    let bd = Path::new(sdk_path).join("build-tools");
    if !bd.exists() { return s; }
    let mut best = String::new();
    if let Ok(entries) = std::fs::read_dir(&bd) {
        for e in entries.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if n.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                if n > best { best = n; }
            }
        }
    }
    if !best.is_empty() {
        s.installed = true;
        s.version = best.clone();
        s.path = bd.join(&best).to_string_lossy().to_string();
    }
    s
}

async fn check_gradle_wrapper(project_path: &str) -> ComponentStatus {
    let mut s = ComponentStatus { name: "Gradle Wrapper".into(), installed: false, version: String::new(), path: String::new(), install_command: "Auto-download".into(), install_method: "download".into(), required: true };
    if project_path.is_empty() { s.required = false; return s; }
    let sep = std::path::MAIN_SEPARATOR;
    let jar = format!("{}{}gradle{}wrapper{}gradle-wrapper.jar", project_path, sep, sep, sep);
    let script = if cfg!(target_os = "windows") {
        format!("{}{}gradlew.bat", project_path, sep)
    } else {
        format!("{}{}gradlew", project_path, sep)
    };
    if Path::new(&jar).exists() && Path::new(&script).exists() {
        s.installed = true;
        s.version = "Ready".into();
    } else if Path::new(&script).exists() {
        s.version = "Missing gradle-wrapper.jar".into();
    }
    s
}

async fn check_adb_status(sdk_path: &str) -> ComponentStatus {
    let mut s = ComponentStatus { name: "ADB".into(), installed: false, version: String::new(), path: String::new(), install_command: "Included with Android Studio".into(), install_method: "android_studio".into(), required: false };
    let adb = if cfg!(target_os = "windows") { "adb.exe" } else { "adb" };
    if let Ok(o) = Command::new(adb).arg("version").output() {
        let v = String::from_utf8_lossy(&o.stdout).to_string();
        if let Some(l) = v.lines().next() {
            s.installed = true;
            s.version = l.into();
            return s;
        }
    }
    if !sdk_path.is_empty() {
        let p = Path::new(sdk_path).join("platform-tools").join(adb);
        if p.exists() {
            s.installed = true;
            s.path = p.to_string_lossy().to_string();
            s.version = "In SDK".into();
        }
    }
    s
}

#[tauri::command]
pub async fn android_setup_install_studio() -> Result<SetupResult, String> {
    if !cfg!(target_os = "windows") { return Err("Windows only".into()); }
    let o = Command::new("cmd")
        .args(&["/C", "winget", "install", "Google.AndroidStudio", "--accept-package-agreements", "--accept-source-agreements"])
        .output()
        .map_err(|e| format!("{}", e))?;
    let out = String::from_utf8_lossy(&o.stdout).to_string();
    let ok = o.status.success() || out.contains("Successfully") || out.contains("already installed");
    Ok(SetupResult {
        success: ok,
        component: "Android Studio".into(),
        message: if ok { "Android Studio installed! Open it once to download SDK, then click Refresh.".into() } else { format!("Failed: {}", out.trim()) },
        env_vars_set: vec![],
    })
}

#[tauri::command]
pub async fn android_setup_install_jdk() -> Result<SetupResult, String> {
    if !cfg!(target_os = "windows") { return Err("Windows only".into()); }
    let o = Command::new("cmd")
        .args(&["/C", "winget", "install", "Microsoft.OpenJDK.17", "--accept-package-agreements", "--accept-source-agreements"])
        .output()
        .map_err(|e| format!("{}", e))?;
    let out = String::from_utf8_lossy(&o.stdout).to_string();
    let ok = o.status.success() || out.contains("Successfully") || out.contains("already installed");
    let mut jh = String::new();
    if ok {
        for dir in &["C:\\Program Files\\Microsoft", "C:\\Program Files\\Eclipse Adoptium"] {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for e in entries.flatten() {
                    if e.file_name().to_string_lossy().contains("jdk-17") {
                        jh = e.path().to_string_lossy().to_string();
                        break;
                    }
                }
            }
            if !jh.is_empty() { break; }
        }
        if !jh.is_empty() {
            std::env::set_var("JAVA_HOME", &jh);
            let _ = Command::new("cmd").args(&["/C", "setx", "JAVA_HOME", &jh]).output();
        }
    }
    Ok(SetupResult {
        success: ok,
        component: "JDK 17".into(),
        message: if ok { format!("JDK 17 installed. JAVA_HOME={}", jh) } else { format!("Failed: {}", out.trim()) },
        env_vars_set: if !jh.is_empty() { vec![("JAVA_HOME".into(), jh)] } else { vec![] },
    })
}

#[tauri::command]
pub async fn android_setup_fix_env(android_sdk_path: String, java_home_path: String) -> Result<SetupResult, String> {
    let mut vars = Vec::new();
    if !android_sdk_path.is_empty() {
        std::env::set_var("ANDROID_HOME", &android_sdk_path);
        if cfg!(target_os = "windows") {
            let _ = Command::new("cmd").args(&["/C", "setx", "ANDROID_HOME", &android_sdk_path]).output();
        }
        vars.push(("ANDROID_HOME".into(), android_sdk_path));
    }
    if !java_home_path.is_empty() {
        std::env::set_var("JAVA_HOME", &java_home_path);
        if cfg!(target_os = "windows") {
            let _ = Command::new("cmd").args(&["/C", "setx", "JAVA_HOME", &java_home_path]).output();
        }
        vars.push(("JAVA_HOME".into(), java_home_path));
    }
    Ok(SetupResult {
        success: true,
        component: "Environment".into(),
        message: format!("Set {} var(s)", vars.len()),
        env_vars_set: vars,
    })
}

#[tauri::command]
pub async fn android_setup_install_sdk_component(component: String) -> Result<SetupResult, String> {
    let sdk = std::env::var("ANDROID_HOME").unwrap_or_default();
    if sdk.is_empty() { return Err("ANDROID_HOME not set".into()); }
    let mgr = find_sdkmanager_path(&sdk);
    if mgr.is_empty() { return Err("sdkmanager not found. Use Android Studio SDK Manager.".into()); }
    let o = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "echo", "y", "|", &mgr, "--install", &component])
            .output()
    } else {
        Command::new("sh")
            .args(&["-c", &format!("yes | {} --install {}", mgr, component)])
            .output()
    }.map_err(|e| format!("{}", e))?;
    Ok(SetupResult {
        success: o.status.success(),
        component: component.clone(),
        message: if o.status.success() { format!("{} installed", component) } else { "Failed. Use Android Studio SDK Manager.".into() },
        env_vars_set: vec![],
    })
}

#[tauri::command]
pub async fn android_setup_download_gradle_wrapper(project_path: String) -> Result<SetupResult, String> {
    let sep = std::path::MAIN_SEPARATOR;
    let dir = format!("{}{}gradle{}wrapper", project_path, sep, sep);
    let jar = format!("{}{}gradle-wrapper.jar", dir, sep);
    let _ = std::fs::create_dir_all(&dir);
    let url = "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar";
    let o = if cfg!(target_os = "windows") {
        Command::new("cmd").args(&["/C", "curl", "-sL", "-o", &jar, url]).output()
    } else {
        Command::new("curl").args(&["-sL", "-o", &jar, url]).output()
    }.map_err(|e| format!("{}", e))?;
    let ok = o.status.success() && Path::new(&jar).exists() && std::fs::metadata(&jar).map(|m| m.len() > 10000).unwrap_or(false);
    Ok(SetupResult {
        success: ok,
        component: "Gradle Wrapper".into(),
        message: if ok { "gradle-wrapper.jar downloaded".into() } else { "Download failed".into() },
        env_vars_set: vec![],
    })
}

#[tauri::command]
pub async fn android_setup_open_sdk_manager() -> Result<SetupResult, String> {
    if !cfg!(target_os = "windows") { return Err("Windows only".into()); }
    for p in &[
        "C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe",
        "C:\\Program Files\\Android\\Android Studio\\bin\\studio.exe",
    ] {
        if Path::new(p).exists() {
            let _ = Command::new("cmd").args(&["/C", "start", "", p]).output();
            return Ok(SetupResult {
                success: true,
                component: "SDK Manager".into(),
                message: "Android Studio launched. Go to Tools > SDK Manager.".into(),
                env_vars_set: vec![],
            });
        }
    }
    Err("Android Studio not found".into())
}

#[tauri::command]
pub async fn android_setup_adapt_gradle(project_path: String) -> Result<SetupResult, String> {
    let sdk = std::env::var("ANDROID_HOME").unwrap_or_default();
    if sdk.is_empty() { return Err("ANDROID_HOME not set".into()); }
    let mut best_api = 0u32;
    if let Ok(entries) = std::fs::read_dir(Path::new(&sdk).join("platforms")) {
        for e in entries.flatten() {
            if let Some(ns) = e.file_name().to_string_lossy().strip_prefix("android-") {
                let ns = ns.split('-').next().unwrap_or(ns);
                if let Ok(n) = ns.parse::<u32>() {
                    if n > best_api { best_api = n; }
                }
            }
        }
    }
    let mut best_bt = String::new();
    if let Ok(entries) = std::fs::read_dir(Path::new(&sdk).join("build-tools")) {
        for e in entries.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if n.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                if n > best_bt { best_bt = n; }
            }
        }
    }
    if best_api < 21 || best_bt.is_empty() {
        return Err(format!("No usable SDK (API={}, bt={})", best_api, best_bt));
    }
    let gf = format!("{}{}app{}build.gradle.kts", project_path, std::path::MAIN_SEPARATOR, std::path::MAIN_SEPARATOR);
    if !Path::new(&gf).exists() { return Err("build.gradle.kts not found".into()); }
    let content = std::fs::read_to_string(&gf).map_err(|e| format!("{}", e))?;
    let updated: String = content.lines().map(|l| {
        if l.trim().starts_with("compileSdk") && l.contains("=") {
            format!("        compileSdk = {}", best_api)
        } else if l.trim().starts_with("targetSdk") && l.contains("=") {
            format!("            targetSdk = {}", best_api)
        } else if l.trim().starts_with("buildToolsVersion") {
            format!("        buildToolsVersion = \"{}\"", best_bt)
        } else {
            l.to_string()
        }
    }).collect::<Vec<_>>().join("\n");
    std::fs::write(&gf, &updated).map_err(|e| format!("{}", e))?;
    Ok(SetupResult {
        success: true,
        component: "build.gradle.kts".into(),
        message: format!("Adapted to SDK {} + build-tools {}", best_api, best_bt),
        env_vars_set: vec![],
    })
}

#[tauri::command]
pub async fn android_setup_all(project_path: String) -> Result<Vec<SetupResult>, String> {
    let mut results = Vec::new();
    let env = android_check_environment(project_path.clone()).await?;

    // Step 1: JDK
    if !env.jdk.installed {
        match android_setup_install_jdk().await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "JDK".into(), message: e, env_vars_set: vec![] }),
        }
    } else {
        results.push(SetupResult { success: true, component: "JDK".into(), message: format!("OK: {}", env.jdk.version), env_vars_set: vec![] });
    }

    // Step 2: Fix env if needed
    if env.android_sdk.installed && env.android_sdk.version.contains("not set") {
        let _ = android_setup_fix_env(env.android_sdk.path.clone(), String::new()).await;
    }

    // Step 3: Fresh install -> Android Studio
    if env.fresh_install {
        match android_setup_install_studio().await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "Studio".into(), message: e, env_vars_set: vec![] }),
        }
        return Ok(results);
    }

    // Step 4: SDK components
    let sdk = std::env::var("ANDROID_HOME").unwrap_or(env.android_sdk.path.clone());
    let has_mgr = !find_sdkmanager_path(&sdk).is_empty();

    if !env.sdk_platform.installed && has_mgr {
        match android_setup_install_sdk_component("platforms;android-34".into()).await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "Platform".into(), message: e, env_vars_set: vec![] }),
        }
    }

    if !env.build_tools.installed && has_mgr {
        match android_setup_install_sdk_component("build-tools;34.0.0".into()).await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "Build Tools".into(), message: e, env_vars_set: vec![] }),
        }
    }

    // Step 5: Gradle wrapper
    if !env.gradle_wrapper.installed && !project_path.is_empty() && env.gradle_wrapper.required {
        match android_setup_download_gradle_wrapper(project_path.clone()).await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "Gradle".into(), message: e, env_vars_set: vec![] }),
        }
    }

    // Step 6: Adapt gradle config
    if !project_path.is_empty() {
        match android_setup_adapt_gradle(project_path).await {
            Ok(r) => results.push(r),
            Err(e) => results.push(SetupResult { success: false, component: "Gradle Config".into(), message: e, env_vars_set: vec![] }),
        }
    }

    Ok(results)
}

fn find_sdkmanager_path(sdk_path: &str) -> String {
    if sdk_path.is_empty() { return String::new(); }
    let candidates = if cfg!(target_os = "windows") {
        vec![
            format!("{}\\cmdline-tools\\latest\\bin\\sdkmanager.bat", sdk_path),
            format!("{}\\tools\\bin\\sdkmanager.bat", sdk_path),
        ]
    } else {
        vec![
            format!("{}/cmdline-tools/latest/bin/sdkmanager", sdk_path),
            format!("{}/tools/bin/sdkmanager", sdk_path),
        ]
    };
    for c in &candidates {
        if Path::new(c).exists() { return c.clone(); }
    }
    String::new()
}


#[tauri::command]
pub async fn read_file_base64(file_path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = std::fs::read(&file_path).map_err(|e| format!("Read failed: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}
#[tauri::command]
pub async fn launch_scrcpy(device_id: String, max_size: Option<u32>, bit_rate: Option<u32>, title: Option<String>) -> Result<String, String> {
    use std::process::Command;
    
    // Try PATH first, then common winget/scoop install locations
    let scrcpy_path = {
        // Check if scrcpy is directly available
        if Command::new("scrcpy").arg("--version").output().is_ok() {
            "scrcpy".to_string()
        } else {
            // Search common install locations
            let home = std::env::var("USERPROFILE").unwrap_or_default();
            let candidates = vec![
                format!(r"{}\AppData\Local\Microsoft\WinGet\Links\scrcpy.exe", home),
                format!(r"{}\scoop\shims\scrcpy.exe", home),
                r"C:\Program Files\scrcpy\scrcpy.exe".to_string(),
                r"C:\scrcpy\scrcpy.exe".to_string(),
            ];
            // Also search winget package folder
            let winget_dir = format!(r"{}\AppData\Local\Microsoft\WinGet\Packages", home);
            let mut found = String::new();
            if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("Genymobile.scrcpy") {
                        let exe = entry.path().join("scrcpy.exe");
                        if exe.exists() {
                            found = exe.to_string_lossy().to_string();
                            break;
                        }
                        // Check subdirectories
                        if let Ok(subs) = std::fs::read_dir(entry.path()) {
                            for sub in subs.flatten() {
                                let exe2 = sub.path().join("scrcpy.exe");
                                if exe2.exists() {
                                    found = exe2.to_string_lossy().to_string();
                                    break;
                                }
                            }
                        }
                        if !found.is_empty() { break; }
                    }
                }
            }
            if !found.is_empty() {
                found
            } else {
                candidates.into_iter().find(|p| std::path::Path::new(p).exists())
                    .unwrap_or_else(|| "scrcpy".to_string())
            }
        }
    };
    let mut cmd = Command::new(&scrcpy_path);
    cmd.arg("-s").arg(&device_id);
    
    if let Some(size) = max_size {
        cmd.arg("--max-size").arg(size.to_string());
    } else {
        cmd.arg("--max-size").arg("1024");
    }
    
    if let Some(rate) = bit_rate {
        cmd.arg("--video-bit-rate").arg(format!("{}M", rate));
    } else {
        cmd.arg("--video-bit-rate").arg("4M");
    }
    
    if let Some(t) = title {
        cmd.arg("--window-title").arg(t);
    } else {
        cmd.arg("--window-title").arg(format!("X02 Mirror - {}", device_id));
    }
    
    cmd.arg("--stay-awake");
    
    // Spawn detached (don't block IDE)
    cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "scrcpy not found. Install from: https://github.com/Genymobile/scrcpy/releases".to_string()
        } else {
            format!("Failed to launch scrcpy: {}", e)
        }
    })?;
    
    Ok(format!("scrcpy launched for device {}", device_id))
}
#[tauri::command]
pub async fn open_external_url(url: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    Ok(format!("Opened: {}", url))
}
#[tauri::command]
pub async fn install_scrcpy() -> Result<String, String> {
    use std::process::Command;
    
    // Try winget first
    let result = Command::new("cmd")
        .args(["/C", "winget", "install", "Genymobile.scrcpy", "--accept-package-agreements", "--accept-source-agreements"])
        .output()
        .map_err(|e| format!("Failed to run winget: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&result.stdout).to_string();
    let stderr = String::from_utf8_lossy(&result.stderr).to_string();
    
    if result.status.success() || stdout.contains("Successfully installed") || stdout.contains("already installed") {
        Ok(format!("scrcpy installed successfully!\n{}", stdout))
    } else {
        Err(format!("Installation failed:\n{}\n{}", stdout, stderr))
    }
}