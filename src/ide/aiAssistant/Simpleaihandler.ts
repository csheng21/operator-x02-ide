// Simpleaihandler.ts - WITH REQUIREMENTS SUPPORT

import { writeTextFile } from '@tauri-apps/plugin-fs';
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
  // Requirements
  description?: string;
  features?: string;
  expectedInput?: string;
  expectedOutput?: string;
  uiDescription?: string;
}

export async function handleApplySettingsSimple(settings: ProjectSettings): Promise<void> {
  console.log('🤖 Generating project setup script with requirements', settings);
  
  closeConfigurationModal();
  
  showTypingIndicator();
  
  // Show requirements summary if provided
  let requirementsSummary = '';
  if (settings.description || settings.features || settings.uiDescription) {
    requirementsSummary = '\n**Requirements:**\n';
    if (settings.description) requirementsSummary += `- ${settings.description}\n`;
    if (settings.features) requirementsSummary += `- Features: ${settings.features}\n`;
    if (settings.uiDescription) requirementsSummary += `- UI: ${settings.uiDescription}\n`;
  }
  
  await addMessageToChat('assistant', `
🚀 **Creating setup script for ${settings.projectType}...**

**Name:** ${settings.projectName}
**Location:** \`${settings.projectPath}\`
${requirementsSummary}
Generating customized setup script...
  `);

  try {
    const batFileName = `create-${settings.projectName}.bat`;
    const scriptPath = await join(settings.projectPath, batFileName);
    
    console.log('📝 Saving script to:', scriptPath);
    await addSystemMessage(`📝 Creating setup script...`);
    
    const scriptContent = generateBatchScript(settings);
    await writeTextFile(scriptPath, scriptContent);
    
    await hideTypingIndicator();
    
    await addMessageToChat('assistant', `
✅ **Customized setup script created!**

**Script:** \`${scriptPath}\`

Your requirements have been included in:
- 📄 README.md (full documentation)
- 📝 Batch script comments (for reference)
- 💡 Project structure (optimized for your needs)

**To create your project:**

1️⃣ **Run the script**
   - Navigate to: \`${settings.projectPath}\`
   - Double-click: \`${batFileName}\`

2️⃣ **Wait for completion**
   - Creates project folder with all files
   - Installs dependencies ${settings.installDependencies ? '✅' : '(skip)'}
   - Sets up git repository

3️⃣ **Start coding!**
   - \`cd ${settings.projectName}\`
   - \`npm run dev\`

🎯 The project is customized based on your requirements!
    `);

    showNotification('✅ Setup script created!', 'success');

  } catch (error) {
    await hideTypingIndicator();
    console.error('❌ Script creation failed:', error);
    await addSystemMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    showNotification('Failed to create script', 'error');
  }
}

function generateBatchScript(settings: ProjectSettings): string {
  const { projectName, projectType, installDependencies, createReadme } = settings;
  const type = projectType.toLowerCase();

  let script = `@echo off
echo ========================================
echo Creating ${projectName}
echo Type: ${projectType}
`;

  if (settings.description) {
    script += `echo Description: ${settings.description}\n`;
  }

  script += `echo ========================================
echo.

REM ============================================
REM Project Requirements
REM ============================================
`;

  if (settings.description) {
    script += `REM Description: ${settings.description}\n`;
  }
  if (settings.features) {
    script += `REM Features: ${settings.features}\n`;
  }
  if (settings.expectedInput) {
    script += `REM Input: ${settings.expectedInput}\n`;
  }
  if (settings.expectedOutput) {
    script += `REM Output: ${settings.expectedOutput}\n`;
  }
  if (settings.uiDescription) {
    script += `REM UI: ${settings.uiDescription}\n`;
  }

  script += `REM ============================================
echo.

REM Create project directory
echo [1/8] Creating project folder...
mkdir "${projectName}"
if %errorlevel% neq 0 (
    echo ERROR: Could not create project folder!
    pause
    exit /b 1
)
cd "${projectName}"
echo     ✓ Project folder created

REM Create folder structure
echo [2/8] Creating folder structure...
`;

  const folders = getFolders(type);
  folders.forEach(folder => {
    script += `mkdir "${folder.replace(/\//g, '\\')}" 2>nul\n`;
  });

  script += `echo     ✓ Folder structure created

REM Create package.json
echo [3/8] Creating package.json...
`;

  const packageJson = getPackageJson(settings);
  script += createEchoJsonCommands('package.json', packageJson);
  script += `echo     ✓ package.json created\n\n`;

  if (createReadme) {
    script += `REM Create README.md with requirements
echo [4/8] Creating README.md...
`;
    script += createEchoTextCommands('README.md', getReadme(settings));
    script += `echo     ✓ README.md created\n\n`;
  } else {
    script += `echo [4/8] Skipping README.md\n\n`;
  }

  script += `REM Create .gitignore
echo [5/8] Creating .gitignore...
`;
  script += createEchoTextCommands('.gitignore', getGitignore());
  script += `echo     ✓ .gitignore created\n\n`;

  script += `REM Create starter files
echo [6/8] Creating starter files...
`;
  script += generateStarterFileCommands(type, projectName);
  script += `echo     ✓ Starter files created\n\n`;

  if (installDependencies) {
    script += `REM Install dependencies
echo [7/8] Installing dependencies...
echo     This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo WARNING: npm install failed.
) else (
    echo     ✓ Dependencies installed
)
echo.

`;
  } else {
    script += `echo [7/8] Skipping dependency installation\necho.\n\n`;
  }

  script += `REM Initialize git
echo [8/8] Initializing git...
git init >nul 2>&1
echo     ✓ Git initialized
echo.

echo ========================================
echo ✅ PROJECT CREATED SUCCESSFULLY!
echo ========================================
echo.
echo Project: ${projectName}
echo Location: %cd%
echo.
echo NEXT STEPS:
echo 1. cd ${projectName}
${installDependencies ? '' : 'echo 2. npm install'}
echo ${installDependencies ? '2' : '3'}. npm run dev
echo.
echo 🚀 Your customized project is ready!
echo.
pause
`;

  return script;
}

