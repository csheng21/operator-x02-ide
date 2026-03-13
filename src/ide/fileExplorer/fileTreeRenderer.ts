// src/ide/fileExplorer/fileTreeRenderer.ts
// ============================================================================
// ENHANCED FILE TREE RENDERER v4.0 - IDE/Terminal Density
// ============================================================================
// ✅ Monospace font with 20px compact row height
// ✅ Tree guide lines (│ ├─ └─) like terminal/IDE  
// ✅ Professional SVG icons (not emojis)
// ✅ Compact file sizes (5.1K instead of 5.1 kB)
// ✅ Right-aligned metadata
// ✅ Hover action buttons
// ✅ Full backward compatibility with existing code
// ============================================================================

import { FileNode } from './types';
import { setupFileClickHandlers, handleDirectoryClick } from './fileClickHandlers';
import { invoke } from '@tauri-apps/api/core';

// ✅ Polyfill for requestIdleCallback
const requestIdleCallback = (window as any).requestIdleCallback || 
  ((cb: Function) => setTimeout(cb, 1));

// ============================================================================
// SVG ICONS - Professional, crisp at any size
// ============================================================================

const FILE_ICONS: Record<string, string> = {
  // Default file
  default: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1.5A1.5 1.5 0 014.5 0h4.379a1.5 1.5 0 011.06.44l2.122 2.12A1.5 1.5 0 0112.5 3.622V14.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 14.5v-13z" fill="#6d8086"/></svg>`,
  
  // TypeScript/JavaScript
  ts: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6"/><path d="M5.5 7h5M8 7v5" stroke="#fff" stroke-width="1.5"/></svg>`,
  tsx: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6"/><path d="M5.5 7h5M8 7v5" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="4" r="2" fill="#61dafb"/></svg>`,
  js: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e"/><path d="M8 5v5c0 1-1 2-2 2M11 5v6" stroke="#323330" stroke-width="1.5"/></svg>`,
  jsx: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e"/><circle cx="12" cy="4" r="2" fill="#61dafb"/></svg>`,
  
  // Web
  html: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 1l1.2 13L8 16l4.8-2L14 1H2z" fill="#e44d26"/><path d="M8 3v11l3.6-1.5.9-9.5H8z" fill="#f16529"/></svg>`,
  css: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 1l1.2 13L8 16l4.8-2L14 1H2z" fill="#264de4"/><path d="M8 3v11l3.6-1.5.9-9.5H8z" fill="#2965f1"/></svg>`,
  scss: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#c6538c"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">S</text></svg>`,
  sass: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#c6538c"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">S</text></svg>`,
  less: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#1d365d"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">less</text></svg>`,
  
  // Data/Config
  json: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cbcb41"/><text x="8" y="11" text-anchor="middle" fill="#323330" font-size="7" font-weight="bold">{}</text></svg>`,
  yaml: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6">YML</text></svg>`,
  yml: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6">YML</text></svg>`,
  toml: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#9c4121"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5">TOML</text></svg>`,
  xml: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e37933"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6">XML</text></svg>`,
  
  // Languages
  py: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1c-3.9 0-3.5 1.7-3.5 1.7v1.8H8v.5H3s-2.4-.3-2.4 3.5S3 11 3 11h1.5V9s-.1-2.4 2.4-2.4h4.2s2.3 0 2.3-2.2V2.5S13.8 1 8 1z" fill="#3776ab"/><path d="M8 15c3.9 0 3.5-1.7 3.5-1.7v-1.8H8v-.5h5s2.4.3 2.4-3.5S13 4 13 4h-1.5v2s.1 2.4-2.4 2.4H4.9s-2.3 0-2.3 2.2v1.9S2.2 15 8 15z" fill="#ffd43b"/></svg>`,
  rs: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#dea584"/><text x="8" y="11" text-anchor="middle" fill="#000" font-size="8" font-weight="bold">R</text></svg>`,
  go: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#00add8"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">Go</text></svg>`,
  java: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#007396"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">J</text></svg>`,
  cpp: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#00599c"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">C++</text></svg>`,
  c: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a8b9cc"/><text x="8" y="11" text-anchor="middle" fill="#000" font-size="9" font-weight="bold">C</text></svg>`,
  h: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a8b9cc"/><text x="8" y="11" text-anchor="middle" fill="#000" font-size="9" font-weight="bold">H</text></svg>`,
  hpp: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#00599c"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6">H++</text></svg>`,
  cs: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#68217a"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">C#</text></svg>`,
  php: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="7" ry="5" fill="#777bb3"/><text x="8" y="10" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">PHP</text></svg>`,
  rb: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#cc342d"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">rb</text></svg>`,
  swift: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f05138"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">Swift</text></svg>`,
  kt: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#7f52ff"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">K</text></svg>`,
  
  // Markdown/Text
  md: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1" fill="#519aba"/><path d="M3 6v4l1.5-2 1.5 2V6M9 6v4h2" stroke="#fff" stroke-width="1.2"/></svg>`,
  txt: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1.5A1.5 1.5 0 014.5 0h4.379a1.5 1.5 0 011.06.44l2.122 2.12A1.5 1.5 0 0112.5 3.622V14.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 14.5v-13z" fill="#6d8086"/><path d="M5 6h6M5 8h6M5 10h4" stroke="#fff" stroke-width="1"/></svg>`,
  
  // Images
  png: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><circle cx="5" cy="5" r="1.5" fill="#fff"/><path d="M2 12l3-4 2 2 3-3 4 5H2z" fill="#fff" fill-opacity="0.8"/></svg>`,
  jpg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><circle cx="5" cy="5" r="1.5" fill="#fff"/><path d="M2 12l3-4 2 2 3-3 4 5H2z" fill="#fff" fill-opacity="0.8"/></svg>`,
  jpeg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><circle cx="5" cy="5" r="1.5" fill="#fff"/><path d="M2 12l3-4 2 2 3-3 4 5H2z" fill="#fff" fill-opacity="0.8"/></svg>`,
  gif: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">GIF</text></svg>`,
  svg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#ffb13b"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">SVG</text></svg>`,
  webp: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="4" font-weight="bold">WEBP</text></svg>`,
  ico: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#a074c4"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">ICO</text></svg>`,
  
  // Shell/Scripts
  sh: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4eaa25"/><path d="M4 5l3 3-3 3M8 11h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  bash: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4eaa25"/><path d="M4 5l3 3-3 3M8 11h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  bat: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#c1f12e"/><path d="M4 5l3 3-3 3M8 11h4" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  ps1: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#012456"/><path d="M4 5l3 3-3 3M8 11h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  
  // Git
  gitignore: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#f14e32"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">.git</text></svg>`,
  
  // Lock files  
  lock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1" fill="#6d8086"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#6d8086" stroke-width="2" fill="none"/></svg>`,
  
  // SQL
  sql: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="6" ry="2" fill="#e38c00"/><path d="M2 4v8c0 1.1 2.7 2 6 2s6-.9 6-2V4" stroke="#e38c00" stroke-width="1.5" fill="none"/></svg>`,
  
  // Docker
  dockerfile: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#2496ed"/><path d="M3 8h2v2H3zM6 8h2v2H6zM9 8h2v2H9zM6 5h2v2H6z" fill="#fff"/></svg>`,
  
  // Env
  env: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#ecd53f"/><text x="8" y="11" text-anchor="middle" fill="#000" font-size="5" font-weight="bold">ENV</text></svg>`,
  
  // Vue/Svelte
  vue: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14L1 3h3l4 7 4-7h3L8 14z" fill="#41b883"/><path d="M8 10L5 5h6L8 10z" fill="#34495e"/></svg>`,
  svelte: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#ff3e00"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">S</text></svg>`,
  
  // PDF
  pdf: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#e53935"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">PDF</text></svg>`,
  
  // Archives
  zip: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#6d8086"/><path d="M7 3h2v2H7zM7 6h2v2H7zM7 9h2v4H7z" fill="#fff"/></svg>`,
  tar: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#6d8086"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">TAR</text></svg>`,
  gz: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" fill="#6d8086"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">GZ</text></svg>`,
};

const FOLDER_ICONS = {
  closed: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#dcb67a"/></svg>`,
  open: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v1H3.5L1.5 13V3z" fill="#dcb67a"/><path d="M2.5 6h12l-2 7.5H.5L2.5 6z" fill="#e8c77b"/></svg>`,
  src: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#6d8086"/></svg>`,
  node_modules: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#8bc500"/></svg>`,
  git: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#f14e32"/></svg>`,
  dist: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#4caf50"/></svg>`,
  assets: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3A1.5 1.5 0 013 1.5h3.379a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H13a1.5 1.5 0 011.5 1.5v8.293a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3z" fill="#a074c4"/></svg>`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get file icon SVG by extension
 */
export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const baseName = fileName.toLowerCase();
  
  // Special files
  if (baseName === '.gitignore' || baseName === '.gitattributes') return FILE_ICONS.gitignore;
  if (baseName === 'dockerfile' || baseName.startsWith('dockerfile.')) return FILE_ICONS.dockerfile;
  if (baseName.endsWith('.lock') || baseName === 'package-lock.json' || baseName === 'yarn.lock') return FILE_ICONS.lock;
  if (baseName.startsWith('.env')) return FILE_ICONS.env;
  
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

/**
 * Get folder icon SVG
 */
export function getFolderIcon(isExpanded: boolean, name?: string): string {
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName === 'src' || lowerName === 'source') return FOLDER_ICONS.src;
    if (lowerName === 'node_modules') return FOLDER_ICONS.node_modules;
    if (lowerName === '.git') return FOLDER_ICONS.git;
    if (lowerName === 'dist' || lowerName === 'build' || lowerName === 'out') return FOLDER_ICONS.dist;
    if (lowerName === 'assets' || lowerName === 'images' || lowerName === 'img') return FOLDER_ICONS.assets;
  }
  return isExpanded ? FOLDER_ICONS.open : FOLDER_ICONS.closed;
}

/**
 * Format file size in compact format (IDE style)
 */
function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '';
  
  const units = ['B', 'K', 'M', 'G'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  if (unitIndex === 0) {
    return `${Math.round(size)}B`;
  }
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Normalize path for comparison - convert all slashes to forward slashes and lowercase for Windows
 */
function normalizePath(path: string): string {
  if (!path) return path;
  // Convert backslashes to forward slashes AND lowercase for case-insensitive Windows paths
  return path.replace(/\\/g, '/').toLowerCase();
}

// ============================================================================
// MODIFIED FILES TRACKING
// ============================================================================

interface ModifiedFilesTracker {
  modifiedFiles: Set<string>;
  savedFiles: Set<string>;
  addModified: (path: string) => void;
  removeModified: (path: string) => void;
  isModified: (path: string) => boolean;
  updateTreeDisplay: () => void;
  markAsSaved: (path: string) => void;
}

const modifiedTracker: ModifiedFilesTracker = {
  modifiedFiles: new Set<string>(),
  savedFiles: new Set<string>(),
  
  addModified(path: string) {
    const normalizedPath = normalizePath(path);
    this.savedFiles.delete(normalizedPath);
    this.modifiedFiles.add(normalizedPath);
    this.updateTreeDisplay();
  },
  
  removeModified(path: string) {
    const normalizedPath = normalizePath(path);
    this.modifiedFiles.delete(normalizedPath);
    this.markAsSaved(normalizedPath);
  },
  
  markAsSaved(path: string) {
    const normalizedPath = normalizePath(path);
    this.savedFiles.add(normalizedPath);
    this.updateTreeDisplay();
    
    setTimeout(() => {
      this.savedFiles.delete(normalizedPath);
      this.updateTreeDisplay();
    }, 3000);
  },
  
  isModified(path: string): boolean {
    return this.modifiedFiles.has(normalizePath(path));
  },
  
  updateTreeDisplay() {
    document.querySelectorAll('.tree-row[data-path]').forEach(item => {
      const itemPath = (item as HTMLElement).dataset.path;
      if (!itemPath) return;
      
      const normalizedPath = normalizePath(itemPath);
      const statusEl = item.querySelector('.file-status');
      const nameEl = item.querySelector('.tree-name');
      
      // Reset state
      item.classList.remove('modified', 'saved');
      if (statusEl) statusEl.innerHTML = '';
      if (nameEl) {
        (nameEl as HTMLElement).style.color = '';
        (nameEl as HTMLElement).style.fontStyle = '';
      }
      
      // Apply state
      if (this.savedFiles.has(normalizedPath)) {
        item.classList.add('saved');
        if (statusEl) statusEl.innerHTML = '<span class="status-saved">●</span>';
        if (nameEl) (nameEl as HTMLElement).style.color = '#89d185';
      } else if (this.modifiedFiles.has(normalizedPath)) {
        item.classList.add('modified');
        if (statusEl) statusEl.innerHTML = '<span class="status-modified">●</span>';
        if (nameEl) {
          (nameEl as HTMLElement).style.color = '#e2c08d';
          (nameEl as HTMLElement).style.fontStyle = 'italic';
        }
      }
    });
  }
};

// Export tracker globally
(window as any).__modifiedFilesTracker = modifiedTracker;

// ============================================================================
// VIEW MODES (backward compatibility)
// ============================================================================

export enum ViewMode {
  ALL = 'all',
  NO_CODE = 'no-code',
  STRUCTURE = 'structure',
  MINIMAL = 'minimal',
  CODE_ONLY = 'code-only',
}

// ============================================================================
// SORT MODES
// ============================================================================

export enum SortMode {
  NAME_ASC = 'name-asc',      // A-Z
  NAME_DESC = 'name-desc',    // Z-A
  SIZE_DESC = 'size-desc',    // Largest first
  SIZE_ASC = 'size-asc',      // Smallest first
  DATE_DESC = 'date-desc',    // Newest first
  DATE_ASC = 'date-asc',      // Oldest first
  TYPE = 'type',              // Group by extension
}

const SORT_OPTIONS: { mode: SortMode; label: string; icon: string }[] = [
  { mode: SortMode.NAME_ASC, label: 'A-Z', icon: '🔤' },
  { mode: SortMode.NAME_DESC, label: 'Z-A', icon: '🔤' },
  { mode: SortMode.SIZE_DESC, label: 'Size ↓', icon: '📊' },
  { mode: SortMode.SIZE_ASC, label: 'Size ↑', icon: '📊' },
  { mode: SortMode.DATE_DESC, label: 'Newest', icon: '🕐' },
  { mode: SortMode.DATE_ASC, label: 'Oldest', icon: '🕐' },
  { mode: SortMode.TYPE, label: 'Type', icon: '📁' },
];

const FILE_TYPES = {
  code: new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.r', '.m', '.h', '.hpp', '.vue', '.svelte']),
  docs: new Set(['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.tex', '.org', '.rst', '.adoc']),
  config: new Set(['.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.config', '.properties', '.xml', '.gitignore', '.dockerignore', '.editorconfig']),
  media: new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.mp4', '.webm', '.mp3', '.wav']),
  style: new Set(['.css', '.scss', '.sass', '.less', '.styl'])
};

// ============================================================================
// TREE STATE
// ============================================================================

interface TreeState {
  viewMode: ViewMode;
  sortMode: SortMode;
  expandedFolders: Set<string>;
  hiddenExtensions: Set<string>;
  searchFilter: string;
  showHiddenFiles: boolean;
  folderViewModes: Map<string, ViewMode>;
}

let treeState: TreeState = {
  viewMode: ViewMode.ALL,
  sortMode: SortMode.NAME_ASC,
  expandedFolders: new Set(),
  hiddenExtensions: new Set(),
  searchFilter: '',
  showHiddenFiles: false,
  folderViewModes: new Map()
};

let currentFiles: FileNode[] = [];

// Load saved state
function loadTreeState(): void {
  try {
    const saved = localStorage.getItem('tree-expanded-folders-v4');
    if (saved) {
      treeState.expandedFolders = new Set(JSON.parse(saved));
    }
    // Load saved sort mode
    const savedSort = localStorage.getItem('tree-sort-mode');
    if (savedSort && Object.values(SortMode).includes(savedSort as SortMode)) {
      treeState.sortMode = savedSort as SortMode;
    }
  } catch (e) {
    console.warn('Failed to load tree state');
  }
}

function saveTreeState(): void {
  try {
    localStorage.setItem('tree-expanded-folders-v4', JSON.stringify([...treeState.expandedFolders]));
  } catch (e) {
    console.warn('Failed to save tree state');
  }
}

loadTreeState();

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : '';
}

