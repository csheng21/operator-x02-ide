// aiProjectSearchFix.ts - v7.0 AGGRESSIVE FIX
// ============================================================================
// FIXES:
// 1. Earlier initialization (before main.ts caches references)
// 2. Uses Object.defineProperty for persistent patching
// 3. Intercepts Tauri invoke calls (for Groq API etc)
// 4. Also patches fetch as backup
// ============================================================================

const DEBUG = true;
const VERSION = '7.0';
const log = (...args: any[]) => DEBUG && console.log(`[🔍 AI Search v${VERSION}]`, ...args);

// ============================================================================
// PART 1: File Scanner - Get files from DOM with correct paths
// ============================================================================

interface ProjectFile {
  name: string;
  path: string;
  score?: number;
}

function getProjectFilesFromDOM(): ProjectFile[] {
  const files: ProjectFile[] = [];
  const seen = new Set<string>();
  
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path') || '';
    if (!path || seen.has(path)) return;
    if (path.includes('node_modules') || path.includes('.git')) return;
    
    const parts = path.split(/[/\\]/);
    const name = parts[parts.length - 1];
    
    if (parts.length < 3) return;
    if (!name.includes('.') || name.startsWith('.')) return;
    
    seen.add(path);
    files.push({ name, path, score: 0 });
  });
  
  log('Found', files.length, 'files in DOM');
  return files;
}

function getProjectPath(): string {
  return (window as any).currentFolderPath || 
         (window as any).currentProjectPath ||
         (window as any).__currentFolder?.path || '';
}

// ============================================================================
// PART 2: File Scoring - Prioritize directly mentioned files
// ============================================================================

