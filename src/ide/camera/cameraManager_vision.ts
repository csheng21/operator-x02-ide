// ============================================================================
// FILE: src/ide/camera/cameraManager_vision.ts
// DESCRIPTION: Vision API and Content Analysis Module
// VERSION: 2.3 - Enhanced with IDE Context Awareness
// ============================================================================

import { 
  getCurrentApiConfigurationForced,
} from '../aiAssistant/apiProviderManager';

import { sendMessageDirectly } from '../aiAssistant/assistantUI';

// ============================================================================
// IDE CONTEXT FOR VISION ANALYSIS
// ============================================================================

interface VisionIDEContext {
  currentFileName: string;
  currentLanguage: string;
  projectName: string;
  codeSnippet: string;
}

/**
 * Get minimal IDE context for vision prompt enhancement
 */
function getVisionIDEContext(): VisionIDEContext {
  const context: VisionIDEContext = {
    currentFileName: '',
    currentLanguage: '',
    projectName: '',
    codeSnippet: ''
  };
  
  try {
    // Get TabManager for active file
    const tabManager = (window as any).tabManager || 
                       (window as any).ideTabManager ||
                       (window as any).__tabManager__;
    
    if (tabManager?.getActiveTab) {
      const activeTab = tabManager.getActiveTab();
      if (activeTab) {
        context.currentFileName = activeTab.title || activeTab.name || '';
        const filePath = activeTab.filePath || activeTab.path || '';
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        
        // Detect language
        const langMap: Record<string, string> = {
          'ts': 'TypeScript', 'tsx': 'TypeScript React', 'js': 'JavaScript',
          'jsx': 'JavaScript React', 'py': 'Python', 'rs': 'Rust',
          'go': 'Go', 'java': 'Java', 'c': 'C', 'cpp': 'C++',
          'cs': 'C#', 'html': 'HTML', 'css': 'CSS', 'json': 'JSON'
        };
        context.currentLanguage = langMap[ext] || ext.toUpperCase();
        
        // Extract project name from path
        const parts = filePath.split(/[/\\]/);
        if (parts.length > 2) {
          context.projectName = parts[parts.length - 2] || '';
        }
      }
    }
    
    // Get code snippet from Monaco
    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      const editors = monaco.editor.getEditors();
      if (editors.length > 0) {
        const model = editors[0].getModel();
        if (model) {
          // Get first 100 lines max
          const lines = model.getValue().split('\n').slice(0, 100);
          context.codeSnippet = lines.join('\n').substring(0, 2000);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get vision IDE context:', error);
  }
  
  return context;
}

/**
 * Build context-enhanced prompt for vision analysis
 */
function buildContextEnhancedPrompt(basePrompt: string): string {
  const context = getVisionIDEContext();
  
  let enhancedPrompt = basePrompt;
  
  // Add IDE context if available
  if (context.currentFileName || context.currentLanguage || context.projectName) {
    enhancedPrompt += `\n\n**User's Current IDE Context:**`;
    
    if (context.currentFileName) {
      enhancedPrompt += `\n- Working on file: ${context.currentFileName}`;
    }
    if (context.currentLanguage) {
      enhancedPrompt += `\n- Language: ${context.currentLanguage}`;
    }
    if (context.projectName) {
      enhancedPrompt += `\n- Project: ${context.projectName}`;
    }
  }
  
  // Add code snippet for reference if analyzing code-related images
  if (context.codeSnippet && context.codeSnippet.length > 100) {
    enhancedPrompt += `\n\n**Current Code in Editor (for reference):**
\`\`\`${context.currentLanguage?.toLowerCase() || ''}
${context.codeSnippet.substring(0, 1500)}
\`\`\``;
  }
  
  // Add instructions for context-aware response
  enhancedPrompt += `\n\n**IMPORTANT - Make your analysis context-aware:**
- If the image shows code, explain how it relates to the user's current file
- If showing an error, suggest fixes that fit their codebase
- If showing a UI, suggest implementation in their current language/framework
- Provide specific, actionable suggestions they can immediately use`;

  return enhancedPrompt;
}

// ============================================================================
// VISION API PROVIDER CHECKS - SUPPORTS OPENAI, CLAUDE, GEMINI
// ============================================================================

// List of providers that support vision/image analysis
const VISION_CAPABLE_PROVIDERS = [
  'openai',      // GPT-4o, GPT-4o-mini, GPT-4-vision
  'anthropic',   // Claude 3 Sonnet, Opus, Haiku
  'claude',      // Alternative name for Anthropic
  'google',      // Gemini Pro Vision, Gemini 1.5
  'gemini',      // Alternative name for Google
];

export function isVisionCapable(): boolean {
  const provider = getApiProvider().toLowerCase();
  const model = getApiModel().toLowerCase();
  
  // Check if provider is in the vision-capable list
  if (VISION_CAPABLE_PROVIDERS.includes(provider)) {
    return true;
  }
  
  // Also check model name for vision-capable models
  const visionModels = [
    'gpt-4o', 'gpt-4-vision', 'gpt-4-turbo',
    'claude-3', 'claude-sonnet', 'claude-opus', 'claude-haiku',
    'gemini-pro', 'gemini-1.5', 'gemini-2'
  ];
  
  for (const visionModel of visionModels) {
    if (model.includes(visionModel)) {
      return true;
    }
  }
  
  return false;
}

export function getApiProvider(): string {
  try {
    const config = getCurrentApiConfigurationForced();
    return config.provider || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

export function getApiKey(): string {
  try {
    const config = getCurrentApiConfigurationForced();
    return config.apiKey || '';
  } catch (error) {
    console.error('Error getting API key:', error);
    return '';
  }
}

export function getApiModel(): string {
  try {
    const config = getCurrentApiConfigurationForced();
    return config.model || 'gpt-4o-mini';
  } catch (error) {
    return 'gpt-4o-mini';
  }
}

export function hasApiKey(): boolean {
  try {
    const config = getCurrentApiConfigurationForced();
    return !!(config.apiKey && config.apiKey.trim());
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
}

// ============================================================================
// PROGRAMMING LANGUAGE DETECTION
// ============================================================================

export function detectProgrammingLanguage(code: string): string {
  const patterns = {
    'JavaScript/TypeScript': /\b(const|let|var|function|=>|async|await|import|export|class)\b/,
    'Python': /\b(def|import|from|class|if __name__|print|lambda|self)\b/,
    'Java': /\b(public|private|protected|class|interface|extends|implements|static void)\b/,
    'C++': /\b(#include|using namespace|cout|cin|std::)\b/,
    'HTML': /<\/?[a-z][\s\S]*>/i,
    'CSS': /[.#][\w-]+\s*\{[\s\S]*\}/,
    'SQL': /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i,
    'React/JSX': /\b(React|useState|useEffect|jsx|<[A-Z]\w*)\b/,
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) {
      return lang;
    }
  }
  
  return 'Unknown';
}

// ============================================================================
// DIRECT VISION API CALLS - MULTI-PROVIDER SUPPORT (OpenAI, Claude, Gemini)
// ============================================================================

/**
 * Call vision API with the current provider
 * Supports: OpenAI, Claude, Gemini
 */
export async function callVisionAPI(imageData: string, prompt: string): Promise<string> {
  const config = getCurrentApiConfigurationForced();
  const provider = config.provider?.toLowerCase() || 'unknown';
  const apiKey = config.apiKey;
  
  console.log(`🔍 Calling Vision API with provider: ${provider}`);
  
  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }
  
  // Route to appropriate provider
  if (provider === 'openai') {
    return await callOpenAIVision(imageData, prompt, config);
  } else if (provider === 'claude' || provider === 'anthropic') {
    return await callClaudeVision(imageData, prompt, config);
  } else if (provider === 'gemini' || provider === 'google') {
    return await callGeminiVision(imageData, prompt, config);
  } else {
    throw new Error(`Vision not supported for provider: ${provider}. Please use OpenAI, Claude, or Gemini.`);
  }
}

/**
 * OpenAI Vision API call
 */
async function callOpenAIVision(imageData: string, prompt: string, config: any): Promise<string> {
  const apiKey = config.apiKey;
  const model = config.model?.includes('gpt-4') ? config.model : 'gpt-4o-mini';
  
  console.log('🔍 Calling OpenAI Vision API with model:', model);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Vision API error:', errorData);
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response';
    
  } catch (error: any) {
    console.error('OpenAI Vision call failed:', error);
    throw new Error(`OpenAI Vision failed: ${error.message}`);
  }
}

/**
 * Claude (Anthropic) Vision API call
 * Uses Tauri invoke to bypass CORS restrictions
 */
async function callClaudeVision(imageData: string, prompt: string, config: any): Promise<string> {
  const apiKey = config.apiKey;
  const model = config.model || 'claude-sonnet-4-20250514';
  const apiBaseUrl = config.apiBaseUrl || 'https://api.anthropic.com';
  
  console.log('🔍 Calling Claude Vision API with model:', model);
  
  // Extract base64 data from data URL
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const mediaType = imageData.includes('image/png') ? 'image/png' : 'image/jpeg';
  
  // Build the request body
  const requestBody = {
    model: model,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  };
  
  try {
    // Check if Tauri is available
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      console.log('🔐 Using Tauri backend for Claude Vision (CORS bypass)');
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        // Call Claude via Tauri backend
        const result = await invoke('call_claude_vision_api', {
          apiKey: apiKey,
          model: model,
          imageBase64: base64Data,
          mediaType: mediaType,
          prompt: prompt,
          maxTokens: 1500
        });
        
        console.log('✅ Claude Vision via Tauri succeeded');
        return result as string;
        
      } catch (tauriError: any) {
        console.warn('⚠️ Tauri invoke failed, trying HTTP fetch:', tauriError);
        
        // Try using Tauri's HTTP module which bypasses CORS
        try {
          const { fetch } = (window as any).__TAURI__.http;
          
          const response = await fetch(`${apiBaseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: {
              type: 'Json',
              payload: requestBody
            }
          });
          
          if (response.ok) {
            const data = response.data;
            return data.content?.[0]?.text || 'No response';
          } else {
            throw new Error(`Claude API Error: ${response.status}`);
          }
        } catch (httpError: any) {
          console.error('Tauri HTTP also failed:', httpError);
          throw new Error(`Claude Vision failed: ${httpError.message}. Try using Gemini or OpenAI instead.`);
        }
      }
    }
    
    // Fallback: Try regular fetch (will likely fail due to CORS in browser)
    console.warn('⚠️ Not in Tauri environment, Claude Vision may fail due to CORS');
    
    const response = await fetch(`${apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude Vision API error:', errorData);
      throw new Error(`Claude API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No response';
    
  } catch (error: any) {
    console.error('Claude Vision call failed:', error);
    
    // Provide helpful error message
    if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
      throw new Error(`Claude Vision failed: CORS blocked. Please use Gemini or OpenAI for camera vision, or ensure you're running in the desktop app.`);
    }
    
    throw new Error(`Claude Vision failed: ${error.message}`);
  }
}

/**
 * Gemini (Google) Vision API call
 */
async function callGeminiVision(imageData: string, prompt: string, config: any): Promise<string> {
  const apiKey = config.apiKey;
  const model = config.model || 'gemini-1.5-flash';
  
  console.log('🔍 Calling Gemini Vision API with model:', model);
  
  // Extract base64 data from data URL
  const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  const mimeType = imageData.includes('image/png') ? 'image/png' : 'image/jpeg';
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini Vision API error:', errorData);
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
  } catch (error: any) {
    console.error('Gemini Vision call failed:', error);
    throw new Error(`Gemini Vision failed: ${error.message}`);
  }
}

// Legacy function for backward compatibility
export async function callOpenAIVisionLegacy(imageData: string, prompt: string): Promise<string> {
  const config = getCurrentApiConfigurationForced();
  return await callOpenAIVision(imageData, prompt, config);
}

export async function analyzeImageSimple(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      const provider = getApiProvider();
      throw new Error(`${provider} does not support vision. Please use OpenAI, Claude, or Gemini.`);
    }
    
    const prompt = `Analyze this image and provide a clear, concise description of what you see. Focus on:
1. Main content and purpose
2. Any text, code, or UI elements
3. Technical details if applicable
4. Potential use case or context`;

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// SPECIALIZED ANALYSIS FUNCTIONS
// ============================================================================

export async function extractTextFromImage(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      const provider = getApiProvider();
      throw new Error(`${provider} does not support OCR. Please use OpenAI, Claude, or Gemini.`);
    }
    
    const prompt = `Extract ALL text from this image. 
- Include code, UI text, labels, buttons, error messages, etc.
- Maintain the original formatting and structure
- If it's code, preserve indentation and syntax
- If it's documentation, keep the hierarchy
- Include any small or partially visible text
- Output ONLY the extracted text, no descriptions or explanations`;

    const result = await callVisionAPI(imageData, prompt);
    return result;
    
  } catch (error: any) {
    console.error('Text extraction failed:', error);
    throw error;
  }
}

export async function analyzeUIComponents(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('UI analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    const prompt = `Analyze this UI/interface and provide:
1. Component structure and hierarchy
2. Color scheme and design patterns
3. Interactive elements (buttons, inputs, etc.)
4. Layout approach (grid, flexbox, etc.)
5. Suggestions for React/HTML implementation
6. Accessibility considerations`;

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('UI analysis failed:', error);
    throw error;
  }
}

export async function analyzeCodeSnippet(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Code analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    const prompt = `Analyze this code and provide:
1. Programming language identification
2. Purpose and functionality explanation
3. Key algorithms or patterns used
4. Potential issues or bugs
5. Optimization suggestions
6. Best practices evaluation`;

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Code analysis failed:', error);
    throw error;
  }
}

export async function analyzeError(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Error analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    const prompt = `Analyze this error/debug output and provide:
1. Error type and severity
2. Root cause analysis
3. Step-by-step solution
4. Prevention strategies
5. Related documentation or resources`;

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Error analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// DEVELOPMENT CONTENT DETECTION
// ============================================================================

export async function detectDevelopmentContent(imageData: string): Promise<{
  type: string;
  confidence: number;
  context: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ type: 'unknown', confidence: 0, context: 'Unable to analyze' });
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      let darkPixels = 0;
      let monochromeScore = 0;
      let edgeCount = 0;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        const brightness = (r + g + b) / 3;
        
        if (brightness < 50) {
          darkPixels++;
        }
        
        const colorVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
        if (colorVariance < 30) {
          monochromeScore++;
        }
        
        if (i > 0 && i < pixels.length - 4) {
          const prevBrightness = (pixels[i-4] + pixels[i-3] + pixels[i-2]) / 3;
          const diff = Math.abs(brightness - prevBrightness);
          if (diff > 100) edgeCount++;
        }
      }
      
      const totalPixels = pixels.length / 4;
      const darkRatio = darkPixels / totalPixels;
      const monoRatio = monochromeScore / totalPixels;
      const edgeRatio = edgeCount / totalPixels;
      
      const isLikelyCode = darkRatio > 0.7 && monoRatio > 0.85 && edgeRatio > 0.05;
      const isLikelyUI = edgeRatio > 0.02 && darkRatio < 0.8;
      const isLikelyDocument = darkRatio < 0.2 && edgeRatio > 0.01;
      
      if (isLikelyCode) {
        resolve({ type: 'code', confidence: 0.8, context: 'Code editor or snippet' });
      } else if (isLikelyUI) {
        resolve({ type: 'ui-design', confidence: 0.7, context: 'UI/UX design or application interface' });
      } else if (isLikelyDocument) {
        resolve({ type: 'documentation', confidence: 0.6, context: 'Technical documentation or README' });
      } else {
        resolve({ type: 'general', confidence: 0.5, context: 'General development content' });
      }
    };
    
    img.onerror = () => {
      resolve({ type: 'unknown', confidence: 0, context: 'Failed to load image' });
    };
    
    img.src = imageData;
  });
}

// ============================================================================
// TECHNICAL CONTENT DETECTION
// ============================================================================

export async function detectTechnicalContent(imageData: string): Promise<{
  primaryType: string;
  subType: string;
  confidence: number;
  description: string;
}> {
  try {
    if (!isVisionCapable()) {
      return {
        primaryType: 'unknown',
        subType: 'general',
        confidence: 0,
        description: 'Vision API required - use OpenAI, Claude, or Gemini'
      };
    }
    
    const provider = getApiProvider();
    
    const detectionPrompt = `You are a technical content classifier. Analyze this image and identify EXACTLY what type of technical content it shows.

**Respond ONLY with JSON in this exact format:**
\`\`\`json
{
  "primaryType": "hardware|software|documentation|signal|diagram|other",
  "subType": "one of the options below",
  "confidence": 0.95,
  "description": "brief description"
}
\`\`\`

**Primary Types and their Sub-Types:**

**1. HARDWARE:**
- "schematic" - Circuit schematic with components
- "pcb_layout" - PCB layout design
- "block_diagram" - Hardware block diagram
- "component" - Individual hardware component
- "wiring" - Wiring diagram

**2. SOFTWARE:**
- "source_code" - Programming source code
- "ide" - IDE or code editor screenshot
- "compiler_output" - Compiler messages
- "debugger" - Debugger interface
- "terminal" - Terminal/console output

**3. SIGNAL:**
- "oscilloscope" - Oscilloscope waveform
- "logic_analyzer" - Logic analyzer output
- "voltage_waveform" - Voltage signal
- "timing_diagram" - Digital timing diagram

**4. DOCUMENTATION:**
- "datasheet" - Component datasheet
- "api_doc" - API documentation
- "manual" - Technical manual
- "specification" - Technical specification

**5. DIAGRAM:**
- "flowchart" - Process flowchart
- "architecture" - Software architecture
- "uml" - UML diagram
- "network" - Network topology

**6. OTHER:**
- "error_message" - Error dialog
- "log_file" - Log file output
- "test_results" - Test output
- "ui_mockup" - UI design
- "general" - General technical content

Classify this image:`;
    
    if (provider === 'openai') {
      const result = await callVisionAPI(imageData, detectionPrompt);
      
      try {
        const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          return {
            primaryType: parsed.primaryType || 'other',
            subType: parsed.subType || 'general',
            confidence: parsed.confidence || 0.5,
            description: parsed.description || 'Technical content detected'
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse detection JSON:', parseError);
      }
      
      const typeMatch = result.match(/primaryType["']?\s*:\s*["']?(\w+)/i);
      const subTypeMatch = result.match(/subType["']?\s*:\s*["']?([\w_]+)/i);
      
      return {
        primaryType: typeMatch ? typeMatch[1] : 'other',
        subType: subTypeMatch ? subTypeMatch[1] : 'general',
        confidence: 0.6,
        description: 'Content type detected from analysis'
      };
    }
    
    return {
      primaryType: 'other',
      subType: 'general',
      confidence: 0.3,
      description: 'Content detection not available'
    };
    
  } catch (error) {
    console.error('Content detection error:', error);
    return {
      primaryType: 'other',
      subType: 'general',
      confidence: 0,
      description: 'Detection failed'
    };
  }
}

// ============================================================================
// CONTENT TYPE FORMATTING
// ============================================================================

export function getContentTypeEmoji(primaryType: string, subType: string): string {
  const emojiMap: { [key: string]: { [key: string]: string } } = {
    hardware: {
      schematic: '📋',
      pcb_layout: '🔧',
      block_diagram: '📊',
      component: '🔌',
      wiring: '🔗'
    },
    software: {
      source_code: '💻',
      ide: '🖥️',
      compiler_output: '⚙️',
      debugger: '🐛',
      terminal: '⌨️'
    },
    signal: {
      oscilloscope: '📈',
      logic_analyzer: '📉',
      voltage_waveform: '⚡',
      timing_diagram: '⏱️'
    },
    documentation: {
      datasheet: '📄',
      api_doc: '📚',
      manual: '📖',
      specification: '📝'
    },
    diagram: {
      flowchart: '🔀',
      architecture: '🏗️',
      uml: '📐',
      network: '🌐'
    },
    other: {
      error_message: '❌',
      log_file: '📜',
      test_results: '✅',
      ui_mockup: '🎨',
      general: '📎'
    }
  };
  
  return emojiMap[primaryType]?.[subType] || '📷';
}

export function formatContentType(primaryType: string, subType: string): string {
  const typeLabels: { [key: string]: { [key: string]: string } } = {
    hardware: {
      schematic: 'Circuit Schematic',
      pcb_layout: 'PCB Layout',
      block_diagram: 'Hardware Block Diagram',
      component: 'Hardware Component',
      wiring: 'Wiring Diagram'
    },
    software: {
      source_code: 'Source Code',
      ide: 'IDE Screenshot',
      compiler_output: 'Compiler Output',
      debugger: 'Debugger View',
      terminal: 'Terminal Output'
    },
    signal: {
      oscilloscope: 'Oscilloscope Trace',
      logic_analyzer: 'Logic Analyzer',
      voltage_waveform: 'Voltage Waveform',
      timing_diagram: 'Timing Diagram'
    },
    documentation: {
      datasheet: 'Datasheet',
      api_doc: 'API Documentation',
      manual: 'Technical Manual',
      specification: 'Specification'
    },
    diagram: {
      flowchart: 'Flowchart',
      architecture: 'Architecture Diagram',
      uml: 'UML Diagram',
      network: 'Network Topology'
    },
    other: {
      error_message: 'Error Message',
      log_file: 'Log Output',
      test_results: 'Test Results',
      ui_mockup: 'UI Mockup',
      general: 'General Content'
    }
  };
  
  return typeLabels[primaryType]?.[subType] || 'Unknown Content';
}

// ============================================================================
// DEVELOPMENT RELEVANCE CHECK
// ============================================================================

export async function checkDevelopmentRelevance(imageData: string): Promise<{
  isRelevant: boolean;
  reason: string;
  suggestedAction: string;
}> {
  try {
    if (!isVisionCapable()) {
      return {
        isRelevant: false,
        reason: 'Vision API required - use OpenAI, Claude, or Gemini',
        suggestedAction: 'Configure a vision-capable API in settings'
      };
    }
    
    const prompt = `Analyze if this image contains development-related content.
Return JSON only:
{
  "isRelevant": true/false,
  "reason": "explanation",
  "suggestedAction": "what to do"
}

Development content includes:
- Code, scripts, terminal output
- IDE, debugger, compiler messages
- Technical diagrams, architecture
- API docs, error messages
- UI mockups, designs
- Hardware schematics

Non-development content:
- Personal photos, faces
- General text documents
- Entertainment content
- Random objects`;

    const result = await callVisionAPI(imageData, prompt);
    
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse relevance check:', e);
    }
    
    // Default to relevant if parsing fails
    return {
      isRelevant: true,
      reason: 'Unable to determine relevance',
      suggestedAction: 'Proceeding with analysis'
    };
    
  } catch (error) {
    console.error('Relevance check failed:', error);
    return {
      isRelevant: true,
      reason: 'Check failed, assuming relevant',
      suggestedAction: 'Continue with analysis'
    };
  }
}

// ============================================================================
// SMART CONTENT ANALYSIS
// ============================================================================

export async function analyzeByContentType(imageData: string, contentType: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Smart analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    // Get IDE context
    const ideContext = getVisionIDEContext();
    const contextInfo = ideContext.currentFileName 
      ? `\n\n**User's Context:** Currently working on \`${ideContext.currentFileName}\` (${ideContext.currentLanguage || 'unknown language'})${ideContext.projectName ? ` in project "${ideContext.projectName}"` : ''}`
      : '';
    
    const contextInstruction = ideContext.currentFileName
      ? `\n\n**IMPORTANT:** Relate your analysis to the user's current file and suggest how to apply this in their project.`
      : '';
    
    const prompts: { [key: string]: string } = {
      'source_code': `Analyze this source code:
1. Identify the programming language
2. Explain the main functionality
3. Identify key functions/methods
4. Spot potential issues or bugs
5. Suggest improvements
6. Provide code quality assessment${contextInfo}

How does this code relate to what the user is working on? Can they use or integrate this?${contextInstruction}`,

      'ide': `Analyze this IDE screenshot:
1. Identify the IDE/editor
2. Programming language and framework
3. Project structure visible
4. Current file and its purpose
5. Any visible errors or warnings
6. Configuration or settings shown${contextInfo}

Compare this with the user's current setup and suggest relevant improvements.${contextInstruction}`,

      'error_message': `Debug this error:
1. Error type and severity
2. Root cause analysis
3. Affected components
4. Step-by-step solution
5. Prevention strategies
6. Related documentation${contextInfo}

Show the user exactly how to fix this in their code.${contextInstruction}`,

      'ui_mockup': `Analyze this UI design:
1. Design patterns used
2. Component hierarchy
3. Color scheme and typography
4. Interactive elements
5. Responsive considerations
6. Implementation suggestions${contextInfo}

Provide code to implement this UI in the user's current framework (${ideContext.currentLanguage || 'React/HTML'}).${contextInstruction}`,

      'schematic': `Analyze this circuit schematic:
1. Circuit type and purpose
2. Key components identified
3. Power requirements
4. Signal flow
5. Potential issues
6. Improvement suggestions${contextInfo}

If the user is working on embedded/hardware code, explain how to interface with this circuit.${contextInstruction}`,

      'documentation': `Analyze this documentation:
1. Document type and purpose
2. Key information presented
3. Structure and organization
4. Technical details
5. Completeness assessment
6. Improvement suggestions${contextInfo}

How can the user apply this information in their current project?${contextInstruction}`
    };
    
    let prompt = prompts[contentType] || prompts['documentation'];
    
    // Add current code snippet for source code analysis
    if (contentType === 'source_code' && ideContext.codeSnippet && ideContext.codeSnippet.length > 200) {
      prompt += `\n\n**User's Current Code (for comparison):**
\`\`\`${ideContext.currentLanguage?.toLowerCase() || ''}
${ideContext.codeSnippet.substring(0, 800)}
\`\`\``;
    }
    
    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Content-specific analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// DEVELOPMENT ANALYSIS WITH RELEVANCE CHECK
// ============================================================================

export async function analyzeImageWithRelevanceCheck(imageData: string): Promise<{
  isRelevant: boolean;
  rejection?: {
    reason: string;
    suggestedAction: string;
  };
  data?: string;
}> {
  try {
    // First check if content is development-related
    const relevanceCheck = await checkDevelopmentRelevance(imageData);
    
    if (!relevanceCheck.isRelevant) {
      return {
        isRelevant: false,
        rejection: {
          reason: relevanceCheck.reason,
          suggestedAction: relevanceCheck.suggestedAction
        }
      };
    }
    
    // If relevant, proceed with analysis
    const analysis = await analyzeImageForDevelopment(imageData);
    
    return {
      isRelevant: true,
      data: analysis
    };
    
  } catch (error: any) {
    console.error('Analysis with relevance check failed:', error);
    throw error;
  }
}

// ============================================================================
// COMPREHENSIVE DEVELOPMENT ANALYSIS
// ============================================================================

export async function analyzeImageForDevelopment(imageData: string): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Development analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    // First detect content type
    const contentType = await detectTechnicalContent(imageData);
    
    // Use specialized prompt based on content type
    if (contentType.confidence > 0.7) {
      return await analyzeByContentType(imageData, contentType.subType);
    }
    
    // Get IDE context for enhanced analysis
    const ideContext = getVisionIDEContext();
    
    // Build context-aware development analysis prompt
    let prompt = `Analyze this image for development purposes:

1. **Content Type**: What type of development content is this?
2. **Main Purpose**: What is the primary function or goal?
3. **Technical Details**: Key technical aspects visible
4. **Code/Text**: Any code, commands, or important text
5. **Issues/Errors**: Any problems or errors visible
6. **Suggestions**: Improvements or next steps
7. **Implementation**: How to implement or use this`;

    // Add IDE context if available
    if (ideContext.currentFileName || ideContext.currentLanguage) {
      prompt += `\n\n**User's Current Context:**`;
      if (ideContext.currentFileName) {
        prompt += `\n- Currently editing: ${ideContext.currentFileName}`;
      }
      if (ideContext.currentLanguage) {
        prompt += `\n- Language: ${ideContext.currentLanguage}`;
      }
      if (ideContext.projectName) {
        prompt += `\n- Project: ${ideContext.projectName}`;
      }
      
      prompt += `\n\n**Important:** Relate your analysis to the user's current work. 
If this image shows code or concepts relevant to their file, explain the connection.
Provide specific suggestions they can apply to their current project.`;
    }
    
    // Add code snippet if available
    if (ideContext.codeSnippet && ideContext.codeSnippet.length > 200) {
      prompt += `\n\n**Current Code (for reference):**
\`\`\`${ideContext.currentLanguage?.toLowerCase() || ''}
${ideContext.codeSnippet.substring(0, 1200)}
\`\`\`

Compare/relate the image content to this code if applicable.`;
    }

    prompt += `\n\nProvide actionable insights for a developer working on this project.`;

    return await callVisionAPI(imageData, prompt);

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Development analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// BATCH IMAGE ANALYSIS
// ============================================================================

export async function analyzeMultipleImages(
  images: string[],
  context?: string
): Promise<string[]> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Batch analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    const results = await Promise.all(
      images.map(async (imageData, index) => {
        const prompt = context 
          ? `${context}\n\nAnalyze image ${index + 1} of ${images.length}:`
          : `Analyze this image (${index + 1} of ${images.length}):`;
        
        return await callVisionAPI(imageData, prompt);
      })
    );
    
    return results;
    
  } catch (error: any) {
    console.error('Batch analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// CONTEXTUAL ANALYSIS
// ============================================================================

export async function analyzeWithContext(
  imageData: string,
  context: string
): Promise<string> {
  try {
    if (!isVisionCapable()) {
      throw new Error('Contextual analysis requires vision-capable provider (OpenAI, Claude, or Gemini)');
    }
    
    const prompt = `Context: ${context}

Based on the above context, analyze this image and provide:
1. How it relates to the context
2. Specific details relevant to the context
3. Actionable insights
4. Suggested next steps`;

    return await callVisionAPI(imageData, prompt);
    
  } catch (error: any) {
    console.error('Contextual analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// COMPARISON ANALYSIS
// ============================================================================

export async function compareImages(
  image1: string,
  image2: string
): Promise<string> {
  try {
    if (!isVisionCapable()) {
      const provider = getApiProvider();
      throw new Error(`${provider} does not support vision comparison. Please use OpenAI, Claude, or Gemini.`);
    }
    
    // Note: This would require sending both images in a single request
    // For now, analyze separately and compare results
    const analysis1 = await analyzeImageSimple(image1);
    const analysis2 = await analyzeImageSimple(image2);
    
    const comparisonPrompt = `Compare these two analyses:

Analysis 1: ${analysis1}

Analysis 2: ${analysis2}

Provide:
1. Key similarities
2. Major differences
3. Which is more suitable for development
4. Recommendations`;

    // Use text-only API call (not vision)
    return await callTextAPI(comparisonPrompt);
    
  } catch (error: any) {
    console.error('Image comparison failed:', error);
    throw error;
  }
}

/**
 * Call text-only API (no image) with current provider
 */
async function callTextAPI(prompt: string): Promise<string> {
  const config = getCurrentApiConfigurationForced();
  const provider = config.provider?.toLowerCase() || 'unknown';
  const apiKey = config.apiKey;
  
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response';
    
  } else if (provider === 'claude' || provider === 'anthropic') {
    const response = await fetch(`${config.apiBaseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || 'No response';
    
  } else if (provider === 'gemini' || provider === 'google') {
    const model = config.model || 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
  } else {
    throw new Error(`Text API not supported for provider: ${provider}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateImageData(imageData: string): boolean {
  return imageData && imageData.startsWith('data:image/') && imageData.includes('base64,');
}

export function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = imageData;
  });
}

export function resizeImageData(
  imageData: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = imageData;
  });
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const visionAPI = {
  // Provider checks
  isVisionCapable,
  getApiProvider,
  getApiKey,
  hasApiKey,
  getApiModel,
  
  // Core analysis
  analyzeImageSimple,
  extractTextFromImage,
  analyzeUIComponents,
  analyzeCodeSnippet,
  analyzeError,
  analyzeImageForDevelopment,
  analyzeImageWithRelevanceCheck,
  
  // Detection
  detectDevelopmentContent,
  detectTechnicalContent,
  detectProgrammingLanguage,
  checkDevelopmentRelevance,
  
  // Advanced analysis
  analyzeByContentType,
  analyzeWithContext,
  analyzeMultipleImages,
  compareImages,
  
  // Utilities
  validateImageData,
  getImageDimensions,
  resizeImageData,
  getContentTypeEmoji,
  formatContentType
};

// ============================================================================
// END OF FILE
// ============================================================================