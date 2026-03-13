// ============================================================================
// 🎮 GAME DEVELOPMENT MODULE - Operator X02 Code IDE
// ============================================================================
// Main entry point for game development features
// ============================================================================

// Core modules
export { gameProjectManager, GAME_ENGINES, GAME_TEMPLATES } from './gameProjectManager';
export type { GameEngine, GameTemplate, GameProjectConfig, GameProjectInfo, EngineInfo, TemplateInfo } from './gameProjectManager';

// UI Components
export { gamePreviewPanel } from './ui/gamePreviewPanel';
export { newGameProjectWizard } from './ui/newGameProjectWizard';
export { assetManager } from './ui/assetManagerPanel';

// AI Features
export { aiGameCodeGenerator, GAME_CODE_TEMPLATES } from './ai/aiGameCodeGenerator';
export type { GameCodeType, GameCodeRequest, GameCodeTemplate } from './ai/aiGameCodeGenerator';

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeGameDevModule(): void {
  console.log('[GameDev] 🎮 Initializing Game Development Module...');
  
  // Add menu items
  addGameDevMenuItems();
  
  // Register keyboard shortcuts
  registerKeyboardShortcuts();
  
  // Add to window for global access
  (window as any).gameDev = {
    createProject: () => (window as any).newGameProjectWizard?.show(),
    openPreview: () => console.log('Open preview panel'),
    generateCode: (type: string) => console.log('Generate code:', type),
    openAssets: () => console.log('Open asset manager')
  };
  
  console.log('[GameDev] ✅ Game Development Module ready!');
  console.log('[GameDev] 💡 Use window.gameDev.createProject() to create a new game');
}

function addGameDevMenuItems(): void {
  // This would integrate with your menu system
  // For now, we'll add commands to window
  
  (window as any).gameDevCommands = {
    'game.newProject': () => (window as any).newGameProjectWizard?.show(),
    'game.openPreview': () => (window as any).gamePreviewPanel?.startPreview(),
    'game.stopPreview': () => (window as any).gamePreviewPanel?.stopPreview(),
    'game.reloadPreview': () => (window as any).gamePreviewPanel?.reloadPreview(),
    'game.generatePlayer': () => generateQuickCode('player'),
    'game.generateEnemy': () => generateQuickCode('enemy'),
    'game.generateItem': () => generateQuickCode('item'),
    'game.generateWeapon': () => generateQuickCode('weapon'),
    'game.generateBoss': () => generateQuickCode('boss'),
    'game.openAssets': () => console.log('Open asset manager'),
    'game.buildWeb': () => buildGame('web'),
    'game.buildDesktop': () => buildGame('desktop'),
    'game.buildAndroid': () => buildGame('android')
  };
}

function registerKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // F5 - Run/Reload Game Preview
    if (e.key === 'F5') {
      e.preventDefault();
      const preview = (window as any).gamePreviewPanel;
      if (preview?.isRunning()) {
        preview.reloadPreview();
      } else {
        preview?.startPreview();
      }
    }
    
    // Shift+F5 - Stop Game Preview
    if (e.key === 'F5' && e.shiftKey) {
      e.preventDefault();
      (window as any).gamePreviewPanel?.stopPreview();
    }
    
    // Ctrl+Shift+N - New Game Project
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      (window as any).newGameProjectWizard?.show();
    }
  });
}

async function generateQuickCode(type: string): Promise<void> {
  const description = prompt(`Describe the ${type} you want to generate:`);
  if (!description) return;
  
  const generator = (window as any).aiGameCodeGenerator;
  if (!generator) {
    console.error('[GameDev] AI Code Generator not available');
    return;
  }
  
  console.log(`[GameDev] Generating ${type}...`);
  
  const result = await generator.generateCode({
    type,
    engine: 'phaser',
    description,
    style: 'standard'
  });
  
  if (result.success) {
    console.log('[GameDev] Generated code:', result.code);
    // Here you would insert the code into the editor
    // For now, copy to clipboard
    navigator.clipboard.writeText(result.code || '');
    alert('Code generated and copied to clipboard!');
  } else {
    console.error('[GameDev] Generation failed:', result.error);
    alert('Failed to generate code: ' + result.error);
  }
}

async function buildGame(target: string): Promise<void> {
  console.log(`[GameDev] Building for ${target}...`);
  
  // This would integrate with your build system
  switch (target) {
    case 'web':
      console.log('Running: npm run build');
      break;
    case 'desktop':
      console.log('Running: npm run build:desktop');
      break;
    case 'android':
      console.log('Running: npx cap sync android && cd android && ./gradlew assembleDebug');
      break;
  }
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

// Initialize when module is loaded
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGameDevModule);
  } else {
    initializeGameDevModule();
  }
}

console.log('[GameDev] Module loaded - Operator X02 Code IDE');
