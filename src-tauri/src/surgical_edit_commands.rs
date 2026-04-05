// src-tauri/src/surgical_edit_commands.rs
// ============================================================================
// 🔬 SURGICAL EDIT ENGINE - Backend Module for Operator X02 Code IDE
// ============================================================================
// Provides safe, surgical code modification capabilities via Tauri commands.
// Implements: reconnaissance, pattern search, block detection, multi-strategy
// editing, verification, duplicate cleanup, and automatic backup/rollback.
// ============================================================================

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// STRUCTS AND TYPES
// ============================================================================

/// Result of a pattern search across files
#[derive(Serialize, Clone, Debug)]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: usize,     // 1-indexed
    pub line_content: String,
    pub trimmed_content: String,
    pub context_before: Vec<String>,  // 3 lines before
    pub context_after: Vec<String>,   // 3 lines after
}

/// Result of a block boundary detection
#[derive(Serialize, Clone, Debug)]
pub struct BlockBoundary {
    pub start_line: usize,      // 1-indexed
    pub end_line: usize,        // 1-indexed
    pub total_lines: usize,
    pub preview: Vec<String>,   // First 5 lines of the block
    pub block_type: String,     // "function", "class", "template", "html_block", "unknown"
}

/// Reconnaissance report for a file
#[derive(Serialize, Clone, Debug)]
pub struct FileReconReport {
    pub file_path: String,
    pub file_size: u64,
    pub total_lines: usize,
    pub functions: Vec<CodeSymbol>,
    pub classes: Vec<CodeSymbol>,
    pub imports: Vec<CodeSymbol>,
    pub exports: Vec<CodeSymbol>,
}

/// A code symbol (function, class, import, etc.)
#[derive(Serialize, Clone, Debug)]
pub struct CodeSymbol {
    pub name: String,
    pub line_number: usize,     // 1-indexed
    pub symbol_type: String,    // "function", "class", "interface", "import", "export", "const", "let"
    pub preview: String,        // The line content
}

/// Result of a surgical edit operation
#[derive(Serialize, Clone, Debug)]
pub struct EditResult {
    pub success: bool,
    pub message: String,
    pub file_path: String,
    pub lines_before: usize,
    pub lines_after: usize,
    pub bytes_before: u64,
    pub bytes_after: u64,
    pub backup_path: Option<String>,
    pub changes_applied: Vec<ChangeRecord>,
}

/// Individual change record
#[derive(Serialize, Clone, Debug)]
pub struct ChangeRecord {
    pub strategy: String,
    pub start_line: usize,
    pub end_line: usize,
    pub lines_removed: usize,
    pub lines_added: usize,
    pub description: String,
}

/// Verification result after edit
#[derive(Serialize, Clone, Debug)]
pub struct VerifyResult {
    pub file_exists: bool,
    pub file_size: u64,
    pub total_lines: usize,
    pub duplicates: Vec<DuplicateInfo>,
    pub syntax_issues: Vec<String>,
    pub changed_lines: Vec<LineInfo>,
}

/// Duplicate declaration info
#[derive(Serialize, Clone, Debug)]
pub struct DuplicateInfo {
    pub pattern: String,
    pub count: usize,
    pub line_numbers: Vec<usize>,
}

/// Single line info
#[derive(Serialize, Clone, Debug)]
pub struct LineInfo {
    pub line_number: usize,
    pub content: String,
}

/// Diff preview before applying edits
#[derive(Serialize, Clone, Debug)]
pub struct DiffPreview {
    pub file_path: String,
    pub strategy: String,
    pub old_lines: Vec<LineInfo>,
    pub new_lines: Vec<String>,
    pub start_line: usize,
    pub end_line: usize,
    pub context_before: Vec<LineInfo>,
    pub context_after: Vec<LineInfo>,
}

/// Edit strategy request from frontend
#[derive(Deserialize, Debug)]
pub struct EditRequest {
    pub file_path: String,
    pub strategy: String,           // "line_replace", "block_replace", "string_replace", "insert", "remove"
    pub search_pattern: Option<String>,
    pub search_pattern_secondary: Option<String>,  // For 2-line matching
    pub start_line: Option<usize>,  // 1-indexed
    pub end_line: Option<usize>,    // 1-indexed
    pub new_content: String,
    pub old_content: Option<String>, // For string_replace strategy
    pub dry_run: bool,              // Preview only, don't write
    pub create_backup: bool,        // Default true
    pub insert_position: Option<String>,  // "before" or "after" for insert strategy
}

/// Batch edit request
#[derive(Deserialize, Debug)]
pub struct BatchEditRequest {
    pub file_path: String,
    pub edits: Vec<SingleEdit>,
    pub dry_run: bool,
    pub create_backup: bool,
}

/// Single edit in a batch
#[derive(Deserialize, Debug)]
pub struct SingleEdit {
    pub strategy: String,
    pub search_pattern: Option<String>,
    pub search_pattern_secondary: Option<String>,
    pub start_line: Option<usize>,
    pub end_line: Option<usize>,
    pub new_content: String,
    pub old_content: Option<String>,
    pub insert_position: Option<String>,
    pub description: Option<String>,
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Get the backup directory path
fn get_backup_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("OperatorX02").join("backups").join("surgical_edits")
}

