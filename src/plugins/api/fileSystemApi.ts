// src/plugins/api/fileSystemApi.ts

export class FileSystemApi {
  constructor() {
    console.log('File System API initialized');
  }
  
  async readFile(path: string): Promise<string> {
    if (!window.fs?.readTextFile) {
      throw new Error('File system API not available');
    }
    
    return await window.fs.readTextFile(path);
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    if (!window.fs?.writeFile) {
      throw new Error('File system API not available');
    }
    
    await window.fs.writeFile(path, content);
  }
  
  async readDir(path: string): Promise<string[]> {
    if (!window.fs?.readDir) {
      throw new Error('File system API not available');
    }
    
    const entries = await window.fs.readDir(path);
    return entries.map(entry => entry.path || entry.name);
  }
}