// src/ide/projectCreation/services/mockFileSystem.ts
import { ProjectOptions, MockFile } from '../types';
import { normalizePath } from '../../../utils/fileUtils';

// Type definitions for our mock file system
type MockFileSystem = {
  [path: string]: string | object;
};

// Type for mock file content structure
export interface MockFileContent {
  path: string;
  content: string;
}

/**
 * Creates a file in the mock file system
 * @param filePath Path where to create the file
 * @param content Content to write to the file
 */
export async function createFile(filePath: string, content: string): Promise<void> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(filePath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Check if parent directory exists, if not create it
    const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (parentDir && !fileSystem[parentDir]) {
      await createDirectory(parentDir);
    }
    
    // Add or update file content
    fileSystem[normalizedPath] = content;
    
    // Save updated file system
    saveMockFileSystem(fileSystem);
    
    // Dispatch event to update UI
    const event = new CustomEvent('file-system-changed', {
      detail: { path: normalizedPath, type: 'create', isFile: true }
    });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error creating file in mock file system:', error);
    throw error;
  }
}

/**
 * Creates a directory in the mock file system
 * @param dirPath Path where to create the directory
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(dirPath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Create parent directories recursively if needed
    const parts = normalizedPath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += '/' + part;
      if (!fileSystem[currentPath]) {
        fileSystem[currentPath] = {};
      }
    }
    
    // Save updated file system
    saveMockFileSystem(fileSystem);
    
    // Dispatch event to update UI
    const event = new CustomEvent('file-system-changed', {
      detail: { path: normalizedPath, type: 'create', isFile: false }
    });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error creating directory in mock file system:', error);
    throw error;
  }
}

/**
 * Reads a file from the mock file system
 * @param filePath Path to the file to read
 * @returns File content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(filePath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Check if file exists
    if (!fileSystem[normalizedPath]) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
    
    // Check if it's actually a file
    if (typeof fileSystem[normalizedPath] !== 'string') {
      throw new Error(`Not a file: ${normalizedPath}`);
    }
    
    // Return file content
    return fileSystem[normalizedPath] as string;
  } catch (error) {
    console.error('Error reading file from mock file system:', error);
    throw error;
  }
}

/**
 * Lists files and directories in a directory
 * @param dirPath Path to the directory to list
 * @returns List of files and directories
 */
export async function listDirectory(dirPath: string): Promise<{ name: string; type: 'file' | 'directory' }[]> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(dirPath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Check if directory exists
    if (!fileSystem[normalizedPath] && normalizedPath !== '') {
      throw new Error(`Directory not found: ${normalizedPath}`);
    }
    
    // Find all entries that are direct children of this directory
    const prefix = normalizedPath === '' ? '' : normalizedPath + '/';
    const allPaths = Object.keys(fileSystem);
    
    // Filter to get direct children
    const children = allPaths
      .filter(path => path.startsWith(prefix) && path !== normalizedPath)
      .filter(path => {
        const remainingPath = path.substring(prefix.length);
        return !remainingPath.includes('/');
      })
      .map(path => {
        const name = path.substring(prefix.length);
        const type = typeof fileSystem[path] === 'string' ? 'file' : 'directory';
        return { name, type };
      });
    
    return children;
  } catch (error) {
    console.error('Error listing directory in mock file system:', error);
    throw error;
  }
}

/**
 * Removes a file from the mock file system
 * @param filePath Path to the file to remove
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(filePath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Check if file exists
    if (!fileSystem[normalizedPath]) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
    
    // Check if it's actually a file
    if (typeof fileSystem[normalizedPath] !== 'string') {
      throw new Error(`Not a file: ${normalizedPath}`);
    }
    
    // Remove the file from the mock file system
    delete fileSystem[normalizedPath];
    
    // Save updated file system
    saveMockFileSystem(fileSystem);
    
    // Dispatch event to update UI
    const event = new CustomEvent('file-system-changed', {
      detail: { path: normalizedPath, type: 'remove', isFile: true }
    });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error removing file from mock file system:', error);
    throw error;
  }
}

/**
 * Removes a directory and all its contents from the mock file system
 * @param dirPath Path to the directory to remove
 */
