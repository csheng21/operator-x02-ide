use serde::{Serialize, Deserialize};
use std::env;
use tauri::command;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemInfo {
    pub username: String,
    pub home_dir: String,
    pub documents_dir: String,
    pub downloads_dir: String,
    pub app_data_dir: String,
    pub temp_dir: String,
    pub hostname: Option<String>,
    pub os_name: String,
    pub os_version: Option<String>,
    pub exe_dir: Option<String>,
}

#[command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    // Get username
    let username = match whoami::username() {
        username if !username.is_empty() => username,
        _ => match std::env::var("USERNAME").or_else(|_| std::env::var("USER")) {
            Ok(name) => name,
            Err(_) => String::from("unknown"),
        },
    };
    
    // Get hostname
    let hostname = hostname::get().ok().map(|name| name.to_string_lossy().to_string());
    
    // Get OS information
    let os_name = env::consts::OS.to_string();
    let os_version = sys_info::os_release().ok();
    
    // Get directories
    let home_dir = dirs::home_dir()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| String::from("/unknown"));
    
    let documents_dir = dirs::document_dir()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Documents", home_dir));
    
    let downloads_dir = dirs::download_dir()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Downloads", home_dir));
    
    let app_data_dir = dirs::data_dir()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/AppData", home_dir));
    
    let temp_dir = env::temp_dir()
        .to_string_lossy()
        .to_string();
    
    // Get executable directory
    let exe_dir = env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_string_lossy().to_string()));
    
    Ok(SystemInfo {
        username,
        home_dir,
        documents_dir,
        downloads_dir,
        app_data_dir,
        temp_dir,
        hostname,
        os_name,
        os_version,
        exe_dir,
    })
}

#[command]
pub fn execute_command(command: String, is_powershell: bool) -> Result<String, String> {
    use std::process::Command;

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
    
    let output = if is_powershell {
        if cfg!(target_os = "windows") {
            create_hidden_command("powershell")
                .args(["-Command", &command])
                .output()
        } else {
            // Fallback for non-Windows
            return Err("PowerShell is not available on this platform".to_string());
        }
    } else {
        if cfg!(target_os = "windows") {
            create_hidden_command("cmd")
                .args(["/C", &command])
                .output()
        } else {
            create_hidden_command("sh")
                .arg("-c")
                .arg(&command)
                .output()
        }
    };
    
    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            if !stderr.is_empty() {
                if stdout.is_empty() {
                    Ok(stderr)
                } else {
                    Ok(format!("{}\n{}", stdout, stderr))
                }
            } else {
                Ok(stdout)
            }
        },
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}