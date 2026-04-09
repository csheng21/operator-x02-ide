// license_commands.rs - X02 Community Edition
// Build Mode is available in X02 Premium. Visit operatorx02.com/premium
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LicenseResult { pub valid: bool, pub tier: String, pub email: String, pub message: String }
#[tauri::command]
pub async fn validate_license(_key: String) -> Result<LicenseResult, String> {
    Ok(LicenseResult { valid: false, tier: "free".into(), email: String::new(),
        message: "Build Mode is available in X02 Premium. Visit operatorx02.com/premium".into() })
}
#[tauri::command]
pub async fn validate_license_cached() -> Result<bool, String> { Ok(false) }
#[tauri::command]
pub async fn get_license_info() -> Result<Option<LicenseResult>, String> { Ok(None) }
#[tauri::command]
pub async fn remove_license() -> Result<(), String> { Ok(()) }
