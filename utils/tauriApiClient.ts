// utils/tauriApiClient.ts
// TypeScript interface for Tauri AI API backend functions

import { invoke } from '@tauri-apps/api/core';

// ================================
// TYPE DEFINITIONS
// ================================

export interface ClaudeRequest {
  api_key: string;
  model: string;
  message: string;
  max_tokens: number;
  temperature: number;
}

export interface GenericAiRequest {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  message: string;
  max_tokens: number;
  temperature: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

export interface SystemInfo {
  temp_dir: string;
  current_dir: string;
  home_dir: string;
  os: string;
  arch: string;
  family: string;
}

export interface FileMetadata {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modified: number;
}

export interface AppInfo {
  name: string;
  version: string;
  tauri_version: string;
  os: string;
  arch: string;
  ai_backend: string;
}

export interface EnvironmentCheck {
  python: boolean;
  python3: boolean;
  node: boolean;
  npm: boolean;
  versions: Record<string, string>;
}

// ================================
// ENVIRONMENT DETECTION
// ================================

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         window.__TAURI__ !== undefined;
}

/**
 * Check if Tauri invoke is available
 */
export function isTauriInvokeAvailable(): boolean {
  try {
    return isTauriEnvironment() && typeof invoke === 'function';
  } catch (error) {
    console.warn('Tauri invoke not available:', error);
    return false;
  }
}

// ================================
// AI API FUNCTIONS
// ================================

/**
 * Call Claude API via Tauri backend
 */
export async function callClaudeViaTauri(request: ClaudeRequest): Promise<string> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for Claude API call');
  }

  try {
    console.log('🤖 Calling Claude API via Tauri backend...');
    const response = await invoke<string>('call_claude_api', { request });
    console.log('✅ Claude API call successful');
    return response;
  } catch (error) {
    console.error('❌ Claude API call failed:', error);
    throw new Error(`Claude API call failed: ${error}`);
  }
}

/**
 * Call any AI API via Tauri backend (OpenAI, DeepSeek, Custom, etc.)
 */
export async function callAiApiViaTauri(request: GenericAiRequest): Promise<string> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for AI API call');
  }

  try {
    console.log(`🤖 Calling ${request.provider} API via Tauri backend...`);
    const response = await invoke<string>('call_ai_api', { request });
    console.log(`✅ ${request.provider} API call successful`);
    return response;
  } catch (error) {
    console.error(`❌ ${request.provider} API call failed:`, error);
    throw new Error(`${request.provider} API call failed: ${error}`);
  }
}

/**
 * Test Tauri API functionality
 */
export async function testTauriApi(): Promise<string> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for API test');
  }

  try {
    const response = await invoke<string>('test_tauri_api');
    console.log('✅ Tauri API test successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Tauri API test failed:', error);
    throw new Error(`Tauri API test failed: ${error}`);
  }
}

// ================================
// FILE EXECUTION FUNCTIONS
// ================================

/**
 * Execute shell command via Tauri backend
 */
export async function executeCommand(
  command: string,
  workingDir?: string,
  isPowershell?: boolean
): Promise<CommandResult> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for command execution');
  }

  try {
    console.log('⚡ Executing command via Tauri:', command);
    const result = await invoke<CommandResult>('execute_command', {
      command,
      workingDir,
      isPowershell
    });
    console.log('✅ Command execution completed');
    return result;
  } catch (error) {
    console.error('❌ Command execution failed:', error);
    throw new Error(`Command execution failed: ${error}`);
  }
}

/**
 * Write file via Tauri backend
 */
export async function writeFile(path: string, content: string): Promise<void> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file writing');
  }

  try {
    console.log('📝 Writing file via Tauri:', path);
    await invoke<void>('write_file', { path, content });
    console.log('✅ File write completed');
  } catch (error) {
    console.error('❌ File write failed:', error);
    throw new Error(`File write failed: ${error}`);
  }
}

/**
 * Delete file via Tauri backend
 */
export async function deleteFile(path: string): Promise<void> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file deletion');
  }

  try {
    console.log('🗑️ Deleting file via Tauri:', path);
    await invoke<void>('delete_file', { path });
    console.log('✅ File deletion completed');
  } catch (error) {
    console.error('❌ File deletion failed:', error);
    throw new Error(`File deletion failed: ${error}`);
  }
}

