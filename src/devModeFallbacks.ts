// src/devModeFallbacks.ts

// Mock file structure for development
const mockFileStructure = [
  {
    name: 'src',
    path: '/src',
    isDirectory: true,
    expanded: true,
    children: [
      { name: 'main.ts', path: '/src/main.ts', isDirectory: false },
      { name: 'app.tsx', path: '/src/app.tsx', isDirectory: false },
      {
        name: 'components',
        path: '/src/components',
        isDirectory: true,
        expanded: false,
        children: [
          { name: 'Header.tsx', path: '/src/components/Header.tsx', isDirectory: false },
          { name: 'Sidebar.tsx', path: '/src/components/Sidebar.tsx', isDirectory: false }
        ]
      }
    ]
  },
  {
    name: 'public',
    path: '/public',
    isDirectory: true,
    expanded: false,
    children: [
      { name: 'index.html', path: '/public/index.html', isDirectory: false },
      { name: 'styles.css', path: '/public/styles.css', isDirectory: false }
    ]
  },
  { name: 'package.json', path: '/package.json', isDirectory: false },
  { name: 'tsconfig.json', path: '/tsconfig.json', isDirectory: false }
];

// Mock folder selection dialog for development
export async function openFolderDialog(): Promise<string | null> {
  // In development mode, show a modal with sample project choices
  return new Promise((resolve) => {
    // Create a sample selection dialog
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '10000';
    
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#252525';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '5px';
    dialog.style.width = '500px';
    dialog.style.maxWidth = '90%';
    
    dialog.innerHTML = `
      <h2 style="color: #75beff; margin-top: 0;">Development Mode - Select Project</h2>
      <p style="color: #ccc;">Since you're running in development mode, Tauri's native dialog isn't available. Select a sample project:</p>
      <div style="display: flex; gap: 10px; margin: 20px 0;">
        <button id="react-project" style="flex: 1; padding: 10px; cursor: pointer; background: #2b2b2b; color: white; border: 1px solid #444; border-radius: 4px;">React Project</button>
        <button id="vue-project" style="flex: 1; padding: 10px; cursor: pointer; background: #2b2b2b; color: white; border: 1px solid #444; border-radius: 4px;">Vue Project</button>
        <button id="vanilla-project" style="flex: 1; padding: 10px; cursor: pointer; background: #2b2b2b; color: white; border: 1px solid #444; border-radius: 4px;">Vanilla JS</button>
      </div>
      <button id="cancel-selection" style="width: 100%; padding: 10px; cursor: pointer; background: #444; color: white; border: none; border-radius: 4px; margin-top: 10px;">Cancel</button>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Set up event listeners
    document.getElementById('react-project')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve('/mock/react-project');
    });
    
    document.getElementById('vue-project')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve('/mock/vue-project');
    });
    
    document.getElementById('vanilla-project')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve('/mock/vanilla-project');
    });
    
    document.getElementById('cancel-selection')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(null);
    });
  });
}

// Get mock file structure
export function getMockFiles(projectPath: string) {
  // Return the mock structure, but customize based on the selected project type
  const projectName = projectPath.split('/').pop();
  
  // Deep clone to avoid reference issues
  const files = JSON.parse(JSON.stringify(mockFileStructure));
  
  // Customize based on project type
  if (projectName === 'vue-project') {
    files.push({ name: 'vue.config.js', path: '/vue.config.js', isDirectory: false });
    // Replace app.tsx with app.vue
    const srcIndex = files.findIndex(f => f.name === 'src');
    if (srcIndex >= 0) {
      const appIndex = files[srcIndex].children.findIndex(f => f.name === 'app.tsx');
      if (appIndex >= 0) {
        files[srcIndex].children[appIndex] = { name: 'App.vue', path: '/src/App.vue', isDirectory: false };
      }
    }
  } else if (projectName === 'vanilla-project') {
    // Remove React/Vue specific files
    const srcIndex = files.findIndex(f => f.name === 'src');
    if (srcIndex >= 0) {
      files[srcIndex].children = files[srcIndex].children.filter(f => !f.name.endsWith('.tsx'));
      files[srcIndex].children.push({ name: 'main.js', path: '/src/main.js', isDirectory: false });
      files[srcIndex].children.push({ name: 'index.js', path: '/src/index.js', isDirectory: false });
    }
  }
  
  return files;
}