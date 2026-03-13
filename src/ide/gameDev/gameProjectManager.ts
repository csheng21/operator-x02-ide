// ============================================================================
// 🎮 GAME PROJECT MANAGER - Operator X02 Code IDE
// ============================================================================
// Handles game project creation, detection, and management
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type GameEngine = 'phaser' | 'godot' | 'pygame' | 'pixi' | 'kaboom' | 'vanilla';
export type GameTemplate = 'platformer' | 'topdown' | 'shooter' | 'puzzle' | 'rpg' | 'empty';
export type BuildTarget = 'web' | 'desktop' | 'android' | 'ios';

export interface GameProjectConfig {
  name: string;
  engine: GameEngine;
  template: GameTemplate;
  path: string;
  packageId: string;
  version: string;
  description: string;
  author: string;
  resolution: { width: number; height: number };
  orientation: 'landscape' | 'portrait';
}

export interface GameProjectInfo {
  name: string;
  path: string;
  engine: GameEngine;
  version: string;
  configFile: string;
  language: string;
  buildSystem: string;
  lastModified: Date;
}

export interface EngineInfo {
  id: GameEngine;
  name: string;
  description: string;
  icon: string;
  languages: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TemplateInfo {
  id: GameTemplate;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

// ============================================================================
// ENGINE & TEMPLATE DEFINITIONS
// ============================================================================

export const GAME_ENGINES: Record<GameEngine, EngineInfo> = {
  phaser: {
    id: 'phaser',
    name: 'Phaser 3',
    description: 'Fast, free HTML5 game framework',
    icon: '🎮',
    languages: ['TypeScript', 'JavaScript'],
    difficulty: 'easy'
  },
  pixi: {
    id: 'pixi',
    name: 'PixiJS',
    description: 'Fast 2D rendering engine',
    icon: '✨',
    languages: ['TypeScript', 'JavaScript'],
    difficulty: 'medium'
  },
  kaboom: {
    id: 'kaboom',
    name: 'Kaboom.js',
    description: 'Simple game library',
    icon: '💥',
    languages: ['JavaScript'],
    difficulty: 'easy'
  },
  godot: {
    id: 'godot',
    name: 'Godot',
    description: 'Open source 2D/3D engine',
    icon: '🤖',
    languages: ['GDScript', 'C#'],
    difficulty: 'medium'
  },
  pygame: {
    id: 'pygame',
    name: 'Pygame',
    description: 'Python game library',
    icon: '🐍',
    languages: ['Python'],
    difficulty: 'easy'
  },
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla Canvas',
    description: 'Pure HTML5 Canvas',
    icon: '🎨',
    languages: ['JavaScript'],
    difficulty: 'medium'
  }
};

export const GAME_TEMPLATES: Record<GameTemplate, TemplateInfo> = {
  platformer: {
    id: 'platformer',
    name: 'Platformer',
    description: 'Side-scrolling with jumping',
    icon: '🏃',
    features: ['Player', 'Platforms', 'Collectibles', 'Physics']
  },
  topdown: {
    id: 'topdown',
    name: 'Top-Down',
    description: 'Top-down adventure',
    icon: '🗺️',
    features: ['8-Dir Movement', 'Tilemaps', 'NPCs']
  },
  shooter: {
    id: 'shooter',
    name: 'Space Shooter',
    description: 'Arcade-style shooter',
    icon: '🚀',
    features: ['Player Ship', 'Enemies', 'Bullets', 'Power-ups']
  },
  puzzle: {
    id: 'puzzle',
    name: 'Puzzle',
    description: 'Match-3 puzzle game',
    icon: '🧩',
    features: ['Grid System', 'Match Detection', 'Scoring']
  },
  rpg: {
    id: 'rpg',
    name: 'RPG',
    description: 'Role-playing game',
    icon: '⚔️',
    features: ['Stats', 'Inventory', 'Combat', 'Dialogue']
  },
  empty: {
    id: 'empty',
    name: 'Empty',
    description: 'Minimal setup',
    icon: '📄',
    features: ['Basic Structure', 'Game Loop']
  }
};

// ============================================================================
// GAME PROJECT MANAGER CLASS
// ============================================================================

class GameProjectManager {
  private currentProject: GameProjectInfo | null = null;
  private recentProjects: GameProjectInfo[] = [];

  constructor() {
    this.loadRecentProjects();
    console.log('[GameProjectManager] ✅ Initialized');
  }

  // Create new game project
  async createProject(config: GameProjectConfig): Promise<{ success: boolean; error?: string; path?: string }> {
    console.log('[GameProjectManager] Creating:', config.name);

    try {
      const projectPath = `${config.path}/${config.name}`;
      
      // Create directories
      const dirs = ['', '/src', '/src/scenes', '/src/entities', '/assets', '/assets/sprites', '/assets/audio', '/dist'];
      for (const dir of dirs) {
        await invoke('create_directory', { path: `${projectPath}${dir}` });
      }

      // Generate files based on engine
      if (config.engine === 'phaser') {
        await this.generatePhaserProject(projectPath, config);
      }

      // Save config
      await this.saveConfig(projectPath, config);

      console.log('[GameProjectManager] ✅ Created:', projectPath);
      return { success: true, path: projectPath };

    } catch (error) {
      console.error('[GameProjectManager] Error:', error);
      return { success: false, error: String(error) };
    }
  }

  private async generatePhaserProject(path: string, config: GameProjectConfig): Promise<void> {
    // Package.json
    const pkg = {
      name: config.name.toLowerCase().replace(/\s+/g, '-'),
      version: config.version,
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { phaser: '^3.70.0' },
      devDependencies: { typescript: '^5.3.0', vite: '^5.0.0' }
    };
    await invoke('write_file', { path: `${path}/package.json`, content: JSON.stringify(pkg, null, 2) });

    // Index.html
    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>${config.name}</title>
  <style>*{margin:0;padding:0}body{background:#1a1a2e;display:flex;justify-content:center;align-items:center;min-height:100vh}</style>
</head><body>
  <div id="game"></div>
  <script type="module" src="/src/main.ts"></script>
</body></html>`;
    await invoke('write_file', { path: `${path}/index.html`, content: html });

    // Main.ts - will be generated by template system
  }

  private async saveConfig(path: string, config: GameProjectConfig): Promise<void> {
    const gameConfig = {
      ...config,
      createdAt: new Date().toISOString(),
      generatedBy: 'Operator X02 Code IDE'
    };
    await invoke('write_file', { 
      path: `${path}/game.config.json`, 
      content: JSON.stringify(gameConfig, null, 2) 
    });
  }

  // Recent projects management
  private loadRecentProjects(): void {
    try {
      const stored = localStorage.getItem('x02_recent_games');
      if (stored) this.recentProjects = JSON.parse(stored);
    } catch (e) { /* ignore */ }
  }

  getRecentProjects(): GameProjectInfo[] { return this.recentProjects; }
  getEngines(): EngineInfo[] { return Object.values(GAME_ENGINES); }
  getTemplates(): TemplateInfo[] { return Object.values(GAME_TEMPLATES); }
}

// Singleton
export const gameProjectManager = new GameProjectManager();
(window as any).gameProjectManager = gameProjectManager;
