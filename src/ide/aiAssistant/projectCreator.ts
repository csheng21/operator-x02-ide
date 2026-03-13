// projectCreator.ts - Actually creates project files using Tauri FS API

import { mkdir, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { addMessageToChat, addSystemMessage } from './messageUI';
import { showTypingIndicator, hideTypingIndicator } from './typingIndicator';
import { showNotification } from './notificationManager';

interface ProjectSettings {
  projectName: string;
  projectPath: string;
  projectType: string;
  installDependencies: boolean;
  createReadme: boolean;
}

/**
 * Main function - Creates the actual project files
 */
export async function createProjectFiles(settings: ProjectSettings): Promise<void> {
  console.log('🚀 Creating project at:', settings.projectPath);
  
  try {
    showTypingIndicator();
    await addSystemMessage('🏗️ Creating your project...');

    // Full project path
    const projectRoot = await join(settings.projectPath, settings.projectName);
    
    // Check if project already exists
    const projectExists = await exists(projectRoot);
    if (projectExists) {
      await hideTypingIndicator();
      await addSystemMessage(`❌ Project "${settings.projectName}" already exists at that location!`);
      showNotification('Project already exists!', 'error');
      return;
    }

    // Create project root folder
    await mkdir(projectRoot, { recursive: true });
    await addSystemMessage(`✅ Created project folder: ${settings.projectName}`);

    // Create folder structure based on project type
    await createFolderStructure(projectRoot, settings.projectType);
    await addSystemMessage('✅ Created folder structure');

    // Create essential files
    await createPackageJson(projectRoot, settings);
    await addSystemMessage('✅ Created package.json');

    if (settings.createReadme) {
      await createReadme(projectRoot, settings);
      await addSystemMessage('✅ Created README.md');
    }

    await createGitignore(projectRoot);
    await addSystemMessage('✅ Created .gitignore');

    // Create starter files based on project type
    await createStarterFiles(projectRoot, settings);
    await addSystemMessage('✅ Created starter files');

    await hideTypingIndicator();

    // Success message
    await addMessageToChat('assistant', `
🎉 **Project created successfully!**

**Location:** \`${projectRoot}\`

**Next steps:**
1. Open terminal in project folder
2. Run: \`npm install\`
3. Run: \`npm run dev\`

${settings.installDependencies ? '💡 Note: You enabled "Install Dependencies" but I can only create files. Please run `npm install` manually in your terminal.' : ''}

**What would you like to do next?**
- Ask me to create specific components
- Get help with configuration
- Or just start coding! 🚀
    `);

    showNotification('✅ Project created!', 'success');

  } catch (error) {
    await hideTypingIndicator();
    console.error('❌ Project creation failed:', error);
    await addSystemMessage(`❌ Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    showNotification('Failed to create project', 'error');
  }
}

/**
 * Create folder structure based on project type
 */
async function createFolderStructure(projectRoot: string, projectType: string): Promise<void> {
  const folders = getProjectFolders(projectType);
  
  for (const folder of folders) {
    const folderPath = await join(projectRoot, folder);
    await mkdir(folderPath, { recursive: true });
  }
}

/**
 * Get folder structure based on project type
 */
function getProjectFolders(projectType: string): string[] {
  const commonFolders = ['src', 'public'];
  
  switch (projectType.toLowerCase()) {
    case 'react web app':
    case 'react':
      return [
        ...commonFolders,
        'src/components',
        'src/hooks',
        'src/utils',
        'src/styles',
        'src/assets'
      ];
    
    case 'vue web app':
    case 'vue':
      return [
        ...commonFolders,
        'src/components',
        'src/views',
        'src/router',
        'src/stores',
        'src/assets'
      ];
    
    case 'next.js app':
    case 'nextjs':
      return [
        'app',
        'public',
        'components',
        'lib',
        'styles'
      ];
    
    case 'node.js backend':
    case 'nodejs':
      return [
        'src',
        'src/routes',
        'src/controllers',
        'src/models',
        'src/middleware',
        'src/utils',
        'tests'
      ];
    
    default:
      return commonFolders;
  }
}

/**
 * Create package.json
 */
async function createPackageJson(projectRoot: string, settings: ProjectSettings): Promise<void> {
  const packageJson = generatePackageJson(settings);
  const packagePath = await join(projectRoot, 'package.json');
  await writeTextFile(packagePath, JSON.stringify(packageJson, null, 2));
}

/**
 * Generate package.json content based on project type
 */
function generatePackageJson(settings: ProjectSettings): any {
  const basePackage = {
    name: settings.projectName,
    version: '0.1.0',
    private: true,
    type: 'module'
  };

  switch (settings.projectType.toLowerCase()) {
    case 'react web app':
    case 'react':
      return {
        ...basePackage,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
          lint: 'eslint .'
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.3.1',
          vite: '^5.4.2',
          eslint: '^8.57.0'
        }
      };

    case 'vue web app':
    case 'vue':
      return {
        ...basePackage,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          vue: '^3.4.0'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          vite: '^5.4.2'
        }
      };

    case 'next.js app':
    case 'nextjs':
      return {
        ...basePackage,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          next: '^14.2.0',
          react: '^18.3.1',
          'react-dom': '^18.3.1'
        },
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          eslint: '^8',
          'eslint-config-next': '14.2.0',
          typescript: '^5'
        }
      };

    case 'node.js backend':
    case 'nodejs':
      return {
        ...basePackage,
        scripts: {
          start: 'node src/index.js',
          dev: 'nodemon src/index.js',
          test: 'jest'
        },
        dependencies: {
          express: '^4.19.0',
          dotenv: '^16.4.0'
        },
        devDependencies: {
          nodemon: '^3.1.0',
          jest: '^29.7.0'
        }
      };

    default:
      return {
        ...basePackage,
        scripts: {
          start: 'node index.js'
        }
      };
  }
}

/**
 * Create README.md
 */
async function createReadme(projectRoot: string, settings: ProjectSettings): Promise<void> {
  const readme = `# ${settings.projectName}

A ${settings.projectType} project.

## Getting Started

### Install Dependencies
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

## Project Structure

\`\`\`
${settings.projectName}/
├── src/           # Source files
├── public/        # Static assets
└── package.json   # Dependencies
\`\`\`

---
Created with AI Code IDE
`;

  const readmePath = await join(projectRoot, 'README.md');
  await writeTextFile(readmePath, readme);
}

/**
 * Create .gitignore
 */
async function createGitignore(projectRoot: string): Promise<void> {
  const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Next.js
.next/
out/

# Misc
*.tsbuildinfo
`;

  const gitignorePath = await join(projectRoot, '.gitignore');
  await writeTextFile(gitignorePath, gitignore);
}

/**
 * Create starter files based on project type
 */
async function createStarterFiles(projectRoot: string, settings: ProjectSettings): Promise<void> {
  switch (settings.projectType.toLowerCase()) {
    case 'react web app':
    case 'react':
      await createReactStarterFiles(projectRoot, settings);
      break;
    
    case 'vue web app':
    case 'vue':
      await createVueStarterFiles(projectRoot, settings);
      break;
    
    case 'next.js app':
    case 'nextjs':
      await createNextJsStarterFiles(projectRoot, settings);
      break;
    
    case 'node.js backend':
    case 'nodejs':
      await createNodeJsStarterFiles(projectRoot, settings);
      break;
  }
}

/**
 * Create React starter files
 */
async function createReactStarterFiles(projectRoot: string, settings: ProjectSettings): Promise<void> {
  // index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.projectName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;
  await writeTextFile(await join(projectRoot, 'index.html'), indexHtml);

  // vite.config.js
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
  await writeTextFile(await join(projectRoot, 'vite.config.js'), viteConfig);

  // src/main.jsx
  const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
  await writeTextFile(await join(projectRoot, 'src', 'main.jsx'), mainJsx);

  // src/App.jsx
  const appJsx = `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>${settings.projectName}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <p>Edit src/App.jsx and save to test HMR</p>
    </div>
  )
}

export default App`;
  await writeTextFile(await join(projectRoot, 'src', 'App.jsx'), appJsx);

  // src/App.css
  const appCss = `.App {
  text-align: center;
  padding: 2rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}`;
  await writeTextFile(await join(projectRoot, 'src', 'App.css'), appCss);

  // src/index.css
  const indexCss = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`;
  await writeTextFile(await join(projectRoot, 'src', 'index.css'), indexCss);
}

/**
 * Create Vue starter files
 */
async function createVueStarterFiles(projectRoot: string, settings: ProjectSettings): Promise<void> {
  // index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;
  await writeTextFile(await join(projectRoot, 'index.html'), indexHtml);

  // vite.config.js
  const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`;
  await writeTextFile(await join(projectRoot, 'vite.config.js'), viteConfig);

  // src/main.js
  const mainJs = `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`;
  await writeTextFile(await join(projectRoot, 'src', 'main.js'), mainJs);

  // src/App.vue
  const appVue = `<template>
  <div id="app">
    <h1>${settings.projectName}</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style>
#app {
  text-align: center;
  padding: 2rem;
}
</style>`;
  await writeTextFile(await join(projectRoot, 'src', 'App.vue'), appVue);
}

/**
 * Create Next.js starter files
 */
async function createNextJsStarterFiles(projectRoot: string, settings: ProjectSettings): Promise<void> {
  // app/layout.tsx
  const layout = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`;
  await writeTextFile(await join(projectRoot, 'app', 'layout.tsx'), layout);

  // app/page.tsx
  const page = `export default function Home() {
  return (
    <main>
      <h1>${settings.projectName}</h1>
      <p>Welcome to your Next.js app!</p>
    </main>
  )
}`;
  await writeTextFile(await join(projectRoot, 'app', 'page.tsx'), page);

  // next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig`;
  await writeTextFile(await join(projectRoot, 'next.config.js'), nextConfig);

  // tsconfig.json
  const tsconfig = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;
  await writeTextFile(await join(projectRoot, 'tsconfig.json'), tsconfig);
}

/**
 * Create Node.js starter files
 */
async function createNodeJsStarterFiles(projectRoot: string, settings: ProjectSettings): Promise<void> {
  // src/index.js
  const indexJs = `import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${settings.projectName}!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});`;
  await writeTextFile(await join(projectRoot, 'src', 'index.js'), indexJs);

  // .env.example
  const envExample = `PORT=3000
NODE_ENV=development`;
  await writeTextFile(await join(projectRoot, '.env.example'), envExample);
}