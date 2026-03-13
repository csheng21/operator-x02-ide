// ============================================================================
// FILE: src/ide/aiAssistant/aiDirectEditor.ts
// PURPOSE: AI-Powered Direct Code Editor with Explanations and Diff View
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================

import { getCurrentApiConfigurationForced, callGenericAPI } from './apiProviderManager';
import { addMessageToChat, addSystemMessage } from './messageUI';
import { queueMessageForSaving } from './messageQueueManager';
import { showNotification } from './notificationManager';
import { getCurrentCodeContext } from './codeContextManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EditProposal {
  original: string;
  modified: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  description: string;
  instruction?: string;
  linesRange?: string;
  explanation?: {
    objective: string;
    changes: string[];
    beforeSummary: string;
    afterSummary: string;
    stats: {
      linesAdded: number;
      linesRemoved: number;
      linesModified: number;
    };
  };
  misraContext?: {
    standard: string;
    violations: any[];
    recommendations: any[];
    originalAnalysis: string;
    modifiedCodeWithRules?: string; // ADD THIS: Code with MISRA comments
  };
}

// ============================================================================
// MISRA TYPE DEFINITIONS
// ============================================================================

interface MISRACommand {
  detected: boolean;
  standard: 'MISRA-C' | 'MISRA-CPP' | null;
  version: string | null;
  complianceLevel: 'Strict' | 'Standard' | null;
  specificRules: string[];
  keywords: string[];
  originalMessage: string;
}

// ============================================================================
// MISRA COMMAND PARSER (EMBEDDED)
// ============================================================================

class MISRACommandParser {
  private static readonly COMMAND_PATTERNS = {
    misraC: [/misra\s*c/i, /misra-c/i, /misrac/i],
    misraCpp: [/misra\s*c\+\+/i, /misra-c\+\+/i, /misra\s*cpp/i, /misra-cpp/i, /misracpp/i],
    misraGeneric: [/\bmisra\b/i],
    version2012: [/2012/, /:2012/, /\(2012\)/],
    version2023: [/2023/, /:2023/, /\(2023\)/],
    version2008: [/2008/, /:2008/, /\(2008\)/],
    strict: [/strict\s+compliance/i, /strict\s+misra/i, /full\s+compliance/i],
    rulePattern: /rule\s+(\d+\.?\d*)/gi
  };

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

    const hasMISRAKeyword = this.COMMAND_PATTERNS.misraGeneric.some(pattern => pattern.test(message));
    if (!hasMISRAKeyword) return command;

    command.detected = true;
    command.keywords.push('MISRA');

    const isMISRACpp = this.COMMAND_PATTERNS.misraCpp.some(pattern => pattern.test(message));
    if (isMISRACpp) {
      command.standard = 'MISRA-CPP';
      command.keywords.push('MISRA C++');
    } else {
      const isMISRAC = this.COMMAND_PATTERNS.misraC.some(pattern => pattern.test(message));
      if (isMISRAC) {
        command.standard = 'MISRA-C';
        command.keywords.push('MISRA C');
      }
    }

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

    if (this.COMMAND_PATTERNS.strict.some(p => p.test(message))) {
      command.complianceLevel = 'Strict';
      command.keywords.push('Strict Compliance');
    }

    const ruleMatches = message.matchAll(this.COMMAND_PATTERNS.rulePattern);
    for (const match of ruleMatches) {
      if (match[1]) {
        const ruleId = `Rule ${match[1]}`;
        command.specificRules.push(ruleId);
        command.keywords.push(ruleId);
      }
    }

    return command;
  }

  public static getCommandDisplayName(command: MISRACommand): string {
    if (!command.detected) return '';
    
    let name = 'MISRA';
    if (command.standard === 'MISRA-C') name = 'MISRA C';
    else if (command.standard === 'MISRA-CPP') name = 'MISRA C++';
    
    if (command.version) name += `:${command.version}`;
    if (command.complianceLevel === 'Strict') name += ' (Strict)';
    
    return name;
  }

  public static generateEnhancedPrompt(
    command: MISRACommand,
    code: string,
    fileName: string,
    language: string
  ): string {
    if (!command.detected) return '';

    let standardName = 'MISRA';
    if (command.standard === 'MISRA-C') {
      standardName = `MISRA C${command.version ? `:${command.version}` : ''}`;
    } else if (command.standard === 'MISRA-CPP') {
      standardName = `MISRA C++${command.version ? `:${command.version}` : ''}`;
    } else if (command.version) {
      if (language === 'cpp' || language === 'cc' || language === 'cxx') {
        standardName = `MISRA C++:${command.version}`;
      } else {
        standardName = `MISRA C:${command.version}`;
      }
    }

    const codeLines = code.split('\n');
    const codeWithLineNumbers = codeLines.map((line, index) => `${index + 1}: ${line}`).join('\n');

    let prompt = `# 📋 ${standardName} COMPLIANCE ANALYSIS REQUEST

**User Command**: "${command.originalMessage}"

## Analysis Configuration

- **Standard**: ${standardName}
- **File**: ${fileName}
- **Language**: ${language.toUpperCase()}`;

    if (command.complianceLevel) {
      prompt += `\n- **Compliance Level**: ${command.complianceLevel}`;
    }

    if (command.specificRules.length > 0) {
      prompt += `\n- **Specific Rules Requested**: ${command.specificRules.join(', ')}`;
    }

    prompt += `\n\n---\n\n## Code to Analyze\n\n\`\`\`${language}\n${codeWithLineNumbers}\n\`\`\`\n\n---\n\n`;

    if (command.specificRules.length > 0) {
      prompt += `## Focus on Specific Rules\n\nAnalyze these ${standardName} rules:\n\n`;
      command.specificRules.forEach(rule => {
        prompt += `### ${rule}\n\n`;
        prompt += `1. **Check Compliance**: Does the code comply with ${rule}?\n`;
        prompt += `2. **Violations**: Identify violations with line numbers\n`;
        prompt += `3. **Rule Details**: Explain the rule (Category, Decidability, Rationale)\n`;
        prompt += `4. **Fix**: Provide specific fix if violated\n\n`;
      });
    } else {
      prompt += `## Comprehensive ${standardName} Analysis\n\n`;
      prompt += `Provide complete compliance analysis:\n\n`;
      prompt += `### 1. COMPLIANCE OVERVIEW\n- Overall status\n- Violations by category (Mandatory/Required/Advisory)\n- Compliance percentage\n\n`;
      prompt += `### 2. RULE VIOLATIONS\n\nFor EACH violation:\n- **Rule ID**: Rule X.X\n- **Category**: Mandatory/Required/Advisory\n`;
      prompt += `- **Decidable**: Yes/No\n- **Line(s)**: [line numbers]\n- **Violation**: [description]\n- **Rationale**: [why rule exists]\n`;
      prompt += `- **Fix**: [how to correct]\n\n`;
      prompt += `### 3. RECOMMENDATIONS\n- Priority fixes\n- Tool recommendations\n- Process improvements\n\n`;
    }

    if (command.complianceLevel === 'Strict') {
      prompt += `\n**⚠️ STRICT COMPLIANCE MODE**: Flag all deviations, even minor ones.\n`;
    }

    return prompt;
  }
}
// ============================================================================
// MAIN CLASS: AIDirectEditor
// ============================================================================

export class AIDirectEditor {
  // --------------------------------------------------------------------------
  // CLASS PROPERTIES
  // --------------------------------------------------------------------------
  
  private diffEditor: any = null;
  private originalEditor: any = null;  // Store reference to main editor
  private currentProposal: EditProposal | null = null;
  private isProcessing: boolean = false;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private abortController: AbortController | null = null;
  private isMinimized: boolean = false;
  private currentInstruction: string = '';  // Store current task for loading UI
  private editRevisionCount: number = 0;
  private currentEditMessageId: string | null = null;
  
  // ============================================================================
  // BLOCK: INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize AI Direct Editor
   * Sets up keyboard shortcuts, styles, and editor commands
   */
public initialize(): void {
  console.log('🤖 Initializing AI Direct Editor...');
  this.setupKeyboardShortcuts();
  this.injectStyles();
  // this.addEditorCommands(); // ← COMMENTED OUT - actions added in initializeAIDirectEditor()
  console.log('✅ AI Direct Editor initialized');
}
  
  // ============================================================================
  // BLOCK: MAIN EDIT FUNCTION
  // ============================================================================
  
  /**
   * Edit selected code with AI
   * @param instruction - User's instruction for editing
   */
  public async editSelection(instruction: string): Promise<void> {
    if (this.isProcessing) {
      showNotification('AI is already processing', 'warning');
      return;
    }
    
    const editor = window.monaco?.editor?.getEditors()?.[0];
    if (!editor) {
      showNotification('No active editor', 'error');
      return;
    }
    
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      showNotification('Please select code first', 'warning');
      return;
    }
    
    this.isProcessing = true;
    this.abortController = new AbortController();
    
    const model = editor.getModel();
    const selectedText = model.getValueInRange(selection);
    const linesRange = `${selection.startLineNumber}-${selection.endLineNumber}`;
    
    console.log('📝 Editing:', {
      instruction,
      length: selectedText.length,
      lines: linesRange
    });
    
    this.showEditingIndicator(instruction, selectedText);
    this.showLoadingOverlay(instruction);
    
    try {
      const result = await this.getAIModificationWithExplanation(selectedText, instruction);
      
      if (!this.isProcessing) {
        console.log('Processing was cancelled');
        this.updateEditMessageStatus('cancelled');
        return;
      }
      
      console.log('✅ AI generated modification with explanation');
      
      this.hideLoadingOverlay();
      this.removeMinimizedLoading();
      this.updateEditMessageStatus('completed');
      
      const originalLines = selectedText.split('\n');
      const modifiedLines = result.modifiedCode.split('\n');
      const stats = this.calculateChangeStats(originalLines, modifiedLines);
      
      const proposal: EditProposal = {
        original: selectedText,
        modified: result.modifiedCode,
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber,
        startColumn: selection.startColumn,
        endColumn: selection.endColumn,
        description: instruction,
        instruction: instruction,
        linesRange: linesRange,
        explanation: {
          objective: result.explanation.objective,
          changes: result.explanation.changes,
          beforeSummary: result.explanation.beforeSummary,
          afterSummary: result.explanation.afterSummary,
          stats: stats
        }
      };
      
      await this.showDiffProposal(editor, proposal);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        this.updateEditMessageStatus('cancelled');
        return;
      }
      
      console.error('❌ Edit failed:', error);
      
      this.hideLoadingOverlay();
      this.removeMinimizedLoading();
      this.updateEditMessageStatus('failed');
      
