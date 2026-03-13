// src-tauri/src/ide_script_commands_v2.rs
// ============================================================================
// IDE Script Commands v2 — File Management Operations
// ============================================================================
//
// New commands:
//   ide_create_file   — Create a new file with content
//   ide_create_folder — Create a new directory (recursive)
//   ide_delete        — Delete a file or folder (with backup for files)
//   ide_rename        — Rename or move a file/folder
//   ide_read_file     — Read full file content (with optional line range)
//
// Uses std::time (no chrono dependency needed)
// Backups stored in: ~/OperatorX02/backups/ide_scripts/
// ============================================================================

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::Serialize;

// ============================================================================
// HELPER — Backup to OperatorX02 backup directory
// ============================================================================

fn get_ide_script_backup_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("OperatorX02").join("backups").join("ide_scripts")
}

fn timestamp_string() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_millis())
}

fn create_file_backup(file_path: &Path) -> Result<String, String> {
    if !file_path.exists() || !file_path.is_file() {
        return Ok(String::new());
    }

    let backup_dir = get_ide_script_backup_dir();
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup dir: {}", e))?;

    let file_name = file_path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let ts = timestamp_string();
    let backup_name = format!("{}_{}.bak", file_name, ts);
    let backup_path = backup_dir.join(&backup_name);

    fs::copy(file_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    let backup_id = format!("ids_{}", ts);
    Ok(backup_id)
}

// ============================================================================
// COMMAND: ide_create_file
// ============================================================================

#[derive(Serialize)]
pub struct IdeCreateFileResult {
    pub success: bool,
    pub file_path: String,
    pub bytes_written: usize,
    pub created_new: bool,
    pub backup_id: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ide_create_file(
    file_path: String,
    content: String,
    overwrite: Option<bool>,
) -> Result<IdeCreateFileResult, String> {
    let path = Path::new(&file_path);
    let overwrite = overwrite.unwrap_or(false);

    let already_exists = path.exists();
    if already_exists && !overwrite {
        return Ok(IdeCreateFileResult {
            success: false,
            file_path,
            bytes_written: 0,
            created_new: false,
            backup_id: String::new(),
            error: Some(format!("File already exists. Set overwrite: true to replace.")),
        });
    }

    // Create parent directories
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent dirs: {}", e))?;
        }
    }

    // Backup before overwrite
    let backup_id = if already_exists {
        create_file_backup(path)?
    } else {
        String::new()
    };

    let bytes = content.as_bytes().len();
    fs::write(path, &content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(IdeCreateFileResult {
        success: true,
        file_path,
        bytes_written: bytes,
        created_new: !already_exists,
        backup_id,
        error: None,
    })
}

// ============================================================================
// COMMAND: ide_create_folder
// ============================================================================

#[derive(Serialize)]
pub struct IdeCreateFolderResult {
    pub success: bool,
    pub folder_path: String,
    pub created_new: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ide_create_folder(
    folder_path: String,
) -> Result<IdeCreateFolderResult, String> {
    let path = Path::new(&folder_path);

    let already_exists = path.exists();
    if already_exists {
        return Ok(IdeCreateFolderResult {
            success: true,
            folder_path,
            created_new: false,
            error: None,
        });
    }

    fs::create_dir_all(path)
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    Ok(IdeCreateFolderResult {
        success: true,
        folder_path,
        created_new: true,
        error: None,
    })
}

// ============================================================================
// COMMAND: ide_delete
// ============================================================================

#[derive(Serialize)]
pub struct IdeDeleteResult {
    pub success: bool,
    pub target_path: String,
    pub was_file: bool,
    pub was_directory: bool,
    pub backup_id: String,
    pub items_deleted: usize,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ide_delete(
    target_path: String,
    recursive: Option<bool>,
) -> Result<IdeDeleteResult, String> {
    let path = Path::new(&target_path);
    let recursive = recursive.unwrap_or(false);

    if !path.exists() {
        return Ok(IdeDeleteResult {
            success: false,
            target_path,
            was_file: false,
            was_directory: false,
            backup_id: String::new(),
            items_deleted: 0,
            error: Some("Path does not exist".to_string()),
        });
    }

    if path.is_file() {
        let backup_id = create_file_backup(path)?;
        fs::remove_file(path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;

        Ok(IdeDeleteResult {
            success: true,
            target_path,
            was_file: true,
            was_directory: false,
            backup_id,
            items_deleted: 1,
            error: None,
        })
    } else if path.is_dir() {
        if !recursive {
            let entries: Vec<_> = fs::read_dir(path)
                .map_err(|e| format!("Failed to read directory: {}", e))?
                .collect();

            if !entries.is_empty() {
                return Ok(IdeDeleteResult {
                    success: false,
                    target_path,
                    was_file: false,
                    was_directory: true,
                    backup_id: String::new(),
                    items_deleted: 0,
                    error: Some(format!(
                        "Directory not empty ({} items). Set recursive: true to delete.",
                        entries.len()
                    )),
                });
            }

            fs::remove_dir(path)
                .map_err(|e| format!("Failed to delete empty dir: {}", e))?;

            Ok(IdeDeleteResult {
                success: true,
                target_path,
                was_file: false,
                was_directory: true,
                backup_id: String::new(),
                items_deleted: 1,
                error: None,
            })
        } else {
            let count = count_dir_items(path);
            fs::remove_dir_all(path)
                .map_err(|e| format!("Failed to delete dir recursively: {}", e))?;

            Ok(IdeDeleteResult {
                success: true,
                target_path,
                was_file: false,
                was_directory: true,
                backup_id: String::new(),
                items_deleted: count,
                error: None,
            })
        }
    } else {
        Ok(IdeDeleteResult {
            success: false,
            target_path,
            was_file: false,
            was_directory: false,
            backup_id: String::new(),
            items_deleted: 0,
            error: Some("Path is neither file nor directory".to_string()),
        })
    }
}

fn count_dir_items(path: &Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            count += 1;
            if entry.path().is_dir() {
                count += count_dir_items(&entry.path());
            }
        }
    }
    count
}

// ============================================================================
// COMMAND: ide_rename
// ============================================================================

#[derive(Serialize)]
pub struct IdeRenameResult {
    pub success: bool,
    pub old_path: String,
    pub new_path: String,
    pub was_file: bool,
    pub backup_id: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ide_rename(
    old_path: String,
    new_path: String,
) -> Result<IdeRenameResult, String> {
    let src = Path::new(&old_path);
    let dst = Path::new(&new_path);

    if !src.exists() {
        return Ok(IdeRenameResult {
            success: false,
            old_path,
            new_path,
            was_file: false,
            backup_id: String::new(),
            error: Some("Source path does not exist".to_string()),
        });
    }

    if dst.exists() {
        return Ok(IdeRenameResult {
            success: false,
            old_path,
            new_path,
            was_file: false,
            backup_id: String::new(),
            error: Some("Destination already exists".to_string()),
        });
    }

    if let Some(parent) = dst.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create destination dirs: {}", e))?;
        }
    }

    let was_file = src.is_file();
    let backup_id = if was_file {
        create_file_backup(src)?
    } else {
        String::new()
    };

    fs::rename(src, dst)
        .map_err(|e| format!("Failed to rename: {}", e))?;

    Ok(IdeRenameResult {
        success: true,
        old_path,
        new_path,
        was_file,
        backup_id,
        error: None,
    })
}

// ============================================================================
// COMMAND: ide_read_file
// ============================================================================

#[derive(Serialize)]
pub struct IdeReadFileResult {
    pub success: bool,
    pub file_path: String,
    pub content: String,
    pub total_lines: usize,
    pub file_size_bytes: u64,
    pub encoding: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn ide_read_file(
    file_path: String,
    line_start: Option<usize>,
    line_end: Option<usize>,
) -> Result<IdeReadFileResult, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Ok(IdeReadFileResult {
            success: false,
            file_path,
            content: String::new(),
            total_lines: 0,
            file_size_bytes: 0,
            encoding: String::new(),
            error: Some("File not found".to_string()),
        });
    }

    if !path.is_file() {
        return Ok(IdeReadFileResult {
            success: false,
            file_path,
            content: String::new(),
            total_lines: 0,
            file_size_bytes: 0,
            encoding: String::new(),
            error: Some("Path is not a file".to_string()),
        });
    }

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let file_size = metadata.len();

    if file_size > 10 * 1024 * 1024 {
        return Ok(IdeReadFileResult {
            success: false,
            file_path,
            content: String::new(),
            total_lines: 0,
            file_size_bytes: file_size,
            encoding: String::new(),
            error: Some(format!("File too large: {} bytes (max 10MB)", file_size)),
        });
    }

    let full_content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file (may be binary): {}", e))?;

    let total_lines = full_content.lines().count();

    let content = if line_start.is_some() || line_end.is_some() {
        let start = line_start.unwrap_or(1).max(1) - 1;
        let end = line_end.unwrap_or(total_lines).min(total_lines);
        full_content
            .lines()
            .skip(start)
            .take(end - start)
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        full_content
    };

    Ok(IdeReadFileResult {
        success: true,
        file_path,
        content,
        total_lines,
        file_size_bytes: file_size,
        encoding: "utf-8".to_string(),
        error: None,
    })
}