function shouldShowFile(file: FileNode, parentPath: string = ''): boolean {
  if (file.isDirectory && treeState.viewMode !== ViewMode.MINIMAL) {
    return true;
  }
  
  if (treeState.searchFilter && !file.name.toLowerCase().includes(treeState.searchFilter.toLowerCase())) {
    return false;
  }
  
  if (!treeState.showHiddenFiles && file.name.startsWith('.')) {
    return false;
  }
  
  const effectiveViewMode = treeState.folderViewModes.get(parentPath) || treeState.viewMode;
  const ext = getFileExtension(file.name);
  
  switch (effectiveViewMode) {
    case ViewMode.ALL: return true;
    case ViewMode.NO_CODE: return !FILE_TYPES.code.has(ext) && !FILE_TYPES.style.has(ext);
    case ViewMode.STRUCTURE: return file.isDirectory;
    case ViewMode.MINIMAL: return file.isDirectory || FILE_TYPES.docs.has(ext) || FILE_TYPES.config.has(ext);
    case ViewMode.CODE_ONLY: return file.isDirectory || FILE_TYPES.code.has(ext) || FILE_TYPES.style.has(ext);
    default: return true;
  }
}

function countVisibleFiles(files: FileNode[], parentPath: string = ''): number {
  return files.filter(file => shouldShowFile(file, parentPath)).length;
}

// ============================================================================
// VIEW MODE MANAGEMENT
// ============================================================================

export function setViewMode(mode: ViewMode, folderPath?: string): void {
  if (folderPath) {
    treeState.folderViewModes.set(folderPath, mode);
  } else {
    treeState.viewMode = mode;
    treeState.folderViewModes.clear();
  }
  
  const container = document.getElementById('file-tree');
  if (container && currentFiles) {
    renderFileTree(container, currentFiles);
  }
  
  showViewModeNotification(mode);
}

export function toggleCodeFiles(): void {
  const newMode = treeState.viewMode === ViewMode.NO_CODE ? ViewMode.ALL : ViewMode.NO_CODE;
  setViewMode(newMode);
}

export function cycleViewMode(folderPath?: string): ViewMode {
  const modes = [ViewMode.ALL, ViewMode.NO_CODE, ViewMode.STRUCTURE, ViewMode.MINIMAL, ViewMode.CODE_ONLY];
  const currentMode = folderPath ? (treeState.folderViewModes.get(folderPath) || treeState.viewMode) : treeState.viewMode;
  const currentIndex = modes.indexOf(currentMode);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  setViewMode(nextMode, folderPath);
  return nextMode;
}

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

/**
 * Set the sort mode and re-render
 */
export function setSortMode(mode: SortMode): void {
  treeState.sortMode = mode;
  localStorage.setItem('tree-sort-mode', mode);
  
  const container = document.getElementById('file-tree');
  if (container && currentFiles) {
    renderFileTree(container, currentFiles);
  }
  // Notification removed per user request
}

/**
 * Sort files according to current sort mode
 */
function sortFiles(files: FileNode[]): FileNode[] {
  const sorted = [...files];
  
  // Always keep directories first, then sort within each group
  sorted.sort((a, b) => {
    // Directories always first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    
    // Then sort within same type
    switch (treeState.sortMode) {
      case SortMode.NAME_ASC:
        return a.name.localeCompare(b.name);
        
      case SortMode.NAME_DESC:
        return b.name.localeCompare(a.name);
        
      case SortMode.SIZE_DESC:
        return (b.size || 0) - (a.size || 0);
        
      case SortMode.SIZE_ASC:
        return (a.size || 0) - (b.size || 0);
        
      case SortMode.DATE_DESC:
        return (b.modified || 0) - (a.modified || 0);
        
      case SortMode.DATE_ASC:
        return (a.modified || 0) - (b.modified || 0);
        
      case SortMode.TYPE:
        const extA = a.name.includes('.') ? a.name.split('.').pop()?.toLowerCase() || '' : '';
        const extB = b.name.includes('.') ? b.name.split('.').pop()?.toLowerCase() || '' : '';
        if (extA !== extB) return extA.localeCompare(extB);
        return a.name.localeCompare(b.name);
        
      default:
        return a.name.localeCompare(b.name);
    }
  });
  
  return sorted;
}

// Sort notification removed per user request

function showViewModeNotification(mode: ViewMode): void {
  const messages: Record<ViewMode, string> = {
    [ViewMode.ALL]: '📋 Showing all files',
    [ViewMode.NO_CODE]: '📄 Hiding code files',
    [ViewMode.STRUCTURE]: '🗂️ Showing structure only',
    [ViewMode.MINIMAL]: '📝 Showing docs & configs only',
    [ViewMode.CODE_ONLY]: '💻 Showing code files only'
  };
  
  let notification = document.getElementById('view-mode-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'view-mode-notification';
    notification.className = 'view-mode-notification';
    document.body.appendChild(notification);
  }
  
  notification.textContent = messages[mode];
  notification.className = 'view-mode-notification show';
  
  setTimeout(() => {
    notification!.className = 'view-mode-notification';
  }, 2000);
}

// ============================================================================
// STYLES - IDE/Terminal Density
// ============================================================================

const TREE_STYLES = `
/* IDE/Terminal Density File Tree v4.0 */
.ide-file-tree {
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1;
  color: #cccccc;
  background: #1e1e1e;
  user-select: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.tree-row {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 8px 0 0;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
}

.tree-row:hover { background: rgba(255, 255, 255, 0.04); }
.tree-row.selected { background: rgba(0, 122, 204, 0.2); }

/* Tree Guide Lines */
.tree-indent { display: inline-flex; align-items: center; height: 100%; }
.tree-guide { display: inline-block; width: 16px; height: 20px; position: relative; flex-shrink: 0; }
.tree-guide.line::before { content: ''; position: absolute; left: 7px; top: 0; width: 1px; height: 100%; background: #3c3c3c; }
.tree-guide.branch::before { content: ''; position: absolute; left: 7px; top: 0; width: 1px; height: 10px; background: #3c3c3c; }
.tree-guide.branch::after { content: ''; position: absolute; left: 7px; top: 10px; width: 9px; height: 1px; background: #3c3c3c; }
.tree-guide.last::before { content: ''; position: absolute; left: 7px; top: 0; width: 1px; height: 10px; background: #3c3c3c; }
.tree-guide.last::after { content: ''; position: absolute; left: 7px; top: 10px; width: 9px; height: 1px; background: #3c3c3c; }

/* Chevron */
.tree-chevron { width: 16px; height: 20px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #858585; font-size: 8px; transition: transform 0.1s ease; }
.tree-chevron.expanded { transform: rotate(90deg); }
.tree-chevron.hidden { visibility: hidden; }

/* Icon */
.tree-icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
.tree-icon svg { width: 16px; height: 16px; }

/* Names */
.tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
.tree-folder .tree-name { color: #dcb67a; }
.tree-file .tree-name { color: #cccccc; }

/* File Size */
.tree-size { color: #6a6a6a; font-size: 11px; margin-left: auto; padding-right: 4px; flex-shrink: 0; min-width: 40px; text-align: right; }

/* Status Indicators */
.file-status { width: 16px; flex-shrink: 0; text-align: center; }
.status-modified { color: #e2c08d; font-size: 8px; animation: pulse 2s infinite; }
.status-saved { color: #89d185; font-size: 8px; animation: fadeOut 3s forwards; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes fadeOut { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }

.tree-file.modified .tree-name { color: #e2c08d; font-style: italic; }
.tree-file.saved .tree-name { color: #89d185; }

/* Hover Actions */
.tree-actions { display: none; gap: 2px; margin-left: 4px; }
.tree-row:hover .tree-actions { display: flex; }
.tree-row:hover .tree-size { display: none; }
.tree-action-btn { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #858585; cursor: pointer; border-radius: 3px; font-size: 12px; padding: 0; }
.tree-action-btn:hover { background: rgba(255, 255, 255, 0.1); color: #cccccc; }
.tree-action-btn.danger:hover { background: rgba(244, 67, 54, 0.2); color: #f44336; }

/* Children Container */
.tree-children { display: none; }
.tree-children.expanded { display: block; }

/* Search Box */
.tree-search-box { padding: 4px 8px; background: #252526; border-bottom: 1px solid #3c3c3c; }
.tree-search-input { width: 100%; height: 22px; padding: 0 8px; background: #3c3c3c; border: 1px solid #3c3c3c; border-radius: 2px; color: #cccccc; font-family: inherit; font-size: 12px; }
.tree-search-input:focus { outline: none; border-color: #007acc; }
.tree-search-input::placeholder { color: #6a6a6a; }

/* View Mode Buttons Row */
.tree-view-buttons { display: flex; align-items: center; gap: 3px; padding: 6px 10px; background: #252526; border-bottom: 1px solid #3c3c3c; }
.tree-view-btn { padding: 4px 8px; font-size: 11px; background: transparent; border: none; border-radius: 3px; color: #888; cursor: pointer; transition: all 0.15s; }
.tree-view-btn:hover { background: #3c3c3c; color: #e0e0e0; }
.tree-view-btn.active { background: #094771; color: #fff; }

/* More Button */
.tree-more-btn { 
  background: #3c3c3c; 
  border: none; 
  color: #888; 
  padding: 4px 8px; 
  font-size: 11px; 
  border-radius: 3px; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  margin-left: auto; 
  transition: all 0.2s; 
}
.tree-more-btn:hover { background: #4a4a4a; color: #e0e0e0; }
.tree-more-btn.expanded { background: #094771; color: #fff; }
.tree-more-btn .arrow { font-size: 8px; transition: transform 0.3s ease; }
.tree-more-btn.expanded .arrow { transform: rotate(180deg); }

/* Collapsible Filter Bar */
.tree-filter-bar { 
  max-height: 0; 
  overflow: hidden; 
  opacity: 0;
  background: #2d2d30; 
  border-bottom: 1px solid transparent;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.25s ease,
              border-color 0.3s ease;
}
.tree-filter-bar.expanded { 
  max-height: 50px; 
  padding: 8px 10px; 
  opacity: 1;
  border-bottom-color: #3c3c3c;
}
.tree-filter-bar-content { display: flex; align-items: center; gap: 8px; }
.tree-filter-input { 
  flex: 1; 
  background: #3c3c3c; 
  border: 1px solid transparent; 
  border-radius: 4px; 
  padding: 5px 10px; 
  color: #e0e0e0; 
  font-size: 12px; 
  font-family: inherit;
  transition: all 0.2s; 
}
.tree-filter-input:focus { outline: none; border-color: #007acc; background: #1e1e1e; }
.tree-filter-input::placeholder { color: #6a6a6a; }
.tree-sort-dropdown { 
  background: #3c3c3c; 
  border: 1px solid transparent; 
  border-radius: 4px; 
  padding: 5px 8px; 
  color: #e0e0e0; 
  font-size: 11px; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.tree-sort-dropdown:hover { background: #4a4a4a; }
.tree-sort-dropdown:focus { outline: none; border-color: #007acc; }

/* Legacy Search Box - Hidden */
.tree-search-box { display: none; }

/* Empty & File Count */
.tree-empty { padding: 20px; text-align: center; color: #6a6a6a; font-style: italic; }
.tree-count { font-size: 10px; color: #6a6a6a; margin-left: 4px; }

/* Scrollbar */
.ide-file-tree::-webkit-scrollbar { width: 10px; }
.ide-file-tree::-webkit-scrollbar-track { background: #1e1e1e; }
.ide-file-tree::-webkit-scrollbar-thumb { background: #424242; border: 2px solid #1e1e1e; border-radius: 5px; }
.ide-file-tree::-webkit-scrollbar-thumb:hover { background: #4f4f4f; }

/* View mode notification */
.view-mode-notification { position: fixed; bottom: 20px; right: 20px; padding: 8px 16px; background: #1e1e1e; color: #cccccc; border: 1px solid #464647; border-radius: 4px; opacity: 0; transform: translateY(10px); transition: all 0.3s; pointer-events: none; z-index: 1000; font-size: 13px; font-family: inherit; }
.view-mode-notification.show { opacity: 1; transform: translateY(0); }
`;

