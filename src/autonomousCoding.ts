// autonomousCoding.ts - Enhanced Autonomous Coding System with AI Assistant Integration
// ?? TEMPORARY: UI PANEL DISABLED - Only backend functionality active
import { showNotification } from './fileSystem';

// ? v15: Module load banner - if you see this, the v15 file IS in the build

// ================================================================
// WEB UI GENERATION INTELLIGENCE - auto-injected by patch script
// ================================================================

function detectWebUIRequest(message: string): boolean {
  const patterns = [
    /\b(create|build|make|generate|design|write)\b.{0,50}\b(ui|page|website|landing|dashboard|component|layout|screen)\b/i,
    /\b(improve|enhance|redesign|update|restyle)\b.{0,40}\b(ui|design|look|style|layout|appearance)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner)\b/i,
    /\b(animat|transition|effect|motion)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant|impressive)/i,
  ];
  return patterns.some(p => p.test(message));
}

const WEB_UI_GENERATION_PROMPT = `
RULE ZERO EXTERNAL DEPENDENCIES: NEVER import framer-motion, gsap, react-spring, lodash, axios, styled-components, react-icons, lucide-react, recharts, d3, or ANY library not already in package.json. NEVER create utils/animations.ts or similar files. ONLY use React built-ins, inline styles, CSS transitions, fetch(), Unicode emoji. This rule is mandatory - violating it breaks the build.

=== WEB UI GENERATION MODE ACTIVE ===
=== MANDATORY GUARDRAILS - VIOLATIONS BREAK THE BUILD ===

GUARDRAIL 1 - NO EXTERNAL LIBRARIES:
  NEVER use: framer-motion, gsap, react-spring, lodash, axios,
  styled-components, react-icons, lucide-react, recharts, d3,
  @heroicons, react-query, zustand, or ANY lib not in package.json.
  ONLY use: React built-ins, inline styles, CSS transitions, fetch(),
  Unicode emoji for icons, standard browser APIs.

GUARDRAIL 2 - NO UTILITY FILE CREATION:
  NEVER create: utils/animations.ts, utils/helpers.ts, lib/motion.ts
  or any helper file. All code goes directly in components.

GUARDRAIL 3 - CORRECT FILE TARGETS:
  main.tsx = Vite entry point ONLY. NEVER put components or JSX here.
  main.tsx must only contain: ReactDOM.createRoot(...).render(<App/>)
  App.tsx = root component that imports and renders other components.
  Components go in: src/components/ComponentName.tsx ONLY.

GUARDRAIL 4 - CORRECT FILE LOCATIONS:
  NEVER create tsconfig.json, vite.config.ts, or package.json inside src/.
  Config files belong at project ROOT only.
  NEVER create files outside src/ unless explicitly asked.

GUARDRAIL 5 - WRITE CLEAN CODE ONLY:
  NEVER write HTML entities in source files: use ' not &#039;
  NEVER include <span class="..."> highlight tags in code.
  NEVER include markdown backticks inside file content.
  Write raw TypeScript/TSX only - no formatting artifacts.

GUARDRAIL 6 - VERIFY BEFORE PATCHING:
  Before ide_patch: use ide_read_file to confirm current file content.
  Never patch a file you haven't read in this session.
  If file content is unknown, use ide_create_file with overwrite:true.

=== END GUARDRAILS ===

You are generating a COMPLETE, VISUALLY WORKING web UI. The user sees the live preview immediately.

RULE 1 - ALWAYS GENERATE ALL 6 FILES using ide_create_file:
  1. src/App.tsx
  2. src/components/Header.tsx
  3. src/components/Hero.tsx
  4. src/components/Features.tsx
  5. src/components/Footer.tsx
  6. src/App.css
  Also patch src/index.css: body { margin:0; background:#0a0a0a; color:#fff; font-family:Inter,system-ui,sans-serif; }

RULE 2 - EVERY COMPONENT IS SELF-VISIBLE:
- Every section must have its OWN explicit background-color or gradient
- NEVER use transparent background or rely on parent for color
- Dark palette: #0a0a0a | #111827 | #1a1a2e | #16213e
- Accents: #6366f1 | #8b5cf6 | #06b6d4 | #f59e0b
- Use inline styles for all critical layout and color properties

RULE 3 - App.tsx FIXED STRUCTURE:
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';
import './App.css';
const App: React.FC = () => (
  <div style={{ margin:0, padding:0, backgroundColor:'#0a0a0a', minHeight:'100vh' }}>
    <Header />
    <main><Hero /><Features /></main>
    <Footer />
  </div>
);
export default App;

RULE 4 - Header.tsx: position fixed, top 0, zIndex 1000, dark background with blur,
flex row with logo (gradient text) + nav links + CTA button

RULE 5 - Hero.tsx: minHeight 100vh, dark gradient background, flex center,
fade-in animation, large gradient headline, subtitle, 2 CTA buttons (solid + ghost),
decorative glow orbs in background

RULE 6 - Features.tsx: padding 100px 2rem, dark gradient bg, h2 heading centered,
CSS grid auto-fit minmax(300px,1fr), cards with hover lift + color border glow,
each card: emoji icon + title + description + accent bottom line

RULE 7 - Footer.tsx: background #050505, border-top, logo+tagline + 2 link columns + copyright bar

RULE 8 - ADAPT to user domain:
  portfolio = name/role/skills/projects
  SaaS = features/pricing/testimonials
  restaurant = warm amber/orange palette
  medical = blue/teal palette
  e-commerce = product cards
NEVER use generic placeholder text - always match the user intent.
=== 
RULE: ZERO EXTERNAL DEPENDENCIES - MANDATORY
- NEVER import framer-motion, gsap, react-spring, lodash, axios, styled-components,
  react-icons, @heroicons, lucide-react, recharts, d3, three, or ANY library
  not already in the project's package.json
- NEVER create utility files like utils/animations.ts, utils/helpers.ts etc
- ONLY use: React built-ins, inline styles, CSS classes, and standard browser APIs
- For animations: use CSS keyframes in App.css or inline style transitions only
- For icons: use plain Unicode emoji or simple SVG inline elements
- For HTTP: use fetch() only, never axios
- Before using any import, ask: is this in the project already? If unsure, DON'T use it
- Violation of this rule breaks the build and wastes the user's time
END WEB UI GENERATION MODE ===
`;

console.log('?????? [AutoApply v15] autonomousCoding v15 LOADED ??????');

// ============================================================================
// ?? MULTI-FILE AUTONOMOUS INTEGRATION - DISABLED (using internal system only)
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
    console.log('?? Simple autonomous mode activated');
  }
  
  stopAutonomousMode(): void {
    this.isActive = false;
    this.isTyping = false;
    this.isStopped = false;
    console.log('?? Simple autonomous mode deactivated');
  }
  
  pauseAutonomousMode(): void {
    this.isStopped = true;
    this.isTyping = false;
    console.log('?? Simple autonomous mode paused/stopped');
  }
  
  continueAutonomousMode(): void {
    this.isStopped = false;
    if (this.isActive) {
      console.log('?? Simple autonomous mode continued');
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
    console.log('? Processing file with simple autonomous system:', filePath);
    
    if (this.isStopped) {
      showNotification('?? Autonomous system is stopped. Press Continue to resume.', 'warning');
      return;
    }
    
    if (this.isTyping) {
      showNotification('? Autonomous system is currently typing...', 'warning');
      return;
    }
    
    if (!filePath) {
      const activeTab = (window as any).tabManager?.getActiveTab();
      filePath = activeTab?.path;
    }
    
    if (!filePath || !filePath.endsWith('.py')) {
      showNotification('? No Python file selected', 'error');
      return;
    }
    
    try {
      // Get current editor content
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (!editor) {
        showNotification('? No editor found', 'error');
        return;
      }
      
      const content = editor.getValue();
      console.log('?? File content length:', content.length);
      
      // Check for autonomous decorators
      const decorators = this.findDecorators(content);
      
      if (decorators.length === 0) {
        showNotification('?? No autonomous decorators found', 'info');
        return;
      }
      
      console.log(`?? Found ${decorators.length} decorators:`, decorators);
      showNotification(`?? Found ${decorators.length} decorators - Starting autonomous coding...`, 'info');
      
      // Process each decorator with typing animation
      for (let i = 0; i < decorators.length; i++) {
        // Check if stopped during processing
        if (this.isStopped) {
          showNotification('?? Autonomous processing stopped by user', 'warning');
          break;
        }
        
        const decorator = decorators[i];
        showNotification(`?? Generating ${decorator.type} (${i + 1}/${decorators.length})...`, 'info');
        await this.processDecoratorWithTyping(decorator, editor);
        
        // Pause between decorators
        if (i < decorators.length - 1) {
          await this.delay(1000);
        }
      }
      
      if (!this.isStopped) {
        showNotification(`? Autonomous coding complete! Generated ${decorators.length} functions`, 'success');
      }
      
    } catch (error) {
      console.error('? Autonomous processing failed:', error);
      showNotification('? Autonomous processing failed', 'error');
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
    console.log(`?? Processing ${decorator.type} decorator:`, decorator);
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
      console.log(`? Generated code for ${decorator.type}`);
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
    console.log(`?? Typing speed set to ${charactersPerSecond} characters per second`);
  }
  
  // Emergency stop typing
  emergencyStop(): void {
    this.pauseAutonomousMode();
    this.stopTypingIndicator();
    this.updateTypingStatus('Stopped', false);
    showNotification('?? Autonomous typing stopped', 'warning');
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
    console.log('?? Autonomous UI temporarily disabled');
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
    panel.innerHTML = `<div style="padding: 16px; text-align: center; color: #4fc3f7;">?? Autonomous Panel</div>`;
    
    // Insert the panel into the AI assistant container
    this.insertPanelIntoAIAssistant(container, panel);
    this.panel = panel;
    
    console.log('? Autonomous panel integrated into AI Assistant successfully');
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
      console.log('? Autonomous panel minimized in AI Assistant');
    }
  }
  
  public expand(): void {
    if (this.panel) {
      this.panelState = 'full';
      this.saveVisibilityState();
      console.log('? Autonomous panel expanded in AI Assistant');
    }
  }
  
  public show(): void {
    if (this.panel) {
      this.panelState = 'full';
      this.saveVisibilityState();
      console.log('? Autonomous panel shown in AI Assistant');
    }
  }
  
  public hide(): void {
    if (this.panel) {
      this.panelState = 'hidden';
      this.saveVisibilityState();
      console.log('? Autonomous panel hidden in AI Assistant');
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
  console.log('?? Toggling autonomous mode in AI Assistant...');
  
  let simpleAutonomousSystem = (window as any).__simpleAutonomous;
  let simpleAutonomousUI = (window as any).__simpleAutonomousUI;
  let isAutonomousModeActive = (window as any).__isAutonomousModeActive || false;
  
  // Initialize simple system if not done
  if (!simpleAutonomousSystem) {
    console.log('?? Initializing autonomous system in AI Assistant...');
    simpleAutonomousSystem = new SimpleAutonomousSystem();
    simpleAutonomousUI = new SimpleAutonomousUI();
    
    // Make available globally
    (window as any).__simpleAutonomous = simpleAutonomousSystem;
    (window as any).__simpleAutonomousUI = simpleAutonomousUI;
    
    showNotification('?? Autonomous system initialized in AI Assistant', 'success');
  }
  
  if (isAutonomousModeActive) {
    simpleAutonomousSystem.stopAutonomousMode();
    (window as any).__isAutonomousModeActive = false;
    simpleAutonomousUI?.updateStatus('Inactive', '#f48771');
    showNotification('?? Autonomous mode deactivated', 'info');
  } else {
    simpleAutonomousSystem.startAutonomousMode();
    (window as any).__isAutonomousModeActive = true;
    simpleAutonomousUI?.updateStatus('Active', '#4caf50');
    showNotification('?? Autonomous mode activated in AI Assistant', 'success');
  }
}

export async function processCurrentFileAutonomous(): Promise<void> {
  console.log('? Processing current file autonomously in AI Assistant...');
  
  let simpleAutonomousSystem = (window as any).__simpleAutonomous;
  
  if (!simpleAutonomousSystem) {
    await toggleAutonomousMode();
    simpleAutonomousSystem = (window as any).__simpleAutonomous;
  }
  
  if (simpleAutonomousSystem) {
    await simpleAutonomousSystem.processCurrentFile();
  } else {
    showNotification('? Autonomous system not available', 'error');
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
  showNotification(`?? Typing speed set to ${speed} in AI Assistant`, 'success');
  
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
      showNotification('?? Autonomous mode continued in AI Assistant', 'success');
    } else {
      autonomousSystem.emergencyStop();
      autonomousUI.updateStatus('Stopped', '#ff9800');
    }
  }
}

export function testAutonomousSystem(): void {
  console.log('?? Testing autonomous system in AI Assistant...');
  
  const simpleAutonomousSystem = (window as any).__simpleAutonomous;
  
  if (simpleAutonomousSystem) {
    console.log('? Autonomous system found in AI Assistant');
    showNotification('? Autonomous system test passed in AI Assistant!', 'success');
  } else {
    console.log('? No autonomous system found, initializing...');
    toggleAutonomousMode();
  }
}

// Initialize autonomous system when module is loaded
export function initializeAutonomousSystem(): void {
  console.log('?? Initializing Autonomous Coding System in AI Assistant...');
  
  setTimeout(async () => {
    try {
      let simpleAutonomousSystem = (window as any).__simpleAutonomous;
      let simpleAutonomousUI = (window as any).__simpleAutonomousUI;
      
      if (!simpleAutonomousSystem) {
        simpleAutonomousSystem = new SimpleAutonomousSystem();
        simpleAutonomousUI = new SimpleAutonomousUI();
        
        (window as any).__simpleAutonomous = simpleAutonomousSystem;
        (window as any).__simpleAutonomousUI = simpleAutonomousUI;
        
        console.log('? Autonomous Coding System initialized in AI Assistant successfully');
        showNotification('?? Autonomous Coding ready in AI Assistant! ??', 'success');
      }
    } catch (error) {
      console.error('? Error initializing autonomous coding system in AI Assistant:', error);
    }
  }, 3000); // Wait for AI assistant to be ready
}

// Global exports
export { SimpleAutonomousSystem, SimpleAutonomousUI };

console.log('?? autonomousCoding.ts loaded - AI Assistant Integration');

// ============================================================================
// AUTO CODE APPLY - Apply AI code blocks directly to Monaco Editor
// ============================================================================

console.log('?? [AutoCodeApply] Loading...');

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

// ============================================================================
// FORCE APPLY NEXT CODE - For Fix Errors button one-time auto-apply
// ============================================================================
let forceApplyNextCode = false;
let forceApplyWatcherInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Set force apply next code flag - will auto-apply the next code block from AI
 * Used by Fix Errors button to apply fix automatically
 */
export function setForceApplyNext(enabled: boolean): void {
  forceApplyNextCode = enabled;
  console.log(`?? [ForceApply] ${enabled ? 'ARMED - Will auto-apply next code' : 'Disarmed'}`);
  
  if (enabled) {
    // Start watching for new code blocks
    startForceApplyWatcher();
  } else {
    stopForceApplyWatcher();
  }
}

/**
 * Start watching for new code blocks to apply
 */
function startForceApplyWatcher(): void {
  // Clear any existing watcher
  stopForceApplyWatcher();
  
  console.log('??? [ForceApply] Watcher started - monitoring for AI response...');
  
  let checkCount = 0;
  const maxChecks = 60; // 30 seconds max (500ms * 60)
  
  forceApplyWatcherInterval = setInterval(() => {
    checkCount++;
    
    if (!forceApplyNextCode || checkCount > maxChecks) {
      console.log(`??? [ForceApply] Watcher stopped (${forceApplyNextCode ? 'timeout' : 'applied'})`);
      stopForceApplyWatcher();
      forceApplyNextCode = false;
      return;
    }
    
    // Check for new unprocessed code blocks
    const unprocessed = getUnprocessedCodeBlocks();
    if (unprocessed.length > 0) {
      console.log(`?? [ForceApply] Found ${unprocessed.length} code block(s) - applying...`);
      
      // Apply the best code block
      forceApplyCodeBlock();
    }
  }, 500); // Check every 500ms
}

/**
 * Stop the force apply watcher
 */
function stopForceApplyWatcher(): void {
  if (forceApplyWatcherInterval) {
    clearInterval(forceApplyWatcherInterval);
    forceApplyWatcherInterval = null;
  }
}

/**
 * Force apply the latest code block to the editor WITH HIGHLIGHTS
 */
async function forceApplyCodeBlock(): Promise<void> {
  const unprocessed = getUnprocessedCodeBlocks();
  if (unprocessed.length === 0) return;
  
  // Select the best code block
  const targetBlock = selectBestCodeBlock(unprocessed);
  if (!targetBlock) {
    console.log('?? [ForceApply] No suitable code block found');
    return;
  }
  
  const codeInfo = extractCodeFromBlockForApply(targetBlock);
  if (!codeInfo || !codeInfo.code.trim()) {
    console.log('?? [ForceApply] No code to apply');
    return;
  }
  
  // Check minimum lines (skip tiny snippets)
  const codeLines = codeInfo.code.trim().split('\n').filter(line => line.trim());
  if (codeLines.length < 3) {
    console.log('?? [ForceApply] Code too short, waiting for complete code...');
    return;
  }
  
  // Apply the code with SMART UPDATE (includes diff highlights)
  console.log(`? [ForceApply] Applying ${codeLines.length} lines of code with highlights...`);
  // Pipeline: Start for force-apply
  surgicalPipeline.begin();
  surgicalPipeline.enter(0, 'Force apply triggered');
  surgicalPipeline.complete(0, '1 block(s) detected');
  surgicalPipeline.enter(1, codeLines.length + ' lines');
  surgicalPipeline.complete(1, codeLines.length + ' lines');
  const result = await applySmartUpdate(codeInfo.code);
  
  if (result.success) {
    // Pipeline: End force-apply
    if (surgicalPipeline.isActive()) {
      surgicalPipeline.enter(7, 'Force apply complete');
      surgicalPipeline.complete(7, result.message);
      surgicalPipeline.end(true);
    }
    // Mark block as applied
    const blockId = targetBlock.getAttribute('data-muf-id') || targetBlock.getAttribute('data-block-id') || Date.now().toString();
    processedBlockIds.add(blockId);
    markBlockAsApplied(targetBlock, blockId, result.message);
    
    // Show success toast with change summary
    const changeMsg = result.message === 'No changes needed' 
      ? '? No errors found - code is clean!' 
      : `? Fix applied: ${result.message}`;
    showAutoApplyToast(changeMsg, 'success');
    
    // Disable force apply after successful apply
    forceApplyNextCode = false;
    stopForceApplyWatcher();
  } else {
    showAutoApplyToast(`? ${result.message}`, 'error');
  }
}

function getProgressiveDelay(lineNumber: number): number {
  return 0; // FAST: No delay for instant apply
}

let originalCodeBeforeApply: string = '';
let pendingNewCode: string = '';  // ?? FIX: Store new code for accept

// AI Change History - moved to bottom (AI CHANGE NOTIFICATION + DIFF VIEWER section)
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
      console.log(`?? [Decorations] Cleared for: ${fileName}`);
    }
  } else {
    // Clear all
    for (const [file, ids] of pendingMultiFileDecorations.entries()) {
      try { editor.deltaDecorations(ids, []); } catch(e) {}
    }
    pendingMultiFileDecorations.clear();
    console.log(`?? [Decorations] Cleared all`);
  }
}

// Store decorations for a file (called after applying changes)
function storePendingDecorations(fileName: string, decorationIds: string[]): void {
  pendingMultiFileDecorations.set(fileName.toLowerCase(), decorationIds);
  console.log(`?? [Decorations] Stored ${decorationIds.length} for: ${fileName}`);
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
  console.log('?? [Highlight] Injected highlight styles v3');
}

// Clear decorations when accepting or rejecting changes
function clearAllDecorations(): void {
  console.log('?? [Decorations] Clearing all decorations...');
  
  // Clear stored decorations from pendingMultiFileDecorations
  clearPendingDecorations();
  
  // Get current editor
  const editor = (window as any).__acaDecoratedEditor || getMonacoEditorForApply();
  
  // Clear global decoration IDs
  const ids = (window as any).__acaDecorationIds;
  if (editor && ids && ids.length > 0) {
    try {
      editor.deltaDecorations(ids, []);
      console.log(`?? [Decorations] Cleared ${ids.length} decoration IDs`);
    } catch (e) {
      console.warn('?? [Decorations] Error clearing ids:', e);
    }
  }
  
  // Clear all accumulated decorations
  const allIds = (window as any).__acaAllDecorations;
  if (editor && allIds && allIds.length > 0) {
    try {
      editor.deltaDecorations(allIds, []);
      console.log(`?? [Decorations] Cleared ${allIds.length} accumulated decorations`);
    } catch (e) {
      console.warn('?? [Decorations] Error clearing accumulated:', e);
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
  
  console.log('?? [Decorations] All decorations cleared');
}

export function setAutoApplyTypingSpeed(lineDelayMs: number): void {
  lineDelay = Math.max(10, Math.min(500, lineDelayMs));
  console.log(`? [AutoApply] Line delay: ${lineDelay}ms`);
}

export function stopAutoApplyTyping(): void {
  stopTypingFlag = true;
  console.log('?? [AutoApply] Stop typing requested');
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
      z-index: 999999;
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
    console.log('?? [ConfirmBar] Skipping - multi-file confirm bar visible');
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
      <div class="ucb-icon">??</div>
      <div class="ucb-info">
        <div class="ucb-title">Changes Applied</div>
        <div class="ucb-details">
          <span class="ucb-file-tag">${fileName} (${changesSummary})</span>
        </div>
      </div>
      <div class="ucb-actions">
        <button class="ucb-btn ucb-btn-accept" title="Save changes (Enter)">
          ? Accept
        </button>
        <button class="ucb-btn ucb-btn-reject" title="Revert changes (Escape)">
          ? Reject
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
        z-index: 999999;
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
  
  console.log('?? [AutoApply] Awaiting confirmation: Accept (Enter) or Reject (Escape)');
}

/**
 * Highlight lines in the editor based on change type
 */
function highlightChangeLines(type: 'add' | 'del' | 'mod'): void {
  console.log(`?? [Highlight] highlightChangeLines called with type: ${type}`);
  console.log(`?? [Highlight] lastChangeLines:`, JSON.stringify(lastChangeLines));
  
  const editor = getMonacoEditorForApply();
  if (!editor) {
    console.log(`?? [Highlight] No editor found`);
    showAutoApplyToast('?? No editor available', 'error');
    return;
  }
  
  const monaco = (window as any).monaco;
  if (!monaco) {
    console.log(`?? [Highlight] Monaco not available`);
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
    console.log(`?? [Highlight] No ${type} lines to highlight`);
    showAutoApplyToast(`?? No ${typeLabel} lines to show`, 'info');
    return;
  }
  
  // Filter out invalid line numbers (must be >= 1 and <= total lines)
  const model = editor.getModel();
  const totalLines = model ? model.getLineCount() : 9999;
  lines = lines.filter(ln => ln >= 1 && ln <= totalLines);
  
  if (lines.length === 0) {
    console.log(`?? [Highlight] No valid lines after filtering`);
    showAutoApplyToast(`?? No ${typeLabel} lines in current code`, 'info');
    return;
  }
  
  console.log(`?? [Highlight] Highlighting ${lines.length} ${type} lines:`, lines);
  
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
  console.log(`?? [Highlight] Created ${activeHighlightDecorations.length} decorations`);
  
  // Scroll to first highlighted line
  if (lines.length > 0) {
    editor.revealLineInCenter(lines[0]);
    const label = type === 'del' ? `${lines.length} deletion point${lines.length > 1 ? 's' : ''}` : `${lines.length} ${typeLabel} line${lines.length > 1 ? 's' : ''}`;
    showAutoApplyToast(`?? ${label} highlighted`, 'info');
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

/**
 * Restore editor to writable state after auto-apply accept/reject.
 * File watcher may set readOnly during reload after Tauri writes to disk.
 * This ensures editor is always editable after accept/reject operations.
 */
function restoreEditorWritable(editor?: any): void {
  const ed = editor || getMonacoEditorForApply();
  if (!ed) return;
  
  try {
    ed.updateOptions({ readOnly: false });
    console.log('?? [AutoApply] Editor restored to writable');
  } catch (e) {
    console.warn('?? [AutoApply] Failed to restore writable:', e);
      // Update center dialog on failure
      addStatusLog(result.message, 'error');
      updateStatusText('Failed');
      updateProgress(100);
      setTimeout(() => closeStatusDialog(), 3000);
  }
  
  // Delayed check: file watcher reload happens async after Tauri save
  // Re-check and restore writable after potential reload
  setTimeout(() => {
    try {
      const currentEditor = editor || getMonacoEditorForApply();
      if (currentEditor) {
        const opts = currentEditor.getOptions?.();
        // Monaco EditorOption.readOnly = 87 in some versions
        const isReadOnly = currentEditor.getRawOptions?.()?.readOnly || false;
        if (isReadOnly) {
          currentEditor.updateOptions({ readOnly: false });
          console.log('?? [AutoApply] Editor re-restored to writable (post file-watcher)');
        }
      }
    } catch (e) {}
  }, 500);
  
  // Second delayed check for slower file watchers
  setTimeout(() => {
    try {
      const currentEditor = editor || getMonacoEditorForApply();
      if (currentEditor) {
        const isReadOnly = currentEditor.getRawOptions?.()?.readOnly || false;
        if (isReadOnly) {
          currentEditor.updateOptions({ readOnly: false });
          console.log('?? [AutoApply] Editor re-restored to writable (late check)');
        }
      }
    } catch (e) {}
  }, 1500);
}

function acceptChanges(): void {
  // Capture pending code BEFORE clearing anything
  const codeToSave = pendingNewCode || '';
  const originalBeforeAccept = originalCodeBeforeApply || '';
  
  removeConfirmationBar();
  clearAllDecorations();
  
  // Apply to editor model for visual update
  if (codeToSave) {
    const editor = getMonacoEditorForApply();
    if (editor) {
      try {
        editor.setValue(codeToSave);
        console.log('[AutoApply] Applied via setValue (' + codeToSave.length + ' chars)');
      } catch (e) {
        console.warn('[AutoApply] setValue failed, saving directly');
      }
      // ?? FIX: Restore editor to writable after accept
      // File watcher may set readOnly when Tauri writes file to disk
      restoreEditorWritable(editor);
    }
  }
  
  originalCodeBeforeApply = '';
  pendingNewCode = '';
  // CRITICAL: Pass code directly to save - bypasses model.getValue()
  // Store diff for View Changes feature
  if (codeToSave && originalBeforeAccept) {
    const editorForPath = getMonacoEditorForApply();
    const modelForPath = editorForPath?.getModel();
    let savedFilePath = modelForPath?.uri?.path || 'unknown';
    if (savedFilePath.startsWith('/') && savedFilePath.charAt(2) === ':') {
      savedFilePath = savedFilePath.substring(1);
    }
    const savedFileName = savedFilePath.split('/').pop() || 'file';
    const addCount = lastChangeLines?.addedLines?.length || 0;
    const delCount = lastChangeLines?.deletedLines?.length || 0;
    const modCount = lastChangeLines?.modifiedLines?.length || 0;
    const summary = '+' + addCount + ' -' + delCount + ' ~' + modCount;
    storeAIChange(savedFilePath, originalBeforeAccept, codeToSave, summary);
    setTimeout(() => showAIChangedNotification(savedFileName, summary), 300);
  }
  // Surgical: commit (already on disk) or legacy save
  const _sbAccept = (window as any).surgicalBridge;
  if (_sbAccept?.getCurrentChange() && _sbAccept?.isEnabled()) {
    _sbAccept.commit();
    showAutoApplyToast('Changes accepted (backup saved)', 'success');
    console.log('🔬 [SurgicalCommit] Committed - file already on disk');
  } else {
    triggerFileSave(codeToSave || undefined);
    showAutoApplyToast('Changes accepted and saved', 'success');
    console.log('[AutoApply] Changes accepted and saved');
  }
}

async function triggerFileSave(overrideContent?: string): Promise<void> {
  try {
    console.log('?? [AutoApply] Attempting to save file...');
    
    // Get current editor content and path
    const editor = getMonacoEditorForApply();
    const model = editor?.getModel();
    if (!model) {
      console.warn('?? [AutoApply] No editor model for save');
      return;
    }
    
    const content = overrideContent || model.getValue();
    let filePath = model.uri?.path || '';
    if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
      filePath = filePath.substring(1);
    }
    filePath = filePath.replace(/\\/g, '/');
    
    if (!filePath) {
      console.warn('?? [AutoApply] No file path for save');
      return;
    }
    
    console.log(`?? [AutoApply] Saving: ${filePath} (${content.length} chars)`);
    
    let saved = false;
    
    // Method 1: Use Tauri invoke 'write_file' command
    try {
      const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
      if (invoke) {
        await invoke('write_file', { path: filePath, content: content });
        saved = true;
        console.log('?? [AutoApply] Saved via Tauri invoke');
      }
    } catch (e: any) {
      console.warn('?? [AutoApply] Tauri invoke failed:', e?.message || e);
    }
    
    // Method 2: Use @tauri-apps/plugin-fs
    if (!saved) {
      try {
        const fs = (window as any).__TAURI__?.fs;
        if (fs?.writeTextFile) {
          await fs.writeTextFile(filePath, content);
          saved = true;
          console.log('?? [AutoApply] Saved via Tauri fs plugin');
        }
      } catch (e: any) {
        console.warn('?? [AutoApply] Tauri fs plugin failed:', e?.message || e);
      }
    }
    
    // Method 3: Use window.saveFile
    if (!saved) {
      const saveFile = (window as any).saveFile;
      if (saveFile) {
        try {
          await saveFile(content, filePath);
          saved = true;
          console.log('?? [AutoApply] Saved via window.saveFile');
        } catch (e: any) {
          console.warn('?? [AutoApply] window.saveFile failed:', e?.message || e);
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
          console.log('?? [AutoApply] Saved via tabManager');
        } catch (e: any) {
          console.warn('?? [AutoApply] tabManager failed:', e?.message || e);
        }
      }
    }
    
    if (saved) {
      updateSaveState(filePath, content);
    } else {
      console.error('? [AutoApply] All save methods failed');
    }
    
  } catch (error) {
    console.error('?? [AutoApply] Could not auto-save:', error);
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
  // Surgical rollback: restore from backup file
  const _sbReject = (window as any).surgicalBridge;
  if (_sbReject?.getCurrentChange() && _sbReject?.isEnabled()) {
    console.log('🔬 [SurgicalRollback] Restoring from backup...');
    _sbReject.rollback().then(() => {
      removeConfirmationBar();
      clearAllDecorations();
      originalCodeBeforeApply = '';
      pendingNewCode = '';
      hasUnapprovedChanges = false;
      showAutoApplyToast('Changes rejected (restored)', 'info');
    }).catch((rErr: any) => {
      console.error('🔬 Rollback failed:', rErr);
      showAutoApplyToast('Rollback failed', 'error');
    });
    return;
  }
  if (!originalCodeBeforeApply && !pendingNewCode) {
    showAutoApplyToast('?? No changes to reject', 'error');
    removeConfirmationBar();
    clearAllDecorations(); // Clear highlighting even if no changes
    return;
  }
  
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    if (model && originalCodeBeforeApply) {
      const monaco = (window as any).monaco;
      const fullRange = model.getFullModelRange();
      editor.executeEdits('aca-reject', [{ range: fullRange, text: originalCodeBeforeApply, forceMoveMarkers: true }]);
    }
    // ?? FIX: Restore editor to writable after reject
    restoreEditorWritable(editor);
  }
  
  clearAllDecorations(); // Clear highlighting
  removeConfirmationBar();
  originalCodeBeforeApply = '';
  pendingNewCode = '';  // ?? FIX: Clear pending code
  showAutoApplyToast('?? Changes rejected - reverted', 'success');
  console.log('?? [AutoApply] Changes rejected');
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
        console.log('? [AutoApply] Confirmation timeout - auto-rejecting');
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
  // ? FIX: Check for BOTH class-based AND id-based toggle buttons
  // professionalIcons.ts creates #autonomous-mode-toggle (ID)
  // This function creates .autonomous-mode-toggle (class)
  if (document.querySelector('.autonomous-mode-toggle') || 
      document.getElementById('autonomous-mode-toggle')) {
    return; // Button already exists (either from here or professionalIcons.ts)
  }
  
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
    console.log('?? [Autonomous] Could not find toolbar');
    return;
  }
  
  console.log('?? [Autonomous] Found toolbar:', targetToolbar.className);
  
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
  
  // ? Always start OFF on page load - do not restore saved state
  autoApplyEnabled = false;
  localStorage.removeItem('autonomousMode');
  localStorage.removeItem('aiFileExplorerEnabled');
  (window as any).aiFileExplorerEnabled = false;
  (window as any).aiSearchEnabled = false;
  
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
        
        console.log('?? [Autonomous] AI Project Search auto-enabled');
      }, 100);
    }
  };
  
  if (targetToolbar.firstChild) {
    targetToolbar.insertBefore(toggleBtn, targetToolbar.firstChild);
  } else {
    targetToolbar.appendChild(toggleBtn);
  }
  
  console.log('? [Autonomous] Toggle button added');
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
      /* animation removed - no blinking */
    }
  `;
  document.head.appendChild(style);
}

function watchForChatInput(): void {
  createAutonomousToggleButton();
  
  const observer = new MutationObserver(() => {
    // ? FIX: Check for BOTH class-based AND id-based toggle buttons
    if (!document.querySelector('.autonomous-mode-toggle') && 
        !document.getElementById('autonomous-mode-toggle')) {
      createAutonomousToggleButton();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => {
    // ? FIX: Check for BOTH class-based AND id-based toggle buttons
    if (!document.querySelector('.autonomous-mode-toggle') && 
        !document.getElementById('autonomous-mode-toggle')) {
      createAutonomousToggleButton();
    }
  }, 2000);
}

export function insertAutonomousToggle(containerSelector: string, position: 'start' | 'end' = 'start'): boolean {
  // ? FIX: Check for BOTH class-based AND id-based toggle buttons
  if (document.querySelector('.autonomous-mode-toggle') || 
      document.getElementById('autonomous-mode-toggle')) {
    console.log('?? [Autonomous] Toggle already exists');
    return true;
  }
  
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.log('? [Autonomous] Container not found:', containerSelector);
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
  
  console.log('? [Autonomous] Toggle inserted into:', containerSelector);
  return true;
}

// ============================================================================
// FILE NAME VALIDATION
// ============================================================================

interface FileValidation {
  isValid: boolean;
  detectedFileName: string | null;
  currentFileName: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

function extractTargetFileName(block: HTMLElement, code: string): string | null {
  // ? v14: Added C/C++/Arduino extensions (c|h|cpp|hpp|ino)
  const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php|c|h|cpp|hpp|cc|cxx|ino))/i;
  
  console.log(`?? [FileDetect] Starting detection for block...`);
  
  // 1. Check block's data attributes first (highest priority)
  const dataFile = block.getAttribute('data-file') || block.getAttribute('data-filename') || block.getAttribute('data-path');
  if (dataFile) {
    const fileName = dataFile.split('/').pop() || dataFile;
    // Don't filter data attributes - they're explicitly set by the system
    console.log(`?? [FileDetect] Found in data attribute: ${fileName}`);
    return fileName;
  }
  
  // 2. Check the block's header element (e.g., "TYPESCRIPT" with filename)
  const header = block.querySelector('.cbe-header, .muf-header, [class*="header"]');
  if (header) {
    const headerText = header.textContent || '';
    const headerMatch = headerText.match(FILE_EXT_PATTERN);
    if (headerMatch && !isTechnologyNameNotFile(headerMatch[1])) {
      console.log(`?? [FileDetect] Found in header: ${headerMatch[1]}`);
      return headerMatch[1];
    }
  }
  
  // 3. CRITICAL: Walk UP through ancestors to find the closest heading with filename
  // This is key for distinguishing "## Updated App.tsx" from "## Updated main.tsx"
  let currentEl: Element | null = block;
  let searchedElements = 0;
  
  while (currentEl && searchedElements < 20) {
    // Check previous siblings of current element
    let sibling = currentEl.previousElementSibling;
    let siblingCount = 0;
    
    while (sibling && siblingCount < 10) {
      // Stop if we hit another code block - wrong section
      if (sibling.classList?.contains('cbe-wrapper') || 
          sibling.classList?.contains('muf-block') || 
          sibling.querySelector('pre code')) {
        console.log(`?? [FileDetect] Hit another code block, stopping sibling search`);
        break;
      }
      
      const sibText = sibling.textContent?.trim() || '';
      
      // Check for headings with filename (## Updated App.tsx, ### main.tsx, etc.)
      if (sibling.tagName?.match(/^H[1-6]$/) || sibText.startsWith('#')) {
        // ? v14: Added C/C++/Arduino extensions
        const headingMatch = sibText.match(/(?:Updated?\s+)?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|c|h|cpp|hpp|ino))/i);
        if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
          console.log(`?? [FileDetect] Found in heading "${sibText}": ${headingMatch[1]}`);
          return headingMatch[1];
        }
      }
      
      // Check for bold filename (**App.tsx**)
      // ? v14: Added C/C++/Arduino extensions
      const boldMatch = sibText.match(/\*\*([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|c|h|cpp|hpp|ino))\*\*/i);
      if (boldMatch && !isTechnologyNameNotFile(boldMatch[1])) {
        console.log(`?? [FileDetect] Found bold filename: ${boldMatch[1]}`);
        return boldMatch[1];
      }
      
      // Check for backtick filename in short text
      if (sibText.length < 200) {
        // ? v14: Added C/C++/Arduino extensions
        const backtickMatch = sibText.match(/`([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|c|h|cpp|hpp|ino))`/i);
        if (backtickMatch && !isTechnologyNameNotFile(backtickMatch[1])) {
          console.log(`?? [FileDetect] Found backtick: ${backtickMatch[1]}`);
          return backtickMatch[1];
        }
      }
      
      // Check for standalone filename
      // ? v14: Added C/C++/Arduino extensions
      const standaloneMatch = sibText.match(/^([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|c|h|cpp|hpp|ino))[:.]?\s*$/i);
      if (standaloneMatch && !isTechnologyNameNotFile(standaloneMatch[1])) {
        console.log(`?? [FileDetect] Found standalone: ${standaloneMatch[1]}`);
        return standaloneMatch[1];
      }
      
      sibling = sibling.previousElementSibling;
      siblingCount++;
    }
    
    // Move up to parent
    currentEl = currentEl.parentElement;
    searchedElements++;
  }
  
  // 4. Check code content for hints
  const codeFileName = detectFileNameFromCode(code);
  if (codeFileName) {
    console.log(`?? [FileDetect] Detected from code content: ${codeFileName}`);
    return codeFileName;
  }
  
  // 5. LAST RESORT: Use block position to map to file mentions in message
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (parentMessage) {
    // Get all code blocks in this message - use multiple selectors to catch all formats
    const allBlocks = parentMessage.querySelectorAll('.cbe-wrapper, .muf-block, pre, [class*="code-block"], div[class*="highlight"]');
    const blockArray = Array.from(allBlocks).filter(b => {
      // Filter out blocks that are nested inside other blocks
      const parent = b.parentElement;
      if (parent?.closest('.cbe-wrapper, .muf-block')) return false;
      return true;
    });
    const blockIndex = blockArray.findIndex(b => b === block || b.contains(block) || block.contains(b));
    
    console.log(`?? [FileDetect] Block index: ${blockIndex} of ${blockArray.length}`);
    
    // ? NEW: Check if there's a heading directly before this block with a filename
    const prevSibling = block.previousElementSibling;
    if (prevSibling) {
      const prevText = prevSibling.textContent?.trim() || '';
      // ? v14: Added C/C++/Arduino extensions
      const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php|c|h|cpp|hpp|cc|cxx|ino))/i;
      const headingMatch = prevText.match(FILE_EXT_PATTERN);
      if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
        console.log(`?? [FileDetect] Found in preceding sibling: ${headingMatch[1]}`);
        return headingMatch[1];
      }
    }
    
    // ? NEW: Check parent's previous sibling (for nested structures)
    const parentPrevSibling = block.parentElement?.previousElementSibling;
    if (parentPrevSibling) {
      const prevText = parentPrevSibling.textContent?.trim() || '';
      // ? v14: Added C/C++/Arduino extensions
      const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php|c|h|cpp|hpp|cc|cxx|ino))/i;
      const headingMatch = prevText.match(FILE_EXT_PATTERN);
      if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
        console.log(`?? [FileDetect] Found in parent's preceding sibling: ${headingMatch[1]}`);
        return headingMatch[1];
      }
    }
    
    // Get all file mentions in the message (in order)
    const messageText = parentMessage.textContent || '';
    // ? v14+FIX: Added C/C++/Arduino extensions AND handle backtick-wrapped filenames
    // Use negative lookbehind/lookahead to handle both word boundaries AND backticks
    const filePattern = /(?:^|[\s`"'\(\[])([a-zA-Z][a-zA-Z0-9_.-]*\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|c|h|cpp|hpp|cc|cxx|ino))(?:$|[\s`"'\)\],:;])/gi;
    const allMentions: string[] = [];
    let match;
    while ((match = filePattern.exec(messageText)) !== null) {
      const fileName = match[1];
      // Skip common config files unless they're the only mentions
      if (!['package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js'].includes(fileName.toLowerCase())) {
        // Skip technology names that look like filenames (Node.js, React.js, etc.)
        if (!isTechnologyNameNotFile(fileName)) {
          if (!allMentions.map(f => f.toLowerCase()).includes(fileName.toLowerCase())) {
            allMentions.push(fileName);
          }
        }
      }
    }
    
    console.log(`?? [FileDetect] All file mentions: ${allMentions.join(', ') || '(none)'}`);
    
    // Map block index to file mention
    if (allMentions.length > 0 && blockIndex >= 0) {
      // ? FIX: Even if there are more blocks than mentions, try to map
      // Use modulo or direct index if within bounds
      if (blockIndex < allMentions.length) {
        console.log(`?? [FileDetect] Mapped block ${blockIndex} -> "${allMentions[blockIndex]}"`);
        return allMentions[blockIndex];
      }
      
      // ? NEW: Try to detect from preceding text for this specific block
      // Walk backwards from block to find nearest file mention
      let prevEl = block.previousElementSibling;
      let searchDepth = 0;
      while (prevEl && searchDepth < 5) {
        // Skip other code blocks
        if (prevEl.querySelector('pre, code') || prevEl.tagName === 'PRE') {
          prevEl = prevEl.previousElementSibling;
          searchDepth++;
          continue;
        }
        
        const prevText = prevEl.textContent || '';
        // ? v14: Added C/C++/Arduino extensions
        const fileMatch = prevText.match(/\b([a-zA-Z][a-zA-Z0-9_.-]*\.(tsx?|jsx?|py|css|html|json|xml|c|h|cpp|hpp|ino))\b/i);
        if (fileMatch && !isTechnologyNameNotFile(fileMatch[1])) {
          console.log(`?? [FileDetect] Found in preceding element: ${fileMatch[1]}`);
          return fileMatch[1];
        }
        
        prevEl = prevEl.previousElementSibling;
        searchDepth++;
      }
      
      // If we have command blocks (npm install, npm run), don't map to a file
      const codePreview = block.textContent?.substring(0, 50) || '';
      if (codePreview.match(/^\s*(npm|yarn|pnpm|npx)\s+/)) {
        console.log(`?? [FileDetect] Skipping command block: "${codePreview.substring(0, 30)}..."`);
        return null;
      }
      
      // Otherwise return first mention as fallback
      console.log(`?? [FileDetect] Using first mention (fallback): ${allMentions[0]}`);
      return allMentions[0];
    }
  }
  
  console.log(`?? [FileDetect] No file name detected for block`);
  return null;
}

