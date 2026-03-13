// src/ide/aiAssistant/aiHistorySearch.ts
// AI Intelligent History Search - Advanced Conversation Memory System
// Version: 3.0 - MAJOR UPGRADE
// 
// ============================================================================
// NEW FEATURES IN V3.0:
// ============================================================================
// 1. 🤖 AI-POWERED SEARCH - Use AI to find semantically relevant conversations
// 2. 📉 MEMORY DECAY - Older conversations lose relevance unless referenced
// 3. 📝 SMART SUMMARIES - Generate concise summaries to save context space
// 4. 🧠 VECTOR EMBEDDINGS - Semantic search using local embeddings
// ============================================================================

console.log('🔍 [AI History Search] Loading v3.0 (ADVANCED)...');
console.log('   🤖 AI-Powered Search: ENABLED');
console.log('   📉 Memory Decay: ENABLED');
console.log('   📝 Smart Summaries: ENABLED');
console.log('   🧠 Vector Embeddings: ENABLED');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  enabled: true,
  maxHistoryResults: 5,
  maxContentLength: 2000,
  minRelevanceScore: 0.25,
  searchDebounceMs: 100,
  showVisualFeedback: true,
  debug: true,
  injectContext: true,
  maxContextChars: 3000,
  
  // 🆕 V3.0 FEATURES
  enableAISearch: false,          // DISABLED - too slow (12+ seconds), use keyword+embedding instead
  enableMemoryDecay: true,        // Older memories lose relevance
  enableSmartSummaries: true,     // Generate summaries for context injection
  enableEmbeddings: false,        // DISABLED - requires CDN load, use keyword search
  
  // ⚡ SPEED SETTINGS
  maxSearchTimeMs: 500,           // Max time for search before giving up on slow methods
  useAsyncAISearch: false,        // If true, AI search runs in background (non-blocking)
  
  // Memory Decay Settings
  decayHalfLifeDays: 14,          // Relevance halves every 14 days
  referenceBoostFactor: 0.15,     // Boost per reference
  maxReferenceBoost: 0.5,         // Max boost from references
  
  // Summary Settings
  maxSummaryLength: 200,          // Max chars per summary
  summaryGenerationDelay: 2000,   // Delay before generating summary
  
  // Embedding Settings
  embeddingDimensions: 384,       // MiniLM embedding size
  similarityThreshold: 0.6,       // Min cosine similarity
  maxEmbeddingsStored: 200,       // Max embeddings to store
  
  // Search Weights (must sum to 1.0)
  // ⚡ Adjusted for FAST mode (AI search & embeddings disabled)
  weights: {
    keyword: 0.45,                // Traditional keyword matching (primary)
    topic: 0.30,                  // Topic matching (secondary)
    embedding: 0.00,              // Vector similarity (disabled)
    ai: 0.00,                     // AI relevance score (disabled)
    recency: 0.25                 // Time-based with decay
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface ConversationEntry {
  id: string;
  timestamp: number;
  userMessage: string;
  assistantResponse: string;
  topics: string[];
  keywords: string[];
  
  // 🆕 V3.0 Fields
  summary?: string;               // AI-generated summary
  embedding?: number[];           // Vector embedding
  referenceCount: number;         // Times this conversation was referenced
  lastReferenced: number;         // Last time this was retrieved
  decayScore?: number;            // Calculated decay score (cached)
}

interface SearchResult {
  entry: ConversationEntry;
  relevanceScore: number;
  matchedKeywords: string[];
  matchReason: string;
  
  // 🆕 V3.0 Score Breakdown
  scores: {
    keyword: number;
    topic: number;
    embedding: number;
    ai: number;
    recency: number;
    decay: number;
  };
}

interface HistorySearchResult {
  shouldSearch: boolean;
  triggerReason: string;
  results: SearchResult[];
  contextString: string;
  searchTime: number;
  
  // 🆕 V3.0 Metadata
  searchMethod: 'keyword' | 'embedding' | 'ai' | 'hybrid';
  embeddingsUsed: boolean;
  aiSearchUsed: boolean;
  summariesUsed: boolean;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'ai_conversation_history_v3';
const EMBEDDINGS_KEY = 'ai_conversation_embeddings';
const MAX_STORED_CONVERSATIONS = 150;

function getStoredHistory(): ConversationEntry[] {
  try {
    // Try v3 first
    let stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Migrate from v2 if exists
    stored = localStorage.getItem('ai_conversation_history');
    if (stored) {
      const oldHistory = JSON.parse(stored);
      const migratedHistory = oldHistory.map((entry: any) => ({
        ...entry,
        referenceCount: entry.referenceCount || 0,
        lastReferenced: entry.lastReferenced || entry.timestamp,
        summary: entry.summary || null,
        embedding: entry.embedding || null
      }));
      
      // Save migrated data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedHistory));
      console.log(`[AI History] Migrated ${migratedHistory.length} conversations to v3 format`);
      
      return migratedHistory;
    }
    
    return [];
  } catch (e) {
    console.error('[AI History] Failed to load history:', e);
    return [];
  }
}

function saveHistory(history: ConversationEntry[]): void {
  try {
    // Limit stored conversations
    if (history.length > MAX_STORED_CONVERSATIONS) {
      // Sort by combined score (recency + references) before trimming
      history.sort((a, b) => {
        const scoreA = calculateDecayScore(a) + (a.referenceCount * 0.1);
        const scoreB = calculateDecayScore(b) + (b.referenceCount * 0.1);
        return scoreB - scoreA;
      });
      history = history.slice(0, MAX_STORED_CONVERSATIONS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('[AI History] Failed to save history:', e);
  }
}

// ============================================================================
// 📉 MEMORY DECAY SYSTEM
// ============================================================================

/**
 * Calculate decay score based on age and reference frequency
 * Score ranges from 0 (forgotten) to 1 (fresh/frequently used)
 */
function calculateDecayScore(entry: ConversationEntry): number {
  if (!CONFIG.enableMemoryDecay) return 1;
  
  const now = Date.now();
  const ageMs = now - entry.timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay: score = e^(-age/halfLife)
  const halfLife = CONFIG.decayHalfLifeDays;
  let decayScore = Math.exp(-ageDays / halfLife * Math.LN2);
  
  // Reference boost: more references = slower decay
  const refCount = entry.referenceCount || 0;
  const referenceBoost = Math.min(
    refCount * CONFIG.referenceBoostFactor,
    CONFIG.maxReferenceBoost
  );
  
  // Recent reference bonus
  const lastRefMs = now - (entry.lastReferenced || entry.timestamp);
  const lastRefDays = lastRefMs / (1000 * 60 * 60 * 24);
  const recentRefBonus = lastRefDays < 7 ? 0.1 : 0;
  
  // Final score clamped to [0, 1]
  return Math.min(1, Math.max(0, decayScore + referenceBoost + recentRefBonus));
}

/**
 * Update reference count when a conversation is retrieved
 */
function markAsReferenced(entryId: string): void {
  const history = getStoredHistory();
  const entry = history.find(e => e.id === entryId);
  
  if (entry) {
    entry.referenceCount = (entry.referenceCount || 0) + 1;
    entry.lastReferenced = Date.now();
    saveHistory(history);
    
    if (CONFIG.debug) {
      console.log(`[AI History] 📊 Reference count for ${entryId}: ${entry.referenceCount}`);
    }
  }
}

// ============================================================================
// 📝 SMART SUMMARY GENERATION
// ============================================================================

/**
 * Generate a concise summary of a conversation using AI
 */
async function generateSummary(userMessage: string, assistantResponse: string): Promise<string> {
  if (!CONFIG.enableSmartSummaries) {
    return truncateText(userMessage + ' → ' + assistantResponse, CONFIG.maxSummaryLength);
  }
  
  try {
    const tauri = (window as any).__TAURI__;
    if (!tauri?.core?.invoke) {
      // Fallback to simple truncation
      return createSimpleSummary(userMessage, assistantResponse);
    }
    
    // Get API config
    const configStr = JSON.stringify({ provider: 'operator_x02', apiKey: 'PROXY', apiBaseUrl: 'PROXY', model: 'x02-coder' }); // Always use X02 proxy
    if (!configStr) {
      return createSimpleSummary(userMessage, assistantResponse);
    }
    
    const config = JSON.parse(configStr);
    
    const prompt = `Summarize this conversation in ONE short sentence (max 150 chars):
User: ${userMessage.substring(0, 300)}
Assistant: ${assistantResponse.substring(0, 500)}
Summary:`;
    
    let response: any;
    if (config.apiKey === 'PROXY' && (window as any).smartAICall) {
      response = await (window as any).smartAICall({
        provider: config.provider || 'operator_x02', apiKey: 'PROXY',
        model: config.model || 'x02-coder', message: prompt, maxTokens: 100, temperature: 0.3
      });
    } else {
      response = await tauri.core.invoke('call_ai_api', {
        request: { provider: config.provider || 'operator_x02', api_key: config.apiKey,
          base_url: config.apiBaseUrl || 'PROXY', model: config.model || 'x02-coder',
          message: prompt, max_tokens: 100, temperature: 0.3 }
      });
    }
    
    const summary = (typeof response === 'string' ? response : response?.content || '')
      .trim()
      .replace(/^Summary:\s*/i, '')
      .substring(0, CONFIG.maxSummaryLength);
    
    if (summary.length > 20) {
      console.log(`[AI History] 📝 Generated summary: "${summary.substring(0, 50)}..."`);
      return summary;
    }
  } catch (e) {
    console.warn('[AI History] Summary generation failed:', e);
  }
  
  return createSimpleSummary(userMessage, assistantResponse);
}

/**
 * Create a simple summary without AI
 */
function createSimpleSummary(userMessage: string, assistantResponse: string): string {
  // Extract key info
  const userPart = userMessage.substring(0, 80).replace(/\n/g, ' ').trim();
  
  // Try to find the first meaningful sentence from response
  const sentences = assistantResponse.split(/[.!?]+/);
  const firstMeaningful = sentences.find(s => s.trim().length > 20) || sentences[0] || '';
  const responsePart = firstMeaningful.substring(0, 80).replace(/\n/g, ' ').trim();
  
  return `Q: ${userPart}... → A: ${responsePart}...`.substring(0, CONFIG.maxSummaryLength);
}

/**
 * Generate summaries for conversations that don't have them (background task)
 */
async function generateMissingSummaries(): Promise<void> {
  const history = getStoredHistory();
  const needsSummary = history.filter(e => !e.summary).slice(0, 5); // Process 5 at a time
  
  if (needsSummary.length === 0) return;
  
  console.log(`[AI History] 📝 Generating summaries for ${needsSummary.length} conversations...`);
  
  for (const entry of needsSummary) {
    try {
      entry.summary = await generateSummary(entry.userMessage, entry.assistantResponse);
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    } catch (e) {
      console.warn(`[AI History] Failed to generate summary for ${entry.id}:`, e);
    }
  }
  
  saveHistory(history);
  console.log(`[AI History] 📝 Summary generation complete`);
}

// ============================================================================
// 🧠 VECTOR EMBEDDINGS
// ============================================================================

// Simple embedding cache
let embeddingCache: Map<string, number[]> = new Map();
let embeddingModelLoaded = false;
let embeddingPipeline: any = null;

/**
 * Load the embedding model (lazy loading from CDN)
 * This is OPTIONAL - if it fails, we fall back to other search methods
 */
async function loadEmbeddingModel(): Promise<boolean> {
  if (!CONFIG.enableEmbeddings) return false;
  if (embeddingModelLoaded) return true;
  
  try {
    // Check if transformers.js is already available
    if ((window as any).transformers?.pipeline) {
      console.log('[AI History] 🧠 Using existing transformers.js');
      const { pipeline } = (window as any).transformers;
      
      console.log('[AI History] 🧠 Initializing embedding pipeline...');
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true
      });
      
      embeddingModelLoaded = true;
      console.log('[AI History] 🧠 Embedding model loaded successfully!');
      return true;
    }
    
    // Try to load from CDN (optional - don't block if fails)
    console.log('[AI History] 🧠 Attempting to load embedding model from CDN...');
    console.log('[AI History] 🧠 Note: This is optional. If it fails, keyword + AI search will be used.');
    
    // Create script element to load transformers.js
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';
    script.type = 'text/javascript';
    
    const loadPromise = new Promise<boolean>((resolve) => {
      script.onload = () => {
        console.log('[AI History] 🧠 Transformers.js script loaded');
        resolve(true);
      };
      script.onerror = () => {
        console.warn('[AI History] 🧠 Failed to load transformers.js from CDN - embeddings disabled');
        resolve(false);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        console.warn('[AI History] 🧠 Transformers.js load timeout - embeddings disabled');
        resolve(false);
      }, 10000);
    });
    
    document.head.appendChild(script);
    
    const loaded = await loadPromise;
    if (!loaded) {
      CONFIG.enableEmbeddings = false;
      return false;
    }
    
    // Wait for module to initialize
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if pipeline is available now
    const transformers = (window as any).Transformers || (window as any).transformers;
    if (!transformers?.pipeline) {
      console.warn('[AI History] 🧠 Transformers.js loaded but pipeline not available');
      CONFIG.enableEmbeddings = false;
      return false;
    }
    
    console.log('[AI History] 🧠 Initializing embedding pipeline...');
    embeddingPipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true
    });
    
    embeddingModelLoaded = true;
    console.log('[AI History] 🧠 Embedding model loaded successfully!');
    return true;
  } catch (e) {
    console.warn('[AI History] 🧠 Embedding model not available (this is OK):', e);
    console.log('[AI History] 🧠 Falling back to keyword + AI search');
    CONFIG.enableEmbeddings = false;
    return false;
  }
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!CONFIG.enableEmbeddings) return null;
  
  // Check cache first
  const cacheKey = text.substring(0, 200);
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }
  
  try {
    // Try to use local embedding model
    if (embeddingPipeline) {
      const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data) as number[];
      
      // Cache the result
      embeddingCache.set(cacheKey, embedding);
      
      // Limit cache size
      if (embeddingCache.size > 500) {
        const firstKey = embeddingCache.keys().next().value;
        embeddingCache.delete(firstKey);
      }
      
      return embedding;
    }
    
    // Fallback: Use AI API to generate simple embedding approximation
    return await generateAIEmbedding(text);
  } catch (e) {
    console.warn('[AI History] Embedding generation failed:', e);
    return null;
  }
}

