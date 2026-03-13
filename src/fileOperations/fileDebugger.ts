// fileOperations/fileDebugger.ts
import { invoke } from '@tauri-apps/api/core';
import { tabManager } from '../editor/tabManager';

// Store debug state globally
let debugActive = false;
let currentProcess = null;
let debugOutputElement = null;
let debugConsole = null;

// Setup the debug functionality
function setupFileDebugger() {
  console.log('Setting up debug button - direct method');
  
  // Directly target the menu bar items to position our Debug button
  const mainMenuBar = document.querySelector('.menu-bar, nav, header');
  
  // Check if Debug menu already exists
  const existingDebugMenu = Array.from(mainMenuBar?.children || [])
    .find(el => el.textContent.trim() === 'Debug');
    
  if (existingDebugMenu) {
    console.log('Debug menu already exists, using existing menu');
    existingDebugMenu.addEventListener('click', handleDebugButtonClick);
    // No need to create a new one
  } else {
    // Original code to create new Debug menu
    const runMenuElement = Array.from(mainMenuBar?.children || [])
      .find(el => el.textContent.trim() === 'Run');
    
    if (runMenuElement && mainMenuBar) {
      console.log('Found Run menu item, adding Debug menu');
      
      // Create Debug menu item with same styling as Run
      const debugMenuItem = document.createElement('div');
      debugMenuItem.id = 'debug-menu-item';
      
      // Copy styling from Run menu
      debugMenuItem.className = runMenuElement.className;
      debugMenuItem.style.cssText = runMenuElement.style.cssText;
      debugMenuItem.textContent = 'Debug';
      
      // Insert Debug menu item after Run
      const terminalElement = Array.from(mainMenuBar.children)
        .find(el => el.textContent.trim() === 'Terminal');
      
      if (terminalElement) {
        mainMenuBar.insertBefore(debugMenuItem, terminalElement);
      } else {
        mainMenuBar.insertBefore(debugMenuItem, runMenuElement.nextSibling);
      }
      
      debugMenuItem.addEventListener('click', handleDebugButtonClick);
      console.log('Debug menu item added successfully');
    } else {
      // Fallback: try to add a standalone button
      console.error('Run menu item not found in menu bar, adding standalone button');
      //addStandaloneDebugButton();
    }
  }
  
  // Add keyboard shortcut (F5)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      handleDebugButtonClick();
    }
  });
  
  // Create debug console (which also creates the controls)
  createDebugConsole();
}

function addStandaloneDebugButton() {
  // This adds a floating debug button that should be visible regardless of menu structure
  const debugButton = document.createElement('button');
  debugButton.id = 'standalone-debug-btn';
  debugButton.textContent = 'Debug';
  debugButton.style.position = 'fixed';
  debugButton.style.top = '40px';
  debugButton.style.right = '20px';
  debugButton.style.zIndex = '9999';
  debugButton.style.backgroundColor = '#2962ff';
  debugButton.style.color = 'white';
  debugButton.style.border = 'none';
  debugButton.style.padding = '5px 15px';
  debugButton.style.borderRadius = '4px';
  debugButton.style.cursor = 'pointer';
  
  debugButton.addEventListener('click', handleDebugButtonClick);
  document.body.appendChild(debugButton);
  console.log('Added standalone debug button');
}

// Create debug controls container
function createDebugControls() {
  // Create controls directly in the debug console instead of separately
  const debugControls = document.createElement('div');
  debugControls.id = 'debug-controls';
  debugControls.className = 'debug-controls';
  debugControls.style.display = 'flex';
  debugControls.style.gap = '6px';
  debugControls.style.padding = '8px 10px';
  debugControls.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  debugControls.style.backgroundColor = 'rgba(40, 44, 52, 0.6)';
  
  // Control buttons with tooltips and icons
  const controls = [
    { id: 'debug-continue', title: 'Continue (F5)', icon: '▶', action: () => sendDebugCommand('continue') },
    { id: 'debug-step-over', title: 'Step Over (F10)', icon: '⤵', action: () => sendDebugCommand('next') },
    { id: 'debug-step-into', title: 'Step Into (F11)', icon: '↘', action: () => sendDebugCommand('step') },
    { id: 'debug-step-out', title: 'Step Out (Shift+F11)', icon: '↗', action: () => sendDebugCommand('return') },
    { id: 'debug-stop', title: 'Stop (Shift+F5)', icon: '⏹', action: () => { sendDebugCommand('quit'); stopDebugging(); } }
  ];
  
  controls.forEach(control => {
    const button = document.createElement('button');
    button.id = control.id;
    button.title = control.title;
    button.innerHTML = control.icon;
    button.style.width = '32px';
    button.style.height = '32px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.backgroundColor = 'rgba(70, 74, 82, 0.9)';
    button.style.color = '#eee';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.transition = 'background-color 0.2s';
    
    // Hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = 'rgba(90, 94, 102, 0.9)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'rgba(70, 74, 82, 0.9)';
    });
    
    // Click event
    button.addEventListener('click', control.action);
    
    debugControls.appendChild(button);
  });
  
  // Return the controls element to be added to the debug console
  return debugControls;
}

