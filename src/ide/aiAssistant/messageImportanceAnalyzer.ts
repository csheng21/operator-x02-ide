// ide/aiAssistant/messageImportanceAnalyzer.ts
// Intelligent message filtering for optimized storage

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface ImportanceConfig {
  minMessageLength: number;          // Minimum chars to consider important
  saveRecentCount: number;            // Always save N most recent messages
  saveCodeMessages: boolean;          // Save messages with code blocks
  saveFileOperations: boolean;        // Save messages about file operations
  saveTechnicalContent: boolean;      // Save technical discussions
  removeGreetings: boolean;           // Filter out simple greetings
  compressionLevel: 'none' | 'light' | 'aggressive';
}

const DEFAULT_CONFIG: ImportanceConfig = {
  minMessageLength: 50,
  saveRecentCount: 20,                // Keep last 20 messages always
  saveCodeMessages: true,
  saveFileOperations: true,
  saveTechnicalContent: true,
  removeGreetings: true,
  compressionLevel: 'light'
};

export class MessageImportanceAnalyzer {
  private config: ImportanceConfig;

  constructor(config: Partial<ImportanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ✅ Main method: Filter messages by importance
  filterImportantMessages(messages: Message[]): Message[] {
    if (messages.length === 0) return [];

    // Always keep recent messages
    const recentCount = this.config.saveRecentCount;
    const recentMessages = messages.slice(-recentCount);
    
    // Analyze older messages for importance
    const olderMessages = messages.slice(0, -recentCount);
    const importantOlderMessages = olderMessages.filter(msg => 
      this.isMessageImportant(msg)
    );

    // Combine important old + all recent
    const filtered = [...importantOlderMessages, ...recentMessages];
    
    console.log(`📊 Message filtering: ${messages.length} → ${filtered.length} (${this.getSizeSavings(messages, filtered)}% smaller)`);
    
    return filtered;
  }

  // ✅ Determine if a message is important
  private isMessageImportant(message: Message): boolean {
    const content = message.content;

    // 1. Check minimum length
    if (content.length < this.config.minMessageLength) {
      if (!this.hasCodeBlock(content)) {
        return false;
      }
    }

    // 2. Filter out greetings/small talk
    if (this.config.removeGreetings && this.isGreeting(content)) {
      return false;
    }

    // 3. Keep messages with code
    if (this.config.saveCodeMessages && this.hasCodeBlock(content)) {
      return true;
    }

    // 4. Keep file operations
    if (this.config.saveFileOperations && this.hasFileOperation(content)) {
      return true;
    }

    // 5. Keep technical content
    if (this.config.saveTechnicalContent && this.isTechnicalContent(content)) {
      return true;
    }

    // 6. Keep error/problem discussions
    if (this.hasErrorContent(content)) {
      return true;
    }

    // 7. Keep multi-line substantial content
    if (content.split('\n').length > 3 && content.length > 100) {
      return true;
    }

    return false;
  }

  // ✅ Detect greetings/casual chat
  private isGreeting(content: string): boolean {
    const lower = content.toLowerCase().trim();
    const greetings = [
      /^(hi|hey|hello|yo|sup|howdy)[\s!?]*$/i,
      /^how are you[\s?!]*$/i,
      /^good (morning|afternoon|evening|night)[\s!?]*$/i,
      /^thanks[\s!]*$/i,
      /^thank you[\s!]*$/i,
      /^ok[\s!]*$/i,
      /^okay[\s!]*$/i,
      /^cool[\s!]*$/i,
      /^nice[\s!]*$/i,
      /^got it[\s!]*$/i,
      /^i see[\s!]*$/i,
    ];

    return greetings.some(pattern => pattern.test(lower));
  }

  // ✅ Detect code blocks
  private hasCodeBlock(content: string): boolean {
    return /```[\s\S]*?```/.test(content) || 
           /`[^`]+`/.test(content) ||
           /\.(ts|js|py|java|cpp|c|go|rs|kt|swift)\b/i.test(content);
  }

  // ✅ Detect file operations
  private hasFileOperation(content: string): boolean {
    const keywords = [
      'file', 'folder', 'directory', 'save', 'open', 'create',
      'delete', 'rename', 'move', 'copy', 'export', 'import',
      'read', 'write', 'path', 'upload', 'download'
    ];
    const lower = content.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }

  // ✅ Detect technical content
  private isTechnicalContent(content: string): boolean {
    const technicalKeywords = [
      'function', 'class', 'method', 'variable', 'error', 'bug',
      'debug', 'compile', 'build', 'deploy', 'api', 'database',
      'query', 'syntax', 'algorithm', 'optimize', 'performance',
      'memory', 'cpu', 'thread', 'async', 'await', 'promise',
      'component', 'module', 'package', 'library', 'framework'
    ];
    
    const lower = content.toLowerCase();
    return technicalKeywords.some(kw => lower.includes(kw));
  }

  // ✅ Detect error/problem content
  private hasErrorContent(content: string): boolean {
    const errorPatterns = [
      /error/i, /exception/i, /fail/i, /crash/i, /bug/i,
      /issue/i, /problem/i, /fix/i, /broken/i, /not working/i
    ];
    return errorPatterns.some(pattern => pattern.test(content));
  }

  // ✅ Calculate size savings percentage
  private getSizeSavings(original: Message[], filtered: Message[]): number {
    const originalSize = JSON.stringify(original).length;
    const filteredSize = JSON.stringify(filtered).length;
    return Math.round(((originalSize - filteredSize) / originalSize) * 100);
  }

  // ✅ Update configuration
  updateConfig(config: Partial<ImportanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ✅ Get current configuration
  getConfig(): ImportanceConfig {
    return { ...this.config };
  }
}

// ✅ Message compression utilities
export class MessageCompressor {
  // Compress message by removing redundant data
  static compressMessage(message: Message, level: ImportanceConfig['compressionLevel']): Message {
    const compressed = { ...message };

    if (level === 'none') {
      return compressed;
    }

    // Light compression: Remove empty metadata
    if (level === 'light' || level === 'aggressive') {
      if (compressed.metadata) {
        // Remove empty/null metadata fields
        compressed.metadata = Object.fromEntries(
          Object.entries(compressed.metadata).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
        
        // Remove if metadata is empty
        if (Object.keys(compressed.metadata).length === 0) {
          delete compressed.metadata;
        }
      }
    }

    // Aggressive compression: Strip all non-essential data
    if (level === 'aggressive') {
      // Keep only essential fields
      return {
        id: compressed.id,
        role: compressed.role,
        content: compressed.content,
        timestamp: compressed.timestamp
      };
    }

    return compressed;
  }

  // Compress array of messages
  static compressMessages(messages: Message[], level: ImportanceConfig['compressionLevel']): Message[] {
    return messages.map(msg => this.compressMessage(msg, level));
  }

  // Calculate compression ratio
  static getCompressionRatio(original: Message[], compressed: Message[]): number {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = JSON.stringify(compressed).length;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }
}

// ✅ Export default analyzer instance
export const messageImportanceAnalyzer = new MessageImportanceAnalyzer();