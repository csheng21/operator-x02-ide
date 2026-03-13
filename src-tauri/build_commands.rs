// src-tauri/src/build_commands.rs
// Tauri backend commands for build system integration
// FIXED: Uses shell to execute commands (finds npm, node, etc.)
// UPDATED: Added process management for Stop functionality

use std::process::{Command, Stdio, Child};
use std::path::Path;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::command;

// ============================================================================
// PROCESS TRACKING - Track running processes for kill functionality
// ============================================================================

lazy_static::lazy_static! {
    static ref RUNNING_PROCESSES: Mutex<HashMap<u32, Child>> = Mutex::new(HashMap::new());
}

#[derive(serde::Serialize)]
pub struct BuildCommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
}

/// Execute a build command in a specific working directory
/// FIXED: Uses shell to properly find programs in PATH
#[command]
pub async fn execute_build_command(
    command: String,
    working_dir: String,
    _stream_output: Option<bool>,
) -> Result<BuildCommandResult, String> {
    println!("[BuildSystem] Executing: {} in {}", command, working_dir);
    
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }
    
    // Check if working directory exists
    let work_dir = Path::new(&working_dir);
    if !work_dir.exists() {
        return Err(format!("Working directory does not exist: {}", working_dir));
    }
    
    // FIXED: Execute through shell to find programs in PATH
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", &command])
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh")
        .args(["-c", &command])
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(-1);
            let success = output.status.success();
            
            println!("[BuildSystem] Completed with exit code: {}", exit_code);
            if !stdout.is_empty() {
                println!("[BuildSystem] stdout: {}", &stdout[..stdout.len().min(200)]);
            }
            if !stderr.is_empty() {
                println!("[BuildSystem] stderr: {}", &stderr[..stderr.len().min(200)]);
            }
            
            Ok(BuildCommandResult {
                stdout,
                stderr,
                exit_code,
                success,
                pid: None,
            })
        }
        Err(e) => {
            eprintln!("[BuildSystem] Failed to execute: {}", e);
            Err(format!("Failed to execute build command: {}", e))
        }
    }
}

/// Execute a build command and track the process for later killing
/// Returns immediately with PID, process runs in background
#[command]
pub async fn execute_build_command_tracked(
    command: String,
    working_dir: String,
) -> Result<BuildCommandResult, String> {
    println!("[BuildSystem] Starting tracked process: {} in {}", command, working_dir);
    
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }
    
    let work_dir = Path::new(&working_dir);
    if !work_dir.exists() {
        return Err(format!("Working directory does not exist: {}", working_dir));
    }
    
    // Spawn process (don't wait for it)
    #[cfg(target_os = "windows")]
    let child = Command::new("cmd")
        .args(["/C", &command])
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    #[cfg(not(target_os = "windows"))]
    let child = Command::new("sh")
        .args(["-c", &command])
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    match child {
        Ok(child) => {
            let pid = child.id();
            println!("[BuildSystem] Process started with PID: {}", pid);
            
            // Store in tracker
            {
                let mut processes = RUNNING_PROCESSES.lock().unwrap();
                processes.insert(pid, child);
            }
            
            Ok(BuildCommandResult {
                stdout: String::new(),
                stderr: String::new(),
                exit_code: 0,
                success: true,
                pid: Some(pid),
            })
        }
        Err(e) => {
            eprintln!("[BuildSystem] Failed to start process: {}", e);
            Err(format!("Failed to start process: {}", e))
        }
    }
}

