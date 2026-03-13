// projectScaffoldingUI.ts - Project Scaffolding UI Module

import { getCurrentApiConfigurationForced } from './apiProviderManager';
import { ProjectScaffoldingAssistant } from './projectScaffoldingAssistant';
import { handleApplySettingsSimple, resolveProjectPurpose } from './simpleAIHandler';
import { open } from '@tauri-apps/plugin-dialog';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProjectSettings {
  projectName: string;
  projectPath: string;
  installDependencies: boolean;
  createReadme: boolean;
  projectType: string;
  // Requirements fields (optional)
  description?: string;
  features?: string;
  expectedInput?: string;
  expectedOutput?: string;
  uiDescription?: string;
}
// Message-related imports
import { 
  addMessageToChat, 
  addSystemMessage,
  createMessageMetadata,
  setupCodeBlockEventListeners
} from './messageUI';

// UI helper imports
import { 
  generateId,
  formatTime,
  escapeHtml,
  getProviderInfo,
  sendMessageDirectly
} from './assistantUI';

// Other imports
import { showTypingIndicator, hideTypingIndicator } from './typingIndicator';
import { showNotification } from './notificationManager';
// ============================================================================
// Global State
// ============================================================================

let projectScaffolder: ProjectScaffoldingAssistant | null = null;

let currentProjectSettings: ProjectSettings = {
  projectName: 'my-project',
  projectPath: getUserDefaultPath(),
  installDependencies: true,
  createReadme: true,
  projectType: getUserDefaultProjectType()
};

let lastScaffoldResult: any = null;

// ============================================================================
// Initialization
// ============================================================================

export function initializeProjectScaffolding(): void {
  console.log('🚀 Initializing Project Scaffolding...');
  const config = getCurrentApiConfigurationForced();
  projectScaffolder = new ProjectScaffoldingAssistant(config);
  addProjectScaffoldingStyles();
  // ✅ DISABLED: + key shortcut is now handled in assistantUI.ts with input cloning
  // setupProjectScaffoldingShortcut();
  console.log('✅ Project Scaffolding initialized');
}

// ============================================================================
// Keyboard Shortcut Setup
// ============================================================================

/**
 * Sets up keyboard shortcut: Press "+" to trigger project scaffolding
 * Improved version with better DOM detection and error handling
 */
function setupProjectScaffoldingShortcut(): void {
  console.log('⌨️ Setting up project scaffolding keyboard shortcut...');
  
  // Function to find message input with multiple selectors
  const findMessageInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    const selectors = [
      '.message-input',           // Primary selector
      'input[placeholder*="Ask"]', // Look for "Ask me anything"
      'textarea[placeholder*="Ask"]',
      'input[type="text"]',       // Generic text input
      'textarea',                 // Generic textarea
      '#message-input',           // ID selector
      '[class*="message"]',       // Any class containing "message"
      '[class*="input"]'          // Any class containing "input"
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        console.log(`✅ Found message input using selector: ${selector}`);
        return element;
      }
    }
    return null;
  };
  
  // Function to find send button with multiple selectors
  const findSendButton = (): HTMLButtonElement | null => {
    const selectors = [
      '.send-button',
      'button[class*="send"]',
      'button[class*="Send"]',
      'button:has([class*="send"])',
      '#send-button',
      'button[type="submit"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLButtonElement;
      if (element) {
        console.log(`✅ Found send button using selector: ${selector}`);
        return element;
      }
    }
    return null;
  };
  
  // Try to set up the shortcut with retry mechanism
  const setupWithRetry = (attempts: number = 0): void => {
    const messageInput = findMessageInput();
    
    if (!messageInput) {
      if (attempts < 10) {
        console.log(`⏳ Message input not found yet, retrying... (attempt ${attempts + 1}/10)`);
        setTimeout(() => setupWithRetry(attempts + 1), 500);
      } else {
        console.error('❌ Message input not found after 10 attempts. Keyboard shortcut not activated.');
        console.log('💡 Please check your HTML structure and update the selectors in setupProjectScaffoldingShortcut()');
      }
      return;
    }
    
    console.log('✅ Message input found, attaching keyboard listener...');
    
    // Add keydown event listener - CAPTURE PHASE to fire first!
    messageInput.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if "+" key is pressed (Shift++ or NumPad+)
      if ((event.key === '+' || (event.key === '=' && event.shiftKey)) && !event.ctrlKey && !event.altKey) {
        // Check if input is empty or just whitespace
        const currentValue = messageInput.value.trim();
        
        if (currentValue === '' || currentValue === '+') {
          // Prevent the "+" from being typed
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          console.log('🚀 "+" pressed - Opening project settings modal directly...');
          
          // Clear input
          messageInput.value = '';
          
          // Trigger input event to notify any listeners
          messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // ✅ DIRECTLY OPEN THE MODAL - No AI call!
          openProjectSettingsModalDirect();
          
          console.log('✨ Project settings modal opened!');
        }
      }
    }, true); // <-- CAPTURE PHASE: fires before other listeners!
    
    // Add keypress listener as backup - also CAPTURE PHASE
    messageInput.addEventListener('keypress', (event: KeyboardEvent) => {
      const currentValue = messageInput.value.trim();
      if ((event.key === '+' || event.key === '=') && (currentValue === '' || currentValue === '+')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }, true);
    
    console.log('✅ Keyboard shortcut successfully set up! Press "+" in the message input to open project settings.');
  };
  
  // Start setup with retry mechanism
  setupWithRetry();
}

// ============================================================================
// Request Detection
// ============================================================================

