export function formatPythonCode(code: string): string {
  // Simple formatting: add spaces after commas if missing
  let formatted = code.replace(/,(\S)/g, ', $1');
  
  // Add spaces around operators
  formatted = formatted.replace(/([^\s])(\+|\-|\*|\/|=|==|!=|>=|<=|>|<)([^\s])/g, '$1 $2 $3');
  
  // Fix function definition spacing
  formatted = formatted.replace(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*/g, 'def $1(');
  
  return formatted;
}