export async function removeDirectory(dirPath: string): Promise<void> {
  try {
    // Normalize path
    const normalizedPath = normalizePath(dirPath);
    
    // Get the mock file system state
    const fileSystem = getMockFileSystem();
    
    // Check if directory exists
    const dirExists = Object.keys(fileSystem).some(path => 
      path === normalizedPath || path.startsWith(`${normalizedPath}/`)
    );
    
    if (!dirExists) {
      throw new Error(`Directory not found: ${normalizedPath}`);
    }
    
    // Remove all files and directories under this path
    const pathsToRemove = Object.keys(fileSystem).filter(path => 
      path === normalizedPath || path.startsWith(`${normalizedPath}/`)
    );
    
    // Remove each path
    pathsToRemove.forEach(path => {
      delete fileSystem[path];
    });
    
    // Save updated file system
    saveMockFileSystem(fileSystem);
    
    // Dispatch event to update UI
    const event = new CustomEvent('file-system-changed', {
      detail: { path: normalizedPath, type: 'remove', isFile: false }
    });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error removing directory from mock file system:', error);
    throw error;
  }
}

/**
 * Creates a project from a template in the mock file system
 * @param projectName Name of the project
 * @param options Project options
 */
export async function createProject(projectName: string, options: ProjectOptions): Promise<string> {
  try {
    // Normalize project path
    const projectPath = normalizePath(`/${projectName}`);
    
    // Create project directory
    await createDirectory(projectPath);
    
    // Generate mock files based on template
    const mockFiles = getMockFilesForTemplate(options.templateType, options.template, projectName);
    const fileContents = generateMockFileContents(options.templateType, options.template, projectName);
    
    // Create directories first
    for (const file of mockFiles) {
      if (file.isDirectory) {
        await createDirectory(file.path);
      }
    }
    
    // Then create files
    for (const fileContent of fileContents) {
      await createFile(fileContent.path, fileContent.content);
    }
    
    // Update the file explorer UI
    updateFileExplorerWithMockFiles(options);
    
    return projectPath;
  } catch (error) {
    console.error('Error creating project in mock file system:', error);
    throw error;
  }
}

/**
 * Gets the mock file system from localStorage
 * @returns The mock file system object
 */
export function getMockFileSystem(): MockFileSystem {
  try {
    const storedFileSystem = localStorage.getItem('mockFileSystem');
    return storedFileSystem ? JSON.parse(storedFileSystem) : {};
  } catch (error) {
    console.error('Error getting mock file system:', error);
    return {};
  }
}

/**
 * Saves the mock file system to localStorage
 * @param fileSystem The mock file system object
 */
export function saveMockFileSystem(fileSystem: MockFileSystem): void {
  try {
    localStorage.setItem('mockFileSystem', JSON.stringify(fileSystem));
  } catch (error) {
    console.error('Error saving mock file system:', error);
    throw error;
  }
}

/**
 * Clears the entire mock file system
 */
export async function clearMockFileSystem(): Promise<void> {
  try {
    localStorage.removeItem('mockFileSystem');
  } catch (error) {
    console.error('Error clearing mock file system:', error);
    throw error;
  }
}

/**
 * Checks if a path exists in the mock file system
 * @param path Path to check
 * @returns Whether the path exists
 */
export async function exists(path: string): Promise<boolean> {
  const normalizedPath = normalizePath(path);
  const fileSystem = getMockFileSystem();
  return normalizedPath in fileSystem;
}

/**
 * Checks if a path is a file in the mock file system
 * @param path Path to check
 * @returns Whether the path is a file
 */
export async function isFile(path: string): Promise<boolean> {
  const normalizedPath = normalizePath(path);
  const fileSystem = getMockFileSystem();
  return normalizedPath in fileSystem && typeof fileSystem[normalizedPath] === 'string';
}

/**
 * Checks if a path is a directory in the mock file system
 * @param path Path to check
 * @returns Whether the path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  const normalizedPath = normalizePath(path);
  const fileSystem = getMockFileSystem();
  return normalizedPath in fileSystem && typeof fileSystem[normalizedPath] !== 'string';
}

/**
 * Function to update file explorer with mock files for the new project
 */
