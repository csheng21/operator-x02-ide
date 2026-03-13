// src-tauri/src/ide_script_commands.rs
// ============================================================================
// 🧠 IDE SCRIPT COMMANDS — High-Level AI-Invokable Scripts
// ============================================================================
//
// COMPOSITE commands: search → validate → backup → edit → verify in ONE call.
// AI calls ONE command; the IDE handles all safety logic internally.
//
// Commands:
//   ide_analyse       → File structure (imports, functions, classes, TODOs)
//   ide_review        → Code quality (unused vars, empty catch, security)
//   ide_search        → Pattern search with ±3 lines context
//   ide_patch         → Find → backup → replace → verify (atomic)
//   ide_patch_batch   → Multi-file atomic patching with rollback
//   ide_insert        → Insert code after/before anchor line
//   ide_rollback      → Restore from backup
//   ide_script_status → Mode + backup stats
//
// Toggle: localStorage("ideScriptMode") = "surgical" | "classic" | "auto"
// ============================================================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Serialize, Clone)]
pub struct IdeAnalyseResult {
    pub file_path: String,
    pub total_lines: usize,
    pub file_size_bytes: u64,
    pub language: String,
    pub imports: Vec<IdeImportInfo>,
    pub exports: Vec<String>,
    pub functions: Vec<IdeFunctionInfo>,
    pub classes: Vec<IdeClassInfo>,
    pub todos: Vec<IdeTodoInfo>,
    pub complexity: String,
    pub summary: String,
}

#[derive(Serialize, Clone)]
pub struct IdeImportInfo {
    pub line: usize,
    pub module: String,
    pub items: Vec<String>,
}

#[derive(Serialize, Clone)]
pub struct IdeFunctionInfo {
    pub name: String,
    pub line_start: usize,
    pub line_end: usize,
    pub params: String,
    pub is_async: bool,
    pub is_exported: bool,
}

#[derive(Serialize, Clone)]
pub struct IdeClassInfo {
    pub name: String,
    pub line_start: usize,
    pub line_end: usize,
    pub methods: Vec<String>,
    pub is_exported: bool,
}

#[derive(Serialize, Clone)]
pub struct IdeTodoInfo {
    pub line: usize,
    pub text: String,
    pub tag: String,
}

#[derive(Serialize, Clone)]
pub struct IdeReviewResult {
    pub file_path: String,
    pub issues: Vec<IdeReviewIssue>,
    pub total_issues: usize,
    pub summary: String,
}

#[derive(Serialize, Clone)]
pub struct IdeReviewIssue {
    pub line: usize,
    pub severity: String,
    pub category: String,
    pub message: String,
    pub snippet: String,
    pub suggestion: String,
}

#[derive(Serialize, Clone)]
pub struct IdeSearchResult {
    pub pattern: String,
    pub scope: String,
    pub total_matches: usize,
    pub matches: Vec<IdeSearchMatch>,
}

