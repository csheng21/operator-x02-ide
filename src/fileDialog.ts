// src/fileDialog.ts - Enhanced file dialog with proper handle passing

import { showProjectSelector } from './ui/dialogs/projectSelector';

// Force custom modal always
const ALWAYS_USE_CUSTOM_MODAL = true;

/**
 * Open a file save dialog using Tauri
 * @param defaultName Default file name
 * @returns Selected file path or null if canceled
 */
export async function showSaveDialog(defaultName?: string): Promise<string | null> {
  try {
    console.log('Opening save file dialog with default name:', defaultName);
    
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        // Import dialog API dynamically
        const dialog = await import('@tauri-apps/plugin-dialog');
        
        // Prepare options
        const options: any = {};
        if (defaultName) {
          options.defaultPath = defaultName;
        }
        
        // Show save dialog
        const filePath = await dialog.save(options);
        console.log('Selected save path:', filePath);
        return filePath || null;
      } catch (error) {
        console.error('Error showing Tauri save dialog:', error);
        
        // Use browser prompt as fallback
        const filename = defaultName || prompt('Enter a filename to save:', 'document.txt');
        if (!filename) return null;
        
        // For development path tracking
        return `/mock/path/${filename}`;
      }
    } else {
      // Browser environment
      const filename = prompt('Enter a filename to save:', defaultName || 'document.txt');
      if (!filename) return null;
      
      // For development path tracking
      return `/mock/path/${filename}`;
    }
  } catch (error) {
    console.error('Error in showSaveDialog:', error);
    return null;
  }
}

/**
 * Open a file select dialog using Tauri
 * @returns Selected file info or null if canceled
 */
export async function showOpenDialog(): Promise<{ path: string; name: string } | null> {
  try {
    console.log('Opening file select dialog');
    
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        // Import dialog API dynamically
        const dialog = await import('@tauri-apps/plugin-dialog');
        
        // Show open dialog
        const filePath = await dialog.open({
          multiple: false,
          filters: [{
            name: 'All Files',
            extensions: ['*']
          }]
        });
        
        if (!filePath) return null;
        
        // Handle string or array result
        const selectedPath = typeof filePath === 'string' ? filePath : filePath[0];
        const fileName = selectedPath.split(/[/\\]/).pop() || '';
        
        console.log('Selected file:', { path: selectedPath, name: fileName });
        return { path: selectedPath, name: fileName };
      } catch (error) {
        console.error('Error showing Tauri open dialog:', error);
        return null;
      }
    } else {
      // In browser, open file picker will be handled by separate code
      return null;
    }
  } catch (error) {
    console.error('Error in showOpenDialog:', error);
    return null;
  }
}

/**
 * Enhanced folder dialog - FIXED to return handle properly
 */
