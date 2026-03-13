// messageImportanceAnalyzer_developer.ts
// Development-focused optimization with file context and 120KB limit

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface DeveloperConfig {
  // Size limits
  maxConversationSizeKB: number;        // 120KB per conversation
  maxMessageSizeKB: number;              // 50KB per message (truncate long ones)
  
  // Priority settings
  recentMessageCount: number;            // Always keep last N messages
  recentMessageWeight: number;           // 1.0 = full priority
  oldMessageWeight: number;              // 0.3 = 30% of recent priority
  
  // Development criteria (importance scores)
  fileOperationScore: number;            // 10 = highest priority
  bugFixScore: number;                   // 9
  codeStructureScore: number;            // 8
  technicalDecisionScore: number;        // 7
  configurationScore: number;            // 6
  dependencyScore: number;               // 5
  generalTechnicalScore: number;         // 4
  clarificationScore: number;            // 2
  greetingScore: number;                 // 0 = filter out
  
  // Context preservation
  extractFileContext: boolean;           // Extract file names/paths
  extractCodeRelationships: boolean;     // Extract dependencies/imports
  extractObjectives: boolean;            // Extract problem statements
  extractSolutions: boolean;             // Extract fix descriptions
  
  // Compression
  compressionLevel: 'none' | 'light' | 'aggressive';
}

const DEFAULT_DEVELOPER_CONFIG: DeveloperConfig = {
  maxConversationSizeKB: 120,
  maxMessageSizeKB: 50,
  
  recentMessageCount: 15,
  recentMessageWeight: 1.0,
  oldMessageWeight: 0.3,
  
  fileOperationScore: 10,
  bugFixScore: 9,
  codeStructureScore: 8,
  technicalDecisionScore: 7,
  configurationScore: 6,
  dependencyScore: 5,
  generalTechnicalScore: 4,
  clarificationScore: 2,
  greetingScore: 0,
  
  extractFileContext: true,
  extractCodeRelationships: true,
  extractObjectives: true,
  extractSolutions: true,
  
  compressionLevel: 'light'
};

export class DeveloperMessageAnalyzer {
  private config: DeveloperConfig;

  constructor(config: Partial<DeveloperConfig> = {}) {
    this.config = { ...DEFAULT_DEVELOPER_CONFIG, ...config };
  }

  // ✅ MAIN METHOD: Filter and optimize for development workflow
  optimizeConversation(messages: Message[]): Message[] {
    if (messages.length === 0) return [];

    console.log(`\n🔧 Development Optimization Started`);
    console.log(`   Input: ${messages.length} messages`);
    
    // Step 1: Always keep recent messages (high priority)
    const recentCount = this.config.recentMessageCount;
    const recentMessages = messages.slice(-recentCount);
    const oldMessages = messages.slice(0, -recentCount);
    
    console.log(`   Recent (kept): ${recentMessages.length}`);
    console.log(`   Old (filtering): ${oldMessages.length}`);
    
    // Step 2: Score and filter old messages by development importance
    const scoredOldMessages = oldMessages.map(msg => ({
      message: msg,
      score: this.calculateDevelopmentScore(msg)
    }));
    
    // Sort by score (highest first)
    scoredOldMessages.sort((a, b) => b.score - a.score);
    
    // Step 3: Keep old messages until size limit reached
    const selectedOldMessages: Message[] = [];
    let currentSizeKB = this.calculateSizeKB(recentMessages);
    const maxSizeKB = this.config.maxConversationSizeKB;
    
    for (const { message, score } of scoredOldMessages) {
      if (score === 0) continue; // Skip greetings
      
      const msgSize = this.calculateSizeKB([message]);
      if (currentSizeKB + msgSize <= maxSizeKB * 0.8) { // Reserve 20% for recent
        selectedOldMessages.push(message);
        currentSizeKB += msgSize;
      }
    }
    
    // Step 4: Combine (old messages first, then recent)
    const optimized = [
      ...selectedOldMessages.sort((a, b) => a.timestamp - b.timestamp),
      ...recentMessages
    ];
    
    // Step 5: Truncate if still over limit
    const finalMessages = this.enforceHardLimit(optimized);
    
    const finalSizeKB = this.calculateSizeKB(finalMessages);
    const reduction = Math.round((1 - finalMessages.length / messages.length) * 100);
    
    console.log(`\n   ✅ Optimization Complete:`);
    console.log(`      Messages: ${messages.length} → ${finalMessages.length} (${reduction}% reduction)`);
    console.log(`      Size: ${this.calculateSizeKB(messages)} KB → ${finalSizeKB} KB`);
    console.log(`      Status: ${finalSizeKB < maxSizeKB ? '✅ Under limit' : '⚠️ At limit'}\n`);
    
    return finalMessages;
  }

