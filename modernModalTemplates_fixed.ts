import { getAndroidTemplateFiles } from '../templates/androidTemplate';
// ide/projectCreation/ui/modernModalTemplates.ts
// Project Template Definitions for Modern Project Modal

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get template files for a given template name
 * Case-insensitive matching
 */
export function getTemplateFiles(template: string, projectName?: string): Record<string, string> {
  const normalizedTemplate = template.toLowerCase();
  console.log(`📋 Template requested: "${template}" → normalized: "${normalizedTemplate}"`);
  // Android Kotlin template (needs projectName for package paths)
  if (normalizedTemplate === 'android-kotlin') {
    const name = projectName || 'MyApp';
    console.log(`📱 Using Android Kotlin template for: "${name}"`);
    return getAndroidTemplateFiles(name);
  }

  return getInlineTemplateFiles(normalizedTemplate);
}

// ============================================================================
// INTERNAL TEMPLATE DEFINITIONS
// ============================================================================

/**
 * Internal template definitions
 * Contains all project templates with their file structures
 */
function getInlineTemplateFiles(template: string): Record<string, string> {
  const templateKey = template.toLowerCase();
  console.log(`📋 Looking up template: "${templateKey}"`);
  
  const templates: Record<string, Record<string, string>> = {
    
    // ========================================================================
    // WEB FRAMEWORKS
    // ========================================================================
    
    'react-vite': {
      'README.md': `# React + Vite App

A modern React application built with Vite for lightning-fast development.

## Features

- ⚡ **Vite** - Instant server start and hot module replacement
- ⚛️ **React 18** - Latest React with concurrent features
- 📘 **TypeScript** - Full type safety
- 🎨 **CSS Modules** - Scoped styling
- 📦 **ESLint** - Code quality and consistency

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

The app will be available at http://localhost:3000

## Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run preview\` | Preview production build |
| \`npm run lint\` | Run ESLint |

## Project Structure

\`\`\`
├── src/
│   ├── App.tsx       # Main app component
│   ├── App.css       # App styles
│   ├── main.tsx      # Entry point
│   └── index.css     # Global styles
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript config
└── package.json      # Dependencies
\`\`\`

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## License

MIT
`,
      'package.json': JSON.stringify({
        name: 'react-vite-app',
        private: true,
        version: '0.1.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
          lint: 'eslint . --ext ts,tsx'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.43',
          '@types/react-dom': '^18.2.17',
          '@typescript-eslint/eslint-plugin': '^6.14.0',
          '@typescript-eslint/parser': '^6.14.0',
          '@vitejs/plugin-react': '^4.2.1',
          eslint: '^8.55.0',
          'eslint-plugin-react-hooks': '^4.6.0',
          'eslint-plugin-react-refresh': '^0.4.5',
          typescript: '^5.2.2',
          vite: '^5.0.8'
        }
      }, null, 2),
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }]
      }, null, 2),
      'tsconfig.node.json': JSON.stringify({
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true
        },
        include: ['vite.config.ts']
      }, null, 2),
      '.gitignore': `node_modules
dist
dist-ssr
*.local
.DS_Store`,
      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      'src/App.tsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>React + Vite</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>Edit src/App.tsx and save to test HMR</p>
      </div>
    </div>
  )
}

export default App`,
      'src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
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
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}`,
      'src/index.css': `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}`
    },

    'nextjs': {
      'README.md': `# Next.js App

A modern Next.js application with React Server Components and App Router.

## Features

- 🚀 **Next.js 14** - App Router with React Server Components
- ⚛️ **React 18** - Latest React features
- 📘 **TypeScript** - Full type safety
- 🎨 **CSS Modules** - Scoped styling
- 📦 **ESLint** - Code quality

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

Open http://localhost:3000 in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run start\` | Start production server |
| \`npm run lint\` | Run ESLint |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)

## License

MIT
`,
      'package.json': JSON.stringify({
        name: 'nextjs-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          next: '^14.0.4'
        },
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          typescript: '^5',
          eslint: '^8',
          'eslint-config-next': '^14.0.4'
        }
      }, null, 2),
      'src/app/page.tsx': `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Next.js!</h1>
      <p className="text-xl">Edit src/app/page.tsx to get started</p>
    </main>
  )
}`,
      'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Created with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
      'src/app/globals.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
}`,
      '.gitignore': `node_modules