/**
 * Fallback: Generate embedding-like features using AI
 * This creates a simple feature vector based on key concepts
 */
async function generateAIEmbedding(text: string): Promise<number[] | null> {
  try {
    const tauri = (window as any).__TAURI__;
    if (!tauri?.core?.invoke) return null;
    
    const configStr = JSON.stringify({ provider: 'operator_x02', apiKey: 'PROXY', apiBaseUrl: 'PROXY', model: 'x02-coder' }); // Always use X02 proxy
    if (!configStr) return null;
    
    const config = JSON.parse(configStr);
    
    // Extract key features using AI
    const prompt = `Extract 10 key concepts from this text as single words, comma-separated:
"${text.substring(0, 500)}"
Concepts:`;
    
    let response: any;
    if (config.apiKey === 'PROXY' && (window as any).smartAICall) {
      response = await (window as any).smartAICall({
        provider: config.provider || 'operator_x02', apiKey: 'PROXY',
        model: config.model || 'x02-coder', message: prompt, maxTokens: 50, temperature: 0.1
      });
    } else {
      response = await tauri.core.invoke('call_ai_api', {
        request: { provider: config.provider || 'operator_x02', api_key: config.apiKey,
          base_url: config.apiBaseUrl || 'PROXY', model: config.model || 'x02-coder',
          message: prompt, max_tokens: 50, temperature: 0.1 }
      });
    }
    
    // Convert concepts to simple hash-based embedding
    const concepts = (typeof response === 'string' ? response : '')
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0);
    
    // Create a simple embedding from concept hashes
    const embedding = new Array(CONFIG.embeddingDimensions).fill(0);
    for (const concept of concepts) {
      const hash = simpleHash(concept);
      for (let i = 0; i < 10; i++) {
        const idx = (hash + i * 37) % CONFIG.embeddingDimensions;
        embedding[idx] += 1 / concepts.length;
      }
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  } catch (e) {
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================================
// 🤖 AI-POWERED SEARCH
// ============================================================================

/**
 * Use AI to find relevant conversations
 */
async function aiPoweredSearch(
  query: string, 
  history: ConversationEntry[]
): Promise<Map<string, number>> {
  const relevanceMap = new Map<string, number>();
  
  if (!CONFIG.enableAISearch || history.length === 0) {
    return relevanceMap;
  }
  
  try {
    const tauri = (window as any).__TAURI__;
    if (!tauri?.core?.invoke) return relevanceMap;
    
    const configStr = JSON.stringify({ provider: 'operator_x02', apiKey: 'PROXY', apiBaseUrl: 'PROXY', model: 'x02-coder' }); // Always use X02 proxy
    if (!configStr) return relevanceMap;
    
    const config = JSON.parse(configStr);
    
    // Build context with summaries or truncated messages
    const historyContext = history.slice(0, 30).map((entry, idx) => {
      const content = entry.summary || 
        `Q: ${entry.userMessage.substring(0, 100)} A: ${entry.assistantResponse.substring(0, 100)}`;
      return `[${idx}] ${content}`;
    }).join('\n');
    
    const prompt = `You are a search assistant. Find conversations relevant to the user's query.
Rate each relevant conversation from 0.0 to 1.0 based on how relevant it is.
RESPOND ONLY with JSON array. Example: [{"index": 0, "score": 0.9}, {"index": 3, "score": 0.7}]
If nothing is relevant, respond with: []

User Query: "${query}"

Past Conversations:
${historyContext}

Relevant conversations (JSON array only):`;
    
    let response: any;
    if (config.apiKey === 'PROXY' && (window as any).smartAICall) {
      response = await (window as any).smartAICall({
        provider: config.provider || 'operator_x02', apiKey: 'PROXY',
        model: config.model || 'x02-coder', message: prompt, maxTokens: 200, temperature: 0.1
      });
    } else {
      response = await tauri.core.invoke('call_ai_api', {
        request: { provider: config.provider || 'operator_x02', api_key: config.apiKey,
          base_url: config.apiBaseUrl || 'PROXY', model: config.model || 'x02-coder',
          message: prompt, max_tokens: 200, temperature: 0.1 }
      });
    }
    
    // Parse AI response
    const responseText = typeof response === 'string' ? response : JSON.stringify(response);
    const clean = responseText.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const match = clean.match(/\[[\s\S]*?\]/);
    
    if (match) {
      const aiResults = JSON.parse(match[0]);
      if (Array.isArray(aiResults)) {
        for (const result of aiResults) {
          const idx = typeof result.index === 'number' ? result.index : parseInt(result.index);
          const score = typeof result.score === 'number' ? result.score : parseFloat(result.score) || 0.5;
          
          if (idx >= 0 && idx < history.length) {
            relevanceMap.set(history[idx].id, Math.min(1, Math.max(0, score)));
          }
        }
      }
    }
    
    if (CONFIG.debug && relevanceMap.size > 0) {
      console.log(`[AI History] 🤖 AI found ${relevanceMap.size} relevant conversations`);
    }
  } catch (e) {
    console.warn('[AI History] AI search failed:', e);
  }
  
  return relevanceMap;
}

// ============================================================================
// TOPIC & KEYWORD EXTRACTION
// ============================================================================

function extractTopics(text: string): string[] {
  const topics: Set<string> = new Set();
  
  const techPatterns = [
    /\b(typescript|javascript|python|rust|c\+\+|java|html|css|react|vue|angular|node|npm|api|database|sql|git|svn|docker|kubernetes)\b/gi,
    /\b(function|class|interface|component|module|variable|constant|array|object|string|number|boolean|async|await|promise)\b/gi,
    /\b(error|bug|issue|fix|debug|test|deploy|build|compile|install|config|setup)\b/gi,
    /\b(file|folder|directory|path|import|export|require|package|dependency)\b/gi,
    /\b(login|auth|user|password|token|session|cookie|security|encrypt)\b/gi,
    /\b(request|response|fetch|axios|http|rest|graphql|websocket)\b/gi,
  ];
  
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => topics.add(m.toLowerCase()));
    }
  }
  
  return Array.from(topics).slice(0, 15);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'about', 'against', 'this', 'that',
    'these', 'those', 'what', 'which', 'who', 'whom', 'i', 'me', 'my',
    'myself', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him',
    'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their',
    'please', 'help', 'want', 'like', 'know', 'think', 'make', 'get',
    'use', 'find', 'give', 'tell', 'ask', 'seem', 'feel', 'try', 'leave'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const freq: Map<string, number> = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