/// Create a timestamped backup of a file
fn create_backup(file_path: &str) -> Result<String, String> {
    let backup_dir = get_backup_dir();
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup dir: {}", e))?;

    let source_path = Path::new(file_path);
    let file_name = source_path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let backup_name = format!("{}_{}.bak", file_name, timestamp);
    let backup_path = backup_dir.join(&backup_name);

    fs::copy(file_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path.to_string_lossy().to_string())
}

/// Read file lines safely
fn read_file_lines(path: &str) -> Result<Vec<String>, String> {
    let file = fs::File::open(path)
        .map_err(|e| format!("Failed to open '{}': {}", path, e))?;
    
    let reader = BufReader::new(file);
    let lines: Vec<String> = reader.lines()
        .filter_map(|l| l.ok())
        .collect();
    
    Ok(lines)
}

/// Write lines back to file with LF line endings
fn write_file_lines(path: &str, lines: &[String]) -> Result<(), String> {
    let content = lines.join("\n");
    fs::write(path, &content)
        .map_err(|e| format!("Failed to write '{}': {}", path, e))
}

/// Get context lines around a specific line
fn get_context(lines: &[String], line_idx: usize, radius: usize) -> (Vec<String>, Vec<String>) {
    let start = if line_idx >= radius { line_idx - radius } else { 0 };
    let end = std::cmp::min(line_idx + radius + 1, lines.len());

    let before: Vec<String> = lines[start..line_idx].to_vec();
    let after: Vec<String> = if line_idx + 1 < end {
        lines[line_idx + 1..end].to_vec()
    } else {
        vec![]
    };

    (before, after)
}

/// Detect the type of code block
fn detect_block_type(lines: &[String], start: usize) -> String {
    if start >= lines.len() {
        return "unknown".to_string();
    }
    
    let line = lines[start].trim();
    
    if line.contains("function ") || line.contains("async function ") || line.contains("=> {") || line.contains("(): ") {
        "function".to_string()
    } else if line.contains("class ") {
        "class".to_string()
    } else if line.contains("interface ") {
        "interface".to_string()
    } else if line.contains("innerHTML") || line.contains("<div") || line.contains("<template") {
        "html_block".to_string()
    } else if line.contains("import ") {
        "import".to_string()
    } else if line.starts_with("export ") {
        "export".to_string()
    } else {
        "unknown".to_string()
    }
}

/// Find matching brace/bracket end from a start position
fn find_block_end(lines: &[String], start: usize, open_char: char, close_char: char, max_search: usize) -> Option<usize> {
    let mut depth = 0;
    let end = std::cmp::min(start + max_search, lines.len());
    
    for i in start..end {
        for ch in lines[i].chars() {
            if ch == open_char {
                depth += 1;
            } else if ch == close_char {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
        }
    }
    None
}


// ============================================================================
// PHASE 1: RECONNAISSANCE COMMANDS
// ============================================================================

/// Full reconnaissance of a file - extract structure, symbols, and metadata
#[tauri::command]
pub async fn surgical_recon(file_path: String) -> Result<FileReconReport, String> {
    println!("🔬 [Surgical] Reconnaissance: {}", file_path);
    
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    
    let lines = read_file_lines(&file_path)?;
    let mut functions = Vec::new();
    let mut classes = Vec::new();
    let mut imports = Vec::new();
    let mut exports = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        let line_num = i + 1;

        // Detect functions (TypeScript/JavaScript patterns)
        if (trimmed.contains("function ") && (trimmed.contains("(") || trimmed.contains("async ")))
            || (trimmed.contains("const ") && trimmed.contains(" = (") && trimmed.contains("=>"))
            || (trimmed.contains("const ") && trimmed.contains(" = async ("))
            || (trimmed.matches("(").count() > 0 && trimmed.ends_with("{") && !trimmed.starts_with("if") && !trimmed.starts_with("for") && !trimmed.starts_with("while"))
        {
            // Extract function name
            let name = extract_function_name(trimmed);
            if !name.is_empty() {
                functions.push(CodeSymbol {
                    name,
                    line_number: line_num,
                    symbol_type: "function".to_string(),
                    preview: trimmed.chars().take(120).collect(),
                });
            }
        }

        // Detect classes and interfaces
        if trimmed.starts_with("class ") || trimmed.starts_with("export class ") 
            || trimmed.starts_with("abstract class ") {
            let name = extract_class_name(trimmed);
            classes.push(CodeSymbol {
                name,
                line_number: line_num,
                symbol_type: "class".to_string(),
                preview: trimmed.chars().take(120).collect(),
            });
        }

        if trimmed.starts_with("interface ") || trimmed.starts_with("export interface ") {
            let name = extract_class_name(trimmed);
            classes.push(CodeSymbol {
                name,
                line_number: line_num,
                symbol_type: "interface".to_string(),
                preview: trimmed.chars().take(120).collect(),
            });
        }

        // Detect imports
        if trimmed.starts_with("import ") {
            imports.push(CodeSymbol {
                name: trimmed.chars().take(100).collect(),
                line_number: line_num,
                symbol_type: "import".to_string(),
                preview: trimmed.chars().take(120).collect(),
            });
        }

        // Detect exports
        if trimmed.starts_with("export ") && !trimmed.starts_with("export class") && !trimmed.starts_with("export interface") {
            exports.push(CodeSymbol {
                name: trimmed.chars().take(100).collect(),
                line_number: line_num,
                symbol_type: "export".to_string(),
                preview: trimmed.chars().take(120).collect(),
            });
        }
    }

    Ok(FileReconReport {
        file_path,
        file_size: metadata.len(),
        total_lines: lines.len(),
        functions,
        classes,
        imports,
        exports,
    })
}

