// src/ui/buildSystemUI.ts
// Build System UI - TOP MENU BAR VERSION
// FIXED: Styling matches other menu items (File, View, Run, etc.)

import { 
  detectBuildSystem,
  getCurrentProjectPath,
  BUILD_SYSTEMS
} from '../fileOperations/buildSystemIntegration';

import { serialLogger, createTabBar, updateErrorBadge, showSerialContextMenu } from './serialMonitorAI';
import { createSerialPlotter } from './serialPlotterAI';
import { showPinVisualizer } from './arduinoPinVisualizer';
// Track state
let shortcutsInitialized = false;
let lastProjectPath: string | null = null;
let dropdownMenu: HTMLElement | null = null;
let cachedScripts: Record<string, string> | null = null;

// Active serial plotter instance (for feeding data from serial monitor)
let activePlotter: { start: () => void; stop: () => void; feedLine: (text: string) => void; startDemo: () => void; stopDemo: () => void; destroy: () => void } | null = null;

// ✅ NEW: Mutex to prevent duplicate creation
let isRefreshing = false;
let refreshDebounceTimer: number | null = null;

// ============================================================================
// 🔧 ARDUINO CLI AUTO-INSTALL FEATURE
// ============================================================================

let arduinoCliInstallPromptShown = false;

/**
 * Show manual install instructions when auto-install fails
 */
function showArduinoCLIManualInstallDialog(error: string): void {
  const modal = document.createElement('div');
  modal.id = 'arduino-cli-manual-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;
  
  dialog.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <span style="font-size: 32px;">📋</span>
      <h3 style="margin: 0; color: #f0a000; font-size: 18px;">Manual Installation Required</h3>
    </div>
    <p style="color: #ff6b6b; margin: 0 0 16px 0; font-size: 12px; background: #2d2020; padding: 8px; border-radius: 4px;">
      ${error}
    </p>
    <p style="color: #ccc; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">
      Install Arduino CLI manually:
    </p>
    <div style="background: #2d2d2d; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
      <p style="color: #4EC9B0; margin: 0 0 8px 0; font-size: 13px;">Option 1: Windows (winget)</p>
      <code style="color: #ce9178; font-size: 12px; display: block; padding: 6px; background: #1e1e1e; border-radius: 3px; user-select: all;">winget install ArduinoSA.CLI</code>
      
      <p style="color: #4EC9B0; margin: 12px 0 8px 0; font-size: 13px;">Option 2: Windows (Chocolatey)</p>
      <code style="color: #ce9178; font-size: 12px; display: block; padding: 6px; background: #1e1e1e; border-radius: 3px; user-select: all;">choco install arduino-cli</code>
      
      <p style="color: #4EC9B0; margin: 12px 0 8px 0; font-size: 13px;">Option 3: Download directly</p>
      <a href="https://arduino.github.io/arduino-cli/latest/installation/" target="_blank" 
         style="color: #569cd6; font-size: 12px; text-decoration: underline;">
        https://arduino.github.io/arduino-cli/latest/installation/
      </a>
    </div>
    <p style="color: #888; margin: 0 0 16px 0; font-size: 12px;">
      After installation, restart the IDE.
    </p>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="manual-copy-cmd" style="
        padding: 8px 16px;
        background: #2d5a27;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
      ">Copy Command</button>
      <button id="manual-close" style="
        padding: 8px 16px;
        background: #0e639c;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
      ">OK</button>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Copy button
  document.getElementById('manual-copy-cmd')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('winget install ArduinoSA.CLI');
      showNotification('Command copied to clipboard!', 'success');
    } catch (e) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = 'winget install ArduinoSA.CLI';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showNotification('Command copied!', 'success');
    }
  });
  
  // Close button
  document.getElementById('manual-close')?.addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Find the main .ino file in the project
 * Arduino requires the .ino filename to match the folder name
 * If mismatch found, automatically rename it
 */
async function findArduinoSketch(projectPath: string): Promise<{ found: boolean; sketchPath: string; error?: string }> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Normalize path
    const normalizedPath = projectPath.replace(/\\/g, '/');
    
    // Get folder name
    const folderName = normalizedPath.split('/').pop() || '';
    const expectedFile = `${folderName}.ino`;
    const expectedPath = `${normalizedPath}/${expectedFile}`;
    
    console.log(`[Arduino] Looking for ${expectedFile} in ${normalizedPath}`);
    
    // Check if the expected file exists
    try {
      const expectedExists = await invoke<boolean>('file_exists', { path: expectedPath });
      if (expectedExists) {
        console.log(`[Arduino] ✓ Found ${expectedFile}`);
        return { found: true, sketchPath: normalizedPath };
      }
    } catch (e) {
      // File doesn't exist, continue checking
    }
    
    // List all .ino files in the directory
    let inoFiles: string[] = [];
    try {
      const files = await invoke<string[]>('list_directory', { path: normalizedPath });
      inoFiles = files.filter((f: string) => f.endsWith('.ino'));
      console.log(`[Arduino] Found .ino files:`, inoFiles);
    } catch (e) {
      // Fallback: try common names
      const commonNames = ['sketch.ino', 'main.ino', 'program.ino', `${folderName}.ino`];
      for (const name of commonNames) {
        try {
          const testPath = `${normalizedPath}/${name}`;
          const exists = await invoke<boolean>('file_exists', { path: testPath });
          if (exists) {
            inoFiles.push(name);
            console.log(`[Arduino] Found via fallback: ${name}`);
          }
        } catch (e) {}
      }
    }
    
    if (inoFiles.length === 0) {
      return { 
        found: false, 
        sketchPath: normalizedPath,
        error: `No .ino files found. Create "${expectedFile}" in your project.`
      };
    }
    
    // Found .ino file(s) but wrong name - auto-rename
    const actualFile = inoFiles[0];
    if (actualFile !== expectedFile) {
      const oldPath = `${normalizedPath}/${actualFile}`;
      const newPath = `${normalizedPath}/${expectedFile}`;
      
      console.log(`[Arduino] Renaming ${actualFile} → ${expectedFile}`);
      writeTerminal(`\n\x1b[33m⚠️ Found "${actualFile}" but Arduino requires "${expectedFile}"\x1b[0m`);
      writeTerminal(`\x1b[36m📝 Auto-renaming file...\x1b[0m\n`);
      
      try {
        await invoke('rename_file', { oldPath, newPath });
        console.log(`[Arduino] ✓ Renamed successfully`);
        writeTerminal(`\x1b[32m✓ Renamed ${actualFile} → ${expectedFile}\x1b[0m\n`);
        showNotification(`✅ Renamed ${actualFile} → ${expectedFile}`, 'success');
        return { found: true, sketchPath: normalizedPath };
      } catch (renameError: any) {
        console.error(`[Arduino] Rename failed:`, renameError);
        writeTerminal(`\x1b[31m✗ Auto-rename failed: ${renameError.message || renameError}\x1b[0m\n`);
        writeTerminal(`\x1b[33mPlease manually rename "${actualFile}" to "${expectedFile}"\x1b[0m\n`);
        return {
          found: false,
          sketchPath: normalizedPath,
          error: `Found "${actualFile}" but Arduino requires "${expectedFile}". Please rename manually.`
        };
      }
    }
    
    return { found: true, sketchPath: normalizedPath };
  } catch (e: any) {
    console.error(`[Arduino] Error in findArduinoSketch:`, e);
    // Fallback - just try with the project path
    return { found: true, sketchPath: projectPath };
  }
}

/**
 * Auto-install Arduino core when platform is not found
 * Shows progress in terminal and retries compile after installation
 */
async function autoInstallArduinoCore(coreName: string, projectPath: string, fqbn: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  
  // Show installation dialog
  const modal = document.createElement('div');
  modal.id = 'arduino-core-install-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    padding: 24px;
    min-width: 450px;
    max-width: 550px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;
  
  dialog.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <span style="font-size: 28px;">📦</span>
      <div>
        <h3 style="margin: 0; color: #e0e0e0; font-size: 16px;">Installing Arduino Core</h3>
        <p style="margin: 4px 0 0 0; color: #888; font-size: 13px;">Platform "${coreName}" is required</p>
      </div>
    </div>
    
    <div style="background: #2d2d2d; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <div id="install-spinner" style="width: 20px; height: 20px; border: 2px solid #454545; border-top-color: #0e639c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span id="install-status" style="color: #e0e0e0; font-size: 13px;">Updating package index...</span>
      </div>
      <div style="background: #1a1a1a; border-radius: 4px; padding: 8px 12px; font-family: monospace; font-size: 12px; color: #888;">
        <span id="install-command">arduino-cli core update-index</span>
      </div>
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="core-install-cancel" style="
        padding: 8px 16px;
        background: #3c3c3c;
        color: #e0e0e0;
        border: 1px solid #454545;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      ">Cancel</button>
    </div>
    
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  const statusEl = dialog.querySelector('#install-status') as HTMLElement;
  const commandEl = dialog.querySelector('#install-command') as HTMLElement;
  const spinnerEl = dialog.querySelector('#install-spinner') as HTMLElement;
  const cancelBtn = dialog.querySelector('#core-install-cancel') as HTMLButtonElement;
  
  let cancelled = false;
  
  cancelBtn.onclick = () => {
    cancelled = true;
    modal.remove();
    writeTerminal(`\n\x1b[33m⚠️ Installation cancelled\x1b[0m\n`);
  };
  
  try {
    // Step 1: Update index
    writeTerminal(`\n\x1b[36m📦 Installing Arduino core: ${coreName}\x1b[0m\n`);
    writeTerminal(`\x1b[90m$ arduino-cli core update-index\x1b[0m\n`);
    
    const updateResult = await invoke<any>('arduino_update_core_index');
    
    if (cancelled) return;
    
    if (updateResult.stdout) {
      writeTerminal(`\x1b[90m${updateResult.stdout}\x1b[0m`);
    }
    if (updateResult.stderr && !updateResult.success) {
      writeTerminal(`\x1b[33m${updateResult.stderr}\x1b[0m`);
    }
    
    // Step 2: Install core
    statusEl.textContent = `Installing ${coreName}... (this may take a few minutes)`;
    commandEl.textContent = `arduino-cli core install ${coreName}`;
    writeTerminal(`\x1b[90m$ arduino-cli core install ${coreName}\x1b[0m\n`);
    writeTerminal(`\x1b[33m⏳ Downloading and installing... please wait\x1b[0m\n`);
    
    const installResult = await invoke<any>('arduino_install_core', { core: coreName });
    
    if (cancelled) return;
    
    if (installResult.stdout) {
      writeTerminal(`\x1b[90m${installResult.stdout}\x1b[0m\n`);
    }
    
    if (installResult.success || installResult.exit_code === 0 || 
        (installResult.stdout && (installResult.stdout.includes('installed') || installResult.stdout.includes('already')))) {
      // Success!
      spinnerEl.style.display = 'none';
      statusEl.innerHTML = `<span style="color: #4EC9B0;">✓ ${coreName} installed successfully!</span>`;
      writeTerminal(`\x1b[32m✓ Core ${coreName} installed successfully!\x1b[0m\n`);
      showNotification(`✅ ${coreName} installed!`, 'success');
      
      // Auto-close and retry compile
      setTimeout(async () => {
        modal.remove();
        
        // Retry compile
        writeTerminal(`\n\x1b[36m🔄 Retrying compilation...\x1b[0m\n`);
        writeTerminal(`\x1b[90m$ arduino-cli compile --fqbn ${fqbn} "${projectPath}"\x1b[0m\n`);
        
        try {
          const retryResult = await invoke<any>('arduino_compile', {
            sketchPath: projectPath,
            fqbn: fqbn,
            verbose: false,
            showProperties: false,
            buildProperties: null
          });
          
          if (retryResult.success) {
            writeTerminal(`\x1b[32m✓ Compilation complete!\x1b[0m\n`);
            if (retryResult.stdout) {
              const memMatch = retryResult.stdout.match(/Sketch uses.*bytes/);
              if (memMatch) {
                writeTerminal(`\x1b[90m${memMatch[0]}\x1b[0m\n`);
              }
            }
            showNotification('✓ Compilation successful!', 'success');
          } else {
            writeTerminal(`\x1b[31m✗ Compilation failed\x1b[0m\n`);
            writeTerminal(retryResult.stderr || retryResult.stdout || 'Unknown error');
          }
        } catch (compileErr: any) {
          writeTerminal(`\x1b[31m✗ Compile error: ${compileErr.message || compileErr}\x1b[0m\n`);
        }
      }, 1500);
      
    } else {
      // Installation failed
      spinnerEl.style.display = 'none';
      statusEl.innerHTML = `<span style="color: #f14c4c;">✗ Installation failed</span>`;
      writeTerminal(`\x1b[31m✗ Failed to install ${coreName}\x1b[0m\n`);
      if (installResult.stderr) {
        writeTerminal(`\x1b[31m${installResult.stderr}\x1b[0m\n`);
      }
      
      // Show manual install option
      cancelBtn.textContent = 'Close';
      const manualBtn = document.createElement('button');
      manualBtn.textContent = 'Copy Command';
      manualBtn.style.cssText = `
        padding: 8px 16px;
        background: #0e639c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        margin-right: 10px;
      `;
      manualBtn.onclick = () => {
        navigator.clipboard.writeText(`arduino-cli core install ${coreName}`);
        showNotification('Command copied to clipboard', 'success');
      };
      cancelBtn.parentElement?.insertBefore(manualBtn, cancelBtn);
    }
    
  } catch (e: any) {
    console.error('[Core Install Error]', e);
    spinnerEl.style.display = 'none';
    statusEl.innerHTML = `<span style="color: #f14c4c;">✗ Error: ${e.message || e}</span>`;
    writeTerminal(`\x1b[31m✗ Error: ${e.message || e}\x1b[0m\n`);
    cancelBtn.textContent = 'Close';
  }
}

/**
 * Show Arduino CLI install prompt dialog
 */
