// developerPresets.ts
// Ready-to-use configuration presets for different development workflows

import { DeveloperConfig } from './messageImportanceAnalyzer_developer';

export const DEVELOPER_PRESETS = {
  
  // ========================================
  // GENERAL DEVELOPMENT (Default)
  // ========================================
  GENERAL: {
    maxConversationSizeKB: 120,
    maxMessageSizeKB: 50,
    recentMessageCount: 15,
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.3,
    
    fileOperationScore: 10,      // ⭐ Keep all file operations
    bugFixScore: 9,               // ⭐ Keep all bug fixes
    codeStructureScore: 8,        // Important for maintenance
    technicalDecisionScore: 7,    // Good to keep
    configurationScore: 6,
    dependencyScore: 5,
    generalTechnicalScore: 4,
    clarificationScore: 2,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: true,
    extractObjectives: true,
    extractSolutions: true,
    compressionLevel: 'light' as const
  },
  
  // ========================================
  // DEBUGGING FOCUS
  // ========================================
  DEBUGGING: {
    maxConversationSizeKB: 120,
    maxMessageSizeKB: 50,
    recentMessageCount: 20,      // ← Keep more recent for context
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.4,
    
    bugFixScore: 10,              // ⭐⭐ Highest priority
    fileOperationScore: 9,        // ⭐ Need file context
    generalTechnicalScore: 7,     // Error details important
    codeStructureScore: 6,
    technicalDecisionScore: 5,
    configurationScore: 5,
    dependencyScore: 4,
    clarificationScore: 2,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: true,
    extractObjectives: true,
    extractSolutions: true,      // ← Extract all solutions!
    compressionLevel: 'light' as const
  },
  
  // ========================================
  // ARCHITECTURE / DESIGN
  // ========================================
  ARCHITECTURE: {
    maxConversationSizeKB: 150,   // ← Allow more space for design discussions
    maxMessageSizeKB: 60,
    recentMessageCount: 12,
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.5,        // ← Keep more old messages
    
    technicalDecisionScore: 10,   // ⭐⭐ Design decisions critical
    codeStructureScore: 9,        // ⭐ Architecture discussions
    fileOperationScore: 8,
    configurationScore: 7,        // Config affects architecture
    dependencyScore: 6,           // Dependencies matter
    bugFixScore: 5,
    generalTechnicalScore: 4,
    clarificationScore: 2,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: true,  // ← Relationships very important
    extractObjectives: true,
    extractSolutions: true,
    compressionLevel: 'none' as const  // ← Keep full context
  },
  
  // ========================================
  // FEATURE DEVELOPMENT
  // ========================================
  FEATURE_DEV: {
    maxConversationSizeKB: 120,
    maxMessageSizeKB: 50,
    recentMessageCount: 15,
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.3,
    
    fileOperationScore: 10,       // ⭐⭐ Many files being created
    codeStructureScore: 9,        // ⭐ New components/modules
    dependencyScore: 8,           // New packages added
    configurationScore: 7,        // Setup/config changes
    technicalDecisionScore: 6,
    bugFixScore: 5,
    generalTechnicalScore: 4,
    clarificationScore: 2,
    greetingScore: 0,
    
    extractFileContext: true,     // ← Track all new files
    extractCodeRelationships: true,
    extractObjectives: true,
    extractSolutions: true,
    compressionLevel: 'light' as const
  },
  
  // ========================================
  // QUICK PROTOTYPING
  // ========================================
  PROTOTYPING: {
    maxConversationSizeKB: 100,   // ← Smaller limit (quick iterations)
    maxMessageSizeKB: 40,
    recentMessageCount: 10,       // ← Less context needed
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.2,        // ← Filter aggressively
    
    fileOperationScore: 10,
    codeStructureScore: 7,
    technicalDecisionScore: 6,
    bugFixScore: 5,
    generalTechnicalScore: 4,
    configurationScore: 3,
    dependencyScore: 3,
    clarificationScore: 1,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: false,  // ← Not needed for prototypes
    extractObjectives: true,
    extractSolutions: false,
    compressionLevel: 'aggressive' as const  // ← Aggressive compression
  },
  
  // ========================================
  // CODE REVIEW
  // ========================================
  CODE_REVIEW: {
    maxConversationSizeKB: 120,
    maxMessageSizeKB: 50,
    recentMessageCount: 15,
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.4,
    
    codeStructureScore: 10,       // ⭐⭐ Code quality focus
    fileOperationScore: 9,        // ⭐ What files changed
    technicalDecisionScore: 8,    // Why changes were made
    bugFixScore: 7,
    generalTechnicalScore: 5,
    configurationScore: 4,
    dependencyScore: 4,
    clarificationScore: 2,
    greetingScore: 0,
    
    extractFileContext: true,     // ← Track reviewed files
    extractCodeRelationships: true,
    extractObjectives: true,
    extractSolutions: true,
    compressionLevel: 'light' as const
  },
  
  // ========================================
  // LEARNING / TUTORIALS
  // ========================================
  LEARNING: {
    maxConversationSizeKB: 150,   // ← Keep more for learning
    maxMessageSizeKB: 60,
    recentMessageCount: 20,       // ← More recent context
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.6,        // ← Keep more old messages
    
    generalTechnicalScore: 10,    // ⭐⭐ Learning content
    codeStructureScore: 9,        // ⭐ Understanding structure
    technicalDecisionScore: 8,    // Why things work
    fileOperationScore: 7,
    bugFixScore: 6,
    clarificationScore: 5,        // ← Questions are important!
    configurationScore: 4,
    dependencyScore: 4,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: true,
    extractObjectives: true,
    extractSolutions: true,
    compressionLevel: 'none' as const  // ← Keep all context
  },
  
  // ========================================
  // MINIMAL (Maximum Filtering)
  // ========================================
  MINIMAL: {
    maxConversationSizeKB: 80,    // ← Very small limit
    maxMessageSizeKB: 30,
    recentMessageCount: 5,        // ← Only last 5 messages
    recentMessageWeight: 1.0,
    oldMessageWeight: 0.1,        // ← Very aggressive filtering
    
    fileOperationScore: 10,       // ← Only keep file ops
    bugFixScore: 9,               // ← And bug fixes
    codeStructureScore: 5,
    technicalDecisionScore: 3,
    generalTechnicalScore: 2,
    configurationScore: 2,
    dependencyScore: 1,
    clarificationScore: 0,
    greetingScore: 0,
    
    extractFileContext: true,
    extractCodeRelationships: false,
    extractObjectives: false,
    extractSolutions: true,
    compressionLevel: 'aggressive' as const
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

export function applyPreset(
  conversationManager: any,
  presetName: keyof typeof DEVELOPER_PRESETS
): void {
  const preset = DEVELOPER_PRESETS[presetName];
  conversationManager.updateDeveloperConfig(preset);
  console.log(`✅ Applied preset: ${presetName}`);
  console.log(`   Max size: ${preset.maxConversationSizeKB} KB`);
  console.log(`   Recent messages: ${preset.recentMessageCount}`);
  console.log(`   Priority: ${getPresetPriority(presetName)}`);
}

function getPresetPriority(presetName: keyof typeof DEVELOPER_PRESETS): string {
  const priorities: Record<string, string> = {
    GENERAL: 'Files > Bugs > Structure',
    DEBUGGING: 'Bugs > Files > Errors',
    ARCHITECTURE: 'Decisions > Structure > Files',
    FEATURE_DEV: 'Files > Structure > Dependencies',
    PROTOTYPING: 'Files only (aggressive)',
    CODE_REVIEW: 'Structure > Files > Decisions',
    LEARNING: 'Technical > Structure > Decisions',
    MINIMAL: 'Files + Bugs only'
  };
  return priorities[presetName] || 'Default';
}

// ========================================
// QUICK SETUP
// ========================================

export function setupForWorkflow(
  conversationManager: any,
  workflow: 'general' | 'debugging' | 'architecture' | 'feature' | 'review' | 'learning'
): void {
  const presetMap = {
    general: 'GENERAL',
    debugging: 'DEBUGGING',
    architecture: 'ARCHITECTURE',
    feature: 'FEATURE_DEV',
    review: 'CODE_REVIEW',
    learning: 'LEARNING'
  };
  
  const preset = presetMap[workflow] as keyof typeof DEVELOPER_PRESETS;
  applyPreset(conversationManager, preset);
}

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).developerPresets = {
    apply: applyPreset,
    list: () => {
      console.log('Available presets:');
      Object.keys(DEVELOPER_PRESETS).forEach(key => {
        console.log(`  - ${key}: ${getPresetPriority(key as any)}`);
      });
    },
    current: () => {
      if ((window as any).conversationManager) {
        return (window as any).conversationManager.getStorageInfo();
      }
    }
  };
}