/// Kill a running build process by PID
/// Works on both tracked processes and external PIDs
#[command]
pub async fn kill_build_process(pid: u32) -> Result<serde_json::Value, String> {
    println!("[BuildSystem] Kill requested for PID: {}", pid);
    
    // First, try to get from our tracked processes
    {
        let mut processes = RUNNING_PROCESSES.lock().unwrap();
        if let Some(mut child) = processes.remove(&pid) {
            println!("[BuildSystem] Found tracked process, killing...");
            match child.kill() {
                Ok(_) => {
                    // Wait for process to clean up
                    let _ = child.wait();
                    println!("[BuildSystem] Process {} killed successfully", pid);
                    return Ok(serde_json::json!({
                        "success": true,
                        "message": format!("Process {} killed", pid),
                        "pid": pid
                    }));
                }
                Err(e) => {
                    eprintln!("[BuildSystem] Failed to kill tracked process: {}", e);
                    // Continue to try OS kill
                }
            }
        }
    }
    
    // Fallback: Kill by PID using OS commands
    println!("[BuildSystem] Attempting OS-level kill for PID: {}", pid);
    
    #[cfg(target_os = "windows")]
    {
        // Use taskkill with /F (force) and /T (kill child processes)
        let output = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();
        
        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                
                if output.status.success() {
                    println!("[BuildSystem] taskkill succeeded: {}", stdout);
                    Ok(serde_json::json!({
                        "success": true,
                        "message": format!("Process {} and children terminated", pid),
                        "pid": pid
                    }))
                } else {
                    eprintln!("[BuildSystem] taskkill failed: {}", stderr);
                    // Check if process doesn't exist (not a real error)
                    if stderr.contains("not found") || stderr.contains("not exist") {
                        Ok(serde_json::json!({
                            "success": true,
                            "message": format!("Process {} already terminated", pid),
                            "pid": pid
                        }))
                    } else {
                        Err(format!("Failed to kill process: {}", stderr))
                    }
                }
            }
            Err(e) => {
                eprintln!("[BuildSystem] taskkill command failed: {}", e);
                Err(format!("Failed to execute taskkill: {}", e))
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // Try to kill process group first (negative PID)
        let output = Command::new("kill")
            .args(["-9", &format!("-{}", pid)])
            .output()
            .or_else(|_| {
                // Fallback to just killing the process
                Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output()
            });
        
        match output {
            Ok(output) => {
                if output.status.success() {
                    println!("[BuildSystem] kill succeeded for PID: {}", pid);
                    Ok(serde_json::json!({
                        "success": true,
                        "message": format!("Process {} killed", pid),
                        "pid": pid
                    }))
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if stderr.contains("No such process") {
                        Ok(serde_json::json!({
                            "success": true,
                            "message": format!("Process {} already terminated", pid),
                            "pid": pid
                        }))
                    } else {
                        Err(format!("Failed to kill process: {}", stderr))
                    }
                }
            }
            Err(e) => Err(format!("Failed to execute kill: {}", e)),
        }
    }
}

/// Get status of a running process
#[command]
pub async fn get_process_status(pid: u32) -> Result<serde_json::Value, String> {
    let processes = RUNNING_PROCESSES.lock().unwrap();
    
    if processes.contains_key(&pid) {
        Ok(serde_json::json!({
            "pid": pid,
            "running": true,
            "tracked": true
        }))
    } else {
        // Check if process exists at OS level
        #[cfg(target_os = "windows")]
        let exists = Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false);
        
        #[cfg(not(target_os = "windows"))]
        let exists = Command::new("ps")
            .args(["-p", &pid.to_string()])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        
        Ok(serde_json::json!({
            "pid": pid,
            "running": exists,
            "tracked": false
        }))
    }
}

/// List all tracked running processes
#[command]
pub async fn list_running_processes() -> Result<serde_json::Value, String> {
    let processes = RUNNING_PROCESSES.lock().unwrap();
    let pids: Vec<u32> = processes.keys().cloned().collect();
    
    Ok(serde_json::json!({
        "processes": pids,
        "count": pids.len()
    }))
}

/// Wait for a tracked process to complete and return its output
#[command]
pub async fn wait_for_process(pid: u32) -> Result<BuildCommandResult, String> {
    let child = {
        let mut processes = RUNNING_PROCESSES.lock().unwrap();
        processes.remove(&pid)
    };
    
    if let Some(child) = child {
        match child.wait_with_output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                let exit_code = output.status.code().unwrap_or(-1);
                
                Ok(BuildCommandResult {
                    stdout,
                    stderr,
                    exit_code,
                    success: output.status.success(),
                    pid: Some(pid),
                })
            }
            Err(e) => Err(format!("Failed to wait for process: {}", e)),
        }
    } else {
        Err(format!("Process {} not found in tracker", pid))
    }
}