function showArduinoCLIInstallDialog(): void {
  // Only show once per session
  if (arduinoCliInstallPromptShown) return;
  arduinoCliInstallPromptShown = true;
  
  const modal = document.createElement('div');
  modal.id = 'arduino-cli-install-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    padding: 24px;
    max-width: 520px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;
  
  dialog.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <span style="font-size: 32px;">🔧</span>
      <h3 style="margin: 0; color: #4EC9B0; font-size: 18px;">Arduino CLI Not Found</h3>
    </div>
    <p style="color: #ccc; margin: 0 0 20px 0; line-height: 1.5;">
      Arduino CLI is required to compile and upload sketches directly from this IDE.
    </p>
    
    <!-- Option explanations -->
    <div style="background: #252526; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #3c3c3c;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="color: #89D185; font-size: 16px;">⚡</span>
          <span style="color: #89D185; font-weight: bold; font-size: 14px;">Install Arduino CLI</span>
          <span style="color: #fff; font-size: 10px; background: #0e639c; padding: 2px 6px; border-radius: 3px;">Recommended</span>
        </div>
        <p style="color: #aaa; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 24px;">
          Automatically downloads and installs Arduino CLI (~50MB). After installation, you can <b style="color:#4EC9B0;">compile, upload, and use Serial Monitor/Plotter</b> all from this IDE.
        </p>
      </div>
      
      <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #3c3c3c;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="color: #569cd6; font-size: 16px;">🖥️</span>
          <span style="color: #569cd6; font-weight: bold; font-size: 14px;">Use Arduino IDE</span>
        </div>
        <p style="color: #aaa; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 24px;">
          Use official Arduino IDE for compile/upload. <b style="color:#f0a000;">Close Arduino IDE after uploading</b> to use Serial Monitor/Plotter here. Good for traditional workflow.
        </p>
      </div>
      
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="color: #888; font-size: 16px;">✕</span>
          <span style="color: #888; font-weight: bold; font-size: 14px;">Cancel</span>
        </div>
        <p style="color: #888; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 24px;">
          Close this dialog. You can still edit code here, but compile/upload won't work until you install Arduino CLI.
        </p>
      </div>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="arduino-cli-cancel" style="
          padding: 8px 20px;
          background: #3c3c3c;
          border: none;
          border-radius: 4px;
          color: #ccc;
          cursor: pointer;
          font-size: 13px;
        ">Cancel</button>
        <button id="arduino-cli-install" style="
          padding: 10px 24px;
          background: #2d7d46;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        ">⚡ Install Arduino CLI</button>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button id="arduino-cli-use-ide" style="
          padding: 6px 14px;
          background: #0e639c;
          border: none;
          border-radius: 4px;
          color: #ccc;
          cursor: pointer;
          font-size: 11px;
        ">Use Arduino IDE instead</button>
      </div>
    </div>
    <div id="arduino-install-progress" style="display: none; margin-top: 16px;">
      <div style="color: #4EC9B0; font-size: 13px;">⏳ Installing Arduino CLI...</div>
      <div style="background: #3c3c3c; height: 4px; border-radius: 2px; margin-top: 8px; overflow: hidden;">
        <div id="arduino-install-bar" style="background: #4EC9B0; height: 100%; width: 0%; transition: width 0.3s;"></div>
      </div>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Cancel button
  document.getElementById('arduino-cli-cancel')?.addEventListener('click', () => {
    modal.remove();
  });
  
  // Use Arduino IDE button
  document.getElementById('arduino-cli-use-ide')?.addEventListener('click', () => {
    modal.remove();
    showNotification('Use Arduino IDE to upload sketches, then close it to use Serial Plotter here', 'info');
  });
  
  // Install button
  document.getElementById('arduino-cli-install')?.addEventListener('click', async () => {
    const progressDiv = document.getElementById('arduino-install-progress');
    const progressBar = document.getElementById('arduino-install-bar');
    const buttons = dialog.querySelectorAll('button');
    
    // Disable buttons, show progress
    buttons.forEach(btn => (btn as HTMLButtonElement).disabled = true);
    if (progressDiv) progressDiv.style.display = 'block';
    
    // Animate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      if (progressBar) progressBar.style.width = Math.min(progress, 90) + '%';
    }, 300);
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Call Rust backend to install Arduino CLI
      const result = await invoke<any>('arduino_install_cli');
      
      clearInterval(progressInterval);
      if (progressBar) progressBar.style.width = '100%';
      
      if (result.success) {
        // Success!
        setTimeout(() => {
          modal.remove();
          showNotification('✅ ' + result.stdout, 'success');
          // Offer to restart
          setTimeout(() => {
            if (confirm('Arduino CLI installed! Restart IDE to use it?')) {
              location.reload();
            }
          }, 1000);
        }, 500);
      } else {
        // Failed - show error and instructions
        setTimeout(() => {
          modal.remove();
          showArduinoCLIManualInstallDialog(result.stderr || 'Installation failed');
        }, 500);
      }
      
    } catch (e: any) {
      clearInterval(progressInterval);
      modal.remove();
      
      // Fallback: try terminal command
      try {
        const termCommand = (window as any).termCommand || ((cmd: string) => {
          window.dispatchEvent(new CustomEvent('terminal-run', { detail: { command: cmd } }));
        });
        
        // Run winget in terminal as fallback
        termCommand('winget install ArduinoSA.CLI --accept-source-agreements --accept-package-agreements');
        showNotification('Installation started in terminal. Please wait for it to complete, then restart the IDE.', 'info');
      } catch (termError) {
        showArduinoCLIManualInstallDialog(e.message || String(e));
      }
    }
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Check terminal output for "not recognized" error and prompt install
 */
function setupArduinoCLIAutoInstallDetection(): void {
  // Listen for terminal output
  const checkForNotRecognized = (text: string) => {
    if (text.includes("'arduino-cli' is not recognized") || 
        text.includes("arduino-cli: command not found") ||
        text.includes("arduino-cli: not found")) {
      showArduinoCLIInstallDialog();
    }
  };
  
  // Hook into terminal output - multiple methods
  // Method 1: MutationObserver on terminal
  const setupTerminalObserver = () => {
    const terminalOutput = document.querySelector('.terminal-output, #terminal-output, .xterm-rows');
    if (terminalOutput) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.textContent) {
              checkForNotRecognized(node.textContent);
            }
          });
        });
      });
      observer.observe(terminalOutput, { childList: true, subtree: true });
      console.log('[BuildSystemUI] 🔧 Arduino CLI auto-install detection enabled');
    }
  };
  
  // Method 2: Listen for custom events
  window.addEventListener('terminal-output', ((e: CustomEvent) => {
    if (e.detail?.text) {
      checkForNotRecognized(e.detail.text);
    }
  }) as EventListener);
  
  // Method 3: Listen for build errors
  window.addEventListener('build-error', ((e: CustomEvent) => {
    if (e.detail?.error || e.detail?.output) {
      checkForNotRecognized(e.detail.error || e.detail.output);
    }
  }) as EventListener);
  
  // Set up observer after DOM is ready
  setTimeout(setupTerminalObserver, 2000);
}

// Initialize auto-install detection
setupArduinoCLIAutoInstallDetection();

/**
 * Get the correct project path
 */
function getActualProjectPath(): string | null {
  const windowPath = (window as any).currentFolderPath;
  const importedPath = getCurrentProjectPath();
  
  console.log('[BuildSystem] getActualProjectPath:', { windowPath, importedPath });
  
  if (windowPath) {
    return windowPath;
  }
  return importedPath;
}

/**
 * Read package.json scripts OR Arduino files for embedded projects
 */
