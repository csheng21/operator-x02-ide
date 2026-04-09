// ============================================================
// OPERATOR X02 - SSH Manager (Community Edition Stub)
// Full SSH tunnel + remote dev available in Operator X02 Pro
// ============================================================

use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SshConnectionResult {
    pub success: bool,
    pub message: String,
}

/// SSH state manager - Pro feature
pub struct SshState {
    _placeholder: Mutex<()>,
}

impl SshState {
    pub fn new() -> Self {
        SshState {
            _placeholder: Mutex::new(()),
        }
    }
}

#[tauri::command]
pub async fn ssh_connect(
    _host: String,
    _port: u16,
    _username: String,
    _password: Option<String>,
    _key_path: Option<String>,
) -> Result<SshConnectionResult, String> {
    Ok(SshConnectionResult {
        success: false,
        message: "SSH Manager is available in Operator X02 Pro. Visit operatorx02.com".to_string(),
    })
}

#[tauri::command]
pub async fn ssh_execute(_session_id: String, _command: String) -> Result<String, String> {
    Err("SSH remote execution is available in Operator X02 Pro. Visit operatorx02.com".to_string())
}

#[tauri::command]
pub async fn ssh_disconnect(_session_id: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn ssh_upload_file(
    _session_id: String,
    _local_path: String,
    _remote_path: String,
) -> Result<String, String> {
    Err("SSH file transfer is available in Operator X02 Pro. Visit operatorx02.com".to_string())
}
