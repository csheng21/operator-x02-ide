// src/ide/fileExplorer/types.ts

/**
 * Interface representing a file or directory in the file tree
 */
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  expanded?: boolean;
}

/**
 * Current file tree state - exported to be shared across modules
 */
export let fileStructure: FileNode[] = [];

/**
 * Update the file structure state
 */
export function updateFileStructure(newStructure: FileNode[]): void {
  fileStructure = newStructure;
}