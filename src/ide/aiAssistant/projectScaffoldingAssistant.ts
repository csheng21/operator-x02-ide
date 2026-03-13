// ide/aiAssistant/projectScaffoldingAssistant.ts

import { callGenericAPI } from './apiProviderManager';

interface ProjectTemplate {
  name: string;
  description: string;
  structure: FileStructure;
  dependencies: string[];
  scripts?: Record<string, string>;
  setupCommands: string[];
}

interface FileStructure {
  [key: string]: string | FileStructure;
}

interface SetupScript {
  content: string;
  filename: string;
  platform: 'windows' | 'unix';
  template: ProjectTemplate;
}

export class ProjectScaffoldingAssistant {
  private templates: Map<string, ProjectTemplate> = new Map();
  private apiConfig: any;

  constructor(apiConfig: any) {
    this.apiConfig = apiConfig;
    this.initializeTemplates();
  }

  /**
   * Analyzes user intent and generates appropriate project setup
   */
  async suggestProjectSetup(userInput: string, context?: any): Promise<any> {
    // Detect project type from user input
    const projectType = await this.detectProjectIntent(userInput);
    
    // Get or generate template
    const template = this.templates.get(projectType) || await this.generateCustomTemplate(userInput, projectType);
    
    // Generate customized setup script
    const setupScript = this.generateSetupScript(template, context);
    
    return {
      projectType,
      setupScript,
      explanation: this.generateExplanation(template),
      quickActions: this.generateQuickActions(setupScript)
    };
  }

  /**
   * Uses AI to understand what kind of project the user wants
   */
  private async detectProjectIntent(userInput: string): Promise<string> {
    // Simple pattern matching for common project types
    const input = userInput.toLowerCase();
    
    if (input.includes('react')) return 'react-app';
    if (input.includes('vue')) return 'vue-app';
    if (input.includes('angular')) return 'angular-app';
    if (input.includes('code-to-docs') || input.includes('documentation generator')) return 'code-to-docs';
    if (input.includes('python') && input.includes('flask')) return 'python-flask';
    if (input.includes('python') && input.includes('django')) return 'python-django';
    if (input.includes('python') && input.includes('fastapi')) return 'python-fastapi';
    if (input.includes('python')) return 'python-package';
    if (input.includes('node') || input.includes('express')) return 'node-express';
    if (input.includes('typescript') && input.includes('node')) return 'typescript-node';
    if (input.includes('electron')) return 'electron-app';
    if (input.includes('tauri')) return 'tauri-app';
    if (input.includes('chrome extension') || input.includes('browser extension')) return 'chrome-extension';
    if (input.includes('cli') || input.includes('command line')) return 'cli-tool';
    if (input.includes('api') || input.includes('rest')) return 'api-server';
    
    // Default to a generic project
    return 'generic-project';
  }

  /**
   * Generate a custom template using AI if no predefined template exists
   */
  private async generateCustomTemplate(userInput: string, projectType: string): Promise<ProjectTemplate> {
    try {
      const prompt = `Generate a project structure for: "${userInput}"
Return a JSON object with this structure:
{
  "name": "project-name",
  "description": "Brief description",
  "structure": { "folder": {}, "file.ext": "content" },
  "dependencies": ["package1", "package2"],
  "setupCommands": ["command1", "command2"]
}`;

      const response = await callGenericAPI(prompt, this.apiConfig);
      const parsed = JSON.parse(response);
      
      return {
        name: parsed.name || projectType,
        description: parsed.description || `Custom ${projectType} project`,
        structure: parsed.structure || {},
        dependencies: parsed.dependencies || [],
        setupCommands: parsed.setupCommands || []
      };
    } catch (error) {
      // Fallback to basic template
      return this.getGenericTemplate();
    }
  }

  /**
   * Generates platform-specific setup script
   */
  private generateSetupScript(template: ProjectTemplate, context?: any): SetupScript {
    const platform = context?.platform || 'windows';
    const projectName = context?.projectName || template.name;
    
    let script: string;
    let filename: string;
    
    if (platform === 'windows') {
      script = this.generateWindowsBatch(template, projectName);
      filename = `setup-${template.name}.bat`;
    } else {
      script = this.generateUnixScript(template, projectName);
      filename = `setup-${template.name}.sh`;
    }

    return {
      content: script,
      filename,
      platform,
      template
    };
  }

