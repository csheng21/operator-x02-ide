// src/directFileOpener/content/contentGenerator.ts

/**
 * Generate mock content based on file path
 */
export function generateFileContent(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Generate different content based on file extension
  switch (extension) {
    case 'js':
      return generateJavaScriptContent(fileName);
      
    case 'tsx':
    case 'ts':
      return generateTypeScriptContent(fileName);
      
    case 'json':
      return generateJsonContent(fileName);
      
    case 'html':
      return generateHtmlContent(fileName);
      
    case 'css':
      return generateCssContent(fileName);
      
    default:
      return `// ${fileName}\n// This is a sample file content.`;
  }
}

/**
 * Determine language from file path
 */
export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'php': 'php',
    'rb': 'ruby',
    'rs': 'rust',
    'swift': 'swift',
    'sh': 'shell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql'
  };

  return languageMap[extension] || 'plaintext';
}

/**
 * Generate JavaScript content
 */
function generateJavaScriptContent(fileName: string): string {
  return `// ${fileName}\n\nimport React from 'react';\nimport { AppRegistry } from 'react-native';\nimport App from './App';\n\nAppRegistry.registerComponent('MyApp', () => App);\n`;
}

/**
 * Generate TypeScript content
 */
function generateTypeScriptContent(fileName: string): string {
  if (fileName === 'App.tsx') {
    return `// ${fileName}\n
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World!</Text>
      <Text style={styles.subtitle}>My first mobile app</Text>
      <Button 
        title="Press Me!" 
        onPress={() => alert('Button pressed!')} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
  },
});

export default App;`;
  }
  return `// ${fileName}\n\nconst example = () => {\n  console.log("This is a TypeScript file");\n};\n\nexport default example;\n`;
}

/**
 * Generate JSON content
 */
function generateJsonContent(fileName: string): string {
  if (fileName === 'package.json') {
    return `{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^17.0.2",
    "react-native": "^0.66.0",
    "@react-navigation/native": "^6.0.6",
    "@react-navigation/stack": "^6.0.11"
  },
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest"
  },
  "devDependencies": {
    "@babel/core": "^7.12.9",
    "@babel/runtime": "^7.12.5",
    "@types/react": "^17.0.21",
    "@types/react-native": "^0.65.0",
    "typescript": "^4.4.3"
  }
}`;
  }
  return `{\n  "name": "example",\n  "version": "1.0.0"\n}`;
}

/**
 * Generate HTML content
 */
function generateHtmlContent(fileName: string): string {
  return `<!DOCTYPE html>\n<html>\n<head>\n  <title>${fileName}</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>`;
}

/**
 * Generate CSS content
 */
function generateCssContent(fileName: string): string {
  return `/* ${fileName} */\n\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}`;
}