function createDebugConsole() {
  // Check if console already exists
  if (document.getElementById('debug-output-panel')) {
    return;
  }
  
  // Create a floating panel
  debugConsole = document.createElement('div');
  debugConsole.id = 'debug-output-panel';
  debugConsole.className = 'debug-output-panel';
  
  // Position in the editor area - FIXED POSITION for proper dragging
  debugConsole.style.position = 'fixed'; // Changed from absolute to fixed for proper dragging
  debugConsole.style.top = '80px'; // Position with some space from the top
  debugConsole.style.right = '20px'; // Position on the right side
  debugConsole.style.width = '500px'; // Wider width
  debugConsole.style.height = '350px';
  debugConsole.style.backgroundColor = 'rgba(30, 34, 42, 0.95)'; // Darker background
  debugConsole.style.borderRadius = '8px';
  debugConsole.style.boxShadow = '0 6px 30px rgba(0, 0, 0, 0.6)';
  debugConsole.style.zIndex = '1000';
  debugConsole.style.display = 'none'; // Initially hidden
  debugConsole.style.flexDirection = 'column';
  debugConsole.style.border = '1px solid rgba(60, 64, 72, 0.8)';
  debugConsole.style.overflow = 'hidden';
  
  // Create header with title and controls
  const header = document.createElement('div');
  header.className = 'debug-panel-header';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '10px 15px';
  header.style.backgroundColor = '#2962ff';
  header.style.color = 'white';
  header.style.fontWeight = 'bold';
  header.style.borderTopLeftRadius = '8px';
  header.style.borderTopRightRadius = '8px';
  header.style.cursor = 'move';
  header.style.userSelect = 'none'; // Prevent text selection during drag
  
  // Add title and controls to header
  header.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="margin-right: 8px;">⚙️</span>
      <span>Debug Console</span>
      <span id="debug-status" style="margin-left: 10px; font-size: 12px; background-color: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 10px; display: none;">Active</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="debug-console-clear" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; opacity: 0.8;">Clear</button>
      <button id="debug-console-minimize" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 0.8;">_</button>
      <button class="close-panel-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 0.8;">×</button>
    </div>
  `;
  
  // Create debug controls and add them to the console
  const controls = createDebugControls();
  
  // Create content area for debug output
  const content = document.createElement('div');
  content.className = 'debug-content';
  content.id = 'debug-output';
  content.style.flex = '1';
  content.style.overflow = 'auto';
  content.style.padding = '12px';
  content.style.fontFamily = 'JetBrains Mono, Consolas, Monaco, monospace';
  content.style.fontSize = '13px';
  content.style.lineHeight = '1.6';
  content.style.whiteSpace = 'pre-wrap';
  content.style.color = '#e6e6e6';
  content.style.backgroundColor = 'rgba(20, 22, 30, 0.98)';
  content.style.borderBottomLeftRadius = '8px';
  content.style.borderBottomRightRadius = '8px';
  
  // Add elements to panel
  debugConsole.appendChild(header);
  debugConsole.appendChild(controls);
  debugConsole.appendChild(content);
  
  // Create resize handle that's more visible
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'debug-console-resize-handle';
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.width = '16px';
  resizeHandle.style.height = '16px';
  resizeHandle.style.cursor = 'nwse-resize';
  resizeHandle.style.background = 'linear-gradient(135deg, transparent 50%, rgba(80, 120, 255, 0.5) 50%)';
  resizeHandle.style.borderBottomRightRadius = '8px';
  resizeHandle.style.zIndex = '10';
  debugConsole.appendChild(resizeHandle);
  
  // Create a footer status bar
  const footer = document.createElement('div');
  footer.className = 'debug-console-footer';
  footer.style.padding = '4px 12px';
  footer.style.fontSize = '11px';
  footer.style.color = '#999';
  footer.style.borderTop = '1px solid rgba(60, 64, 72, 0.5)';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.textContent = 'Press F5 to start debugging, F10 to step over';
  debugConsole.appendChild(footer);
  
  // Add panel to document
  document.body.appendChild(debugConsole); // Add directly to body for fixed positioning
  
  // Store reference to output element
  debugOutputElement = content;
  
  // Set up event handlers
  const closeBtn = header.querySelector('.close-panel-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      debugConsole.style.display = 'none';
      // Also stop debugging if active
      if (debugActive) {
        stopDebugging();
      }
    });
  }
  
  const minimizeBtn = header.querySelector('#debug-console-minimize');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        controls.style.display = 'flex';
        footer.style.display = 'flex';
        debugConsole.style.height = '350px';
        minimizeBtn.textContent = '_';
      } else {
        // Minimize
        content.style.display = 'none';
        controls.style.display = 'none';
        footer.style.display = 'none';
        debugConsole.style.height = 'auto';
        minimizeBtn.textContent = '□';
      }
    });
  }
  
  const clearBtn = header.querySelector('#debug-console-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (debugOutputElement) {
        debugOutputElement.textContent = '';
      }
    });
  }
  
  // Make draggable
  makeDraggable(debugConsole, header);
  
  // Allow resizing the debug console
  makeResizable(debugConsole, resizeHandle);
}

// Function to update debug status indicator
function updateDebugStatus(isActive) {
  const statusElement = document.getElementById('debug-status');
  if (statusElement) {
    if (isActive) {
      statusElement.style.display = 'inline-block';
      statusElement.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    } else {
      statusElement.style.display = 'none';
    }
  }
}

// Add this function to make the console draggable
function makeDraggable(element, dragHandle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  // Make sure cursor shows it's draggable
  dragHandle.style.cursor = 'move';
  
  // Add a visual cue that this is draggable
  dragHandle.title = 'Drag to move';
  
  // Add a dragging class indicator
  const addDraggingClass = () => {
    element.classList.add('dragging');
    element.style.opacity = '0.8';
  };
  
  const removeDraggingClass = () => {
    element.classList.remove('dragging');
    element.style.opacity = '1';
  };
  
  // Start dragging
  const startDrag = (e) => {
    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate the initial offset
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    isDragging = true;
    addDraggingClass();
    
    // Add the move and end listeners to document (not to the element)
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    console.log('Drag started');
  };
  
  // During drag
  const drag = (e) => {
    if (!isDragging) return;
    
    // Calculate new position
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Apply the new position with left/top for fixed position elements
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    
    console.log(`Dragging to: ${x}, ${y}`);
  };
  
  // End dragging
  const endDrag = () => {
    isDragging = false;
    removeDraggingClass();
    
    // Remove event listeners
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
    
    console.log('Drag ended');
  };
  
  // Add mousedown event to the drag handle
  dragHandle.addEventListener('mousedown', startDrag);
  
  // Make sure we remove listeners if element is removed
  const cleanup = () => {
    dragHandle.removeEventListener('mousedown', startDrag);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
  };
  
  // Return cleanup function
  return cleanup;
}

// Update the makeResizable function to improve resize behavior
function makeResizable(element, resizeHandle) {
  let startX, startY, startWidth, startHeight;
  
  const initResize = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(getComputedStyle(element).width, 10);
    startHeight = parseInt(getComputedStyle(element).height, 10);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
  };
  
  const resize = (e) => {
    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);
    
    if (newWidth > 250) {
      element.style.width = `${newWidth}px`;
    }
    
    if (newHeight > 150) {
      element.style.height = `${newHeight}px`;
    }
  };
  
  const stopResize = () => {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  };
  
  resizeHandle.addEventListener('mousedown', initResize);
}

// Handle debug button click
function handleDebugButtonClick() {
  console.log('Debug button clicked');
  
  // Get the currently active file
  const activeTab = tabManager.getActiveTab();
  if (!activeTab || !activeTab.path) {
    showNotification('No file is open for debugging');
    return;
  }
  
  const filePath = activeTab.path;
  const fileExtension = filePath.split('.').pop().toLowerCase();
  
  // Start debugging based on file type
  startDebugging(filePath, fileExtension);
}

// Improved file path verification function
async function verifyFileExists(path) {
  console.log(`Verifying file exists: ${path}`);
  
  // Method 1: Try Tauri's check_file_exists command
  if (window.__TAURI__) {
    try {
      const exists = await invoke('check_file_exists', { path });
      console.log(`Tauri check_file_exists: ${exists}`);
      
      if (exists) {
        // Method 2: Double-check with test_file_readable to verify permissions
        const readable = await invoke('test_file_readable', { path })
          .catch(() => false);
        console.log(`File readable: ${readable}`);
        return readable;
      }
    } catch (e) {
      console.error('File existence check error:', e);
    }
  }
  
  return false;
}

// Improved fixed Windows path function
function fixWindowsPath(path) {
  // Ensure all slashes are backslashes for Windows
  let fixedPath = path.replace(/\//g, '\\');
  
  // Remove any quotes that might already be present
  fixedPath = fixedPath.replace(/['"]/g, '');
  
  // Handle UNC paths correctly (start with \\)
  if (fixedPath.startsWith('\\\\')) {
    return fixedPath;
  }
  
  // Ensure drive letter format is correct
  if (/^[a-zA-Z]:/.test(fixedPath) && !fixedPath.startsWith('\\')) {
    fixedPath = fixedPath.charAt(0) + ':\\' + fixedPath.substring(2);
  }
  
  return fixedPath;
}

// Improved debug batch file creator
async function createDebugBatchFile(filePath) {
  try {
    // Normalize the file path for Windows
    const normalizedPath = fixWindowsPath(filePath);
    
    // Get directory and filename
    const lastBackslash = normalizedPath.lastIndexOf('\\');
    if (lastBackslash === -1) return null;
    
    const fileDir = normalizedPath.substring(0, lastBackslash);
    const fileName = normalizedPath.substring(lastBackslash + 1);
    
    // Create batch file content
    const batchContent = `@echo off
echo Starting Python debugger for ${fileName}
echo Current directory: %CD%
cd /d "${fileDir}"
echo Changed to directory: %CD%

if exist "${fileName}" (
  echo File found at: %CD%\\${fileName}
  echo Starting debugger...
  python -m pdb "${fileName}"
) else (
  echo ERROR: File not found at %CD%\\${fileName}
  echo Listing directory contents:
  dir
  pause
)
pause
`;

    // Save to a batch file in the temp directory with normalized path
    const tempDir = await invoke('get_temp_dir').catch(() => '.');
    // Remove any trailing slashes to prevent double slashes
    const cleanTempDir = tempDir.replace(/[\/\\]$/, '');
    const batchPath = `${cleanTempDir}\\debug_${Date.now()}.bat`;
    
    await invoke('write_file', {
      path: batchPath,
      content: batchContent
    });
    
    return batchPath;
  } catch (error) {
    console.error('Error creating debug batch file:', error);
    return null;
  }
}

// Fallback Python debug script creator
async function createDebugScript(filePath) {
  try {
    // Escape all backslashes in the path for Python
    const escapedPath = filePath.replace(/\\/g, '\\\\');
    
    // Create a Python script that launches the debugger
    const debugScriptContent = `
import pdb
import os
import sys

# The path to the file we want to debug
file_path = r"${escapedPath}"

print(f"Debug script looking for file at: {file_path}")
print(f"Current directory: {os.getcwd()}")

if not os.path.exists(file_path):
    print(f"Error: File does not exist at {file_path}")
    input("Press Enter to exit...")
    sys.exit(1)

print(f"File found. Changing to directory: {os.path.dirname(file_path)}")

# Change to the directory containing the file
os.chdir(os.path.dirname(file_path))

print(f"Current directory now: {os.getcwd()}")
print(f"Starting debugger on file: {os.path.basename(file_path)}")

# Launch the debugger on the file
pdb.run(f'exec(open("{os.path.basename(file_path)}").read())')
`;

    // Save this script to a temporary location
    const tempDir = await invoke('get_temp_dir').catch(() => '.');
    const debugScriptPath = `${tempDir}\\debug_launcher.py`;
    
    await invoke('write_file', {
      path: debugScriptPath,
      content: debugScriptContent
    });
    
    return debugScriptPath;
  } catch (error) {
    console.error('Error creating debug script:', error);
    return null;
  }
}

// Improved startDebugging function
async function startDebugging(filePath, fileExtension) {
  // First check if debugging is already active
  if (debugActive) {
    showNotification('A debug session is already running');
    return;
  }
  
  // Show debug console
  if (debugConsole) {
    debugConsole.style.display = 'flex';
  }
  
  // Set debug state
  debugActive = true;
  updateDebugStatus(true);
  
  try {
    // Normalize file path - handle virtual paths like the run system does
    let normalizedPath = filePath;
    
    if (normalizedPath.startsWith('handle://')) {
      console.log('Handle protocol detected, saving to disk first');
      
      // Save virtual file to disk first
      const savedPath = await saveVirtualFileToDisk(normalizedPath);
      if (!savedPath) {
        appendToDebugOutput(`⚠️ Failed to save virtual file to disk\n`);
        stopDebugging();
        return;
      }
      normalizedPath = savedPath;
      appendToDebugOutput(`File saved to: ${normalizedPath}\n`);
    }
    
    // Get the absolute path to avoid working directory issues
    try {
      if (window.__TAURI__) {
        const absolutePath = await invoke('get_absolute_path', { path: normalizedPath })
          .catch(() => normalizedPath);
        
        if (absolutePath && absolutePath !== normalizedPath) {
          normalizedPath = absolutePath;
          appendToDebugOutput(`Using absolute path: ${normalizedPath}\n`);
        }
      }
    } catch (e) {
      console.log('Could not get absolute path:', e);
    }
    
    // Verify file existence with explicit debug output
    const fileExists = await verifyFileExists(normalizedPath);
    appendToDebugOutput(`File check: "${normalizedPath}" ${fileExists ? 'exists ✓' : 'not found ❌'}\n`);
    
    if (!fileExists) {
      appendToDebugOutput(`Error: Cannot find file at specified path\n`);
      appendToDebugOutput(`Troubleshooting tips:\n`);
      appendToDebugOutput(`1. Try saving the file first if it's a new file\n`);
      appendToDebugOutput(`2. Check the file path for special characters\n`);
      appendToDebugOutput(`3. Try running the file normally before debugging\n`);
      stopDebugging();
      return;
    }
    
    // Configure debug command based on file type
    let debugCommand = '';
    
    switch (fileExtension) {

case 'py':
  // For Python files, use a direct approach instead of batch files
  if (navigator.platform.toLowerCase().includes('win')) {
    // Get directory and filename but properly remove the \\?\ prefix
    const rawPath = normalizedPath;
    
    // Definitely remove the \\?\ prefix as CMD doesn't support it
    let cleanedPath = rawPath;
    if (cleanedPath.startsWith('\\\\?\\')) {
      cleanedPath = cleanedPath.substring(4);
    }
    
    appendToDebugOutput(`Raw path: ${rawPath}\n`);
    appendToDebugOutput(`Cleaned path: ${cleanedPath}\n`);
    
    // Create a simple batch file to run the debugger
    const tempDir = await invoke('get_temp_dir').catch(() => '.');
    const cleanTempDir = tempDir.replace(/[\/\\]$/, '');
    const batchPath = `${cleanTempDir}\\debug_direct_${Date.now()}.bat`;
    
    // Get the directory and filename
    const lastBackslash = cleanedPath.lastIndexOf('\\');
    
    if (lastBackslash !== -1) {
      const fileDir = cleanedPath.substring(0, lastBackslash);
      const fileName = cleanedPath.substring(lastBackslash + 1);
      
      // Create a simpler batch file with minimal quoting
      const batchContent = `@echo off
cd /d ${fileDir}
python -m pdb ${fileName}
pause
`;
      
      try {
        await invoke('write_file', {
          path: batchPath,
          content: batchContent
        });
        
        debugCommand = batchPath; // Run the batch file directly
        appendToDebugOutput(`Using simple batch file: ${batchPath}\n`);
      } catch (error) {
        // Fallback to a direct Python command
        debugCommand = `python -m pdb "${cleanedPath}"`;
        appendToDebugOutput(`Fallback to direct Python command: ${debugCommand}\n`);
      }
    } else {
      // Fallback to simple command if path parsing fails
      debugCommand = `python -m pdb "${cleanedPath}"`;
      appendToDebugOutput(`Using simple command: ${debugCommand}\n`);
    }
  } else {
    // For Unix systems
    debugCommand = `python -m pdb "${normalizedPath}"`;
  }
  break;
      case 'js':
      case 'ts':
        // For JavaScript/TypeScript, use Node.js debugging
        debugCommand = `node --inspect-brk "${normalizedPath}"`;
        break;
        
      case 'html':
        // For HTML, just open in browser
        await invoke('tauri_plugin_opener::open', { path: normalizedPath });
        showNotification('HTML files open in browser for debugging');
        stopDebugging(); // Not a true debug session
        return;
        
      default:
        showNotification(`Debugging not supported for .${fileExtension} files`);
        stopDebugging();
        return;
    }
    
    // Execute the command with better error handling
    console.log(`Starting debug process: ${debugCommand}`);
    appendToDebugOutput(`Starting debugger for ${normalizedPath}...\n`);
    
    // Inside the try block in startDebugging where we execute the command:
    try {
      const isWindows = navigator.platform.toLowerCase().includes('win');
      
      // Check file readability
      const fileExistsBeforeExec = await invoke('test_file_readable', { path: normalizedPath })
        .catch(() => false);
      
      appendToDebugOutput(`Final file readability check: ${fileExistsBeforeExec ? 'Passed ✓' : 'Failed ❌'}\n`);
      
      if (!fileExistsBeforeExec) {
        appendToDebugOutput(`Warning: File might not be accessible to the debugger\n`);
      }
      
      // Check Python version
      try {
        const pythonVersion = await invoke('execute_command', {
          command: 'python --version',
          isPowershell: false
        });
        
        appendToDebugOutput(`Python version: ${pythonVersion.trim()}\n`);
      } catch (e) {
        appendToDebugOutput(`Python check failed: ${e.message || e}\n`);
        appendToDebugOutput(`Make sure Python is installed and in your PATH\n`);
      }
      
      // Clean up the command if it contains a batch file path
      let finalCommand = debugCommand;
      
      // Fix double backslashes in the path if it's a batch file
      if (finalCommand.includes('.bat')) {
        finalCommand = finalCommand.replace(/\\{2,}/g, '\\');
        appendToDebugOutput(`Normalized command: ${finalCommand}\n`);
      }
      
      // Execute the debug command
      const output = await invoke('execute_command', { 
        command: finalCommand,
        isPowershell: false
      });
      
      console.log('Debug command output:', output);
      appendToDebugOutput(output);
    } catch (error) {
      console.error('Error executing debug command:', error);
      appendToDebugOutput(`Error executing debug command: ${error.message || error}\n`);
      
      // Try alternative approach if the command failed and it was a batch file
      if (debugCommand.includes('.bat')) {
        appendToDebugOutput(`\nBatch file execution failed, trying direct approach...\n`);
        
        try {
          // Create a direct command
          const directCommand = await createDirectCommand(normalizedPath);
          if (directCommand) {
            appendToDebugOutput(`Using direct command: ${directCommand}\n`);
            
            const directOutput = await invoke('execute_command', {
              command: directCommand,
              isPowershell: false
            });
            
            appendToDebugOutput(directOutput);
          } else {
            appendToDebugOutput(`Failed to create direct command\n`);
          }
        } catch (directError) {
          appendToDebugOutput(`Direct command approach failed: ${directError.message || directError}\n`);
          
          // Try simple runner as last resort
          try {
            const runnerCommand = await createDebugRunnerScript(normalizedPath);
            if (runnerCommand) {
              appendToDebugOutput(`Using simple runner script: ${runnerCommand}\n`);
              
              const runnerOutput = await invoke('execute_command', {
                command: runnerCommand,
                isPowershell: false
              });
              
              appendToDebugOutput(runnerOutput);
            }
          } catch (runnerError) {
            appendToDebugOutput(`Runner script approach failed: ${runnerError.message || runnerError}\n`);
          }
        }
      }
      
      appendToDebugOutput('\nTroubleshooting tips:\n');
      appendToDebugOutput('1. Make sure Python is installed and in your PATH\n');
      appendToDebugOutput('2. Try running the file normally first using the Run button\n');
      appendToDebugOutput('3. Check that the file path does not contain special characters\n');
      appendToDebugOutput('4. Save the file to a simpler path (e.g., on your Desktop)\n');
    }
  } catch (error) {
    console.error('Error starting debugger:', error);
    appendToDebugOutput(`Error: ${error.message || error}\n`);
    stopDebugging();
  }
}