  /**
   * Generates Windows batch script for project setup
   */
  private generateWindowsBatch(template: ProjectTemplate, projectName: string): string {
    const folderCommands = this.generateFolderCommands(template.structure, 'windows');
    const fileCommands = this.generateFileCommands(template.structure, 'windows');
    
    return `@echo off
echo ========================================
echo Creating ${template.description}...
echo ========================================
echo.

REM Create project directory
if not exist "${projectName}" (
    mkdir "${projectName}"
)
cd "${projectName}"

REM Create folder structure
echo Creating folders...
${folderCommands}

REM Initialize package manager
echo.
echo Initializing project...
${this.generatePackageInit(template, 'windows')}

REM Install dependencies
${template.dependencies.length > 0 ? `echo.
echo Installing dependencies...
${this.generateDependencyInstall(template.dependencies, 'windows')}` : ''}

REM Create initial files
echo.
echo Creating files...
${fileCommands}

REM Run setup commands
${template.setupCommands.length > 0 ? `echo.
echo Running setup commands...
${template.setupCommands.map(cmd => `call ${cmd}`).join('\n')}` : ''}

echo.
echo ========================================
echo Project created successfully!
echo ========================================
echo.
echo Location: %cd%
echo.
echo Next steps:
echo 1. Open this folder in AI Code IDE
echo 2. Start coding with AI assistance!
echo.
pause`;
  }

  /**
   * Generates Unix/Linux shell script
   */
  private generateUnixScript(template: ProjectTemplate, projectName: string): string {
    const folderCommands = this.generateFolderCommands(template.structure, 'unix');
    const fileCommands = this.generateFileCommands(template.structure, 'unix');
    
    return `#!/bin/bash

echo "========================================"
echo "Creating ${template.description}..."
echo "========================================"
echo

# Create project directory
mkdir -p "${projectName}"
cd "${projectName}"

# Create folder structure
echo "Creating folders..."
${folderCommands}

# Initialize package manager
echo
echo "Initializing project..."
${this.generatePackageInit(template, 'unix')}

# Install dependencies
${template.dependencies.length > 0 ? `echo
echo "Installing dependencies..."
${this.generateDependencyInstall(template.dependencies, 'unix')}` : ''}

# Create initial files
echo
echo "Creating files..."
${fileCommands}

# Run setup commands
${template.setupCommands.length > 0 ? `echo
echo "Running setup commands..."
${template.setupCommands.join('\n')}` : ''}

echo
echo "========================================"
echo "✅ Project created successfully!"
echo "========================================"
echo
echo "📁 Location: $(pwd)"
echo
echo "Next steps:"
echo "1. Open this folder in AI Code IDE"
echo "2. Start coding with AI assistance!"
echo`;
  }

