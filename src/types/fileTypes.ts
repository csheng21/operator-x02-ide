// src/types/fileTypes.ts

/**
 * Interface for file information
 */
export interface FileInfo {
  path: string;    // Full path to the file
  content: string; // Content of the file
  name: string;    // File name (without path)
}

/**
 * Interface for directory entry
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: DirectoryEntry[];
}

/**
 * File operation result interface
 */
export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
}