      this.recordEditError(instruction, (error as Error).message);
      showNotification(`Failed: ${(error as Error).message}`, 'error');
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }
  
  // ============================================================================
  // BLOCK: MESSAGE STATUS MANAGEMENT
  // ============================================================================
  
  /**
   * Update or remove the processing status
   * @param status - Status to display (completed, failed, cancelled)
   */
  private updateEditMessageStatus(status: 'completed' | 'failed' | 'cancelled'): void {
    if (!this.currentEditMessageId) return;
    
    const message = document.getElementById(this.currentEditMessageId);
    if (!message) return;
    
    this.removeMinimizedLoading();
    
    // Handle compact CEM templates (no .message-status, uses .cem-spinner instead)
    const cemSpinner = message.querySelector('.cem-spinner');
    if (cemSpinner) {
      const iconContainer = cemSpinner.parentElement;
      if (status === 'completed') {
        // Stop spinner, show checkmark
        if (iconContainer) {
          iconContainer.innerHTML = '✓';
          iconContainer.classList.add('cem-icon-ok');
        }
        // Update label
        const label = message.querySelector('.cem-label');
        if (label) (label as HTMLElement).textContent = 'Sent';
        console.log('✅ CEM processing message updated to completed');
      } else if (status === 'failed') {
        if (iconContainer) {
          iconContainer.innerHTML = '✕';
          iconContainer.classList.add('cem-icon-err');
        }
        const label = message.querySelector('.cem-label');
        if (label) {
          (label as HTMLElement).textContent = 'Failed';
          (label as HTMLElement).style.color = '#f0a0a8';
        }
        const row = message.querySelector('.cem-row');
        if (row) {
          (row as HTMLElement).style.borderLeftColor = '#f44336';
          (row as HTMLElement).style.background = 'rgba(244,67,54,0.06)';
        }
        console.log('✅ CEM processing message updated to failed');
      } else if (status === 'cancelled') {
        if (iconContainer) {
          iconContainer.innerHTML = '⊘';
          iconContainer.classList.add('cem-icon-err');
        }
        const label = message.querySelector('.cem-label');
        if (label) {
          (label as HTMLElement).textContent = 'Cancelled';
          (label as HTMLElement).style.color = '#ff9800';
        }
        const row = message.querySelector('.cem-row');
        if (row) {
          (row as HTMLElement).style.borderLeftColor = '#ff9800';
          (row as HTMLElement).style.background = 'rgba(255,152,0,0.06)';
        }
        console.log('✅ CEM processing message updated to cancelled');
      }
      return;
    }
    
    // Legacy: Handle old templates with .message-status
    const statusElement = message.querySelector('.message-status');
    if (!statusElement) return;
    
    if (status === 'completed') {
      statusElement.remove();
      console.log('✅ Removed processing status - completed');
      return;
    }
    
    statusElement.classList.remove('processing');
    
    if (status === 'failed') {
      statusElement.innerHTML = `
        <svg class="status-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: none !important;">
          <path d="M18 6L6 18M6 6L18 18" stroke="#f44336" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="color: #f44336;">Failed</span>
      `;
      (statusElement as HTMLElement).style.background = 'rgba(244, 67, 54, 0.08)';
      (statusElement as HTMLElement).style.borderColor = 'rgba(244, 67, 54, 0.15)';
    } else if (status === 'cancelled') {
      statusElement.innerHTML = `
        <svg class="status-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: none !important;">
          <circle cx="12" cy="12" r="10" stroke="#ff9800" stroke-width="2"/>
          <path d="M15 9L9 15M9 9L15 15" stroke="#ff9800" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="color: #ff9800;">Cancelled</span>
      `;
      (statusElement as HTMLElement).style.background = 'rgba(255, 152, 0, 0.08)';
      (statusElement as HTMLElement).style.borderColor = 'rgba(255, 152, 0, 0.15)';
    }
    
    console.log(`✅ Updated message status: ${status}`);
  }
  
  // ============================================================================
  // BLOCK: AI API INTEGRATION
  // ============================================================================
  
  /**
   * Get AI modification with detailed explanation
   * @param code - Original code to modify
   * @param instruction - User's modification instruction
   * @returns Modified code and explanation
   */
  private async getAIModificationWithExplanation(code: string, instruction: string): Promise<{
    modifiedCode: string;
    explanation: {
      objective: string;
      changes: string[];
      beforeSummary: string;
      afterSummary: string;
    };
  }> {
    const context = getCurrentCodeContext();
    const language = context.language || this.detectLanguage();
    
    const prompt = `Modify this ${language} code: ${instruction}

Original code:
${code}

Respond with ONLY a JSON object in this EXACT format:
{
  "objective": "Brief explanation of what this change accomplishes",
  "beforeSummary": "What the original code does",
  "afterSummary": "What the modified code does",
  "changes": ["Change 1", "Change 2", "Change 3"],
  "modifiedCode": "ONLY THE MODIFIED CODE HERE"
}`;
    
    const config = getCurrentApiConfigurationForced();
    
    if (!config.apiKey || !config.apiBaseUrl) {
      throw new Error('API not configured');
    }
    
    console.log('🌐 Calling AI API...');
    
    try {
      const response = await callGenericAPI(prompt, config, this.abortController?.signal);
      
      console.log('Raw AI response:', response.substring(0, 200));
      
      let jsonStr = response.trim();
      jsonStr = jsonStr.replace(/```json\s*/gi, '');
      jsonStr = jsonStr.replace(/```\s*/g, '');
      
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      console.log('Extracted JSON:', jsonStr.substring(0, 200));
      
      const parsed = JSON.parse(jsonStr);
      
      let cleanedCode = (parsed.modifiedCode || '').trim();
      cleanedCode = cleanedCode.replace(/```[\w]*\n?/g, '');
      cleanedCode = cleanedCode.trim();
      
      console.log('✅ Successfully parsed AI response');
      
      return {
        modifiedCode: cleanedCode,
        explanation: {
          objective: parsed.objective || 'Code improvement',
          changes: Array.isArray(parsed.changes) ? parsed.changes : ['Code modified'],
          beforeSummary: parsed.beforeSummary || 'Original code',
          afterSummary: parsed.afterSummary || 'Modified code'
        }
      };
      
    } catch (parseError) {
      console.error('Failed to parse JSON, using fallback:', parseError);
      
      const response = await callGenericAPI(`Modify this code: ${instruction}\n\n${code}\n\nReturn ONLY the modified code, no explanations.`, config, this.abortController?.signal);
      
      let cleaned = response.trim();
      cleaned = cleaned.replace(/```[\w]*\n?/g, '');
      cleaned = cleaned.replace(/^Here's.*?:\s*/i, '');
      cleaned = cleaned.trim();
      
      return {
        modifiedCode: cleaned,
        explanation: {
          objective: instruction,
          changes: ['Code modified according to instruction'],
          beforeSummary: 'Original code',
          afterSummary: 'Modified code'
        }
      };
    }
  }
  
  // ============================================================================
  // BLOCK: CHANGE STATISTICS
  // ============================================================================
  
  /**
   * Calculate change statistics
   * @param originalLines - Original code lines
   * @param modifiedLines - Modified code lines
   * @returns Statistics about changes
   */
  private calculateChangeStats(originalLines: string[], modifiedLines: string[]): {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
  } {
    const originalSet = new Set(originalLines.map(l => l.trim()).filter(l => l));
    const modifiedSet = new Set(modifiedLines.map(l => l.trim()).filter(l => l));
    
    let linesAdded = 0;
    let linesRemoved = 0;
    
    originalLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !modifiedSet.has(trimmed)) {
        linesRemoved++;
      }
    });
    
    modifiedLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !originalSet.has(trimmed)) {
        linesAdded++;
      }
    });
    
    const linesModified = Math.min(linesAdded, linesRemoved);
    
    return {
      linesAdded: Math.max(0, linesAdded - linesModified),
      linesRemoved: Math.max(0, linesRemoved - linesModified),
      linesModified: linesModified
    };
  }
  
  // ============================================================================
  // BLOCK: CHAT MESSAGE INDICATORS
  // ============================================================================
  
  /**
   * Show editing indicator in chat
   * @param instruction - User's instruction
   * @param codePreview - Preview of code being edited
   */
  private showEditingIndicator(instruction: string, codePreview: string): void {
    this.editRevisionCount++;
    
    const language = this.detectLanguage();
    const timestamp = new Date();
    const timeStr = this.formatTime(timestamp);
    const dateStr = timestamp.toLocaleDateString();
    
    const messageId = `ai-edit-msg-${Date.now()}`;
    this.currentEditMessageId = messageId;
    
    const message = `🤖 **AI Edit Request** (Rev. ${this.editRevisionCount})

**Instruction:** ${instruction}

*⏳ Processing with AI...*`;
    
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message ai-edit-message';
    messageDiv.id = messageId;
    messageDiv.setAttribute('data-revision', this.editRevisionCount.toString());
    messageDiv.setAttribute('data-timestamp', timestamp.toISOString());
    messageDiv.setAttribute('data-cem-protected', 'true');
    messageDiv.setAttribute('data-no-collapse', 'true');
    const shortInstruction = instruction.length > 55 ? instruction.substring(0, 52) + '…' : instruction;
    messageDiv.innerHTML = `
      <div class="cem-row">
        <span class="cem-icon"><span class="cem-spinner"></span></span>
        <span class="cem-label">AI Edit</span>
        <span class="cem-rev">R${this.editRevisionCount}</span>
        <span class="cem-detail" title="${this.escapeHtml(instruction)}">${this.escapeHtml(shortInstruction)}</span>
        <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        <button class="cem-del" data-message-id="${messageId}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    this.scrollChatToBottom(chatContainer);
    
    setTimeout(() => {
      this.setupMessageDeleteButton(messageId);
    }, 100);
    
    queueMessageForSaving('system', message, {
      messageType: 'ai-edit-request',
      language: language,
      revision: this.editRevisionCount,
      timestamp: timestamp.toISOString()
    });
  }
  
  /**
   * Record accept changes in chat
   * @param instruction - User's instruction
   * @param linesModified - Line range modified
   */
  private recordAcceptChanges(instruction: string, linesModified: string): void {
    const timestamp = new Date();
    const timeStr = this.formatTime(timestamp);
    const dateStr = timestamp.toLocaleDateString();
    const messageId = `ai-edit-accept-${Date.now()}`;
    
    const message = `✅ **Changes Applied** (Rev. ${this.editRevisionCount})

Applied to **lines ${linesModified}**

**Instruction:** ${instruction}`;
    
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message ai-edit-message success';
    messageDiv.id = messageId;
    messageDiv.setAttribute('data-revision', this.editRevisionCount.toString());
    messageDiv.setAttribute('data-timestamp', timestamp.toISOString());
    messageDiv.setAttribute('data-cem-protected', 'true');
    messageDiv.setAttribute('data-no-collapse', 'true');
    const shortInstrAccept = instruction.length > 45 ? instruction.substring(0, 42) + '…' : instruction;
    messageDiv.innerHTML = `
      <div class="cem-row cem-flash">
        <span class="cem-icon cem-icon-ok">✓</span>
        <span class="cem-label">Applied</span>
        <span class="cem-rev">R${this.editRevisionCount}</span>
        <span class="cem-lines">L${linesModified}</span>
        <span class="cem-detail" title="${this.escapeHtml(instruction)}">${this.escapeHtml(shortInstrAccept)}</span>
        <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        <button class="cem-del" data-message-id="${messageId}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    this.scrollChatToBottom(chatContainer);
    
    setTimeout(() => {
      this.setupMessageDeleteButton(messageId);
    }, 100);
    
    queueMessageForSaving('system', message, {
      messageType: 'ai-edit-accepted',
      revision: this.editRevisionCount,
      timestamp: timestamp.toISOString()
    });
  }
  
  /**
   * Record reject changes in chat
   * @param instruction - User's instruction
   * @param linesModified - Line range that was rejected
   */
  private recordRejectChanges(instruction: string, linesModified: string): void {
    const timestamp = new Date();
    const timeStr = this.formatTime(timestamp);
    const dateStr = timestamp.toLocaleDateString();
    const messageId = `ai-edit-reject-${Date.now()}`;
    
    const message = `❌ **Changes Rejected** (Rev. ${this.editRevisionCount})

Rejected edits to **lines ${linesModified}**

**Instruction:** ${instruction}`;
    
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message ai-edit-message rejected';
    messageDiv.id = messageId;
    messageDiv.setAttribute('data-revision', this.editRevisionCount.toString());
    messageDiv.setAttribute('data-timestamp', timestamp.toISOString());
    messageDiv.setAttribute('data-cem-protected', 'true');
    messageDiv.setAttribute('data-no-collapse', 'true');
    const shortInstrReject = instruction.length > 45 ? instruction.substring(0, 42) + '…' : instruction;
    messageDiv.innerHTML = `
      <div class="cem-row cem-flash">
        <span class="cem-icon cem-icon-err">✕</span>
        <span class="cem-label">Rejected</span>
        <span class="cem-rev">R${this.editRevisionCount}</span>
        <span class="cem-lines">L${linesModified}</span>
        <span class="cem-detail" title="${this.escapeHtml(instruction)}">${this.escapeHtml(shortInstrReject)}</span>
        <span class="cem-time" title="${dateStr} ${timeStr}">${timeStr}</span>
        <button class="cem-del" data-message-id="${messageId}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    this.scrollChatToBottom(chatContainer);
    
    setTimeout(() => {
      this.setupMessageDeleteButton(messageId);
    }, 100);
    
    queueMessageForSaving('system', message, {
      messageType: 'ai-edit-rejected',
      revision: this.editRevisionCount,
      timestamp: timestamp.toISOString()
    });
  }
  
  /**
   * Record edit error in chat
   * @param instruction - User's instruction
   * @param error - Error message
   */
  private recordEditError(instruction: string, error: string): void {
    const message = `⚠️ **Edit Failed**

Could not complete AI edit.

**Instruction:** ${instruction}
**Error:** ${error}`;
    
    addSystemMessage(message);
    
    queueMessageForSaving('system', message, {
      messageType: 'ai-edit-error'
    });
  }
  
  // ============================================================================
  // BLOCK: DIFF VIEW
  // ============================================================================
  
  /**
   * Show diff proposal modal with before/after comparison
   * @param editor - Monaco editor instance
   * @param proposal - Edit proposal with changes
   */
  private async showDiffProposal(editor: any, proposal: EditProposal): Promise<void> {
    this.currentProposal = proposal;
    this.originalEditor = editor;  // Store reference to original editor
    
    console.log('📊 Showing diff view with explanation');
    
    const diffContainer = this.createDiffContainer(proposal);
    document.body.appendChild(diffContainer);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.keyboardHandler = this.handleDiffKeyboard.bind(this);
    document.addEventListener('keydown', this.keyboardHandler);
    
    const acceptBtn = document.getElementById('ai-diff-accept');
    const rejectBtn = document.getElementById('ai-diff-reject');
    const closeBtn = document.getElementById('ai-diff-close');
    const overlay = document.getElementById('ai-diff-overlay-click');
    
    console.log('🔍 Button elements:', {
      acceptBtn: !!acceptBtn,
      rejectBtn: !!rejectBtn,
      closeBtn: !!closeBtn,
      overlay: !!overlay
    });
    
    if (acceptBtn) {
      acceptBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ Accept clicked');
        this.acceptChanges();
      };
    }
    
    if (rejectBtn) {
      rejectBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Reject clicked');
        this.rejectChanges();
      };
    }
    
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Close clicked');
        this.rejectChanges();
      };
    }
    
    if (overlay) {
      overlay.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Overlay clicked');
        this.rejectChanges();
      };
    }
    
    console.log('✅ All event listeners attached');
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
     const language = this.detectLanguage();
      
      // IMPORTANT: Start with clean code (no MISRA comments)
      const codeToShow = proposal.modified; // This should be the clean version
      
      console.log('🎬 Initializing diff editor with clean code');
      console.log('📄 Code preview:', codeToShow.substring(0, 200));
      
      const originalModel = monaco.editor.createModel(proposal.original, language);
      const modifiedModel = monaco.editor.createModel(codeToShow, language);
      
      const diffEditorElement = document.getElementById('ai-diff-editor');
      if (!diffEditorElement) {
        throw new Error('Diff editor element not found');
      }
      
      this.diffEditor = monaco.editor.createDiffEditor(diffEditorElement, {
        enableSplitViewResizing: false,
        renderSideBySide: true,
        readOnly: true,
        automaticLayout: true,
        theme: 'vs-dark',
        minimap: { enabled: false },
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible'
        },
        scrollBeyondLastLine: false,
        renderOverviewRuler: false
      });
      
      this.diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
      });
      
      console.log('✅ Diff editor created');
      this.setupMISRAToggleButton(proposal); 
    } catch (error) {
      console.error('Failed to create diff editor:', error);
      this.showSimpleDiff(proposal);
    }
  }
  
  /**
   * Show simple diff fallback (if Monaco fails)
   * @param proposal - Edit proposal
   */
  private showSimpleDiff(proposal: EditProposal): void {
    const diffEditor = document.getElementById('ai-diff-editor');
    if (!diffEditor) return;
    
    diffEditor.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px; height: 100%; background: #333;">
        <div style="background: #1e1e1e; padding: 20px; overflow: auto;">
          <div style="color: #f44336; font-size: 12px; margin-bottom: 10px; font-weight: 600; font-family: system-ui;">ORIGINAL</div>
          <pre style="margin: 0; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(proposal.original)}</pre>
        </div>
        
        <div style="background: #1e1e1e; padding: 20px; overflow: auto;">
          <div style="color: #4caf50; font-size: 12px; margin-bottom: 10px; font-weight: 600; font-family: system-ui;">MODIFIED</div>
          <pre style="margin: 0; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(proposal.modified)}</pre>
        </div>
      </div>
    `;
  }
  
  /**
   * Create diff container HTML
   * @param proposal - Edit proposal
   * @returns HTML element for diff modal
   */
  private createDiffContainer(proposal: EditProposal): HTMLElement {
    const container = document.createElement('div');
    container.id = 'ai-diff-container';
    container.className = 'ai-diff-modal';
    
    const explanation = proposal.explanation;
    const hasExplanation = explanation && explanation.changes.length > 0;
    
    container.innerHTML = `
      <div class="ai-diff-overlay" id="ai-diff-overlay-click"></div>
      <div class="ai-diff-content">
        <div class="ai-diff-header">
          <div class="ai-diff-title-bar">
            <div class="ai-diff-title">
              <svg class="ai-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="title-content">
                <span class="title-main">AI Proposed Changes</span>
                <span class="title-subtitle">
                  <svg class="location-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6L8 2L13 6V13H3V6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Lines ${proposal.startLine}-${proposal.endLine}
                </span>
              </div>
            </div>
            <button class="close-btn" id="ai-diff-close" type="button">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="ai-diff-instruction-bar">
            <svg class="instruction-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="instruction-text">${this.escapeHtml(proposal.description)}</span>
          </div>
        </div>
        
        ${hasExplanation ? `
        <div class="ai-explanation-panel" id="ai-explanation-panel">
<div class="explanation-header">
  <div class="explanation-header-left">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>AI Analysis</span>
  </div>
  ${proposal.misraContext ? `
  <button class="toggle-misra-rules-btn" id="toggle-misra-rules" type="button" data-showing-rules="false">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Show MISRA Rule Comments</span>
  </button>
  ` : `
  <button class="get-detailed-analysis-btn" type="button">
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
    </svg>
    <span>Get Detailed Professional Analysis</span>
  </button>
  `}
</div>
          
          <div class="explanation-content">
            <div class="explanation-section">
              <div class="section-label">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Objective
              </div>
              <div class="section-content objective">${this.escapeHtml(explanation.objective)}</div>
            </div>
            
            <div class="explanation-section">
              <div class="section-label">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3.89543 5 5 3.89543 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Changes Made
              </div>
              <ul class="changes-list">
                ${explanation.changes.map((change, index) => `
                  <li class="change-item" data-change-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${this.escapeHtml(change)}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            
            <div class="before-after-grid">
              <div class="before-after-card before">
                <div class="card-header">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Before
                </div>
                <div class="card-content">${this.escapeHtml(explanation.beforeSummary)}</div>
              </div>
              
              <div class="before-after-card after">
                <div class="card-header">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  After
                </div>
                <div class="card-content">${this.escapeHtml(explanation.afterSummary)}</div>
              </div>
            </div>
            
            <div class="stats-row">
              <div class="stat-item added">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="stat-value">+${explanation.stats.linesAdded}</span>
                <span class="stat-label">Added</span>
              </div>
              <div class="stat-item removed">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="stat-value">-${explanation.stats.linesRemoved}</span>
                <span class="stat-label">Removed</span>
              </div>
              <div class="stat-item modified">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C13.6569 21 15 16.9706 15 12C15 7.02944 13.6569 3 12 3M12 21C10.3431 21 9 16.9706 9 12C9 7.02944 10.3431 3 12 3M3 12C3 7.02944 7.02944 3 12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="stat-value">${explanation.stats.linesModified}</span>
                <span class="stat-label">Modified</span>
              </div>
            </div>
            
            <div class="explanation-footer-message">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="footer-message-content">
                <strong>Quick Summary Above</strong>
                <p>This is a brief overview of the changes. Click the <strong>"Get Detailed Professional Analysis"</strong> button in the header above for an in-depth analysis with industry standards, best practices, architectural impact, and comprehensive recommendations.</p>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div id="ai-diff-editor" class="ai-diff-editor"></div>
        
        <div class="ai-diff-actions">
          <div class="action-hint">
            <svg class="hint-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Review the changes and explanation carefully before applying</span>
          </div>
          <div class="action-buttons">
            <button id="ai-diff-reject" class="ai-btn ai-btn-secondary" type="button">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>Reject</span>
              <kbd>Esc</kbd>
            </button>
            <button id="ai-diff-accept" class="ai-btn ai-btn-primary" type="button">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Accept</span>
              <kbd>Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    `;
    // Setup MISRA rules toggle button

    // Event delegation with explanation button exclusion
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.id === 'ai-diff-overlay-click' || target.classList.contains('ai-diff-overlay')) {
        console.log('❌ Overlay clicked - closing dialog');
        e.preventDefault();
        e.stopPropagation();
        this.rejectChanges();
        return;
      }
      
      const button = target.closest('button');
      if (!button) return;
      
      // Skip if it's the detailed analysis button or MISRA toggle
      if (button.classList.contains('get-detailed-analysis-btn') || 
          button.classList.contains('toggle-misra-rules-btn')) {
        console.log('📊 Button clicked - letting it handle itself:', button.id);
        return;
      }
      
      const buttonId = button.id;
      console.log('🖱️ Button clicked:', buttonId);
      
      e.preventDefault();
      e.stopPropagation();
      
      switch (buttonId) {
        case 'ai-diff-accept':
          console.log('✅ Accept button clicked');
          this.acceptChanges();
          break;
        case 'ai-diff-reject':
        case 'ai-diff-close':
          console.log('❌ Reject/Close button clicked');
          this.rejectChanges();
          break;
      }
    }, true);
    
    // Setup explanation button after DOM is ready
    setTimeout(() => {
      this.setupDetailedExplanationButton(container, proposal);
    }, 100);
    
    return container;
  }
  
  /**
   * Setup detailed explanation button
   */