#[derive(Serialize, Clone)]
pub struct IdeSearchMatch {
    pub file_path: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[derive(Serialize, Clone)]
pub struct IdePatchResult {
    pub success: bool,
    pub file_path: String,
    pub backup_id: String,
    pub line_start: usize,
    pub line_end: usize,
    pub lines_removed: usize,
    pub lines_added: usize,
    pub diff: String,
    pub description: String,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct IdePatchBatchResult {
    pub success: bool,
    pub total: usize,
    pub applied: usize,
    pub failed: usize,
    pub results: Vec<IdePatchResult>,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct IdeInsertResult {
    pub success: bool,
    pub file_path: String,
    pub backup_id: String,
    pub inserted_at: usize,
    pub lines_inserted: usize,
    pub diff: String,
    pub description: String,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct IdeRollbackResult {
    pub success: bool,
    pub file_path: String,
    pub backup_id: String,
    pub lines_restored: usize,
    pub error: Option<String>,
}

// ============================================================================
// HELPERS
// ============================================================================

fn detect_language(file_path: &str) -> String {
    let ext = Path::new(file_path).extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext {
        "ts" | "tsx" => "typescript", "js" | "jsx" => "javascript",
        "rs" => "rust", "py" => "python", "java" => "java",
        "kt" | "kts" => "kotlin", "cs" => "csharp",
        "cpp" | "cc" | "cxx" | "h" | "hpp" => "cpp", "c" => "c",
        "go" => "go", "rb" => "ruby", "php" => "php",
        "swift" => "swift", "dart" => "dart",
        "css" | "scss" | "less" => "css", "html" | "htm" => "html",
        "json" => "json", "yaml" | "yml" => "yaml", "toml" => "toml",
        "xml" => "xml", "sql" => "sql", "sh" | "bash" => "shell",
        "ps1" => "powershell", "md" => "markdown",
        _ => ext,
    }.to_string()
}

fn generate_backup_id() -> String {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    format!("ids_{}", ts)
}

fn get_script_backup_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = home.join("OperatorX02").join("backups").join("ide_scripts");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn create_backup(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    if !path.exists() { return Err(format!("File not found: {}", file_path)); }

    let backup_id = generate_backup_id();
    let backup_dir = get_script_backup_dir();
    let file_stem = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown");
    let backup_file = backup_dir.join(format!("{}_{}.bak", backup_id, file_stem));

    fs::copy(file_path, &backup_file).map_err(|e| format!("Backup failed: {}", e))?;

    // Metadata JSON for rollback
    let meta = serde_json::json!({
        "backup_id": backup_id,
        "original_path": file_path,
        "backup_file": backup_file.to_string_lossy(),
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs(),
    });
    let meta_path = backup_dir.join(format!("{}.meta.json", backup_id));
    let _ = fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap_or_default());

    println!("✅ [IDE Script] Backup: {} → {}", file_path, backup_file.display());
    Ok(backup_id)
}

fn find_backup_file(backup_id: &str) -> Result<(PathBuf, String), String> {
    let meta_path = get_script_backup_dir().join(format!("{}.meta.json", backup_id));
    if !meta_path.exists() { return Err(format!("Backup not found: {}", backup_id)); }

    let meta: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(&meta_path).map_err(|e| format!("Read meta failed: {}", e))?
    ).map_err(|e| format!("Parse meta failed: {}", e))?;

    let bp = PathBuf::from(meta["backup_file"].as_str().ok_or("Missing backup_file")?);
    let orig = meta["original_path"].as_str().ok_or("Missing original_path")?.to_string();
    if !bp.exists() { return Err(format!("Backup file missing on disk: {}", bp.display())); }
    Ok((bp, orig))
}

fn restore_from_backup(file_path: &str, backup_id: &str) -> Result<usize, String> {
    let (bp, _) = find_backup_file(backup_id)?;
    let content = fs::read_to_string(&bp).map_err(|e| format!("Backup read: {}", e))?;
    let count = content.lines().count();
    fs::write(file_path, &content).map_err(|e| format!("Restore write: {}", e))?;
    println!("↩️ [IDE Script] Restored {} from {}", file_path, backup_id);
    Ok(count)
}

/// Simple unified diff for display
fn make_diff(old: &str, new: &str, path: &str) -> String {
    let ol: Vec<&str> = old.lines().collect();
    let nl: Vec<&str> = new.lines().collect();
    let mut d = format!("--- a/{}\n+++ b/{}\n", path, path);
    let max = ol.len().max(nl.len());
    let mut has_changes = false;

    let mut i = 0;
    while i < max {
        let a = ol.get(i).copied().unwrap_or("");
        let b = nl.get(i).copied().unwrap_or("");
        if a != b || i >= ol.len() || i >= nl.len() {
            has_changes = true;
            // 2 lines context before
            for j in i.saturating_sub(2)..i {
                if let Some(l) = ol.get(j) { d.push_str(&format!(" {}\n", l)); }
            }
            // Changed lines
            while i < max {
                let a2 = ol.get(i).copied().unwrap_or("");
                let b2 = nl.get(i).copied().unwrap_or("");
                if a2 == b2 && i < ol.len() && i < nl.len() {
                    let mut eq = 0;
                    for k in i..max.min(i + 3) {
                        if ol.get(k) == nl.get(k) && k < ol.len() && k < nl.len() { eq += 1; } else { break; }
                    }
                    if eq >= 3 { break; }
                }
                if i < ol.len() && (i >= nl.len() || a2 != b2) { d.push_str(&format!("-{}\n", a2)); }
                if i < nl.len() && (i >= ol.len() || a2 != b2) { d.push_str(&format!("+{}\n", b2)); }
                i += 1;
            }
            // 2 lines context after
            for j in i..max.min(i + 2) {
                if let Some(l) = ol.get(j) { d.push_str(&format!(" {}\n", l)); }
            }
        }
        i += 1;
    }
    if !has_changes { return "No changes detected.".to_string(); }
    d
}

/// Find matching closing brace from a starting line
fn find_brace_end(lines: &[&str], start: usize) -> usize {
    let mut depth = 0i32;
    let mut found = false;
    for i in start..lines.len().min(start + 500) {
        for ch in lines[i].chars() {
            if ch == '{' { depth += 1; found = true; }
            else if ch == '}' { depth -= 1; if found && depth == 0 { return i; } }
        }
    }
    lines.len().min(start + 20) - 1
}

// ============================================================================
// COMMAND: ide_analyse
// ============================================================================

#[tauri::command]
pub async fn ide_analyse(file_path: String) -> Result<IdeAnalyseResult, String> {
    println!("🧠 [IDE Script] Analysing: {}", file_path);

    let path = Path::new(&file_path);
    if !path.exists() { return Err(format!("File not found: {}", file_path)); }

    let content = fs::read_to_string(&file_path).map_err(|e| format!("Read: {}", e))?;
    let meta = fs::metadata(&file_path).map_err(|e| format!("Metadata: {}", e))?;
    let lines: Vec<&str> = content.lines().collect();
    let lang = detect_language(&file_path);

    let imports = parse_imports(&lines, &lang);
    let exports = parse_exports(&lines, &lang);
    let functions = parse_functions(&lines, &lang);
    let classes = parse_classes(&lines, &lang);
    let todos = parse_todos(&lines);

    let complexity = if lines.len() > 5000 || functions.len() > 80 { "high" }
        else if lines.len() > 1000 || functions.len() > 30 { "medium" }
        else { "low" };

    let summary = format!(
        "{} | {} lines | {} imports | {} functions | {} classes | {} TODOs | complexity: {}",
        lang, lines.len(), imports.len(), functions.len(), classes.len(), todos.len(), complexity
    );
    println!("✅ [IDE Script] {}", summary);

    Ok(IdeAnalyseResult {
        file_path, total_lines: lines.len(), file_size_bytes: meta.len(),
        language: lang, imports, exports, functions, classes, todos,
        complexity: complexity.to_string(), summary,
    })
}

// ── Parsers ──

fn parse_imports(lines: &[&str], lang: &str) -> Vec<IdeImportInfo> {
    let mut out = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();
        let hit = match lang {
            "typescript" | "javascript" => t.starts_with("import "),
            "rust" => t.starts_with("use ") || t.starts_with("mod "),
            "python" => t.starts_with("import ") || t.starts_with("from "),
            "java" | "kotlin" => t.starts_with("import "),
            "csharp" => t.starts_with("using "),
            "cpp" | "c" => t.starts_with("#include"),
            _ => false,
        };
        if !hit { continue; }

        let module = match lang {
            "typescript" | "javascript" => {
                if let Some(idx) = t.find("from ") {
                    t[idx+5..].trim().trim_matches(|c| c=='\'' || c=='"' || c==';').to_string()
                } else { t.trim_start_matches("import ").trim_matches(|c| c=='\'' || c=='"' || c==';').to_string() }
            }
            "rust" => t.trim_start_matches("use ").trim_start_matches("mod ").trim_end_matches(';').to_string(),
            "python" => {
                if t.starts_with("from ") { t.splitn(4,' ').nth(1).unwrap_or("").to_string() }
                else { t.trim_start_matches("import ").split(',').next().unwrap_or("").trim().to_string() }
            }
            "cpp" | "c" => t.trim_start_matches("#include").trim().trim_matches(|c| c=='<' || c=='>' || c=='"').to_string(),
            "csharp" => t.trim_start_matches("using ").trim_end_matches(';').trim().to_string(),
            _ => t.to_string(),
        };

        let items = if let (Some(s), Some(e)) = (t.find('{'), t.find('}')) {
            t[s+1..e].split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
        } else { Vec::new() };

        out.push(IdeImportInfo { line: i+1, module, items });
    }
    out
}

fn parse_exports(lines: &[&str], lang: &str) -> Vec<String> {
    let mut out = Vec::new();
    for line in lines.iter() {
        let t = line.trim();
        let name = match lang {
            "typescript" | "javascript" if t.starts_with("export ") => {
                let c = t.replace("export ", "").replace("default ", "")
                    .replace("async ", "");
                let c = c.trim_start_matches("const ").trim_start_matches("let ")
                    .trim_start_matches("function ").trim_start_matches("class ")
                    .trim_start_matches("interface ").trim_start_matches("type ")
                    .trim_start_matches("enum ");
                c.split(|ch: char| !ch.is_alphanumeric() && ch != '_').next()
                    .filter(|n| !n.is_empty()).map(|n| n.to_string())
            }
            "rust" if t.starts_with("pub ") => {
                let c = t.replace("pub ", "").replace("async ", "");
                let c = c.trim_start_matches("fn ").trim_start_matches("struct ")
                    .trim_start_matches("enum ").trim_start_matches("trait ")
                    .trim_start_matches("mod ").trim_start_matches("const ")
                    .trim_start_matches("type ");
                c.split(|ch: char| !ch.is_alphanumeric() && ch != '_').next()
                    .filter(|n| n.len() > 1).map(|n| n.to_string())
            }
            _ => None,
        };
        if let Some(n) = name { out.push(n); }
    }
    out
}

fn parse_functions(lines: &[&str], lang: &str) -> Vec<IdeFunctionInfo> {
    let mut out = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();
        let is_exported = t.starts_with("export ") || t.starts_with("pub ");
        let is_async = t.contains("async ");

        let name: Option<String> = match lang {
            "typescript" | "javascript" => {
                if let Some(idx) = t.find("function ") {
                    t[idx+9..].split(|c: char| !c.is_alphanumeric() && c != '_').next()
                        .filter(|n| !n.is_empty()).map(|n| n.to_string())
                } else if (t.contains("const ") || t.contains("let "))
                    && (t.contains("= (") || t.contains("= async (") || t.contains("=>"))
                {
                    let a = t.trim_start_matches("export ").trim_start_matches("const ")
                        .trim_start_matches("let ");
                    a.split(|c: char| !c.is_alphanumeric() && c != '_').next()
                        .filter(|n| !n.is_empty()).map(|n| n.to_string())
                } else { None }
            }
            "rust" => {
                if t.contains("fn ") && !t.trim_start().starts_with("//") {
                    t.split("fn ").last()
                        .and_then(|a| a.split(|c: char| !c.is_alphanumeric() && c != '_').next())
                        .filter(|n| !n.is_empty()).map(|n| n.to_string())
                } else { None }
            }
            "python" => {
                if t.contains("def ") {
                    t.split("def ").last().and_then(|a| a.split('(').next())
                        .map(|n| n.trim().to_string()).filter(|n| !n.is_empty())
                } else { None }
            }
            _ => None,
        };

        if let Some(name) = name {
            let params = if let (Some(s), Some(e)) = (t.find('('), t.find(')')) {
                t[s+1..e].trim().to_string()
            } else { String::new() };

            let end = find_brace_end(lines, i);
            out.push(IdeFunctionInfo {
                name, line_start: i+1, line_end: end+1, params, is_async, is_exported,
            });
        }
    }
    out
}