async function getProjectScripts(): Promise<Record<string, string> | null> {
  const projectPath = getActualProjectPath();
  if (!projectPath) return null;
  
  // First check if this is an Arduino/embedded project
  const buildSystem = await detectBuildSystem(projectPath);
  
  // If Arduino-based, return .ino files as "scripts"
  if (buildSystem?.isEmbedded) {
    return await getArduinoFiles(projectPath);
  }

  // CMake projects — return cmake/make scripts, NOT Gradle
  if (buildSystem?.name === 'cmake' || buildSystem?.displayName === 'CMake') {
    const binaryName = projectPath.split(/[\\/]/).pop() || 'app';
    return {
      'cmake configure': `cmake -B build -DCMAKE_BUILD_TYPE=Release`,
      'build':           `cmake --build build`,
      'run':             `.\\build\\${binaryName}.exe`,
      'clean':           `cmake --build build --target clean`,
      'nvcc build':      `nvcc src/*.cu -o build/${binaryName}`,
    };
  }

  // Python projects
  if (buildSystem?.name === 'python' || buildSystem?.displayName === 'Python') {
    const mainFile = 'src/main.py';
    return {
      'run':             `python ${mainFile}`,
      'install deps':    `pip install -r requirements.txt`,
      'lint':            `flake8 src/`,
      'test':            `pytest`,
    };
  }

  // Make projects
  if (buildSystem?.name === 'make' || buildSystem?.displayName === 'Make') {
    return {
      'build':  'make',
      'clean':  'make clean',
      'run':    'make run',
      'all':    'make all',
    };
  }
  
  // Gradle-based projects (Android, Java, Kotlin) — only if Gradle files exist IN this folder
  try {
    const fileSystem = (window as any).fileSystem;
    if (fileSystem?.readFile) {
      // Check for Gradle wrapper or build files — strictly in projectPath only, no parent walk
      let hasGradle = false;
      try { await fileSystem.readFile(`${projectPath}/gradlew.bat`); hasGradle = true; } catch {}
      if (!hasGradle) try { await fileSystem.readFile(`${projectPath}/build.gradle.kts`); hasGradle = true; } catch {}
      if (!hasGradle) try { await fileSystem.readFile(`${projectPath}/build.gradle`); hasGradle = true; } catch {}
      
      if (hasGradle) {
        return {
          'assembleDebug': 'gradlew assembleDebug',
          'assembleRelease': 'gradlew assembleRelease',
          'installDebug': 'gradlew installDebug',
          'clean': 'gradlew clean',
          'build': 'gradlew build',
          'test': 'gradlew test',
          'lint': 'gradlew lint'
        };
      }
    }
  } catch {}

  // Standard package.json scripts
  try {
    const fileSystem = (window as any).fileSystem;
    if (fileSystem?.readFile) {
      const content = await fileSystem.readFile(`${projectPath}/package.json`);
      const pkg = JSON.parse(content);
      return pkg.scripts || {};
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get Arduino .ino files as "scripts" equivalent
 */
async function getArduinoFiles(projectPath: string): Promise<Record<string, string> | null> {
  try {
    const fileSystem = (window as any).fileSystem;
    const { invoke } = await import('@tauri-apps/api/core');
    
    let files: string[] = [];
    
    // Try to list directory contents
    try {
      if (fileSystem?.listDirectory) {
        files = await fileSystem.listDirectory(projectPath);
      } else {
        // Try Tauri commands
        try {
          const result = await invoke<any[]>('list_directory', { path: projectPath });
          files = result.map((f: any) => typeof f === 'string' ? f : (f.name || f.path || ''));
        } catch {
          try {
            const result = await invoke<any[]>('list_files', { path: projectPath });
            files = result.map((f: any) => typeof f === 'string' ? f : (f.name || f.path || ''));
          } catch {
            // Fallback: check for known Arduino files
            const knownFiles = ['sketch.ino', 'main.ino', 'program.ino'];
            const folderName = projectPath.split(/[/\\]/).pop() || '';
            knownFiles.push(`${folderName}.ino`);
            
            for (const file of knownFiles) {
              try {
                const exists = await invoke<boolean>('file_exists', { path: `${projectPath}/${file}` });
                if (exists) files.push(file);
              } catch { /* continue */ }
            }
          }
        }
      }
    } catch (e) {
      console.log('[BuildSystemUI] Error listing directory:', e);
    }
    
    // Filter for .ino files
    const inoFiles = files.filter(f => f.endsWith('.ino'));
    
    if (inoFiles.length === 0) {
      // Return default Arduino actions even if no .ino files found
      return {
        'compile': 'Verify/Compile sketch',
        'upload': 'Upload to board',
        'serial': 'Open Serial Monitor (Beta)'
      };
    }
    
    // Create script-like entries for Arduino
    const result: Record<string, string> = {};
    
    // Add the .ino files
    inoFiles.forEach(file => {
      result[file] = `Arduino sketch file`;
    });
    
    // Add standard Arduino actions
    result['──────────'] = ''; // Separator
    result['✓ Verify'] = 'arduino-cli compile';
    result['➤ Upload'] = 'arduino-cli upload';
    result['🔌 Serial'] = 'Open Serial Monitor (Beta)';
    
    return result;
  } catch (error) {
    console.error('[BuildSystemUI] Error getting Arduino files:', error);
    return {
      'compile': 'Verify/Compile sketch',
      'upload': 'Upload to board',
      'serial': 'Open Serial Monitor (Beta)'
    };
  }
}

/**
 * Write clean output to terminal
 */
function writeTerminal(text: string): void {
  const terminal = (window as any).terminal;
  if (terminal?.write) {
    terminal.write(text + '\r\n');
  }
}

/**
 * Write to terminal without newline (for loading animation)
 */
function writeTerminalInline(text: string): void {
  const terminal = (window as any).terminal;
  if (terminal?.write) {
    terminal.write(text);
  }
}

/**
 * Start terminal loading animation
 * Returns a stop function to call when operation completes
 */
function startTerminalLoading(message: string = 'Processing'): () => void {
  const terminal = (window as any).terminal;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let dotCount = 0;
  let isRunning = true;
  
  // Write initial message
  if (terminal?.write) {
    terminal.write(`\x1b[33m${frames[0]} ${message}\x1b[0m`);
  }
  
  // Animate
  const intervalId = setInterval(() => {
    if (!isRunning || !terminal?.write) {
      clearInterval(intervalId);
      return;
    }
    
    frameIndex = (frameIndex + 1) % frames.length;
    dotCount = (dotCount + 1) % 4;
    const dots = '.'.repeat(dotCount);
    
    // Move cursor to beginning of line, clear line, write new frame
    terminal.write(`\r\x1b[K\x1b[33m${frames[frameIndex]} ${message}${dots}\x1b[0m`);
  }, 100);
  
  // Return stop function
  return () => {
    isRunning = false;
    clearInterval(intervalId);
    if (terminal?.write) {
      // Clear the loading line
      terminal.write(`\r\x1b[K`);
    }
  };
}

/**
 * Clear terminal
 */
function clearTerminal(): void {
  const terminal = (window as any).terminal;
  if (terminal?.clear) {
    terminal.clear();
  }
}

/**
 * Show clean command output in terminal
 */
function showCommandInTerminal(command: string, projectPath: string, status: 'running' | 'manual' = 'running'): void {
  clearTerminal();
  
  const projectName = projectPath.split(/[/\\]/).pop() || 'project';
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  if (status === 'running') {
    writeTerminal('');
    writeTerminal('  ╭─────────────────────────────────────────────╮');
    writeTerminal('  │  ▶ RUNNING                                  │');
    writeTerminal('  ╰─────────────────────────────────────────────╯');
    writeTerminal('');
    writeTerminal(`  Command:   ${command}`);
    writeTerminal(`  Project:   ${projectName}`);
    writeTerminal(`  Time:      ${time}`);
    writeTerminal('');
    writeTerminal('  ─────────────────────────────────────────────');
    writeTerminal('');
  } else {
    writeTerminal('');
    writeTerminal('  ╭─────────────────────────────────────────────╮');
    writeTerminal('  │  ⚡ CUSTOM SCRIPT                           │');
    writeTerminal('  ╰─────────────────────────────────────────────╯');
    writeTerminal('');
    writeTerminal(`  Command:   ${command}`);
    writeTerminal(`  Project:   ${projectName}`);
    writeTerminal('');
    writeTerminal('  → Run this command in your terminal');
    writeTerminal('');
  }
}

/**
 * Run an npm script
 */
async function runNpmScript(scriptName: string): Promise<void> {
  const projectPath = getActualProjectPath();
  if (!projectPath) {
    showNotification('No project open', 'error');
    return;
  }
  
  const command = `npm run ${scriptName}`;
  const buildSystem = (window as any).buildSystem;
  
  if (buildSystem) {
    if (scriptName === 'start' || scriptName === 'dev' || scriptName === 'serve') {
      showCommandInTerminal(command, projectPath, 'running');
      await buildSystem.runProject();
      return;
    }
    if (scriptName === 'build') {
      showCommandInTerminal(command, projectPath, 'running');
      await buildSystem.buildProject();
      return;
    }
    if (scriptName === 'test') {
      showCommandInTerminal(command, projectPath, 'running');
      await buildSystem.testProject();
      return;
    }
    if (scriptName === 'clean') {
      showCommandInTerminal(command, projectPath, 'running');
      await buildSystem.cleanProject();
      return;
    }
  }
  
  showCommandInTerminal(command, projectPath, 'manual');
  showNotification(`Run: ${command}`, 'info');
}

/**
 * Show Build System Info POPUP DIALOG
 */
async function showBuildInfoDialog(): Promise<void> {
  const projectPath = getActualProjectPath();
  if (!projectPath) {
    showNotification('No project open', 'error');
    return;
  }
  
  const buildSystem = await detectBuildSystem(projectPath);
  const scripts = await getProjectScripts(); // always fresh — no stale cache
  const projectName = projectPath.split(/[/\\]/).pop() || 'project';
  
  document.getElementById('build-info-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'build-info-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    animation: fadeIn 0.15s ease;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    padding: 0;
    min-width: 420px;
    max-width: 520px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideUp 0.2s ease;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    background: linear-gradient(135deg, #2d4a3e 0%, #1a3a2a 100%);
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #3c3c3c;
  `;
  header.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L1 4.5V11.5L8 15L15 11.5V4.5L8 1Z" stroke="#4EC9B0" stroke-width="1.5" fill="none"/>
      <path d="M1 4.5L8 8M8 8L15 4.5M8 8V15" stroke="#4EC9B0" stroke-width="1.5"/>
    </svg>
    <div style="flex: 1;">
      <div style="color: #fff; font-weight: 600; font-size: 16px;">${buildSystem?.displayName || 'Build System'}</div>
      <div style="color: #888; font-size: 12px; margin-top: 2px;">${projectName}</div>
    </div>
    <button id="build-info-close" style="
      background: none;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.15s;
    ">×</button>
  `;
  dialog.appendChild(header);
  
  const content = document.createElement('div');
  content.style.cssText = 'padding: 20px; overflow-y: auto; max-height: 400px;';
  
  if (buildSystem) {
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Project Details</div>
        <div style="background: #252526; border-radius: 6px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333;">
            <span style="color: #888;">Build System</span>
            <span style="color: #4EC9B0; font-weight: 500;">${buildSystem.displayName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333;">
            <span style="color: #888;">Config File</span>
            <span style="color: #CE9178; font-family: monospace; font-size: 12px;">${Array.isArray(buildSystem.detectFile) ? buildSystem.detectFile[0] : buildSystem.detectFile}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: #888;">Scripts</span>
            <span style="color: #89D185;">${scripts ? Object.keys(scripts).length : 0} available</span>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Default Commands</div>
        <div style="background: #252526; border-radius: 6px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333;">
            <span style="color: #888;">Build</span>
            <span style="color: #CE9178; font-family: monospace; font-size: 12px;">${buildSystem.buildCommand}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333;">
            <span style="color: #888;">Run</span>
            <span style="color: #89D185; font-family: monospace; font-size: 12px;">${buildSystem.runCommand}</span>
          </div>
          ${buildSystem.testCommand ? `
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333;">
            <span style="color: #888;">Test</span>
            <span style="color: #DCDCAA; font-family: monospace; font-size: 12px;">${buildSystem.testCommand}</span>
          </div>
          ` : ''}
          ${buildSystem.cleanCommand ? `
          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: #888;">Clean</span>
            <span style="color: #F48771; font-family: monospace; font-size: 12px;">${buildSystem.cleanCommand}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      ${scripts && Object.keys(scripts).length > 0 ? `
      <div>
        <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Available Scripts (${Object.keys(scripts).length})</div>
        <div style="background: #252526; border-radius: 6px; padding: 12px; max-height: 150px; overflow-y: auto;">
          ${Object.entries(scripts).map(([name, cmd]) => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; gap: 12px;">
              <span style="color: #4EC9B0; font-weight: 500; white-space: nowrap;">${name}</span>
              <span style="color: #666; font-family: monospace; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cmd}">${cmd}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    `;
  } else {
    content.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #888;">
        <div style="font-size: 40px; margin-bottom: 12px;">📦</div>
        <div style="font-size: 14px;">No build system detected</div>
        <div style="font-size: 12px; margin-top: 8px; color: #666;">Add a package.json, Cargo.toml, or other config file</div>
      </div>
    `;
  }
  
  dialog.appendChild(content);
  
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 12px 20px;
    background: #252526;
    border-top: 1px solid #333;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  `;
  footer.innerHTML = `
    <button id="build-info-ok" style="
      padding: 8px 20px;
      background: #4EC9B0;
      border: none;
      border-radius: 4px;
      color: #000;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    ">OK</button>
  `;
  dialog.appendChild(footer);
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `;
  modal.appendChild(style);
  
  const closeModal = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  dialog.querySelector('#build-info-close')?.addEventListener('click', closeModal);
  dialog.querySelector('#build-info-ok')?.addEventListener('click', closeModal);
  
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Notification helper
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#5a2d2d' : type === 'success' ? '#2d5a3d' : '#2d3d5a'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10003;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Remove build system indicator
 */
export function removeBuildSystemIndicator(): void {
  // ✅ Remove ALL instances (not just by ID) to prevent duplicates
  document.querySelectorAll('#build-system-menu-item').forEach(el => el.remove());
  document.querySelectorAll('#build-system-dropdown-menu').forEach(el => el.remove());
  document.querySelectorAll('.build-system-dropdown').forEach(el => el.remove());
  
  // Also remove any menu items that match the build system pattern
  document.querySelectorAll('.menu-item').forEach(el => {
    const text = el.textContent?.toLowerCase() || '';
    if (text.includes('npm') || text.includes('yarn') || text.includes('pnpm') ||
        text.includes('cargo') || text.includes('flutter') || text.includes('maven') ||
        text.includes('gradle') || text.includes('go mod') || text.includes('pip') ||
        text.includes('dotnet') || text.includes('cmake')) {
      // Check if it has the build system icon (SVG with stroke="#4EC9B0")
      if (el.querySelector('svg') && el.id !== 'run-button') {
        el.remove();
      }
    }
  });
  
  dropdownMenu = null;
  cachedScripts = null;
}

/**
 * Get script style
 */
function getScriptStyle(scriptName: string): { icon: string; color: string; priority: number } {
  const styles: Record<string, { icon: string; color: string; priority: number }> = {
    'dev': { icon: '▶', color: '#4EC9B0', priority: 1 },
    'start': { icon: '▶', color: '#4EC9B0', priority: 2 },
    'serve': { icon: '▶', color: '#4EC9B0', priority: 3 },
    'build': { icon: '⚙', color: '#CE9178', priority: 10 },
    'preview': { icon: '👁', color: '#89D185', priority: 20 },
    'test': { icon: '✓', color: '#DCDCAA', priority: 30 },
    'lint': { icon: '⚡', color: '#569CD6', priority: 40 },
    'format': { icon: '✎', color: '#569CD6', priority: 42 },
    'clean': { icon: '✕', color: '#F48771', priority: 50 },
  };
  
  if (styles[scriptName]) return styles[scriptName];
  for (const [key, style] of Object.entries(styles)) {
    if (scriptName.includes(key)) return { ...style, priority: style.priority + 100 };
  }
  return { icon: '›', color: '#888', priority: 200 };
}

/**
 * Create Arduino-specific dropdown content
 */
async function createArduinoDropdownContent(
  menu: HTMLElement, 
  buildSystem: any, 
  scripts: Record<string, string> | null
): Promise<void> {
  // Arduino action items
  const arduinoActions = [
    { icon: '✓', label: 'Verify / Compile', action: 'compile', color: '#4EC9B0', shortcut: 'Ctrl+R' },
    { icon: '➤', label: 'Upload', action: 'upload', color: '#89D185', shortcut: 'Ctrl+U' },
    { divider: true },
    { icon: '🔌', label: 'Serial Monitor (Beta)', action: 'serial', color: '#CE9178', shortcut: 'Ctrl+Shift+M' },
    { icon: '📊', label: 'Serial Plotter AI', action: 'plotter', color: '#569CD6' },
    { icon: '🔌', label: 'Pin Visualizer', action: 'pin-visualizer', color: '#4EC9B0' },
    { divider: true },
    { icon: '📋', label: 'Select Board...', action: 'board', color: '#888' },
    { icon: '🔗', label: 'Select Port...', action: 'port', color: '#888' },
    { divider: true },
    { icon: '📦', label: 'Library Manager', action: 'libraries', color: '#DCDCAA' },
    { icon: '⚙️', label: 'Board Manager', action: 'boards', color: '#DCDCAA' },
    { divider: true },
    { icon: 'ℹ️', label: 'CLI Info', action: 'cli-info', color: '#888' },
    { icon: '🗑️', label: 'Uninstall CLI...', action: 'uninstall-cli', color: '#f48771' },
  ];
  
  arduinoActions.forEach(item => {
    if (item.divider) {
      const divider = document.createElement('div');
      divider.style.cssText = 'height: 1px; background: #454545; margin: 6px 8px;';
      menu.appendChild(divider);
      return;
    }
    
    const menuItem = document.createElement('div');
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 4px;
      font-size: 13px;
      transition: background 0.15s;
      background: transparent;
    `;
    
    menuItem.innerHTML = `
      <span style="width: 18px; text-align: center; color: ${item.color}; font-size: 14px;">${item.icon}</span>
      <span style="color: #e0e0e0; flex: 1;">${item.label}</span>
      ${item.shortcut ? `<span style="color: #666; font-size: 11px; background: #333; padding: 2px 6px; border-radius: 3px;">${item.shortcut}</span>` : ''}
    `;
    
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#094771';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'transparent';
    });
    
    menuItem.addEventListener('click', () => {
      handleArduinoMenuAction(item.action!, buildSystem);
      if (dropdownMenu) dropdownMenu.style.display = 'none';
    });
    
    menu.appendChild(menuItem);
  });
  
  // Add .ino files section if any
  if (scripts) {
    const inoFiles = Object.entries(scripts).filter(([name]) => name.endsWith('.ino'));
    
    if (inoFiles.length > 0) {
      const divider = document.createElement('div');
      divider.style.cssText = 'height: 1px; background: #454545; margin: 6px 8px;';
      menu.appendChild(divider);
      
      const filesHeader = document.createElement('div');
      filesHeader.style.cssText = 'padding: 8px 12px 4px 12px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;';
      filesHeader.textContent = 'Sketch Files';
      menu.appendChild(filesHeader);
      
      inoFiles.forEach(([fileName]) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 4px;
          font-size: 13px;
          transition: background 0.15s;
          background: transparent;
        `;
        fileItem.innerHTML = `
          <span style="width: 18px; text-align: center; color: #4FC1FF; font-size: 14px;">📄</span>
          <span style="color: #e0e0e0;">${fileName}</span>
        `;
        
        fileItem.addEventListener('mouseenter', () => {
          fileItem.style.background = '#094771';
        });
        fileItem.addEventListener('mouseleave', () => {
          fileItem.style.background = 'transparent';
        });
        
        fileItem.addEventListener('click', () => {
          // Open the file
          const projectPath = getActualProjectPath();
          if (projectPath && (window as any).tabManager?.openFile) {
            const filePath = `${projectPath}/${fileName}`;
            (window as any).tabManager.openFile(filePath);
          }
          if (dropdownMenu) dropdownMenu.style.display = 'none';
        });
        
        menu.appendChild(fileItem);
      });
    }
  }
  
  // Add Build System Info at bottom
  const divider = document.createElement('div');
  divider.style.cssText = 'height: 1px; background: #454545; margin: 6px 8px;';
  menu.appendChild(divider);
  
  const infoItem = document.createElement('div');
  infoItem.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 4px;
    font-size: 13px;
    color: #888;
    transition: background 0.15s;
    background: transparent;
  `;
  infoItem.innerHTML = `
    <span style="width: 18px; text-align: center; font-size: 14px;">ⓘ</span>
    <span>Build System Info</span>
  `;
  infoItem.addEventListener('mouseenter', () => infoItem.style.background = '#094771');
  infoItem.addEventListener('mouseleave', () => infoItem.style.background = 'transparent');
  infoItem.addEventListener('click', () => {
    showBuildInfoDialog();
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });
  menu.appendChild(infoItem);
}

/**
 * Handle Arduino menu actions
 */
async function handleArduinoMenuAction(action: string, buildSystem: any): Promise<void> {
  const projectPath = getActualProjectPath();
  console.log(`[BuildSystemUI] Arduino action: ${action}`);
  
  const bs = (window as any).buildSystem;
  const arduinoManager = (window as any).arduinoManager;
  const arduinoPanel = (window as any).arduinoPanel;
  
  switch (action) {
    case 'compile':
      // Use Arduino-specific compile
      {
        let stopLoading: (() => void) | null = null;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const selectedBoard = (window as any).arduinoSelectedBoard || 'arduino:avr:uno';
          
          // Normalize the project path (remove any quotes, fix slashes)
          const normalizedPath = projectPath.replace(/"/g, '').replace(/\\/g, '/');
          
          // Check for proper sketch file first
          const sketchCheck = await findArduinoSketch(normalizedPath);
          if (!sketchCheck.found && sketchCheck.error) {
            writeTerminal(`\n\x1b[31m✗ ${sketchCheck.error}\x1b[0m\n`);
            showNotification(`⚠️ ${sketchCheck.error}`, 'warning');
            break;
          }
          
          // Show in terminal
          writeTerminal(`\n\x1b[36m🔨 Compiling for ${selectedBoard}...\x1b[0m`);
          writeTerminal(`\x1b[90m$ arduino-cli compile --fqbn ${selectedBoard} "${normalizedPath}"\x1b[0m\n`);
          
          // Start loading animation
          stopLoading = startTerminalLoading('Compiling sketch');
          
          const result = await invoke<any>('arduino_compile', {
            sketchPath: normalizedPath,
            fqbn: selectedBoard,
            verbose: false,
            showProperties: false,
            buildProperties: null
          });
          
          // Stop loading animation
          if (stopLoading) { stopLoading(); stopLoading = null; }
          
          if (result.success) {
            writeTerminal(`\x1b[32m✓ Compilation complete!\x1b[0m\n`);
            if (result.stdout) {
              // Parse and display memory usage if present
              const memMatch = result.stdout.match(/Sketch uses.*bytes/);
              if (memMatch) {
                writeTerminal(`\x1b[90m${memMatch[0]}\x1b[0m\n`);
              }
            }
            showNotification('✓ Compilation successful!', 'success');
          } else {
            writeTerminal(`\x1b[31m✗ Compilation failed\x1b[0m\n`);
            writeTerminal(result.stderr || result.stdout || 'Unknown error');
            
            const errorOutput = (result.stderr || '') + (result.stdout || '');
            
            // Check for arduino-cli not found
            if (errorOutput.includes("not recognized") || errorOutput.includes("command not found")) {
              showArduinoCLIInstallDialog();
            } 
            // Check for missing platform/core - AUTO INSTALL
            else if (errorOutput.includes("platform not installed") || errorOutput.includes("Platform") && errorOutput.includes("not found")) {
              const coreMatch = errorOutput.match(/Platform '([^']+)' not found|platform ([^\s]+) is not installed/);
              const coreName = coreMatch ? (coreMatch[1] || coreMatch[2]) : selectedBoard.split(':').slice(0, 2).join(':');
              await autoInstallArduinoCore(coreName, normalizedPath, selectedBoard);
            }
            else if (errorOutput.includes("main file missing")) {
              // Filename mismatch error
              const folderName = normalizedPath.split(/[/\\]/).pop() || 'sketch';
              showNotification(`⚠️ Rename your .ino file to "${folderName}.ino"`, 'warning');
            }
          }
        } catch (e: any) {
          if (stopLoading) { stopLoading(); }
          console.error('[Compile Error]', e);
          writeTerminal(`\x1b[31m✗ Error: ${e.message || e}\x1b[0m\n`);
          
          if (e.message?.includes("not recognized") || e.message?.includes("command not found")) {
            showArduinoCLIInstallDialog();
          }
        }
      }
      break;
      
    case 'upload':
      // Use Arduino-specific upload with proper port
      {
        let stopLoading: (() => void) | null = null;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const selectedPort = (window as any).arduinoSelectedPort || 'COM3';
          const selectedBoard = (window as any).arduinoSelectedBoard || 'arduino:avr:uno';
          
          // Normalize the project path (remove any quotes, fix slashes)
          const normalizedPath = projectPath.replace(/"/g, '').replace(/\\/g, '/');
          
          // Check for proper sketch file first
          const sketchCheck = await findArduinoSketch(normalizedPath);
          if (!sketchCheck.found && sketchCheck.error) {
            writeTerminal(`\n\x1b[31m✗ ${sketchCheck.error}\x1b[0m\n`);
            showNotification(`⚠️ ${sketchCheck.error}`, 'warning');
            break;
          }
          
          // Check if port is selected
          if (!selectedPort || selectedPort === '{port}') {
            showNotification('⚠️ Please select a port first (Arduino menu → Select Port)', 'warning');
            await showPortSelectionDialog();
            break;
          }
          
          // Show in terminal
          writeTerminal(`\n\x1b[36m▶️ Uploading to ${selectedPort}...\x1b[0m`);
          writeTerminal(`\x1b[90m$ arduino-cli upload -p ${selectedPort} --fqbn ${selectedBoard} "${normalizedPath}"\x1b[0m\n`);
          
          // Start loading animation
          stopLoading = startTerminalLoading('Uploading to board');
          
          const result = await invoke<any>('arduino_upload', {
            sketchPath: normalizedPath,
            port: selectedPort,
            fqbn: selectedBoard,
            verbose: false,
            verify: false
          });
          
          // Stop loading animation
          if (stopLoading) { stopLoading(); stopLoading = null; }
          
          if (result.success) {
            writeTerminal(`\x1b[32m✓ Upload complete!\x1b[0m\n`);
            showNotification('✓ Upload complete!', 'success');
          } else {
            writeTerminal(`\x1b[31m✗ Upload failed\x1b[0m\n`);
            writeTerminal(result.stderr || result.stdout || 'Unknown error');
            
            const errorOutput = (result.stderr || '') + (result.stdout || '');
            
            // Check for arduino-cli not found
            if (errorOutput.includes("not recognized") || errorOutput.includes("command not found")) {
              showArduinoCLIInstallDialog();
            }
            // Check for missing platform/core - AUTO INSTALL
            else if (errorOutput.includes("platform not installed") || errorOutput.includes("Platform") && errorOutput.includes("not found")) {
              const coreMatch = errorOutput.match(/Platform '([^']+)' not found|platform ([^\s]+) is not installed/);
              const coreName = coreMatch ? (coreMatch[1] || coreMatch[2]) : selectedBoard.split(':').slice(0, 2).join(':');
              await autoInstallArduinoCore(coreName, normalizedPath, selectedBoard);
            }
            else if (errorOutput.includes("main file missing")) {
              // Filename mismatch error
              const folderName = normalizedPath.split(/[/\\]/).pop() || 'sketch';
              showNotification(`⚠️ Rename your .ino file to "${folderName}.ino"`, 'warning');
            }
          }
        } catch (e: any) {
          if (stopLoading) { stopLoading(); }
          console.error('[Upload Error]', e);
          writeTerminal(`\x1b[31m✗ Error: ${e.message || e}\x1b[0m\n`);
          
          if (e.message?.includes("not recognized") || e.message?.includes("command not found")) {
            showArduinoCLIInstallDialog();
          }
        }
      }
      break;
      
    case 'serial':
      // Open Serial Monitor
      await showSerialMonitor();
      break;
      
    case 'plotter':
      // Open built-in Serial Plotter
      await showSerialPlotter();
      break;
      
    case 'pin-visualizer':
      // Open Pin Visualizer with live serial + AI tooltips
      await showPinVisualizer();
      break;
      
    case 'board':
      // Show board selection dialog
      await showBoardSelectionDialog();
      break;
      
    case 'port':
      // Show port selection dialog
      await showPortSelectionDialog();
      break;
      
    case 'libraries':
      if (arduinoPanel?.showLibraryManager) {
        arduinoPanel.showLibraryManager();
      } else {
        window.dispatchEvent(new CustomEvent('arduino-library-manager', { detail: { projectPath } }));
        showNotification('Library Manager coming soon', 'info');
      }
      break;
      
    case 'boards':
      if (arduinoPanel?.showBoardManager) {
        arduinoPanel.showBoardManager();
      } else {
        window.dispatchEvent(new CustomEvent('arduino-board-manager', { detail: { projectPath } }));
        showNotification('Board Manager coming soon', 'info');
      }
      break;
      
    case 'cli-info':
      await showCLIInfoDialog();
      break;
      
    case 'uninstall-cli':
      await showUninstallCLIDialog();
      break;
  }
}

/**
 * Show Board Selection Dialog
 */
async function showBoardSelectionDialog(): Promise<void> {
  // Remove existing dialog
  document.getElementById('arduino-board-dialog')?.remove();
  
  // Create modal immediately with loading state
  const modal = document.createElement('div');
  modal.id = 'arduino-board-dialog';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    min-width: 350px;
    max-width: 450px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Show loading state immediately
  dialog.innerHTML = `
    <div style="padding: 16px 20px; background: #2d2d2d; border-bottom: 1px solid #454545; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📋</span>
      <span style="color: #fff; font-weight: 600; font-size: 15px;">Select Board</span>
    </div>
    <div style="padding: 40px 20px; text-align: center;">
      <div style="color: #4EC9B0; font-size: 24px; margin-bottom: 12px;">⏳</div>
      <div style="color: #888;">Loading boards...</div>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  // Common Arduino boards (fallback)
  const boards = [
    { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
    { name: 'Arduino Nano', fqbn: 'arduino:avr:nano' },
    { name: 'Arduino Mega 2560', fqbn: 'arduino:avr:mega' },
    { name: 'Arduino Leonardo', fqbn: 'arduino:avr:leonardo' },
    { name: 'ESP32 Dev Module', fqbn: 'esp32:esp32:esp32' },
    { name: 'ESP8266 NodeMCU', fqbn: 'esp8266:esp8266:nodemcuv2' },
    { name: 'STM32 Generic F4', fqbn: 'STMicroelectronics:stm32:GenF4' },
  ];
  
  // Try to get installed boards from arduino-cli (in background)
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<any>('arduino_list_boards');
    if (result && Array.isArray(result) && result.length > 0) {
      // Add detected boards at the top
      result.forEach((b: any) => {
        if (b.board_name && b.fqbn) {
          boards.unshift({ name: `${b.board_name} (detected)`, fqbn: b.fqbn });
        }
      });
    }
  } catch (e) {
    console.log('[Arduino] Could not fetch boards from CLI');
  }
  
  // Now update dialog with board list
  const currentBoard = (window as any).arduinoSelectedBoard || 'arduino:avr:uno';
  
  const boardListHtml = boards.map(board => {
    const isSelected = board.fqbn === currentBoard;
    return `
      <div class="board-item" data-fqbn="${board.fqbn}" data-name="${board.name}" style="
        padding: 10px 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 4px;
        margin-bottom: 4px;
        background: ${isSelected ? '#094771' : 'transparent'};
        transition: background 0.15s;
      ">
        <span style="color: ${isSelected ? '#4FC1FF' : '#888'};">${isSelected ? '●' : '○'}</span>
        <span style="color: #e0e0e0; flex: 1;">${board.name}</span>
        <span style="color: #666; font-size: 11px;">${board.fqbn.split(':').pop()}</span>
      </div>
    `;
  }).join('');
  
  dialog.innerHTML = `
    <div style="padding: 16px 20px; background: #2d2d2d; border-bottom: 1px solid #454545; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📋</span>
      <span style="color: #fff; font-weight: 600; font-size: 15px;">Select Board</span>
    </div>
    <div style="padding: 12px; max-height: 300px; overflow-y: auto;">
      ${boardListHtml}
    </div>
    <div style="padding: 12px 16px; background: #252526; border-top: 1px solid #454545; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end;">
      <button id="board-dialog-cancel" style="
        padding: 8px 16px;
        background: #3c3c3c;
        border: none;
        border-radius: 4px;
        color: #ccc;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;
  
  // Add event listeners
  dialog.querySelectorAll('.board-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (item.getAttribute('data-fqbn') !== currentBoard) {
        (item as HTMLElement).style.background = '#2d2d2d';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (item.getAttribute('data-fqbn') !== currentBoard) {
        (item as HTMLElement).style.background = 'transparent';
      }
    });
    item.addEventListener('click', () => {
      const fqbn = item.getAttribute('data-fqbn');
      const name = item.getAttribute('data-name');
      (window as any).arduinoSelectedBoard = fqbn;
      showNotification(`Board: ${name}`, 'success');
      modal.remove();
      refreshBuildSystemIndicator();
    });
  });
  
  dialog.querySelector('#board-dialog-cancel')?.addEventListener('click', () => modal.remove());
}

/**
 * Show Port Selection Dialog
 */
async function showPortSelectionDialog(): Promise<void> {
  // Remove existing dialog
  document.getElementById('arduino-port-dialog')?.remove();
  
  // Create modal immediately with loading state
  const modal = document.createElement('div');
  modal.id = 'arduino-port-dialog';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    min-width: 320px;
    max-width: 400px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Show loading state immediately
  dialog.innerHTML = `
    <div style="padding: 16px 20px; background: #2d2d2d; border-bottom: 1px solid #454545; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">🔗</span>
      <span style="color: #fff; font-weight: 600; font-size: 15px;">Select Port</span>
    </div>
    <div style="padding: 40px 20px; text-align: center;">
      <div style="color: #4EC9B0; font-size: 24px; margin-bottom: 12px;">⏳</div>
      <div style="color: #888;">Scanning ports...</div>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  let ports: { port: string; description: string }[] = [];
  
  // Try to get real ports from Tauri
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    const result = await invoke<any[]>('list_serial_ports');
    if (result && Array.isArray(result)) {
      ports = result.map(p => ({
        port: p.port,
        description: p.description || p.port_type || 'Serial Port'
      }));
    }
  } catch (e) {
    console.log('[Arduino] Could not fetch ports:', e);
    // Fallback ports
    ports = [
      { port: 'COM3', description: 'Common Arduino port' },
      { port: 'COM4', description: 'Serial Port' },
      { port: 'COM5', description: 'Serial Port' },
    ];
  }
  
  const currentPort = (window as any).arduinoSelectedPort || '';
  
  // Build port list HTML
  let portListHtml = '';
  if (ports.length === 0) {
    portListHtml = `
      <div style="padding: 20px; text-align: center; color: #888;">
        <div style="font-size: 32px; margin-bottom: 10px;">🔌</div>
        <div>No ports detected</div>
        <div style="font-size: 12px; margin-top: 8px;">Connect your Arduino board</div>
      </div>
    `;
  } else {
    portListHtml = ports.map(portInfo => {
      const isSelected = portInfo.port === currentPort;
      return `
        <div class="port-item" data-port="${portInfo.port}" style="
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 4px;
          margin-bottom: 4px;
          background: ${isSelected ? '#094771' : 'transparent'};
          transition: background 0.15s;
        ">
          <span style="color: ${isSelected ? '#4FC1FF' : '#888'};">${isSelected ? '●' : '○'}</span>
          <span style="color: #e0e0e0; flex: 1; font-family: monospace;">${portInfo.port}</span>
          <span style="color: #666; font-size: 11px;">${portInfo.description}</span>
        </div>
      `;
    }).join('');
  }
  
  // Update dialog with port list
  dialog.innerHTML = `
    <div style="padding: 16px 20px; background: #2d2d2d; border-bottom: 1px solid #454545; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">🔗</span>
      <span style="color: #fff; font-weight: 600; font-size: 15px;">Select Port</span>
    </div>
    <div style="padding: 12px; max-height: 250px; overflow-y: auto;">
      ${portListHtml}
    </div>
    <div id="refresh-port-btn" style="
      padding: 8px 12px;
      margin: 0 12px 12px 12px;
      background: #2d2d2d;
      border-radius: 4px;
      text-align: center;
      cursor: pointer;
      color: #4EC9B0;
      font-size: 12px;
      transition: background 0.15s;
    ">🔄 Refresh Ports</div>
    <div style="padding: 12px 16px; background: #252526; border-top: 1px solid #454545; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end;">
      <button id="port-dialog-cancel" style="
        padding: 8px 16px;
        background: #3c3c3c;
        border: none;
        border-radius: 4px;
        color: #ccc;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;
  
  // Add event listeners for port items
  dialog.querySelectorAll('.port-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (item.getAttribute('data-port') !== currentPort) {
        (item as HTMLElement).style.background = '#2d2d2d';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (item.getAttribute('data-port') !== currentPort) {
        (item as HTMLElement).style.background = 'transparent';
      }
    });
    item.addEventListener('click', () => {
      const port = item.getAttribute('data-port');
      (window as any).arduinoSelectedPort = port;
      showNotification(`Port: ${port}`, 'success');
      modal.remove();
    });
  });
  
  // Refresh button
  const refreshBtn = dialog.querySelector('#refresh-port-btn');
  refreshBtn?.addEventListener('click', () => {
    modal.remove();
    showPortSelectionDialog();
  });
  refreshBtn?.addEventListener('mouseenter', () => (refreshBtn as HTMLElement).style.background = '#3c3c3c');
  refreshBtn?.addEventListener('mouseleave', () => (refreshBtn as HTMLElement).style.background = '#2d2d2d');
  
  dialog.querySelector('#port-dialog-cancel')?.addEventListener('click', () => modal.remove());
}