/**
 * Setup detailed explanation button (skip for MISRA)
 */
private setupDetailedExplanationButton(container: HTMLElement, proposal: EditProposal): void {
  // Skip for MISRA contexts
  if (proposal.misraContext) {
    console.log('⏭️ Skipping detailed analysis button for MISRA context');
    return;
  }
  
  console.log('🔧 Setting up explanation button...');
  
  const explanationPanel = container.querySelector('#ai-explanation-panel');
  
  if (!explanationPanel || !proposal.explanation) {
    console.log('⚠️ Cannot add button - panel or explanation missing');
    return;
  }
  
  const detailedBtn = explanationPanel.querySelector('.get-detailed-analysis-btn') as HTMLButtonElement;
  
  if (!detailedBtn) {
    console.log('⚠️ Button not found in DOM');
    return;
  }
  
  console.log('✅ Button found, attaching event listener');
  
  // Generic summary for non-MISRA edits
  const changesSummary = `
**Objective:** ${proposal.explanation!.objective}

**Changes Made:**
${proposal.explanation!.changes.map((change, i) => `${i + 1}. ${change}`).join('\n')}

**Before:** ${proposal.explanation!.beforeSummary}

**After:** ${proposal.explanation!.afterSummary}

**Statistics:**
- Lines Added: ${proposal.explanation!.stats.linesAdded}
- Lines Removed: ${proposal.explanation!.stats.linesRemoved}
- Lines Modified: ${proposal.explanation!.stats.linesModified}
  `.trim();
  
  detailedBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 Generic detailed analysis requested');
    
    const originalHTML = detailedBtn.innerHTML;
    detailedBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="animation: spin 1s linear infinite;">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM2.5 8a5.5 5.5 0 0 0 11 0h-3a2.5 2.5 0 0 1-5 0h-3z"/>
      </svg>
      <span>Generating Analysis...</span>
    `;
    detailedBtn.disabled = true;
    
    if (!document.getElementById('spin-animation-style')) {
      const style = document.createElement('style');
      style.id = 'spin-animation-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    try {
      const { ChangesExplanationUI } = await import('./aiChangesExplanation');
      const { HTMLViewerGenerator } = await import('./htmlViewerGenerator');
      
      const explanationUI = new ChangesExplanationUI();
      
      explanationUI.generator.setChangesContext(
        proposal.original,
        proposal.modified,
        this.getCurrentFileName()
      );
      
      explanationUI.generator.setChangesSummary(changesSummary);
      
      console.log('🌐 Calling AI for detailed analysis...');
      const explanation = await explanationUI.generator.generateDetailedExplanation();
      
      console.log('✅ Analysis generated, opening HTML viewer...');
      HTMLViewerGenerator.openInNewWindow(explanation, 'Professional Code Analysis');
      
    } catch (error) {
      console.error('❌ Failed to generate explanation:', error);
      alert(`Failed to generate analysis: ${(error as Error).message}`);
    } finally {
      detailedBtn.innerHTML = originalHTML;
      detailedBtn.disabled = false;
    }
  };
  
  console.log('✅ Detailed explanation button setup complete');
}

  /**
 * Setup MISRA rules toggle button
 */
/**
 * Setup MISRA rules toggle button
 */
private setupMISRAToggleButton(proposal: EditProposal): void {
  if (!proposal.misraContext?.modifiedCodeWithRules) {
    console.log('⏭️ No MISRA context with rules, skipping toggle button');
    return;
  }
  
  const toggleBtn = document.getElementById('toggle-misra-rules') as HTMLButtonElement;
  
  if (!toggleBtn) {
    console.log('⚠️ Toggle button not found in DOM');
    return;
  }
  
  console.log('✅ Setting up MISRA toggle button');
  console.log('📋 Clean code length:', proposal.modified.length);
  console.log('📋 Code with rules length:', proposal.misraContext.modifiedCodeWithRules.length);
  
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isShowingRules = toggleBtn.getAttribute('data-showing-rules') === 'true';
    
    console.log('🖱️ Toggle clicked, current state:', isShowingRules ? 'showing rules' : 'showing clean');
    
    if (!this.diffEditor) {
      console.error('❌ Diff editor not available!');
      return;
    }
    
    try {
      const language = this.detectLanguage();
      const currentModel = this.diffEditor.getModel();
      
      if (!currentModel) {
        console.error('❌ No model in diff editor!');
        return;
      }
      
      if (isShowingRules) {
        // Switch to clean code
        console.log('🔄 Switching to CLEAN code...');
        
        toggleBtn.setAttribute('data-showing-rules', 'false');
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Show MISRA Rule Comments</span>
        `;
        
        // Create new clean model
        const newModifiedModel = monaco.editor.createModel(proposal.modified, language);
        
        // Dispose old modified model
        currentModel.modified.dispose();
        
        // Set new model
        this.diffEditor.setModel({
          original: currentModel.original,
          modified: newModifiedModel
        });
        
        console.log('✅ Switched to clean code view');
        
      } else {
        // Switch to code with rules
        console.log('🔄 Switching to code WITH MISRA rules...');
        
        toggleBtn.setAttribute('data-showing-rules', 'true');
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Hide MISRA Rule Comments</span>
        `;
        
        // Create new model with rules
        const newModifiedModel = monaco.editor.createModel(
          proposal.misraContext!.modifiedCodeWithRules, 
          language
        );
        
        // Dispose old modified model
        currentModel.modified.dispose();
        
        // Set new model
        this.diffEditor.setModel({
          original: currentModel.original,
          modified: newModifiedModel
        });
        
        console.log('✅ Switched to code with MISRA rule comments');
      }
    } catch (error) {
      console.error('❌ Error toggling MISRA rules:', error);
    }
  });
  
  console.log('✅ MISRA toggle button setup complete');
}

  /**
   * Get current file name
   */
  private getCurrentFileName(): string {
    const editor = window.monaco?.editor?.getEditors()?.[0];
    if (!editor) return 'untitled';
    
    const model = editor.getModel();
    if (!model) return 'untitled';
    
    const uri = model.uri.toString();
    const fileName = uri.split('/').pop() || 'untitled';
    
    return fileName;
  }
  
  // ============================================================================
  // BLOCK: ACCEPT / REJECT CHANGES
  // ============================================================================
  
  /**
   * Accept proposed changes and apply to editor
   */
  private acceptChanges(): void {
    if (!this.currentProposal) {
      console.error('❌ No current proposal to accept');
      return;
    }
    
    // Use stored original editor reference, fallback to finding main editor
    let editor = this.originalEditor;
    if (!editor) {
      // Try to find the main Monaco editor (not the diff editor)
      const editors = window.monaco?.editor?.getEditors() || [];
      // Find the editor that's NOT a diff editor (check if it has a container with #monaco-editor or similar)
      editor = editors.find((e: any) => {
        try {
          const container = e.getContainerDomNode();
          const isDiffEditor = container?.closest('.ai-diff-editor-container') || 
                               container?.closest('#ai-diff-container');
          return !isDiffEditor;
        } catch {
          return false;
        }
      }) || editors[0];
    }
    
    if (!editor) {
      console.error('❌ No editor found to apply changes');
      showNotification('❌ Could not find editor to apply changes', 'error');
      return;
    }
    
    const { startLine, endLine, startColumn, endColumn, modified, original } = this.currentProposal;
    const instruction = this.currentProposal.instruction || 'Edit';
    const linesRange = this.currentProposal.linesRange || `${startLine}-${endLine}`;
    
    // Check if MISRA toggle is showing rules - if so, use code with comments
    let codeToApply = modified;
    const toggleBtn = document.getElementById('toggle-misra-rules');
    const isShowingMISRARules = toggleBtn?.getAttribute('data-showing-rules') === 'true';
    
    if (isShowingMISRARules && this.currentProposal.misraContext?.modifiedCodeWithRules) {
      codeToApply = this.currentProposal.misraContext.modifiedCodeWithRules;
      console.log('📋 Using MISRA code WITH rule comments');
    } else if (this.currentProposal.misraContext) {
      console.log('📋 Using clean MISRA code (without rule comments)');
    }
    
    console.log('✅ Applying changes to editor');
    console.log('📍 Range:', { startLine, startColumn, endLine, endColumn });
    console.log('📝 Code to apply length:', codeToApply.length);
    console.log('📝 MISRA rules included:', isShowingMISRARules);
    
    try {
      // Get the editor's model
      const model = editor.getModel();
      if (!model) {
        console.error('❌ No model found in editor');
        showNotification('❌ Could not find editor model', 'error');
        return;
      }
      
      console.log('📄 Current model URI:', model.uri?.toString());
      console.log('📄 Current model content length:', model.getValue().length);
      
      // Method 1: Try executeEdits first (preserves undo stack)
      const range = new monaco.Range(startLine, startColumn, endLine, endColumn);
      const success = editor.executeEdits('ai-direct-edit', [{
        range: range,
        text: codeToApply,
        forceMoveMarkers: true
      }]);
      
      console.log('📝 executeEdits result:', success);
      
      // Method 2: If executeEdits didn't work, try pushEditOperations
      if (!success || success.length === 0) {
        console.log('⚠️ executeEdits may have failed, trying pushEditOperations...');
        model.pushEditOperations(
          [],
          [{
            range: range,
            text: codeToApply
          }],
          () => null
        );
      }
      
      // Force the editor to refresh and show the new content
      editor.focus();
      
      // Set cursor to the beginning of the modified area
      editor.setPosition({ lineNumber: startLine, column: 1 });
      editor.revealLineInCenter(startLine);
      
      // Force a layout refresh
      editor.layout();
      
      // Trigger content changed event
      const newContent = model.getValue();
      console.log('📄 New model content length:', newContent.length);
      console.log('📄 Content changed:', newContent.length !== original.length);
      
      this.removeMinimizedLoading();
      this.recordAcceptChanges(instruction, linesRange);
      
      // Show appropriate success message
      if (isShowingMISRARules && this.currentProposal.misraContext) {
        console.log('✅ MISRA compliant code with rule comments applied!');
        showNotification('✅ MISRA code with rule comments applied', 'success');
      } else {
        console.log('✅ Changes applied successfully!');
        showNotification('✅ Changes applied successfully', 'success');
      }
    } catch (err) {
      console.error('❌ Failed to apply changes:', err);
      showNotification('❌ Failed to apply changes: ' + (err as Error).message, 'error');
    }
    
    this.closeDiffView();
  }
  
  /**
   * Reject proposed changes
   */
  private rejectChanges(): void {
    if (!this.currentProposal) return;
    
    const instruction = this.currentProposal.instruction || 'Edit';
    const linesRange = this.currentProposal.linesRange || 'unknown';
    
    console.log('❌ Changes rejected');
    
    this.removeMinimizedLoading();
    this.recordRejectChanges(instruction, linesRange);
    
    showNotification('Changes rejected', 'info');
    this.closeDiffView();
  }
  
  /**
   * Close diff view and cleanup
   */
  private closeDiffView(): void {
    console.log('🚪 closeDiffView() called');
    
    const container = document.getElementById('ai-diff-container');
    console.log('🔍 Container found:', !!container);
    
    if (container) {
      console.log('🗑️ Removing container - IMMEDIATE');
      container.remove();
      console.log('✅ Container removed immediately');
    }
    
    const modalsByClass = document.querySelectorAll('.ai-diff-modal');
    modalsByClass.forEach(modal => {
      console.log('🗑️ Removing modal by class');
      modal.remove();
    });
    
    if (this.diffEditor) {
      console.log('🗑️ Cleaning up diff editor (safe mode - no dispose)');
      try {
        // ⚠️ CRITICAL FIX: Proper cleanup order to avoid both errors:
        // 1. "InstantiationService has been disposed" - from calling diffEditor.dispose()
        // 2. "TextModel got disposed before DiffEditorWidget model got reset" - from disposing models first
        
        // Step 1: Get references to models BEFORE detaching
        const diffModel = this.diffEditor.getModel();
        
        // Step 2: Detach models from diff editor FIRST (prevents error #2)
        try {
          this.diffEditor.setModel(null);
          console.log('✅ Models detached from diff editor');
        } catch (detachError) {
          console.warn('Model detach warning:', detachError);
        }
        
        // Step 3: NOW it's safe to dispose the models
        if (diffModel) {
          try {
            if (diffModel.original) {
              diffModel.original.dispose();
              console.log('✅ Original model disposed');
            }
            if (diffModel.modified) {
              diffModel.modified.dispose();
              console.log('✅ Modified model disposed');
            }
          } catch (modelError) {
            console.warn('Model disposal warning:', modelError);
          }
        }
        
        // Step 4: DON'T call this.diffEditor.dispose() - it breaks Monaco's InstantiationService!
        // The DOM removal handles the visual cleanup, and setModel(null) detaches the data.
        
      } catch (e) {
        console.error('Error cleaning up diff editor:', e);
      }
      this.diffEditor = null;
      console.log('✅ Diff editor reference cleared (InstantiationService preserved)');
    }
    
    if (this.keyboardHandler) {
      console.log('🗑️ Removing keyboard handler');
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    this.removeMinimizedLoading();
    this.currentProposal = null;
    this.originalEditor = null;  // Clear editor reference
    console.log('✅ closeDiffView() completed');
  }
  
  /**
   * Handle keyboard shortcuts in diff view
   * @param e - Keyboard event
   */
  private handleDiffKeyboard(e: KeyboardEvent): void {
    if (!this.currentProposal) return;
    
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      this.acceptChanges();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.rejectChanges();
    }
  }
  
  // ============================================================================
  // BLOCK: KEYBOARD SHORTCUTS
  // ============================================================================
  
  /**
   * Setup global keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (this.currentProposal) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.showEditPrompt();
      }
    });
    
    console.log('⌨️ Keyboard shortcuts registered (Ctrl+K)');
  }
  /**
 * Show professional edit prompt dialog
 */
public showEditPrompt(): void {
  const editor = window.monaco?.editor?.getEditors()?.[0];
  if (!editor) {
    showNotification('No editor found. Please open a file first.', 'error');
    return;
  }
  
  const selection = editor.getSelection();
  if (!selection || selection.isEmpty()) {
    showNotification('Please select code first', 'warning');
    return;
  }
  
  const model = editor.getModel();
  const selectedText = model.getValueInRange(selection);
  const lineCount = selectedText.split('\n').length;
  const language = this.detectLanguage();
  
  this.showProfessionalEditDialog(selectedText, lineCount, language);
}
/**
 * Show professional edit dialog with modern UI
 */
private showProfessionalEditDialog(
  selectedText: string,
  lineCount: number,
  language: string
): void {
  document.getElementById('ai-professional-edit-dialog')?.remove();
  
  const preview = selectedText.length > 120
    ? selectedText.substring(0, 120).replace(/\n/g, ' ') + '...'
    : selectedText.replace(/\n/g, ' ');
  
  const dialog = document.createElement('div');
  dialog.id = 'ai-professional-edit-dialog';
  dialog.innerHTML = `
    <div class="ai-edit-backdrop"></div>
    <div class="ai-edit-dialog">
      <div class="ai-edit-header">
        <div class="header-content">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
          </svg>
          <div>
            <h3>AI Code Editor</h3>
            <p>Describe the changes you want to make</p>
          </div>
        </div>
        <button class="close-btn" type="button" aria-label="Close">×</button>
      </div>
      
      <div class="ai-edit-body">
        <div class="code-info">
          <span class="info-badge">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${lineCount} lines
          </span>
          <span class="info-badge">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M8 9H16M8 13H16M8 17H12M6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${language}
          </span>
        </div>
        
        <div class="code-preview">
          <div class="preview-header">Selected Code</div>
          <div class="preview-text">${this.escapeHtml(preview)}</div>
        </div>
        
        <div class="instruction-group">
          <label for="ai-instruction" class="instruction-label">
            What would you like to change?
          </label>
          <input 
            type="text"
            id="ai-instruction"
            class="instruction-input"
            placeholder="e.g., Add error handling, Check MISRA C compliance..."
            autocomplete="off"
            spellcheck="false"
          />
          <div id="misra-detection-badge" style="display: none; margin-top: 8px;"></div>
        </div>
        
 <div class="quick-suggestions">
          <div class="suggestions-label">Quick Actions:</div>
          <div class="suggestions-grid">
            <button class="suggestion-btn btn-error-handling" data-text="Add comprehensive error handling">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Error Handling</span>
            </button>
            
            <button class="suggestion-btn btn-comments" data-text="Add clear explanatory comments">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Add Comments</span>
            </button>
            
            <button class="suggestion-btn btn-refactor" data-text="Refactor for better readability and performance">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C13.6569 21 15 16.9706 15 12C15 7.02944 13.6569 3 12 3M12 21C10.3431 21 9 16.9706 9 12C9 7.02944 10.3431 3 12 3M3 12C3 7.02944 7.02944 3 12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Refactor</span>
            </button>
            
            <button class="suggestion-btn btn-misra" data-text="Check MISRA C:2012 compliance">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>MISRA C:2012</span>
              <span class="beta-badge">BETA</span>
            </button>
            
            <button class="suggestion-btn btn-iso26262" data-text="Add error handling with ASIL-D compliance per ISO 26262:2018">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>ISO 26262 ASIL-D</span>
              <span class="beta-badge">BETA</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="ai-edit-footer">
        <button class="btn-secondary" id="cancel-edit" type="button">Cancel</button>
        <button class="btn-primary" id="apply-edit" type="button">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          Apply AI Edit
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  const input = dialog.querySelector<HTMLInputElement>('#ai-instruction');
  const misraBadge = dialog.querySelector('#misra-detection-badge');
  const applyBtn = dialog.querySelector('#apply-edit');
  const cancelBtn = dialog.querySelector('#cancel-edit');
  const closeBtn = dialog.querySelector('.close-btn');
  const backdrop = dialog.querySelector('.ai-edit-backdrop');
  
  setTimeout(() => input?.focus(), 100);
  
  // MISRA detection on input change
  input?.addEventListener('input', () => {
    const instruction = input.value.trim();
    if (!instruction) {
      if (misraBadge) misraBadge.style.display = 'none';
      return;
    }
    
    const misraCommand = MISRACommandParser.parseMessage(instruction);
    
    if (misraCommand.detected && misraBadge) {
      const displayName = MISRACommandParser.getCommandDisplayName(misraCommand);
      misraBadge.style.display = 'block';
      misraBadge.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(123, 31, 162, 0.1));
          border: 1px solid rgba(156, 39, 176, 0.3);
          border-radius: 6px;
          font-size: 12px;
          color: #da70d6;
          animation: slideInUp 0.3s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
            <path d="M2 17L12 22L22 17"/>
            <path d="M2 12L12 17L22 12"/>
          </svg>
          <div style="flex: 1;">
            <div style="font-weight: 600;">📋 ${displayName} Analysis Detected</div>
            <div style="font-size: 10px; color: rgba(218, 112, 214, 0.7); margin-top: 2px;">
              ${misraCommand.keywords.slice(0, 3).join(' • ')}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17L4 12"/>
          </svg>
        </div>
      `;
    } else if (misraBadge) {
      misraBadge.style.display = 'none';
    }
  });
  
  // Enhanced apply handler with MISRA detection
  const handleApply = async () => {
    const instruction = input?.value.trim();
    if (!instruction) {
      input?.focus();
      input?.classList.add('error-shake');
      setTimeout(() => input?.classList.remove('error-shake'), 500);
      return;
    }
    
    const misraCommand = MISRACommandParser.parseMessage(instruction);
    
    if (misraCommand.detected) {
      console.log('📋 MISRA command detected:', misraCommand);
      dialog.remove();
      await this.handleMISRAEdit(selectedText, misraCommand, language);
    } else {
      dialog.remove();
      this.editSelection(instruction);
    }
  };
  
  const handleCancel = () => dialog.remove();
  
  applyBtn?.addEventListener('click', handleApply);
  cancelBtn?.addEventListener('click', handleCancel);
  closeBtn?.addEventListener('click', handleCancel);
  backdrop?.addEventListener('click', handleCancel);
  
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  });
  
  dialog.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (input && text) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    });
  });
  
  if (!document.getElementById('dialog-animations')) {
    const style = document.createElement('style');
    style.id = 'dialog-animations';
    style.textContent = `
      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Handle MISRA-specific edit request
 */

/**
 * Handle MISRA-specific edit request - DIRECT FIX MODE
 */
private async handleMISRAEdit(
  code: string,
  misraCommand: MISRACommand,
  language: string
): Promise<void> {
  if (this.isProcessing) {
    showNotification('AI is already processing', 'warning');
    return;
  }

  this.isProcessing = true;
  this.abortController = new AbortController();

  const displayName = MISRACommandParser.getCommandDisplayName(misraCommand);

  this.showEditingIndicator(`${displayName} Compliance Fixes`, code);
  this.showLoadingOverlay(`${displayName} Compliance Analysis`);

  try {
    const fileName = this.getCurrentFileName();
    
// Generate MISRA compliant code - TWO VERSIONS (clean + with rules)
const fixPrompt = `You are a MISRA compliance expert. Analyze and fix this ${language} code for ${displayName} compliance.

Original Code:
\`\`\`${language}
${code}
\`\`\`

**YOUR TASK:**
1. Identify ALL ${displayName} violations
2. Generate TWO SEPARATE code versions

**CRITICAL REQUIREMENT - YOU MUST PROVIDE TWO DIFFERENT VERSIONS:**

**Version 1: modifiedCode**
- Clean, compliant code
- NO comments about MISRA rules
- Just the fixed code

**Version 2: modifiedCodeWithRules** 
- IDENTICAL functionality to Version 1
- WITH detailed MISRA rule comments ABOVE each fix
- Each comment must include:
  * Rule number: "// ${displayName} Rule X.X: [Rule Title]"
  * Rule explanation: "// [What this rule is about - rationale and purpose]"
  * What was fixed: "// Fixed: [Specific change made]"

**Example format for comments:**
\`\`\`${language}
// ${displayName} Rule 10.3: Essential type model
// This rule prevents implicit type conversions that may lead to data loss or unexpected behavior.
// The essential type of the operands must match to avoid undefined behavior.
// Fixed: Added explicit cast from float to int to make conversion explicit
int result = (int)floatValue;

// ${displayName} Rule 8.4: Compatible external declarations  
// External identifiers must be declared in only one file with the same type.
// This prevents linker errors and ensures type safety across translation units.
// Fixed: Added explicit function declaration before use
void processData(int* data, size_t length);
\`\`\`

**RESPONSE FORMAT (NO MARKDOWN, JUST RAW JSON):**

{
  "objective": "Brief summary of all compliance fixes applied",
  "violations": [
    {
      "rule": "10.3", 
      "description": "Implicit type conversion from float to int without explicit cast"
    },
    {
      "rule": "8.4",
      "description": "Function used without prior declaration"
    }
  ],
  "changes": [
    "Fixed Rule 10.3: Added explicit type cast",
    "Fixed Rule 8.4: Added function declaration"
  ],
  "recommendations": ["Use static analysis tools", "Enable strict compiler warnings"],
  "beforeSummary": "Original code with ${displayName} violations",
  "afterSummary": "${displayName} compliant code with proper type safety",
  "modifiedCode": "CLEAN CODE HERE (no MISRA comments at all)",
  "modifiedCodeWithRules": "SAME CODE WITH DETAILED MISRA RULE COMMENTS AS SHOWN IN EXAMPLE ABOVE"
}

**VERIFY BEFORE RESPONDING:**
✓ modifiedCode has NO "// ${displayName} Rule" comments
✓ modifiedCodeWithRules HAS detailed multi-line "// ${displayName} Rule X.X:" comments
✓ Each MISRA comment includes: Rule number + Rule explanation + What was fixed
✓ Both versions have IDENTICAL functionality
✓ modifiedCodeWithRules includes ALL violations with detailed comments`;

    const config = getCurrentApiConfigurationForced();

    if (!config.apiKey || !config.apiBaseUrl) {
      throw new Error('API not configured');
    }

    const response = await callGenericAPI(fixPrompt, config, this.abortController?.signal);

    if (!this.isProcessing) {
      this.updateEditMessageStatus('cancelled');
      return;
    }
console.log('🔍 Raw AI response:', response.substring(0, 500));
    
    // Parse the response
    let result: any;
    try {
      let jsonStr = response.trim();
      
      // Remove markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/gi, '');
      jsonStr = jsonStr.replace(/```\s*/g, '');
      
      // Extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      // Try to fix common JSON issues (control characters, unescaped strings)
      jsonStr = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n')           // Escape newlines in strings
        .replace(/\r/g, '\\r')           // Escape carriage returns
        .replace(/\t/g, '\\t');          // Escape tabs
      
      console.log('🔍 Cleaned JSON (first 500 chars):', jsonStr.substring(0, 500));
      
      result = JSON.parse(jsonStr);
      
      // Validate that we got the required fields
      if (!result.modifiedCode) {
        throw new Error('Response missing modifiedCode field');
      }
      
      console.log('✅ Successfully parsed JSON response');
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('📄 Full response:', response);
      
      // Better fallback: look for code blocks in the response
      const codeBlockPattern = /```(?:javascript|typescript|c|cpp)?\n([\s\S]*?)```/g;
      const codeBlocks = [];
      let match;
      
      while ((match = codeBlockPattern.exec(response)) !== null) {
        codeBlocks.push(match[1].trim());
      }
      
      if (codeBlocks.length >= 2) {
        // Found at least 2 code blocks - use them
        console.log('✅ Found code blocks in response, using those');
        result = {
          modifiedCode: codeBlocks[0],
          modifiedCodeWithRules: codeBlocks[1],
          objective: `${displayName} compliance fixes`,
          violations: [],
          changes: ['Code modified for compliance'],
          recommendations: [],
          beforeSummary: 'Original code with violations',
          afterSummary: `${displayName} compliant code`
        };
      } else if (codeBlocks.length === 1) {
        // Only found 1 code block - use it for both
        console.log('⚠️ Found only 1 code block, using it as clean code');
        result = {
          modifiedCode: codeBlocks[0],
          modifiedCodeWithRules: codeBlocks[0],
          objective: `${displayName} compliance fixes`,
          violations: [],
          changes: ['Code modified for compliance'],
          recommendations: [],
          beforeSummary: 'Original code with violations',
          afterSummary: `${displayName} compliant code`
        };
      } else {
        throw new Error('Could not extract code from AI response. Please try again.');
      }
    }
    
    // Extract BOTH versions from the parsed result
    let cleanedCode = (result.modifiedCode || '').trim();
    cleanedCode = cleanedCode.replace(/```[\w]*\n?/g, '').trim();
    
    let codeWithRules = (result.modifiedCodeWithRules || cleanedCode).trim();
    codeWithRules = codeWithRules.replace(/```[\w]*\n?/g, '').trim();
    

// Validate we got two different versions
if (cleanedCode === codeWithRules) {
  console.warn('⚠️ AI returned same code for both versions, stripping comments from clean version...');
  // Remove comment lines that look like MISRA rules from cleanedCode
  cleanedCode = cleanedCode
    .split('\n')
    .filter(line => !line.trim().match(/^\/\/\s*(MISRA|Rule\s+\d)/i))
    .join('\n');
}

console.log('✅ Clean code length:', cleanedCode.length);
console.log('📋 Code with rules length:', codeWithRules.length);
console.log('🔍 Are they the same?', cleanedCode === codeWithRules);

// Show first 500 chars of each
console.log('📄 Clean code preview:', cleanedCode.substring(0, 500));
console.log('📋 Code with rules preview:', codeWithRules.substring(0, 500));

// Check if code with rules has MISRA comments
const hasMisraComments = codeWithRules.includes('MISRA') || codeWithRules.includes('Rule');
console.log('✅ Has MISRA comments:', hasMisraComments);
    
    if (!cleanedCode || cleanedCode.length < 10) {
      throw new Error('AI did not generate valid code');
    }
    
    this.hideLoadingOverlay();
    this.removeMinimizedLoading();
    this.updateEditMessageStatus('completed');
    
    // Calculate stats
    const originalLines = code.split('\n');
    const modifiedLines = cleanedCode.split('\n');
    const stats = this.calculateChangeStats(originalLines, modifiedLines);
    
    // Get editor selection
    const editor = window.monaco?.editor?.getEditors()?.[0];
    if (!editor) {
      showNotification('No active editor', 'error');
      return;
    }
    
    const selection = editor.getSelection();
    if (!selection) {
      showNotification('No selection found', 'error');
      return;
    }
    
   console.log('📋 Creating proposal with:');
    console.log('   - modified (clean):', cleanedCode.substring(0, 200));
    console.log('   - modifiedCodeWithRules:', codeWithRules.substring(0, 200));
    
// Create proposal with MISRA context
const proposal: EditProposal = {
  original: code,
  modified: cleanedCode, // Clean code by default
  startLine: selection.startLineNumber,
  endLine: selection.endLineNumber,
  startColumn: selection.startColumn,
  endColumn: selection.endColumn,
  description: `${displayName} Compliance Fixes`,
  instruction: `Generate ${displayName} compliant code`,
  linesRange: `${selection.startLineNumber}-${selection.endLineNumber}`,
  explanation: {
    objective: result.objective || `Applied ${displayName} compliance fixes`,
    changes: Array.isArray(result.changes) ? result.changes : ['Code made compliant'],
    beforeSummary: result.beforeSummary || 'Original code with violations',
    afterSummary: result.afterSummary || `${displayName} compliant code`,
    stats: stats
  },
misraContext: {
  standard: displayName,
  violations: Array.isArray(result.violations) ? result.violations : [],
  recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
  originalAnalysis: response,
  modifiedCodeWithRules: codeWithRules // Use the extracted version
}
    }; 
    // Show diff view directly!
    await this.showDiffProposal(editor, proposal);
    
    showNotification(`✅ ${displayName} compliant code generated!`, 'success');

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      this.updateEditMessageStatus('cancelled');
      return;
    }

    this.hideLoadingOverlay();
    this.removeMinimizedLoading();
    this.updateEditMessageStatus('failed');

    this.recordEditError(`${displayName} Analysis`, (error as Error).message);
    showNotification(`Failed: ${(error as Error).message}`, 'error');
  } finally {
    this.isProcessing = false;
    this.abortController = null;
  }
}
/**
 * Show MISRA analysis results with professional UI
 */
private async showMISRAAnalysisResults(
  analysis: string,
  misraCommand: MISRACommand,
  code: string
): Promise<void> {
  const displayName = MISRACommandParser.getCommandDisplayName(misraCommand);
  
  // Parse the analysis to extract structured data
  const parsed = this.parseMISRAAnalysis(analysis);
  
  const modal = document.createElement('div');
  modal.className = 'ai-diff-modal';
  modal.innerHTML = `
    <div class="ai-diff-overlay" id="misra-overlay-click"></div>
    <div class="ai-diff-content">
      <div class="ai-diff-header">
        <div class="ai-diff-title-bar">
          <div class="ai-diff-title">
            <svg class="ai-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="title-content">
              <span class="title-main">📋 ${displayName} Analysis</span>
              <span class="title-subtitle">
                <svg class="location-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6L8 2L13 6V13H3V6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${misraCommand.keywords.join(' • ')}
              </span>
            </div>
          </div>
          <button class="close-btn" id="misra-close" type="button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="ai-diff-instruction-bar">
          <svg class="instruction-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="instruction-text">${this.escapeHtml(misraCommand.originalMessage)}</span>
        </div>
      </div>
      
      <div class="ai-explanation-panel" id="misra-analysis-panel">
        <div class="explanation-header">
          <div class="explanation-header-left">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Compliance Analysis</span>
          </div>
          <button class="export-html-btn" id="export-misra-html" type="button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Export HTML Report</span>
          </button>
        </div>
        
        <div class="explanation-content">
          ${this.renderMISRAAnalysisUI(parsed)}
        </div>
      </div>
      
      <div class="ai-diff-editor" style="display: none;"></div>
      
      <div class="ai-diff-actions">
        <div class="action-hint">
          <svg class="hint-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Review compliance findings and implement recommended fixes</span>
        </div>
        <div class="action-buttons">
          <button id="misra-close-footer" class="ai-btn ai-btn-secondary" type="button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Close</span>
            <kbd>Esc</kbd>
          </button>
          
          ${parsed.violations.length > 0 ? `
          <button id="misra-apply-fixes" class="ai-btn ai-btn-primary" type="button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Generate Compliant Code</span>
            <kbd>Enter</kbd>
          </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('#misra-close');
  const closeFooterBtn = modal.querySelector('#misra-close-footer');
  const overlay = modal.querySelector('#misra-overlay-click');
  const exportBtn = modal.querySelector('#export-misra-html');
  const applyFixesBtn = modal.querySelector('#misra-apply-fixes');

  const closeModal = () => {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => modal.remove(), 300);
    document.removeEventListener('keydown', keyHandler);
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && parsed.violations.length > 0) {
      e.preventDefault();
      applyFixesBtn?.click();
    }
  };

  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);
  
  exportBtn?.addEventListener('click', async () => {
    try {
      const { HTMLViewerGenerator } = await import('./htmlViewerGenerator');
      const htmlReport = this.generateMISRAHTMLReport(parsed, misraCommand, code);
      HTMLViewerGenerator.openInNewWindow(htmlReport, `${displayName} Analysis Report`);
      showNotification('Report opened in new window', 'success');
    } catch (error) {
      console.error('Failed to export report:', error);
      showNotification('Failed to export report', 'error');
    }
  });

  // NEW: Handle "Generate Compliant Code" button
  if (applyFixesBtn) {
    applyFixesBtn.addEventListener('click', async () => {
      console.log('🔧 Generating compliant code...');
      closeModal();
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.generateMISRACompliantCode(code, misraCommand, parsed);
    });
  }

  document.addEventListener('keydown', keyHandler);
}

/**
 * Parse MISRA analysis text into structured data
 */
private parseMISRAAnalysis(analysis: string): any {
  const result = {
    overview: {
      status: 'Unknown',
      mandatory: 0,
      required: 0,
      advisory: 0,
      compliance: '0%'
    },
    violations: [] as any[],
    recommendations: [] as string[],
    rawText: analysis
  };

  // Extract compliance overview
  const statusMatch = analysis.match(/Overall Status:\s*([^\n*]+)/i);
  if (statusMatch) result.overview.status = statusMatch[1].trim();

  const mandatoryMatch = analysis.match(/Mandatory[:\s]*(\d+)/i);
  if (mandatoryMatch) result.overview.mandatory = parseInt(mandatoryMatch[1]);

  const requiredMatch = analysis.match(/Required[:\s]*(\d+)/i);
  if (requiredMatch) result.overview.required = parseInt(requiredMatch[1]);

  const advisoryMatch = analysis.match(/Advisory[:\s]*(\d+)/i);
  if (advisoryMatch) result.overview.advisory = parseInt(advisoryMatch[1]);

  const complianceMatch = analysis.match(/Compliance Percentage[:\s]*(\d+%)/i);
  if (complianceMatch) result.overview.compliance = complianceMatch[1];

  // Extract violations
  const violationPattern = /(?:Rule|Violation)\s+(\d+\.?\d*)[:\s]*([^\n]+)/gi;
  let match;
  while ((match = violationPattern.exec(analysis)) !== null) {
    result.violations.push({
      rule: match[1],
      description: match[2].trim()
    });
  }

  // Extract recommendations
  const recPattern = /(?:Recommendation|Fix)[:\s]*([^\n]+)/gi;
  while ((match = recPattern.exec(analysis)) !== null) {
    result.recommendations.push(match[1].trim());
  }

  return result;
}

/**
 * Render MISRA analysis UI
 */
/**
 * Render MISRA analysis UI
 */
private renderMISRAAnalysisUI(parsed: any): string {
  const totalViolations = parsed.overview.mandatory + parsed.overview.required + parsed.overview.advisory;
  const isCompliant = totalViolations === 0;

  return `
    <div class="explanation-section">
      <div class="section-label">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 11L12 14L22 4M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3.89543 5 5 3.89543 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Compliance Overview
      </div>
      <div class="section-content objective">
        <strong style="color: ${isCompliant ? '#4caf50' : '#f44336'};">${isCompliant ? 'Compliant' : parsed.overview.status}</strong>
        ${totalViolations > 0 ? ` - ${totalViolations} violation(s) found` : ' - Fully compliant'}
      </div>
    </div>

    ${totalViolations > 0 ? `
    <div class="stats-row">
      ${parsed.overview.mandatory > 0 ? `
      <div class="stat-item removed">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="stat-value">${parsed.overview.mandatory}</span>
        <span class="stat-label">Mandatory</span>
      </div>
      ` : ''}
      ${parsed.overview.required > 0 ? `
      <div class="stat-item modified">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="stat-value">${parsed.overview.required}</span>
        <span class="stat-label">Required</span>
      </div>
      ` : ''}
      ${parsed.overview.advisory > 0 ? `
      <div class="stat-item added">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="stat-value">${parsed.overview.advisory}</span>
        <span class="stat-label">Advisory</span>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${parsed.violations.length > 0 ? `
    <div class="explanation-section">
      <div class="section-label">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Rule Violations
      </div>
      <ul class="changes-list">
        ${parsed.violations.map((v: any, i: number) => `
          <li class="change-item" data-change-index="${i}">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span><strong>Rule ${this.escapeHtml(v.rule)}:</strong> ${this.escapeHtml(v.description)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : '<div class="explanation-section"><div class="section-content" style="color: #4caf50; font-weight: 600;">✅ No violations detected - Code is compliant!</div></div>'}

    ${parsed.recommendations.length > 0 ? `
    <div class="explanation-section">
      <div class="section-label">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Recommendations
      </div>
      <ul class="changes-list">
        ${parsed.recommendations.map((rec: string, i: number) => `
          <li class="change-item">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${this.escapeHtml(rec)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

${!proposal.misraContext ? `
<div class="explanation-footer-message">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div class="footer-message-content">
    <strong>Quick Summary Above</strong>
    <p>This is a brief overview of the changes. Click the <strong>"Get Detailed Professional Analysis"</strong> button in the header above for an in-depth analysis with industry standards, best practices, architectural impact, and comprehensive recommendations.</p>
  </div>
</div>
` : ''}
  `;
}

/**
 * Generate HTML report for MISRA analysis
 */
private generateMISRAHTMLReport(parsed: any, misraCommand: MISRACommand, code: string): string {
  const displayName = MISRACommandParser.getCommandDisplayName(misraCommand);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${displayName} Analysis Report</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #9c27b0; border-bottom: 3px solid #9c27b0; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .overview { background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { flex: 1; padding: 15px; border-radius: 6px; text-align: center; }
    .stat.mandatory { background: #ffebee; color: #c62828; }
    .stat.required { background: #fff3e0; color: #e65100; }
    .stat.advisory { background: #e3f2fd; color: #1565c0; }
    .violation { background: #fff; border-left: 4px solid #f44336; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .recommendation { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 10px 0; border-radius: 4px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; }
    pre { background: #263238; color: #aed581; padding: 20px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 ${displayName} Analysis Report</h1>
    <p><strong>Analysis Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Command:</strong> ${this.escapeHtml(misraCommand.originalMessage)}</p>
    
    <div class="overview">
      <h2>Compliance Overview</h2>
      <p><strong>Status:</strong> ${parsed.overview.status}</p>
      <p><strong>Compliance Rate:</strong> ${parsed.overview.compliance}</p>
      
      <div class="stats">
        <div class="stat mandatory">
          <h3>${parsed.overview.mandatory}</h3>
          <p>Mandatory</p>
        </div>
        <div class="stat required">
          <h3>${parsed.overview.required}</h3>
          <p>Required</p>
        </div>
        <div class="stat advisory">
          <h3>${parsed.overview.advisory}</h3>
          <p>Advisory</p>
        </div>
      </div>
    </div>
    
    ${parsed.violations.length > 0 ? `
    <h2>Rule Violations</h2>
    ${parsed.violations.map((v: any) => `
      <div class="violation">
        <strong>Rule ${v.rule}:</strong> ${this.escapeHtml(v.description)}
      </div>
    `).join('')}
    ` : '<p style="color: #4caf50; font-weight: 600;">✅ No violations detected!</p>'}
    
    ${parsed.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${parsed.recommendations.map((rec: string) => `
      <div class="recommendation">
        ${this.escapeHtml(rec)}
      </div>
    `).join('')}
    ` : ''}
    
    <h2>Analyzed Code</h2>
    <pre><code>${this.escapeHtml(code)}</code></pre>
    
    <hr style="margin: 40px 0;">
    <p style="text-align: center; color: #999; font-size: 12px;">
      Generated by AI Code IDE - ${displayName} Compliance Analysis
    </p>
  </div>
</body>
</html>
  `;
}
/**
 * Generate detailed MISRA HTML report for compliance analysis
 */
/**
 * Generate detailed MISRA HTML report for compliance analysis
 */
private generateDetailedMISRAReport(
  misraContext: any,
  originalCode: string,
  modifiedCode: string,
  explanation: any
): string {
  const standard = misraContext.standard;
  const violations = misraContext.violations;
  const recommendations = misraContext.recommendations;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${standard} Compliance Analysis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e27;
      color: #e0e6ed;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #141829;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
      padding: 40px;
      text-align: center;
      border-bottom: 4px solid #ba68c8;
    }
    .header-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    h1 {
      color: white;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .header-badges {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-standard {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    .badge-compliant {
      background: #4caf50;
      color: white;
    }
    .safety-notice {
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(123, 31, 162, 0.1));
      border: 2px solid rgba(156, 39, 176, 0.4);
      border-radius: 12px;
      padding: 20px;
      margin: 30px 40px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .safety-notice-icon {
      font-size: 32px;
    }
    .safety-notice-content h3 {
      color: #ba68c8;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .safety-notice-content p {
      color: #b0b8c1;
      font-size: 14px;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      color: #ba68c8;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(186, 104, 200, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .section-title-icon {
      font-size: 28px;
    }
    .violation-card, .recommendation-card, .change-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      transition: all 0.3s;
    }
    .violation-card {
      border-left: 4px solid #f44336;
    }
    .violation-card:hover {
      background: rgba(244, 67, 54, 0.05);
      transform: translateX(4px);
    }
    .recommendation-card {
      border-left: 4px solid #4caf50;
    }
    .recommendation-card:hover {
      background: rgba(76, 175, 80, 0.05);
      transform: translateX(4px);
    }
    .change-card {
      border-left: 4px solid #2196f3;
    }
    .change-card:hover {
      background: rgba(33, 150, 243, 0.05);
      transform: translateX(4px);
    }
    .card-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 8px;
      color: #fff;
    }
    .card-description {
      color: #b0b8c1;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #ba68c8;
      margin-bottom: 8px;
    }
    .stat-label {
      font-size: 14px;
      color: #b0b8c1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .code-block {
      background: #0a0e1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    .code-header {
      background: rgba(156, 39, 176, 0.2);
      padding: 12px 20px;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .code-header.before {
      color: #f44336;
    }
    .code-header.after {
      color: #4caf50;
    }
    pre {
      padding: 20px;
      overflow-x: auto;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    code {
      color: #e0e6ed;
    }
    .footer {
      background: rgba(255, 255, 255, 0.03);
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .footer-text {
      color: #6b7280;
      font-size: 13px;
    }
    @media print {
      body { background: white; color: black; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">📋</div>
      <h1>${standard} Compliance Analysis</h1>
      <div class="header-badges">
        <span class="badge badge-standard">${standard}</span>
        <span class="badge badge-compliant">✅ Compliance Fixed</span>
      </div>
    </div>
    
    <div class="safety-notice">
      <div class="safety-notice-icon">📋</div>
      <div class="safety-notice-content">
        <h3>${standard} CODE COMPLIANCE</h3>
        <p>This document contains compliance analysis with ${standard} coding standards for automotive and safety-critical software development.</p>
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">🎯</span>
          Compliance Objective
        </h2>
        <p style="color: #b0b8c1; font-size: 15px;">${this.escapeHtml(explanation.objective)}</p>
      </div>
      
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">📊</span>
          Change Statistics
        </h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" style="color: #4caf50;">+${explanation.stats.linesAdded}</div>
            <div class="stat-label">Lines Added</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #f44336;">-${explanation.stats.linesRemoved}</div>
            <div class="stat-label">Lines Removed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #ff9800;">${explanation.stats.linesModified}</div>
            <div class="stat-label">Lines Modified</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">🔍</span>
          Violations Addressed
        </h2>
        ${violations.length > 0 ? violations.map((v: any, i: number) => `
          <div class="violation-card">
            <div class="card-title">Rule ${this.escapeHtml(v.rule)}</div>
            <div class="card-description">${this.escapeHtml(v.description)}</div>
          </div>
        `).join('') : '<p style="color: #4caf50;">✅ No violations found - Code is compliant!</p>'}
      </div>
      
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">✅</span>
          Changes Made
        </h2>
        ${explanation.changes.map((change: string, i: number) => `
          <div class="change-card">
            <div class="card-title">Change ${i + 1}</div>
            <div class="card-description">${this.escapeHtml(change)}</div>
          </div>
        `).join('')}
      </div>
      
      ${recommendations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">💡</span>
          Additional Recommendations
        </h2>
        ${recommendations.map((rec: string) => `
          <div class="recommendation-card">
            <div class="card-description">${this.escapeHtml(rec)}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">🔄</span>
          Code Comparison
        </h2>
        <div class="code-comparison">
          <div class="code-block">
            <div class="code-header before">❌ Before (Non-Compliant)</div>
            <pre><code>${this.escapeHtml(originalCode)}</code></pre>
          </div>
          <div class="code-block">
            <div class="code-header after">✅ After (${standard} Compliant)</div>
            <pre><code>${this.escapeHtml(modifiedCode)}</code></pre>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p class="footer-text">
        Generated on ${new Date().toLocaleString()} | ${standard} Compliance Report<br>
        <strong>Status:</strong> All violations addressed • Code is now ${standard} compliant
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
/**
 * Generate MISRA-compliant code and show diff
 */
private async generateMISRACompliantCode(
  originalCode: string,
  misraCommand: MISRACommand,
  analysis: any
): Promise<void> {
  const displayName = MISRACommandParser.getCommandDisplayName(misraCommand);
  
  showNotification(`Generating ${displayName} compliant code...`, 'info');
  this.showLoadingOverlay(`${displayName} Code Generation`);
  
  try {
    const fileName = this.getCurrentFileName();
    const language = this.detectLanguage();
    
    // Build fix prompt based on violations
    let fixPrompt = `Fix this code to be ${displayName} compliant.

Original Code:
\`\`\`${language}
${originalCode}
\`\`\`

## Violations Found:
${analysis.violations.map((v: any, i: number) => `
${i + 1}. **Rule ${v.rule}**: ${v.description}
`).join('\n')}

## Requirements:
- Fix ALL violations listed above
- Maintain the original functionality
- Add necessary error handling
- Follow ${displayName} best practices
- Add comments explaining compliance changes

IMPORTANT: Return ONLY a valid JSON object in this EXACT format (no markdown, no code blocks):
{
  "modifiedCode": "your fixed code here",
  "objective": "Brief summary of compliance fixes",
  "changes": ["Change 1", "Change 2", "Change 3"],
  "beforeSummary": "Original code issues",
  "afterSummary": "Fixed code improvements"
}`;

    const config = getCurrentApiConfigurationForced();
    const response = await callGenericAPI(fixPrompt, config, this.abortController?.signal);
    
    this.hideLoadingOverlay();
    
    console.log('🔍 Raw AI response:', response.substring(0, 500));
    
    // Try to parse the response
    let result: any;
    try {
      // Clean up the response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/gi, '');
      jsonStr = jsonStr.replace(/```\s*/g, '');
      
      // Extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      console.log('🔍 Cleaned JSON:', jsonStr.substring(0, 500));
      
      result = JSON.parse(jsonStr);
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('📄 Full response:', response);
      
      // Fallback: Try to extract code from the response
      showNotification('AI response format issue, trying fallback...', 'warning');
      
      // Look for code blocks in the response
      const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      
      if (codeBlockMatch && codeBlockMatch[1]) {
        result = {
          modifiedCode: codeBlockMatch[1].trim(),
          objective: `${displayName} compliance fixes (extracted from response)`,
          changes: ['Code modified for compliance'],
          beforeSummary: 'Original code with violations',
          afterSummary: `${displayName} compliant code`
        };
      } else {
        // Last resort: use entire response as code
        showNotification('Could not parse AI response properly', 'error');
        throw new Error('Invalid AI response format. Please try again.');
      }
    }
    
    // Extract and clean the code
    let cleanedCode = (result.modifiedCode || '').trim();
    cleanedCode = cleanedCode.replace(/```[\w]*\n?/g, '').trim();
    
    if (!cleanedCode || cleanedCode.length < 10) {
      throw new Error('AI did not generate valid code');
    }
    
    console.log('✅ Cleaned code length:', cleanedCode.length);
    
    // Calculate stats
    const originalLines = originalCode.split('\n');
    const modifiedLines = cleanedCode.split('\n');
    const stats = this.calculateChangeStats(originalLines, modifiedLines);
    
    // Get editor selection
    const editor = window.monaco?.editor?.getEditors()?.[0];
    if (!editor) {
      showNotification('No active editor', 'error');
      return;
    }
    
    const selection = editor.getSelection();
    if (!selection) {
      showNotification('No selection found', 'error');
      return;
    }
    
    // Create proposal
// Create proposal
const proposal: EditProposal = {
  original: originalCode,
  modified: cleanedCode,
  startLine: selection.startLineNumber,
  endLine: selection.endLineNumber,
  startColumn: selection.startColumn,
  endColumn: selection.endColumn,
  description: `${displayName} Compliance Fixes`,
  instruction: `Generate ${displayName} compliant code`,
  linesRange: `${selection.startLineNumber}-${selection.endLineNumber}`,
  explanation: {
    objective: result.objective || `Applied ${displayName} compliance fixes`,
    changes: Array.isArray(result.changes) ? result.changes : ['Code made compliant'],
    beforeSummary: result.beforeSummary || 'Original code with violations',
    afterSummary: result.afterSummary || `${displayName} compliant code`,
    stats: stats
  },
  // ADD THIS: Store MISRA context
  misraContext: {
    standard: displayName,
    violations: analysis.violations,
    recommendations: analysis.recommendations,
    originalAnalysis: analysis.rawText
  }
};
    
    // Show diff view!
    await this.showDiffProposal(editor, proposal);
    
    showNotification(`✅ ${displayName} compliant code generated!`, 'success');
    
  } catch (error) {
    this.hideLoadingOverlay();
    console.error('Failed to generate compliant code:', error);
    showNotification(`Failed to generate fixes: ${(error as Error).message}`, 'error');
  }
}
/**
 * Format MISRA response with syntax highlighting
 */
private formatMISRAResponse(response: string): string {
  let formatted = response;

  formatted = formatted.replace(/Rule (\d+\.?\d*)/g,
    '<span style="color: #9C27B0; font-weight: 600; background: rgba(156, 39, 176, 0.1); padding: 2px 6px; border-radius: 4px;">Rule $1</span>');

  formatted = formatted.replace(/\b(Mandatory|Required|Advisory)\b/g,
    '<span style="color: #E91E63; font-weight: 600;">$1</span>');

  formatted = formatted.replace(/Line[s]?: (\d+)/g,
    '<strong style="color: #FF9800;">Line: $1</strong>');

  formatted = formatted.replace(/^# (.*$)/gim, '<h1 style="color: #9C27B0; margin-top: 20px;">$1</h1>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 style="color: #BA68C8; margin-top: 16px;">$1</h2>');

  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g,
    '<pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto;"><code>$2</code></pre>');

  formatted = formatted.replace(/`([^`]+)`/g,
    '<code style="background: rgba(156, 39, 176, 0.1); padding: 2px 6px; border-radius: 3px;">$1</code>');

  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\n\n/g, '<br><br>');

  return formatted;
}
  // ============================================================================
  // BLOCK: LOADING OVERLAY
  // ============================================================================
  
  /**
   * Show loading overlay with minimize/stop options
   * FIXED v2: Using completely isolated DOM structure to prevent animation leakage
   */
  private showLoadingOverlay(instruction: string = 'Processing Code'): void {
    this.hideLoadingOverlay();
    this.isMinimized = false;
    this.currentInstruction = instruction;  // Store for expand
    
    // Format instruction for display (capitalize, truncate if too long)
    const formatInstruction = (text: string): string => {
      // Capitalize first letter of each word
      let formatted = text.replace(/\b\w/g, l => l.toUpperCase());
      // Truncate if too long
      if (formatted.length > 50) {
        formatted = formatted.substring(0, 47) + '...';
      }
      return formatted;
    };
    
    const displayInstruction = formatInstruction(instruction);
    
    // Detect task type for icon and color
    const getTaskStyle = (text: string): { icon: string; color: string; bgColor: string } => {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('misra') || lowerText.includes('compliance') || lowerText.includes('iso') || lowerText.includes('asil')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>`,
          color: '#4caf50',
          bgColor: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)'
        };
      }
      
      if (lowerText.includes('refactor') || lowerText.includes('improve') || lowerText.includes('clean')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
          color: '#ff9800',
          bgColor: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)'
        };
      }
      
      if (lowerText.includes('fix') || lowerText.includes('bug') || lowerText.includes('error') || lowerText.includes('debug')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>`,
          color: '#f44336',
          bgColor: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)'
        };
      }
      
      if (lowerText.includes('test') || lowerText.includes('unit') || lowerText.includes('spec')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" stroke="currentColor" stroke-width="2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
          color: '#9c27b0',
          bgColor: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)'
        };
      }
      
      if (lowerText.includes('document') || lowerText.includes('comment') || lowerText.includes('jsdoc')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
          color: '#2196f3',
          bgColor: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)'
        };
      }
      
      if (lowerText.includes('security') || lowerText.includes('vulnerab') || lowerText.includes('safe')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
          color: '#00bcd4',
          bgColor: 'linear-gradient(135deg, #006064 0%, #00838f 100%)'
        };
      }
      
      if (lowerText.includes('performance') || lowerText.includes('optim') || lowerText.includes('speed') || lowerText.includes('fast')) {
        return {
          icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
          color: '#ffeb3b',
          bgColor: 'linear-gradient(135deg, #f57f17 0%, #fbc02d 100%)'
        };
      }
      
      // Default: Code analysis
      return {
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        color: '#0098ff',
        bgColor: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)'
      };
    };
    
    const taskStyle = getTaskStyle(instruction);
    
    // Add animation styles to document head (if not already present)
    if (!document.getElementById('ai-loading-animations-v3')) {
      const animStyle = document.createElement('style');
      animStyle.id = 'ai-loading-animations-v3';
      animStyle.textContent = `
        @keyframes aiPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes aiScan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
        @keyframes aiGlow {
          0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
          50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
        }
        @keyframes aiDot {
          0%, 20% { opacity: 0.3; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0.3; }
        }
        @keyframes aiBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes aiSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes aiRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ai-load-dot-1 { animation: aiDot 1.4s ease-in-out infinite; }
        .ai-load-dot-2 { animation: aiDot 1.4s ease-in-out 0.2s infinite; }
        .ai-load-dot-3 { animation: aiDot 1.4s ease-in-out 0.4s infinite; }
        .ai-terminal-cursor { animation: aiBlink 1s step-end infinite; }
        .ai-progress-slide { animation: aiSlide 1.5s ease-in-out infinite; }
        .ai-scan-line { animation: aiScan 2s linear infinite; }
        .ai-icon-glow { animation: aiGlow 2s ease-in-out infinite; }
        .ai-icon-rotate { animation: aiRotate 3s linear infinite; }
      `;
      document.head.appendChild(animStyle);
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'ai-edit-loading-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.85) !important;
      backdrop-filter: blur(8px) !important;
      z-index: 100001 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;
    
    // Create modal - VS Code style window
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #1e1e1e !important;
      border: 1px solid #3c3c3c !important;
      border-radius: 8px !important;
      width: 500px !important;
      max-width: 90vw !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) !important;
      overflow: hidden !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
    `;
    
    // Window title bar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 10px 12px !important;
      background: #252526 !important;
      border-bottom: 1px solid #3c3c3c !important;
    `;
    
    const titleLeft = document.createElement('div');
    titleLeft.style.cssText = `display:flex;align-items:center;gap:10px;flex:1;min-width:0;`;
    titleLeft.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background: ${taskStyle.bgColor};
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      ">
        <div class="ai-scan-line" style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);"></div>
        ${taskStyle.icon}
      </div>
      <div style="min-width:0;flex:1;">
        <div style="color:#e0e0e0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayInstruction}</div>
        <div style="color:#808080;font-size:11px;">AI Code Assistant</div>
      </div>
    `;
    
    const titleRight = document.createElement('div');
    titleRight.style.cssText = `display:flex;gap:4px;flex-shrink:0;`;
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'minimize-loading';
    minimizeBtn.title = 'Minimize to status bar';
    minimizeBtn.style.cssText = `
      width:28px;height:28px;border:none;background:transparent;border-radius:4px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;
    `;
    minimizeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12h16" stroke="#808080" stroke-width="2" stroke-linecap="round"/></svg>`;
    minimizeBtn.onmouseover = () => minimizeBtn.style.background = '#404040';
    minimizeBtn.onmouseout = () => minimizeBtn.style.background = 'transparent';
    
    const stopBtn = document.createElement('button');
    stopBtn.id = 'stop-loading';
    stopBtn.title = 'Cancel (Esc)';
    stopBtn.style.cssText = `
      width:28px;height:28px;border:none;background:transparent;border-radius:4px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;
    `;
    stopBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#808080" stroke-width="2" stroke-linecap="round"/></svg>`;
    stopBtn.onmouseover = () => stopBtn.style.background = '#c42b1c';
    stopBtn.onmouseout = () => stopBtn.style.background = 'transparent';
    
    titleRight.appendChild(minimizeBtn);
    titleRight.appendChild(stopBtn);
    titleBar.appendChild(titleLeft);
    titleBar.appendChild(titleRight);
    
    // Main content area
    const content = document.createElement('div');
    content.style.cssText = `padding: 20px !important;`;
    
    // Terminal-style output area
    const terminalArea = document.createElement('div');
    terminalArea.style.cssText = `
      background: #0d0d0d !important;
      border: 1px solid #333 !important;
      border-radius: 6px !important;
      padding: 14px 16px !important;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace !important;
      font-size: 12px !important;
      margin-bottom: 16px !important;
    `;
    
    const terminalLines = [
      { prefix: '$', text: 'Parsing source code', status: 'done' },
      { prefix: '$', text: 'Analyzing code structure', status: 'done' },
      { prefix: '$', text: 'Processing AI request', status: 'active' },
      { prefix: '$', text: 'Generating modifications', status: 'pending' }
    ];
    
    terminalArea.innerHTML = terminalLines.map((line, i) => {
      const textColor = line.status === 'done' ? '#4ec9b0' : line.status === 'active' ? '#dcdcaa' : '#5a5a5a';
      const icon = line.status === 'done' ? '✓' : line.status === 'active' ? '›' : '○';
      const iconColor = line.status === 'done' ? '#4ec9b0' : line.status === 'active' ? taskStyle.color : '#3a3a3a';
      const activeStyle = line.status === 'active' ? 'style="animation:aiPulse 1.5s ease-in-out infinite;"' : '';
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:${i < terminalLines.length - 1 ? '8px' : '0'};" ${activeStyle}>
          <span style="color:${iconColor};font-size:12px;width:14px;text-align:center;">${icon}</span>
          <span style="color:#6a9955;">${line.prefix}</span>
          <span style="color:${textColor};">${line.text}</span>
          ${line.status === 'active' ? `<span class="ai-terminal-cursor" style="color:${taskStyle.color};margin-left:2px;">▌</span>` : ''}
        </div>
      `;
    }).join('');
    
    // Progress section
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `margin-bottom: 16px !important;`;
    
    const progressHeader = document.createElement('div');
    progressHeader.style.cssText = `
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8px !important;
    `;
    progressHeader.innerHTML = `
      <span style="color:#808080;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:500;">Processing</span>
      <span style="color:${taskStyle.color};font-size:11px;font-family:'Cascadia Code',monospace;">
        <span class="ai-load-dot-1">.</span><span class="ai-load-dot-2">.</span><span class="ai-load-dot-3">.</span>
      </span>
    `;
    
    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = `
      height: 4px !important;
      background: #2d2d2d !important;
      border-radius: 2px !important;
      overflow: hidden !important;
      position: relative !important;
    `;
    
    const progressSlide = document.createElement('div');
    progressSlide.className = 'ai-progress-slide';
    progressSlide.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      height: 100% !important;
      width: 30% !important;
      background: linear-gradient(90deg, transparent, ${taskStyle.color}, transparent) !important;
      border-radius: 2px !important;
    `;
    progressTrack.appendChild(progressSlide);
    
    progressContainer.appendChild(progressHeader);
    progressContainer.appendChild(progressTrack);
    
    // Footer with keyboard hints
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-top: 14px !important;
      border-top: 1px solid #2d2d2d !important;
    `;
    
    const footerLeft = document.createElement('div');
    footerLeft.style.cssText = `display:flex;align-items:center;gap:6px;`;
    footerLeft.innerHTML = `
      <kbd style="background:#2d2d2d;border:1px solid #404040;border-radius:4px;padding:3px 8px;font-size:11px;color:#808080;font-family:inherit;">Esc</kbd>
      <span style="color:#606060;font-size:11px;">Cancel</span>
    `;
    
    const footerRight = document.createElement('div');
    footerRight.style.cssText = `display:flex;align-items:center;gap:6px;color:#4a4a4a;font-size:11px;`;
    footerRight.innerHTML = `
      <div style="width:6px;height:6px;background:${taskStyle.color};border-radius:50%;"></div>
      <span>AI Processing</span>
    `;
    
    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);
    
    // Assemble content
    content.appendChild(terminalArea);
    content.appendChild(progressContainer);
    content.appendChild(footer);
    
    // Assemble modal
    modal.appendChild(titleBar);
    modal.appendChild(content);
    overlay.appendChild(modal);
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Add event listeners
    minimizeBtn.addEventListener('click', () => this.minimizeLoading());
    stopBtn.addEventListener('click', () => this.stopProcessing());
    
    // Escape key to cancel
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.stopProcessing();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    console.log('🎨 Loading overlay displayed (v3 - Professional Dev UI)');
  }
  
  /**
   * Format time as HH:MM AM/PM
   * @param date - Date object
   * @returns Formatted time string
   */
  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }
  
  /**
   * Setup delete button for a message
   * @param messageId - ID of message to setup delete for
   */
  private setupMessageDeleteButton(messageId: string): void {
    const deleteBtn = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!deleteBtn) return;
    
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const message = document.getElementById(messageId);
      if (!message) return;
      
      if (confirm('Delete this message?')) {
        message.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          message.remove();
          console.log(`🗑️ Deleted message: ${messageId}`);
        }, 300);
      }
    });
  }
  
  /**
   * Minimize loading overlay to chat indicator
   */
  private minimizeLoading(): void {
    this.isMinimized = true;
    this.hideLoadingOverlay();
    
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;
    
    document.getElementById('ai-minimized-loading')?.remove();
    
    const minimizedMessage = document.createElement('div');
    minimizedMessage.id = 'ai-minimized-loading';
    minimizedMessage.className = 'system-message ai-minimized-loading';
    minimizedMessage.innerHTML = `
      <div class="minimized-loading-content">
        <div class="minimized-spinner">
          <svg class="mini-spinner" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="minimized-text">
          <div class="minimized-title">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>AI is analyzing your code...</span>
          </div>
          <div class="minimized-progress-bar">
            <div class="minimized-progress-fill"></div>
          </div>
        </div>
        <div class="minimized-actions">
          <button class="minimized-btn expand-btn" id="expand-loading" title="Show details">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="minimized-btn stop-btn" id="stop-minimized" title="Stop">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2" rx="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    chatContainer.appendChild(minimizedMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    setTimeout(() => {
      document.getElementById('expand-loading')?.addEventListener('click', () => this.expandLoading());
      document.getElementById('stop-minimized')?.addEventListener('click', () => this.stopProcessing());
    }, 100);
    
    console.log('📦 Loading minimized to chat');
  }
  
  /**
   * Expand minimized loading back to full overlay
   */
  private expandLoading(): void {
    if (!this.isProcessing) return;
    
    this.isMinimized = false;
    document.getElementById('ai-minimized-loading')?.remove();
    this.showLoadingOverlay(this.currentInstruction);
    
    console.log('🔍 Loading expanded');
  }
  
  /**
   * Stop AI processing
   */
  private stopProcessing(): void {
    console.log('🛑 Stopping AI processing');
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.isProcessing = false;
    this.hideLoadingOverlay();
    document.getElementById('ai-minimized-loading')?.remove();
    
    this.updateEditMessageStatus('cancelled');
    
    const message = `⚠️ **Processing Cancelled**

AI code analysis was stopped by user.`;
    
    addSystemMessage(message);
    queueMessageForSaving('system', message, {
      messageType: 'ai-edit-cancelled'
    });
    
    showNotification('AI processing stopped', 'info');
  }
  
  /**
   * Remove minimized loading indicator
   */
  private removeMinimizedLoading(): void {
    document.getElementById('ai-minimized-loading')?.remove();
  }

  /**
   * Force scroll chat to bottom with retry (handles scroll lock from other modules)
   */
  private scrollChatToBottom(container: Element): void {
    const doScroll = () => {
      container.scrollTop = container.scrollHeight;
    };
    doScroll();
    // Retry after frame paint and after short delay (handles scroll managers, collapse systems)
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 150);
    setTimeout(doScroll, 400);
  }
  
  /**
   * Hide loading overlay
   */
  private hideLoadingOverlay(): void {
    const overlay = document.getElementById('ai-edit-loading-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => overlay.remove(), 300);
    }
  }
  
  // ============================================================================
  // BLOCK: USER PROMPT
  // ============================================================================
  
  
  // ============================================================================
  // BLOCK: EDITOR COMMANDS (CONTEXT MENU)
  // ============================================================================
  
  /**
   * Add commands to Monaco editor context menu
   */
  private addEditorCommands(): void {
    setTimeout(() => {
      const editor = window.monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        console.log('⚠️ No editor available for commands');
        return;
      }
      
      try {
        editor.addAction({
          id: 'ai-edit-selection',
          label: '✨ Edit with AI...',
          contextMenuGroupId: 'modification',
          contextMenuOrder: 1.5,
          run: () => this.showEditPrompt()
        });
        
        editor.addAction({
          id: 'ai-refactor',
          label: '🔄 AI Refactor',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
          contextMenuGroupId: 'modification',
          contextMenuOrder: 1.6,
          run: () => this.editSelection('Refactor and improve this code for better readability and performance')
        });
        
        editor.addAction({
          id: 'ai-add-comments',
          label: '💬 AI Add Comments',
          contextMenuGroupId: 'modification',
          contextMenuOrder: 1.7,
          run: () => this.editSelection('Add clear, helpful comments explaining this code')
        });
        
        editor.addAction({
          id: 'ai-add-error-handling',
          label: '🛡️ AI Add Error Handling',
          contextMenuGroupId: 'modification',
          contextMenuOrder: 1.8,
          run: () => this.editSelection('Add comprehensive error handling')
        });
        
        console.log('✅ Editor commands added to context menu');
      } catch (error) {
        console.error('Failed to add editor commands:', error);
      }
    }, 1000);
  }
  
  // ============================================================================
  // BLOCK: UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Detect language from editor
   * @returns Language identifier
   */
  private detectLanguage(): string {
    const editor = window.monaco?.editor?.getEditors()?.[0];
    if (!editor) return 'javascript';
    
    const model = editor.getModel();
    if (!model) return 'javascript';
    
    return model.getLanguageId() || 'javascript';
  }
  
  /**
   * Escape HTML special characters
   * @param text - Text to escape
   * @returns Escaped HTML string
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Show notification (wrapper)
   * @param message - Message to show
   * @param type - Notification type
   */
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    showNotification(message, type);
  }
  
  // ============================================================================
  // BLOCK: STYLES INJECTION
  // ============================================================================
  
  /**
   * Inject professional styles for AI Direct Editor
   */
  private injectStyles(): void {
    if (document.getElementById('ai-direct-editor-styles')) {
      console.log('ℹ️ Styles already injected');
      return;
    }
    
    const styles = document.createElement('style');
    styles.id = 'ai-direct-editor-styles';
    styles.textContent = `
      /* ============================================================================
         PROFESSIONAL DIFF MODAL STYLES
         ============================================================================ */
      
      .ai-diff-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      
      .ai-diff-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(12px);
        cursor: pointer;
        pointer-events: auto !important;
      }
      
      .ai-diff-content {
        position: relative;
        z-index: 1;
        background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
        border: 1px solid rgba(156, 39, 176, 0.3);
        border-radius: 12px;
        width: 92%;
        height: 85%;
        max-width: 1400px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 0 1px rgba(156, 39, 176, 0.1), 0 20px 60px rgba(0, 0, 0, 0.8);
        overflow: hidden;
        pointer-events: auto !important;
      }
      
      .ai-diff-header {
        background: linear-gradient(135deg, #1e1e1e 0%, #141414 100%);
        border-bottom: 1px solid rgba(156, 39, 176, 0.2);
      }
      
      .ai-diff-title-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
      }
      
      .ai-diff-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-icon-svg {
        width: 24px;
        height: 24px;
        color: #9c27b0;
      }
      
      .title-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .title-main {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
      }
      
      .title-subtitle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #888;
      }
      
      .location-icon {
        width: 12px;
        height: 12px;
        color: #666;
      }
      
      .close-btn {
        width: 32px;
        height: 32px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        padding: 0;
      }
      /* Professional Edit Dialog */
#ai-professional-edit-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100002;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.ai-edit-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.ai-edit-dialog {
  position: relative;
  background: linear-gradient(145deg, #1e1e1e 0%, #141414 100%);
  border: 1px solid rgba(156, 39, 176, 0.3);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(156, 39, 176, 0.1);
  display: flex;
  flex-direction: column;
}

.ai-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(156, 39, 176, 0.2);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 32px;
  height: 32px;
  color: #9c27b0;
}