export function updateFileExplorerWithMockFiles(options: ProjectOptions): void {
  // Get the file tree container
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.error('File tree container not found');
    return;
  }
  
  // Clear the container
  fileTree.innerHTML = '';
  
  // Create a list for files
  const fileList = document.createElement('ul');
  fileList.className = 'file-list';
  
  // Add mock files based on the selected template
  const files = getMockFilesForTemplate(options.templateType, options.template, options.name);
  
  // Create file elements
  files.forEach(file => {
    const item = document.createElement('li');
    item.className = `file-item ${file.isDirectory ? 'directory' : 'file'}`;
    item.dataset.path = file.path;
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = file.isDirectory ? '📁' : '📄';
    
    // Create name
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    
    // Add to item
    item.appendChild(icon);
    item.appendChild(name);
    
    // Add click handler for files
    if (!file.isDirectory) {
      item.addEventListener('click', () => {
        // Dispatch file selected event
        const event = new CustomEvent('file-selected', {
          detail: { path: file.path }
        });
        document.dispatchEvent(event);
        
        // Highlight the selected file
        document.querySelectorAll('.file-item').forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
      });
    }
    
    fileList.appendChild(item);
  });
  
  // Add to the file tree
  fileTree.appendChild(fileList);
}

// Get mock files based on the selected template
export function getMockFilesForTemplate(templateType: string, templateId: string, projectName: string = 'project'): MockFile[] {
  const files: MockFile[] = [];
  
  // Add common files
  files.push({
    name: 'package.json',
    path: `/${projectName}/package.json`,
    isDirectory: false
  });
  
  // Add template-specific files
  switch (templateType) {
    case 'web':
      addWebTemplateFiles(files, templateId, projectName);
      break;
    case 'mobile':
      addMobileTemplateFiles(files, templateId, projectName);
      break;
    case 'desktop':
      addDesktopTemplateFiles(files, templateId, projectName);
      break;
    case 'backend':
      addBackendTemplateFiles(files, templateId, projectName);
      break;
    case 'fullstack':
      addFullstackTemplateFiles(files, templateId, projectName);
      break;
    case 'library':
      addLibraryTemplateFiles(files, templateId, projectName);
      break;
  }
  
  return files;
}

// Add files for web templates
function addWebTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  // Common web files
  files.push({
    name: 'public',
    path: `/${projectName}/public`,
    isDirectory: true
  });
  
  files.push({
    name: 'src',
    path: `/${projectName}/src`,
    isDirectory: true
  });
  
  // Template specific files
  if (templateId === 'react') {
    files.push({
      name: 'App.tsx',
      path: `/${projectName}/src/App.tsx`,
      isDirectory: false
    });
    files.push({
      name: 'index.tsx',
      path: `/${projectName}/src/index.tsx`,
      isDirectory: false
    });
  } else if (templateId === 'vue') {
    files.push({
      name: 'App.vue',
      path: `/${projectName}/src/App.vue`,
      isDirectory: false
    });
    files.push({
      name: 'main.ts',
      path: `/${projectName}/src/main.ts`,
      isDirectory: false
    });
  } else if (templateId === 'angular') {
    files.push({
      name: 'app',
      path: `/${projectName}/src/app`,
      isDirectory: true
    });
    files.push({
      name: 'main.ts',
      path: `/${projectName}/src/main.ts`,
      isDirectory: false
    });
  } else if (templateId === 'next') {
    files.push({
      name: 'pages',
      path: `/${projectName}/pages`,
      isDirectory: true
    });
    files.push({
      name: '_app.tsx',
      path: `/${projectName}/pages/_app.tsx`,
      isDirectory: false
    });
    files.push({
      name: 'index.tsx',
      path: `/${projectName}/pages/index.tsx`,
      isDirectory: false
    });
  } else if (templateId === 'html') {
    files.push({
      name: 'index.html',
      path: `/${projectName}/public/index.html`,
      isDirectory: false
    });
    files.push({
      name: 'styles.css',
      path: `/${projectName}/public/styles.css`,
      isDirectory: false
    });
    files.push({
      name: 'script.js',
      path: `/${projectName}/public/script.js`,
      isDirectory: false
    });
  }
}