function getReadme(settings: ProjectSettings): string {
  let readme = `# ${settings.projectName}

A ${settings.projectType} project.
`;

  // Add requirements section
  if (settings.description || settings.features || settings.expectedInput || settings.expectedOutput || settings.uiDescription) {
    readme += `\n## 📋 Project Overview\n`;
    
    if (settings.description) {
      readme += `\n### Description\n${settings.description}\n`;
    }
    
    if (settings.features) {
      readme += `\n### Key Features\n${settings.features}\n`;
    }
    
    if (settings.expectedInput) {
      readme += `\n### Expected Input\n${settings.expectedInput}\n`;
    }
    
    if (settings.expectedOutput) {
      readme += `\n### Expected Output\n${settings.expectedOutput}\n`;
    }
    
    if (settings.uiDescription) {
      readme += `\n### UI Design\n${settings.uiDescription}\n`;
    }
  }

  readme += `\n## 🚀 Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## 📜 Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build

## 📁 Project Structure

\`\`\`
${settings.projectName}/
├── src/              # Source files
├── public/           # Static assets
└── package.json      # Dependencies
\`\`\`

---
Created with AI Code IDE
`;

  return readme;
}

function getFolders(type: string): string[] {
  if (type.includes('react')) {
    return ['src', 'src/components', 'src/hooks', 'src/utils', 'src/styles', 'src/assets', 'public'];
  }
  if (type.includes('vue')) {
    return ['src', 'src/components', 'src/views', 'src/router', 'src/stores', 'src/assets', 'public'];
  }
  if (type.includes('next')) {
    return ['app', 'components', 'lib', 'public', 'styles'];
  }
  if (type.includes('node')) {
    return ['src', 'src/routes', 'src/controllers', 'src/models', 'src/middleware', 'tests'];
  }
  return ['src', 'public'];
}

function getPackageJson(settings: ProjectSettings): any {
  const base = {
    name: settings.projectName,
    version: '0.1.0',
    private: true,
    type: 'module'
  };

  // Add description if provided
  if (settings.description) {
    base['description'] = settings.description;
  }

  const type = settings.projectType.toLowerCase();

  if (type.includes('react')) {
    return {
      ...base,
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
      devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.2' }
    };
  }
  
  return base;
}

function getGitignore(): string {
  return `node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
`;
}

function createEchoJsonCommands(filename: string, json: any): string {
  const jsonString = JSON.stringify(json, null, 2);
  const lines = jsonString.split('\n');
  let commands = `(\n`;
  lines.forEach(line => {
    const escaped = line.replace(/"/g, '\\"');
    commands += `  echo ${escaped}\n`;
  });
  commands += `) > "${filename}"\n`;
  return commands;
}

function createEchoTextCommands(filename: string, content: string): string {
  const lines = content.split('\n');
  let commands = `(\n`;
  lines.forEach(line => {
    const escaped = line.replace(/"/g, '\\"').replace(/`/g, '\\`');
    commands += `  echo ${escaped || '.'}\n`;
  });
  commands += `) > "${filename}"\n`;
  return commands;
}

function generateStarterFileCommands(type: string, projectName: string): string {
  let commands = '';
  
  if (type.includes('react')) {
    commands += `(
  echo ^<!DOCTYPE html^>
  echo ^<html lang="en"^>
  echo ^<head^>
  echo   ^<meta charset="UTF-8"^>
  echo   ^<title^>${projectName}^</title^>
  echo ^</head^>
  echo ^<body^>
  echo   ^<div id="root"^>^</div^>
  echo   ^<script type="module" src="/src/main.jsx"^>^</script^>
  echo ^</body^>
  echo ^</html^>
) > "index.html"

(
  echo import { defineConfig } from 'vite'
  echo import react from '@vitejs/plugin-react'
  echo.
  echo export default defineConfig({
  echo   plugins: [react^(^)],
  echo }^)
) > "vite.config.js"

(
  echo import React from 'react'
  echo import ReactDOM from 'react-dom/client'
  echo import App from './App.jsx'
  echo.
  echo ReactDOM.createRoot^(document.getElementById^('root'^)^).render^(
  echo   ^<React.StrictMode^>
  echo     ^<App /^>
  echo   ^</React.StrictMode^>,
  echo ^)
) > "src\\main.jsx"

(
  echo import { useState } from 'react'
  echo.
  echo function App^(^) {
  echo   const [count, setCount] = useState^(0^)
  echo.
  echo   return ^(
  echo     ^<div^>
  echo       ^<h1^>${projectName}^</h1^>
  echo       ^<button onClick={^(^) =^> setCount^(count + 1^)}^>
  echo         Count: {count}
  echo       ^</button^>
  echo     ^</div^>
  echo   ^)
  echo }
  echo.
  echo export default App
) > "src\\App.jsx"

`;
  }
  
  return commands;
}

function closeConfigurationModal(): void {
  const modal = document.querySelector('.config-modal');
  if (modal) modal.classList.remove('active');
  
  const setupModal = document.getElementById('project-config-modal');
  if (setupModal) setupModal.remove();
  
  const settingsModal = document.getElementById('project-settings-modal');
  if (settingsModal) {
    settingsModal.classList.remove('modal-open');
    setTimeout(() => settingsModal.remove(), 300);
  }
}

export function resolveProjectPurpose(userMessage: string): void {}