.next
out
*.log`
    },

    'vue3': {
      'README.md': `# Vue 3 App

A modern Vue 3 application with TypeScript and Vite.

## Features

- 💚 **Vue 3** - Composition API with \`<script setup>\`
- 📘 **TypeScript** - Full type safety
- ⚡ **Vite** - Lightning-fast development
- 🎨 **Scoped CSS** - Component-scoped styles

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run preview\` | Preview production build |

## Learn More

- [Vue.js Documentation](https://vuejs.org)
- [Vite Documentation](https://vitejs.dev)

## License

MIT
`,
      'package.json': JSON.stringify({
        name: 'vue3-app',
        version: '0.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vue-tsc && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          vue: '^3.3.11'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.5.2',
          typescript: '^5.2.2',
          vite: '^5.0.8',
          'vue-tsc': '^1.8.25'
        }
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue 3 App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'src/main.ts': `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')`,
      'src/App.vue': `<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>Vue 3 + TypeScript + Vite</h1>
    <div class="card">
      <button type="button" @click="count++">count is {{ count }}</button>
    </div>
  </div>
</template>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
}
</style>`,
      'src/style.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
}`,
      '.gitignore': `node_modules
dist`
    },

    'svelte': {
      'README.md': `# Svelte App

A fast, lightweight Svelte application with Vite.

## Features

