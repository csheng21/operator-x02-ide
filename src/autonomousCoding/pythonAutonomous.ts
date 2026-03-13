// ============================================================================
// Python Autonomous - Python-specific autonomous coding support
// ============================================================================

const pythonAutonomous = {
  /**
   * Detect if current file is Python
   */
  isPythonFile(filePath?: string): boolean {
    const path = filePath || (window as any).__currentFilePath || '';
    return path.endsWith('.py') || path.endsWith('.pyw');
  },

  /**
   * Get Python-specific context for AI
   */
  getContext(): string {
    const info: string[] = [];
    info.push('Language: Python');
    
    // Try to detect framework
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    const code = editor?.getModel()?.getValue() || '';
    
    if (code.includes('import flask') || code.includes('from flask')) info.push('Framework: Flask');
    if (code.includes('import django') || code.includes('from django')) info.push('Framework: Django');
    if (code.includes('import fastapi') || code.includes('from fastapi')) info.push('Framework: FastAPI');
    if (code.includes('import numpy') || code.includes('import pandas')) info.push('Domain: Data Science');
    if (code.includes('import pytest') || code.includes('import unittest')) info.push('Testing: Yes');
    
    return info.join(', ');
  },

  /**
   * Format Python code (basic)
   */
  formatImports(code: string): string {
    const lines = code.split('\n');
    const imports: string[] = [];
    const fromImports: string[] = [];
    const other: string[] = [];

    for (const line of lines) {
      if (line.startsWith('import ')) imports.push(line);
      else if (line.startsWith('from ')) fromImports.push(line);
      else other.push(line);
    }

    return [
      ...imports.sort(),
      ...(imports.length && fromImports.length ? [''] : []),
      ...fromImports.sort(),
      ...(fromImports.length && other.length ? [''] : []),
      ...other,
    ].join('\n');
  },

  /**
   * Initialize Python autonomous features
   */
  initialize(): void {
    console.log('[PythonAutonomous] Initialized');
  }
};

export default pythonAutonomous;