function injectTreeStyles(): void {
  if (document.getElementById('ide-file-tree-styles-v4')) return;
  
  const style = document.createElement('style');
  style.id = 'ide-file-tree-styles-v4';
  style.textContent = TREE_STYLES;
  document.head.appendChild(style);
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

/**
 * Render a single file or folder node with filtering
 * Exported for backward compatibility
 */
export function renderFileNode(file: FileNode, depth: number = 0, parentPath: string = ''): HTMLLIElement | null {
  // Wrapper for backward compatibility - calls internal renderTreeNode
  const node = renderTreeNodeInternal(file, depth, false, []);
  return node as HTMLLIElement | null;
}

function renderTreeNodeInternal(
  file: FileNode,
  depth: number,
  isLast: boolean,
  parentIsLast: boolean[]
): HTMLElement | null {
  
  if (!shouldShowFile(file)) {
    return null;
  }
  
  const row = document.createElement('div');
  row.className = `tree-row ${file.isDirectory ? 'tree-folder folder-item' : 'tree-file file-item'}`;
  row.dataset.path = file.path;
  row.dataset.name = file.name;
  
  // Build indent with guide lines
  const indent = document.createElement('span');
  indent.className = 'tree-indent';
  
  for (let i = 0; i < depth; i++) {
    const guide = document.createElement('span');
    guide.className = 'tree-guide';
    if (i < parentIsLast.length && !parentIsLast[i]) {
      guide.classList.add('line');
    }
    indent.appendChild(guide);
  }
  
  if (depth > 0) {
    const connector = document.createElement('span');
    connector.className = `tree-guide ${isLast ? 'last' : 'branch'}`;
    indent.appendChild(connector);
  }
  
  row.appendChild(indent);
  
  // Chevron
  const chevron = document.createElement('span');
  chevron.className = 'tree-chevron';
  if (file.isDirectory) {
    chevron.textContent = '▶';
    if (treeState.expandedFolders.has(file.path)) {
      chevron.classList.add('expanded');
    }
  } else {
    chevron.classList.add('hidden');
  }
  row.appendChild(chevron);
  
  // Icon
  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  if (file.isDirectory) {
    icon.innerHTML = getFolderIcon(treeState.expandedFolders.has(file.path), file.name);
  } else {
    icon.innerHTML = getFileIcon(file.name);
  }
  row.appendChild(icon);
  
  // Name
  const name = document.createElement('span');
  name.className = 'tree-name';
  name.textContent = file.name;
  
  // File count for directories
  if (file.isDirectory && file.children) {
    const visibleCount = countVisibleFiles(file.children, file.path);
    const totalCount = file.children.length;
    if (visibleCount < totalCount || totalCount > 0) {
      const count = document.createElement('span');
      count.className = 'tree-count';
      count.textContent = `(${visibleCount})`;
      name.appendChild(count);
    }
  }
  
  row.appendChild(name);
  
  // Status indicator
  const status = document.createElement('span');
  status.className = 'file-status';
  if (!file.isDirectory && modifiedTracker.isModified(file.path)) {
    status.innerHTML = '<span class="status-modified">●</span>';
    row.classList.add('modified');
  }
  row.appendChild(status);
  
  // File size
  if (!file.isDirectory && file.size !== undefined) {
    const size = document.createElement('span');
    size.className = 'tree-size';
    size.textContent = formatFileSize(file.size);
    row.appendChild(size);
  }
  
  // Hover actions
  const actions = document.createElement('div');
  actions.className = 'tree-actions';
  
  const renameBtn = document.createElement('button');
  renameBtn.className = 'tree-action-btn';
  renameBtn.innerHTML = '✎';
  renameBtn.title = 'Rename';
  renameBtn.onclick = (e) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('file-rename', { detail: { path: file.path, name: file.name, isDirectory: file.isDirectory } }));
  };
  actions.appendChild(renameBtn);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'tree-action-btn danger';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = 'Delete';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('file-delete', { detail: { path: file.path, name: file.name, isDirectory: file.isDirectory } }));
  };
  actions.appendChild(deleteBtn);
  
  row.appendChild(actions);
  
  // Container
  const container = document.createElement('div');
  container.className = 'tree-node';
  container.appendChild(row);
  
  // Children
  if (file.isDirectory && file.children && file.children.length > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = `tree-children ${treeState.expandedFolders.has(file.path) ? 'expanded' : ''}`;
    
    // Apply current sort mode to children
    const sortedChildren = sortFiles(file.children);
    
    const visibleChildren = sortedChildren.filter(child => shouldShowFile(child, file.path));
    
    visibleChildren.forEach((child, index) => {
      const childIsLast = index === visibleChildren.length - 1;
      const newParentIsLast = [...parentIsLast, isLast];
      const childNode = renderTreeNodeInternal(child, depth + 1, childIsLast, newParentIsLast);
      if (childNode) {
        childrenContainer.appendChild(childNode);
      }
    });
    
    if (childrenContainer.children.length > 0) {
      container.appendChild(childrenContainer);
    }
  }
  
  // Click handlers
  row.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (file.isDirectory) {
      // Toggle folder
      if (treeState.expandedFolders.has(file.path)) {
        treeState.expandedFolders.delete(file.path);
      } else {
        treeState.expandedFolders.add(file.path);
      }
      saveTreeState();
      
      chevron.classList.toggle('expanded');
      icon.innerHTML = getFolderIcon(treeState.expandedFolders.has(file.path), file.name);
      const children = container.querySelector('.tree-children');
      if (children) {
        children.classList.toggle('expanded');
      }
      
      // ✅ Preload files when folder is expanded (background, non-blocking)
      if (treeState.expandedFolders.has(file.path) && file.children) {
        requestIdleCallback(() => {
          const preload = (window as any).preloadFileContent;
          if (preload) {
            file.children?.filter(c => !c.isDirectory).slice(0, 5).forEach(child => {
              preload(child.path);
            });
          }
        });
      }
      
      // Dispatch folder event
      document.dispatchEvent(new CustomEvent('folder-selected', {
        detail: { path: file.path, name: file.name, expanded: treeState.expandedFolders.has(file.path) }
      }));
    } else {
      // Open file using tabManager
      openFile(file.path);
    }
  });
  
  // Context menu
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('file-context-menu', {
      detail: { path: file.path, name: file.name, isDirectory: file.isDirectory, event: e }
    }));
  });
  
  return container;
}

/**
 * Create project header with close project and refresh buttons
 */