/**
 * Check if a detected "filename" is actually a technology/framework name
 * These look like filenames but are actually technology references (Node.js, React.js, etc.)
 */
function isTechnologyNameNotFile(fileName: string): boolean {
  const techNames = [
    // JavaScript frameworks/runtimes - these are NOT files
    'node.js', 'react.js', 'vue.js', 'angular.js', 'next.js', 'nuxt.js',
    'express.js', 'nest.js', 'ember.js', 'backbone.js', 'meteor.js',
    'electron.js', 'three.js', 'd3.js', 'chart.js', 'p5.js', 'rx.js',
    'socket.io', 'deno.js', 'bun.js', 'jquery.js', 'lodash.js',
    'moment.js', 'axios.js', 'redux.js', 'mobx.js', 'svelte.js',
    'gatsby.js', 'remix.js', 'solid.js', 'preact.js', 'alpine.js',
    'lit.js', 'stimulus.js', 'turbo.js', 'hotwire.js'
  ];
  
  // Common words that get incorrectly parsed as filenames
  // e.g., "update all .tsx files" -> "all.tsx", "each .py file" -> "each.py"
  const commonWordFalsePositives = [
    'all.tsx', 'all.ts', 'all.jsx', 'all.js', 'all.py', 'all.css', 'all.json', 'all.html',
    'each.tsx', 'each.ts', 'each.jsx', 'each.js', 'each.py', 'each.css',
    'every.tsx', 'every.ts', 'every.jsx', 'every.js', 'every.py',
    'any.tsx', 'any.ts', 'any.jsx', 'any.js', 'any.py',
    'some.tsx', 'some.ts', 'some.jsx', 'some.js', 'some.py',
    'other.tsx', 'other.ts', 'other.jsx', 'other.js', 'other.py', 'other.css',
    'new.tsx', 'new.ts', 'new.jsx', 'new.js', 'new.py', 'new.css',
    'the.tsx', 'the.ts', 'the.jsx', 'the.js', 'the.py', 'the.css',
    'your.tsx', 'your.ts', 'your.jsx', 'your.js', 'your.py',
    'my.tsx', 'my.ts', 'my.jsx', 'my.js', 'my.py', 'my.css',
    'this.tsx', 'this.ts', 'this.jsx', 'this.js', 'this.py',
    'that.tsx', 'that.ts', 'that.jsx', 'that.js', 'that.py',
    'these.tsx', 'these.ts', 'these.jsx', 'these.js',
    'those.tsx', 'those.ts', 'those.jsx', 'those.js',
    'both.tsx', 'both.ts', 'both.jsx', 'both.js',
    'following.tsx', 'following.ts', 'following.jsx', 'following.js',
    'existing.tsx', 'existing.ts', 'existing.jsx', 'existing.js', 'existing.css',
    'updated.tsx', 'updated.ts', 'updated.jsx', 'updated.js', 'updated.css',
    'modified.tsx', 'modified.ts', 'modified.jsx', 'modified.js',
    'relevant.tsx', 'relevant.ts', 'relevant.jsx', 'relevant.js',
    'specific.tsx', 'specific.ts', 'specific.jsx', 'specific.js',
    'related.tsx', 'related.ts', 'related.jsx', 'related.js',
    'single.tsx', 'single.ts', 'single.jsx', 'single.js',
    'multiple.tsx', 'multiple.ts', 'multiple.jsx', 'multiple.js',
    'separate.tsx', 'separate.ts', 'separate.jsx', 'separate.js'
  ];
  
  const lowerName = fileName.toLowerCase();
  
  // Check against common word false positives
  if (commonWordFalsePositives.includes(lowerName)) {
    console.log(`?? [FileDetect] Skipping common word false positive: ${fileName}`);
    return true;
  }
  
  // Check exact match against known tech names
  if (techNames.includes(lowerName)) {
    console.log(`?? [FileDetect] Skipping technology name: ${fileName}`);
    return true;
  }
  
  // Check if it's a capitalized single word + .js (likely technology name like "Node.js")
  // Real files are usually lowercase or camelCase like "nodeUtils.js", "myNode.js"
  if (/^[A-Z][a-z]+\.js$/i.test(fileName) && fileName[0] === fileName[0].toUpperCase()) {
    const baseName = fileName.replace(/\.js$/i, '');
    // Single capitalized word under 12 chars = likely tech name
    if (baseName.length <= 12 && /^[A-Z][a-z]+$/.test(baseName)) {
      console.log(`?? [FileDetect] Skipping likely technology name: ${fileName}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Check if code content is a terminal command (not a file to apply)
 */
// Enhanced terminal command detection - checks ALL lines, not just first
// Catches multi-line bash blocks like: cd path / npm install / npm run dev
function _isMultiLineTerminalBlock(code: string): boolean {
  const trimmed = code.trim();
  const codeLines = trimmed.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (codeLines.length === 0) return false;

  const cmdPatterns = [
    /^(npm|yarn|pnpm|npx|node|deno|bun)\s/,
    /^(cd|mkdir|rm|cp|mv|ls|cat|echo|touch|chmod|chown)\s/,
    /^(git|svn|hg)\s/,
    /^(pip|python|python3|pip3)\s/,
    /^(cargo|rustup|rustc)\s/,
    /^(flutter|dart)\s/,
    /^(dotnet|nuget)\s/,
    /^(docker|kubectl|podman)\s/,
    /^(brew|apt|apt-get|yum|pacman|dnf)\s/,
    /^(curl|wget|ssh|scp)\s/,
    /^(sudo|su)\s/,
    /^(set|export|source|eval)\s/,
    /^\$\s+/,
    /^>\s+/,
    /^[A-Z]:\\/
  ];

  let cmdCount = 0;
  for (const line of codeLines) {
    for (const pattern of cmdPatterns) {
      if (pattern.test(line)) {
        cmdCount++;
        break;
      }
    }
  }

  const ratio = cmdCount / codeLines.length;
  if (ratio >= 0.8) {
    console.log(`[TerminalDetect] ${cmdCount}/${codeLines.length} lines are commands (${(ratio*100).toFixed(0)}%)`);
    return true;
  }

  return false;
}

function isTerminalCommand(code: string): boolean {
  const trimmedCode = code.trim();
  
  // Check for common command prefixes
  const commandPrefixes = [
    'npm ', 'yarn ', 'pnpm ', 'npx ',
    'node ', 'deno ', 'bun ',
    'cd ', 'mkdir ', 'rm ', 'cp ', 'mv ', 'ls ', 'cat ',
    'git ', 'svn ',
    'pip ', 'python ', 'python3 ',
    'cargo ', 'rustup ',
    'flutter ', 'dart ',
    'dotnet ', 'nuget ',
    'docker ', 'kubectl ',
    'brew ', 'apt ', 'yum ', 'pacman ',
    'curl ', 'wget ',
    'sudo '
  ];
  
  for (const prefix of commandPrefixes) {
    if (trimmedCode.startsWith(prefix) || trimmedCode.startsWith(prefix.trim())) {
      return true;
    }
  }
  
  // Check multi-line: if ALL lines are commands, skip the whole block
  if (_isMultiLineTerminalBlock(trimmedCode)) return true;

  // Check for shell-style commands
  if (trimmedCode.match(/^\$\s+/)) return true;  // $ npm install
  if (trimmedCode.match(/^>\s+/)) return true;   // > npm install
  if (trimmedCode.match(/^#.*\n?$/)) return true; // Just a comment
  
  return false;
}

function detectFileNameFromCode(code: string): string | null {
  if (code.includes('if __name__ == "__main__"') || code.includes("if __name__ == '__main__'")) return 'main.py';
  if (code.trim().startsWith('{') && code.includes('"name"') && code.includes('"version"')) return 'package.json';
  if (code.includes('<!DOCTYPE html>') || code.includes('<html')) return 'index.html';
  return null;
}

function checkAIMessageForDifferentFile(block: HTMLElement, currentFileName: string): { mentionsDifferentFile: boolean; mentionedFile: string | null } {
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (!parentMessage) return { mentionsDifferentFile: false, mentionedFile: null };
  
  const messageText = parentMessage.textContent || '';
  const messageLower = messageText.toLowerCase();
  const currentFileBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  
  const fileRegex = /\b([a-zA-Z][a-zA-Z0-9_-]*\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))\b/gi;
  
  const allMentionedFiles: string[] = [];
  let match;
  while ((match = fileRegex.exec(messageText)) !== null) {
    const fileName = match[1];
    // Skip config files and technology names
    if (!['package.json', 'tsconfig.json', 'index.html', 'index.css', 'styles.css'].includes(fileName.toLowerCase())) {
      if (!isTechnologyNameNotFile(fileName)) {
        allMentionedFiles.push(fileName);
      }
    }
  }
  
  const uniqueFiles = [...new Set(allMentionedFiles.map(f => f.toLowerCase()))];
  
  for (const mentionedFile of uniqueFiles) {
    const mentionedBase = mentionedFile.replace(/\.[^/.]+$/, '').toLowerCase();
    if (mentionedBase !== currentFileBase) {
      console.log(`?? [FileCheck] AI mentions "${mentionedFile}" but current file is "${currentFileName}"`);
      return { mentionsDifferentFile: true, mentionedFile };
    }
  }
  
  const differentFileIndicators = ['is not currently open', "isn't currently open", 'not open', "i'll open", 'will open', 'should open', 'need to open', 'please open', 'switch to', 'navigate to'];
  
  for (const indicator of differentFileIndicators) {
    if (messageLower.includes(indicator)) {
      console.log(`?? [FileCheck] AI indicates file needs to be opened: "${indicator}"`);
      for (const file of uniqueFiles) {
        if (file.toLowerCase() !== currentFileName.toLowerCase()) {
          return { mentionsDifferentFile: true, mentionedFile: file };
        }
      }
      return { mentionsDifferentFile: true, mentionedFile: uniqueFiles[0] || null };
    }
  }
  
  return { mentionsDifferentFile: false, mentionedFile: null };
}

function validateFileMatch(block: HTMLElement, code: string): FileValidation {
  const editor = getMonacoEditorForApply();
  if (!editor) return { isValid: false, detectedFileName: null, currentFileName: '', confidence: 'none', reason: 'No editor open' };
  
  const model = editor.getModel();
  if (!model) return { isValid: false, detectedFileName: null, currentFileName: '', confidence: 'none', reason: 'No file open' };
  
  const uri = model.uri?.toString() || '';
  const currentFileName = uri.split('/').pop()?.split('\\').pop() || '';
  const currentFileBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const currentFileExt = currentFileName.split('.').pop()?.toLowerCase() || '';
  
  const detectedFileName = extractTargetFileName(block, code);
  
  if (!detectedFileName) {
    return { isValid: true, detectedFileName: null, currentFileName, confidence: 'low', reason: 'No specific file mentioned - assuming current file' };
  }
  
  const detectedFileBase = detectedFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const detectedFileExt = detectedFileName.split('.').pop()?.toLowerCase() || '';
  
  if (detectedFileName.toLowerCase() === currentFileName.toLowerCase()) {
    return { isValid: true, detectedFileName, currentFileName, confidence: 'high', reason: 'Exact filename match' };
  }
  
  if (detectedFileBase === currentFileBase) {
    const tsExtensions = ['ts', 'tsx', 'js', 'jsx'];
    if (tsExtensions.includes(detectedFileExt) && tsExtensions.includes(currentFileExt)) {
      return { isValid: true, detectedFileName, currentFileName, confidence: 'medium', reason: `Similar file (${detectedFileName} ? ${currentFileName})` };
    }
  }
  
  return { isValid: false, detectedFileName, currentFileName, confidence: 'high', reason: `File mismatch: AI code is for "${detectedFileName}" but "${currentFileName}" is open` };
}

function showFileMismatchWarning(validation: FileValidation, onProceed: () => void, onCancel: () => void): void {
  document.getElementById('aca-file-mismatch-warning')?.remove();
  
  const warning = document.createElement('div');
  warning.id = 'aca-file-mismatch-warning';
  warning.className = 'aca-file-mismatch-warning';
  warning.innerHTML = `
    <div class="aca-warning-icon">??</div>
    <div class="aca-warning-content">
      <div class="aca-warning-title">File Mismatch Detected</div>
      <div class="aca-warning-text">
        AI code is for <strong>${validation.detectedFileName}</strong><br>
        but <strong>${validation.currentFileName}</strong> is currently open
      </div>
    </div>
    <div class="aca-warning-actions">
      <button class="aca-warning-btn proceed">Apply Anyway</button>
      <button class="aca-warning-btn cancel">Cancel</button>
      <button class="aca-warning-btn open-file">Open ${validation.detectedFileName}</button>
    </div>
  `;
  
  warning.querySelector('.proceed')?.addEventListener('click', () => { warning.remove(); onProceed(); });
  warning.querySelector('.cancel')?.addEventListener('click', () => { warning.remove(); onCancel(); });
  warning.querySelector('.open-file')?.addEventListener('click', () => { warning.remove(); tryOpenFile(validation.detectedFileName!); onCancel(); });
  
  document.body.appendChild(warning);
  setTimeout(() => warning.remove(), 10000);
}

function tryOpenFile(fileName: string): void {
  console.log(`?? [FileValidation] Attempting to open: ${fileName}`);
  
  if (typeof (window as any).openFile === 'function') {
    (window as any).openFile(fileName);
    return;
  }
  
  const fileItems = document.querySelectorAll('[class*="file-item"], [class*="tree-item"], [data-filename]');
  for (const item of fileItems) {
    const itemName = item.getAttribute('data-filename') || item.getAttribute('data-name') || item.textContent?.trim();
    if (itemName?.toLowerCase().includes(fileName.toLowerCase())) {
      (item as HTMLElement).click();
      showAutoApplyToast(`?? Opening ${fileName}...`, 'success');
      return;
    }
  }
  
  showAutoApplyToast(`?? Could not find ${fileName}`, 'error');
}

// ============================================================================
// AUTO-OPEN FILE AND APPLY FEATURE
// ============================================================================

function isAIProjectSearchEnabled(): boolean {
  try {
    if ((window as any).aiSearchEnabled === true) return true;
    const stored = localStorage.getItem('aiProjectSearchEnabled') || localStorage.getItem('aiFileExplorerEnabled');
    if (stored === 'true') return true;
    if ((window as any).aiFileExplorerEnabled === true) return true;
    return false;
  } catch (e) {
    console.warn('?? [AutoOpen] Error checking AI Search state:', e);
    return false;
  }
}

(window as any).setAIProjectSearchEnabled = (enabled: boolean) => {
  (window as any).aiSearchEnabled = enabled;
  localStorage.setItem('aiProjectSearchEnabled', enabled.toString());
  console.log(`?? [AutoOpen] AI Project Search set to: ${enabled ? 'ON' : 'OFF'}`);
};

(window as any).isAIProjectSearchEnabled = isAIProjectSearchEnabled;

function findFileInProject(fileName: string): { element: HTMLElement; path: string; actualFileName: string } | null {
  const fileNameLower = fileName.toLowerCase();
  console.log(`?? [FindFile] Looking for: "${fileName}"`);
  
  const elements = document.querySelectorAll('[data-path]');
  console.log(`?? [FindFile] Checking ${elements.length} elements with data-path`);
  
  for (const el of elements) {
    const path = el.getAttribute('data-path') || '';
    const pathFileName = path.split(/[/\\]/).pop() || '';
    const pathFileNameLower = pathFileName.toLowerCase();
    
    if (pathFileNameLower === fileNameLower) {
      console.log(`? [FindFile] FOUND: ${path} (actual: ${pathFileName})`);
      // Return clickable element but keep the path AND actual filename
      const clickableChild = el.querySelector('.file-name, .file-label, .filename, span[class*="name"]');
      return { 
        element: (clickableChild || el) as HTMLElement, 
        path: path,
        actualFileName: pathFileName  // Return actual case-correct filename
      };
    }
  }
  
  const allFileItems = document.querySelectorAll('.file-item, .file-tree-item, .tree-item, [class*="file"]');
  for (const el of allFileItems) {
    const textContent = el.textContent?.trim().toLowerCase() || '';
    // Only match if the text content IS the filename, or ends with the filename
    // This prevents "Node.js" from matching "tsconfig.node.json"
    const isExactMatch = textContent === fileNameLower;
    const endsWithFileName = textContent.endsWith(fileNameLower) && 
      (textContent.length === fileNameLower.length || textContent[textContent.length - fileNameLower.length - 1] === '/');
    
    if (isExactMatch || endsWithFileName) {
      const pathEl = (el as HTMLElement).closest('[data-path]') || el;
      const path = pathEl.getAttribute('data-path');
      if (path) {
        // Double check the path ends with our filename
        const pathFileName = path.split(/[/\\]/).pop() || '';
        const pathFileNameLower = pathFileName.toLowerCase();
        if (pathFileNameLower === fileNameLower) {
          console.log(`? [FindFile] FOUND by text: ${path} (actual: ${pathFileName})`);
          return { element: el as HTMLElement, path: path, actualFileName: pathFileName };
        }
      }
    }
  }
  
  console.log(`? [FindFile] NOT FOUND: ${fileName}`);
  return null;
}

// Normalize filename to match actual file in project (case-sensitive match)
function normalizeFileNameCase(fileName: string): string {
  const result = findFileInProject(fileName);
  if (result?.actualFileName) {
    console.log(`?? [NormalizeCase] "${fileName}" ? "${result.actualFileName}"`);
    return result.actualFileName;
  }
  return fileName; // Return original if not found
}

// ============================================================================
// NEW FILE CREATION - Detect and create new files mentioned by AI
// ============================================================================

interface NewFileInfo {
  fileName: string;
  relativePath: string;  // e.g., "src/Game.tsx"
  fullPath: string;      // Full system path
  isNewFile: boolean;
}

// Detect if AI is asking to create a new file
function detectNewFileIntent(block: HTMLElement): NewFileInfo | null {
  // Find the message container
  const message = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (!message) return null;
  
  const messageText = message.textContent || '';
  
  // Check for creation intent keywords
  const hasCreateIntent = /\b(create|make|add|write|new file|let'?s create|let us create)\b/i.test(messageText);
  if (!hasCreateIntent) return null;
  
  console.log(`?? [NewFile] Checking for new file intent in message...`);
  
  // Patterns to extract filename - ordered by specificity
  const fileNamePatterns = [
    // "create a new file called Game.tsx" or "create a file called `Game.tsx`"
    /(?:create|make|add|write)\s+(?:a\s+)?(?:new\s+)?file\s+(?:called|named)\s*[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
    // "let's create Game.tsx" or "create `Game.tsx`"
    /(?:let'?s?\s+)?(?:create|make)\s+[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
    // "new file Game.tsx"
    /new\s+file\s+[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
  ];
  
  // Patterns to extract directory
  const dirPatterns = [
    // "in the src directory" or "in the `src` directory"
    /in\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?\s+(?:directory|folder)/i,
    // "inside src" or "inside the src folder"
    /inside\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?/i,
  ];
  
  // Try to find the file name
  let fileName: string | null = null;
  for (const pattern of fileNamePatterns) {
    const match = messageText.match(pattern);
    if (match) {
      fileName = match[1];
      console.log(`?? [NewFile] Found filename: ${fileName}`);
      break;
    }
  }
  
  if (!fileName) {
    console.log(`?? [NewFile] No filename found in message`);
    return null;
  }
  
  // Check if this file already exists in project
  const existing = findFileInProject(fileName);
  if (existing) {
    console.log(`?? [NewFile] File "${fileName}" already exists in project`);
    return null;
  }
  
  // Try to find the directory
  let targetDir = '';
  for (const pattern of dirPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      targetDir = match[1].replace(/[`"']/g, '');
      console.log(`?? [NewFile] Found directory: ${targetDir}`);
      break;
    }
  }
  
  // Default to src/components for component files, src for others
  if (!targetDir) {
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    if (fileExt === 'tsx' || fileExt === 'jsx' || fileExt === 'css' || fileExt === 'scss') {
      targetDir = 'src/components';
    } else {
      targetDir = 'src';
    }
    console.log(`?? [NewFile] Defaulting to ${targetDir} directory`);
  }
  
  // Construct relative path
  let relativePath = `${targetDir}/${fileName}`;
  relativePath = relativePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  
  // Get project path
  const projectPath = (window as any).currentProjectPath || 
                     (window as any).currentFolderPath || '';
  
  const fullPath = projectPath ? 
    `${projectPath}/${relativePath}`.replace(/\\/g, '/').replace(/\/+/g, '/') : 
    relativePath;
  
  console.log(`?? [NewFile] Detected new file: ${fileName} at ${fullPath}`);
  
  return {
    fileName,
    relativePath,
    fullPath,
    isNewFile: true
  };
}

// Create a new file in the file system
async function createNewFile(fullPath: string, content: string): Promise<boolean> {
  console.log(`?? [CreateFile] Creating: ${fullPath}`);
  
  try {
    const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
    
    if (invoke) {
      // First try to create parent directories if needed
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      try {
        await invoke('create_dir_all', { path: dirPath });
      } catch (e) {
        // Directory might already exist, continue
      }
      
      // Write the file
      await invoke('write_file', { path: fullPath, content: content });
      console.log(`? [CreateFile] File created successfully: ${fullPath}`);
      
      // Trigger file tree refresh
      document.dispatchEvent(new CustomEvent('refresh-file-tree'));
      document.dispatchEvent(new CustomEvent('file-created', { detail: { path: fullPath } }));
      
      // Try to refresh the file explorer
      const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"], [data-action="refresh"]');
      if (refreshBtn) {
        (refreshBtn as HTMLElement).click();
      }
      
      return true;
    }
    
    // Fallback: try window.createFile if available
    const createFile = (window as any).createFile;
    if (createFile) {
      await createFile(fullPath, content);
      console.log(`? [CreateFile] File created via window.createFile`);
      return true;
    }
    
    // Fallback: try fs plugin
    const fs = (window as any).__TAURI__?.fs;
    if (fs?.writeTextFile) {
      await fs.writeTextFile(fullPath, content);
      console.log(`? [CreateFile] File created via fs plugin`);
      return true;
    }
    
    console.error('? [CreateFile] No file creation method available');
    return false;
  } catch (e: any) {
    console.error(`? [CreateFile] Failed to create file:`, e?.message || e);
    return false;
  }
}

// Extract target path from code block context (checks for // src/filename.tsx comments)
function extractTargetPath(block: HTMLElement, code: string): string | null {
  // Check first few lines for path comments like "// src/Game.tsx" or "// src/components/Button.tsx"
  const lines = code.split('\n').slice(0, 5);
  for (const line of lines) {
    const pathMatch = line.match(/^\/\/\s*([a-zA-Z0-9_./\\-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))\s*$/);
    if (pathMatch) {
      console.log(`?? [TargetPath] Found path comment: ${pathMatch[1]}`);
      return pathMatch[1];
    }
  }
  
  // Also check for path in message context
  const message = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (message) {
    const messageText = message.textContent || '';
    // Look for "in the src directory" or similar
    const dirMatch = messageText.match(/in\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?\s+(?:directory|folder)/i);
    if (dirMatch) {
      const fileName = extractTargetFileName(block, code);
      if (fileName) {
        return `${dirMatch[1]}/${fileName}`;
      }
    }
  }
  
  return null;
}

/**
 * Opens a file in the editor and waits for it to be ready
 * FIXED v1.1: Uses window.openFileInTab to ensure tab is created
 */
async function openFileAndWait(fileName: string, maxWaitMs: number = 5000): Promise<boolean> {
  // Normalize filename case to match actual file in project
  const normalizedName = normalizeFileNameCase(fileName);
  if (normalizedName !== fileName) {
    console.log(`?? [OpenFile] Case normalized: "${fileName}" ? "${normalizedName}"`);
    fileName = normalizedName;
  }
  
  console.log(`?? [OpenFile] Opening: ${fileName}`);
  
  // Check if file is already open
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    const currentFile = model?.uri?.path?.split('/').pop()?.toLowerCase() || '';
    if (currentFile === fileName.toLowerCase()) {
      console.log(`? [OpenFile] File already open: ${fileName}`);
      return true;
    }
  }
  
  // Find full path first (needed for openFileInTab)
  const fileResult = findFileInProject(fileName);
  const fullPath = fileResult?.path || '';
  
  // ==========================================================================
  // Method 0: Use window.openFileInTab (BEST - creates tab AND opens file)
  // This is the PRIMARY fix! Must be tried FIRST.
  // ==========================================================================
  if (fullPath && typeof (window as any).openFileInTab === 'function') {
    console.log(`?? [OpenFile] Using window.openFileInTab (creates tab): ${fullPath}`);
    try {
      await (window as any).openFileInTab(fullPath, 1);
      await new Promise(r => setTimeout(r, 300));
      
      const opened = await waitForFileInEditor(fileName, 3000);
      if (opened) {
        console.log(`? [OpenFile] Opened via openFileInTab (with tab!)`);
        return true;
      }
    } catch (e) {
      console.warn(`?? [OpenFile] openFileInTab failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 1: Use tabManager.openFile or openFileByName
  // ==========================================================================
  const tabManager = (window as any).tabManager;
  
  // Try tabManager.openFile with full path (preferred)
  if (fullPath && tabManager?.openFile) {
    try {
      console.log(`?? [OpenFile] Using tabManager.openFile: ${fullPath}`);
      await tabManager.openFile(fullPath);
      await new Promise(r => setTimeout(r, 300));
      
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`? [OpenFile] Opened via tabManager.openFile`);
        return true;
      }
    } catch (e) {
      console.log(`?? [OpenFile] tabManager.openFile failed:`, e);
    }
  }
  
  // Try tabManager.openFileByName
  if (tabManager?.openFileByName) {
    try {
      console.log(`?? [OpenFile] Using tabManager.openFileByName: ${fileName}`);
      await tabManager.openFileByName(fileName);
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`? [OpenFile] Opened via tabManager.openFileByName`);
        return true;
      }
    } catch (e) {
      console.log(`?? [OpenFile] tabManager.openFileByName failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 2: Find file in project tree and double-click
  // ==========================================================================
  if (fileResult) {
    const { element: fileElement, path: foundPath } = fileResult;
    console.log(`?? [OpenFile] Found in tree: ${foundPath}`);
    
    try {
      fileElement.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      await new Promise(r => setTimeout(r, 50));
      
      // Dispatch double-click
      fileElement.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true, cancelable: true, view: window,
        clientX: fileElement.getBoundingClientRect().left + 10,
        clientY: fileElement.getBoundingClientRect().top + 10
      }));
      
      console.log(`?? [OpenFile] Double-click dispatched`);
      
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`? [OpenFile] File opened via double-click`);
        return true;
      }
    } catch (err) {
      console.error(`?? [OpenFile] Double-click method failed:`, err);
    }
    
    // ==========================================================================
    // Method 3: Fallback - window.openFile (NO TAB - last resort only!)
    // ==========================================================================
    if (foundPath && typeof (window as any).openFile === 'function') {
      try {
        console.log(`?? [OpenFile] Fallback: window.openFile (no tab): ${foundPath}`);
        await (window as any).openFile(foundPath);
        
        // Try to create a tab manually after opening
        document.dispatchEvent(new CustomEvent('file-opened-programmatically', { 
          detail: { path: foundPath, fileName, createTab: true } 
        }));
        
        await new Promise(r => setTimeout(r, 200));
        const opened = await waitForFileInEditor(fileName, maxWaitMs);
        if (opened) {
          console.log(`? [OpenFile] Opened via window.openFile`);
          return true;
        }
      } catch (err) {
        console.error(`? [OpenFile] window.openFile error:`, err);
      }
    }
    
    // Try single click as fallback
    fileElement.click();
    await new Promise(r => setTimeout(r, 500));
    const openedAfterClick = await waitForFileInEditor(fileName, 2000);
    if (openedAfterClick) {
      console.log(`? [OpenFile] Opened via single click`);
      return true;
    }
  }
  
  // ==========================================================================
  // Method 4: Dispatch custom event for file system to handle
  // ==========================================================================
  document.dispatchEvent(new CustomEvent('request-open-file', { 
    detail: { fileName, name: fileName }
  }));
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Final verification
  const finalCheck = await waitForFileInEditor(fileName, 2000);
  if (finalCheck) {
    console.log(`? [OpenFile] File opened after custom event`);
    return true;
  }
  
  console.log(`? [OpenFile] All methods failed for: ${fileName}`);
  return false;
}

