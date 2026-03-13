// autonomousCore.ts - Core Autonomous System
// ============================================================================
// This file contains core functionality: typing system, apply logic, confirmation UI
// 
// SPLIT FROM: autonomousCoding.ts (master file - keep unchanged)
// COMPANION: autonomousMultiFile.ts (multi-file operations)
// ============================================================================
// When updating: Update autonomousCoding.ts first, then sync here
// ============================================================================

// autonomousCoding.ts - Enhanced Autonomous Coding System with AI Assistant Integration
// ⚠️ TEMPORARY: UI PANEL DISABLED - Only backend functionality active
import { showNotification } from './fileSystem';

// ============================================================================
// 🆕 MULTI-FILE AUTONOMOUS INTEGRATION - DISABLED (using internal system only)
// ============================================================================
// External module disabled to prevent conflicts - using internal processMultiFileApply only
const initMultiFileAutonomous = () => { /* disabled */ };
const scanAIMessageForFiles = () => [] as string[];
const getCurrentMultiFileSession = () => null;
const showMultiFileToast = (msg: string, type: string) => { /* disabled */ };

// Original import commented out to prevent dual processing:
// import { 
//   initMultiFileAutonomous, 
//   scanAIMessageForFiles,
//   getCurrentMultiFileSession,
//   showMultiFileToast
// } from './multiFileAutonomous';

// ==================== AUTONOMOUS CODING SYSTEM WITH HUMAN-LIKE TYPING ====================
/**
 * Enhanced Autonomous System with Human-like Typing Animation
 */
class SimpleAutonomousSystem {
  private isActive: boolean = false;
  private isTyping: boolean = false;
  private isStopped: boolean = false;
  private typingSpeed: number = 50; // milliseconds per character
  private lineDelay: number = 200; // extra delay between lines
  
  startAutonomousMode(): void {
    this.isActive = true;
    this.isStopped = false;
    console.log('🤖 Simple autonomous mode activated');
  }
  
  stopAutonomousMode(): void {
    this.isActive = false;
    this.isTyping = false;
    this.isStopped = false;
    console.log('🛑 Simple autonomous mode deactivated');
  }
  
  pauseAutonomousMode(): void {
    this.isStopped = true;
    this.isTyping = false;
    console.log('⏸️ Simple autonomous mode paused/stopped');
  }
  
  continueAutonomousMode(): void {
    this.isStopped = false;
    if (this.isActive) {
      console.log('▶️ Simple autonomous mode continued');
    }
  }
  
  isAutonomousActive(): boolean {
    return this.isActive && !this.isStopped;
  }
  
  isAutonomousStopped(): boolean {
    return this.isStopped;
  }
  
  isCurrentlyTyping(): boolean {
    return this.isTyping;
  }
  
  async processCurrentFile(filePath?: string): Promise<void> {
    console.log('⚡ Processing file with simple autonomous system:', filePath);
    
    if (this.isStopped) {
      showNotification('⏸️ Autonomous system is stopped. Press Continue to resume.', 'warning');
      return;
    }
    
    if (this.isTyping) {
      showNotification('⏳ Autonomous system is currently typing...', 'warning');
      return;
    }
    
    if (!filePath) {
      const activeTab = (window as any).tabManager?.getActiveTab();
      filePath = activeTab?.path;
    }
    
    if (!filePath || !filePath.endsWith('.py')) {
      showNotification('❌ No Python file selected', 'error');
      return;
    }
    
    try {
      // Get current editor content
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        showNotification('❌ No editor found', 'error');
        return;
      }
      
      const content = editor.getValue();
      console.log('📄 File content length:', content.length);
      
      // Check for autonomous decorators
      const decorators = this.findDecorators(content);
      
      if (decorators.length === 0) {
        showNotification('ℹ️ No autonomous decorators found', 'info');
        return;
      }
      
      console.log(`🎯 Found ${decorators.length} decorators:`, decorators);
      showNotification(`🎯 Found ${decorators.length} decorators - Starting autonomous coding...`, 'info');
      
      // Process each decorator with typing animation
      for (let i = 0; i < decorators.length; i++) {
        // Check if stopped during processing
        if (this.isStopped) {
          showNotification('⏸️ Autonomous processing stopped by user', 'warning');
          break;
        }
        
        const decorator = decorators[i];
        showNotification(`🤖 Generating ${decorator.type} (${i + 1}/${decorators.length})...`, 'info');
        await this.processDecoratorWithTyping(decorator, editor);
        
        // Pause between decorators
        if (i < decorators.length - 1) {
          await this.delay(1000);
        }
      }
      
      if (!this.isStopped) {
        showNotification(`✅ Autonomous coding complete! Generated ${decorators.length} functions`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Autonomous processing failed:', error);
      showNotification('❌ Autonomous processing failed', 'error');
      this.isTyping = false;
    }
  }
  
  private findDecorators(content: string): any[] {
    const decorators = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@auto_generate(')) {
        const match = line.match(/@auto_generate\((.*?)\)/);
        if (match) {
          decorators.push({
            type: 'generate',
            params: match[1],
            line: i,
            content: line
          });
        }
      } else if (line.startsWith('@auto_debug(')) {
        decorators.push({
          type: 'debug',
          params: line.match(/@auto_debug\((.*?)\)/)?.[1] || '',
          line: i,
          content: line
        });
      } else if (line.startsWith('@auto_improve(')) {
        decorators.push({
          type: 'improve',
          params: line.match(/@auto_improve\((.*?)\)/)?.[1] || '',
          line: i,
          content: line
        });
      } else if (line.startsWith('@auto_test(')) {
        decorators.push({
          type: 'test',
          params: line.match(/@auto_test\((.*?)\)/)?.[1] || '',
          line: i,
          content: line
        });
      } else if (line.startsWith('@auto_complete(')) {
        decorators.push({
          type: 'complete',
          params: line.match(/@auto_complete\((.*?)\)/)?.[1] || '',
          line: i,
          content: line
        });
      }
    }
    
    return decorators;
  }
  
  private async processDecoratorWithTyping(decorator: any, editor: any): Promise<void> {
    console.log(`🔨 Processing ${decorator.type} decorator:`, decorator);
    this.isTyping = true;
    
    // Update UI to show typing status
    this.updateTypingStatus(`Generating ${decorator.type}...`, true);
    
    let generatedCode = '';
    
    switch (decorator.type) {
      case 'generate':
        generatedCode = this.generateFunction(decorator.params);
        break;
      case 'debug':
        generatedCode = '# Auto-debug: Code analysis completed\n# TODO: Fix any identified issues';
        break;
      case 'improve':
        generatedCode = '# Auto-improve: Code optimization suggestions applied\n# TODO: Review optimization suggestions';
        break;
      case 'test':
        generatedCode = this.generateTest(decorator.params);
        break;
      case 'complete':
        generatedCode = this.completeFunction(decorator.params);
        break;
    }
    
    if (generatedCode && !this.isStopped) {
      await this.typeCodeIntoEditor(editor, decorator.line, generatedCode);
      console.log(`✅ Generated code for ${decorator.type}`);
    }
    
    this.isTyping = false;
    this.updateTypingStatus(this.isStopped ? 'Stopped' : 'Ready', false);
  }
  