fn parse_classes(lines: &[&str], lang: &str) -> Vec<IdeClassInfo> {
    let mut out = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();
        let (name, is_exported): (Option<String>, bool) = match lang {
            "typescript" | "javascript" if t.contains("class ") && !t.starts_with("//") => {
                let is_exp = t.starts_with("export ");
                let n = t.split("class ").last().and_then(|a|
                    a.split(|c: char| !c.is_alphanumeric() && c != '_').next())
                    .filter(|n| !n.is_empty()).map(|n| n.to_string());
                (n, is_exp)
            }
            "rust" if (t.contains("struct ") || t.contains("enum ")) && t.contains('{') => {
                let is_exp = t.starts_with("pub ");
                let kw = if t.contains("struct ") { "struct " } else { "enum " };
                let n = t.split(kw).last().and_then(|a|
                    a.split(|c: char| !c.is_alphanumeric() && c != '_').next())
                    .filter(|n| !n.is_empty()).map(|n| n.to_string());
                (n, is_exp)
            }
            "python" if t.starts_with("class ") => {
                let n = t.trim_start_matches("class ").split(|c: char| !c.is_alphanumeric() && c != '_')
                    .next().filter(|n| !n.is_empty()).map(|n| n.to_string());
                (n, false)
            }
            _ => (None, false),
        };
        if let Some(name) = name {
            let end = find_brace_end(lines, i);
            // Collect method names
            let mut methods = Vec::new();
            for j in (i+1)..end {
                if let Some(l) = lines.get(j) {
                    let lt = l.trim();
                    if lt.starts_with("//") || lt.starts_with("/*") || lt.starts_with("*") { continue; }
                    let mname = match lang {
                        "typescript" | "javascript" if lt.contains('(') => {
                            let c = lt.trim_start_matches("async ").trim_start_matches("static ")
                                .trim_start_matches("private ").trim_start_matches("public ")
                                .trim_start_matches("protected ").trim_start_matches("get ")
                                .trim_start_matches("set ");
                            c.split('(').next().map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty() && !s.contains(' ')
                                    && !["if","for","while","switch","return","const","let"].contains(&s.as_str()))
                        }
                        "rust" if lt.contains("fn ") => {
                            lt.split("fn ").last().and_then(|a| a.split('(').next())
                                .map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
                        }
                        "python" if lt.contains("def ") => {
                            lt.split("def ").last().and_then(|a| a.split('(').next())
                                .map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
                        }
                        _ => None,
                    };
                    if let Some(m) = mname { methods.push(m); }
                }
            }
            out.push(IdeClassInfo { name, line_start: i+1, line_end: end+1, methods, is_exported });
        }
    }
    out
}