async function waitForFileInEditor(fileName: string, maxWaitMs: number): Promise<boolean> {
  const fileNameLower = fileName.toLowerCase();
  const fileBase = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const startTime = Date.now();
  
  console.log(`? [WaitFile] Waiting for "${fileName}" to open in editor...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, 100));
    
    // Try multiple ways to get the current file
    let currentFile = '';
    let currentPath = '';
    
    // Method 1: Monaco editor model
    const editor = getMonacoEditorForApply();
    if (editor) {
      const model = editor.getModel();
      if (model?.uri?.path) {
        currentPath = model.uri.path;
        currentFile = currentPath.split('/').pop()?.toLowerCase() || '';
      }
    }
    
    // Method 2: Check active tab
    if (!currentFile) {
      const tabManager = (window as any).tabManager;
      if (tabManager?.getActiveTab) {
        const activeTab = tabManager.getActiveTab();
        if (activeTab?.path || activeTab?.fileName) {
          const tabPath = activeTab.path || activeTab.fileName;
          currentPath = tabPath;
          currentFile = tabPath.split(/[/\\]/).pop()?.toLowerCase() || '';
        }
      }
    }
    
    // Method 3: Check breadcrumb path attribute or text
    if (!currentFile) {
      const breadcrumb = document.querySelector('.breadcrumb-container, .breadcrumb, [class*="breadcrumb"]');
      if (breadcrumb) {
        // Try data attribute first
        const pathAttr = breadcrumb.getAttribute('data-path') || breadcrumb.getAttribute('data-file-path');
        if (pathAttr) {
          currentPath = pathAttr;
          currentFile = pathAttr.split(/[/\\]/).pop()?.toLowerCase() || '';
        } else {
          // Try text content
          const lastPart = breadcrumb.querySelector('.breadcrumb-filename, span:last-child, .filename');
          if (lastPart) {
            currentFile = lastPart.textContent?.trim().toLowerCase() || '';
          }
        }
      }
    }
    
    // Method 4: Check tab bar active tab
    if (!currentFile) {
      const activeTab = document.querySelector('.tab.active, .editor-tab.active, [class*="tab"][class*="active"]');
      if (activeTab) {
        const tabName = activeTab.querySelector('.tab-name, .tab-title, span')?.textContent?.trim() || 
                        activeTab.getAttribute('data-filename') ||
                        activeTab.getAttribute('title');
        if (tabName) {
          currentFile = tabName.toLowerCase().replace(/[�*]/g, '').trim();
        }
      }
    }
    
    // Method 5: Check window title
    if (!currentFile && document.title) {
      const titleMatch = document.title.match(/([^/\\]+\.\w+)/);
      if (titleMatch) {
        currentFile = titleMatch[1].toLowerCase();
      }
    }
    
    // Check if we found the file
    if (currentFile) {
      const currentBase = currentFile.replace(/\.[^/.]+$/, '').toLowerCase();
      
      // Various matching strategies
      const isMatch = 
        currentFile === fileNameLower ||
        currentBase === fileBase ||
        currentFile.endsWith(fileNameLower) ||
        currentPath.toLowerCase().endsWith(fileNameLower) ||
        currentPath.toLowerCase().includes(fileName.toLowerCase());
      
      if (isMatch) {
        console.log(`? [WaitFile] File detected: "${currentFile}" (path: ${currentPath || 'n/a'})`);
        await new Promise(r => setTimeout(r, 150)); // Brief stabilization delay
        return true;
      }
    }
  }
  
  // Final check - just verify we have an editor with content
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    if (model) {
      const finalPath = model.uri?.path || '';
      const finalFile = finalPath.split('/').pop()?.toLowerCase() || '';
      console.log(`? [WaitFile] Final check - editor has: "${finalFile}"`);
      
      // If the file matches OR if we just have some editor open, consider it success
      // (the file detection might have race conditions)
      if (finalFile === fileNameLower || finalFile.replace(/\.[^/.]+$/, '') === fileBase) {
        console.log(`? [WaitFile] File found on final check`);
        return true;
      }
    }
  }
  
  console.log(`?? [WaitFile] Timeout - "${fileName}" not detected after ${maxWaitMs}ms`);
  return false;
}

interface PendingAutoApply {
  fileName: string;
  code: string;
  blockId: string;
  block: HTMLElement;
}
let pendingAutoApply: PendingAutoApply | null = null;

interface MultiFileApplyItem {
  fileName: string;
  code: string;
  blockId: string;
  block: HTMLElement;
  language: string;
}
let multiFileQueue: MultiFileApplyItem[] = [];
let isProcessingMultiFile = false;

// ============================================================================
// ?? MULTI-FILE CHECK FUNCTION FOR INTEGRATION
// ============================================================================

/**
 * Check if this is a multi-file update that should be handled by multiFileAutonomous
 * Returns true if multi-file system will handle it, false for single-file processing
 */
function shouldUseMultiFileSystem(block: HTMLElement | null): boolean {
  if (!block) return false;
  
  // Find the AI message containing this block
  const aiMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]') as HTMLElement;
  if (!aiMessage) return false;
  
  // Check if multi-file system is already handling a session
  const currentSession = getCurrentMultiFileSession?.();
  if (currentSession) {
    const status = currentSession.status;
    if (status === 'processing' || status === 'awaiting-confirmation') {
      console.log('?? [AutoApply] Multi-file session active, deferring to multi-file system');
      return true;
    }
  }
  
  // Scan for multiple file mentions in the AI message
  const mentionedFiles = scanAIMessageForFiles?.(aiMessage) || [];
  
  if (mentionedFiles.length >= 2) {
    console.log(`?? [AutoApply] Multi-file update detected (${mentionedFiles.length} files): ${mentionedFiles.join(', ')}`);
    console.log('?? [AutoApply] Deferring to multi-file autonomous system');
    return true;
  }
  
  return false;
}

async function processMultiFileApply(): Promise<void> {
  // ========== GUARDS ==========
  if (!autoApplyEnabled) {
    console.log('?? [MultiFile] Auto-apply is disabled');
    return;
  }
  
  if (isProcessingMultiFile) {
    return; // Silent skip - already processing
  }
  
  if (isTypingInProgress) {
    return; // Skip if typing in progress
  }
  
  isProcessingMultiFile = true;
  (window as any).surgicalBridge?.enterMultiFileGuard();  // ?? Disable surgical mode during multi-file
  console.log(`\n?? [MultiFile] ========== STARTING MULTI-FILE APPLY ==========`);
  
  // Show the status dialog immediately
  showStatusDialog();
  updateStatusText('Scanning code blocks...');
  updateProgress(5);
  
  // Remove any existing confirmation bar
  const existingBar = document.querySelector('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar');
  if (existingBar) {
    existingBar.remove();
    hasUnapprovedChanges = false;
  }
  
  // Track changes for final confirmation
  interface FileChange {
    fileName: string;
    fullPath: string;
    originalContent: string;
    newContent: string;
    changesSummary: string;
    block: HTMLElement;
    blockId: string;
  }
  const appliedChanges: FileChange[] = [];
  
  try {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length === 0) {
      console.log('?? [MultiFile] No unprocessed blocks');
      addStatusLog('No code blocks to process', 'warning');
      updateStatusText('No code blocks found');
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
      return;
    }
    
    console.log(`?? [MultiFile] Found ${unprocessedBlocks.length} unprocessed block(s)`);
    addStatusLog(`Found ${unprocessedBlocks.length} code block(s)`, 'info');
    updateProgress(10);
    
    // Group blocks by target file
    const fileBlocks: Map<string, MultiFileApplyItem[]> = new Map();
    
    let blockNum = 0;
    for (const block of unprocessedBlocks) {
      blockNum++;
      console.log(`\n?? [MultiFile] Analyzing block ${blockNum}/${unprocessedBlocks.length}...`);
      
      const codeInfo = extractCodeFromBlockForApply(block);
      if (!codeInfo || !codeInfo.code.trim()) {
        console.log(`  ?? Skipping: No code content found`);
        continue;
      }
      
      console.log(`  ?? Code: ${codeInfo.code.substring(0, 80).replace(/\n/g, '?')}...`);
      console.log(`  ?? Language: ${codeInfo.language}`);
      console.log(`  ?? Lines: ${codeInfo.code.split('\n').length}`);
      
      // FIX: Skip blocks with bash/shell/terminal language tag
      const _termLangs = ['bash', 'shell', 'sh', 'zsh', 'bat', 'cmd', 'powershell', 'ps1', 'terminal', 'console', 'dos', 'bas'];
      if (_termLangs.includes(codeInfo.language?.toLowerCase())) {
        console.log(`  Skipping: Terminal language detected (${codeInfo.language})`);
        const langId = generateBlockId(block);
        processedBlockIds.add(langId);
        markBlockAsChecked(block, langId);
        continue;
      }

      // ? NEW: Skip terminal commands (npm, yarn, etc.)
      if (isTerminalCommand(codeInfo.code)) {
        console.log(`  ?? Skipping: Terminal command detected`);
        const cmdId = generateBlockId(block);
        processedBlockIds.add(cmdId);
        markBlockAsChecked(block, cmdId);
        continue;
      }
      
      let detectedFileName = extractTargetFileName(block, codeInfo.code);
      console.log(`  ?? Detected filename: ${detectedFileName || '(none)'}`);
      
      if (!detectedFileName) {
        console.log(`  ?? Skipping: Could not detect target file`);
        continue;
      }
      
      if (isTechnologyNameNotFile(detectedFileName)) {
        console.log(`  ?? Skipping: "${detectedFileName}" is a technology name, not a file`);
        continue;
      }
      
      // ===== NORMALIZE FILENAME CASE =====
      // AI might say "app.css" but actual file is "App.css"
      const normalizedFileName = normalizeFileNameCase(detectedFileName);
      if (normalizedFileName !== detectedFileName) {
        console.log(`?? [MultiFile] Case normalized: "${detectedFileName}" ? "${normalizedFileName}"`);
        detectedFileName = normalizedFileName;
      }
      
      // ===== SNIPPET FILTER: Skip tiny code blocks that are just examples =====
      const codeLines = codeInfo.code.trim().split('\n').filter(line => line.trim());
      const minLines = 5; // Minimum lines to be considered a real file update (increased from 3)
      
      if (codeLines.length < minLines) {
        console.log(`?? [Apply] Skipping snippet (${codeLines.length} lines < ${minLines} min): ${detectedFileName}`);
        // Mark as processed so it doesn't keep trying
        const snippetId = generateBlockId(block);
        processedBlockIds.add(snippetId);
        markBlockAsChecked(block, snippetId);
        continue;
      }
      
      // Skip PLAINTEXT blocks ONLY if they have very few lines and filename doesn't have a code extension
      // This prevents skipping valid code that just wasn't detected properly
      if (codeInfo.language?.toLowerCase() === 'plaintext') {
        // ? FIX: Include C/C++ extensions (.h, .c, .cpp, .ino)
        const hasCodeExtension = /\.(tsx?|jsx?|py|rs|css|scss|html|json|xml|vue|svelte|go|rb|php|cs|java|c|h|cpp|hpp|ino|pde)$/i.test(detectedFileName);
        if (!hasCodeExtension || codeLines.length < 5) {
          console.log(`?? [Apply] Skipping PLAINTEXT block (no code extension or < 5 lines): ${detectedFileName}`);
          const plaintextId = generateBlockId(block);
          processedBlockIds.add(plaintextId);
          markBlockAsChecked(block, plaintextId);
          continue;
        }
        // If it has a code extension and enough lines, try to infer language from extension
        const ext = detectedFileName.split('.').pop()?.toLowerCase();
        if (ext) {
          const extLangMap: Record<string, string> = {
            'tsx': 'typescript', 'ts': 'typescript',
            'jsx': 'javascript', 'js': 'javascript',
            'css': 'css', 'scss': 'scss',
            'html': 'html', 'json': 'json',
            'py': 'python', 'rs': 'rust',
            'vue': 'vue', 'svelte': 'svelte',
            // ? FIX: Add C/C++ extensions
            'c': 'c', 'h': 'c', 'cpp': 'cpp', 'hpp': 'cpp',
            'ino': 'c', 'pde': 'c'  // Arduino
          };
          if (extLangMap[ext]) {
            codeInfo.language = extLangMap[ext];
            console.log(`?? [Apply] Inferred language from extension: ${codeInfo.language}`);
          }
        }
      }
      
      // Skip if the code is just an import statement (common in AI explanations)
      const trimmedCode = codeInfo.code.trim();
      if (trimmedCode.startsWith('import ') && codeLines.length <= 3) {
        console.log(`?? [Apply] Skipping import-only snippet: ${detectedFileName}`);
        const importId = generateBlockId(block);
        processedBlockIds.add(importId);
        markBlockAsChecked(block, importId);
        continue;
      }
      
      // ===== NEW: Skip "explanation" snippets =====
      // Detect when AI is just showing existing code, not providing new code
      const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
      if (parentMessage) {
        const messageText = parentMessage.textContent?.toLowerCase() || '';
        
        // Patterns that indicate AI is explaining/showing code, not replacing
        const explanationPatterns = [
          /line\s*\d+\s*(is|shows?|contains?|has)/i,
          /this\s+line\s+(is|imports?|exports?|defines?)/i,
          /here('s| is)\s+(the\s+)?(line|code)/i,
          /the\s+code\s+(at|on|in)\s+line/i,
          /currently\s+(shows?|has|contains?)/i,
          /this\s+(imports?|exports?|defines?)/i,
        ];
        
        const isExplanation = explanationPatterns.some(p => p.test(messageText));
        
        if (isExplanation && codeLines.length <= 5) {
          console.log(`?? [Apply] Skipping explanation snippet: ${detectedFileName} (AI is explaining, not replacing)`);
          const explainId = generateBlockId(block);
          processedBlockIds.add(explainId);
          markBlockAsChecked(block, explainId);
          continue;
        }
      }
      
      // ===== NEW: Skip if code already exists in target file =====
      // This prevents AI "quoting" existing code from being applied as replacement
      const existingFile = findFileInProject(detectedFileName);
      if (existingFile) {
        try {
          // Try to check if this exact code already exists in the file
          const editor = getMonacoEditorForApply();
          if (editor) {
            const model = editor.getModel();
            const currentFile = model?.uri?.path?.split('/').pop()?.toLowerCase() || '';
            
            // If we can check the current open file
            if (currentFile === detectedFileName.toLowerCase()) {
              const existingContent = model?.getValue() || '';
              const newCodeNormalized = trimmedCode.replace(/\s+/g, ' ').trim();
              const existingNormalized = existingContent.replace(/\s+/g, ' ').trim();
              
              // If the new code is a subset of existing code (AI is quoting)
              if (existingNormalized.includes(newCodeNormalized) && codeLines.length < 10) {
                console.log(`?? [Apply] Skipping quoted code - already exists in file: ${detectedFileName}`);
                const quoteId = generateBlockId(block);
                processedBlockIds.add(quoteId);
                markBlockAsChecked(block, quoteId);
                continue;
              }
            }
          }
        } catch (e) {
          // Ignore errors, continue with normal processing
        }
      }
      // ===== END SNIPPET FILTER =====
      
      const blockId = generateBlockId(block);
      if (processedBlockIds.has(blockId)) {
        console.log(`  ?? Block already processed (${blockId})`);
        continue;
      }
      
      console.log(`  ? Adding to file: ${detectedFileName}`);
      
      const key = detectedFileName.toLowerCase();
      if (!fileBlocks.has(key)) fileBlocks.set(key, []);
      fileBlocks.get(key)!.push({
        fileName: detectedFileName,
        code: codeInfo.code,
        blockId,
        block,
        language: codeInfo.language
      });
    }
    
    // ? Summary of detected files
    console.log(`\n?? [MultiFile] === FILE DETECTION SUMMARY ===`);
    console.log(`?? Total blocks found: ${unprocessedBlocks.length}`);
    console.log(`?? Files detected: ${fileBlocks.size}`);
    if (fileBlocks.size > 0) {
      const fileList = Array.from(fileBlocks.keys()).map(k => {
        const blocks = fileBlocks.get(k)!;
        return `${blocks[0].fileName} (${blocks.length} block(s), ${blocks[0].code.split('\n').length} lines)`;
      });
      fileList.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    console.log(`?? ==============================\n`);
    
    if (fileBlocks.size === 0) {
      console.log('?? [MultiFile] No valid file targets');
      addStatusLog('No valid files to process', 'warning');
      updateStatusText('No valid files found');
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
      return;
    }
    
    console.log(`?? [MultiFile] Processing ${fileBlocks.size} file(s)`);
    addStatusLog(`Processing ${fileBlocks.size} file(s)`, 'info');
    updateStatusText(`Applying changes to ${fileBlocks.size} file(s)...`);
    updateProgress(20);
    
    // Initialize file list display - use actual filename from first block (not the lowercase key)
    const fileKeys = Array.from(fileBlocks.keys());
    const fileStatusList = fileKeys.map(key => {
      const blocks = fileBlocks.get(key)!;
      return { fileName: blocks[0].fileName, status: 'pending' as const };  // Use actual case-correct filename
    });
    updateFileList(fileStatusList);
    
    let errorCount = 0;
    
    // PHASE 1: Apply all changes (no saving yet)
    if (fileKeys.length > 1) { (window as any).surgicalBridge?.enterMultiFileGuard(); }
    for (let i = 0; i < fileKeys.length; i++) {
      const blocks = fileBlocks.get(fileKeys[i])!;
      blocks.sort((a, b) => b.code.length - a.code.length);
      const item = blocks[0];
      
      // Update progress
      const progressPercent = 20 + ((i / fileKeys.length) * 60);
      updateProgress(progressPercent);
      
      // Update file status to processing
      fileStatusList[i].status = 'processing';
      updateFileList(fileStatusList);
      
      console.log(`\n?? [MultiFile] File ${i + 1}/${fileKeys.length}: ${item.fileName}`);
      addStatusLog(`[${i + 1}/${fileKeys.length}] Processing ${item.fileName}`, 'info');
      updateStatusText(`Processing ${item.fileName}...`);
      
      try {
        // Check if file is already open
        const editor = getMonacoEditorForApply();
        const currentFile = editor?.getModel()?.uri?.path?.split('/').pop()?.toLowerCase() || '';
        
        // Open file if needed
        let fileOpened = currentFile === item.fileName.toLowerCase();
        
        if (!fileOpened) {
          console.log(`?? [MultiFile] Opening: ${item.fileName}`);
          addStatusLog(`Opening ${item.fileName}...`, 'info');
          
          // Try opening with longer timeout
          fileOpened = await openFileAndWait(item.fileName, 6000);
          
          if (!fileOpened) {
            // ===== NEW FILE CREATION =====
            // Check if AI wants to create a new file
            const newFileInfo = detectNewFileIntent(item.block);
            const targetPath = extractTargetPath(item.block, item.code);
            
            if (newFileInfo || targetPath || !findFileInProject(item.fileName)) {
              console.log(`?? [MultiFile] File doesn't exist - attempting to create new file`);
              addStatusLog(`Creating new file: ${item.fileName}`, 'info');
              
              // Determine full path for new file
              const projectPath = (window as any).currentProjectPath || 
                                 (window as any).currentFolderPath || '';
              
              let fullNewPath = '';
              if (newFileInfo?.fullPath) {
                fullNewPath = newFileInfo.fullPath;
              } else if (targetPath) {
                fullNewPath = projectPath ? `${projectPath}/${targetPath}` : targetPath;
              } else {
                // Default to src/components for component files, src for others
                const fileExt = item.fileName.split('.').pop()?.toLowerCase() || '';
                const defaultDir = (fileExt === 'tsx' || fileExt === 'jsx' || fileExt === 'css' || fileExt === 'scss') 
                  ? 'src/components' : 'src';
                fullNewPath = projectPath ? `${projectPath}/${defaultDir}/${item.fileName}` : `${defaultDir}/${item.fileName}`;
                console.log(`?? [MultiFile] Using default: ${defaultDir}`);
              }
              
              // Normalize path
              fullNewPath = fullNewPath.replace(/\\/g, '/').replace(/\/+/g, '/');
              
              console.log(`?? [MultiFile] Creating file at: ${fullNewPath}`);
              
              // Show toast notification
              showAutoApplyToast(`?? Creating new file: ${item.fileName}`, 'info');
              
              // Create the new file with the code content
              const created = await createNewFile(fullNewPath, item.code);
              
              if (created) {
                addStatusLog(`? Created: ${item.fileName}`, 'success');
                
                // Wait for file tree to refresh
                await new Promise(r => setTimeout(r, 500));
                
                // Try to open the newly created file
                fileOpened = await openFileAndWait(item.fileName, 5000);
                
                if (fileOpened) {
                  console.log(`? [MultiFile] New file created and opened: ${item.fileName}`);
                  
                  // Mark as success - file is already created with content
                  fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: `+${item.code.split('\n').length} lines (new file)` };
                  updateFileList(fileStatusList);
                  
                  // Track this change
                  appliedChanges.push({
                    fileName: item.fileName,
                    fullPath: fullNewPath,
                    originalContent: '',
                    newContent: item.code,
                    changesSummary: `+${item.code.split('\n').length} -0 ~0`,
                    block: item.block,
                    blockId: item.blockId
                  });
                  
                  // Mark block as processed
                  processedBlockIds.add(item.blockId);
                  markBlockAsApplied(item.block, item.blockId, `+${item.code.split('\n').length} -0 ~0`);
                  
                  continue; // Skip to next file
                }
              } else {
                addStatusLog(`? Failed to create ${item.fileName}`, 'error');
              }
            }
            // ===== END NEW FILE CREATION =====
            
            // Wait a bit more and check again - file might be loading
            console.log(`? [MultiFile] First attempt failed, waiting additional 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            
            // Re-check if file is now in editor
            const editorCheck = getMonacoEditorForApply();
            const modelCheck = editorCheck?.getModel();
            const checkFile = modelCheck?.uri?.path?.split('/').pop()?.toLowerCase() || '';
            
            if (checkFile === item.fileName.toLowerCase()) {
              console.log(`? [MultiFile] File appeared after extra wait`);
              fileOpened = true;
            } else if (modelCheck && modelCheck.getValue().length > 0) {
              // Editor has content - might be the right file with different detection
              console.log(`?? [MultiFile] Editor has content (${modelCheck.getValue().length} chars), proceeding...`);
              addStatusLog(`Proceeding with current editor content...`, 'warning');
              fileOpened = true;
            } else {
              console.log(`? [MultiFile] Could not open: ${item.fileName}`);
              addStatusLog(`Failed to open ${item.fileName}`, 'error');
              fileStatusList[i].status = 'error';
              updateFileList(fileStatusList);
          // Pipeline: End on error
          if (surgicalPipeline.isActive()) { surgicalPipeline.end(false); }
              errorCount++;
              continue;
            }
          }
          
          // Extra stabilization delay after opening
          await new Promise(r => setTimeout(r, 300));
        }
        
        // Store original content BEFORE applying
        const editorNow = getMonacoEditorForApply();
        const modelNow = editorNow?.getModel();
        const originalContent = modelNow?.getValue() || '';
        
        // Get full path
        let fullPath = modelNow?.uri?.path || '';
        if (fullPath.startsWith('/') && fullPath.charAt(2) === ':') {
          fullPath = fullPath.substring(1);
        }
        
        addStatusLog(`Analyzing changes...`, 'info');
        
                // Pipeline: Start for this file
        surgicalPipeline.begin();
        surgicalPipeline.enter(0, 'Code block found');
        surgicalPipeline.complete(0, blocks.length + ' block(s) detected');
        surgicalPipeline.enter(1, item.code.split('\n').length + ' lines');
        surgicalPipeline.complete(1, item.code.split('\n').length + ' lines');

        // Apply code (but don't save yet)
        const result = await applySmartUpdate(item.code);
        
        if (result.success && result.message !== 'No changes needed') {
          // Pipeline: Stage 7 - Confirm success
          if (surgicalPipeline.isActive()) {
            surgicalPipeline.enter(7, 'Applied successfully');
            surgicalPipeline.complete(7, result.message);
            surgicalPipeline.end(true);
      setTimeout(() => { const d = document.getElementById("ai-status-dialog"); if (d) { d.style.transition = "opacity 0.4s"; d.style.opacity = "0"; setTimeout(() => d.remove(), 420); } }, 3000); // X02: auto-dismiss
          }
          console.log(`? [Apply] Applied to ${item.fileName}: ${result.message}`);
          addStatusLog(`Applied: ${result.message}`, 'success');
          
          // Mark block with green badge showing changes in header
          markBlockAsApplied(item.block, item.blockId, result.message);
          
          // Update file status
          fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: result.message };
          updateFileList(fileStatusList);
          
          // Remove any existing confirmation bar (we'll show unified bar at the end)
          document.querySelectorAll('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar').forEach(b => b.remove());
          
          // Store this change for later
          appliedChanges.push({
            fileName: item.fileName,
            fullPath,
            originalContent,
            newContent: item.code, // FIX: Use AI code, not model (FastApply turbo only decorates)
            changesSummary: result.message,
            block: item.block,
            blockId: item.blockId
          });
          
          for (const b of blocks) processedBlockIds.add(b.blockId);
          
        } else if (result.message === 'No changes needed') {
          console.log(`?? [Apply] ${item.fileName}: No changes needed`);
          addStatusLog(`No changes needed`, 'info');
          fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: 'No changes' };
          updateFileList(fileStatusList);
          markBlockAsChecked(item.block, item.blockId);
          processedBlockIds.add(item.blockId);
          for (const b of blocks) processedBlockIds.add(b.blockId);
        } else {
          console.log(`?? [MultiFile] ${item.fileName}: ${result.message}`);
          addStatusLog(`${result.message}`, 'warning');
          fileStatusList[i].status = 'error';
          updateFileList(fileStatusList);
          errorCount++;
        }
        
        // Brief delay between files
        if (i < fileKeys.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
        
      } catch (error) {
        console.error(`? [MultiFile] Error with ${item.fileName}:`, error);
        fileStatusList[i].status = 'error';
        updateFileList(fileStatusList);
        errorCount++;
      }
    }
    
    // Mark message as processed
    markMessageProcessed();
    
    // Update progress to 90%
    updateProgress(90);
    
    // PHASE 2: Show confirmation dialog for all changes (unified UI)
    if (appliedChanges.length > 0) {
      console.log(`\n?? [Confirm] Showing confirmation for ${appliedChanges.length} file(s)`);
      addStatusLog(`Ready: ${appliedChanges.length} file(s) modified`, 'success');
      updateStatusText('Changes applied - awaiting confirmation');
      updateProgress(100);
      
      // Extend dialog to show Accept/Reject buttons
      showMultiFileConfirmationBar(appliedChanges, errorCount);
    } else if (errorCount === 0) {
      addStatusLog('No changes needed', 'info');
      updateStatusText('No changes needed');
      updateProgress(100);
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
    } else {
      addStatusLog(`Completed with ${errorCount} error(s)`, 'error');
      updateStatusText(`Errors: ${errorCount}`);
      updateProgress(100);
      setTimeout(() => closeStatusDialog(), 2000);
      isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
    }
    
  } catch (error) {
    console.error('? [MultiFile] Fatal error:', error);
    addStatusLog(`Fatal error: ${error}`, 'error');
    updateStatusText('Error occurred');
    setTimeout(() => closeStatusDialog(), 2000);
    isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
  }
  // Note: isProcessingMultiFile is reset in the confirmation handlers
}

// ============================================================================
// PROFESSIONAL DRAGGABLE STATUS DIALOG
// ============================================================================

// Status log entries
let statusLogEntries: string[] = [];
let statusDialog: HTMLElement | null = null;
let pendingChanges: Array<{
  fileName: string;
  fullPath: string;
  originalContent: string;
  newContent: string;
  changesSummary: string;
  block: HTMLElement;
  blockId: string;
}> = [];

// Show the status dialog (called at start of processing)
function showStatusDialog(): void {
  // Remove existing dialog
  if (statusDialog) {
    statusDialog.remove();
  }
  
  // Clear previous logs
  statusLogEntries = [];
  
  // Inject styles
  injectStatusDialogStyles();
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'ai-status-dialog';
  dialog.id = 'ai-status-dialog';
  dialog.innerHTML = `
    <div class="asd-header" id="asd-drag-handle">
      <div class="asd-title">
        <span class="asd-spinner"></span>
        <span class="asd-title-text">AI Code Assistant</span>
      </div>
      <div class="asd-controls">
        <button class="asd-minimize" title="Minimize">-</button>
      </div>
    </div>
    <div class="asd-body">
      <div class="asd-status-text">Initializing...</div>
      <div class="asd-progress">
        <div class="asd-progress-bar"></div>
      </div>
      <div class="asd-log"></div>
      <div class="asd-files"></div>
      <div class="asd-summary" style="display:none;"></div>
    </div>
    <div class="asd-footer" style="display:none;">
      <div class="asd-hint">
        <kbd>Enter</kbd> Accept � <kbd>Esc</kbd> Reject
      </div>
      <div class="asd-actions">
        <button class="asd-btn asd-btn-reject">
          <span>?</span> Reject
        </button>
        <button class="asd-btn asd-btn-accept">
          <span>?</span> Accept & Save
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  statusDialog = dialog;
  
  // Make draggable
  makeDraggable(dialog, dialog.querySelector('#asd-drag-handle') as HTMLElement);
  
  // Minimize button
  dialog.querySelector('.asd-minimize')?.addEventListener('click', () => {
    dialog.classList.toggle('minimized');
  });
  
  // Initial log
  addStatusLog('AI Code Assistant started', 'info');
}

// Update status text
function updateStatusText(text: string): void {
  const el = statusDialog?.querySelector('.asd-status-text');
  if (el) el.textContent = text;
}

// Update progress bar (0-100)
function updateProgress(percent: number): void {
  const bar = statusDialog?.querySelector('.asd-progress-bar') as HTMLElement;
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
}

// Add status message to the log
function addStatusLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const icons: Record<string, string> = {
    info: '?',
    success: '?',
    warning: '?',
    error: '?'
  };
  const entry = `<div class="log-entry ${type}"><span class="log-time">${timestamp}</span><span class="log-icon">${icons[type]}</span><span class="log-msg">${message}</span></div>`;
  statusLogEntries.push(entry);
  
  // Update the log display
  const logContainer = statusDialog?.querySelector('.asd-log');
  if (logContainer) {
    logContainer.innerHTML = statusLogEntries.slice(-10).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

// Clear status log
function clearStatusLog(): void {
  statusLogEntries = [];
  const logContainer = statusDialog?.querySelector('.asd-log');
  if (logContainer) logContainer.innerHTML = '';
}

// Update file list in dialog
function updateFileList(files: Array<{fileName: string; status: 'pending' | 'processing' | 'done' | 'error'; summary?: string}>): void {
  const container = statusDialog?.querySelector('.asd-files');
  if (!container) return;
  
  container.innerHTML = files.map(f => {
    const isNewFile = f.summary?.includes('new file');
    const newBadge = isNewFile ? '<span class="asd-file-new">NEW</span>' : '';
    return `
    <div class="asd-file ${f.status}" data-filename="${f.fileName}" style="cursor: pointer;">
      <span class="asd-file-icon">${f.status === 'done' ? '?' : f.status === 'error' ? '?' : f.status === 'processing' ? '?' : '?'}</span>
      <span class="asd-file-name">${f.fileName}</span>
      ${newBadge}
      ${f.summary ? `<span class="asd-file-stats">${f.summary.replace(' (new file)', '')}</span>` : ''}
    </div>
  `}).join('');
  
  // Add click handlers to open files
  container.querySelectorAll('.asd-file').forEach(item => {
    item.addEventListener('click', async () => {
      const fileName = item.getAttribute('data-filename');
      if (fileName) {
        console.log(`?? [StatusDialog] Opening file: ${fileName}`);
        await openFileAndWait(fileName, 3000);
      }
    });
  });
}

// Show completion state with Accept/Reject buttons
function showCompletionState(changes: typeof pendingChanges, errorCount: number): void {
  if (!statusDialog) return;
  
  pendingChanges = changes;
  
  // Calculate totals
  let totalAdded = 0, totalDeleted = 0, totalModified = 0;
  changes.forEach(c => {
    const match = c.changesSummary.match(/\+(\d+)\s*-(\d+)\s*~(\d+)/);
    if (match) {
      totalAdded += parseInt(match[1]) || 0;
      totalDeleted += parseInt(match[2]) || 0;
      totalModified += parseInt(match[3]) || 0;
    }
  });
  
  // Update header
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Changes Ready';
  
  // Stop spinner
  statusDialog.querySelector('.asd-spinner')?.classList.add('done');
  
  // Update status
  updateStatusText(`${changes.length} file${changes.length > 1 ? 's' : ''} modified`);
  updateProgress(100);
  
  // Show summary
  const summary = statusDialog.querySelector('.asd-summary') as HTMLElement;
  if (summary) {
    summary.style.display = 'flex';
    summary.innerHTML = `
      <div class="summary-stat add"><span class="num">+${totalAdded}</span><span class="label">added</span></div>
      <div class="summary-stat del"><span class="num">-${totalDeleted}</span><span class="label">deleted</span></div>
      <div class="summary-stat mod"><span class="num">~${totalModified}</span><span class="label">modified</span></div>
    `;
  }
  
  // Show footer with buttons
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) {
    footer.style.display = 'flex';
  }
  
  // Add expanded class for animation
  statusDialog.classList.add('expanded');
  
  // Setup button handlers
  statusDialog.querySelector('.asd-btn-accept')?.addEventListener('click', handleAccept);
  statusDialog.querySelector('.asd-btn-reject')?.addEventListener('click', handleReject);
  
  // Keyboard handler
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      const active = document.activeElement;
      if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleAccept();
        document.removeEventListener('keydown', keyHandler);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleReject();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);
  (statusDialog as any)._keyHandler = keyHandler;
  
  hasUnapprovedChanges = true;
  
  // Auto-open the first modified file so user can see the changes
  if (changes.length > 0) {
    const firstFile = changes[0].fileName;
    console.log(`?? [AutoOpen] Opening first modified file: ${firstFile}`);
    setTimeout(async () => {
      await openFileAndWait(firstFile, 3000);
    }, 300);
  }
}