  // ✅ Calculate development importance score
  private calculateDevelopmentScore(message: Message): number {
    const content = message.content.toLowerCase();
    let score = 0;

    // 1. FILE OPERATIONS (Highest Priority)
    if (this.hasFileOperation(content)) {
      score += this.config.fileOperationScore;
      
      // Extract file context for metadata
      if (this.config.extractFileContext) {
        const files = this.extractFileNames(message.content);
        if (files.length > 0) {
          message.metadata = message.metadata || {};
          message.metadata.files = files;
          score += 2; // Bonus for having file names
        }
      }
    }

    // 2. BUG FIXES / ERROR SOLUTIONS
    if (this.hasBugFix(content)) {
      score += this.config.bugFixScore;
      
      if (this.config.extractSolutions) {
        const solution = this.extractSolution(message.content);
        if (solution) {
          message.metadata = message.metadata || {};
          message.metadata.solution = solution;
        }
      }
    }

    // 3. CODE STRUCTURE / ARCHITECTURE
    if (this.hasCodeStructure(content)) {
      score += this.config.codeStructureScore;
      
      if (this.config.extractCodeRelationships) {
        const relationships = this.extractRelationships(message.content);
        if (relationships.length > 0) {
          message.metadata = message.metadata || {};
          message.metadata.relationships = relationships;
        }
      }
    }

    // 4. TECHNICAL DECISIONS
    if (this.hasTechnicalDecision(content)) {
      score += this.config.technicalDecisionScore;
      
      if (this.config.extractObjectives) {
        const objective = this.extractObjective(message.content);
        if (objective) {
          message.metadata = message.metadata || {};
          message.metadata.objective = objective;
        }
      }
    }

    // 5. CONFIGURATION CHANGES
    if (this.hasConfiguration(content)) {
      score += this.config.configurationScore;
    }

    // 6. DEPENDENCIES / IMPORTS
    if (this.hasDependency(content)) {
      score += this.config.dependencyScore;
    }

    // 7. GENERAL TECHNICAL CONTENT
    if (this.hasTechnicalContent(content)) {
      score += this.config.generalTechnicalScore;
    }

    // 8. CODE BLOCKS (bonus)
    if (this.hasCodeBlock(message.content)) {
      score += 3;
    }

    // 9. CLARIFICATIONS (low priority)
    if (this.isClarification(content)) {
      score = Math.max(score, this.config.clarificationScore);
    }

    // 10. GREETINGS (filter out)
    if (this.isGreeting(content)) {
      return this.config.greetingScore; // 0
    }

    return score;
  }

  // ===================================================================
  // DETECTION METHODS
  // ===================================================================

