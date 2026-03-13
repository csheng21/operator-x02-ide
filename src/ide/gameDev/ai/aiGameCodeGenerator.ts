// ============================================================================
// 🤖 AI GAME CODE GENERATOR - Operator X02 Code IDE
// ============================================================================
// AI-powered game code generation with specialized prompts
// ============================================================================

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type GameCodeType = 
  | 'player' 
  | 'enemy' 
  | 'item' 
  | 'weapon'
  | 'projectile'
  | 'npc'
  | 'boss'
  | 'powerup'
  | 'platform'
  | 'obstacle'
  | 'trigger'
  | 'checkpoint'
  | 'dialog'
  | 'inventory'
  | 'health'
  | 'score'
  | 'level'
  | 'menu'
  | 'particles'
  | 'camera'
  | 'audio'
  | 'save'
  | 'custom';

export interface GameCodeRequest {
  type: GameCodeType;
  engine: 'phaser' | 'pixi' | 'vanilla' | 'kaboom';
  description: string;
  features?: string[];
  style?: 'minimal' | 'standard' | 'advanced';
}

export interface GameCodeTemplate {
  type: GameCodeType;
  name: string;
  description: string;
  icon: string;
  defaultFeatures: string[];
  prompt: string;
  exampleOutput?: string;
}

// ============================================================================
// CODE TEMPLATES
// ============================================================================