// Handle Accept button
async function handleAccept(): Promise<void> {
  if (!statusDialog || pendingChanges.length === 0) return;
  
  // Update UI to saving state
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Saving...';
  statusDialog.querySelector('.asd-spinner')?.classList.remove('done');
  
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) footer.style.display = 'none';
  
  statusDialog.classList.remove('expanded');
  statusDialog.classList.add('saving');
  
  updateStatusText('Saving files...');
  addStatusLog('Starting save process...', 'info');
  
  let savedCount = 0;
  const total = pendingChanges.length;
  
  for (let i = 0; i < pendingChanges.length; i++) {
    const change = pendingChanges[i];
    updateProgress((i / total) * 100);
    
    try {
      markBlockAsApplied(change.block, change.blockId, change.changesSummary);
      addStatusLog(`Saving ${change.fileName}...`, 'info');
      updateStatusText(`Saving ${change.fileName}...`);
      
      // Open file
      const opened = await openFileAndWait(change.fileName, 3000);
      if (!opened) {
        addStatusLog(`Failed to open ${change.fileName}`, 'error');
        continue;
      }
      
      await new Promise(r => setTimeout(r, 100));
      
      // Get content
      const editor = getMonacoEditorForApply();
      const model = editor?.getModel();
      if (!model) continue;
      
      // FIX: Use AI-generated content instead of model (FastApply turbo only adds decorations)
      const content = change.newContent || model.getValue();
      console.log('[MultiFile] Save: ' + change.fileName + ' using ' + (change.newContent ? 'change.newContent' : 'model.getValue()') + ' (' + content.length + ' chars)');
      
      // Also update the editor visually so it shows the new code
      if (change.newContent) {
        try {
          editor.setValue(change.newContent);
          console.log('[MultiFile] Editor updated via setValue (' + change.newContent.length + ' chars)');
        } catch (e) {
          console.warn('[MultiFile] setValue failed:', e);
        }
      }
      // ?? FIX: Restore editor to writable after multi-file accept
      restoreEditorWritable(editor);
      
      let filePath = change.fullPath || model.uri?.path || '';
      if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1);
      }
      filePath = filePath.replace(/\\/g, '/');
      
      // Save
      let saved = false;
      
      try {
        const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
        if (invoke) {
          await invoke('write_file', { path: filePath, content });
          saved = true;
        }
      } catch (e) {}
      
      if (!saved) {
        try {
          const fs = (window as any).__TAURI__?.fs;
          if (fs?.writeTextFile) {
            await fs.writeTextFile(filePath, content);
            saved = true;
          }
        } catch (e) {}
      }
      
      if (!saved) {
        try {
          const saveFile = (window as any).saveFile;
          if (saveFile) {
            await saveFile(content, filePath);
            saved = true;
          }
        } catch (e) {}
      }
      
      if (!saved) {
        try {
          const tabManager = (window as any).tabManager;
          if (tabManager?.saveCurrentTab) {
            await tabManager.saveCurrentTab();
            saved = true;
          }
        } catch (e) {}
      }
      
      if (saved) {
        savedCount++;
        addStatusLog(`Saved ${change.fileName}`, 'success');
        
        // Update tab state
        try {
          const tabManager = (window as any).tabManager;
          if (tabManager) {
            const activeTab = tabManager.getActiveTab?.();
            if (activeTab) {
              activeTab.isModified = false;
              activeTab.originalContent = content;
              tabManager.markTabAsSaved?.(activeTab.id);
            }
          }
          document.dispatchEvent(new CustomEvent('file-saved', { detail: { path: filePath } }));
        } catch (e) {}
      } else {
        addStatusLog(`Failed to save ${change.fileName}`, 'error');
      }
      
      await new Promise(r => setTimeout(r, 150));
      
    } catch (e) {
      addStatusLog(`Error: ${change.fileName}`, 'error');
    }
  }
  
  updateProgress(100);
  
  // Final state
  if (savedCount === total) {
    addStatusLog(`All ${savedCount} file(s) saved successfully`, 'success');
    updateStatusText('Complete!');
  } else {
    addStatusLog(`Saved ${savedCount}/${total} files`, savedCount > 0 ? 'warning' : 'error');
    updateStatusText(`Saved ${savedCount}/${total}`);
  }
  
  // Close dialog after delay
  setTimeout(() => {
    closeStatusDialog();
  }, 2000);
  
  // Store diff history + show notification BEFORE clearing
  if (pendingChanges.length > 0) {
    storeChangeHistory(pendingChanges);
    showChangeNotification(pendingChanges);
  }

  // Cleanup
  hasUnapprovedChanges = false;
  isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
  clearPendingDecorations();
  clearAllDecorations();
  pendingChanges = [];
}

// Handle Reject button
async function handleReject(): Promise<void> {
  if (!statusDialog) return;
  
  // Update UI
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Reverting...';
  statusDialog.querySelector('.asd-spinner')?.classList.remove('done');
  
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) footer.style.display = 'none';
  
  statusDialog.classList.remove('expanded');
  
  addStatusLog('Reverting changes...', 'warning');
  updateStatusText('Reverting...');
  
  for (const change of pendingChanges) {
    try {
      markBlockAsRejected(change.block, change.blockId);
      
      const opened = await openFileAndWait(change.fileName, 3000);
      if (opened) {
        const editor = getMonacoEditorForApply();
        const model = editor?.getModel();
        if (model && editor) {
          const monaco = (window as any).monaco;
          editor.executeEdits('revert', [{
            range: model.getFullModelRange(),
            text: change.originalContent,
            forceMoveMarkers: true
          }]);
          // ?? FIX: Restore editor to writable after multi-file reject
          restoreEditorWritable(editor);
          addStatusLog(`Reverted ${change.fileName}`, 'info');
        }
      }
    } catch (e) {
      addStatusLog(`Error reverting ${change.fileName}`, 'error');
    }
  }
  
  addStatusLog('All changes reverted', 'success');
  updateStatusText('Reverted');
  
  // Close after delay
  setTimeout(() => {
    closeStatusDialog();
  }, 1500);
  
  // Cleanup
  hasUnapprovedChanges = false;
  isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
  clearPendingDecorations();
  clearAllDecorations();
  pendingChanges = [];
}

// Close and remove dialog
function closeStatusDialog(): void {
  if (statusDialog) {
    const keyHandler = (statusDialog as any)._keyHandler;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    
    statusDialog.classList.add('closing');
    setTimeout(() => {
      statusDialog?.remove();
      statusDialog = null;
    }, 300);
  }
  statusLogEntries = [];
}

// Make element draggable
function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let offsetX = 0, offsetY = 0, isDragging = false;
  
  handle.style.cursor = 'move';
  
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    element.style.transition = 'none';
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Keep within viewport
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  });
}

