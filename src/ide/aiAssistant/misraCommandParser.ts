// ============================================================================
// FILE: src/ide/aiAssistant/misraCommandParser.ts
// PURPOSE: Parse user messages for MISRA analysis commands
// ============================================================================

export interface MISRACommand {
  detected: boolean;
  standard: 'MISRA-C' | 'MISRA-CPP' | null;
  version: string | null;
  complianceLevel: 'Strict' | 'Standard' | null;
  specificRules: string[];
  keywords: string[];
  originalMessage: string;
}

export class MISRACommandParser {
  
  /**
   * MISRA command detection patterns
   */
  private static readonly COMMAND_PATTERNS = {
    // MISRA C patterns
    misraC: [
      /misra\s*c/i,
      /misra-c/i,
      /misrac/i
    ],
    
    // MISRA C++ patterns
    misraCpp: [
      /misra\s*c\+\+/i,
      /misra-c\+\+/i,
      /misra\s*cpp/i,
      /misra-cpp/i,
      /misracpp/i
    ],
    
    // Generic MISRA
    misraGeneric: [
      /\bmisra\b/i
    ],
    
    // Version patterns
    version2012: [
      /2012/,
      /:2012/,
      /\(2012\)/
    ],
    
    version2023: [
      /2023/,
      /:2023/,
      /\(2023\)/
    ],
    
    version2008: [
      /2008/,
      /:2008/,
      /\(2008\)/
    ],
    
    // Compliance level
    strict: [
      /strict\s+compliance/i,
      /strict\s+misra/i,
      /full\s+compliance/i
    ],
    
    // Analysis commands
    analyze: [
      /analyz[e|ing]/i,
      /check/i,
      /verify/i,
      /validate/i,
      /review/i,
      /audit/i,
      /inspect/i
    ],
    
    // Compliance commands
    compliance: [
      /compliance/i,
      /compliant/i,
      /conform/i,
      /adherence/i
    ],
    
    // Rule-specific patterns
    rulePattern: /rule\s+(\d+\.?\d*)/gi
  };
  
  /**
   * Parse user message for MISRA commands
   */
  public static parseMessage(message: string): MISRACommand {
    const command: MISRACommand = {
      detected: false,
      standard: null,
      version: null,
      complianceLevel: null,
      specificRules: [],
      keywords: [],
      originalMessage: message
    };
    
    const messageLower = message.toLowerCase();
    
    // ========================================================================
    // 1. Detect if MISRA is mentioned
    // ========================================================================
    const hasMISRAKeyword = this.COMMAND_PATTERNS.misraGeneric.some(pattern => 
      pattern.test(message)
    );
    
    if (!hasMISRAKeyword) {
      return command; // Not a MISRA command
    }
    
    command.detected = true;
    command.keywords.push('MISRA');
    
    // ========================================================================
    // 2. Determine MISRA standard (C vs C++)
    // ========================================================================
    
    // Check for MISRA C++ first (more specific)
    const isMISRACpp = this.COMMAND_PATTERNS.misraCpp.some(pattern => 
      pattern.test(message)
    );
    
    if (isMISRACpp) {
      command.standard = 'MISRA-CPP';
      command.keywords.push('MISRA C++');
    } else {
      // Check for MISRA C
      const isMISRAC = this.COMMAND_PATTERNS.misraC.some(pattern => 
        pattern.test(message)
      );
      
      if (isMISRAC) {
        command.standard = 'MISRA-C';
        command.keywords.push('MISRA C');
      }
    }
    
    // ========================================================================
    // 3. Detect version
    // ========================================================================
    if (this.COMMAND_PATTERNS.version2012.some(p => p.test(message))) {
      command.version = '2012';
      command.keywords.push('2012');
    } else if (this.COMMAND_PATTERNS.version2023.some(p => p.test(message))) {
      command.version = '2023';
      command.keywords.push('2023');
    } else if (this.COMMAND_PATTERNS.version2008.some(p => p.test(message))) {
      command.version = '2008';
      command.keywords.push('2008');
    }
    
    // ========================================================================
    // 4. Detect compliance level
    // ========================================================================
    if (this.COMMAND_PATTERNS.strict.some(p => p.test(message))) {
      command.complianceLevel = 'Strict';
      command.keywords.push('Strict Compliance');
    } else if (this.COMMAND_PATTERNS.compliance.some(p => p.test(message))) {
      command.complianceLevel = 'Standard';
      command.keywords.push('Compliance');
    }
    
    // ========================================================================
    // 5. Extract specific rule references
    // ========================================================================
    const ruleMatches = message.matchAll(this.COMMAND_PATTERNS.rulePattern);
    for (const match of ruleMatches) {
      if (match[1]) {
        const ruleId = `Rule ${match[1]}`;
        command.specificRules.push(ruleId);
        command.keywords.push(ruleId);
      }
    }
    
    console.log('📋 MISRA Command Parsed:', command);
    
    return command;
  }
  
