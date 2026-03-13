use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SvnFileStatus {
    pub path: String,
    pub status: String,
    pub props_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SvnInfo {
    pub url: String,
    pub repository_root: String,
    pub repository_uuid: String,
    pub revision: String,
    pub node_kind: String,
    pub last_changed_author: String,
    pub last_changed_rev: String,
    pub last_changed_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SvnLogEntry {
    pub revision: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub paths: Vec<String>,
}

// Check if SVN is installed
#[tauri::command]
pub async fn svn_check_installed() -> Result<bool, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn --version"])
            .output()
    } else {
        Command::new("svn")
            .arg("--version")
            .output()
    };

    match output {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

// Get SVN status for a path
#[tauri::command]
pub async fn svn_status(path: String) -> Result<Vec<SvnFileStatus>, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "status", &path])
            .output()
    } else {
        Command::new("svn")
            .args(&["status", &path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let status_str = String::from_utf8_lossy(&output.stdout);
                let mut statuses = Vec::new();

                for line in status_str.lines() {
                    if line.len() >= 8 {
                        let status = line.chars().nth(0).unwrap_or(' ').to_string();
                        let props_status = line.chars().nth(1).unwrap_or(' ').to_string();
                        let file_path = line[8..].trim().to_string();

                        statuses.push(SvnFileStatus {
                            path: file_path,
                            status,
                            props_status,
                        });
                    }
                }

                Ok(statuses)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN status failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Get SVN info for a path
#[tauri::command]
pub async fn svn_info(path: String) -> Result<SvnInfo, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "info", &path])
            .output()
    } else {
        Command::new("svn")
            .args(&["info", &path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let info_str = String::from_utf8_lossy(&output.stdout);
                let mut info = SvnInfo {
                    url: String::new(),
                    repository_root: String::new(),
                    repository_uuid: String::new(),
                    revision: String::new(),
                    node_kind: String::new(),
                    last_changed_author: String::new(),
                    last_changed_rev: String::new(),
                    last_changed_date: String::new(),
                };

                for line in info_str.lines() {
                    if line.starts_with("URL:") {
                        info.url = line[4..].trim().to_string();
                    } else if line.starts_with("Repository Root:") {
                        info.repository_root = line[16..].trim().to_string();
                    } else if line.starts_with("Repository UUID:") {
                        info.repository_uuid = line[16..].trim().to_string();
                    } else if line.starts_with("Revision:") {
                        info.revision = line[9..].trim().to_string();
                    } else if line.starts_with("Node Kind:") {
                        info.node_kind = line[10..].trim().to_string();
                    } else if line.starts_with("Last Changed Author:") {
                        info.last_changed_author = line[20..].trim().to_string();
                    } else if line.starts_with("Last Changed Rev:") {
                        info.last_changed_rev = line[17..].trim().to_string();
                    } else if line.starts_with("Last Changed Date:") {
                        info.last_changed_date = line[18..].trim().to_string();
                    }
                }

                Ok(info)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN info failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Commit files
#[tauri::command]
pub async fn svn_commit(path: String, message: String, files: Vec<String>) -> Result<String, String> {
    let mut args = vec!["commit", "-m", &message];
    
    let file_refs: Vec<&str> = if files.is_empty() {
        vec![&path]
    } else {
        files.iter().map(|s| s.as_str()).collect()
    };
    args.extend(file_refs);

    let output = if cfg!(target_os = "windows") {
        let mut cmd_args = vec!["/C", "svn"];
        cmd_args.extend(args);
        Command::new("cmd")
            .args(&cmd_args)
            .output()
    } else {
        Command::new("svn")
            .args(&args)
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN commit failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Update working copy
#[tauri::command]
pub async fn svn_update(path: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "update", &path])
            .output()
    } else {
        Command::new("svn")
            .args(&["update", &path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN update failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Revert files
#[tauri::command]
pub async fn svn_revert(files: Vec<String>) -> Result<String, String> {
    let mut args = vec!["revert"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    let output = if cfg!(target_os = "windows") {
        let mut cmd_args = vec!["/C", "svn"];
        cmd_args.extend(args);
        Command::new("cmd")
            .args(&cmd_args)
            .output()
    } else {
        Command::new("svn")
            .args(&args)
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN revert failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Add files to SVN
#[tauri::command]
pub async fn svn_add(files: Vec<String>) -> Result<String, String> {
    let mut args = vec!["add"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    let output = if cfg!(target_os = "windows") {
        let mut cmd_args = vec!["/C", "svn"];
        cmd_args.extend(args);
        Command::new("cmd")
            .args(&cmd_args)
            .output()
    } else {
        Command::new("svn")
            .args(&args)
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN add failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Delete files from SVN
#[tauri::command]
pub async fn svn_delete(files: Vec<String>) -> Result<String, String> {
    let mut args = vec!["delete"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    let output = if cfg!(target_os = "windows") {
        let mut cmd_args = vec!["/C", "svn"];
        cmd_args.extend(args);
        Command::new("cmd")
            .args(&cmd_args)
            .output()
    } else {
        Command::new("svn")
            .args(&args)
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN delete failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Get diff for a file
#[tauri::command]
pub async fn svn_diff(file_path: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "diff", &file_path])
            .output()
    } else {
        Command::new("svn")
            .args(&["diff", &file_path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let diff = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(diff)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN diff failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Get log entries
#[tauri::command]
pub async fn svn_log(path: String, limit: u32) -> Result<Vec<SvnLogEntry>, String> {
    let limit_str = limit.to_string();
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "log", "-l", &limit_str, &path])
            .output()
    } else {
        Command::new("svn")
            .args(&["log", "-l", &limit_str, &path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let log_str = String::from_utf8_lossy(&output.stdout);
                let mut entries = Vec::new();
                let mut current_entry: Option<SvnLogEntry> = None;
                let mut in_message = false;

                for line in log_str.lines() {
                    if line.starts_with("--------") {
                        if let Some(entry) = current_entry.take() {
                            entries.push(entry);
                        }
                        in_message = false;
                        continue;
                    }

                    if line.starts_with("r") && !in_message {
                        let parts: Vec<&str> = line.split('|').collect();
                        if parts.len() >= 3 {
                            current_entry = Some(SvnLogEntry {
                                revision: parts[0].trim().to_string(),
                                author: parts[1].trim().to_string(),
                                date: parts[2].trim().to_string(),
                                message: String::new(),
                                paths: Vec::new(),
                            });
                            in_message = true;
                        }
                    } else if in_message && !line.is_empty() {
                        if let Some(ref mut entry) = current_entry {
                            if !entry.message.is_empty() {
                                entry.message.push('\n');
                            }
                            entry.message.push_str(line.trim());
                        }
                    }
                }

                if let Some(entry) = current_entry {
                    entries.push(entry);
                }

                Ok(entries)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN log failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Resolve conflicts
#[tauri::command]
pub async fn svn_resolve(file: String, resolution: String) -> Result<String, String> {
    // resolution can be: base, working, mine-conflict, theirs-conflict, mine-full, theirs-full
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "resolve", "--accept", &resolution, &file])
            .output()
    } else {
        Command::new("svn")
            .args(&["resolve", "--accept", &resolution, &file])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(result)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN resolve failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Get file content at specific revision
#[tauri::command]
pub async fn svn_cat(file_path: String, revision: String) -> Result<String, String> {
    let rev_arg = format!("{}@{}", file_path, revision);
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "cat", &rev_arg])
            .output()
    } else {
        Command::new("svn")
            .args(&["cat", &rev_arg])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let content = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(content)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN cat failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}

// Open TortoiseSVN (Windows only)
#[tauri::command]
pub async fn open_tortoise_svn(action: String, path: String) -> Result<(), String> {
    if !cfg!(target_os = "windows") {
        return Err("TortoiseSVN is only available on Windows".to_string());
    }

    Command::new("TortoiseProc.exe")
        .args(&[
            &format!("/command:{}", action),
            &format!("/path:{}", path),
            "/notempfile",
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch TortoiseSVN: {}. Make sure TortoiseSVN is installed.", e))?;

    Ok(())
}

// Cleanup working copy
#[tauri::command]
pub async fn svn_cleanup(path: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "svn", "cleanup", &path])
            .output()
    } else {
        Command::new("svn")
            .args(&["cleanup", &path])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok("Cleanup completed successfully".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("SVN cleanup failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute SVN command: {}", e)),
    }
}
