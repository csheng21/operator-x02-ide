// types/global.d.ts
// Global type declarations extracted from main.ts

declare global {
  interface Window {
    fs?: {
      readTextFile: (path: string, options?: any) => Promise<string>;
      readFile: (path: string, options?: any) => Promise<Uint8Array | string>;
      writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
      readDir: (path: string) => Promise<any[]>;
    };
  }
}

// This export makes the file a module
export {};