export async function showEnhancedFolderDialog(): Promise<{
  path: string;
  handle?: any;
  type: 'tauri' | 'browser' | 'template' | 'manual';
} | null> {
  try {
    console.log('Using custom project selector modal');
    
    // Return a promise that resolves with the full result including handle
    return new Promise((resolve) => {
      showProjectSelector({
        onProjectSelect: (projectPath: string, projectType: 'folder' | 'template', handle?: any) => {
          console.log('Project selected in enhanced dialog:', { projectPath, projectType, handle });
          
          if (projectType === 'template') {
            // Handle template creation
            handleTemplateSelection(projectPath)
              .then(templatePath => {
                if (templatePath) {
                  resolve({ path: templatePath, type: 'template' });
                } else {
                  resolve(null);
                }
              })
              .catch(() => resolve(null));
          } else {
            // Handle folder selection - FIXED: Include the handle in the result
            const type = handle ? 'browser' : 'manual';
            resolve({ 
              path: projectPath, 
              type, 
              handle: handle  // Pass through the actual handle
            });
          }
        },
        onCancel: () => {
          console.log('Project selection cancelled');
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error in enhanced folder dialog:', error);
    return null;
  }
}

/**
 * Show folder dialog for development mode (browser environment)
 * @returns Promise that resolves to selected folder path or null
 */
function showDevelopmentModeFolderDialog(): Promise<string | null> {
  return new Promise((resolve) => {
    console.log('Showing custom project selector modal directly');
    showProjectSelectorModal(resolve);
  });
}

/**
 * Main folder dialog - always use custom modal
 */
export async function showFolderDialog(): Promise<string | null> {
  console.log('Using custom project selector modal');
  return showDevelopmentModeFolderDialog();
}

/**
 * Show the project selector modal
 */
function showProjectSelectorModal(resolve: (value: string | null) => void): void {
  showProjectSelector({
    onProjectSelect: (projectPath: string, projectType: 'folder' | 'template', handle?: any) => {
      console.log('Project selected:', { projectPath, projectType, handle });
      
      if (projectType === 'template') {
        // Handle template creation
        handleTemplateSelection(projectPath)
          .then(resolve)
          .catch(() => resolve(null));
      } else {
        // Handle folder selection
        resolve(projectPath);
      }
    },
    onCancel: () => {
      console.log('Project selection cancelled');
      resolve(null);
    }
  });
}

/**
 * Handle template project creation
 */
async function handleTemplateSelection(templateType: string): Promise<string | null> {
  try {
    console.log('Creating template project:', templateType);
    
    // Import necessary utilities
    const { generateMockPath } = await import('./utils/browserUtils');
    
    // Generate a mock project path
    const projectName = `${templateType}-project-${Date.now()}`;
    const projectPath = generateMockPath(projectName);
    
    // Create the template project using the project creation system
    try {
      const { createTemplateProject } = await import('./ide/projectCreation/services/projectGenerator');
      await createTemplateProject(templateType, projectPath);
    } catch (importError) {
      console.warn('Project generator not found, using fallback template creation');
      await createFallbackTemplate(templateType, projectPath);
    }
    
    return projectPath;
  } catch (error) {
    console.error('Error creating template project:', error);
    throw error;
  }
}

/**
 * Fallback template creation if project generator is not available
 */
async function createFallbackTemplate(templateType: string, projectPath: string): Promise<void> {
  const { mockFileSystem } = await import('./utils/mockFileSystem');
  
  const templates = {
    react: {
      'package.json': JSON.stringify({
        name: 'react-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          'start': 'vite',
          'build': 'vite build'
        }
      }, null, 2),
      'src/App.jsx': `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello React!</h1>
      <p>Welcome to your new React project.</p>
    </div>
  );
}

export default App;`,
      'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
    },
    vue: {
      'package.json': JSON.stringify({
        name: 'vue-project',
        version: '1.0.0',
        dependencies: {
          'vue': '^3.0.0'
        },
        scripts: {
          'start': 'vite',
          'build': 'vite build'
        }
      }, null, 2),
      'src/App.vue': `<template>
  <div id="app">
    <h1>Hello Vue!</h1>
    <p>Welcome to your new Vue project.</p>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 60px;
}
</style>`,
      'src/main.js': `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
    },
    vanilla: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vanilla JS Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello Vanilla JavaScript!</h1>
    <p>Welcome to your new project.</p>
    <button id="clickBtn">Click me!</button>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f0f0f0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #0056b3;
}`,
      'script.js': `document.addEventListener('DOMContentLoaded', function() {
  const clickBtn = document.getElementById('clickBtn');
  
  clickBtn.addEventListener('click', function() {
    alert('Hello from Vanilla JavaScript!');
  });
  
  console.log('Vanilla JS project loaded successfully!');
});`
    },
    python: {
      'app.py': `from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html', title='Python Flask App')

@app.route('/api/hello')
def hello():
    return {'message': 'Hello from Flask!'}

if __name__ == '__main__':
    app.run(debug=True)`,
      'requirements.txt': `Flask==2.3.3
python-dotenv==1.0.0`,
      'templates/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello Flask!</h1>
        <p>Welcome to your new Python Flask project.</p>
    </div>
</body>
</html>`,
      'README.md': `# Python Flask Project

## Setup
1. Install dependencies: \`pip install -r requirements.txt\`
2. Run the app: \`python app.py\`
3. Open http://localhost:5000

## Features
- Flask web server
- Template rendering
- API endpoints
`
    }
  };

  const template = templates[templateType as keyof typeof templates];
  if (!template) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  // Create files in mock file system
  for (const [filePath, content] of Object.entries(template)) {
    const fullPath = `${projectPath}/${filePath}`;
    mockFileSystem[fullPath] = content;
  }

  console.log(`Created ${templateType} template at ${projectPath}`);
}

/**
 * Check if a directory handle is available from previous selection
 */
export function getStoredDirectoryHandle(): any | null {
  return (window as any).__selectedDirectoryHandle || null;
}

/**
 * Clear stored directory handle
 */
export function clearStoredDirectoryHandle(): void {
  delete (window as any).__selectedDirectoryHandle;
}

/**
 * Utility to check if we're in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Utility to check if browser supports modern file APIs
 */
export function checkBrowserSupport(): {
  directoryPicker: boolean;
  filePicker: boolean;
  dragDrop: boolean;
} {
  return {
    directoryPicker: 'showDirectoryPicker' in window,
    filePicker: 'showOpenFilePicker' in window,
    dragDrop: 'DataTransfer' in window && 'FileList' in window
  };
}