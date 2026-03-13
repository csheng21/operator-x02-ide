// src-tauri/src/commands/git_commands.rs
// Tauri backend commands for Git operations
// Uses git2-rs for native Git operations and falls back to CLI when needed

use git2::{
    BranchType, Commit, DiffOptions, Error as Git2Error, ObjectType, Oid, Repository,
    ResetType, Signature, StatusOptions, StatusShow,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tauri::command;

// ============ Data Types ============

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusResult {
    pub files: Vec<GitFileEntry>,
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub remote: Option<String>,
    pub is_clean: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFileEntry {
    pub path: String,
    pub status: String,
    pub staged: bool,
    pub index_status: String,
    pub work_tree_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitResult {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub date: i64,
    pub tree_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitBranchInfo {
    pub name: String,
    pub full_name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub ahead: i32,
    pub behind: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitInfo {
    pub sha: String,
    pub short_sha: String,
    pub message: String,
    pub body: Option<String>,
    pub author: String,
    pub author_email: String,
    pub date: i64,
    pub committer: String,
    pub committer_email: String,
    pub committer_date: i64,
    pub parents: Vec<String>,
    pub tree_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitRemoteInfo {
    pub name: String,
    pub url: String,
    pub fetch_url: String,
    pub push_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStashInfo {
    pub index: usize,
    pub id: String,
    pub message: String,
    pub branch: String,
    pub commit: String,
    pub date: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitTagInfo {
    pub name: String,
    pub sha: String,
    pub message: Option<String>,
    pub is_annotated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitRepoInfo {
    pub path: String,
    pub branch: String,
    pub head_commit: String,
    pub is_detached: bool,
    pub is_bare: bool,
    pub remotes: Vec<GitRemoteInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeResultInfo {
    pub success: bool,
    pub fast_forward: bool,
    pub conflicts: Vec<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PushPullResult {
    pub success: bool,
    pub updated_files: Vec<String>,
    pub errors: Vec<String>,
}

// ============ Repository Operations ============

#[command]
pub async fn git_is_repository(path: String) -> Result<bool, String> {
    match Repository::discover(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[command]
pub async fn git_init(path: String) -> Result<GitRepoInfo, String> {
    Repository::init(&path)
        .map_err(|e| format!("Failed to initialize repository: {}", e))?;
    
    git_get_info(path).await
}

#[command]
pub async fn git_clone(
    url: String,
    path: String,
    branch: Option<String>,
    depth: Option<i32>,
) -> Result<GitRepoInfo, String> {
    // Use CLI for clone (handles authentication better)
    let mut args = vec!["clone".to_string()];
    
    if let Some(b) = branch {
        args.push("--branch".to_string());
        args.push(b);
    }
    
    if let Some(d) = depth {
        args.push("--depth".to_string());
        args.push(d.to_string());
    }
    
    args.push(url);
    args.push(path.clone());
    
    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git clone: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    git_get_info(path).await
}

#[command]
pub async fn git_get_info(path: String) -> Result<GitRepoInfo, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head = repo.head().ok();
    let branch = head
        .as_ref()
        .and_then(|h| h.shorthand().map(String::from))
        .unwrap_or_else(|| "HEAD".to_string());
    
    let head_commit = head
        .as_ref()
        .and_then(|h| h.target().map(|oid| oid.to_string()))
        .unwrap_or_default();
    
    let is_detached = head
        .as_ref()
        .map(|h| !h.is_branch())
        .unwrap_or(false);
    
    let remotes = repo
        .remotes()
        .map_err(|e| format!("Failed to get remotes: {}", e))?
        .iter()
        .filter_map(|name| name)
        .filter_map(|name| {
            repo.find_remote(name).ok().map(|remote| GitRemoteInfo {
                name: name.to_string(),
                url: remote.url().unwrap_or("").to_string(),
                fetch_url: remote.url().unwrap_or("").to_string(),
                push_url: remote.pushurl().unwrap_or(remote.url().unwrap_or("")).to_string(),
            })
        })
        .collect();
    
    Ok(GitRepoInfo {
        path: repo.path().to_string_lossy().to_string(),
        branch,
        head_commit,
        is_detached,
        is_bare: repo.is_bare(),
        remotes,
    })
}

// ============ Status Operations ============

#[command]
pub async fn git_status(path: String) -> Result<GitStatusResult, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);
    
    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let mut files = Vec::new();
    for entry in statuses.iter() {
        let status = entry.status();
        let path_str = entry.path().unwrap_or("").to_string();
        
        let (status_str, staged) = get_status_string(status);
        let (index_status, work_tree_status) = get_detailed_status(status);
        
        files.push(GitFileEntry {
            path: path_str,
            status: status_str,
            staged,
            index_status,
            work_tree_status,
        });
    }
    
    let branch = get_current_branch_name(&repo);
    let (ahead, behind) = get_ahead_behind(&repo).unwrap_or((0, 0));
    let remote = get_tracking_remote(&repo);
    
    Ok(GitStatusResult {
        files,
        branch,
        ahead,
        behind,
        remote,
        is_clean: statuses.is_empty(),
    })
}

fn get_status_string(status: git2::Status) -> (String, bool) {
    let staged = status.is_index_new()
        || status.is_index_modified()
        || status.is_index_deleted()
        || status.is_index_renamed()
        || status.is_index_typechange();
    
    let status_str = if status.is_conflicted() {
        "conflicted"
    } else if status.is_wt_new() || status.is_index_new() {
        "added"
    } else if status.is_wt_modified() || status.is_index_modified() {
        "modified"
    } else if status.is_wt_deleted() || status.is_index_deleted() {
        "deleted"
    } else if status.is_wt_renamed() || status.is_index_renamed() {
        "renamed"
    } else if status.is_ignored() {
        "ignored"
    } else {
        "untracked"
    };
    
    (status_str.to_string(), staged)
}

fn get_detailed_status(status: git2::Status) -> (String, String) {
    let index = if status.is_index_new() {
        "added"
    } else if status.is_index_modified() {
        "modified"
    } else if status.is_index_deleted() {
        "deleted"
    } else if status.is_index_renamed() {
        "renamed"
    } else {
        "unmodified"
    };
    
    let worktree = if status.is_wt_new() {
        "untracked"
    } else if status.is_wt_modified() {
        "modified"
    } else if status.is_wt_deleted() {
        "deleted"
    } else {
        "unmodified"
    };
    
    (index.to_string(), worktree.to_string())
}

fn get_current_branch_name(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from))
        .unwrap_or_else(|| "HEAD".to_string())
}

fn get_tracking_remote(repo: &Repository) -> Option<String> {
    let head = repo.head().ok()?;
    let branch_name = head.shorthand()?;
    let branch = repo.find_branch(branch_name, BranchType::Local).ok()?;
    let upstream = branch.upstream().ok()?;
    upstream.name().ok().flatten().map(|s| s.to_string())
}

fn get_ahead_behind(repo: &Repository) -> Result<(i32, i32), Git2Error> {
    let head = repo.head()?;
    let branch_name = head.shorthand().unwrap_or("HEAD");
    
    let local_branch = repo.find_branch(branch_name, BranchType::Local)?;
    let upstream = local_branch.upstream()?;
    
    let local_oid = head.target().ok_or_else(|| {
        Git2Error::from_str("No target for HEAD")
    })?;
    
    let upstream_oid = upstream.get().target().ok_or_else(|| {
        Git2Error::from_str("No target for upstream")
    })?;
    
    let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid)?;
    
    Ok((ahead as i32, behind as i32))
}

// ============ Staging Operations ============

#[command]
pub async fn git_add(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    for file in files {
        index
            .add_path(Path::new(&file))
            .map_err(|e| format!("Failed to add {}: {}", file, e))?;
    }
    
    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn git_add_all(path: String) -> Result<(), String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add all: {}", e))?;
    
    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    // Use CLI for unstage (reset HEAD)
    let mut args = vec!["reset", "HEAD", "--"];
    args.extend(files.iter().map(|s| s.as_str()));
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git reset: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_unstage_all(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["reset", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to run git reset: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

// ============ Commit Operations ============

#[command]
pub async fn git_commit(
    path: String,
    message: String,
    amend: bool,
    no_verify: bool,
) -> Result<GitCommitResult, String> {
    if amend {
        // Use CLI for amend
        let mut args = vec!["commit", "--amend", "-m", &message];
        if no_verify {
            args.push("--no-verify");
        }
        
        let output = Command::new("git")
            .current_dir(&path)
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to run git commit: {}", e))?;
        
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        
        // Get the amended commit info
        let repo = Repository::discover(&path)
            .map_err(|e| format!("Failed to open repository: {}", e))?;
        let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
        let commit = head.peel_to_commit().map_err(|e| format!("Failed to get commit: {}", e))?;
        
        return Ok(commit_to_result(&commit));
    }
    
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let sig = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {}", e))?;
    
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;
    
    let parent_commit = match repo.head() {
        Ok(head) => Some(
            head.peel_to_commit()
                .map_err(|e| format!("Failed to get parent commit: {}", e))?,
        ),
        Err(_) => None,
    };
    
    let parents: Vec<&Commit> = parent_commit.iter().collect();
    
    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| format!("Failed to commit: {}", e))?;
    
    let commit = repo
        .find_commit(commit_id)
        .map_err(|e| format!("Failed to find commit: {}", e))?;
    
    Ok(commit_to_result(&commit))
}

fn commit_to_result(commit: &Commit) -> GitCommitResult {
    GitCommitResult {
        sha: commit.id().to_string(),
        message: commit.message().unwrap_or("").to_string(),
        author: commit.author().name().unwrap_or("").to_string(),
        email: commit.author().email().unwrap_or("").to_string(),
        date: commit.time().seconds(),
        tree_id: commit.tree_id().to_string(),
    }
}

// ============ Branch Operations ============

#[command]
pub async fn git_branches(path: String) -> Result<Vec<GitBranchInfo>, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut branches = Vec::new();
    let current_branch = get_current_branch_name(&repo);
    
    // Local branches
    for branch_result in repo
        .branches(Some(BranchType::Local))
        .map_err(|e| format!("Failed to get branches: {}", e))?
    {
        let (branch, _) = branch_result.map_err(|e| format!("Failed to read branch: {}", e))?;
        
        let name = branch
            .name()
            .map_err(|e| format!("Failed to get branch name: {}", e))?
            .unwrap_or("")
            .to_string();
        
        let upstream = branch.upstream().ok().and_then(|u| {
            u.name().ok().flatten().map(|s| s.to_string())
        });
        
        let (ahead, behind) = if upstream.is_some() {
            get_branch_ahead_behind(&repo, &name).unwrap_or((0, 0))
        } else {
            (0, 0)
        };
        
        branches.push(GitBranchInfo {
            name: name.clone(),
            full_name: format!("refs/heads/{}", name),
            is_current: name == current_branch,
            is_remote: false,
            upstream,
            ahead,
            behind,
        });
    }
    
    // Remote branches
    for branch_result in repo
        .branches(Some(BranchType::Remote))
        .map_err(|e| format!("Failed to get remote branches: {}", e))?
    {
        let (branch, _) = branch_result.map_err(|e| format!("Failed to read branch: {}", e))?;
        
        let name = branch
            .name()
            .map_err(|e| format!("Failed to get branch name: {}", e))?
            .unwrap_or("")
            .to_string();
        
        branches.push(GitBranchInfo {
            name: name.clone(),
            full_name: format!("refs/remotes/{}", name),
            is_current: false,
            is_remote: true,
            upstream: None,
            ahead: 0,
            behind: 0,
        });
    }
    
    Ok(branches)
}

fn get_branch_ahead_behind(repo: &Repository, branch_name: &str) -> Result<(i32, i32), Git2Error> {
    let local_branch = repo.find_branch(branch_name, BranchType::Local)?;
    let upstream = local_branch.upstream()?;
    
    let local_oid = local_branch.get().target().ok_or_else(|| {
        Git2Error::from_str("No target for branch")
    })?;
    
    let upstream_oid = upstream.get().target().ok_or_else(|| {
        Git2Error::from_str("No target for upstream")
    })?;
    
    let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid)?;
    
    Ok((ahead as i32, behind as i32))
}

#[command]
pub async fn git_create_branch(
    path: String,
    name: String,
    start_point: Option<String>,
) -> Result<GitBranchInfo, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let commit = if let Some(ref sp) = start_point {
        let obj = repo
            .revparse_single(sp)
            .map_err(|e| format!("Failed to find start point: {}", e))?;
        obj.peel_to_commit()
            .map_err(|e| format!("Failed to get commit: {}", e))?
    } else {
        repo.head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?
            .peel_to_commit()
            .map_err(|e| format!("Failed to get HEAD commit: {}", e))?
    };
    
    repo.branch(&name, &commit, false)
        .map_err(|e| format!("Failed to create branch: {}", e))?;
    
    Ok(GitBranchInfo {
        name: name.clone(),
        full_name: format!("refs/heads/{}", name),
        is_current: false,
        is_remote: false,
        upstream: None,
        ahead: 0,
        behind: 0,
    })
}

#[command]
pub async fn git_switch_branch(path: String, branch: String) -> Result<(), String> {
    // Use CLI for checkout (handles worktree better)
    let output = Command::new("git")
        .current_dir(&path)
        .args(["checkout", &branch])
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_delete_branch(path: String, branch: String, force: bool) -> Result<(), String> {
    let flag = if force { "-D" } else { "-d" };
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(["branch", flag, &branch])
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_rename_branch(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["branch", "-m", &old_name, &new_name])
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

// ============ Remote Operations ============

#[command]
pub async fn git_remotes(path: String) -> Result<Vec<GitRemoteInfo>, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let remotes = repo
        .remotes()
        .map_err(|e| format!("Failed to get remotes: {}", e))?
        .iter()
        .filter_map(|name| name)
        .filter_map(|name| {
            repo.find_remote(name).ok().map(|remote| GitRemoteInfo {
                name: name.to_string(),
                url: remote.url().unwrap_or("").to_string(),
                fetch_url: remote.url().unwrap_or("").to_string(),
                push_url: remote.pushurl().unwrap_or(remote.url().unwrap_or("")).to_string(),
            })
        })
        .collect();
    
    Ok(remotes)
}

#[command]
pub async fn git_add_remote(path: String, name: String, url: String) -> Result<(), String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.remote(&name, &url)
        .map_err(|e| format!("Failed to add remote: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn git_remove_remote(path: String, name: String) -> Result<(), String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.remote_delete(&name)
        .map_err(|e| format!("Failed to remove remote: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn git_fetch(
    path: String,
    remote: String,
    branch: Option<String>,
    all: bool,
    prune: bool,
    tags: bool,
) -> Result<(), String> {
    let mut args = vec!["fetch".to_string()];
    
    if all {
        args.push("--all".to_string());
    } else {
        args.push(remote);
        if let Some(b) = branch {
            args.push(b);
        }
    }
    
    if prune {
        args.push("--prune".to_string());
    }
    
    if tags {
        args.push("--tags".to_string());
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git fetch: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_pull(
    path: String,
    remote: String,
    branch: Option<String>,
    rebase: bool,
) -> Result<PushPullResult, String> {
    let mut args = vec!["pull".to_string()];
    
    if rebase {
        args.push("--rebase".to_string());
    }
    
    args.push(remote);
    if let Some(b) = branch {
        args.push(b);
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;
    
    let success = output.status.success();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    Ok(PushPullResult {
        success,
        updated_files: vec![],
        errors: if success { vec![] } else { vec![stderr] },
    })
}

#[command]
pub async fn git_push(
    path: String,
    remote: String,
    branch: Option<String>,
    force: bool,
    set_upstream: bool,
    tags: bool,
) -> Result<PushPullResult, String> {
    let mut args = vec!["push".to_string()];
    
    if force {
        args.push("--force".to_string());
    }
    
    if set_upstream {
        args.push("--set-upstream".to_string());
    }
    
    if tags {
        args.push("--tags".to_string());
    }
    
    args.push(remote);
    if let Some(b) = branch {
        args.push(b);
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;
    
    let success = output.status.success();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    Ok(PushPullResult {
        success,
        updated_files: vec![],
        errors: if success { vec![] } else { vec![stderr] },
    })
}

// ============ History Operations ============

#[command]
pub async fn git_log(
    path: String,
    limit: usize,
    skip: usize,
    all: bool,
) -> Result<Vec<GitCommitInfo>, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    
    if all {
        revwalk
            .push_glob("refs/heads/*")
            .map_err(|e| format!("Failed to push glob: {}", e))?;
    } else {
        revwalk
            .push_head()
            .map_err(|e| format!("Failed to push HEAD: {}", e))?;
    }
    
    let commits: Vec<GitCommitInfo> = revwalk
        .skip(skip)
        .take(limit)
        .filter_map(|oid| oid.ok())
        .filter_map(|oid| repo.find_commit(oid).ok())
        .map(|commit| commit_to_info(&commit))
        .collect();
    
    Ok(commits)
}

fn commit_to_info(commit: &Commit) -> GitCommitInfo {
    let sha = commit.id().to_string();
    let message_full = commit.message().unwrap_or("");
    let mut lines = message_full.lines();
    let message = lines.next().unwrap_or("").to_string();
    let body: String = lines.collect::<Vec<_>>().join("\n");
    
    GitCommitInfo {
        sha: sha.clone(),
        short_sha: sha[..7.min(sha.len())].to_string(),
        message,
        body: if body.is_empty() { None } else { Some(body.trim().to_string()) },
        author: commit.author().name().unwrap_or("").to_string(),
        author_email: commit.author().email().unwrap_or("").to_string(),
        date: commit.time().seconds(),
        committer: commit.committer().name().unwrap_or("").to_string(),
        committer_email: commit.committer().email().unwrap_or("").to_string(),
        committer_date: commit.committer().when().seconds(),
        parents: commit.parent_ids().map(|id| id.to_string()).collect(),
        tree_id: commit.tree_id().to_string(),
    }
}

#[command]
pub async fn git_show_commit(path: String, sha: String) -> Result<GitCommitInfo, String> {
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let oid = Oid::from_str(&sha)
        .map_err(|e| format!("Invalid SHA: {}", e))?;
    
    let commit = repo
        .find_commit(oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;
    
    Ok(commit_to_info(&commit))
}

#[command]
pub async fn git_file_log(
    path: String,
    file: String,
    limit: usize,
) -> Result<Vec<GitCommitInfo>, String> {
    // Use CLI for file log (more efficient)
    let output = Command::new("git")
        .current_dir(&path)
        .args([
            "log",
            &format!("-{}", limit),
            "--format=%H|%s|%an|%ae|%at",
            "--",
            &file,
        ])
        .output()
        .map_err(|e| format!("Failed to run git log: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let commits = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 5 {
                Some(GitCommitInfo {
                    sha: parts[0].to_string(),
                    short_sha: parts[0][..7.min(parts[0].len())].to_string(),
                    message: parts[1].to_string(),
                    body: None,
                    author: parts[2].to_string(),
                    author_email: parts[3].to_string(),
                    date: parts[4].parse().unwrap_or(0),
                    committer: parts[2].to_string(),
                    committer_email: parts[3].to_string(),
                    committer_date: parts[4].parse().unwrap_or(0),
                    parents: vec![],
                    tree_id: String::new(),
                })
            } else {
                None
            }
        })
        .collect();
    
    Ok(commits)
}

// ============ Diff Operations ============

#[command]
pub async fn git_diff(
    path: String,
    file: Option<String>,
    staged: bool,
) -> Result<String, String> {
    let mut args = vec!["diff".to_string()];
    
    if staged {
        args.push("--cached".to_string());
    }
    
    if let Some(f) = file {
        args.push("--".to_string());
        args.push(f);
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[command]
pub async fn git_show_diff(path: String, sha: String) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["show", "--format=", &sha])
        .output()
        .map_err(|e| format!("Failed to run git show: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// ============ Stash Operations ============

#[command]
pub async fn git_stash_list(path: String) -> Result<Vec<GitStashInfo>, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["stash", "list", "--format=%gd|%gs|%H|%at"])
        .output()
        .map_err(|e| format!("Failed to run git stash list: {}", e))?;
    
    let stashes = String::from_utf8_lossy(&output.stdout)
        .lines()
        .enumerate()
        .filter_map(|(index, line)| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                Some(GitStashInfo {
                    index,
                    id: parts[0].to_string(),
                    message: parts[1].to_string(),
                    branch: String::new(),
                    commit: parts[2].to_string(),
                    date: parts[3].parse().unwrap_or(0),
                })
            } else {
                None
            }
        })
        .collect();
    
    Ok(stashes)
}

#[command]
pub async fn git_stash_push(
    path: String,
    message: Option<String>,
    include_untracked: bool,
    keep_index: bool,
) -> Result<(), String> {
    let mut args = vec!["stash", "push"];
    
    if include_untracked {
        args.push("--include-untracked");
    }
    
    if keep_index {
        args.push("--keep-index");
    }
    
    let msg;
    if let Some(m) = message {
        args.push("-m");
        msg = m;
        args.push(&msg);
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git stash: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_stash_apply(path: String, index: usize) -> Result<(), String> {
    let stash_ref = format!("stash@{{{}}}", index);
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(["stash", "apply", &stash_ref])
        .output()
        .map_err(|e| format!("Failed to run git stash apply: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_stash_pop(path: String, index: usize) -> Result<(), String> {
    let stash_ref = format!("stash@{{{}}}", index);
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(["stash", "pop", &stash_ref])
        .output()
        .map_err(|e| format!("Failed to run git stash pop: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_stash_drop(path: String, index: usize) -> Result<(), String> {
    let stash_ref = format!("stash@{{{}}}", index);
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(["stash", "drop", &stash_ref])
        .output()
        .map_err(|e| format!("Failed to run git stash drop: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_stash_clear(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["stash", "clear"])
        .output()
        .map_err(|e| format!("Failed to run git stash clear: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

// ============ Reset/Checkout Operations ============

#[command]
pub async fn git_reset(path: String, sha: String, mode: String) -> Result<(), String> {
    let mode_arg = match mode.as_str() {
        "soft" => "--soft",
        "hard" => "--hard",
        "merge" => "--merge",
        "keep" => "--keep",
        _ => "--mixed",
    };
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(["reset", mode_arg, &sha])
        .output()
        .map_err(|e| format!("Failed to run git reset: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_checkout_file(path: String, file: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["checkout", "--", &file])
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_revert(path: String, sha: String) -> Result<GitCommitResult, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["revert", "--no-edit", &sha])
        .output()
        .map_err(|e| format!("Failed to run git revert: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    // Get the new commit
    let repo = Repository::discover(&path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let commit = head.peel_to_commit().map_err(|e| format!("Failed to get commit: {}", e))?;
    
    Ok(commit_to_result(&commit))
}

// ============ Merge Operations ============

#[command]
pub async fn git_merge(
    path: String,
    branch: String,
    no_commit: bool,
    no_fast_forward: bool,
    squash: bool,
    message: Option<String>,
) -> Result<MergeResultInfo, String> {
    let mut args = vec!["merge".to_string()];
    
    if no_commit {
        args.push("--no-commit".to_string());
    }
    
    if no_fast_forward {
        args.push("--no-ff".to_string());
    }
    
    if squash {
        args.push("--squash".to_string());
    }
    
    if let Some(m) = message {
        args.push("-m".to_string());
        args.push(m);
    }
    
    args.push(branch);
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git merge: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    let success = output.status.success();
    let fast_forward = stdout.contains("Fast-forward");
    
    // Check for conflicts
    let conflicts = if !success && (stdout.contains("CONFLICT") || stderr.contains("CONFLICT")) {
        // Get list of conflicted files
        let status_output = Command::new("git")
            .current_dir(&path)
            .args(["diff", "--name-only", "--diff-filter=U"])
            .output()
            .ok();
        
        status_output
            .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect())
            .unwrap_or_default()
    } else {
        vec![]
    };
    
    Ok(MergeResultInfo {
        success,
        fast_forward,
        conflicts,
        message: if success { None } else { Some(stderr) },
    })
}

#[command]
pub async fn git_merge_abort(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["merge", "--abort"])
        .output()
        .map_err(|e| format!("Failed to run git merge --abort: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_conflicts(path: String) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["diff", "--name-only", "--diff-filter=U"])
        .output()
        .map_err(|e| format!("Failed to get conflicts: {}", e))?;
    
    let conflicts = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(String::from)
        .collect();
    
    Ok(conflicts)
}

// ============ Tag Operations ============

#[command]
pub async fn git_tags(path: String) -> Result<Vec<GitTagInfo>, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["tag", "-l", "--format=%(refname:short)|%(objectname:short)|%(contents:subject)"])
        .output()
        .map_err(|e| format!("Failed to run git tag: {}", e))?;
    
    let tags = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if !parts.is_empty() {
                Some(GitTagInfo {
                    name: parts[0].to_string(),
                    sha: parts.get(1).unwrap_or(&"").to_string(),
                    message: parts.get(2).map(|s| s.to_string()).filter(|s| !s.is_empty()),
                    is_annotated: parts.get(2).map(|s| !s.is_empty()).unwrap_or(false),
                })
            } else {
                None
            }
        })
        .collect();
    
    Ok(tags)
}

#[command]
pub async fn git_create_tag(
    path: String,
    name: String,
    sha: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let mut args = vec!["tag".to_string()];
    
    if let Some(m) = message {
        args.push("-a".to_string());
        args.push(name.clone());
        args.push("-m".to_string());
        args.push(m);
    } else {
        args.push(name.clone());
    }
    
    if let Some(s) = sha {
        args.push(s);
    }
    
    let output = Command::new("git")
        .current_dir(&path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run git tag: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

#[command]
pub async fn git_delete_tag(path: String, name: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["tag", "-d", &name])
        .output()
        .map_err(|e| format!("Failed to run git tag -d: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

// ============ Config Operations ============

#[command]
pub async fn git_config_get(path: String, key: String) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["config", "--get", &key])
        .output()
        .map_err(|e| format!("Failed to run git config: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[command]
pub async fn git_config_set(path: String, key: String, value: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["config", &key, &value])
        .output()
        .map_err(|e| format!("Failed to run git config: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(())
}

// ============ Blame Operations ============

#[command]
pub async fn git_blame(path: String, file: String) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["blame", "--porcelain", &file])
        .output()
        .map_err(|e| format!("Failed to run git blame: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// ============ Helper Commands ============

#[command]
pub async fn check_git_repository(path: String) -> Result<bool, String> {
    git_is_repository(path).await
}

#[command]
pub async fn find_git_root(path: String) -> Result<String, String> {
    match Repository::discover(&path) {
        Ok(repo) => {
            let workdir = repo.workdir().ok_or("No working directory")?;
            Ok(workdir.to_string_lossy().to_string())
        }
        Err(e) => Err(format!("Failed to find Git root: {}", e)),
    }
}

#[command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}