fn parse_todos(lines: &[&str]) -> Vec<IdeTodoInfo> {
    let tags = ["TODO", "FIXME", "HACK", "NOTE", "BUG", "XXX"];
    let mut out = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        for tag in &tags {
            if line.contains(tag) {
                out.push(IdeTodoInfo { line: i+1, text: line.trim().to_string(), tag: tag.to_string() });
                break;
            }
        }
    }
    out
}

// ============================================================================
// COMMAND: ide_review
// ============================================================================

#[tauri::command]
pub async fn ide_review(file_path: String, focus: Option<String>) -> Result<IdeReviewResult, String> {
    println!("🔍 [IDE Script] Reviewing: {}", file_path);
    let content = fs::read_to_string(&file_path).map_err(|e| format!("Read: {}", e))?;
    let lines: Vec<&str> = content.lines().collect();
    let lang = detect_language(&file_path);
    let mut issues = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();

        // Debug logging left in code
        if (lang == "typescript" || lang == "javascript") && t.starts_with("console.log(") && !t.contains("// keep") {
            issues.push(IdeReviewIssue { line: i+1, severity: "info".into(), category: "debug".into(),
                message: "Debug console.log left in code".into(), snippet: t.into(),
                suggestion: "Remove or use proper logger".into() });
        }
        if lang == "rust" && t.starts_with("println!(") && !t.contains("// keep") {
            issues.push(IdeReviewIssue { line: i+1, severity: "info".into(), category: "debug".into(),
                message: "Debug println! in code".into(), snippet: t.into(),
                suggestion: "Use log::info!() or tracing".into() });
        }

        // Empty catch blocks
        if (t == "catch {" || t.starts_with("catch (") || t.starts_with("} catch")) {
            if let Some(next) = lines.get(i+1) {
                if next.trim() == "}" || next.trim().is_empty() {
                    issues.push(IdeReviewIssue { line: i+1, severity: "warning".into(),
                        category: "error_handling".into(), message: "Empty catch block".into(),
                        snippet: t.into(), suggestion: "Add error logging or re-throw".into() });
                }
            }
        }

        // Very long lines
        if line.len() > 200 && !t.starts_with("//") && !t.starts_with("*") && !t.starts_with("/*") {
            issues.push(IdeReviewIssue { line: i+1, severity: "info".into(), category: "style".into(),
                message: format!("Line {} chars long", line.len()), snippet: format!("{}...", &line[..80.min(line.len())]),
                suggestion: "Break into multiple lines".into() });
        }

        // Deep nesting (6+ levels = 24+ spaces)
        if line.len() > line.trim_start().len() + 24
            && (t.starts_with("if ") || t.starts_with("for ") || t.starts_with("while ")) {
            issues.push(IdeReviewIssue { line: i+1, severity: "warning".into(), category: "complexity".into(),
                message: "Deeply nested code (6+ levels)".into(),
                snippet: t.chars().take(60).collect(), suggestion: "Extract helper function".into() });
        }

        // TypeScript 'any' type
        if lang == "typescript" && (t.contains(": any") || t.contains("as any")) && !t.starts_with("//") {
            issues.push(IdeReviewIssue { line: i+1, severity: "info".into(), category: "type_safety".into(),
                message: "Usage of 'any' type".into(), snippet: t.chars().take(80).collect(),
                suggestion: "Use specific type or 'unknown'".into() });
        }

        // Hardcoded secrets
        let tl = t.to_lowercase();
        if (tl.contains("api_key") || tl.contains("apikey") || tl.contains("secret"))
            && tl.contains("=") && (tl.contains("\"sk-") || tl.contains("'sk-")) {
            issues.push(IdeReviewIssue { line: i+1, severity: "error".into(), category: "security".into(),
                message: "Possible hardcoded API key".into(), snippet: "***REDACTED***".into(),
                suggestion: "Move to env variable or config".into() });
        }
    }

    // Unused variables (TS/JS only, rough)
    if lang == "typescript" || lang == "javascript" {
        for (i, line) in lines.iter().enumerate() {
            let t = line.trim();
            if (t.starts_with("const ") || t.starts_with("let ")) && t.contains(" = ") {
                let var = t.trim_start_matches("const ").trim_start_matches("let ")
                    .split(|c: char| !c.is_alphanumeric() && c != '_').next().unwrap_or("");
                if var.len() > 1 && var != "__" {
                    let used = lines.iter().enumerate()
                        .filter(|(j, l)| *j != i && l.contains(var)).count();
                    if used == 0 {
                        issues.push(IdeReviewIssue { line: i+1, severity: "warning".into(),
                            category: "unused".into(), message: format!("'{}' appears unused", var),
                            snippet: t.chars().take(80).collect(),
                            suggestion: format!("Remove or prefix with _") });
                    }
                }
            }
        }
    }

    let total = issues.len();
    let errs = issues.iter().filter(|i| i.severity == "error").count();
    let warns = issues.iter().filter(|i| i.severity == "warning").count();
    let summary = format!("{} issues ({} errors, {} warnings, {} info)", total, errs, warns, total-errs-warns);
    println!("✅ [IDE Script] Review: {}", summary);

    Ok(IdeReviewResult { file_path, issues, total_issues: total, summary })
}