// Inject styles for status dialog
function injectStatusDialogStyles(): void {
  if (document.getElementById('ai-status-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-status-dialog-styles';
  style.textContent = `
    .ai-status-dialog {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 420px;
      background: #1a1d23;
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e6edf3;
      animation: asdSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    
    .ai-status-dialog.closing {
      animation: asdSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .ai-status-dialog.minimized .asd-body,
    .ai-status-dialog.minimized .asd-footer {
      display: none !important;
    }
    
    .ai-status-dialog.minimized {
      width: 280px;
    }
    
    @keyframes asdSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes asdSlideDown {
      from { opacity: 1; }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    
    .asd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #21262d;
      border-bottom: 1px solid #30363d;
      border-radius: 12px 12px 0 0;
    }
    
    .asd-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #f0f6fc;
    }
    
    .asd-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #30363d;
      border-top-color: #58a6ff;
      border-radius: 50%;
      animation: asdSpin 0.8s linear infinite;
    }
    
    .asd-spinner.done {
      border-color: #3fb950;
      border-top-color: #3fb950;
      animation: none;
    }
    
    @keyframes asdSpin {
      to { transform: rotate(360deg); }
    }
    
    .asd-controls {
      display: flex;
      gap: 4px;
    }
    
    .asd-minimize {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #8b949e;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .asd-minimize:hover {
      background: #30363d;
      color: #f0f6fc;
    }
    
    .asd-body {
      padding: 16px;
    }
    
    .asd-status-text {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 10px;
    }
    
    .asd-progress {
      height: 4px;
      background: #21262d;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    
    .asd-progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #238636, #3fb950);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .asd-log {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 10px 12px;
      max-height: 120px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 11px;
      line-height: 1.7;
      margin-bottom: 12px;
    }
    
    .asd-log .log-entry {
      display: flex;
      gap: 8px;
    }
    
    .asd-log .log-time {
      color: #484f58;
      flex-shrink: 0;
    }
    
    .asd-log .log-icon {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
    }
    
    .asd-log .log-entry.info .log-icon { color: #58a6ff; }
    .asd-log .log-entry.success .log-icon { color: #3fb950; }
    .asd-log .log-entry.warning .log-icon { color: #d29922; }
    .asd-log .log-entry.error .log-icon { color: #f85149; }
    
    .asd-log .log-msg {
      color: #c9d1d9;
    }
    
    .asd-files {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    
    .asd-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #21262d;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    
    .asd-file:hover {
      background: #30363d;
      border-color: #58a6ff;
    }
    
    .asd-file:active {
      transform: scale(0.98);
    }
    
    .asd-file-icon {
      width: 16px;
      text-align: center;
      color: #8b949e;
    }
    
    .asd-file.done .asd-file-icon { color: #3fb950; }
    .asd-file.error .asd-file-icon { color: #f85149; }
    .asd-file.processing .asd-file-icon { color: #58a6ff; animation: asdSpin 1s linear infinite; }
    
    .asd-file-name {
      flex: 1;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      color: #58a6ff;
    }
    
    .asd-file-stats {
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 11px;
      color: #8b949e;
    }
    
    .asd-file-new {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 3px;
      letter-spacing: 0.5px;
      animation: newFilePulse 1.5s ease-in-out infinite;
    }
    
    @keyframes newFilePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .asd-summary {
      display: flex;
      gap: 20px;
      padding: 12px 16px;
      background: #21262d;
      border-radius: 8px;
      margin-bottom: 0;
    }
    
    .summary-stat {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    
    .summary-stat .num {
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 16px;
      font-weight: 600;
    }
    
    .summary-stat .label {
      font-size: 11px;
      color: #8b949e;
    }
    
    .summary-stat.add .num { color: #3fb950; }
    .summary-stat.del .num { color: #f85149; }
    .summary-stat.mod .num { color: #d29922; }
    
    .asd-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b22;
      border-top: 1px solid #21262d;
      animation: asdFadeIn 0.3s ease;
    }
    
    @keyframes asdFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .asd-hint {
      font-size: 11px;
      color: #484f58;
    }
    
    .asd-hint kbd {
      display: inline-block;
      padding: 2px 6px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 10px;
      color: #8b949e;
    }
    
    .asd-actions {
      display: flex;
      gap: 8px;
    }
    
    .asd-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .asd-btn-accept {
      background: #238636;
      color: #fff;
    }
    
    .asd-btn-accept:hover {
      background: #2ea043;
    }
    
    .asd-btn-reject {
      background: transparent;
      color: #f85149;
      border-color: #f85149;
    }
    
    .asd-btn-reject:hover {
      background: rgba(248, 81, 73, 0.1);
    }
    
    /* Scrollbar */
    .asd-log::-webkit-scrollbar {
      width: 6px;
    }
    
    .asd-log::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .asd-log::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 3px;
    }
    
    .asd-log::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }
    
    /* Expanded state animation */
    .ai-status-dialog.expanded {
      animation: asdExpand 0.3s ease forwards;
    }
    
    @keyframes asdExpand {
      from { }
      to { }
    }
  `;
  document.head.appendChild(style);
}

// Legacy function wrapper for compatibility
function showMultiFileConfirmationBar(changes: Array<{
  fileName: string;
  fullPath: string;
  originalContent: string;
  newContent: string;
  changesSummary: string;
  block: HTMLElement;
  blockId: string;
}>, errorCount: number): void {
  // Update file list with done status
  updateFileList(changes.map(c => ({
    fileName: c.fileName,
    status: 'done' as const,
    summary: c.changesSummary
  })));
  
  // Show completion state
  showCompletionState(changes, errorCount);
}

/**
 * Apply code without showing confirmation (confirmation shown separately per file)
 */
async function doApplyCodeWithoutConfirmation(block: HTMLElement, code: string, blockId: string): Promise<void> {
  const editor = getMonacoEditorForApply();
  if (!editor) return;
  
  const model = editor.getModel();
  if (!model) return;
  
  // Apply with typing animation
  const lines = code.split('\n');
  const totalChars = code.length;
  const baseDelay = Math.max(1, Math.min(5, 2000 / totalChars));
  
  // Clear editor first
  editor.executeEdits('auto-apply-clear', [{
    range: model.getFullModelRange(),
    text: '',
    forceMoveMarkers: true
  }]);
  
  // Type content progressively
  let currentContent = '';
  for (let i = 0; i < lines.length; i++) {
    currentContent += (i > 0 ? '\n' : '') + lines[i];
    
    editor.executeEdits('auto-apply-type', [{
      range: model.getFullModelRange(),
      text: currentContent,
      forceMoveMarkers: true
    }]);
    
    // Scroll to show current line
    editor.revealLine(i + 1);
    
    // Variable delay based on line length
    const lineDelay = Math.min(50, baseDelay * lines[i].length);
    if (lineDelay > 0 && i < lines.length - 1) {
      await new Promise(r => setTimeout(r, lineDelay));
    }
  }
  
  // Final position
  editor.setPosition({ lineNumber: 1, column: 1 });
  editor.revealLine(1);
}

/**
 * Show per-file confirmation dialog and wait for user response
 */
function showPerFileConfirmation(fileName: string, current: number, total: number): Promise<'accept' | 'reject'> {
  return new Promise((resolve) => {
    // Remove any existing confirmation bars (both single-file and multi-file)
    const existingMulti = document.querySelector('.multi-file-confirm-bar');
    if (existingMulti) existingMulti.remove();
    
    const existingSingle = document.querySelector('.aca-confirm-bar, #aca-confirm-bar');
    if (existingSingle) existingSingle.remove();
    
    // Reset single-file state
    hasUnapprovedChanges = false;
    
    // Create confirmation bar
    const bar = document.createElement('div');
    bar.className = 'multi-file-confirm-bar';
    bar.innerHTML = `
      <div class="mf-confirm-content">
        <span class="mf-confirm-icon">??</span>
        <span class="mf-confirm-file">${fileName}</span>
        <span class="mf-confirm-progress">(${current}/${total})</span>
        <div class="mf-confirm-buttons">
          <button class="mf-accept-btn" title="Accept (Enter)">
            <span>?</span> Accept
          </button>
          <button class="mf-reject-btn" title="Reject (Escape)">
            <span>?</span> Reject
          </button>
        </div>
        <span class="mf-confirm-hint">Enter to accept, Escape to reject</span>
      </div>
    `;
    
    // Add styles if not present
    if (!document.querySelector('#multi-file-confirm-styles')) {
      const style = document.createElement('style');
      style.id = 'multi-file-confirm-styles';
      style.textContent = `
        .multi-file-confirm-bar {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, rgba(30, 35, 45, 0.98), rgba(40, 45, 55, 0.98));
          border: 1px solid rgba(100, 180, 255, 0.4);
          border-radius: 12px;
          padding: 12px 20px;
          z-index: 999999;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(100, 180, 255, 0.15);
          animation: mfConfirmSlideUp 0.3s ease-out;
        }
        
        @keyframes mfConfirmSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        .mf-confirm-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .mf-confirm-icon {
          font-size: 20px;
        }
        
        .mf-confirm-file {
          color: #7dd3fc;
          font-weight: 600;
          font-size: 14px;
          font-family: 'SF Mono', Monaco, monospace;
        }
        
        .mf-confirm-progress {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }
        
        .mf-confirm-buttons {
          display: flex;
          gap: 8px;
          margin-left: 8px;
        }
        
        .mf-accept-btn, .mf-reject-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mf-accept-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        
        .mf-accept-btn:hover {
          background: linear-gradient(135deg, #34d399, #10b981);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .mf-reject-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }
        
        .mf-reject-btn:hover {
          background: linear-gradient(135deg, #f87171, #ef4444);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        
        .mf-confirm-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
          margin-left: 8px;
        }
        
        @media (max-width: 600px) {
          .mf-confirm-hint { display: none; }
          .mf-confirm-content { gap: 8px; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(bar);
    
    // Cleanup function
    const cleanup = () => {
      bar.remove();
      document.removeEventListener('keydown', handleKeydown);
    };
    
    // Handle keyboard
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve('accept');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve('reject');
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Handle button clicks
    bar.querySelector('.mf-accept-btn')?.addEventListener('click', () => {
      cleanup();
      resolve('accept');
    });
    
    bar.querySelector('.mf-reject-btn')?.addEventListener('click', () => {
      cleanup();
      resolve('reject');
    });
  });
}

/**
 * Mark block as applied (green styling) with changes badge in header
 */
function markBlockAsApplied(block: HTMLElement, blockId?: string, changesSummary?: string): void {
  // Find the wrapper - handle case where block IS the wrapper
  let wrapper = block;
  if (!block.classList.contains('muf-block') && !block.classList.contains('cbe-wrapper')) {
    wrapper = block.closest('.cbe-wrapper, .muf-block') as HTMLElement || block;
  }
  
  console.log(`??? [MarkApplied] Marking block as applied`, { 
    blockId, 
    changesSummary,
    wrapperClass: wrapper.className,
    hasHeader: !!wrapper.querySelector('.muf-header, .cbe-header')
  });
  
  wrapper.classList.add('code-applied');
  wrapper.classList.remove('code-rejected');
  
  // Find header - support both cbe and muf formats
  const header = wrapper.querySelector('.cbe-header, .muf-header') as HTMLElement;
  const headerLeft = wrapper.querySelector('.cbe-header-left, .muf-header-left') as HTMLElement;
  
  console.log(`??? [MarkApplied] Header found:`, { header: !!header, headerLeft: !!headerLeft });
  
  // Remove any existing status badges first
  wrapper.querySelectorAll('.code-apply-status, .code-changes-badge').forEach(el => el.remove());
  
  // Inject styles FIRST to ensure they're available
  injectChangeBadgeStyles();
  
  // Create changes badge for header-left area (shows +X -Y ~Z)
  if (headerLeft) {
    const badge = document.createElement('span');
    badge.className = 'code-changes-badge';
    const displayText = changesSummary || 'Applied';
    badge.innerHTML = `<span class="badge-check">?</span> ${displayText}`;
    headerLeft.appendChild(badge);
    console.log(`??? [MarkApplied] Badge added to header-left: ${displayText}`);
  } else if (header) {
    // Fallback: add to header directly
    const badge = document.createElement('span');
    badge.className = 'code-changes-badge';
    const displayText = changesSummary || 'Applied';
    badge.innerHTML = `<span class="badge-check">?</span> ${displayText}`;
    header.appendChild(badge);
    console.log(`??? [MarkApplied] Badge added to header (fallback): ${displayText}`);
  } else {
    console.warn(`??? [MarkApplied] No header found, cannot add badge`);
  }
  
  // Also add small indicator to header actions for visibility
  const headerActions = wrapper.querySelector('.cbe-header-actions, .muf-header-actions');
  if (headerActions) {
    const indicator = document.createElement('span');
    indicator.className = 'code-apply-status status-applied';
    indicator.innerHTML = '?';
    indicator.title = changesSummary || 'Applied';
    headerActions.insertBefore(indicator, headerActions.firstChild);
  }
}

/**
 * Inject styles for change badges
 */
function injectChangeBadgeStyles(): void {
  if (document.getElementById('code-changes-badge-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'code-changes-badge-styles';
  style.textContent = `
    /* Changes badge in header-left */
    .code-changes-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      padding: 2px 8px !important;
      background: rgba(16, 185, 129, 0.2) !important;
      border: 1px solid rgba(16, 185, 129, 0.4) !important;
      border-radius: 4px !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      color: #10b981 !important;
      margin-left: 8px !important;
      white-space: nowrap !important;
    }
    
    .code-changes-badge .badge-check {
      font-size: 11px !important;
    }
    
    /* Small indicator in header actions */
    .code-apply-status {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 50% !important;
      font-size: 10px !important;
      font-weight: bold !important;
    }
    
    .code-apply-status.status-applied {
      background: rgba(16, 185, 129, 0.2) !important;
      color: #10b981 !important;
    }
    
    .code-apply-status.status-rejected {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ef4444 !important;
    }
    
    /* Applied block border */
    .code-applied {
      border-left: 3px solid #10b981 !important;
    }
    
    /* Rejected block border */
    .code-rejected {
      border-left: 3px solid #ef4444 !important;
      opacity: 0.8 !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Mark block as rejected (red styling)  
 */
function markBlockAsRejected(block: HTMLElement, blockId: string): void {
  const wrapper = block.closest('.cbe-wrapper') || block;
  wrapper.classList.add('code-rejected');
  wrapper.classList.remove('code-applied');
  
  // Find header to insert status badge properly
  const header = wrapper.querySelector('.cbe-header');
  
  // Update or add status indicator
  let indicator = wrapper.querySelector('.code-apply-status');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'code-apply-status';
    
    // Insert into header if available
    if (header) {
      const actions = header.querySelector('.cbe-actions, .cbe-header-actions');
      if (actions) {
        actions.appendChild(indicator);
      } else {
        header.appendChild(indicator);
      }
    } else {
      wrapper.appendChild(indicator);
    }
  }
  indicator.innerHTML = '? Rejected';
  indicator.className = 'code-apply-status status-rejected';
}

/**
 * Mark block as checked (no changes needed - gray styling)
 */
function markBlockAsChecked(block: HTMLElement, blockId: string): void {
  const wrapper = block.closest('.cbe-wrapper') || block;
  wrapper.classList.add('code-checked');
  wrapper.classList.remove('code-applied', 'code-rejected');
  
  // Find header to insert status badge properly
  const header = wrapper.querySelector('.cbe-header');
  
  // Update or add status indicator
  let indicator = wrapper.querySelector('.code-apply-status');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'code-apply-status';
    
    // Insert into header if available
    if (header) {
      const actions = header.querySelector('.cbe-actions, .cbe-header-actions');
      if (actions) {
        actions.appendChild(indicator);
      } else {
        header.appendChild(indicator);
      }
    } else {
      wrapper.appendChild(indicator);
    }
  }
  indicator.innerHTML = '?? No changes';
  indicator.className = 'code-apply-status status-checked';
  
  // Add to processed IDs
  processedBlockIds.add(blockId);
}

(window as any).processMultiFileApply = processMultiFileApply;

async function autoOpenAndApply(targetFileName: string, code: string, blockId: string, block: HTMLElement): Promise<boolean> {
  console.log(`?? [AutoOpen] Auto-opening "${targetFileName}" to apply code...`);
  showAutoApplyToast(`?? Opening ${targetFileName}...`, 'success');
  
  pendingAutoApply = { fileName: targetFileName, code, blockId, block };
  
  const opened = await openFileAndWait(targetFileName, 6000);
  
  if (opened) {
    console.log(`? [AutoOpen] File "${targetFileName}" opened successfully!`);
    pendingAutoApply = null;
    processedBlockIds.add(blockId);
    await doApplyCode(block, code, blockId);
    return true;
  } else {
    console.log(`? [AutoOpen] Could not open file: ${targetFileName}`);
    showAutoApplyToast(`?? Could not open ${targetFileName}`, 'error');
    pendingAutoApply = null;
    processedBlockIds.add(blockId);
    return false;
  }
}

(window as any).autoOpenAndApply = autoOpenAndApply;
(window as any).isAIProjectSearchEnabled = isAIProjectSearchEnabled;

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

(window as any).testFindFile = (fileName: string) => {
  console.log(`\n?? ===== TEST: Find File =====`);
  const result = findFileInProject(fileName);
  if (result) {
    console.log(`? FOUND:`, result.element);
    console.log(`   Path: ${result.path}`);
    return true;
  } else {
    console.log(`? NOT FOUND`);
    return false;
  }
};

(window as any).testOpenFile = async (fileName: string) => {
  console.log(`\n?? ===== TEST: Open File =====`);
  const result = await openFileAndWait(fileName, 5000);
  console.log(result ? `? SUCCESS` : `? FAILED`);
  return result;
};

(window as any).testStatus = () => {
  console.log(`\n?? ===== SYSTEM STATUS =====`);
  console.log(`   AI Search enabled: ${isAIProjectSearchEnabled()}`);
  console.log(`   Auto-Apply enabled: ${autoApplyEnabled}`);
  console.log(`   Multi-file processing: ${isProcessingMultiFile}`);
  
  const editor = getMonacoEditorForApply();
  const currentFile = editor?.getModel()?.uri?.path?.split('/').pop() || 'none';
  console.log(`   Current file in editor: ${currentFile}`);
  
  const blocks = getUnprocessedCodeBlocks();
  console.log(`   Unprocessed code blocks: ${blocks.length}`);
};

function injectFileMismatchStyles(): void {
  if (document.getElementById('aca-file-mismatch-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'aca-file-mismatch-styles';
  style.textContent = `
    .aca-file-mismatch-warning {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
      border: 2px solid #f0883e;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      z-index: 10002;
      max-width: 400px;
    }
    .aca-warning-icon { font-size: 32px; }
    .aca-warning-content { text-align: center; }
    .aca-warning-title { color: #f0883e; font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .aca-warning-text { color: #ccc; font-size: 13px; line-height: 1.5; }
    .aca-warning-text strong { color: #fff; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .aca-warning-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .aca-warning-btn { padding: 8px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .aca-warning-btn.proceed { background: #333; color: #f0883e; border: 1px solid #f0883e; }
    .aca-warning-btn.proceed:hover { background: rgba(240, 136, 62, 0.2); }
    .aca-warning-btn.cancel { background: #333; color: #ccc; border: 1px solid #555; }
    .aca-warning-btn.cancel:hover { background: #444; }
    .aca-warning-btn.open-file { background: linear-gradient(135deg, #238636 0%, #2ea043 100%); color: #fff; }
    .aca-warning-btn.open-file:hover { background: linear-gradient(135deg, #2ea043 0%, #3fb950 100%); }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// SMART CODE SELECTION
// ============================================================================

const MIN_SCORE_TO_APPLY = 30;

interface CodeBlockScore {
  block: HTMLElement;
  code: string;
  language: string;
  score: number;
  reasons: string[];
  shouldSkip: boolean;
}

function isExplanationRequest(): boolean {
  const userMessages = document.querySelectorAll('.user-message, .human-message, [class*="user-msg"], [data-role="user"]');
  let lastUserMsg = userMessages[userMessages.length - 1];
  
  if (!lastUserMsg) {
    const allMessages = document.querySelectorAll('.message, .chat-message, [class*="message"]');
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.classList.contains('user') || msg.classList.contains('human') || msg.getAttribute('data-role') === 'user') {
        lastUserMsg = msg;
        break;
      }
    }
  }
  
  if (!lastUserMsg) return false;
  
  const msgText = lastUserMsg.textContent?.toLowerCase() || '';
  
  // If user is asking about a specific line, it's an explanation query
  if (/\b(code\s*)?line\s*\d+/i.test(msgText)) return true;
  if (/what('s| is)\s+(on\s+)?line/i.test(msgText)) return true;
  
  const explanationKeywords = ['explain', 'what is', 'what does', 'why does', 'how does', 'tell me about', 'describe', 'meaning of', 'understand', 'clarify', 'show me line', 'what\'s line', 'line number'];
  const modificationKeywords = ['fix', 'update', 'change', 'modify', 'improve', 'refactor', 'rewrite', 'add', 'remove', 'delete', 'replace', 'create', 'make', 'build', 'write', 'generate'];
  
  for (const keyword of modificationKeywords) {
    if (msgText.includes(keyword)) return false;
  }
  
  for (const keyword of explanationKeywords) {
    if (msgText.includes(keyword)) return true;
  }
  
  return false;
}

function isSnippetOrExample(code: string, block: HTMLElement): boolean {
  const lines = code.split('\n').filter(l => l.trim());
  
  // Very short code blocks are almost always snippets
  if (lines.length <= 5) return true;
  
  // Check if this is an explanation context
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (parentMessage) {
    const messageText = parentMessage.textContent?.toLowerCase() || '';
    
    // If AI is explaining a specific line, it's a snippet
    if (/line\s*\d+\s*(is|shows?|contains?)/i.test(messageText)) return true;
    if (/this\s+(line|code)\s+(is|imports?|exports?)/i.test(messageText)) return true;
    if (/here('s| is)\s+(the\s+)?(line|code)/i.test(messageText)) return true;
  }
  
  const hasImport = /^import\s+/m.test(code);
  const hasExport = /^export\s+/m.test(code);
  const hasFunction = /^(async\s+)?function\s+\w+/m.test(code) || /^(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/m.test(code);
  const hasClass = /^class\s+\w+/m.test(code);
  const hasConst = /^(const|let|var)\s+\w+\s*=/m.test(code);
  const hasComponent = /^(export\s+)?(default\s+)?function\s+[A-Z]/m.test(code) || /^const\s+[A-Z]\w+\s*=/m.test(code);
  
  const hasCompleteStructure = hasImport || hasExport || hasFunction || hasClass || hasComponent;
  
  if (lines.length >= 10 && hasCompleteStructure) return false;
  if (lines.length >= 15) return false;
  
  if (!hasImport && !hasExport && !hasFunction && !hasClass && !hasConst && lines.length < 10) return true;
  
  return false;
}

function scoreCodeBlock(block: HTMLElement, currentFileLang: string, currentFileName: string): CodeBlockScore | null {
  const codeInfo = extractCodeFromBlockForApply(block);
  if (!codeInfo || !codeInfo.code.trim()) return null;
  
  const code = codeInfo.code;
  const language = codeInfo.language.toLowerCase();
  const lineCount = code.split('\n').length;
  const nonEmptyLines = code.trim().split('\n').filter(line => line.trim()).length;
  
  let score = 0;
  const reasons: string[] = [];
  let shouldSkip = false;

  // ===== BASH/SHELL/TERMINAL FILTER: Never apply terminal commands to source files =====
  const terminalLanguages = ['bash', 'shell', 'sh', 'zsh', 'bat', 'cmd', 'powershell', 'ps1', 'terminal', 'console', 'dos', 'bas'];
  if (terminalLanguages.includes(language)) {
    score -= 600;
    reasons.push(`TERMINAL LANGUAGE (${language})`);
    shouldSkip = true;
    console.log(`[Score] Skipping terminal/shell block (lang=${language})`);
  }

  // Also check content for terminal commands even if language tag is wrong
  if (!shouldSkip && _isMultiLineTerminalBlock(code)) {
    score -= 500;
    reasons.push('TERMINAL COMMANDS DETECTED');
    shouldSkip = true;
    console.log('[Score] Skipping: content looks like terminal commands');
  }

  
  // ===== SNIPPET FILTER: Very small code blocks are usually examples =====
  if (nonEmptyLines < 3) {
    score -= 500;
    reasons.push(`? TOO SMALL (${nonEmptyLines} lines)`);
    shouldSkip = true;
  }
  
  // Skip PLAINTEXT blocks - but NOT if they look like actual code
  // ? v14: Check for C/C++/Arduino patterns before skipping
  // ? FIX: More robust regex that handles leading characters/backticks
  const hasCPreprocessor = /^[`'\s]*#\s*(include|define|ifndef|ifdef|endif|pragma)/m.test(code) ||
                           /#\s*(include|define|ifndef|ifdef|endif)\s/m.test(code);
  const hasCTypes = /\b(int|void|char|float|double|struct|typedef|enum)\s+\w+/.test(code);
  const hasJSPatterns = /\b(function|class|const|let|var|def|fn|func)\s+\w+/.test(code);
  const hasModulePatterns = /\b(import|export|require|module)\s+/.test(code);
  const hasArduinoPatterns = /\b(pinMode|digitalWrite|digitalRead|Serial|delay)\s*\(/.test(code);
  
  const looksLikeRealCode = hasCPreprocessor || hasCTypes || hasJSPatterns || hasModulePatterns || hasArduinoPatterns;
  
  // ? DEBUG: Log what patterns matched
  if (language === 'plaintext') {
    console.log(`?? [Score] PLAINTEXT detection: preprocessor=${hasCPreprocessor}, types=${hasCTypes}, js=${hasJSPatterns}, modules=${hasModulePatterns}, arduino=${hasArduinoPatterns}`);
    console.log(`?? [Score] First 200 chars of code: ${code.substring(0, 200).replace(/\n/g, '?')}`);
  }
  
  if (language === 'plaintext' && !looksLikeRealCode) {
    score -= 400;
    reasons.push('? PLAINTEXT (example)');
    shouldSkip = true;
  } else if (language === 'plaintext' && looksLikeRealCode) {
    // Don't penalize, it's probably real code with wrong language tag
    // ? FIX: Upgrade the language based on what we found AND add positive score
    if (hasCPreprocessor || hasCTypes || hasArduinoPatterns) {
      score += 50; // Boost C/C++ code
      reasons.push('? C/C++ code detected');
    } else {
      score += 20; // Small boost for other code patterns
      reasons.push('?? PLAINTEXT but looks like code');
    }
  }
  
  // Skip import-only snippets
  const trimmedCode = code.trim();
  if (trimmedCode.startsWith('import ') && nonEmptyLines <= 2) {
    score -= 400;
    reasons.push('? IMPORT-ONLY snippet');
    shouldSkip = true;
  }
  // ===== END SNIPPET FILTER =====
  
  const editor = getMonacoEditorForApply();
  const currentEditorCode = editor?.getValue() || '';
  const normalizedBlockCode = code.trim().replace(/\r\n/g, '\n');
  const normalizedEditorCode = currentEditorCode.trim().replace(/\r\n/g, '\n');
  
  if (normalizedBlockCode === normalizedEditorCode) {
    score -= 500;
    reasons.push('? IDENTICAL TO EDITOR');
    shouldSkip = true;
  }
  
  const isModificationRequest = !isExplanationRequest();
  
  if (!isModificationRequest) {
    score -= 50;
    reasons.push('explanation request');
    if (lineCount < 10) shouldSkip = true;
  }
  
  if (isSnippetOrExample(code, block) && lineCount < 10) {
    score -= 40;
    reasons.push('snippet/example');
    shouldSkip = true;
  }
  
  const aiFileCheck = checkAIMessageForDifferentFile(block, currentFileName);
  if (aiFileCheck.mentionsDifferentFile) {
    const aiSearchOn = isAIProjectSearchEnabled();
    
    if (aiSearchOn) {
      score -= 50;
      reasons.push(`?? WILL AUTO-OPEN: ${aiFileCheck.mentionedFile || 'unknown'}`);
    } else {
      score -= 300;
      reasons.push(`? AI MENTIONS DIFFERENT FILE: ${aiFileCheck.mentionedFile || 'unknown'}`);
      shouldSkip = true;
    }
  }
  
  const detectedFileName = extractTargetFileName(block, code);
  const aiSearchEnabled = isAIProjectSearchEnabled();
  
  if (detectedFileName && currentFileName) {
    const detectedBase = detectedFileName.replace(/\.[^/.]+$/, '').toLowerCase();
    const currentBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
    
    if (detectedFileName.toLowerCase() === currentFileName.toLowerCase()) {
      score += 100;
      reasons.push(`? FILE MATCH: ${detectedFileName}`);
      if (!aiFileCheck.mentionsDifferentFile) shouldSkip = false;
    } else if (detectedBase === currentBase) {
      score += 50;
      reasons.push(`similar file: ${detectedFileName}`);
      if (!aiFileCheck.mentionsDifferentFile) shouldSkip = false;
    } else {
      if (aiSearchEnabled) {
        reasons.push(`?? Target: ${detectedFileName}`);
      } else {
        score -= 200;
        reasons.push(`? WRONG FILE: ${detectedFileName} ? ${currentFileName}`);
        shouldSkip = true;
      }
    }
  }
  
  if (currentFileLang && language !== 'plaintext') {
    const langMap: Record<string, string[]> = {
      'typescript': ['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'],
      'typescriptreact': ['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'],
      'javascript': ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'],
      'javascriptreact': ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'],
      'python': ['python', 'py'],
      'rust': ['rust', 'rs'],
      'csharp': ['csharp', 'cs', 'c#'],
      'java': ['java'],
      'html': ['html', 'htm'],
      'css': ['css', 'scss', 'sass'],
      'json': ['json'],
      // ? v14: C/C++/Arduino support
      'c': ['c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'ino', 'arduino'],
      'cpp': ['cpp', 'hpp', 'cc', 'cxx', 'c', 'h', 'ino', 'arduino'],
      'arduino': ['ino', 'arduino', 'cpp', 'c', 'h'],
    };
    
    const currentLangAliases = langMap[currentFileLang] || [currentFileLang];
    if (currentLangAliases.includes(language)) {
      score += 50;
      reasons.push(`language match (${language})`);
    }
  }
  
  // ===== LANGUAGE <-> FILE CROSS-VALIDATION =====
  // Bash/shell code should NEVER be applied to source files
  if (currentFileName) {
    const fileExt = currentFileName.split('.').pop()?.toLowerCase() || '';
    const sourceExts = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'json', 'vue', 'svelte', 'py', 'rs', 'c', 'cpp', 'h', 'java', 'cs', 'go', 'rb', 'php'];
    const termLangsCheck = ['bash', 'shell', 'sh', 'zsh', 'bat', 'cmd', 'powershell', 'ps1', 'terminal', 'console', 'dos', 'bas'];
    
    if (termLangsCheck.includes(language) && sourceExts.includes(fileExt)) {
      score -= 600;
      reasons.push('LANG MISMATCH: ' + language + ' -> .' + fileExt);
      shouldSkip = true;
      console.log('[Score] Language mismatch: ' + language + ' code cannot go into .' + fileExt + ' file');
    }
  }

  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  const textBefore = parentMessage?.textContent?.toLowerCase() || '';
  
  const recommendedKeywords = ['recommended', 'final', 'complete', 'updated', 'fixed', 'corrected', 'improved', 'here is the', 'use this', 'replace with'];
  for (const keyword of recommendedKeywords) {
    if (textBefore.includes(keyword)) {
      score += 20;
      reasons.push(`has "${keyword}" marker`);
      break;
    }
  }
  
  if (lineCount >= 10 && lineCount <= 500) {
    score += Math.min(lineCount / 5, 25);
    reasons.push(`${lineCount} lines`);
  } else if (lineCount >= 5 && lineCount < 10) {
    score += 10;
    reasons.push(`${lineCount} lines (medium)`);
  } else if (lineCount < 5) {
    score -= 20;
    reasons.push('very short');
  }
  
  const hasCompleteStructure = /^(export\s+)?(function|class|const|let|var|interface|type|def|async|public|private)\s+\w+/m.test(code);
  if (hasCompleteStructure) {
    score += 15;
    reasons.push('complete structure');
  }
  
  // ? v14+FIX: Only detect actual git merge conflict markers, not comment separators
  // Real conflict markers are on their own lines and have specific formats
  const hasGitConflictMarkers = /^<{6,}\s/m.test(code) || /^>{6,}\s/m.test(code) || /^={7,}$/m.test(code);
  if (hasGitConflictMarkers) {
    score -= 30;
    reasons.push('looks like diff');
  }
  
  const nonCommentLines = code.split('\n').filter(line => {
    const trimmed = line.trim();
    // ? FIX: Don't treat C preprocessor directives (#include, #define, etc.) as comments
    // Only treat # as comment if followed by space and no preprocessor keyword
    const isPreprocessor = /^#\s*(include|define|ifndef|ifdef|endif|if|elif|else|pragma|undef|warning|error)\b/.test(trimmed);
    const isComment = trimmed.startsWith('//') || 
                      (trimmed.startsWith('#') && !isPreprocessor) ||
                      trimmed.startsWith('*') ||
                      trimmed.startsWith('/*');
    return trimmed && !isComment;
  });
  if (nonCommentLines.length < 3) {
    score -= 20;
    reasons.push('mostly comments');
  }
  
  const isWrongFile = reasons.some(r => r.includes('WRONG FILE'));
  const isIdentical = reasons.some(r => r.includes('IDENTICAL'));
  const aiMentionsDifferent = reasons.some(r => r.includes('AI MENTIONS DIFFERENT FILE'));
  const willAutoOpen = reasons.some(r => r.includes('WILL AUTO-OPEN'));
  
  if (willAutoOpen) {
    shouldSkip = false;
  } else if (score >= MIN_SCORE_TO_APPLY && !isWrongFile && !isIdentical && !aiMentionsDifferent) {
    shouldSkip = false;
  }
  
  if ((isWrongFile || isIdentical || aiMentionsDifferent) && !willAutoOpen) {
    shouldSkip = true;
  }
  
  return { block, code, language, score, reasons, shouldSkip };
}

function selectBestCodeBlock(blocks: HTMLElement[]): HTMLElement | null {
  if (blocks.length === 0) return null;
  
  const editor = getMonacoEditorForApply();
  const model = editor?.getModel();
  const currentFileLang = model?.getLanguageId?.() || '';
  const currentFileName = model?.uri?.path?.split('/').pop() || '';
  
  console.log(`?? [SmartSelect] Scoring ${blocks.length} code blocks (file: ${currentFileName})`);
  
  const scoredBlocks: CodeBlockScore[] = [];
  for (const block of blocks) {
    const scored = scoreCodeBlock(block, currentFileLang, currentFileName);
    if (scored) {
      scoredBlocks.push(scored);
      const skipNote = scored.shouldSkip ? ' ?? SKIP' : '';
      console.log(`   ?? Score ${scored.score}: ${scored.language} (${scored.code.split('\n').length} lines) - ${scored.reasons.join(', ')}${skipNote}`);
    }
  }
  
  if (scoredBlocks.length === 0) return null;
  
  if (isAIProjectSearchEnabled() && scoredBlocks.length > 1) {
    const targetFiles = new Set<string>();
    for (const scored of scoredBlocks) {
      const detectedFile = extractTargetFileName(scored.block, scored.code);
      // Filter out false positives before adding to target files
      if (detectedFile && !isTechnologyNameNotFile(detectedFile)) {
        targetFiles.add(detectedFile.toLowerCase());
      }
    }
    
    if (targetFiles.size > 1) {
      console.log(`?? [SmartSelect] Multi-file detected! ${targetFiles.size} different files`);
      showAutoApplyToast(`?? Found code for ${targetFiles.size} files - processing...`, 'success');
      setTimeout(() => processMultiFileApply(), 100);
      return null;
    }
  }
  
  const validBlocks = scoredBlocks.filter(b => !b.shouldSkip);
  const skippedBlocks = scoredBlocks.filter(b => b.shouldSkip);
  
  if (skippedBlocks.length > 0) {
    console.log(`   ?? Skipping ${skippedBlocks.length} blocks`);
  }
  
  if (validBlocks.length === 0) {
    const autoOpenBlocks = skippedBlocks.filter(b => b.reasons.some(r => r.includes('WILL AUTO-OPEN')));
    
    if (autoOpenBlocks.length > 0 && isAIProjectSearchEnabled()) {
      console.log(`?? [SmartSelect] All blocks are for different files - triggering multi-file apply`);
      setTimeout(() => processMultiFileApply(), 100);
      return null;
    }
    
    console.log(`   ?? No valid blocks`);
    const identicalBlocks = skippedBlocks.filter(b => b.reasons.some(r => r.includes('IDENTICAL')));
    
    if (identicalBlocks.length > 0 && identicalBlocks.length === skippedBlocks.length) {
      showAutoApplyToast(`?? AI returned same code - no changes`, 'success');
    } else {
      showAutoApplyToast('?? Skipped: No suitable code block', 'success');
    }
    
    blocks.forEach(b => {
      const id = generateBlockId(b);
      processedBlockIds.add(id);
    });
    
    return null;
  }
  
  validBlocks.sort((a, b) => b.score - a.score);
  const best = validBlocks[0];
  
  const isAutoOpenBlock = best.reasons.some(r => r.includes('WILL AUTO-OPEN'));
  
  if (best.score < MIN_SCORE_TO_APPLY && !isAutoOpenBlock) {
    console.log(`   ?? Best score (${best.score}) below threshold`);
    showAutoApplyToast('?? Skipped: No suitable code block', 'success');
    blocks.forEach(b => processedBlockIds.add(generateBlockId(b)));
    return null;
  }
  
  console.log(`   ? Selected: ${best.language} with score ${best.score}`);
  return best.block;
}

function getUnprocessedCodeBlocks(): HTMLElement[] {
  // Find the LATEST AI message only
  const aiMessages = document.querySelectorAll('.ai-message, .assistant-message, .response-message, [data-role="assistant"]');
  
  console.log(`?? [GetBlocks] Found ${aiMessages.length} AI messages`);
  
  if (aiMessages.length === 0) {
    // Fallback: get all blocks if no AI message container found
    console.log(`?? [GetBlocks] No AI message container, searching entire document...`);
    const allBlocks = document.querySelectorAll('.cbe-wrapper, .muf-block, pre:has(code), .code-content-wrapper:has(pre)');
    const unprocessed: HTMLElement[] = [];
    allBlocks.forEach(block => {
      const blockId = generateBlockId(block as HTMLElement);
      if (!processedBlockIds.has(blockId)) {
        unprocessed.push(block as HTMLElement);
      }
    });
    console.log(`?? [GetBlocks] Found ${unprocessed.length} unprocessed blocks in document`);
    return unprocessed;
  }
  
  // Get the LAST (most recent) AI message
  const latestMessage = aiMessages[aiMessages.length - 1];
  console.log(`?? [GetBlocks] Searching in latest AI message...`);
  
  // ? FIX v2: Look for ALL possible code block types
  // This catches code blocks that messageUIFix hasn't enhanced yet,
  // AND blocks that MUF touched (.muf-pre) but then SKIPPED wrapping (.muf-block)
  const enhancedBlocks = latestMessage.querySelectorAll('.cbe-wrapper, .muf-block');
  // ? KEY FIX: Don't exclude .muf-pre � MUF may have stamped the class then skipped enhancement
  // Instead, get ALL pre elements and filter out those already inside enhanced wrappers below
  const rawPreBlocks = latestMessage.querySelectorAll('pre');
  const codeOnlyBlocks = latestMessage.querySelectorAll('code[class*="language-"], code[class*="hljs"]');
  // ? Also detect code-content-wrapper divs (used by chat renderer)
  const contentWrapperBlocks = latestMessage.querySelectorAll('.code-content-wrapper');
  
  console.log(`?? [GetBlocks] Enhanced: ${enhancedBlocks.length}, Raw pre: ${rawPreBlocks.length}, Code-only: ${codeOnlyBlocks.length}, ContentWrappers: ${contentWrapperBlocks.length}`);
  
  const unprocessed: HTMLElement[] = [];
  const seenBlocks = new Set<HTMLElement>();
  
  // Add enhanced blocks
  enhancedBlocks.forEach(block => {
    const blockId = generateBlockId(block as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(block as HTMLElement)) {
      console.log(`  ? Added enhanced block: ${blockId}`);
      unprocessed.push(block as HTMLElement);
      seenBlocks.add(block as HTMLElement);
    }
  });
  
  // Add raw pre blocks that aren't inside enhanced wrappers
  rawPreBlocks.forEach(pre => {
    // Skip if already inside an enhanced wrapper
    if (pre.closest('.muf-block') || pre.closest('.cbe-wrapper')) {
      console.log(`  ?? Skipping pre - inside enhanced wrapper`);
      return;
    }
    
    // Check for code element OR direct code content
    const codeEl = pre.querySelector('code');
    const hasDirectCode = pre.textContent && pre.textContent.trim().length > 20;
    
    if (!codeEl && !hasDirectCode) {
      console.log(`  ?? Skipping pre - no code content`);
      return;
    }
    
    const blockId = generateBlockId(pre as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(pre as HTMLElement)) {
      console.log(`  ? Added raw pre block: ${blockId}`);
      unprocessed.push(pre as HTMLElement);
      seenBlocks.add(pre as HTMLElement);
    }
  });
  
  // Add code-only blocks (not inside pre) that aren't inside enhanced wrappers
  codeOnlyBlocks.forEach(code => {
    // Skip if inside pre or enhanced wrapper
    if (code.closest('pre') || code.closest('.muf-block') || code.closest('.cbe-wrapper')) {
      return;
    }
    
    // Get or create a wrapper element to work with
    const wrapper = code.parentElement;
    if (!wrapper) return;
    
    const blockId = generateBlockId(wrapper as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(wrapper as HTMLElement)) {
      console.log(`  ? Added code-only block: ${blockId}`);
      unprocessed.push(wrapper as HTMLElement);
      seenBlocks.add(wrapper as HTMLElement);
    }
  });
  
  // ? NEW: Add code-content-wrapper blocks (chat renderer wraps code in these)
  // This catches blocks that MUF detected as "file tree" and skipped
  contentWrapperBlocks.forEach(wrapper => {
    // Skip if already inside an enhanced wrapper
    if (wrapper.closest('.muf-block') || wrapper.closest('.cbe-wrapper')) {
      return;
    }
    
    // Must contain a pre or code element with real content
    const innerPre = wrapper.querySelector('pre');
    const innerCode = wrapper.querySelector('code');
    const hasContent = (innerPre?.textContent || innerCode?.textContent || '').trim().length > 20;
    
    if (!hasContent) return;
    
    // Use the inner pre if available, otherwise the wrapper itself
    const targetEl = innerPre || wrapper;
    const blockId = generateBlockId(targetEl as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(targetEl as HTMLElement)) {
      console.log(`  ? Added code-content-wrapper block: ${blockId}`);
      unprocessed.push(targetEl as HTMLElement);
      seenBlocks.add(targetEl as HTMLElement);
    }
  });
  
  console.log(`?? [GetBlocks] Total: ${unprocessed.length} unprocessed blocks`);
  
  return unprocessed;
}

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
    pendingNewCode = newCode;  // ?? FIX: Store for accept
    
    // Quick identical check
    if (oldCode.trim() === newCode.trim()) {
      isTypingInProgress = false;
      originalCodeBeforeApply = '';
      pendingNewCode = '';  // ?? FIX: Clear pending
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
    
    console.log(`?? [SmartUpdate] Line analysis: +${added} added, -${deleted} deleted, ~${modified} modified`);
    
    // ?? Pipeline: Stage 2 � ANALYZE
    if (surgicalPipeline.isActive()) {
      surgicalPipeline.enter(2, `Diffing ${oldLines.length} ? ${newLines.length} lines`);
      surgicalPipeline.complete(2, `+${added} -${deleted} ~${modified}`);
    }
    
    if (added === 0 && deleted === 0 && modified === 0) {
      isTypingInProgress = false;
      originalCodeBeforeApply = '';
      pendingNewCode = '';  // ?? FIX: Clear pending
      return { success: true, message: 'No changes needed' };
    }
    
    // ??? DESTRUCTIVE CHANGE GUARD � block if AI would delete most of the file
    const deletionRatio = deleted / Math.max(oldLines.length, 1);
    const sizeRatio = newLines.length / Math.max(oldLines.length, 1);
    if (oldLines.length > 20 && (deletionRatio > 0.95 || sizeRatio < 0.05)) {
      console.warn(
        `??? [SAFETY] BLOCKED destructive change!\n` +
        `   Original: ${oldLines.length} lines\n` +
        `   New code: ${newLines.length} lines\n` +
        `   Would delete: ${deleted} lines (${(deletionRatio * 100).toFixed(0)}%)\n` +
        `   Size ratio: ${(sizeRatio * 100).toFixed(0)}%\n` +
        `   ?? AI likely returned partial/incomplete code. Rejecting auto-apply.`
      );
      // Show warning toast
      showAutoApplyToast(
        `??? BLOCKED: AI returned ${newLines.length} lines but your file has ${oldLines.length}. ` +
        `Would lose ${deleted} lines (${(deletionRatio * 100).toFixed(0)}% deletion). ` +
        `Ask AI to return the COMPLETE file.`,
        'error'
      );
      // Pipeline: mark as error
      if (surgicalPipeline.isActive()) {
        surgicalPipeline.fail(3 as any, `??? Blocked: ${newLines.length}/${oldLines.length} lines (${(deletionRatio * 100).toFixed(0)}% deletion)`);
        surgicalPipeline.end(false);
      }
      isTypingInProgress = false;
      originalCodeBeforeApply = '';
      pendingNewCode = '';
      return { 
        success: false, 
        message: `??? Blocked: AI returned ${newLines.length} lines but file has ${oldLines.length}. Would delete ${(deletionRatio * 100).toFixed(0)}% of code.` 
      };
    }
    
    // ATOMIC APPLY - Surgical (with backup) or Legacy
    const startTime = performance.now();
    const _sb = (window as any).surgicalBridge;
    if (_sb?.canUse()) {
      // ?? Pipeline: Stage 3 � ROUTE ? Surgical
      if (surgicalPipeline.isActive()) {
        surgicalPipeline.enter(3, 'Checking surgical eligibility...');
        surgicalPipeline.complete(3, '?? Surgical mode (Rust + backup)');
      }
      try {
        // ?? Pipeline: Stage 4 � APPLY (Rust disk write)
        if (surgicalPipeline.isActive()) {
          surgicalPipeline.enter(4, 'Writing to disk via Rust backend...');
        }
        const sbResult = await _sb.apply(newCode);
        if (surgicalPipeline.isActive()) {
          const backupInfo = sbResult?.changeRecord?.backupPath || 'backup created';
          surgicalPipeline.complete(4, `Disk write ? | ${backupInfo.split(/[\/\\]/).pop()}`);
        }
        // ?? Pipeline: Stage 5 � SYNC
        if (surgicalPipeline.isActive()) {
          surgicalPipeline.enter(5, 'Syncing Monaco editor from disk...');
          surgicalPipeline.complete(5, 'Editor synced ?');
        }
        console.log('?? Applied via Surgical Edit Engine');
      } catch (_sbErr: any) {
        if (surgicalPipeline.isActive()) {
          surgicalPipeline.fail(4, `Surgical failed: ${_sbErr.message || _sbErr}`);
          surgicalPipeline.enter(3, 'Falling back to legacy...');
          surgicalPipeline.complete(3, '?? Legacy mode (in-memory)');
        }
        console.warn('?? Surgical failed, using legacy:', _sbErr);
        editor.executeEdits('smart-update', [{
          range: model.getFullModelRange(),
          text: newCode,
          forceMoveMarkers: true
        }]);
        if (surgicalPipeline.isActive()) {
          surgicalPipeline.skip(5, 'Legacy mode � no disk sync needed');
        }
      }
    } else {
      // ?? Pipeline: Stage 3 � ROUTE ? Legacy
      if (surgicalPipeline.isActive()) {
        surgicalPipeline.enter(3, 'Surgical not available');
        surgicalPipeline.complete(3, '? Legacy mode (in-memory only)');
        surgicalPipeline.skip(4, 'No Rust backend � using Monaco edits');
        surgicalPipeline.skip(5, 'No disk sync in legacy mode');
      }
      editor.executeEdits('smart-update', [{
        range: model.getFullModelRange(),
        text: newCode,
        forceMoveMarkers: true
      }]);
    }
    
    // Re-get model after edit (it might have changed)
    const modelAfterEdit = editor.getModel();
    const totalLines = modelAfterEdit?.getLineCount() || newLines.length;
    
    // Visual feedback with decorations
    const decorations: any[] = [];
    const maxDecorations = 200; // Allow more decorations
    
    console.log(`?? [SmartUpdate] Creating decorations for ${lastChangeLines.addedLines.length} added, ${lastChangeLines.modifiedLines.length} modified lines`);
    console.log(`?? [SmartUpdate] Total lines in model: ${totalLines}`);
    
    // ?? Pipeline: Stage 6 � DECORATE
    if (surgicalPipeline.isActive()) {
      surgicalPipeline.enter(6, `Highlighting ${lastChangeLines.addedLines.length + lastChangeLines.modifiedLines.length} lines`);
    }
    
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
    
    console.log(`?? [SmartUpdate] Adding ${decorations.length} decorations`);
    console.log(`?? [SmartUpdate] Added lines: ${lastChangeLines.addedLines.slice(0, 10).join(', ')}${lastChangeLines.addedLines.length > 10 ? '...' : ''}`);
    console.log(`?? [SmartUpdate] Modified lines: ${lastChangeLines.modifiedLines.slice(0, 10).join(', ')}${lastChangeLines.modifiedLines.length > 10 ? '...' : ''}`);
    
    if (decorations.length > 0) {
      // Apply decorations
      console.log(`?? [SmartUpdate] Calling deltaDecorations with ${decorations.length} decorations`);
      const ids = editor.deltaDecorations([], decorations);
      console.log(`?? [SmartUpdate] deltaDecorations returned ${ids?.length || 0} IDs`);
      
      // Verify CSS is injected
      const styleEl = document.getElementById('aca-highlight-styles-v3');
      console.log(`?? [SmartUpdate] CSS injected: ${styleEl ? 'YES' : 'NO'}`);
      
      // Verify class appears in DOM
      setTimeout(() => {
        const highlighted = document.querySelectorAll('.aca-highlight-added, .aca-highlight-modified');
        console.log(`?? [SmartUpdate] Highlighted elements in DOM: ${highlighted.length}`);
      }, 100);
      console.log(`?? [SmartUpdate] Decoration IDs created: ${ids.length}`);
      
      // ?? Pipeline: Stage 6 � DECORATE complete
      if (surgicalPipeline.isActive()) {
        surgicalPipeline.complete(6, `${ids.length} highlight(s) applied`);
      }
      
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
        console.log(`?? [SmartUpdate] Stored decorations for: ${currentFileName}`);
      }
      // Never auto-clear - wait for Accept/Reject
    } else {
      console.log(`?? [SmartUpdate] No decorations to add - changes detected: added=${lastChangeLines.addedLines.length}, modified=${lastChangeLines.modifiedLines.length}`);
    }
    
    // Scroll to first change
    const firstChange = lastChangeLines.addedLines[0] || lastChangeLines.modifiedLines[0] || 1;
    editor.revealLineInCenter(firstChange);
    
    const elapsed = performance.now() - startTime;
    console.log(`? [SmartUpdate] Applied in ${elapsed.toFixed(0)}ms`);
    
    isTypingInProgress = false;
    const summary = `+${added} -${deleted} ~${modified}`;
    showConfirmationBar(summary);
    
    return { success: true, message: summary };
    
  } catch (error) {
    console.error('? [SmartUpdate] Error:', error);
    isTypingInProgress = false;
    originalCodeBeforeApply = '';
    if (surgicalPipeline.isActive()) {
      surgicalPipeline.fail(surgicalPipeline.status().stages.findIndex(s => s.status === 'active') || 3, `${error}`);
      surgicalPipeline.end(false);
    }
    return { success: false, message: `Error: ${error}` };
  }
}

export function toggleAutoApply(showDialogNotification: boolean = false): boolean {
  autoApplyEnabled = !autoApplyEnabled;
  updateAutoApplyIndicator();
  
  localStorage.setItem('autonomousMode', String(autoApplyEnabled));
  
  // ? FIX: Sync BOTH class-based and ID-based toggle buttons
  const autonomousToggleClass = document.querySelector('.autonomous-mode-toggle');
  if (autonomousToggleClass) {
    autonomousToggleClass.classList.toggle('active', autoApplyEnabled);
    autonomousToggleClass.setAttribute('title', autoApplyEnabled ? 'Autonomous Mode ON' : 'Autonomous Mode OFF');
  }
  
  // Also sync the ID-based button from professionalIcons.ts
  const autonomousToggleId = document.getElementById('autonomous-mode-toggle');
  if (autonomousToggleId) {
    autonomousToggleId.classList.toggle('active', autoApplyEnabled);
    autonomousToggleId.classList.toggle('auto-active', autoApplyEnabled);
    autonomousToggleId.setAttribute('title', autoApplyEnabled ? 'Auto Mode: ON' : 'Auto Mode: OFF');
  }
  
  if (autoApplyEnabled) {
    // Show dialog or toast based on parameter
    if (showDialogNotification) {
      showAutoModeDialog(true);
    } else {
      showAutoApplyToast('?? Auto Mode ON', 'success');
    }
    console.log('?? [Autonomous] Enabled');
    processedBlockIds.clear();
    lastProcessedBlockId = '';
    
    // ? When Auto Mode is ON, also turn ON Project Search
    localStorage.setItem('aiFileExplorerEnabled', 'true');
    (window as any).aiFileExplorerEnabled = true;
    (window as any).aiSearchEnabled = true;
    
    // Sync Project Search button
    const searchBtn = document.getElementById('ai-search-btn');
    if (searchBtn) {
      searchBtn.classList.add('active', 'ai-active');
      searchBtn.title = 'Project Search: ON';
      searchBtn.style.color = '#10b981';
      console.log('?? [Project Search] Auto-enabled with Auto Mode');
    }
  } else {
    if (showDialogNotification) {
      showAutoModeDialog(false);
    } else {
      showAutoApplyToast('?? Auto Mode OFF', 'success');
    }
    console.log('?? [Autonomous] Disabled');
    if (isTypingInProgress) stopTypingFlag = true;
  }
  
  return autoApplyEnabled;
}

export function setAutoApply(enabled: boolean): void {
  autoApplyEnabled = enabled;
  updateAutoApplyIndicator();
  localStorage.setItem('autonomousMode', String(autoApplyEnabled));
  
  // ? FIX: Sync BOTH class-based and ID-based toggle buttons
  const autonomousToggleClass = document.querySelector('.autonomous-mode-toggle');
  if (autonomousToggleClass) autonomousToggleClass.classList.toggle('active', autoApplyEnabled);
  
  // Also sync the ID-based button from professionalIcons.ts
  const autonomousToggleId = document.getElementById('autonomous-mode-toggle');
  if (autonomousToggleId) {
    autonomousToggleId.classList.toggle('active', autoApplyEnabled);
    autonomousToggleId.classList.toggle('auto-active', autoApplyEnabled);
  }
  
  if (enabled) {
    processedBlockIds.clear();
    lastProcessedBlockId = '';
    
    // ? When Auto Mode is ON, also turn ON Project Search
    localStorage.setItem('aiFileExplorerEnabled', 'true');
    (window as any).aiFileExplorerEnabled = true;
    (window as any).aiSearchEnabled = true;
    
    // Sync Project Search button
    const searchBtn = document.getElementById('ai-search-btn');
    if (searchBtn) {
      searchBtn.classList.add('active', 'ai-active');
      searchBtn.title = 'Project Search: ON';
      searchBtn.style.color = '#10b981';
    }
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
  
  // ===== TERMINAL GUARD: Never apply bash/terminal commands to source files =====
  const fileName = model.uri?.path?.split('/').pop()?.toLowerCase() || '';
  const shellExts = ['.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.psm1'];
  const isShellFile = shellExts.some(ext => fileName.endsWith(ext));
  if (!isShellFile && _isTerminalCodeGuard(code)) {
    console.log(`??? [ApplyGuard] BLOCKED: Terminal commands cannot replace ${fileName}`);
    return { success: false, message: 'Blocked: terminal commands cannot replace source file' };
  }
  // ===== END TERMINAL GUARD =====
  
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

// ============================================================================
// AUTO-APPLY NEW CODE BLOCK - MAIN FUNCTION WITH MULTI-FILE INTEGRATION
// ============================================================================

async function autoApplyNewCodeBlock(block: HTMLElement | null = null): Promise<void> {
  // X02: Skip if block is inside an analysis result (Quick/Deep Analyze output)
  if (block && block.closest("[data-analysis-result]")) {
    console.log("[AutoApply] Skipped - inside analysis result");
    return;
  }
  if ((window as any).__analysisMode) { console.log('[AutoApply] Skipped - analysis mode'); return; }
  if ((window as any).__analysisMode) { console.log('[AutoApply] Skipped - analysis mode'); return; }
  if (!autoApplyEnabled) {
    return; // Disabled
  }
  
  if (isTypingInProgress) {
    return; // Typing in progress
  }
  
  // Skip if multi-file is processing
  if (isProcessingMultiFile) {
    return; // Multi-file in progress
  }
  
  // Check for multi-file scenario
  if (!isProcessingMultiFile) {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    
    if (unprocessedBlocks.length >= 1) {
      const targetFiles = new Map<string, HTMLElement[]>();
      
      for (const blk of unprocessedBlocks) {
        const codeInfo = extractCodeFromBlockForApply(blk);
        if (!codeInfo || !codeInfo.code.trim()) continue;
        
        // ===== SNIPPET FILTER: Skip tiny code blocks =====
        const codeLines = codeInfo.code.trim().split('\n').filter(line => line.trim());
        if (codeLines.length < 5) continue; // Skip snippets (increased from 3)
        // ? FIX: Don't skip plaintext if it looks like C/C++ code
        const looksLikeCCode = codeInfo.code.match(/^#\s*(include|define|ifndef|ifdef|endif|pragma)\b/m) ||
                              codeInfo.code.match(/\b(void|int|char|float|double|struct|typedef)\s+\w+/m);
        if (codeInfo.language?.toLowerCase() === 'plaintext' && !looksLikeCCode) continue; // Skip PLAINTEXT (unless it's C)
        const trimmedCode = codeInfo.code.trim();
        if (trimmedCode.startsWith('import ') && codeLines.length <= 3) continue; // Skip import-only
        
        // Skip explanation snippets
        const parentMessage = blk.closest('.message, .ai-message, .assistant-message, [class*="message"]');
        if (parentMessage) {
          const messageText = parentMessage.textContent?.toLowerCase() || '';
          if (/line\s*\d+\s*(is|shows?|contains?)/i.test(messageText) && codeLines.length <= 5) continue;
          if (/this\s+(line|code)\s+(is|imports?)/i.test(messageText) && codeLines.length <= 5) continue;
        }
        // ===== END SNIPPET FILTER =====
        
        const detectedFile = extractTargetFileName(blk, codeInfo.code);
        // Filter out false positives before adding to target files
        if (detectedFile && !isTechnologyNameNotFile(detectedFile)) {
          const key = detectedFile.toLowerCase();
          if (!targetFiles.has(key)) targetFiles.set(key, []);
          targetFiles.get(key)!.push(blk);
        }
      }
      
      console.log(`?? [AutoApply] Found ${unprocessedBlocks.length} blocks targeting ${targetFiles.size} file(s)`);
      
      const editor = getMonacoEditorForApply();
      const currentFile = editor?.getModel()?.uri?.path?.split('/').pop()?.toLowerCase() || '';
      
      if (targetFiles.size > 1) {
        console.log(`?? [AutoApply] MULTI-FILE DETECTED: ${Array.from(targetFiles.keys()).join(', ')}`);
        await processMultiFileApply();
        return;
      }
      
      if (targetFiles.size === 1) {
        const targetFile = Array.from(targetFiles.keys())[0];
        
        if (targetFile !== currentFile && currentFile !== '') {
          console.log(`?? [AutoApply] Code is for "${targetFile}" but "${currentFile}" is open`);
          await processMultiFileApply();
          return;
        } else if (currentFile === '') {
          console.log(`?? [AutoApply] No file open. Will open "${targetFile}"`);
          await processMultiFileApply();
          return;
        }
      }
    }
  }
  
  // Only clear processedBlockIds if there's truly a new message AND we haven't processed it yet
  if (hasNewMessage()) {
    // Mark the message as processed FIRST to prevent re-clearing
    markMessageProcessed();
    // Then clear for this new message
    processedBlockIds.clear();
    console.log('?? [AutoApply] New message - cleared processed blocks');
  }
  
  let targetBlock = block;
  if (!targetBlock) {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length === 0) {
      console.log('?? [AutoApply] No unprocessed blocks');
      markMessageProcessed();
      return;
    }
    
    targetBlock = selectBestCodeBlock(unprocessedBlocks);
    if (!targetBlock) {
      console.log('?? [AutoApply] No suitable code block found');
      markMessageProcessed();
      return;
    }
  } else {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length > 1) {
      console.log(`?? [AutoApply] Multiple blocks (${unprocessedBlocks.length}), selecting best...`);
      targetBlock = selectBestCodeBlock(unprocessedBlocks);
      if (!targetBlock) {
        markMessageProcessed();
        return;
      }
    }
  }
  
  const blockId = generateBlockId(targetBlock);
  console.log('?? [AutoApply] Processing block:', blockId);
  
  if (processedBlockIds.has(blockId)) {
    console.log('?? [AutoApply] Already processed:', blockId);
    return;
  }
  
  const codeInfo = extractCodeFromBlockForApply(targetBlock);
  if (!codeInfo || !codeInfo.code.trim()) {
    console.log('?? [AutoApply] No code found in block');
    return;
  }
  
  console.log('?? [AutoApply] Selected code:', codeInfo.language, codeInfo.code.length, 'chars');
  
  const editor = getMonacoEditorForApply();
  if (!editor) {
    console.log('?? [AutoApply] No editor open');
    showAutoApplyToast('?? Open a file first', 'error');
    return;
  }
  
  const fileValidation = validateFileMatch(targetBlock, codeInfo.code);
  console.log(`?? [FileValidation] ${fileValidation.reason}`);
  
  if (!fileValidation.isValid) {
    console.log(`?? [FileValidation] Mismatch: ${fileValidation.detectedFileName} vs ${fileValidation.currentFileName}`);
    
    if (isAIProjectSearchEnabled() && fileValidation.detectedFileName) {
      console.log(`?? [AutoOpen] AI Project Search is ON - attempting auto-open...`);
      
      const success = await autoOpenAndApply(fileValidation.detectedFileName, codeInfo.code, blockId, targetBlock);
      if (success) return;
      
      console.log(`?? [AutoOpen] Auto-open failed, showing manual warning`);
    }
    
    return new Promise<void>((resolve) => {
      showFileMismatchWarning(
        fileValidation,
        async () => {
          console.log('?? [FileValidation] User chose to apply anyway');
          await doApplyCode(targetBlock!, codeInfo.code, blockId);
          resolve();
        },
        () => {
          console.log('? [FileValidation] User cancelled apply');
          processedBlockIds.add(blockId);
          showAutoApplyToast(`?? Skipped - wrong file`, 'success');
          resolve();
        }
      );
    });
  }
  
  await doApplyCode(targetBlock, codeInfo.code, blockId);
}

async function doApplyCode(targetBlock: HTMLElement, code: string, blockId: string): Promise<void> {
  // ?? Pipeline: BEGIN
  surgicalPipeline.begin();
  surgicalPipeline.enter(0, 'Code block found in AI response');
  
  const allUnprocessed = getUnprocessedCodeBlocks();
  surgicalPipeline.complete(0, `${allUnprocessed.length} block(s) detected`);
  
  allUnprocessed.forEach(b => {
    const id = generateBlockId(b);
    processedBlockIds.add(id);
  });
  lastProcessedBlockId = blockId;
  
  // ?? Pipeline: Stage 1 � SELECT
  surgicalPipeline.enter(1, 'Best code block selected');
  surgicalPipeline.complete(1, `${code.split('\n').length} lines`);
  
  markMessageProcessed();
  
  showAutoApplyToast(`?? Analyzing changes...`, 'success');
    // Also update center dialog during analysis
    if (statusDialog) { updateStatusText('Analyzing changes...'); updateProgress(15); }
  
  targetBlock.style.boxShadow = '0 0 0 2px #4caf50';
  targetBlock.style.transition = 'box-shadow 0.3s';
  
  allUnprocessed.forEach(b => {
    if (b !== targetBlock) {
      (b as HTMLElement).style.opacity = '0.5';
      setTimeout(() => { (b as HTMLElement).style.opacity = ''; }, 2000);
    }
  });
  
  console.log('?? [AutoApply] Starting smart update...');
    // Show center progress dialog for single-file too
    showStatusDialog();
    updateStatusText('Applying changes...');
    updateProgress(20);
  const result = await applySmartUpdate(code);
  
  setTimeout(() => { targetBlock!.style.boxShadow = ''; }, 500);
  
  if (result.success) {
    showAutoApplyToast(`? ${result.message}`, 'success');
    console.log(`? [AutoApply] ${result.message}`);
      // Update center dialog on success
      updateStatusText('Changes applied');
      updateProgress(100);
      addStatusLog('Changes applied successfully', 'success');
      setTimeout(() => closeStatusDialog(), 2500);
    
    // ?? Pipeline: Stage 7 � CONFIRM
    surgicalPipeline.enter(7, 'Accept / Reject prompt');
    surgicalPipeline.complete(7, result.message);
    surgicalPipeline.end(true);
      setTimeout(() => { const d = document.getElementById("ai-status-dialog"); if (d) { d.style.transition = "opacity 0.4s"; d.style.opacity = "0"; setTimeout(() => d.remove(), 420); } }, 3000); // X02: auto-dismiss
    
    // Mark block with green badge showing changes in header
    const blockId = targetBlock.getAttribute('data-muf-id') || targetBlock.getAttribute('data-block-id') || '';
    markBlockAsApplied(targetBlock, blockId, result.message);
  } else {
    console.warn('? [AutoApply] Failed:', result.message);
    showAutoApplyToast(`? ${result.message}`, 'error');
    surgicalPipeline.end(false);
  }
}

function getMonacoEditorForApply(): any {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return null;
  const editors = monaco.editor.getEditors();
  return editors?.find((e: any) => e.hasTextFocus()) || editors?.[0] || null;
}

function extractCodeFromBlockForApply(block: HTMLElement): { code: string; language: string } | null {
  // Method 1: Check for data textarea (cbe-wrapper style) - BEST SOURCE
  const textarea = block.querySelector('.cbe-data') as HTMLTextAreaElement;
  if (textarea?.value) {
    const lang = block.getAttribute('data-lang') || 'plaintext';
    console.log(`?? [ExtractCode] Got code from textarea (${textarea.value.split('\n').length} lines)`);
    return { code: textarea.value, language: lang };
  }
  
  // Method 2: Find the actual code element (not language labels, buttons, etc.)
  // Be specific: only look for actual code containers
  let codeEl: Element | null = null;
  
  // Priority 1: <code> element inside block
  codeEl = block.querySelector('code:not(.muf-lang-name):not(.cbe-lang)');
  
  // Priority 2: Specific code classes
  if (!codeEl) {
    codeEl = block.querySelector('.muf-code, .cbe-code, .hljs');
  }
  
  // Priority 3: If block IS a pre element, use it (but not the wrapper)
  if (!codeEl && block.tagName === 'PRE') {
    // Check if there's a code inside first
    codeEl = block.querySelector('code') || block;
  }
  
  // Priority 4: Find pre inside block
  if (!codeEl) {
    const pre = block.querySelector('pre');
    if (pre) {
      codeEl = pre.querySelector('code') || pre;
    }
  }
  
  if (!codeEl) return null;
  
  let code = '';
  
  // Try to get from data attribute first (preserves formatting)
  const rawCode = block.getAttribute('data-raw-code');
  if (rawCode) {
    try { 
      code = decodeURIComponent(rawCode); 
      console.log(`?? [ExtractCode] Got code from data-raw-code (${code.split('\n').length} lines)`);
    } catch { 
      code = ''; 
    }
  }
  
  // ? FIX: If no raw code, try multiple methods to preserve newlines
  if (!code) {
    // ? IMPORTANT: Make sure we're extracting from the CODE element, not the wrapper
    const actualCodeEl = codeEl as HTMLElement;
    
    // Method A: Use innerText (preserves whitespace in pre elements)
    // innerText respects CSS styling and preserves line breaks
    const innerText = actualCodeEl.innerText;
    
    // Method B: Use innerHTML and convert
    const innerHTML = actualCodeEl.innerHTML;
    
    // Method C: Use textContent as fallback
    const textContent = actualCodeEl.textContent || '';
    
    // Choose the one with more newlines (better formatting preservation)
    const innerTextLines = innerText?.split('\n').length || 0;
    const textContentLines = textContent.split('\n').length;
    
    // Process innerHTML to extract text with newlines
    let processedHtml = innerHTML
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<\/div>/gi, '\n')     // Convert </div> to newlines
      .replace(/<\/p>/gi, '\n')       // Convert </p> to newlines
      .replace(/<\/li>/gi, '\n')      // Convert </li> to newlines
      .replace(/<[^>]+>/g, '');       // Remove remaining HTML tags
    
    // Decode HTML entities
    const tempEl = document.createElement('textarea');
    tempEl.innerHTML = processedHtml;
    const htmlProcessedCode = tempEl.value;
    const htmlProcessedLines = htmlProcessedCode.split('\n').length;
    
    // Choose the best result
    if (innerTextLines >= htmlProcessedLines && innerTextLines >= textContentLines) {
      code = innerText;
      console.log(`?? [ExtractCode] Using innerText (${innerTextLines} lines)`);
    } else if (htmlProcessedLines >= textContentLines) {
      code = htmlProcessedCode;
      console.log(`?? [ExtractCode] Using processed innerHTML (${htmlProcessedLines} lines)`);
    } else {
      code = textContent;
      console.log(`?? [ExtractCode] Using textContent (${textContentLines} lines)`);
    }
    
    // If code looks like it has HTML entities, try to decode them
    if (code.includes('&lt;') || code.includes('&gt;') || code.includes('&amp;')) {
      const temp = document.createElement('textarea');
      temp.innerHTML = code;
      code = temp.value;
    }
  }
  
  code = code.trim();
  if (!code) return null;
  
  // ? FIX: Clean up common garbage characters at the start
  // Sometimes HTML extraction picks up stray characters from labels, class names, etc.
  // e.g., "s" from "css", "x" from "tsx", etc.
  const cleanupPatterns = [
    // ? FIX: Backtick + language identifier (e.g., "`c\n", "`cpp\n", "`typescript\n")
    /^`[a-z]+\s*\n/i,      // Backtick + language + newline
    /^`\s*\n/i,            // Just backtick + newline
    /^```[a-z]*\s*\n/i,    // Triple backtick fence with optional language
    /^[a-z]\n/i,           // Single letter followed by newline (e.g., "s\n" from "css")
    /^[a-z]{1,4}\s*\n/i,   // 1-4 letters followed by whitespace/newline (c, cpp, html, etc.)
    /^(css|tsx|jsx|ts|js|html|json|py|rs|cpp|c|h|hpp|ino)[\s:]*\n/i,  // Language label on its own line
    /^Copy\s*\n/i,         // "Copy" button text
    /^Copied!\s*\n/i,      // "Copied!" button text
  ];
  
  for (const pattern of cleanupPatterns) {
    if (pattern.test(code)) {
      const before = code.substring(0, 20).replace(/\n/g, '?');
      code = code.replace(pattern, '');
      console.log(`?? [ExtractCode] Cleaned garbage prefix: "${before}" ? "${code.substring(0, 20).replace(/\n/g, '?')}"`);
      break;
    }
  }
  
  code = code.trim();
  if (!code) return null;
  
  // ? v15 FIX: Defer to MUF if extraction returned broken single-line code
  // If code has 100+ chars but NO newlines, and block is NOT yet MUF-enhanced,
  // return null so auto-apply retries after MUF restores proper newlines
  if (!code.includes('\n') && code.length > 100) {
    const isMufEnhanced = block.classList.contains('muf-block') || 
                          block.closest('.muf-block') !== null ||
                          block.hasAttribute('data-raw-code');
    if (!isMufEnhanced) {
      console.warn(`? [ExtractCode] Deferring: ${code.length} chars, 0 newlines, block not MUF-enhanced yet`);
      return null; // Let MUF process first, then retry
    }
    // ? v15+ FIX: If MUF-enhanced but still 1 line, try to restore newlines for HTML content
    const looksLikeHTML = code.includes('<!doctype') || code.includes('<!DOCTYPE') || 
                          code.includes('<html') || code.includes('<head') || code.includes('<body');
    if (looksLikeHTML) {
      console.log(`?? [ExtractCode] Restoring newlines for HTML content (${code.length} chars)`);
      // Split on >< boundaries
      code = code.replace(/(?<=>)\s*(?=<)/g, '\n');
      // Add IDE-style indentation
      const htmlLines = code.split('\n');
      let htmlIndent = 0;
      const indentedLines: string[] = [];
      for (const line of htmlLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^<\//.test(trimmed)) htmlIndent = Math.max(0, htmlIndent - 1);
        indentedLines.push('  '.repeat(htmlIndent) + trimmed);
        if (/^<[a-zA-Z][^>]*[^/]>$/.test(trimmed) && 
            !/^<(!--|!doctype|meta|link|br|hr|img|input|title|base|col|embed|source|track|wbr)/i.test(trimmed)) htmlIndent++;
      }
      // Merge empty elements: <tag>\n</tag> ? <tag></tag>
      for (let i = indentedLines.length - 1; i > 0; i--) {
        const curr = indentedLines[i].trim();
        const prev = indentedLines[i - 1].trim();
        if (/^<\/\w+>$/.test(curr)) {
          const tagName = curr.match(/<\/(\w+)>/)?.[1];
          if (tagName && new RegExp('^<' + tagName + '[\\s>]').test(prev) && !prev.endsWith('/>')) {
            indentedLines[i - 1] = indentedLines[i - 1].trimEnd() + curr;
            indentedLines.splice(i, 1);
          }
        }
      }
      code = indentedLines.join('\n');
      console.log(`? [ExtractCode] Restored ${indentedLines.length} lines with IDE-style indentation`);
    }
    console.warn(`?? [ExtractCode] Code has ${code.length} chars but NO newlines (MUF-enhanced, using as-is)`);
    console.log(`?? [ExtractCode] First 200 chars: ${code.substring(0, 200)}`);
  }
  
  // Detect language
  let language = block.getAttribute('data-lang') || 'plaintext';
  if (language === 'plaintext') {
    // Check code element class
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      language = langMatch[1];
    } else {
      // Check for lang display elements
      const langEl = block.querySelector('.muf-lang-name, .cbe-lang');
      if (langEl) language = langEl.textContent?.toLowerCase() || 'plaintext';
    }
  }
  
  // ? Auto-detect language from code content if still plaintext
  if (language === 'plaintext') {
    // ? v14+FIX: C/C++ detection with more robust patterns
    // Handle possible leading backticks/quotes from markdown issues
    if (code.match(/^[`'\s]*#\s*(include|define|ifndef|ifdef|endif|pragma|undef|if|elif|else)\b/m) ||
        code.match(/#\s*(include|define|ifndef|ifdef|endif)\s/m)) {
      language = 'c';
    } else if (code.match(/\b(int|void|char|float|double|unsigned|signed|struct|typedef|enum)\s+\w+/)) {
      language = 'c';
    } else if (code.match(/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial|delay)\s*\(/)) {
      language = 'cpp'; // Arduino
    } else if (code.includes('import React') || code.includes('export default') || code.includes('useState')) {
      language = 'typescript';
    } else if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<head>')) {
      language = 'html';
    } else if (code.match(/^\s*[.#]?\w+\s*\{/m) || code.includes('margin:') || code.includes('padding:')) {
      language = 'css';
    } else if (code.match(/^def\s+\w+|^class\s+\w+|^import\s+\w+|^from\s+\w+\s+import/m)) {
      language = 'python';
    } else if (code.match(/^package\s+\w+|^func\s+\w+|^type\s+\w+\s+struct/m)) {
      language = 'go';
    } else if (code.match(/^fn\s+\w+|^let\s+mut|^impl\s+\w+|^use\s+\w+::/m)) {
      language = 'rust';
    }
  }
  
  return { code, language };
}

export function applyCodeToEditor(code: string, mode: 'replace' | 'insert' | 'append'): { success: boolean; message: string } {
  // Terminal guard also at export level for safety
  const editor = getMonacoEditorForApply();
  const model = editor?.getModel();
  const fileName = model?.uri?.path?.split('/').pop()?.toLowerCase() || '';
  const shellExts = ['.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1', '.psm1'];
  const isShellFile = shellExts.some(ext => fileName.endsWith(ext));
  if (!isShellFile && _isTerminalCodeGuard(code)) {
    console.log(`??? [ApplyGuard] BLOCKED at export: Terminal commands cannot replace ${fileName}`);
    showAutoApplyToast('??? Blocked: bash commands cannot replace source file', 'error');
    return { success: false, message: 'Blocked: terminal commands' };
  }
  return applyCodeInstant(code, mode);
}

function showAutoApplyToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const existing = document.querySelector('.aca-toast');
  if (existing) existing.remove();
  
  // Determine if this is an Auto Mode toggle message
  const isAutoModeOn = message.includes('Auto Mode ON') || message.includes('Autonomous Mode ON');
  const isAutoModeOff = message.includes('Auto Mode OFF') || message.includes('Autonomous Mode OFF');
  const isAutoMode = isAutoModeOn || isAutoModeOff;
  
  const toast = document.createElement('div');
  toast.className = `aca-toast ${type} ${isAutoMode ? 'aca-toast-auto-mode' : ''} ${isAutoModeOn ? 'auto-on' : ''} ${isAutoModeOff ? 'auto-off' : ''}`;
  
  // Choose icon based on message type
  let icon = '';
  if (isAutoModeOn) {
    icon = `<svg class="aca-toast-icon auto-icon spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>`;
  } else if (isAutoModeOff) {
    icon = `<svg class="aca-toast-icon pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="10" y1="15" x2="10" y2="9"/>
      <line x1="14" y1="15" x2="14" y2="9"/>
    </svg>`;
  } else if (type === 'success') {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
  } else if (type === 'error') {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
  } else {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`;
  }
  
  // Clean message (remove emojis for auto mode)
  let cleanMessage = message;
  if (isAutoMode) {
    cleanMessage = isAutoModeOn ? 'Auto Mode' : 'Auto Mode';
  }
  
  toast.innerHTML = `
    <div class="aca-toast-content">
      ${icon}
      <span class="aca-toast-text">${cleanMessage}</span>
      ${isAutoModeOn ? '<span class="aca-toast-badge">ON</span>' : ''}
      ${isAutoModeOff ? '<span class="aca-toast-badge off">OFF</span>' : ''}
    </div>
    ${isAutoMode ? '<div class="aca-toast-progress"></div>' : ''}
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
    if (isAutoMode) {
      toast.classList.add('animate-in');
    }
  });
  
  // Auto dismiss
  const duration = isAutoMode ? 2500 : 3000;
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('animate-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// AUTO MODE DIALOG - Professional UI
// ============================================================================

function showAutoModeDialog(isEnabled: boolean): void {
  // Remove existing dialog
  const existing = document.querySelector('.auto-mode-dialog-overlay');
  if (existing) existing.remove();
  
  // Inject dialog styles
  injectAutoModeDialogStyles();
  
  const overlay = document.createElement('div');
  overlay.className = 'auto-mode-dialog-overlay';
  
  const statusIcon = isEnabled 
    ? `<svg class="auto-dialog-icon ${isEnabled ? 'spinning' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>`
    : `<svg class="auto-dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="10" y1="15" x2="10" y2="9"/>
        <line x1="14" y1="15" x2="14" y2="9"/>
      </svg>`;
  
  const features = isEnabled ? `
    <div class="auto-dialog-features">
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Auto-apply code to editor</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Multi-file processing</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Smart code detection</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>AI Project auto-enabled</span>
      </div>
    </div>
  ` : `
    <div class="auto-dialog-features disabled">
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Auto-apply disabled</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Manual code application</span>
      </div>
    </div>
  `;
  
  overlay.innerHTML = `
    <div class="auto-mode-dialog ${isEnabled ? 'enabled' : 'disabled'}">
      <button class="auto-dialog-close" onclick="this.closest('.auto-mode-dialog-overlay').remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="auto-dialog-header">
        <div class="auto-dialog-icon-wrapper ${isEnabled ? 'active' : ''}">
          ${statusIcon}
        </div>
        <div class="auto-dialog-title-section">
          <h3 class="auto-dialog-title">Auto Mode</h3>
          <div class="auto-dialog-status">
            <span class="auto-status-indicator ${isEnabled ? 'on' : 'off'}"></span>
            <span class="auto-status-text">${isEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
      </div>
      
      <div class="auto-dialog-body">
        <p class="auto-dialog-description">
          ${isEnabled 
            ? 'AI code will be auto-applied. Press Ctrl+Z to undo.' 
            : 'Auto mode off. Apply code manually.'}
        </p>
        ${features}
      </div>
      
      <div class="auto-dialog-footer">
        <button class="auto-dialog-btn auto-dialog-btn-primary" onclick="this.closest('.auto-mode-dialog-overlay').remove()">
          OK
        </button>
        <button class="auto-dialog-btn auto-dialog-btn-secondary" onclick="this.closest('.auto-mode-dialog-overlay').remove(); if(window.toggleAutoApply) window.toggleAutoApply();">
          ${isEnabled ? 'Turn Off' : 'Turn On'}
        </button>
      </div>
      
      <div class="auto-dialog-progress ${isEnabled ? 'active' : ''}"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
  
  // Auto close after 4 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  }, 4000);
}

function injectAutoModeDialogStyles(): void {
  if (document.getElementById('auto-mode-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'auto-mode-dialog-styles';
  style.textContent = `
    /* ============================================
       AUTO MODE DIALOG - Standalone Floating UI
       ============================================ */
    .auto-mode-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10003;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .auto-mode-dialog-overlay.show {
      opacity: 1;
    }
    
    .auto-mode-dialog {
      pointer-events: auto;
      background: linear-gradient(135deg, #1e2128 0%, #171a1f 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      width: 280px;
      max-width: 90vw;
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .auto-mode-dialog-overlay.show .auto-mode-dialog {
      transform: scale(1) translateY(0);
    }
    
    .auto-mode-dialog.enabled {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }
    
    .auto-mode-dialog.disabled {
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .auto-dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px 12px;
    }
    
    .auto-dialog-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(107, 114, 128, 0.15);
      border: 1px solid rgba(107, 114, 128, 0.2);
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    
    .auto-dialog-icon-wrapper.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }
    
    .auto-dialog-icon {
      width: 28px;
      height: 28px;
      transition: all 0.3s ease;
    }
    
    .auto-dialog-icon-wrapper.active .auto-dialog-icon {
      color: #10b981;
    }
    
    .auto-dialog-icon-wrapper:not(.active) .auto-dialog-icon {
      color: #6b7280;
    }
    
    .auto-dialog-icon.spinning {
      animation: auto-dialog-icon-spin 3s linear infinite;
    }
    
    @keyframes auto-dialog-icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .auto-dialog-title-section {
      flex: 1;
      min-width: 0;
    }
    
    .auto-dialog-title {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #e6edf3;
    }
    
    .auto-dialog-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .auto-status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
    
    .auto-status-indicator.on {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
      /* animation removed - no blinking */
    }
    
    .auto-status-indicator.off {
      background: #6b7280;
    }
    
    .auto-status-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #9ca3af;
    }
    
    .auto-mode-dialog.enabled .auto-status-text {
      color: #10b981;
    }
    
    .auto-dialog-body {
      padding: 0 16px 14px;
    }
    
    .auto-dialog-description {
      margin: 0 0 12px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #8b949e;
    }
    
    .auto-dialog-features {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .auto-feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #c9d1d9;
    }
    
    .auto-feature-item svg {
      width: 12px;
      height: 12px;
      color: #10b981;
      flex-shrink: 0;
    }
    
    .auto-dialog-features.disabled .auto-feature-item svg {
      color: #6b7280;
    }
    
    .auto-dialog-features.disabled .auto-feature-item {
      color: #6b7280;
    }
    
    .auto-dialog-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .auto-dialog-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }
    
    .auto-dialog-btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
    }
    
    .auto-dialog-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
    }
    
    .auto-mode-dialog.disabled .auto-dialog-btn-primary {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      box-shadow: 0 2px 6px rgba(107, 114, 128, 0.3);
    }
    
    .auto-mode-dialog.disabled .auto-dialog-btn-primary:hover {
      box-shadow: 0 4px 10px rgba(107, 114, 128, 0.4);
    }
    
    .auto-dialog-btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .auto-dialog-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
    
    .auto-dialog-progress {
      height: 2px;
      background: transparent;
    }
    
    .auto-dialog-progress.active {
      background: linear-gradient(90deg, #10b981, #059669);
      animation: auto-dialog-progress 4s linear forwards;
    }
    
    @keyframes auto-dialog-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Close button */
    .auto-dialog-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    
    .auto-dialog-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
  `;
  document.head.appendChild(style);
}

function addApplyButtonToBlock(block: HTMLElement): void {
  if (block.querySelector('.aca-btn')) return;
  
  const codeInfo = extractCodeFromBlockForApply(block);
  if (!codeInfo) return;
  
  const btnsContainer = block.querySelector('.cbe-btns, .muf-header-actions');
  if (!btnsContainer) return;
  
  const applyBtn = document.createElement('button');
  applyBtn.className = 'aca-btn cbe-btn';
  applyBtn.innerHTML = AUTO_APPLY_ICONS.apply;
  applyBtn.title = 'Apply to Editor';
  applyBtn.setAttribute('data-act', 'apply');
  
  // REMOVED: Auto-toggle button from code block header
  // The autonomous toggle is now only in the main toolbar (near send button)
  
  applyBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const result = applyCodeToEditor(codeInfo.code, 'replace');
    if (result.success) {
      applyBtn.innerHTML = AUTO_APPLY_ICONS.check;
      applyBtn.classList.add('success');
      showAutoApplyToast(`? ${result.message}`, 'success');
      
      // Mark block with green badge showing changes in header
      const wrapper = block.closest('.cbe-wrapper, .muf-block') || block;
      const blockId = wrapper.getAttribute('data-muf-id') || wrapper.getAttribute('data-block-id') || '';
      markBlockAsApplied(wrapper as HTMLElement, blockId, result.message);
      
      setTimeout(() => {
        applyBtn.innerHTML = AUTO_APPLY_ICONS.apply;
        applyBtn.classList.remove('success');
      }, 2000);
    } else {
      applyBtn.classList.add('error');
      showAutoApplyToast(`? ${result.message}`, 'error');
      setTimeout(() => applyBtn.classList.remove('error'), 2000);
    }
  };
  
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; display: inline-flex;';
  wrapper.appendChild(applyBtn);
  btnsContainer.insertBefore(wrapper, btnsContainer.firstChild);
}

function processAutoApplyCodeBlocks(): void {
  // ? FIX: Also target code-content-wrapper and orphaned pre elements (MUF skipped)
  const blocks = document.querySelectorAll('.cbe-wrapper, .muf-block, .code-content-wrapper:has(pre)');
  blocks.forEach(block => { if (!block.querySelector('.aca-btn')) addApplyButtonToBlock(block as HTMLElement); });
  
  // Also find orphaned pre.muf-pre NOT inside .muf-block (MUF stamped but didn't wrap)
  const orphanedPres = document.querySelectorAll('pre.muf-pre');
  orphanedPres.forEach(pre => {
    if (!pre.closest('.muf-block') && !pre.closest('.cbe-wrapper') && !pre.querySelector('.aca-btn')) {
      const hasContent = (pre.textContent?.trim().length || 0) > 50;
      if (hasContent) addApplyButtonToBlock(pre as HTMLElement);
    }
  });
}

// ============================================================================
// ?? SURGICAL PIPELINE TRACKER � Real-time stage-by-stage visibility
// ============================================================================

interface PipelineStage {
  id: number;
  name: string;
  icon: string;
  status: 'pending' | 'active' | 'done' | 'skipped' | 'error';
  detail: string;
  time?: number;
}

class SurgicalPipelineTracker {
  private stages: PipelineStage[] = [];
  private startTime: number = 0;
  private overlayEl: HTMLElement | null = null;
  private _isActive: boolean = false;
  private runCount: number = 0;
  private _pinned: boolean = false;

  private readonly STAGE_DEFS = [
    { name: 'Detect',    icon: '??' },  // 0
    { name: 'Select',    icon: '??' },  // 1
    { name: 'Analyze',   icon: '??' },  // 2
    { name: 'Route',     icon: '??' },  // 3  Surgical vs Legacy
    { name: 'Apply',     icon: '??' },  // 4  Rust disk write + backup
    { name: 'Sync',      icon: '??' },  // 5  Monaco sync from disk
    { name: 'Decorate',  icon: '??' },  // 6  Highlights + gutter icons
    { name: 'Confirm',   icon: '?' },  // 7  Accept / Reject
  ];

  /** Start a new pipeline run */
  begin(): void {
    // Clear any auto-hide timer from previous pipeline run
    if ((this as any).__pendingAutoHide) {
      clearTimeout((this as any).__pendingAutoHide);
      (this as any).__pendingAutoHide = null;
    }
    this.runCount++;
    this._isActive = true;
    this.startTime = performance.now();
    this.stages = this.STAGE_DEFS.map((def, i) => ({
      id: i,
      name: def.name,
      icon: def.icon,
      status: 'pending' as const,
      detail: '',
    }));
    this.injectStyles();
    this.showOverlay();
    this.logBanner('start');
  }

  /** Mark a stage as active */
  enter(stageIndex: number, detail: string = ''): void {
    if (!this._isActive || stageIndex >= this.stages.length) return;
    const stage = this.stages[stageIndex];
    stage.status = 'active';
    stage.detail = detail;
    stage.time = performance.now() - this.startTime;
    this.logStage(stage);
    this.updateOverlay();
  }

  /** Mark a stage as completed */
  complete(stageIndex: number, detail: string = ''): void {
    if (!this._isActive || stageIndex >= this.stages.length) return;
    const stage = this.stages[stageIndex];
    stage.status = 'done';
    if (detail) stage.detail = detail;
    stage.time = performance.now() - this.startTime;
    this.updateOverlay();
  }

  /** Mark a stage as skipped */
  skip(stageIndex: number, reason: string = ''): void {
    if (!this._isActive || stageIndex >= this.stages.length) return;
    const stage = this.stages[stageIndex];
    stage.status = 'skipped';
    stage.detail = reason;
    stage.time = performance.now() - this.startTime;
    this.updateOverlay();
  }

  /** Mark a stage as failed */
  fail(stageIndex: number, reason: string = ''): void {
    if (!this._isActive || stageIndex >= this.stages.length) return;
    const stage = this.stages[stageIndex];
    stage.status = 'error';
    stage.detail = reason;
    stage.time = performance.now() - this.startTime;
    this.updateOverlay();
  }

  /** End pipeline run and show summary */
  end(success: boolean): void {
    if (!this._isActive) return;
    this._isActive = false;
    const elapsed = (performance.now() - this.startTime).toFixed(0);
    this.logBanner('end', success, elapsed);

    if (this.overlayEl) {
      // Stop the pulse dot � set to solid green (success) or red (error)
      if ((this.overlayEl as any).__dotPulse) {
        clearInterval((this.overlayEl as any).__dotPulse);
      }
      const dot = this.overlayEl.querySelector('span');
      if (dot) {
        dot.style.background = success ? '#34d399' : '#f87171';
        dot.style.opacity = '1';
      }

      // Stop live timer � freeze at final time
      if ((this.overlayEl as any).__timerInterval) {
        clearInterval((this.overlayEl as any).__timerInterval);
      }
      const timerEl = this.overlayEl.querySelector('#sp-elapsed-timer');
      if (timerEl) {
        (timerEl as HTMLElement).textContent = `${(parseFloat(elapsed) / 1000).toFixed(1)}s`;
        (timerEl as HTMLElement).style.color = success ? '#34d399' : '#f87171';
        (timerEl as HTMLElement).style.fontWeight = '600';
      }

      // Auto-hide overlay after 20s (user can close earlier with � button)
      if (!this._pinned) {
        (this.overlayEl as any).__autoHide = setTimeout(() => this.hideOverlay(), 20000);
      }
    }
  }

  isActive(): boolean { return this._isActive; }

  /** Get current status for debug: window.surgicalPipeline.status() */
  status(): { run: number; active: boolean; stages: PipelineStage[]; elapsed: string } {
    return {
      run: this.runCount,
      active: this._isActive,
      stages: [...this.stages],
      elapsed: (performance.now() - this.startTime).toFixed(0) + 'ms',
    };
  }

  // -- Console logging --

  private logBanner(phase: 'start' | 'end', success?: boolean, elapsed?: string): void {
    if (phase === 'start') {
      console.log(
        '%c ?? SURGICAL PIPELINE #' + this.runCount + ' ? STARTED ',
        'background:#7c3aed;color:#fff;font-weight:bold;padding:4px 12px;border-radius:4px;font-size:13px'
      );
    } else {
      const bg = success ? '#059669' : '#dc2626';
      const label = success ? '? SUCCESS' : '? FAILED';
      console.log(
        `%c ?? PIPELINE #${this.runCount} ? ${label}  (${elapsed}ms) `,
        `background:${bg};color:#fff;font-weight:bold;padding:4px 12px;border-radius:4px;font-size:13px`
      );
      // Print summary table
      console.table(this.stages.map(s => ({
        Stage: `${s.icon} ${s.name}`,
        Status: s.status.toUpperCase(),
        Detail: s.detail || '�',
        Time: s.time ? s.time.toFixed(0) + 'ms' : '�',
      })));
    }
  }

  private logStage(stage: PipelineStage): void {
    const colors: Record<string, string> = {
      active: 'color:#a78bfa;font-weight:bold',
      done: 'color:#34d399',
      skipped: 'color:#fbbf24',
      error: 'color:#f87171;font-weight:bold',
      pending: 'color:#6b7280',
    };
    console.log(
      `%c?? [Pipeline] Stage ${stage.id}: ${stage.icon} ${stage.name} � ${stage.detail}`,
      colors[stage.status] || colors.pending
    );
  }

  // -- Visual overlay (INLINE STYLES � no CSS injection needed) --

  private injectStyles(): void {
    // No-op: all styles are inline now for WebView2 compatibility
  }

  private showOverlay(): void {
    // Clear any pending auto-hide timer from previous run (Bug fix: timer race)
    if ((this as any).__pendingAutoHide) {
      clearTimeout((this as any).__pendingAutoHide);
      (this as any).__pendingAutoHide = null;
    }
    this.hideOverlay();
    // Force-remove any orphaned overlay still in DOM (Bug fix: stale element)
    const stale = document.getElementById('surgical-pipeline-overlay');
    if (stale) {
      // Clear its timers too
      if ((stale as any).__dotPulse) clearInterval((stale as any).__dotPulse);
      if ((stale as any).__timerInterval) clearInterval((stale as any).__timerInterval);
      if ((stale as any).__autoHide) clearTimeout((stale as any).__autoHide);
      stale.remove();
    }
    const el = document.createElement('div');
    // All styles inline � no CSS class dependencies
    Object.assign(el.style, {
      position: 'fixed',
      top: '32px',
      left: '8px',
      zIndex: '2147483647',  // max 32-bit int � above EVERYTHING
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      border: '1px solid rgba(124, 58, 237, 0.35)',
      borderRadius: '10px',
      padding: '10px 14px',
      minWidth: '240px',
      maxWidth: '320px',
      boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(255,255,255,0.04) inset',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '12px',
      color: '#e2e8f0',
      pointerEvents: 'auto',
      opacity: '1',           // INSTANT � no fade-in delay
      transform: 'translateY(0)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      cursor: 'default',
    });
    el.id = 'surgical-pipeline-overlay';

    // -- Header row: dot + title + timer + close --
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', alignItems: 'center', gap: '6px',
      marginBottom: '8px', fontWeight: '700', fontSize: '11px',
      textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a78bfa',
    });

    // Pulsing dot
    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '6px', height: '6px', borderRadius: '50%',
      background: '#a78bfa', display: 'inline-block',
    });
    let dotVisible = true;
    const dotPulse = setInterval(() => {
      dotVisible = !dotVisible;
      dot.style.opacity = dotVisible ? '1' : '0.3';
    }, 500);
    (el as any).__dotPulse = dotPulse;
    header.appendChild(dot);

    // Title with run number
    const titleSpan = document.createElement('span');
    titleSpan.textContent = ` Pipeline #${this.runCount}`;
    Object.assign(titleSpan.style, { flex: '1' });
    header.appendChild(titleSpan);

    // Live elapsed timer
    const timerSpan = document.createElement('span');
    timerSpan.id = 'sp-elapsed-timer';
    timerSpan.textContent = '0.0s';
    Object.assign(timerSpan.style, {
      fontSize: '10px', color: '#94a3b8', fontWeight: '400',
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      minWidth: '40px', textAlign: 'right',
    });
    header.appendChild(timerSpan);

    // Live timer tick
    const startMs = this.startTime;
    const timerInterval = setInterval(() => {
      const elapsed = ((performance.now() - startMs) / 1000).toFixed(1);
      timerSpan.textContent = `${elapsed}s`;
    }, 100);
    (el as any).__timerInterval = timerInterval;

    // ?? Pin button
    const pinBtn = document.createElement('span');
    pinBtn.textContent = '??';
    pinBtn.title = 'Pin overlay (prevent auto-hide)';
    Object.assign(pinBtn.style, {
      cursor: 'pointer', fontSize: '11px', lineHeight: '1',
      color: '#6b7280', padding: '1px 4px', marginLeft: '2px',
      borderRadius: '3px', transition: 'all 0.15s',
      opacity: '0.5', filter: 'grayscale(1)',
    });
    const updatePinVisual = () => {
      if (this._pinned) {
        pinBtn.style.opacity = '1';
        pinBtn.style.filter = 'grayscale(0)';
        pinBtn.style.background = 'rgba(124, 58, 237, 0.2)';
        pinBtn.title = 'Unpin overlay (allow auto-hide)';
      } else {
        pinBtn.style.opacity = '0.5';
        pinBtn.style.filter = 'grayscale(1)';
        pinBtn.style.background = 'transparent';
        pinBtn.title = 'Pin overlay (prevent auto-hide)';
      }
    };
    pinBtn.addEventListener('mouseenter', () => {
      if (!this._pinned) { pinBtn.style.opacity = '0.8'; pinBtn.style.background = 'rgba(124, 58, 237, 0.1)'; }
    });
    pinBtn.addEventListener('mouseleave', () => { updatePinVisual(); });
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._pinned = !this._pinned;
      updatePinVisual();
      if (this._pinned && this.overlayEl && (this.overlayEl as any).__autoHide) {
        clearTimeout((this.overlayEl as any).__autoHide);
        (this.overlayEl as any).__autoHide = null;
      }
      if (!this._pinned && !this._isActive && this.overlayEl) {
        (this.overlayEl as any).__autoHide = setTimeout(() => this.hideOverlay(), 20000);
      }
      console.log(`?? [PipelineUI] ${this._pinned ? '?? Pinned � will not auto-hide' : '?? Unpinned � will auto-hide in 20s'}`);
    });
    header.appendChild(pinBtn);

    // Close button (�)
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '�';
    Object.assign(closeBtn.style, {
      cursor: 'pointer', fontSize: '16px', lineHeight: '1',
      color: '#6b7280', padding: '0 4px', marginLeft: '4px',
      borderRadius: '3px', transition: 'color 0.15s, background 0.15s',
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#f87171';
      closeBtn.style.background = 'rgba(248,113,113,0.15)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#6b7280';
      closeBtn.style.background = 'transparent';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideOverlay();
    });
    header.appendChild(closeBtn);
    el.appendChild(header);

    // -- Stages container --
    const stagesDiv = document.createElement('div');
    stagesDiv.id = 'sp-stages-list';
    Object.assign(stagesDiv.style, {
      display: 'flex', flexDirection: 'column', gap: '3px',
    });
    el.appendChild(stagesDiv);

    document.body.appendChild(el);
    this.overlayEl = el;
    this.updateOverlay();
  if ((window as any).__analysisMode) { console.log('[PipelineUI] Skipped - analysis mode'); return; }
    console.log('?? [PipelineUI] ? Overlay SHOWN INSTANTLY (Pipeline #' + this.runCount + ')');
  }

  private updateOverlay(): void {
    const list = this.overlayEl?.querySelector('#sp-stages-list');
    if (!list) return;

    const statusColors: Record<string, { bg: string; fg: string }> = {
      active: { bg: 'rgba(124,58,237,0.25)', fg: '#a78bfa' },
      done: { bg: 'rgba(5,150,105,0.2)', fg: '#34d399' },
      error: { bg: 'rgba(220,38,38,0.2)', fg: '#f87171' },
      skipped: { bg: 'rgba(146,64,14,0.2)', fg: '#fbbf24' },
    };
    const statusIcons: Record<string, string> = {
      done: '?', error: '?', active: '?', skipped: '-', pending: '�',
    };

    list.innerHTML = '';
    for (const s of this.stages) {
      // Stage row
      const row = document.createElement('div');
      const isActive = s.status === 'active';
      const rowOpacity = isActive ? '1' : s.status === 'done' ? '0.8' : s.status === 'error' ? '1' : s.status === 'skipped' ? '0.4' : '0.3';
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: isActive ? '3px 6px' : '2px 6px',
        opacity: rowOpacity,
        textDecoration: s.status === 'skipped' ? 'line-through' : 'none',
        background: isActive ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
        borderRadius: '4px',
        borderLeft: isActive ? '2px solid #a78bfa' : '2px solid transparent',
        transition: 'background 0.2s, border-left 0.2s',
      });
      // Icon
      const icon = document.createElement('span');
      Object.assign(icon.style, { width: '16px', textAlign: 'center', fontSize: '11px' });
      icon.textContent = s.icon;
      row.appendChild(icon);
      // Name
      const name = document.createElement('span');
      Object.assign(name.style, {
        flex: '1', fontSize: '11px',
        fontWeight: isActive ? '600' : '400',
        color: isActive ? '#c4b5fd' : 'inherit',
      });
      name.textContent = s.name;
      row.appendChild(name);
      // Badge
      if (s.status !== 'pending') {
        const badge = document.createElement('span');
        const c = statusColors[s.status] || { bg: 'transparent', fg: '#6b7280' };
        Object.assign(badge.style, {
          fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
          fontWeight: '600', background: c.bg, color: c.fg,
        });
        badge.textContent = `${statusIcons[s.status] || '�'} ${s.time ? s.time.toFixed(0) + 'ms' : ''}`;
        row.appendChild(badge);
      }
      list.appendChild(row);
      // Detail
      if (s.detail && s.status !== 'pending') {
        const detail = document.createElement('div');
        Object.assign(detail.style, {
          fontSize: '10px', color: '#94a3b8', marginLeft: '22px',
          maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        });
        detail.textContent = s.detail;
        list.appendChild(detail);
      }
    }
  }

  private hideOverlay(): void {
    if (this.overlayEl) {
      const el = this.overlayEl;
      // Stop all intervals and timers FIRST
      if ((el as any).__dotPulse) clearInterval((el as any).__dotPulse);
      if ((el as any).__timerInterval) clearInterval((el as any).__timerInterval);
      if ((el as any).__autoHide) clearTimeout((el as any).__autoHide);
      // Remove from DOM immediately to prevent stale element collisions
      el.remove();
      this.overlayEl = null;
      console.log('🔬 [PipelineUI] Overlay removed');
    }
  }
}