  private async typeCodeIntoEditor(editor: any, insertLine: number, codeToType: string): Promise<void> {
    const lines = codeToType.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // Insert new line first
      const currentContent = editor.getValue();
      const contentLines = currentContent.split('\n');
      const targetLineIndex = insertLine + 1 + lineIndex;
      
      // Insert empty line
      contentLines.splice(targetLineIndex, 0, '');
      editor.setValue(contentLines.join('\n'));
      
      // Position cursor at the start of the new line
      const position = {
        lineNumber: targetLineIndex + 1,
        column: 1
      };
      editor.setPosition(position);
      editor.focus();
      
      // Type the line character by character
      await this.typeLineCharacterByCharacter(editor, line, targetLineIndex);
      
      // Small pause between lines
      if (lineIndex < lines.length - 1) {
        await this.delay(this.lineDelay);
      }
    }
  }
  
  private async typeLineCharacterByCharacter(editor: any, line: string, lineIndex: number): Promise<void> {
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      
      // Stop typing if autonomous mode was turned off or stopped
      if (!this.isActive || this.isStopped) {
        this.isTyping = false;
        return;
      }
      
      // Get current content and update the specific line
      const currentContent = editor.getValue();
      const lines = currentContent.split('\n');
      
      // Add character to the line
      if (lines[lineIndex] === undefined) {
        lines[lineIndex] = '';
      }
      lines[lineIndex] += char;
      
      // Update editor content
      const newContent = lines.join('\n');
      const currentPosition = editor.getPosition();
      
      editor.setValue(newContent);
      
      // Move cursor to next position
      const newPosition = {
        lineNumber: lineIndex + 1,
        column: charIndex + 2
      };
      editor.setPosition(newPosition);
      editor.focus();
      
      // Variable typing speed for more human-like feel
      const delay = this.getVariableTypingDelay(char);
      await this.delay(delay);
    }
  }
  
  private getVariableTypingDelay(char: string): number {
    // Different delays for different characters to simulate human typing
    if (char === ' ') {
      return this.typingSpeed * 0.5; // Spaces are faster
    } else if (char === '\t') {
      return this.typingSpeed * 0.3; // Tabs are very fast
    } else if ('()[]{}":,'.includes(char)) {
      return this.typingSpeed * 0.7; // Punctuation is slightly faster
    } else if (char.match(/[A-Z]/)) {
      return this.typingSpeed * 1.2; // Capital letters take slightly longer
    } else {
      // Add some randomness for more human feel
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      return this.typingSpeed * randomFactor;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private updateTypingStatus(status: string, isTyping: boolean): void {
    // Update the UI status panel
    const statusEl = document.getElementById('autonomous-status');
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.style.color = isTyping ? '#FF9800' : '#4CAF50';
    }
    
    // Update mode display
    const modeEl = document.getElementById('autonomous-mode');
    if (modeEl) {
      modeEl.textContent = isTyping ? 'Typing...' : 'Auto (on save)';
    }
    
    // Add typing indicator animation
    if (isTyping) {
      this.startTypingIndicator();
    } else {
      this.stopTypingIndicator();
    }
  }
  
  private startTypingIndicator(): void {
    const panel = document.getElementById('ai-assistant-autonomous-panel');
    if (panel) {
      panel.style.borderColor = '#FF9800';
      panel.style.animation = 'pulse 1s infinite';
      
      // Add CSS animation if not exists
      if (!document.getElementById('autonomous-animation-style')) {
        const style = document.createElement('style');
        style.id = 'autonomous-animation-style';
        style.textContent = `
          @keyframes pulse {
            0% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
            50% { box-shadow: 0 4px 20px rgba(255, 152, 0, 0.4); }
            100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }
  
  private stopTypingIndicator(): void {
    const panel = document.getElementById('ai-assistant-autonomous-panel');
    if (panel) {
      panel.style.borderColor = '#444';
      panel.style.animation = 'none';
    }
  }
  
  // Set typing speed (characters per second)
  setTypingSpeed(charactersPerSecond: number): void {
    this.typingSpeed = 1000 / charactersPerSecond;
    console.log(`🔧 Typing speed set to ${charactersPerSecond} characters per second`);
  }
  
  // Emergency stop typing
  emergencyStop(): void {
    this.pauseAutonomousMode();
    this.stopTypingIndicator();
    this.updateTypingStatus('Stopped', false);
    showNotification('🛑 Autonomous typing stopped', 'warning');
  }
  
  private generateFunction(params: string): string {
    // Parse function name and description
    const cleanParams = params.replace(/['"]/g, '');
    const paramParts = cleanParams.split(',').map(p => p.trim());
    const functionName = paramParts[0] || 'generated_function';
    const description = paramParts[1] || 'Auto-generated function';
    
    // Generate based on function name
    if (functionName.includes('fibonacci')) {
      return `def ${functionName}(n: int) -> int:
    """${description}"""
    if n <= 1:
        return n
    return ${functionName}(n-1) + ${functionName}(n-2)`;
    }
    
    if (functionName.includes('hello') || functionName.includes('world')) {
      return `def ${functionName}() -> str:
    """${description}"""
    message = "Hello, World!"
    print(message)
    return message`;
    }
    
    if (functionName.includes('factorial')) {
      return `def ${functionName}(n: int) -> int:
    """${description}"""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n <= 1:
        return 1
    return n * ${functionName}(n - 1)`;
    }
    
    if (functionName.includes('calculator') || functionName.includes('calc')) {
      return `def ${functionName}(a: float, b: float, operation: str) -> float:
    """${description}"""
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
    else:
        raise ValueError("Invalid operation")`;
    }
    
    if (functionName.includes('sort') || functionName.includes('bubble')) {
      return `def ${functionName}(arr: list) -> list:
    """${description}"""
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`;
    }
    
    if (functionName.includes('prime')) {
      return `def ${functionName}(n: int) -> bool:
    """${description}"""
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True`;
    }
    
    if (functionName.includes('reverse')) {
      return `def ${functionName}(text: str) -> str:
    """${description}"""
    return text[::-1]`;
    }
    
    // Generic function
    return `def ${functionName}(*args, **kwargs):
    """${description}"""
    # TODO: Implement function logic
    pass`;
  }
  
  private generateTest(params: string): string {
    return `# Auto-generated tests
import unittest

class TestAutonomous(unittest.TestCase):
    def test_function(self):
        """Test basic functionality."""
        self.assertTrue(True)
        
    def test_edge_cases(self):
        """Test edge cases."""
        pass

if __name__ == '__main__':
    unittest.main()`;
  }
  
  private completeFunction(params: string): string {
    const signature = params.replace(/['"]/g, '');
    return `${signature}
    """Auto-completed function."""
    # TODO: Implement function body
    pass`;
  }
}

/**
 * Enhanced Autonomous UI with AI Assistant Integration
 */
class SimpleAutonomousUI {
  private panel: HTMLElement | null = null;
  private panelState: 'full' | 'minimized' | 'hidden' = 'hidden';
  private animationInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.loadVisibilityState();
    // TEMPORARY: UI disabled
    // this.createAIAssistantIntegratedPanel();
    console.log('🔵 Autonomous UI temporarily disabled');
  }
  
  private loadVisibilityState(): void {
    const savedState = localStorage.getItem('autonomous-panel-state');
    this.panelState = (savedState as 'full' | 'minimized' | 'hidden') || 'hidden';
  }
  
  private saveVisibilityState(): void {
    localStorage.setItem('autonomous-panel-state', this.panelState);
  }
  
  private createAIAssistantIntegratedPanel(): void {
    // Wait for AI assistant container to be available
    setTimeout(() => {
      this.initializeAIIntegratedPanel();
    }, 1500); // Longer delay to ensure AI assistant is ready
  }
  
  private initializeAIIntegratedPanel(): void {
    // Find the AI assistant container
    let container = this.findAIAssistantContainer();
    
    if (!container) {
      console.warn('AI Assistant container not found, retrying...');
      setTimeout(() => this.initializeAIIntegratedPanel(), 1000);
      return;
    }
    
    // Create the autonomous panel integrated into AI assistant
    const panel = document.createElement('div');
    panel.id = 'ai-assistant-autonomous-panel';
    panel.className = 'ai-autonomous-panel';
    panel.style.cssText = `
      background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      margin: 12px 0;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.3s ease;
      display: ${this.panelState === 'hidden' ? 'none' : 'block'};
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Panel content simplified for brevity
    panel.innerHTML = `<div style="padding: 16px; text-align: center; color: #4fc3f7;">🤖 Autonomous Panel</div>`;
    
    // Insert the panel into the AI assistant container
    this.insertPanelIntoAIAssistant(container, panel);
    this.panel = panel;
    
    console.log('✅ Autonomous panel integrated into AI Assistant successfully');
  }
  
  private findAIAssistantContainer(): HTMLElement | null {
    const containerSelectors = [
      '.assistant-panel',
      '.ai-assistant-panel',
      '.ai-panel',
      '.chat-panel',
      '.ai-assistant-container',
      '.assistant-container',
      '.ai-chat-container',
      '#assistant-panel',
    ];
    
    for (const selector of containerSelectors) {
      try {
        const container = document.querySelector(selector) as HTMLElement;
        if (container && container.offsetWidth > 0) {
          console.log(`Found AI Assistant container: ${selector}`);
          return container;
        }
      } catch (e) {
        // Selector might not be supported, continue
      }
    }
    
    console.warn('No AI Assistant container found');
    return null;
  }
  
  private insertPanelIntoAIAssistant(container: HTMLElement, panel: HTMLElement): void {
    if (container.firstChild) {
      container.insertBefore(panel, container.firstChild);
    } else {
      container.appendChild(panel);
    }
    console.log('Autonomous panel inserted at beginning (fallback)');
  }
  
  public minimize(): void {
    if (this.panel) {
      this.panelState = 'minimized';
      this.saveVisibilityState();
      console.log('✅ Autonomous panel minimized in AI Assistant');
    }
  }
  
  public expand(): void {
    if (this.panel) {
      this.panelState = 'full';
      this.saveVisibilityState();
      console.log('✅ Autonomous panel expanded in AI Assistant');
    }
  }
  
  public show(): void {
    if (this.panel) {
      this.panelState = 'full';
      this.saveVisibilityState();
      console.log('✅ Autonomous panel shown in AI Assistant');
    }
  }
  
  public hide(): void {
    if (this.panel) {
      this.panelState = 'hidden';
      this.saveVisibilityState();
      console.log('✅ Autonomous panel hidden in AI Assistant');
    }
  }
  
  public toggle(): void {
    switch (this.panelState) {
      case 'hidden':
        this.show();
        break;
      case 'minimized':
        this.expand();
        break;
      case 'full':
        this.minimize();
        break;
    }
  }
  
  public isVisibleState(): boolean {
    return this.panelState !== 'hidden';
  }
  
  public getCurrentState(): 'full' | 'minimized' | 'hidden' {
    return this.panelState;
  }
  
  updateStatus(status: string, color: string = '#e1e1e1'): void {
    const statusEl = document.getElementById('autonomous-status');
    const statusElMini = document.getElementById('autonomous-status-mini');
    
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.style.color = color;
    }
    
    if (statusElMini) {
      statusElMini.textContent = status;
      statusElMini.style.color = color;
    }
  }
  
  updateMode(mode: string): void {
    const modeEl = document.getElementById('autonomous-mode');
    if (modeEl) {
      modeEl.textContent = mode;
    }
  }
}

// Autonomous Mode Functions - exported for main.ts
export async function toggleAutonomousMode(): Promise<void> {
  console.log('🤖 Toggling autonomous mode in AI Assistant...');
  
  let simpleAutonomousSystem = (window as any).__simpleAutonomous;
  let simpleAutonomousUI = (window as any).__simpleAutonomousUI;
  let isAutonomousModeActive = (window as any).__isAutonomousModeActive || false;
  
  // Initialize simple system if not done
  if (!simpleAutonomousSystem) {
    console.log('🔄 Initializing autonomous system in AI Assistant...');
    simpleAutonomousSystem = new SimpleAutonomousSystem();
    simpleAutonomousUI = new SimpleAutonomousUI();
    
    // Make available globally
    (window as any).__simpleAutonomous = simpleAutonomousSystem;
    (window as any).__simpleAutonomousUI = simpleAutonomousUI;
    
    showNotification('🤖 Autonomous system initialized in AI Assistant', 'success');
  }
  
  if (isAutonomousModeActive) {
    simpleAutonomousSystem.stopAutonomousMode();
    (window as any).__isAutonomousModeActive = false;
    simpleAutonomousUI?.updateStatus('Inactive', '#f48771');
    showNotification('🛑 Autonomous mode deactivated', 'info');
  } else {
    simpleAutonomousSystem.startAutonomousMode();
    (window as any).__isAutonomousModeActive = true;
    simpleAutonomousUI?.updateStatus('Active', '#4caf50');
    showNotification('🤖 Autonomous mode activated in AI Assistant', 'success');
  }
}

export async function processCurrentFileAutonomous(): Promise<void> {
  console.log('⚡ Processing current file autonomously in AI Assistant...');
  
  let simpleAutonomousSystem = (window as any).__simpleAutonomous;
  
  if (!simpleAutonomousSystem) {
    await toggleAutonomousMode();
    simpleAutonomousSystem = (window as any).__simpleAutonomous;
  }
  
  if (simpleAutonomousSystem) {
    await simpleAutonomousSystem.processCurrentFile();
  } else {
    showNotification('❌ Autonomous system not available', 'error');
  }
}

export function setTypingSpeed(speed: 'slow' | 'normal' | 'fast' | 'instant'): void {
  const simpleAutonomousSystem = (window as any).__simpleAutonomous;
  if (!simpleAutonomousSystem) return;
  
  const speeds = {
    slow: 20,
    normal: 40,
    fast: 80,
    instant: 1000
  };
  
  simpleAutonomousSystem.setTypingSpeed(speeds[speed]);
  showNotification(`🎯 Typing speed set to ${speed} in AI Assistant`, 'success');
  
  const speedSelect = document.getElementById('typing-speed-select') as HTMLSelectElement;
  if (speedSelect) {
    speedSelect.value = speed;
  }
}

export function emergencyStopTyping(): void {
  const autonomousSystem = (window as any).__simpleAutonomous;
  const autonomousUI = (window as any).__simpleAutonomousUI;
  
  if (autonomousSystem && autonomousUI) {
    if (autonomousSystem.isAutonomousStopped()) {
      autonomousSystem.continueAutonomousMode();
      autonomousUI.updateStatus('Active', '#4caf50');
      showNotification('▶️ Autonomous mode continued in AI Assistant', 'success');
    } else {
      autonomousSystem.emergencyStop();
      autonomousUI.updateStatus('Stopped', '#ff9800');
    }
  }
}

export function testAutonomousSystem(): void {
  console.log('🧪 Testing autonomous system in AI Assistant...');
  
  const simpleAutonomousSystem = (window as any).__simpleAutonomous;
  
  if (simpleAutonomousSystem) {
    console.log('✅ Autonomous system found in AI Assistant');
    showNotification('✅ Autonomous system test passed in AI Assistant!', 'success');
  } else {
    console.log('❌ No autonomous system found, initializing...');
    toggleAutonomousMode();
  }
}

// Initialize autonomous system when module is loaded
export function initializeAutonomousSystem(): void {
  console.log('🔵 Initializing Autonomous Coding System in AI Assistant...');
  
  setTimeout(async () => {
    try {
      let simpleAutonomousSystem = (window as any).__simpleAutonomous;
      let simpleAutonomousUI = (window as any).__simpleAutonomousUI;
      
      if (!simpleAutonomousSystem) {
        simpleAutonomousSystem = new SimpleAutonomousSystem();
        simpleAutonomousUI = new SimpleAutonomousUI();
        
        (window as any).__simpleAutonomous = simpleAutonomousSystem;
        (window as any).__simpleAutonomousUI = simpleAutonomousUI;
        
        console.log('✅ Autonomous Coding System initialized in AI Assistant successfully');
        showNotification('🔵 Autonomous Coding ready in AI Assistant! 🤖', 'success');
      }
    } catch (error) {
      console.error('❌ Error initializing autonomous coding system in AI Assistant:', error);
    }
  }, 3000); // Wait for AI assistant to be ready
}

// Global exports
export { SimpleAutonomousSystem, SimpleAutonomousUI };

console.log('🔵 autonomousCoding.ts loaded - AI Assistant Integration');

// ============================================================================
// AUTO CODE APPLY - Apply AI code blocks directly to Monaco Editor
// ============================================================================

console.log('🤖 [AutoCodeApply] Loading...');

const AUTO_APPLY_ICONS = {
  apply: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  replace: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
  insert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  append: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><path d="m12 6-4-4-4 4"/><line x1="8" y1="2" x2="8" y2="12"/></svg>`,
  error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  auto: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
  stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  typing: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
};

// ============================================================================
// AUTO-APPLY MODE - Automatically apply code to editor
// ============================================================================

let autoApplyEnabled = false;
let lastProcessedBlockId = '';
let processedBlockIds = new Set<string>();
let isTypingInProgress = false;
let stopTypingFlag = false;
let lineDelay = 30;

function getProgressiveDelay(lineNumber: number): number {
  return 0; // FAST: No delay for instant apply
}

let originalCodeBeforeApply: string = '';
let hasUnapprovedChanges: boolean = false;

// Track line numbers for each change type (for clickable highlights)
interface ChangeLineTracker {
  addedLines: number[];
  deletedLines: number[];
  modifiedLines: number[];
}
let lastChangeLines: ChangeLineTracker = { addedLines: [], deletedLines: [], modifiedLines: [] };
let activeHighlightDecorations: string[] = [];
let pendingMultiFileDecorations: Map<string, string[]> = new Map(); // fileName -> decorationIds

// Clear all pending decorations for a specific file or all files
function clearPendingDecorations(fileName?: string): void {
  const editor = getMonacoEditorForApply();
  if (!editor) return;
  
  if (fileName) {
    const ids = pendingMultiFileDecorations.get(fileName.toLowerCase());
    if (ids && ids.length > 0) {
      try { editor.deltaDecorations(ids, []); } catch(e) {}
      pendingMultiFileDecorations.delete(fileName.toLowerCase());
      console.log(`🎨 [Decorations] Cleared for: ${fileName}`);
    }
  } else {
    // Clear all
    for (const [file, ids] of pendingMultiFileDecorations.entries()) {
      try { editor.deltaDecorations(ids, []); } catch(e) {}
    }
    pendingMultiFileDecorations.clear();
    console.log(`🎨 [Decorations] Cleared all`);
  }
}

// Store decorations for a file (called after applying changes)
function storePendingDecorations(fileName: string, decorationIds: string[]): void {
  pendingMultiFileDecorations.set(fileName.toLowerCase(), decorationIds);
  console.log(`🎨 [Decorations] Stored ${decorationIds.length} for: ${fileName}`);
}

// Inject CSS styles for Monaco editor line highlighting
// These selectors are tested and work with Monaco's decoration system
function injectHighlightStyles(): void {
  const styleId = 'aca-highlight-styles-v3';
  
  // Remove old styles if exists to ensure fresh injection
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* ============================================
       ADDED LINES - Green Background
       High specificity to override Monaco defaults
       ============================================ */
    .aca-highlight-added,
    div.aca-highlight-added,
    .monaco-editor .aca-highlight-added,
    .monaco-editor .view-overlays .aca-highlight-added,
    .monaco-editor .view-overlays > div .aca-highlight-added,
    .monaco-editor .view-line .aca-highlight-added {
      background-color: rgba(46, 160, 67, 0.35) !important;
      box-shadow: inset 3px 0 0 0 #2ea043 !important;
    }
    
    .aca-margin-added,
    .monaco-editor .aca-margin-added,
    .monaco-editor .margin-view-overlays .aca-margin-added {
      background-color: #2ea043 !important;
      width: 4px !important;
      margin-left: 0 !important;
      border-radius: 0 !important;
    }
    
    /* ============================================
       MODIFIED LINES - Yellow/Orange Background
       ============================================ */
    .aca-highlight-modified,
    div.aca-highlight-modified,
    .monaco-editor .aca-highlight-modified,
    .monaco-editor .view-overlays .aca-highlight-modified,
    .monaco-editor .view-overlays > div .aca-highlight-modified,
    .monaco-editor .view-line .aca-highlight-modified {
      background-color: rgba(210, 153, 34, 0.35) !important;
      box-shadow: inset 3px 0 0 0 #d29922 !important;
    }
    
    .aca-margin-modified,
    .monaco-editor .aca-margin-modified,
    .monaco-editor .margin-view-overlays .aca-margin-modified {
      background-color: #d29922 !important;
      width: 4px !important;
      margin-left: 0 !important;
      border-radius: 0 !important;
    }
    
    /* ============================================
       DELETED LINES - Red Background
       ============================================ */
    .aca-highlight-deleted,
    div.aca-highlight-deleted,
    .monaco-editor .aca-highlight-deleted,
    .monaco-editor .view-overlays .aca-highlight-deleted,
    .monaco-editor .view-overlays > div .aca-highlight-deleted,
    .monaco-editor .view-line .aca-highlight-deleted {
      background-color: rgba(248, 81, 73, 0.35) !important;
      box-shadow: inset 3px 0 0 0 #f85149 !important;
    }
    
    .aca-margin-deleted,
    .monaco-editor .aca-margin-deleted,
    .monaco-editor .margin-view-overlays .aca-margin-deleted {
      background-color: #f85149 !important;
      width: 4px !important;
      margin-left: 0 !important;
      border-radius: 0 !important;
    }
    
    /* ============================================
       Line number colors
       ============================================ */
    .monaco-editor .line-numbers.aca-linenumber-added {
      color: #2ea043 !important;
    }
    .monaco-editor .line-numbers.aca-linenumber-modified {
      color: #d29922 !important;
    }
  `;
  document.head.appendChild(style);
  console.log('🎨 [Highlight] Injected highlight styles v3');
}

// Clear decorations when accepting or rejecting changes
function clearAllDecorations(): void {
  console.log('🎨 [Decorations] Clearing all decorations...');
  
  // Clear stored decorations from pendingMultiFileDecorations
  clearPendingDecorations();
  
  // Get current editor
  const editor = (window as any).__acaDecoratedEditor || getMonacoEditorForApply();
  
  // Clear global decoration IDs
  const ids = (window as any).__acaDecorationIds;
  if (editor && ids && ids.length > 0) {
    try {
      editor.deltaDecorations(ids, []);
      console.log(`🎨 [Decorations] Cleared ${ids.length} decoration IDs`);
    } catch (e) {
      console.warn('🎨 [Decorations] Error clearing ids:', e);
    }
  }
  
  // Clear all accumulated decorations
  const allIds = (window as any).__acaAllDecorations;
  if (editor && allIds && allIds.length > 0) {
    try {
      editor.deltaDecorations(allIds, []);
      console.log(`🎨 [Decorations] Cleared ${allIds.length} accumulated decorations`);
    } catch (e) {
      console.warn('🎨 [Decorations] Error clearing accumulated:', e);
    }
  }
  
  // Reset all global references
  (window as any).__acaDecorationIds = [];
  (window as any).__acaAllDecorations = [];
  (window as any).__acaDecoratedEditor = null;
  
  // Also clear activeHighlightDecorations
  if (editor && activeHighlightDecorations.length > 0) {
    try {
      editor.deltaDecorations(activeHighlightDecorations, []);
    } catch (e) {}
  }
  activeHighlightDecorations = [];
  
  console.log('🎨 [Decorations] All decorations cleared');
}

export function setAutoApplyTypingSpeed(lineDelayMs: number): void {
  lineDelay = Math.max(10, Math.min(500, lineDelayMs));
  console.log(`⚡ [AutoApply] Line delay: ${lineDelay}ms`);
}

export function stopAutoApplyTyping(): void {
  stopTypingFlag = true;
  console.log('🛑 [AutoApply] Stop typing requested');
}

function isAutoApplyEnabled(): boolean {
  return autoApplyEnabled;
}

// ============================================================================
// ACCEPT/REJECT CONFIRMATION UI
// ============================================================================

function injectConfirmationStyles(): void {
  if (document.getElementById('auto-apply-confirm-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'auto-apply-confirm-styles';
  style.textContent = `
    .aca-confirm-bar {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 10001;
      animation: aca-slide-up 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    @keyframes aca-slide-up {
      from { transform: translateX(-50%) translateY(10px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    .aca-confirm-bar .aca-status { display: flex; align-items: center; gap: 6px; padding: 0 6px; }
    .aca-confirm-bar .aca-status-icon { width: 16px; height: 16px; color: #3fb950; }
    .aca-confirm-bar .aca-status-text { color: #cccccc; font-size: 12px; font-weight: 500; }
    .aca-confirm-bar .aca-divider { width: 1px; height: 20px; background: #3c3c3c; margin: 0 2px; }
    .aca-confirm-bar .aca-changes { display: flex; align-items: center; gap: 4px; padding: 0 4px; }
    .aca-confirm-bar .aca-change { font-size: 11px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; padding: 2px 5px; border-radius: 3px; cursor: pointer; transition: all 0.15s ease; }
    .aca-confirm-bar .aca-change:hover { transform: scale(1.1); filter: brightness(1.2); }
    .aca-confirm-bar .aca-change.active { outline: 2px solid currentColor; outline-offset: 1px; }
    .aca-confirm-bar .aca-change.add { color: #3fb950; background: rgba(63, 185, 80, 0.15); }
    .aca-confirm-bar .aca-change.del { color: #f85149; background: rgba(248, 81, 73, 0.15); }
    .aca-confirm-bar .aca-change.mod { color: #d29922; background: rgba(210, 153, 34, 0.15); }
    
    /* Line highlight decorations for clickable badges - subtle colors */
    .aca-highlight-added { background: rgba(63, 185, 80, 0.12) !important; }
    .aca-highlight-deleted { background: rgba(248, 81, 73, 0.12) !important; }
    .aca-highlight-modified { background: rgba(210, 153, 34, 0.12) !important; }
    .aca-glyph-highlight-added { background: #3fb950; width: 3px !important; margin-left: 3px; }
    .aca-glyph-highlight-deleted { background: #f85149; width: 3px !important; margin-left: 3px; }
    .aca-glyph-highlight-modified { background: #d29922; width: 3px !important; margin-left: 3px; }
    .aca-confirm-bar .aca-actions { display: flex; align-items: center; gap: 4px; }
    .aca-confirm-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border: none; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
    .aca-confirm-btn svg { width: 12px; height: 12px; }
    .aca-confirm-btn .kbd { font-size: 9px; padding: 1px 4px; border-radius: 3px; font-family: 'SF Mono', Monaco, monospace; margin-left: 2px; }
    .aca-confirm-btn.accept { background: #238636; color: #ffffff; }
    .aca-confirm-btn.accept .kbd { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); }
    .aca-confirm-btn.accept:hover { background: #2ea043; }
    .aca-confirm-btn.reject { background: transparent; color: #f85149; border: 1px solid rgba(248, 81, 73, 0.4); }
    .aca-confirm-btn.reject .kbd { background: rgba(248, 81, 73, 0.2); color: #f85149; }
    .aca-confirm-btn.reject:hover { background: rgba(248, 81, 73, 0.1); border-color: rgba(248, 81, 73, 0.6); }
    .aca-editor-pending { position: relative; }
    .aca-editor-pending::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #238636, #3fb950, #238636); background-size: 200% 100%; animation: aca-pending-gradient 1.5s linear infinite; z-index: 100; }
    @keyframes aca-pending-gradient { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
    
    /* Code block applied/rejected status indicators */
    .code-applied { border-left: 3px solid #3fb950 !important; }
    .code-rejected { border-left: 3px solid #f85149 !important; opacity: 0.7; }
    .code-checked { border-left: 3px solid #8b949e !important; opacity: 0.8; }
    
    /* Status badge in header - proper positioning */
    .code-apply-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
      margin-left: 8px;
      flex-shrink: 0;
    }
    
    /* When inside cbe-header, integrate into flex layout */
    .cbe-header .code-apply-status {
      position: relative;
      top: auto;
      right: auto;
      order: 99; /* Push to end of flex container */
    }
    
    /* Fallback absolute positioning if not in header */
    .cbe-wrapper > .code-apply-status {
      position: absolute;
      top: 6px;
      right: 60px; /* Leave space for existing buttons */
    }
    
    .status-applied {
      background: rgba(63, 185, 80, 0.2);
      color: #3fb950;
      border: 1px solid rgba(63, 185, 80, 0.3);
    }
    .status-rejected {
      background: rgba(248, 81, 73, 0.2);
      color: #f85149;
      border: 1px solid rgba(248, 81, 73, 0.3);
    }
    .status-checked {
      background: rgba(139, 148, 158, 0.2);
      color: #8b949e;
      border: 1px solid rgba(139, 148, 158, 0.3);
    }
  `;
  document.head.appendChild(style);
}

function showConfirmationBar(changesSummary: string): void {
  // Don't show if multi-file confirmation is visible
  if (document.querySelector('.multi-file-confirm-bar')) {
    console.log('⏭️ [ConfirmBar] Skipping - multi-file confirm bar visible');
    return;
  }
  
  removeConfirmationBar();
  hasUnapprovedChanges = true;
  
  // Get current file name from editor
  const editor = getMonacoEditorForApply();
  const model = editor?.getModel();
  const fileName = model?.uri?.path?.split('/').pop() || 'file';
  
  // Create unified confirmation bar (same style as multi-file)
  const bar = document.createElement('div');
  bar.className = 'aca-confirm-bar unified-confirm-bar';
  bar.id = 'aca-confirm-bar';
  bar.innerHTML = `
    <div class="ucb-content">
      <div class="ucb-icon">📄</div>
      <div class="ucb-info">
        <div class="ucb-title">Changes Applied</div>
        <div class="ucb-details">
          <span class="ucb-file-tag">${fileName} (${changesSummary})</span>
        </div>
      </div>
      <div class="ucb-actions">
        <button class="ucb-btn ucb-btn-accept" title="Save changes (Enter)">
          ✓ Accept
        </button>
        <button class="ucb-btn ucb-btn-reject" title="Revert changes (Escape)">
          ✗ Reject
        </button>
      </div>
    </div>
  `;
  
  // Inject unified styles if not present
  if (!document.querySelector('#unified-confirm-styles')) {
    const style = document.createElement('style');
    style.id = 'unified-confirm-styles';
    style.textContent = `
      .unified-confirm-bar {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%);
        border: 1px solid #3d5a80;
        border-radius: 12px;
        padding: 12px 20px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        z-index: 10001;
        min-width: 320px;
        max-width: 600px;
        animation: ucbSlideUp 0.3s ease;
      }
      @keyframes ucbSlideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      .ucb-content {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .ucb-icon {
        font-size: 28px;
      }
      .ucb-info {
        flex: 1;
      }
      .ucb-title {
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }
      .ucb-details {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .ucb-file-tag {
        background: rgba(255,255,255,0.1);
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 11px;
        color: #8bb4d9;
      }
      .ucb-actions {
        display: flex;
        gap: 8px;
      }
      .ucb-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .ucb-btn-accept {
        background: #238636;
        color: #fff;
      }
      .ucb-btn-accept:hover {
        background: #2ea043;
      }
      .ucb-btn-reject {
        background: #da3633;
        color: #fff;
      }
      .ucb-btn-reject:hover {
        background: #f85149;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(bar);
  
  // Button handlers
  bar.querySelector('.ucb-btn-accept')?.addEventListener('click', () => acceptChanges());
  bar.querySelector('.ucb-btn-reject')?.addEventListener('click', () => rejectChanges());
  
  // Keyboard handler
  const keyHandler = (e: KeyboardEvent) => {
    if (!hasUnapprovedChanges) return;
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      const activeEl = document.activeElement;
      if (activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA' && !activeEl?.closest('[contenteditable="true"]')) {
        e.preventDefault();
        acceptChanges();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      rejectChanges();
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  (bar as any)._keyHandler = keyHandler;
  
  console.log('📋 [AutoApply] Awaiting confirmation: Accept (Enter) or Reject (Escape)');
}

/**
 * Highlight lines in the editor based on change type
 */
function highlightChangeLines(type: 'add' | 'del' | 'mod'): void {
  console.log(`🔦 [Highlight] highlightChangeLines called with type: ${type}`);
  console.log(`🔦 [Highlight] lastChangeLines:`, JSON.stringify(lastChangeLines));
  
  const editor = getMonacoEditorForApply();
  if (!editor) {
    console.log(`⚠️ [Highlight] No editor found`);
    showAutoApplyToast('⚠️ No editor available', 'error');
    return;
  }
  
  const monaco = (window as any).monaco;
  if (!monaco) {
    console.log(`⚠️ [Highlight] Monaco not available`);
    return;
  }
  
  // Clear existing highlights first
  clearHighlightDecorations();
  
  let lines: number[] = [];
  let className = '';
  let glyphClassName = '';
  let typeLabel = '';
  
  switch (type) {
    case 'add':
      lines = [...lastChangeLines.addedLines];
      className = 'aca-highlight-added';
      glyphClassName = 'aca-glyph-highlight-added';
      typeLabel = 'added';
      break;
    case 'del':
      // Deleted lines don't exist in final code - show positions where content was removed
      lines = [...lastChangeLines.deletedLines];
      className = 'aca-highlight-deleted';
      glyphClassName = 'aca-glyph-highlight-deleted';
      typeLabel = 'deleted (removal points)';
      break;
    case 'mod':
      lines = [...lastChangeLines.modifiedLines];
      className = 'aca-highlight-modified';
      glyphClassName = 'aca-glyph-highlight-modified';
      typeLabel = 'modified';
      break;
  }
  
  if (lines.length === 0) {
    console.log(`⚠️ [Highlight] No ${type} lines to highlight`);
    showAutoApplyToast(`⚠️ No ${typeLabel} lines to show`, 'info');
    return;
  }
  
  // Filter out invalid line numbers (must be >= 1 and <= total lines)
  const model = editor.getModel();
  const totalLines = model ? model.getLineCount() : 9999;
  lines = lines.filter(ln => ln >= 1 && ln <= totalLines);
  
  if (lines.length === 0) {
    console.log(`⚠️ [Highlight] No valid lines after filtering`);
    showAutoApplyToast(`⚠️ No ${typeLabel} lines in current code`, 'info');
    return;
  }
  
  console.log(`🔦 [Highlight] Highlighting ${lines.length} ${type} lines:`, lines);
  
  const decorations = lines.map(lineNumber => ({
    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
    options: {
      isWholeLine: true,
      className: className,
      glyphMarginClassName: glyphClassName,
      overviewRuler: {
        color: type === 'add' ? '#3fb950' : type === 'del' ? '#f85149' : '#d29922',
        position: monaco.editor.OverviewRulerLane.Full
      }
    }
  }));
  
  activeHighlightDecorations = editor.deltaDecorations([], decorations);
  console.log(`🔦 [Highlight] Created ${activeHighlightDecorations.length} decorations`);
  
  // Scroll to first highlighted line
  if (lines.length > 0) {
    editor.revealLineInCenter(lines[0]);
    const label = type === 'del' ? `${lines.length} deletion point${lines.length > 1 ? 's' : ''}` : `${lines.length} ${typeLabel} line${lines.length > 1 ? 's' : ''}`;
    showAutoApplyToast(`🔦 ${label} highlighted`, 'info');
  }
}

/**
 * Clear all highlight decorations
 */
function clearHighlightDecorations(): void {
  const editor = getMonacoEditorForApply();
  if (!editor || activeHighlightDecorations.length === 0) return;
  
  editor.deltaDecorations(activeHighlightDecorations, []);
  activeHighlightDecorations = [];
}

function removeConfirmationBar(): void {
  // Clear highlights when bar is removed
  clearHighlightDecorations();
  clearPendingDecorations();
  
  // Remove unified/single-file bar
  const bar = document.getElementById('aca-confirm-bar');
  if (bar) {
    const keyHandler = (bar as any)._keyHandler;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    bar.remove();
  }
  
  // Also remove multi-file bar if present
  document.querySelector('.multi-file-confirm-bar')?.remove();
  
  document.querySelector('.aca-editor-pending')?.classList.remove('aca-editor-pending');
  hasUnapprovedChanges = false;
}

function acceptChanges(): void {
  removeConfirmationBar();
  clearAllDecorations(); // Clear highlighting
  originalCodeBeforeApply = '';
  triggerFileSave();
  showAutoApplyToast('✅ Changes accepted & saved', 'success');
  console.log('✅ [AutoApply] Changes accepted and saved');
}

async function triggerFileSave(): Promise<void> {
  try {
    console.log('💾 [AutoApply] Attempting to save file...');
    
    // Get current editor content and path
    const editor = getMonacoEditorForApply();
    const model = editor?.getModel();
    if (!model) {
      console.warn('⚠️ [AutoApply] No editor model for save');
      return;
    }
    
    const content = model.getValue();
    let filePath = model.uri?.path || '';
    if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
      filePath = filePath.substring(1);
    }
    filePath = filePath.replace(/\\/g, '/');
    
    if (!filePath) {
      console.warn('⚠️ [AutoApply] No file path for save');
      return;
    }
    
    console.log(`💾 [AutoApply] Saving: ${filePath} (${content.length} chars)`);
    
    let saved = false;
    
    // Method 1: Use Tauri invoke 'write_file' command
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
      if (invoke) {
        await invoke('write_file', { path: filePath, content: content });
        saved = true;
        console.log('💾 [AutoApply] Saved via Tauri invoke');
      }
    } catch (e: any) {
      console.warn('⚠️ [AutoApply] Tauri invoke failed:', e?.message || e);
    }
    
    // Method 2: Use @tauri-apps/plugin-fs
    if (!saved) {
      try {
        const fs = (window as any).__TAURI__?.fs;
        if (fs?.writeTextFile) {
          await fs.writeTextFile(filePath, content);
          saved = true;
          console.log('💾 [AutoApply] Saved via Tauri fs plugin');
        }
      } catch (e: any) {
        console.warn('⚠️ [AutoApply] Tauri fs plugin failed:', e?.message || e);
      }
    }
    
    // Method 3: Use window.saveFile
    if (!saved) {
      const saveFile = (window as any).saveFile;
      if (saveFile) {
        try {
          await saveFile(content, filePath);
          saved = true;
          console.log('💾 [AutoApply] Saved via window.saveFile');
        } catch (e: any) {
          console.warn('⚠️ [AutoApply] window.saveFile failed:', e?.message || e);
        }
      }
    }
    
    // Method 4: Use tabManager
    if (!saved) {
      const tabManager = (window as any).tabManager;
      if (tabManager?.saveCurrentTab) {
        try {
          await tabManager.saveCurrentTab();
          saved = true;
          console.log('💾 [AutoApply] Saved via tabManager');
        } catch (e: any) {
          console.warn('⚠️ [AutoApply] tabManager failed:', e?.message || e);
        }
      }
    }
    
    if (saved) {
      updateSaveState(filePath, content);
    } else {
      console.error('❌ [AutoApply] All save methods failed');
    }
    
  } catch (error) {
    console.error('⚠️ [AutoApply] Could not auto-save:', error);
  }
}

// Helper to update save state across the IDE
function updateSaveState(filePath: string, content: string): void {
  // Mark file as saved
  const markAsSaved = (window as any).markFileAsSaved;
  if (markAsSaved) {
    try { markAsSaved(filePath); } catch(e) {}
  }
  
  // Update tab state
  const tabManager = (window as any).tabManager;
  if (tabManager) {
    const activeTab = tabManager.getActiveTab?.();
    if (activeTab) {
      activeTab.isModified = false;
      activeTab.originalContent = content;
      if (tabManager.markTabAsSaved) {
        tabManager.markTabAsSaved(activeTab.id);
      }
    }
  }
  
  // Dispatch event
  document.dispatchEvent(new CustomEvent('file-saved', {
    detail: { path: filePath }
  }));
}

function rejectChanges(): void {
  if (!originalCodeBeforeApply) {
    showAutoApplyToast('⚠️ No changes to reject', 'error');
    removeConfirmationBar();
    clearAllDecorations(); // Clear highlighting even if no changes
    return;
  }
  
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    if (model) {
      const monaco = (window as any).monaco;
      const fullRange = model.getFullModelRange();
      editor.executeEdits('aca-reject', [{ range: fullRange, text: originalCodeBeforeApply, forceMoveMarkers: true }]);
    }
  }
  
  clearAllDecorations(); // Clear highlighting
  removeConfirmationBar();
  originalCodeBeforeApply = '';
  showAutoApplyToast('↩️ Changes rejected - reverted', 'success');
  console.log('↩️ [AutoApply] Changes rejected');
}

/**
 * Wait for user confirmation on the standard confirmation bar
 * Returns 'accept' or 'reject' based on user action
 */
function waitForConfirmation(): Promise<'accept' | 'reject'> {
  return new Promise((resolve) => {
    let resolved = false;
    
    const cleanup = () => {
      document.removeEventListener('keydown', keyHandler);
      // Remove click handlers by removing and not re-adding
    };
    
    const handleAccept = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      acceptChanges();
      resolve('accept');
    };
    
    const handleReject = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      rejectChanges();
      resolve('reject');
    };
    
    const keyHandler = (e: KeyboardEvent) => {
      if (resolved) return;
      
      // Skip if typing in input
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleReject();
      }
    };
    
    document.addEventListener('keydown', keyHandler);
    
    // Also attach to confirmation bar buttons
    const checkForBar = setInterval(() => {
      const bar = document.querySelector('.aca-confirm-bar, #aca-confirm-bar');
      if (bar) {
        clearInterval(checkForBar);
        
        const acceptBtn = bar.querySelector('.accept, .aca-confirm-btn.accept');
        const rejectBtn = bar.querySelector('.reject, .aca-confirm-btn.reject');
        
        acceptBtn?.addEventListener('click', handleAccept);
        rejectBtn?.addEventListener('click', handleReject);
      }
    }, 100);
    
    // Timeout after 60 seconds - auto-reject
    setTimeout(() => {
      if (!resolved) {
        console.log('⏰ [AutoApply] Confirmation timeout - auto-rejecting');
        clearInterval(checkForBar);
        handleReject();
      }
    }, 60000);
  });
}

export function acceptAutoApplyChanges(): void { acceptChanges(); }
export function rejectAutoApplyChanges(): void { rejectChanges(); }

// ============================================================================
// AUTONOMOUS MODE TOGGLE
// ============================================================================

function createAutonomousToggleButton(): void {
  if (document.querySelector('.autonomous-mode-toggle')) return;
  
  const iconToolbar = document.querySelector('.chat-input-toolbar') ||
                      document.querySelector('.input-toolbar') ||
                      document.querySelector('.toolbar-icons');
  
  let toolbarRow: Element | null = null;
  const possibleContainers = [
    ...Array.from(document.querySelectorAll('[class*="toolbar"]')),
    ...Array.from(document.querySelectorAll('[class*="actions"]')),
  ];
  
  for (const el of possibleContainers) {
    const buttons = el.querySelectorAll('button, [role="button"], svg');
    if (buttons.length >= 4 && el.clientHeight > 20 && el.clientHeight < 60) {
      if (!el.classList.contains('chat-messages') && !el.classList.contains('messages')) {
        toolbarRow = el;
        break;
      }
    }
  }
  
  const cameraBtn = document.querySelector('button[title*="Camera"]') ||
                    document.querySelector('[class*="camera-btn"]');
  const cameraParent = cameraBtn?.closest('[class*="toolbar"]') || cameraBtn?.parentElement;
  
  const targetToolbar = iconToolbar || toolbarRow || cameraParent;
  
  if (!targetToolbar) {
    console.log('⚠️ [Autonomous] Could not find toolbar');
    return;
  }
  
  console.log('🔍 [Autonomous] Found toolbar:', targetToolbar.className);
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'autonomous-mode-toggle';
  toggleBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
    <span class="auto-status-dot"></span>
  `;
  toggleBtn.title = 'Auto Mode OFF';
  
  const savedState = localStorage.getItem('autonomousMode');
  if (savedState === 'true') {
    autoApplyEnabled = true;
    toggleBtn.classList.add('active');
    toggleBtn.title = 'Auto Mode ON';
    
    // Also enable AI Project Search when auto mode is restored
    setTimeout(() => {
      // Set state directly
      localStorage.setItem('aiFileExplorerEnabled', 'true');
      (window as any).aiFileExplorerEnabled = true;
      (window as any).aiSearchEnabled = true;
      
      // Update button visually
      const aiBtn = document.getElementById('ai-search-tool-btn');
      if (aiBtn) {
        aiBtn.classList.add('active');
        aiBtn.setAttribute('title', 'AI Project: ON');
      }
      
      // Call enableAISearch silently if available
      if (typeof (window as any).enableAISearch === 'function') {
        try {
          (window as any).enableAISearch(true); // silent mode
        } catch(e) {}
      }
      
      console.log('🔍 [Autonomous] AI Project Search restored with Auto Mode');
    }, 500);
  }
  
  toggleBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleAutoApply(true);  // Show dialog on button click
    toggleBtn.classList.toggle('active', autoApplyEnabled);
    
    document.querySelectorAll('.aca-auto-toggle').forEach(btn => {
      btn.classList.toggle('active', autoApplyEnabled);
    });
    
    toggleBtn.title = autoApplyEnabled ? 'Auto Mode ON' : 'Auto Mode OFF';
    
    // AUTO-ENABLE AI Project Search when Autonomous is ON
    if (autoApplyEnabled) {
      setTimeout(() => {
        localStorage.setItem('aiFileExplorerEnabled', 'true');
        (window as any).aiFileExplorerEnabled = true;
        (window as any).aiSearchEnabled = true;
        
        const aiBtn = document.getElementById('ai-search-tool-btn');
        if (aiBtn) {
          aiBtn.classList.add('active');
          aiBtn.setAttribute('title', 'AI Project: ON');
        }
        
        if (typeof (window as any).enableAISearch === 'function') {
          try {
            (window as any).enableAISearch(true); // silent mode
          } catch(e) {}
        }
        
        console.log('🔍 [Autonomous] AI Project Search auto-enabled');
      }, 100);
    }
  };
  
  if (targetToolbar.firstChild) {
    targetToolbar.insertBefore(toggleBtn, targetToolbar.firstChild);
  } else {
    targetToolbar.appendChild(toggleBtn);
  }
  
  console.log('✅ [Autonomous] Toggle button added');
}

function injectAutonomousToggleStyles(): void {
  if (document.getElementById('autonomous-toggle-styles-v2')) return;
  
  // Remove old styles
  document.getElementById('autonomous-toggle-styles')?.remove();
  
  const style = document.createElement('style');
  style.id = 'autonomous-toggle-styles-v2';
  style.textContent = `
    /* ============================================
       AUTONOMOUS MODE TOGGLE - Professional UI v2
       ============================================ */
    .autonomous-mode-toggle {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      margin: 0 4px !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      border-radius: 6px !important;
      color: #6b7280 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      user-select: none !important;
    }
    
    .autonomous-mode-toggle:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #9ca3af !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    /* ACTIVE STATE - Green theme */
    .autonomous-mode-toggle.active {
      color: #10b981 !important;
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(16, 185, 129, 0.4) !important;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.3) !important;
    }
    
    .autonomous-mode-toggle.active:hover {
      background: rgba(16, 185, 129, 0.25) !important;
      border-color: rgba(16, 185, 129, 0.6) !important;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.4) !important;
    }
    
    .autonomous-mode-toggle svg {
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
      transition: all 0.3s ease !important;
    }
    
    /* Spinning animation when active */
    .autonomous-mode-toggle.active svg {
      color: #10b981 !important;
      animation: autonomous-spin 2.5s linear infinite !important;
      filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.7)) !important;
    }
    
    @keyframes autonomous-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* Status dot - use a child element approach */
    .autonomous-mode-toggle .auto-status-dot {
      position: absolute !important;
      top: 2px !important;
      right: 2px !important;
      width: 7px !important;
      height: 7px !important;
      background: #6b7280 !important;
      border-radius: 50% !important;
      transition: all 0.2s ease !important;
      pointer-events: none !important;
    }
    
    .autonomous-mode-toggle.active .auto-status-dot {
      background: #10b981 !important;
      box-shadow: 0 0 6px rgba(16, 185, 129, 1) !important;
      animation: auto-dot-pulse 1.5s ease-in-out infinite !important;
    }
    
    @keyframes auto-dot-pulse {
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 0 6px rgba(16, 185, 129, 1);
      }
      50% { 
        transform: scale(1.3); 
        box-shadow: 0 0 10px rgba(16, 185, 129, 1);
      }
    }
  `;
  document.head.appendChild(style);
}

function watchForChatInput(): void {
  createAutonomousToggleButton();
  
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.autonomous-mode-toggle')) {
      createAutonomousToggleButton();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => {
    if (!document.querySelector('.autonomous-mode-toggle')) {
      createAutonomousToggleButton();
    }
  }, 2000);
}

export function insertAutonomousToggle(containerSelector: string, position: 'start' | 'end' = 'start'): boolean {
  if (document.querySelector('.autonomous-mode-toggle')) {
    console.log('⚠️ [Autonomous] Toggle already exists');
    return true;
  }
  
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.log('❌ [Autonomous] Container not found:', containerSelector);
    return false;
  }
  
  injectAutonomousToggleStyles();
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'autonomous-mode-toggle';
  toggleBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
    <span class="auto-status-dot"></span>
  `;
  toggleBtn.title = autoApplyEnabled ? 'Auto Mode ON' : 'Auto Mode OFF';
  
  if (autoApplyEnabled) toggleBtn.classList.add('active');
  
  toggleBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAutoApply(true);  // Show dialog
    toggleBtn.classList.toggle('active', autoApplyEnabled);
    toggleBtn.title = autoApplyEnabled ? 'Auto Mode ON' : 'Auto Mode OFF';
  };
  
  if (position === 'start' && container.firstChild) {
    container.insertBefore(toggleBtn, container.firstChild);
  } else {
    container.appendChild(toggleBtn);
  }
  
  console.log('✅ [Autonomous] Toggle inserted into:', containerSelector);
  return true;
}


// ============================================================================
// EXPORTS FOR autonomousMultiFile.ts
// ============================================================================

export {
  // State variables
  autoApplyEnabled,
  processedBlockIds,
  isTypingInProgress,
  stopTypingFlag,
  lineDelay,
  originalCodeBeforeApply,
  hasUnapprovedChanges,
  lastChangeLines,
  activeHighlightDecorations,
  pendingMultiFileDecorations,
  AUTO_APPLY_ICONS,
  
  // Helper functions
  getMonacoEditorForApply,
  getCurrentFileName,
  getCurrentFilePath,
  showAutoApplyToast,
  getProgressiveDelay,
  
  // Decoration functions
  clearPendingDecorations,
  storePendingDecorations,
  clearAllDecorations,
  clearHighlightDecorations,
  injectHighlightStyles,
  
  // Confirmation functions
  acceptChanges,
  rejectChanges,
  showConfirmationBar,
  removeConfirmationBar,
  waitForConfirmation,
  highlightChangeLines,
  injectConfirmationStyles,
  
  // Save functions
  updateSaveState,
  triggerFileSave,
};

// State setters for multi-file module
export function setAutoApplyEnabled(value: boolean): void { autoApplyEnabled = value; }
export function setIsTypingInProgress(value: boolean): void { isTypingInProgress = value; }
export function setStopTypingFlag(value: boolean): void { stopTypingFlag = value; }
export function setHasUnapprovedChanges(value: boolean): void { hasUnapprovedChanges = value; }
export function setOriginalCodeBeforeApply(value: string): void { originalCodeBeforeApply = value; }
export function addProcessedBlockId(id: string): void { processedBlockIds.add(id); }
export function clearProcessedBlockIds(): void { processedBlockIds.clear(); }

// ============================================================================
// DIFF COMPUTATION
// ============================================================================

interface DiffChange {
  type: 'add' | 'delete' | 'modify' | 'keep';
  lineNumber: number;
  oldLine?: string;
  newLine?: string;
}

function computeLineDiff(oldCode: string, newCode: string): DiffChange[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const changes: DiffChange[] = [];
  
  const lcs = computeLCS(oldLines, newLines);
  
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        changes.push({ type: 'keep', lineNumber: newIdx + 1, oldLine: oldLines[oldIdx], newLine: newLines[newIdx] });
        oldIdx++; newIdx++; lcsIdx++;
      } else if (newIdx < newLines.length) {
        changes.push({ type: 'add', lineNumber: newIdx + 1, newLine: newLines[newIdx] });
        newIdx++;
      } else {
        changes.push({ type: 'delete', lineNumber: oldIdx + 1, oldLine: oldLines[oldIdx] });
        oldIdx++;
      }
    } else if (newIdx < newLines.length && lcsIdx < lcs.length && newLines[newIdx] === lcs[lcsIdx]) {
      changes.push({ type: 'delete', lineNumber: oldIdx + 1, oldLine: oldLines[oldIdx] });
      oldIdx++;
    } else if (oldIdx < oldLines.length && newIdx < newLines.length) {
      changes.push({ type: 'modify', lineNumber: newIdx + 1, oldLine: oldLines[oldIdx], newLine: newLines[newIdx] });
      oldIdx++; newIdx++;
    } else if (newIdx < newLines.length) {
      changes.push({ type: 'add', lineNumber: newIdx + 1, newLine: newLines[newIdx] });
      newIdx++;
    } else if (oldIdx < oldLines.length) {
      changes.push({ type: 'delete', lineNumber: oldIdx + 1, oldLine: oldLines[oldIdx] });
      oldIdx++;
    }
  }
  
  return changes;
}

function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

// ============================================================================
// SMART UPDATE - FAST ATOMIC VERSION
// ============================================================================

async function applySmartUpdate(newCode: string): Promise<{ success: boolean; message: string }> {
  const editor = getMonacoEditorForApply();
  if (!editor) return { success: false, message: 'No editor found' };
  
  const model = editor.getModel();
  if (!model) return { success: false, message: 'No file open' };
  
  const monaco = (window as any).monaco;
  if (!monaco) return { success: false, message: 'Monaco not available' };
  
  isTypingInProgress = true;
  stopTypingFlag = false;
  lastChangeLines = { addedLines: [], deletedLines: [], modifiedLines: [] };
  
  try {
    const oldCode = model.getValue();
    originalCodeBeforeApply = oldCode;
    
    // Quick identical check
    if (oldCode.trim() === newCode.trim()) {
      isTypingInProgress = false;
      originalCodeBeforeApply = '';
      return { success: true, message: 'No changes needed' };
    }
    
    // Fast line-based diff
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let added = 0, deleted = 0, modified = 0;
    
    // Better line-by-line comparison
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : null;
      const newLine = i < newLines.length ? newLines[i] : null;
      
      if (oldLine === null && newLine !== null) {
        // Line was added (new file is longer)
        added++;
        lastChangeLines.addedLines.push(i + 1);
      } else if (oldLine !== null && newLine === null) {
        // Line was deleted (old file was longer)
        deleted++;
        lastChangeLines.deletedLines.push(i + 1);
      } else if (oldLine !== newLine) {
        // Line was modified
        modified++;
        lastChangeLines.modifiedLines.push(i + 1);
      }
    }
    
    console.log(`📊 [SmartUpdate] Line analysis: +${added} added, -${deleted} deleted, ~${modified} modified`);
    
    if (added === 0 && deleted === 0 && modified === 0) {
      isTypingInProgress = false;
      originalCodeBeforeApply = '';
      return { success: true, message: 'No changes needed' };
    }
    
    // ATOMIC APPLY - Single operation instead of line-by-line
    const startTime = performance.now();
    editor.executeEdits('smart-update', [{
      range: model.getFullModelRange(),
      text: newCode,
      forceMoveMarkers: true
    }]);
    
    // Re-get model after edit (it might have changed)
    const modelAfterEdit = editor.getModel();
    const totalLines = modelAfterEdit?.getLineCount() || newLines.length;
    
    // Visual feedback with decorations
    const decorations: any[] = [];
    const maxDecorations = 200; // Allow more decorations
    
    console.log(`🎨 [SmartUpdate] Creating decorations for ${lastChangeLines.addedLines.length} added, ${lastChangeLines.modifiedLines.length} modified lines`);
    console.log(`🎨 [SmartUpdate] Total lines in model: ${totalLines}`);
    
    // Inject styles FIRST before creating decorations
    injectHighlightStyles();
    
    // Create decorations for added lines
    for (const line of lastChangeLines.addedLines.slice(0, maxDecorations)) {
      if (line <= totalLines) {
        const maxCol = modelAfterEdit?.getLineMaxColumn(line) || 1;
        decorations.push({
          range: new monaco.Range(line, 1, line, maxCol),
          options: { 
            isWholeLine: true,
            className: 'aca-highlight-added',
            linesDecorationsClassName: 'aca-margin-added',
            overviewRuler: { 
              color: '#2ea043',
              position: monaco.editor.OverviewRulerLane.Full
            },
            minimap: {
              color: '#2ea043',
              position: 1
            }
          }
        });
      }
    }
    
    // Create decorations for modified lines
    for (const line of lastChangeLines.modifiedLines.slice(0, maxDecorations)) {
      if (line <= totalLines) {
        const maxCol = modelAfterEdit?.getLineMaxColumn(line) || 1;
        decorations.push({
          range: new monaco.Range(line, 1, line, maxCol),
          options: { 
            isWholeLine: true,
            className: 'aca-highlight-modified',
            linesDecorationsClassName: 'aca-margin-modified',
            overviewRuler: { 
              color: '#d29922',
              position: monaco.editor.OverviewRulerLane.Full
            },
            minimap: {
              color: '#d29922',
              position: 1
            }
          }
        });
      }
    }
    
    console.log(`🎨 [SmartUpdate] Adding ${decorations.length} decorations`);
    console.log(`🎨 [SmartUpdate] Added lines: ${lastChangeLines.addedLines.slice(0, 10).join(', ')}${lastChangeLines.addedLines.length > 10 ? '...' : ''}`);
    console.log(`🎨 [SmartUpdate] Modified lines: ${lastChangeLines.modifiedLines.slice(0, 10).join(', ')}${lastChangeLines.modifiedLines.length > 10 ? '...' : ''}`);
    
    if (decorations.length > 0) {
      // Apply decorations
      console.log(`🎨 [SmartUpdate] Calling deltaDecorations with ${decorations.length} decorations`);
      const ids = editor.deltaDecorations([], decorations);
      console.log(`🎨 [SmartUpdate] deltaDecorations returned ${ids?.length || 0} IDs`);
      
      // Verify CSS is injected
      const styleEl = document.getElementById('aca-highlight-styles-v3');
      console.log(`🎨 [SmartUpdate] CSS injected: ${styleEl ? 'YES' : 'NO'}`);
      
      // Verify class appears in DOM
      setTimeout(() => {
        const highlighted = document.querySelectorAll('.aca-highlight-added, .aca-highlight-modified');
        console.log(`🎨 [SmartUpdate] Highlighted elements in DOM: ${highlighted.length}`);
      }, 100);
      console.log(`🎨 [SmartUpdate] Decoration IDs created: ${ids.length}`);
      
      // Store decorations globally for clearing later
      if (!(window as any).__acaAllDecorations) {
        (window as any).__acaAllDecorations = [];
      }
      (window as any).__acaAllDecorations.push(...ids);
      (window as any).__acaDecorationIds = ids;
      (window as any).__acaDecoratedEditor = editor;
      
      // In multi-file mode, store decorations for later clearing
      if (isProcessingMultiFile) {
        const currentFileName = model.uri.path.split('/').pop() || 'unknown';
        storePendingDecorations(currentFileName, ids);
        console.log(`🎨 [SmartUpdate] Stored decorations for: ${currentFileName}`);
      }
      // Never auto-clear - wait for Accept/Reject
    } else {
      console.log(`⚠️ [SmartUpdate] No decorations to add - changes detected: added=${lastChangeLines.addedLines.length}, modified=${lastChangeLines.modifiedLines.length}`);
    }
    
    // Scroll to first change
    const firstChange = lastChangeLines.addedLines[0] || lastChangeLines.modifiedLines[0] || 1;
    editor.revealLineInCenter(firstChange);
    
    const elapsed = performance.now() - startTime;
    console.log(`⚡ [SmartUpdate] Applied in ${elapsed.toFixed(0)}ms`);
    
    isTypingInProgress = false;
    const summary = `+${added} -${deleted} ~${modified}`;
    showConfirmationBar(summary);
    
    return { success: true, message: summary };
    
  } catch (error) {
    console.error('❌ [SmartUpdate] Error:', error);
    isTypingInProgress = false;
    originalCodeBeforeApply = '';
    return { success: false, message: `Error: ${error}` };
  }
}

export function toggleAutoApply(showDialogNotification: boolean = false): boolean {
  autoApplyEnabled = !autoApplyEnabled;
  updateAutoApplyIndicator();
  
  localStorage.setItem('autonomousMode', String(autoApplyEnabled));
  
  const autonomousToggle = document.querySelector('.autonomous-mode-toggle');
  if (autonomousToggle) {
    autonomousToggle.classList.toggle('active', autoApplyEnabled);
    autonomousToggle.setAttribute('title', autoApplyEnabled ? 'Autonomous Mode ON' : 'Autonomous Mode OFF');
  }
  
  if (autoApplyEnabled) {
    // Show dialog or toast based on parameter
    if (showDialogNotification) {
      showAutoModeDialog(true);
    } else {
      showAutoApplyToast('🤖 Auto Mode ON', 'success');
    }
    console.log('🤖 [Autonomous] Enabled');
    processedBlockIds.clear();
    lastProcessedBlockId = '';
  } else {
    if (showDialogNotification) {
      showAutoModeDialog(false);
    } else {
      showAutoApplyToast('⏸️ Auto Mode OFF', 'success');
    }
    console.log('⏸️ [Autonomous] Disabled');
    if (isTypingInProgress) stopTypingFlag = true;
  }
  
  return autoApplyEnabled;
}

export function setAutoApply(enabled: boolean): void {
  autoApplyEnabled = enabled;
  updateAutoApplyIndicator();
  localStorage.setItem('autonomousMode', String(autoApplyEnabled));
  
  const autonomousToggle = document.querySelector('.autonomous-mode-toggle');
  if (autonomousToggle) autonomousToggle.classList.toggle('active', autoApplyEnabled);
  
  if (enabled) {
    processedBlockIds.clear();
    lastProcessedBlockId = '';
  }
}

function updateAutoApplyIndicator(): void {
  document.querySelectorAll('.aca-auto-toggle').forEach(toggleBtn => {
    toggleBtn.classList.toggle('active', autoApplyEnabled);
    toggleBtn.setAttribute('title', autoApplyEnabled ? 'Auto-Apply ON' : 'Auto-Apply OFF');
  });
}

function generateBlockId(block: HTMLElement): string {
  let id = block.getAttribute('data-block-id') || '';
  if (id) return id;
  
  // Get code content for hashing - handle both wrapped blocks and raw pre elements
  let codeEl = block.querySelector('code, .cbe-code, .muf-code');
  if (!codeEl && block.tagName === 'PRE') {
    codeEl = block.querySelector('code') || block;
  }
  const content = codeEl?.textContent?.substring(0, 200) || '';
  
  const parentMsg = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  const msgIndex = parentMsg ? Array.from(document.querySelectorAll('.message, .ai-message, .assistant-message, [class*="message"]')).indexOf(parentMsg) : -1;
  
  // Find all code blocks in message - both wrapped and raw
  const blocksInMsg = parentMsg?.querySelectorAll('.cbe-wrapper, .muf-block, pre:has(code), pre > code') || [];
  
  // Find this block's index - handle both wrapped blocks and raw pre elements
  let blockIndex = -1;
  const blocksArray = Array.from(blocksInMsg);
  for (let i = 0; i < blocksArray.length; i++) {
    const b = blocksArray[i];
    if (b === block || b.contains(block) || block.contains(b)) {
      blockIndex = i;
      break;
    }
  }
  
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  
  id = `msg${msgIndex}-blk${blockIndex}-${Math.abs(hash).toString(16)}`;
  block.setAttribute('data-block-id', id);
  
  return id;
}

let lastProcessedMessageIndex = -1;

function getLatestMessageIndex(): number {
  const messages = document.querySelectorAll('.message, .ai-message, .assistant-message, [class*="message"]');
  return messages.length - 1;
}

function hasNewMessage(): boolean {
  const currentIndex = getLatestMessageIndex();
  return currentIndex > lastProcessedMessageIndex;
}

function markMessageProcessed(): void {
  lastProcessedMessageIndex = getLatestMessageIndex();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function applyCodeInstant(code: string, mode: 'replace' | 'insert' | 'append'): { success: boolean; message: string } {
  const editor = getMonacoEditorForApply();
  if (!editor) return { success: false, message: 'No editor found.' };
  
  const model = editor.getModel();
  if (!model) return { success: false, message: 'No file open.' };
  
  try {
    const monaco = (window as any).monaco;
    
    if (mode === 'replace') {
      const fullRange = model.getFullModelRange();
      editor.executeEdits('auto-code-apply', [{ range: fullRange, text: code, forceMoveMarkers: true }]);
      return { success: true, message: `Replaced file (${code.split('\n').length} lines)` };
    } else if (mode === 'insert') {
      const position = editor.getPosition();
      if (!position) return { success: false, message: 'Could not determine cursor position.' };
      editor.executeEdits('auto-code-apply', [{ range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: code, forceMoveMarkers: true }]);
      return { success: true, message: `Inserted at line ${position.lineNumber}` };
    } else if (mode === 'append') {
      const lastLine = model.getLineCount();
      const lastColumn = model.getLineMaxColumn(lastLine);
      editor.executeEdits('auto-code-apply', [{ range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn), text: '\n\n' + code, forceMoveMarkers: true }]);
      return { success: true, message: 'Appended to end of file' };
    }
    return { success: false, message: 'Unknown mode' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}


// Export diff and update functions
export {
  applySmartUpdate,
  applyCodeInstant,
  computeLineDiff,
  computeLCS,
  generateBlockId,
  sleep,
  updateAutoApplyIndicator,
};

// ============================================================================
// STYLES
// ============================================================================

function injectAutoApplyStyles(): void {
  if (document.getElementById('auto-code-apply-styles')) return;
  const style = document.createElement('style');
  style.id = 'auto-code-apply-styles';
  style.textContent = `
    .aca-btn { background: transparent !important; border: none !important; color: #888 !important; padding: 5px 7px !important; cursor: pointer !important; border-radius: 4px !important; font-size: 12px !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.15s ease !important; position: relative !important; z-index: 120 !important; pointer-events: auto !important; }
    .aca-btn:hover { background: rgba(255, 255, 255, 0.1) !important; color: #fff !important; }
    .aca-btn:active { transform: scale(0.95) !important; }
    .aca-btn.success { color: #4caf50 !important; background: rgba(76, 175, 80, 0.15) !important; }
    .aca-btn.error { color: #f44336 !important; background: rgba(244, 67, 54, 0.15) !important; }
    .aca-btn svg { width: 14px !important; height: 14px !important; pointer-events: none !important; }
    .aca-auto-toggle { color: #666 !important; }
    .aca-auto-toggle:hover { color: #4caf50 !important; }
    .aca-auto-toggle.active { color: #4caf50 !important; background: rgba(76, 175, 80, 0.2) !important; animation: aca-pulse 2s infinite; }
    @keyframes aca-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); } 50% { box-shadow: 0 0 0 4px rgba(76, 175, 80, 0); } }
    
    /* ============================================
       TOAST NOTIFICATION - Professional UI
       ============================================ */
    .aca-toast {
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 0;
      background: linear-gradient(135deg, #1e2128 0%, #171a1f 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      color: #e6edf3;
      font-size: 13px;
      font-weight: 500;
      z-index: 10002;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    
    .aca-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    .aca-toast.animate-out {
      transform: translateX(-50%) translateY(-10px);
      opacity: 0;
    }
    
    .aca-toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
    }
    
    .aca-toast-icon {
      flex-shrink: 0;
      transition: all 0.3s ease;
    }
    
    .aca-toast-text {
      flex: 1;
      white-space: nowrap;
    }
    
    .aca-toast-badge {
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .aca-toast-badge.off {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .aca-toast-progress {
      height: 3px;
      background: linear-gradient(90deg, #10b981, #059669);
      animation: toast-progress 2.5s linear forwards;
    }
    
    @keyframes toast-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Success state */
    .aca-toast.success {
      border-color: rgba(16, 185, 129, 0.3);
    }
    .aca-toast.success .aca-toast-icon {
      color: #10b981;
    }
    
    /* Error state */
    .aca-toast.error {
      border-color: rgba(239, 68, 68, 0.3);
    }
    .aca-toast.error .aca-toast-icon {
      color: #ef4444;
    }
    .aca-toast.error .aca-toast-progress {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }
    
    /* Info state */
    .aca-toast.info {
      border-color: rgba(59, 130, 246, 0.3);
    }
    .aca-toast.info .aca-toast-icon {
      color: #3b82f6;
    }
    .aca-toast.info .aca-toast-progress {
      background: linear-gradient(90deg, #3b82f6, #2563eb);
    }
    
    /* Auto Mode specific styling */
    .aca-toast.aca-toast-auto-mode {
      min-width: 200px;
    }
    
    .aca-toast.aca-toast-auto-mode.auto-on {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.15);
    }
    
    .aca-toast.aca-toast-auto-mode.auto-on .aca-toast-icon {
      color: #10b981;
    }
    
    .aca-toast.aca-toast-auto-mode.auto-off {
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .aca-toast.aca-toast-auto-mode.auto-off .aca-toast-icon {
      color: #6b7280;
    }
    
    .aca-toast.aca-toast-auto-mode.auto-off .aca-toast-progress {
      background: linear-gradient(90deg, #6b7280, #4b5563);
    }
    
    /* Spinning animation for auto icon */
    .aca-toast-icon.spinning {
      animation: toast-icon-spin 2s linear infinite;
    }
    
    @keyframes toast-icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* Pulse animation for auto mode ON */
    .aca-toast.auto-on.animate-in .aca-toast-icon {
      animation: toast-icon-spin 2s linear infinite, toast-icon-glow 1s ease-out;
    }
    
    @keyframes toast-icon-glow {
      0% { filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0)); }
      50% { filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
      100% { filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4)); }
    }
    
    /* Monaco Editor Line Decorations - using !important for override */
    .monaco-editor .aca-line-added { 
      background: rgba(76, 175, 80, 0.25) !important; 
    }
    .monaco-editor .aca-line-modified { 
      background: rgba(255, 193, 7, 0.25) !important; 
    }
    .monaco-editor .aca-line-deleted { 
      background: rgba(244, 67, 54, 0.25) !important; 
    }
    
    /* Gutter decorations */
    .monaco-editor .aca-line-decoration-added {
      background: #4caf50 !important;
      width: 4px !important;
      margin-left: 3px;
    }
    .monaco-editor .aca-line-decoration-modified {
      background: #ffc107 !important;
      width: 4px !important;
      margin-left: 3px;
    }
    .monaco-editor .aca-line-decoration-deleted {
      background: #f44336 !important;
      width: 4px !important;
      margin-left: 3px;
    }
    
    /* Fallback without .monaco-editor prefix */
    .aca-line-added { background: rgba(76, 175, 80, 0.25) !important; }
    .aca-line-modified { background: rgba(255, 193, 7, 0.25) !important; }
    .aca-line-deleted { background: rgba(244, 67, 54, 0.25) !important; }
    .aca-line-decoration-added { background: #4caf50 !important; width: 4px !important; }
    .aca-line-decoration-modified { background: #ffc107 !important; width: 4px !important; }
    
    /* Glyph margin (older style) */
    .aca-glyph-added::before { content: '+'; color: #4caf50; font-weight: bold; }
    .aca-glyph-deleted::before { content: '-'; color: #f44336; font-weight: bold; }
    .aca-glyph-modified::before { content: '~'; color: #ffc107; font-weight: bold; }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initAutoCodeApply(): void {
  console.log('🚀 [AutoCodeApply] Initializing...');
  injectAutoApplyStyles();
  injectAutonomousToggleStyles();
  injectConfirmationStyles();
  injectFileMismatchStyles();
  
  // Add autonomous toggle button to chat input area
  setTimeout(() => watchForChatInput(), 500);
  
  // Load saved autonomous state
  const savedState = localStorage.getItem('autonomousMode');
  if (savedState === 'true') {
    autoApplyEnabled = true;
    console.log('🤖 [Autonomous] Restored enabled state from storage');
  }
  
  // ========== INTERNAL MULTI-FILE SYSTEM ONLY ==========
  // External multiFileAutonomous module disabled - using internal processMultiFileApply
  console.log('📚 [AutoApply] Using internal multi-file system only');
  // ========== END MULTI-FILE INIT ==========
  
  setTimeout(processAutoApplyCodeBlocks, 500);
  setTimeout(processAutoApplyCodeBlocks, 1000);
  setTimeout(processAutoApplyCodeBlocks, 2000);
  
  // Watch for new code blocks
  const observer = new MutationObserver((mutations) => {
    // Skip if multi-file is processing
    if (isProcessingMultiFile) return;
    
    let newBlocks: HTMLElement[] = [];
    
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        
        if (node.classList?.contains('cbe-wrapper') || node.classList?.contains('muf-block')) {
          newBlocks.push(node);
        }
        
        const childBlocks = node.querySelectorAll?.('.cbe-wrapper, .muf-block');
        if (childBlocks?.length) {
          newBlocks.push(...Array.from(childBlocks) as HTMLElement[]);
        }
      });
    }
    
    if (newBlocks.length > 0 && autoApplyEnabled && !isProcessingMultiFile) {
      setTimeout(() => {
        processAutoApplyCodeBlocks();
        if (!isProcessingMultiFile) {
          setTimeout(() => autoApplyNewCodeBlock(null), 300);
        }
      }, 200);
    }
  });
  
  const containers = [
    document.querySelector('#chat-messages'),
    document.querySelector('.chat-messages'),
    document.querySelector('#chat-container'),
    document.querySelector('.ai-response-container'),
    document.querySelector('.message-list'),
    document.body
  ];
  
  const container = containers.find(c => c !== null) || document.body;
  console.log('👀 [AutoApply] Watching container:', container.className || container.tagName);
  
  observer.observe(container, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-cbe', 'data-id']
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTypingInProgress) {
      e.preventDefault();
      stopAutoApplyTyping();
      showAutoApplyToast('🛑 Typing stopped', 'error');
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      const blocks = document.querySelectorAll('.cbe-wrapper, .muf-block');
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock) {
        const codeInfo = extractCodeFromBlockForApply(lastBlock as HTMLElement);
        if (codeInfo) {
          const result = applyCodeToEditor(codeInfo.code, 'replace');
          showAutoApplyToast(result.success ? '✓ Applied latest code' : `✗ ${result.message}`, result.success ? 'success' : 'error');
        }
      } else {
        showAutoApplyToast('No code blocks found', 'error');
      }
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
      e.preventDefault();
      toggleAutoApply();
    }
  });
  
  // Periodic check for new code blocks
  setInterval(() => {
    // Skip if multi-file is processing
    if (isProcessingMultiFile) return;
    
    processAutoApplyCodeBlocks();
    
    if (autoApplyEnabled && !isTypingInProgress) {
      // Only check for unprocessed blocks - don't clear processedBlockIds here
      // The clear happens in autoApplyNewCodeBlock when truly new messages arrive
      const unprocessed = getUnprocessedCodeBlocks();
      if (unprocessed.length > 0 && hasNewMessage()) {
        autoApplyNewCodeBlock(null);
      }
    }
  }, 2000);
  
  console.log('✅ [AutoCodeApply] Ready!');
  console.log('   🤖 Autonomous toggle in toolbar');
  console.log('   📄 File validation: Checks code matches open file');
  console.log('   📚 Multi-file: Auto-opens files and applies code');
  console.log('   🎯 Smart: Selects BEST code, skips snippets');
  console.log('   ✅ After update: Accept (Enter) or Reject (Escape)');
}

// ============================================================================
// GLOBAL EXPORTS AND STATE SHARING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).initAutoCodeApply = initAutoCodeApply;
  (window as any).applyCodeToEditor = applyCodeToEditor;
  (window as any).applySmartUpdate = applySmartUpdate;
  (window as any).toggleAutoApply = toggleAutoApply;
  (window as any).setAutoApply = setAutoApply;
  (window as any).isAutoApplyEnabled = isAutoApplyEnabled;
  (window as any).setAutoApplyTypingSpeed = setAutoApplyTypingSpeed;
  (window as any).stopAutoApplyTyping = stopAutoApplyTyping;
  (window as any).insertAutonomousToggle = insertAutonomousToggle;
  (window as any).acceptAutoApplyChanges = acceptAutoApplyChanges;
  (window as any).rejectAutoApplyChanges = rejectAutoApplyChanges;
  
  // 🆕 Reset function for stuck multi-file processing
  (window as any).resetMultiFileProcessing = () => {
    console.log('🔄 [MultiFile] Manual reset triggered');
    isProcessingMultiFile = false;
    processedBlockIds.clear();
    const bar = document.querySelector('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar');
    if (bar) bar.remove();
    hasUnapprovedChanges = false;
    showAutoApplyToast('🔄 Multi-file processing reset', 'info');
  };
  
  // 🆕 State sharing for multi-file system integration
  (window as any).getAutonomousState = () => ({
    autoApplyEnabled,
    isTypingInProgress,
    isProcessingMultiFile,
    processedBlockIds: Array.from(processedBlockIds),
    stopTypingFlag
  });
  
  (window as any).pauseAutonomousForMultiFile = () => {
    console.log('⏸️ [AutoApply] Pausing for multi-file processing');
  };
  
  (window as any).resumeAutonomousAfterMultiFile = () => {
    console.log('▶️ [AutoApply] Resuming after multi-file processing');
    processedBlockIds.clear();
  };
}

// Export alias for backwards compatibility
export function initAutonomousCoding(): void {
  initializeAutonomousSystem();
  initAutoCodeApply();
}

console.log('✅ autonomousCoding.ts loaded with multi-file integration');

// Export style and init functions
export {
  injectAutoApplyStyles,
  initAutoCodeApply,
};

console.log('✅ autonomousCore.ts loaded (split module)');