.ai-edit-header h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.ai-edit-header p {
  margin: 0;
  font-size: 13px;
  color: #888;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #999;
  font-size: 28px;
  line-height: 1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.ai-edit-body {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.code-info {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(156, 39, 176, 0.1);
  border: 1px solid rgba(156, 39, 176, 0.2);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #da70d6;
}

.info-badge svg {
  width: 14px;
  height: 14px;
}

.code-preview {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-text {
  padding: 12px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #ccc;
  line-height: 1.5;
  max-height: 100px;
  overflow: hidden;
}

.instruction-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.instruction-label {
  font-size: 13px;
  font-weight: 600;
  color: #ddd;
}

.instruction-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(156, 39, 176, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.instruction-input:focus {
  outline: none;
  border-color: #9c27b0;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
}

.instruction-input::placeholder {
  color: #666;
}

.instruction-input.error-shake {
  animation: shake 0.5s;
  border-color: #f44336;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.quick-suggestions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions-label {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.suggestion-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  z-index: 1;
}

.suggestion-btn span:not(.beta-badge) {
  flex: 1;
  z-index: 1;
}

.suggestion-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.suggestion-btn:hover::before {
  opacity: 1;
}

.suggestion-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

/* Error Handling - Blue Theme */
.btn-error-handling {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(25, 118, 210, 0.1));
  color: #64b5f6;
  border-color: rgba(33, 150, 243, 0.3);
}

.btn-error-handling::before {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.25), rgba(25, 118, 210, 0.15));
}

.btn-error-handling:hover {
  border-color: rgba(33, 150, 243, 0.5);
}

/* Add Comments - Green Theme */
.btn-comments {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(56, 142, 60, 0.1));
  color: #81c784;
  border-color: rgba(76, 175, 80, 0.3);
}