  private hasFileOperation(content: string): boolean {
    const patterns = [
      /\b(create|created|creating|make|made|making)\s+(file|folder|directory|class|component|module)/i,
      /\b(save|saved|saving|write|wrote|writing)\s+to\s+[\w./]+/i,
      /\b(open|opened|opening|read|reading)\s+(file|folder)/i,
      /\b(delete|deleted|deleting|remove|removed|removing)\s+(file|folder)/i,
      /\b(rename|renamed|renaming|move|moved|moving)\s+(file|folder)/i,
      /\.(ts|js|jsx|tsx|py|java|cpp|go|rs|kt|swift|html|css|json|md)\b/i,
      /file\s+path/i,
      /file\s+name/i,
      /save\s+this\s+to/i,
      /put\s+this\s+in/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasBugFix(content: string): boolean {
    const patterns = [
      /\b(fix|fixed|fixing|solve|solved|solving|debug|debugged|debugging)\b/i,
      /\b(error|exception|bug|issue|problem|crash|fail|broken)\b/i,
      /\b(not\s+working|doesn't\s+work|isn't\s+working)\b/i,
      /\b(solution|fix|patch|workaround|resolve)\b/i,
      /\b(why\s+is|what's\s+wrong|what\s+went\s+wrong)\b/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasCodeStructure(content: string): boolean {
    const patterns = [
      /\b(class|interface|type|enum|struct)\s+\w+/i,
      /\b(function|method|procedure|routine)\s+\w+/i,
      /\b(component|module|package|library)\b/i,
      /\b(architecture|design|pattern|structure)\b/i,
      /\b(refactor|refactored|refactoring|restructure)\b/i,
      /\b(organize|organizing|organization)\b/i,
      /\b(extends|implements|inherits|inheritance)\b/i,
      /\b(relationship|dependency|coupling|cohesion)\b/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasTechnicalDecision(content: string): boolean {
    const patterns = [
      /\b(should|shall|would)\s+(we|i)\s+(use|implement|choose)/i,
      /\b(better\s+to|best\s+way|recommended|suggested)\b/i,
      /\b(pros\s+and\s+cons|advantages|disadvantages|trade-?offs?)\b/i,
      /\b(approach|strategy|methodology|technique)\b/i,
      /\b(why\s+use|why\s+not|when\s+to\s+use)\b/i,
      /\b(vs|versus|compared\s+to|comparison)\b/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasConfiguration(content: string): boolean {
    const patterns = [
      /\b(config|configuration|settings|setup|environment)\b/i,
      /\.(json|yaml|yml|toml|ini|env|config)\b/i,
      /\b(package\.json|tsconfig|webpack|vite|babel)\b/i,
      /\b(environment\s+variable|env\s+var)\b/i,
      /\b(api\s+key|token|secret|credential)\b/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasDependency(content: string): boolean {
    const patterns = [
      /\b(import|require|include|using|from)\s+['"`]/i,
      /\b(npm|yarn|pip|cargo|maven|gradle)\s+(install|add|remove)/i,
      /\b(package|library|module|dependency|dependencies)\b/i,
      /\b(version|update|upgrade|downgrade)\b/i,
      /package\.json/i,
      /requirements\.txt/i,
      /Cargo\.toml/i
    ];
    return patterns.some(p => p.test(content));
  }

  private hasTechnicalContent(content: string): boolean {
    const keywords = [
      'api', 'database', 'query', 'endpoint', 'request', 'response',
      'async', 'await', 'promise', 'callback', 'event', 'handler',
      'algorithm', 'optimization', 'performance', 'memory', 'cpu',
      'compile', 'build', 'deploy', 'test', 'debug',
      'typescript', 'javascript', 'python', 'java', 'react'
    ];
    return keywords.some(kw => content.includes(kw));
  }

  private hasCodeBlock(content: string): boolean {
    return /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
  }

  private isClarification(content: string): boolean {
    const patterns = [
      /\b(can\s+you\s+explain|what\s+does|what\s+is|how\s+does)\b/i,
      /\b(clarify|clarification|understand|confused)\b/i,
      /\b(more\s+detail|more\s+info|tell\s+me\s+more)\b/i
    ];
    return patterns.some(p => p.test(content));
  }

  private isGreeting(content: string): boolean {
    const greetings = [
      /^(hi|hey|hello|yo|sup|howdy)[\s!?]*$/i,
      /^how\s+are\s+you[\s?!]*$/i,
      /^good\s+(morning|afternoon|evening|night)[\s!?]*$/i,
      /^(thanks|thank\s+you|thx)[\s!]*$/i,
      /^(ok|okay|cool|nice|got\s+it|i\s+see)[\s!]*$/i
    ];
    return greetings.some(p => p.test(content.trim()));
  }

  // ===================================================================
  // CONTEXT EXTRACTION
  // ===================================================================

  private extractFileNames(content: string): string[] {
    const files: string[] = [];
    
    // Match file paths and names
    const patterns = [
      /[\w-]+\.(ts|js|jsx|tsx|py|java|cpp|c|go|rs|kt|swift|html|css|json|md|yml|yaml|toml)\b/gi,
      /[./][\w/-]+\.(ts|js|jsx|tsx|py|java|cpp|c|go|rs|kt|swift)\b/gi,
      /(src|lib|components|utils|services|api)\/[\w/-]+/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        files.push(...matches);
      }
    });
    
    return [...new Set(files)].slice(0, 10); // Unique, max 10
  }

  private extractRelationships(content: string): string[] {
    const relationships: string[] = [];
    
    // Extract imports/requires
    const importPattern = /(?:import|require|from)\s+['"`]([^'"`]+)['"`]/gi;
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      relationships.push(match[1]);
    }
    
    // Extract class relationships
    const extendsPattern = /(?:extends|implements|inherits)\s+(\w+)/gi;
    while ((match = extendsPattern.exec(content)) !== null) {
      relationships.push(`extends:${match[1]}`);
    }
    
    return [...new Set(relationships)].slice(0, 5);
  }

  private extractObjective(content: string): string | null {
    // Extract the main objective/problem statement
    const lines = content.split('\n');
    
    // Look for question or problem statement in first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 20 && line.length < 200) {
        if (line.includes('?') || 
            /^(how|what|why|when|where|can|should|need)/i.test(line)) {
          return line.substring(0, 150);
        }
      }
    }
    
    return null;
  }

  private extractSolution(content: string): string | null {
    // Extract solution/fix description
    const solutionKeywords = [
      'solution:', 'fix:', 'answer:', 'resolved:', 'try this:',
      'you can:', 'here\'s how:', 'the issue is:'
    ];
    
    for (const keyword of solutionKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const solution = content.substring(index, index + 200);
        return solution.split('\n')[0];
      }
    }
    
    return null;
  }

  // ===================================================================
  // SIZE MANAGEMENT
  // ===================================================================

  private calculateSizeKB(messages: Message[]): number {
    const sizeBytes = JSON.stringify(messages).length;
    return Math.round(sizeBytes / 1024 * 10) / 10; // Round to 1 decimal
  }

  private enforceHardLimit(messages: Message[]): Message[] {
    const maxSize = this.config.maxConversationSizeKB;
    let currentSize = this.calculateSizeKB(messages);
    
    if (currentSize <= maxSize) {
      return messages;
    }
    
    console.log(`   ⚠️ Over limit (${currentSize} KB), truncating...`);
    
    // Keep recent messages, truncate old messages
    const result: Message[] = [];
    const recentCount = this.config.recentMessageCount;
    const recentMessages = messages.slice(-recentCount);
    const oldMessages = messages.slice(0, -recentCount);
    
    // Add old messages until we approach limit
    let size = this.calculateSizeKB(recentMessages);
    for (const msg of oldMessages) {
      const msgSize = this.calculateSizeKB([msg]);
      if (size + msgSize < maxSize * 0.8) {
        result.push(msg);
        size += msgSize;
      }
    }
    
    result.push(...recentMessages);
    
    console.log(`   ✅ Truncated to ${result.length} messages (${this.calculateSizeKB(result)} KB)`);
    
    return result;
  }

  // Update configuration
  updateConfig(config: Partial<DeveloperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DeveloperConfig {
    return { ...this.config };
  }
}

export const developerMessageAnalyzer = new DeveloperMessageAnalyzer();