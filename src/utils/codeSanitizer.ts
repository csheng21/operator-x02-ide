export function sanitizeCodeResponse(response: string): string {
  // Remove HTML tags from code
  let cleaned = response;
  
  // Preserve code blocks first
  const codeBlocks = new Map<string, string>();
  let blockIndex = 0;
  
  cleaned = cleaned.replace(/```[\w]*\n([\s\S]*?)```/g, (match, code) => {
    const placeholder = `__CODE_BLOCK_${blockIndex}__`;
    codeBlocks.set(placeholder, code);
    blockIndex++;
    return placeholder;
  });
  
  // Now restore code blocks without HTML processing
  codeBlocks.forEach((code, placeholder) => {
    cleaned = cleaned.replace(placeholder, '```\n' + code + '\n```');
  });
  
  return cleaned;
}

export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}