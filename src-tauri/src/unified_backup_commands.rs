// src-tauri/src/unified_backup_commands.rs
// ============================================================================
// UNIFIED BACKUP SYSTEM — Combines Surgical Edit + IDE Script backups
// ============================================================================
// Scans both ~/OperatorX02/backups/surgical_edits/ and ide_scripts/
//
// CRITICAL: Uses IDENTICAL field names to BackupInfo from
// surgical_backup_commands.rs so surgicalBackupManager.ts works unchanged.
// Only addition: "source" field ("surgical" | "ide_script")
// ============================================================================

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// DATA STRUCTURES — Same fields as BackupInfo + source
// ============================================================================

#[derive(Serialize, Clone, Debug)]
pub struct UnifiedBackupInfo {
    pub path: String,
    pub name: String,
    pub original_file: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub created_at: u64,
    pub created_display: String,
    pub age_seconds: u64,
    /// NEW: "surgical" or "ide_script"
    pub source: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct UnifiedBackupStats {
    pub total_backups: usize,
    pub total_size_bytes: u64,
    pub total_size_display: String,
    pub files_with_backups: usize,
    pub oldest_backup: Option<UnifiedBackupInfo>,
    pub newest_backup: Option<UnifiedBackupInfo>,
    pub per_file: Vec<UnifiedFileBackupSummary>,
    /// NEW fields
    pub surgical_count: usize,
    pub ide_script_count: usize,
    pub backup_dir: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct UnifiedFileBackupSummary {
    pub original_file: String,
    pub count: usize,
    pub total_size_bytes: u64,
    pub total_size_display: String,
    pub newest: Option<String>,
    pub oldest: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct UnifiedBackupPreview {
    pub path: String,
    pub name: String,
    pub original_file: String,
    pub content_preview: Vec<String>,
    pub total_lines: usize,
    pub size_bytes: u64,
    pub language: String,
}

// ============================================================================
// HELPERS — Replicates surgical_backup_commands.rs logic exactly
// ============================================================================

fn get_backup_base() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("OperatorX02").join("backups")
}

fn get_surgical_dir() -> PathBuf {
    get_backup_base().join("surgical_edits")
}

fn get_ide_script_dir() -> PathBuf {
    get_backup_base().join("ide_scripts")
}

fn format_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

fn format_timestamp(millis: u64) -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let diff_secs = now.saturating_sub(millis) / 1000;

    if diff_secs < 60 { "Just now".into() }
    else if diff_secs < 3600 { format!("{}m ago", diff_secs / 60) }
    else if diff_secs < 86400 { format!("{}h ago", diff_secs / 3600) }
    else if diff_secs < 604800 { format!("{}d ago", diff_secs / 86400) }
    else { format!("{}w ago", diff_secs / 604800) }
}

/// Extract original filename from backup name
/// Format: "{original_filename}_{timestamp}.bak"
/// Example: "User.ts_1771945953905.bak" → "User.ts"
fn extract_original_name(backup_name: &str) -> String {
    let without_bak = backup_name.trim_end_matches(".bak");
    if let Some(pos) = without_bak.rfind('_') {
        let candidate = &without_bak[..pos];
        if !candidate.is_empty() {
            return candidate.to_string();
        }
    }
    without_bak.to_string()
}

/// Extract timestamp from backup name
/// Format: "{original_filename}_{timestamp}.bak"
/// Example: "User.ts_1771945953905.bak" → 1771945953905
fn extract_timestamp(backup_name: &str) -> u64 {
    let without_bak = backup_name.trim_end_matches(".bak");
    if let Some(pos) = without_bak.rfind('_') {
        without_bak[pos + 1..].parse::<u64>().unwrap_or(0)
    } else {
        0
    }
}

/// Detect language from backup filename for syntax highlighting
fn detect_language(backup_name: &str) -> String {
    let original = extract_original_name(backup_name);
    let ext = original.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "ts" | "tsx" => "typescript", "js" | "jsx" | "mjs" => "javascript",
        "rs" => "rust", "py" => "python", "css" | "scss" => "css",
        "html" | "htm" => "html", "json" => "json", "toml" => "toml",
        "yaml" | "yml" => "yaml", "md" => "markdown", "cs" => "csharp",
        "kt" | "kts" => "kotlin", "java" => "java", "sql" => "sql",
        "cpp" | "cc" | "hpp" => "cpp", "c" | "h" => "c",
        "xml" => "xml", "sh" | "bash" => "bash", "ps1" => "powershell",
        _ => "text",
    }.to_string()
}

