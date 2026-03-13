// ide/projectCreation/ai/aiProjectAdvisor.ts
// AI-Powered Project Advisor - Suggests templates based on user's project description

export interface TemplateInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ProjectTypeTemplates {
  web: TemplateInfo[];
  mobile: TemplateInfo[];
  backend: TemplateInfo[];
  desktop: TemplateInfo[];
  fullstack: TemplateInfo[];
  library: TemplateInfo[];
  embedded: TemplateInfo[];
}

export interface AiSuggestion {
  recommendedTemplate: string;
  projectType: string;
  reasoning: string;
  additionalSuggestions: string;
  keyTechnologies: string;
  rawResponse: string;
}

// ============================================================================
// AI PROMPT BUILDER
// ============================================================================

/**
 * Build AI prompt with all available templates
 * @param projectIdea - User's project description
 * @param templates - All available templates grouped by type
 * @returns Formatted prompt for AI
 */
export function buildAiPrompt(projectIdea: string, templates: ProjectTypeTemplates): string {
  const prompt = `You are an expert software architect helping developers choose the right technology stack for their projects.

USER'S PROJECT IDEA:
"${projectIdea}"

AVAILABLE TEMPLATES:

**Web Application:**
${templates.web.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Mobile Application:**
${templates.mobile.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Backend Service:**
${templates.backend.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Desktop Application:**
${templates.desktop.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Full-Stack:**
${templates.fullstack.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Library/Package:**
${templates.library.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

**Embedded System:**
${templates.embedded.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}

TASK:
Analyze the user's project idea and recommend the BEST template(s) from the list above. Your response MUST follow this EXACT format:

RECOMMENDED TEMPLATE: [template-id]
PROJECT TYPE: [web|mobile|backend|desktop|fullstack|library|embedded]
WHY THIS TEMPLATE: [1-2 sentence explanation]
ADDITIONAL SUGGESTIONS: [Any alternative templates with brief reasoning]
KEY TECHNOLOGIES: [List 3-5 key technologies they'll use]

Example for "I want to create a robot":
RECOMMENDED TEMPLATE: raspberry
PROJECT TYPE: embedded
WHY THIS TEMPLATE: Raspberry Pi is perfect for robotics as it provides GPIO pins for motor control, sensor integration, and supports Python for easy programming of robot behavior.
ADDITIONAL SUGGESTIONS: If you need real-time control, consider ESP32 for faster response times. For computer vision in robotics, you might want to combine Raspberry Pi with OpenCV libraries.
KEY TECHNOLOGIES: Python, GPIO libraries, Motor drivers, Sensors (ultrasonic, IR), Camera module

Be concise, practical, and match the template IDs EXACTLY as listed above.`;

  return prompt;
}

// ============================================================================
// AI API CALLER
// ============================================================================

/**
 * Call AI API to get template suggestions
 * @param prompt - Formatted AI prompt
 * @returns AI response text
 */
