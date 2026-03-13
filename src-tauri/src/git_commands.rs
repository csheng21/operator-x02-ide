// src-tauri/src/git_commands.rs
// Complete Git Integration for AI Code IDE
// Supports: status, commit, push, pull, branches, stash, diff viewer, blame, history, merge conflicts
// ============================================================================

use serde::{Deserialize, Serialize};
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
use std::path::Path;
use std::collections::HashMap;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Git file status information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,      // "modified", "added", "deleted", "untracked", "renamed", "copied"
    pub staged: bool,
    pub original_path: Option<String>,  // For renamed files
}

/// Git repository information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitInfo {
    pub branch: String,
    pub remote: Option<String>,
    pub ahead: i32,
    pub behind: i32,
    pub last_commit: Option<GitCommitInfo>,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

/// Git commit information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitCommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub relative_date: String,
}

/// Git branch information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub tracking: Option<String>,
    pub ahead: i32,
    pub behind: i32,
}

/// Git stash entry
#[derive(Debug, Serialize, Deserialize)]
pub struct GitStashEntry {
    pub index: i32,
    pub message: String,
    pub branch: String,
    pub date: String,
}

/// Git diff information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiff {
    pub file_path: String,
    pub diff_content: String,
    pub additions: i32,
    pub deletions: i32,
}

// ============================================================================
// NEW: ADVANCED GIT FEATURE STRUCTURES
// ============================================================================

/// Detailed stash entry for stash manager
#[derive(Debug, Serialize, Deserialize)]
pub struct GitStashEntryDetailed {
    pub index: usize,
    pub r#ref: String,
    pub message: String,
    pub branch: String,
    pub date: String,
    pub relative_date: String,
    pub files_changed: Option<usize>,
}

/// Blame line information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitBlameLine {
    pub line_number: usize,
    pub commit_hash: String,
    pub short_hash: String,
    pub author: String,
    pub author_email: String,
    pub date: String,
    pub relative_date: String,
    pub message: String,
    pub content: String,
}

/// Extended commit info for history viewer
#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitExtended {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub relative_date: String,
    pub parents: Vec<String>,
    pub branches: Vec<String>,
    pub tags: Vec<String>,
}

/// File changed in a commit
#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitFile {
    pub path: String,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
}

/// Paginated git status for large repositories
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedGitStatus {
    pub files: Vec<GitFileStatus>,
    pub total_count: usize,
    pub page: usize,
    pub page_size: usize,
    pub has_more: bool,
}

/// Status counts for quick overview
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCounts {
    pub staged: usize,
    pub unstaged: usize,
    pub total: usize,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Execute a git command and return output
fn run_git_command(path: &str, args: &[&str]) -> Result<String, String> {
    let output = create_hidden_command("git")
        .args(&["-C", path])
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Git command failed: {}", stderr.trim()))
    }
}

/// Execute a git command that may fail (for optional checks)
fn run_git_command_optional(path: &str, args: &[&str]) -> Option<String> {
    let output = create_hidden_command("git")
        .args(&["-C", path])
        .args(args)
        .output()
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// Parse git status porcelain output
fn parse_status_line(line: &str) -> Option<GitFileStatus> {
    if line.len() < 3 {
        return None;
    }

    let index_status = line.chars().nth(0)?;
    let worktree_status = line.chars().nth(1)?;
    let file_path = line[3..].to_string();

    // Handle renamed files (R  old -> new)
    let (path, original_path) = if file_path.contains(" -> ") {
        let parts: Vec<&str> = file_path.split(" -> ").collect();
        (parts.get(1)?.to_string(), Some(parts.get(0)?.to_string()))
    } else {
        (file_path, None)
    };

    // Determine status and staged state
    let (status, staged) = match (index_status, worktree_status) {
        ('M', ' ') => ("modified", true),
        (' ', 'M') => ("modified", false),
        ('M', 'M') => ("modified", false),  // Modified in both
        ('A', ' ') => ("added", true),
        ('A', 'M') => ("added", true),
        (' ', 'A') => ("added", false),
        ('D', ' ') => ("deleted", true),
        (' ', 'D') => ("deleted", false),
        ('R', ' ') => ("renamed", true),
        (' ', 'R') => ("renamed", false),
        ('C', ' ') => ("copied", true),
        (' ', 'C') => ("copied", false),
        ('?', '?') => ("untracked", false),
        ('!', '!') => ("ignored", false),
        ('U', _) | (_, 'U') => ("conflict", false),
        _ => ("unknown", false),
    };

    Some(GitFileStatus {
        path,
        status: status.to_string(),
        staged,
        original_path,
    })
}

/// Format timestamp to relative time
fn format_relative_time(timestamp: &str) -> String {
    if let Ok(ts) = timestamp.parse::<i64>() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        
        let diff = now - ts;
        
        if diff < 60 {
            "just now".to_string()
        } else if diff < 3600 {
            format!("{} min ago", diff / 60)
        } else if diff < 86400 {
            format!("{} hours ago", diff / 3600)
        } else if diff < 2592000 {
            format!("{} days ago", diff / 86400)
        } else if diff < 31536000 {
            format!("{} months ago", diff / 2592000)
        } else {
            format!("{} years ago", diff / 31536000)
        }
    } else {
        "unknown".to_string()
    }
}