/**
 * Show CLI Info Dialog - Display Arduino CLI information
 */
async function showCLIInfoDialog(): Promise<void> {
  // Remove existing dialog
  document.getElementById('arduino-cli-info-dialog')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'arduino-cli-info-dialog';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Loading state
  dialog.innerHTML = `
    <div style="padding: 16px; background: #2d2d2d; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">ℹ️</span>
      <span style="color: #fff; font-weight: 600; font-size: 16px;">Arduino CLI Information</span>
    </div>
    <div style="padding: 20px; color: #888;">
      <div style="text-align: center;">⏳ Loading CLI information...</div>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Get CLI info
  let cliVersion = 'Not installed';
  let cliPath = 'N/A';
  let installedCores: string[] = [];
  let installedLibraries: string[] = [];
  let debugInfo = '';
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Method 1: Use arduino_check_cli command
    // Returns: {success: true, stdout: 'arduino-cli  Version: 1.4.1 ...', stderr: '', exit_code: 0}
    try {
      const checkResult = await invoke<any>('arduino_check_cli');
      console.log('[CLI Info] arduino_check_cli result:', checkResult);
      
      if (checkResult?.success && checkResult?.stdout) {
        // Parse version from stdout: "arduino-cli  Version: 1.4.1 Commit: ..."
        const versionMatch = checkResult.stdout.match(/Version:\s*([0-9.]+)/i);
        if (versionMatch) {
          cliVersion = versionMatch[1];
        } else {
          cliVersion = 'Installed';
        }
        cliPath = 'Found in PATH';
      }
    } catch (checkErr: any) {
      console.log('[CLI Info] arduino_check_cli error:', checkErr?.message || checkErr);
    }
    
    // Get installed cores
    // Returns: [] (empty array) or array of cores
    try {
      const coresResult = await invoke<any>('arduino_list_cores');
      console.log('[CLI Info] arduino_list_cores result:', coresResult);
      
      if (Array.isArray(coresResult)) {
        installedCores = coresResult.map((c: any) => {
          const id = c.id || c.ID || c.Id || c.name || c.Name || 'Unknown';
          const ver = c.installed || c.Installed || c.version || c.Version || '';
          return ver ? `${id} (${ver})` : id;
        });
        // If we get cores, CLI is definitely installed
        if (cliVersion === 'Not installed' && coresResult.length > 0) {
          cliVersion = 'Installed';
        }
      }
    } catch (coresErr: any) {
      console.log('[CLI Info] arduino_list_cores error:', coresErr?.message || coresErr);
    }
    
    // Get installed libraries
    // Returns: {success: true, stdout: 'No libraries installed.\n', ...} or array
    try {
      const libsResult = await invoke<any>('arduino_list_libraries');
      console.log('[CLI Info] arduino_list_libraries result:', libsResult);
      
      if (Array.isArray(libsResult)) {
        installedLibraries = libsResult.slice(0, 10).map((l: any) => 
          l.library?.name || l.Library?.name || l.name || l.Name || 'Unknown'
        );
      } else if (libsResult?.success && libsResult?.stdout) {
        // Parse from stdout if it's in text format
        if (!libsResult.stdout.includes('No libraries installed')) {
          const lines = libsResult.stdout.split('\n').filter((s: string) => s.trim());
          installedLibraries = lines.slice(0, 10);
        }
      }
    } catch (libsErr: any) {
      console.log('[CLI Info] arduino_list_libraries error:', libsErr?.message || libsErr);
    }
    
    // Get path using where command (optional enhancement)
    if (cliPath === 'N/A' && cliVersion !== 'Not installed') {
      try {
        const whereResult = await invoke<any>('run_command', { 
          command: 'where arduino-cli', 
          cwd: '.' 
        });
        const whereOutput = whereResult?.stdout || whereResult?.output || '';
        if (whereOutput && typeof whereOutput === 'string') {
          cliPath = whereOutput.trim().split('\n')[0] || 'Found in PATH';
        }
      } catch {
        cliPath = 'Found in PATH';
      }
    }
    
  } catch (e: any) {
    console.log('[CLI Info] Error getting CLI info:', e);
    debugInfo += `Main error: ${e?.message || e}\n`;
  }
  
  // Determine status color
  const isInstalled = cliVersion !== 'Not installed' && cliVersion !== 'N/A';
  const versionColor = isInstalled ? '#4EC9B0' : '#f48771';
  
  // Update dialog with info
  dialog.innerHTML = `
    <div style="padding: 16px; background: #2d2d2d; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">ℹ️</span>
      <span style="color: #fff; font-weight: 600; font-size: 16px;">Arduino CLI Information</span>
    </div>
    <div style="padding: 20px;">
      <div style="display: grid; gap: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #252526; border-radius: 4px;">
          <span style="color: #888;">Status:</span>
          <span style="color: ${versionColor}; font-weight: 500;">${isInstalled ? '✓ Installed' : '✗ Not Installed'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: #252526; border-radius: 4px;">
          <span style="color: #888;">Version:</span>
          <span style="color: ${versionColor}; font-family: monospace;">${cliVersion}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #252526; border-radius: 4px;">
          <span style="color: #888;">Path:</span>
          <span style="color: #CE9178; font-family: monospace; font-size: 11px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cliPath}">${cliPath}</span>
        </div>
        <div style="padding: 10px 14px; background: #252526; border-radius: 4px;">
          <div style="color: #888; margin-bottom: 8px;">Installed Cores (${installedCores.length}):</div>
          <div style="color: #DCDCAA; font-family: monospace; font-size: 12px; max-height: 80px; overflow-y: auto;">
            ${installedCores.length > 0 ? installedCores.join('<br>') : '<span style="color: #666;">None installed</span>'}
          </div>
        </div>
        <div style="padding: 10px 14px; background: #252526; border-radius: 4px;">
          <div style="color: #888; margin-bottom: 8px;">Installed Libraries (${installedLibraries.length}${installedLibraries.length >= 10 ? '+' : ''}):</div>
          <div style="color: #569CD6; font-family: monospace; font-size: 12px; max-height: 80px; overflow-y: auto;">
            ${installedLibraries.length > 0 ? installedLibraries.join(', ') : '<span style="color: #666;">None installed</span>'}
          </div>
        </div>
      </div>
      ${!isInstalled ? `
        <div style="margin-top: 16px; padding: 12px; background: #5a1d1d; border-radius: 6px; border: 1px solid #f48771;">
          <div style="color: #f48771; font-size: 13px;">
            ⚠️ Arduino CLI not found. Install it from the Arduino menu when you open an Arduino project.
          </div>
        </div>
      ` : ''}
    </div>
    <div style="padding: 16px; background: #252526; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end; gap: 8px;">
      <button id="cli-info-close" style="
        padding: 8px 20px;
        background: #3c3c3c;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
      ">Close</button>
    </div>
  `;
  
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  dialog.querySelector('#cli-info-close')?.addEventListener('click', () => modal.remove());
}

/**
 * Show Uninstall CLI Dialog - Confirm and uninstall Arduino CLI
 */
async function showUninstallCLIDialog(): Promise<void> {
  // Remove existing dialog
  document.getElementById('arduino-uninstall-dialog')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'arduino-uninstall-dialog';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    width: 450px;
    max-width: 90vw;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  dialog.innerHTML = `
    <div style="padding: 16px; background: #5a1d1d; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">🗑️</span>
      <span style="color: #f48771; font-weight: 600; font-size: 16px;">Uninstall Arduino CLI</span>
    </div>
    <div style="padding: 20px;">
      <div style="color: #ccc; line-height: 1.6; margin-bottom: 16px;">
        Are you sure you want to uninstall Arduino CLI?
      </div>
      <div style="background: #252526; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <div style="color: #f48771; font-weight: 500; margin-bottom: 8px;">⚠️ This will remove:</div>
        <ul style="color: #888; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Arduino CLI executable</li>
          <li>All installed Arduino cores</li>
          <li>All installed libraries</li>
          <li>Configuration and cache files</li>
        </ul>
      </div>
      <div style="color: #888; font-size: 12px;">
        💡 You can reinstall Arduino CLI anytime from the Arduino menu.
      </div>
    </div>
    <div style="padding: 16px; background: #252526; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end; gap: 8px;">
      <button id="uninstall-cancel" style="
        padding: 8px 20px;
        background: #3c3c3c;
        border: none;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
      ">Cancel</button>
      <button id="uninstall-confirm" style="
        padding: 8px 20px;
        background: #d32f2f;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-weight: 500;
        cursor: pointer;
      ">🗑️ Uninstall</button>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  dialog.querySelector('#uninstall-cancel')?.addEventListener('click', () => modal.remove());
  
  dialog.querySelector('#uninstall-confirm')?.addEventListener('click', async () => {
    const confirmBtn = dialog.querySelector('#uninstall-confirm') as HTMLButtonElement;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '⏳ Uninstalling...';
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Get Arduino CLI path
      let cliPath = '';
      let arduino15Path = '';
      
      try {
        const whereResult = await invoke<any>('run_command', { 
          command: 'where arduino-cli', 
          cwd: '.' 
        });
        if (whereResult?.stdout) {
          cliPath = whereResult.stdout.trim().split('\n')[0];
        }
      } catch (e) { /* ignore */ }
      
      // Arduino15 folder location (Windows)
      const userProfile = await invoke<string>('get_env_var', { name: 'USERPROFILE' }).catch(() => '');
      if (userProfile) {
        arduino15Path = `${userProfile}\\AppData\\Local\\Arduino15`;
      }
      
      // Show progress
      dialog.innerHTML = `
        <div style="padding: 16px; background: #2d2d2d; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 20px;">🗑️</span>
          <span style="color: #fff; font-weight: 600; font-size: 16px;">Uninstalling Arduino CLI</span>
        </div>
        <div style="padding: 20px;">
          <div id="uninstall-log" style="background: #1a1a1a; border-radius: 4px; padding: 12px; font-family: monospace; font-size: 12px; color: #4EC9B0; max-height: 200px; overflow-y: auto;">
            Starting uninstall...\n
          </div>
        </div>
      `;
      
      const log = dialog.querySelector('#uninstall-log')!;
      
      // Delete CLI executable
      if (cliPath) {
        log.textContent += `Removing: ${cliPath}\n`;
        try {
          await invoke<any>('run_command', { 
            command: `del /f "${cliPath}"`, 
            cwd: '.' 
          });
          log.textContent += '✅ Arduino CLI executable removed\n';
        } catch (e) {
          log.textContent += `⚠️ Could not remove executable (may need admin)\n`;
        }
      }
      
      // Delete Arduino15 folder
      if (arduino15Path) {
        log.textContent += `Removing: ${arduino15Path}\n`;
        try {
          await invoke<any>('run_command', { 
            command: `rmdir /s /q "${arduino15Path}"`, 
            cwd: '.' 
          });
          log.textContent += '✅ Arduino15 folder removed\n';
        } catch (e) {
          log.textContent += `⚠️ Could not remove Arduino15 folder\n`;
        }
      }
      
      log.textContent += '\n✅ Uninstall complete!\n';
      log.textContent += '💡 Restart IDE to complete removal.\n';
      
      // Add close button
      const footer = document.createElement('div');
      footer.style.cssText = 'padding: 16px; background: #252526; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end;';
      footer.innerHTML = `
        <button id="uninstall-done" style="
          padding: 8px 20px;
          background: #4EC9B0;
          border: none;
          border-radius: 4px;
          color: #000;
          font-weight: 500;
          cursor: pointer;
        ">Done</button>
      `;
      dialog.appendChild(footer);
      
      footer.querySelector('#uninstall-done')?.addEventListener('click', () => {
        modal.remove();
        showNotification('Arduino CLI uninstalled. Restart IDE to complete.', 'info');
      });
      
    } catch (e: any) {
      showNotification('Uninstall failed: ' + (e?.message || e), 'error');
      modal.remove();
    }
  });
}