// Global pipeline tracker instance
const surgicalPipeline = new SurgicalPipelineTracker();
(window as any).surgicalPipeline = surgicalPipeline;

// ?? Manual test: window.testPipeline()
(window as any).testPipeline = async () => {
  console.log('?? Testing pipeline overlay...');
  surgicalPipeline.begin();
  surgicalPipeline.enter(0, 'Test: 1 block detected');
  await new Promise(r => setTimeout(r, 300));
  surgicalPipeline.complete(0, '1 block(s) detected');
  surgicalPipeline.enter(1, '100 lines');
  await new Promise(r => setTimeout(r, 300));
  surgicalPipeline.complete(1, '100 lines');
  surgicalPipeline.enter(2, 'Diffing...');
  await new Promise(r => setTimeout(r, 300));
  surgicalPipeline.complete(2, '+5 -2 ~10');
  surgicalPipeline.enter(3, 'Checking...');
  await new Promise(r => setTimeout(r, 200));
  surgicalPipeline.complete(3, '?? Surgical mode');
  surgicalPipeline.enter(4, 'Writing...');
  await new Promise(r => setTimeout(r, 500));
  surgicalPipeline.complete(4, 'Disk write ?');
  surgicalPipeline.enter(5, 'Syncing...');
  await new Promise(r => setTimeout(r, 200));
  surgicalPipeline.complete(5, 'Editor synced ?');
  surgicalPipeline.enter(6, 'Highlighting...');
  await new Promise(r => setTimeout(r, 200));
  surgicalPipeline.complete(6, '17 highlight(s)');
  surgicalPipeline.enter(7, 'Done');
  surgicalPipeline.complete(7, '+5 -2 ~10');
  surgicalPipeline.end(true);
  console.log('?? Test complete! Overlay should be visible for 6 seconds.');
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
    .aca-auto-toggle.active { color: #4caf50 !important; background: rgba(76, 175, 80, 0.2) !important; }
    
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
  console.log('?? [AutoCodeApply] Initializing...');
  injectAutoApplyStyles();
  injectAutonomousToggleStyles();
  injectConfirmationStyles();
  injectFileMismatchStyles();
  
  // Add autonomous toggle button to chat input area
  setTimeout(() => watchForChatInput(), 500);
  
  // ? Always start OFF on page load - do not restore saved state
  autoApplyEnabled = false;
  localStorage.removeItem('autonomousMode');
  localStorage.removeItem('aiFileExplorerEnabled');
  (window as any).autoApplyEnabled = false;
  (window as any).aiFileExplorerEnabled = false;
  (window as any).aiSearchEnabled = false;
  console.log('?? [Autonomous] Starting with Auto Mode OFF');
  
  // ========== INTERNAL MULTI-FILE SYSTEM ONLY ==========
  // External multiFileAutonomous module disabled - using internal processMultiFileApply
  console.log('?? [AutoApply] Using internal multi-file system only');
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
        
        // ? Enhanced wrappers (MUF/CBE processed)
        if (node.classList?.contains('cbe-wrapper') || node.classList?.contains('muf-block')) {
          newBlocks.push(node);
        }
        
        // ? FIX: Also detect raw pre elements and code-content-wrapper
        // These appear when MUF skips enhancement (e.g. "file tree" detection)
        if (node.tagName === 'PRE' && !node.closest('.muf-block') && !node.closest('.cbe-wrapper')) {
          const hasCode = node.querySelector('code') || (node.textContent?.trim().length || 0) > 50;
          if (hasCode) newBlocks.push(node);
        }
        if (node.classList?.contains('code-content-wrapper')) {
          newBlocks.push(node);
        }
        
        const childBlocks = node.querySelectorAll?.('.cbe-wrapper, .muf-block, .code-content-wrapper, pre:has(code)');
        if (childBlocks?.length) {
          childBlocks.forEach(child => {
            // Skip pre elements already inside enhanced wrappers
            if (child.tagName === 'PRE' && (child.closest('.muf-block') || child.closest('.cbe-wrapper'))) return;
            newBlocks.push(child as HTMLElement);
          });
        }
      });
    }
    
    newBlocks = newBlocks.filter(b => !b.closest("[data-analysis-result]")); // X02: skip analysis output
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
  console.log('?? [AutoApply] Watching container:', container.className || container.tagName);
  
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
      showAutoApplyToast('?? Typing stopped', 'error');
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      const blocks = document.querySelectorAll('.cbe-wrapper, .muf-block, .code-content-wrapper:has(pre)');
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock) {
        const codeInfo = extractCodeFromBlockForApply(lastBlock as HTMLElement);
        if (codeInfo) {
          const result = applyCodeToEditor(codeInfo.code, 'replace');
          if (result.success) {
            // Mark block with green badge showing changes in header
            const blockId = lastBlock.getAttribute('data-muf-id') || lastBlock.getAttribute('data-block-id') || '';
            markBlockAsApplied(lastBlock as HTMLElement, blockId, result.message);
          }
          showAutoApplyToast(result.success ? '? Applied latest code' : `? ${result.message}`, result.success ? 'success' : 'error');
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
      let unprocessed = getUnprocessedCodeBlocks();
      unprocessed = unprocessed.filter(b => !b.closest("[data-analysis-result]")); // X02: skip analysis
      if (unprocessed.length > 0 && hasNewMessage()) {
        autoApplyNewCodeBlock(null);
      }
    }
  }, 2000);
  
  console.log('? [AutoCodeApply] Ready!');
  console.log('   ?? Autonomous toggle in toolbar');
  console.log('   ?? File validation: Checks code matches open file');
  console.log('   ?? Multi-file: Auto-opens files and applies code');
  console.log('   ?? Smart: Selects BEST code, skips snippets');
  console.log('   ? After update: Accept (Enter) or Reject (Escape)');
}