// Add files for mobile templates
function addMobileTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  // React Native specific files for mobile
  if (templateId === 'react-native') {
    files.push({
      name: 'android',
      path: `/${projectName}/android`,
      isDirectory: true
    });
    
    files.push({
      name: 'ios',
      path: `/${projectName}/ios`,
      isDirectory: true
    });
    
    files.push({
      name: 'App.tsx',
      path: `/${projectName}/App.tsx`,
      isDirectory: false
    });
    
    files.push({
      name: 'index.js',
      path: `/${projectName}/index.js`,
      isDirectory: false
    });
  } else if (templateId === 'flutter') {
    files.push({
      name: 'lib',
      path: `/${projectName}/lib`,
      isDirectory: true
    });
    files.push({
      name: 'main.dart',
      path: `/${projectName}/lib/main.dart`,
      isDirectory: false
    });
    files.push({
      name: 'android',
      path: `/${projectName}/android`,
      isDirectory: true
    });
    files.push({
      name: 'ios',
      path: `/${projectName}/ios`,
      isDirectory: true
    });
  }
}

// Add files for desktop templates
function addDesktopTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  if (templateId === 'tauri') {
    files.push({
      name: 'src',
      path: `/${projectName}/src`,
      isDirectory: true
    });
    files.push({
      name: 'src-tauri',
      path: `/${projectName}/src-tauri`,
      isDirectory: true
    });
    files.push({
      name: 'main.rs',
      path: `/${projectName}/src-tauri/src/main.rs`,
      isDirectory: false
    });
  } else if (templateId === 'electron') {
    files.push({
      name: 'src',
      path: `/${projectName}/src`,
      isDirectory: true
    });
    files.push({
      name: 'main.ts',
      path: `/${projectName}/src/main.ts`,
      isDirectory: false
    });
    files.push({
      name: 'renderer.ts',
      path: `/${projectName}/src/renderer.ts`,
      isDirectory: false
    });
  }
}

// Add files for backend templates
function addBackendTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  files.push({
    name: 'src',
    path: `/${projectName}/src`,
    isDirectory: true
  });
  
  if (templateId === 'node-express') {
    files.push({
      name: 'app.ts',
      path: `/${projectName}/src/app.ts`,
      isDirectory: false
    });
    files.push({
      name: 'routes',
      path: `/${projectName}/src/routes`,
      isDirectory: true
    });
    files.push({
      name: 'controllers',
      path: `/${projectName}/src/controllers`,
      isDirectory: true
    });
  } else if (templateId === 'nestjs') {
    files.push({
      name: 'main.ts',
      path: `/${projectName}/src/main.ts`,
      isDirectory: false
    });
    files.push({
      name: 'app.module.ts',
      path: `/${projectName}/src/app.module.ts`,
      isDirectory: false
    });
    files.push({
      name: 'controllers',
      path: `/${projectName}/src/controllers`,
      isDirectory: true
    });
    files.push({
      name: 'services',
      path: `/${projectName}/src/services`,
      isDirectory: true
    });
  }
}

// Add files for fullstack templates
function addFullstackTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  if (templateId === 'mern') {
    // Backend files
    files.push({
      name: 'server',
      path: `/${projectName}/server`,
      isDirectory: true
    });
    files.push({
      name: 'server.js',
      path: `/${projectName}/server/server.js`,
      isDirectory: false
    });
    
    // Frontend files
    files.push({
      name: 'client',
      path: `/${projectName}/client`,
      isDirectory: true
    });
    files.push({
      name: 'src',
      path: `/${projectName}/client/src`,
      isDirectory: true
    });
    files.push({
      name: 'App.jsx',
      path: `/${projectName}/client/src/App.jsx`,
      isDirectory: false
    });
  }
}

// Add files for library templates
function addLibraryTemplateFiles(files: MockFile[], templateId: string, projectName: string): void {
  files.push({
    name: 'src',
    path: `/${projectName}/src`,
    isDirectory: true
  });
  files.push({
    name: 'index.ts',
    path: `/${projectName}/src/index.ts`,
    isDirectory: false
  });
  files.push({
    name: 'tests',
    path: `/${projectName}/tests`,
    isDirectory: true
  });
  files.push({
    name: 'README.md',
    path: `/${projectName}/README.md`,
    isDirectory: false
  });
}

/**
 * Generate mock file contents based on the selected template
 * @param templateType Template type (web, mobile, etc.)
 * @param templateId Specific template ID
 * @param projectName Project name
 * @returns Array of file path and content pairs
 */