// ============================================================================
// GIT CHECK AND INITIALIZATION COMMANDS
// ============================================================================

/// Check if git is installed
#[tauri::command]
pub async fn git_check_installed() -> Result<bool, String> {
    let output = create_hidden_command("git")
        .arg("--version")
        .output();

    match output {
        Ok(out) => Ok(out.status.success()),
        Err(_) => Ok(false),
    }
}

/// Check if path is a git repository (or inside one)
#[tauri::command]
pub async fn git_is_repo(path: String) -> Result<bool, String> {
    let git_dir = Path::new(&path).join(".git");
    if git_dir.exists() {
        return Ok(true);
    }

    // Also check if it's inside a git repo
    let output = create_hidden_command("git")
        .args(&["-C", &path, "rev-parse", "--is-inside-work-tree"])
        .output();

    match output {
        Ok(out) => Ok(out.status.success()),
        Err(_) => Ok(false),
    }
}

/// Check if a path is the ROOT of a git repository
#[tauri::command]
pub async fn git_is_repo_root(path: String) -> Result<bool, String> {
    let git_dir = Path::new(&path).join(".git");
    Ok(git_dir.exists())
}

/// Get the root directory of a git repository from any path inside it
#[tauri::command]
pub async fn git_get_repo_root(path: String) -> Result<String, String> {
    let output = create_hidden_command("git")
        .args(&["-C", &path, "rev-parse", "--show-toplevel"])
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if output.status.success() {
        let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(root.replace('\\', "/"))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Not a git repository: {}", stderr.trim()))
    }
}

/// Initialize a new git repository
#[tauri::command]
pub async fn git_init(path: String) -> Result<String, String> {
    run_git_command(&path, &["init"])
}

/// Clone a repository
#[tauri::command]
pub async fn git_clone(url: String, path: String) -> Result<String, String> {
    let output = create_hidden_command("git")
        .args(&["clone", &url, &path])
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Clone failed: {}", stderr.trim()))
    }
}

// ============================================================================
// GIT CONFIG COMMANDS
// ============================================================================

/// Get a git config value
#[tauri::command]
pub async fn git_get_config(path: String, key: String) -> Result<String, String> {
    if let Some(value) = run_git_command_optional(&path, &["config", "--get", &key]) {
        if !value.is_empty() {
            return Ok(value);
        }
    }
    
    let output = create_hidden_command("git")
        .args(&["config", "--global", "--get", &key])
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Ok(String::new())
    }
}

/// Set a git config value
#[tauri::command]
pub async fn git_set_config(path: String, key: String, value: String, global: bool) -> Result<(), String> {
    let output = if global {
        create_hidden_command("git")
            .args(&["config", "--global", &key, &value])
            .output()
            .map_err(|e| format!("Failed to execute git: {}", e))?
    } else {
        create_hidden_command("git")
            .args(&["-C", &path, "config", &key, &value])
            .output()
            .map_err(|e| format!("Failed to execute git: {}", e))?
    };
    
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to set config: {}", stderr.trim()))
    }
}

// ============================================================================
// GIT INFORMATION COMMANDS
// ============================================================================

/// Get comprehensive git repository info
#[tauri::command]
pub async fn git_info(path: String) -> Result<GitInfo, String> {
    let branch = run_git_command_optional(&path, &["branch", "--show-current"])
        .or_else(|| run_git_command_optional(&path, &["rev-parse", "--abbrev-ref", "HEAD"]))
        .unwrap_or_else(|| "HEAD".to_string());

    let remote = run_git_command_optional(&path, &["remote", "get-url", "origin"]);

    let mut ahead = 0;
    let mut behind = 0;
    
    if let Some(counts) = run_git_command_optional(&path, &["rev-list", "--left-right", "--count", &format!("{}...@{{u}}", branch)]) {
        let parts: Vec<&str> = counts.split_whitespace().collect();
        if parts.len() >= 2 {
            ahead = parts[0].parse().unwrap_or(0);
            behind = parts[1].parse().unwrap_or(0);
        }
    }

    let last_commit = if let Some(log_output) = run_git_command_optional(
        &path, 
        &["log", "-1", "--format=%H|%h|%s|%an|%ae|%ai|%ar"]
    ) {
        let parts: Vec<&str> = log_output.split('|').collect();
        if parts.len() >= 7 {
            Some(GitCommitInfo {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                message: parts[2].to_string(),
                author: parts[3].to_string(),
                email: parts[4].to_string(),
                date: parts[5].to_string(),
                relative_date: parts[6].to_string(),
            })
        } else {
            None
        }
    } else {
        None
    };

    let user_name = run_git_command_optional(&path, &["config", "user.name"])
        .or_else(|| {
            create_hidden_command("git")
                .args(&["config", "--global", "user.name"])
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        });

    let user_email = run_git_command_optional(&path, &["config", "user.email"])
        .or_else(|| {
            create_hidden_command("git")
                .args(&["config", "--global", "user.email"])
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        });

    Ok(GitInfo {
        branch,
        remote,
        ahead,
        behind,
        last_commit,
        user_name,
        user_email,
    })
}