function scoreFilesForQuery(files: ProjectFile[], query: string): ProjectFile[] {
  const queryLower = query.toLowerCase();
  const results: ProjectFile[] = [];
  
  // Extract file names mentioned in query
  const fileNamePattern = /\b([\w\-\.]+\.\w{1,10})\b/gi;
  const mentionedFiles = [...query.matchAll(fileNamePattern)].map(m => m[1].toLowerCase());
  
  log('Query mentions files:', mentionedFiles);
  
  for (const file of files) {
    const nameLower = file.name.toLowerCase();
    const ext = nameLower.split('.').pop() || '';
    let score = 0;
    
    // EXACT file name match - highest priority
    if (mentionedFiles.includes(nameLower)) {
      score += 500;
      log('✅ EXACT match:', file.name);
    }
    
    // Partial match (base name)
    for (const mentioned of mentionedFiles) {
      const base = mentioned.split('.')[0].toLowerCase();
      if (base && base.length > 2 && nameLower.includes(base)) {
        score += 300;
      }
    }
    
    // Keyword matches
    if ((queryLower.includes('readme') || queryLower.includes('summary') || 
         queryLower.includes('about') || queryLower.includes('document')) && 
        (nameLower.includes('readme') || ext === 'md')) {
      score += 150;
    }
    
    if ((queryLower.includes('config') || queryLower.includes('setting')) && 
        (nameLower.includes('config') || ext === 'json' || ext === 'h')) {
      score += 100;
    }
    
    if ((queryLower.includes('main') || queryLower.includes('sketch') || queryLower.includes('code')) && 
        (nameLower.startsWith('main') || ext === 'ino')) {
      score += 100;
    }
    
    // Baseline scores for important files
    if (nameLower === 'readme.md') score += 50;
    if (nameLower === 'package.json') score += 40;
    if (ext === 'ino') score += 40;
    if (ext === 'h') score += 30;
    
    if (score > 0) {
      results.push({ ...file, score });
    }
  }
  
  // Fallback: return top files if no matches
  if (results.length === 0) {
    log('No keyword matches, returning top files');
    return files.slice(0, 10).map(f => {
      const nameLower = f.name.toLowerCase();
      let score = 10;
      if (nameLower === 'readme.md') score = 100;
      if (nameLower === 'package.json') score = 90;
      if (nameLower.endsWith('.ino')) score = 85;
      return { ...f, score };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  
  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}

// ============================================================================
// PART 3: FILE READER - Using WORKING method window.fileSystem.readFile()
// ============================================================================

async function readFileContent(filePath: string, maxChars: number = 4000): Promise<string> {
  log('📖 Reading:', filePath);
  
  // METHOD 1: window.fileSystem.readFile() - CONFIRMED WORKING!
  try {
    const fileSystem = (window as any).fileSystem;
    if (fileSystem?.readFile) {
      const content = await fileSystem.readFile(filePath);
      if (content && typeof content === 'string') {
        log('✅ Read via fileSystem.readFile:', content.length, 'chars');
        return content.substring(0, maxChars);
      }
    }
  } catch (e: any) {
    log('fileSystem.readFile error:', e.message || e);
  }
  
  // METHOD 2: window.readFile (wrapper)
  try {
    const readFileFn = (window as any).readFile;
    if (readFileFn) {
      const result = await readFileFn(filePath);
      if (result?.content) {
        log('✅ Read via window.readFile:', result.content.length, 'chars');
        return result.content.substring(0, maxChars);
      }
    }
  } catch (e: any) {
    log('window.readFile error:', e.message || e);
  }
  
  // METHOD 3: Check cached content in __currentFolder
  try {
    const folder = (window as any).__currentFolder;
    const fileName = filePath.split(/[/\\]/).pop() || '';
    if (folder?.fileContents?.[fileName]) {
      const content = folder.fileContents[fileName];
      log('✅ Read from cache:', content.length, 'chars');
      return content.substring(0, maxChars);
    }
  } catch (e) {
    // ignore
  }
  
  // METHOD 4: Try Tauri invoke as fallback
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_content', { path: filePath }) as string;
    if (content) {
      log('✅ Read via Tauri invoke:', content.length, 'chars');
      return content.substring(0, maxChars);
    }
  } catch (e: any) {
    log('Tauri invoke error:', e.message || e);
  }
  
  log('❌ Failed to read:', filePath);
  return '';
}

// ============================================================================
// PART 4: Build Complete Context with File Contents
// ============================================================================

async function buildCompleteContext(query: string): Promise<string> {
  const files = getProjectFilesFromDOM();
  const projectPath = getProjectPath();
  
  if (files.length === 0) {
    log('No files found');
    return '';
  }
  
  const projectName = projectPath.split(/[/\\]/).pop() || 'Project';
  
  // Detect project type
  const fileNames = files.map(f => f.name.toLowerCase());
  let projectType = 'Unknown';
  if (fileNames.some(f => f.endsWith('.ino'))) projectType = 'Arduino';
  else if (fileNames.includes('package.json')) projectType = 'Node.js/React';
  else if (fileNames.includes('cargo.toml')) projectType = 'Rust';
  else if (fileNames.includes('requirements.txt')) projectType = 'Python';
  
  // Score files for query
  const scoredFiles = scoreFilesForQuery(files, query);
  log('Top scored files:', scoredFiles.slice(0, 3).map(f => `${f.name}(${f.score})`));
  
  // Build context header
  let context = `\n[📂 PROJECT CONTEXT - AI Search Active]\n`;
  context += `📦 Project: ${projectName}\n`;
  context += `🔧 Type: ${projectType}\n`;
  context += `📄 Files (${files.length}): ${files.map(f => f.name).join(', ')}\n`;
  context += `🎯 Most Relevant: ${scoredFiles.slice(0, 3).map(f => f.name).join(', ')}\n`;
  context += `---\n`;
  
  // Read content of top scored files
  const MAX_TOTAL_CHARS = 15000;
  let totalChars = 0;
  let filesRead = 0;
  
  context += `\n[📖 FILE CONTENTS]\n`;
  
  for (const file of scoredFiles.slice(0, 5)) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    
    const remaining = MAX_TOTAL_CHARS - totalChars;
    const content = await readFileContent(file.path, Math.min(4000, remaining));
    
    if (content && content.length > 0) {
      const ext = file.name.split('.').pop() || '';
      const langMap: Record<string, string> = {
        'ts': 'typescript', 'tsx': 'tsx', 'js': 'javascript', 'jsx': 'jsx',
        'json': 'json', 'md': 'markdown', 'h': 'c', 'c': 'c', 'cpp': 'cpp',
        'ino': 'cpp', 'py': 'python', 'rs': 'rust', 'css': 'css', 'html': 'html'
      };
      const lang = langMap[ext] || ext;
      
      context += `\n📄 **${file.name}**\n`;
      context += `\`\`\`${lang}\n${content}\n\`\`\`\n`;
      totalChars += content.length;
      filesRead++;
      
      log(`✅ Added ${file.name}: ${content.length} chars`);
    }
  }
  
  if (filesRead === 0) {
    context += `\n⚠️ Could not read file contents.\n`;
  }
  
  context += `\n---\n`;
  
  log(`Built context: ${filesRead} files, ${totalChars} chars total`);
  return context;
}

// ============================================================================
// PART 5: AGGRESSIVE aiFileExplorer Patching
// ============================================================================

let isPatchInstalled = false;

function patchAIFileExplorer(): void {
  log('Attempting to patch aiFileExplorer...');
  
  // Create our replacement read function
  const patchedRead = async function(filePath: string, maxChars: number = 4000): Promise<string | null> {
    log('📖 [PATCHED read] Called for:', filePath);
    const content = await readFileContent(filePath, maxChars);
    log('📖 [PATCHED read] Result:', content ? `${content.length} chars` : 'null');
    return content || null;
  };

  // Method 1: Direct patch if aiFileExplorer exists
  const aiFileExplorer = (window as any).aiFileExplorer;
  if (aiFileExplorer) {
    log('Found aiFileExplorer, patching directly...');
    
    // Store original for debugging
    (window as any).__originalAIFileExplorerRead = aiFileExplorer.read;
    
    // Patch using Object.defineProperty for persistence
    try {
      Object.defineProperty(aiFileExplorer, 'read', {
        value: patchedRead,
        writable: true,
        configurable: true
      });
      log('✅ Patched aiFileExplorer.read via defineProperty');
    } catch (e) {
      // Fallback to direct assignment
      aiFileExplorer.read = patchedRead;
      log('✅ Patched aiFileExplorer.read via direct assignment');
    }
    
    // Also patch findRelated and getFiles
    aiFileExplorer.findRelated = async function(query: string): Promise<ProjectFile[]> {
      const allFiles = getProjectFilesFromDOM();
      const scored = scoreFilesForQuery(allFiles, query);
      log('[PATCHED findRelated]:', scored.length, 'results');
      return scored.slice(0, 15);
    };
    
    aiFileExplorer.getFiles = getProjectFilesFromDOM;
    
    isPatchInstalled = true;
    log('✅ aiFileExplorer fully patched!');
  } else {
    log('aiFileExplorer not found yet...');
  }
  
  // Method 2: Set up a watcher for when aiFileExplorer gets created
  if (!(window as any).__aiFileExplorerWatcherInstalled) {
    let currentValue = (window as any).aiFileExplorer;
    
    Object.defineProperty(window, 'aiFileExplorer', {
      get() {
        return currentValue;
      },
      set(newValue) {
        log('🔔 aiFileExplorer was set!');
        currentValue = newValue;
        
        // Immediately patch the new value
        if (newValue && typeof newValue === 'object') {
          setTimeout(() => {
            newValue.read = patchedRead;
            newValue.findRelated = async function(query: string): Promise<ProjectFile[]> {
              const allFiles = getProjectFilesFromDOM();
              const scored = scoreFilesForQuery(allFiles, query);
              return scored.slice(0, 15);
            };
            newValue.getFiles = getProjectFilesFromDOM;
            log('✅ aiFileExplorer auto-patched on creation!');
            isPatchInstalled = true;
          }, 0);
        }
      },
      configurable: true,
      enumerable: true
    });
    
    (window as any).__aiFileExplorerWatcherInstalled = true;
    log('✅ aiFileExplorer watcher installed');
  }
}

// ============================================================================
// PART 6: Tauri Invoke Interceptor - For API calls routed through Tauri
// ============================================================================

let tauriPatched = false;

async function installTauriInterceptor(): Promise<void> {
  if (tauriPatched) return;
  
  try {
    const tauriCore = await import('@tauri-apps/api/core');
    const originalInvoke = tauriCore.invoke;
    
    // Store original
    (window as any).__originalTauriInvoke = originalInvoke;
    
    // Create patched invoke
    const patchedInvoke = async function(cmd: string, args?: any): Promise<any> {
      // Intercept AI API calls
      if (cmd === 'groq_chat' || cmd === 'openai_chat' || cmd === 'anthropic_chat' || 
          cmd === 'deepseek_chat' || cmd === 'gemini_chat' || cmd.includes('_chat')) {
        
        const isAISearchEnabled = localStorage.getItem('aiFileExplorerEnabled') === 'true';
        
        if (isAISearchEnabled && args?.messages && Array.isArray(args.messages)) {
          log('🔄 Intercepted Tauri invoke:', cmd);
          
          const lastUserMsg = args.messages.findLast((m: any) => m.role === 'user');
          
          if (lastUserMsg && typeof lastUserMsg.content === 'string') {
            // Check if file contents are missing
            if (!lastUserMsg.content.includes('[📖 FILE CONTENTS]') &&
                !lastUserMsg.content.includes('```')) {
              
              log('Injecting file contents into Tauri invoke...');
              
              const context = await buildCompleteContext(lastUserMsg.content);
              if (context && context.includes('```')) {
                lastUserMsg.content = context + '\n[USER QUESTION]\n' + lastUserMsg.content;
                log('✅ File contents injected into Tauri invoke!');
              }
            } else {
              log('Context already present in Tauri invoke');
            }
          }
        }
      }
      
      return originalInvoke(cmd, args);
    };
    
    // Replace the invoke function
    (tauriCore as any).invoke = patchedInvoke;
    
    // Also patch on window if available
    if ((window as any).__TAURI_INTERNALS__?.invoke) {
      (window as any).__TAURI_INTERNALS__.__originalInvoke = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = patchedInvoke;
    }
    
    tauriPatched = true;
    log('✅ Tauri invoke interceptor installed');
  } catch (e) {
    log('Could not patch Tauri invoke (may not be Tauri app):', e);
  }
}

// ============================================================================
// PART 7: Fetch Interceptor - Backup for browser-based API calls
// ============================================================================

let fetchPatched = false;

function installFetchInterceptor(): void {
  if (fetchPatched) return;
  
  const originalFetch = window.fetch;
  (window as any).__originalFetch = originalFetch;
  
  window.fetch = async function(...args: any[]) {
    const [url, options] = args;
    
    // Check if this is an AI API call
    if (typeof url === 'string' && 
        (url.includes('api.deepseek.com') || 
         url.includes('api.openai.com') || 
         url.includes('api.anthropic.com') ||
         url.includes('api.groq.com') ||
         url.includes('generativelanguage.googleapis.com'))) {
      
      const isAISearchEnabled = localStorage.getItem('aiFileExplorerEnabled') === 'true';
      
      if (isAISearchEnabled && options?.body) {
        try {
          const body = JSON.parse(options.body as string);
          
          if (body.messages && Array.isArray(body.messages)) {
            const lastUserMsg = body.messages.findLast((m: any) => m.role === 'user');
            
            if (lastUserMsg && typeof lastUserMsg.content === 'string') {
              // Check if file contents are missing
              if (!lastUserMsg.content.includes('[📖 FILE CONTENTS]') &&
                  !lastUserMsg.content.includes('```')) {
                
                log('🔄 Fetch intercepted - injecting file contents...');
                
                const context = await buildCompleteContext(lastUserMsg.content);
                if (context && context.includes('```')) {
                  lastUserMsg.content = context + '\n[USER QUESTION]\n' + lastUserMsg.content;
                  options.body = JSON.stringify(body);
                  log('✅ File contents injected into fetch!');
                }
              } else {
                log('Context already present, skipping injection');
              }
            }
          }
        } catch (e) {
          log('Fetch intercept error:', e);
        }
      }
    }
    
    return originalFetch.apply(window, args as any);
  };
  
  fetchPatched = true;
  log('✅ Fetch interceptor installed');
}

// ============================================================================
// PART 8: Message Builder Patch - Direct injection point
// ============================================================================

function patchMessageBuilder(): void {
  // Look for the message building functions in the window
  const possibleTargets = [
    'buildMessages',
    'prepareMessages', 
    'formatMessages',
    'chatManager',
    'aiAssistant'
  ];
  
  for (const target of possibleTargets) {
    const obj = (window as any)[target];
    if (obj && typeof obj === 'object') {
      log(`Found potential target: ${target}`);
      // Could add specific patches here if we identify the exact function
    }
  }
}

// ============================================================================
// PART 9: Debug Helpers
// ============================================================================

function exposeDebugHelpers(): void {
  (window as any).aiSearchDebug = {
    version: VERSION,
    getFiles: getProjectFilesFromDOM,
    score: (q: string) => scoreFilesForQuery(getProjectFilesFromDOM(), q),
    readFile: readFileContent,
    buildContext: buildCompleteContext,
    isEnabled: () => localStorage.getItem('aiFileExplorerEnabled') === 'true',
    enable: () => {
      localStorage.setItem('aiFileExplorerEnabled', 'true');
      console.log('✅ AI Search ENABLED');
    },
    disable: () => {
      localStorage.setItem('aiFileExplorerEnabled', 'false');
      console.log('AI Search DISABLED');
    },
    repatch: () => {
      log('Force re-patching...');
      isPatchInstalled = false;
      tauriPatched = false;
      fetchPatched = false;
      patchAIFileExplorer();
      installTauriInterceptor();
      installFetchInterceptor();
      console.log('✅ Re-patched all interceptors');
    },
    status: () => {
      console.log('========================================');
      console.log(`AI Search Fix v${VERSION} Status`);
      console.log('========================================');
      console.log('AI Search Enabled:', localStorage.getItem('aiFileExplorerEnabled') === 'true');
      console.log('aiFileExplorer patched:', isPatchInstalled);
      console.log('Tauri interceptor:', tauriPatched);
      console.log('Fetch interceptor:', fetchPatched);
      console.log('aiFileExplorer exists:', !!(window as any).aiFileExplorer);
      console.log('aiFileExplorer.read is patched:', 
        (window as any).aiFileExplorer?.read?.toString()?.includes('PATCHED'));
      console.log('========================================');
    },
    test: async (query: string) => {
      console.log('========================================');
      console.log(`AI SEARCH DEBUG TEST v${VERSION}`);
      console.log('========================================');
      console.log('Query:', query);
      console.log('AI Search Enabled:', localStorage.getItem('aiFileExplorerEnabled'));
      console.log('');
      
      const files = getProjectFilesFromDOM();
      console.log('📁 Files in project:', files.length);
      files.forEach(f => console.log('  -', f.name, '→', f.path));
      console.log('');
      
      const scored = scoreFilesForQuery(files, query);
      console.log('🎯 Scored results:');
      scored.slice(0, 5).forEach(f => console.log(`  - ${f.name}: ${f.score} points`));
      console.log('');
      
      if (scored.length > 0) {
        console.log('📖 Testing file read for:', scored[0].path);
        const content = await readFileContent(scored[0].path, 500);
        if (content) {
          console.log('✅ Content preview:', content.substring(0, 200) + '...');
        } else {
          console.log('❌ FAILED to read file');
        }
      }
      
      console.log('');
      console.log('📝 Building full context...');
      const ctx = await buildCompleteContext(query);
      console.log('Context length:', ctx.length, 'chars');
      console.log('Has code blocks:', ctx.includes('```'));
      
      // Check if aiFileExplorer.read is our patched version
      console.log('');
      console.log('🔧 Patch Status:');
      console.log('aiFileExplorer exists:', !!(window as any).aiFileExplorer);
      if ((window as any).aiFileExplorer) {
        const readFn = (window as any).aiFileExplorer.read;
        console.log('read function:', readFn ? readFn.toString().substring(0, 100) + '...' : 'missing');
      }
      
      console.log('========================================');
      console.log('END TEST');
      console.log('========================================');
      
      return { files, scored, contextLength: ctx.length };
    }
  };
  
  log(`Debug: window.aiSearchDebug available (v${VERSION})`);
}

// ============================================================================
// INITIALIZATION - Run as early as possible
// ============================================================================

function initialize(): void {
  log('========================================');
  log(`AI Project Search Fix v${VERSION}`);
  log('Using: window.fileSystem.readFile()');
  log('========================================');
  
  // 1. Patch aiFileExplorer immediately
  patchAIFileExplorer();
  
  // 2. Install interceptors
  installFetchInterceptor();
  installTauriInterceptor().catch(e => log('Tauri init error:', e));
  
  // 3. Expose debug helpers
  exposeDebugHelpers();
  
  // 4. Re-patch periodically to catch late initializations
  const repatchInterval = setInterval(() => {
    if (!isPatchInstalled) {
      patchAIFileExplorer();
    }
  }, 500);
  
  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(repatchInterval), 10000);
  
  // 5. Re-patch when project changes
  window.addEventListener('projectLoaded', () => {
    log('Project changed, re-patching...');
    isPatchInstalled = false;
    patchAIFileExplorer();
  });
  
  log('✅ Initialization complete!');
  log('Test with: aiSearchDebug.test("readme.md")');
  log('Check status with: aiSearchDebug.status()');
}

// Auto-initialize IMMEDIATELY
if (typeof window !== 'undefined') {
  // Initialize right away, don't wait
  log('Starting immediate initialization...');
  initialize();
  
  // Also initialize on DOMContentLoaded as backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      log('DOMContentLoaded - checking patch status...');
      if (!isPatchInstalled) {
        patchAIFileExplorer();
      }
    });
  }
}

export { 
  getProjectFilesFromDOM, 
  scoreFilesForQuery, 
  readFileContent, 
  buildCompleteContext, 
  initialize 
};

export default { initialize };