/// Extract function name from a line
fn extract_function_name(line: &str) -> String {
    let trimmed = line.trim();
    
    // Pattern: "function myFunc(" or "async function myFunc("
    if let Some(pos) = trimmed.find("function ") {
        let after = &trimmed[pos + 9..];
        let name: String = after.chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        if !name.is_empty() {
            return name;
        }
    }
    
    // Pattern: "const myFunc = (" or "const myFunc = async ("
    if trimmed.starts_with("const ") || trimmed.starts_with("let ") || trimmed.starts_with("var ") {
        let after = if trimmed.starts_with("const ") { &trimmed[6..] }
            else if trimmed.starts_with("let ") { &trimmed[4..] }
            else { &trimmed[4..] };
        
        let name: String = after.chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        
        if !name.is_empty() && (after.contains("= (") || after.contains("= async") || after.contains("=>")) {
            return name;
        }
    }

    // Pattern: "  methodName(" inside class
    if trimmed.ends_with("{") && trimmed.contains("(") && !trimmed.starts_with("if") 
        && !trimmed.starts_with("for") && !trimmed.starts_with("while") && !trimmed.starts_with("switch") {
        let name: String = trimmed.trim_start_matches("async ")
            .trim_start_matches("private ")
            .trim_start_matches("public ")
            .trim_start_matches("protected ")
            .trim_start_matches("static ")
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
            .collect();
        if !name.is_empty() && name != "return" && name != "else" {
            return name;
        }
    }
    
    String::new()
}

/// Extract class/interface name from a line
fn extract_class_name(line: &str) -> String {
    let trimmed = line.trim()
        .trim_start_matches("export ")
        .trim_start_matches("abstract ")
        .trim_start_matches("class ")
        .trim_start_matches("interface ");
    
    trimmed.chars()
        .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '<')
        .take_while(|c| *c != '<') // Stop at generics
        .collect()
}


// ============================================================================
// PHASE 1: SEARCH COMMANDS
// ============================================================================

/// Search for a pattern within a single file, returning matches with context
#[tauri::command]
pub async fn surgical_search(
    file_path: String,
    pattern: String,
    max_results: Option<usize>,
    case_sensitive: Option<bool>,
) -> Result<Vec<SearchMatch>, String> {
    println!("🔍 [Surgical] Search '{}' in {}", pattern, file_path);
    
    let lines = read_file_lines(&file_path)?;
    let max = max_results.unwrap_or(50);
    let case_sens = case_sensitive.unwrap_or(false);
    let mut results = Vec::new();

    let search_pattern = if case_sens { pattern.clone() } else { pattern.to_lowercase() };

    for (i, line) in lines.iter().enumerate() {
        let compare_line = if case_sens { line.clone() } else { line.to_lowercase() };
        
        if compare_line.contains(&search_pattern) {
            let (ctx_before, ctx_after) = get_context(&lines, i, 3);
            
            results.push(SearchMatch {
                file_path: file_path.clone(),
                line_number: i + 1,
                line_content: line.clone(),
                trimmed_content: line.trim().to_string(),
                context_before: ctx_before,
                context_after: ctx_after,
            });

            if results.len() >= max {
                break;
            }
        }
    }

    println!("   Found {} matches", results.len());
    Ok(results)
}

