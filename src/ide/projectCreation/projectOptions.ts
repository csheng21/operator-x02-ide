// src/ide/projectCreation/projectOptions.ts
import { ProjectOptions } from './types';

// Current project options
export let currentProjectOptions: ProjectOptions = {
  name: '',
  location: '',
  description: '',
  packageManager: 'npm',
  useTypeScript: true,
  template: 'react',
  templateType: 'web',
  templateOptions: {}
};

// Update project options
export function updateProjectOptions(updates: Partial<ProjectOptions>): void {
  currentProjectOptions = {
    ...currentProjectOptions,
    ...updates
  };
}

// Reset project options to defaults
export function resetProjectOptions(): void {
  currentProjectOptions = {
    name: '',
    location: '',
    description: '',
    packageManager: 'npm',
    useTypeScript: true,
    template: 'react',
    templateType: 'web',
    templateOptions: {}
  };
}

// Project categories for the UI
export const projectCategories = [
  {
    id: 'web',
    icon: '🌐',
    name: 'Web Application'
  },
  {
    id: 'desktop',
    icon: '💻',
    name: 'Desktop Application'
  },
  {
    id: 'mobile',
    icon: '📱',
    name: 'Mobile Application'
  },
  {
    id: 'backend',
    icon: '⚙️',
    name: 'Backend Service'
  },
  {
    id: 'fullstack',
    icon: '🔄',
    name: 'Full-Stack Application'
  },
  {
    id: 'library',
    icon: '📦',
    name: 'Library/Package'
  },
  {
    id: 'embedded',
    icon: '🎛️',
    name: 'Embedded Application'
  }
];

// Validate project options
export function validateProjectOptions(): { valid: boolean, message?: string } {
  // Check project name
  if (!currentProjectOptions.name) {
    return {
      valid: false,
      message: 'Please enter a project name'
    };
  }
  
  // Check project location
  if (!currentProjectOptions.location) {
    return {
      valid: false,
      message: 'Please select a project location'
    };
  }
  
  return { valid: true };
}