/**
 * Detect baud rate from project .ino/.h files
 * Scans for Serial.begin(XXXX) and #define SERIAL_BAUD XXXX patterns
 * Falls back to global setting or 9600
 */
async function detectBaudRateFromCode(): Promise<number> {
  // Check global setting first
  const globalBaud = (window as any).arduinoBaudRate;
  if (globalBaud && globalBaud !== 115200) return globalBaud;
  
  try {
    // Scan project files from file explorer DOM
    const explorerItems = document.querySelectorAll('[data-path]');
    const codePaths: string[] = [];
    explorerItems.forEach(el => {
      const path = el.getAttribute('data-path') || '';
      if (path.endsWith('.ino') || path.endsWith('.h')) codePaths.push(path);
    });
    
    // Collect baud-related defines
    const baudDefines = new Map<string, number>();
    
    for (const filePath of codePaths) {
      try {
        let content = '';
        try {
          content = await invoke<string>('read_file_content', { path: filePath });
        } catch {
          try { content = await invoke<string>('read_file', { path: filePath }); } catch { continue; }
        }
        
        // Direct match: Serial.begin(9600)
        const directMatch = content.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
        if (directMatch) {
          const baud = parseInt(directMatch[1]);
          if (baud > 0) {
            console.log(`[Serial] Detected baud rate ${baud} from ${filePath}`);
            return baud;
          }
        }
        
        // Collect #define values for indirect match
        const defineMatches = content.matchAll(/#define\s+(\w+)\s+(\d+)/g);
        for (const m of defineMatches) {
          baudDefines.set(m[1], parseInt(m[2]));
        }
        const constMatches = content.matchAll(/(?:const\s+)?(?:int|long|uint32_t)\s+(\w+)\s*=\s*(\d+)/g);
        for (const m of constMatches) {
          baudDefines.set(m[1], parseInt(m[2]));
        }
        
        // Indirect match: Serial.begin(SERIAL_BAUD) where SERIAL_BAUD is #defined
        const indirectMatch = content.match(/Serial\.begin\s*\(\s*([A-Za-z_]\w*)\s*\)/);
        if (indirectMatch && baudDefines.has(indirectMatch[1])) {
          const baud = baudDefines.get(indirectMatch[1])!;
          if (baud > 0) {
            console.log(`[Serial] Detected baud rate ${baud} from ${indirectMatch[1]} in ${filePath}`);
            return baud;
          }
        }
      } catch { /* skip file */ }
    }
    
    // Second pass: try to resolve indirect references across files
    for (const filePath of codePaths) {
      try {
        let content = '';
        try { content = await invoke<string>('read_file_content', { path: filePath }); } catch {
          try { content = await invoke<string>('read_file', { path: filePath }); } catch { continue; }
        }
        
        const indirectMatch = content.match(/Serial\.begin\s*\(\s*([A-Za-z_]\w*)\s*\)/);
        if (indirectMatch && baudDefines.has(indirectMatch[1])) {
          const baud = baudDefines.get(indirectMatch[1])!;
          if (baud > 0) {
            console.log(`[Serial] Detected baud rate ${baud} from ${indirectMatch[1]} (cross-file)`);
            return baud;
          }
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    console.warn('[Serial] Baud rate detection failed:', e);
  }
  
  // Fallback
  return globalBaud || 9600;
}

/**
 * Show Serial Plotter - Built-in graphical plotter
 */
async function showSerialPlotter(): Promise<void> {
  const currentPort = (window as any).arduinoSelectedPort || 'COM3';
  const baudRate = await detectBaudRateFromCode();
  
  // If already open, bring to front
  const existing = document.getElementById('arduino-serial-plotter');
  if (existing) {
    existing.style.zIndex = '10003';
    return;
  }
  
  // Clean up previous plotter instance
  if (activePlotter) {
    activePlotter.destroy();
    activePlotter = null;
  }

  // --- Floating Panel (no backdrop) ---
  const panel = document.createElement('div');
  panel.id = 'arduino-serial-plotter';
  panel.style.cssText = `
    position: fixed;
    top: 60px; left: 80px;
    width: 820px; height: 520px;
    min-width: 500px; min-height: 320px;
    background: #1e1e1e;
    border: 1px solid #555;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10003;
    resize: both;
  `;
  
  // --- Header (draggable) ---
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 6px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid #454545;
    border-radius: 8px 8px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    cursor: grab;
    user-select: none;
  `;

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.style.cssText = 'color:#fff; font-weight:600; font-size:13px;';
  titleSpan.innerHTML = `📊 Serial Plotter <span style="color:#22c55e; font-size:10px; font-weight:normal; background:rgba(34,197,94,0.15); padding:1px 5px; border-radius:3px; margin-left:6px;">AI</span>`;
  header.appendChild(titleSpan);

  // Connect button
  const connectBtn = document.createElement('button');
  connectBtn.style.cssText = `
    padding: 3px 10px; background: #4EC9B0; border: none; border-radius: 3px;
    color: #000; font-weight: 600; font-size: 10px; cursor: pointer;
    transition: all 0.15s; font-family: inherit; margin-left: 4px;
  `;
  connectBtn.textContent = '⚡ Connect';
  header.appendChild(connectBtn);

  // Status dot
  const statusDot = document.createElement('span');
  statusDot.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#555; display:inline-block;';
  header.appendChild(statusDot);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  header.appendChild(spacer);

  // Port/Baud info
  const infoSpan = document.createElement('span');
  infoSpan.style.cssText = 'color:#666; font-size:11px;';
  infoSpan.innerHTML = `<span style="color:#4EC9B0;">${currentPort}</span> · ${baudRate}`;
  header.appendChild(infoSpan);

  // Minimize button
  const minBtn = document.createElement('button');
  minBtn.style.cssText = 'background:none; border:none; color:#888; font-size:14px; cursor:pointer; padding:2px 6px; line-height:1;';
  minBtn.textContent = '─';
  minBtn.title = 'Minimize';
  header.appendChild(minBtn);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none; border:none; color:#888; font-size:16px; cursor:pointer; padding:2px 6px; line-height:1;';
  closeBtn.textContent = '×';
  closeBtn.title = 'Close';
  closeBtn.onmouseenter = () => { closeBtn.style.color = '#ff5555'; closeBtn.style.background = 'rgba(255,85,85,0.15)'; closeBtn.style.borderRadius = '3px'; };
  closeBtn.onmouseleave = () => { closeBtn.style.color = '#888'; closeBtn.style.background = 'none'; };
  header.appendChild(closeBtn);

  panel.appendChild(header);
  
  // --- Plotter container ---
  const plotterContainer = document.createElement('div');
  plotterContainer.style.cssText = 'flex:1; overflow:hidden;';
  panel.appendChild(plotterContainer);
  
  document.body.appendChild(panel);
  
  // Create the enhanced plotter
  activePlotter = createSerialPlotter(plotterContainer);

  // --- Drag to Move ---
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let panelStartX = 0, panelStartY = 0;

  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panelStartX = panel.offsetLeft;
    panelStartY = panel.offsetTop;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  function onDragMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    let newX = panelStartX + dx;
    let newY = panelStartY + dy;
    newX = Math.max(0, Math.min(newX, window.innerWidth - 100));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 40));
    panel.style.left = newX + 'px';
    panel.style.top = newY + 'px';
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = 'grab';
  }

  // Bring to front on click
  panel.addEventListener('mousedown', () => {
    panel.style.zIndex = '10003';
  });

  // --- Minimize / Restore ---
  let isMinimized = false;
  let savedHeight = '520px';

  minBtn.addEventListener('click', () => {
    if (isMinimized) {
      panel.style.height = savedHeight;
      panel.style.resize = 'both';
      plotterContainer.style.display = 'flex';
      minBtn.textContent = '─';
      minBtn.title = 'Minimize';
      isMinimized = false;
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    } else {
      savedHeight = panel.style.height || (panel.offsetHeight + 'px');
      plotterContainer.style.display = 'none';
      panel.style.height = 'auto';
      panel.style.resize = 'none';
      minBtn.textContent = '□';
      minBtn.title = 'Restore';
      isMinimized = true;
    }
  });

  // --- Direct Serial Connection ---
  let isConnected = false;
  let plotterUnlisten: (() => void) | null = null;
  let ownConnection = false;

  async function connectSerial() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');

      const unData = await listen<any>('arduino-serial-data', (event: any) => {
        const payload = event.payload;
        const data = typeof payload === 'string' ? payload : payload?.data || '';
        if (data && activePlotter) {
          activePlotter.feedLine(data);
          serialLogger.addLine(data);
        }
      });

      const unErr = await listen<any>('arduino-serial-error', (event: any) => {
        const payload = event.payload;
        const errMsg = typeof payload === 'string' ? payload : payload?.error || 'Unknown error';
        console.warn('[PlotterAI] Serial error:', errMsg);
      });

      const unDisc = await listen<any>('arduino-serial-disconnected', () => {
        console.log('[PlotterAI] Serial disconnected');
        setDisconnected();
      });

      plotterUnlisten = () => { unData(); unErr(); unDisc(); };

      const monitorRunning = document.getElementById('arduino-serial-monitor') !== null;

      if (!monitorRunning) {
        await invoke('arduino_serial_monitor_start', { port: currentPort, baudRate: baudRate });
        ownConnection = true;
        console.log('[PlotterAI] Connected to', currentPort, 'at', baudRate);
      } else {
        ownConnection = false;
        console.log('[PlotterAI] Piggybacking on Serial Monitor connection');
      }

      isConnected = true;
      connectBtn.textContent = '⏹ Disconnect';
      connectBtn.style.background = '#d32f2f';
      connectBtn.style.color = '#fff';
      statusDot.style.background = '#22c55e';
      statusDot.style.boxShadow = '0 0 6px #22c55e88';

    } catch (e: any) {
      console.error('[PlotterAI] Connection failed:', e);
      if (plotterUnlisten) { plotterUnlisten(); plotterUnlisten = null; }
      if (activePlotter) activePlotter.startDemo();
      showNotification(`Could not connect to ${currentPort} — running demo mode. Close Arduino IDE or check port.`, 'info');
    }
  }

  function setDisconnected() {
    isConnected = false;
    connectBtn.textContent = '⚡ Connect';
    connectBtn.style.background = '#4EC9B0';
    connectBtn.style.color = '#000';
    statusDot.style.background = '#555';
    statusDot.style.boxShadow = 'none';
  }

  async function disconnectSerial() {
    if (activePlotter) activePlotter.stopDemo();
    if (plotterUnlisten) { plotterUnlisten(); plotterUnlisten = null; }
    if (ownConnection) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('arduino_serial_monitor_stop', { port: currentPort });
      } catch (e) { /* ignore */ }
      ownConnection = false;
    }
    setDisconnected();
  }

  connectBtn.addEventListener('click', () => {
    isConnected ? disconnectSerial() : connectSerial();
  });

  connectSerial();

  // --- Close ---
  function closePlotter() {
    disconnectSerial();
    if (activePlotter) { activePlotter.destroy(); activePlotter = null; }
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('keydown', escHandler);
    panel.remove();
  }
  
  closeBtn.addEventListener('click', closePlotter);
  
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePlotter();
  };
  document.addEventListener('keydown', escHandler);
  
  const observer = new MutationObserver(() => {
    if (!document.body.contains(panel)) {
      disconnectSerial();
      if (activePlotter) { activePlotter.destroy(); activePlotter = null; }
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('keydown', escHandler);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}


/**
 * Show Serial Monitor - Text-based serial output viewer
 */
async function showSerialMonitor(): Promise<void> {
  const currentPort = (window as any).arduinoSelectedPort || 'COM3';
  const baudRate = await detectBaudRateFromCode();
  
  // Remove existing monitor
  document.getElementById('arduino-serial-monitor')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'arduino-serial-monitor';
  modal.style.cssText = `
    position: fixed;
    bottom: 10px; right: 10px;
    z-index: 10003;
    pointer-events: none;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    width: 550px;
    height: 550px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    resize: both;
    overflow: hidden;
  `;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    background: #2d2d2d;
    border-bottom: 1px solid #454545;
    border-radius: 8px 8px 0 0;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  header.innerHTML = `
    <span style="font-size: 18px;">🔌</span>
    <span style="color: #fff; font-weight: 600; font-size: 14px;">Serial Monitor <span style="color: #f48771; font-size: 11px; font-weight: normal; background: #5a1d1d; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">LIVE</span></span>
    <div style="flex: 1;"></div>
    <span style="color: #888; font-size: 12px;">Port: <span style="color: #4EC9B0;">${currentPort}</span></span>
    <span style="color: #888; font-size: 12px; margin-left: 10px;">Baud: <span style="color: #4EC9B0;">${baudRate}</span></span>
    <button id="monitor-close" style="
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      margin-left: 10px;
    ">×</button>
  `;
  dialog.appendChild(header);

  // Make header draggable
  header.style.cursor = 'move';
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SPAN') return;
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    modal.style.left = (e.clientX - dragOffsetX) + 'px';
    modal.style.top = (e.clientY - dragOffsetY) + 'px';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
  
  // External tools bar
  const toolsBar = document.createElement('div');
  toolsBar.style.cssText = `
    padding: 8px 12px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  toolsBar.innerHTML = `
    <span style="color: #888; font-size: 11px;">For real-time serial:</span>
    <button id="monitor-putty" style="
      padding: 4px 10px;
      background: #0078D4;
      border: none;
      border-radius: 3px;
      color: #fff;
      font-size: 11px;
      cursor: pointer;
    ">🖥️ PuTTY</button>
    <button id="monitor-arduino" style="
      padding: 4px 10px;
      background: #00979D;
      border: none;
      border-radius: 3px;
      color: #fff;
      font-size: 11px;
      cursor: pointer;
    ">📟 Arduino IDE</button>
    <button id="monitor-terminal" style="
      padding: 4px 10px;
      background: #3c3c3c;
      border: none;
      border-radius: 3px;
      color: #ccc;
      font-size: 11px;
      cursor: pointer;
    ">⌨️ Terminal</button>
  `;
  dialog.appendChild(toolsBar);
  
  // Output area
  const outputArea = document.createElement('div');
  outputArea.id = 'monitor-output';
  outputArea.style.cssText = `
    flex: 1;
    padding: 12px;
    background: #1a1a1a;
    margin: 12px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    color: #4EC9B0;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  `;
  outputArea.innerHTML = `<span style="color: #666;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>
<span style="color: #FF6B6B; font-weight: bold; font-size: 14px;">  ⚠️  Serial Monitor - Real-time Mode</span>
<span style="color: #666;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

<span style="color: #888;">Port:</span> <span style="color: #4EC9B0;">${currentPort}</span> <span style="color: #888;">@</span> <span style="color: #4EC9B0;">${baudRate}</span> <span style="color: #888;">baud</span>
<span style="color: #888;">Mode: Real-time event streaming (~60fps)</span>

<span style="color: #DCDCAA;">💡 For real-time serial monitoring, use the buttons above:</span>
<span style="color: #888;">   • PuTTY - Fast, lightweight terminal</span>
<span style="color: #888;">   • Arduino IDE - Official serial monitor</span>
<span style="color: #888;">   • Terminal - PowerShell serial reader</span>

<span style="color: #569CD6;">Click [▶ Start] to begin monitoring...</span>
`;
  dialog.appendChild(outputArea);

  // === SERIAL MONITOR AI INTEGRATION ===
  serialLogger.clear();
  const tabBar = createTabBar(dialog, outputArea);
  outputArea.parentElement?.insertBefore(tabBar, outputArea);

  outputArea.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection()?.toString() || '';
    showSerialContextMenu(e.clientX, e.clientY, selection || serialLogger.getLastNLines(20));
  });

  serialLogger.onIssueDetected = (issue: any) => {
    console.log('[SerialAI] Issue:', issue.title);
    updateErrorBadge();
  };
  // === END AI INTEGRATION ===


  
  // Input area
  const inputArea = document.createElement('div');
  inputArea.style.cssText = `
    padding: 12px 16px;
    background: #252526;
    border-top: 1px solid #454545;
    display: flex;
    gap: 8px;
    align-items: center;
  `;
  inputArea.innerHTML = `
    <input id="monitor-input" type="text" placeholder="Send to Arduino..." style="
      flex: 1;
      padding: 8px 12px;
      background: #1a1a1a;
      border: 1px solid #454545;
      border-radius: 4px;
      color: #fff;
      font-family: monospace;
      font-size: 13px;
    ">
    <button id="monitor-send" style="
      padding: 8px 16px;
      background: #4EC9B0;
      border: none;
      border-radius: 4px;
      color: #000;
      font-weight: 500;
      cursor: pointer;
    ">Send</button>
  `;
  dialog.appendChild(inputArea);
  
  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = `
    padding: 12px 16px;
    background: #252526;
    border-top: 1px solid #3c3c3c;
    border-radius: 0 0 8px 8px;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  controls.innerHTML = `
    <button id="monitor-start" style="
      padding: 8px 16px;
      background: #4EC9B0;
      border: none;
      border-radius: 4px;
      color: #000;
      font-weight: 500;
      cursor: pointer;
    ">▶ Start</button>
    <button id="monitor-stop" style="
      padding: 8px 16px;
      background: #d32f2f;
      border: none;
      border-radius: 4px;
      color: #fff;
      font-weight: 500;
      cursor: pointer;
      display: none;
    ">⏹ Stop</button>
    <button id="monitor-clear" style="
      padding: 8px 16px;
      background: #3c3c3c;
      border: none;
      border-radius: 4px;
      color: #ccc;
      cursor: pointer;
    ">Clear</button>
    <div style="flex: 1;"></div>
    <label style="color: #888; font-size: 12px; display: flex; align-items: center; gap: 6px;">
      <input type="checkbox" id="monitor-autoscroll" checked style="accent-color: #4EC9B0;">
      Auto-scroll
    </label>
    <label style="color: #888; font-size: 12px; display: flex; align-items: center; gap: 6px;">
      <input type="checkbox" id="monitor-timestamp" style="accent-color: #4EC9B0;">
      Timestamps
    </label>
  `;
  dialog.appendChild(controls);
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // State
  let isRunning = false;
  let readInterval: number | null = null;
  
  async function startMonitor() {
    isRunning = true;
    (document.getElementById('monitor-start') as HTMLElement).style.display = 'none';
    (document.getElementById('monitor-stop') as HTMLElement).style.display = 'inline-block';

    const output = document.getElementById('monitor-output')!;
    output.innerHTML += '<span style="color: #569CD6;">--- Connecting (real-time mode) ---</span>\n';

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');

      // Set up event listener BEFORE starting monitor
      // This replaces the old setInterval polling
      let pendingText: string[] = [];
      let lineBuffer = '';
      let rafId: number | null = null;
      let lineCount = 0;
      const MAX_LINES = 5000;

      // Batch DOM updates with requestAnimationFrame (~60fps)
      function flushOutput() {
        rafId = null;
        if (pendingText.length === 0) return;

        const combined = lineBuffer + pendingText.join('');
        pendingText = [];

        const showTimestamp = (document.getElementById('monitor-timestamp') as HTMLInputElement)?.checked;
        const autoScroll = (document.getElementById('monitor-autoscroll') as HTMLInputElement)?.checked;

        const fragment = document.createDocumentFragment();
        const endsWithNewline = combined.endsWith('\n') || combined.endsWith('\r\n');
        const lines = combined.split('\n');
        if (!endsWithNewline && lines.length > 0) {
          lineBuffer = lines.pop() || '';
        } else {
          lineBuffer = '';
        }

        for (const line of lines) {
          if (line.length === 0 && lines.length > 1) continue;
          const div = document.createElement('div');
          div.style.cssText = 'padding: 0 8px; white-space: pre-wrap; word-break: break-all; color: #4EC9B0; min-height: 18px; font-family: Consolas, monospace; font-size: 13px; line-height: 1.4;';

          if (showTimestamp) {
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            const timeSpan = document.createElement('span');
            timeSpan.style.color = '#888';
            timeSpan.style.fontSize = '11px';
            timeSpan.style.marginRight = '6px';
            timeSpan.textContent = '[' + time + ']';
            div.appendChild(timeSpan);
          }

          const textSpan = document.createElement('span');
          textSpan.textContent = line.replace(/\r/g, '');
          div.appendChild(textSpan);


          // AI: Color-code error/anomaly lines
          const loggedLines = serialLogger.lines;
          if (loggedLines.length > 0) {
            const lastLogged = loggedLines[loggedLines.length - 1];
            if (lastLogged && lastLogged.text === line.replace(/\\r/g, '')) {
              if (lastLogged.type === 'error') {
                div.style.borderLeft = '3px solid #FF6B6B';
                div.style.background = 'rgba(255,107,107,0.08)';
                div.style.color = '#FF6B6B';
              } else if (lastLogged.type === 'anomaly') {
                div.style.borderLeft = '3px solid #FFD93D';
                div.style.background = 'rgba(255,217,61,0.06)';
                div.style.color = '#FFD93D';
              }
            }
          }
          fragment.appendChild(div);
          lineCount++;
        }

        output.appendChild(fragment);

        // Trim old lines to prevent memory issues
        while (lineCount > MAX_LINES && output.firstChild) {
          output.removeChild(output.firstChild);
          lineCount--;
        }

        if (autoScroll !== false) {
          output.scrollTop = output.scrollHeight;
        }
      }

      // Listen for serial data events from Rust backend
      const unlisten = await listen<any>('arduino-serial-data', (event: any) => {
        const payload = event.payload;
        const data = typeof payload === 'string' ? payload : payload?.data || '';
        if (data) {
          // Log to AI analyzer
          serialLogger.addLine(data);
          // Feed to AI plotter (if open)
          if (activePlotter) activePlotter.feedLine(data);
          pendingText.push(data);
          if (!rafId) {
            rafId = requestAnimationFrame(flushOutput);
          }
        }
      });

      // Listen for errors
      const unlistenErr = await listen<any>('arduino-serial-error', (event: any) => {
        const payload = event.payload;
        const errMsg = typeof payload === 'string' ? payload : payload?.error || 'Unknown error';
        output.innerHTML += '<span style="color: #FF6B6B;">Error: ' + escapeHtml(errMsg) + '</span>\n';
      });

      // Listen for disconnect
      const unlistenDisc = await listen<any>('arduino-serial-disconnected', () => {
        output.innerHTML += '<span style="color: #888;">--- Disconnected ---</span>\n';
      });

      // Store unlisten functions for cleanup
      (window as any).__serialUnlisten = () => {
        unlisten();
        unlistenErr();
        unlistenDisc();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      };

      // Start the monitor (opens port ONCE, streams via events)
      try {
        await invoke('arduino_serial_monitor_start', {
          port: currentPort,
          baudRate: baudRate
        });
        output.innerHTML += '<span style="color: #4EC9B0;">Connected to ' + escapeHtml(currentPort) + ' at ' + baudRate + ' baud (real-time)</span>\n';
      } catch (e: any) {
        output.innerHTML += '<span style="color: #FF6B6B;">Connection failed: ' + escapeHtml(e?.message || String(e)) + '</span>\n';
        output.innerHTML += '<span style="color: #DCDCAA;">Tip: Close Arduino IDE, check port in Device Manager</span>\n';
        (window as any).__serialUnlisten?.();
        stopMonitor();
      }

    } catch (e) {
      output.innerHTML += '<span style="color: #FF6B6B;">Error: ' + escapeHtml(String(e)) + '</span>\n';
      stopMonitor();
    }
  }
  
  // Helper to escape HTML
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  
  function stopMonitor() {
    isRunning = false;

    // Clean up event listeners
    if ((window as any).__serialUnlisten) {
      (window as any).__serialUnlisten();
      delete (window as any).__serialUnlisten;
    }

    // Stop the Rust-side monitor
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('arduino_serial_monitor_stop', { port: currentPort }).catch(() => {});
    });

    // Clear old polling interval (legacy cleanup)
    if (readInterval) {
      clearInterval(readInterval);
      readInterval = null;
    }

    (document.getElementById('monitor-start') as HTMLElement).style.display = 'inline-block';
    (document.getElementById('monitor-stop') as HTMLElement).style.display = 'none';

    const output = document.getElementById('monitor-output');
    if (output) {
      output.innerHTML += '<span style="color: #888;">--- Stopped ---</span>\n';
    }
  }
  
  async function sendData() {
    const input = document.getElementById('monitor-input') as HTMLInputElement;
    const data = input.value;
    if (!data) return;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('arduino_serial_monitor_send', { 
        port: currentPort, 
        addNewline: true,
        data: data + '\n'
      });
      
      const output = document.getElementById('monitor-output')!;
      output.innerHTML += `<span style="color: #CE9178;">&gt; ${escapeHtml(data)}</span>\n`;
      input.value = '';
      
      // Auto-scroll
      const autoScroll = (document.getElementById('monitor-autoscroll') as HTMLInputElement)?.checked;
      if (autoScroll) {
        output.scrollTop = output.scrollHeight;
      }
    } catch (e) {
      showNotification('Failed to send: ' + e, 'error');
    }
  }
  
  // Event listeners
  document.getElementById('monitor-start')?.addEventListener('click', startMonitor);
  document.getElementById('monitor-stop')?.addEventListener('click', stopMonitor);
  document.getElementById('monitor-clear')?.addEventListener('click', () => {
    const output = document.getElementById('monitor-output');
    if (output) {
      output.innerHTML = `<span style="color: #666;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>
<span style="color: #FF6B6B; font-weight: bold; font-size: 14px;">  ⚠️  Serial Monitor - Real-time Mode</span>
<span style="color: #666;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

<span style="color: #888;">Cleared. Click [▶ Start] to begin monitoring...</span>
`;
    }
  });
  document.getElementById('monitor-send')?.addEventListener('click', sendData);
  document.getElementById('monitor-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendData();
  });
  document.getElementById('monitor-close')?.addEventListener('click', () => {
    stopMonitor();
    modal.remove();
  });
  
  // External tool buttons
  document.getElementById('monitor-putty')?.addEventListener('click', async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Launch PuTTY with serial settings
      const cmd = `start "" "putty" -serial ${currentPort} -sercfg ${baudRate},8,n,1,N`;
      await invoke<any>('run_command', { command: cmd, cwd: '.' });
      showNotification(`🖥️ Launching PuTTY for ${currentPort}...`, 'info');
    } catch (e) {
      showNotification('💡 Install PuTTY: https://putty.org', 'info');
    }
  });
  
  document.getElementById('monitor-arduino')?.addEventListener('click', async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Try Arduino IDE 2.x
      await invoke<any>('run_command', { command: 'start "" "arduino-ide"', cwd: '.' });
      showNotification('📟 Opening Arduino IDE - use Tools → Serial Monitor', 'info');
    } catch (e) {
      showNotification('💡 Open Arduino IDE → Tools → Serial Monitor', 'info');
    }
  });
  
  document.getElementById('monitor-terminal')?.addEventListener('click', async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Open PowerShell with mode command to read serial
      const script = `
$port = new-Object System.IO.Ports.SerialPort ${currentPort},${baudRate},None,8,one
Write-Host "Opening ${currentPort} at ${baudRate} baud... (Ctrl+C to stop)" -ForegroundColor Green
$port.Open()
while ($true) { 
  if ($port.BytesToRead -gt 0) { 
    Write-Host $port.ReadLine() 
  } 
  Start-Sleep -Milliseconds 10 
}`;
      const cmd = `start powershell -NoExit -Command "${script.replace(/\n/g, '; ')}"`;
      await invoke<any>('run_command', { command: cmd, cwd: '.' });
      showNotification('⌨️ Opening PowerShell serial terminal...', 'info');
    } catch (e) {
      showNotification(`💡 Use PowerShell: [System.IO.Ports.SerialPort]::new("${currentPort}",${baudRate})`, 'info');
    }
  });
  
  // Backdrop close disabled (floating panel)
  // stopMonitor called via Stop button or X button



  
  // Don't auto-start - wait for user to click Start button
  // startMonitor();
}

/**
 * Create dropdown menu
 */
async function createDropdownMenu(buildSystem: any): Promise<HTMLElement> {
  const menu = document.createElement('div');
  menu.id = 'build-system-dropdown-menu';
  menu.className = 'build-system-dropdown-menu';
  menu.style.cssText = `
    position: fixed;
    background: #1e1e1e;
    background-color: #1e1e1e !important;
    border: 1px solid #454545;
    border-radius: 6px;
    display: none;
    min-width: 240px;
    max-width: 320px;
    max-height: 550px;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
    z-index: 10000;
    padding: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  `;
  
  const scripts = await getProjectScripts();
  cachedScripts = scripts;
  
  const isArduino = buildSystem?.isEmbedded;
  const itemCount = scripts ? Object.keys(scripts).filter(k => !k.startsWith('──')).length : 0;
  const countLabel = isArduino ? 'files' : 'scripts';
  
  // Header (compact)
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid #454545;
    margin-bottom: 6px;
    border-radius: 4px 4px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  const iconHtml = isArduino 
    ? `<span style="font-size: 16px;">${buildSystem.icon}</span>`
    : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L1 4.5V11.5L8 15L15 11.5V4.5L8 1Z" stroke="#4EC9B0" stroke-width="1.5" fill="none"/>
        <path d="M1 4.5L8 8M8 8L15 4.5M8 8V15" stroke="#4EC9B0" stroke-width="1.5"/>
      </svg>`;
  
  header.innerHTML = `
    ${iconHtml}
    <span style="color: #ccc; font-size: 12px; font-weight: 500;">${buildSystem.displayName}</span>
    <span style="color: #888; font-size: 11px; margin-left: auto;">${itemCount} ${countLabel}</span>
  `;
  menu.appendChild(header);
  
  // For Arduino, show special menu
  if (isArduino) {
    await createArduinoDropdownContent(menu, buildSystem, scripts);
  } else if (!scripts || Object.keys(scripts).length === 0) {
    const noScripts = document.createElement('div');
    noScripts.style.cssText = 'padding: 12px; color: #888; font-size: 12px; text-align: center;';
    noScripts.textContent = 'No scripts found';
    menu.appendChild(noScripts);
  } else {
    const sortedScripts = Object.entries(scripts)
      .map(([name, command]) => ({ name, command: command as string, ...getScriptStyle(name) }))
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    
    let lastCategory = -1;
    
    sortedScripts.forEach(({ name, command, icon, color, priority }) => {
      const category = Math.floor(priority / 10) * 10;
      
      if (lastCategory !== -1 && category !== lastCategory && category < 200) {
        const divider = document.createElement('div');
        divider.style.cssText = 'height: 1px; background: #3c3c3c; margin: 4px 0;';
        menu.appendChild(divider);
      }
      lastCategory = category;
      
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 6px 10px;
        cursor: pointer;
        color: #ccc;
        font-size: 12px;
        border-radius: 3px;
        transition: background 0.1s;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      
      item.innerHTML = `
        <span style="color: ${color}; font-size: 11px; width: 14px; text-align: center;">${icon}</span>
        <span style="flex: 1;">${name}</span>
        <span style="color: #666; font-size: 10px; font-family: monospace; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${command}">${command}</span>
      `;
      
      item.addEventListener('mouseenter', () => { item.style.background = '#37373d'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
      
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        await runNpmScript(name);
      });
      
      menu.appendChild(item);
    });
  }
  
  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = 'height: 1px; background: #3c3c3c; margin: 4px 0;';
  menu.appendChild(divider);
  
  // Build Info
  const infoItem = document.createElement('div');
  infoItem.style.cssText = `
    padding: 6px 10px;
    cursor: pointer;
    color: #888;
    font-size: 12px;
    border-radius: 3px;
    transition: background 0.1s;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  infoItem.innerHTML = '<span style="font-size: 11px; width: 14px; text-align: center;">ⓘ</span><span>Build System Info</span>';
  
  infoItem.addEventListener('mouseenter', () => { infoItem.style.background = '#37373d'; infoItem.style.color = '#ccc'; });
  infoItem.addEventListener('mouseleave', () => { infoItem.style.background = 'transparent'; infoItem.style.color = '#888'; });
  
  infoItem.addEventListener('click', async (e) => {
    e.stopPropagation();
    menu.style.display = 'none';
    await showBuildInfoDialog();
  });
  
  menu.appendChild(infoItem);

  // Android Panel button (for Gradle/Android projects)
  const hasGradleScripts = cachedScripts && ('assembleDebug' in cachedScripts);
  if (hasGradleScripts) {
    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: #333; margin: 6px 0;';
    menu.insertBefore(sep, infoItem);
    const androidBtn = document.createElement('div');
    androidBtn.style.cssText = 'padding: 6px 12px; cursor: pointer; color: #4FC3F7; font-size: 12px; border-radius: 3px; transition: background 0.1s; display: flex; align-items: center; gap: 8px;';
    androidBtn.innerHTML = '<span style="font-size: 13px;">📱</span><span>Android Panel</span><span style="color: #666; font-size: 10px; margin-left: auto;">Ctrl+Shift+D</span>';
    androidBtn.addEventListener('mouseenter', () => { androidBtn.style.background = '#37373d'; });
    androidBtn.addEventListener('mouseleave', () => { androidBtn.style.background = 'transparent'; });
    androidBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      menu.style.display = 'none';
      if ((window as any).androidPanel) { (window as any).androidPanel.toggle(); }
    });
    menu.insertBefore(androidBtn, infoItem);
  }
  
  return menu;
}

/**
 * Add build system button to menu bar - MATCHING STYLE of other menu items
 */


export async function addBuildSystemIndicator(): Promise<void> {
  // ✅ NEW: Prevent concurrent execution
  if (isRefreshing) {
    console.log('[BuildSystem] Already refreshing, skipping...');
    return;
  }
  
  // ✅ NEW: Check if indicator already exists
  const existing = document.getElementById('build-system-menu-item');
  if (existing) {
    console.log('[BuildSystem] Indicator already exists, removing first...');
  }
  
  isRefreshing = true;
  console.log('[BuildSystem] 📋 Adding to menu bar...');
  
  try {
    removeBuildSystemIndicator();
  
  const projectPath = getActualProjectPath();
  if (!projectPath) {
    console.log('[BuildSystem] ⚠️ No project path found');
    isRefreshing = false;
    return;
  }
  console.log('[BuildSystem] Project path:', projectPath);
  
  const buildSystem = await detectBuildSystem(projectPath);
  if (!buildSystem) {
    console.log('[BuildSystem] ⚠️ No build system detected for:', projectPath);
    isRefreshing = false;
    return;
  }
  console.log('[BuildSystem] ✅ Detected build system:', buildSystem.displayName, buildSystem.isEmbedded ? '(embedded)' : '');
  
  const menuBar = document.querySelector('.menu-bar') as HTMLElement;
  if (!menuBar) {
    console.log('[BuildSystem] ⚠️ Menu bar not found in DOM');
    isRefreshing = false;
    return;
  }
  console.log('[BuildSystem] ✅ Menu bar found');
  
  // Find the Run button
  const runButton = menuBar.querySelector('[data-menu="run"]') || 
                    Array.from(menuBar.querySelectorAll('.menu-item, button, div')).find(
                      el => el.textContent?.trim().toLowerCase() === 'run'
                    );
  
  const scripts = await getProjectScripts();
  const scriptCount = scripts ? Object.keys(scripts).filter(k => !k.startsWith('──')).length : 0;
  const countLabel = buildSystem.isEmbedded ? 'files' : 'scripts';
  
  // Create menu button - SAME STYLE AS OTHER MENU ITEMS
  const menuButton = document.createElement('div');
  menuButton.id = 'build-system-menu-item';
  menuButton.className = 'menu-item build-system-menu-item';
  menuButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    cursor: pointer;
    color: #cccccc;
    font-size: 13px;
    border-radius: 4px;
    transition: background 0.1s;
    background: transparent;
    border: none;
  `;
  
  // Use build system icon for Arduino
  const iconHtml = buildSystem.isEmbedded 
    ? `<span style="font-size: 14px;">${buildSystem.icon}</span>`
    : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity: 0.8;">
        <path d="M8 1L1 4.5V11.5L8 15L15 11.5V4.5L8 1Z" stroke="#4EC9B0" stroke-width="1.2" fill="none"/>
        <path d="M1 4.5L8 8M8 8L15 4.5M8 8V15" stroke="#4EC9B0" stroke-width="1.2"/>
      </svg>`;
  
  menuButton.innerHTML = `
    ${iconHtml}
    <span style="color: #4EC9B0;">${buildSystem.displayName}</span>
    <span style="color: #888; font-size: 11px;">(${scriptCount} ${countLabel})</span>
    <span style="color: #888; font-size: 8px; margin-left: 2px;">▼</span>
  `;
  
  menuButton.title = `${buildSystem.displayName} - ${scriptCount} ${countLabel}`;
  
  // Hover - same as other menu items
  menuButton.addEventListener('mouseenter', () => {
    menuButton.style.background = '#37373d';
  });
  
  menuButton.addEventListener('mouseleave', () => {
    if (dropdownMenu?.style.display !== 'block') {
      menuButton.style.background = 'transparent';
    }
  });
  
  dropdownMenu = await createDropdownMenu(buildSystem);
  document.body.appendChild(dropdownMenu);
  
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropdownMenu) return;
    
    if (dropdownMenu.style.display === 'none' || !dropdownMenu.style.display) {
      const rect = menuButton.getBoundingClientRect();
      dropdownMenu.style.left = rect.left + 'px';
      dropdownMenu.style.top = (rect.bottom + 2) + 'px';
      dropdownMenu.style.display = 'block';
      menuButton.style.background = '#37373d';
    } else {
      dropdownMenu.style.display = 'none';
      menuButton.style.background = 'transparent';
    }
  });
  
  document.addEventListener('click', (e) => {
    if (dropdownMenu && !menuButton.contains(e.target as Node)) {
      dropdownMenu.style.display = 'none';
      menuButton.style.background = 'transparent';
    }
  });
  
  // Insert AFTER Run button
  if (runButton && runButton.nextSibling) {
    runButton.parentNode?.insertBefore(menuButton, runButton.nextSibling);
  } else if (runButton) {
    runButton.parentNode?.appendChild(menuButton);
  } else {
    menuBar.appendChild(menuButton);
  }
  
  console.log('[BuildSystem] Added to menu bar');
  } finally {
    // ✅ NEW: Always reset the mutex
    isRefreshing = false;
  }
}

/**
 * Keyboard shortcuts
 */
export function addBuildSystemShortcuts(): void {
  if (shortcutsInitialized) return;
  shortcutsInitialized = true;
  
  document.addEventListener('keydown', async (e) => {
    const bs = (window as any).buildSystem;
    if (!bs) return;
    
    if (e.ctrlKey && e.shiftKey && e.key === 'B') { e.preventDefault(); await bs.buildAndRun(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'R') { e.preventDefault(); await bs.runProject(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); await bs.testProject(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); await bs.cleanProject(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); await showBuildInfoDialog(); }
  });
}

/**
 * Handle project changes
 */
export async function onProjectChanged(projectPath: string | null, forceRefresh: boolean = false): Promise<void> {
  cachedScripts = null; // clear stale cache on project switch
  // Skip only if same path AND not forcing refresh
  if (projectPath === lastProjectPath && !forceRefresh) {
    console.log('🔄 [BuildSystemUI] Same project path, skipping refresh');
    return;
  }
  
  console.log('🔄 [BuildSystemUI] onProjectChanged:', projectPath);
  lastProjectPath = projectPath;
  cachedScripts = null;
  
  if (!projectPath) {
    removeBuildSystemIndicator();
  } else {
    await new Promise(resolve => setTimeout(resolve, 300));
    await addBuildSystemIndicator();
  }
}

/**
 * Setup listeners
 */
function setupProjectChangeListeners(): void {
  console.log('🔄 [BuildSystemUI] Setting up project change listeners...');
  
  // Listen for project-opened
  window.addEventListener('project-opened', async (e: Event) => {
    console.log('🔄 [BuildSystemUI] project-opened event');
    cachedScripts = null; // Clear cache
    await onProjectChanged((e as CustomEvent).detail?.path || (window as any).currentFolderPath);
  });
  
  // Listen for project-closed
  window.addEventListener('project-closed', async () => { 
    cachedScripts = null;
    await onProjectChanged(null); 
  });
  
  // Listen for project-created - Force refresh when new project is created
  document.addEventListener('project-created', async (e: Event) => {
    console.log('🔄 [BuildSystemUI] project-created event - forcing refresh');
    cachedScripts = null;
    lastProjectPath = null;
    // Single call - forceRefreshBuildSystem has debouncing built-in
    setTimeout(() => forceRefreshBuildSystem(), 800);
  });
  
  // Listen for folder-opened
  document.addEventListener('folder-opened', async (e: Event) => {
    console.log('🔄 [BuildSystemUI] folder-opened event');
    cachedScripts = null;
    const newPath = (e as CustomEvent).detail?.path || (window as any).currentFolderPath;
    await onProjectChanged(newPath);
  });
  
  // ✅ NEW: Listen for project-path-changed (dispatched by fileExplorer.ts)
  document.addEventListener('project-path-changed', async (e: Event) => {
    console.log('🔄 [BuildSystemUI] project-path-changed event');
    const newPath = (e as CustomEvent).detail?.path;
    if (newPath && newPath !== lastProjectPath) {
      console.log('🔄 [BuildSystemUI] Path changed, forcing refresh');
      cachedScripts = null;
      lastProjectPath = null;
      setTimeout(() => forceRefreshBuildSystem(), 100);
    }
  });
  
  // ✅ NEW: Listen for folder-changed (dispatched by fileExplorer.ts)
  window.addEventListener('folder-changed', async (e: Event) => {
    console.log('🔄 [BuildSystemUI] folder-changed event');
    const newPath = (e as CustomEvent).detail?.path;
    if (newPath && newPath !== lastProjectPath) {
      cachedScripts = null;
      lastProjectPath = null;
      setTimeout(() => forceRefreshBuildSystem(), 100);
    }
  });
  
  // Watch currentFolderPath for changes
  let lastCheckedPath: string | undefined;
  setInterval(async () => {
    const currentPath = (window as any).currentFolderPath || localStorage.getItem('currentProjectPath');
    if (currentPath !== lastCheckedPath) {
      console.log('🔄 [BuildSystemUI] Path changed:', lastCheckedPath, '->', currentPath);
      lastCheckedPath = currentPath;
      cachedScripts = null; // Clear cache on path change
      await onProjectChanged(currentPath || null, true);
    }
  }, 1000); // Check every 1 second
  
  // ✅ NEW: Watch for project header changes in file explorer
  const setupProjectHeaderObserver = () => {
    const projectHeader = document.querySelector('.project-header, .fcm-header, .fcm-header-name');
    if (projectHeader) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'characterData' || mutation.type === 'childList') {
            console.log('🔄 [BuildSystemUI] Project header changed, refreshing...');
            setTimeout(() => forceRefreshBuildSystem(), 500);
          }
        });
      });
      observer.observe(projectHeader, { 
        characterData: true, 
        childList: true, 
        subtree: true 
      });
      console.log('🔄 [BuildSystemUI] ✅ Project header observer attached');
    } else {
      // Retry later if header not found
      setTimeout(setupProjectHeaderObserver, 2000);
    }
  };
  setTimeout(setupProjectHeaderObserver, 2000);
  
  console.log('🔄 [BuildSystemUI] ✅ Project change listeners ready');
}

/**
 * Force refresh - clears everything and rebuilds
 */
async function forceRefreshBuildSystem(): Promise<void> {
  // ✅ NEW: Debounce - cancel previous pending refresh
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = null;
  }
  
  // ✅ NEW: Skip if already refreshing
  if (isRefreshing) {
    console.log('🔄 [BuildSystemUI] Already refreshing, debouncing...');
    return new Promise(resolve => {
      refreshDebounceTimer = window.setTimeout(async () => {
        await forceRefreshBuildSystem();
        resolve();
      }, 300);
    });
  }
  
  console.log('🔄 [BuildSystemUI] Force refresh triggered');
  
  // Clear all caches
  cachedScripts = null;
  lastProjectPath = null;
  
  // Remove existing dropdown
  if (dropdownMenu) {
    dropdownMenu.remove();
    dropdownMenu = null;
  }
  
  // ✅ NEW: Remove ALL existing menu items (more aggressive)
  document.querySelectorAll('#build-system-menu-item').forEach(el => el.remove());
  document.querySelectorAll('#build-system-dropdown-menu').forEach(el => el.remove());
  document.querySelectorAll('.build-system-dropdown, #build-system-indicator').forEach(el => el.remove());
  
  // Wait a bit for file system to settle
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Reinitialize with force flag
  const currentProject = getActualProjectPath();
  if (currentProject) {
    await onProjectChanged(currentProject, true); // Force refresh
  }
  
  console.log('🔄 [BuildSystemUI] ✅ Force refresh complete');
}

/**
 * Initialize
 */
export async function initializeBuildSystemUI(): Promise<void> {
  console.log('[BuildSystem] 🚀 Initializing Build System UI...');
  
  // Wait for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    console.log('[BuildSystem] Setting up shortcuts...');
    addBuildSystemShortcuts();
    
    console.log('[BuildSystem] Setting up listeners...');
    setupProjectChangeListeners();
    
    console.log('[BuildSystem] Setting up Run button handler...');
    setupRunButtonHandler();
    
    // Get current project
    const currentProject = getActualProjectPath();
    console.log('[BuildSystem] Current project path:', currentProject);
    
    if (currentProject) {
      console.log('[BuildSystem] Adding build system indicator...');
      await onProjectChanged(currentProject, true); // Force refresh
    } else {
      console.log('[BuildSystem] No project detected yet');
    }
    
    console.log('[BuildSystem] ✅ Ready!');
    
    // Add global function for manual refresh
    (window as any).refreshArduinoMenu = async () => {
      console.log('[BuildSystem] Manual refresh triggered');
      cachedScripts = null;
      lastProjectPath = null;
      await addBuildSystemIndicator();
    };
    console.log('[BuildSystem] 💡 Tip: Call window.refreshArduinoMenu() to manually refresh');
    
  } catch (error) {
    console.error('[BuildSystem] ❌ Error during initialization:', error);
  }
}

/**
 * ✅ NEW: Setup Run button handler to work without file open
 * Also adds Stop button for terminating running processes
 */
function setupRunButtonHandler(): void {
  // Find Run button in menu bar
  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.log('[BuildSystem] Menu bar not found, retrying...');
    setTimeout(setupRunButtonHandler, 1000);
    return;
  }
  
  // Find Run button - FIXED: Look for .run-button class
  const runButton = menuBar.querySelector('.run-button') || 
                    menuBar.querySelector('[data-menu="run"]') || 
                    menuBar.querySelector('button.toolbar-button') ||
                    Array.from(menuBar.querySelectorAll('.menu-item, button, div')).find(
                      el => el.textContent?.trim().toLowerCase().includes('run')
                    );
  
  if (!runButton) {
    console.log('[BuildSystem] Run button not found, retrying...');
    setTimeout(setupRunButtonHandler, 1000);
    return;
  }
  
  console.log('[BuildSystem] ✅ Found Run button:', runButton.className);
  
  // ========================================
  // CREATE STOP BUTTON
  // ========================================
  
  // Remove existing stop button if any
  document.getElementById('stop-process-button')?.remove();
  
  // Create Stop button
  const stopButton = document.createElement('button');
  stopButton.id = 'stop-process-button';
  stopButton.className = 'stop-button toolbar-button';
  stopButton.innerHTML = '⏹ Stop';
  stopButton.title = 'Stop running process (Shift+F5)';
  stopButton.style.cssText = `
    display: none;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #d32f2f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    margin-left: 4px;
    transition: background 0.2s;
  `;
  
  // Hover effect
  stopButton.addEventListener('mouseenter', () => {
    stopButton.style.background = '#b71c1c';
  });
  stopButton.addEventListener('mouseleave', () => {
    stopButton.style.background = '#d32f2f';
  });
  
  // Stop button click
  stopButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[BuildSystem] Stop button clicked!');
    
    const bs = (window as any).buildSystem;
    if (bs?.stopProject) {
      await bs.stopProject();
    }
  });
  
  // Insert Stop button after Run button
  runButton.parentNode?.insertBefore(stopButton, runButton.nextSibling);
  
  // ========================================
  // PROCESS STATE LISTENERS
  // ========================================
  
  // Show Stop button when process starts
  window.addEventListener('process-started', () => {
    stopButton.style.display = 'inline-flex';
    (runButton as HTMLElement).style.opacity = '0.5';
    console.log('[BuildSystem] 🟢 Process started - Stop button shown');
  });
  
  // Hide Stop button when process ends
  window.addEventListener('process-ended', () => {
    stopButton.style.display = 'none';
    (runButton as HTMLElement).style.opacity = '1';
    console.log('[BuildSystem] 🔴 Process ended - Stop button hidden');
  });
  
  window.addEventListener('process-stopped', () => {
    stopButton.style.display = 'none';
    (runButton as HTMLElement).style.opacity = '1';
    console.log('[BuildSystem] ⏹ Process stopped - Stop button hidden');
  });
  
  // Check initial state
  const bs = (window as any).buildSystem;
  if (bs?.isProcessRunning?.()) {
    stopButton.style.display = 'inline-flex';
    (runButton as HTMLElement).style.opacity = '0.5';
  }
  
  // ========================================
  // RUN BUTTON HANDLER
  // ========================================
  
  const originalOnClick = (runButton as HTMLElement).onclick;
  
  (runButton as HTMLElement).onclick = async (e) => {
    console.log('[BuildSystem] Run button clicked!');
    
    const bs = (window as any).buildSystem;
    
    // If process is running, stop it instead
    if (bs?.isProcessRunning?.()) {
      console.log('[BuildSystem] Process running - stopping...');
      await bs.stopProject();
      return;
    }
    
    // ✅ FIX: Check if Arduino project and use proper upload with port replacement
    if (bs?.isEmbedded) {
      console.log('[BuildSystem] Arduino project detected - using handleArduinoMenuAction');
      e.preventDefault();
      e.stopPropagation();
      await handleArduinoMenuAction('upload', bs);
      return;
    }
    
    // Redirect Gradle projects to Android Panel
    if (bs?.detectBuildSystem && bs?.getCurrentProjectPath) {
      const detected = await bs.detectBuildSystem(bs.getCurrentProjectPath());
      if (detected?.name === 'gradle') {
        e.preventDefault();
        e.stopPropagation();
        const ap = (window as any).androidPanel;
        if (ap) { ap.show(); }
        setTimeout(() => {
          const panel = document.getElementById('android-panel');
          if (panel) {
            panel.querySelectorAll('.ap-tab').forEach((btn: any) => {
              if (btn.dataset?.tab === 'build') btn.click();
            });
          }
        }, 300);
        return;
      }
    }

    if (bs?.runProject) {
      e.preventDefault();
      e.stopPropagation();
      await bs.runProject();
      return;
    }
    
    // Fallback to original handler
    if (originalOnClick) {
      originalOnClick.call(runButton, e);
    }
  };
  
  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================
  
  document.addEventListener('keydown', async (e) => {
    const bs = (window as any).buildSystem;
    if (!bs) return;
    
    // F5 = Run
    if (e.key === 'F5' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      console.log('[BuildSystem] F5 pressed - running project...');
      
      // ✅ FIX: Check if Arduino project and use proper upload
      if (bs?.isEmbedded) {
        console.log('[BuildSystem] Arduino project - using handleArduinoMenuAction');
        await handleArduinoMenuAction('upload', bs);
      } else {
        await bs.runProject?.();
      }
    }
    
    // Shift+F5 = Stop
    if (e.key === 'F5' && e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      console.log('[BuildSystem] Shift+F5 pressed - stopping project...');
      await bs.stopProject?.();
    }
    
    // Escape = Stop (when process running)
    if (e.key === 'Escape' && bs.isProcessRunning?.()) {
      console.log('[BuildSystem] Escape pressed - stopping project...');
      await bs.stopProject?.();
    }
  });
  
  // Global function for menu to call
  (window as any).runProjectFromMenu = async () => {
    console.log('[BuildSystem] runProjectFromMenu called');
    const bs = (window as any).buildSystem;
    
    // ✅ FIX: Check if Arduino project
    if (bs?.isEmbedded) {
      await handleArduinoMenuAction('upload', bs);
    } else if (bs?.runProject) {
      await bs.runProject();
    }
  };
  
  (window as any).stopProjectFromMenu = async () => {
    console.log('[BuildSystem] stopProjectFromMenu called');
    const bs = (window as any).buildSystem;
    if (bs?.stopProject) {
      await bs.stopProject();
    }
  };
  
  console.log('[BuildSystem] ✅ Run/Stop buttons setup complete');
  console.log('[BuildSystem] 💡 F5 = Run | Shift+F5 = Stop | Escape = Stop');
}

/**
 * Refresh
 */
export async function refreshBuildSystemIndicator(): Promise<void> {
  cachedScripts = null;
  lastProjectPath = null;
  await onProjectChanged(getActualProjectPath());
}

// Global registration
if (typeof window !== 'undefined') {
  (window as any).__buildSystemUI = {
    addBuildSystemIndicator,
    removeBuildSystemIndicator,
    refreshBuildSystemIndicator,
    forceRefreshBuildSystem,  // NEW
    onProjectChanged,
    initializeBuildSystemUI,
    getProjectScripts,
    runNpmScript,
    showBuildInfoDialog,
    setupRunButtonHandler // ✅ NEW
  };
  
  console.log('[BuildSystemUI] ✅ window.__buildSystemUI ready');
  console.log('[BuildSystemUI] 🔄 Use window.__buildSystemUI.forceRefreshBuildSystem() to manually refresh');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeBuildSystemUI, 3500));
  } else {
    setTimeout(initializeBuildSystemUI, 3500);
  }
}