async function createDirectCommand(filePath) {
  try {
    // Clean the path - remove \\?\ prefix
    const cleanPath = filePath.replace(/\\\\?\\/, '');
    
    // Get directory and filename
    const lastBackslash = cleanPath.lastIndexOf('\\');
    if (lastBackslash === -1) return null;
    
    const fileDir = cleanPath.substring(0, lastBackslash);
    const fileName = cleanPath.substring(lastBackslash + 1);
    
    // Create a direct command that changes directory and runs the debugger
    return `cmd /c "cd /d "${fileDir}" && python -m pdb "${fileName}""`;
  } catch (error) {
    console.error('Error creating direct command:', error);
    return null;
  }
}

async function createVbsLauncher(batchPath) {
  if (!batchPath) {
    console.error('Cannot create VBS launcher: batchPath is undefined');
    return null;
  }

  const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """${batchPath}""", 1, true
`;

  const tempDir = await invoke('get_temp_dir').catch(() => '.');
  const cleanTempDir = tempDir.replace(/[\/\\]$/, '');
  const vbsPath = `${cleanTempDir}\\debug_launcher_${Date.now()}.vbs`;
  
  await invoke('write_file', {
    path: vbsPath,
    content: vbsContent
  });
  
  return vbsPath;
}

async function createDebugRunnerScript(filePath) {
  try {
    // Clean the path
    const cleanPath = filePath.replace(/\\\\?\\/, '');
    
    // Create a batch script that just runs the command directly
    const batchContent = `@echo off
echo Starting Python debugger...
python -m pdb "${cleanPath}"
if %ERRORLEVEL% NEQ 0 (
  echo Failed to run debugger
  echo Path: ${cleanPath}
  pause
)
pause
`;

    // Save to a new batch file
    const tempDir = await invoke('get_temp_dir').catch(() => '.');
    // Ensure no trailing slashes
    const cleanTempDir = tempDir.replace(/[\/\\]$/, '');
    const batchPath = `${cleanTempDir}\\simple_debug_${Date.now()}.bat`;
    
    await invoke('write_file', {
      path: batchPath,
      content: batchContent
    });
    
    // Return command to run this batch file
    return `cmd /c "${batchPath}"`;
  } catch (error) {
    console.error('Error creating debug runner script:', error);
    return null;
  }
}

// Helper function to save virtual file to disk
async function saveVirtualFileToDisk(virtualPath) {
  try {
    console.log(`Saving virtual file to disk: ${virtualPath}`);
    
    // Get the filename from the path
    const fileName = virtualPath.split(/[\/\\]/).pop() || 'file.txt';
    
    // Get editor content
    const editor = window.monaco?.editor.getEditors()[0];
    if (!editor) {
      console.error('No active editor found');
      return null;
    }
    
    const content = editor.getValue();
    
    // If we're in Tauri environment, try saving to multiple locations
    if (window.__TAURI__) {
      // Try multiple possible locations, starting with the most likely
      const possibleLocations = [];
      
      // 1. Try temp directory first (most reliable location)
      try {
        const tempDir = await invoke('get_temp_dir').catch(() => null);
        if (tempDir && typeof tempDir === 'string') {
          possibleLocations.push(tempDir);
        }
      } catch (e) {
        console.log('Failed to get temp directory:', e);
      }
      
      // 2. Try home directory
      if ((window as any).__systemInfo?.homedir) {
        possibleLocations.push((window as any).__systemInfo.homedir);
      }
      
      // 3. Try current directory (which may be different)
      try {
        const currentDir = await invoke('get_current_dir').catch(() => null);
        if (currentDir && typeof currentDir === 'string') {
          possibleLocations.push(currentDir);
        }
      } catch (e) {
        console.log('Failed to get current directory:', e);
      }
      
      // 4. Try a simple location
      possibleLocations.push('.');
      
      // Add some common defaults if nothing else worked
      if (navigator.platform.toLowerCase().includes('win')) {
        possibleLocations.push('C:\\Temp');
        possibleLocations.push('C:\\Windows\\Temp');
      } else {
        possibleLocations.push('/tmp');
        possibleLocations.push('/var/tmp');
      }
      
      // Try each location until one works
      for (const location of possibleLocations) {
        // Create a path with correct separator for the platform
        const isWindows = navigator.platform.toLowerCase().includes('win');
        const separator = isWindows ? '\\' : '/';
        const cleanLocation = location.replace(/[\/\\]$/, ''); // Remove trailing slash if present
        const tempFilePath = `${cleanLocation}${separator}${fileName}`;
        
        // Save file to this location
        try {
          console.log(`Attempting to save to: ${tempFilePath}`);
          
          await invoke('write_file', {
            path: tempFilePath,
            content
          });
          
          // Verify the file was saved successfully
          const exists = await verifyFileExists(tempFilePath);
          if (exists) {
            console.log(`✅ File saved successfully to: ${tempFilePath}`);
            return tempFilePath;
          } else {
            console.log(`❌ File couldn't be verified at: ${tempFilePath}`);
            // Continue to next location
          }
        } catch (saveError) {
          console.error(`Failed to save to ${tempFilePath}: ${saveError.message || saveError}`);
          // Continue to next location
        }
      }
      
      console.error('Failed to save file to any location');
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error saving virtual file:', error);
    return null;
  }
}