function createProjectHeader(files: FileNode[]): HTMLElement {
  const header = document.createElement('div');
  header.className = 'tree-project-header';
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: linear-gradient(180deg, #2d2d30 0%, #252526 100%);
    border-bottom: 1px solid #3c3c3c;
    font-size: 11px;
    color: #cccccc;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-height: 32px;
    box-sizing: border-box;
  `;
  
  // Get project name from currentFolderPath (most reliable source)
  let projectName = 'Project';
  const currentPath = (window as any).currentFolderPath || localStorage.getItem('ide_last_project_path') || '';
  
  if (currentPath) {
    // Use the opened folder path
    const parts = currentPath.replace(/\\/g, '/').split('/').filter((p: string) => p);
    projectName = parts[parts.length - 1] || 'Project';
  } else if (files.length > 0 && files[0].path) {
    // Fallback to first file path
    const parts = files[0].path.replace(/\\/g, '/').split('/');
    const srcIndex = parts.indexOf('src');
    if (srcIndex > 0) {
      projectName = parts[srcIndex - 1];
    } else if (parts.length > 1) {
      projectName = parts[parts.length - 2] || parts[parts.length - 1];
    }
  }
  
  // === LEFT SIDE: Project name ===
  const nameSpan = document.createElement('span');
  nameSpan.className = 'project-name';
  nameSpan.textContent = projectName;
  nameSpan.style.cssText = `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
    min-width: 50px;
  `;
  header.appendChild(nameSpan);
  
  // === RIGHT SIDE: AI Badge + Search + Buttons ===
  const rightContainer = document.createElement('div');
  rightContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  `;
  
  // --- AI DROPDOWN (Professional Design) ---
  const aiContainer = document.createElement('div');
  aiContainer.id = 'tree-ai-badge';
  aiContainer.className = 'tree-ai-badge';
  aiContainer.style.cssText = 'position: relative; display: inline-flex; align-items: center;';
  
  const aiBadge = document.createElement('span');
  aiBadge.className = 'ai-dropdown-trigger';
  
  // Check AI state
  const isAIEnabled = () => {
    if (typeof (window as any).aiFileExplorerEnabled === 'boolean') {
      return (window as any).aiFileExplorerEnabled;
    }
    return localStorage.getItem('aiFileExplorerEnabled') === 'true';
  };
  
  const updateBadge = () => {
    const on = isAIEnabled();
    aiBadge.innerHTML = on 
      ? `<span style="color:#4fc3f7;">●</span><span style="color:#4fc3f7;margin-left:3px;">AI</span><span style="color:#4fc3f7;font-size:8px;margin-left:3px;">▾</span>`
      : `<span style="color:#888;">AI</span><span style="color:#666;font-size:8px;margin-left:3px;">▾</span>`;
    aiBadge.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 3px 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      background: linear-gradient(180deg, #3c3c3c 0%, #2d2d30 100%);
      border: 1px solid #4a4a4a;
      border-radius: 4px;
      transition: all 0.15s ease;
      user-select: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;
    aiBadge.title = 'AI Tools';
  };
  
  updateBadge();
  
  // Hover effect
  aiBadge.onmouseover = () => { 
    aiBadge.style.background = 'linear-gradient(180deg, #4a4a4a 0%, #3c3c3c 100%)';
    aiBadge.style.borderColor = '#5a5a5a';
  };
  aiBadge.onmouseout = () => { 
    aiBadge.style.background = 'linear-gradient(180deg, #3c3c3c 0%, #2d2d30 100%)';
    aiBadge.style.borderColor = '#4a4a4a';
  };
  
  // Create professional dropdown menu
  const createDropdown = () => {
    document.querySelectorAll('.ai-header-dropdown').forEach(d => d.remove());
    
    // Get badge position for dropdown placement
    const badgeRect = aiBadge.getBoundingClientRect();
    
    // Add animation keyframes if not exists
    if (!document.getElementById('ai-dropdown-animation')) {
      const style = document.createElement('style');
      style.id = 'ai-dropdown-animation';
      style.textContent = `
        @keyframes aiDropdownSlideIn {
          0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiDropdownGlow {
          0% { box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px #4fc3f7; }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 8px 1px rgba(79,195,247,0.4); }
          100% { box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,195,247,0.3); }
        }
      `;
      document.head.appendChild(style);
    }
    
    const dropdown = document.createElement('div');
    dropdown.className = 'ai-header-dropdown';
    dropdown.style.cssText = `
      position: fixed;
      top: ${badgeRect.bottom + 6}px;
      left: ${badgeRect.left}px;
      background: #0a0a0a;
      border: 1px solid #4fc3f7;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(79,195,247,0.2);
      width: 280px;
      z-index: 999999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: aiDropdownSlideIn 0.2s ease-out, aiDropdownGlow 0.6s ease-out;
    `;
    
    const getProjectPath = () => {
      return (window as any).currentFolderPath || 
             localStorage.getItem('projectPath') ||
             localStorage.getItem('currentProjectPath') || '';
    };
    
    // Helper to create menu item
    const createItem = (icon: string, iconColor: string, title: string, desc: string, badge: string, onClick: () => void) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        cursor: pointer;
        background: #0a0a0a;
        transition: background 0.15s ease;
        border-left: 2px solid transparent;
      `;
      
      // Icon
      const iconEl = document.createElement('div');
      iconEl.innerHTML = icon;
      iconEl.style.cssText = `
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        margin-top: 1px;
        color: ${iconColor};
      `;
      
      // Content
      const content = document.createElement('div');
      content.style.cssText = 'flex: 1; min-width: 0;';
      
      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const titleEl = document.createElement('span');
      titleEl.textContent = title;
      titleEl.style.cssText = 'font-size: 12px; font-weight: 500; color: #e0e0e0;';
      
      const badgeEl = document.createElement('span');
      badgeEl.textContent = badge;
      badgeEl.style.cssText = `
        font-size: 9px;
        padding: 2px 5px;
        background: #333;
        color: #888;
        border-radius: 3px;
        font-weight: 500;
      `;
      
      titleRow.appendChild(titleEl);
      titleRow.appendChild(badgeEl);
      
      const descEl = document.createElement('div');
      descEl.textContent = desc;
      descEl.style.cssText = 'font-size: 11px; color: #888; margin-top: 2px; line-height: 1.3;';
      
      content.appendChild(titleRow);
      content.appendChild(descEl);
      item.appendChild(iconEl);
      item.appendChild(content);
      
      item.onmouseover = () => { 
        item.style.background = '#1a1a1a'; 
        item.style.borderLeftColor = '#4fc3f7';
      };
      item.onmouseout = () => { 
        item.style.background = '#0a0a0a'; 
        item.style.borderLeftColor = 'transparent';
      };
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.remove();
        onClick();
      };
      
      return item;
    };
    
    // Header
    const header = document.createElement('div');
    header.textContent = 'AI Project Analysis';
    header.style.cssText = `
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #4fc3f7;
      background: #000000;
      border-bottom: 1px solid #333;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    `;
    dropdown.appendChild(header);
    
    // Quick Analyze
    dropdown.appendChild(createItem(
      '⚡',
      '#ffc107',
      'Quick Analyze',
      'Scan structure & key files only',
      '~2K tokens',
      () => {
        const path = getProjectPath();
        if (path && (window as any).quickAnalyzeProject) {
          (window as any).quickAnalyzeProject(path);
        } else {
          alert('Please open a project folder first');
        }
      }
    ));
    
    // Deep Analyze
    dropdown.appendChild(createItem(
      '🔬',
      '#4fc3f7',
      'Deep Analyze',
      'Full code analysis with all files',
      '~10K tokens',
      () => {
        const path = getProjectPath();
        if (path && (window as any).deepAnalyzeProject) {
          (window as any).deepAnalyzeProject(path);
        } else {
          alert('Please open a project folder first');
        }
      }
    ));
    
    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: #333; margin: 4px 0;';
    dropdown.appendChild(sep);
    
    // AI Search Toggle
    const isOn = isAIEnabled();
    const searchItem = document.createElement('div');
    searchItem.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      cursor: pointer;
      background: #0a0a0a;
      transition: background 0.15s ease;
      border-left: 2px solid transparent;
    `;
    
    const searchLeft = document.createElement('div');
    searchLeft.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    const searchIcon = document.createElement('span');
    searchIcon.textContent = '🔍';
    searchIcon.style.cssText = 'font-size: 14px;';
    
    const searchLabel = document.createElement('span');
    searchLabel.textContent = 'AI File Search';
    searchLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: #e0e0e0;';
    
    searchLeft.appendChild(searchIcon);
    searchLeft.appendChild(searchLabel);
    
    // Toggle switch
    const toggle = document.createElement('div');
    toggle.style.cssText = `
      width: 32px;
      height: 18px;
      border-radius: 9px;
      background: ${isOn ? '#4fc3f7' : '#555'};
      position: relative;
      transition: background 0.2s;
      cursor: pointer;
    `;
    
    const toggleKnob = document.createElement('div');
    toggleKnob.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      position: absolute;
      top: 2px;
      left: ${isOn ? '16px' : '2px'};
      transition: left 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    toggle.appendChild(toggleKnob);
    
    searchItem.appendChild(searchLeft);
    searchItem.appendChild(toggle);
    
    searchItem.onmouseover = () => { 
      searchItem.style.background = '#1a1a1a'; 
      searchItem.style.borderLeftColor = '#4fc3f7';
    };
    searchItem.onmouseout = () => { 
      searchItem.style.background = '#0a0a0a'; 
      searchItem.style.borderLeftColor = 'transparent';
    };
    searchItem.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.remove();
      const newState = !isAIEnabled();
      localStorage.setItem('aiFileExplorerEnabled', newState ? 'true' : 'false');
      (window as any).aiFileExplorerEnabled = newState;
      updateBadge();
      window.dispatchEvent(new CustomEvent('aiSearchToggled', { detail: { enabled: newState }}));
      if (newState && (window as any).aiFileExplorer) {
        (window as any).aiFileExplorer.scanProject();
      }
    };
    
    dropdown.appendChild(searchItem);
    
    // Keyboard hint
    const hint = document.createElement('div');
    hint.textContent = 'Right-click folder for more options';
    hint.style.cssText = `
      padding: 8px 14px;
      font-size: 10px;
      color: #666;
      background: #000000;
      border-top: 1px solid #333;
    `;
    dropdown.appendChild(hint);
    
    // Append to body to escape overflow:hidden containers
    document.body.appendChild(dropdown);
    
    // Close on outside click
    const closeHandler = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && !aiBadge.contains(e.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
    
    return dropdown;
  };
  
  // Toggle dropdown on click
  aiBadge.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = document.querySelector('.ai-header-dropdown');
    if (existing) {
      existing.remove();
    } else {
      createDropdown();
    }
  };
  
  // Listen for external toggle changes
  window.addEventListener('aiSearchToggled', () => setTimeout(updateBadge, 50));
  window.addEventListener('storage', (e) => {
    if (e.key === 'aiFileExplorerEnabled') updateBadge();
  });
  setInterval(updateBadge, 2000);
  
  aiContainer.appendChild(aiBadge);
  rightContainer.appendChild(aiContainer);
  
  // --- Search Button (SECOND - toggles RobustExplorerFilter search bar) ---
  const searchBtn = document.createElement('button');
  searchBtn.id = 'tree-search-btn';
  searchBtn.className = 'tree-header-btn';
  searchBtn.title = 'Search files (Ctrl+P)';
  searchBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  searchBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #808080;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.15s;
    width: 24px;
    height: 24px;
  `;
  searchBtn.onmouseover = () => { searchBtn.style.background = '#3c3c3c'; searchBtn.style.color = '#fff'; };
  searchBtn.onmouseout = () => { 
    if (!searchBarExpanded) {
      searchBtn.style.background = 'transparent'; 
      searchBtn.style.color = '#808080'; 
    }
  };
  
  // Update search button state
  const updateSearchBtnState = () => {
    if (searchBarExpanded) {
      searchBtn.style.background = '#094771';
      searchBtn.style.color = '#fff';
    } else {
      searchBtn.style.background = 'transparent';
      searchBtn.style.color = '#808080';
    }
  };
  
  // Toggle RobustExplorerFilter search bar visibility
  searchBtn.onclick = () => {
    searchBarExpanded = !searchBarExpanded;
    updateSearchBtnState();
    
    // Toggle the original RobustExplorerFilter search bar
    const filterControls = document.querySelector('.explorer-filter-controls, .explorer-filter-controls-persistent') as HTMLElement;
    if (filterControls) {
      if (searchBarExpanded) {
        // Show search bar - must use inline styles to override the hide styles
        filterControls.classList.add('search-expanded');
        filterControls.style.cssText = 'display: block !important; height: auto !important; visibility: visible !important; position: relative !important; left: auto !important; top: auto !important; max-height: 200px !important; opacity: 1 !important; overflow: visible !important; padding: 8px !important; border-bottom: 1px solid #3c3c3c !important;';
        
        // Hide duplicate elements inside (buttons row, stats row)
        filterControls.querySelectorAll('.filter-buttons-row, .filter-status-bar, .filter-stats').forEach(el => {
          (el as HTMLElement).style.cssText = 'display: none !important;';
        });
        
        // Hide any row with buttons (All, No Code, etc) or stats (10 of 10)
        filterControls.querySelectorAll('div').forEach(div => {
          const text = div.textContent || '';
          const buttons = div.querySelectorAll('button');
          
          // Hide rows with multiple buttons (view mode buttons)
          if (buttons.length > 2) {
            (div as HTMLElement).style.cssText = 'display: none !important;';
          }
          
          // Hide stats rows (10 of 10, 10 files)
          if (text.includes(' of ') || text.match(/^\d+\s*files?$/i)) {
            // But don't hide if it contains the search input
            if (!div.querySelector('input')) {
              (div as HTMLElement).style.cssText = 'display: none !important;';
            }
          }
        });
        
        // Focus the search input
        setTimeout(() => {
          const input = filterControls.querySelector('input') as HTMLInputElement;
          if (input) input.focus();
        }, 100);
      } else {
        // Hide search bar
        filterControls.classList.remove('search-expanded');
        filterControls.style.cssText = 'display: none !important; height: 0 !important; visibility: hidden !important; position: absolute !important; left: -9999px !important;';
        
        // ✅ AUTO-CLEAR search input when hiding search bar
        const input = filterControls.querySelector('input') as HTMLInputElement;
        if (input) {
          input.value = '';
          // Dispatch input event to trigger filter reset
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
    
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('searchBarToggled', { detail: { expanded: searchBarExpanded }}));
  };
  
  // Keyboard shortcut: Ctrl+P to toggle search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      searchBtn.click();
    }
  });
  
  rightContainer.appendChild(searchBtn);
  
  // --- Button Container (Refresh + Close) ---
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  
  const createBtn = (title: string, svgPath: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.className = 'tree-header-btn';
    btn.title = title;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">${svgPath}</svg>`;
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: #808080;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.15s;
      width: 24px;
      height: 24px;
    `;
    btn.onmouseover = () => { btn.style.background = '#3c3c3c'; btn.style.color = '#fff'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#808080'; };
    btn.onclick = onClick;
    return btn;
  };
  
  // Refresh button
  buttonContainer.appendChild(createBtn(
    'Refresh File Tree',
    `<path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 2V5L11 3" fill="currentColor"/>`,
    () => {
      // Ensure correct path is set before refresh
      const storedPath = localStorage.getItem('ide_last_project_path');
      const currentPath = (window as any).currentFolderPath;
      
      // If currentFolderPath is wrong (parent folder), correct it
      if (storedPath && currentPath !== storedPath) {
        const pathParts = currentPath?.replace(/\\/g, '/').split('/').filter((p: string) => p) || [];
        const lastFolder = pathParts[pathParts.length - 1]?.toLowerCase() || '';
        if (lastFolder === 'projects' || lastFolder === 'desktop') {
          console.log('🔧 Correcting currentFolderPath from', currentPath, 'to', storedPath);
          (window as any).currentFolderPath = storedPath;
        }
      }
      
      // Dispatch single event with path detail
      document.dispatchEvent(new CustomEvent('refresh-file-tree', { 
        detail: { path: (window as any).currentFolderPath || storedPath }
      }));
    }
  ));
  
  // Close button
  buttonContainer.appendChild(createBtn(
    'Close Project',
    `<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    () => {
      const tabManager = (window as any).tabManager;
      if (tabManager?.closeAllTabs) tabManager.closeAllTabs();
      const container = document.getElementById('file-tree');
      if (container) container.innerHTML = '';
      currentFiles.length = 0;
      treeState.expandedFolders.clear();
      document.dispatchEvent(new CustomEvent('close-project'));
      document.dispatchEvent(new CustomEvent('project-closed'));
    }
  ));
  
  rightContainer.appendChild(buttonContainer);
  header.appendChild(rightContainer);
  
  return header;
}

/**
 * Create control panel with collapsible filter bar
 */
// Debounce timer for filter input
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Track filter bar expanded state
let filterBarExpanded = false;

// Track search bar expanded state (in project header)
let searchBarExpanded = false;

function createControlPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'tree-control-panel';
  
  // === VIEW MODE BUTTONS ROW (with More button) ===
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'tree-view-buttons';
  
  const modes: { mode: ViewMode; label: string; title: string }[] = [
    { mode: ViewMode.ALL, label: 'All', title: 'Show all files' },
    { mode: ViewMode.NO_CODE, label: 'No Code', title: 'Hide code files' },
    { mode: ViewMode.STRUCTURE, label: 'Struct', title: 'Structure only' },
    { mode: ViewMode.MINIMAL, label: 'Minimal', title: 'Docs & configs' },
    { mode: ViewMode.CODE_ONLY, label: 'Code', title: 'Code only' }
  ];
  
  modes.forEach(({ mode, label, title }) => {
    const btn = document.createElement('button');
    btn.className = `tree-view-btn ${treeState.viewMode === mode ? 'active' : ''}`;
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('click', () => setViewMode(mode));
    buttonContainer.appendChild(btn);
  });
  
  // "More" button to toggle filter bar
  const moreBtn = document.createElement('button');
  moreBtn.className = `tree-more-btn ${filterBarExpanded ? 'expanded' : ''}`;
  moreBtn.innerHTML = 'More <span class="arrow">▼</span>';
  moreBtn.title = 'Show filter & sort options';
  
  buttonContainer.appendChild(moreBtn);
  
  // === MODIFIED FILES BADGE ===
  const modifiedBadge = document.createElement('span');
  modifiedBadge.id = 'modified-files-badge';
  modifiedBadge.className = 'modified-files-badge';
  modifiedBadge.title = 'Modified files (unsaved)';
  modifiedBadge.style.cssText = `
    display: none;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    margin-left: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #1e1e1e;
    background: #e8ab6a;
    border-radius: 9px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  // Update badge with current count
  const updateModifiedBadge = () => {
    const count = modifiedTracker.modifiedFiles.size;
    if (count > 0) {
      modifiedBadge.textContent = count > 99 ? '99+' : String(count);
      modifiedBadge.style.display = 'inline-flex';
      modifiedBadge.title = `${count} modified file${count > 1 ? 's' : ''} (unsaved)`;
    } else {
      modifiedBadge.style.display = 'none';
    }
  };
  
  // Click to show modified files dialog
  modifiedBadge.onclick = (e) => {
    e.stopPropagation();
    showModifiedFilesDialog();
  };
  
  // Initial update
  updateModifiedBadge();
  
  // Store update function globally
  (window as any).updateModifiedFilesBadge = updateModifiedBadge;
  
  buttonContainer.appendChild(modifiedBadge);
  panel.appendChild(buttonContainer);
  
  // === COLLAPSIBLE FILTER BAR ===
  const filterBar = document.createElement('div');
  filterBar.className = `tree-filter-bar ${filterBarExpanded ? 'expanded' : ''}`;
  
  const filterContent = document.createElement('div');
  filterContent.className = 'tree-filter-bar-content';
  
  // Filter input
  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.className = 'tree-filter-input';
  filterInput.placeholder = 'Filter files...';
  filterInput.value = treeState.searchFilter;
  
  // Debounced input to prevent focus loss
  filterInput.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    treeState.searchFilter = value.toLowerCase();
    
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    
    filterDebounceTimer = setTimeout(() => {
      const container = document.getElementById('file-tree');
      if (container && currentFiles) {
        renderFileTree(container, currentFiles);
        // Restore focus
        const newInput = container.querySelector('.tree-filter-input') as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(value.length, value.length);
        }
      }
    }, 150);
  });
  
  // Escape to clear
  filterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      filterInput.value = '';
      treeState.searchFilter = '';
      const container = document.getElementById('file-tree');
      if (container && currentFiles) renderFileTree(container, currentFiles);
      filterInput.blur();
    }
  });
  
  // Sort dropdown
  const sortSelect = document.createElement('select');
  sortSelect.className = 'tree-sort-dropdown';
  sortSelect.title = 'Sort files';
  
  SORT_OPTIONS.forEach(({ mode, label, icon }) => {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = `${icon} ${label}`;
    option.selected = treeState.sortMode === mode;
    sortSelect.appendChild(option);
  });
  
  sortSelect.addEventListener('change', (e) => {
    const newMode = (e.target as HTMLSelectElement).value as SortMode;
    setSortMode(newMode);
  });
  
  filterContent.appendChild(filterInput);
  filterContent.appendChild(sortSelect);
  filterBar.appendChild(filterContent);
  panel.appendChild(filterBar);
  
  // Toggle filter bar on "More" click
  moreBtn.addEventListener('click', () => {
    filterBarExpanded = !filterBarExpanded;
    moreBtn.classList.toggle('expanded', filterBarExpanded);
    filterBar.classList.toggle('expanded', filterBarExpanded);
    
    // Auto-focus filter input when expanded
    if (filterBarExpanded) {
      setTimeout(() => {
        filterInput.focus();
      }, 300);
    }
  });
  
  return panel;
}