- 🔥 **Svelte 4** - Compile-time framework
- ⚡ **Vite** - Lightning-fast development
- 📦 **Zero runtime** - Compiled to vanilla JS

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run preview\` | Preview production build |

## Learn More

- [Svelte Documentation](https://svelte.dev/docs)
- [Vite Documentation](https://vitejs.dev)

## License

MIT
`,
      'package.json': JSON.stringify({
        name: 'svelte-app',
        version: '0.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {},
        devDependencies: {
          '@sveltejs/vite-plugin-svelte': '^3.0.0',
          svelte: '^4.2.0',
          vite: '^5.0.0'
        }
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Svelte App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`,
      'src/main.js': `import './app.css'
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

export default app`,
      'src/App.svelte': `<script>
  let count = 0
</script>

<main>
  <h1>Svelte App</h1>
  <button on:click={() => count++}>
    Count: {count}
  </button>
</main>

<style>
  main {
    text-align: center;
    padding: 2em;
  }
</style>`,
      'src/app.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
}`,
      'vite.config.js': `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})`,
      '.gitignore': `node_modules
dist`
    },

    'angular': {
      'package.json': JSON.stringify({
        name: 'angular-app',
        version: '0.0.0',
        scripts: {
          ng: 'ng',
          start: 'ng serve',
          build: 'ng build',
          test: 'ng test'
        },
        dependencies: {
          '@angular/animations': '^17.0.0',
          '@angular/common': '^17.0.0',
          '@angular/compiler': '^17.0.0',
          '@angular/core': '^17.0.0',
          '@angular/forms': '^17.0.0',
          '@angular/platform-browser': '^17.0.0',
          '@angular/platform-browser-dynamic': '^17.0.0',
          '@angular/router': '^17.0.0',
          rxjs: '^7.8.0',
          tslib: '^2.3.0',
          'zone.js': '^0.14.0'
        },
        devDependencies: {
          '@angular-devkit/build-angular': '^17.0.0',
          '@angular/cli': '^17.0.0',
          '@angular/compiler-cli': '^17.0.0',
          typescript: '~5.2.0'
        }
      }, null, 2),
      'angular.json': JSON.stringify({
        version: 1,
        projects: {
          'angular-app': {
            root: '',
            sourceRoot: 'src',
            projectType: 'application'
          }
        }
      }, null, 2),
      'src/main.ts': `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));`,
      'src/index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <app-root></app-root>
</body>
</html>`,
      '.gitignore': `node_modules
dist`
    },

    // ========================================================================
    // MOBILE FRAMEWORKS
    // ========================================================================

    'react-native': {
      'package.json': JSON.stringify({
        name: 'react-native-app',
        version: '0.1.0',
        private: true,
        scripts: {
          start: 'react-native start',
          android: 'react-native run-android',
          ios: 'react-native run-ios',
          test: 'jest',
          lint: 'eslint .'
        },
        dependencies: {
          react: '^18.2.0',
          'react-native': '^0.72.0'
        },
        devDependencies: {
          '@babel/core': '^7.20.0',
          '@babel/preset-env': '^7.20.0',
          '@babel/runtime': '^7.20.0',
          '@react-native/eslint-config': '^0.72.0',
          '@react-native/metro-config': '^0.72.0',
          '@tsconfig/react-native': '^3.0.0',
          '@types/react': '^18.0.24',
          '@types/react-test-renderer': '^18.0.0',
          'babel-jest': '^29.2.1',
          eslint: '^8.19.0',
          jest: '^29.2.1',
          'metro-react-native-babel-preset': '^0.76.0',
          prettier: '^2.4.1',
          'react-test-renderer': '^18.2.0',
          typescript: '^4.8.4'
        }
      }, null, 2),
      'App.tsx': `import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to React Native!</Text>
        <Text style={styles.subtitle}>Edit App.tsx to get started</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default App;`,
      'index.js': `import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);`,
      'app.json': JSON.stringify({
        name: 'ReactNativeApp',
        displayName: 'React Native App'
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        extends: '@tsconfig/react-native/tsconfig.json'
      }, null, 2),
      '.gitignore': `node_modules/
.expo/
dist/
*.orig.*
.DS_Store`
    },

    'flutter': {
      'pubspec.yaml': `name: flutter_app
description: A new Flutter project.
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true`,
      'lib/main.dart': `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter App'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}`,
      '.gitignore': `.dart_tool/
.packages
build/`
    },

    'ionic': {
      'package.json': JSON.stringify({
        name: 'ionic-app',
        version: '0.0.1',
        scripts: {
          start: 'ionic serve',
          build: 'ionic build',
          test: 'ng test'
        },
        dependencies: {
          '@angular/core': '^17.0.0',
          '@ionic/angular': '^7.5.0',
          rxjs: '^7.8.0'
        },
        devDependencies: {
          '@ionic/angular-toolkit': '^9.0.0',
          '@angular/cli': '^17.0.0',
          typescript: '~5.2.0'
        }
      }, null, 2),
      'ionic.config.json': JSON.stringify({
        name: 'ionic-app',
        integrations: {
          capacitor: {}
        },
        type: 'angular'
      }, null, 2),
      '.gitignore': `node_modules
www
platforms`
    },

    'expo': {
      'package.json': JSON.stringify({
        name: 'expo-app',
        version: '1.0.0',
        main: 'node_modules/expo/AppEntry.js',
        scripts: {
          start: 'expo start',
          android: 'expo start --android',
          ios: 'expo start --ios',
          web: 'expo start --web'
        },
        dependencies: {
          expo: '~49.0.0',
          'expo-status-bar': '~1.6.0',
          react: '18.2.0',
          'react-native': '0.72.6'
        },
        devDependencies: {
          '@babel/core': '^7.20.0'
        }
      }, null, 2),
      'App.js': `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Welcome to Expo!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});`,
      'app.json': JSON.stringify({
        expo: {
          name: 'expo-app',
          slug: 'expo-app',
          version: '1.0.0',
          platforms: ['ios', 'android', 'web']
        }
      }, null, 2),
      '.gitignore': `node_modules/
.expo/`
    },

    // ========================================================================
    // BACKEND FRAMEWORKS
    // ========================================================================

    'express': {
      'package.json': JSON.stringify({
        name: 'express-app',
        version: '1.0.0',
        scripts: {
          dev: 'ts-node-dev --respawn src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js'
        },
        dependencies: {
          express: '^4.18.2',
          cors: '^2.8.5',
          dotenv: '^16.3.1'
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/cors': '^2.8.17',
          '@types/node': '^20.10.6',
          'ts-node-dev': '^2.0.0',
          typescript: '^5.3.3'
        }
      }, null, 2),
      'src/index.ts': `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Express!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true
        }
      }, null, 2),
      '.gitignore': `node_modules
dist`
    },

    'fastapi': {
      'requirements.txt': `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0`,
      'main.py': `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="FastAPI Application",
    description="A modern Python API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`,
      '.gitignore': `__pycache__
*.pyc
.env
venv/`
    },

    'django': {
      'requirements.txt': `Django==5.0
djangorestframework==3.14.0
django-cors-headers==4.3.0
python-dotenv==1.0.0`,
      'manage.py': `#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)`,
      '.gitignore': `*.pyc
__pycache__
db.sqlite3
.env`
    },

    'nestjs': {
      'package.json': JSON.stringify({
        name: 'nestjs-app',
        version: '0.0.1',
        scripts: {
          start: 'nest start',
          'start:dev': 'nest start --watch',
          build: 'nest build'
        },
        dependencies: {
          '@nestjs/common': '^10.0.0',
          '@nestjs/core': '^10.0.0',
          '@nestjs/platform-express': '^10.0.0',
          'reflect-metadata': '^0.1.13',
          rxjs: '^7.8.1'
        },
        devDependencies: {
          '@nestjs/cli': '^10.0.0',
          '@types/node': '^20.3.1',
          typescript: '^5.1.3'
        }
      }, null, 2),
      'src/main.ts': `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();`,
      '.gitignore': `node_modules
dist`
    },

    // ========================================================================
    // DESKTOP FRAMEWORKS
    // ========================================================================

    'electron': {
      'package.json': JSON.stringify({
        name: 'electron-app',
        version: '1.0.0',
        main: 'main.js',
        scripts: {
          start: 'electron .',
          build: 'electron-builder'
        },
        dependencies: {},
        devDependencies: {
          electron: '^27.0.0',
          'electron-builder': '^24.6.0'
        }
      }, null, 2),
      'main.js': `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});`,
      'index.html': `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Electron App</title>
  </head>
  <body>
    <h1>Hello Electron!</h1>
    <p>Welcome to your Electron app</p>
  </body>
</html>`,
      '.gitignore': `node_modules
dist`
    },

    'tauri': {
      'package.json': JSON.stringify({
        name: 'tauri-app',
        version: '0.1.0',
        scripts: {
          dev: 'tauri dev',
          build: 'tauri build'
        },
        devDependencies: {
          '@tauri-apps/cli': '^1.5.0'
        }
      }, null, 2),
      'src-tauri/tauri.conf.json': JSON.stringify({
        build: {
          beforeDevCommand: '',
          beforeBuildCommand: '',
          devPath: '../dist',
          distDir: '../dist'
        },
        package: {
          productName: 'tauri-app',
          version: '0.1.0'
        }
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html>
  <head>
    <title>Tauri App</title>
  </head>
  <body>
    <h1>Welcome to Tauri!</h1>
  </body>
</html>`,
      '.gitignore': `node_modules
target
dist`
    },

    'neutralino': {
      'neutralino.config.json': JSON.stringify({
        applicationId: 'js.neutralino.sample',
        version: '1.0.0',
        defaultMode: 'window',
        port: 0,
        documentRoot: '/resources/',
        url: '/',
        enableServer: true,
        enableNativeAPI: true
      }, null, 2),
      'resources/index.html': `<!DOCTYPE html>
<html>
  <head>
    <title>Neutralino App</title>
  </head>
  <body>
    <h1>Welcome to Neutralino!</h1>
    <script src="js/neutralino.js"></script>
  </body>
</html>`,
      '.gitignore': `dist`
    },

    // ========================================================================
    // FULLSTACK FRAMEWORKS
    // ========================================================================

    'mern': {
      'package.json': JSON.stringify({
        name: 'mern-app',
        version: '1.0.0',
        scripts: {
          dev: 'concurrently "npm run server" "npm run client"',
          server: 'cd server && npm run dev',
          client: 'cd client && npm run dev'
        }
      }, null, 2),
      'README.md': `# MERN Stack Application

This is a full-stack MERN (MongoDB, Express, React, Node.js) application.

## Setup

1. Install dependencies in both server and client folders
2. Configure MongoDB connection in server/.env
3. Run \`npm run dev\` to start both servers`
    },

    't3': {
      'package.json': JSON.stringify({
        name: 't3-app',
        version: '0.1.0',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          '@trpc/client': '^10.0.0',
          '@trpc/server': '^10.0.0',
          '@prisma/client': '^5.0.0'
        }
      }, null, 2)
    },

    'redwood': {
      'package.json': JSON.stringify({
        name: 'redwood-app',
        version: '0.1.0',
        scripts: {
          dev: 'redwood dev',
          build: 'redwood build'
        }
      }, null, 2)
    },

    // ========================================================================
    // LIBRARY TEMPLATES
    // ========================================================================

    'npm-lib': {
      'package.json': JSON.stringify({
        name: 'npm-library',
        version: '1.0.0',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
          build: 'tsc',
          test: 'jest'
        },
        devDependencies: {
          typescript: '^5.0.0',
          jest: '^29.0.0'
        }
      }, null, 2),
      'src/index.ts': `export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          declaration: true,
          outDir: './dist',
          strict: true
        }
      }, null, 2)
    },

    'react-lib': {
      'package.json': JSON.stringify({
        name: 'react-component-library',
        version: '1.0.0',
        peerDependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        }
      }, null, 2)
    },

    'vue-lib': {
      'package.json': JSON.stringify({
        name: 'vue-component-library',
        version: '1.0.0',
        peerDependencies: {
          vue: '^3.0.0'
        }
      }, null, 2)
    },

    // ========================================================================
    // EMBEDDED SYSTEMS / HARDWARE
    // ========================================================================

    'arduino': {
      'README.md': `# Arduino Project

## Overview
This is an Arduino project with a basic LED blink example.

## Hardware Requirements
- Arduino board (Uno, Nano, Mega, etc.)
- USB cable for programming
- LED (built-in LED_BUILTIN will be used)
- Optional: Breadboard, resistors, additional components

## Setup

### Arduino IDE
1. Download and install [Arduino IDE](https://www.arduino.cc/en/software)
2. Connect your Arduino board via USB
3. Select your board: \`Tools > Board\`
4. Select the correct port: \`Tools > Port\`

### Upload
1. Open \`sketch.ino\` in Arduino IDE
2. Click the Upload button (→)
3. Wait for compilation and upload to complete

## Project Structure

\`\`\`
arduino-project/
├── sketch.ino      # Main Arduino sketch
├── config.h        # Pin definitions and constants
├── pins.h          # Pin mapping reference
├── utils.ino       # Helper functions
└── .gitignore      # Git ignore rules
\`\`\`

## Code Explanation

### sketch.ino
- \`setup()\`: Initializes serial communication and pin modes
- \`loop()\`: Main program loop - blinks LED every second

### Helper Files
- **config.h**: Central configuration (pins, baud rate, delays)
- **pins.h**: Pin reference guide
- **utils.ino**: Reusable utility functions

## Usage

After uploading, the built-in LED will blink on and off every second.

### Serial Monitor
Open Serial Monitor (\`Tools > Serial Monitor\`) at 9600 baud to see debug output.

## Customization

### Change Blink Speed
Edit \`BLINK_DELAY\` in \`config.h\`:
\`\`\`cpp
#define BLINK_DELAY 500  // 500ms = faster blink
\`\`\`

### Use External LED
1. Connect LED to digital pin (e.g., pin 13)
2. Update \`LED_PIN\` in \`config.h\`
3. Add appropriate resistor (220Ω recommended)

## Troubleshooting

**Upload fails:**
- Check USB connection
- Verify correct board and port selected
- Close other programs using the serial port

**LED doesn't blink:**
- Check if LED is properly connected
- Verify correct pin in \`config.h\`
- Check power supply

## Extending the Project

Add more functionality using the utility functions:
\`\`\`cpp
void loop() {
  blinkLED(LED_BUILTIN, 3, 500);  // Blink 3 times quickly
  delay(2000);
}
\`\`\`

## Resources
- [Arduino Documentation](https://www.arduino.cc/reference/en/)
- [Arduino Forum](https://forum.arduino.cc/)
- [Arduino Project Hub](https://create.arduino.cc/projecthub)

## License
MIT License - Free to use and modify
`,
      
      'sketch.ino': `void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println("Arduino Started!");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
  
  Serial.println("LED toggled");
}`,
      
      'config.h': `#ifndef CONFIG_H
#define CONFIG_H

// Pin Definitions
#define LED_PIN LED_BUILTIN
#define BUTTON_PIN 2

// Serial Communication
#define SERIAL_BAUD 9600

// Timing
#define BLINK_DELAY 1000

#endif`,

      'pins.h': `#ifndef PINS_H
#define PINS_H

// Digital Pins
#define DIGITAL_PIN_2  2
#define DIGITAL_PIN_3  3
#define DIGITAL_PIN_4  4

// Analog Pins
#define ANALOG_PIN_A0  A0
#define ANALOG_PIN_A1  A1

// PWM Pins
#define PWM_PIN_9  9
#define PWM_PIN_10 10

#endif`,

      'utils.ino': `// Utility functions for Arduino project

void blinkLED(int pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayMs);
    digitalWrite(pin, LOW);
    delay(delayMs);
  }
}

void printDivider() {
  Serial.println("====================");
}

int readButtonState(int buttonPin) {
  return digitalRead(buttonPin);
}`,

      '.gitignore': `# Arduino
build/
*.hex
*.elf
*.o

# IDE
.vscode/
.idea/
*.autosave

# System
.DS_Store
Thumbs.db`
    },

    'esp32': {
      'README.md': `# ESP32 Project

An ESP32 microcontroller project using PlatformIO and Arduino framework.

## Features

- 🔌 **ESP32** - Dual-core processor with WiFi & Bluetooth
- ⚡ **PlatformIO** - Modern embedded development
- 🔧 **Arduino Framework** - Familiar API

## Hardware Requirements

- ESP32 development board
- USB cable for programming
- Optional: LEDs, sensors, etc.

## Getting Started

### Using PlatformIO

\`\`\`bash
# Build project
pio run

# Upload to board
pio run --target upload

# Monitor serial output
pio device monitor
\`\`\`

### Using Arduino IDE

1. Install ESP32 board support
2. Open main.cpp
3. Select your ESP32 board
4. Upload

## Pin Reference

| Pin | Function |
|-----|----------|
| GPIO2 | Built-in LED |
| GPIO21 | I2C SDA |
| GPIO22 | I2C SCL |

## Resources

- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/)
- [PlatformIO Documentation](https://docs.platformio.org/)
- [Arduino ESP32](https://github.com/espressif/arduino-esp32)

## License

MIT
`,
      'main.cpp': `#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
      'platformio.ini': `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino`,
      '.gitignore': `.pio
.vscode`
    },

    'raspberry': {
      'README.md': `# Raspberry Pi Project

## Overview
This is a Raspberry Pi project using Python to control GPIO pins. The example demonstrates LED blinking using the RPi.GPIO library.

## Hardware Requirements
- Raspberry Pi (any model with GPIO pins)
- Power supply (5V, 2.5A minimum, 3A recommended)
- MicroSD card (16GB minimum, Class 10 recommended)
- LED (optional - can use onboard LED)
- 220Ω resistor (if using external LED)
- Breadboard and jumper wires (optional)

## Software Requirements
- Raspberry Pi OS (formerly Raspbian)
- Python 3.7 or higher
- pip (Python package manager)

## Setup

### Initial Raspberry Pi Setup
1. Flash Raspberry Pi OS to microSD card using [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Boot your Raspberry Pi and complete initial configuration
3. Update system packages:
   \`\`\`bash
   sudo apt-get update
   sudo apt-get upgrade -y
   \`\`\`

### Install Dependencies
\`\`\`bash
# Install pip if not already installed
sudo apt-get install python3-pip -y

# Install project requirements
pip3 install -r requirements.txt

# Or install manually
pip3 install RPi.GPIO
\`\`\`

### GPIO Permissions
Add your user to the GPIO group to access pins without sudo:
\`\`\`bash
sudo usermod -a -G gpio $USER
# Log out and back in for changes to take effect
\`\`\`

## Project Structure

\`\`\`
raspberry-pi-project/
├── main.py           # Main application script
├── requirements.txt  # Python dependencies
├── .gitignore       # Git ignore rules
└── README.md        # This file
\`\`\`

## Wiring Diagram

### Using Built-in LED
No wiring needed - the script uses software PWM on any GPIO pin.

### Using External LED
\`\`\`
Raspberry Pi Pin 11 (GPIO 17) ----[220Ω Resistor]---- LED (+) ---- LED (-) ---- GND (Pin 6)
\`\`\`

**Pin Reference:**
- Physical Pin 11 = GPIO 17 (BCM numbering)
- Physical Pin 6 = Ground

## Running the Project

### Basic Usage
\`\`\`bash
# Run the main script
python3 main.py

# Or make it executable
chmod +x main.py
./main.py
\`\`\`

### Run in Background
\`\`\`bash
# Using nohup
nohup python3 main.py &

# Using screen
screen -S led_project
python3 main.py
# Press Ctrl+A then D to detach
\`\`\`

### Stop the Script
Press **Ctrl+C** to stop the program gracefully.

## GPIO Pin Numbering

This project uses **BCM (Broadcom)** numbering:
\`\`\`python
GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.OUT)  # GPIO 17 = Physical Pin 11
\`\`\`

**Common GPIO Pins (BCM Numbering):**
- GPIO 17 (Pin 11) - Used in this project
- GPIO 27 (Pin 13)
- GPIO 22 (Pin 15)
- GPIO 23 (Pin 16)
- GPIO 24 (Pin 18)

## Customization

### Change LED Pin
Edit the \`LED_PIN\` variable in \`main.py\`:
\`\`\`python
LED_PIN = 27  # Use GPIO 27 instead
\`\`\`

### Change Blink Speed
Modify the \`time.sleep()\` values:
\`\`\`python
time.sleep(0.5)  # 500ms = faster blink
\`\`\`

## Troubleshooting

### "RuntimeError: No access to /dev/mem"
**Solution:** Run with sudo or add user to gpio group
\`\`\`bash
sudo python3 main.py
# OR
sudo usermod -a -G gpio $USER
# Then log out and back in
\`\`\`

### "ModuleNotFoundError: No module named 'RPi'"
**Solution:** Install RPi.GPIO
\`\`\`bash
pip3 install RPi.GPIO
# OR if above fails
sudo apt-get install python3-rpi.gpio
\`\`\`

### LED Not Blinking
1. Check wiring connections
2. Verify correct GPIO pin number
3. Test with a multimeter (should see ~3.3V)
4. Try a different GPIO pin
5. Check if LED polarity is correct (long leg = positive)

## Resources

### Official Documentation
- [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/)
- [RPi.GPIO Documentation](https://sourceforge.net/p/raspberry-gpio-python/wiki/Home/)
- [GPIO Pinout Reference](https://pinout.xyz/)

### Community
- [Raspberry Pi Forums](https://forums.raspberrypi.com/)
- [r/raspberry_pi](https://reddit.com/r/raspberry_pi)
- [Raspberry Pi Stack Exchange](https://raspberrypi.stackexchange.com/)

## License
MIT License - Free to use and modify

---

**Happy Making! 🍓🔧**
`,

      'main.py': `import RPi.GPIO as GPIO
import time

LED_PIN = 17

GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)

try:
    while True:
        GPIO.output(LED_PIN, GPIO.HIGH)
        time.sleep(1)
        GPIO.output(LED_PIN, GPIO.LOW)
        time.sleep(1)
except KeyboardInterrupt:
    GPIO.cleanup()`,

      'requirements.txt': `RPi.GPIO==0.7.1`,

      '.gitignore': `__pycache__
*.pyc
*.pyo
*.log
.env
venv/
env/
.vscode/
.idea/
*.swp
*.swo`
    },

    'jetson-cuda': {
      'README.md': `# Jetson / CUDA Project

NVIDIA Jetson AI and GPU project for Operator X02.

## Quick Start

Connect: Ctrl+Shift+J -> Enter IP / credentials -> Connect
Deploy:  Open .cu or .py file -> Ctrl+Shift+R

## Requirements
- NVIDIA Jetson device (Orin, Xavier, Nano)
- JetPack SDK installed on device
- SSH enabled: sudo systemctl enable ssh
- nvcc path: export PATH=/usr/local/cuda/bin:$PATH
`,
      'src/main.cu': `#include <stdio.h>
#include <cuda_runtime.h>

__global__ void helloKernel(float* out, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) out[idx] = (float)(idx * 2);
}

int main() {
    const int N = 256;
    float *d_out;
    cudaMalloc(&d_out, N * sizeof(float));
    helloKernel<<<(N+31)/32, 32>>>(d_out, N);
    cudaDeviceSynchronize();
    printf("Jetson CUDA OK\n");
    cudaFree(d_out);
    return 0;
}
`,
      'src/inference.py': `#!/usr/bin/env python3
try:
    import torch
    print(f"PyTorch {torch.__version__}  CUDA: {torch.cuda.is_available()}")
except ImportError:
    print("Install: pip3 install torch torchvision")
`,
      'kernels/vector_add.cu': `#include <stdio.h>
#include <cuda_runtime.h>

__global__ void vectorAdd(float* a, float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) c[i] = a[i] + b[i];
}

int main() {
    printf("vector_add ready\n");
    return 0;
}
`,
      'scripts/deploy.sh': `#!/bin/bash
JETSON_IP="\${1:-192.168.43.109}"
JETSON_USER="\${2:-orin_nano}"
REMOTE_DIR="/home/\${JETSON_USER}/x02-deploy"
echo "Deploying to \${JETSON_USER}@\${JETSON_IP}..."
scp -r src/ kernels/ \${JETSON_USER}@\${JETSON_IP}:\${REMOTE_DIR}/
ssh \${JETSON_USER}@\${JETSON_IP} "cd \${REMOTE_DIR}/src && export PATH=/usr/local/cuda/bin:\${PATH} && nvcc -o main main.cu && ./main"
`,
      '.gitignore': `*.o
*.out
build/
__pycache__/
*.pyc
`,
    },
  };
  const result = templates[templateKey] || {};
  
  if (Object.keys(result).length === 0) {
    console.error(`❌ Template "${template}" (normalized: "${templateKey}") not found!`);
    console.log('📋 Available templates:', Object.keys(templates));
  } else {
    console.log(`✅ Found template "${templateKey}" with ${Object.keys(result).length} files`);
  }
  
  return result;
}