/**
 * Get system info via Tauri backend
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for system info');
  }

  try {
    const info = await invoke<SystemInfo>('get_system_info');
    console.log('✅ System info retrieved');
    return info;
  } catch (error) {
    console.error('❌ Failed to get system info:', error);
    throw new Error(`Failed to get system info: ${error}`);
  }
}

// ================================
// FILE SYSTEM FUNCTIONS
// ================================

/**
 * Open folder dialog via Tauri backend
 */
export async function openFolderDialog(): Promise<string | null> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for folder dialog');
  }

  try {
    const result = await invoke<string | null>('open_folder_dialog');
    console.log('📁 Folder dialog result:', result);
    return result;
  } catch (error) {
    console.error('❌ Folder dialog failed:', error);
    throw new Error(`Folder dialog failed: ${error}`);
  }
}

/**
 * Open file dialog via Tauri backend
 */
export async function openFileDialog(): Promise<string | null> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file dialog');
  }

  try {
    const result = await invoke<string | null>('open_file_dialog');
    console.log('📄 File dialog result:', result);
    return result;
  } catch (error) {
    console.error('❌ File dialog failed:', error);
    throw new Error(`File dialog failed: ${error}`);
  }
}

/**
 * Save file dialog via Tauri backend
 */
export async function saveFileDialog(defaultName?: string): Promise<string | null> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for save dialog');
  }

  try {
    const result = await invoke<string | null>('save_file_dialog', { defaultName });
    console.log('💾 Save dialog result:', result);
    return result;
  } catch (error) {
    console.error('❌ Save dialog failed:', error);
    throw new Error(`Save dialog failed: ${error}`);
  }
}

/**
 * Read file content via Tauri backend
 */
export async function readFileContent(path: string): Promise<string> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file reading');
  }

  try {
    const content = await invoke<string>('read_file_content', { path });
    console.log('📖 File read completed:', path);
    return content;
  } catch (error) {
    console.error('❌ File read failed:', error);
    throw new Error(`File read failed: ${error}`);
  }
}

/**
 * Write file content via Tauri backend
 */
export async function writeFileContent(path: string, content: string): Promise<void> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file writing');
  }

  try {
    await invoke<void>('write_file_content', { path, content });
    console.log('✅ File content write completed:', path);
  } catch (error) {
    console.error('❌ File content write failed:', error);
    throw new Error(`File content write failed: ${error}`);
  }
}

/**
 * Read directory contents via Tauri backend
 */
export async function readDirectoryContents(path: string): Promise<any[]> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for directory reading');
  }

  try {
    const contents = await invoke<any[]>('read_directory_contents', { path });
    console.log('📂 Directory read completed:', path, `(${contents.length} items)`);
    return contents;
  } catch (error) {
    console.error('❌ Directory read failed:', error);
    throw new Error(`Directory read failed: ${error}`);
  }
}

/**
 * Read directory recursively via Tauri backend
 */
export async function readDirectoryRecursive(path: string, maxDepth?: number): Promise<any> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for recursive directory reading');
  }

  try {
    const result = await invoke<any>('read_directory_recursive', { path, maxDepth });
    console.log('🌳 Recursive directory read completed:', path);
    return result;
  } catch (error) {
    console.error('❌ Recursive directory read failed:', error);
    throw new Error(`Recursive directory read failed: ${error}`);
  }
}

/**
 * Check if file exists via Tauri backend
 */
export async function fileExists(path: string): Promise<boolean> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file existence check');
  }

  try {
    const exists = await invoke<boolean>('file_exists', { path });
    return exists;
  } catch (error) {
    console.error('❌ File exists check failed:', error);
    throw new Error(`File exists check failed: ${error}`);
  }
}

/**
 * Get file metadata via Tauri backend
 */
export async function getFileMetadata(path: string): Promise<FileMetadata> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for file metadata');
  }

  try {
    const metadata = await invoke<FileMetadata>('get_file_metadata', { path });
    return metadata;
  } catch (error) {
    console.error('❌ Get file metadata failed:', error);
    throw new Error(`Get file metadata failed: ${error}`);
  }
}

/**
 * Create directory via Tauri backend
 */
export async function createDirectory(path: string): Promise<void> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for directory creation');
  }

  try {
    await invoke<void>('create_directory', { path });
    console.log('✅ Directory created:', path);
  } catch (error) {
    console.error('❌ Directory creation failed:', error);
    throw new Error(`Directory creation failed: ${error}`);
  }
}

/**
 * Delete path (file or directory) via Tauri backend
 */