export const GAME_CODE_TEMPLATES: Record<GameCodeType, GameCodeTemplate> = {
  player: {
    type: 'player',
    name: 'Player Character',
    description: 'Main player entity with movement and actions',
    icon: '🧍',
    defaultFeatures: ['movement', 'jumping', 'health', 'animation'],
    prompt: `Generate a complete Player class for a {engine} game with the following features:
- Movement: {movement_type}
- Features: {features}
- Style: {style}

Requirements:
1. Use TypeScript with proper types
2. Extend appropriate Phaser/engine classes
3. Include input handling for keyboard/gamepad
4. Add health system with damage/heal methods
5. Include animation states (idle, walk, jump, etc.)
6. Add sound effect triggers
7. Implement collision callbacks
8. Add debug visualization option

The player should feel responsive and polished.`,
  },

  enemy: {
    type: 'enemy',
    name: 'Enemy AI',
    description: 'Enemy with AI behavior patterns',
    icon: '👾',
    defaultFeatures: ['patrol', 'chase', 'attack', 'health'],
    prompt: `Generate an Enemy class for a {engine} game with AI behavior:
- AI Type: {ai_type}
- Features: {features}
- Difficulty: {difficulty}

Requirements:
1. Implement state machine (idle, patrol, chase, attack, hurt, dead)
2. Add pathfinding or simple movement patterns
3. Include detection system (line of sight, range-based)
4. Add attack patterns with cooldowns
5. Include health and damage system
6. Add death animation and loot drops
7. Implement difficulty scaling
8. Add sound effects for actions`,
  },

  item: {
    type: 'item',
    name: 'Collectible Item',
    description: 'Pickupable item with effects',
    icon: '💎',
    defaultFeatures: ['pickup', 'effect', 'animation', 'sound'],
    prompt: `Generate a collectible Item class for a {engine} game:
- Item Type: {item_type}
- Effect: {effect}
- Features: {features}

Requirements:
1. Collision detection with player
2. Pickup animation (scale, fade, particles)
3. Sound effect on collection
4. Apply effect to player (health, score, power-up)
5. Optional respawn timer
6. Visual feedback (glow, bob animation)
7. UI notification on pickup`,
  },

  weapon: {
    type: 'weapon',
    name: 'Weapon System',
    description: 'Weapon with attack mechanics',
    icon: '⚔️',
    defaultFeatures: ['attack', 'cooldown', 'damage', 'effects'],
    prompt: `Generate a Weapon class for a {engine} game:
- Weapon Type: {weapon_type}
- Attack Style: {attack_style}
- Features: {features}

Requirements:
1. Attack method with cooldown
2. Damage calculation with modifiers
3. Visual effects (swing animation, projectiles)
4. Sound effects for attack/hit
5. Collision detection for melee/ranged
6. Ammunition system (if ranged)
7. Upgrade/level system
8. Stats display helper`,
  },

  projectile: {
    type: 'projectile',
    name: 'Projectile',
    description: 'Bullets, arrows, magic projectiles',
    icon: '🎯',
    defaultFeatures: ['movement', 'collision', 'damage', 'lifetime'],
    prompt: `Generate a Projectile class for a {engine} game:
- Projectile Type: {projectile_type}
- Behavior: {behavior}
- Features: {features}

Requirements:
1. Movement with velocity/direction
2. Collision detection with targets
3. Damage on hit with effects
4. Lifetime/range limit
5. Trail effect (optional)
6. Destroy on impact or pass-through option
7. Object pooling support
8. Visual effects on impact`,
  },

  npc: {
    type: 'npc',
    name: 'NPC Character',
    description: 'Non-player character with dialogue',
    icon: '🧑',
    defaultFeatures: ['dialogue', 'interaction', 'animation', 'quests'],
    prompt: `Generate an NPC class for a {engine} game:
- NPC Role: {npc_role}
- Features: {features}

Requirements:
1. Interaction zone detection
2. Dialogue system integration
3. Animation states (idle, talking, walking)
4. Facing player when interacting
5. Quest integration hooks
6. Shop/trade functionality (if merchant)
7. Reputation/relationship tracking
8. Visual interaction prompt`,
  },

  boss: {
    type: 'boss',
    name: 'Boss Enemy',
    description: 'Boss with phases and special attacks',
    icon: '👹',
    defaultFeatures: ['phases', 'patterns', 'health_bar', 'special_attacks'],
    prompt: `Generate a Boss class for a {engine} game:
- Boss Type: {boss_type}
- Phase Count: {phases}
- Features: {features}

Requirements:
1. Multiple attack patterns per phase
2. Phase transitions with animations
3. Health bar UI display
4. Vulnerable states/weak points
5. Special attacks with warnings
6. Minion summoning (optional)
7. Arena effects/hazards
8. Death sequence with rewards
9. Music transition hooks`,
  },

  powerup: {
    type: 'powerup',
    name: 'Power-up',
    description: 'Temporary ability enhancement',
    icon: '⭐',
    defaultFeatures: ['effect', 'duration', 'visual', 'stacking'],
    prompt: `Generate a PowerUp class for a {engine} game:
- Power-up Type: {powerup_type}
- Duration: {duration}
- Features: {features}

Requirements:
1. Timed effect with duration
2. Visual indicator while active
3. Stack/refresh behavior
4. Player stat modification
5. Particle effects
6. UI timer display
7. Sound on pickup/expire
8. Combo with other power-ups`,
  },

  platform: {
    type: 'platform',
    name: 'Platform',
    description: 'Moving or special platform',
    icon: '🟫',
    defaultFeatures: ['movement', 'one_way', 'crumbling', 'bouncy'],
    prompt: `Generate a Platform class for a {engine} game:
- Platform Type: {platform_type}
- Behavior: {behavior}
- Features: {features}

Requirements:
1. Movement pattern (horizontal, vertical, circular)
2. Player attachment when standing
3. One-way collision option
4. Crumbling/timed destruction
5. Bounce/spring platform option
6. Activation trigger
7. Visual variation support
8. Sound effects`,
  },

  obstacle: {
    type: 'obstacle',
    name: 'Obstacle/Hazard',
    description: 'Dangerous obstacle that hurts player',
    icon: '🔥',
    defaultFeatures: ['damage', 'animation', 'pattern', 'warning'],
    prompt: `Generate an Obstacle/Hazard class for a {engine} game:
- Hazard Type: {hazard_type}
- Damage: {damage}
- Features: {features}

Requirements:
1. Damage on contact
2. Animation pattern (spikes, fire, etc.)
3. Timing/rhythm for avoidance
4. Warning visual before activation
5. Particle effects
6. Sound effects
7. Knockback option
8. Status effect application`,
  },

  trigger: {
    type: 'trigger',
    name: 'Trigger Zone',
    description: 'Invisible trigger for events',
    icon: '🎬',
    defaultFeatures: ['on_enter', 'on_exit', 'once', 'repeatable'],
    prompt: `Generate a Trigger class for a {engine} game:
- Trigger Type: {trigger_type}
- Event: {event}
- Features: {features}

Requirements:
1. Collision zone (rectangle/circle)
2. Enter/exit callbacks
3. One-time or repeatable
4. Cooldown between triggers
5. Visual debug display
6. Enable/disable state
7. Event system integration
8. Save state persistence`,
  },

  checkpoint: {
    type: 'checkpoint',
    name: 'Checkpoint',
    description: 'Save progress checkpoint',
    icon: '🏁',
    defaultFeatures: ['save', 'respawn', 'visual', 'activation'],
    prompt: `Generate a Checkpoint class for a {engine} game:
- Features: {features}

Requirements:
1. Activation on player contact
2. Save player position
3. Visual activation feedback
4. Respawn point management
5. Only activate once per life
6. Particle effect on activate
7. Sound effect
8. Progress tracking integration`,
  },

  dialog: {
    type: 'dialog',
    name: 'Dialogue System',
    description: 'Text dialogue with choices',
    icon: '💬',
    defaultFeatures: ['text', 'choices', 'portraits', 'typewriter'],
    prompt: `Generate a DialogueSystem class for a {engine} game:
- Style: {style}
- Features: {features}

Requirements:
1. Show/hide dialogue box
2. Typewriter text effect
3. Character portraits
4. Multiple choice support
5. Branching dialogue trees
6. Skip/fast-forward
7. Sound effects (blip per character)
8. Callback on dialogue end
9. JSON dialogue data loading
10. Localization support`,
  },

  inventory: {
    type: 'inventory',
    name: 'Inventory System',
    description: 'Item storage and management',
    icon: '🎒',
    defaultFeatures: ['slots', 'stack', 'equip', 'use'],
    prompt: `Generate an Inventory class for a {engine} game:
- Slot Count: {slots}
- Features: {features}

Requirements:
1. Add/remove items
2. Item stacking
3. Slot management
4. Equipment slots
5. Use item functionality
6. Drag and drop (optional)
7. Save/load inventory
8. Weight/capacity limit
9. Item tooltip/info
10. Quick slots/hotbar`,
  },

  health: {
    type: 'health',
    name: 'Health System',
    description: 'Health management with UI',
    icon: '❤️',
    defaultFeatures: ['damage', 'heal', 'ui', 'effects'],
    prompt: `Generate a HealthSystem class for a {engine} game:
- Max Health: {max_health}
- Features: {features}

Requirements:
1. Current/max health tracking
2. Damage with invincibility frames
3. Healing with cap
4. Health bar UI component
5. Low health warning
6. Death callback
7. Regeneration option
8. Damage numbers display
9. Screen shake on hit
10. Sound effects`,
  },

  score: {
    type: 'score',
    name: 'Score System',
    description: 'Points and combo tracking',
    icon: '🏆',
    defaultFeatures: ['points', 'combo', 'multiplier', 'highscore'],
    prompt: `Generate a ScoreSystem class for a {engine} game:
- Features: {features}

Requirements:
1. Add/subtract points
2. Combo system with timer
3. Multiplier management
4. High score tracking
5. Score display UI
6. Floating score numbers
7. Level-based scoring
8. Leaderboard integration
9. Local storage persistence
10. Score breakdown at end`,
  },

  level: {
    type: 'level',
    name: 'Level Manager',
    description: 'Level loading and progression',
    icon: '🗺️',
    defaultFeatures: ['load', 'transition', 'progress', 'unlock'],
    prompt: `Generate a LevelManager class for a {engine} game:
- Features: {features}

Requirements:
1. Level loading from data
2. Scene transitions
3. Progress tracking
4. Level unlocking
5. Star/rating system
6. Collectibles tracking
7. Save/load progress
8. Level select UI helper
9. Difficulty scaling
10. Random level generation option`,
  },

  menu: {
    type: 'menu',
    name: 'Menu System',
    description: 'Game menus and UI navigation',
    icon: '📋',
    defaultFeatures: ['navigation', 'settings', 'pause', 'transitions'],
    prompt: `Generate a MenuSystem class for a {engine} game:
- Menu Type: {menu_type}
- Features: {features}

Requirements:
1. Button creation helper
2. Keyboard/gamepad navigation
3. Settings persistence
4. Volume controls
5. Fullscreen toggle
6. Pause menu overlay
7. Transition animations
8. Focus management
9. Sound effects on interact
10. Responsive layout`,
  },

  particles: {
    type: 'particles',
    name: 'Particle Effects',
    description: 'Visual particle systems',
    icon: '✨',
    defaultFeatures: ['emission', 'physics', 'colors', 'lifecycle'],
    prompt: `Generate a ParticleManager class for a {engine} game:
- Effect Type: {effect_type}
- Features: {features}

Requirements:
1. Particle emitter creation
2. Preset effects (explosion, sparkle, smoke, etc.)
3. Burst and continuous modes
4. Color gradients
5. Physics (gravity, drag)
6. Texture support
7. Object pooling
8. Performance optimization
9. Easy API for common effects
10. Editor-friendly configuration`,
  },

  camera: {
    type: 'camera',
    name: 'Camera Controller',
    description: 'Camera movement and effects',
    icon: '📷',
    defaultFeatures: ['follow', 'bounds', 'shake', 'zoom'],
    prompt: `Generate a CameraController class for a {engine} game:
- Features: {features}

Requirements:
1. Follow target smoothly
2. Dead zone configuration
3. Bounds/limits
4. Screen shake effect
5. Zoom in/out
6. Cinematic panning
7. Multiple target support
8. Look-ahead based on velocity
9. Focus on point
10. Transition effects`,
  },

  audio: {
    type: 'audio',
    name: 'Audio Manager',
    description: 'Sound and music management',
    icon: '🔊',
    defaultFeatures: ['music', 'sfx', 'volume', 'spatial'],
    prompt: `Generate an AudioManager class for a {engine} game:
- Features: {features}

Requirements:
1. Play/stop music with crossfade
2. Play sound effects
3. Volume controls (master, music, sfx)
4. Mute functionality
5. Sound pooling
6. Spatial audio (optional)
7. Music playlist
8. Sound variants (random pitch)
9. Settings persistence
10. Audio sprite support`,
  },

  save: {
    type: 'save',
    name: 'Save System',
    description: 'Game save and load',
    icon: '💾',
    defaultFeatures: ['save', 'load', 'slots', 'auto'],
    prompt: `Generate a SaveSystem class for a {engine} game:
- Save Slots: {slots}
- Features: {features}

Requirements:
1. Save game state to JSON
2. Load game state
3. Multiple save slots
4. Auto-save functionality
5. Save metadata (date, playtime, level)
6. Save validation
7. Cloud save hooks
8. Export/import saves
9. New game vs continue
10. Save confirmation UI`,
  },

  custom: {
    type: 'custom',
    name: 'Custom Code',
    description: 'Generate custom game code',
    icon: '⚙️',
    defaultFeatures: [],
    prompt: `Generate custom game code for a {engine} game based on this description:
{description}

Requirements:
1. Use TypeScript with proper types
2. Follow best practices for the engine
3. Include comments explaining the code
4. Make it modular and reusable
5. Add error handling
6. Include usage example`,
  }
};