/**
 * Main render function
 */
export function renderFileTree(container: HTMLElement, files: FileNode[]): void {
  console.log('🌲 Rendering file tree v4.0 with mode:', treeState.viewMode);
  
  injectTreeStyles();
  currentFiles = files;
  
  // Check if we can preserve existing panels (for filter updates)
  let projectHeader = container.querySelector('.tree-project-header') as HTMLElement;
  let controlPanel = container.querySelector('.tree-control-panel') as HTMLElement;
  let fileList = container.querySelector('.tree-list') as HTMLElement;
  
  const isFreshRender = !projectHeader || !controlPanel;
  
  if (isFreshRender) {
    // Fresh render - create everything
    container.innerHTML = '';
    container.className = 'ide-file-tree file-tree';
    
    projectHeader = createProjectHeader(files);
    container.appendChild(projectHeader);
    
    // Note: Search bar is from RobustExplorerFilter (toggled by search icon in header)
    
    controlPanel = createControlPanel();
    container.appendChild(controlPanel);
    
    fileList = document.createElement('div');
    fileList.className = 'tree-list';
    container.appendChild(fileList);
  } else {
    // Update render - clear file list and update button states
    if (fileList) {
      fileList.innerHTML = '';
    } else {
      fileList = document.createElement('div');
      fileList.className = 'tree-list';
      container.appendChild(fileList);
    }
    
    // Update view mode button active states
    const viewButtons = controlPanel.querySelectorAll('.tree-view-btn');
    const modeOrder = [ViewMode.ALL, ViewMode.NO_CODE, ViewMode.STRUCTURE, ViewMode.MINIMAL, ViewMode.CODE_ONLY];
    viewButtons.forEach((btn, index) => {
      if (modeOrder[index] === treeState.viewMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update sort dropdown selection
    const sortSelect = controlPanel.querySelector('.tree-sort-dropdown') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.value = treeState.sortMode;
    }
    
    // Preserve filter bar expanded state
    const moreBtn = controlPanel.querySelector('.tree-more-btn');
    const filterBarElement = controlPanel.querySelector('.tree-filter-bar');
    if (moreBtn && filterBarElement) {
      moreBtn.classList.toggle('expanded', filterBarExpanded);
      filterBarElement.classList.toggle('expanded', filterBarExpanded);
    }
    
    // Preserve RobustExplorerFilter search bar state
    if (searchBarExpanded) {
      const filterControls = document.querySelector('.explorer-filter-controls, .explorer-filter-controls-persistent') as HTMLElement;
      if (filterControls) {
        filterControls.classList.add('search-expanded');
        filterControls.style.cssText = 'display: block !important; height: auto !important; visibility: visible !important; position: relative !important; left: auto !important; top: auto !important; max-height: 200px !important; opacity: 1 !important; overflow: visible !important; padding: 8px !important; border-bottom: 1px solid #3c3c3c !important;';
      }
    }
  }
  
  // Render files
  const filteredFiles = files.filter(file => shouldShowFile(file));
  
  if (filteredFiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tree-empty';
    empty.textContent = treeState.searchFilter ? `No files match "${treeState.searchFilter}"` : 'No files';
    fileList.appendChild(empty);
  } else {
    // Apply current sort mode
    const sorted = sortFiles(filteredFiles);
    
    sorted.forEach((file, index) => {
      const isLast = index === sorted.length - 1;
      const node = renderTreeNodeInternal(file, 0, isLast, []);
      if (node) fileList.appendChild(node);
    });
  }
  
  // Setup click handlers
  setupFileClickHandlers();
  setupKeyboardShortcuts();
  
  // Update modified indicators
  setTimeout(() => modifiedTracker.updateTreeDisplay(), 50);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  // Ctrl+Shift+E to focus file tree
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      const firstRow = document.querySelector('.tree-row') as HTMLElement;
      if (firstRow) {
        firstRow.focus();
      }
    }
  });
}

// ============================================================================
// FILE OPERATIONS (open file helper)
// ============================================================================

// Debounce to prevent multiple rapid clicks
let lastOpenedFile = '';
let lastOpenTime = 0;

function openFile(path: string): void {
  // Prevent duplicate opens within 300ms
  const now = Date.now();
  if (path === lastOpenedFile && (now - lastOpenTime) < 300) {
    return; // Skip duplicate
  }
  lastOpenedFile = path;
  lastOpenTime = now;
  
  // ✅ Mark that we're handling this file open
  (window as any).__fileOpenInProgress = path;
  
  // ONLY use openFileInTab - it handles everything
  const openFileInTab = (window as any).openFileInTab;
  if (openFileInTab && typeof openFileInTab === 'function') {
    openFileInTab(path).finally(() => {
      // Clear the flag after a delay
      setTimeout(() => {
        if ((window as any).__fileOpenInProgress === path) {
          (window as any).__fileOpenInProgress = null;
        }
      }, 500);
    });
    return;
  }
  
  // Fallback: dispatch event ONLY if openFileInTab not available
  (window as any).__fileOpenInProgress = null;
  document.dispatchEvent(new CustomEvent('file-open-request', { 
    detail: { path } 
  }));
}

// ============================================================================
// MODIFIED FILES FLOATING DIALOG
// ============================================================================

/**
 * Highlight changed lines in the editor for a modified file
 * Highlights stay until dialog is closed
 */
