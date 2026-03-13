// assistantUI_htmlviewer.ts - Compact Professional HTML Document Viewer
// Optimized for compact, Word-like professional appearance with SVG icons
import { showNotification } from './notificationManager';
import { openWYSIWYGEditor } from './assistantUI_wysiwygEditor';

import { displaySimpleResponseViewer } from './assistantUI_simpleviewer';
import { shouldUseSimpleTemplate, getTemplateType } from './assistantUI_templateSelector';

// ============================================================================
// SVG ICONS - Professional design matching IDE
// ============================================================================
const SVG_ICONS = {
  // Document icon (for header)
  document: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  
  // Edit/Pencil icon
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  
  // Download icon
  download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  
  // Preview/Eye icon
  preview: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  
  // Code/HTML icon
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  
  // Close/X icon
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  
  // Copy icon
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  
  // Check/Success icon
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  
  // Sun icon (Light theme)
  sun: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  
  // Moon icon (Dark theme)
  moon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  
  // Contents/List icon
  contents: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  
  // Calendar/Date icon
  calendar: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  
  // ID/Hash icon
  hash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,

  // Code file icon (for code blocks)
  codeFile: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12l-2 2 2 2"/><path d="M14 12l2 2-2 2"/></svg>`,

  // Lines icon
  lines: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`
};


/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect language from filename
 */
function detectLanguageFromFilename(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const langMap: { [key: string]: string } = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'kt': 'kotlin',
    'swift': 'swift',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
    'sh': 'bash',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml'
  };
  return langMap[ext || ''] || 'plaintext';
}

/**
 * Extract filename from content
 */
function extractFileNameFromContent(content: string): string | null {
  const patterns = [
    /(?:file|filename|name):\s*([^\s\n]+\.\w+)/i,
    /^\/\/\s*([^\s\n]+\.\w+)/m,
    /^#\s*([^\s\n]+\.\w+)/m,
    /^\*\s*@file\s+([^\s\n]+\.\w+)/m
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract code metadata from content
 */
export function extractCodeMetadata(content: string, providedFileName?: string) {
  const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g) || [];
  let totalLines = 0;
  let languages = new Set<string>();
  const fileSize = new Blob([content], { type: 'text/plain' }).size;
  
  codeBlocks.forEach(block => {
    const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
    if (match) {
      const language = match[1];
      const code = match[2];
      const lines = code.trim().split('\n').length;
      totalLines += lines;
      
      if (language) {
        languages.add(language.toLowerCase());
      }
    }
  });
  
  const contentLines = content.split('\n').length;
  
  let fileName = providedFileName;
  
  if (!fileName || fileName === 'untitled.txt') {
    fileName = extractFileNameFromContent(content) || extractCodeTitle(content);
  }
  
  if (!fileName || fileName === 'engineering-doc') {
    fileName = providedFileName || 'engineering-doc';
  }
  
  const primaryLanguage = Array.from(languages)[0] || detectLanguageFromFilename(fileName) || 'text';
  const codeType = determineCodeType(content, primaryLanguage, fileName);
  
  return {
    fileName: fileName,
    language: primaryLanguage,
    languages: Array.from(languages),
    totalLines: Math.max(totalLines, contentLines),
    codeLines: totalLines,
    fileSize: fileSize,
    codeType: codeType,
    blockCount: codeBlocks.length
  };
}

/**
 * Extract title from content
 */
function extractCodeTitle(content: string): string {
  const titlePatterns = [
    /^#\s+(.+)$/m,
    /^##\s+(.+)$/m,
    /<title>(.+)<\/title>/i,
    /\/\*\*\s*\n\s*\*\s*(.+)\s*\n/,
    /"""\s*(.+)\s*"""/,
    /\/\/\s*(.+)$/m
  ];
  
  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 50);
    }
  }
  
  return 'Engineering Document';
}

/**
 * Determine code type based on content and language
 */
function determineCodeType(content: string, primaryLanguage: string, fileName: string): string {
  const patterns = {
    'API Documentation': /api|endpoint|request|response|swagger/i,
    'Web Application': /html|css|javascript|react|vue|angular/i,
    'Backend Service': /server|api|database|service|microservice/i,
    'Mobile App': /android|ios|react-native|flutter|mobile/i,
    'Machine Learning': /tensorflow|pytorch|sklearn|model|dataset/i,
    'DevOps/Infrastructure': /docker|kubernetes|terraform|ansible|ci\/cd/i,
    'Database Schema': /sql|database|schema|migration|table/i,
    'Configuration': /config|yaml|json|toml|env|settings/i,
    'Documentation': /readme|docs|guide|tutorial|manual/i,
    'Test Suite': /test|spec|jest|pytest|unittest/i
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(content) || pattern.test(primaryLanguage)) {
      return type;
    }
  }
  
  return 'Source Code';
}

/**
 * Generate intelligent document title based on content analysis
 */
function generateSmartTitle(content: string, fileName: string): { title: string; subtitle: string } {
  const lowerContent = content.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  // Try to extract title from first heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  const h2Match = content.match(/^##\s+(.+)$/m);
  const extractedTitle = h1Match?.[1] || h2Match?.[1];
  
  // Content type detection patterns
  const contentPatterns: { pattern: RegExp; title: string; subtitle: string }[] = [
    // Code Analysis & Review
    { pattern: /code\s*(review|analysis|audit|quality)/i, title: 'Code Analysis Report', subtitle: 'Source Code Review & Quality Assessment' },
    { pattern: /comprehensive\s*analysis/i, title: 'Comprehensive Analysis', subtitle: 'Detailed Technical Assessment' },
    { pattern: /(bug|issue|error)\s*(fix|report|analysis)/i, title: 'Bug Analysis Report', subtitle: 'Issue Investigation & Resolution' },
    { pattern: /refactor/i, title: 'Refactoring Guide', subtitle: 'Code Improvement Recommendations' },
    
    // API & Integration
    { pattern: /api\s*(documentation|reference|guide)/i, title: 'API Reference', subtitle: 'API Documentation & Integration Guide' },
    { pattern: /(rest|graphql)\s*api/i, title: 'API Documentation', subtitle: 'REST/GraphQL Endpoint Reference' },
    { pattern: /endpoint|route|controller/i, title: 'API Endpoints', subtitle: 'Service Endpoint Documentation' },
    { pattern: /swagger|openapi/i, title: 'API Specification', subtitle: 'OpenAPI/Swagger Documentation' },
    
    // Architecture & Design
    { pattern: /architecture|system\s*design/i, title: 'Architecture Overview', subtitle: 'System Design & Architecture Documentation' },
    { pattern: /design\s*pattern/i, title: 'Design Patterns', subtitle: 'Software Design Pattern Implementation' },
    { pattern: /component|module/i, title: 'Component Documentation', subtitle: 'Module & Component Reference' },
    { pattern: /class\s*(diagram|structure)/i, title: 'Class Structure', subtitle: 'Object-Oriented Design Documentation' },
    
    // Database
    { pattern: /database|schema|migration/i, title: 'Database Documentation', subtitle: 'Schema Design & Data Model Reference' },
    { pattern: /sql|query|table/i, title: 'Database Reference', subtitle: 'SQL & Query Documentation' },
    { pattern: /entity|relationship|erd/i, title: 'Data Model', subtitle: 'Entity Relationship Documentation' },
    
    // Configuration & Setup
    { pattern: /config(uration)?|settings|setup/i, title: 'Configuration Guide', subtitle: 'Setup & Configuration Reference' },
    { pattern: /install(ation)?|getting\s*started/i, title: 'Installation Guide', subtitle: 'Setup & Getting Started' },
    { pattern: /environment|env\s*var/i, title: 'Environment Setup', subtitle: 'Environment Configuration Guide' },
    
    // Testing
    { pattern: /test\s*(plan|case|suite|report)/i, title: 'Test Documentation', subtitle: 'Testing Strategy & Test Cases' },
    { pattern: /unit\s*test|integration\s*test/i, title: 'Test Suite', subtitle: 'Unit & Integration Test Documentation' },
    { pattern: /coverage|assertion/i, title: 'Test Coverage Report', subtitle: 'Code Coverage & Test Results' },
    
    // DevOps & Deployment
    { pattern: /deploy(ment)?|ci\/cd|pipeline/i, title: 'Deployment Guide', subtitle: 'CI/CD & Deployment Documentation' },
    { pattern: /docker|container|kubernetes/i, title: 'Container Documentation', subtitle: 'Docker & Container Configuration' },
    { pattern: /infrastructure|terraform|ansible/i, title: 'Infrastructure Guide', subtitle: 'Infrastructure as Code Documentation' },
    
    // Security
    { pattern: /security|authentication|authorization/i, title: 'Security Documentation', subtitle: 'Security Implementation Guide' },
    { pattern: /vulnerability|penetration|audit/i, title: 'Security Assessment', subtitle: 'Security Audit & Vulnerability Report' },
    { pattern: /encryption|oauth|jwt/i, title: 'Authentication Guide', subtitle: 'Security & Authentication Reference' },
    
    // Performance
    { pattern: /performance|optimization|benchmark/i, title: 'Performance Analysis', subtitle: 'Optimization & Benchmarking Report' },
    { pattern: /profil(e|ing)|memory|cpu/i, title: 'Performance Profile', subtitle: 'System Performance Analysis' },
    
    // User & UI
    { pattern: /user\s*(guide|manual|documentation)/i, title: 'User Guide', subtitle: 'User Documentation & Manual' },
    { pattern: /ui|ux|interface|component/i, title: 'UI Documentation', subtitle: 'User Interface Component Guide' },
    { pattern: /style\s*guide|design\s*system/i, title: 'Style Guide', subtitle: 'UI/UX Design System' },
    
    // Project & Planning
    { pattern: /readme|overview|introduction/i, title: 'Project Overview', subtitle: 'Project Introduction & Overview' },
    { pattern: /roadmap|milestone|timeline/i, title: 'Project Roadmap', subtitle: 'Development Timeline & Milestones' },
    { pattern: /requirement|specification|spec/i, title: 'Requirements Specification', subtitle: 'Functional & Technical Requirements' },
    
    // Tutorials & How-To
    { pattern: /tutorial|how\s*to|guide|walkthrough/i, title: 'Tutorial Guide', subtitle: 'Step-by-Step Tutorial' },
    { pattern: /example|sample|demo/i, title: 'Code Examples', subtitle: 'Sample Code & Demonstrations' },
    { pattern: /best\s*practice|recommendation/i, title: 'Best Practices', subtitle: 'Recommended Patterns & Guidelines' },
    
    // Troubleshooting
    { pattern: /troubleshoot|debug|diagnos/i, title: 'Troubleshooting Guide', subtitle: 'Debugging & Problem Resolution' },
    { pattern: /faq|frequently\s*asked/i, title: 'FAQ', subtitle: 'Frequently Asked Questions' },
    { pattern: /error\s*(handling|message)|exception/i, title: 'Error Reference', subtitle: 'Error Handling Documentation' },
    
    // Release & Changelog
    { pattern: /changelog|release\s*note|version/i, title: 'Release Notes', subtitle: 'Version History & Changelog' },
    { pattern: /migration|upgrade/i, title: 'Migration Guide', subtitle: 'Upgrade & Migration Documentation' },
  ];
  
  // Check content patterns
  for (const { pattern, title, subtitle } of contentPatterns) {
    if (pattern.test(lowerContent) || pattern.test(lowerFileName)) {
      // If we have an extracted title, use it with the detected subtitle
      if (extractedTitle && extractedTitle.length > 3 && extractedTitle.length < 80) {
        return { title: extractedTitle.trim(), subtitle };
      }
      return { title, subtitle };
    }
  }
  
  // File extension based detection
  const ext = fileName.split('.').pop()?.toLowerCase();
  const extTitles: Record<string, { title: string; subtitle: string }> = {
    'py': { title: 'Python Documentation', subtitle: 'Python Source Code Reference' },
    'js': { title: 'JavaScript Documentation', subtitle: 'JavaScript Module Reference' },
    'ts': { title: 'TypeScript Documentation', subtitle: 'TypeScript Source Reference' },
    'jsx': { title: 'React Component', subtitle: 'React JSX Component Documentation' },
    'tsx': { title: 'React TypeScript Component', subtitle: 'React TSX Component Documentation' },
    'java': { title: 'Java Documentation', subtitle: 'Java Class & Method Reference' },
    'cpp': { title: 'C++ Documentation', subtitle: 'C++ Source Code Reference' },
    'c': { title: 'C Documentation', subtitle: 'C Source Code Reference' },
    'cs': { title: 'C# Documentation', subtitle: 'C# Class & Method Reference' },
    'go': { title: 'Go Documentation', subtitle: 'Go Package Reference' },
    'rs': { title: 'Rust Documentation', subtitle: 'Rust Crate Reference' },
    'rb': { title: 'Ruby Documentation', subtitle: 'Ruby Module Reference' },
    'php': { title: 'PHP Documentation', subtitle: 'PHP Source Reference' },
    'swift': { title: 'Swift Documentation', subtitle: 'Swift Source Reference' },
    'kt': { title: 'Kotlin Documentation', subtitle: 'Kotlin Source Reference' },
    'sql': { title: 'SQL Documentation', subtitle: 'Database Query Reference' },
    'html': { title: 'HTML Documentation', subtitle: 'Web Page Structure Reference' },
    'css': { title: 'CSS Documentation', subtitle: 'Stylesheet Reference' },
    'scss': { title: 'SASS Documentation', subtitle: 'SASS/SCSS Stylesheet Reference' },
    'json': { title: 'JSON Configuration', subtitle: 'JSON Data Structure Reference' },
    'yaml': { title: 'YAML Configuration', subtitle: 'YAML Configuration Reference' },
    'yml': { title: 'YAML Configuration', subtitle: 'YAML Configuration Reference' },
    'xml': { title: 'XML Documentation', subtitle: 'XML Structure Reference' },
    'md': { title: 'Documentation', subtitle: 'Markdown Documentation' },
    'sh': { title: 'Shell Script', subtitle: 'Bash/Shell Script Reference' },
    'dockerfile': { title: 'Dockerfile', subtitle: 'Container Build Configuration' },
  };
  
  if (ext && extTitles[ext]) {
    if (extractedTitle && extractedTitle.length > 3 && extractedTitle.length < 80) {
      return { title: extractedTitle.trim(), subtitle: extTitles[ext].subtitle };
    }
    return extTitles[ext];
  }
  
  // Use extracted title if available
  if (extractedTitle && extractedTitle.length > 3 && extractedTitle.length < 80) {
    return { title: extractedTitle.trim(), subtitle: 'Technical Documentation' };
  }
  
  // Clean filename for title
  const cleanName = fileName
    .replace(/[-_]/g, ' ')
    .replace(/\.\w+$/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
  
  return { 
    title: `${cleanName} Documentation`, 
    subtitle: 'Technical Reference Documentation' 
  };
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Generate compact professional HTML document
 */
export function generateResponseHTML(content: string, aiProvider: string, timestamp: string, metadata?: any): string {
  const codeMetadata = metadata || extractCodeMetadata(content);
  
  // Generate smart title based on content
  const smartTitle = generateSmartTitle(content, codeMetadata.fileName);
  
  // Step 1: Process code blocks FIRST and replace with placeholders
  const codeBlocks: string[] = [];
  let processedContent = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
    const lang = language || 'text';
    const lineCount = code.trim().split('\n').length;
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(`
      <div class="code-block ${lang}">
        <div class="code-header">
          <div class="code-info">
            <span class="code-language">${SVG_ICONS.codeFile} ${lang.toUpperCase()}</span>
            <span class="code-lines">${SVG_ICONS.lines} ${lineCount} lines</span>
          </div>
          <button class="copy-btn" onclick="copyCode(this)">${SVG_ICONS.copy} <span>Copy</span></button>
        </div>
        <pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>
      </div>
    `);
    return placeholder;
  });
  
  // Step 2: Process inline markdown
  let htmlContent = processedContent
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Step 3: Process headers (before splitting into paragraphs)
  htmlContent = htmlContent
    .replace(/^### (.+)$/gm, '___HEADER3___$1___ENDHEADER3___')
    .replace(/^## (.+)$/gm, '___HEADER2___$1___ENDHEADER2___')
    .replace(/^# (.+)$/gm, '___HEADER1___$1___ENDHEADER1___');
  
  // Step 4: Process lists
  htmlContent = htmlContent
    .replace(/^\d+\.\s+(.+)$/gm, '___ORDERED___$1___ENDORDERED___')
    .replace(/^[-*]\s+(.+)$/gm, '___UNORDERED___$1___ENDUNORDERED___');
  
  // Step 5: Split into lines and wrap paragraphs
  const lines = htmlContent.split('\n');
  const processedLines: string[] = [];
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inParagraph) {
        processedLines.push('</p>');
        inParagraph = false;
      }
      continue;
    }
    
    if (line.startsWith('___HEADER') || line.startsWith('___ORDERED') || 
        line.startsWith('___UNORDERED') || line.startsWith('___CODE_BLOCK')) {
      if (inParagraph) {
        processedLines.push('</p>');
        inParagraph = false;
      }
      processedLines.push(line);
    } else {
      if (!inParagraph) {
        processedLines.push('<p>');
        inParagraph = true;
      }
      processedLines.push(line);
    }
  }
  
  if (inParagraph) {
    processedLines.push('</p>');
  }
  
  htmlContent = processedLines.join('\n');
  
  // Step 6: Convert placeholders back to HTML
  htmlContent = htmlContent
    .replace(/___HEADER1___(.+)___ENDHEADER1___/g, '<h1>$1</h1>')
    .replace(/___HEADER2___(.+)___ENDHEADER2___/g, '<h2>$1</h2>')
    .replace(/___HEADER3___(.+)___ENDHEADER3___/g, '<h3>$1</h3>')
    .replace(/___ORDERED___(.+)___ENDORDERED___/g, '<li class="ordered">$1</li>')
    .replace(/___UNORDERED___(.+)___ENDUNORDERED___/g, '<li class="unordered">$1</li>');
  
  // Wrap consecutive list items
  htmlContent = htmlContent.replace(/(<li class="ordered">.+<\/li>\n?)+/g, '<ol>$&</ol>');
  htmlContent = htmlContent.replace(/(<li class="unordered">.+<\/li>\n?)+/g, '<ul>$&</ul>');
  htmlContent = htmlContent.replace(/ class="(un)?ordered"/g, '');
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    htmlContent = htmlContent.replace(`___CODE_BLOCK_${index}___`, block);
  });
  
  // Build table of contents from headers
  const headerRegex = /<h([1-3]).*?>(.*?)<\/h[1-3]>/g;
  const tableOfContents: { level: number; text: string; id: string }[] = [];
  let match;
  let headerIndex = 0;
  
  while ((match = headerRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '');
    const id = `section-${++headerIndex}`;
    
    htmlContent = htmlContent.replace(match[0], `<h${level} id="${id}">${match[2]}</h${level}>`);
    tableOfContents.push({ level, text, id });
  }
  
  const tocHTML = tableOfContents.length > 0 ? `
    <div class="toc">
      <div class="toc-title">${SVG_ICONS.contents} <span>CONTENTS</span></div>
      ${tableOfContents.map((item, idx) => 
        `<a href="#${item.id}" class="toc-link toc-level-${item.level}">
          <span class="toc-num">${item.level === 1 ? (idx + 1) + '.' : '•'}</span>
          ${item.text}
        </a>`
      ).join('')}
    </div>
  ` : '';
  
  // Generate document ID
  const dateObj = new Date();
  const dateTimeString = dateObj.toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const docId = `DOC-${dateTimeString}-${randomPart}`;
  
  const formattedDateTime = dateObj.toLocaleString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const isoTime = dateObj.toISOString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="document-type" content="Technical Documentation">
    <meta name="generator" content="${aiProvider}">
    <meta name="document-id" content="${docId}">
    <meta name="created" content="${isoTime}">
    <title>${smartTitle.title} - ${codeMetadata.fileName}</title>
    <style>
      /* Professional Developer Theme with Light/Dark Toggle */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ============================================================================ */
/* Dark Theme Variables (Default) */
/* ============================================================================ */
:root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --border: #30363d;
    --text-primary: #c9d1d9;
    --text-secondary: #8b949e;
    --accent: #58a6ff;
    --accent-bright: #06b6d4;
    --code-bg: #161b22;
    --success: #238636;
    --header-gradient-1: #1f6feb;
    --header-gradient-2: #0969da;
    --heading-color: #c9d1d9;
    --link-color: #58a6ff;
}

/* ============================================================================ */
/* Light Theme Variables */
/* ============================================================================ */
[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f6f8fa;
    --bg-tertiary: #ffffff;
    --border: #d0d7de;
    --text-primary: #24292f;
    --text-secondary: #57606a;
    --accent: #1a1a1a;
    --accent-bright: #0891b2;
    --code-bg: #f6f8fa;
    --success: #1a7f37;
    --header-gradient-1: #2d2d2d;
    --header-gradient-2: #1a1a1a;
    --heading-color: #1a1a1a;
    --link-color: #0969da;
}

/* ============================================================================ */
/* Base Styles */
/* ============================================================================ */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* ============================================================================ */
/* Document Container */
/* ============================================================================ */
.document {
    max-width: 1200px;
    margin: 20px auto;
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;
    transition: background-color 0.3s ease, border-color 0.3s ease;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

/* ============================================================================ */
/* Header with Gradient */
/* ============================================================================ */
.header {
    background: linear-gradient(135deg, var(--header-gradient-1) 0%, var(--header-gradient-2) 100%);
    padding: 24px 30px;
    border-bottom: 1px solid var(--border);
    position: relative;
}

.doc-title {
    font-size: 24px;
    font-weight: 600;
    color: white;
    margin-bottom: 8px;
}

.doc-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 16px;
}

.metadata {
    display: flex;
    gap: 24px;
    padding-top: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
}

.meta-item svg {
    opacity: 0.8;
}

.meta-label {
    font-weight: 500;
    opacity: 0.8;
}

.meta-value {
    font-weight: 600;
    margin-left: 4px;
}

/* ============================================================================ */
/* Theme Toggle Button - SVG */
/* ============================================================================ */
.theme-toggle {
    position: absolute;
    top: 24px;
    right: 30px;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    padding: 8px 14px;
    color: white;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    backdrop-filter: blur(4px);
}

.theme-toggle:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.theme-toggle svg {
    flex-shrink: 0;
}

/* ============================================================================ */
/* Layout */
/* ============================================================================ */
.body {
    display: flex;
}

/* ============================================================================ */
/* Sidebar */
/* ============================================================================ */
.sidebar {
    width: 240px;
    background: var(--bg-primary);
    border-right: 1px solid var(--border);
    padding: 20px 16px;
}

.toc-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.toc-title svg {
    color: var(--accent-bright);
    flex-shrink: 0;
}

.toc-link {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 10px;
    margin: 2px 0;
    font-size: 13px;
    color: var(--text-primary);
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.toc-link:hover {
    background: var(--bg-tertiary);
    color: var(--accent-bright);
    padding-left: 14px;
}

.toc-num {
    font-weight: 600;
    min-width: 18px;
    color: var(--accent-bright);
}

.toc-level-1 {
    font-weight: 500;
    margin-top: 8px;
}

.toc-level-2 {
    padding-left: 24px;
    font-size: 12px;
}

.toc-level-3 {
    padding-left: 40px;
    font-size: 11px;
    color: var(--text-secondary);
}

/* ============================================================================ */
/* Main Content */
/* ============================================================================ */
.content {
    flex: 1;
    padding: 30px;
}

/* ============================================================================ */
/* Typography - Headers */
/* ============================================================================ */
.content h1 {
    font-size: 20px;
    font-weight: 600;
    color: var(--accent-bright);
    margin: 20px 0 10px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--border);
}

.content h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--heading-color);
    margin: 16px 0 8px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
}

.content h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--heading-color);
    margin: 12px 0 6px 0;
}

/* Typography - Body Text */
.content p {
    margin-bottom: 6px;
    line-height: 1.6;
    color: var(--text-primary);
}

.content ul, .content ol {
    margin: 6px 0;
    padding-left: 24px;
}

.content li {
    margin-bottom: 4px;
    line-height: 1.5;
    color: var(--text-primary);
}

.content strong {
    font-weight: 600;
    color: var(--link-color);
}

.content em {
    color: var(--link-color);
    font-style: italic;
}

/* Typography - Links */
.content a {
    color: var(--link-color);
    text-decoration: none;
    font-weight: 500;
}

.content a:hover {
    color: var(--accent-bright);
    text-decoration: underline;
}

/* ============================================================================ */
/* Inline Code */
/* ============================================================================ */
.inline-code {
    background: var(--bg-tertiary);
    color: #ff7b72;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    border: 1px solid var(--border);
}

/* ============================================================================ */
/* Code Blocks - Professional Design */
/* ============================================================================ */
.code-block {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 10px;
    margin: 16px 0;
    overflow: hidden;
}

.code-header {
    background: var(--bg-secondary);
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
}

.code-info {
    display: flex;
    align-items: center;
    gap: 16px;
}

.code-language {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--accent-bright);
    font-family: 'SF Mono', 'Consolas', monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.code-language svg {
    opacity: 0.8;
}

.code-lines {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-secondary);
    font-size: 11px;
}

.code-lines svg {
    opacity: 0.6;
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.copy-btn:hover {
    background: var(--accent-bright);
    border-color: var(--accent-bright);
    color: white;
    transform: translateY(-1px);
}

.copy-btn svg {
    flex-shrink: 0;
}

.copy-btn.copied {
    background: var(--success);
    border-color: var(--success);
    color: white;
}

.code-block pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
}

.code-block code {
    font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
}

/* ============================================================================ */
/* Footer */
/* ============================================================================ */
.footer {
    background: var(--bg-primary);
    border-top: 1px solid var(--border);
    padding: 16px 30px;
    text-align: center;
    font-size: 11px;
    color: var(--text-secondary);
}

/* ============================================================================ */
/* Scrollbar */
/* ============================================================================ */
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: #484f58;
}

/* ============================================================================ */
/* Print Styles */
/* ============================================================================ */
@media print {
    body {
        background: white;
        color: black;
    }
    
    .document {
        box-shadow: none;
        margin: 0;
        border: none;
    }
    
    .sidebar {
        display: none;
    }
    
    .copy-btn, .theme-toggle {
        display: none;
    }
}

/* ============================================================================ */
/* Responsive */
/* ============================================================================ */
@media (max-width: 768px) {
    .body {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border);
    }
    
    .content {
        padding: 20px;
    }
}
    </style>
    <script>
        function copyCode(button) {
            const codeBlock = button.closest('.code-block');
            const code = codeBlock.querySelector('code').textContent;
            
            navigator.clipboard.writeText(code).then(() => {
                const originalHTML = button.innerHTML;
                button.innerHTML = '${SVG_ICONS.check} <span>Copied!</span>';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('copied');
                }, 1500);
            });
        }
        
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            html.setAttribute('data-theme', newTheme);
            
            const button = document.querySelector('.theme-toggle');
            if (newTheme === 'light') {
                button.innerHTML = '${SVG_ICONS.moon} <span>Dark</span>';
            } else {
                button.innerHTML = '${SVG_ICONS.sun} <span>Light</span>';
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            // Smooth scrolling for TOC
            document.querySelectorAll('.toc-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        });
    </script>
</head>
<body>
    <div class="document">
        <header class="header">
            <button class="theme-toggle" onclick="toggleTheme()">
                ${SVG_ICONS.sun} <span>Light</span>
            </button>
            <h1 class="doc-title">${smartTitle.title}</h1>
            <p class="doc-subtitle">${smartTitle.subtitle}</p>
            <div class="metadata">
                <div class="meta-item">
                    ${SVG_ICONS.calendar}
                    <span class="meta-label">Date:</span>
                    <span class="meta-value">${formattedDateTime}</span>
                </div>
                <div class="meta-item">
                    ${SVG_ICONS.hash}
                    <span class="meta-label">Doc ID:</span>
                    <span class="meta-value">${docId}</span>
                </div>
            </div>
        </header>
        
        <div class="body">
            <aside class="sidebar">
                ${tocHTML}
            </aside>
            
            <main class="content">
                ${htmlContent}
            </main>
        </div>
        
        <footer class="footer">
            © ${new Date().getFullYear()} ${smartTitle.title} | ${aiProvider} | ${docId}
        </footer>
    </div>
</body>
</html>`;
}