function generateMockFileContents(templateType: string, templateId: string, projectName: string): MockFileContent[] {
  const fileContents: MockFileContent[] = [];
  
  // Add package.json
  fileContents.push({
    path: `/${projectName}/package.json`,
    content: JSON.stringify({
      name: projectName,
      version: '0.1.0',
      private: true,
      dependencies: {},
      devDependencies: {},
      scripts: {
        start: 'echo "Start script not configured"',
        build: 'echo "Build script not configured"',
        test: 'echo "Test script not configured"'
      }
    }, null, 2)
  });
  
  // Add template-specific file contents
  switch (templateType) {
    case 'web':
      addWebTemplateContents(fileContents, templateId, projectName);
      break;
    case 'mobile':
      addMobileTemplateContents(fileContents, templateId, projectName);
      break;
    case 'desktop':
      addDesktopTemplateContents(fileContents, templateId, projectName);
      break;
    case 'backend':
      addBackendTemplateContents(fileContents, templateId, projectName);
      break;
    case 'fullstack':
      addFullstackTemplateContents(fileContents, templateId, projectName);
      break;
    case 'library':
      addLibraryTemplateContents(fileContents, templateId, projectName);
      break;
  }
  
  return fileContents;
}

// Add web template file contents
function addWebTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  // Template-specific contents
  if (templateId === 'react') {
    fileContents.push({
      path: `/${projectName}/src/App.tsx`,
      content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${projectName}</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
      </header>
    </div>
  );
}

export default App;
`
    });
    
    fileContents.push({
      path: `/${projectName}/src/index.tsx`,
      content: `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
`
    });
  } else if (templateId === 'html') {
    fileContents.push({
      path: `/${projectName}/public/index.html`,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Welcome to ${projectName}</h1>
  <p>This is a sample HTML project.</p>
  
  <script src="script.js"></script>
</body>
</html>
`
    });
    
    fileContents.push({
      path: `/${projectName}/public/styles.css`,
      content: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  line-height: 1.6;
}

h1 {
  color: #333;
}
`
    });
    
    fileContents.push({
      path: `/${projectName}/public/script.js`,
      content: `// Main script file for ${projectName}
console.log('Script loaded successfully!');

// Add your JavaScript code here
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
});
`
    });
  }
  
  // Add README.md for all web projects
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

This is a web project created with Deepseek Code IDE.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm start
   \`\`\`

## Project Structure

- \`public/\`: Static assets
- \`src/\`: Source code
`
  });
}

// Add mobile template file contents
function addMobileTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  if (templateId === 'react-native') {
    fileContents.push({
      path: `/${projectName}/App.tsx`,
      content: `import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.title}>${projectName}</Text>
        <Text style={styles.subtitle}>
          Edit App.tsx to change this screen and then come back to see your edits.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 960,
    marginHorizontal: 'auto',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#38434D',
    marginVertical: 12,
  },
});

export default App;
`
    });
    
    fileContents.push({
      path: `/${projectName}/index.js`,
      content: `import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
`
    });
  }
  
  // Add README.md for all mobile projects
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

A mobile application created with Deepseek Code IDE.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Run the app:
   \`\`\`
   npx react-native run-ios
   # or
   npx react-native run-android
   \`\`\`

## Project Structure

- \`android/\`: Android project files
- \`ios/\`: iOS project files
- \`App.tsx\`: Main application component
`
  });
}

// Add desktop template file contents
function addDesktopTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  if (templateId === 'electron') {
    fileContents.push({
      path: `/${projectName}/src/main.ts`,
      content: `import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`
    });
    
    fileContents.push({
      path: `/${projectName}/src/renderer.ts`,
      content: `// This file contains the renderer process code
console.log('Renderer process started');

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = \`
      <h1>${projectName}</h1>
      <p>Welcome to your Electron application!</p>
    \`;
  }
});
`
    });
  } else if (templateId === 'tauri') {
    fileContents.push({
      path: `/${projectName}/src-tauri/src/main.rs`,
      content: `#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`
    });
  }
  
  // Add README.md for all desktop projects
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

A desktop application created with Deepseek Code IDE.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development app:
   \`\`\`
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`
   npm run build
   \`\`\`

## Project Structure

- \`src/\`: Application source code
${templateId === 'tauri' ? '- `src-tauri/`: Tauri-specific native code\n' : ''}
`
  });
}

