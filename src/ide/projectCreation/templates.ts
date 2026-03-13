// src/ide/projectCreation/templates.ts
import { ProjectTemplate } from './types';

// Available templates
export const TEMPLATES: Record<string, ProjectTemplate[]> = {
  web: [
    {
      id: 'react',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      type: 'web',
      useTypeScript: true,
      defaultOptions: {
        addRouter: true,
        addStateManagement: true
      }
    },
    {
      id: 'vue',
      name: 'Vue.js',
      description: 'The Progressive JavaScript Framework',
      type: 'web',
      useTypeScript: true,
      defaultOptions: {
        version: '3',
        addRouter: true,
        addPinia: false
      }
    },
    {
      id: 'angular',
      name: 'Angular',
      description: 'Platform for building mobile and desktop web applications',
      type: 'web',
      useTypeScript: true
    },
    {
      id: 'next',
      name: 'Next.js',
      description: 'The React Framework for Production',
      type: 'web',
      useTypeScript: true
    },
    {
      id: 'html',
      name: 'HTML/CSS/JS',
      description: 'Simple website with vanilla JavaScript',
      type: 'web',
      useTypeScript: false
    }
  ],
  desktop: [
    {
      id: 'tauri',
      name: 'Tauri',
      description: 'Build smaller, faster, and more secure desktop applications',
      type: 'desktop',
      useTypeScript: true,
      defaultOptions: {
        frontend: 'react',
        useRust: true
      }
    },
    {
      id: 'electron',
      name: 'Electron',
      description: 'Build cross-platform desktop apps with JavaScript, HTML, and CSS',
      type: 'desktop',
      useTypeScript: true,
      defaultOptions: {
        frontend: 'react'
      }
    },
    {
      id: 'dotnet',
      name: '.NET Desktop',
      description: 'WPF or Windows Forms application with C#',
      type: 'desktop',
      useTypeScript: false,
      defaultOptions: {
        framework: 'wpf'
      }
    }
  ],
  mobile: [
    {
      id: 'react-native',
      name: 'React Native',
      description: 'Build mobile apps with React',
      type: 'mobile',
      useTypeScript: true
    },
    {
      id: 'flutter',
      name: 'Flutter',
      description: 'Google\'s UI toolkit for building applications for mobile, web, and desktop',
      type: 'mobile',
      useTypeScript: false
    },
    {
      id: 'android-kotlin',
      name: 'Android Kotlin',
      description: 'Native Android app with Kotlin + Jetpack Compose + Material 3',
      type: 'mobile',
      options: {
        language: 'kotlin',
        ui: 'compose',
        minSdk: '24'
      }
    }
  ],
  backend: [
    {
      id: 'node-express',
      name: 'Node.js + Express',
      description: 'Fast, unopinionated, minimalist web framework for Node.js',
      type: 'backend',
      useTypeScript: true
    },
    {
      id: 'nestjs',
      name: 'NestJS',
      description: 'A progressive Node.js framework for building scalable applications',
      type: 'backend',
      useTypeScript: true
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Python application with virtual environment setup',
      type: 'backend',
      useTypeScript: false,
      defaultOptions: {
        includeVirtualEnv: true,
        includeFlask: false,
        includePytest: false
      }
    }
  ],
  fullstack: [
    {
      id: 'mern',
      name: 'MERN Stack',
      description: 'MongoDB, Express, React, Node.js',
      type: 'fullstack',
      useTypeScript: true
    },
    {
      id: 'next-fullstack',
      name: 'Next.js Full-Stack',
      description: 'Next.js with API routes and database',
      type: 'fullstack',
      useTypeScript: true
    }
  ],
  library: [
    {
      id: 'npm-package',
      name: 'NPM Package',
      description: 'Create and publish an NPM package',
      type: 'library',
      useTypeScript: true
    }
  ],
  embedded: [
    {
      id: 'arduino',
      name: 'Arduino',
      description: 'Arduino-based embedded project',
      type: 'embedded',
      useTypeScript: false,
      defaultOptions: {
        board: 'uno',
        includeSamples: true
      }
    },
    {
      id: 'stm32',
      name: 'STM32',
      description: 'STM32 microcontroller project with HAL',
      type: 'embedded',
      useTypeScript: false,
      defaultOptions: {
        series: 'f4',
        useRTOS: false,
        useCubeMX: true
      }
    },
    {
      id: 'esp32',
      name: 'ESP32',
      description: 'ESP32 project with Arduino or ESP-IDF',
      type: 'embedded',
      useTypeScript: false,
      defaultOptions: {
        framework: 'arduino', // or 'esp-idf'
        withWifi: true,
        withBLE: false
      }
    },
    {
      id: 'generic-embedded',
      name: 'Generic Embedded',
      description: 'Generic embedded C/C++ project with Makefile',
      type: 'embedded',
      useTypeScript: false,
      defaultOptions: {
        language: 'c',
        useCMake: false,
        useRTOS: false
      }
    }
  ]
};

// Get an emoji or symbol to represent the template logo
export function getTemplateLogo(templateId: string): string {
  const logos: Record<string, string> = {
    'react': '⚛️',
    'vue': '🟢',
    'angular': '🔺',
    'svelte': '🟠',
    'next': '▲',
    'html': '🌐',
    'tauri': '🦀',
    'electron': '⚡',
    'dotnet': '🔷',
    'react-native': '📱',
    'flutter': '🐦',
    'node-express': '🟢',
    'nestjs': '🐱',
    'mern': '🔵',
    'next-fullstack': '◼️',
    'npm-package': '📦',
    'python': '🐍',
    'arduino': '⚡',
    'stm32': '🔌',
    'android-kotlin': 'u{1F4F1}',
    'esp32': '📡',
    'generic-embedded': '🎛️'
  };
  
  return logos[templateId] || '📋';
}