.btn-comments::before {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.25), rgba(56, 142, 60, 0.15));
}

.btn-comments:hover {
  border-color: rgba(76, 175, 80, 0.5);
}

/* Refactor - Purple Theme */
.btn-refactor {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(123, 31, 162, 0.1));
  color: #ba68c8;
  border-color: rgba(156, 39, 176, 0.3);
}

.btn-refactor::before {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.25), rgba(123, 31, 162, 0.15));
}

.btn-refactor:hover {
  border-color: rgba(156, 39, 176, 0.5);
}

/* MISRA C - Orange Theme */
.btn-misra {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(245, 124, 0, 0.1));
  color: #ffb74d;
  border-color: rgba(255, 152, 0, 0.3);
}

.btn-misra::before {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.25), rgba(245, 124, 0, 0.15));
}

.btn-misra:hover {
  border-color: rgba(255, 152, 0, 0.5);
}

/* ISO 26262 - Red Theme */
.btn-iso26262 {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(211, 47, 47, 0.1));
  color: #e57373;
  border-color: rgba(244, 67, 54, 0.3);
}

.btn-iso26262::before {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.25), rgba(211, 47, 47, 0.15));
}

.btn-iso26262:hover {
  border-color: rgba(244, 67, 54, 0.5);
}

.beta-badge {
  display: inline-block;
  margin-left: auto;
  padding: 3px 8px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(255, 107, 107, 0.4);
  z-index: 1;
}

