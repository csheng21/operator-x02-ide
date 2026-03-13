// src-tauri/src/build_commands.rs
// Tauri backend commands for build system integration
// FIXED: Uses shell to execute commands (finds npm, node, etc.)

use std::process::{Command, Stdio};
use std::path::Path;
use tauri::command;

// ================================
// WINDOWS: Hide CMD windows in production
// ================================
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Helper: Create command with hidden window (Windows only)
#[cfg(target_os = "windows")]
fn create_hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn create_hidden_command(program: &str) -> Command {
    Command::new(program)
}


#[derive(serde::Serialize)]
pub struct BuildCommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

/// Execute a build command in a specific working directory
/// FIXED: Uses shell to properly find programs in PATH
#[command]
pub async fn execute_build_command(
    command: String,
    working_dir: String,
    _stream_output: Option<bool>,
) -> Result<BuildCommandResult, String> {
    println!("Executing build command: {} in {}", command, working_dir);
    
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
    let output = create_hidden_command("cmd")
        .args(["/C", &command])
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = create_hidden_command("sh")
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
            
            println!("Build command completed with exit code: {}", exit_code);
            if !stdout.is_empty() {
                println!("stdout: {}", stdout);
            }
            if !stderr.is_empty() {
                println!("stderr: {}", stderr);
            }
            
            Ok(BuildCommandResult {
                stdout,
                stderr,
                exit_code,
                success,
            })
        }
        Err(e) => {
            eprintln!("Failed to execute build command: {}", e);
            Err(format!("Failed to execute build command: {}", e))
        }
    }
}

/// Execute a general command (also fixed to use shell)
/// NOTE: Renamed to avoid conflict with execute_command in main.rs
#[command]
pub async fn execute_shell_command(
    command: String,
    working_dir: Option<String>,
    _is_powershell: Option<bool>,
) -> Result<BuildCommandResult, String> {
    println!("Executing shell command: {}", command);
    
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }
    
    let work_dir = working_dir.unwrap_or_else(|| ".".to_string());
    
    // FIXED: Execute through shell
    #[cfg(target_os = "windows")]
    let output = create_hidden_command("cmd")
        .args(["/C", &command])
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = create_hidden_command("sh")
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
            
            println!("Command completed with exit code: {}", exit_code);
            
            Ok(BuildCommandResult {
                stdout,
                stderr,
                exit_code,
                success,
            })
        }
        Err(e) => {
            eprintln!("Failed to execute command: {}", e);
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
    println!("Executing with build context: {} in {}", file_path, working_dir);
    
    // Detect file type and build command
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
    
    // FIXED: Execute through shell
    #[cfg(target_os = "windows")]
    let mut cmd = create_hidden_command("cmd");
    #[cfg(target_os = "windows")]
    cmd.args(["/C", &command]);
    
    #[cfg(not(target_os = "windows"))]
    let mut cmd = create_hidden_command("sh");
    #[cfg(not(target_os = "windows"))]
    cmd.args(["-c", &command]);
    
    cmd.current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Add environment variables
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
            })
        }
        Err(e) => Err(format!("Failed to execute: {}", e)),
    }
}

/// Kill a running build process (placeholder)
#[command]
pub async fn kill_build_process(process_id: String) -> Result<(), String> {
    println!("Kill build process requested: {}", process_id);
    Err("Build process killing not yet implemented".to_string())
}

/// Send input to a running build process's stdin (placeholder)
#[command]
pub async fn send_build_stdin(input: String) -> Result<(), String> {
    println!("Send build stdin requested: {}", input);
    Err("Build stdin input not yet implemented".to_string())
}