/// Search across multiple files in a directory
#[tauri::command]
pub async fn surgical_search_files(
    directory: String,
    pattern: String,
    file_extensions: Option<Vec<String>>,
    max_results: Option<usize>,
    max_depth: Option<usize>,
) -> Result<Vec<SearchMatch>, String> {
    println!("🔍 [Surgical] Multi-file search '{}' in {}", pattern, directory);
    
    let max = max_results.unwrap_or(100);
    let depth = max_depth.unwrap_or(10);
    let extensions = file_extensions.unwrap_or_else(|| {
        vec![
            "ts".into(), "tsx".into(), "js".into(), "jsx".into(),
            "rs".into(), "py".into(), "html".into(), "css".into(),
            "json".into(), "yaml".into(), "yml".into(), "md".into(),
        ]
    });
    
    let mut results = Vec::new();
    let pattern_lower = pattern.to_lowercase();
    
    fn search_dir(
        dir: &Path, pattern: &str, extensions: &[String], results: &mut Vec<SearchMatch>,
        max: usize, max_depth: usize, current_depth: usize,
    ) {
        if current_depth > max_depth || results.len() >= max { return; }
        
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.filter_map(|e| e.ok()) {
            if results.len() >= max { return; }
            
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Skip hidden dirs and heavy folders
            if name.starts_with('.') || matches!(name.as_str(), 
                "node_modules" | "target" | "dist" | "__pycache__" | 
                "venv" | ".venv" | ".git" | ".svn" | "coverage" | ".cache"
            ) {
                continue;
            }

            if path.is_dir() {
                search_dir(&path, pattern, extensions, results, max, max_depth, current_depth + 1);
            } else {
                // Check extension
                let ext = path.extension()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_lowercase();
                
                if !extensions.iter().any(|e| e.to_lowercase() == ext) {
                    continue;
                }

                // Search in file
                if let Ok(file) = fs::File::open(&path) {
                    let reader = BufReader::new(file);
                    let lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();
                    
                    for (i, line) in lines.iter().enumerate() {
                        if results.len() >= max { return; }
                        
                        if line.to_lowercase().contains(pattern) {
                            let start = if i >= 3 { i - 3 } else { 0 };
                            let end = std::cmp::min(i + 4, lines.len());
                            
                            results.push(SearchMatch {
                                file_path: path.to_string_lossy().to_string(),
                                line_number: i + 1,
                                line_content: line.clone(),
                                trimmed_content: line.trim().to_string(),
                                context_before: lines[start..i].to_vec(),
                                context_after: if i + 1 < end { lines[i + 1..end].to_vec() } else { vec![] },
                            });
                        }
                    }
                }
            }
        }
    }

    search_dir(Path::new(&directory), &pattern_lower, &extensions, &mut results, max, depth, 0);
    
    println!("   Found {} matches across files", results.len());
    Ok(results)
}

/// Read specific line ranges from a file
#[tauri::command]
pub async fn surgical_read_lines(
    file_path: String,
    start_line: usize,     // 1-indexed
    end_line: usize,       // 1-indexed, inclusive
) -> Result<Vec<LineInfo>, String> {
    let lines = read_file_lines(&file_path)?;
    let start = if start_line > 0 { start_line - 1 } else { 0 };
    let end = std::cmp::min(end_line, lines.len());

    let mut result = Vec::new();
    for i in start..end {
        result.push(LineInfo {
            line_number: i + 1,
            content: lines[i].clone(),
        });
    }
    Ok(result)
}

/// Find block boundaries starting from a pattern
#[tauri::command]
pub async fn surgical_find_block(
    file_path: String,
    start_pattern: String,
    end_pattern: Option<String>,
    near_line: Option<usize>,       // Hint: search near this line (1-indexed)
    max_search_range: Option<usize>,
) -> Result<BlockBoundary, String> {
    println!("🔍 [Surgical] Find block '{}' in {}", start_pattern, file_path);
    
    let lines = read_file_lines(&file_path)?;
    let max_range = max_search_range.unwrap_or(200);
    let search_start = near_line.map(|l| if l > 50 { l - 50 } else { 0 }).unwrap_or(0);
    let search_end = std::cmp::min(
        near_line.map(|l| l + max_range).unwrap_or(lines.len()),
        lines.len()
    );

    let start_lower = start_pattern.to_lowercase();
    let mut block_start: Option<usize> = None;

    // Find start
    for i in search_start..search_end {
        if lines[i].to_lowercase().contains(&start_lower) {
            block_start = Some(i);
            break;
        }
    }

    let start_idx = block_start.ok_or_else(|| format!("Start pattern '{}' not found", start_pattern))?;

    // Find end
    let block_end = if let Some(end_pat) = &end_pattern {
        let end_lower = end_pat.to_lowercase();
        let mut found = None;
        for i in (start_idx + 1)..std::cmp::min(start_idx + max_range, lines.len()) {
            if lines[i].to_lowercase().contains(&end_lower) {
                found = Some(i);
                break;
            }
        }
        found.ok_or_else(|| format!("End pattern '{}' not found after line {}", end_pat, start_idx + 1))?
    } else {
        // Auto-detect block end by brace matching
        find_block_end(&lines, start_idx, '{', '}', max_range)
            .or_else(|| find_block_end(&lines, start_idx, '(', ')', max_range))
            .unwrap_or(start_idx)
    };

    let preview: Vec<String> = lines[start_idx..std::cmp::min(start_idx + 5, block_end + 1)]
        .to_vec();

    let block_type = detect_block_type(&lines, start_idx);

    Ok(BlockBoundary {
        start_line: start_idx + 1,
        end_line: block_end + 1,
        total_lines: block_end - start_idx + 1,
        preview,
        block_type,
    })
}


// ============================================================================
// PHASE 2: MODIFICATION COMMANDS
// ============================================================================