.beta-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
  vertical-align: middle;
  box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
}

.ai-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid rgba(156, 39, 176, 0.2);
}

.btn-secondary,
.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #ddd;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  color: white;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.4);
}

@media (max-width: 640px) {
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
}
      .close-btn svg {
        width: 16px;
        height: 16px;
        color: #999;
      }
      
      .close-btn:hover {
        background: rgba(244, 67, 54, 0.15);
        border-color: rgba(244, 67, 54, 0.3);
      }
      
      .close-btn:hover svg {
        color: #f44336;
      }
      
      .ai-diff-instruction-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        background: rgba(156, 39, 176, 0.05);
        border-top: 1px solid rgba(156, 39, 176, 0.1);
      }
      
      .instruction-icon {
        width: 16px;
        height: 16px;
        color: #9c27b0;
      }
      
      .instruction-text {
        font-size: 13px;
        color: #bbb;
        font-style: italic;
      }
      .toggle-misra-rules-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
  white-space: nowrap;
}

.toggle-misra-rules-btn svg {
  width: 14px;
  height: 14px;
}

.toggle-misra-rules-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.5);
  background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%);
}

.toggle-misra-rules-btn:active {
  transform: translateY(0);
}
      /* ============================================================================
         EXPLANATION PANEL
         ============================================================================ */
      
      .ai-explanation-panel {
        background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
        border-bottom: 1px solid rgba(156, 39, 176, 0.2);
        padding: 20px 24px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .explanation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: #da70d6;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 16px;
        padding: 12px 16px;
        background: rgba(156, 39, 176, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(156, 39, 176, 0.2);
      }
      
      .explanation-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .explanation-header-left svg {
        width: 18px;
        height: 18px;
      }
      
      .get-detailed-analysis-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        white-space: nowrap;
      }
      
      .get-detailed-analysis-btn svg {
        width: 14px;
        height: 14px;
      }
      
      .get-detailed-analysis-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      }
      
      .get-detailed-analysis-btn:active {
        transform: translateY(0);
      }
      
      .get-detailed-analysis-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      
      .explanation-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .explanation-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .section-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #9c27b0;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .section-label svg {
        width: 14px;
        height: 14px;
      }
      
      .section-content {
        color: #ccc;
        font-size: 13px;
        line-height: 1.6;
        padding-left: 22px;
      }
      
      .section-content.objective {
        color: #ddd;
        font-weight: 500;
      }
      
      .changes-list {
        list-style: none;
        padding: 0;
        margin: 0;
        padding-left: 22px;
      }
      
      .changes-list li {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        color: #bbb;
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 8px;
      }
      
      .changes-list li svg {
        width: 14px;
        height: 14px;
        color: #4caf50;
        margin-top: 3px;
        flex-shrink: 0;
      }
      
      .changes-list li.change-item {
        cursor: default;
        transition: background 0.2s;
      }
      
      .changes-list li.change-item:hover {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        padding-left: 8px;
        margin-left: -8px;
      }
      
      .changes-list li.change-item span {
        cursor: pointer;
      }
      
      .before-after-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding-left: 22px;
      }
      
      .before-after-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 12px;
      }
      
      .before-after-card.before {
        border-left: 3px solid #f44336;
      }
      
      .before-after-card.after {
        border-left: 3px solid #4caf50;
      }
      
      .card-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        color: #999;
      }
      
      .before-after-card.before .card-header {
        color: #f44336;
      }
      
      .before-after-card.after .card-header {
        color: #4caf50;
      }
      
      .card-header svg {
        width: 12px;
        height: 12px;
      }
      
      .card-content {
        color: #bbb;
        font-size: 12px;
        line-height: 1.5;
      }
      
      .stats-row {
        display: flex;
        gap: 12px;
        padding-left: 22px;
      }
      
      .stat-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 10px 12px;
      }
      
      .stat-item.added {
        border-left: 3px solid #4caf50;
      }
      
      .stat-item.removed {
        border-left: 3px solid #f44336;
      }
      
      .stat-item.modified {
        border-left: 3px solid #ff9800;
      }
      
      .stat-item svg {
        width: 16px;
        height: 16px;
      }
      
      .stat-item.added svg {
        color: #4caf50;
      }
      
      .stat-item.removed svg {
        color: #f44336;
      }
      
      .stat-item.modified svg {
        color: #ff9800;
      }
      
      .stat-value {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
      }
      
      .stat-label {
        font-size: 11px;
        color: #999;
      }
      
      /* ============================================================================
         EXPLANATION FOOTER MESSAGE
         ============================================================================ */
      
      .explanation-footer-message {
        display: flex;
        gap: 12px;
        padding: 16px;
        margin-top: 16px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-left: 4px solid #6366f1;
        border-radius: 8px;
        animation: fadeIn 0.4s ease;
      }
      
      .explanation-footer-message svg {
        width: 24px;
        height: 24px;
        color: #6366f1;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .footer-message-content {
        flex: 1;
      }
      
      .footer-message-content strong {
        display: block;
        color: #a78bfa;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .footer-message-content p {
        color: #bbb;
        font-size: 12px;
        line-height: 1.6;
        margin: 0;
      }
      
      .footer-message-content p strong {
        display: inline;
        color: #c4b5fd;
        font-size: inherit;
        text-transform: none;
        letter-spacing: normal;
      }
      
      .ai-diff-editor {
        flex: 1;
        overflow: hidden;
        min-height: 0;
        background: #0d0d0d;
      }
      
      .ai-diff-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        background: linear-gradient(135deg, #1e1e1e 0%, #141414 100%);
        border-top: 1px solid rgba(156, 39, 176, 0.2);
      }
      
      .action-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 12px;
      }
      
      .hint-icon {
        width: 16px;
        height: 16px;
      }
      
      .action-buttons {
        display: flex;
        gap: 12px;
        position: relative;
        z-index: 10;
        pointer-events: auto !important;
      }
      
      .ai-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        pointer-events: auto !important;
        position: relative;
        z-index: 10;
      }
      
      .ai-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .ai-btn kbd {
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .ai-btn-primary {
        background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
        color: white;
        border: 1px solid rgba(156, 39, 176, 0.3);
      }
      
      .ai-btn-primary:hover {
        background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%);
        transform: translateY(-1px);
      }
      
      .ai-btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .ai-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      
      /* ============================================================================
         LOADING OVERLAY
         ============================================================================ */
      
      .ai-edit-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(16px);
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }
      
      .ai-loading-modal {
        background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
        border: 1px solid rgba(156, 39, 176, 0.3);
        border-radius: 16px;
        padding: 48px;
        max-width: 480px;
      }
      
      .ai-loading-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(156, 39, 176, 0.2);
        margin: -48px -48px 24px -48px;
      }
      
      .loading-header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #da70d6;
        font-weight: 600;
        font-size: 14px;
      }
      
      .loading-header-title svg {
        width: 18px;
        height: 18px;
      }
      
      .loading-header-actions {
        display: flex;
        gap: 8px;
      }
      
      .loading-action-btn {
        width: 32px;
        height: 32px;
        border: 1px solid rgba(156, 39, 176, 0.3);
        background: rgba(156, 39, 176, 0.1);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s;
      }
      
      .loading-action-btn svg {
        width: 16px;
        height: 16px;
        color: #9c27b0;
      }
      
      .loading-action-btn:hover {
        background: rgba(156, 39, 176, 0.2);
      }
      
      .loading-action-btn.stop-btn:hover {
        background: rgba(244, 67, 54, 0.15);
      }
      
      .loading-action-btn.stop-btn:hover svg {
        color: #f44336;
      }
      
      .ai-loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
      }
      
      .ai-loading-spinner {
        position: relative;
        width: 140px;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .spinner-svg {
        position: absolute;
        width: 100%;
        height: 100%;
      }
      
      .spinner-circle {
        fill: none;
        stroke: #9c27b0;
        stroke-width: 2;
        stroke-dasharray: 283;
        animation: spinCircle 2s ease-in-out infinite;
      }
      
      .spinner-circle-2 {
        fill: none;
        stroke: #da70d6;
        stroke-width: 2;
        stroke-dasharray: 220;
        animation: spinCircle 2.5s ease-in-out infinite reverse;
      }
      
      .spinner-circle-3 {
        fill: none;
        stroke: #7b1fa2;
        stroke-width: 2;
        stroke-dasharray: 157;
        animation: spinCircle 3s ease-in-out infinite;
      }
      
      @keyframes spinCircle {
        to { transform: rotate(360deg); }
      }
      
      .ai-loading-text {
        text-align: center;
      }
      
      .ai-loading-text h3 {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 20px;
        font-weight: 600;
      }
      
      .loading-title-icon {
        width: 20px;
        height: 20px;
        color: #9c27b0;
      }
      
      .ai-loading-subtitle {
        margin: 0;
        color: #888;
        font-size: 14px;
      }
      
      .ai-loading-progress {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .progress-bar-container {
        position: relative;
      }
      
      .progress-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(156, 39, 176, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #9c27b0, #da70d6, #9c27b0);
        background-size: 200% 100%;
        animation: progressFlow 2s linear infinite;
      }
      
      @keyframes progressFlow {
        0% { width: 20%; background-position: 0%; }
        50% { width: 80%; background-position: 100%; }
        100% { width: 20%; background-position: 200%; }
      }
      
      .progress-percentage {
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .percentage-text {
        font-size: 11px;
        font-weight: 600;
        color: #9c27b0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .loading-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #666;
        font-size: 13px;
      }
      
      .status-icon {
        width: 16px;
        height: 16px;
        animation: rotate 2s linear infinite;
      }
      
      @keyframes rotate {
        to { transform: rotate(360deg); }
      }
      
      /* ============================================================================
         MINIMIZED LOADING
         ============================================================================ */
      
      .ai-minimized-loading {
        background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(123, 31, 162, 0.1)) !important;
        border-left: 4px solid #9c27b0 !important;
        padding: 14px 18px !important;
        margin: 12px 16px !important;
        border-radius: 8px !important;
      }
      
      .minimized-loading-content {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      
      .minimized-spinner {
        flex-shrink: 0;
      }
      
      .mini-spinner {
        width: 24px;
        height: 24px;
        color: #9c27b0;
        animation: rotate 1s linear infinite;
      }
      
      .minimized-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .minimized-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #da70d6;
        font-weight: 600;
        font-size: 13px;
      }
      
      .minimized-title svg {
        width: 14px;
        height: 14px;
      }
      
      .minimized-progress-bar {
        width: 100%;
        height: 3px;
        background: rgba(156, 39, 176, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .minimized-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #9c27b0, #da70d6, #9c27b0);
        background-size: 200% 100%;
        animation: progressFlow 2s linear infinite;
      }
      
      .minimized-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      
      .minimized-btn {
        width: 28px;
        height: 28px;
        border: 1px solid rgba(156, 39, 176, 0.3);
        background: rgba(156, 39, 176, 0.1);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.2s;
      }
      
      .minimized-btn svg {
        width: 14px;
        height: 14px;
        color: #9c27b0;
      }
      
      .minimized-btn:hover {
        background: rgba(156, 39, 176, 0.2);
      }
      
      .minimized-btn.stop-btn:hover {
        background: rgba(244, 67, 54, 0.15);
      }
      
      .minimized-btn.stop-btn:hover svg {
        color: #f44336;
      }
      
      /* ============================================================================
         MESSAGE STYLING - MINIMAL & SUBTLE
         ============================================================================ */
      
      /* ============================================================================
         COMPACT EDIT MESSAGES (CEM) - Professional IDE-style
         ============================================================================ */
      
      .ai-chat-container .ai-edit-message,
      .system-message.ai-edit-message {
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 2px 8px !important;
        overflow: hidden !important;
        font-size: 12px !important;
        box-shadow: none !important;
      }
      
      .cem-row {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 5px 10px;
        border-radius: 5px;
        border-left: 3px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.02);
        font-family: 'Segoe UI', -apple-system, sans-serif;
        font-size: 12px;
        transition: filter 0.15s;
        min-height: 28px;
      }
      .cem-row:hover { filter: brightness(1.15); }
      
      /* ── Icon ── */
      .cem-icon {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.4);
      }
      .cem-icon-ok { background: rgba(76,175,80,0.18) !important; color: #5cdb7a !important; }
      .cem-icon-err { background: rgba(244,67,54,0.18) !important; color: #ff6b7a !important; }
      
      /* ── Spinner ── */
      .cem-spinner {
        display: inline-block;
        width: 11px;
        height: 11px;
        border: 1.5px solid rgba(0,122,204,0.25);
        border-top-color: #3dafff;
        border-radius: 50%;
        animation: cem-spin 0.7s linear infinite;
      }
      
      /* ── Label ── */
      .cem-label {
        font-weight: 600;
        font-size: 11.5px;
        white-space: nowrap;
        color: rgba(255,255,255,0.65);
      }
      
      /* ── Revision badge ── */
      .cem-rev {
        font-size: 10px;
        font-weight: 700;
        font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.35);
        border: 1px solid rgba(255,255,255,0.04);
      }
      
      /* ── Lines badge ── */
      .cem-lines {
        font-size: 10px;
        font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;
      }
      
      /* ── Detail (instruction text) ── */
      .cem-detail {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* ── Time ── */
      .cem-time {
        font-size: 10px;
        color: rgba(255,255,255,0.2);
        white-space: nowrap;
        flex-shrink: 0;
      }
      
      /* ── Delete button ── */
      .cem-del {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        border-radius: 3px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s;
        padding: 0;
      }
      .cem-row:hover .cem-del { opacity: 0.4; }
      .cem-del:hover { opacity: 1 !important; background: rgba(244,67,54,0.12); }
      .cem-del svg { width: 10px; height: 10px; color: rgba(244,67,54,0.7); }
      
      /* ── Processing state (blue) ── */
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-row {
        border-left-color: #007acc;
        background: rgba(0,122,204,0.06);
      }
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-icon {
        background: rgba(0,122,204,0.18);
      }
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-label { color: #7ec8f0; }
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-rev {
        background: rgba(0,122,204,0.12);
        color: #7ec8f0;
        border-color: rgba(0,122,204,0.15);
      }
      
      /* ── Applied state (green) ── */
      .system-message.ai-edit-message.success .cem-row {
        border-left-color: #4caf50;
        background: rgba(76,175,80,0.06);
      }
      .system-message.ai-edit-message.success .cem-label { color: #8fd4a0; }
      .system-message.ai-edit-message.success .cem-rev {
        background: rgba(76,175,80,0.12);
        color: #8fd4a0;
        border-color: rgba(76,175,80,0.15);
      }
      .system-message.ai-edit-message.success .cem-lines {
        background: rgba(76,175,80,0.1);
        color: #7adb94;
      }
      
      /* ── Rejected state (red) ── */
      .system-message.ai-edit-message.rejected .cem-row {
        border-left-color: #f44336;
        background: rgba(244,67,54,0.06);
      }
      .system-message.ai-edit-message.rejected .cem-label { color: #f0a0a8; }
      .system-message.ai-edit-message.rejected .cem-rev {
        background: rgba(244,67,54,0.1);
        color: #f0a0a8;
        border-color: rgba(244,67,54,0.12);
      }
      .system-message.ai-edit-message.rejected .cem-lines {
        background: rgba(244,67,54,0.1);
        color: #ff8a95;
      }
      
      @keyframes cem-spin { to { transform: rotate(360deg); } }
      @keyframes cem-in { from { opacity:0; transform:translateY(-3px); } to { opacity:1; transform:translateY(0); } }
      @keyframes cem-flash-bg {
        0% { filter: brightness(1.6); }
        100% { filter: brightness(1); }
      }
      .cem-row { animation: cem-in 0.2s ease; }
      .cem-row.cem-flash { animation: cem-in 0.2s ease, cem-flash-bg 1.2s ease-out; }
      
      /* ── COLLAPSE PROTECTION: Force CEM messages visible ── */
      .system-message.ai-edit-message[data-cem-protected],
      .ai-edit-message[data-cem-protected],
      [data-cem-protected="true"] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        max-height: 200px !important;
        height: auto !important;
        overflow: visible !important;
        position: relative !important;
        pointer-events: auto !important;
        transform: none !important;
        clip: auto !important;
        clip-path: none !important;
      }
      /* Prevent any collapse toggle from hiding these */
      .collapsed .system-message.ai-edit-message[data-cem-protected],
      .messages-collapsed .ai-edit-message[data-cem-protected],
      .bundle-collapsed .ai-edit-message[data-cem-protected] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* ============================================================================
         ANIMATIONS
         ============================================================================ */
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      /* ============================================================================
         RESPONSIVE DESIGN
         ============================================================================ */
      
      @media (max-width: 768px) {
        .ai-diff-content {
          width: 96%;
          height: 90%;
        }
        
        .before-after-grid {
          grid-template-columns: 1fr;
        }
        
        .stats-row {
          flex-direction: column;
        }
        
        .action-hint {
          display: none;
        }
        
        .ai-loading-modal {
          padding: 30px;
          max-width: 90%;
        }
        
        .ai-loading-spinner {
          width: 100px;
          height: 100px;
        }
        
        .ai-icon-svg {
          width: 36px;
          height: 36px;
        }
        
        .explanation-header {
          flex-direction: column;
          align-items: stretch;
        }
        
        .get-detailed-analysis-btn {
          width: 100%;
          justify-content: center;
        }
        
        .explanation-footer-message {
          flex-direction: column;
        }
        
        .explanation-footer-message svg {
          width: 20px;
          height: 20px;
        }
      }
      /* ============================================================================
   MISRA ANALYSIS MODAL
   ============================================================================ */

.misra-analysis-modal {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.misra-analysis-content {
  position: relative;
  background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
  border: 1px solid rgba(156, 39, 176, 0.3);
  border-radius: 12px;
  width: 90%;
  height: 85%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.misra-analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.1), rgba(123, 31, 162, 0.05));
  border-bottom: 1px solid rgba(156, 39, 176, 0.2);
}

.misra-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.misra-header-title svg {
  color: #9C27B0;
}

.misra-header-title h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.misra-header-title p {
  margin: 4px 0 0 0;
  color: #888;
  font-size: 12px;
}

.misra-analysis-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #0d0d0d;
}

.analysis-content {
  color: #ddd;
  font-size: 14px;
  line-height: 1.7;
}

.misra-analysis-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  background: linear-gradient(135deg, #1e1e1e, #141414);
  border-top: 1px solid rgba(156, 39, 176, 0.2);
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
    `;
    
    document.head.appendChild(styles);
    console.log('✅ Professional styles injected');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const aiDirectEditor = new AIDirectEditor();

// ============================================================================
// MONACO EDITOR INTEGRATION
// ============================================================================

/**
 * Initialize AI Direct Editor with Monaco
 */
export function initializeAIDirectEditor(editor: any): void {
  aiDirectEditor.initialize();
  
  // Add context menu actions
  try {
    editor.addAction({
      id: 'ai-edit-selection',
      label: '✨ Edit with AI...',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI
      ],
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1.5,
      run: () => aiDirectEditor.showEditPrompt()
    });
    
    editor.addAction({
      id: 'ai-refactor',
      label: '🔄 AI Refactor',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1.6,
      run: () => aiDirectEditor.editSelection('Refactor and improve this code for better readability and performance')
    });
    
    editor.addAction({
      id: 'ai-add-comments',
      label: '💬 AI Add Comments',
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1.7,
      run: () => aiDirectEditor.editSelection('Add clear, helpful comments explaining this code')
    });
    
    editor.addAction({
      id: 'ai-add-error-handling',
      label: '🛡️ AI Add Error Handling',
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1.8,
      run: () => aiDirectEditor.editSelection('Add comprehensive error handling')
    });
    
    editor.addAction({
      id: 'ai-add-iso26262-compliance',
      label: '🛡️ Add ISO 26262 Compliance',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyE],
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1.9,
      run: () => aiDirectEditor.editSelection('Add error handling with ASIL-D compliance per ISO 26262:2018')
    });
    
    console.log('✅ AI Direct Editor context menu actions registered');
  } catch (error) {
    console.error('Failed to register context menu actions:', error);
  }
}

// ============================================================================
// WINDOW DEBUG ACCESS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).aiDirectEditor = aiDirectEditor;
  (window as any).initializeAIDirectEditor = initializeAIDirectEditor;
}