/**
 * Display HTML response viewer with Edit, Download, Preview, and Code view
 */
export function displayHTMLResponseViewerBlob(htmlContent: string, fileName: string): void {
  // Remove existing viewer if any
  const existingViewer = document.getElementById('html-response-viewer');
  if (existingViewer) {
    existingViewer.remove();
  }
  
  const viewer = document.createElement('div');
  viewer.id = 'html-response-viewer';
  viewer.className = 'html-document-viewer';
  
  viewer.innerHTML = `
    <div class="doc-viewer-overlay"></div>
    <div class="doc-viewer-container">
      <div class="doc-viewer-header">
        <div class="doc-info">
          <div class="doc-title-row">
            <span class="doc-icon">${SVG_ICONS.document}</span>
            <h2>Document Viewer</h2>
          </div>
          <span class="doc-filename">${fileName}</span>
        </div>
        <div class="doc-actions">
          <button class="doc-action-btn edit-btn" title="Edit document (Ctrl+E)">
            ${SVG_ICONS.edit}
            <span>Edit</span>
          </button>
          <button class="doc-action-btn download-btn" title="Download HTML (Ctrl+S)">
            ${SVG_ICONS.download}
            <span>Download</span>
          </button>
          <button class="doc-action-btn preview-btn active" title="Preview document">
            ${SVG_ICONS.preview}
            <span>Preview</span>
          </button>
          <button class="doc-action-btn code-btn" title="View HTML source">
            ${SVG_ICONS.code}
            <span>HTML</span>
          </button>
          <button class="doc-action-btn close-btn" title="Close (Esc)">
            ${SVG_ICONS.close}
          </button>
        </div>
      </div>
      
      <div class="doc-viewer-content">
        <div class="doc-preview-container active">
          <iframe id="doc-preview-frame"></iframe>
        </div>
        
        <div class="doc-code-container">
          <div class="code-block">
            <div class="code-header">
              <span class="code-language">
                ${SVG_ICONS.code}
                <span>HTML</span>
              </span>
              <button class="copy-html" title="Copy to clipboard">
                ${SVG_ICONS.copy}
                <span>Copy</span>
              </button>
            </div>
            <pre><code id="html-source-code">${escapeHtml(htmlContent)}</code></pre>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    /* ============================================================================ */
    /* PROFESSIONAL DOCUMENT VIEWER - Matches IDE Design                            */
    /* ============================================================================ */
    
    .html-document-viewer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0.25s ease;
    }
    
    .html-document-viewer.viewer-open {
      opacity: 1;
      visibility: visible;
    }
    
    .doc-viewer-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
    }
    
    .doc-viewer-container {
      position: relative;
      width: 92%;
      height: 92%;
      margin: 4%;
      background: #0d1117;
      border-radius: 12px;
      border: 1px solid rgba(48, 54, 61, 0.8);
      box-shadow: 
        0 0 0 1px rgba(0, 0, 0, 0.3),
        0 16px 48px rgba(0, 0, 0, 0.5),
        0 0 80px rgba(6, 182, 212, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.98) translateY(10px);
      transition: transform 0.25s ease;
    }
    
    .html-document-viewer.viewer-open .doc-viewer-container {
      transform: scale(1) translateY(0);
    }
    
    /* Header */
    .doc-viewer-header {
      background: linear-gradient(180deg, #161b22 0%, #0d1117 100%);
      padding: 12px 20px;
      border-bottom: 1px solid #30363d;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    
    .doc-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .doc-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .doc-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #06b6d4;
      filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.5));
    }
    
    .doc-info h2 {
      color: #06b6d4;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.01em;
    }
    
    .doc-filename {
      color: #8b949e;
      font-size: 0.8rem;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      padding-left: 30px;
    }
    
    /* Action Buttons */
    .doc-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .doc-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 8px 14px;
      color: #c9d1d9;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    
    .doc-action-btn svg {
      flex-shrink: 0;
      opacity: 0.8;
      transition: opacity 0.2s, transform 0.2s;
    }
    
    .doc-action-btn:hover {
      background: rgba(6, 182, 212, 0.15);
      border-color: rgba(6, 182, 212, 0.4);
      color: #06b6d4;
      transform: translateY(-1px);
    }
    
    .doc-action-btn:hover svg {
      opacity: 1;
      transform: scale(1.1);
    }
    
    .doc-action-btn:active {
      transform: translateY(0);
    }
    
    .doc-action-btn.active {
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
      border-color: #06b6d4;
      color: #0d1117;
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
    }
    
    .doc-action-btn.active svg {
      opacity: 1;
    }
    
    /* Edit Button - Purple */
    .doc-action-btn.edit-btn {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      border-color: #8b5cf6;
      color: white;
    }
    
    .doc-action-btn.edit-btn:hover {
      background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
      border-color: #a78bfa;
      color: white;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
    }
    
    /* Download Button - Green */
    .doc-action-btn.download-btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: #10b981;
      color: white;
    }
    
    .doc-action-btn.download-btn:hover {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      border-color: #34d399;
      color: white;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    }
    
    /* Close Button - Subtle */
    .doc-action-btn.close-btn {
      background: rgba(255, 255, 255, 0.05);
      border-color: #30363d;
      color: #8b949e;
      padding: 8px 10px;
    }
    
    .doc-action-btn.close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(139, 148, 158, 0.4);
      color: #c9d1d9;
      box-shadow: none;
    }
    
    /* Content Area */
    .doc-viewer-content {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #0d1117;
    }
    
    .doc-preview-container,
    .doc-code-container {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }
    
    .doc-preview-container.active,
    .doc-code-container.active {
      opacity: 1;
      visibility: visible;
    }
    
    #doc-preview-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: #0d1117;
    }
    
    /* Code View */
    .doc-code-container {
      padding: 16px;
      background: #010409;
      overflow: auto;
    }
    
    .doc-code-container .code-block {
      background: #0d1117;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #30363d;
    }
    
    .doc-code-container .code-header {
      background: #161b22;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #30363d;
    }
    
    .doc-code-container .code-language {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #8b949e;
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .doc-code-container .code-language svg {
      color: #06b6d4;
    }
    
    .doc-code-container .copy-html {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #c9d1d9;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .doc-code-container .copy-html:hover {
      background: rgba(6, 182, 212, 0.15);
      border-color: rgba(6, 182, 212, 0.4);
      color: #06b6d4;
    }
    
    .doc-code-container .copy-html.copied {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #10b981;
    }
    
    .doc-code-container pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      max-height: calc(100vh - 200px);
    }
    
    .doc-code-container code {
      font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.8rem;
      line-height: 1.6;
      color: #c9d1d9;
    }
    
    /* Scrollbar */
    .doc-code-container::-webkit-scrollbar,
    .doc-code-container pre::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    .doc-code-container::-webkit-scrollbar-track,
    .doc-code-container pre::-webkit-scrollbar-track {
      background: #0d1117;
    }
    
    .doc-code-container::-webkit-scrollbar-thumb,
    .doc-code-container pre::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 5px;
    }
    
    .doc-code-container::-webkit-scrollbar-thumb:hover,
    .doc-code-container pre::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .doc-viewer-container {
        width: 98%;
        height: 96%;
        margin: 2% 1%;
        border-radius: 8px;
      }
      
      .doc-viewer-header {
        padding: 10px 12px;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .doc-actions {
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .doc-action-btn {
        padding: 6px 10px;
        font-size: 0.75rem;
      }
      
      .doc-action-btn span {
        display: none;
      }
      
      .doc-action-btn svg {
        width: 18px;
        height: 18px;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(viewer);
  
  // Set iframe content
  const iframe = viewer.querySelector('#doc-preview-frame') as HTMLIFrameElement;
  if (iframe) {
    iframe.srcdoc = htmlContent;
  }
  
  // Close handler
  const closeViewer = () => {
    viewer.classList.remove('viewer-open');
    setTimeout(() => {
      viewer.remove();
      style.remove();
    }, 300);
  };
  
  // Animate in
  requestAnimationFrame(() => {
    viewer.classList.add('viewer-open');
  });
  
  // ============================================================================
  // CLOSE BUTTON HANDLER
  // ============================================================================
  const closeBtn = viewer.querySelector('.close-btn');
  closeBtn?.addEventListener('click', closeViewer);
  
  // Close on overlay click
  const overlay = viewer.querySelector('.doc-viewer-overlay');
  overlay?.addEventListener('click', closeViewer);
  
  // ============================================================================
  // EDIT BUTTON HANDLER
  // ============================================================================
  const editBtn = viewer.querySelector('.edit-btn');
  editBtn?.addEventListener('click', () => {
  console.log('✏️ Edit button clicked - Opening WYSIWYG Editor...');
  
  // Extract body content from the full HTML document
  let editableContent = htmlContent;
  
  // Try to extract just the main content for editing
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Try to get the main content area
    const mainContent = doc.querySelector('.content') || 
                        doc.querySelector('main') || 
                        doc.querySelector('.document') ||
                        doc.body;
    
    if (mainContent) {
      editableContent = mainContent.innerHTML;
      console.log('   ✅ Extracted content from:', mainContent.tagName || mainContent.className);
    }
  } catch (e) {
    console.log('   ⚠️ Could not parse HTML, using full content');
  }
  
  // Ensure we have valid content
  if (!editableContent || editableContent === 'undefined' || editableContent.trim() === '') {
    editableContent = '<p>No content to edit</p>';
    console.log('   ⚠️ Content was empty, using placeholder');
  }
  
  console.log('   📄 Content length:', editableContent.length);
  
  // Close the viewer first
  closeViewer();
  
  // Open WYSIWYG editor after small delay
  setTimeout(() => {
    openWYSIWYGEditor({
      htmlContent: editableContent,
      fileName: fileName,
      
      onSave: async (editedHTML: string) => {
        console.log('💾 WYSIWYG Save triggered...');
        console.log('   📄 Content length:', editedHTML.length);
        console.log('   📁 File name:', fileName);
        
        let saved = false;
        
        try {
          // ═══════════════════════════════════════════════════════════════
          // Method 1: Use Monaco Editor Integration
          // ═══════════════════════════════════════════════════════════════
          console.log('🔍 Attempting Method 1: Monaco Editor...');
          const monacoEditor = (window as any).monacoEditorInstance;
          
          if (monacoEditor?.setValue) {
            console.log('   ✅ Monaco editor found, setting value...');
            monacoEditor.setValue(editedHTML);
            showNotification('✅ Content updated in editor', 'success');
            saved = true;
            
            // Update local reference
            htmlContent = editedHTML;
            
            console.log('✅ Method 1 SUCCESS: Monaco editor updated');
            return; // Exit successfully
          } else {
            console.log('   ⏭️ Method 1 failed: Monaco editor not available');
          }
          
          // ═══════════════════════════════════════════════════════════════
          // Method 2: Use Tab Manager
          // ═══════════════════════════════════════════════════════════════
          console.log('🔍 Attempting Method 2: Tab Manager...');
          const tabManager = (window as any).tabManager;
          
          if (tabManager?.currentFile) {
            console.log('   ✅ Tab manager found, updating content...');
            console.log('   📁 Current file:', tabManager.currentFile.name);
            
            // Update the tab manager's content
            console.log('   ✅ Updating tab manager content');
            tabManager.currentFile.content = editedHTML;
            tabManager.currentFile.modified = true;
            
            // Try to trigger save if available
            if (typeof tabManager.saveCurrentFile === 'function') {
              console.log('   🔄 Calling tabManager.saveCurrentFile()...');
              await tabManager.saveCurrentFile();
              showNotification('✅ File saved via tab manager', 'success');
              saved = true;
            } else {
              console.log('   ✅ Content updated (no save method)');
              showNotification('✅ Content updated in tab', 'info');
              saved = true;
            }
            
            // Update local reference
            htmlContent = editedHTML;
            
            if (saved) {
              console.log('✅ Method 2 SUCCESS: Tab manager updated');
              return; // Exit successfully
            }
          } else {
            console.log('   ⏭️ Method 2 failed: Tab manager not available');
          }
          
          // ═══════════════════════════════════════════════════════════════
          // Method 3: Use FileSystem Write
          // ═══════════════════════════════════════════════════════════════
          console.log('🔍 Attempting Method 3: File System...');
          const fileSystem = (window as any).fileSystem;
          
          if (fileSystem?.writeFile) {
            const savePath = fileName.endsWith('.html') 
              ? fileName 
              : `${fileName}.html`;
            
            console.log('   📁 Saving to:', savePath);
            await fileSystem.writeFile(savePath, editedHTML);
            
            showNotification(`✅ Saved to ${savePath}`, 'success');
            saved = true;
            
            // Update local reference
            htmlContent = editedHTML;
            
            console.log('✅ Method 3 SUCCESS: File system write completed');
            return; // Exit successfully
          } else {
            console.log('   ⏭️ Method 3 failed: FileSystem not available');
          }
          
          // ═══════════════════════════════════════════════════════════════
          // Method 4: Update Local Content Only (No Save to Disk)
          // ═══════════════════════════════════════════════════════════════
          if (!saved) {
            console.log('⚠️ Method 4: Updating local content only (in-memory)');
            htmlContent = editedHTML;
            showNotification('⚠️ Content updated (not saved to disk)', 'warning');
            
            console.log('ℹ️ Tip: Use "Download HTML" button to save manually');
          }
          
        } catch (error) {
          console.error('❌ Save error:', error);
          showNotification('❌ Save failed: ' + (error as Error).message, 'error');
        }
      },
      
      onClose: () => {
        console.log('🚪 WYSIWYG editor closed');
      }
    });
  }, 100); // Small delay for smooth transition
});
  
  // ============================================================================
  // DOWNLOAD BUTTON HANDLER
  // ============================================================================
  const downloadBtn = viewer.querySelector('.download-btn');
  downloadBtn?.addEventListener('click', () => {
    downloadHTMLFile(htmlContent, fileName);
    showNotification('📄 Documentation downloaded!', 'success');
  });
  
  // ============================================================================
  // PREVIEW/CODE TOGGLE HANDLERS
  // ============================================================================
  const previewBtn = viewer.querySelector('.preview-btn');
  const codeBtn = viewer.querySelector('.code-btn');
  const previewContainer = viewer.querySelector('.doc-preview-container');
  const codeContainer = viewer.querySelector('.doc-code-container');
  
  previewBtn?.addEventListener('click', () => {
    previewBtn.classList.add('active');
    codeBtn?.classList.remove('active');
    previewContainer?.classList.add('active');
    codeContainer?.classList.remove('active');
  });
  
  codeBtn?.addEventListener('click', () => {
    codeBtn.classList.add('active');
    previewBtn?.classList.remove('active');
    codeContainer?.classList.add('active');
    previewContainer?.classList.remove('active');
  });
  
  // ============================================================================
  // COPY HTML BUTTON HANDLER
  // ============================================================================
  const copyBtn = viewer.querySelector('.copy-html');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = `${SVG_ICONS.check} <span>Copied!</span>`;
      copyBtn.classList.add('copied');
      
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.classList.remove('copied');
      }, 1500);
      
      showNotification('📋 HTML copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showNotification('❌ Copy failed', 'error');
    }
  });
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape to close
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', handleKeyDown);
    }
    
    // Ctrl/Cmd + E to open editor
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      editBtn?.dispatchEvent(new Event('click'));
    }
    
    // Ctrl/Cmd + S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      downloadBtn?.dispatchEvent(new Event('click'));
    }
    
    // Ctrl/Cmd + C to copy (when code view is active)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && codeContainer?.classList.contains('active')) {
      e.preventDefault();
      copyBtn?.dispatchEvent(new Event('click'));
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Download HTML file
 */
function downloadHTMLFile(htmlContent: string, fileName: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


/**
 * Convert AI response to HTML and display with appropriate template
 * AUTO-SELECTS between simple and full templates
 */
export async function convertResponseToHTML(content: string, fileName?: string): Promise<void> {
  try {
    const displayName = fileName || 'response';
    
    // Determine template type
    const templateType = getTemplateType(content);
    const isSimple = shouldUseSimpleTemplate(content);
    
    showNotification(`⚡ Generating ${templateType}...`, 'info');
    
    const aiProvider = 'AI Assistant';
    const timestamp = new Date().toLocaleString();
    
    if (isSimple) {
      // Use lightweight simple template (new)
      displaySimpleResponseViewer(content, displayName);
    } else {
      // Use full documentation template (existing)
      const codeMetadata = extractCodeMetadata(content, fileName);
      const styledHtml = generateResponseHTML(content, aiProvider, timestamp, codeMetadata);
      const outputFileName = `${codeMetadata.fileName}-${Date.now()}.html`;
      displayHTMLResponseViewerBlob(styledHtml, outputFileName);
    }
    
    showNotification(`✅ ${templateType} ready!`, 'success');
    
  } catch (error) {
    console.error('Failed to convert response to HTML:', error);
    showNotification('Failed to generate: ' + (error as Error).message, 'error');
  }
}

// Export SVG icons for use in other files
export { SVG_ICONS };