  /**
   * Generates folder creation commands
   */
  private generateFolderCommands(structure: FileStructure, platform: string): string {
    const commands: string[] = [];
    const mkdirCmd = platform === 'windows' ? 'mkdir' : 'mkdir -p';
    
    const extractFolders = (obj: FileStructure, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}/${key}` : key;
        
        if (typeof value === 'object') {
          // It's a folder
          const folderPath = platform === 'windows' 
            ? currentPath.replace(/\//g, '\\')
            : currentPath;
          
          commands.push(`${mkdirCmd} "${folderPath}"`);
          extractFolders(value, currentPath);
        }
      }
    };
    
    extractFolders(structure);
    return commands.join('\n');
  }

  /**
   * Generates file creation commands
   */
  private generateFileCommands(structure: FileStructure, platform: string): string {
    const commands: string[] = [];
    
    const extractFiles = (obj: FileStructure, path = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}/${key}` : key;
        
        if (typeof value === 'string') {
          // It's a file
          const filePath = platform === 'windows' 
            ? currentPath.replace(/\//g, '\\')
            : currentPath;
          
          if (value) {
            // File has content
            if (platform === 'windows') {
              const lines = value.split('\n');
              commands.push(`(
${lines.map(line => `echo ${line.replace(/"/g, '""')}`).join(' & echo.')}
) > "${filePath}"`);
            } else {
              commands.push(`cat > "${filePath}" << 'EOF'
${value}
EOF`);
            }
          } else {
            // Empty file
            const touchCmd = platform === 'windows' ? 'type nul >' : 'touch';
            commands.push(`${touchCmd} "${filePath}"`);
          }
        }
      }
    };
    
    extractFiles(structure);
    return commands.join('\n');
  }

  /**
   * Generate package initialization command
   */
  private generatePackageInit(template: ProjectTemplate, platform: string): string {
    const isNodeProject = template.dependencies.some(dep => 
      !dep.startsWith('python-') && !dep.includes('pip')
    );
    
    const isPythonProject = template.name.includes('python') || 
                           template.dependencies.some(dep => dep.startsWith('python-'));
    
    if (isNodeProject) {
      return platform === 'windows' 
        ? 'call npm init -y'
        : 'npm init -y';
    } else if (isPythonProject) {
      return platform === 'windows'
        ? 'python -m venv venv\ncall venv\\Scripts\\activate'
        : 'python3 -m venv venv\nsource venv/bin/activate';
    }
    
    return 'echo "No package manager initialization needed"';
  }

  /**
   * Generate dependency installation commands
   */
  private generateDependencyInstall(dependencies: string[], platform: string): string {
    if (dependencies.length === 0) return '';
    
    const isNodeDeps = !dependencies[0].startsWith('python-');
    
    if (isNodeDeps) {
      const deps = dependencies.join(' ');
      return platform === 'windows'
        ? `call npm install ${deps}`
        : `npm install ${deps}`;
    } else {
      const pythonDeps = dependencies.map(d => d.replace('python-', '')).join(' ');
      return `pip install ${pythonDeps}`;
    }
  }

  /**
   * Generate explanation for the project
   */
  private generateExplanation(template: ProjectTemplate): string {
    const folderCount = this.countFolders(template.structure);
    const fileCount = this.countFiles(template.structure);
    const depCount = template.dependencies.length;
    
    return `This will create a ${template.description} with:
• ${folderCount} folders for organization
• ${fileCount} initial files
${depCount > 0 ? `• ${depCount} dependencies pre-configured` : ''}
• Ready-to-use project structure`;
  }

  private countFolders(structure: FileStructure): number {
    let count = 0;
    for (const value of Object.values(structure)) {
      if (typeof value === 'object') {
        count++;
        count += this.countFolders(value);
      }
    }
    return count;
  }

  private countFiles(structure: FileStructure): number {
    let count = 0;
    for (const value of Object.values(structure)) {
      if (typeof value === 'string') {
        count++;
      } else {
        count += this.countFiles(value);
      }
    }
    return count;
  }

  /**
   * Generate quick action buttons
   */
  private generateQuickActions(setupScript: SetupScript): any[] {
    return [
      {
        label: '📥 Download Script',
        action: 'download',
        data: setupScript
      },
      {
        label: '▶️ Run in Terminal',
        action: 'execute',
        data: setupScript.content
      },
      {
        label: '📋 Copy to Clipboard',
        action: 'copy',
        data: setupScript.content
      }
    ];
  }

  /**
   * Initialize default project templates
   */
  private initializeTemplates(): void {
    // Code-to-Docs Generator Template
    this.templates.set('code-to-docs', {
      name: 'code-to-docs',
      description: 'Code-to-Docs Generator Project',
      structure: {
        'src': {
          'parser': {
            'index.ts': '// Parser entry point\nexport * from \'./parser\';',
            'parser.ts': '// Main parser logic'
          },
          'generator': {
            'index.ts': '// Generator entry point',
            'generator.ts': '// Documentation generator'
          },
          'templates': {
            'default.md': '# {{title}}\n\n{{content}}'
          },
          'utils': {
            'index.ts': '// Utility functions'
          },
          'index.ts': '// Main entry point\nconsole.log("Code-to-Docs Generator");',
          'types.ts': '// TypeScript type definitions'
        },
        'docs': {},
        'tests': {
          'parser.test.ts': '// Parser tests',
          'generator.test.ts': '// Generator tests'
        },
        'package.json': '',
        'tsconfig.json': '',
        'README.md': '# Code-to-Docs Generator\n\nTransform your code into beautiful documentation.'
      },
      dependencies: [
        'typescript',
        '@types/node',
        'commander',
        'chalk',
        'glob',
        'fs-extra'
      ],
      setupCommands: [
        'npx tsc --init'
      ]
    });

    // React App Template
    this.templates.set('react-app', {
      name: 'react-app',
      description: 'React Application',
      structure: {
        'src': {
          'components': {
            'App.jsx': 'import React from \'react\';\n\nfunction App() {\n  return <div>Hello React!</div>;\n}\n\nexport default App;'
          },
          'hooks': {},
          'utils': {},
          'styles': {
            'index.css': '* { margin: 0; padding: 0; box-sizing: border-box; }'
          },
          'index.jsx': 'import React from \'react\';\nimport ReactDOM from \'react-dom/client\';\nimport App from \'./components/App\';\n\nReactDOM.createRoot(document.getElementById(\'root\')).render(<App />);'
        },
        'public': {
          'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>'
        },
        'package.json': '',
        'vite.config.js': ''
      },
      dependencies: [
        'react',
        'react-dom',
        'vite',
        '@vitejs/plugin-react'
      ],
      setupCommands: []
    });

    // Python Flask Template
    this.templates.set('python-flask', {
      name: 'python-flask',
      description: 'Python Flask Web Application',
      structure: {
        'app': {
          '__init__.py': '# Flask app initialization',
          'routes.py': '# Route definitions',
          'models.py': '# Database models',
          'forms.py': '# Form definitions'
        },
        'templates': {
          'index.html': '<!DOCTYPE html>\n<html>\n<head><title>Flask App</title></head>\n<body><h1>Welcome to Flask!</h1></body>\n</html>'
        },
        'static': {
          'css': {
            'style.css': '/* Your styles here */'
          },
          'js': {
            'main.js': '// Your JavaScript here'
          }
        },
        'tests': {
          'test_app.py': '# Application tests'
        },
        'app.py': 'from flask import Flask\n\napp = Flask(__name__)\n\n@app.route("/")\ndef home():\n    return "Hello, Flask!"\n\nif __name__ == "__main__":\n    app.run(debug=True)',
        'requirements.txt': 'flask\npython-dotenv\n',
        'README.md': '# Flask Application\n\nA modern Flask web application.'
      },
      dependencies: [
        'python-flask',
        'python-python-dotenv'
      ],
      setupCommands: []
    });

    // Node Express Template
    this.templates.set('node-express', {
      name: 'node-express',
      description: 'Node.js Express API Server',
      structure: {
        'src': {
          'routes': {
            'index.js': '// Route definitions'
          },
          'controllers': {
            'index.js': '// Controller logic'
          },
          'models': {
            'index.js': '// Data models'
          },
          'middleware': {
            'auth.js': '// Authentication middleware'
          },
          'app.js': 'const express = require("express");\nconst app = express();\n\napp.use(express.json());\n\napp.get("/", (req, res) => {\n  res.json({ message: "Hello Express!" });\n});\n\nmodule.exports = app;',
          'server.js': 'const app = require("./app");\nconst PORT = process.env.PORT || 3000;\n\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});'
        },
        'tests': {},
        'package.json': '',
        '.env.example': 'PORT=3000\nNODE_ENV=development',
        'README.md': '# Express API Server\n\nA RESTful API built with Express.js'
      },
      dependencies: [
        'express',
        'dotenv',
        'cors',
        'helmet',
        'morgan'
      ],
      setupCommands: []
    });

    // Chrome Extension Template
    this.templates.set('chrome-extension', {
      name: 'chrome-extension',
      description: 'Chrome Browser Extension',
      structure: {
        'src': {
          'background.js': '// Background script',
          'content.js': '// Content script',
          'popup.html': '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="popup.css">\n</head>\n<body>\n  <h1>My Extension</h1>\n  <script src="popup.js"></script>\n</body>\n</html>',
          'popup.js': '// Popup script',
          'popup.css': 'body { width: 300px; padding: 10px; }'
        },
        'icons': {},
        'manifest.json': '{\n  "manifest_version": 3,\n  "name": "My Extension",\n  "version": "1.0",\n  "description": "A Chrome extension",\n  "permissions": ["activeTab"],\n  "action": {\n    "default_popup": "src/popup.html"\n  }\n}'
      },
      dependencies: [],
      setupCommands: []
    });

    // Generic template
    this.templates.set('generic-project', this.getGenericTemplate());
  }

  private getGenericTemplate(): ProjectTemplate {
    return {
      name: 'my-project',
      description: 'Generic Project',
      structure: {
        'src': {
          'index.js': '// Main entry point\nconsole.log("Hello, World!");'
        },
        'tests': {},
        'docs': {},
        'README.md': '# My Project\n\nProject description here.'
      },
      dependencies: [],
      setupCommands: []
    };
  }
}