// ============================================================================
// COMMAND: ide_search
// ============================================================================

#[tauri::command]
pub async fn ide_search(
    project_path: String, pattern: String,
    file_filter: Option<String>, max_results: Option<usize>,
) -> Result<IdeSearchResult, String> {
    println!("🔎 [IDE Script] Search '{}' in {}", pattern, project_path);
    let max = max_results.unwrap_or(30);
    let ext_filter = file_filter.unwrap_or_default();
    let mut matches = Vec::new();

    fn walk(dir: &Path, pat: &str, ext: &str, out: &mut Vec<IdeSearchMatch>, max: usize, depth: usize) {
        if depth > 12 || out.len() >= max { return; }
        let entries = match fs::read_dir(dir) { Ok(e) => e, Err(_) => return };
        for entry in entries.filter_map(|e| e.ok()) {
            if out.len() >= max { return; }
            let p = entry.path();
            let n = entry.file_name().to_string_lossy().to_string();
            if n.starts_with('.') || ["node_modules","target","dist","build",".git",".svn"].contains(&n.as_str()) { continue; }
            if p.is_dir() { walk(&p, pat, ext, out, max, depth+1); continue; }
            if !ext.is_empty() {
                let fe = p.extension().and_then(|e| e.to_str()).unwrap_or("");
                if fe != ext.trim_start_matches("*.") { continue; }
            }
            if let Ok(content) = fs::read_to_string(&p) {
                let lines: Vec<&str> = content.lines().collect();
                let pat_lower = pat.to_lowercase();
                for (i, line) in lines.iter().enumerate() {
                    if out.len() >= max { return; }
                    if let Some(col) = line.to_lowercase().find(&pat_lower) {
                        let before: Vec<String> = (i.saturating_sub(3)..i)
                            .filter_map(|j| lines.get(j).map(|l| format!("{}: {}", j+1, l))).collect();
                        let after: Vec<String> = ((i+1)..lines.len().min(i+4))
                            .filter_map(|j| lines.get(j).map(|l| format!("{}: {}", j+1, l))).collect();
                        out.push(IdeSearchMatch {
                            file_path: p.to_string_lossy().to_string(),
                            line: i+1, column: col+1, content: line.to_string(),
                            context_before: before, context_after: after,
                        });
                    }
                }
            }
        }
    }

    let base = Path::new(&project_path);
    if !base.exists() { return Err(format!("Path not found: {}", project_path)); }
    walk(base, &pattern, &ext_filter, &mut matches, max, 0);

    println!("✅ [IDE Script] {} matches found", matches.len());
    Ok(IdeSearchResult { pattern, scope: project_path, total_matches: matches.len(), matches })
}