/// Main surgical edit command - supports all strategies
#[tauri::command]
pub async fn surgical_edit(request: EditRequest) -> Result<EditResult, String> {
    println!("🔬 [Surgical] Edit: strategy={}, file={}", request.strategy, request.file_path);
    
    let path = Path::new(&request.file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", request.file_path));
    }

    let bytes_before = fs::metadata(&request.file_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    let lines = read_file_lines(&request.file_path)?;
    let lines_before = lines.len();

    // Create backup if requested
    let backup_path = if request.create_backup && !request.dry_run {
        Some(create_backup(&request.file_path)?)
    } else {
        None
    };

    let (new_lines, changes) = match request.strategy.as_str() {
        "line_replace" => strategy_line_replace(&lines, &request)?,
        "block_replace" => strategy_block_replace(&lines, &request)?,
        "string_replace" => strategy_string_replace(&request)?,
        "insert" => strategy_insert(&lines, &request)?,
        "remove" => strategy_remove(&lines, &request)?,
        other => return Err(format!("Unknown strategy: {}", other)),
    };

    if request.dry_run {
        return Ok(EditResult {
            success: true,
            message: format!("DRY RUN: {} change(s) would be applied", changes.len()),
            file_path: request.file_path,
            lines_before,
            lines_after: new_lines.len(),
            bytes_before,
            bytes_after: new_lines.join("\n").len() as u64,
            backup_path: None,
            changes_applied: changes,
        });
    }

    // Apply the edit
    write_file_lines(&request.file_path, &new_lines)?;

    let bytes_after = fs::metadata(&request.file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    println!("   ✅ Applied {} change(s): {} → {} lines, {} → {} bytes",
        changes.len(), lines_before, new_lines.len(), bytes_before, bytes_after);

    Ok(EditResult {
        success: true,
        message: format!("Applied {} change(s) successfully", changes.len()),
        file_path: request.file_path,
        lines_before,
        lines_after: new_lines.len(),
        bytes_before,
        bytes_after,
        backup_path,
        changes_applied: changes,
    })
}

/// Strategy A: Line-based replacement (find pattern, replace specific lines)
fn strategy_line_replace(lines: &[String], request: &EditRequest) -> Result<(Vec<String>, Vec<ChangeRecord>), String> {
    let mut new_lines = lines.to_vec();
    let mut changes = Vec::new();

    if let Some(pattern) = &request.search_pattern {
        let pattern_lower = pattern.to_lowercase();
        let secondary = request.search_pattern_secondary.as_ref().map(|s| s.to_lowercase());

        for i in 0..new_lines.len() {
            if new_lines[i].to_lowercase().contains(&pattern_lower) {
                // Check secondary pattern if provided
                if let Some(sec) = &secondary {
                    if i + 1 >= new_lines.len() || !new_lines[i + 1].to_lowercase().contains(sec) {
                        continue;
                    }
                }

                // Replace with new content
                let replacement_lines: Vec<String> = request.new_content
                    .split('\n')
                    .map(String::from)
                    .collect();
                
                let old_line = new_lines[i].clone();
                
                // Splice: remove old line, insert new lines
                new_lines.splice(i..=i, replacement_lines.iter().cloned());

                changes.push(ChangeRecord {
                    strategy: "line_replace".into(),
                    start_line: i + 1,
                    end_line: i + 1,
                    lines_removed: 1,
                    lines_added: replacement_lines.len(),
                    description: format!("Replaced line matching '{}': '{}'", pattern, old_line.trim()),
                });

                break; // Only replace first match
            }
        }
    } else if let (Some(start), Some(end)) = (request.start_line, request.end_line) {
        // Direct line number replacement
        let start_idx = start.saturating_sub(1);
        let end_idx = std::cmp::min(end, new_lines.len());
        
        let replacement_lines: Vec<String> = request.new_content
            .split('\n')
            .map(String::from)
            .collect();

        new_lines.splice(start_idx..end_idx, replacement_lines.iter().cloned());

        changes.push(ChangeRecord {
            strategy: "line_replace".into(),
            start_line: start,
            end_line: end,
            lines_removed: end - start_idx,
            lines_added: replacement_lines.len(),
            description: format!("Replaced lines {}-{}", start, end),
        });
    } else {
        return Err("line_replace requires either search_pattern or start_line+end_line".into());
    }

    if changes.is_empty() {
        return Err("No matching line found for replacement".into());
    }

    Ok((new_lines, changes))
}

/// Strategy B: Block replacement (find block boundaries, replace entire block)
fn strategy_block_replace(lines: &[String], request: &EditRequest) -> Result<(Vec<String>, Vec<ChangeRecord>), String> {
    let start_idx;
    let end_idx;

    if let (Some(start), Some(end)) = (request.start_line, request.end_line) {
        start_idx = start.saturating_sub(1);
        end_idx = std::cmp::min(end.saturating_sub(1), lines.len().saturating_sub(1));
    } else if let Some(pattern) = &request.search_pattern {
        let pattern_lower = pattern.to_lowercase();
        
        // Find start
        let found_start = lines.iter()
            .position(|l| l.to_lowercase().contains(&pattern_lower))
            .ok_or_else(|| format!("Start pattern '{}' not found", pattern))?;

        start_idx = found_start;
        
        // Find end
        if let Some(end_pattern) = &request.search_pattern_secondary {
            let end_lower = end_pattern.to_lowercase();
            end_idx = lines[found_start + 1..].iter()
                .position(|l| l.to_lowercase().contains(&end_lower))
                .map(|pos| found_start + 1 + pos)
                .ok_or_else(|| format!("End pattern '{}' not found", end_pattern))?;
        } else {
            // Auto-detect by brace matching
            end_idx = find_block_end(lines, found_start, '{', '}', 500)
                .unwrap_or(found_start);
        }
    } else {
        return Err("block_replace requires search_pattern or start_line+end_line".into());
    }

    let replacement_lines: Vec<String> = request.new_content
        .split('\n')
        .map(String::from)
        .collect();

    let mut new_lines = Vec::new();
    new_lines.extend_from_slice(&lines[..start_idx]);
    new_lines.extend(replacement_lines.iter().cloned());
    if end_idx + 1 < lines.len() {
        new_lines.extend_from_slice(&lines[end_idx + 1..]);
    }

    let changes = vec![ChangeRecord {
        strategy: "block_replace".into(),
        start_line: start_idx + 1,
        end_line: end_idx + 1,
        lines_removed: end_idx - start_idx + 1,
        lines_added: replacement_lines.len(),
        description: format!("Block replaced lines {}-{} ({} → {} lines)",
            start_idx + 1, end_idx + 1, end_idx - start_idx + 1, replacement_lines.len()),
    }];

    Ok((new_lines, changes))
}

/// Strategy C: Raw string replacement
fn strategy_string_replace(request: &EditRequest) -> Result<(Vec<String>, Vec<ChangeRecord>), String> {
    let old_content = request.old_content.as_ref()
        .ok_or("string_replace requires old_content")?;
    
    let content = fs::read_to_string(&request.file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Count occurrences
    let count = content.matches(old_content.as_str()).count();
    if count == 0 {
        return Err(format!("String not found in file. Check exact match including whitespace."));
    }

    let new_content = content.replace(old_content.as_str(), &request.new_content);
    let new_lines: Vec<String> = new_content.split('\n').map(String::from).collect();

    let changes = vec![ChangeRecord {
        strategy: "string_replace".into(),
        start_line: 0,
        end_line: 0,
        lines_removed: 0,
        lines_added: 0,
        description: format!("Replaced {} occurrence(s) of target string ({} chars → {} chars)",
            count, old_content.len(), request.new_content.len()),
    }];

    Ok((new_lines, changes))
}

/// Strategy D: Insert lines at a position
fn strategy_insert(lines: &[String], request: &EditRequest) -> Result<(Vec<String>, Vec<ChangeRecord>), String> {
    let insert_idx;
    let position = request.insert_position.as_deref().unwrap_or("after");

    if let Some(line_num) = request.start_line {
        insert_idx = line_num.saturating_sub(1);
    } else if let Some(pattern) = &request.search_pattern {
        let pattern_lower = pattern.to_lowercase();
        insert_idx = lines.iter()
            .position(|l| l.to_lowercase().contains(&pattern_lower))
            .ok_or_else(|| format!("Pattern '{}' not found for insertion point", pattern))?;
    } else {
        return Err("insert requires search_pattern or start_line".into());
    }

    let new_code_lines: Vec<String> = request.new_content
        .split('\n')
        .map(String::from)
        .collect();

    let mut new_lines = Vec::new();
    let actual_insert = if position == "before" { insert_idx } else { insert_idx + 1 };

    new_lines.extend_from_slice(&lines[..actual_insert]);
    new_lines.extend(new_code_lines.iter().cloned());
    if actual_insert < lines.len() {
        new_lines.extend_from_slice(&lines[actual_insert..]);
    }

    let changes = vec![ChangeRecord {
        strategy: "insert".into(),
        start_line: actual_insert + 1,
        end_line: actual_insert + new_code_lines.len(),
        lines_removed: 0,
        lines_added: new_code_lines.len(),
        description: format!("Inserted {} lines {} line {}", 
            new_code_lines.len(), position, insert_idx + 1),
    }];

    Ok((new_lines, changes))
}

/// Strategy E: Remove lines
fn strategy_remove(lines: &[String], request: &EditRequest) -> Result<(Vec<String>, Vec<ChangeRecord>), String> {
    let start_idx;
    let end_idx;

    if let (Some(start), Some(end)) = (request.start_line, request.end_line) {
        start_idx = start.saturating_sub(1);
        end_idx = std::cmp::min(end, lines.len());
    } else if let Some(pattern) = &request.search_pattern {
        let pattern_lower = pattern.to_lowercase();
        start_idx = lines.iter()
            .position(|l| l.to_lowercase().contains(&pattern_lower))
            .ok_or_else(|| format!("Pattern '{}' not found for removal", pattern))?;
        end_idx = start_idx + 1;
    } else {
        return Err("remove requires search_pattern or start_line+end_line".into());
    }

    let mut new_lines = Vec::new();
    new_lines.extend_from_slice(&lines[..start_idx]);
    if end_idx < lines.len() {
        new_lines.extend_from_slice(&lines[end_idx..]);
    }

    let changes = vec![ChangeRecord {
        strategy: "remove".into(),
        start_line: start_idx + 1,
        end_line: end_idx,
        lines_removed: end_idx - start_idx,
        lines_added: 0,
        description: format!("Removed {} lines ({}-{})", end_idx - start_idx, start_idx + 1, end_idx),
    }];

    Ok((new_lines, changes))
}


// ============================================================================
// PHASE 2: BATCH EDIT (Apply multiple edits in sequence)
// ============================================================================

/// Apply multiple edits to the same file in sequence (bottom-up to preserve line numbers)
#[tauri::command]
pub async fn surgical_edit_batch(request: BatchEditRequest) -> Result<EditResult, String> {
    println!("🔬 [Surgical] Batch edit: {} edits on {}", request.edits.len(), request.file_path);
    
    let path = Path::new(&request.file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", request.file_path));
    }

    let bytes_before = fs::metadata(&request.file_path).map(|m| m.len()).unwrap_or(0);
    let lines_before = read_file_lines(&request.file_path)?.len();

    // Create backup before batch
    let backup_path = if request.create_backup && !request.dry_run {
        Some(create_backup(&request.file_path)?)
    } else {
        None
    };

    let mut all_changes = Vec::new();

    // Apply edits one at a time, re-reading file after each
    for (idx, edit) in request.edits.iter().enumerate() {
        let edit_request = EditRequest {
            file_path: request.file_path.clone(),
            strategy: edit.strategy.clone(),
            search_pattern: edit.search_pattern.clone(),
            search_pattern_secondary: edit.search_pattern_secondary.clone(),
            start_line: edit.start_line,
            end_line: edit.end_line,
            new_content: edit.new_content.clone(),
            old_content: edit.old_content.clone(),
            dry_run: request.dry_run,
            create_backup: false, // Already backed up
            insert_position: edit.insert_position.clone(),
        };

        match surgical_edit(edit_request).await {
            Ok(result) => {
                all_changes.extend(result.changes_applied);
                println!("   ✅ Edit {}/{} applied", idx + 1, request.edits.len());
            }
            Err(e) => {
                println!("   ❌ Edit {}/{} failed: {}", idx + 1, request.edits.len(), e);
                // Rollback if we have a backup
                if let Some(ref bp) = backup_path {
                    let _ = fs::copy(bp, &request.file_path);
                    return Err(format!("Batch edit failed at step {}: {}. File rolled back.", idx + 1, e));
                }
                return Err(format!("Batch edit failed at step {}: {}", idx + 1, e));
            }
        }
    }

    let bytes_after = fs::metadata(&request.file_path).map(|m| m.len()).unwrap_or(0);
    let lines_after = read_file_lines(&request.file_path)?.len();

    Ok(EditResult {
        success: true,
        message: format!("Batch: {} edit(s) applied successfully", all_changes.len()),
        file_path: request.file_path,
        lines_before,
        lines_after,
        bytes_before,
        bytes_after,
        backup_path,
        changes_applied: all_changes,
    })
}


// ============================================================================
// PHASE 3: VERIFICATION COMMANDS
// ============================================================================

/// Verify file after edit - check for duplicates and basic syntax issues
#[tauri::command]
pub async fn surgical_verify(
    file_path: String,
    check_patterns: Option<Vec<String>>,
) -> Result<VerifyResult, String> {
    println!("✅ [Surgical] Verify: {}", file_path);
    
    let path = Path::new(&file_path);
    if !path.exists() {
        return Ok(VerifyResult {
            file_exists: false,
            file_size: 0,
            total_lines: 0,
            duplicates: vec![],
            syntax_issues: vec!["File does not exist".into()],
            changed_lines: vec![],
        });
    }

    let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let lines = read_file_lines(&file_path)?;

    // Check for duplicate declarations
    let mut duplicates = Vec::new();
    let patterns_to_check = check_patterns.unwrap_or_else(|| {
        // Auto-detect common patterns
        let mut patterns = Vec::new();
        for line in &lines {
            let trimmed = line.trim();
            if trimmed.starts_with("const ") || trimmed.starts_with("let ") || trimmed.starts_with("function ") {
                let name: String = trimmed
                    .trim_start_matches("const ")
                    .trim_start_matches("let ")
                    .trim_start_matches("function ")
                    .trim_start_matches("async ")
                    .chars()
                    .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '$')
                    .collect();
                if name.len() > 2 {
                    patterns.push(name);
                }
            }
        }
        patterns.sort();
        patterns.dedup();
        patterns.truncate(50); // Limit checks
        patterns
    });

    for pattern in &patterns_to_check {
        let mut line_numbers = Vec::new();
        let search = format!("const {} ", pattern);
        let search2 = format!("let {} ", pattern);
        let search3 = format!("function {} ", pattern);
        let search4 = format!("function {}(", pattern);
        
        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();
            if trimmed.contains(&search) || trimmed.contains(&search2) 
                || trimmed.contains(&search3) || trimmed.contains(&search4) {
                line_numbers.push(i + 1);
            }
        }

        if line_numbers.len() > 1 {
            duplicates.push(DuplicateInfo {
                pattern: pattern.clone(),
                count: line_numbers.len(),
                line_numbers,
            });
        }
    }

    // Check for basic syntax issues
    let mut syntax_issues = Vec::new();
    let mut brace_depth: i32 = 0;
    let mut paren_depth: i32 = 0;
    let mut bracket_depth: i32 = 0;

    for (i, line) in lines.iter().enumerate() {
        for ch in line.chars() {
            match ch {
                '{' => brace_depth += 1,
                '}' => brace_depth -= 1,
                '(' => paren_depth += 1,
                ')' => paren_depth -= 1,
                '[' => bracket_depth += 1,
                ']' => bracket_depth -= 1,
                _ => {}
            }
        }
        if brace_depth < 0 {
            syntax_issues.push(format!("Unmatched '}}' at line {}", i + 1));
        }
        if paren_depth < 0 {
            syntax_issues.push(format!("Unmatched ')' at line {}", i + 1));
        }
    }

    if brace_depth != 0 {
        syntax_issues.push(format!("Unbalanced braces: depth = {} at end of file", brace_depth));
    }
    if paren_depth != 0 {
        syntax_issues.push(format!("Unbalanced parentheses: depth = {} at end of file", paren_depth));
    }
    if bracket_depth != 0 {
        syntax_issues.push(format!("Unbalanced brackets: depth = {} at end of file", bracket_depth));
    }

    Ok(VerifyResult {
        file_exists: true,
        file_size: metadata.len(),
        total_lines: lines.len(),
        duplicates,
        syntax_issues,
        changed_lines: vec![],
    })
}


// ============================================================================
// PHASE 4: DIFF PREVIEW
// ============================================================================

/// Generate a diff preview without actually modifying the file
#[tauri::command]
pub async fn surgical_diff_preview(request: EditRequest) -> Result<DiffPreview, String> {
    println!("📋 [Surgical] Diff preview: {}", request.file_path);
    
    let lines = read_file_lines(&request.file_path)?;
    let new_lines: Vec<String> = request.new_content.split('\n').map(String::from).collect();

    let (start, end) = if let (Some(s), Some(e)) = (request.start_line, request.end_line) {
        (s.saturating_sub(1), std::cmp::min(e, lines.len()))
    } else if let Some(pattern) = &request.search_pattern {
        let pattern_lower = pattern.to_lowercase();
        let found = lines.iter()
            .position(|l| l.to_lowercase().contains(&pattern_lower))
            .ok_or("Pattern not found")?;
        (found, found + 1)
    } else {
        (0, 0)
    };

    let old_lines: Vec<LineInfo> = lines[start..end].iter().enumerate().map(|(i, l)| {
        LineInfo { line_number: start + i + 1, content: l.clone() }
    }).collect();

    let ctx_start = if start >= 5 { start - 5 } else { 0 };
    let ctx_end = std::cmp::min(end + 5, lines.len());

    let context_before: Vec<LineInfo> = lines[ctx_start..start].iter().enumerate().map(|(i, l)| {
        LineInfo { line_number: ctx_start + i + 1, content: l.clone() }
    }).collect();

    let context_after: Vec<LineInfo> = if end < ctx_end {
        lines[end..ctx_end].iter().enumerate().map(|(i, l)| {
            LineInfo { line_number: end + i + 1, content: l.clone() }
        }).collect()
    } else {
        vec![]
    };

    Ok(DiffPreview {
        file_path: request.file_path,
        strategy: request.strategy,
        old_lines,
        new_lines,
        start_line: start + 1,
        end_line: end,
        context_before,
        context_after,
    })
}


// ============================================================================
// PHASE 5: ROLLBACK
// ============================================================================

/// Rollback to a backup file
#[tauri::command]
pub async fn surgical_rollback(
    file_path: String,
    backup_path: String,
) -> Result<EditResult, String> {
    println!("⏪ [Surgical] Rollback: {} → {}", backup_path, file_path);
    
    if !Path::new(&backup_path).exists() {
        return Err(format!("Backup file not found: {}", backup_path));
    }

    let bytes_before = fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
    let lines_before = read_file_lines(&file_path).map(|l| l.len()).unwrap_or(0);

    fs::copy(&backup_path, &file_path)
        .map_err(|e| format!("Rollback failed: {}", e))?;

    let bytes_after = fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
    let lines_after = read_file_lines(&file_path).map(|l| l.len()).unwrap_or(0);

    Ok(EditResult {
        success: true,
        message: format!("Rolled back to backup: {}", backup_path),
        file_path,
        lines_before,
        lines_after,
        bytes_before,
        bytes_after,
        backup_path: Some(backup_path),
        changes_applied: vec![ChangeRecord {
            strategy: "rollback".into(),
            start_line: 0,
            end_line: 0,
            lines_removed: 0,
            lines_added: 0,
            description: "Full file rollback from backup".into(),
        }],
    })
}

/// List available backups for a file
#[tauri::command]
pub async fn surgical_list_backups(file_name: String) -> Result<Vec<HashMap<String, String>>, String> {
    let backup_dir = get_backup_dir();
    
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&file_name) && name.ends_with(".bak") {
                let metadata = fs::metadata(entry.path()).ok();
                let mut info = HashMap::new();
                info.insert("path".into(), entry.path().to_string_lossy().to_string());
                info.insert("name".into(), name);
                info.insert("size".into(), metadata.as_ref().map(|m| m.len().to_string()).unwrap_or_default());
                backups.push(info);
            }
        }
    }

    backups.sort_by(|a, b| b.get("name").cmp(&a.get("name"))); // Newest first
    Ok(backups)
}