// ============================================================================

// ============================================================================
// AI CHANGES INDICATOR + DIFF VIEWER
// ============================================================================

function storeAIChange(filePath: string, oldCode: string, newCode: string, changesSummary: string): void {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'file';
  trackAIChangedFile(fileName, filePath, changesSummary);
  aiChangeHistory.unshift({
    filePath, fileName, oldCode, newCode, changesSummary,
    fullPath: filePath, originalContent: oldCode, newContent: newCode,
    timestamp: Date.now()
  });
  if (aiChangeHistory.length > MAX_CHANGE_HISTORY) {
    aiChangeHistory.length = MAX_CHANGE_HISTORY;
  }
  console.log('[AIChanges] Stored change for ' + fileName + ' (' + changesSummary + ')');
}

function getLastAIChange(): AIChangeRecord | null {
  return aiChangeHistory.length > 0 ? aiChangeHistory[0] : null;
}

function _injectAIChangedStyles(): void {
  if (document.querySelector('#ai-changed-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-changed-styles';
  style.textContent = [
    '.ai-changed-bar {',
    '  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);',
    '  background: linear-gradient(135deg, #1a3a2a 0%, #0d2818 100%);',
    '  border: 1px solid #2ea043; border-radius: 12px; padding: 10px 18px;',
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(46,160,67,0.15);',
    '  z-index: 999999; min-width: 300px; max-width: 550px;',
    '  animation: aiChangedSlideUp 0.3s ease; display: flex; align-items: center; gap: 12px;',
    '}',
    '@keyframes aiChangedSlideUp {',
    '  from { transform: translateX(-50%) translateY(20px); opacity: 0; }',
    '  to { transform: translateX(-50%) translateY(0); opacity: 1; }',
    '}',
    '.ai-changed-bar .aicb-icon {',
    '  width: 32px; height: 32px; border-radius: 8px;',
    '  background: rgba(46,160,67,0.2); display: flex;',
    '  align-items: center; justify-content: center; flex-shrink: 0;',
    '}',
    '.ai-changed-bar .aicb-icon svg { color: #3fb950; }',
    '.ai-changed-bar .aicb-info { flex: 1; }',
    '.ai-changed-bar .aicb-title {',
    '  font-size: 12px; font-weight: 600; color: #3fb950; margin-bottom: 2px;',
    '}',
    '.ai-changed-bar .aicb-detail { font-size: 11px; color: #8b949e; }',
    '.ai-changed-bar .aicb-detail .aicb-file { color: #c9d1d9; font-weight: 500; }',
    '.ai-changed-bar .aicb-detail .aicb-stats {',
    '  color: #8bb4d9; margin-left: 6px; background: rgba(255,255,255,0.06);',
    '  padding: 1px 6px; border-radius: 3px; font-family: monospace;',
    '}',
    '.ai-changed-bar .aicb-actions { display: flex; gap: 6px; }',
    '.ai-changed-bar .aicb-btn {',
    '  padding: 6px 14px; border: none; border-radius: 6px;',
    '  font-size: 11px; font-weight: 600; cursor: pointer;',
    '  transition: all 0.15s ease; display: flex; align-items: center; gap: 4px;',
    '}',
    '.ai-changed-bar .aicb-btn-diff {',
    '  background: rgba(56,139,253,0.15); color: #58a6ff;',
    '  border: 1px solid rgba(56,139,253,0.3);',
    '}',
    '.ai-changed-bar .aicb-btn-diff:hover {',
    '  background: rgba(56,139,253,0.25); border-color: rgba(56,139,253,0.5);',
    '}',
    '.ai-changed-bar .aicb-btn-dismiss {',
    '  background: transparent; color: #8b949e; padding: 6px 8px; border: none; cursor: pointer;',
    '}',
    '.ai-changed-bar .aicb-btn-dismiss:hover { color: #c9d1d9; }',
    '.ai-diff-modal-overlay {',
    '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
    '  background: rgba(0,0,0,0.7); z-index: 100000;',
    '  display: flex; align-items: center; justify-content: center;',
    '  animation: aiDiffFadeIn 0.2s ease;',
    '}',
    '@keyframes aiDiffFadeIn { from { opacity: 0; } to { opacity: 1; } }',
    '.ai-diff-modal {',
    '  width: 90vw; height: 80vh; max-width: 1200px;',
    '  background: #1e1e1e; border-radius: 12px;',
    '  border: 1px solid #3d5a80; overflow: hidden;',
    '  box-shadow: 0 20px 60px rgba(0,0,0,0.5);',
    '  display: flex; flex-direction: column;',
    '  animation: aiDiffSlideIn 0.25s ease;',
    '}',
    '@keyframes aiDiffSlideIn {',
    '  from { transform: scale(0.95) translateY(10px); opacity: 0; }',
    '  to { transform: scale(1) translateY(0); opacity: 1; }',
    '}',
    '.ai-diff-header {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 12px 18px; background: #252526; border-bottom: 1px solid #3c3c3c;',
    '}',
    '.ai-diff-header-left { display: flex; align-items: center; gap: 10px; }',
    '.ai-diff-header-icon {',
    '  width: 28px; height: 28px; border-radius: 6px;',
    '  background: rgba(56,139,253,0.15);',
    '  display: flex; align-items: center; justify-content: center;',
    '}',
    '.ai-diff-header-icon svg { color: #58a6ff; }',
    '.ai-diff-header-title { font-size: 13px; font-weight: 600; color: #e1e4e8; }',
    '.ai-diff-header-subtitle { font-size: 11px; color: #8b949e; margin-top: 1px; }',
    '.ai-diff-header-stats { display: flex; gap: 8px; }',
    '.ai-diff-stat {',
    '  font-size: 11px; font-weight: 600; padding: 3px 8px;',
    '  border-radius: 4px; font-family: monospace;',
    '}',
    '.ai-diff-stat.add { color: #3fb950; background: rgba(63,185,80,0.12); }',
    '.ai-diff-stat.del { color: #f85149; background: rgba(248,81,73,0.12); }',
    '.ai-diff-stat.mod { color: #d29922; background: rgba(210,153,34,0.12); }',
    '.ai-diff-close {',
    '  width: 30px; height: 30px; border: none; background: transparent;',
    '  color: #8b949e; cursor: pointer; border-radius: 6px;',
    '  display: flex; align-items: center; justify-content: center; transition: all 0.15s;',
    '}',
    '.ai-diff-close:hover { background: rgba(255,255,255,0.1); color: #fff; }',
    '.ai-diff-labels { display: flex; border-bottom: 1px solid #3c3c3c; }',
    '.ai-diff-label {',
    '  flex: 1; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center;',
    '}',
    '.ai-diff-label.original {',
    '  color: #f85149; background: rgba(248,81,73,0.06); border-right: 1px solid #3c3c3c;',
    '}',
    '.ai-diff-label.modified { color: #3fb950; background: rgba(63,185,80,0.06); }',
    '.ai-diff-body { flex: 1; overflow: hidden; }',
  ].join('\n');
  document.head.appendChild(style);
}

function showAIChangedNotification(fileName: string, changesSummary: string): void {
  const existing = document.querySelector('.ai-changed-bar');
  if (existing) existing.remove();
  _injectAIChangedStyles();

  const bar = document.createElement('div');
  bar.className = 'ai-changed-bar';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'aicb-icon';
  iconDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>';
  bar.appendChild(iconDiv);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'aicb-info';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'aicb-title';
  titleDiv.textContent = 'AI Changes Applied';
  const detailDiv = document.createElement('div');
  detailDiv.className = 'aicb-detail';
  const fileSpan = document.createElement('span');
  fileSpan.className = 'aicb-file';
  fileSpan.textContent = fileName;
  const statsSpan = document.createElement('span');
  statsSpan.className = 'aicb-stats';
  statsSpan.textContent = changesSummary;
  detailDiv.appendChild(fileSpan);
  detailDiv.appendChild(statsSpan);
  infoDiv.appendChild(titleDiv);
  infoDiv.appendChild(detailDiv);
  bar.appendChild(infoDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'aicb-actions';
  const diffBtn = document.createElement('button');
  diffBtn.className = 'aicb-btn aicb-btn-diff';
  diffBtn.title = 'View what changed';
  diffBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12H3M12 3v18"/></svg> View Changes';
  diffBtn.addEventListener('click', () => showAIDiffViewer());
  actionsDiv.appendChild(diffBtn);
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'aicb-btn aicb-btn-dismiss';
  dismissBtn.title = 'Dismiss';
  dismissBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  dismissBtn.addEventListener('click', () => {
    bar.style.transition = 'opacity 0.2s, transform 0.2s';
    bar.style.opacity = '0';
    bar.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => bar.remove(), 200);
  });
  actionsDiv.appendChild(dismissBtn);
  bar.appendChild(actionsDiv);

  document.body.appendChild(bar);

  setTimeout(() => {
    if (bar.parentElement) {
      bar.style.transition = 'opacity 0.5s, transform 0.5s';
      bar.style.opacity = '0';
      bar.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => bar.remove(), 500);
    }
  }, 15000);
}

function showAIDiffViewer(changeIndex: number = 0): void {
  const change = aiChangeHistory[changeIndex];
  if (!change) {
    showAutoApplyToast('No changes to show', 'error');
    return;
  }

  document.querySelector('.ai-diff-modal-overlay')?.remove();
  _injectAIChangedStyles();

  const overlay = document.createElement('div');
  overlay.className = 'ai-diff-modal-overlay';

  const parts = change.changesSummary.match(/\+(\d+)\s*-(\d+)\s*~(\d+)/) || [];
  const added = parts[1] || '0';
  const deleted = parts[2] || '0';
  const modified = parts[3] || '0';

  const modal = document.createElement('div');
  modal.className = 'ai-diff-modal';

  const header = document.createElement('div');
  header.className = 'ai-diff-header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'ai-diff-header-left';
  const headerIcon = document.createElement('div');
  headerIcon.className = 'ai-diff-header-icon';
  headerIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const headerInfo = document.createElement('div');
  const headerTitle = document.createElement('div');
  headerTitle.className = 'ai-diff-header-title';
  headerTitle.textContent = change.fileName + ' \u2014 AI Changes';
  const headerSubtitle = document.createElement('div');
  headerSubtitle.className = 'ai-diff-header-subtitle';
  headerSubtitle.textContent = 'Applied ' + new Date(change.timestamp).toLocaleTimeString();
  headerInfo.appendChild(headerTitle);
  headerInfo.appendChild(headerSubtitle);
  headerLeft.appendChild(headerIcon);
  headerLeft.appendChild(headerInfo);
  const headerStats = document.createElement('div');
  headerStats.className = 'ai-diff-header-stats';
  const s1 = document.createElement('span'); s1.className = 'ai-diff-stat add'; s1.textContent = '+' + added + ' added';
  const s2 = document.createElement('span'); s2.className = 'ai-diff-stat del'; s2.textContent = '-' + deleted + ' removed';
  const s3 = document.createElement('span'); s3.className = 'ai-diff-stat mod'; s3.textContent = '~' + modified + ' modified';
  headerStats.appendChild(s1); headerStats.appendChild(s2); headerStats.appendChild(s3);
  // ? Restore button in diff viewer
  const restoreDiffBtn = document.createElement('button');
  restoreDiffBtn.title = 'Restore original code';
  Object.assign(restoreDiffBtn.style, {
    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
    color: '#fca5a5', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '11px', fontWeight: '500', fontFamily: 'inherit', display: 'flex',
    alignItems: 'center', gap: '5px', transition: 'all 0.15s', marginLeft: '8px'
  });
  restoreDiffBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Restore';
  restoreDiffBtn.addEventListener('mouseenter', () => {
    restoreDiffBtn.style.background = 'rgba(248,113,113,0.2)';
    restoreDiffBtn.style.borderColor = 'rgba(248,113,113,0.45)';
    restoreDiffBtn.style.color = '#fecaca';
  });
  restoreDiffBtn.addEventListener('mouseleave', () => {
    restoreDiffBtn.style.background = 'rgba(248,113,113,0.1)';
    restoreDiffBtn.style.borderColor = 'rgba(248,113,113,0.25)';
    restoreDiffBtn.style.color = '#fca5a5';
  });
  restoreDiffBtn.addEventListener('click', async () => {
    const confirmed = confirm('Restore ' + change.fileName + ' to original code?\n\nThis will revert all AI changes shown in this diff.');
    if (!confirmed) return;
    const ok = await restoreOriginalCode(changeIndex);
    if (ok) {
      const overlayEl = document.querySelector('.ai-diff-modal-overlay');
      if (overlayEl) overlayEl.remove();
    }
  });
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ai-diff-close';
  closeBtn.title = 'Close (Escape)';
  closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  header.appendChild(headerLeft); header.appendChild(headerStats); header.appendChild(restoreDiffBtn); header.appendChild(closeBtn);
  modal.appendChild(header);

  const labels = document.createElement('div');
  labels.className = 'ai-diff-labels';
  const l1 = document.createElement('div'); l1.className = 'ai-diff-label original'; l1.textContent = 'Original';
  const l2 = document.createElement('div'); l2.className = 'ai-diff-label modified'; l2.textContent = 'AI Modified';
  labels.appendChild(l1); labels.appendChild(l2);
  modal.appendChild(labels);

  const body = document.createElement('div');
  body.className = 'ai-diff-body';
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const monaco = (window as any).monaco;
  if (monaco) {
    const ext = change.fileName.split('.').pop() || 'plaintext';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact',
      html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
      json: 'json', md: 'markdown', py: 'python', rs: 'rust', java: 'java',
      cpp: 'cpp', c: 'c', go: 'go', xml: 'xml', yaml: 'yaml', yml: 'yaml',
      sh: 'shell', bat: 'bat', ps1: 'powershell', sql: 'sql', dart: 'dart',
      kt: 'kotlin', swift: 'swift', rb: 'ruby', php: 'php',
    };
    const lang = langMap[ext] || 'plaintext';
    const originalModel = monaco.editor.createModel(change.oldCode, lang);
    const modifiedModel = monaco.editor.createModel(change.newCode, lang);
    const diffEditor = monaco.editor.createDiffEditor(body, {
      readOnly: true, automaticLayout: true, renderSideBySide: true,
      minimap: { enabled: false }, scrollBeyondLastLine: false,
      theme: 'vs-dark', fontSize: 13, lineNumbers: 'on',
      renderIndicators: true, ignoreTrimWhitespace: false, originalEditable: false,
    });
    diffEditor.setModel({ original: originalModel, modified: modifiedModel });
    console.log('[AIDiff] Diff viewer opened for ' + change.fileName);

    const cleanup = () => {
      diffEditor.dispose(); originalModel.dispose(); modifiedModel.dispose();
      overlay.remove(); document.removeEventListener('keydown', escHandler);
      console.log('[AIDiff] Diff viewer closed');
    };
    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e: Event) => { if (e.target === overlay) cleanup(); });
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cleanup(); }
    };
    document.addEventListener('keydown', escHandler);
  } else {
    body.style.cssText = 'padding:16px;overflow:auto;font-family:monospace;font-size:13px;color:#ccc;white-space:pre-wrap;';
    body.textContent = '=== Original ===\n' + change.oldCode + '\n\n=== Modified ===\n' + change.newCode;
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e: Event) => { if (e.target === overlay) overlay.remove(); });
    const escH = (e: KeyboardEvent) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }
}

// GLOBAL EXPORTS AND STATE SHARING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).initAutoCodeApply = initAutoCodeApply;
  (window as any).applyCodeToEditor = applyCodeToEditor;
  (window as any).applySmartUpdate = applySmartUpdate;
  (window as any).showAIDiffViewer = showAIDiffViewer;
  (window as any).getAIChangeHistory = () => aiChangeHistory;
  // ?? FIX: Expose pendingNewCode getter/setter for FastApply
  Object.defineProperty(window, '__acaPendingNewCode', {
    get: () => pendingNewCode,
    set: (val: string) => { pendingNewCode = val; },
    configurable: true
  });
  (window as any).toggleAutoApply = toggleAutoApply;
  // Expose dialog functions for testing
  (window as any).showStatusDialog = showStatusDialog;
  (window as any).closeStatusDialog = closeStatusDialog;
  (window as any).updateStatusText = updateStatusText;
  (window as any).updateProgress = updateProgress;
  (window as any).addStatusLog = addStatusLog;
  (window as any).setAutoApply = setAutoApply;
  (window as any).isAutoApplyEnabled = isAutoApplyEnabled;
  (window as any).setAutoApplyTypingSpeed = setAutoApplyTypingSpeed;
  (window as any).stopAutoApplyTyping = stopAutoApplyTyping;
  (window as any).insertAutonomousToggle = insertAutonomousToggle;
  (window as any).acceptAutoApplyChanges = acceptAutoApplyChanges;
  (window as any).rejectAutoApplyChanges = rejectAutoApplyChanges;
  
  // ============================================================================
  // ?? FIX ERRORS - Force apply next code block
  // ============================================================================
  (window as any).setForceApplyNext = setForceApplyNext;
  (window as any).forceApplyCodeBlock = forceApplyCodeBlock;
  
  // ============================================================================
  // ? TOOLBAR BUTTON SYNC FUNCTIONS - For professionalIcons.ts compatibility
  // ============================================================================
  
  /**
   * Set auto-apply state and sync toolbar button (called by professionalIcons.ts)
   */
  (window as any).setAutoApplyState = (enabled: boolean) => {
    autoApplyEnabled = enabled;
    updateAutoApplyIndicator();
    localStorage.setItem('autonomousMode', String(enabled));
    console.log(`?? [Auto Mode] State set to: ${enabled ? 'ON' : 'OFF'}`);
    
    // Sync the toolbar button
    const toolbarBtn = document.getElementById('autonomous-mode-toggle');
    if (toolbarBtn) {
      toolbarBtn.classList.toggle('active', enabled);
      toolbarBtn.classList.toggle('auto-active', enabled);
      toolbarBtn.title = enabled ? 'Auto Mode: ON' : 'Auto Mode: OFF';
    }
    
    // Also sync any .autonomous-mode-toggle buttons
    document.querySelectorAll('.autonomous-mode-toggle').forEach(btn => {
      btn.classList.toggle('active', enabled);
    });
    
    // ? When Auto Mode is ON, also turn ON Project Search
    if (enabled) {
      processedBlockIds.clear();
      lastProcessedBlockId = '';
      
      // Auto-enable Project Search
      localStorage.setItem('aiFileExplorerEnabled', 'true');
      (window as any).aiFileExplorerEnabled = true;
      (window as any).aiSearchEnabled = true;
      
      // Sync Project Search button
      const searchBtn = document.getElementById('ai-search-btn');
      if (searchBtn) {
        searchBtn.classList.add('active', 'ai-active');
        searchBtn.title = 'Project Search: ON';
        searchBtn.style.color = '#10b981';
        console.log('?? [Project Search] Auto-enabled with Auto Mode');
      }
    }
  };
  
  /**
   * Get current auto-apply state
   */
  (window as any).getAutoApplyState = () => autoApplyEnabled;
  
  /**
   * Sync auto mode button with internal state (called on init)
   */
  (window as any).syncAutoModeButton = () => {
    const toolbarBtn = document.getElementById('autonomous-mode-toggle');
    if (toolbarBtn) {
      // ? Only use internal state, don't restore from localStorage
      const isEnabled = autoApplyEnabled;
      toolbarBtn.classList.toggle('active', isEnabled);
      toolbarBtn.classList.toggle('auto-active', isEnabled);
      toolbarBtn.title = isEnabled ? 'Auto Mode: ON' : 'Auto Mode: OFF';
      console.log(`?? [Auto Mode] Button synced: ${isEnabled ? 'ON' : 'OFF'}`);
    }
  };
  
  /**
   * Toggle AI Project Search (called by professionalIcons.ts)
   */
  (window as any).toggleAISearch = () => {
    // ? Only use internal state, don't restore from localStorage
    const currentState = (window as any).aiSearchEnabled || 
                         (window as any).aiFileExplorerEnabled || false;
    const newState = !currentState;
    
    // Update all state sources
    (window as any).aiSearchEnabled = newState;
    (window as any).aiFileExplorerEnabled = newState;
    localStorage.setItem('aiFileExplorerEnabled', String(newState));
    localStorage.setItem('aiProjectSearchEnabled', String(newState));
    
    // Sync the toolbar button
    const searchBtn = document.getElementById('ai-search-btn');
    if (searchBtn) {
      searchBtn.classList.toggle('active', newState);
      searchBtn.classList.toggle('ai-active', newState);
      searchBtn.title = newState ? 'Project Search: ON' : 'Project Search: OFF';
    }
    
    console.log(`?? [AI Search] Toggled to: ${newState ? 'ON' : 'OFF'}`);
    return newState;
  };
  
  /**
   * Sync AI search button with internal state
   */
  (window as any).syncAISearchButton = () => {
    const searchBtn = document.getElementById('ai-search-btn');
    if (searchBtn) {
      // ? Only use internal state, don't restore from localStorage
      const isEnabled = (window as any).aiSearchEnabled || 
                        (window as any).aiFileExplorerEnabled || false;
      searchBtn.classList.toggle('active', isEnabled);
      searchBtn.classList.toggle('ai-active', isEnabled);
      searchBtn.title = isEnabled ? 'Project Search: ON' : 'Project Search: OFF';
      console.log(`?? [AI Search] Button synced: ${isEnabled ? 'ON' : 'OFF'}`);
    }
  };
  
  // ============================================================================
  
  // ?? Reset function for stuck multi-file processing
  (window as any).resetMultiFileProcessing = () => {
    console.log('?? [MultiFile] Manual reset triggered');
    isProcessingMultiFile = false; (window as any).surgicalBridge?.exitMultiFileGuard();
    processedBlockIds.clear();
    const bar = document.querySelector('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar');
    if (bar) bar.remove();
    hasUnapprovedChanges = false;
    showAutoApplyToast('?? Multi-file processing reset', 'info');
  };
  
  // ?? State sharing for multi-file system integration
  (window as any).getAutonomousState = () => ({
    autoApplyEnabled,
    isTypingInProgress,
    isProcessingMultiFile,
    processedBlockIds: Array.from(processedBlockIds),
    stopTypingFlag
  });
  
  (window as any).pauseAutonomousForMultiFile = () => {
    console.log('?? [AutoApply] Pausing for multi-file processing');
  };
  
  (window as any).resumeAutonomousAfterMultiFile = () => {
    console.log('?? [AutoApply] Resuming after multi-file processing');
    processedBlockIds.clear();
  };
}

// ============================================================================
// AI CHANGE NOTIFICATION + DIFF VIEWER
// ============================================================================

interface AIChangeRecord {
  fileName: string;
  fullPath: string;
  originalContent: string;
  newContent: string;
  changesSummary: string;
  timestamp: number;
  // Legacy aliases for old diff viewer
  filePath?: string;
  oldCode?: string;
  newCode?: string;
}

const aiChangeHistory: AIChangeRecord[] = [];
const MAX_CHANGE_HISTORY = 20;

function storeChangeHistory(changes: typeof pendingChanges): void {
  for (const c of changes) {
    trackAIChangedFile(c.fileName, c.fullPath, c.changesSummary);
    aiChangeHistory.push({
      fileName: c.fileName,
      fullPath: c.fullPath,
      originalContent: c.originalContent,
      newContent: c.newContent,
      changesSummary: c.changesSummary,
      filePath: c.fullPath, oldCode: c.originalContent, newCode: c.newContent,
      timestamp: Date.now()
    });
  }
  while (aiChangeHistory.length > MAX_CHANGE_HISTORY) {
    aiChangeHistory.shift();
  }
  console.log('[DiffViewer] Stored ' + changes.length + ' change(s), total: ' + aiChangeHistory.length);
}

// AI Changes tracked files for badge
const _aiTrackedChanges: { fileName: string; fullPath: string; summary: string; index: number }[] = [];

function _injectBadgeStyles(): void {
  if (document.getElementById('ai-badge-styles')) return;
  const s = document.createElement('style');
  s.id = 'ai-badge-styles';
  s.textContent = `
/* === AI Modified Badge === */
.ai-changes-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #1a1530 0%, #2d1f47 100%);
  border: 1px solid rgba(180,142,173,0.3);
  color: #d4b8d0; font-size: 11px; font-weight: 600;
  padding: 3px 10px 3px 7px; border-radius: 12px;
  cursor: pointer; margin-left: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; vertical-align: middle; line-height: 18px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
}
.ai-changes-badge:hover {
  background: linear-gradient(135deg, #251d42 0%, #3d2a5c 100%);
  border-color: rgba(180,142,173,0.5);
  box-shadow: 0 2px 8px rgba(180,142,173,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
  transform: translateY(-1px);
}
.ai-changes-badge:active { transform: translateY(0); }
.ai-changes-badge svg { flex-shrink: 0; opacity: 0.85; }
/* === Dropdown Panel === */
.ai-changes-dropdown {
  position: fixed; min-width: 300px; max-width: 380px;
  max-height: 420px; overflow: hidden;
  background: #1e1e2e !important; background-color: #1e1e2e !important;
  border: 1px solid rgba(180,142,173,0.25);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(180,142,173,0.08);
  z-index: 100010;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  animation: acdSlideIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes acdSlideIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
/* === Header === */
.ai-changes-dropdown .acd-header {
  padding: 12px 14px 10px; font-size: 11px; color: #c4b5d0;
  border-bottom: 1px solid rgba(180,142,173,0.15);
  display: flex; justify-content: space-between; align-items: center;
  letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600;
  background: rgba(180,142,173,0.06);
}
.ai-changes-dropdown .acd-header span { display: flex; align-items: center; gap: 6px; }
.ai-changes-dropdown .acd-clear {
  background: none; border: 1px solid transparent; color: #6b7280;
  cursor: pointer; font-size: 11px; padding: 3px 8px;
  border-radius: 5px; transition: all 0.15s; font-weight: 500;
}
.ai-changes-dropdown .acd-clear:hover { color: #f87171; background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.15); }
/* === File Items === */
.ai-changes-dropdown .acd-list {
  max-height: 320px; overflow-y: auto; padding: 4px 0;
}
.ai-changes-dropdown .acd-list::-webkit-scrollbar { width: 5px; }
.ai-changes-dropdown .acd-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
.ai-changes-dropdown .acd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px; cursor: pointer;
  transition: all 0.12s; font-size: 12.5px; color: #e5e7eb;
  border-left: 2px solid transparent; margin: 1px 0;
  background: rgba(255,255,255,0.01);
}
.ai-changes-dropdown .acd-item:hover { background: rgba(180,142,173,0.10); border-left-color: #b48ead; }
/* === File Icons === */
.ai-changes-dropdown .acd-icon {
  width: 18px; height: 18px; display: flex; align-items: center;
  justify-content: center; border-radius: 4px;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
}
.acd-icon-tsx { background: rgba(59,130,246,0.15); color: #60a5fa; }
.acd-icon-ts { background: rgba(59,130,246,0.12); color: #93c5fd; }
.acd-icon-jsx { background: rgba(250,204,21,0.12); color: #fbbf24; }
.acd-icon-js { background: rgba(250,204,21,0.10); color: #fcd34d; }
.acd-icon-css { background: rgba(168,85,247,0.12); color: #c084fc; }
.acd-icon-html { background: rgba(249,115,22,0.12); color: #fb923c; }
.acd-icon-json { background: rgba(34,197,94,0.12); color: #4ade80; }
.acd-icon-md { background: rgba(156,163,175,0.12); color: #9ca3af; }
.acd-icon-default { background: rgba(156,163,175,0.08); color: #6b7280; }
.ai-changes-dropdown .acd-name {
  flex: 1; color: #e5e7eb; font-weight: 500; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color 0.12s;
}
.ai-changes-dropdown .acd-item:hover .acd-name { color: #fff; }
.ai-changes-dropdown .acd-stats {
  display: flex; gap: 4px; font-size: 10px;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-weight: 500; flex-shrink: 0;
}
.acd-stat-add { color: #4ade80; }
.acd-stat-del { color: #f87171; }
.acd-stat-mod { color: #fbbf24; }
.ai-changes-dropdown .acd-diff {
  background: rgba(180,142,173,0.08); border: 1px solid rgba(180,142,173,0.2);
  color: #c4a0bf; padding: 3px 10px; border-radius: 5px;
  cursor: pointer; font-size: 10px; transition: all 0.15s; font-weight: 500;
}
.ai-changes-dropdown .acd-diff:hover { background: rgba(180,142,173,0.18); border-color: rgba(180,142,173,0.4); color: #dcc4d8; }
.ai-changes-dropdown .acd-restore { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); color: #f0a0a0; padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 10px; transition: all 0.15s; font-weight: 500; margin-left: 2px; }
.ai-changes-dropdown .acd-restore:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #fca5a5; }
.ai-changes-dropdown .acd-empty { padding: 24px 16px; text-align: center; color: #6b7280; font-size: 12px; font-style: italic; background: rgba(255,255,255,0.01); }
  `;
  document.head.appendChild(s);
}