// ============================================================================
// AI GAME CODE GENERATOR CLASS
// ============================================================================

class AIGameCodeGenerator {
  private aiProvider: any = null;

  constructor() {
    console.log('[AIGameCodeGenerator] ✅ Initialized');
  }

  // ==========================================================================
  // CODE GENERATION
  // ==========================================================================

  async generateCode(request: GameCodeRequest): Promise<{ success: boolean; code?: string; error?: string }> {
    console.log('[AIGameCodeGenerator] Generating:', request.type);

    try {
      const template = GAME_CODE_TEMPLATES[request.type];
      const prompt = this.buildPrompt(template, request);
      
      // Call AI provider
      const response = await this.callAI(prompt);
      
      if (response.success) {
        // Extract code from response
        const code = this.extractCode(response.text!);
        return { success: true, code };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[AIGameCodeGenerator] Error:', error);
      return { success: false, error: String(error) };
    }
  }

  private buildPrompt(template: GameCodeTemplate, request: GameCodeRequest): string {
    let prompt = template.prompt;

    // Replace placeholders
    prompt = prompt.replace(/{engine}/g, request.engine);
    prompt = prompt.replace(/{features}/g, request.features?.join(', ') || template.defaultFeatures.join(', '));
    prompt = prompt.replace(/{style}/g, request.style || 'standard');
    prompt = prompt.replace(/{description}/g, request.description);

    // Add engine-specific context
    prompt = this.addEngineContext(prompt, request.engine);

    // Add system prompt
    const systemPrompt = `You are an expert game developer. Generate clean, well-documented TypeScript code for a ${request.engine} game. 
Include all necessary imports and make the code ready to use.
Use modern best practices and include helpful comments.
The code should be production-ready and performant.`;

    return `${systemPrompt}\n\n${prompt}\n\nUser request: ${request.description}`;
  }

  private addEngineContext(prompt: string, engine: string): string {
    const contexts: Record<string, string> = {
      phaser: `
Use Phaser 3 API with these imports:
- import Phaser from 'phaser';
- Extend Phaser.GameObjects or Phaser.Physics.Arcade classes
- Use this.scene for scene reference
- Use Phaser.Math for math utilities`,

      pixi: `
Use PixiJS v7 API with these imports:
- import * as PIXI from 'pixi.js';
- Extend PIXI.Container for entities
- Use PIXI.Ticker for game loop`,

      kaboom: `
Use Kaboom.js API:
- Import kaboom from 'kaboom'
- Use component-based architecture
- Use k.add() for creating objects`,

      vanilla: `
Use vanilla HTML5 Canvas API:
- Use CanvasRenderingContext2D
- Implement game loop with requestAnimationFrame
- Handle input with addEventListener`
    };

    return prompt + '\n\n' + (contexts[engine] || '');
  }

  private async callAI(prompt: string): Promise<{ success: boolean; text?: string; error?: string }> {
    // Try to use the existing AI provider from assistantUI
    try {
      if ((window as any).sendMessageDirectlyInternal) {
        const response = await (window as any).sendMessageDirectlyInternal(prompt, {
          systemPrompt: 'You are an expert game developer. Generate only code, no explanations.',
          maxTokens: 4000
        });
        return { success: true, text: response };
      }

      // Fallback: Use fetch to call AI API
      const apiKey = localStorage.getItem('x02_ai_api_key');
      const provider = localStorage.getItem('x02_ai_provider') || 'claude';

      if (!apiKey) {
        return { success: false, error: 'No AI API key configured' };
      }

      // Call appropriate API
      // This is a simplified example - actual implementation would vary by provider
      const response = await this.callClaudeAPI(prompt, apiKey);
      return response;

    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async callClaudeAPI(prompt: string, apiKey: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, text: data.content[0].text };

    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private extractCode(response: string): string {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches.map(m => m[1].trim()).join('\n\n');
    }

    // If no code blocks, return the whole response
    return response;
  }

  // ==========================================================================
  // QUICK GENERATE HELPERS
  // ==========================================================================

  async generatePlayer(description: string, engine: 'phaser' | 'pixi' | 'vanilla' = 'phaser'): Promise<string> {
    const result = await this.generateCode({
      type: 'player',
      engine,
      description,
      features: ['movement', 'jumping', 'health', 'animation']
    });
    return result.code || '';
  }

  async generateEnemy(description: string, engine: 'phaser' | 'pixi' | 'vanilla' = 'phaser'): Promise<string> {
    const result = await this.generateCode({
      type: 'enemy',
      engine,
      description,
      features: ['patrol', 'chase', 'attack', 'health']
    });
    return result.code || '';
  }

  async generateItem(description: string, engine: 'phaser' | 'pixi' | 'vanilla' = 'phaser'): Promise<string> {
    const result = await this.generateCode({
      type: 'item',
      engine,
      description,
      features: ['pickup', 'effect', 'animation']
    });
    return result.code || '';
  }

  async generateCustom(description: string, engine: 'phaser' | 'pixi' | 'vanilla' = 'phaser'): Promise<string> {
    const result = await this.generateCode({
      type: 'custom',
      engine,
      description
    });
    return result.code || '';
  }

  // ==========================================================================
  // TEMPLATE INFO
  // ==========================================================================

  getTemplates(): GameCodeTemplate[] {
    return Object.values(GAME_CODE_TEMPLATES);
  }

  getTemplate(type: GameCodeType): GameCodeTemplate {
    return GAME_CODE_TEMPLATES[type];
  }

  getTemplateTypes(): GameCodeType[] {
    return Object.keys(GAME_CODE_TEMPLATES) as GameCodeType[];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiGameCodeGenerator = new AIGameCodeGenerator();
(window as any).aiGameCodeGenerator = aiGameCodeGenerator;

console.log('[AIGameCodeGenerator] Module loaded');

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Generate a player character
const playerCode = await aiGameCodeGenerator.generatePlayer(
  "A knight character with sword attack and shield block",
  "phaser"
);

// Generate an enemy
const enemyCode = await aiGameCodeGenerator.generateEnemy(
  "A flying bat enemy that swoops down to attack",
  "phaser"
);

// Generate custom code
const customCode = await aiGameCodeGenerator.generateCustom(
  "A day/night cycle system that affects gameplay",
  "phaser"
);

// Use the full API
const result = await aiGameCodeGenerator.generateCode({
  type: 'boss',
  engine: 'phaser',
  description: 'A dragon boss with 3 phases: ground attacks, flying attacks, and enraged mode',
  features: ['phases', 'patterns', 'health_bar', 'special_attacks'],
  style: 'advanced'
});
*/