export async function deletePath(path: string): Promise<void> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for path deletion');
  }

  try {
    await invoke<void>('delete_path', { path });
    console.log('✅ Path deleted:', path);
  } catch (error) {
    console.error('❌ Path deletion failed:', error);
    throw new Error(`Path deletion failed: ${error}`);
  }
}

// ================================
// SYSTEM UTILITIES
// ================================

/**
 * Get app info via Tauri backend
 */
export async function getAppInfo(): Promise<AppInfo> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for app info');
  }

  try {
    const info = await invoke<AppInfo>('get_app_info');
    return info;
  } catch (error) {
    console.error('❌ Get app info failed:', error);
    throw new Error(`Get app info failed: ${error}`);
  }
}

/**
 * Check Python installation via Tauri backend
 */
export async function checkPython(): Promise<EnvironmentCheck> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for Python check');
  }

  try {
    const result = await invoke<EnvironmentCheck>('check_python');
    return result;
  } catch (error) {
    console.error('❌ Python check failed:', error);
    throw new Error(`Python check failed: ${error}`);
  }
}

/**
 * Check Node.js installation via Tauri backend
 */
export async function checkNode(): Promise<EnvironmentCheck> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for Node check');
  }

  try {
    const result = await invoke<EnvironmentCheck>('check_node');
    return result;
  } catch (error) {
    console.error('❌ Node check failed:', error);
    throw new Error(`Node check failed: ${error}`);
  }
}

/**
 * Get environment variable via Tauri backend
 */
export async function getEnvVar(key: string): Promise<string | null> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for env var access');
  }

  try {
    const value = await invoke<string | null>('get_env_var', { key });
    return value;
  } catch (error) {
    console.error('❌ Get env var failed:', error);
    throw new Error(`Get env var failed: ${error}`);
  }
}

/**
 * Get safe environment variables via Tauri backend
 */
export async function getSafeEnvVars(): Promise<Record<string, string>> {
  if (!isTauriInvokeAvailable()) {
    throw new Error('Tauri environment not available for env vars access');
  }

  try {
    const vars = await invoke<Record<string, string>>('get_safe_env_vars');
    return vars;
  } catch (error) {
    console.error('❌ Get safe env vars failed:', error);
    throw new Error(`Get safe env vars failed: ${error}`);
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

/**
 * Initialize Tauri API client and run basic tests
 */
export async function initializeTauriApiClient(): Promise<boolean> {
  if (!isTauriInvokeAvailable()) {
    console.warn('🚫 Tauri API client not available - running in browser mode');
    return false;
  }

  try {
    console.log('🚀 Initializing Tauri API client...');
    
    // Test basic connectivity
    const testResult = await testTauriApi();
    console.log('✅ Tauri API client initialized successfully:', testResult);
    
    // Get app info for verification
    const appInfo = await getAppInfo();
    console.log('📱 App info:', appInfo);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Tauri API client:', error);
    return false;
  }
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus(): Promise<{
  tauri: boolean;
  system: SystemInfo | null;
  python: EnvironmentCheck | null;
  node: EnvironmentCheck | null;
  app: AppInfo | null;
}> {
  const status = {
    tauri: isTauriInvokeAvailable(),
    system: null as SystemInfo | null,
    python: null as EnvironmentCheck | null,
    node: null as EnvironmentCheck | null,
    app: null as AppInfo | null,
  };

  if (status.tauri) {
    try {
      status.system = await getSystemInfo();
      status.python = await checkPython();
      status.node = await checkNode();
      status.app = await getAppInfo();
    } catch (error) {
      console.error('❌ Failed to get complete system status:', error);
    }
  }

  return status;
}

// Export default object for convenience
export default {
  // Environment
  isTauriEnvironment,
  isTauriInvokeAvailable,
  
  // AI API
  callClaudeViaTauri,
  callAiApiViaTauri,
  testTauriApi,
  
  // File execution
  executeCommand,
  writeFile,
  deleteFile,
  getSystemInfo,
  
  // File system
  openFolderDialog,
  openFileDialog,
  saveFileDialog,
  readFileContent,
  writeFileContent,
  readDirectoryContents,
  readDirectoryRecursive,
  fileExists,
  getFileMetadata,
  createDirectory,
  deletePath,
  
  // System utilities
  getAppInfo,
  checkPython,
  checkNode,
  getEnvVar,
  getSafeEnvVars,
  
  // Convenience
  initializeTauriApiClient,
  getSystemStatus,
};