/// Get git status (list of changed files)
#[tauri::command]
pub async fn git_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    let output = run_git_command(&path, &["status", "--porcelain=v1", "-uall"])?;
    
    let files: Vec<GitFileStatus> = output
        .lines()
        .filter_map(|line| parse_status_line(line))
        .collect();

    Ok(files)
}

/// Get diff for a specific file or all changes
#[tauri::command]
pub async fn git_diff(path: String, file_path: Option<String>, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff"];
    
    if staged {
        args.push("--cached");
    }
    
    if let Some(ref fp) = file_path {
        args.push("--");
        args.push(fp);
    }

    run_git_command(&path, &args)
}

// ============================================================================
// GIT STAGING COMMANDS
// ============================================================================

/// Stage specific files
#[tauri::command]
pub async fn git_add(path: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        return Err("No files specified".to_string());
    }

    let mut args = vec!["add", "--"];
    for file in &files {
        args.push(file);
    }

    run_git_command(&path, &args)?;
    Ok(())
}

/// Stage all changes
#[tauri::command]
pub async fn git_add_all(path: String) -> Result<(), String> {
    run_git_command(&path, &["add", "-A"])?;
    Ok(())
}

/// Unstage specific files
#[tauri::command]
pub async fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        run_git_command(&path, &["reset", "HEAD"])?;
    } else {
        let mut args = vec!["reset", "HEAD", "--"];
        for file in &files {
            args.push(file);
        }
        run_git_command(&path, &args)?;
    }
    Ok(())
}

/// Discard changes in working directory
#[tauri::command]
pub async fn git_discard(path: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        run_git_command(&path, &["checkout", "--", "."])?;
        run_git_command(&path, &["clean", "-fd"])?;
    } else {
        let mut args = vec!["checkout", "--"];
        for file in &files {
            args.push(file);
        }
        run_git_command(&path, &args)?;
    }
    Ok(())
}

// ============================================================================
// GIT COMMIT COMMANDS
// ============================================================================

/// Commit staged changes
#[tauri::command]
pub async fn git_commit(path: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }

    run_git_command(&path, &["commit", "-m", &message])
}

/// Amend the last commit
#[tauri::command]
pub async fn git_commit_amend(path: String, message: Option<String>) -> Result<String, String> {
    match message {
        Some(msg) if !msg.trim().is_empty() => {
            run_git_command(&path, &["commit", "--amend", "-m", &msg])
        }
        _ => {
            run_git_command(&path, &["commit", "--amend", "--no-edit"])
        }
    }
}

/// Revert a commit
#[tauri::command]
pub async fn git_revert(path: String, commit_hash: String) -> Result<String, String> {
    run_git_command(&path, &["revert", "--no-commit", &commit_hash])
}

/// Reset to a specific commit
#[tauri::command]
pub async fn git_reset(path: String, commit_hash: String, mode: String) -> Result<String, String> {
    let reset_mode = match mode.as_str() {
        "soft" => "--soft",
        "hard" => "--hard",
        _ => "--mixed",
    };
    
    run_git_command(&path, &["reset", reset_mode, &commit_hash])
}

// ============================================================================
// GIT REMOTE COMMANDS
// ============================================================================

/// Push changes to remote
#[tauri::command]
pub async fn git_push(path: String, remote: Option<String>, branch: Option<String>, force: Option<bool>) -> Result<String, String> {
    let mut args = vec!["push"];
    
    if force.unwrap_or(false) {
        args.push("--force-with-lease");
    }

    if let Some(ref r) = remote {
        args.push(r);
        if let Some(ref b) = branch {
            args.push(b);
        }
    } else {
        args.push("-u");
        args.push("origin");
        args.push("HEAD");
    }

    run_git_command(&path, &args)
}

/// Pull changes from remote
#[tauri::command]
pub async fn git_pull(path: String, remote: Option<String>, branch: Option<String>) -> Result<String, String> {
    let mut args = vec!["pull"];
    
    if let Some(ref r) = remote {
        args.push(r);
        if let Some(ref b) = branch {
            args.push(b);
        }
    }

    run_git_command(&path, &args)
}

