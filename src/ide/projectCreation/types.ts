// src/ide/projectCreation/types.ts

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon?: string;
  useTypeScript?: boolean;
  defaultOptions?: Record<string, any>;
}

export interface ProjectOptions {
  name: string;
  location: string;
  description: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  useTypeScript: boolean;
  template: string;
  templateType: string;
  templateOptions: Record<string, any>;
}

export interface MockFile {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Add this to the window object for type safety
declare global {
  interface Window {
    dialog?: {
      open: (options: { directory: boolean, multiple: boolean, title: string }) => Promise<string | string[]>;
    };
  }
}