// ============================================================================
// COMMAND: ide_patch
// ============================================================================

#[tauri::command]
pub async fn ide_patch(
    file_path: String, find: String, replace: String,
    description: String, occurrence: Option<u32>,
) -> Result<IdePatchResult, String> {
    println!("🩹 [IDE Script] Patch: {} — {}", file_path, &description[..description.len().min(60)]);
    let path = Path::new(&file_path);
    if !path.exists() { return Err(format!("File not found: {}", file_path)); }

    let content = fs::read_to_string(&file_path).map_err(|e| format!("Read: {}", e))?;

    // Step 1: Find target occurrence
    let occ = occurrence.unwrap_or(1) as usize;
    let mut found_count = 0usize;
    let mut find_start: Option<usize> = None;
    let mut pos = 0;
    while let Some(idx) = content[pos..].find(&find) {
        found_count += 1;
        if found_count == occ { find_start = Some(pos + idx); break; }
        pos += idx + 1;
    }

    if find_start.is_none() {
        let total = content.matches(&find).count();
        return Ok(IdePatchResult { success: false, file_path, backup_id: String::new(),
            line_start: 0, line_end: 0, lines_removed: 0, lines_added: 0, diff: String::new(),
            description, error: Some(format!(
                "Pattern not found (occurrence #{}, total in file: {}). Check whitespace.",
                occ, total )) });
    }
    let si = find_start.unwrap();
    let line_start = content[..si].lines().count();
    let line_end = line_start + find.lines().count() - 1;

    // Step 2: Backup
    let backup_id = create_backup(&file_path)?;

    // Step 3: Apply
    let new_content = format!("{}{}{}", &content[..si], replace, &content[si + find.len()..]);
    fs::write(&file_path, &new_content).map_err(|e| format!("Write: {}", e))?;

    // Step 4: Verify
    let verify = fs::read_to_string(&file_path).map_err(|e| format!("Verify: {}", e))?;
    if !verify.contains(&replace) {
        let _ = restore_from_backup(&file_path, &backup_id);
        return Ok(IdePatchResult { success: false, file_path, backup_id, line_start, line_end,
            lines_removed: 0, lines_added: 0, diff: String::new(), description,
            error: Some("Verify failed — replacement not found. Rolled back.".into()) });
    }

    // Step 5: Diff
    let diff = make_diff(&content, &new_content, &file_path);
    let lr = find.lines().count();
    let la = replace.lines().count();
    println!("✅ [IDE Script] Patched: -{} +{} lines (backup: {})", lr, la, backup_id);

    Ok(IdePatchResult { success: true, file_path, backup_id, line_start, line_end,
        lines_removed: lr, lines_added: la, diff, description, error: None })
}