export async function callAiForSuggestions(prompt: string): Promise<string> {
  console.log('🤖 Calling AI for project suggestions...');

  // Method 1: Try Tauri backend (Desktop version)
  if ((window as any).__TAURI__?.invoke) {
    try {
      console.log('Using Tauri backend for AI call');
      
      const config = getAiConfig();
      
      const result = await (window as any).__TAURI__.invoke('call_ai_api', {
        request: {
          provider: config.provider,
          api_key: config.apiKey,
          base_url: config.apiBaseUrl,
          model: config.model,
          message: prompt,
          max_tokens: 1500,
          temperature: 0.7
        }
      });

      console.log('✅ AI suggestion received via Tauri');
      return result;
    } catch (error) {
      console.error('Tauri AI call failed:', error);
      console.log('Falling back to browser API...');
    }
  }

  // Method 2: Browser fetch (fallback)
  const config = getAiConfig();
  
  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect helping developers choose the right technology stack.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`AI API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ AI suggestion received via browser');
  
  return data.choices[0].message.content;
}

// ============================================================================
// AI CONFIGURATION
// ============================================================================

/**
 * Get AI configuration from localStorage or use defaults
 */
function getAiConfig(): {
  provider: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
} {
  try {
    const stored = localStorage.getItem('ai-api-config');
    if (stored) {
      const config = JSON.parse(stored);
      return {
        provider: config.provider || 'groq',
        apiKey: config.apiKey || 'PROXY',
        apiBaseUrl: config.apiBaseUrl || 'https://api.groq.com/openai/v1',
        model: config.model || 'meta-llama/llama-4-scout-17b-16e-instruct'
      };
    }
  } catch (error) {
    console.error('Error loading AI config:', error);
  }

  // Default: Groq (fast and free)
  return {
    provider: 'groq',
    apiKey: 'PROXY',
    apiBaseUrl: 'https://api.groq.com/openai/v1',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct'
  };
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

/**
 * Parse AI response into structured suggestion
 * @param aiResponse - Raw AI response text
 * @returns Parsed suggestion object
 */
export function parseAiResponse(response: string): AiSuggestion {
  console.log('📝 Parsing AI response...');
  console.log('Raw response:', response.substring(0, 500));
  
  // Extract fields from response
  const recommendedTemplateMatch = response.match(/(?:Recommended Template|Best Match|Template):\s*["\']?([^"\'\n,]+)["\']?/i);
  const projectTypeMatch = response.match(/(?:Project Type|Category|Type):\s*["\']?([^"\'\n,]+)["\']?/i);
  const reasoningMatch = response.match(/(?:Why This Works|Reasoning|Explanation):\s*(.+?)(?:\n\n|\n(?:[A-Z]|$))/s);
  const techMatch = response.match(/(?:Key Technologies|Technologies|Tech Stack):\s*(.+?)(?:\n\n|\n(?:[A-Z]|$))/s);
  const alternativesMatch = response.match(/(?:Alternatives|Alternative Templates|Other Options):\s*(.+?)(?:\n\n|\n(?:[A-Z]|$))/s);

  let recommendedTemplate = recommendedTemplateMatch?.[1]?.trim() || '';
  const projectType = projectTypeMatch?.[1]?.trim().toLowerCase() || '';
  
  console.log('📌 Extracted template name:', recommendedTemplate);
  console.log('📌 Extracted project type:', projectType);
  
  // ✅ NORMALIZE TEMPLATE NAMES TO IDs
  const templateNameToId: Record<string, string> = {
    // Web
    'react + vite': 'react-vite',
    'react-vite': 'react-vite',
    'react vite': 'react-vite',
    'nextjs': 'nextjs',
    'next.js': 'nextjs',
    'vue3': 'vue3',
    'vue 3': 'vue3',
    'svelte': 'svelte',
    'angular': 'angular',
    
    // Mobile
    'react native': 'react-native',
    'react-native': 'react-native',
    'flutter': 'flutter',
    'ionic': 'ionic',
    'expo': 'expo',
    
    // Backend
    'fastapi': 'fastapi',
    'fast api': 'fastapi',
    'express': 'express',
    'express.js': 'express',
    'expressjs': 'express',
    'django': 'django',
    'nestjs': 'nestjs',
    'nest.js': 'nestjs',
    
    // Desktop
    'electron': 'electron',
    'tauri': 'tauri',
    'neutralino': 'neutralino',
    
    // Fullstack
    'mern': 'mern',
    'mern stack': 'mern',
    't3': 't3',
    't3 stack': 't3',
    'redwood': 'redwood',
    'redwoodjs': 'redwood',
    
    // Library
    'npm-lib': 'npm-lib',
    'npm package': 'npm-lib',
    'npm library': 'npm-lib',
    'react-lib': 'react-lib',
    'react component': 'react-lib',
    'vue-lib': 'vue-lib',
    'vue component': 'vue-lib',
    
    // Embedded - THIS IS THE IMPORTANT PART!
    'arduino': 'arduino',
    'esp32': 'esp32',
    'raspberry': 'raspberry',
    'raspberry pi': 'raspberry',  // ✅ Map "Raspberry Pi" to "raspberry"
    'raspberrypi': 'raspberry',
    'rpi': 'raspberry'
  };
  
  // Normalize the template name to ID
  const normalizedKey = recommendedTemplate.toLowerCase().trim();
  if (templateNameToId[normalizedKey]) {
    recommendedTemplate = templateNameToId[normalizedKey];
    console.log(`✅ Normalized "${normalizedKey}" → "${recommendedTemplate}"`);
  } else {
    console.warn(`⚠️ Unknown template name: "${recommendedTemplate}"`);
    console.log('📋 Available mappings:', Object.keys(templateNameToId));
  }

  return {
    recommendedTemplate,
    projectType,
    reasoning: reasoningMatch?.[1]?.trim(),
    keyTechnologies: techMatch?.[1]?.trim(),
    additionalSuggestions: alternativesMatch?.[1]?.trim(),
    rawResponse: response
  };
}

/**
 * Fallback parser for unstructured AI responses
 */
function fallbackParse(response: string): Omit<AiSuggestion, 'rawResponse'> {
  // Try to find template IDs in the response
  const templateIds = [
    'react-vite', 'nextjs', 'vue3', 'svelte', 'angular',
    'react-native', 'flutter', 'ionic', 'expo',
    'fastapi', 'express', 'django', 'nestjs',
    'electron', 'tauri', 'neutralino',
    'mern', 't3', 'redwood',
    'npm-lib', 'react-lib', 'vue-lib',
    'arduino', 'esp32', 'raspberry'
  ];

  let foundTemplate = '';
  for (const id of templateIds) {
    if (response.toLowerCase().includes(id.toLowerCase())) {
      foundTemplate = id;
      break;
    }
  }

  // Try to find project type
  const typeKeywords = {
    'web': ['web', 'website', 'webapp', 'browser'],
    'mobile': ['mobile', 'ios', 'android', 'app'],
    'backend': ['backend', 'api', 'server', 'microservice'],
    'desktop': ['desktop', 'electron', 'tauri'],
    'fullstack': ['fullstack', 'full-stack', 'full stack'],
    'library': ['library', 'package', 'npm'],
    'embedded': ['embedded', 'iot', 'robot', 'hardware', 'raspberry', 'arduino']
  };

  let foundType = 'web'; // default
  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(kw => response.toLowerCase().includes(kw))) {
      foundType = type;
      break;
    }
  }

  return {
    recommendedTemplate: foundTemplate || 'react-vite',
    projectType: foundType,
    reasoning: 'Based on your project description, this template seems like a good fit.',
    additionalSuggestions: 'Consider exploring other templates in the same category.',
    keyTechnologies: 'JavaScript, TypeScript, Modern tooling'
  };
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

/**
 * Generate HTML for AI suggestion card
 * @param suggestion - Parsed AI suggestion
 * @param originalIdea - User's original project idea
 * @returns HTML string
 */
export function generateSuggestionHTML(suggestion: AiSuggestion, originalIdea: string): string {
  return `
    <div class="ai-suggestion-card">
      <div class="suggestion-main">
        <div class="suggestion-badge">✅ RECOMMENDED</div>
        <h4 class="suggestion-title">Perfect Match Found!</h4>
        <p class="suggestion-idea"><strong>Your Idea:</strong> "${originalIdea}"</p>
      </div>

      ${suggestion.recommendedTemplate ? `
      <div class="suggestion-template">
        <div class="template-info">
          <strong>🎯 Best Template:</strong> ${suggestion.recommendedTemplate}
        </div>
        <button class="apply-suggestion-btn" data-template="${suggestion.recommendedTemplate}" data-type="${suggestion.projectType}">
          ⚡ Use This Template
        </button>
      </div>
      ` : ''}

      ${suggestion.reasoning ? `
      <div class="suggestion-reasoning">
        <strong>💡 Why This Works:</strong>
        <p>${suggestion.reasoning}</p>
      </div>
      ` : ''}

      ${suggestion.keyTechnologies ? `
      <div class="suggestion-tech">
        <strong>🛠️ Key Technologies:</strong>
        <p>${suggestion.keyTechnologies}</p>
      </div>
      ` : ''}

      ${suggestion.additionalSuggestions ? `
      <div class="suggestion-alternatives">
        <strong>🔄 Alternatives to Consider:</strong>
        <p>${suggestion.additionalSuggestions}</p>
      </div>
      ` : ''}
    </div>

    <div class="full-ai-response">
      <details>
        <summary>View Full AI Response</summary>
        <pre>${suggestion.rawResponse}</pre>
      </details>
    </div>
  `;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if suggested template exists in available templates
 * @param templateId - Suggested template ID
 * @param templates - All available templates
 * @returns True if template exists
 */
export function validateSuggestion(templateId: string, templates: ProjectTypeTemplates): boolean {
  const allTemplates = Object.values(templates).flat();
  return allTemplates.some(t => t.id === templateId);
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * Get example project ideas for placeholder/help
 */
export function getExampleIdeas(): string[] {
  return [
    "I want to create a robot that avoids obstacles",
    "Build a mobile app for tracking expenses",
    "Create a REST API for a blog platform",
    "Make a desktop app for photo editing",
    "Build a website with user authentication",
    "Create a library for data validation",
    "IoT device to monitor temperature"
  ];
}

/**
 * Get random example idea
 */
export function getRandomExample(): string {
  const examples = getExampleIdeas();
  return examples[Math.floor(Math.random() * examples.length)];
}

console.log('✅ AI Project Advisor module loaded');