// Stop debugging session
function stopDebugging() {
  // Set debug state
  debugActive = false;
  updateDebugStatus(false);
  
  // If there's a current process, terminate it
  if (currentProcess) {
    // In a real implementation, you would kill the process
    // This depends on how you're managing processes
    currentProcess = null;
  }
  
  console.log('Debugging stopped');
  appendToDebugOutput('Debugging session ended\n');
}

// Send debug command to the active debugger
async function sendDebugCommand(command) {
  if (!debugActive) {
    console.error('No active debug session');
    return;
  }
  
  appendToDebugOutput(`> ${command}\n`);
  
  try {
    // This is a simplified implementation - in real world you would need
    // to interact with the debugger process using appropriate methods
    // For now, just log that we would send the command
    console.log(`Would send debug command: ${command}`);
    
    // Simulate getting back some response
    const response = `Executed: ${command}\n`;
    appendToDebugOutput(response);
  } catch (error) {
    console.error('Error sending debug command:', error);
    appendToDebugOutput(`Error: ${error.message || error}\n`);
  }
}

// Append text to debug output
function appendToDebugOutput(text) {
  if (debugOutputElement) {
    debugOutputElement.textContent += text;
    debugOutputElement.scrollTop = debugOutputElement.scrollHeight;
  }
}

// Show notification with severity and duration options
function showNotification(message, severity = 'info', duration = 5000) {
  console.log(`Notification (${severity}):`, message);
  
  // Check if notification container exists, create if not
  let notificationContainer = document.querySelector('.notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.bottom = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '9999';
    document.body.appendChild(notificationContainer);
  }
  
  // Determine color based on severity
  let borderColor;
  switch(severity) {
    case 'error':
      borderColor = '#ff3333';
      break;
    case 'warning':
      borderColor = '#ffcc00';
      break;
    case 'success':
      borderColor = '#4caf50';
      break;
    default:
      borderColor = '#2962ff'; // info/default
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.backgroundColor = '#333';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.marginTop = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
  notification.style.borderLeft = `4px solid ${borderColor}`;
  notification.style.maxWidth = '300px';
  notification.textContent = message;
  
  // Add to notification container
  notificationContainer.appendChild(notification);
  
  // Remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
}

// Export necessary functions
export {
  setupFileDebugger,
  stopDebugging,
  handleDebugButtonClick
};