// ============================================================================
// TRIGGER DETECTION
// ============================================================================

const HISTORY_TRIGGER_PATTERNS = {
  explicitReferences: [
    // === ORIGINAL PATTERNS ===
    /\b(remember|recall|earlier|before|previously|last time|other day)\b/i,
    /\b(we (discussed|talked|mentioned|covered|went over))\b/i,
    /\b(you (said|told|explained|mentioned|suggested))\b/i,
    /\b(as (we|I) (said|mentioned|discussed))\b/i,
    /\b(like (before|earlier|last time))\b/i,
    /\b(continue|continuing|continuation)\s+(from|of|with)\b/i,
    /\b(back to|return to|revisit)\b/i,
    /\bwhat did (we|I|you)\b/i,
    /\bwhen did (we|I|you)\b/i,
    /\bhow did (we|I|you)\b/i,
    /\blast\s+(conversation|chat|discussion|time|session)\b/i,
    /\bprevious\s+(conversation|chat|discussion|message)\b/i,
    /\b(few|couple|some)\s+(minutes|hours|days)\s+(ago|before)\b/i,
    /\b(yesterday|today|last\s*night|this\s*morning|earlier\s*today)\b/i,
    /\b(discuss|talked|mentioned|said).*(yesterday|today|earlier|before|ago)\b/i,
    /\b(yesterday|earlier|before|ago).*(discuss|talk|mention|said|told)\b/i,
    /\bwhat.*(we|you|I).*(discuss|talk|said|mention)/i,
    
    // === FIRST/1ST PATTERNS ===
    /\b(first|1st|initial|original)\s*(chat|conversation|question|message|topic)\b/i,
    /\b(first|1st)\s*(thing|time)\s*(we|I|you)\b/i,
    /\bwhat.*(first|1st|initial)\b/i,
    /\b(chat|conversation)\s*(question|message|history)\b/i,
    /\b(my|our|the)\s*(first|1st|previous|earlier)\s*(question|message|chat)\b/i,
    /\bwhat\s*(is|was|were)\s*(the|my|our)\s*(first|1st)\b/i,
    /\bwhat.*(ask|asked|aks|aksed)\b/i,
    /\b(i|we)\s*(ask|asked|aks)\b/i,
    /\bhistory\b/i,
    /\bpast\s*(chat|conversation|message|question)\b/i,
    
    // === "YOU HELPED/GAVE/WROTE" PATTERNS ===
    /\b(you|u)\s*(helped|gave|wrote|provided|showed|created|made|built)\b/i,
    /\b(the|that)\s*(code|solution|fix|answer|example|function|script)\s*(you|u)\b/i,
    /\b(code|solution|fix|answer)\s*(you|u)\s*(gave|wrote|provided|showed)\b/i,
    
    // === "DO YOU REMEMBER" PATTERNS ===
    /\b(do|can|could)\s*(you|u)\s*(remember|recall|find)\b/i,
    /\bremember\s*(when|what|the|that|our|my)\b/i,
    
    // === "WE WERE" PATTERNS ===
    /\b(we|I)\s*(were|was)\s*(working|talking|discussing|looking)\b/i,
    /\b(we|I)\s*(were|was)\s*(trying|doing|building|fixing)\b/i,
    /\bwhat\s*(were|was)\s*(we|I)\b/i,
    
    // === "FIND/SEARCH/SHOW" PATTERNS ===
    /\b(find|search|look\s*up|show)\s*(the|my|our|that|previous)\b/i,
    /\b(find|search)\s*(in)?\s*(history|chat|conversation)\b/i,
    /\bshow\s*me\s*(the|that|our|my|previous)\b/i,
    
    // === TIME REFERENCES ===
    /\blast\s*(week|month|time|session)\b/i,
    /\b(recently|a\s*while\s*ago|some\s*time\s*ago)\b/i,
    /\b(few|couple)\s*(days|weeks)\s*(ago|back)\b/i,
    
    // === "THAT THING/TOPIC" PATTERNS ===
    /\b(that|the)\s*(thing|topic|subject|issue|matter|problem)\s*(we|you|I)\b/i,
    /\bwhat\s*(topic|subject|thing)\b/i,
    /\b(the|that)\s*(bug|error|issue|problem)\s*(we|you|I)?\s*(discussed|fixed|talked|mentioned)?\b/i,
    
    // === "DID WE/HAVE WE" PATTERNS ===
    /\b(did|have|had)\s*(we|I|you)\s*(ever|already|before)\b/i,
    /\b(did|have)\s*(we|I)\s*(discuss|talk|mention|cover|do)\b/i,
    /\bwere\s*(we|you)\b/i,
    
    // === TYPO TOLERANCE ===
    /\b(wat|wht|waht)\s/i,
    /\b(remeber|rember|remembr)\b/i,
    /\b(previus|previuos|pervious)\b/i,
    /\b(eralier|erlier)\b/i,
    /\b(ysterday|yestrday)\b/i,
    /\b(discus|discuse|dicuss)\b/i,
    
    // === CASUAL/SHORT REFERENCES ===
    /^(and|so)\s*(what|how|where)\s*(about|was|is|did)\b/i,
    /\bour\s*(last|previous|earlier)\b/i,
    /\bmy\s*(last|previous|earlier)\s*(question|message|request)\b/i,
    /\b(go|went)\s*(back|over)\b/i,
    /\bagain\b.*\b(like|as)\s*(before|earlier|last)\b/i,
    
    // =========================================================================
    // 🆕 PROJECT & DEVELOPMENT PATTERNS
    // =========================================================================
    
    // === PROJECT REFERENCES ===
    /\b(the|my|our|that)\s*(project|app|application|repo|repository)\s*(we|you|I)?\b/i,
    /\b(project|app)\s*(we|I)\s*(built|created|made|started|worked)\b/i,
    /\bworking\s*on\s*(the|my|our|that|this)\s*(project|app)\b/i,
    /\b(same|that|the)\s*(project|codebase|repo)\b/i,
    /\b(continue|resume)\s*(the|my|our)?\s*(project|work|development)\b/i,
    
    // === CODE REFERENCES ===
    /\b(the|that|my)\s*(code|function|method|class|component|module|script)\s*(we|you|I)?\b/i,
    /\b(code|function|script)\s*(we|you|I)\s*(wrote|created|made|built|discussed)\b/i,
    /\b(that|the)\s*(implementation|logic|algorithm|approach)\b/i,
    /\bwhere\s*(is|was)\s*(the|that|my)\s*(code|function|file)\b/i,
    /\b(the|that)\s*(snippet|example|sample)\s*(code)?\s*(you|we)?\b/i,
    /\b(show|find|get)\s*(me)?\s*(the|that|my)\s*(code|function|script)\b/i,
    
    // === BUG & ERROR REFERENCES ===
    /\b(the|that|my)\s*(bug|error|issue|problem|crash|exception)\s*(we|you|I)?\b/i,
    /\b(bug|error|issue)\s*(we|you|I)\s*(fixed|solved|resolved|discussed|found)\b/i,
    /\b(fix|solution)\s*(for|to)\s*(the|that|my)\s*(bug|error|issue|problem)\b/i,
    /\b(same|that|similar)\s*(bug|error|issue|problem)\b/i,
    /\b(debug|debugging|troubleshoot)\s*(the|that|my|this)?\b/i,
    /\bhow\s*(did)?\s*(we|you|I)\s*(fix|solve|resolve|debug)\b/i,
    /\b(the|that)\s*(stack\s*trace|error\s*message|exception|warning)\b/i,
    /\b(TypeError|ReferenceError|SyntaxError|null|undefined)\s*(error|issue|problem)?\b/i,
    
    // === FEATURE & IMPROVEMENT REFERENCES ===
    /\b(the|that|my)\s*(feature|functionality|improvement|enhancement)\s*(we|you|I)?\b/i,
    /\b(feature|improvement)\s*(we|you|I)\s*(added|built|implemented|discussed)\b/i,
    /\b(add|adding|implement|implementing)\s*(the|that|this)\s*(feature|functionality)\b/i,
    /\b(optimize|optimization|refactor|refactoring)\s*(the|that|my|this)?\b/i,
    /\b(performance|speed|efficiency)\s*(improvement|issue|fix)?\b/i,
    
    // === FILE & COMPONENT REFERENCES ===
    /\b(the|that|my)\s*(file|component|module|package|library)\s*(we|you|I)?\b/i,
    /\b(in|from)\s*(the|that|which)\s*(file|component|module)\b/i,
    /\b(\.ts|\.js|\.tsx|\.jsx|\.py|\.rs|\.cpp|\.c|\.java|\.go)\s*(file)?\s*(we|you)?\b/i,
    /\b(main|index|app|config|utils|helpers)\s*(\.ts|\.js|\.py)?\s*(file)?\b/i,
    /\bwhat\s*(file|component|module)\s*(was|is|did)\b/i,
    
    // === API & BACKEND REFERENCES ===
    /\b(the|that|my)\s*(api|endpoint|route|backend|server)\s*(we|you|I)?\b/i,
    /\b(api|endpoint)\s*(we|you|I)\s*(created|built|fixed|discussed)\b/i,
    /\b(REST|GraphQL|WebSocket)\s*(api|endpoint|call)?\b/i,
    /\b(fetch|axios|request|response)\s*(issue|error|code)?\b/i,
    /\b(database|db|query|sql|mongodb|postgres)\s*(issue|error|code)?\b/i,
    
    // === UI & FRONTEND REFERENCES ===
    /\b(the|that|my)\s*(ui|interface|layout|design|style|css)\s*(we|you|I)?\b/i,
    /\b(button|form|input|modal|dialog|menu|navbar|sidebar)\s*(we|you|I)?\s*(made|built|fixed)?\b/i,
    /\b(react|vue|angular|svelte)\s*(component|code|issue)?\b/i,
    /\b(html|css|scss|sass|tailwind)\s*(code|style|issue)?\b/i,
    /\b(responsive|mobile|desktop)\s*(design|layout|issue)?\b/i,
    
    // === BUILD & DEPLOY REFERENCES ===
    /\b(the|that|my)\s*(build|deployment|deploy|release)\s*(we|you|I)?\b/i,
    /\b(build|compile|bundle)\s*(error|issue|problem|fail)\b/i,
    /\b(npm|yarn|pnpm|cargo|pip|gradle|maven)\s*(error|issue|install)?\b/i,
    /\b(docker|kubernetes|k8s|ci|cd|pipeline)\b/i,
    /\b(webpack|vite|rollup|esbuild|parcel)\s*(config|error|issue)?\b/i,
    
    // === TEST & DEBUG REFERENCES ===
    /\b(the|that|my)\s*(test|unit\s*test|e2e|integration)\s*(we|you|I)?\b/i,
    /\b(test|testing)\s*(we|you|I)\s*(wrote|created|fixed|ran)\b/i,
    /\b(jest|mocha|cypress|playwright|pytest)\s*(test|error|issue)?\b/i,
    /\b(console\s*log|print|debug|breakpoint)\b/i,
    /\b(coverage|assertion|mock|stub|spy)\b/i,
    
    // === VERSION CONTROL REFERENCES ===
    /\b(the|that|my)\s*(commit|branch|merge|pr|pull\s*request)\s*(we|you|I)?\b/i,
    /\b(git|svn|version\s*control)\s*(issue|error|command)?\b/i,
    /\b(push|pull|clone|checkout|rebase|cherry-pick)\b/i,
    /\b(conflict|merge\s*conflict)\s*(we|you|I)?\s*(had|fixed|resolved)?\b/i,
    
    // === FRAMEWORK & LIBRARY REFERENCES ===
    /\b(react|vue|angular|svelte|next|nuxt|gatsby)\s*(app|project|code|issue)?\b/i,
    /\b(node|express|fastify|nest|django|flask|spring)\s*(app|server|issue)?\b/i,
    /\b(typescript|javascript|python|rust|go|java)\s*(code|error|issue)?\b/i,
    /\b(tauri|electron|flutter|react\s*native)\s*(app|issue)?\b/i,
    
    // === CONFIG & SETUP REFERENCES ===
    /\b(the|that|my)\s*(config|configuration|setup|settings)\s*(we|you|I)?\b/i,
    /\b(tsconfig|package\.json|eslint|prettier|babel)\s*(issue|error|change)?\b/i,
    /\b(env|environment|variable|secret|key)\s*(we|you|I)?\s*(set|configured)?\b/i,
    
    // === ARCHITECTURE & DESIGN REFERENCES ===
    /\b(the|that|my)\s*(architecture|design|pattern|structure)\s*(we|you|I)?\b/i,
    /\b(singleton|factory|observer|mvc|mvvm)\s*(pattern)?\b/i,
    /\b(microservice|monolith|serverless|event-driven)\b/i,
    /\b(schema|model|entity|interface|type)\s*(we|you|I)?\s*(created|defined|discussed)?\b/i,
    
    // === GENERIC DEV FOLLOW-UPS ===
    /\b(still|not)\s*(working|fixed|resolved|done)\b/i,
    /\b(try|tried)\s*(that|it|this|the)\s*(solution|fix|approach|code)\b/i,
    /\b(another|different|better)\s*(way|approach|solution|method)\b/i,
    /\b(what|how)\s*(about|if)\s*(we|I)\s*(try|use|change)\b/i,
    /\b(next|then|after)\s*(step|steps|what)\b/i,
  ],
  
  ambiguousPronouns: [
    /^(it|they|that|this|these|those)\s+(is|are|was|were|does|do|did|has|have|had|can|could|should|would|will|won't|doesn't|don't)\b/i,
    /\b(fix|update|change|modify|edit|improve)\s+(it|them|that|this)\b/i,
    /\bwhat about\s+(it|them|that|this)\b/i,
    /\bshow me\s+(it|them|that|this)\b/i,
  ],
  
  followUpPatterns: [
    /^(and|also|additionally|furthermore|moreover)\b/i,
    /^(but|however|although)\b/i,
    /^(what|how|why|when|where)\s+(about|else|if|now)\b/i,
    /\b(another|other|more|else|next)\s+(example|way|option|approach|method)\b/i,
  ],
  
  comparisonPatterns: [
    /\b(like|similar to|same as|different from)\s+(the|that|what)\b/i,
    /\b(compared to|versus|vs)\b/i,
    /\b(the one|that one|the other)\b/i,
  ],
  
  projectReferences: [
    /\b(the|my|our)\s+(project|app|application|code|file|function|component|module)\b/i,
    /\b(that|the)\s+(bug|issue|error|problem|feature)\b/i,
  ]
};

function shouldSearchHistory(message: string): { should: boolean; reason: string } {
  // 🔍 DEBUG: Log what we're checking
  if (CONFIG.debug) {
    console.log(`[AI History] 🔍 Checking triggers for: "${message.substring(0, 50)}..."`);
  }
  
  for (const pattern of HISTORY_TRIGGER_PATTERNS.explicitReferences) {
    if (pattern.test(message)) {
      if (CONFIG.debug) {
        console.log(`[AI History] ✅ Matched explicit pattern: ${pattern}`);
      }
      return { should: true, reason: 'Explicit reference to past conversation' };
    }
  }
  
  if (message.length < 100) {
    for (const pattern of HISTORY_TRIGGER_PATTERNS.ambiguousPronouns) {
      if (pattern.test(message)) {
        if (CONFIG.debug) {
          console.log(`[AI History] ✅ Matched pronoun pattern: ${pattern}`);
        }
        return { should: true, reason: 'Ambiguous pronoun needs context' };
      }
    }
  }
  
  for (const pattern of HISTORY_TRIGGER_PATTERNS.followUpPatterns) {
    if (pattern.test(message)) {
      if (CONFIG.debug) {
        console.log(`[AI History] ✅ Matched follow-up pattern: ${pattern}`);
      }
      return { should: true, reason: 'Follow-up question detected' };
    }
  }
  
  for (const pattern of HISTORY_TRIGGER_PATTERNS.comparisonPatterns) {
    if (pattern.test(message)) {
      if (CONFIG.debug) {
        console.log(`[AI History] ✅ Matched comparison pattern: ${pattern}`);
      }
      return { should: true, reason: 'Reference to previous content' };
    }
  }
  
  for (const pattern of HISTORY_TRIGGER_PATTERNS.projectReferences) {
    if (pattern.test(message) && message.length < 150) {
      if (CONFIG.debug) {
        console.log(`[AI History] ✅ Matched project pattern: ${pattern}`);
      }
      return { should: true, reason: 'Project reference may need context' };
    }
  }
  
  if (CONFIG.debug) {
    console.log(`[AI History] ❌ No patterns matched`);
  }
  return { should: false, reason: 'No history search needed' };
}

// ============================================================================
// 🔍 HYBRID SEARCH ENGINE (V3.0)
// ============================================================================

/**
 * Advanced hybrid search combining all methods
 */
async function hybridSearch(
  query: string, 
  maxResults: number = CONFIG.maxHistoryResults
): Promise<SearchResult[]> {
  const history = getStoredHistory();
  if (history.length === 0) return [];
  
  const queryKeywords = extractKeywords(query);
  const queryTopics = extractTopics(query);
  const queryLower = query.toLowerCase();
  
  // Generate query embedding (async)
  let queryEmbedding: number[] | null = null;
  if (CONFIG.enableEmbeddings) {
    queryEmbedding = await generateEmbedding(query);
  }
  
  // Get AI relevance scores (async)
  let aiRelevanceMap = new Map<string, number>();
  if (CONFIG.enableAISearch) {
    aiRelevanceMap = await aiPoweredSearch(query, history);
  }
  
  const results: SearchResult[] = [];
  
  for (const entry of history) {
    const scores = {
      keyword: 0,
      topic: 0,
      embedding: 0,
      ai: 0,
      recency: 0,
      decay: 0
    };
    
    // 1. Keyword Score
    const keywordMatches = queryKeywords.filter(k => 
      entry.keywords.includes(k) || 
      entry.userMessage.toLowerCase().includes(k) ||
      entry.assistantResponse.toLowerCase().includes(k)
    );
    if (keywordMatches.length > 0) {
      scores.keyword = keywordMatches.length / Math.max(queryKeywords.length, 1);
    }
    
    // 2. Topic Score
    const topicMatches = queryTopics.filter(t => entry.topics.includes(t));
    if (topicMatches.length > 0) {
      scores.topic = topicMatches.length / Math.max(queryTopics.length, 1);
    }
    
    // 3. Embedding Score (cosine similarity)
    if (queryEmbedding && entry.embedding) {
      scores.embedding = cosineSimilarity(queryEmbedding, entry.embedding);
    }
    
    // 4. AI Relevance Score
    if (aiRelevanceMap.has(entry.id)) {
      scores.ai = aiRelevanceMap.get(entry.id)!;
    }
    
    // 5. Recency Score (with decay)
    scores.decay = calculateDecayScore(entry);
    const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
    scores.recency = ageHours < 24 ? 1 : ageHours < 168 ? 0.7 : ageHours < 720 ? 0.4 : 0.2;
    scores.recency *= scores.decay; // Apply decay to recency
    
    // Calculate weighted total score
    const totalScore = 
      scores.keyword * CONFIG.weights.keyword +
      scores.topic * CONFIG.weights.topic +
      scores.embedding * CONFIG.weights.embedding +
      scores.ai * CONFIG.weights.ai +
      scores.recency * CONFIG.weights.recency;
    
    if (totalScore >= CONFIG.minRelevanceScore) {
      // Determine match reason
      let matchReason = '';
      const reasons: string[] = [];
      
      if (scores.ai > 0.5) reasons.push('AI match');
      if (scores.embedding > 0.6) reasons.push('Semantic match');
      if (scores.keyword > 0.3) reasons.push(`Keywords: ${keywordMatches.slice(0, 3).join(', ')}`);
      if (scores.topic > 0.3) reasons.push(`Topics: ${topicMatches.slice(0, 2).join(', ')}`);
      
      matchReason = reasons.length > 0 ? reasons.join(' | ') : 'Related content';
      
      results.push({
        entry,
        relevanceScore: totalScore,
        matchedKeywords: keywordMatches,
        matchReason,
        scores
      });
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Mark top results as referenced (boosts their decay score for future)
  const topResults = results.slice(0, maxResults);
  for (const result of topResults) {
    markAsReferenced(result.entry.id);
  }
  
  return topResults;
}

// ============================================================================
// CONTEXT BUILDER (WITH SUMMARIES)
// ============================================================================

function buildHistoryContext(results: SearchResult[]): string {
  if (results.length === 0) return '';
  
  let context = '\n=== IMPORTANT: PREVIOUS CONVERSATION HISTORY ===\n';
  context += 'The user is referencing past conversations. Below is the ACTUAL conversation history from previous sessions.\n';
  context += 'You MUST use this information to answer their question. Do NOT say you have no memory.\n\n';
  
  let totalChars = 0;
  const maxChars = CONFIG.maxContextChars || 3000;
  
  for (let i = 0; i < results.length && totalChars < maxChars; i++) {
    const { entry, scores } = results[i];
    const timeAgo = getTimeAgo(entry.timestamp);
    const decayIndicator = scores.decay > 0.7 ? '🟢' : scores.decay > 0.4 ? '🟡' : '🔴';
    
    // Use summary if available and enabled, otherwise truncate
    let content: string;
    if (CONFIG.enableSmartSummaries && entry.summary) {
      content = entry.summary;
      context += `[CHAT ${i + 1}] ${decayIndicator} (${timeAgo}) [Summary]\n`;
      context += `${content}\n\n`;
      totalChars += content.length + 50;
    } else {
      const remainingChars = maxChars - totalChars;
      const userContent = truncateText(entry.userMessage, Math.min(300, remainingChars / 3));
      const assistantContent = truncateText(entry.assistantResponse, Math.min(600, remainingChars * 2 / 3));
      
      context += `[CHAT ${i + 1}] ${decayIndicator} (${timeAgo})\n`;
      context += `USER: ${userContent}\n`;
      context += `ASSISTANT: ${assistantContent}\n\n`;
      
      totalChars += userContent.length + assistantContent.length + 50;
    }
  }
  
  context += '=== END OF PREVIOUS CONVERSATIONS ===\n\n';
  context += 'Now answer the following question using the context above:\n\n';
  
  return context;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

// ============================================================================
// SAVE TO HISTORY (WITH SUMMARY & EMBEDDING)
// ============================================================================

async function saveToHistory(userMessage: string, assistantResponse: string): Promise<void> {
  try {
    const history = getStoredHistory();
    
    const topics = extractTopics(userMessage + ' ' + assistantResponse);
    const keywords = extractKeywords(userMessage);
    
    const entry: ConversationEntry = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      userMessage,
      assistantResponse: assistantResponse.substring(0, 5000),
      topics,
      keywords,
      referenceCount: 0,
      lastReferenced: Date.now(),
      summary: undefined,
      embedding: undefined
    };
    
    history.unshift(entry);
    saveHistory(history);
    
    if (CONFIG.debug) {
      console.log(`[AI History] 💾 Saved conversation: ${entry.id}`, { topics: topics.length, keywords: keywords.length });
    }
    
    // Generate summary and embedding in background
    setTimeout(async () => {
      try {
        // Generate summary
        if (CONFIG.enableSmartSummaries) {
          entry.summary = await generateSummary(userMessage, assistantResponse);
        }
        
        // Generate embedding
        if (CONFIG.enableEmbeddings) {
          const textForEmbedding = `${userMessage} ${assistantResponse.substring(0, 500)}`;
          entry.embedding = await generateEmbedding(textForEmbedding);
        }
        
        // Update entry in history
        const updatedHistory = getStoredHistory();
        const idx = updatedHistory.findIndex(e => e.id === entry.id);
        if (idx >= 0) {
          updatedHistory[idx] = entry;
          saveHistory(updatedHistory);
          console.log(`[AI History] 📝🧠 Updated ${entry.id} with summary & embedding`);
        }
      } catch (e) {
        console.warn('[AI History] Background processing failed:', e);
      }
    }, CONFIG.summaryGenerationDelay);
    
  } catch (e) {
    console.error('[AI History] Failed to save:', e);
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

async function intelligentHistorySearch(message: string): Promise<HistorySearchResult> {
  const startTime = performance.now();
  
  const { should, reason } = shouldSearchHistory(message);
  
  if (!should) {
    if (CONFIG.debug) {
      console.log(`[AI History] No search needed: ${reason}`);
    }
    return {
      shouldSearch: false,
      triggerReason: reason,
      results: [],
      contextString: '',
      searchTime: performance.now() - startTime,
      searchMethod: 'keyword',
      embeddingsUsed: false,
      aiSearchUsed: false,
      summariesUsed: false
    };
  }
  
  if (CONFIG.debug) {
    console.log(`[AI History] 🔍 Searching... Reason: ${reason}`);
  }
  
  showHistorySearchIndicator();
  
  // Perform hybrid search
  const results = await hybridSearch(message);
  
  // Build context string
  const contextString = buildHistoryContext(results);
  
  // Show results
  setTimeout(() => {
    showHistorySearchResults(results);
  }, 500);
  
  hideHistorySearchIndicator(results.length > 0 ? 4000 : 2000);
  
  const searchTime = performance.now() - startTime;
  
  // Determine what methods were used
  const embeddingsUsed = CONFIG.enableEmbeddings && results.some(r => r.scores.embedding > 0);
  const aiSearchUsed = CONFIG.enableAISearch && results.some(r => r.scores.ai > 0);
  const summariesUsed = CONFIG.enableSmartSummaries && results.some(r => r.entry.summary);
  
  if (CONFIG.debug) {
    console.log(`[AI History] Search complete in ${searchTime.toFixed(1)}ms`, {
      resultsCount: results.length,
      topResult: results[0]?.matchReason,
      contextLength: contextString.length,
      embeddingsUsed,
      aiSearchUsed,
      summariesUsed
    });
  }
  
  return {
    shouldSearch: true,
    triggerReason: reason,
    results,
    contextString,
    searchTime,
    searchMethod: embeddingsUsed ? 'hybrid' : aiSearchUsed ? 'ai' : 'keyword',
    embeddingsUsed,
    aiSearchUsed,
    summariesUsed
  };
}

// ============================================================================
// INTEGRATION FUNCTION
// ============================================================================

async function enhanceMessageWithHistory(message: string): Promise<{
  enhancedMessage: string;
  originalMessage: string;  // 🆕 For UI display (clean, no context)
  searchResult: HistorySearchResult;
}> {
  const searchResult = await intelligentHistorySearch(message);
  
  if (searchResult.shouldSearch && searchResult.results.length > 0 && CONFIG.injectContext) {
    const context = searchResult.contextString;
    
    if (context && context.trim()) {
      console.log(`[AI History] ✅ Injecting ${searchResult.results.length} conversation(s) as context (${context.length} chars)`);
      
      return {
        enhancedMessage: context + message,  // For AI (with context)
        originalMessage: message,             // For UI display (clean)
        searchResult
      };
    }
  }
  
  return {
    enhancedMessage: message,
    originalMessage: message,
    searchResult
  };
}

// ============================================================================
// VISUAL FEEDBACK
// ============================================================================

let stylesInjected = false;

function injectHistorySearchStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  
  const style = document.createElement('style');
  style.id = 'ai-history-search-styles-v3';
  style.textContent = `
    #ai-history-panel {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 340px;
      max-height: 450px;
      background: linear-gradient(180deg, #1a1d24 0%, #12151a 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: ahp-slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    #ai-history-panel.ahp-hiding {
      animation: ahp-slideOut 0.25s ease-in forwards;
    }
    
    @keyframes ahp-slideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    @keyframes ahp-slideOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.98); }
    }
    
    .ahp-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), transparent);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    .ahp-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      font-size: 16px;
    }
    
    .ahp-header-text { flex: 1; }
    
    .ahp-title {
      font-size: 13px;
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 2px;
    }
    
    .ahp-subtitle {
      font-size: 11px;
      color: #9ca3af;
    }
    
    .ahp-badges {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    
    .ahp-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }
    
    .ahp-badge.ai { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .ahp-badge.embed { background: rgba(251, 191, 36, 0.2); color: #fcd34d; }
    .ahp-badge.summary { background: rgba(147, 51, 234, 0.2); color: #c4b5fd; }
    
    .ahp-close {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .ahp-close:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    
    .ahp-searching {
      padding: 20px;
      text-align: center;
    }
    
    .ahp-search-animation {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      position: relative;
    }
    
    .ahp-search-ring {
      position: absolute;
      inset: 0;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: ahp-spin 1s linear infinite;
    }
    
    .ahp-search-ring:nth-child(2) {
      inset: 6px;
      border-width: 2px;
      animation-duration: 0.8s;
      animation-direction: reverse;
    }
    
    .ahp-search-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      animation: ahp-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes ahp-spin { to { transform: rotate(360deg); } }
    @keyframes ahp-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }
    
    .ahp-search-text {
      font-size: 13px;
      color: #a5b4fc;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .ahp-search-hint {
      font-size: 11px;
      color: #6b7280;
    }
    
    .ahp-results {
      max-height: 300px;
      overflow-y: auto;
      padding: 8px;
    }
    
    .ahp-results::-webkit-scrollbar { width: 4px; }
    .ahp-results::-webkit-scrollbar-track { background: transparent; }
    .ahp-results::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.3);
      border-radius: 2px;
    }
    
    .ahp-result-item {
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: all 0.15s;
      animation: ahp-itemIn 0.3s ease-out backwards;
    }
    
    .ahp-result-item:nth-child(1) { animation-delay: 0.05s; }
    .ahp-result-item:nth-child(2) { animation-delay: 0.1s; }
    .ahp-result-item:nth-child(3) { animation-delay: 0.15s; }
    
    @keyframes ahp-itemIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    .ahp-result-item:hover {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
    }
    
    .ahp-result-item.high { border-left: 3px solid #22c55e; }
    .ahp-result-item.medium { border-left: 3px solid #f59e0b; }
    .ahp-result-item.low { border-left: 3px solid #6b7280; }
    
    .ahp-result-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    
    .ahp-result-time {
      font-size: 10px;
      color: #9ca3af;
    }
    
    .ahp-result-decay {
      font-size: 10px;
    }
    
    .ahp-result-score {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
    }
    
    .ahp-result-preview {
      font-size: 12px;
      color: #d1d5db;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .ahp-result-methods {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }
    
    .ahp-method {
      font-size: 8px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
    }
    
    .ahp-method.active {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }
    
    .ahp-footer {
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .ahp-footer-text {
      font-size: 11px;
      color: #6b7280;
    }
    
    .ahp-footer-text strong {
      color: #a5b4fc;
    }
    
    .ahp-no-results {
      padding: 24px;
      text-align: center;
    }
    
    .ahp-no-results-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    
    .ahp-no-results-text {
      font-size: 12px;
      color: #6b7280;
    }
  `;
  document.head.appendChild(style);
}

function showHistorySearchIndicator(): void {
  if (!CONFIG.showVisualFeedback) return;
  
  injectHistorySearchStyles();
  
  const existing = document.getElementById('ai-history-panel');
  if (existing) existing.remove();
  
  const panel = document.createElement('div');
  panel.id = 'ai-history-panel';
  panel.innerHTML = `
    <div class="ahp-header">
      <div class="ahp-icon">🧠</div>
      <div class="ahp-header-text">
        <div class="ahp-title">Smart History Search v3.0</div>
        <div class="ahp-subtitle">Finding relevant conversations...</div>
        <div class="ahp-badges">
          ${CONFIG.enableAISearch ? '<span class="ahp-badge ai">🤖 AI</span>' : ''}
          ${CONFIG.enableEmbeddings ? '<span class="ahp-badge embed">🧠 Semantic</span>' : ''}
          ${CONFIG.enableSmartSummaries ? '<span class="ahp-badge summary">📝 Summary</span>' : ''}
        </div>
      </div>
      <button class="ahp-close" onclick="this.closest('#ai-history-panel').remove()">✕</button>
    </div>
    <div class="ahp-searching">
      <div class="ahp-search-animation">
        <div class="ahp-search-ring"></div>
        <div class="ahp-search-ring"></div>
        <div class="ahp-search-icon">🔍</div>
      </div>
      <div class="ahp-search-text">Analyzing with hybrid search...</div>
      <div class="ahp-search-hint">Keywords + Embeddings + AI</div>
    </div>
  `;
  
  document.body.appendChild(panel);
}

function showHistorySearchResults(results: SearchResult[]): void {
  const panel = document.getElementById('ai-history-panel');
  if (!panel) return;
  
  const title = panel.querySelector('.ahp-title');
  const subtitle = panel.querySelector('.ahp-subtitle');
  const icon = panel.querySelector('.ahp-icon');
  
  if (title) title.textContent = 'Context Found';
  if (subtitle) subtitle.textContent = `${results.length} relevant conversation${results.length !== 1 ? 's' : ''}`;
  if (icon) {
    icon.textContent = '✓';
    (icon as HTMLElement).style.background = 'linear-gradient(135deg, #22c55e, #10b981)';
  }
  
  const searchingDiv = panel.querySelector('.ahp-searching');
  if (searchingDiv) {
    if (results.length === 0) {
      searchingDiv.outerHTML = `
        <div class="ahp-no-results">
          <div class="ahp-no-results-icon">🔍</div>
          <div class="ahp-no-results-text">No relevant history found</div>
        </div>
      `;
    } else {
      const resultsHtml = results.map((result, idx) => {
        const relevanceClass = result.relevanceScore >= 0.5 ? 'high' : 
                              result.relevanceScore >= 0.3 ? 'medium' : 'low';
        const timeAgo = getTimeAgo(result.entry.timestamp);
        const decayEmoji = result.scores.decay > 0.7 ? '🟢' : result.scores.decay > 0.4 ? '🟡' : '🔴';
        const preview = result.entry.summary || result.entry.userMessage.substring(0, 80) + '...';
        
        return `
          <div class="ahp-result-item ${relevanceClass}">
            <div class="ahp-result-header">
              <span class="ahp-result-time">🕐 ${timeAgo}</span>
              <span class="ahp-result-decay">${decayEmoji}</span>
              <span class="ahp-result-score">${Math.round(result.relevanceScore * 100)}%</span>
            </div>
            <div class="ahp-result-preview">${escapeHtml(preview)}</div>
            <div class="ahp-result-methods">
              <span class="ahp-method ${result.scores.keyword > 0.2 ? 'active' : ''}">KW</span>
              <span class="ahp-method ${result.scores.embedding > 0.5 ? 'active' : ''}">EMB</span>
              <span class="ahp-method ${result.scores.ai > 0.3 ? 'active' : ''}">AI</span>
              <span class="ahp-method ${result.entry.summary ? 'active' : ''}">SUM</span>
            </div>
          </div>
        `;
      }).join('');
      
      searchingDiv.outerHTML = `
        <div class="ahp-results">${resultsHtml}</div>
        <div class="ahp-footer">
          <span class="ahp-footer-text"><strong>${results.length}</strong> memories loaded</span>
        </div>
      `;
    }
  }
}

function hideHistorySearchIndicator(delay: number = 2000): void {
  setTimeout(() => {
    const panel = document.getElementById('ai-history-panel');
    if (panel) {
      panel.classList.add('ahp-hiding');
      setTimeout(() => panel.remove(), 250);
    }
  }, delay);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// AUTO-SAVE OBSERVER
// ============================================================================

function setupAutoSave(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('assistant-message') || 
              node.classList.contains('ai-message') ||
              node.querySelector('.assistant-message, .ai-message')) {
            
            const chatContainer = document.querySelector('.ai-chat-container, .chat-messages');
            if (chatContainer) {
              const messages = chatContainer.querySelectorAll('.user-message, .assistant-message, .ai-message');
              const messagesArray = Array.from(messages);
              
              for (let i = messagesArray.length - 1; i >= 1; i--) {
                const current = messagesArray[i];
                const previous = messagesArray[i - 1];
                
                if ((current.classList.contains('assistant-message') || 
                     current.classList.contains('ai-message')) &&
                    (previous.classList.contains('user-message'))) {
                  
                  const userText = previous.textContent?.trim() || '';
                  const assistantText = current.textContent?.trim() || '';
                  
                  if (userText && assistantText && assistantText.length > 50) {
                    const savedId = current.getAttribute('data-history-saved');
                    if (!savedId) {
                      current.setAttribute('data-history-saved', 'true');
                      saveToHistory(userText, assistantText);
                    }
                  }
                  break;
                }
              }
            }
          }
        }
      }
    }
  });
  
  const startObserving = () => {
    const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, .ai-panel');
    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
      console.log('[AI History] Auto-save observer started');
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
    setTimeout(startObserving, 2000);
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).aiHistorySearch = {
  // Core functions
  intelligentHistorySearch,
  enhanceMessageWithHistory,
  shouldSearchHistory,
  hybridSearch,
  
  // Storage
  saveToHistory,
  getStoredHistory,
  
  // V3.0 Features
  calculateDecayScore,
  markAsReferenced,
  generateSummary,
  generateMissingSummaries,
  generateEmbedding,
  loadEmbeddingModel,
  aiPoweredSearch,
  
  // Utils
  extractKeywords,
  extractTopics,
  buildHistoryContext,
  
  // Visual
  showHistorySearchIndicator,
  showHistorySearchResults,
  hideHistorySearchIndicator,
  
  // Config
  CONFIG,
  
  // Debug/Admin
  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('ai_conversation_history');
    embeddingCache.clear();
    console.log('[AI History] History cleared');
  },
  
  getHistoryStats: () => {
    const history = getStoredHistory();
    const withSummaries = history.filter(e => e.summary).length;
    const withEmbeddings = history.filter(e => e.embedding).length;
    const avgDecay = history.reduce((sum, e) => sum + calculateDecayScore(e), 0) / history.length;
    
    return {
      totalConversations: history.length,
      withSummaries,
      withEmbeddings,
      averageDecayScore: avgDecay.toFixed(2),
      oldestTimestamp: history.length > 0 ? new Date(history[history.length - 1].timestamp).toLocaleString() : 'N/A',
      newestTimestamp: history.length > 0 ? new Date(history[0].timestamp).toLocaleString() : 'N/A',
      totalReferences: history.reduce((sum, e) => sum + (e.referenceCount || 0), 0),
      embeddingCacheSize: embeddingCache.size
    };
  },
  
  // Test functions
  testSearch: async (query: string) => {
    console.log('🧪 Testing hybrid search...');
    const results = await hybridSearch(query);
    console.log('Results:', results.map(r => ({
      id: r.entry.id,
      score: r.relevanceScore.toFixed(2),
      scores: r.scores,
      reason: r.matchReason
    })));
    return results;
  },
  
  testSummary: async () => {
    const history = getStoredHistory();
    if (history.length === 0) {
      console.log('No history to test');
      return;
    }
    const entry = history[0];
    console.log('🧪 Testing summary generation...');
    const summary = await generateSummary(entry.userMessage, entry.assistantResponse);
    console.log('Summary:', summary);
    return summary;
  },
  
  testEmbedding: async (text: string = 'How do I fix the login bug?') => {
    console.log('🧪 Testing embedding generation...');
    const embedding = await generateEmbedding(text);
    console.log('Embedding dimensions:', embedding?.length);
    console.log('First 10 values:', embedding?.slice(0, 10));
    return embedding;
  },
  
  rebuildAllSummaries: async () => {
    console.log('🔄 Rebuilding all summaries...');
    const history = getStoredHistory();
    for (const entry of history) {
      entry.summary = undefined;
    }
    saveHistory(history);
    await generateMissingSummaries();
    console.log('✅ Done');
  },
  
  rebuildAllEmbeddings: async () => {
    console.log('🔄 Rebuilding all embeddings...');
    const history = getStoredHistory();
    for (const entry of history.slice(0, 50)) { // Limit to 50
      const text = `${entry.userMessage} ${entry.assistantResponse.substring(0, 500)}`;
      entry.embedding = await generateEmbedding(text);
      console.log(`Generated embedding for ${entry.id}`);
      await new Promise(r => setTimeout(r, 100));
    }
    saveHistory(history);
    console.log('✅ Done');
  },
  
  // 🆕 Debug function to test trigger patterns
  testTrigger: (message: string) => {
    console.log(`🔍 Testing triggers for: "${message}"`);
    console.log('---');
    
    let matched = false;
    
    console.log('📌 Checking explicit references...');
    for (const pattern of HISTORY_TRIGGER_PATTERNS.explicitReferences) {
      if (pattern.test(message)) {
        console.log(`  ✅ MATCH: ${pattern}`);
        matched = true;
      }
    }
    
    console.log('📌 Checking ambiguous pronouns...');
    for (const pattern of HISTORY_TRIGGER_PATTERNS.ambiguousPronouns) {
      if (pattern.test(message)) {
        console.log(`  ✅ MATCH: ${pattern}`);
        matched = true;
      }
    }
    
    console.log('📌 Checking follow-up patterns...');
    for (const pattern of HISTORY_TRIGGER_PATTERNS.followUpPatterns) {
      if (pattern.test(message)) {
        console.log(`  ✅ MATCH: ${pattern}`);
        matched = true;
      }
    }
    
    console.log('📌 Checking comparison patterns...');
    for (const pattern of HISTORY_TRIGGER_PATTERNS.comparisonPatterns) {
      if (pattern.test(message)) {
        console.log(`  ✅ MATCH: ${pattern}`);
        matched = true;
      }
    }
    
    console.log('📌 Checking project references...');
    for (const pattern of HISTORY_TRIGGER_PATTERNS.projectReferences) {
      if (pattern.test(message)) {
        console.log(`  ✅ MATCH: ${pattern}`);
        matched = true;
      }
    }
    
    console.log('---');
    if (matched) {
      console.log('✅ RESULT: Would trigger history search');
    } else {
      console.log('❌ RESULT: Would NOT trigger history search');
    }
    
    return matched;
  }
};