function highlightChangedLines(tab: any): void {
  const monaco = (window as any).monaco;
  const editor = monaco?.editor?.getEditors()[0];
  
  if (!editor || !tab) {
    console.log('⚠️ Cannot highlight: no editor or tab');
    return;
  }
  
  const originalContent = tab.originalContent || '';
  const currentContent = editor.getValue() || '';
  
  if (originalContent === currentContent) {
    console.log('📄 No changes to highlight');
    clearChangeHighlights();
    return;
  }
  
  // Split into lines
  const originalLines = originalContent.split('\n');
  const currentLines = currentContent.split('\n');
  
  console.log('📊 Original lines:', originalLines.length);
  console.log('📊 Current lines:', currentLines.length);
  
  // Use a simple line-by-line diff approach
  const modifiedLineNumbers: number[] = [];
  const addedLineNumbers: number[] = [];
  const deletedAtLines: number[] = [];
  
  // Create content sets for checking existence
  const originalLineContents = new Set(originalLines.map(l => l.trim()).filter(l => l));
  const currentLineContents = new Set(currentLines.map(l => l.trim()).filter(l => l));
  
  // Track matched original lines
  const matchedOriginalIndices = new Set<number>();
  
  // For each current line, determine if it's new, modified, or unchanged
  currentLines.forEach((currentLine, currentIdx) => {
    const lineNumber = currentIdx + 1;
    const trimmedCurrent = currentLine.trim();
    
    if (!trimmedCurrent) return; // Skip empty lines
    
    // Check if line at same position matches
    if (currentIdx < originalLines.length && originalLines[currentIdx] === currentLine) {
      matchedOriginalIndices.add(currentIdx);
      return; // Unchanged
    }
    
    // Check if this content exists anywhere in original
    if (originalLineContents.has(trimmedCurrent)) {
      // Content exists but moved - find and mark as matched
      const origIdx = originalLines.findIndex((ol, i) => 
        !matchedOriginalIndices.has(i) && ol.trim() === trimmedCurrent
      );
      if (origIdx !== -1) {
        matchedOriginalIndices.add(origIdx);
      }
      return; // Line moved, not really changed
    }
    
    // This is new content
    if (currentIdx < originalLines.length) {
      // Position existed before - it's modified
      modifiedLineNumbers.push(lineNumber);
    } else {
      // Position didn't exist before - it's added
      addedLineNumbers.push(lineNumber);
    }
  });
  
  // Find deleted lines - original lines whose content no longer exists
  // Only mark as deleted if the position isn't already marked as modified
  originalLines.forEach((originalLine, originalIdx) => {
    const trimmedOriginal = originalLine.trim();
    if (!trimmedOriginal) return; // Skip empty
    
    const lineNumber = originalIdx + 1;
    
    // Check if this original line content exists in current
    if (!currentLineContents.has(trimmedOriginal)) {
      // This line's content was removed
      // Show marker at original position (clamped to current file length)
      const markerLine = Math.min(lineNumber, currentLines.length);
      
      // Only add if not already marked as modified at this position
      // (modified means the line was changed, not deleted)
      if (markerLine > 0 && !modifiedLineNumbers.includes(markerLine) && !deletedAtLines.includes(markerLine)) {
        deletedAtLines.push(markerLine);
      }
    }
  });
  
  console.log('📝 Modified lines (orange):', modifiedLineNumbers);
  console.log('➕ Added lines (green):', addedLineNumbers);
  console.log('🗑️ Deleted at lines (red):', deletedAtLines);
  
  // Create decorations for highlighting
  const decorations: any[] = [];
  
  // Style for modified lines (yellow/orange gutter + light background)
  modifiedLineNumbers.forEach(lineNumber => {
    decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'modified-line-highlight',
        glyphMarginClassName: 'modified-line-glyph',
        overviewRuler: {
          color: '#e2c08d',
          position: monaco.editor.OverviewRulerLane.Left
        }
      }
    });
  });
  
  // Style for added lines (green gutter + light background)
  addedLineNumbers.forEach(lineNumber => {
    decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'added-line-highlight',
        glyphMarginClassName: 'added-line-glyph',
        overviewRuler: {
          color: '#89d185',
          position: monaco.editor.OverviewRulerLane.Left
        }
      }
    });
  });
  
  // Style for deleted line markers (red indicator in gutter)
  deletedAtLines.forEach(lineNumber => {
    decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'deleted-line-highlight',
        marginClassName: 'deleted-line-margin',
        overviewRuler: {
          color: '#f14c4c',
          position: monaco.editor.OverviewRulerLane.Left
        }
      }
    });
  });
  
  // Inject styles if not already present
  if (!document.getElementById('change-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'change-highlight-styles';
    style.textContent = `
      .modified-line-highlight {
        background: rgba(226, 192, 141, 0.15) !important;
      }
      .modified-line-glyph {
        background: #e2c08d !important;
        width: 4px !important;
        margin-left: 3px !important;
      }
      .added-line-highlight {
        background: rgba(137, 209, 133, 0.15) !important;
      }
      .added-line-glyph {
        background: #89d185 !important;
        width: 4px !important;
        margin-left: 3px !important;
      }
      .deleted-line-highlight {
        background: rgba(241, 76, 76, 0.12) !important;
      }
      .deleted-line-margin {
        background: #f14c4c !important;
        width: 4px !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Clear any existing decorations
  const existingDecorations = (editor as any).__changeHighlightDecorations || [];
  
  // Apply new decorations
  const newDecorations = editor.deltaDecorations(existingDecorations, decorations);
  (editor as any).__changeHighlightDecorations = newDecorations;
  
  // Jump to first changed line
  const firstChangedLine = modifiedLineNumbers[0] || addedLineNumbers[0] || deletedAtLines[0];
  if (firstChangedLine) {
    editor.revealLineInCenter(firstChangedLine);
    editor.setPosition({ lineNumber: firstChangedLine, column: 1 });
    editor.focus();
    
    console.log('🎯 Jumped to line:', firstChangedLine);
  }
}

/**
 * Clear all change highlights from the editor
 */
function clearChangeHighlights(): void {
  const monaco = (window as any).monaco;
  const editor = monaco?.editor?.getEditors()[0];
  
  if (editor && (editor as any).__changeHighlightDecorations) {
    editor.deltaDecorations((editor as any).__changeHighlightDecorations, []);
    (editor as any).__changeHighlightDecorations = [];
    console.log('🧹 Cleared change highlights');
  }
}

/**
 * Show floating dialog with modified files list
 */
function showModifiedFilesDialog(): void {
  const files = Array.from(modifiedTracker.modifiedFiles);
  
  // Remove existing dialog if any
  const existing = document.getElementById('modified-files-dialog');
  if (existing) {
    closeModifiedFilesDialog();
    return; // Toggle behavior
  }
  
  // Find the file explorer panel to position dialog at its bottom-left
  const fileExplorer = document.querySelector('.ide-sidebar') || 
                       document.querySelector('.file-explorer') ||
                       document.querySelector('#file-tree')?.parentElement;
  
  let initialTop = 400;
  let initialLeft = 10;
  
  if (fileExplorer) {
    const rect = fileExplorer.getBoundingClientRect();
    // Position at bottom-left of file explorer, with some padding from bottom
    initialLeft = rect.left + 10;
    initialTop = rect.bottom - 200; // 200px up from bottom to fit dialog
    
    // Make sure it doesn't go off screen
    if (initialTop < 100) initialTop = 100;
    if (initialTop + 200 > window.innerHeight) {
      initialTop = window.innerHeight - 220;
    }
  } else {
    // Fallback: position at bottom-left of viewport
    initialTop = window.innerHeight - 220;
    initialLeft = 10;
  }
  
  // Create dialog (NO backdrop - allows interaction with IDE)
  const dialog = document.createElement('div');
  dialog.id = 'modified-files-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    transform: translate3d(${initialLeft}px, ${initialTop}px, 0);
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 9999;
    min-width: 380px;
    max-width: 450px;
    max-height: 450px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    will-change: transform;
    contain: layout style;
  `;
  
  // Dialog header (draggable)
  const header = document.createElement('div');
  header.className = 'modified-dialog-header';
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #3c3c3c;
    background: #252526;
    border-radius: 6px 6px 0 0;
    cursor: grab;
    user-select: none;
  `;
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  
  const icon = document.createElement('span');
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="#e8ab6a">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
  </svg>`;
  icon.style.cssText = 'display: flex; align-items: center;';
  
  const title = document.createElement('span');
  title.textContent = 'Modified Files';
  title.style.cssText = 'font-size: 13px; font-weight: 600; color: #cccccc;';
  
  const count = document.createElement('span');
  count.className = 'modified-dialog-count';
  count.textContent = String(files.length);
  count.style.cssText = `
    background: #e8ab6a;
    color: #1e1e1e;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
  `;
  
  titleContainer.appendChild(icon);
  titleContainer.appendChild(title);
  titleContainer.appendChild(count);
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #808080;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    transition: color 0.15s;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.color = '#fff'; };
  closeBtn.onmouseout = () => { closeBtn.style.color = '#808080'; };
  closeBtn.onclick = closeModifiedFilesDialog;
  
  header.appendChild(titleContainer);
  header.appendChild(closeBtn);
  
  // GPU-accelerated dragging using transform instead of left/top
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = initialLeft;
  let currentY = initialTop;
  
  const onMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    
    // Optimize during drag
    header.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none'; // Prevent other elements from receiving events
    dialog.style.pointerEvents = 'auto'; // But keep dialog interactive
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    
    // Direct GPU-accelerated transform
    dialog.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
  };
  
  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    
    // Restore normal behavior
    header.style.cursor = 'grab';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  header.addEventListener('mousedown', onMouseDown);
  
  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    background: #1e1e1e;
  `;
  
  if (files.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No modified files';
    empty.style.cssText = 'padding: 20px; text-align: center; color: #6a6a6a; font-size: 12px;';
    content.appendChild(empty);
  } else {
    files.forEach((filePath, index) => {
      const item = createFileListItem(filePath, index);
      content.appendChild(item);
    });
  }
  
  // Dialog footer with actions
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid #3c3c3c;
    background: #252526;
    border-radius: 0 0 6px 6px;
  `;
  
  const saveAllBtn = document.createElement('button');
  saveAllBtn.textContent = 'Save All';
  saveAllBtn.style.cssText = `
    background: #0e639c;
    border: none;
    color: #fff;
    padding: 6px 14px;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
    font-weight: 500;
  `;
  saveAllBtn.onmouseover = () => { saveAllBtn.style.background = '#1177bb'; };
  saveAllBtn.onmouseout = () => { saveAllBtn.style.background = '#0e639c'; };
  saveAllBtn.onclick = async () => {
    // Disable button during save
    saveAllBtn.disabled = true;
    saveAllBtn.textContent = 'Saving...';
    saveAllBtn.style.background = '#4a4a4a';
    
    let savedCount = 0;
    let failedCount = 0;
    
    try {
      const tabManager = (window as any).tabManager;
      const saveFile = (window as any).saveFile;
      const markAsSaved = (window as any).markFileAsSaved || markFileAsSaved;
      
      console.log('💾 Save All from dialog...');
      console.log('   tabManager:', !!tabManager);
      console.log('   saveFile:', !!saveFile);
      
      // Method 1: Try tabManager.saveAllTabs() if available
      if (tabManager && typeof tabManager.saveAllTabs === 'function') {
        try {
          const result = await tabManager.saveAllTabs();
          console.log('💾 Save All via tabManager.saveAllTabs():', result);
          savedCount = result.saved || 0;
          failedCount = result.failed || 0;
        } catch (e) {
          console.warn('tabManager.saveAllTabs failed, trying manual save...', e);
        }
      }
      
      // Method 2: Manual save if saveAllTabs didn't work or doesn't exist
      if (savedCount === 0 && tabManager?.tabs) {
        const modifiedTabs = tabManager.tabs.filter((tab: any) => tab.isModified);
        console.log('💾 Manual save for', modifiedTabs.length, 'modified tabs');
        
        for (const tab of modifiedTabs) {
          try {
            // Get content from model or editor
            let content = '';
            if (tab.model && typeof tab.model.getValue === 'function') {
              content = tab.model.getValue();
            } else {
              const monaco = (window as any).monaco;
              const editor = monaco?.editor?.getEditors()[0];
              if (editor && tabManager.getActiveTab()?.id === tab.id) {
                content = editor.getValue();
              }
            }
            
            if (content && tab.path) {
              // Save via Tauri
              if (saveFile) {
                await saveFile(content, tab.path);
              } else {
                // Try invoke directly
                const invoke = (window as any).__TAURI__?.invoke;
                if (invoke) {
                  await invoke('write_file', { path: tab.path, content: content });
                }
              }
              
              // Mark as saved
              if (markAsSaved) {
                markAsSaved(tab.path);
              }
              if (tabManager.markTabAsSaved) {
                tabManager.markTabAsSaved(tab.id);
              }
              
              // Update originalContent
              tab.originalContent = content;
              tab.isModified = false;
              
              savedCount++;
              console.log('✅ Saved:', tab.path);
            }
          } catch (err) {
            console.error('❌ Failed to save:', tab.path, err);
            failedCount++;
          }
        }
      }
      
      // Show notification
      if (savedCount > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: ${failedCount > 0 ? '#d48806' : '#0e639c'};
          color: white;
          padding: 10px 16px;
          border-radius: 4px;
          font-size: 13px;
          z-index: 10000;
        `;
        notification.textContent = failedCount > 0 
          ? `⚠️ Saved ${savedCount}, failed ${failedCount}`
          : `✅ Saved ${savedCount} file(s)`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else if (failedCount > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #c42b1c;
          color: white;
          padding: 10px 16px;
          border-radius: 4px;
          font-size: 13px;
          z-index: 10000;
        `;
        notification.textContent = `❌ Failed to save ${failedCount} file(s)`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
      
      console.log('💾 Save All complete:', { saved: savedCount, failed: failedCount });
      
    } catch (error) {
      console.error('❌ Save All failed:', error);
    }
    
    // Re-enable button
    saveAllBtn.disabled = false;
    saveAllBtn.textContent = 'Save All';
    saveAllBtn.style.background = '#0e639c';
  };
  
  const closeDialogBtn = document.createElement('button');
  closeDialogBtn.textContent = 'Close';
  closeDialogBtn.style.cssText = `
    background: #3c3c3c;
    border: none;
    color: #cccccc;
    padding: 6px 14px;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  `;
  closeDialogBtn.onmouseover = () => { closeDialogBtn.style.background = '#4c4c4c'; };
  closeDialogBtn.onmouseout = () => { closeDialogBtn.style.background = '#3c3c3c'; };
  closeDialogBtn.onclick = closeModifiedFilesDialog;
  
  if (files.length > 0) {
    footer.appendChild(saveAllBtn);
  }
  footer.appendChild(closeDialogBtn);
  
  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);
  
  // Add scrollbar styles
  const style = document.createElement('style');
  style.id = 'modified-files-dialog-styles';
  style.textContent = `
    #modified-files-dialog::-webkit-scrollbar,
    #modified-files-dialog div::-webkit-scrollbar {
      width: 8px;
    }
    #modified-files-dialog::-webkit-scrollbar-track,
    #modified-files-dialog div::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    #modified-files-dialog::-webkit-scrollbar-thumb,
    #modified-files-dialog div::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 4px;
    }
    #modified-files-dialog::-webkit-scrollbar-thumb:hover,
    #modified-files-dialog div::-webkit-scrollbar-thumb:hover {
      background: #5a5a5a;
    }
  `;
  if (!document.getElementById('modified-files-dialog-styles')) {
    document.head.appendChild(style);
  }
  
  // Add to DOM (no backdrop)
  document.body.appendChild(dialog);
  
  // Auto-refresh listener when modified files change
  const refreshHandler = () => {
    const currentDialog = document.getElementById('modified-files-dialog');
    if (currentDialog) {
      // Save current position
      const currentLeft = currentDialog.style.left;
      const currentTop = currentDialog.style.top;
      
      // Get updated files
      const newFiles = Array.from(modifiedTracker.modifiedFiles);
      
      // Update count badge in header
      const countBadge = currentDialog.querySelector('.modified-dialog-count') as HTMLElement;
      if (countBadge && countBadge.textContent !== String(newFiles.length)) {
        countBadge.textContent = String(newFiles.length);
        countBadge.style.background = newFiles.length > 0 ? '#e8ab6a' : '#4a4a4a';
        countBadge.style.color = newFiles.length > 0 ? '#1e1e1e' : '#808080';
      }
      
      // Rebuild file list content
      const contentDiv = currentDialog.querySelector('div:nth-child(2)') as HTMLElement;
      if (contentDiv) {
        contentDiv.innerHTML = '';
        
        if (newFiles.length === 0) {
          const empty = document.createElement('div');
          empty.textContent = '✓ All files saved';
          empty.style.cssText = 'padding: 20px; text-align: center; color: #89d185; font-size: 13px;';
          contentDiv.appendChild(empty);
          
          // Auto-close after showing "All saved" message
          setTimeout(() => {
            closeModifiedFilesDialog();
          }, 1500);
        } else {
          newFiles.forEach((filePath, index) => {
            const item = createFileListItem(filePath, index);
            contentDiv.appendChild(item);
          });
        }
      }
      
      // Update Save All button visibility
      const footer = currentDialog.querySelector('div:last-child') as HTMLElement;
      const saveAllBtn = footer?.querySelector('button:first-child') as HTMLElement;
      if (saveAllBtn && saveAllBtn.textContent === 'Save All') {
        saveAllBtn.style.display = newFiles.length > 0 ? '' : 'none';
      }
      
      console.log('🔄 Dialog refreshed:', newFiles.length, 'files');
    }
  };
  
  document.addEventListener('modified-files-changed', refreshHandler);
  
  // Store handler reference for cleanup
  (dialog as any).__refreshHandler = refreshHandler;
  
  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModifiedFilesDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  (dialog as any).__escHandler = escHandler;
}

