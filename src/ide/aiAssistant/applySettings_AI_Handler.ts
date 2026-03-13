// applySettings_AI_Handler.ts - AI-Powered Project Setup After "Apply Settings"

import { callGenericAPI } from './apiProviderManager';
import { addMessageToChat, addSystemMessage } from './messageUI';
import { showNotification } from './notificationManager';

// ============================================================================
// Types
// ============================================================================

interface ProjectSettings {
  projectType: string;
  projectName: string;
  location: string;
  installDependencies: boolean;
  createReadme: boolean;
}

interface AICustomization {
  purpose: string;
  needsAuth: boolean;
  stylingLibrary: string;
  stateManagement: string;
  apiType: string;
}

interface ProjectPlan {
  structure: any;
  files: Map<string, string>;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  setupCommands: string[];
}

// ============================================================================
// Main Handler - Called when "Apply Settings" is clicked
// ============================================================================

export async function handleApplySettingsWithAI(settings: ProjectSettings): Promise<void> {
  console.log('🤖 AI-powered project setup initiated', settings);
  
  try {
    // Step 1: Validate and analyze settings
    await addSystemMessage('🔍 AI is analyzing your project settings...');
    const analysis = await analyzeProjectSettings(settings);
    
    // Step 2: Show warnings/suggestions if any
    if (analysis.warnings.length > 0) {
      await showSuggestionsModal(analysis);
    }
    
    // Step 3: Ask AI-powered customization questions
    await addSystemMessage('💡 Let me customize your project for you...');
    const customization = await askAICustomizationQuestions(settings);
    
    // Step 4: Generate complete project plan
    await addSystemMessage('📋 AI is generating your project plan...');
    const projectPlan = await generateAIProjectPlan(settings, customization);
    
    // Step 5: Show preview and get confirmation
    const confirmed = await showProjectPlanPreview(projectPlan, settings);
    if (!confirmed) {
      await addSystemMessage('❌ Project setup cancelled.');
      return;
    }
    
    // Step 6: Execute setup with progress tracking
    await addSystemMessage('🚀 Setting up your project...');
    const setupResult = await executeProjectSetup(projectPlan, settings);
    
    // Step 7: Post-setup AI assistance
    if (setupResult.success) {
      await showSuccessAndStartAIAssistance(settings, projectPlan);
    } else {
      await addSystemMessage(`❌ Setup failed: ${setupResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ AI project setup error:', error);
    await addSystemMessage('❌ An error occurred during project setup.');
  }
}

// ============================================================================
// Step 1: Analyze Project Settings
// ============================================================================

async function analyzeProjectSettings(settings: ProjectSettings): Promise<any> {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for path issues
  if (settings.location.includes(' ')) {
    warnings.push('⚠️ Project path contains spaces, which may cause issues with some tools.');
    suggestions.push('Consider using a path without spaces: ' + settings.location.replace(/ /g, ''));
  }
  
  // Check project name
  if (!/^[a-z0-9-]+$/.test(settings.projectName)) {
    warnings.push('⚠️ Project name contains uppercase letters or special characters.');
    suggestions.push('Recommended: ' + settings.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  }
  
  // AI-powered analysis
  const aiPrompt = `Analyze this project setup and provide suggestions:
Project Type: ${settings.projectType}
Project Name: ${settings.projectName}
Location: ${settings.location}
Install Dependencies: ${settings.installDependencies}
Create README: ${settings.createReadme}

Provide 2-3 best practice suggestions for this setup.`;

  try {
    const apiConfig = getCurrentApiConfigurationForced();
    const aiSuggestions = await callGenericAPI(aiPrompt, apiConfig);
    suggestions.push(...parseAISuggestions(aiSuggestions));
  } catch (error) {
    console.error('AI analysis failed:', error);
  }
  
  return { warnings, suggestions };
}

// ============================================================================
// Step 2: AI Customization Questions
// ============================================================================

async function askAICustomizationQuestions(settings: ProjectSettings): Promise<AICustomization> {
  const customization: Partial<AICustomization> = {};
  
  // Question 1: Project purpose
  await addMessageToChat('assistant', `
    🎯 **What's the main purpose of your ${settings.projectType}?**
    
    Examples: "task management app", "e-commerce site", "blog platform", "dashboard"
    
    Tell me what you're building, and I'll customize the project structure for you!
  `);
  
  customization.purpose = await waitForUserResponse();
  
  // AI generates follow-up questions based on purpose
  const followUpQuestions = await generateSmartQuestions(settings, customization.purpose);
  
  // Question 2: Authentication
  await addMessageToChat('assistant', followUpQuestions.auth);
  customization.needsAuth = await waitForYesNoResponse();
  
  // Question 3: Styling
  await addMessageToChat('assistant', followUpQuestions.styling);
  customization.stylingLibrary = await waitForChoiceResponse(['Tailwind', 'Styled-components', 'CSS Modules', 'Material-UI']);
  
  // Question 4: State Management (conditional)
  if (isComplexApp(customization.purpose)) {
    await addMessageToChat('assistant', followUpQuestions.state);
    customization.stateManagement = await waitForChoiceResponse(['Redux', 'Zustand', 'Context API', 'None']);
  }
  
  // Question 5: API (conditional)
  if (needsBackend(customization.purpose)) {
    await addMessageToChat('assistant', followUpQuestions.api);
    customization.apiType = await waitForChoiceResponse(['REST', 'GraphQL', 'tRPC', 'None']);
  }
  
  return customization as AICustomization;
}

async function generateSmartQuestions(settings: ProjectSettings, purpose: string): Promise<any> {
  const prompt = `Generate 3-4 relevant customization questions for a ${settings.projectType} with purpose: "${purpose}".
  
Focus on:
1. Authentication needs
2. Styling/UI library
3. State management (if complex app)
4. API integration

Return as JSON with friendly, developer-focused questions.`;

  try {
    const apiConfig = getCurrentApiConfigurationForced();
    const response = await callGenericAPI(prompt, apiConfig);
    return JSON.parse(response);
  } catch (error) {
    // Fallback to default questions
    return getDefaultQuestions();
  }
}

// ============================================================================
// Step 3: Generate AI Project Plan
// ============================================================================

async function generateAIProjectPlan(
  settings: ProjectSettings, 
  customization: AICustomization
): Promise<ProjectPlan> {
  
  const prompt = `Generate a complete project setup plan for:

Project Type: ${settings.projectType}
Project Name: ${settings.projectName}
Purpose: ${customization.purpose}
Authentication: ${customization.needsAuth}
Styling: ${customization.stylingLibrary}
State Management: ${customization.stateManagement || 'None'}
API Type: ${customization.apiType || 'None'}

Return JSON with:
{
  "structure": { folder/file tree },
  "files": { "path": "content" },
  "dependencies": [],
  "devDependencies": [],
  "scripts": {},
  "setupCommands": []
}

Include:
- Optimized folder structure for ${customization.purpose}
- Starter components/files with actual code
- All necessary dependencies
- Setup scripts
- Configuration files (vite.config, eslint, etc.)`;

  try {
    const apiConfig = getCurrentApiConfigurationForced();
    const response = await callGenericAPI(prompt, apiConfig);
    const plan = JSON.parse(response);
    
    // Enhance with additional AI-generated content
    plan.readme = await generateProjectReadme(settings, customization);
    plan.gitignore = await generateGitignore(settings.projectType);
    
    return plan;
  } catch (error) {
    console.error('AI plan generation failed:', error);
    return getFallbackProjectPlan(settings, customization);
  }
}

// ============================================================================
// Step 4: Show Project Plan Preview
// ============================================================================

async function showProjectPlanPreview(plan: ProjectPlan, settings: ProjectSettings): Promise<boolean> {
  const previewContent = `
    <div class="project-plan-preview">
      <h3>📋 Your AI-Generated Project Plan</h3>
      
      <div class="plan-section">
        <h4>📁 Folder Structure</h4>
        <pre>${formatStructureTree(plan.structure)}</pre>
      </div>
      
      <div class="plan-section">
        <h4>📦 Dependencies (${plan.dependencies.length})</h4>
        <div class="dependency-list">
          ${plan.dependencies.map(dep => `<span class="dep-badge">${dep}</span>`).join(' ')}
        </div>
      </div>
      
      <div class="plan-section">
        <h4>📝 Files to Create (${plan.files.size})</h4>
        <ul>
          ${Array.from(plan.files.keys()).slice(0, 10).map(file => `<li>${file}</li>`).join('')}
          ${plan.files.size > 10 ? `<li>...and ${plan.files.size - 10} more files</li>` : ''}
        </ul>
      </div>
      
      <div class="plan-section">
        <h4>⏱️ Estimated Setup Time</h4>
        <p>${estimateSetupTime(plan)} minutes</p>
      </div>
      
      <div class="plan-actions">
        <button class="btn-primary" onclick="confirmPlan()">✓ Looks Great, Proceed!</button>
        <button class="btn-secondary" onclick="modifyPlan()">✏️ Modify Plan</button>
        <button class="btn-tertiary" onclick="cancelPlan()">✗ Cancel</button>
      </div>
    </div>
  `;
  
  // Show modal and wait for user decision
  return await showModalAndWait(previewContent);
}

// ============================================================================
// Step 5: Execute Project Setup
// ============================================================================

async function executeProjectSetup(plan: ProjectPlan, settings: ProjectSettings): Promise<any> {
  const progressModal = showProgressModal('Setting up your project...');
  
  try {
    // Step 1: Create folder structure
    progressModal.updateStep('Creating folders...', 0);
    await createFolderStructure(plan.structure, settings.location, settings.projectName);
    progressModal.updateStep('Creating folders...', 100);
    
    // Step 2: Generate and write files
    progressModal.updateStep('Generating files...', 0);
    let fileCount = 0;
    for (const [path, content] of plan.files.entries()) {
      await writeFile(path, content);
      fileCount++;
      progressModal.updateStep('Generating files...', (fileCount / plan.files.size) * 100);
    }
    progressModal.updateStep('Generating files...', 100);
    
    // Step 3: Initialize package manager
    if (settings.installDependencies) {
      progressModal.updateStep('Initializing package manager...', 0);
      await initializePackageManager(settings);
      progressModal.updateStep('Initializing package manager...', 100);
      
      // Step 4: Install dependencies
      progressModal.updateStep('Installing dependencies...', 0);
      await installDependencies(plan.dependencies, plan.devDependencies, settings, (progress) => {
        progressModal.updateStep('Installing dependencies...', progress);
      });
      progressModal.updateStep('Installing dependencies...', 100);
    }
    
    // Step 5: Run setup commands
    progressModal.updateStep('Running setup commands...', 0);
    for (let i = 0; i < plan.setupCommands.length; i++) {
      await executeCommand(plan.setupCommands[i]);
      progressModal.updateStep('Running setup commands...', ((i + 1) / plan.setupCommands.length) * 100);
    }
    progressModal.updateStep('Running setup commands...', 100);
    
    // Step 6: Initialize Git
    progressModal.updateStep('Initializing Git...', 0);
    await initializeGit(settings);
    progressModal.updateStep('Initializing Git...', 100);
    
    progressModal.complete();
    
    return { success: true };
    
  } catch (error) {
    progressModal.error(error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Step 6: Post-Setup AI Assistance
// ============================================================================

async function showSuccessAndStartAIAssistance(
  settings: ProjectSettings, 
  plan: ProjectPlan
): Promise<void> {
  
  // Show success modal
  const successModal = `
    <div class="success-modal">
      <div class="success-icon">🎉</div>
      <h2>Your Project is Ready!</h2>
      <p>AI has created your ${settings.projectType} at:</p>
      <code class="project-path">${settings.location}\\${settings.projectName}</code>
      
      <div class="success-stats">
        <div class="stat">
          <span class="stat-icon">📁</span>
          <span class="stat-value">${countFolders(plan.structure)}</span>
          <span class="stat-label">Folders</span>
        </div>
        <div class="stat">
          <span class="stat-icon">📄</span>
          <span class="stat-value">${plan.files.size}</span>
          <span class="stat-label">Files</span>
        </div>
        <div class="stat">
          <span class="stat-icon">📦</span>
          <span class="stat-value">${plan.dependencies.length}</span>
          <span class="stat-label">Dependencies</span>
        </div>
      </div>
      
      <button class="btn-primary btn-large" onclick="openInEditor()">
        🚀 Open in Editor
      </button>
    </div>
  `;
  
  await showModal(successModal);
  
  // Start AI assistance conversation
  await addMessageToChat('assistant', `
    🎉 **Your ${settings.projectType} is ready!**
    
    I've created everything you need to get started:
    ✅ Project structure optimized for ${plan.purpose}
    ✅ Starter code with best practices
    ✅ All dependencies installed
    ✅ Git repository initialized
    ✅ README with instructions
    
    💡 **What would you like to build first?**
    
    I can help you:
    - Create your first component
    - Set up routing
    - Add API integration
    - Configure environment variables
    - Or anything else you need!
    
    Just let me know what you'd like to work on! 🚀
  `);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCurrentApiConfigurationForced(): any {
  // Implementation from apiProviderManager
  return {}; // Placeholder
}

async function waitForUserResponse(): Promise<string> {
  // Wait for user to type and send a message
  return new Promise((resolve) => {
    // Implementation: Listen for next user message
    window.__nextUserResponse = resolve;
  });
}

async function waitForYesNoResponse(): Promise<boolean> {
  const response = await waitForUserResponse();
  return response.toLowerCase().includes('yes') || response.toLowerCase().includes('y');
}

async function waitForChoiceResponse(options: string[]): Promise<string> {
  const response = await waitForUserResponse();
  // Find matching option
  for (const option of options) {
    if (response.toLowerCase().includes(option.toLowerCase())) {
      return option;
    }
  }
  return options[0]; // Default to first option
}

function isComplexApp(purpose: string): boolean {
  const complexKeywords = ['dashboard', 'management', 'admin', 'social', 'marketplace', 'platform'];
  return complexKeywords.some(keyword => purpose.toLowerCase().includes(keyword));
}

function needsBackend(purpose: string): boolean {
  const backendKeywords = ['api', 'backend', 'database', 'crud', 'auth', 'sync', 'cloud'];
  return backendKeywords.some(keyword => purpose.toLowerCase().includes(keyword));
}

function getDefaultQuestions(): any {
  return {
    auth: "Do you need user authentication in your app? (Yes/No)",
    styling: "Which styling library would you prefer? (Tailwind / Styled-components / CSS Modules / Material-UI)",
    state: "What state management solution would you like? (Redux / Zustand / Context API / None)",
    api: "Do you need API integration? (REST / GraphQL / tRPC / None)"
  };
}

function getFallbackProjectPlan(settings: ProjectSettings, customization: AICustomization): ProjectPlan {
  // Return a basic project plan as fallback
  return {
    structure: {},
    files: new Map(),
    dependencies: [],
    devDependencies: [],
    scripts: {},
    setupCommands: []
  };
}

function formatStructureTree(structure: any, indent: number = 0): string {
  let result = '';
  for (const [key, value] of Object.entries(structure)) {
    result += '  '.repeat(indent) + '📁 ' + key + '\n';
    if (typeof value === 'object') {
      result += formatStructureTree(value, indent + 1);
    }
  }
  return result;
}

function estimateSetupTime(plan: ProjectPlan): number {
  // Estimate based on file count and dependencies
  const fileTime = plan.files.size * 0.1; // 0.1 min per file
  const depTime = plan.dependencies.length * 0.2; // 0.2 min per dependency
  return Math.ceil(fileTime + depTime);
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

// Placeholder implementations for file system operations
async function createFolderStructure(structure: any, location: string, projectName: string): Promise<void> {
  // Implementation: Use Tauri file system API
  console.log('Creating folder structure...');
}

async function writeFile(path: string, content: string): Promise<void> {
  // Implementation: Use Tauri file system API
  console.log('Writing file:', path);
}

async function initializePackageManager(settings: ProjectSettings): Promise<void> {
  // Implementation: Run npm init or equivalent
  console.log('Initializing package manager...');
}

async function installDependencies(
  deps: string[], 
  devDeps: string[], 
  settings: ProjectSettings,
  onProgress: (progress: number) => void
): Promise<void> {
  // Implementation: Run npm install with progress tracking
  console.log('Installing dependencies...');
}

async function executeCommand(command: string): Promise<void> {
  // Implementation: Execute shell command
  console.log('Executing command:', command);
}

async function initializeGit(settings: ProjectSettings): Promise<void> {
  // Implementation: Run git init
  console.log('Initializing Git...');
}

async function generateProjectReadme(settings: ProjectSettings, customization: AICustomization): Promise<string> {
  // Implementation: Use AI to generate README
  return '# README content';
}

async function generateGitignore(projectType: string): Promise<string> {
  // Implementation: Generate appropriate .gitignore
  return 'node_modules\n.env';
}

function showProgressModal(title: string): any {
  // Implementation: Show modal with progress indicators
  return {
    updateStep: (step: string, progress: number) => {
      console.log(`${step}: ${progress}%`);
    },
    complete: () => console.log('✓ Complete'),
    error: (message: string) => console.error('✗ Error:', message)
  };
}

async function showModalAndWait(content: string): Promise<boolean> {
  // Implementation: Show modal and wait for user interaction
  return true; // Placeholder
}

async function showModal(content: string): Promise<void> {
  // Implementation: Show modal
  console.log('Showing modal:', content);
}

function parseAISuggestions(response: string): string[] {
  // Parse AI response and extract suggestions
  return [];
}

async function showSuggestionsModal(analysis: any): Promise<void> {
  // Show suggestions modal
  console.log('Suggestions:', analysis);
}

// ============================================================================
// Exports
// ============================================================================

export {
  handleApplySettingsWithAI,
  askAICustomizationQuestions,
  generateAIProjectPlan,
  executeProjectSetup
};