// ============================================================================
// EXISTING COMMANDS (unchanged)
// ============================================================================

/// Execute a general command (also fixed to use shell)
/// NOTE: Renamed to avoid conflict with execute_command in main.rs
#[command]
pub async fn execute_shell_command(
    command: String,
    working_dir: Option<String>,
    _is_powershell: Option<bool>,
) -> Result<BuildCommandResult, String> {
    println!("[BuildSystem] Executing shell command: {}", command);
    
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }
    
    let work_dir = working_dir.unwrap_or_else(|| ".".to_string());
    
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", &command])
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("sh")
        .args(["-c", &command])
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(-1);
            let success = output.status.success();
            
            Ok(BuildCommandResult {
                stdout,
                stderr,
                exit_code,
                success,
                pid: None,
            })
        }
        Err(e) => {
            eprintln!("[BuildSystem] Failed to execute command: {}", e);
            Err(format!("Failed to execute command: {}", e))
        }
    }
}

/// Check if a build file exists
#[command]
pub fn check_build_file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// List directory contents for build system detection
#[command]
pub fn list_build_directory(path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", path.display()));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }
    
    let mut files = Vec::new();
    
    match std::fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    files.push(file_name);
                }
            }
            Ok(files)
        }
        Err(e) => Err(format!("Failed to read directory: {}", e)),
    }
}

/// Get current working directory for build context
#[command]
pub fn get_build_cwd() -> Result<String, String> {
    match std::env::current_dir() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get current directory: {}", e)),
    }
}

/// Execute command with build context (environment variables, etc.)
#[command]
pub async fn execute_build_with_context(
    file_path: String,
    working_dir: String,
    env: std::collections::HashMap<String, String>,
    _args: Vec<String>,
) -> Result<BuildCommandResult, String> {
    println!("[BuildSystem] Executing with context: {} in {}", file_path, working_dir);
    
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    let command = match extension {
        "py" => format!("python \"{}\"", file_path),
        "js" | "mjs" => format!("node \"{}\"", file_path),
        "ts" => format!("ts-node \"{}\"", file_path),
        "rs" => "cargo run".to_string(),
        "go" => format!("go run \"{}\"", file_path),
        "java" => format!("java \"{}\"", file_path),
        "rb" => format!("ruby \"{}\"", file_path),
        "php" => format!("php \"{}\"", file_path),
        _ => return Err(format!("Unsupported file type: {}", extension)),
    };
    
    #[cfg(target_os = "windows")]
    let mut cmd = Command::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.args(["/C", &command]);
    
    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new("sh");
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-c", &command]);
    
    cmd.current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    for (key, value) in env {
        cmd.env(key, value);
    }
    
    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(-1);
            let success = output.status.success();
            
            Ok(BuildCommandResult {
                stdout,
                stderr,
                exit_code,
                success,
                pid: None,
            })
        }
        Err(e) => Err(format!("Failed to execute: {}", e)),
    }
}

/// Send input to a running build process's stdin (placeholder)
#[command]
pub async fn send_build_stdin(input: String) -> Result<(), String> {
    println!("[BuildSystem] Send stdin requested: {}", input);
    Err("Build stdin input not yet implemented".to_string())
}


// ============================================================================
// REGISTRATION HELPER
// ============================================================================
// 
// Add these commands to your main.rs invoke_handler:
//
// .invoke_handler(tauri::generate_handler![
//     // ... existing commands ...
//     build_commands::execute_build_command,
//     build_commands::execute_build_command_tracked,
//     build_commands::kill_build_process,
//     build_commands::get_process_status,
//     build_commands::list_running_processes,
//     build_commands::wait_for_process,
//     build_commands::execute_shell_command,
//     build_commands::check_build_file_exists,
//     build_commands::list_build_directory,
//     build_commands::get_build_cwd,
//     build_commands::execute_build_with_context,
//     build_commands::send_build_stdin,
// ])
//
// Also ensure Cargo.toml has:
// [dependencies]
// lazy_static = "1.4"
// serde_json = "1.0"