/// Fetch changes from remote
#[tauri::command]
pub async fn git_fetch(path: String, remote: Option<String>, prune: Option<bool>) -> Result<String, String> {
    let mut args = vec!["fetch"];
    
    if prune.unwrap_or(false) {
        args.push("--prune");
    }

    if let Some(ref r) = remote {
        args.push(r);
    } else {
        args.push("--all");
    }

    run_git_command(&path, &args)
}

// ============================================================================
// GIT BRANCH COMMANDS
// ============================================================================

/// List all branches
#[tauri::command]
pub async fn git_branches(path: String, include_remote: bool) -> Result<Vec<GitBranch>, String> {
    let mut args = vec!["branch", "-vv"];
    if include_remote {
        args.push("-a");
    }

    let output = run_git_command(&path, &args)?;
    let mut branches = Vec::new();

    for line in output.lines() {
        let is_current = line.starts_with('*');
        let line = line.trim_start_matches('*').trim();
        
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let name = parts[0].to_string();
        let is_remote = name.starts_with("remotes/");
        let display_name = name.trim_start_matches("remotes/").to_string();

        let mut tracking = None;
        let mut ahead = 0;
        let mut behind = 0;

        if let Some(bracket_start) = line.find('[') {
            if let Some(bracket_end) = line.find(']') {
                let tracking_info = &line[bracket_start+1..bracket_end];
                let parts: Vec<&str> = tracking_info.split(':').collect();
                tracking = Some(parts[0].trim().to_string());
                
                if parts.len() > 1 {
                    let counts = parts[1];
                    if counts.contains("ahead") {
                        if let Some(num) = counts.split("ahead").nth(1) {
                            ahead = num.split(',').next()
                                .and_then(|s| s.trim().parse().ok())
                                .unwrap_or(0);
                        }
                    }
                    if counts.contains("behind") {
                        if let Some(num) = counts.split("behind").nth(1) {
                            behind = num.trim().parse().unwrap_or(0);
                        }
                    }
                }
            }
        }

        branches.push(GitBranch {
            name: display_name,
            is_current,
            is_remote,
            tracking,
            ahead,
            behind,
        });
    }

    Ok(branches)
}

/// Create a new branch
#[tauri::command]
pub async fn git_branch_create(path: String, name: String, checkout: bool) -> Result<String, String> {
    if checkout {
        run_git_command(&path, &["checkout", "-b", &name])
    } else {
        run_git_command(&path, &["branch", &name])
    }
}

/// Switch to a branch
#[tauri::command]
pub async fn git_checkout(path: String, branch: String, create_from: Option<String>) -> Result<String, String> {
    match create_from {
        Some(ref base) => run_git_command(&path, &["checkout", "-b", &branch, base]),
        None => run_git_command(&path, &["checkout", &branch]),
    }
}

/// Delete a branch
#[tauri::command]
pub async fn git_branch_delete(path: String, name: String, force: bool) -> Result<String, String> {
    let flag = if force { "-D" } else { "-d" };
    run_git_command(&path, &["branch", flag, &name])
}

// ============================================================================
// GIT LOG COMMANDS
// ============================================================================