// ============================================================================
// COMMAND: ide_patch_batch
// ============================================================================

#[tauri::command]
pub async fn ide_patch_batch(
    patches: Vec<serde_json::Value>, atomic: Option<bool>,
) -> Result<IdePatchBatchResult, String> {
    let is_atomic = atomic.unwrap_or(true);
    let total = patches.len();
    println!("🩹 [IDE Script] Batch: {} patches (atomic: {})", total, is_atomic);

    let mut results = Vec::new();
    let mut applied = 0usize;
    let mut failed = 0usize;

    for pv in &patches {
        let fp = pv["file_path"].as_str().unwrap_or("").to_string();
        let f = pv["find"].as_str().unwrap_or("").to_string();
        let r = pv["replace"].as_str().unwrap_or("").to_string();
        let d = pv["description"].as_str().unwrap_or("batch").to_string();
        let o = pv["occurrence"].as_u64().map(|v| v as u32);

        match ide_patch(fp, f, r, d, o).await {
            Ok(res) => {
                if res.success { applied += 1; } else { failed += 1; }
                results.push(res);
            }
            Err(e) => {
                failed += 1;
                results.push(IdePatchResult { success: false,
                    file_path: pv["file_path"].as_str().unwrap_or("?").to_string(),
                    backup_id: String::new(), line_start: 0, line_end: 0,
                    lines_removed: 0, lines_added: 0, diff: String::new(),
                    description: "batch".into(), error: Some(e) });
            }
        }

        // Atomic: rollback all if any fails
        if is_atomic && failed > 0 {
            println!("⚠️ [IDE Script] Atomic batch failed — rolling back {}", applied);
            for prev in &results {
                if prev.success && !prev.backup_id.is_empty() {
                    let _ = restore_from_backup(&prev.file_path, &prev.backup_id);
                }
            }
            return Ok(IdePatchBatchResult { success: false, total, applied: 0, failed,
                results, error: Some("Atomic batch failed — all rolled back".into()) });
        }
    }

    println!("✅ [IDE Script] Batch done: {}/{}", applied, total);
    Ok(IdePatchBatchResult { success: failed == 0, total, applied, failed, results, error: None })
}