  /**
   * Generate enhanced prompt based on command
   */
  public static generateEnhancedPrompt(
    command: MISRACommand,
    code: string,
    fileName: string,
    language: string
  ): string {
    if (!command.detected) {
      return ''; // No MISRA command detected
    }
    
    // Determine standard name
    let standardName = 'MISRA';
    if (command.standard === 'MISRA-C') {
      standardName = `MISRA C${command.version ? `:${command.version}` : ''}`;
    } else if (command.standard === 'MISRA-CPP') {
      standardName = `MISRA C++${command.version ? `:${command.version}` : ''}`;
    } else if (command.version) {
      // Generic MISRA with version - infer from file
      if (language === 'cpp' || language === 'cc' || language === 'cxx') {
        standardName = `MISRA C++:${command.version}`;
      } else {
        standardName = `MISRA C:${command.version}`;
      }
    }
    
    let prompt = `# 📋 ${standardName} COMPLIANCE ANALYSIS REQUEST\n\n`;
    prompt += `**User Command**: "${command.originalMessage}"\n\n`;
    prompt += `## Analysis Configuration\n\n`;
    prompt += `- **Standard**: ${standardName}\n`;
    prompt += `- **File**: ${fileName}\n`;
    prompt += `- **Language**: ${language.toUpperCase()}\n`;
    
    if (command.complianceLevel) {
      prompt += `- **Compliance Level**: ${command.complianceLevel}\n`;
    }
    
    if (command.specificRules.length > 0) {
      prompt += `- **Specific Rules Requested**: ${command.specificRules.join(', ')}\n`;
    }
    
    prompt += `\n---\n\n`;
    
    // Add code with line numbers
    const codeLines = code.split('\n');
    const codeWithLineNumbers = codeLines
      .map((line, index) => `${index + 1}: ${line}`)
      .join('\n');
    
    prompt += `## Code to Analyze\n\n`;
    prompt += `\`\`\`${language}\n${codeWithLineNumbers}\n\`\`\`\n\n`;
    prompt += `---\n\n`;
    
    // Generate detailed requirements
    prompt += `## Required Analysis\n\n`;
    
    if (command.specificRules.length > 0) {
      prompt += `### Focus on Specific Rules\n\n`;
      prompt += `The user requested analysis of these specific ${standardName} rules:\n\n`;
      command.specificRules.forEach(rule => {
        prompt += `#### ${rule}\n\n`;
        prompt += `1. **Check Compliance**: Does the code comply with ${rule}?\n`;
        prompt += `2. **Violations**: Identify any violations with line numbers\n`;
        prompt += `3. **Rule Details**: Explain the rule (Category, Decidability, Rationale)\n`;
        prompt += `4. **Fix**: Provide specific fix if violated\n\n`;
      });
    } else {
      // Comprehensive analysis
      prompt += `### Comprehensive ${standardName} Analysis\n\n`;
      prompt += `Provide a complete ${standardName} compliance analysis including:\n\n`;
      
      prompt += `#### 1. COMPLIANCE OVERVIEW\n`;
      prompt += `- Overall compliance status\n`;
      prompt += `- Number of violations by category (Mandatory/Required/Advisory)\n`;
      prompt += `- Compliance percentage\n`;
      prompt += `- Risk level assessment\n\n`;
      
      prompt += `#### 2. RULE VIOLATIONS\n\n`;
      prompt += `For EACH violation found, provide:\n\n`;
      prompt += `**Rule [X.X] - [Category]**\n`;
      prompt += `- **Rule ID**: Rule X.X\n`;
      prompt += `- **Category**: Mandatory/Required/Advisory\n`;
      prompt += `- **Standard**: ${standardName}\n`;
      prompt += `- **Decidable**: Yes/No (can be checked automatically)\n`;
      prompt += `- **Line(s)**: [specific line numbers]\n`;
      prompt += `- **Violation**: [what is wrong]\n`;
      prompt += `- **Description**: [what the rule requires]\n`;
      prompt += `- **Rationale**: [why this rule exists]\n`;
      prompt += `- **Fix**: [how to correct it]\n`;
      prompt += `- **Code Example**: [corrected code snippet]\n\n`;
      
      prompt += `#### 3. CODE QUALITY ASSESSMENT\n`;
      prompt += `- Clean code principles adherence\n`;
      prompt += `- Best practices evaluation\n`;
      prompt += `- Maintainability assessment\n\n`;
      
      prompt += `#### 4. RECOMMENDATIONS\n`;
      prompt += `- Priority fixes (Mandatory > Required > Advisory)\n`;
      prompt += `- Static analysis tool recommendations\n`;
      prompt += `- Process improvements\n\n`;
    }
    
    if (command.complianceLevel === 'Strict') {
      prompt += `\n**⚠️ STRICT COMPLIANCE MODE**\n`;
      prompt += `User requested strict compliance analysis. Be thorough and flag even minor deviations.\n`;
    }
    
    prompt += `\n---\n\n`;
    prompt += `Format with clear sections, specific rule citations, and actionable guidance.\n`;
    
    return prompt;
  }
  
  /**
   * Check if message is a MISRA analysis request
   */
  public static isMISRARequest(message: string): boolean {
    const command = this.parseMessage(message);
    return command.detected;
  }
  
  /**
   * Get display name for command
   */
  public static getCommandDisplayName(command: MISRACommand): string {
    if (!command.detected) return '';
    
    let name = 'MISRA';
    
    if (command.standard === 'MISRA-C') {
      name = 'MISRA C';
    } else if (command.standard === 'MISRA-CPP') {
      name = 'MISRA C++';
    }
    
    if (command.version) {
      name += `:${command.version}`;
    }
    
    if (command.complianceLevel === 'Strict') {
      name += ' (Strict)';
    }
    
    return name;
  }
}

export default MISRACommandParser;