/// Get commit log
#[tauri::command]
pub async fn git_log(path: String, max_count: Option<i32>, file_path: Option<String>) -> Result<Vec<GitCommitInfo>, String> {
    let count = max_count.unwrap_or(50);
    let mut args = vec![
        "log".to_string(),
        format!("-{}", count),
        "--format=%H|%h|%s|%an|%ae|%ai|%ar".to_string(),
    ];

    if let Some(ref fp) = file_path {
        args.push("--".to_string());
        args.push(fp.clone());
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_git_command(&path, &args_ref)?;

    let commits: Vec<GitCommitInfo> = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 7 {
                Some(GitCommitInfo {
                    hash: parts[0].to_string(),
                    short_hash: parts[1].to_string(),
                    message: parts[2].to_string(),
                    author: parts[3].to_string(),
                    email: parts[4].to_string(),
                    date: parts[5].to_string(),
                    relative_date: parts[6].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

// ============================================================================
// GIT STASH COMMANDS (BASIC)
// ============================================================================

/// Stash changes
#[tauri::command]
pub async fn git_stash(path: String, message: Option<String>) -> Result<String, String> {
    match message {
        Some(msg) if !msg.trim().is_empty() => {
            run_git_command(&path, &["stash", "push", "-m", &msg])
        }
        _ => {
            run_git_command(&path, &["stash", "push"])
        }
    }
}

/// Pop stashed changes
#[tauri::command]
pub async fn git_stash_pop(path: String, index: Option<i32>) -> Result<String, String> {
    match index {
        Some(i) => run_git_command(&path, &["stash", "pop", &format!("stash@{{{}}}", i)]),
        None => run_git_command(&path, &["stash", "pop"]),
    }
}

/// List stashed changes
#[tauri::command]
pub async fn git_stash_list(path: String) -> Result<Vec<GitStashEntry>, String> {
    let output = run_git_command(&path, &["stash", "list", "--format=%gd|%s|%cr"])?;
    
    let stashes: Vec<GitStashEntry> = output
        .lines()
        .enumerate()
        .filter_map(|(idx, line)| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 3 {
                let message = parts[1].to_string();
                let branch = message
                    .split(':')
                    .next()
                    .and_then(|s| s.split(" on ").nth(1))
                    .unwrap_or("unknown")
                    .to_string();

                Some(GitStashEntry {
                    index: idx as i32,
                    message,
                    branch,
                    date: parts[2].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(stashes)
}

// ============================================================================
// TORTOISEGIT INTEGRATION (Windows)
// ============================================================================

/// Open TortoiseGit for the repository
#[tauri::command]
pub async fn open_tortoise_git(path: String, command: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let tortoise_cmd = match command.as_str() {
            "commit" => "/command:commit",
            "log" => "/command:log",
            "pull" => "/command:pull",
            "push" => "/command:push",
            "fetch" => "/command:fetch",
            "stash" => "/command:stashsave",
            "diff" => "/command:diff",
            "blame" => "/command:blame",
            "revert" => "/command:revert",
            "switch" => "/command:switch",
            "merge" => "/command:merge",
            "branch" => "/command:branch",
            "tag" => "/command:tag",
            "settings" => "/command:settings",
            _ => "/command:log",
        };

        Command::new("TortoiseGitProc.exe")
            .args(&[tortoise_cmd, &format!("/path:{}", path)])
            .spawn()
            .map_err(|e| format!("Failed to open TortoiseGit: {}. Is TortoiseGit installed?", e))?;
        
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("TortoiseGit is only available on Windows".to_string())
    }
}

// ============================================================================
// GIT VIRTUAL SCROLLING / HIGH PERFORMANCE COMMANDS
// For handling repositories with 6000+ changed files
// ============================================================================

/// Get paginated git status - useful for repos with thousands of files
#[tauri::command]
pub async fn git_status_paginated(
    path: String,
    page: usize,
    page_size: usize
) -> Result<PaginatedGitStatus, String> {
    let output = run_git_command(&path, &["status", "--porcelain=v1", "-uall"])?;
    
    let all_files: Vec<GitFileStatus> = output
        .lines()
        .filter_map(|line| parse_status_line(line))
        .collect();
    
    let total_count = all_files.len();
    let start = page * page_size;
    let end = std::cmp::min(start + page_size, total_count);
    
    let files = if start < total_count {
        all_files[start..end].to_vec()
    } else {
        vec![]
    };
    
    Ok(PaginatedGitStatus {
        files,
        total_count,
        page,
        page_size,
        has_more: end < total_count,
    })
}

/// Get just the count of staged/unstaged files (fast operation)
#[tauri::command]
pub async fn git_status_count(path: String) -> Result<StatusCounts, String> {
    let output = run_git_command(&path, &["status", "--porcelain=v1", "-uall"])?;
    
    let mut staged = 0;
    let mut unstaged = 0;
    
    for line in output.lines() {
        if let Some(status) = parse_status_line(line) {
            if status.staged {
                staged += 1;
            } else {
                unstaged += 1;
            }
        }
    }
    
    Ok(StatusCounts {
        staged,
        unstaged,
        total: staged + unstaged,
    })
}

/// Stage specific files (batch operation)
#[tauri::command]
pub async fn git_stage(path: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        return Ok("No files to stage".to_string());
    }
    
    let mut args = vec!["add", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);
    
    run_git_command(&path, &args)?;
    Ok(format!("Staged {} files", files.len()))
}

/// Stage all changes
#[tauri::command]
pub async fn git_stage_all(path: String) -> Result<String, String> {
    run_git_command(&path, &["add", "-A"])
}

/// Unstage specific files (batch operation)
#[tauri::command]
pub async fn git_unstage_files(path: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        return Ok("No files to unstage".to_string());
    }
    
    let mut args = vec!["reset", "HEAD", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);
    
    run_git_command(&path, &args)?;
    Ok(format!("Unstaged {} files", files.len()))
}

/// Unstage all changes
#[tauri::command]
pub async fn git_unstage_all(path: String) -> Result<String, String> {
    run_git_command(&path, &["reset", "HEAD"])
}

/// Discard changes in specific files
#[tauri::command]
pub async fn git_discard_files(path: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        return Ok("No files to discard".to_string());
    }
    
    let status_output = run_git_command(&path, &["status", "--porcelain=v1"])?;
    
    let mut tracked_files: Vec<&str> = Vec::new();
    let mut untracked_files: Vec<&str> = Vec::new();
    
    for file in &files {
        let is_untracked = status_output.lines().any(|line| {
            line.starts_with("??") && line[3..].trim() == file
        });
        
        if is_untracked {
            untracked_files.push(file);
        } else {
            tracked_files.push(file);
        }
    }
    
    if !tracked_files.is_empty() {
        let mut args = vec!["checkout", "--"];
        args.extend(tracked_files.clone());
        run_git_command(&path, &args)?;
    }
    
    for file in &untracked_files {
        let file_path = Path::new(&path).join(file);
        if file_path.exists() {
            if file_path.is_dir() {
                std::fs::remove_dir_all(&file_path)
                    .map_err(|e| format!("Failed to remove directory {}: {}", file, e))?;
            } else {
                std::fs::remove_file(&file_path)
                    .map_err(|e| format!("Failed to remove file {}: {}", file, e))?;
            }
        }
    }
    
    Ok(format!("Discarded {} files ({} tracked, {} untracked)", 
        files.len(), tracked_files.len(), untracked_files.len()))
}

/// Discard all changes (dangerous!)
#[tauri::command]
pub async fn git_discard_all(path: String) -> Result<String, String> {
    run_git_command(&path, &["checkout", "--", "."])?;
    run_git_command(&path, &["clean", "-fd"])?;
    Ok("Discarded all changes".to_string())
}

/// Get diff for a single file (with size limit for safety)
#[tauri::command]
pub async fn git_diff_file(
    path: String,
    file_path: String,
    staged: bool
) -> Result<GitDiff, String> {
    let args = if staged {
        vec!["diff", "--cached", "--", &file_path]
    } else {
        vec!["diff", "--", &file_path]
    };
    
    let diff_content = run_git_command(&path, &args)?;
    
    let mut additions = 0;
    let mut deletions = 0;
    
    for line in diff_content.lines() {
        if line.starts_with('+') && !line.starts_with("+++") {
            additions += 1;
        } else if line.starts_with('-') && !line.starts_with("---") {
            deletions += 1;
        }
    }
    
    const MAX_DIFF_SIZE: usize = 1_000_000;
    let truncated_diff = if diff_content.len() > MAX_DIFF_SIZE {
        format!(
            "{}\n\n[Diff truncated - file too large ({} bytes)]",
            &diff_content[..MAX_DIFF_SIZE],
            diff_content.len()
        )
    } else {
        diff_content
    };
    
    Ok(GitDiff {
        file_path,
        diff_content: truncated_diff,
        additions,
        deletions,
    })
}

/// Get current branch name
#[tauri::command]
pub async fn git_current_branch(path: String) -> Result<String, String> {
    run_git_command_optional(&path, &["branch", "--show-current"])
        .or_else(|| run_git_command_optional(&path, &["rev-parse", "--abbrev-ref", "HEAD"]))
        .ok_or_else(|| "Could not determine current branch".to_string())
}

// ============================================================================
// NEW: ADVANCED GIT FEATURES - STASH MANAGER
// ============================================================================

/// Get detailed list of all stashes
#[tauri::command]
pub async fn git_stash_list_detailed(path: String) -> Result<Vec<GitStashEntryDetailed>, String> {
    let output = run_git_command(&path, &[
        "stash", "list",
        "--format=%gd|%gs|%ci|%cr"
    ])?;

    if output.is_empty() {
        return Ok(vec![]);
    }

    let mut stashes = Vec::new();

    for (index, line) in output.lines().enumerate() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() >= 4 {
            let stash_ref = parts[0].to_string();
            let message = parts[1].to_string();
            
            let branch = message
                .split(':')
                .next()
                .and_then(|s| s.split_whitespace().last())
                .unwrap_or("unknown")
                .to_string();

            let files_changed = run_git_command_optional(&path, &[
                "stash", "show", "--stat", &stash_ref
            ]).map(|s| s.lines().count().saturating_sub(1));

            stashes.push(GitStashEntryDetailed {
                index,
                r#ref: stash_ref,
                message: message.split(':').skip(1).collect::<Vec<_>>().join(":").trim().to_string(),
                branch,
                date: parts[2].to_string(),
                relative_date: parts[3].to_string(),
                files_changed,
            });
        }
    }

    Ok(stashes)
}

/// Save changes to stash with options
#[tauri::command]
pub async fn git_stash_save(
    path: String,
    message: Option<String>,
    include_untracked: bool
) -> Result<String, String> {
    let mut args = vec!["stash", "push"];
    
    if include_untracked {
        args.push("-u");
    }
    
    if let Some(ref msg) = message {
        args.push("-m");
        args.push(msg);
    }

    run_git_command(&path, &args)
}

/// Apply a stash (without removing it)
#[tauri::command]
pub async fn git_stash_apply(path: String, index: usize) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", index);
    run_git_command(&path, &["stash", "apply", &stash_ref])
}

/// Drop a specific stash
#[tauri::command]
pub async fn git_stash_drop(path: String, index: usize) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", index);
    run_git_command(&path, &["stash", "drop", &stash_ref])
}

/// Clear all stashes
#[tauri::command]
pub async fn git_stash_clear(path: String) -> Result<String, String> {
    run_git_command(&path, &["stash", "clear"])
}

/// Show files in a stash
#[tauri::command]
pub async fn git_stash_show_files(path: String, index: usize) -> Result<Vec<GitCommitFile>, String> {
    let stash_ref = format!("stash@{{{}}}", index);
    let output = run_git_command(&path, &[
        "stash", "show", "--numstat", &stash_ref
    ])?;

    let mut files = Vec::new();
    
    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse().unwrap_or(0);
            let deletions = parts[1].parse().unwrap_or(0);
            let file_path = parts[2..].join(" ");
            
            let status = if additions > 0 && deletions > 0 {
                "modified"
            } else if additions > 0 {
                "added"
            } else {
                "deleted"
            };

            files.push(GitCommitFile {
                path: file_path,
                status: status.to_string(),
                additions,
                deletions,
            });
        }
    }

    Ok(files)
}