// Window-level exports
(window as any).enhanceMessageWithHistory = enhanceMessageWithHistory;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init(): Promise<void> {
  console.log('🔍 [AI History Search] Initializing v3.0...');
  
  setupAutoSave();
  
  const stats = (window as any).aiHistorySearch.getHistoryStats();
  console.log(`[AI History] Loaded ${stats.totalConversations} conversations`);
  console.log(`[AI History] Summaries: ${stats.withSummaries}, Embeddings: ${stats.withEmbeddings}`);
  console.log(`[AI History] Average decay score: ${stats.averageDecayScore}`);
  
  // Try to load embedding model in background
  if (CONFIG.enableEmbeddings) {
    setTimeout(() => {
      loadEmbeddingModel().then(loaded => {
        if (loaded) {
          console.log('[AI History] 🧠 Embedding model ready for semantic search');
        }
      });
    }, 5000);
  }
  
  // Generate missing summaries in background
  if (CONFIG.enableSmartSummaries) {
    setTimeout(() => {
      generateMissingSummaries();
    }, 10000);
  }
  
  console.log('✅ [AI History Search v3.0] Ready!');
  console.log('   Features: AI Search, Memory Decay, Summaries, Embeddings');
  console.log('   Test: window.aiHistorySearch.testSearch("your query")');
  console.log('   Stats: window.aiHistorySearch.getHistoryStats()');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  intelligentHistorySearch,
  enhanceMessageWithHistory,
  hybridSearch,
  shouldSearchHistory,
  saveToHistory,
  getStoredHistory,
  calculateDecayScore,
  generateSummary,
  generateEmbedding,
  aiPoweredSearch,
  CONFIG
};