function showChangeNotification(changes: typeof pendingChanges): void {
  _injectBadgeStyles();
  for (const c of changes) {
    const existing = _aiTrackedChanges.find(t => t.fileName === c.fileName);
    if (existing) {
      existing.summary = c.changesSummary;
      existing.index = aiChangeHistory.length - 1;
    } else {
      _aiTrackedChanges.push({
        fileName: c.fileName, fullPath: c.fullPath,
        summary: c.changesSummary, index: aiChangeHistory.length - 1
      });
    }
  }
  _updateAIBadge();
}

function _updateAIBadge(): void {
  // Sync _aiTrackedChanges into the primary aiChangedFiles map
  // so both tracking systems feed the same Option C row
  for (const tracked of _aiTrackedChanges) {
    const normalizedPath = (tracked.fullPath || tracked.fileName).replace(/\\/g, '/').toLowerCase();
    if (!aiChangedFiles.has(normalizedPath)) {
      aiChangedFiles.set(normalizedPath, {
        fileName: tracked.fileName,
        fullPath: tracked.fullPath || tracked.fileName,
        summary: tracked.summary,
        timestamp: Date.now()
      });
    }
  }
  // Delegate to the unified Option C badge
  updateChangesBadge();
  addFileTreeDots();
}

function _getFileIconClass(fileName: string): { cls: string; label: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, { cls: string; label: string }> = {
    tsx: { cls: 'acd-icon-tsx', label: 'TX' }, ts: { cls: 'acd-icon-ts', label: 'TS' },
    jsx: { cls: 'acd-icon-jsx', label: 'JX' }, js: { cls: 'acd-icon-js', label: 'JS' },
    css: { cls: 'acd-icon-css', label: 'CS' }, html: { cls: 'acd-icon-html', label: 'HT' },
    json: { cls: 'acd-icon-json', label: '{}' }, md: { cls: 'acd-icon-md', label: 'MD' },
  };
  return map[ext] || { cls: 'acd-icon-default', label: ext.substring(0,2).toUpperCase() || '?' };
}

function _renderChangeStats(summary: string): string {
  const parts: string[] = [];
  const addMatch = summary.match(/\+(\d+)/);
  const delMatch = summary.match(/-(\d+)/);
  const modMatch = summary.match(/~(\d+)/);
  if (addMatch && addMatch[1] !== '0') parts.push('<span class="acd-stat-add">+' + addMatch[1] + '</span>');
  if (delMatch && delMatch[1] !== '0') parts.push('<span class="acd-stat-del">-' + delMatch[1] + '</span>');
  if (modMatch && modMatch[1] !== '0') parts.push('<span class="acd-stat-mod">~' + modMatch[1] + '</span>');
  return parts.length ? parts.join(' ') : '<span style="color:#555">�</span>';
}

// Helper: Focus existing tab or open file � tries tabManager first, then DOM
function _focusOrOpenFile(filePath: string, fileName: string): void {
  // Strategy 1: Use tabManager.openFile (handles dedup internally)
  const tabMgr = (window as any).tabManager;
  if (tabMgr?.openFile) {
    try {
      tabMgr.openFile(filePath);
      console.log('[ChangeTracker] Opened via tabManager.openFile: ' + fileName);
      return;
    } catch (e) {
      console.warn('[ChangeTracker] tabManager.openFile failed:', e);
    }
  }

  // Strategy 2: Use openFileInTab
  const openFn = (window as any).openFileInTab;
  if (openFn && filePath) {
    openFn(filePath);
    console.log('[ChangeTracker] Opened via openFileInTab: ' + fileName);
  }
}

function _toggleAIDropdown(): void {
  const existing = document.querySelector('.ai-changes-dropdown');
  if (existing) { existing.remove(); return; }
  const row = document.querySelector('.ai-changes-row') as HTMLElement;
  if (!row) return;
  const dropdown = document.createElement('div');
  dropdown.className = 'ai-changes-dropdown';
  const hdr = document.createElement('div');
  hdr.className = 'acd-header';
  hdr.innerHTML = '<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>AI Modified Files</span>';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'acd-clear';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation(); _aiTrackedChanges.length = 0;
    aiChangedFiles.clear();
    document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove());
    dropdown.remove(); updateChangesBadge();
  });
  hdr.appendChild(clearBtn);
  dropdown.appendChild(hdr);
  const list = document.createElement('div');
  list.className = 'acd-list';
  if (_aiTrackedChanges.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'acd-empty';
    empty.textContent = 'No changes tracked yet';
    list.appendChild(empty);
  }
  for (const info of _aiTrackedChanges) {
    const item = document.createElement('div');
    item.className = 'acd-item';
    const iconInfo = _getFileIconClass(info.fileName);
    const icon = document.createElement('span');
    icon.className = 'acd-icon ' + iconInfo.cls;
    icon.textContent = iconInfo.label;
    const name = document.createElement('span'); name.className = 'acd-name';
    name.textContent = info.fileName;
    name.addEventListener('click', (e) => {
      e.stopPropagation(); dropdown.remove();
      const sel = '.editor-tab[data-file-name="' + info.fileName + '"]'; const _et = document.querySelector(sel); if (_et) { (_et as HTMLElement).click(); } else { const openFn = (window as any).openFileInTab; if (openFn) openFn(info.fullPath); }
    });
    const stats = document.createElement('span'); stats.className = 'acd-stats';
    stats.innerHTML = _renderChangeStats(info.summary);
    const diffBtn = document.createElement('button'); diffBtn.className = 'acd-diff';
    diffBtn.textContent = 'Diff';
    diffBtn.addEventListener('click', (e) => {
      e.stopPropagation(); dropdown.remove();
      showAIDiffViewer(info.index >= 0 ? info.index : 0);
    });
    const restoreBtn1 = document.createElement('button'); restoreBtn1.className = 'acd-restore';
    restoreBtn1.textContent = 'Restore';
    restoreBtn1.title = 'Restore original code (before AI changes)';
    Object.assign(restoreBtn1.style, {
      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
      color: '#f0a0a0', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer',
      fontSize: '10px', fontWeight: '500', marginLeft: '2px', transition: 'all 0.15s'
    });
    restoreBtn1.addEventListener('mouseenter', () => { restoreBtn1.style.background = 'rgba(248,113,113,0.18)'; restoreBtn1.style.borderColor = 'rgba(248,113,113,0.4)'; restoreBtn1.style.color = '#fca5a5'; });
    restoreBtn1.addEventListener('mouseleave', () => { restoreBtn1.style.background = 'rgba(248,113,113,0.08)'; restoreBtn1.style.borderColor = 'rgba(248,113,113,0.2)'; restoreBtn1.style.color = '#f0a0a0'; });
    restoreBtn1.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = info.index >= 0 ? info.index : 0;
      const confirmed = confirm('Restore ' + info.fileName + ' to original code?\n\nThis will revert all AI changes for this file.');
      if (!confirmed) return;
      const ok = await restoreOriginalCode(idx);
      if (ok) {
        item.style.transition = 'opacity 0.3s, transform 0.3s';
        item.style.opacity = '0'; item.style.transform = 'translateX(-10px)';
        setTimeout(() => { item.remove(); if (list.querySelectorAll('.acd-item').length === 0) dropdown.remove(); }, 300);
      }
    });
    item.appendChild(icon); item.appendChild(name);
    item.appendChild(stats); item.appendChild(diffBtn); item.appendChild(restoreBtn1);
    list.appendChild(item);
  }
  dropdown.appendChild(list);

  document.body.appendChild(dropdown);
  const ds = dropdown.style;
  ds.setProperty('position', 'fixed', 'important');
  ds.setProperty('background', '#1e1e2e', 'important');
  ds.setProperty('background-color', '#1e1e2e', 'important');
  ds.setProperty('border', '1px solid rgba(180,142,173,0.25)', 'important');
  ds.setProperty('border-radius', '10px', 'important');
  ds.setProperty('min-width', '300px', 'important');
  ds.setProperty('max-width', '380px', 'important');
  ds.setProperty('max-height', '420px', 'important');
  ds.setProperty('overflow', 'hidden', 'important');
  ds.setProperty('box-shadow', '0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4)', 'important');
  ds.setProperty('z-index', '100010', 'important');
  ds.setProperty('font-family', 'system-ui', 'important');
  ds.setProperty('backdrop-filter', 'none', 'important');
  ds.setProperty('-webkit-backdrop-filter', 'none', 'important');
  const rr = row.getBoundingClientRect();
  const dw = 340;
  let ll = rr.left;
  if (ll + dw > window.innerWidth - 8) ll = window.innerWidth - dw - 8;
  if (ll < 8) ll = 8;
  ds.setProperty('left', ll + 'px', 'important');
  ds.setProperty('top', (rr.bottom + 4) + 'px', 'important');
  ds.setProperty('width', dw + 'px', 'important');
  requestAnimationFrame(() => {
    if (dropdown.isConnected) {
      dropdown.style.setProperty('background', '#1e1e2e', 'important');
      dropdown.style.setProperty('background-color', '#1e1e2e', 'important');
    }
  });
  const closeHandler = (e: Event) => {
    if (!dropdown.contains(e.target as Node) && e.target !== row && !row.contains(e.target as Node)) {
      dropdown.remove(); document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

function showDiffViewer(specificIndex?: number): void {
  // Remove old modals
  document.querySelectorAll('.acn-diff-modal').forEach(m => m.remove());
  if (!document.getElementById('acn-diff-styles')) { const st = document.createElement('style'); st.id = 'acn-diff-styles'; st.textContent = '.acn-diff-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:200000;display:flex;align-items:center;justify-content:center}.acn-diff-container{width:90vw;height:85vh;background:#1e1e2e;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(180,142,173,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.8)}.acn-diff-header{padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #333;background:#181825}.acn-diff-header .title{color:#cdd6f4;font-size:14px;font-weight:600;margin-right:8px}.acn-diff-header .subtitle{color:#888;font-size:12px}.acn-diff-header .close-btn{background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px}.acn-diff-header .close-btn:hover{background:#333;color:#fff}.acn-diff-tabs{display:flex;gap:2px;padding:4px 8px;background:#181825;border-bottom:1px solid #333}.acn-diff-tab{background:none;border:none;color:#888;padding:6px 12px;font-size:12px;cursor:pointer;border-radius:4px}.acn-diff-tab.active{background:#333;color:#cdd6f4}.acn-diff-tab:hover{background:#2a2a3e}.acn-diff-body{flex:1;overflow:hidden}'; document.head.appendChild(st); }
  if (!document.getElementById('acn-diff-styles')) { const st = document.createElement('style'); st.id = 'acn-diff-styles'; st.textContent = '.acn-diff-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:200000;display:flex;align-items:center;justify-content:center}.acn-diff-container{width:90vw;height:85vh;background:#1e1e2e;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(180,142,173,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.8)}.acn-diff-header{padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #333;background:#181825}.acn-diff-header .title{color:#cdd6f4;font-size:14px;font-weight:600;margin-right:8px}.acn-diff-header .subtitle{color:#888;font-size:12px}.acn-diff-header .close-btn{background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px}.acn-diff-header .close-btn:hover{background:#333;color:#fff}.acn-diff-tabs{display:flex;gap:2px;padding:4px 8px;background:#181825;border-bottom:1px solid #333}.acn-diff-tab{background:none;border:none;color:#888;padding:6px 12px;font-size:12px;cursor:pointer;border-radius:4px}.acn-diff-tab.active{background:#333;color:#cdd6f4}.acn-diff-tab:hover{background:#2a2a3e}.acn-diff-body{flex:1;overflow:hidden}'; document.head.appendChild(st); }

  const records = specificIndex !== undefined
    ? [aiChangeHistory[aiChangeHistory.length - 1]]
    : aiChangeHistory.slice(-20);

  if (!records.length || !records[0]) {
    console.warn('[DiffViewer] No changes to show');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'acn-diff-modal';

  const container = document.createElement('div');
  container.className = 'acn-diff-container';

  // Header
  const header = document.createElement('div');
  header.className = 'acn-diff-header';
  header.innerHTML = '<div><span class="title">AI Changes</span>'
    + '<span class="subtitle">' + records.length + ' file(s)</span></div>'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + '<button class="restore-btn" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);color:#fca5a5;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:500;display:flex;align-items:center;gap:5px;transition:all 0.15s;">? Restore</button>'
    + '<button class="close-btn">\u00d7</button></div>';
  header.querySelector('.close-btn')!.addEventListener('click', () => modal.remove());
  const restoreHeaderBtn = header.querySelector('.restore-btn') as HTMLElement;
  if (restoreHeaderBtn) {
    restoreHeaderBtn.addEventListener('mouseenter', () => { restoreHeaderBtn.style.background = 'rgba(248,113,113,0.2)'; restoreHeaderBtn.style.borderColor = 'rgba(248,113,113,0.45)'; });
    restoreHeaderBtn.addEventListener('mouseleave', () => { restoreHeaderBtn.style.background = 'rgba(248,113,113,0.1)'; restoreHeaderBtn.style.borderColor = 'rgba(248,113,113,0.25)'; });
    restoreHeaderBtn.addEventListener('click', async () => {
      const activeTab = container.querySelector('.acn-diff-tab.active');
      const activeFileName = activeTab ? activeTab.textContent : records[0]?.fileName;
      const record = records.find(r => r.fileName === activeFileName) || records[0];
      if (!record) return;
      const idx = aiChangeHistory.indexOf(record);
      const confirmed = confirm('Restore ' + record.fileName + ' to original code?\n\nThis will revert all AI changes shown in this diff.');
      if (!confirmed) return;
      const ok = await restoreOriginalCode(idx >= 0 ? idx : 0);
      if (ok) modal.remove();
    });
  }
  container.appendChild(header);

  // Tabs (if multiple files)
  if (records.length > 1) {
    const tabs = document.createElement('div');
    tabs.className = 'acn-diff-tabs';
    records.forEach((r, i) => {
      const tab = document.createElement('button');
      tab.className = 'acn-diff-tab' + (i === 0 ? ' active' : '');
      tab.textContent = r.fileName;
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.acn-diff-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadDiff(r);
      });
      tabs.appendChild(tab);
    });
    container.appendChild(tabs);
  }

  // Diff body
  const body = document.createElement('div');
  body.className = 'acn-diff-body';
  container.appendChild(body);

  modal.appendChild(container);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); }
  });
  document.body.appendChild(modal);

  function loadDiff(record: AIChangeRecord): void {
    body.innerHTML = '';
    const monaco = (window as any).monaco;
    if (!monaco) {
      body.innerHTML = '<div style="padding:20px;color:#f44;">Monaco not available</div>';
      return;
    }

    const ext = record.fileName.split('.').pop() || 'text';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
      py: 'python', rs: 'rust', svelte: 'html', vue: 'html'
    };
    const lang = langMap[ext] || 'plaintext';

    const origModel = monaco.editor.createModel(record.originalContent, lang);
    const modModel = monaco.editor.createModel(record.newContent, lang);

    const diffEditor = monaco.editor.createDiffEditor(body, {
      readOnly: true,
      renderSideBySide: true,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineNumbers: 'on',
      renderIndicators: true,
      originalEditable: false
    });

    diffEditor.setModel({ original: origModel, modified: modModel });
    console.log('[DiffViewer] Showing diff for: ' + record.fileName);

    // Cleanup on close
    const observer = new MutationObserver(() => {
      if (!document.contains(modal)) {
        diffEditor.dispose();
        origModel.dispose();
        modModel.dispose();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  loadDiff(records[0]);
}

// Expose to window for manual use
// ============================================================================
// AI CHANGE FILE TREE DOTS + PERSISTENT BADGE
// ============================================================================

const aiChangedFiles: Map<string, { fileName: string; fullPath: string; summary: string; timestamp: number }> = new Map();

function _injectChangeTrackerStyles(): void {
  if (document.getElementById('ai-change-tracker-styles')) return;
  const s = document.createElement('style');
  s.id = 'ai-change-tracker-styles';
  s.textContent = [
    '/* AI change dot on file tree items */',
    '.ai-changed-dot {',
    '  display: inline-block; width: 7px; height: 7px; border-radius: 50%;',
    '  background: #b48ead; margin-left: 6px; flex-shrink: 0;',
    '  animation: aiDotPulse 2s ease-in-out infinite;',
    '  box-shadow: 0 0 4px rgba(180,142,173,0.6);',
    '  vertical-align: middle;',
    '}',
    '@keyframes aiDotPulse {',
    '  0%,100% { opacity: 0.7; transform: scale(1); }',
    '  50% { opacity: 1; transform: scale(1.2); }',
    '}',
    '/* === OPTION C: Dedicated row above file tree === */',
    '.ai-changes-row {',
    '  display: flex; align-items: center; gap: 6px;',
    '  padding: 5px 10px;',
    '  background: linear-gradient(135deg, rgba(180,142,173,0.08) 0%, rgba(180,142,173,0.04) 100%);',
    '  border: 1px solid rgba(180,142,173,0.2);',
    '  border-left: 3px solid #b48ead;',
    '  margin: 0; cursor: pointer;',
    '  font-family: system-ui, -apple-system, sans-serif;',
    '  transition: all 0.15s ease;',
    '  position: relative;',
    '  min-height: 26px;',
    '  animation: aiBadgeSlideIn 0.25s ease;',
    '}',
    '@keyframes aiBadgeSlideIn {',
    '  from { opacity: 0; transform: translateY(-4px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',
    '.ai-changes-row:hover {',
    '  background: linear-gradient(135deg, rgba(180,142,173,0.14) 0%, rgba(180,142,173,0.08) 100%);',
    '  border-color: rgba(180,142,173,0.35);',
    '}',
    '.ai-changes-row .acr-icon {',
    '  display: flex; align-items: center; justify-content: center;',
    '  width: 18px; height: 18px; flex-shrink: 0;',
    '}',
    '.ai-changes-row .acr-icon svg { color: #b48ead; }',
    '.ai-changes-row .acr-text {',
    '  font-size: 11px; color: #b48ead; font-weight: 600;',
    '  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
    '}',
    '.ai-changes-row .acr-count {',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.ai-changes-row .acr-dismiss {',
    '  display: flex; align-items: center; justify-content: center;',
    '  width: 16px; height: 16px; border: none; background: transparent;',
    '  color: #666; cursor: pointer; border-radius: 3px; padding: 0;',
    '  transition: all 0.15s; flex-shrink: 0; opacity: 0;',
    '}',
    '.ai-changes-row:hover .acr-dismiss { opacity: 1; }',
    '.ai-changes-row .acr-dismiss:hover { background: rgba(255,255,255,0.1); color: #ccc; }',
    '/* Dropdown panel listing changed files */',
    '.ai-changes-dropdown {',
    '  position: fixed; min-width: 300px; max-width: 380px;',
    '  max-height: 420px; overflow: hidden;',
    '  background: #1e1e2e !important; background-color: #1e1e2e !important;',
    '  border: 1px solid rgba(180,142,173,0.25);',
    '  border-radius: 10px;',
    '  box-shadow: 0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4);',
    '  z-index: 100010; font-family: system-ui; }',
    '.ai-changes-dropdown .acd-header {',
    '  padding: 10px 14px; font-size: 11px; color: #c4b5d0;',
    '  border-bottom: 1px solid rgba(180,142,173,0.15); display: flex;',
    '  justify-content: space-between; align-items: center;',
    '}',
    '.ai-changes-dropdown .acd-clear {',
    '  background: none; border: none; color: #666; cursor: pointer;',
    '  font-size: 11px; padding: 2px 6px;',
    '}',
    '.ai-changes-dropdown .acd-clear:hover { color: #f44; }',
    '.ai-changes-dropdown .acd-item {',
    '  display: flex; align-items: center; gap: 8px; padding: 6px 12px;',
    '  cursor: pointer; transition: background 0.1s; font-size: 12px; color: #ccc;',
    '}',
    '.ai-changes-dropdown .acd-item:hover { background: #2a2a3a; }',
    '.ai-changes-dropdown .acd-item .acd-dot {',
    '  width: 6px; height: 6px; border-radius: 50%; background: #b48ead; flex-shrink: 0;',
    '}',
    '.ai-changes-dropdown .acd-item .acd-name { flex: 1; color: #e0e0e0; }',
    '.ai-changes-dropdown .acd-item .acd-stats { color: #666; font-size: 11px; }',
    '.ai-changes-dropdown .acd-item .acd-diff-btn {',
    '  background: #b48ead22; border: 1px solid #b48ead44; color: #b48ead;',
    '  padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;',
    '}',
    '.ai-changes-dropdown .acd-item .acd-diff-btn:hover { background: #b48ead44; }',
    '.ai-changes-dropdown .acd-item .acd-restore-btn {',
    '  background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: #f0a0a0;',
    '  padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 10px; margin-left: 2px;',
    '}',
    '.ai-changes-dropdown .acd-item .acd-restore-btn:hover { background: rgba(248,113,113,0.25); color: #fca5a5; }',
    '.ai-changes-dropdown .acd-empty {',
    '  padding: 16px; text-align: center; color: #555; font-size: 12px;',
    '}'
  ].join('\n');
  document.head.appendChild(s);
}

function trackAIChangedFile(fileName: string, fullPath: string, summary: string): void {
  _injectChangeTrackerStyles();
  const normalizedPath = fullPath.replace(/\\\\/g, '/').toLowerCase();
  aiChangedFiles.set(normalizedPath, { fileName, fullPath, summary, timestamp: Date.now() });
  console.log('[ChangeTracker] Tracking: ' + fileName + ' (' + summary + '), total: ' + aiChangedFiles.size);
  addFileTreeDots();
  updateChangesBadge();
}

function addFileTreeDots(): void {
  // Remove old dots
  document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove());

  if (aiChangedFiles.size === 0) return;

  // Find file tree items with data-path
  const fileItems = document.querySelectorAll('[data-path]');
  fileItems.forEach(item => {
    const path = (item.getAttribute('data-path') || '').replace(/\\\\/g, '/').toLowerCase();
    if (!path) return;

    // Check if this file was changed by AI
    for (const [changedPath] of aiChangedFiles) {
      if (path.endsWith(changedPath.split('/').pop() || '') || changedPath.includes(path.split('/').pop() || '???')) {
        // More precise: compare the filename
        const itemName = path.split('/').pop() || '';
        const changedName = changedPath.split('/').pop() || '';
        if (itemName === changedName) {
          // Add dot if not already present
          const el = item as HTMLElement;
          if (!el.querySelector('.ai-changed-dot')) {
            const dot = document.createElement('span');
            dot.className = 'ai-changed-dot';
            dot.title = 'Modified by AI';
            // Try to append inside the label/name area
            const label = el.querySelector('.file-name, .item-label, .tree-label, span') || el;
            if (label.parentElement === el || label === el) {
              el.appendChild(dot);
            } else {
              label.parentElement!.appendChild(dot);
            }
          }
          break;
        }
      }
    }
  });
}

function updateChangesBadge(): void {
  _injectChangeTrackerStyles();

  let row = document.querySelector('.ai-changes-row') as HTMLElement;

  if (aiChangedFiles.size === 0) {
    if (row) {
      row.style.animation = 'none';
      row.style.opacity = '0';
      row.style.transform = 'translateY(-4px)';
      setTimeout(() => row?.remove(), 150);
    }
    return;
  }

  if (!row) {
    row = document.createElement('div');
    row.className = 'ai-changes-row';
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.acr-dismiss')) return;
      e.stopPropagation();
      toggleChangesDropdown();
    });

    // === PLACEMENT: Below all headers/bars/filters, right above file list ===
    let placed = false;
    const firstFileItem = document.querySelector('[data-path]');
    if (firstFileItem && firstFileItem.parentNode) {
      firstFileItem.parentNode.insertBefore(row, firstFileItem);
      placed = true;
    }
    if (!placed) {
      const projectHeader = document.querySelector(
        '#ai-project-header, .fcm-header, .project-header, .file-explorer-header'
      );
      if (projectHeader && projectHeader.parentNode) {
        projectHeader.parentNode.insertBefore(row, projectHeader.nextSibling);
        placed = true;
      }
    }
    if (!placed) {
      for (const sel of ['#file-tree', '.file-tree', '#files-content', '.explorer-content', '.explorer-panel', '.sidebar']) {
        const c = document.querySelector(sel);
        if (c) { c.insertBefore(row, c.firstChild); placed = true; break; }
      }
    }
  }

  // Update row content
  const count = aiChangedFiles.size;
  const label = count === 1 ? 'file modified by AI' : 'files modified by AI';
  row.innerHTML = [
    '<span class="acr-icon">',
    '  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    '  </svg>',
    '</span>',
    '<span class="acr-text">',
    '  <span class="acr-count">' + count + '</span> ' + label,
    '</span>',
    '<button class="acr-dismiss" title="Clear all">',
    '  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>',
    '</button>',
  ].join('');

  // Wire up dismiss button
  const dismissBtn = row.querySelector('.acr-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      aiChangedFiles.clear();
      document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove());
      updateChangesBadge();
    });
  }
}

// ============================================================================
// RESTORE: Revert file to original code before AI changes
// ============================================================================
async function restoreOriginalCode(changeIndex: number): Promise<boolean> {
  const change = aiChangeHistory[changeIndex];
  if (!change) { showAutoApplyToast('No change record found to restore', 'error'); return false; }
  const originalCode = change.originalContent || change.oldCode;
  if (!originalCode) { showAutoApplyToast('Original code not available for ' + change.fileName, 'error'); return false; }
  const filePath = change.fullPath || change.filePath;
  if (!filePath) { showAutoApplyToast('File path not available for restore', 'error'); return false; }
  try {
    const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
    if (invoke) {
      try {
        await invoke('write_file', { path: filePath, contents: originalCode });
        console.log('? [Restore] Written original code to disk: ' + filePath);
      } catch (_writeErr: any) {
        try {
          await invoke('surgical_edit', { request: { file_path: filePath, strategy: 'full_replace', new_content: originalCode, dry_run: false, create_backup: true } });
          console.log('? [Restore] Written via surgical_edit: ' + filePath);
        } catch (surgErr: any) { console.warn('? [Restore] Disk write failed:', surgErr); }
      }
    }
    // Sync Monaco editor if this file is currently open
    const editor = (window as any).getMonacoEditorForApply?.() || (window as any).monacoEditor;
    const model = editor?.getModel();
    if (editor && model) {
      const currentUri = model.uri?.path || '';
      const normalizedCurrent = currentUri.replace(/^\//, '').replace(/\//g, '\\').toLowerCase();
      const normalizedTarget = filePath.replace(/\//g, '\\').toLowerCase();
      if (normalizedCurrent === normalizedTarget || normalizedCurrent.endsWith(change.fileName.toLowerCase())) {
        editor.executeEdits('restore-original', [{ range: model.getFullModelRange(), text: originalCode, forceMoveMarkers: true }]);
        console.log('? [Restore] Monaco editor synced');
      }
    }
    // Remove from aiChangedFiles map
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    aiChangedFiles.delete(normalizedPath);
    // Update UI
    document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove());
    updateChangesBadge();
    addFileTreeDots();
    showAutoApplyToast('? Restored ' + change.fileName + ' to original', 'success');
    console.log('? [Restore] ? ' + change.fileName + ' restored to original code');
    return true;
  } catch (err: any) {
    console.error('? [Restore] Failed:', err);
    showAutoApplyToast('Restore failed: ' + (err.message || err), 'error');
    return false;
  }
}
if (typeof window !== 'undefined') { (window as any).restoreOriginalCode = restoreOriginalCode; }

function toggleChangesDropdown(): void {
  const existing = document.querySelector('.ai-changes-dropdown');
  if (existing) { existing.remove(); return; }
  const row = document.querySelector('.ai-changes-row');
  if (!row) return;
  const dropdown = document.createElement('div');
  dropdown.className = 'ai-changes-dropdown';
  const header = document.createElement('div');
  header.className = 'acd-header';
  header.innerHTML = '<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>AI Modified Files</span>';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'acd-clear';
  clearBtn.textContent = 'Clear All';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    aiChangedFiles.clear();
    document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove());
    dropdown.remove();
    updateChangesBadge();
  });
  header.appendChild(clearBtn);
  dropdown.appendChild(header);
  const list = document.createElement('div');
  list.className = 'acd-list';
  if (aiChangedFiles.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'acd-empty';
    empty.textContent = 'No changes tracked yet';
    list.appendChild(empty);
  } else {
    aiChangedFiles.forEach((info, path) => {
      const item = document.createElement('div');
      item.className = 'acd-item';
      const iconInfo = _getFileIconClass(info.fileName);
      const icon = document.createElement('span');
      icon.className = 'acd-icon ' + iconInfo.cls;
      icon.textContent = iconInfo.label;
      const name = document.createElement('span');
      name.className = 'acd-name';
      name.textContent = info.fileName;
      name.addEventListener('click', (e) => {
        e.stopPropagation(); dropdown.remove();
      const sel = '.editor-tab[data-file-name="' + info.fileName + '"]'; const _et = document.querySelector(sel); if (_et) { (_et as HTMLElement).click(); } else { const openFn = (window as any).openFileInTab; if (openFn) openFn(info.fullPath); }
      });
      const stats = document.createElement('span');
      stats.className = 'acd-stats';
      stats.innerHTML = _renderChangeStats(info.summary);
      const diffBtn = document.createElement('button');
      diffBtn.className = 'acd-diff';
      diffBtn.textContent = 'Diff';
      diffBtn.addEventListener('click', (e) => {
        e.stopPropagation(); dropdown.remove();
        const historyItem = aiChangeHistory.find(h => {
          const hp = (h.fullPath || h.filePath || '').replace(/\\/g, '/').toLowerCase();
          return hp === path || hp.endsWith(info.fileName.toLowerCase());
        });
        if (historyItem) {
          const idx = aiChangeHistory.indexOf(historyItem);
          showDiffViewer(idx);
        } else { showDiffViewer(); }
      });
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'acd-restore';
      restoreBtn.textContent = 'Restore';
      restoreBtn.title = 'Restore original code (before AI changes)';
      Object.assign(restoreBtn.style, {
        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
        color: '#f0a0a0', padding: '3px 8px', borderRadius: '5px',
        cursor: 'pointer', fontSize: '10px', transition: 'all 0.15s', fontWeight: '500', marginLeft: '2px',
      });
      restoreBtn.addEventListener('mouseenter', () => {
        restoreBtn.style.background = 'rgba(248,113,113,0.18)';
        restoreBtn.style.borderColor = 'rgba(248,113,113,0.4)';
        restoreBtn.style.color = '#fca5a5';
      });
      restoreBtn.addEventListener('mouseleave', () => {
        restoreBtn.style.background = 'rgba(248,113,113,0.08)';
        restoreBtn.style.borderColor = 'rgba(248,113,113,0.2)';
        restoreBtn.style.color = '#f0a0a0';
      });
      restoreBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const historyItem = aiChangeHistory.find(h => {
          const hp = (h.fullPath || h.filePath || '').replace(/\\/g, '/').toLowerCase();
          return hp === path || hp.endsWith(info.fileName.toLowerCase());
        });
        const idx = historyItem ? aiChangeHistory.indexOf(historyItem) : 0;
        const confirmed = confirm('Restore ' + info.fileName + ' to original code?\n\nThis will revert all AI changes for this file.');
        if (!confirmed) return;
        const ok = await restoreOriginalCode(idx);
        if (ok) {
          item.style.transition = 'opacity 0.3s, transform 0.3s';
          item.style.opacity = '0';
          item.style.transform = 'translateX(-10px)';
          setTimeout(() => { item.remove(); if (list.querySelectorAll('.acd-item').length === 0) dropdown.remove(); }, 300);
        }
      });
      item.appendChild(icon); item.appendChild(name);
      item.appendChild(stats); item.appendChild(diffBtn); item.appendChild(restoreBtn);
      list.appendChild(item);
    });
  }
  dropdown.appendChild(list);
  document.body.appendChild(dropdown);
  const ds2 = dropdown.style;
  ds2.setProperty('position', 'fixed', 'important');
  ds2.setProperty('background', '#1e1e2e', 'important');
  ds2.setProperty('background-color', '#1e1e2e', 'important');
  ds2.setProperty('border', '1px solid rgba(180,142,173,0.25)', 'important');
  ds2.setProperty('border-radius', '10px', 'important');
  ds2.setProperty('min-width', '300px', 'important');
  ds2.setProperty('max-width', '380px', 'important');
  ds2.setProperty('max-height', '420px', 'important');
  ds2.setProperty('overflow', 'hidden', 'important');
  ds2.setProperty('box-shadow', '0 16px 48px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4)', 'important');
  ds2.setProperty('z-index', '100010', 'important');
  ds2.setProperty('font-family', 'system-ui', 'important');
  ds2.setProperty('backdrop-filter', 'none', 'important');
  ds2.setProperty('-webkit-backdrop-filter', 'none', 'important');
  const rr2 = row.getBoundingClientRect();
  const dw2 = 340;
  let ll2 = rr2.left;
  if (ll2 + dw2 > window.innerWidth - 8) ll2 = window.innerWidth - dw2 - 8;
  if (ll2 < 8) ll2 = 8;
  ds2.setProperty('left', ll2 + 'px', 'important');
  ds2.setProperty('top', (rr2.bottom + 4) + 'px', 'important');
  ds2.setProperty('width', dw2 + 'px', 'important');
  requestAnimationFrame(() => {
    if (dropdown.isConnected) {
      dropdown.style.setProperty('background', '#1e1e2e', 'important');
      dropdown.style.setProperty('background-color', '#1e1e2e', 'important');
    }
  });
  const closeHandler = (e: Event) => {
    if (!dropdown.contains(e.target as Node) && e.target !== row && !row.contains(e.target as Node)) {
      dropdown.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

// Re-apply dots AND recover badge row when file tree re-renders
const _dotObserver = new MutationObserver(() => {
  if (aiChangedFiles.size > 0) {
    clearTimeout((_dotObserver as any)._timer);
    ((_dotObserver as any)._timer as any) = setTimeout(() => {
      addFileTreeDots();
      if (!document.querySelector('.ai-changes-row')) {
        updateChangesBadge();
        if (!document.querySelector('.ai-changes-row')) {
          setTimeout(() => {
            if (aiChangedFiles.size > 0 && !document.querySelector('.ai-changes-row')) updateChangesBadge();
          }, 500);
        }
      }
    }, 300);
  }
});
setTimeout(() => {
  for (const sel of ['#file-tree', '.file-tree', '.explorer-content', '.file-explorer', '#files-content', '.explorer-panel', '.sidebar', '[class*="file-tree"]']) {
    const c = document.querySelector(sel);
    if (c) { _dotObserver.observe(c, { childList: true, subtree: true }); return; }
  }
  _dotObserver.observe(document.body, { childList: true, subtree: true });
}, 3000);

console.log('✅ AI Change Tracker loaded (file dots + badge)');


(window as any).showAIDiffViewer = showDiffViewer;
  (window as any).getAIChangedFiles = () => Object.fromEntries(aiChangedFiles);
  (window as any).clearAIChangedFiles = () => { aiChangedFiles.clear(); document.querySelectorAll('.ai-changed-dot').forEach(d => d.remove()); updateChangesBadge(); };
(window as any).getAIChangeHistory = () => aiChangeHistory;

console.log('✅ AI Changes Notification + Diff Viewer loaded');
console.log('   Use: window.showAIDiffViewer() to view last changes');


// Export alias for backwards compatibility
export function initAutonomousCoding(): void {
  initializeAutonomousSystem();
  initAutoCodeApply();
}

console.log('? autonomousCoding.ts loaded with multi-file integration');