/// Create a branch from a stash
#[tauri::command]
pub async fn git_stash_branch(
    path: String,
    index: usize,
    branch_name: String
) -> Result<String, String> {
    let stash_ref = format!("stash@{{{}}}", index);
    run_git_command(&path, &["stash", "branch", &branch_name, &stash_ref])
}

// ============================================================================
// NEW: GIT BLAME
// ============================================================================

/// Get blame information for a file
#[tauri::command]
pub async fn git_blame(path: String, file_path: String) -> Result<Vec<GitBlameLine>, String> {
    let output = run_git_command(&path, &[
        "blame", "--porcelain", &file_path
    ])?;

    let mut lines = Vec::new();
    let mut current_hash = String::new();
    let mut commit_info: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut line_number = 0;

    for line in output.lines() {
        if line.starts_with('\t') {
            line_number += 1;
            let content = &line[1..];
            
            let info = commit_info.get(&current_hash).cloned().unwrap_or_default();
            
            lines.push(GitBlameLine {
                line_number,
                commit_hash: current_hash.clone(),
                short_hash: current_hash.chars().take(7).collect(),
                author: info.get("author").cloned().unwrap_or_default(),
                author_email: info.get("author-mail").cloned().unwrap_or_default()
                    .trim_matches(|c| c == '<' || c == '>').to_string(),
                date: info.get("author-time").cloned().unwrap_or_default(),
                relative_date: format_relative_time(&info.get("author-time").cloned().unwrap_or_default()),
                message: info.get("summary").cloned().unwrap_or_default(),
                content: content.to_string(),
            });
        } else if line.len() >= 40 && line.chars().take(40).all(|c| c.is_ascii_hexdigit()) {
            current_hash = line.split_whitespace().next().unwrap_or("").to_string();
        } else if line.contains(' ') {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() == 2 {
                commit_info
                    .entry(current_hash.clone())
                    .or_insert_with(HashMap::new)
                    .insert(parts[0].to_string(), parts[1].to_string());
            }
        }
    }

    Ok(lines)
}