/// Scan a single backup directory and return entries tagged with source
fn scan_dir(dir: &Path, source: &str) -> Vec<UnifiedBackupInfo> {
    if !dir.exists() {
        return vec![];
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut backups = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".bak") {
            continue;
        }

        let size_bytes = fs::metadata(entry.path()).map(|m| m.len()).unwrap_or(0);
        let created_at = extract_timestamp(&name);

        backups.push(UnifiedBackupInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: name.clone(),
            original_file: extract_original_name(&name),
            size_bytes,
            size_display: format_size(size_bytes),
            created_at,
            created_display: format_timestamp(created_at),
            age_seconds: now_ms.saturating_sub(created_at) / 1000,
            source: source.to_string(),
        });
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    backups
}

/// Get all backups from both directories
fn get_all_unified_backups() -> Vec<UnifiedBackupInfo> {
    let mut all = Vec::new();
    all.append(&mut scan_dir(&get_surgical_dir(), "surgical"));
    all.append(&mut scan_dir(&get_ide_script_dir(), "ide_script"));
    all.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    all
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// List ALL backups from both surgical_edits/ and ide_scripts/
#[tauri::command]
pub async fn unified_backup_list_all() -> Result<Vec<UnifiedBackupInfo>, String> {
    println!("📊 [Unified Backup] Listing all backups...");
    Ok(get_all_unified_backups())
}

/// List filtered by source: "all", "surgical", "ide_script"
#[tauri::command]
pub async fn unified_backup_list_filtered(
    source_filter: String,
) -> Result<Vec<UnifiedBackupInfo>, String> {
    let all = get_all_unified_backups();
    if source_filter == "all" {
        return Ok(all);
    }
    Ok(all.into_iter().filter(|e| e.source == source_filter).collect())
}

/// List backups for a specific original filename
#[tauri::command]
pub async fn unified_backup_list_for_file(
    file_name: String,
) -> Result<Vec<UnifiedBackupInfo>, String> {
    let all = get_all_unified_backups();
    let needle = file_name.to_lowercase();
    Ok(all
        .into_iter()
        .filter(|e| e.original_file.to_lowercase().contains(&needle))
        .collect())
}

/// Get combined statistics (same shape as BackupStats + source counts)
#[tauri::command]
pub async fn unified_backup_stats() -> Result<UnifiedBackupStats, String> {
    println!("📊 [Unified Backup] Computing stats...");
    let all = get_all_unified_backups();

    let total_backups = all.len();
    let total_size_bytes: u64 = all.iter().map(|b| b.size_bytes).sum();

    let surgical_count = all.iter().filter(|b| b.source == "surgical").count();
    let ide_script_count = all.iter().filter(|b| b.source == "ide_script").count();

    let oldest_backup = all.last().cloned();
    let newest_backup = all.first().cloned();

    // Build per-file summary
    let mut file_map: std::collections::HashMap<String, Vec<&UnifiedBackupInfo>> =
        std::collections::HashMap::new();
    for b in &all {
        file_map.entry(b.original_file.clone()).or_default().push(b);
    }

    let mut per_file: Vec<UnifiedFileBackupSummary> = file_map
        .iter()
        .map(|(name, entries)| {
            let total: u64 = entries.iter().map(|e| e.size_bytes).sum();
            let newest = entries.first().map(|e| e.created_display.clone());
            let oldest = entries.last().map(|e| e.created_display.clone());
            UnifiedFileBackupSummary {
                original_file: name.clone(),
                count: entries.len(),
                total_size_bytes: total,
                total_size_display: format_size(total),
                newest,
                oldest,
            }
        })
        .collect();
    per_file.sort_by(|a, b| b.count.cmp(&a.count));

    let files_with_backups = per_file.len();

    Ok(UnifiedBackupStats {
        total_backups,
        total_size_bytes,
        total_size_display: format_size(total_size_bytes),
        files_with_backups,
        oldest_backup,
        newest_backup,
        per_file,
        surgical_count,
        ide_script_count,
        backup_dir: get_backup_base().to_string_lossy().to_string(),
    })
}

/// Preview backup content — returns same shape as BackupPreview
#[tauri::command]
pub async fn unified_backup_preview(
    backup_path: String,
    max_lines: Option<usize>,
) -> Result<UnifiedBackupPreview, String> {
    println!("👁️ [Unified Backup] Preview: {}", backup_path);
    let path = Path::new(&backup_path);
    if !path.exists() {
        return Err(format!("Backup not found: {}", backup_path));
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Read error: {}", e))?;
    let all_lines: Vec<String> = content.lines().map(String::from).collect();
    let total_lines = all_lines.len();
    let preview = all_lines.into_iter().take(max_lines.unwrap_or(100)).collect();
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let original = extract_original_name(&name);
    let language = detect_language(&name);

    Ok(UnifiedBackupPreview {
        path: backup_path,
        name,
        original_file: original,
        content_preview: preview,
        total_lines,
        size_bytes,
        language,
    })
}

/// Restore backup to target path
#[tauri::command]
pub async fn unified_backup_restore(
    backup_path: String,
    restore_to: String,
) -> Result<String, String> {
    let src = Path::new(&backup_path);
    let dst = Path::new(&restore_to);
    if !src.exists() {
        return Err(format!("Backup not found: {}", backup_path));
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Dir error: {}", e))?;
    }
    let content = fs::read(src).map_err(|e| format!("Read error: {}", e))?;
    let len = content.len();
    fs::write(dst, &content).map_err(|e| format!("Write error: {}", e))?;
    Ok(format!("Restored {} bytes to {}", len, restore_to))
}

/// Delete a single backup — returns the deleted entry info
#[tauri::command]
pub async fn unified_backup_delete(backup_path: String) -> Result<UnifiedBackupInfo, String> {
    let path = Path::new(&backup_path);
    if !path.exists() {
        return Err(format!("Backup not found: {}", backup_path));
    }

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let size_bytes = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let created_at = extract_timestamp(&name);

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Determine source from path
    let source = if backup_path.contains("ide_scripts") {
        "ide_script"
    } else {
        "surgical"
    };

    let info = UnifiedBackupInfo {
        path: backup_path.clone(),
        name: name.clone(),
        original_file: extract_original_name(&name),
        size_bytes,
        size_display: format_size(size_bytes),
        created_at,
        created_display: format_timestamp(created_at),
        age_seconds: now_ms.saturating_sub(created_at) / 1000,
        source: source.to_string(),
    };

    fs::remove_file(path).map_err(|e| format!("Delete error: {}", e))?;
    Ok(info)
}

/// Cleanup old backups from both directories
#[tauri::command]
pub async fn unified_backup_cleanup(
    max_age_hours: Option<u64>,
    max_count: Option<usize>,
) -> Result<String, String> {
    let all = get_all_unified_backups();
    let mut deleted = 0usize;
    let mut freed = 0u64;

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Delete by age
    if let Some(hours) = max_age_hours {
        let cutoff = now_ms.saturating_sub(hours * 3600 * 1000);
        for b in &all {
            if b.created_at < cutoff {
                if fs::remove_file(&b.path).is_ok() {
                    deleted += 1;
                    freed += b.size_bytes;
                }
            }
        }
    }

    // Delete by count (keep newest max_count)
    if let Some(max) = max_count {
        if all.len() > max {
            for b in all.iter().skip(max) {
                if fs::remove_file(&b.path).is_ok() {
                    deleted += 1;
                    freed += b.size_bytes;
                }
            }
        }
    }

    Ok(format!(
        "Cleaned {} backups, freed {}",
        deleted,
        format_size(freed)
    ))
}
