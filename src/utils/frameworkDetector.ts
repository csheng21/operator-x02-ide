// src/utils/frameworkDetector.ts
import { ChildProcess } from 'child_process';

export interface FrameworkInfo {
  name: string;
  type: 'ui' | 'cli' | 'standard';
  launchPattern: RegExp;
  serverPattern: RegExp;
  requiresExternalWindow: boolean;
  suggestedDebugFlags: string[];
}

const FRAMEWORK_PATTERNS: Record<string, FrameworkInfo> = {
  flet: {
    name: 'flet',
    type: 'ui',
    launchPattern: /ft\.app\s*\(/,
    serverPattern: /Running Flet app on (https?:\/\/[^\s]+)/i,
    requiresExternalWindow: true,
    suggestedDebugFlags: ['--debug', '--verbose']
  },
  // Add other frameworks as needed
};

export function detectFramework(fileContent: string): FrameworkInfo | null {
  // Check for import statements first
  if (/import\s+(?:flet|ft)\b/i.test(fileContent) && 
      /ft\.app\s*\(/.test(fileContent)) {
    return FRAMEWORK_PATTERNS['flet'];
  }
  
  return null; // No known framework detected
}

export function injectDebugHooks(fileContent: string, frameworkInfo: FrameworkInfo): string {
  if (frameworkInfo.name === 'flet') {
    // Add debug hooks for Flet applications
    return fileContent.replace(
      /(ft\.app\s*\()([^)]*?)(\))/,
      `$1$2, view=ft.AppView.WEB_BROWSER, port=0$3
# Injected by IDE debug system
print("DEBUG-IDE: Flet UI initialization started")
print("DEBUG-IDE: If UI doesn't appear, check the terminal for a URL")
`
    );
  }
  
  return fileContent;
}