// ============================================================================
// NEW: EXTENDED HISTORY COMMANDS
// ============================================================================

/// Get extended commit log with pagination
#[tauri::command]
pub async fn git_log_extended(
    path: String,
    max_count: usize,
    skip: usize,
    file_path: Option<String>
) -> Result<Vec<GitCommitExtended>, String> {
    let format = "%H|%h|%s|%an|%ae|%ci|%cr|%P";
    
    let mut args = vec![
        "log".to_string(),
        format!("--format={}", format),
        format!("-n{}", max_count),
        format!("--skip={}", skip),
        "--decorate=short".to_string()
    ];

    if let Some(ref fp) = file_path {
        args.push("--".to_string());
        args.push(fp.clone());
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_git_command(&path, &args_ref)?;

    let refs_output = run_git_command_optional(&path, &[
        "for-each-ref",
        "--format=%(objectname:short) %(refname:short)",
        "refs/heads/",
        "refs/tags/"
    ]).unwrap_or_default();

    let mut refs_map: HashMap<String, (Vec<String>, Vec<String>)> = HashMap::new();
    for line in refs_output.lines() {
        let parts: Vec<&str> = line.splitn(2, ' ').collect();
        if parts.len() == 2 {
            let entry = refs_map.entry(parts[0].to_string()).or_insert((vec![], vec![]));
            if parts[1].starts_with("tags/") || !parts[1].contains('/') {
                if parts[1].starts_with("tags/") {
                    entry.1.push(parts[1].replace("tags/", ""));
                } else {
                    entry.0.push(parts[1].to_string());
                }
            }
        }
    }

    let mut commits = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(8, '|').collect();
        if parts.len() >= 7 {
            let short_hash = parts[1].to_string();
            let refs_info = refs_map.get(&short_hash).cloned().unwrap_or((vec![], vec![]));

            commits.push(GitCommitExtended {
                hash: parts[0].to_string(),
                short_hash,
                message: parts[2].to_string(),
                author: parts[3].to_string(),
                email: parts[4].to_string(),
                date: parts[5].to_string(),
                relative_date: parts[6].to_string(),
                parents: if parts.len() > 7 {
                    parts[7].split_whitespace().map(|s| s.to_string()).collect()
                } else {
                    vec![]
                },
                branches: refs_info.0,
                tags: refs_info.1,
            });
        }
    }

    Ok(commits)
}