/**
 * Create a file list item for the dialog
 */
function createFileListItem(filePath: string, index: number): HTMLElement {
  const item = document.createElement('div');
  item.style.cssText = `
    display: flex;
    align-items: center;
    padding: 8px 14px;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid #2d2d30;
  `;
  item.onmouseover = () => { item.style.background = '#2a2d2e'; };
  item.onmouseout = () => { item.style.background = 'transparent'; };
  
  // File icon
  const fileIcon = document.createElement('span');
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  fileIcon.innerHTML = getFileIcon(fileName);
  fileIcon.style.cssText = 'margin-right: 10px; display: flex; align-items: center; font-size: 16px;';
  
  // File info container
  const fileInfo = document.createElement('div');
  fileInfo.style.cssText = 'flex: 1; min-width: 0;';
  
  // File name
  const name = document.createElement('div');
  name.textContent = fileName;
  name.style.cssText = 'color: #e0e0e0; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
  
  // File path
  const pathEl = document.createElement('div');
  const dirPath = filePath.split(/[/\\]/).slice(0, -1).join('/');
  pathEl.textContent = dirPath || '.';
  pathEl.style.cssText = 'color: #6a6a6a; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;';
  
  fileInfo.appendChild(name);
  fileInfo.appendChild(pathEl);
  
  // Line count info - simple before → after display
  const lineCountContainer = document.createElement('div');
  lineCountContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 12px;
    font-size: 11px;
    font-family: 'Consolas', 'Monaco', monospace;
    color: #808080;
  `;
  
  // Try to get line count info from tabManager
  const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  const normalizedFilePath = normalizePath(filePath);
  const tabManager = (window as any).tabManager;
  
  let originalLines = 0;
  let currentLines = 0;
  let hasLineInfo = false;
  
  if (tabManager?.tabs && Array.isArray(tabManager.tabs)) {
    const tab = tabManager.tabs.find((t: any) => normalizePath(t.path || '') === normalizedFilePath);
    if (tab) {
      const originalContent = tab.originalContent || '';
      originalLines = originalContent ? originalContent.split('\n').length : 0;
      
      // Get current content from editor if possible
      const monaco = (window as any).monaco;
      const editor = monaco?.editor?.getEditors()[0];
      if (editor && tab.model) {
        currentLines = tab.model.getLineCount();
        hasLineInfo = true;
      } else {
        currentLines = originalLines;
      }
    }
  }
  
  if (hasLineInfo) {
    // Simple display: "20 → 25"
    const beforeSpan = document.createElement('span');
    beforeSpan.textContent = String(originalLines);
    beforeSpan.style.cssText = 'color: #808080;';
    
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.style.cssText = 'color: #6a6a6a;';
    
    const afterSpan = document.createElement('span');
    afterSpan.textContent = String(currentLines);
    afterSpan.style.cssText = 'color: #e0e0e0; font-weight: 600;';
    
    lineCountContainer.appendChild(beforeSpan);
    lineCountContainer.appendChild(arrow);
    lineCountContainer.appendChild(afterSpan);
  }
  
  // Modified indicator dot
  const indicator = document.createElement('span');
  indicator.innerHTML = '●';
  indicator.style.cssText = 'color: #e8ab6a; font-size: 10px; margin-left: 10px;';
  
  item.appendChild(fileIcon);
  item.appendChild(fileInfo);
  if (hasLineInfo) {
    item.appendChild(lineCountContainer);
  }
  item.appendChild(indicator);
  
  // Click to open file and highlight changes
  item.onclick = () => {
    console.log('📂 Opening modified file:', filePath);
    
    const tabManager = (window as any).tabManager;
    if (tabManager?.tabs && Array.isArray(tabManager.tabs)) {
      const existingTab = tabManager.tabs.find((tab: any) => {
        const tabPath = normalizePath(tab.path || '');
        return tabPath === normalizedFilePath;
      });
      
      if (existingTab && tabManager.activateTab) {
        tabManager.activateTab(existingTab.id);
        setTimeout(() => highlightChangedLines(existingTab), 200);
        return;
      }
    }
    
    const openFileInTab = (window as any).openFileInTab;
    if (openFileInTab && typeof openFileInTab === 'function') {
      openFileInTab(filePath).then(() => {
        setTimeout(() => {
          const tm = (window as any).tabManager;
          if (tm?.tabs) {
            const tab = tm.tabs.find((t: any) => normalizePath(t.path || '') === normalizedFilePath);
            if (tab) highlightChangedLines(tab);
          }
        }, 300);
      });
      return;
    }
    
    document.dispatchEvent(new CustomEvent('file-selected', { 
      detail: { path: filePath, name: fileName }
    }));
  };
  
  return item;
}

/**
 * Close the modified files dialog
 */
function closeModifiedFilesDialog(): void {
  const dialog = document.getElementById('modified-files-dialog');
  if (dialog) {
    // Clean up event listeners
    const refreshHandler = (dialog as any).__refreshHandler;
    if (refreshHandler) {
      document.removeEventListener('modified-files-changed', refreshHandler);
    }
    const escHandler = (dialog as any).__escHandler;
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
    }
    
    dialog.remove();
  }
  
  // Clear all change highlights when dialog closes
  clearChangeHighlights();
}

// ============================================================================
// EXPORTED HELPER FUNCTIONS (backward compatibility)
// ============================================================================

/**
 * Mark a file as modified (unsaved changes)
 */
export function markFileAsModified(filePath: string): void {
  console.log('📝 markFileAsModified called:', filePath);
  console.log('   Normalized:', normalizePath(filePath));
  modifiedTracker.addModified(filePath);
  console.log('   Modified files count:', modifiedTracker.modifiedFiles.size);
  console.log('   Modified files:', Array.from(modifiedTracker.modifiedFiles));
  // Update badge in control panel
  if ((window as any).updateModifiedFilesBadge) {
    (window as any).updateModifiedFilesBadge();
  }
  // Dispatch event for other listeners
  document.dispatchEvent(new CustomEvent('file-modified', { 
    detail: { path: filePath, count: modifiedTracker.modifiedFiles.size }
  }));
  
  // Dispatch event for dialog refresh
  document.dispatchEvent(new CustomEvent('modified-files-changed', {
    detail: { count: modifiedTracker.modifiedFiles.size }
  }));
}

// Re-entry guard to prevent infinite loop with fileModificationManager
let _isMarkingAsSaved = false;

/**
 * Mark a file as saved (no unsaved changes)
 */
export function markFileAsSaved(filePath: string): void {
  // ========== RE-ENTRY GUARD ==========
  // Prevents infinite loop: markFileAsSaved → file-saved event → 
  // fileModificationManager.markAsSaved → markFileAsSaved again
  if (_isMarkingAsSaved) {
    return;
  }
  _isMarkingAsSaved = true;
  // ====================================
  
  try {
    console.log('💾 markFileAsSaved called:', filePath);
    console.log('   Normalized:', normalizePath(filePath));
    console.log('   Modified files BEFORE:', Array.from(modifiedTracker.modifiedFiles));
    modifiedTracker.removeModified(filePath);
    console.log('   Modified files AFTER:', Array.from(modifiedTracker.modifiedFiles));
    console.log('   Modified files count:', modifiedTracker.modifiedFiles.size);
    // Update badge in control panel
    if ((window as any).updateModifiedFilesBadge) {
      (window as any).updateModifiedFilesBadge();
    }
    // Dispatch event for other listeners
    document.dispatchEvent(new CustomEvent('file-saved', { 
      detail: { path: filePath, count: modifiedTracker.modifiedFiles.size }
    }));
    
    // Dispatch event for dialog refresh
    document.dispatchEvent(new CustomEvent('modified-files-changed', {
      detail: { count: modifiedTracker.modifiedFiles.size }
    }));
  } finally {
    // Release guard after current call stack completes
    setTimeout(() => {
      _isMarkingAsSaved = false;
    }, 0);
  }
}

/**
 * Check if a file is modified
 */
export function isFileModified(filePath: string): boolean {
  return modifiedTracker.isModified(filePath);
}

/**
 * Get all modified files
 */
export function getModifiedFiles(): string[] {
  return Array.from(modifiedTracker.modifiedFiles);
}

/**
 * Get modified files context for AI integration
 * Returns structured data about all modified files that AI can understand
 */
export function getModifiedFilesContextForAI(): {
  hasModifiedFiles: boolean;
  count: number;
  files: Array<{
    path: string;
    fileName: string;
    originalLines: number;
    currentLines: number;
    lineDiff: number;
    changes?: string;
  }>;
  summary: string;
} {
  const files = Array.from(modifiedTracker.modifiedFiles);
  const tabManager = (window as any).tabManager;
  const normalizePath = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  
  const fileDetails = files.map(filePath => {
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    let originalLines = 0;
    let currentLines = 0;
    let changes: string | undefined;
    
    // Get line count info from tabManager
    if (tabManager?.tabs && Array.isArray(tabManager.tabs)) {
      const tab = tabManager.tabs.find((t: any) => 
        normalizePath(t.path || '') === normalizePath(filePath)
      );
      
      if (tab) {
        const originalContent = tab.originalContent || '';
        originalLines = originalContent ? originalContent.split('\n').length : 0;
        
        // Get current content
        let currentContent = '';
        if (tab.model && typeof tab.model.getValue === 'function') {
          currentContent = tab.model.getValue();
        }
        currentLines = currentContent ? currentContent.split('\n').length : originalLines;
        
        // Generate simple change summary
        if (originalContent && currentContent && originalContent !== currentContent) {
          const origLines = originalContent.split('\n');
          const currLines = currentContent.split('\n');
          
          let addedCount = 0;
          let removedCount = 0;
          let modifiedCount = 0;
          
          const origSet = new Set(origLines.map(l => l.trim()).filter(l => l));
          const currSet = new Set(currLines.map(l => l.trim()).filter(l => l));
          
          // Count changes
          currLines.forEach(line => {
            if (line.trim() && !origSet.has(line.trim())) {
              addedCount++;
            }
          });
          
          origLines.forEach(line => {
            if (line.trim() && !currSet.has(line.trim())) {
              removedCount++;
            }
          });
          
          changes = `+${addedCount} lines, -${removedCount} lines`;
        }
      }
    }
    
    return {
      path: filePath,
      fileName,
      originalLines,
      currentLines,
      lineDiff: currentLines - originalLines,
      changes
    };
  });
  
  // Generate summary
  let summary = '';
  if (files.length === 0) {
    summary = 'No files have unsaved changes.';
  } else if (files.length === 1) {
    const f = fileDetails[0];
    summary = `1 file modified: ${f.fileName} (${f.originalLines} → ${f.currentLines} lines)`;
  } else {
    const totalAdded = fileDetails.reduce((sum, f) => sum + Math.max(0, f.lineDiff), 0);
    const totalRemoved = fileDetails.reduce((sum, f) => sum + Math.abs(Math.min(0, f.lineDiff)), 0);
    summary = `${files.length} files modified: ${fileDetails.map(f => f.fileName).join(', ')}. Net change: +${totalAdded}/-${totalRemoved} lines.`;
  }
  
  return {
    hasModifiedFiles: files.length > 0,
    count: files.length,
    files: fileDetails,
    summary
  };
}

/**
 * Get modified files as formatted text for AI prompt injection
 */
export function getModifiedFilesPromptText(): string {
  const context = getModifiedFilesContextForAI();
  
  if (!context.hasModifiedFiles) {
    return '';
  }
  
  let text = `\n[MODIFIED FILES - ${context.count} file(s) with unsaved changes]\n`;
  
  context.files.forEach(file => {
    text += `• ${file.fileName} (${file.path})\n`;
    text += `  Lines: ${file.originalLines} → ${file.currentLines}`;
    if (file.lineDiff !== 0) {
      text += ` (${file.lineDiff > 0 ? '+' : ''}${file.lineDiff})`;
    }
    if (file.changes) {
      text += ` | Changes: ${file.changes}`;
    }
    text += '\n';
  });
  
  return text;
}

// Expose to window for AI integration
(window as any).getModifiedFilesContextForAI = getModifiedFilesContextForAI;
(window as any).getModifiedFilesPromptText = getModifiedFilesPromptText;
(window as any).getModifiedFiles = getModifiedFiles;

/**
 * Check if a message is related to modified files / changes
 */
export function isQueryRelatedToChanges(message: string): boolean {
  if (!message) return false;
  const lowerMessage = message.toLowerCase();
  
  const changeKeywords = [
    'change', 'changed', 'changes', 'changing',
    'modified', 'modify', 'modification',
    'unsaved', 'save', 'saved',
    'edit', 'edited', 'editing',
    'update', 'updated', 'updates',
    'diff', 'difference',
    'what did i', 'what have i',
    'my file', 'my code', 'my work',
    'working on', 'worked on',
    'pending', 'uncommitted',
    '/modified', '/unsaved', '/review',
    'review my', 'check my', 'look at my'
  ];
  
  return changeKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Expose to window for AI integration
(window as any).isQueryRelatedToChanges = isQueryRelatedToChanges;

/**
 * Clear all modified states
 */
export function clearAllModifiedStates(): void {
  modifiedTracker.modifiedFiles.clear();
  modifiedTracker.savedFiles.clear();
  modifiedTracker.updateTreeDisplay();
}

/**
 * Get tree state
 */
export function getTreeState(): TreeState {
  return { ...treeState };
}

/**
 * Set tree state
 */
export function setTreeState(newState: Partial<TreeState>): void {
  treeState = { ...treeState, ...newState };
}

// ============================================================================
// FOLDER MANAGER CLASS (backward compatibility)
// ============================================================================

export class FolderManager {
  private expandedFolders = new Set<string>();
  
  constructor() {
    this.loadState();
  }
  
  private loadState() {
    const saved = localStorage.getItem('expanded-folders');
    if (saved) {
      this.expandedFolders = new Set(JSON.parse(saved));
    }
  }
  
  private saveState() {
    localStorage.setItem('expanded-folders', JSON.stringify([...this.expandedFolders]));
  }
  
  isExpanded(path: string): boolean {
    return this.expandedFolders.has(path);
  }
  
  toggle(path: string) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.saveState();
  }
  
  expand(path: string) {
    this.expandedFolders.add(path);
    this.saveState();
  }
  
  collapse(path: string) {
    this.expandedFolders.delete(path);
    this.saveState();
  }
  
  expandAll(paths: string[]) {
    paths.forEach(p => this.expandedFolders.add(p));
    this.saveState();
  }
  
  collapseAll() {
    this.expandedFolders.clear();
    this.saveState();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { modifiedTracker, treeState, currentFiles };

// Global export for refresh support
// Debounce flag to prevent multiple rapid refreshes
let isRefreshing = false;
let lastRefreshTime = 0;
const REFRESH_DEBOUNCE_MS = 500;

if (typeof window !== 'undefined') {
  (window as any).renderFileTree = renderFileTree;
  
  // Listen for refresh events - capture phase to run first
  ['file-tree-refresh', 'refresh-file-tree', 'fileTreeRefresh'].forEach(eventName => {
    document.addEventListener(eventName, async (event) => {
      // Debounce rapid refreshes
      const now = Date.now();
      if (isRefreshing || (now - lastRefreshTime) < REFRESH_DEBOUNCE_MS) {
        console.log('🔄 [FileTreeRenderer] Skipping duplicate refresh');
        return;
      }
      
      isRefreshing = true;
      lastRefreshTime = now;
      
      console.log('🔄 [FileTreeRenderer] Refresh event received');
      
      const container = document.getElementById('file-tree') || document.querySelector('.file-tree');
      if (!container) {
        isRefreshing = false;
        return;
      }
      
      // Get path from event detail first (most reliable if provided)
      const eventPath = (event as CustomEvent)?.detail?.path;
      const storedPath = localStorage.getItem('ide_last_project_path');
      
      // Get the CORRECT current folder path (priority order)
      let currentPath = eventPath || 
                        (window as any).currentFolderPath || 
                        storedPath ||
                        localStorage.getItem('projectPath');
      
      // Validate the path - ensure it's not a parent "projects" folder
      if (currentPath) {
        const pathParts = currentPath.replace(/\\/g, '/').split('/').filter((p: string) => p);
        const lastFolder = pathParts[pathParts.length - 1]?.toLowerCase() || '';
        
        // If path looks like a parent folder, use stored project path instead
        if (lastFolder === 'projects' || lastFolder === 'desktop' || lastFolder === 'users') {
          if (storedPath && storedPath !== currentPath) {
            console.log('🔧 [FileTreeRenderer] Correcting path from', currentPath, 'to', storedPath);
            currentPath = storedPath;
            (window as any).currentFolderPath = storedPath;
          }
        }
      }
      
      const finalPath = currentPath || storedPath;
      
      if (finalPath && (window as any).__TAURI__?.invoke) {
        try {
          console.log('🔄 Re-reading directory:', finalPath);
          const items = await (window as any).__TAURI__.invoke('read_directory_detailed', { path: finalPath });
          
          // Convert to FileNode format
          const files = items.map((item: any) => ({
            name: item.name,
            path: item.path,
            isDirectory: item.is_directory || item.isDirectory,
            children: item.children || [],
            size: item.size
          }));
          
          currentFiles.length = 0;
          currentFiles.push(...files);
          renderFileTree(container as HTMLElement, files);
          console.log('✅ File tree refreshed from:', finalPath);
        } catch (err) {
          console.error('❌ Failed to refresh from path:', err);
          // Fallback to cached files
          if (currentFiles.length > 0) {
            renderFileTree(container as HTMLElement, currentFiles);
          }
        }
      } else if (currentFiles.length > 0) {
        // Fallback: re-render with cached files
        renderFileTree(container as HTMLElement, currentFiles);
      }
      
      // Reset flag after a short delay
      setTimeout(() => { isRefreshing = false; }, 100);
    }, true); // Use capture phase to run first
  });
}

console.log('✅ Enhanced File Tree Renderer v4.3 - With sorting');
console.log('   🟠 Orange = Unsaved changes (pulsing)');
console.log('   🟢 Green = Saved! (fades after 3 seconds)');
console.log('   ├─ Tree guide lines enabled');
console.log('   🔧 SVG icons for professional look');
console.log('   📊 Sort by: Name, Size, Date, Type');

// Global exports for sort functionality
if (typeof window !== 'undefined') {
  (window as any).setSortMode = setSortMode;
  (window as any).SortMode = SortMode;
}

// ============================================================================
// FILE RENAME AND DELETE HANDLERS
// ============================================================================

/**
 * Show rename modal for file/folder
 */
async function showRenameModal(path: string, name: string, isDirectory?: boolean): Promise<void> {
  // Remove any existing modal
  document.querySelectorAll('.file-action-modal-overlay').forEach(el => el.remove());
  
  const isFolder = isDirectory ?? (!name.includes('.') || name.startsWith('.'));
  const pathParts = path.split(/[\\/]/);
  pathParts.pop();
  const parentPath = pathParts.join(path.includes('/') ? '/' : '\\');
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'file-action-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    padding: 20px;
    min-width: 350px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;
  
  modal.innerHTML = `
    <div style="font-size: 14px; font-weight: 600; color: #cccccc; margin-bottom: 16px;">
      Rename ${isFolder ? 'Folder' : 'File'}
    </div>
    <input type="text" id="rename-input" value="${name}" style="
      width: 100%;
      padding: 8px 12px;
      background: #3c3c3c;
      border: 1px solid #4a4a4a;
      border-radius: 4px;
      color: #cccccc;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    " />
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
      <button id="rename-cancel" style="
        padding: 6px 16px;
        background: #3c3c3c;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        color: #cccccc;
        cursor: pointer;
        font-size: 12px;
      ">Cancel</button>
      <button id="rename-confirm" style="
        padding: 6px 16px;
        background: #0e639c;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 12px;
      ">Rename</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  const input = modal.querySelector('#rename-input') as HTMLInputElement;
  const cancelBtn = modal.querySelector('#rename-cancel') as HTMLButtonElement;
  const confirmBtn = modal.querySelector('#rename-confirm') as HTMLButtonElement;
  
  // Select filename without extension
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex > 0 && !isFolder) {
    input.setSelectionRange(0, dotIndex);
  } else {
    input.select();
  }
  input.focus();
  
  const closeModal = () => {
    overlay.remove();
  };
  
  const performRename = async () => {
    const newName = input.value.trim();
    if (!newName || newName === name) {
      closeModal();
      return;
    }
    
    const sep = path.includes('/') ? '/' : '\\';
    const newPath = `${parentPath}${sep}${newName}`;
    
    try {
      // Try different possible command names (same fallback pattern as fileExplorer.ts)
      try {
        await invoke('rename_file', { 
          oldPath: path,
          newPath: newPath 
        });
      } catch (e1) {
        try {
          await invoke('move_file', { 
            oldPath: path,
            newPath: newPath 
          });
        } catch (e2) {
          try {
            await invoke('rename', { 
              path: path,
              newName: newName 
            });
          } catch (e3) {
            try {
              await invoke('rename_file_or_folder', {
                oldPath: path,
                newPath: newPath
              });
            } catch (e4) {
              throw new Error('No rename command available');
            }
          }
        }
      }
      
      console.log('✅ Renamed:', path, '→', newPath);
      showFileActionToast(`Renamed to "${newName}"`, 'success');
      
      // Trigger refresh
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to rename:', error);
      showFileActionToast(`Failed to rename: ${error}`, 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', performRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performRename();
    if (e.key === 'Escape') closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * Show delete confirmation modal for file/folder
 */
async function showDeleteConfirmation(path: string, name: string, isDirectory?: boolean): Promise<void> {
  // Remove any existing modal
  document.querySelectorAll('.file-action-modal-overlay').forEach(el => el.remove());
  
  const isFolder = isDirectory ?? (!name.includes('.') || name.startsWith('.'));
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'file-action-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    padding: 20px;
    min-width: 350px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;
  
  modal.innerHTML = `
    <div style="font-size: 14px; font-weight: 600; color: #cccccc; margin-bottom: 12px;">
      Delete ${isFolder ? 'Folder' : 'File'}
    </div>
    <div style="font-size: 13px; color: #999999; margin-bottom: 16px;">
      Are you sure you want to delete <strong style="color: #cccccc;">"${name}"</strong>?
      ${isFolder ? '<br><span style="color: #f48771;">This will delete all contents inside.</span>' : ''}
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px;">
      <button id="delete-cancel" style="
        padding: 6px 16px;
        background: #3c3c3c;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        color: #cccccc;
        cursor: pointer;
        font-size: 12px;
      ">Cancel</button>
      <button id="delete-confirm" style="
        padding: 6px 16px;
        background: #c42b1c;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 12px;
      ">Delete</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  const cancelBtn = modal.querySelector('#delete-cancel') as HTMLButtonElement;
  const deleteBtn = modal.querySelector('#delete-confirm') as HTMLButtonElement;
  
  deleteBtn.focus();
  
  const closeModal = () => {
    overlay.remove();
  };
  
  const performDelete = async () => {
    try {
      // Try different possible command names
      try {
        await invoke('delete_path', { path: path });
      } catch (e1) {
        try {
          await invoke('delete_file', { path: path });
        } catch (e2) {
          try {
            await invoke('delete_file_or_folder', { path: path });
          } catch (e3) {
            try {
              await invoke('remove_path', { path: path });
            } catch (e4) {
              throw new Error('No delete command available');
            }
          }
        }
      }
      
      console.log('✅ Deleted:', path);
      showFileActionToast(`Deleted "${name}"`, 'success');
      
      // Trigger refresh
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to delete:', error);
      showFileActionToast(`Failed to delete: ${error}`, 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  deleteBtn.addEventListener('click', performDelete);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') performDelete();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * Show toast notification for file actions
 */
function showFileActionToast(message: string, type: 'success' | 'error'): void {
  // Remove existing toasts
  document.querySelectorAll('.file-action-toast').forEach(el => el.remove());
  
  const toast = document.createElement('div');
  toast.className = 'file-action-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    background: #1e1e1e;
    border: 1px solid ${type === 'success' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'};
    border-radius: 6px;
    color: ${type === 'success' ? '#4caf50' : '#f44336'};
    font-size: 13px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideInToast 0.3s ease;
  `;
  
  toast.innerHTML = `
    <span style="font-weight: bold;">${type === 'success' ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('file-action-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'file-action-toast-styles';
    style.textContent = `
      @keyframes slideInToast {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ✅ Register event listeners for file-rename and file-delete
function initFileActionHandlers(): void {
  // Remove any existing listeners by using named functions
  const handleRename = ((e: CustomEvent) => {
    const { path, name, isDirectory } = e.detail;
    console.log('📝 Rename requested:', path, isDirectory ? '(folder)' : '(file)');
    showRenameModal(path, name, isDirectory);
  }) as EventListener;
  
  const handleDelete = ((e: CustomEvent) => {
    const { path, name, isDirectory } = e.detail;
    console.log('🗑️ Delete requested:', path, isDirectory ? '(folder)' : '(file)');
    showDeleteConfirmation(path, name, isDirectory);
  }) as EventListener;
  
  document.addEventListener('file-rename', handleRename);
  document.addEventListener('file-delete', handleDelete);
  
  console.log('✅ File action handlers (rename/delete) registered');
}

// Initialize immediately and also on DOMContentLoaded
initFileActionHandlers();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFileActionHandlers);
}

// Expose functions globally
(window as any).showRenameModal = showRenameModal;
(window as any).showDeleteConfirmation = showDeleteConfirmation;

console.log('   ✏️ Rename and 🗑️ Delete handlers registered');