export function isProjectCreationRequest(message: string): boolean {
  // Check for single "+" as shortcut trigger
  if (message.trim() === '+') {
    console.log('✨ "+" shortcut detected in message');
    return true;
  }
  
  const keywords = [
    'create project', 'new project', 'setup project', 'scaffold',
    'generate project', 'start new', 'make a new', 'want to build',
    'want to create', 'help me create', 'initialize project'
  ];
  
  const messageLower = message.toLowerCase();
  return keywords.some(keyword => messageLower.includes(keyword));
}

// ============================================================================
// Main Handler
// ============================================================================

export async function handleProjectScaffoldingRequest(
  message: string, 
  messageInput: HTMLInputElement | HTMLTextAreaElement
): Promise<void> {
  messageInput.value = '';
  if (messageInput instanceof HTMLTextAreaElement) {
    messageInput.style.height = 'auto';
  }
  
  await addMessageToChat('user', message);
  
  showTypingIndicator();
  
  try {
    if (!projectScaffolder) {
      await hideTypingIndicator();
      addSystemMessage('❌ Project scaffolding not initialized. Please refresh the IDE.');
      return;
    }
    
    const platform = navigator.platform.toLowerCase().includes('win') ? 'windows' : 'unix';
    
    const scaffoldResult = await projectScaffolder.suggestProjectSetup(message, {
      platform,
      currentDirectory: getCurrentWorkingDirectory()
    });
    
    lastScaffoldResult = scaffoldResult;
    
    await hideTypingIndicator();
    
    await addSimplifiedScaffoldMessage(scaffoldResult);
    
  } catch (error) {
    await hideTypingIndicator();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addSystemMessage(`❌ Scaffolding error: ${errorMessage}`);
    console.error('Project scaffolding failed:', error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getUserDefaultPath(): string {
  // Clear any old saved paths
  try {
    localStorage.removeItem('default_project_path');
  } catch (e) {}
  
  return ''; // Always blank
}

function getUserDefaultProjectType(): string {
  try {
    const savedType = localStorage.getItem('default_project_type');
    if (savedType) return savedType;
  } catch (e) {
    console.log('localStorage not available:', e);
  }
  return 'react-app';
}

function getCurrentWorkingDirectory(): string {
  const explorerTitle = document.querySelector('.explorer-title');
  if (explorerTitle?.textContent) {
    return explorerTitle.textContent;
  }
  return 'workspace';
}

// ============================================================================
// Scaffold Message UI
// ============================================================================

async function addSimplifiedScaffoldMessage(scaffoldResult: any): Promise<void> {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  (window as any).__currentScaffoldResult = scaffoldResult;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'ai-message assistant-message scaffold-message';
  
  const projectType = currentProjectSettings.projectType.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  
  const content = `
    <div class="scaffold-compact">
      <!-- Beta Notice Banner -->
      <div class="beta-notice-banner">
        <div class="beta-notice-content">
          <div class="beta-badge-large">
            <span class="beta-icon">🧪</span>
            <span class="beta-text">BETA</span>
          </div>
          <div class="beta-notice-text">
            <h4> Advanced Project Customization</h4>
            <p>This is a <strong>beta feature</strong> for developers who want to <strong>customize their project setup</strong> with full control over structure, dependencies, and configuration.</p>
            <div class="quick-start-suggestion">
              <span class="suggestion-icon">💡</span>
              <span class="suggestion-text">
                <strong>Quick Start:</strong> For standard project creation, use 
                <span class="menu-path">File → New Project</span> from the menu bar
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Settings Card with Actions -->
      <div class="settings-card">
        <div class="settings-header">
          <div class="header-left">
            <h3>🗿 Project Template Ready</h3>
            <span class="beta-badge-small">BETA</span>
          </div>
          <span class="status-badge">✨Developer</span>
        </div>
        
        <div class="project-config">
          <div class="config-row">
            <span class="config-label">📛 Name:</span>
            <span class="config-value" id="preview-name">${currentProjectSettings.projectName}</span>
          </div>
          <div class="config-row">
            <span class="config-label">📁 Location:</span>
            <span class="config-value path" id="preview-path">${currentProjectSettings.projectPath}</span>
          </div>
          <div class="config-row">
            <span class="config-label">🔧 Type:</span>
            <span class="config-value" id="preview-type">${projectType}</span>
          </div>
          <div class="config-row">
            <span class="config-label">📦 Options:</span>
            <span class="config-value" id="preview-options">
              ${currentProjectSettings.installDependencies ? '✅ Dependencies' : ''} 
              ${currentProjectSettings.createReadme ? '✅ README' : ''}
            </span>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn-primary configure-btn">
            ⚙️ Configure Project
          </button>
          <button class="btn-secondary cancel-template-btn">
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  messageElement.innerHTML = content;
  
  const metadata = createMessageMetadata('assistant');
  messageElement.appendChild(metadata);
  
  chatContainer.appendChild(messageElement);
  
  setupSimplifiedListeners(messageElement, scaffoldResult);
  
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    messageElement.style.transition = 'all 0.4s ease';
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translateY(0)';
  }, 50);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupSimplifiedListeners(container: HTMLElement, scaffoldResult: any): void {
  // Configure button
  container.querySelector('.configure-btn')?.addEventListener('click', () => {
    openSimplifiedSettingsModal(scaffoldResult);
  });
  
  // Cancel button
  container.querySelector('.cancel-template-btn')?.addEventListener('click', () => {
    // Remove the scaffold message card silently
    container.remove();
  });
  
  setupCodeBlockEventListeners(container);
}

// ============================================================================
// Setup Guide Modal
// ============================================================================

function showSetupGuideModal(scaffoldResult: any): void {
  document.getElementById('setup-guide-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'setup-guide-modal';
  modal.className = 'settings-modal setup-guide-modal';
  
  const isWindows = scaffoldResult.setupScript.platform === 'windows';
  const scriptExtension = isWindows ? 'bat' : 'sh';
  const scriptName = `setup-${currentProjectSettings.projectName}.${scriptExtension}`;
  const fullPath = getFullProjectPath(currentProjectSettings, isWindows);
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content setup-guide-content">
      <div class="modal-header">
        <h2>📚 Step-by-Step Setup Guide</h2>
        <button class="modal-close">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="guide-intro">
          <p>Follow these steps to set up your <strong>${currentProjectSettings.projectType.replace(/-/g, ' ')}</strong> project:</p>
        </div>
        
        <div class="steps-container">
          <!-- Step 1 -->
          <div class="step-card">
            <div class="step-header">
              <div class="step-number">1</div>
              <h3>Download & Save Script</h3>
            </div>
            <div class="step-content">
              <p>Download the setup script and save it to your desired location:</p>
              <div class="code-snippet">
                <code>${scriptName}</code>
                <button class="btn-download-inline" data-step="1">💾 Download Now</button>
              </div>
              <div class="step-note">
                <strong>Tip:</strong> Save it to your projects folder or desktop for easy access.
              </div>
            </div>
          </div>
          
          <!-- Step 2 -->
          <div class="step-card">
            <div class="step-header">
              <div class="step-number">2</div>
              <h3>Run the Setup Script</h3>
            </div>
            <div class="step-content">
              ${isWindows ? `
                <p>Press <strong>Windows + R</strong> to open the Run dialog, then type:</p>
                <div class="code-snippet">
                  <code>"C:\\Users\\%USERNAME%\\Downloads\\${scriptName}"</code>
                  <button class="btn-copy-path" data-path="C:\\Users\\%USERNAME%\\Downloads\\${scriptName}">📋 Copy</button>
                </div>
                <div class="action-item">⌨️ <strong>Press Enter to run the script</strong></div>
                <p><em>Alternative:</em> Right-click on the <code>${scriptName}</code> file and select "Run as administrator"</p>
              ` : `
                <p>Open Terminal and navigate to where you saved the file:</p>
                <div class="code-snippet">
                  <code>cd ~/Downloads</code>
                  <button class="btn-copy-path" data-path="cd ~/Downloads">📋 Copy</button>
                </div>
                <p>Make the script executable and run it:</p>
                <div class="code-snippet">
                  <code>chmod +x ${scriptName} && ./${scriptName}</code>
                  <button class="btn-copy-path" data-path="chmod +x ${scriptName} && ./${scriptName}">📋 Copy</button>
                </div>
              `}
              <div class="step-note">
                <strong>What happens:</strong> The script will create folders, install dependencies, and set up your project structure.
              </div>
            </div>
          </div>
          
          <!-- Step 3 -->
          <div class="step-card">
            <div class="step-header">
              <div class="step-number">3</div>
              <h3>Wait for Completion</h3>
            </div>
            <div class="step-content">
              <p>The script will automatically:</p>
              <ul>
                <li>✅ Create project directory: <code>${currentProjectSettings.projectName}</code></li>
                <li>✅ Generate folder structure</li>
                <li>✅ Create initial files</li>
                ${currentProjectSettings.installDependencies ? '<li>✅ Install dependencies (this may take a few minutes)</li>' : ''}
                ${currentProjectSettings.createReadme ? '<li>✅ Generate README.md</li>' : ''}
              </ul>
              <div class="step-note">
                <strong>Note:</strong> Don't close the terminal/command prompt until you see "Project created successfully!"
              </div>
            </div>
          </div>
          
          <!-- Step 4 -->
          <div class="step-card">
            <div class="step-header">
              <div class="step-number">4</div>
              <h3>Navigate to Your Project</h3>
            </div>
            <div class="step-content">
              <p>Once the script completes, your project will be located at:</p>
              <div class="path-display">
                <code>${fullPath}</code>
                <button class="btn-copy-path" data-path="${fullPath}">📋 Copy Path</button>
              </div>
              <p>You can navigate there using:</p>
              ${isWindows ? `
                <div class="code-snippet">
                  <code>cd /d "${fullPath}"</code>
                </div>
                <p><em>Or</em> open Windows Explorer and navigate to the folder.</p>
              ` : `
                <div class="code-snippet">
                  <code>cd "${fullPath}"</code>
                </div>
                <p><em>Or</em> open Finder/File Manager and navigate to the folder.</p>
              `}
            </div>
          </div>
          
          <!-- Step 5 -->
          <div class="step-card step-final">
            <div class="step-header">
              <div class="step-number">5</div>
              <h3>Open in AI Code IDE</h3>
            </div>
            <div class="step-content">
              <p>Now load your project into AI Code IDE:</p>
              <div class="open-methods">
                <div class="method">
                  <h4>🎯 Method 1: File Menu</h4>
                  <ol>
                    <li>Click <strong>File</strong> → <strong>Open Folder</strong></li>
                    <li>Navigate to your project folder</li>
                    <li>Select <code>${currentProjectSettings.projectName}</code> folder</li>
                    <li>Click <strong>Open</strong></li>
                  </ol>
                </div>
                
                <div class="method">
                  <h4>🖱️ Method 2: Drag & Drop</h4>
                  <ol>
                    <li>Open your file manager</li>
                    <li>Navigate to the project folder</li>
                    <li>Drag the <code>${currentProjectSettings.projectName}</code> folder</li>
                    <li>Drop it onto the AI Code IDE window</li>
                  </ol>
                </div>
              </div>
              
              <div class="success-message">
                <strong>🎉 Success!</strong> Your project is now ready for development with AI assistance!
              </div>
            </div>
          </div>
        </div>
        
        <div class="guide-footer">
          <div class="troubleshooting">
            <h4>❓ Need Help?</h4>
            <ul>
              <li>If script fails: Check you have admin/sudo permissions</li>
              <li>If dependencies fail: Check your internet connection</li>
              <li>If folder not created: Verify the target path exists</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-close-guide">Got It!</button>
      </div>
    </div>
  `;
  
document.body.appendChild(modal);

modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal());
modal.querySelector('.btn-cancel')?.addEventListener('click', () => closeModal());
modal.querySelector('.modal-overlay')?.addEventListener('click', () => closeModal());

// 🟢 MODIFY THIS SECTION:
modal.querySelector('.btn-apply')?.addEventListener('click', async () => {  // 🟢 Added 'async'
  saveSimplifiedSettings(scaffoldResult);
  closeModal();
  
  // 🟢 NEW: AI-powered project setup
  await handleApplySettingsSimple(currentProjectSettings);
});

modal.querySelector('.browse-btn')?.addEventListener('click', async () => {
  try {
    // For Tauri 2.x plugin-dialog
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Project Location'
    });
    
    if (selected && selected !== null) {
      const pathInput = modal.querySelector('#project-path') as HTMLInputElement;
      if (pathInput) {
        // Convert to string (selected is string or null)
        pathInput.value = String(selected);
        // Trigger input event to update preview and validation
        pathInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      showNotification('✅ Folder selected!', 'success');
    }
  } catch (error) {
    console.error('Folder selection error:', error);
    showNotification('❌ Could not open folder browser', 'error');
  }
});

const nameInput = modal.querySelector('#project-name') as HTMLInputElement;
  const pathInput = modal.querySelector('#project-path') as HTMLInputElement;
  const previewPath = modal.querySelector('#preview-full-path');
  const applyButton = modal.querySelector('.btn-apply') as HTMLButtonElement;
  
  // Validation function
  const validateForm = () => {
    const locationValue = pathInput?.value?.trim() || '';
    const isValid = locationValue.length > 0;
    
    // Enable/disable apply button
    if (applyButton) {
      applyButton.disabled = !isValid;
      applyButton.style.opacity = isValid ? '1' : '0.5';
      applyButton.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
    
    return isValid;
  };
  
  const updatePreview = () => {
    if (previewPath) {
      previewPath.textContent = isWindows 
        ? `${pathInput.value}\\${nameInput.value}`
        : `${pathInput.value}/${nameInput.value}`;
    }
    
    // Validate on every update
    validateForm();
  };
  
  nameInput?.addEventListener('input', updatePreview);
  pathInput?.addEventListener('input', updatePreview);
  
  // Initial validation (disable button if location is empty)
  validateForm();
  
  setTimeout(() => modal.classList.add('modal-open'), 10);
}

function closeSetupGuideModal(): void {
  const modal = document.getElementById('setup-guide-modal');
  if (modal) {
    modal.classList.remove('modal-open');
    setTimeout(() => modal.remove(), 300);
  }
}

// ============================================================================
// Settings Modal
// ============================================================================

/**
 * Opens the project settings card directly in chat (called when pressing "+")
 * This function can be called without going through the AI
 */
export function openProjectSettingsModalDirect(): void {
  console.log('🚀 Opening project settings card in chat...');
  
  // Create a default scaffold result for the card
  const defaultScaffoldResult = {
    setupScript: {
      platform: navigator.platform.toLowerCase().includes('win') ? 'windows' : 'unix',
      content: '',
      template: 'default'
    }
  };
  
  // Show the card in chat instead of modal
  addSimplifiedScaffoldMessage(defaultScaffoldResult);
}

function openSimplifiedSettingsModal(scaffoldResult: any): void {
  document.getElementById('project-settings-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'project-settings-modal';
  modal.className = 'settings-modal';
  
  const isWindows = scaffoldResult.setupScript.platform === 'windows';
  
  const projectTypeOptions = [
    { value: 'react-app', label: '⚛️ React Web App' },
    { value: 'vue-app', label: '💚 Vue.js App' },
    { value: 'angular-app', label: '🅰️ Angular App' },
    { value: 'vanilla-web', label: '🌐 Vanilla Web App' },
    { value: 'node-express', label: '🟢 Node.js API' },
    { value: 'python-flask', label: '🐍 Python Flask API' },
    { value: 'python-django', label: '🐍 Python Django' },
    { value: 'python-fastapi', label: '⚡ Python FastAPI' },
    { value: 'electron-app', label: '🖥️ Desktop App (Electron)' },
    { value: 'tauri-app', label: '🦀 Desktop App (Tauri)' },
    { value: 'react-native', label: '📱 React Native (Mobile)' },
    { value: 'android-kotlin', label: '🤖 Android App (Kotlin)' },
    { value: 'ios-swift', label: '🍎 iOS App (Swift)' },
    { value: 'flutter-app', label: '💙 Flutter App' },
    { value: 'chrome-extension', label: '🧩 Chrome Extension' },
    { value: 'cli-tool', label: '⚡ CLI Tool' },
    { value: 'rust-app', label: '🦀 Rust Application' },
    { value: 'go-app', label: '🐹 Go Application' },
    { value: 'java-spring', label: '☕ Java Spring Boot' },
    { value: 'dotnet-app', label: '💙 .NET Application' },
    { value: 'wordpress-theme', label: '📝 WordPress Theme' },
    { value: 'nextjs-app', label: '⚡ Next.js App' },
    { value: 'nuxt-app', label: '💚 Nuxt.js App' },
    { value: 'game-unity', label: '🎮 Unity Game' },
    { value: 'blockchain-dapp', label: '⛓️ Blockchain DApp' },
    { value: 'machine-learning', label: '🤖 ML/AI Project' },
    { value: 'generic-project', label: '📁 Generic Project' }
  ];
  
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ Project Configuration</h2>
        <button class="modal-close">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>🔧 Project Type</label>
          <select id="project-type" class="project-type-select">
            ${projectTypeOptions.map(option => 
              `<option value="${option.value}" ${option.value === currentProjectSettings.projectType ? 'selected' : ''}>${option.label}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>📛 Project Name</label>
          <input type="text" id="project-name" value="${currentProjectSettings.projectName}" />
        </div>
        
        <div class="form-group">
          <label>📁 Location</label>
          <div class="input-with-button">
            <input type="text" id="project-path" value="${currentProjectSettings.projectPath}" />
            <button class="browse-btn">📂</button>
          </div>
        </div>
        
        <!-- Requirements Section -->
        <div class="requirements-section">
          <h3 class="section-title">
            📋 Project Requirements 
            <span class="optional-badge">Optional</span>
          </h3>
          <p class="section-description">
            Describe what you want to build. These details will be included in your README.
          </p>
          
          <div class="form-group">
            <label>📝 Description</label>
            <textarea id="project-description" rows="2" placeholder="What is this project about? (e.g., A task management app for teams)">${currentProjectSettings.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>✨ Key Features</label>
            <textarea id="project-features" rows="2" placeholder="What features should it have? (e.g., Real-time updates, user authentication, dark mode)">${currentProjectSettings.features || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>📥 Expected Input</label>
            <input type="text" id="project-input" placeholder="What data/input will it receive? (e.g., User tasks, JSON API responses)" value="${currentProjectSettings.expectedInput || ''}" />
          </div>
          
          <div class="form-group">
            <label>📤 Expected Output</label>
            <input type="text" id="project-output" placeholder="What will it produce? (e.g., Formatted reports, REST API responses)" value="${currentProjectSettings.expectedOutput || ''}" />
          </div>
          
          <div class="form-group">
            <label>🎨 UI Description</label>
            <textarea id="project-ui" rows="2" placeholder="How should the interface look? (e.g., Modern dashboard with sidebar, mobile-first design)">${currentProjectSettings.uiDescription || ''}</textarea>
          </div>
        </div>
        
        <div class="options-group">
          <label class="checkbox">
            <input type="checkbox" id="install-deps" ${currentProjectSettings.installDependencies ? 'checked' : ''} />
            <span>Install Dependencies</span>
          </label>
          
          <label class="checkbox">
            <input type="checkbox" id="create-readme" ${currentProjectSettings.createReadme ? 'checked' : ''} />
            <span>Create README</span>
          </label>
        </div>
        
        <div class="preview-box">
          <div class="preview-label">Preview Path:</div>
          <code id="preview-full-path">${getFullProjectPath(currentProjectSettings, isWindows)}</code>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-apply">Apply Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal());
  modal.querySelector('.btn-cancel')?.addEventListener('click', () => closeModal());
  modal.querySelector('.modal-overlay')?.addEventListener('click', () => closeModal());
  
modal.querySelector('.btn-apply')?.addEventListener('click', async () => {
  saveSimplifiedSettings(scaffoldResult);
  closeModal();
  
  // 🟢 NEW: AI-powered project setup
  await handleApplySettingsSimple(currentProjectSettings);
});
  
modal.querySelector('.browse-btn')?.addEventListener('click', async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Project Location'
    });
    
    if (selected && selected !== null) {
      const pathInput = modal.querySelector('#project-path') as HTMLInputElement;
      if (pathInput) {
        pathInput.value = String(selected);
        pathInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      showNotification('✅ Folder selected!', 'success');
    }
  } catch (error) {
    console.error('Folder selection error:', error);
    showNotification('❌ Could not open folder browser', 'error');
  }
});
  
  const nameInput = modal.querySelector('#project-name') as HTMLInputElement;
  const pathInput = modal.querySelector('#project-path') as HTMLInputElement;
  const previewPath = modal.querySelector('#preview-full-path');
  
  const updatePreview = () => {
    if (previewPath) {
      previewPath.textContent = isWindows 
        ? `${pathInput.value}\\${nameInput.value}`
        : `${pathInput.value}/${nameInput.value}`;
    }
  };
  
  nameInput?.addEventListener('input', updatePreview);
  pathInput?.addEventListener('input', updatePreview);
  
  setTimeout(() => modal.classList.add('modal-open'), 10);
}

function saveSimplifiedSettings(scaffoldResult: any): void {
  const modal = document.getElementById('project-settings-modal');
  if (!modal) return;
  
const pathValue = (modal.querySelector('#project-path') as HTMLInputElement)?.value?.trim() || '';
  
  // Validate location is not empty
  if (!pathValue) {
    showNotification('⚠️ Please enter a project location', 'error');
    return;
  }
  
  currentProjectSettings = {
    projectName: (modal.querySelector('#project-name') as HTMLInputElement)?.value || 'my-project',
    projectPath: pathValue,
    installDependencies: (modal.querySelector('#install-deps') as HTMLInputElement)?.checked || true,
    createReadme: (modal.querySelector('#create-readme') as HTMLInputElement)?.checked || true,
    projectType: (modal.querySelector('#project-type') as HTMLSelectElement)?.value || 'react-app',
    // Capture requirements fields
    description: (modal.querySelector('#project-description') as HTMLTextAreaElement)?.value?.trim() || undefined,
    features: (modal.querySelector('#project-features') as HTMLTextAreaElement)?.value?.trim() || undefined,
    expectedInput: (modal.querySelector('#project-input') as HTMLInputElement)?.value?.trim() || undefined,
    expectedOutput: (modal.querySelector('#project-output') as HTMLInputElement)?.value?.trim() || undefined,
    uiDescription: (modal.querySelector('#project-ui') as HTMLTextAreaElement)?.value?.trim() || undefined
  };
  
  try {
    localStorage.setItem('default_project_path', currentProjectSettings.projectPath);
    localStorage.setItem('default_project_type', currentProjectSettings.projectType);
  } catch (e) {
    console.log('Could not save to localStorage:', e);
  }
  
  updateAllProjectDisplays(scaffoldResult);
  
  showNotification('✅ Settings applied!', 'success');
}

function closeModal(): void {
  const modal = document.getElementById('project-settings-modal');
  if (modal) {
    modal.classList.remove('modal-open');
    setTimeout(() => modal.remove(), 300);
  }
}

function updateAllProjectDisplays(scaffoldResult: any): void {
  document.querySelectorAll('#preview-name').forEach(el => {
    el.textContent = currentProjectSettings.projectName;
  });
  
  document.querySelectorAll('#preview-path').forEach(el => {
    el.textContent = currentProjectSettings.projectPath;
  });
  
  document.querySelectorAll('#preview-type').forEach(el => {
    const formattedType = currentProjectSettings.projectType.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    el.textContent = formattedType;
  });
  
  const optionsEl = document.querySelector('#preview-options');
  if (optionsEl) {
    optionsEl.textContent = `${currentProjectSettings.installDependencies ? '✅ Dependencies' : ''} ${currentProjectSettings.createReadme ? '✅ README' : ''}`;
  }
  
  const scriptElement = document.querySelector('#script-content');
  if (scriptElement) {
    const newScript = generateCustomizedScript(scaffoldResult, currentProjectSettings);
    scriptElement.textContent = newScript;
  }
}

// ============================================================================
// Script Generation
// ============================================================================

function generateCustomizedScript(scaffoldResult: any, settings: ProjectSettings): string {
  const template = scaffoldResult.setupScript.template;
  const platform = scaffoldResult.setupScript.platform;
  const isWindows = platform === 'windows';
  
  let script = scaffoldResult.setupScript.content;
  
  script = script.replace(/my-project/g, settings.projectName);
  
  const nav = isWindows ? `cd /d "${settings.projectPath}"` : `cd "${settings.projectPath}"`;
  const lines = script.split('\n');
  
  let insertIndex = lines.findIndex(line => 
    !line.trim().startsWith('echo') && 
    !line.trim().startsWith('#') && 
    !line.trim().startsWith('@echo') && 
    !line.trim().startsWith('REM') && 
    line.trim() !== ''
  );
  
  if (insertIndex === -1) insertIndex = 5;
  
  lines.splice(insertIndex, 0, 
    '',
    `${isWindows ? 'REM' : '#'} Navigate to project location`,
    nav,
    ''
  );
  
  const additions = [];
  
  if (settings.createReadme) {
    additions.push(
      `${isWindows ? 'REM' : '#'} Create README`,
      isWindows 
        ? `echo # ${settings.projectName} > "${settings.projectName}\\README.md"`
        : `echo "# ${settings.projectName}" > "${settings.projectName}/README.md"`
    );
  }
  
  const successIndex = lines.findIndex(line => line.includes('successfully'));
  if (successIndex > -1) {
    lines.splice(successIndex, 0, '', ...additions, '');
  } else {
    lines.push('', ...additions);
  }
  
  return lines.join('\n');
}

function getFullProjectPath(settings: ProjectSettings, isWindows: boolean): string {
  const sep = isWindows ? '\\' : '/';
  return `${settings.projectPath}${sep}${settings.projectName}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

function downloadScript(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function countFolders(structure: any): number {
  let count = 0;
  for (const value of Object.values(structure)) {
    if (typeof value === 'object') {
      count++;
      count += countFolders(value);
    }
  }
  return count;
}

function countFiles(structure: any): number {
  let count = 0;
  for (const value of Object.values(structure)) {
    if (typeof value === 'string') {
      count++;
    } else {
      count += countFiles(value);
    }
  }
  return count;
}

// ============================================================================
// Styles
// ============================================================================

function addProjectScaffoldingStyles(): void {
  if (document.getElementById('project-scaffolding-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'project-scaffolding-styles';
  styles.textContent = `
    /* Scaffold Message */
    .scaffold-compact {
      width: 100%;
    }
    
    /* Beta Notice Banner */
    .beta-notice-banner {
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%);
      border: 2px solid rgba(255, 152, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.1);
    }
    
    .beta-notice-content {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    
    .beta-badge-large {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 152, 0, 0.2);
      border: 2px solid rgba(255, 152, 0, 0.5);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .beta-icon {
      font-size: 32px;
      margin-bottom: 4px;
    }
    
    .beta-text {
      font-size: 14px;
      font-weight: 700;
      color: #ff9800;
      letter-spacing: 1px;
    }
    
    .beta-notice-text {
      flex: 1;
    }
    
    .beta-notice-text h4 {
      margin: 0 0 8px 0;
      color: #ffa726;
      font-size: 16px;
      font-weight: 600;
    }
    
    .beta-notice-text p {
      margin: 0 0 12px 0;
      color: #e1e1e1;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .beta-notice-text strong {
      color: #ffb74d;
      font-weight: 600;
    }
    
    .quick-start-suggestion {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(33, 150, 243, 0.15);
      border: 1px solid rgba(33, 150, 243, 0.3);
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 8px;
    }
    
    .suggestion-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .suggestion-text {
      color: #e1e1e1;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .suggestion-text strong {
      color: #64b5f6;
      font-weight: 600;
    }
    
    .menu-path {
      display: inline-block;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 2px 8px;
      margin: 0 4px;
      font-family: monospace;
      font-size: 12px;
      color: #4fc3f7;
      font-weight: 600;
    }
    
    .settings-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #444;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .settings-header h3 {
      margin: 0;
      color: #4fc3f7;
      font-size: 15px;
    }
    
    .beta-badge-small {
      background: rgba(255, 152, 0, 0.2);
      border: 1px solid rgba(255, 152, 0, 0.5);
      color: #ff9800;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .status-badge {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .project-config {
      margin-bottom: 12px;
    }
    
    .config-row {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .config-label {
      color: #888;
      min-width: 80px;
    }
    
    .config-value {
      color: #e1e1e1;
      font-family: monospace;
      font-size: 11px;
    }
    
    .config-value.path {
      color: #4fc3f7;
      word-break: break-all;
    }
    
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
      justify-content: center;
    }
    
    .btn-primary, .btn-success, .btn-secondary, .btn-info {
      padding: 6px 12px;
      border: none;
      border-radius: 5px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #0084ff;
      color: white;
    }
    
    .btn-primary:hover {
      background: #0073e6;
    }
    
    .btn-success {
      background: #4caf50;
      color: white;
      font-weight: 600;
    }
    
    .btn-success:hover {
      background: #45a049;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
    }
    
    .btn-secondary {
      background: #555;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #666;
    }
    
    .btn-info {
      background: #17a2b8;
      color: white;
    }
    
    .btn-info:hover {
      background: #138496;
    }
    
    .btn-icon {
      padding: 6px 8px;
      border: none;
      border-radius: 5px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      background: #6c757d;
      color: white;
      min-width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-icon:hover {
      background: #5a6268;
      transform: translateY(-1px);
    }
    
    /* Details Section */
    .details-section {
      margin-top: 10px;
    }
    
    .details-toggle {
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #444;
      border-radius: 5px;
      color: #888;
      cursor: pointer;
      font-size: 12px;
      text-align: left;
      transition: all 0.2s;
    }
    
    .details-toggle:hover {
      background: rgba(0, 0, 0, 0.3);
      color: #e1e1e1;
    }
    
    .toggle-icon {
      display: inline-block;
      transition: transform 0.2s;
      margin-right: 4px;
    }
    
    .details-content {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .info-box {
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    
    .info-box h4 {
      margin: 0 0 6px 0;
      color: #4fc3f7;
      font-size: 12px;
    }
    
    .info-box ul, .info-box ol {
      margin: 0;
      padding-left: 16px;
      font-size: 11px;
      color: #e1e1e1;
    }
    
    .script-preview {
      margin-top: 10px;
    }
    
    .script-preview h4 {
      margin: 0 0 6px 0;
      color: #4fc3f7;
      font-size: 12px;
    }
    
    /* Modal */
    .settings-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .settings-modal.modal-open {
      opacity: 1;
    }
    
    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
    }
    
    .modal-content {
      position: relative;
      background: #2d2d2d;
      border: 1px solid #444;
      border-radius: 8px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
    
    .modal-header {
      padding: 16px;
      border-bottom: 1px solid #444;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h2 {
      margin: 0;
      color: #4fc3f7;
      font-size: 18px;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    }
    
    .modal-close:hover {
      color: #fff;
    }
    
    .modal-body {
      padding: 16px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      color: #e1e1e1;
      margin-bottom: 6px;
      font-size: 13px;
    }
    
    .form-group input[type="text"] {
      width: 100%;
      padding: 8px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 4px;
      color: #fff;
      font-size: 13px;
    }
    
    .project-type-select {
      width: 100%;
      padding: 8px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 4px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
    }
    
    .project-type-select:focus {
      outline: none;
      border-color: #4fc3f7;
    }
    
    .project-type-select option {
      background: #1e1e1e;
      color: #fff;
      padding: 8px;
    }
    
    .input-with-button {
      display: flex;
      gap: 6px;
    }
    
    .input-with-button input {
      flex: 1;
    }
    
    .browse-btn {
      padding: 8px 12px;
      background: #444;
      border: 1px solid #555;
      border-radius: 4px;
      color: #4fc3f7;
      cursor: pointer;
    }
    
    .browse-btn:hover {
      background: #555;
    }
    
    .options-group {
      margin: 16px 0;
    }
    
    .checkbox {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      cursor: pointer;
      font-size: 13px;
      color: #e1e1e1;
    }
    
    .checkbox input {
      margin-right: 8px;
    }
    
    .preview-box {
      padding: 10px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 4px;
      margin-top: 16px;
    }
    
    .preview-label {
      color: #888;
      font-size: 11px;
      margin-bottom: 4px;
    }
    
    .preview-box code {
      color: #4fc3f7;
      font-size: 12px;
      word-break: break-all;
    }
    
    .modal-footer {
      padding: 12px 16px;
      border-top: 1px solid #444;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    .btn-cancel, .btn-apply {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    
    .btn-cancel {
      background: #555;
      color: #e1e1e1;
    }
    
    .btn-cancel:hover {
      background: #666;
    }
    
    .btn-apply {
      background: #0084ff;
      color: white;
    }
    
    .btn-apply:hover {
      background: #0073e6;
    }
    
    /* Setup Guide Modal Styles */
    .setup-guide-modal .modal-content {
      max-width: 700px;
      max-height: 90vh;
      width: 95%;
    }
    
    .setup-guide-content .modal-body {
      max-height: 70vh;
      overflow-y: auto;
      padding: 20px;
    }
    
    .guide-intro {
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-radius: 6px;
    }
    
    .guide-intro p {
      margin: 0;
      color: #e1e1e1;
      font-size: 14px;
    }
    
    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .step-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .step-card:hover {
      border-color: #4fc3f7;
      box-shadow: 0 2px 10px rgba(79, 195, 247, 0.1);
    }
    
    .step-final {
      border-color: #4caf50;
      background: rgba(76, 175, 80, 0.05);
    }
    
    .step-header {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid #444;
    }
    
    .step-number {
      width: 28px;
      height: 28px;
      background: #4fc3f7;
      color: #1e1e1e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      margin-right: 12px;
    }
    
    .step-final .step-number {
      background: #4caf50;
    }
    
    .step-header h3 {
      margin: 0;
      color: #e1e1e1;
      font-size: 16px;
      font-weight: 600;
    }
    
    .step-content {
      padding: 15px;
    }
    
    .step-content p {
      margin: 0 0 10px 0;
      color: #e1e1e1;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .step-content ul, .step-content ol {
      margin: 10px 0;
      padding-left: 20px;
      color: #e1e1e1;
      font-size: 14px;
    }
    
    .step-content li {
      margin-bottom: 5px;
    }
    
    .code-snippet {
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
      font-family: monospace;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    
    .code-snippet code {
      color: #4fc3f7;
      font-size: 13px;
      flex: 1;
    }
    
    .btn-download-inline, .btn-copy-path {
      padding: 4px 8px;
      background: #4fc3f7;
      color: #1e1e1e;
      border: none;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    
    .btn-download-inline:hover, .btn-copy-path:hover {
      background: #45b7e0;
      transform: translateY(-1px);
    }
    
    .step-note {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.2);
      border-radius: 4px;
      padding: 8px 10px;
      margin-top: 10px;
      font-size: 12px;
      color: #ffc107;
    }
    
    .action-item {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.2);
      border-radius: 4px;
      padding: 8px 12px;
      margin: 10px 0;
      color: #4caf50;
      font-size: 14px;
      text-align: center;
    }
    
    .path-display {
      background: #1e1e1e;
      border: 1px solid #4fc3f7;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    
    .path-display code {
      color: #4fc3f7;
      font-size: 13px;
      word-break: break-all;
      flex: 1;
    }
    
    .open-methods {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 15px 0;
    }
    
    .method {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #444;
      border-radius: 6px;
      padding: 12px;
    }
    
    .method h4 {
      margin: 0 0 8px 0;
      color: #4fc3f7;
      font-size: 14px;
    }
    
    .method ol {
      margin: 0;
      padding-left: 16px;
      font-size: 13px;
    }
    
    .method li {
      margin-bottom: 4px;
    }
    
    .success-message {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 6px;
      padding: 12px;
      margin-top: 15px;
      text-align: center;
      color: #4caf50;
      font-size: 14px;
    }
    
    .guide-footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #444;
    }
    
    .troubleshooting {
      background: rgba(244, 67, 54, 0.05);
      border: 1px solid rgba(244, 67, 54, 0.2);
      border-radius: 6px;
      padding: 12px;
    }
    
    .troubleshooting h4 {
      margin: 0 0 8px 0;
      color: #f44336;
      font-size: 14px;
    }
    
    .troubleshooting ul {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      color: #e1e1e1;
    }
    
    .troubleshooting li {
      margin-bottom: 4px;
    }
    
    .btn-close-guide {
      padding: 10px 20px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-close-guide:hover {
      background: #45a049;
      transform: translateY(-1px);
    }
    
    /* Requirements Section Styles */
    .requirements-section {
      background: rgba(33, 150, 243, 0.05);
      border: 1px solid rgba(33, 150, 243, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .section-title {
      margin: 0 0 8px 0;
      color: #64b5f6;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .optional-badge {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-description {
      margin: 0 0 16px 0;
      color: #b0b0b0;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .requirements-section .form-group {
      margin-bottom: 16px;
    }
    
    .requirements-section .form-group:last-child {
      margin-bottom: 0;
    }
    
    .requirements-section textarea {
      resize: vertical;
      min-height: 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }
    
    .requirements-section input,
    .requirements-section textarea {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid #444;
      color: #e1e1e1;
      border-radius: 4px;
      padding: 10px;
      width: 100%;
      font-size: 14px;
    }
    
    .requirements-section input:focus,
    .requirements-section textarea:focus {
      outline: none;
      border-color: #64b5f6;
      background: rgba(33, 150, 243, 0.05);
    }
    
    .requirements-section input::placeholder,
    .requirements-section textarea::placeholder {
      color: #666;
    }
    
    /* Modal content scrolling for longer forms */
    .modal-content {
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .modal-body {
      max-height: calc(90vh - 120px);
      overflow-y: auto;
    }
    
    /* Responsive adjustments for setup guide */
    @media (max-width: 768px) {
      .setup-guide-modal .modal-content {
        width: 95%;
        margin: 10px;
      }
      
      .open-methods {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      
      .code-snippet {
        flex-direction: column;
        align-items: stretch;
      }
      
      .path-display {
        flex-direction: column;
        align-items: stretch;
      }
      
      /* Beta notice responsive */
      .beta-notice-content {
        flex-direction: column;
        gap: 12px;
      }
      
      .beta-badge-large {
        flex-direction: row;
        align-items: center;
        width: 100%;
        padding: 8px 12px;
        gap: 8px;
      }
      
      .beta-icon {
        font-size: 24px;
        margin-bottom: 0;
      }
      
      .quick-start-suggestion {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      
      .menu-path {
        display: block;
        margin: 4px 0;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// Export Functions
// ============================================================================

export {
  currentProjectSettings,
  lastScaffoldResult
};