// ============================================================================
// COMMAND: ide_insert
// ============================================================================

#[tauri::command]
pub async fn ide_insert(
    file_path: String, anchor: String, content: String,
    position: Option<String>, description: String,
) -> Result<IdeInsertResult, String> {
    let pos = position.unwrap_or_else(|| "after".to_string());
    println!("📥 [IDE Script] Insert {} anchor in {}", pos, file_path);

    let file_content = fs::read_to_string(&file_path).map_err(|e| format!("Read: {}", e))?;
    let lines: Vec<&str> = file_content.lines().collect();

    let anchor_idx = lines.iter().position(|l| l.contains(&anchor))
        .ok_or_else(|| format!("Anchor not found: '{}'", &anchor[..anchor.len().min(60)]))?;

    let backup_id = create_backup(&file_path)?;

    let insert_lines: Vec<&str> = content.lines().collect();
    let mut new_lines: Vec<String> = Vec::with_capacity(lines.len() + insert_lines.len());

    let insert_at;
    if pos == "before" {
        for (i, line) in lines.iter().enumerate() {
            if i == anchor_idx { for il in &insert_lines { new_lines.push(il.to_string()); } }
            new_lines.push(line.to_string());
        }
        insert_at = anchor_idx + 1;
    } else {
        for (i, line) in lines.iter().enumerate() {
            new_lines.push(line.to_string());
            if i == anchor_idx { for il in &insert_lines { new_lines.push(il.to_string()); } }
        }
        insert_at = anchor_idx + 2;
    }

    let new_content = new_lines.join("\n");
    fs::write(&file_path, &new_content).map_err(|e| format!("Write: {}", e))?;

    // Verify
    let verify = fs::read_to_string(&file_path).map_err(|e| format!("Verify: {}", e))?;
    if !verify.contains(insert_lines.first().unwrap_or(&"")) {
        let _ = restore_from_backup(&file_path, &backup_id);
        return Ok(IdeInsertResult { success: false, file_path, backup_id, inserted_at: 0,
            lines_inserted: 0, diff: String::new(), description,
            error: Some("Verify failed — rolled back".into()) });
    }

    let diff = make_diff(&file_content, &new_content, &file_path);
    println!("✅ [IDE Script] Inserted {} lines at {}", insert_lines.len(), insert_at);

    Ok(IdeInsertResult { success: true, file_path, backup_id, inserted_at: insert_at,
        lines_inserted: insert_lines.len(), diff, description, error: None })
}

// ============================================================================
// COMMAND: ide_rollback
// ============================================================================

#[tauri::command]
pub async fn ide_rollback(backup_id: String) -> Result<IdeRollbackResult, String> {
    println!("↩️ [IDE Script] Rollback: {}", backup_id);
    let (bp, orig) = find_backup_file(&backup_id)?;
    let content = fs::read_to_string(&bp).map_err(|e| format!("Read: {}", e))?;
    let count = content.lines().count();
    fs::write(&orig, &content).map_err(|e| format!("Write: {}", e))?;

    let verify = fs::read_to_string(&orig).map_err(|e| format!("Verify: {}", e))?;
    if verify.lines().count() != count {
        return Ok(IdeRollbackResult { success: false, file_path: orig, backup_id,
            lines_restored: 0, error: Some("Line count mismatch after restore".into()) });
    }

    println!("✅ [IDE Script] Restored {} ({} lines)", orig, count);
    Ok(IdeRollbackResult { success: true, file_path: orig, backup_id, lines_restored: count, error: None })
}

// ============================================================================
// COMMAND: ide_script_status
// ============================================================================

#[tauri::command]
pub async fn ide_script_status() -> Result<serde_json::Value, String> {
    let dir = get_script_backup_dir();
    let bak_count = fs::read_dir(&dir).map(|e| e.filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("bak")).count()).unwrap_or(0);
    let total_bytes: u64 = fs::read_dir(&dir).map(|e| e.filter_map(|e| e.ok())
        .filter_map(|e| fs::metadata(e.path()).ok()).map(|m| m.len()).sum()).unwrap_or(0);

    Ok(serde_json::json!({
        "version": "1.0.0",
        "commands": ["ide_analyse","ide_review","ide_search","ide_patch","ide_patch_batch","ide_insert","ide_rollback","ide_script_status"],
        "backup_dir": dir.to_string_lossy(),
        "backup_count": bak_count,
        "backup_size_mb": format!("{:.1}", total_bytes as f64 / 1_048_576.0),
    }))
}
