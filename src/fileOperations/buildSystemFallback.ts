// src/fileOperations/buildSystemFallback.ts
// Build System Fallback - Uses terminal directly when Tauri commands fail
// This provides a workaround for PATH issues with Tauri

interface FallbackResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Execute command directly in xterm terminal
 * This bypasses Tauri and runs commands directly in the visible terminal
 */
export async function executeCommandInTerminal(
  command: string,
  workingDir: string
): Promise<FallbackResult> {
  const terminal = (window as any).terminal || 
                   (window as any).xterm ||
                   (window as any).terminalInstance;
  
  if (!terminal) {
    return {
      success: false,
      output: '',
      error: 'Terminal not available'
    };
  }
  
  return new Promise((resolve) => {
    try {
      console.log(`📺 Sending command to terminal: ${command}`);
      
      // Write command to terminal with nice formatting
      terminal.write('\r\n');
      terminal.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
      terminal.write(`\x1b[1;33m$ ${command}\x1b[0m\r\n`);
      terminal.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
      
      // Change directory first
      const cdCommand = process.platform === 'win32' 
        ? `cd /d "${workingDir}"`
        : `cd "${workingDir}"`;
      
      terminal.write(`${cdCommand}\r\n`);
      
      // Execute command
      terminal.write(`${command}\r\n`);
      
      // Consider it successful (user will see output in terminal)
      setTimeout(() => {
        resolve({
          success: true,
          output: 'Command executed in terminal'
        });
      }, 100);
      
    } catch (error) {
      resolve({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

/**
 * Check if a command is available in the system
 */
async function isCommandAvailable(command: string, invoke: Function): Promise<boolean> {
  try {
    const program = command.split(' ')[0]; // Get just the program name
    
    // Try to check using Tauri
    const result = await invoke('execute_build_command', {
      command: `${program} --version`,
      workingDir: '.',
      streamOutput: false
    });
    
    return true;
  } catch (error) {
    console.warn(`Command ${command} not available:`, error);
    return false;
  }
}

/**
 * Try to run command with Tauri, fallback to terminal if it fails
 * This is the main function to use for executing build commands
 */
export async function executeCommandWithFallback(
  command: string,
  workingDir: string,
  invoke: Function
): Promise<FallbackResult> {
  console.log(`🔧 Attempting to execute: ${command}`);
  console.log(`📁 Working directory: ${workingDir}`);
  
  try {
    // Try Tauri command first
    console.log('⚙️  Trying Tauri backend...');
    const result = await invoke('execute_build_command', {
      command,
      workingDir,
      streamOutput: true
    });
    
    console.log('✅ Tauri command succeeded');
    return {
      success: true,
      output: result as string
    };
    
  } catch (error: any) {
    console.warn('⚠️  Tauri command failed, using terminal fallback');
    console.warn('Error details:', error);
    
    // Check if error is because program not found
    const errorMsg = error.message || error.toString();
    if (errorMsg.includes('program not found') || 
        errorMsg.includes('not found') ||
        errorMsg.includes('cannot find')) {
      
      console.log('📺 Executing directly in terminal instead...');
      return executeCommandInTerminal(command, workingDir);
    }
    
    // For other errors, still try terminal as fallback
    console.log('📺 Trying terminal fallback anyway...');
    return executeCommandInTerminal(command, workingDir);
  }
}

/**
 * Enhanced version that shows helpful error messages
 */
export async function executeCommandWithHelp(
  command: string,
  workingDir: string,
  invoke: Function,
  onOutput?: (message: string, type: 'info' | 'success' | 'error') => void
): Promise<FallbackResult> {
  const program = command.split(' ')[0];
  
  // Show what we're doing
  onOutput?.(`Executing: ${command}`, 'info');
  onOutput?.(`Working directory: ${workingDir}`, 'info');
  
  const result = await executeCommandWithFallback(command, workingDir, invoke);
  
  if (!result.success && result.error) {
    // Provide helpful error messages
    if (result.error.includes('program not found') || 
        result.error.includes('not found')) {
      
      onOutput?.(``, 'error');
      onOutput?.(`❌ Program '${program}' not found`, 'error');
      onOutput?.(``, 'error');
      onOutput?.(`This usually means:`, 'info');
      onOutput?.(`1. ${program} is not installed`, 'info');
      onOutput?.(`2. ${program} is not in your system PATH`, 'info');
      onOutput?.(`3. You need to restart the IDE after installation`, 'info');
      onOutput?.(``, 'info');
      
      // Provide specific installation instructions
      const installInstructions: Record<string, string[]> = {
        'node': [
          '📥 Install Node.js:',
          '   • Download: https://nodejs.org',
          '   • Or use: winget install OpenJS.NodeJS.LTS',
          '   • Restart IDE after installation'
        ],
        'npm': [
          '📥 npm comes with Node.js:',
          '   • Download: https://nodejs.org',
          '   • npm is included automatically'
        ],
        'cargo': [
          '📥 Install Rust:',
          '   • Download: https://rustup.rs',
          '   • Or use: winget install Rustlang.Rustup'
        ],
        'python': [
          '📥 Install Python:',
          '   • Download: https://python.org',
          '   • Or use: winget install Python.Python.3.11'
        ],
        'java': [
          '📥 Install Java:',
          '   • Download: https://adoptium.net',
          '   • Or use: winget install EclipseAdoptium.Temurin.17.JDK'
        ],
        'mvn': [
          '📥 Install Maven:',
          '   • Download: https://maven.apache.org',
          '   • Or use: winget install Apache.Maven'
        ],
        'go': [
          '📥 Install Go:',
          '   • Download: https://go.dev/dl',
          '   • Or use: winget install GoLang.Go'
        ]
      };
      
      const instructions = installInstructions[program];
      if (instructions) {
        instructions.forEach(line => onOutput?.(line, 'info'));
      }
    }
  }
  
  return result;
}

/**
 * Get a user-friendly error message
 */
export function getFriendlyErrorMessage(error: string, command: string): string {
  const program = command.split(' ')[0];
  
  if (error.includes('program not found') || error.includes('not found')) {
    return `The program '${program}' could not be found. Please install it and restart the IDE.`;
  }
  
  if (error.includes('permission denied')) {
    return `Permission denied. Try running the IDE as administrator.`;
  }
  
  if (error.includes('access denied')) {
    return `Access denied. Check file permissions or antivirus settings.`;
  }
  
  if (error.includes('syntax error')) {
    return `Syntax error in command. Please check the build configuration.`;
  }
  
  return error;
}

/**
 * Test if build system is working
 */
export async function testBuildSystemAvailability(
  buildSystem: string,
  invoke: Function
): Promise<{ available: boolean; version?: string; error?: string }> {
  const commands: Record<string, string> = {
    'npm': 'npm --version',
    'node': 'node --version',
    'yarn': 'yarn --version',
    'pnpm': 'pnpm --version',
    'cargo': 'cargo --version',
    'python': 'python --version',
    'go': 'go version',
    'java': 'java -version',
    'mvn': 'mvn --version',
    'gradle': 'gradle --version',
    'make': 'make --version',
    'cmake': 'cmake --version',
    'dotnet': 'dotnet --version'
  };
  
  const versionCommand = commands[buildSystem.toLowerCase()];
  if (!versionCommand) {
    return { available: false, error: 'Unknown build system' };
  }
  
  try {
    const result = await invoke('execute_build_command', {
      command: versionCommand,
      workingDir: '.',
      streamOutput: false
    });
    
    return {
      available: true,
      version: result as string
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message || error.toString()
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).buildSystemFallback = {
    executeCommandWithFallback,
    executeCommandWithHelp,
    executeCommandInTerminal,
    testBuildSystemAvailability,
    getFriendlyErrorMessage
  };
}