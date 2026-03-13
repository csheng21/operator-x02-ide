// src/ide/vsc/vcsTypes.ts
// Type definitions for VCS (Version Control System)

export type VCSType = 'git' | 'svn' | 'none';

export interface VCSInfo {
  type: VCSType;
  path: string;
  isRepository: boolean;
  branch?: string;
  remote?: string;
}

export interface VCSFile {
  path: string;
  status: string;
  staged: boolean;
}

export interface VCSCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface VCSBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

// Git-specific types
export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
  index_status: string;
  work_tree_status: string;
}

export interface GitStatusResult {
  files: GitFileStatus[];
  branch: string;
  ahead: number;
  behind: number;
  remote: string | null;
  is_clean: boolean;
}

export interface GitCommitInfo {
  sha: string;
  short_sha: string;
  message: string;
  body: string | null;
  author: string;
  author_email: string;
  date: number;
  parents: string[];
}

export interface GitCommitResult {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: number;
}

export interface GitBranchInfo {
  name: string;
  full_name: string;
  is_current: boolean;
  is_remote: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export interface GitRemoteInfo {
  name: string;
  url: string;
  fetch_url: string;
  push_url: string;
}

export interface GitRepoInfo {
  path: string;
  branch: string;
  head_commit: string;
  is_detached: boolean;
  is_bare: boolean;
  remotes: GitRemoteInfo[];
}

export interface GitStashInfo {
  index: number;
  id: string;
  message: string;
  branch: string;
  commit: string;
  date: number;
}

export interface GitTagInfo {
  name: string;
  sha: string;
  message: string | null;
  is_annotated: boolean;
}

export interface MergeResultInfo {
  success: boolean;
  fast_forward: boolean;
  conflicts: string[];
  message: string | null;
}

export interface PushPullResult {
  success: boolean;
  updated_files: string[];
  errors: string[];
}
