// src-tauri/src/main.rs - Complete Tauri backend with native file operations

use tauri::dialog::{FileDialogBuilder, MessageDialogBuilder, MessageDialogKind};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    size: Option<u64>,
    children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    username: String,
    hostname: String,
    os_name: String,
    os_version: String,
    home_dir: String,
    documents_dir: Option<String>,
    downloads_dir: Option<String>,
    app_data_dir: Option<String>,
    temp_dir: String,
}

// File Dialog Commands
#[tauri::command]
async fn open_folder_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let folder = FileDialogBuilder::new()
        .set_title("Select Project Folder")
        .pick_folder(&app)
        .await;
    
    match folder {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn open_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let file = FileDialogBuilder::new()
        .set_title("Open File")
        .add_filter("Text Files", &["txt", "js", "ts", "py", "html", "css", "json", "md", "jsx", "tsx"])
        .add_filter("All Files", &["*"])
        .pick_file(&app)
        .await;
    
    match file {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn save_file_dialog(app: AppHandle, default_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = FileDialogBuilder::new()
        .set_title("Save File")
        .add_filter("Text Files", &["txt", "js", "ts", "py", "html", "css", "json", "md", "jsx", "tsx"])
        .add_filter("All Files", &["*"]);
    
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }
    
    let file = dialog.save_file(&app).await;
    
    match file {
        Some(path) => Ok(Some(path.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

// File Operations Commands
#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory '{}': {}", parent.display(), e))?;
        }
    }
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

#[tauri::command]
async fn create_file(path: String, content: Option<String>) -> Result<(), String> {
    let content = content.unwrap_or_default();
    
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory '{}': {}", parent.display(), e))?;
        }
    }
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to create file '{}': {}", path, e))
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    
    if path.is_file() {
        fs::remove_file(path)
            .map_err(|e| format!("Failed to delete file '{}': {}", path.display(), e))
    } else if path.is_dir() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to delete directory '{}': {}", path.display(), e))
    } else {
        Err(format!("Path '{}' does not exist", path.display()))
    }
}

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
async fn is_directory(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).is_dir())
}

// Directory Operations
#[tauri::command]
async fn read_directory_simple(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_string());
            }
        }
    }
    
    files.sort();
    Ok(files)
}

#[tauri::command]
async fn read_directory_detailed(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            let is_dir = path.is_dir();
            let name = path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            let size = if is_dir {
                None
            } else {
                entry.metadata().ok().map(|m| m.len())
            };
            
            files.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_directory: is_dir,
                size,
                children: None,
            });
        }
    }
    
    // Sort: directories first, then files
    files.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(files)
}

#[tauri::command]
async fn read_directory_recursive(path: String, max_depth: Option<u32>) -> Result<FileEntry, String> {
    let max_depth = max_depth.unwrap_or(10); // Default max depth
    read_directory_recursive_internal(&path, 0, max_depth)
}

fn read_directory_recursive_internal(path: &str, current_depth: u32, max_depth: u32) -> Result<FileEntry, String> {
    let path_obj = Path::new(path);
    
    if !path_obj.exists() {
        return Err(format!("Path '{}' does not exist", path));
    }
    
    let name = path_obj.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    if path_obj.is_file() {
        let size = fs::metadata(path_obj).ok().map(|m| m.len());
        return Ok(FileEntry {
            name,
            path: path.to_string(),
            is_directory: false,
            size,
            children: None,
        });
    }
    
    let mut children = Vec::new();
    
    if current_depth < max_depth {
        if let Ok(entries) = fs::read_dir(path_obj) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let child_path = entry.path().to_string_lossy().to_string();
                    if let Ok(child) = read_directory_recursive_internal(&child_path, current_depth + 1, max_depth) {
                        children.push(child);
                    }
                }
            }
        }
    }
    
    // Sort children: directories first, then files
    children.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(FileEntry {
        name,
        path: path.to_string(),
        is_directory: true,
        size: None,
        children: Some(children),
    })
}

// System Information
#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    let os_name = std::env::consts::OS.to_string();
    let os_version = std::env::var("OS").unwrap_or_else(|_| "unknown".to_string());
    
    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    let documents_dir = dirs::document_dir()
        .map(|p| p.to_string_lossy().to_string());
    
    let downloads_dir = dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string());
    
    let app_data_dir = dirs::data_dir()
        .map(|p| p.to_string_lossy().to_string());
    
    let temp_dir = std::env::temp_dir().to_string_lossy().to_string();
    
    Ok(SystemInfo {
        username,
        hostname,
        os_name,
        os_version,
        home_dir,
        documents_dir,
        downloads_dir,
        app_data_dir,
        temp_dir,
    })
}

// Shell Operations
#[tauri::command]
async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err(format!("Path '{}' does not exist", path));
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try different file managers
        let managers = ["nautilus", "dolphin", "thunar", "pcmanfm"];
        let mut success = false;
        
        for manager in &managers {
            if std::process::Command::new(manager)
                .arg("--select")
                .arg(&path)
                .spawn()
                .is_ok()
            {
                success = true;
                break;
            }
        }
        
        if !success {
            // Fallback: try to open parent directory
            if let Some(parent) = path_obj.parent() {
                std::process::Command::new("xdg-open")
                    .arg(parent)
                    .spawn()
                    .map_err(|e| format!("Failed to open file manager: {}", e))?;
            }
        }
    }
    
    Ok(())
}

// Utility Commands
#[tauri::command]
async fn show_message_dialog(app: AppHandle, title: String, message: String, kind: String) -> Result<(), String> {
    let dialog_kind = match kind.as_str() {
        "error" => MessageDialogKind::Error,
        "warning" => MessageDialogKind::Warning,
        "info" => MessageDialogKind::Info,
        _ => MessageDialogKind::Info,
    };
    
    MessageDialogBuilder::new()
        .set_title(&title)
        .set_kind(dialog_kind)
        .show(&app)
        .await;
    
    Ok(())
}

#[tauri::command]
async fn get_file_metadata(path: String) -> Result<serde_json::Value, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata for '{}': {}", path, e))?;
    
    let modified = metadata.modified()
        .map(|time| time.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
        .unwrap_or(0);
    
    let created = metadata.created()
        .map(|time| time.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
        .unwrap_or(0);
    
    Ok(serde_json::json!({
        "size": metadata.len(),
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
        "modified": modified,
        "created": created,
        "readonly": metadata.permissions().readonly()
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // File Dialog Commands
            open_folder_dialog,
            open_file_dialog,
            save_file_dialog,
            
            // File Operations
            read_file_content,
            write_file_content,
            create_file,
            create_directory,
            delete_file,
            file_exists,
            is_directory,
            
            // Directory Operations
            read_directory_simple,
            read_directory_detailed,
            read_directory_recursive,
            
            // System Information
            get_system_info,
            
            // Shell Operations
            reveal_in_explorer,
            
            // Utility Commands
            show_message_dialog,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}