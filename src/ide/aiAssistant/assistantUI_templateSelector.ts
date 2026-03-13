// assistantUI_templateSelector.ts - Smart Template Selection Logic

/**
 * Count actual content lines (ignore empty lines)
 */
export function countContentLines(content: string): number {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  return lines.length;
}

/**
 * Detect if content has code blocks
 */
export function hasCodeBlocks(content: string): boolean {
  return (content.match(/```/g) || []).length > 0;
}

/**
 * Detect if content has major headers
 */
export function hasHeaders(content: string): boolean {
  return /^#{1,3}\s+/m.test(content);
}

/**
 * Determine which template to use
 * 
 * Simple Template: Short, conversational responses
 * Full Template: Documentation, code examples, long-form content
 */
export function shouldUseSimpleTemplate(content: string): boolean {
  const lineCount = countContentLines(content);
  const hasCode = hasCodeBlocks(content);
  const hasMajorHeaders = hasHeaders(content);
  
  // Use simple template if:
  // - Less than 50 lines AND
  // - No code blocks AND
  // - No major section headers
  return lineCount < 50 && !hasCode && !hasMajorHeaders;
}

/**
 * Get template type name for logging/notifications
 */
export function getTemplateType(content: string): string {
  return shouldUseSimpleTemplate(content) ? 'Quick Response' : 'Documentation';
}