// src/ide/projectCreation/services/pythonGenerator.ts
import { generateBaseProject } from './projectGenerator';
import type { ProjectOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { executeCommand } from '../../../utils/commandExecution';

export async function generatePythonProject(projectPath: string, options: ProjectOptions): Promise<void> {
  // First generate the basic project structure
  await generateBaseProject(projectPath, options);
  
  // Create Python-specific files
  const files = [
    {
      path: 'main.py',
      content: `# Main application file
import os
import sys

def main():
    """Main entry point for the application"""
    print("Hello from Python application!")
    
if __name__ == "__main__":
    main()
`
    },
    {
      path: 'requirements.txt',
      content: `# Python dependencies
# Uncomment packages as needed
# flask==2.0.1
# requests==2.26.0
# numpy==1.21.2
# pandas==1.3.3
${options.includeFlask ? 'flask==2.0.1' : '# flask==2.0.1'}
${options.includePytest ? 'pytest==7.0.0' : '# pytest==7.0.0'}
`
    },
    {
      path: 'README.md',
      content: `# ${options.name || 'Python Application'}

A Python project created with Deepseek IDE.

## Setup

1. Create a virtual environment:
   \`\`\`
   python -m venv venv
   \`\`\`

2. Activate the virtual environment:
   - Windows: \`venv\\Scripts\\activate\`
   - macOS/Linux: \`source venv/bin/activate\`

3. Install dependencies:
   \`\`\`
   pip install -r requirements.txt
   \`\`\`

## Running the Application

\`\`\`
python main.py
\`\`\`
`
    },
    {
      path: '.gitignore',
      content: `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
ENV/
env/
env.bak/
venv.bak/
.env
.venv

# IDE
.vscode/
.idea/
`
    }
  ];
  
  // Add tests directory
  await fs.promises.mkdir(path.join(projectPath, 'tests'), { recursive: true });
  
  files.push({
    path: 'tests/__init__.py',
    content: `# Test package initialization
`
  });
  
  files.push({
    path: 'tests/test_main.py',
    content: `# Test file for main.py
import unittest
import sys
import os

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import main

class TestMain(unittest.TestCase):
    def test_example(self):
        """Example test case"""
        self.assertTrue(True)

if __name__ == "__main__":
    unittest.main()
`
  });
  
  // If Flask is selected, add Flask-specific files
  if (options.includeFlask) {
    files.push({
      path: 'app.py',
      content: `# Flask application
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Flask API"})

@app.route('/api/status')
def status():
    return jsonify({"status": "online"})

if __name__ == "__main__":
    app.run(debug=True)
`
    });
    
    // Create templates directory for Flask
    await fs.promises.mkdir(path.join(projectPath, 'templates'), { recursive: true });
    files.push({
      path: 'templates/index.html',
      content: `<!DOCTYPE html>
<html>
<head>
    <title>Flask App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 20px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>Flask Application</h1>
    <div class="container">
        <p>Welcome to your Flask application!</p>
    </div>
</body>
</html>`
    });
  }
  
  // If pytest is selected, add pytest config
  if (options.includePytest) {
    files.push({
      path: 'tests/conftest.py',
      content: `# Pytest configuration file
import pytest

@pytest.fixture
def app_fixture():
    """Example fixture for tests"""
    return {"test": "data"}
`
    });
  }
  
  // Write all files
  for (const file of files) {
    const filePath = path.join(projectPath, file.path);
    const fileDir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.promises.mkdir(fileDir, { recursive: true });
    
    // Write file
    await fs.promises.writeFile(filePath, file.content);
  }
  
  // Create virtual environment if selected
  if (options.includeVirtualEnv) {
    try {
      console.log('Creating virtual environment...');
      await executeCommand('python -m venv venv', projectPath);
      console.log('Virtual environment created');
    } catch (error) {
      console.error('Failed to create virtual environment:', error);
    }
  }
}