// Add backend template file contents
function addBackendTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  if (templateId === 'node-express') {
    fileContents.push({
      path: `/${projectName}/src/app.ts`,
      content: `import express from 'express';
import { json, urlencoded } from 'body-parser';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${projectName} API' });
});

// Start server
app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});

export default app;
`
    });
  } else if (templateId === 'nestjs') {
    fileContents.push({
      path: `/${projectName}/src/main.ts`,
      content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log(\`Application is running on: http://localhost:3000\`);
}
bootstrap();
`
    });
    
    fileContents.push({
      path: `/${projectName}/src/app.module.ts`,
      content: `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`
    });
  }
  
  // Add README.md for all backend projects
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

A backend application created with Deepseek Code IDE.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`
   npm run build
   \`\`\`

## Project Structure

- \`src/\`: Source code
${templateId === 'node-express' ? '- `src/routes/`: API routes\n- `src/controllers/`: Request handlers\n' : ''}
${templateId === 'nestjs' ? '- `src/controllers/`: Request handlers\n- `src/services/`: Business logic\n' : ''}
`
  });
}

// Add fullstack template file contents
function addFullstackTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  if (templateId === 'mern') {
    // Backend files
    fileContents.push({
      path: `/${projectName}/server/server.js`,
      content: `const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Define routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to ${projectName} API' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`
    });
    
    // Frontend files
    fileContents.push({
      path: `/${projectName}/client/src/App.jsx`,
      content: `import React, { useState, useEffect } from 'react';

function App() {
  const [apiMessage, setApiMessage] = useState('');
  
  useEffect(() => {
    // Fetch message from the backend API
    fetch('/api')
      .then(response => response.json())
      .then(data => setApiMessage(data.message))
      .catch(error => console.error('Error fetching API:', error));
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>${projectName}</h1>
        <p>A MERN Stack Application</p>
        {apiMessage && <p>API Message: {apiMessage}</p>}
      </header>
    </div>
  );
}

export default App;
`
    });
  }
  
  // Add README.md for all fullstack projects
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

A fullstack application created with Deepseek Code IDE.

## Getting Started

1. Install server dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Install client dependencies:
   \`\`\`
   cd client
   npm install
   \`\`\`

3. Run both server and client:
   \`\`\`
   npm run dev
   \`\`\`

## Project Structure

- \`server/\`: Backend code
- \`client/\`: Frontend code
  - \`client/src/\`: Frontend source code
`
  });
}

// Add library template file contents
function addLibraryTemplateContents(fileContents: MockFileContent[], templateId: string, projectName: string): void {
  fileContents.push({
    path: `/${projectName}/src/index.ts`,
    content: `/**
 * ${projectName} - A TypeScript library
 */

/**
 * Main function example
 * @param input Input to process
 * @returns Processed result
 */
export function main(input: string): string {
  return \`Processed: \${input}\`;
}

/**
 * Helper function example
 * @param value Value to validate
 * @returns Whether the value is valid
 */
export function isValid(value: unknown): boolean {
  return value !== null && value !== undefined;
}

// Export all functions from this library
export * from './utils';
`
  });
  
  fileContents.push({
    path: `/${projectName}/src/utils.ts`,
    content: `/**
 * Utility functions for ${projectName}
 */

/**
 * Format a string to title case
 * @param str String to format
 * @returns Formatted string
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\\w\\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

/**
 * Generate a random string of given length
 * @param length Length of the string to generate
 * @returns Random string
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
`
  });
  
  fileContents.push({
    path: `/${projectName}/README.md`,
    content: `# ${projectName}

A TypeScript library created with Deepseek Code IDE.

## Installation

\`\`\`
npm install ${projectName.toLowerCase()}
\`\`\`

## Usage

\`\`\`typescript
import { main, isValid } from '${projectName.toLowerCase()}';

// Use library functions
const result = main('test');
console.log(result); // "Processed: test"
\`\`\`

## Development

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Run tests:
   \`\`\`
   npm test
   \`\`\`

3. Build the library:
   \`\`\`
   npm run build
   \`\`\`

## Project Structure

- \`src/\`: Source code
- \`tests/\`: Test files
\`\`\`
`
  });
}