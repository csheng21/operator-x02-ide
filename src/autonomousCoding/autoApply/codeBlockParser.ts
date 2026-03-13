// ============================================================================
// Code Block Parser - Extract code blocks from AI responses
// ============================================================================
import type { CodeBlockInfo, FileAnnotation } from './types';

/**
 * Parse all code blocks from text (```lang ... ```)
 */
export function parseCodeBlocks(text: string): CodeBlockInfo[] {
  const blocks: CodeBlockInfo[] = [];
  const regex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const rawCode = match[2];
    const language = match[1] || detectLanguage(rawCode);
    blocks.push({
      code: stripAnnotations(rawCode).trim(),
      language,
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      fileAnnotation: extractFileAnnotation(rawCode),
      actionAnnotation: extractActionAnnotation(rawCode),
      lineRange: extractLineRange(rawCode),
    });
  }

  return blocks;
}

/**
 * Parse a single code block string
 */
export function parseCodeBlock(block: string): CodeBlockInfo | null {
  const match = block.match(/```(\w*)\s*\n([\s\S]*?)```/);
  if (!match) return null;
  
  const rawCode = match[2];
  const language = match[1] || detectLanguage(rawCode);
  return {
    code: stripAnnotations(rawCode).trim(),
    language,
    raw: block,
    startIndex: 0,
    endIndex: block.length,
    fileAnnotation: extractFileAnnotation(rawCode),
    actionAnnotation: extractActionAnnotation(rawCode),
    lineRange: extractLineRange(rawCode),
  };
}

/**
 * Extract file path annotation from code block
 * Looks for: // file: path/to/file.ts  or  # file: path/to/file.py
 */
export function extractFileAnnotation(code: string): FileAnnotation | null {
  const patterns = [
    /^\/\/\s*file:\s*(.+)$/m,
    /^#\s*file:\s*(.+)$/m,
    /^\/\*\s*file:\s*(.+?)\s*\*\/$/m,
    /^<!--\s*file:\s*(.+?)\s*-->$/m,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      return { path: match[1].trim(), raw: match[0] };
    }
  }
  return null;
}

/**
 * Extract action annotation (replace, insert, append, create, delete)
 * Looks for: // action: replace  or  # action: insert
 */
export function extractActionAnnotation(code: string): string | null {
  const patterns = [
    /^\/\/\s*action:\s*(\w+)/m,
    /^#\s*action:\s*(\w+)/m,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const action = match[1].toLowerCase();
      if (['replace', 'insert', 'append', 'create', 'delete', 'patch'].includes(action)) {
        return action;
      }
    }
  }
  return null;
}

/**
 * Extract line range annotation
 * Looks for: // lines: 10-25
 */
export function extractLineRange(code: string): { start: number; end: number } | null {
  const match = code.match(/^(?:\/\/|#)\s*lines?:\s*(\d+)\s*[-–]\s*(\d+)/m);
  if (match) {
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
  }
  return null;
}

/**
 * Detect language from code content heuristics
 */
export function detectLanguage(code: string): string {
  if (!code || !code.trim()) return 'plaintext';

  // TypeScript/JavaScript
  if (code.match(/^import\s+.*from\s+['"]|^export\s+(default\s+)?(function|class|const|interface|type)\s/m)) {
    return code.match(/:\s*(string|number|boolean|void|any|unknown)\b|interface\s+\w+|type\s+\w+\s*=/) ? 'typescript' : 'javascript';
  }
  // Python
  if (code.match(/^(def|class|import|from|if __name__|async def)\s/m)) return 'python';
  // Rust
  if (code.match(/^(fn|let\s+mut|impl|use\s+\w+::)/m)) return 'rust';
  // Go
  if (code.match(/^(package|func|type\s+\w+\s+struct)/m)) return 'go';
  // Java/Kotlin
  if (code.match(/^(public|private|protected)\s+(static\s+)?(class|void|int|String)/m)) return 'java';
  // C/C++
  if (code.match(/^#include\s+[<"]/m)) return 'cpp';
  // HTML
  if (code.match(/^<!DOCTYPE|^<html|^<div|^<head/im)) return 'html';
  // CSS
  if (code.match(/^[.#@]\w+\s*\{|^body\s*\{|^:root\s*\{/m)) return 'css';
  // JSON
  if (code.trim().startsWith('{') && code.trim().endsWith('}')) {
    try { JSON.parse(code); return 'json'; } catch {}
  }
  // Shell
  if (code.match(/^(#!\/bin\/(bash|sh)|npm\s|pip\s|cd\s|mkdir\s)/m)) return 'bash';

  return 'plaintext';
}

/**
 * Strip annotation comments from code before applying
 */
export function stripAnnotations(code: string): string {
  return code
    .replace(/^(?:\/\/|#)\s*file:\s*.+$/gm, '')
    .replace(/^(?:\/\/|#)\s*action:\s*\w+$/gm, '')
    .replace(/^(?:\/\/|#)\s*lines?:\s*\d+\s*[-–]\s*\d+$/gm, '')
    .replace(/^\s*\n/, '');  // Remove leading empty line
}
