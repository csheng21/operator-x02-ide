// src-tauri/src/surgical_backup_commands.rs
// ============================================================================
// 🗂️ SURGICAL BACKUP MANAGER — Backend Commands for Operator X02 Code IDE
// ============================================================================
// Extends the Surgical Edit Engine with comprehensive backup management.
// Provides: delete, bulk cleanup, stats, preview, diff, and export.
//
// REGISTRATION: Add to main.rs:
//   mod surgical_backup_commands;
//   use surgical_backup_commands::*;
//   Then register all surgical_backup_* commands in invoke_handler.
// ============================================================================

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// STRUCTS
// ============================================================================

#[derive(Serialize, Clone, Debug)]
pub struct BackupInfo {
    pub path: String,
    pub name: String,
    pub original_file: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub created_at: u64,
    pub created_display: String,
    pub age_seconds: u64,
}

#[derive(Serialize, Clone, Debug)]
pub struct BackupStats {
    pub total_backups: usize,
    pub total_size_bytes: u64,
    pub total_size_display: String,
    pub files_with_backups: usize,
    pub oldest_backup: Option<BackupInfo>,
    pub newest_backup: Option<BackupInfo>,
    pub per_file: Vec<FileBackupSummary>,
}

#[derive(Serialize, Clone, Debug)]
pub struct FileBackupSummary {
    pub original_file: String,
    pub count: usize,
    pub total_size_bytes: u64,
    pub total_size_display: String,
    pub newest: Option<String>,
    pub oldest: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BackupPreview {
    pub path: String,
    pub name: String,
    pub original_file: String,
    pub content_preview: Vec<String>,
    pub total_lines: usize,
    pub size_bytes: u64,
    pub language: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct BackupDiffResult {
    pub backup_path: String,
    pub current_path: String,
    pub backup_lines: usize,
    pub current_lines: usize,
    pub added_lines: Vec<DiffLine>,
    pub removed_lines: Vec<DiffLine>,
    pub changed_lines: Vec<DiffChangePair>,
    pub unchanged_count: usize,
    pub change_summary: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiffLine {
    pub line_number: usize,
    pub content: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiffChangePair {
    pub line_number: usize,
    pub old_content: String,
    pub new_content: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct BackupCleanupResult {
    pub deleted_count: usize,
    pub freed_bytes: u64,
    pub freed_display: String,
    pub remaining_count: usize,
    pub errors: Vec<String>,
}

// ============================================================================
// HELPERS
// ============================================================================

fn get_backup_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("OperatorX02").join("backups").join("surgical_edits")
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

fn extract_original_name(backup_name: &str) -> String {
    if let Some(pos) = backup_name.rfind('_') {
        let candidate = &backup_name[..pos];
        if !candidate.is_empty() { return candidate.to_string(); }
    }
    backup_name.replace(".bak", "")
}

fn extract_timestamp(backup_name: &str) -> u64 {
    if let Some(pos) = backup_name.rfind('_') {
        backup_name[pos + 1..].trim_end_matches(".bak").parse::<u64>().unwrap_or(0)
    } else { 0 }
}

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

fn get_all_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir();
    if !backup_dir.exists() { return Ok(vec![]); }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup dir: {}", e))?;

    let mut backups = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".bak") { continue; }

        let size_bytes = fs::metadata(entry.path()).map(|m| m.len()).unwrap_or(0);
        let created_at = extract_timestamp(&name);

        backups.push(BackupInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: name.clone(),
            original_file: extract_original_name(&name),
            size_bytes,
            size_display: format_size(size_bytes),
            created_at,
            created_display: format_timestamp(created_at),
            age_seconds: now_ms.saturating_sub(created_at) / 1000,
        });
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}


// ============================================================================
// TAURI COMMANDS
// ============================================================================

#[tauri::command]
pub async fn surgical_backup_stats() -> Result<BackupStats, String> {
    println!("📊 [Backup Manager] Computing stats...");
    let backups = get_all_backups()?;
    let total_size: u64 = backups.iter().map(|b| b.size_bytes).sum();

    let mut per_file_map: HashMap<String, Vec<&BackupInfo>> = HashMap::new();
    for backup in &backups {
        per_file_map.entry(backup.original_file.clone()).or_default().push(backup);
    }

    let mut per_file: Vec<FileBackupSummary> = per_file_map.iter().map(|(file, fbs)| {
        let total: u64 = fbs.iter().map(|b| b.size_bytes).sum();
        FileBackupSummary {
            original_file: file.clone(), count: fbs.len(),
            total_size_bytes: total, total_size_display: format_size(total),
            newest: fbs.first().map(|b| b.created_display.clone()),
            oldest: fbs.last().map(|b| b.created_display.clone()),
        }
    }).collect();
    per_file.sort_by(|a, b| b.count.cmp(&a.count));

    Ok(BackupStats {
        total_backups: backups.len(), total_size_bytes: total_size,
        total_size_display: format_size(total_size),
        files_with_backups: per_file.len(),
        oldest_backup: backups.last().cloned(),
        newest_backup: backups.first().cloned(),
        per_file,
    })
}

#[tauri::command]
pub async fn surgical_backup_list_all() -> Result<Vec<BackupInfo>, String> {
    println!("📋 [Backup Manager] Listing all backups...");
    get_all_backups()
}

#[tauri::command]
pub async fn surgical_backup_list_for_file(file_name: String) -> Result<Vec<BackupInfo>, String> {
    println!("📋 [Backup Manager] Listing backups for: {}", file_name);
    let all = get_all_backups()?;
    Ok(all.into_iter().filter(|b| b.original_file == file_name).collect())
}

#[tauri::command]
pub async fn surgical_backup_preview(backup_path: String, max_lines: Option<usize>) -> Result<BackupPreview, String> {
    println!("👁️ [Backup Manager] Preview: {}", backup_path);
    let path = Path::new(&backup_path);
    if !path.exists() { return Err(format!("Backup not found: {}", backup_path)); }

    let content = fs::read_to_string(&backup_path).map_err(|e| format!("Failed to read: {}", e))?;
    let all_lines: Vec<String> = content.lines().map(String::from).collect();
    let total_lines = all_lines.len();
    let preview = all_lines.into_iter().take(max_lines.unwrap_or(100)).collect();
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = fs::metadata(&backup_path).map(|m| m.len()).unwrap_or(0);

    Ok(BackupPreview {
        path: backup_path, name: name.clone(),
        original_file: extract_original_name(&name),
        content_preview: preview, total_lines, size_bytes,
        language: detect_language(&name),
    })
}

#[tauri::command]
pub async fn surgical_backup_diff(backup_path: String, current_file_path: String) -> Result<BackupDiffResult, String> {
    println!("📊 [Backup Manager] Diff: {} vs {}", backup_path, current_file_path);
    if !Path::new(&backup_path).exists() { return Err(format!("Backup not found: {}", backup_path)); }
    if !Path::new(&current_file_path).exists() { return Err(format!("Current file not found: {}", current_file_path)); }

    let backup_content = fs::read_to_string(&backup_path).map_err(|e| format!("Read backup: {}", e))?;
    let current_content = fs::read_to_string(&current_file_path).map_err(|e| format!("Read current: {}", e))?;

    let bl: Vec<&str> = backup_content.lines().collect();
    let cl: Vec<&str> = current_content.lines().collect();
    let mut added = Vec::new(); let mut removed = Vec::new();
    let mut changed = Vec::new(); let mut unchanged: usize = 0;

    for i in 0..bl.len().max(cl.len()) {
        match (i < bl.len(), i < cl.len()) {
            (true, true) if bl[i] == cl[i] => unchanged += 1,
            (true, true) => changed.push(DiffChangePair { line_number: i+1, old_content: bl[i].into(), new_content: cl[i].into() }),
            (false, true) => added.push(DiffLine { line_number: i+1, content: cl[i].into() }),
            (true, false) => removed.push(DiffLine { line_number: i+1, content: bl[i].into() }),
            _ => {}
        }
    }

    let total = added.len() + removed.len() + changed.len();
    let summary = if total == 0 { "Files are identical".into() }
        else { format!("{} change(s): +{} added, -{} removed, ~{} modified", total, added.len(), removed.len(), changed.len()) };

    Ok(BackupDiffResult {
        backup_path, current_path: current_file_path,
        backup_lines: bl.len(), current_lines: cl.len(),
        added_lines: added, removed_lines: removed, changed_lines: changed,
        unchanged_count: unchanged, change_summary: summary,
    })
}

#[tauri::command]
pub async fn surgical_backup_delete(backup_path: String) -> Result<BackupInfo, String> {
    println!("🗑️ [Backup Manager] Deleting: {}", backup_path);
    let path = Path::new(&backup_path);
    if !path.exists() { return Err(format!("Backup not found: {}", backup_path)); }

    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let size_bytes = fs::metadata(&backup_path).map(|m| m.len()).unwrap_or(0);
    let created_at = extract_timestamp(&name);
    let info = BackupInfo {
        path: backup_path.clone(), name: name.clone(),
        original_file: extract_original_name(&name),
        size_bytes, size_display: format_size(size_bytes),
        created_at, created_display: format_timestamp(created_at), age_seconds: 0,
    };

    fs::remove_file(&backup_path).map_err(|e| format!("Failed to delete: {}", e))?;
    println!("✅ [Backup Manager] Deleted: {} ({})", name, info.size_display);
    Ok(info)
}

#[tauri::command]
pub async fn surgical_backup_delete_batch(backup_paths: Vec<String>) -> Result<BackupCleanupResult, String> {
    println!("🗑️ [Backup Manager] Batch delete: {} files", backup_paths.len());
    let mut deleted = 0; let mut freed = 0u64; let mut errors = Vec::new();

    for p in &backup_paths {
        let path = Path::new(p);
        if !path.exists() { errors.push(format!("Not found: {}", p)); continue; }
        let sz = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        match fs::remove_file(path) {
            Ok(_) => { deleted += 1; freed += sz; }
            Err(e) => errors.push(format!("{}: {}", p, e)),
        }
    }

    Ok(BackupCleanupResult {
        deleted_count: deleted, freed_bytes: freed, freed_display: format_size(freed),
        remaining_count: get_all_backups().map(|b| b.len()).unwrap_or(0), errors,
    })
}

#[tauri::command]
pub async fn surgical_backup_cleanup(
    max_age_days: Option<u64>, max_per_file: Option<usize>, max_total_size_mb: Option<u64>,
) -> Result<BackupCleanupResult, String> {
    println!("🧹 [Backup Manager] Cleanup — age:{:?}d per_file:{:?} max_size:{:?}MB",
        max_age_days, max_per_file, max_total_size_mb);

    let all = get_all_backups()?;
    let mut to_delete: Vec<String> = Vec::new();

    if let Some(max_days) = max_age_days {
        let max_secs = max_days * 86400;
        for b in &all {
            if b.age_seconds > max_secs && !to_delete.contains(&b.path) { to_delete.push(b.path.clone()); }
        }
    }

    if let Some(max_n) = max_per_file {
        let mut per_file: HashMap<String, Vec<&BackupInfo>> = HashMap::new();
        for b in &all { per_file.entry(b.original_file.clone()).or_default().push(b); }
        for (_, fbs) in &per_file {
            if fbs.len() > max_n {
                for b in &fbs[max_n..] { if !to_delete.contains(&b.path) { to_delete.push(b.path.clone()); } }
            }
        }
    }

    if let Some(max_mb) = max_total_size_mb {
        let max_bytes = max_mb * 1024 * 1024;
        let remaining: Vec<&BackupInfo> = all.iter().filter(|b| !to_delete.contains(&b.path)).collect();
        let mut total: u64 = remaining.iter().map(|b| b.size_bytes).sum();
        for b in remaining.iter().rev() {
            if total <= max_bytes { break; }
            to_delete.push(b.path.clone());
            total = total.saturating_sub(b.size_bytes);
        }
    }

    let mut deleted = 0; let mut freed = 0u64; let mut errors = Vec::new();
    for p in &to_delete {
        let sz = fs::metadata(Path::new(p)).map(|m| m.len()).unwrap_or(0);
        match fs::remove_file(p) {
            Ok(_) => { deleted += 1; freed += sz; }
            Err(e) => errors.push(format!("{}: {}", p, e)),
        }
    }

    let remaining_count = get_all_backups().map(|b| b.len()).unwrap_or(0);
    println!("✅ [Backup Manager] Done: {} deleted, {} freed, {} left", deleted, format_size(freed), remaining_count);

    Ok(BackupCleanupResult {
        deleted_count: deleted, freed_bytes: freed, freed_display: format_size(freed),
        remaining_count, errors,
    })
}

#[tauri::command]
pub async fn surgical_backup_export(backup_path: String, export_dir: String) -> Result<String, String> {
    println!("📤 [Backup Manager] Export: {} → {}", backup_path, export_dir);
    let source = Path::new(&backup_path);
    if !source.exists() { return Err(format!("Backup not found: {}", backup_path)); }

    let dest_dir = Path::new(&export_dir);
    fs::create_dir_all(dest_dir).map_err(|e| format!("Create dir: {}", e))?;

    let file_name = source.file_name().unwrap_or_default().to_string_lossy().to_string();
    let original_name = extract_original_name(&file_name);
    let dest = dest_dir.join(&original_name);

    let final_path = if dest.exists() {
        let stem = dest.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let ext = dest.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        dest_dir.join(format!("{}_restored_{}{}", stem, extract_timestamp(&file_name), ext))
    } else { dest };

    fs::copy(&backup_path, &final_path).map_err(|e| format!("Export failed: {}", e))?;
    let out = final_path.to_string_lossy().to_string();
    println!("✅ [Backup Manager] Exported: {}", out);
    Ok(out)
}

#[tauri::command]
pub async fn surgical_backup_get_dir() -> Result<String, String> {
    let dir = get_backup_dir();
    let _ = fs::create_dir_all(&dir);
    Ok(dir.to_string_lossy().to_string())
}