/// Get files changed in a commit
#[tauri::command]
pub async fn git_show_files(
    path: String,
    commit_hash: String
) -> Result<Vec<GitCommitFile>, String> {
    let output = run_git_command(&path, &[
        "show", "--numstat", "--format=", &commit_hash
    ])?;

    let mut files = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse().unwrap_or(0);
            let deletions = parts[1].parse().unwrap_or(0);
            let file_path = parts[2..].join(" ");

            let (final_path, status) = if file_path.contains(" => ") {
                let rename_parts: Vec<&str> = file_path.split(" => ").collect();
                (rename_parts.last().unwrap_or(&"").to_string(), "renamed")
            } else if additions > 0 && deletions == 0 {
                (file_path, "added")
            } else if additions == 0 && deletions > 0 {
                (file_path, "deleted")
            } else {
                (file_path, "modified")
            };

            files.push(GitCommitFile {
                path: final_path,
                status: status.to_string(),
                additions,
                deletions,
            });
        }
    }

    Ok(files)
}

/// Show a specific commit's full diff
#[tauri::command]
pub async fn git_show(path: String, commit_hash: String) -> Result<String, String> {
    run_git_command(&path, &["show", "--stat", "-p", &commit_hash])
}

/// Show diff for a specific file in a commit
#[tauri::command]
pub async fn git_show_file(
    path: String,
    commit_hash: String,
    file_path: String
) -> Result<String, String> {
    run_git_command(&path, &["show", &commit_hash, "--", &file_path])
}

// ============================================================================
// NEW: MERGE CONFLICT COMMANDS
// ============================================================================

/// Get list of files with merge conflicts
#[tauri::command]
pub async fn git_get_conflict_files(path: String) -> Result<Vec<String>, String> {
    let output = run_git_command(&path, &["diff", "--name-only", "--diff-filter=U"])?;
    
    Ok(output.lines()
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect())
}

/// Get a specific version of a conflicted file
#[tauri::command]
pub async fn git_show_version(
    path: String,
    file_path: String,
    version: String
) -> Result<String, String> {
    let stage = match version.as_str() {
        "base" => ":1:",
        "ours" => ":2:",
        "theirs" => ":3:",
        _ => return Err("Invalid version. Use 'base', 'ours', or 'theirs'".to_string()),
    };

    run_git_command(&path, &["show", &format!("{}{}", stage, file_path)])
}

/// Mark files as resolved (add to staging)
#[tauri::command]
pub async fn git_resolve(path: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        return Ok("No files to resolve".to_string());
    }

    let mut args = vec!["add", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    run_git_command(&path, &args)
}

/// Abort current merge
#[tauri::command]
pub async fn git_merge_abort(path: String) -> Result<String, String> {
    run_git_command(&path, &["merge", "--abort"])
}

/// Merge a branch into current
#[tauri::command]
pub async fn git_merge(path: String, branch: String) -> Result<String, String> {
    run_git_command(&path, &["merge", &branch])
}

/// Cherry-pick a commit
#[tauri::command]
pub async fn git_cherry_pick(path: String, commit_hash: String) -> Result<String, String> {
    run_git_command(&path, &["cherry-pick", &commit_hash])
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_status_line_modified_staged() {
        let result = parse_status_line("M  src/main.rs");
        assert!(result.is_some());
        let status = result.unwrap();
        assert_eq!(status.path, "src/main.rs");
        assert_eq!(status.status, "modified");
        assert!(status.staged);
    }

    #[test]
    fn test_parse_status_line_modified_unstaged() {
        let result = parse_status_line(" M src/main.rs");
        assert!(result.is_some());
        let status = result.unwrap();
        assert_eq!(status.path, "src/main.rs");
        assert_eq!(status.status, "modified");
        assert!(!status.staged);
    }

    #[test]
    fn test_parse_status_line_untracked() {
        let result = parse_status_line("?? new_file.txt");
        assert!(result.is_some());
        let status = result.unwrap();
        assert_eq!(status.path, "new_file.txt");
        assert_eq!(status.status, "untracked");
        assert!(!status.staged);
    }

    #[test]
    fn test_parse_status_line_renamed() {
        let result = parse_status_line("R  old.rs -> new.rs");
        assert!(result.is_some());
        let status = result.unwrap();
        assert_eq!(status.path, "new.rs");
        assert_eq!(status.original_path, Some("old.rs".to_string()));
        assert_eq!(status.status, "renamed");
        assert!(status.staged);
    }
}
