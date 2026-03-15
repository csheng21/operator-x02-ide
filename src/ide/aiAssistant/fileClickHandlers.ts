// src/ide/fileExplorer/fileClickHandlers.ts
import { setSelectedFolder } from '../explorerButtons';
import { FileNode } from './types';
import { FileTreeGenerator } from '../../fileOperations/treeGenerator';
import { invoke } from '@tauri-apps/api/core';
import { notifyFileDeleted } from '../../editor/fileDeletionHandler';
/**
 * Set up click handlers for files in the file explorer
 */
export function setupFileClickHandlers(): void {
  console.log('Setting up file click handlers');
  
  const fileItems = document.querySelectorAll('.file-item:not(.directory)');
  
  fileItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const filePath = item.getAttribute('data-path');
      console.log('File clicked:', filePath);
      
      if (filePath) {
        document.querySelectorAll('.file-item').forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
        
        updateBreadcrumb(filePath);
        
        const fileSelectedEvent = new CustomEvent('file-selected', {
          detail: { path: filePath }
        });
        
        document.dispatchEvent(fileSelectedEvent);
        console.log('Dispatched file-selected event with path:', filePath);
        
        handleFileOpen(filePath);
      }
    });
  });
  
  console.log(`Set up click handlers for ${fileItems.length} files`);
}

/**
 * Handle directory toggle click events
 */
export function handleDirectoryClick(item: HTMLElement, file: FileNode, childList: HTMLElement | null, icon: HTMLElement): void {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    
    file.expanded = !file.expanded;
    
    if (childList) {
      childList.style.display = file.expanded ? 'block' : 'none';
      icon.textContent = file.expanded ? '📂' : '📁';
    }
    
    setSelectedFolder(file.path);
    updateBreadcrumb(file.path);
    
    const folderSelectedEvent = new CustomEvent('folder-selected', {
      detail: { 
        path: file.path,
        name: file.name,
        expanded: file.expanded
      }
    });
    document.dispatchEvent(folderSelectedEvent);
  });
}

/**
 * Update breadcrumb navigation
 */
function updateBreadcrumb(path: string): void {
  if ((window as any).breadcrumbManager) {
    (window as any).breadcrumbManager.updateBreadcrumb(path);
    console.log('Breadcrumb updated via manager:', path);
  }
  
  const breadcrumbEvent = new CustomEvent('breadcrumb-update', {
    detail: { path: path }
  });
  document.dispatchEvent(breadcrumbEvent);
}

/**
 * Handle file click with FileNode object
 */
export function handleFileNodeClick(fileNode: FileNode): void {
  console.log('FileNode clicked:', fileNode.name, 'at', fileNode.path);
  
  if (fileNode.isDirectory) {
    handleDirectoryNodeClick(fileNode);
  } else {
    handleFileSelection(fileNode);
  }
}

/**
 * Handle directory node click
 */
function handleDirectoryNodeClick(dirNode: FileNode): void {
  dirNode.expanded = !dirNode.expanded;
  setSelectedFolder(dirNode.path);
  updateBreadcrumb(dirNode.path);
  
  const event = new CustomEvent('directory-toggled', {
    detail: {
      path: dirNode.path,
      name: dirNode.name,
      expanded: dirNode.expanded
    }
  });
  document.dispatchEvent(event);
  
  console.log(`Directory ${dirNode.expanded ? 'expanded' : 'collapsed'}:`, dirNode.path);
}

/**
 * Handle file selection
 */
function handleFileSelection(fileNode: FileNode): void {
  updateBreadcrumb(fileNode.path);
  highlightSelectedFile(fileNode.path);
  
  const fileSelectedEvent = new CustomEvent('file-selected', {
    detail: {
      path: fileNode.path,
      name: fileNode.name,
      isDirectory: false
    }
  });
  document.dispatchEvent(fileSelectedEvent);
  
  const fileOpenedEvent = new CustomEvent('file-opened', {
    detail: { path: fileNode.path }
  });
  document.dispatchEvent(fileOpenedEvent);
  
  console.log('File selected and events dispatched:', fileNode.path);
  handleFileOpen(fileNode.path);
}

/**
 * Highlight selected file in the explorer
 */
function highlightSelectedFile(filePath: string): void {
  document.querySelectorAll('.file-item').forEach(el => {
    el.classList.remove('selected');
  });
  
  const fileElement = document.querySelector(`[data-path="${filePath}"]`);
  if (fileElement) {
    fileElement.classList.add('selected');
    fileElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Attempt to open a file in the editor
 */
function handleFileOpen(filePath: string): void {
  try {
    import('../../editor/editorManager').then(module => {
      if (module.openFile) {
        module.openFile(filePath).catch((err: any) => {
          console.error('Error opening file via direct call:', err);
        });
      } else {
        console.error('openFile function not found in editor module');
      }
    }).catch((err: any) => {
      console.error('Failed to import editor module:', err);
    });
  } catch (error) {
    console.error('Error in direct file opening:', error);
  }
}

/**
 * Setup keyboard navigation for file explorer
 */
export function setupKeyboardNavigation(): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return;
  
  let selectedIndex = -1;
  const items = Array.from(fileTree.querySelectorAll('.file-item, .folder-item'));
  
  fileTree.addEventListener('keydown', (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateDown();
        break;
      case 'Enter':
        e.preventDefault();
        openSelected();
        break;
      case 'Space':
        e.preventDefault();
        toggleSelected();
        break;
    }
  });
  
  function navigateUp(): void {
    if (selectedIndex > 0) {
      selectedIndex--;
      selectItem(selectedIndex);
    }
  }
  
  function navigateDown(): void {
    if (selectedIndex < items.length - 1) {
      selectedIndex++;
      selectItem(selectedIndex);
    }
  }
  
  function selectItem(index: number): void {
    items.forEach(item => item.classList.remove('keyboard-selected'));
    
    if (items[index]) {
      items[index].classList.add('keyboard-selected');
      items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      const path = items[index].getAttribute('data-path');
      if (path) {
        updateBreadcrumb(path);
      }
    }
  }
  
  function openSelected(): void {
    if (selectedIndex >= 0 && items[selectedIndex]) {
      const item = items[selectedIndex] as HTMLElement;
      item.click();
    }
  }
  
  function toggleSelected(): void {
    if (selectedIndex >= 0 && items[selectedIndex]) {
      const item = items[selectedIndex] as HTMLElement;
      if (item.classList.contains('folder-item')) {
        const toggle = item.querySelector('.folder-toggle') as HTMLElement;
        if (toggle) {
          toggle.click();
        }
      }
    }
  }
}

/**
 * Setup drag and drop for file explorer
 */
export function setupDragAndDrop(): void {
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileTree.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    fileTree.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    fileTree.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight(e: Event): void {
    fileTree.classList.add('drag-highlight');
  }
  
  function unhighlight(e: Event): void {
    fileTree.classList.remove('drag-highlight');
  }
  
  fileTree.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e: DragEvent): void {
    const dt = e.dataTransfer;
    const files = dt?.files;
    
    if (files && files.length > 0) {
      handleDroppedFiles(files);
    }
  }
  
  function handleDroppedFiles(files: FileList): void {
    console.log('Files dropped:', files.length);
    
    const event = new CustomEvent('files-dropped', {
      detail: { files: Array.from(files) }
    });
    document.dispatchEvent(event);
  }
}

/**
 * SVG Icons for Analysis Types
 */
const SVG_ICONS = {
  brain: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>`,
  
  rocket: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>`,
  
  search: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
    <path d="M11 8a3 3 0 0 0-3 3"/>
  </svg>`,
  
  layers: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>`,
  
  zap: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`,
  
  edit: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>`
};

/**
 * Show dialog to select AI analysis type - PROFESSIONAL UI
 */
function showAnalysisTypeDialog(folderName: string, tree: string, folderPath: string): void {
  document.getElementById('ai-analysis-type-dialog')?.remove();
  
  const dialog = document.createElement('div');
  dialog.id = 'ai-analysis-type-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  `;
  
  const itemCount = tree.split('\n').length;
  const fileCount = tree.split('\n').filter(line => !line.includes('├──') && !line.includes('└──') && !line.includes('│')).length;
  
  dialog.innerHTML = `
  <div style="
    background: linear-gradient(145deg, #1a1a1d 0%, #252529 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    max-width: 780px;
    width: 92%;
    max-height: 90vh;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
  ">
    <!-- Header -->
    <div style="
      padding: 28px 32px 24px 32px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h2 style="
            margin: 0 0 8px 0;
            color: #ffffff;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
          ">
            AI Project Analysis
          </h2>
          <p style="
            margin: 0;
            color: rgba(255, 255, 255, 0.65);
            font-size: 14px;
            font-weight: 400;
          ">
            Choose how you'd like AI to analyze your project
          </p>
        </div>
        <button id="close-analysis-dialog" style="
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-size: 24px;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        " title="Close">×</button>
      </div>
      
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding-right: 12px;
          border-right: 1px solid rgba(255, 255, 255, 0.15);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span style="color: #4fc3f7; font-weight: 600; font-size: 14px;">${folderName}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px;">${itemCount} items</span>
          <span style="color: rgba(255, 255, 255, 0.3);">•</span>
          <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px;">${fileCount} files</span>
        </div>
      </div>
    </div>
    
    <!-- Scrollable Content -->
    <div style="
      padding: 24px 32px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    ">
      <div style="display: grid; gap: 12px;">
        
        <!-- Option 1: Context Loading -->
        <label class="analysis-option" data-type="context" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="context" checked style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #4fc3f7;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #4fc3f7; display: flex; align-items: center;">
                ${SVG_ICONS.brain}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Understand My Codebase
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Load project context into AI memory. Perfect for asking follow-up questions about specific files and features.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(79, 195, 247, 0.15);
              border: 1px solid rgba(79, 195, 247, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #4fc3f7;
              font-weight: 500;
            ">
              Best for: Continuous development
            </div>
          </div>
        </label>
        
        <!-- Option 2: Feature Development -->
        <label class="analysis-option" data-type="features" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="features" style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #a5d6a7;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #a5d6a7; display: flex; align-items: center;">
                ${SVG_ICONS.rocket}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Feature Development Roadmap
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Get actionable next steps, prioritized features to build, and specific implementation guidance with file paths.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(165, 214, 167, 0.15);
              border: 1px solid rgba(165, 214, 167, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #a5d6a7;
              font-weight: 500;
            ">
              Best for: Planning what to build
            </div>
          </div>
        </label>
        
        <!-- Option 3: Code Review -->
        <label class="analysis-option" data-type="review" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="review" style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #ffb74d;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #ffb74d; display: flex; align-items: center;">
                ${SVG_ICONS.search}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Code Review & Issues
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Find bugs, security vulnerabilities, code smells, and get refactoring suggestions with priority rankings.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(255, 183, 77, 0.15);
              border: 1px solid rgba(255, 183, 77, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #ffb74d;
              font-weight: 500;
            ">
              Best for: Quality assurance
            </div>
          </div>
        </label>
        
        <!-- Option 4: Architecture -->
        <label class="analysis-option" data-type="architecture" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="architecture" style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #ba68c8;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #ba68c8; display: flex; align-items: center;">
                ${SVG_ICONS.layers}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Architecture Analysis
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Deep dive into project structure, design patterns, scalability concerns, and architectural improvements.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(186, 104, 200, 0.15);
              border: 1px solid rgba(186, 104, 200, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #ba68c8;
              font-weight: 500;
            ">
              Best for: Structural planning
            </div>
          </div>
        </label>
        
        <!-- Option 5: Quick Assessment -->
        <label class="analysis-option" data-type="quick" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="quick" style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #90caf9;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #90caf9; display: flex; align-items: center;">
                ${SVG_ICONS.zap}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Quick Assessment
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Fast overview: project type, tech stack, current features, and immediate next steps. Concise and actionable.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(144, 202, 249, 0.15);
              border: 1px solid rgba(144, 202, 249, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #90caf9;
              font-weight: 500;
            ">
              Best for: Quick overview
            </div>
          </div>
        </label>
        
        <!-- Option 6: Custom -->
        <label class="analysis-option" data-type="custom" style="
          display: flex;
          align-items: start;
          gap: 16px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: relative; z-index: 1;">
            <input type="radio" name="analysis-type" value="custom" style="
              margin-top: 2px;
              width: 20px;
              height: 20px;
              cursor: pointer;
              accent-color: #e0e0e0;
            ">
          </div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="color: #e0e0e0; display: flex; align-items: center;">
                ${SVG_ICONS.edit}
              </div>
              <span style="font-size: 17px; font-weight: 600; color: #ffffff;">
                Custom Analysis
              </span>
            </div>
            <p style="
              margin: 0 0 8px 0;
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              line-height: 1.6;
            ">
              Write your own custom prompt or specific question about the project structure and codebase.
            </p>
            <div style="
              display: inline-block;
              padding: 4px 10px;
              background: rgba(224, 224, 224, 0.15);
              border: 1px solid rgba(224, 224, 224, 0.3);
              border-radius: 6px;
              font-size: 11px;
              color: #e0e0e0;
              font-weight: 500;
            ">
              Best for: Specific questions
            </div>
          </div>
        </label>
        
        <!-- Custom Prompt Area -->
        <div id="custom-prompt-area" style="display: none; margin-top: 4px; animation: slideDown 0.3s ease;">
          <textarea id="custom-prompt-input" placeholder="Example: 'Explain the authentication flow in this project' or 'What's the best way to add real-time features?'" style="
            width: 100%;
            min-height: 120px;
            padding: 14px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #ffffff;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            resize: vertical;
            transition: all 0.2s;
            box-sizing: border-box;
          "></textarea>
        </div>
        
      </div>
    </div>
    
    <!-- Footer - Always Visible -->
    <div style="
      padding: 20px 32px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      flex-shrink: 0;
    ">
      <button id="cancel-analysis-btn" style="
        padding: 12px 28px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      ">Cancel</button>
      <button id="start-analysis-btn" style="
        padding: 12px 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>Analyze Project</span>
      </button>
    </div>
  </div>
`;
  
  // Add styles
  if (!document.getElementById('analysis-dialog-professional-styles')) {
    const style = document.createElement('style');
    style.id = 'analysis-dialog-professional-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
        }
        to {
          opacity: 1;
          max-height: 200px;
        }
      }
      
      .analysis-option::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 12px;
        z-index: 0;
      }
      
      .analysis-option:hover::before {
        opacity: 1;
      }
      
      .analysis-option:hover {
        background: rgba(255, 255, 255, 0.05) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
        transform: translateX(4px);
      }
      
      .analysis-option:has(input:checked) {
        background: rgba(102, 126, 234, 0.08) !important;
        border-color: rgba(102, 126, 234, 0.5) !important;
        box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.3);
      }
      
      .analysis-option:has(input:checked)::before {
        opacity: 0.5;
      }
      
      #close-analysis-dialog:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        transform: rotate(90deg);
      }
      
      #cancel-analysis-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      
      #start-analysis-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      
      #start-analysis-btn:active {
        transform: translateY(0);
      }
      
      #custom-prompt-input:focus {
        outline: none;
        border-color: rgba(102, 126, 234, 0.5);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      #custom-prompt-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(dialog);
  
  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  const closeBtn = document.getElementById('close-analysis-dialog')!;
  const cancelBtn = document.getElementById('cancel-analysis-btn')!;
  const startBtn = document.getElementById('start-analysis-btn')!;
  const customPromptArea = document.getElementById('custom-prompt-area')!;
  
  const closeDialog = () => dialog.remove();
  
  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });
  
  // ESC key to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // Show/hide custom prompt area
  const radioButtons = dialog.querySelectorAll('input[name="analysis-type"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      customPromptArea.style.display = value === 'custom' ? 'block' : 'none';
      if (value === 'custom') {
        setTimeout(() => {
          (document.getElementById('custom-prompt-input') as HTMLTextAreaElement)?.focus();
        }, 100);
      }
    });
  });
  
  // Start analysis button
  startBtn.addEventListener('click', async () => {
    const selectedType = (dialog.querySelector('input[name="analysis-type"]:checked') as HTMLInputElement)?.value;
    
    if (!selectedType) {
      alert('Please select an analysis type');
      return;
    }
    
    // Build prompt based on selection
    let aiPrompt = '';
    
    switch (selectedType) {
      case 'context':
        aiPrompt = `I need you to understand my project structure so you can help me develop it further.

**Project:** "${folderName}"

**Current Structure:**
\`\`\`
${tree}
\`\`\`

**Please analyze and remember this codebase:**

1. **Identify:** What type of project is this? What's the tech stack?
2. **Understand:** How is the code organized? What are the main modules?
3. **Recognize:** What features exist? What patterns are used?
4. **Remember:** Where would new code typically go based on this structure?

**After analyzing, tell me:**
- What this project does (1-2 sentences)
- Main components/folders and their purposes
- Tech stack you identified
- That you're ready to help me add features

**Then I'll ask specific questions like:**
- "How do I add [feature] to [file]?"
- "Where should I create [new component]?"
- "Help me modify [specific file]"

Study the structure and let me know what you understand!`;
        break;
        
      case 'features':
        aiPrompt = `Project: "${folderName}"

Structure:
\`\`\`
${tree}
\`\`\`

Give me a concrete development roadmap:

**1. NEXT FEATURES TO BUILD**
List 5-7 features I should implement, with:
- Feature name and description
- Exact file path where to add it
- Estimated time
- Dependencies/libraries needed

**2. MISSING PIECES**
- Essential files that don't exist
- Core functionality not yet implemented
- Critical configs missing

**3. TECH STACK ADDITIONS**
- npm packages to install
- Dev dependencies needed
- Build tools or configs to add

**4. IMPLEMENTATION PRIORITY**
Break down into phases:
- **Phase 1 (Today):** [specific tasks with file paths]
- **Phase 2 (This week):** [specific tasks with file paths]
- **Phase 3 (Next):** [specific tasks with file paths]

**5. CODE SNIPPETS**
For top 3 priorities, give me starter code or pseudocode.

Be specific with file paths and actionable steps.`;
        break;
        
      case 'review':
        aiPrompt = `Code Review for "${folderName}":

\`\`\`
${tree}
\`\`\`

Perform a thorough code review:

**1. BUGS & ISSUES**
- Potential bugs based on structure
- Missing error handling
- Edge cases not covered

**2. SECURITY CONCERNS**
- Security vulnerabilities
- Exposed secrets or keys
- Authentication/authorization gaps

**3. CODE SMELLS**
- Duplicate code patterns
- God objects/files
- Poor separation of concerns
- Overly complex structures

**4. REFACTORING NEEDED**
- Files that need cleanup
- Better organization opportunities
- Deprecated patterns

**5. BEST PRACTICES**
- What's done well
- What needs improvement
- Industry standard violations

**6. PRIORITY FIXES**
Rank issues by severity:
- 🔴 Critical (fix now)
- 🟡 Medium (fix soon)
- 🟢 Low (nice to have)

Include specific file paths and actionable fixes.`;
        break;
        
      case 'architecture':
        aiPrompt = `Architecture Analysis for "${folderName}":

\`\`\`
${tree}
\`\`\`

Deep architectural review:

**1. CURRENT ARCHITECTURE**
- What pattern is used? (MVC, microservices, monolithic, etc.)
- How well does it scale?
- Strengths and weaknesses

**2. DESIGN PATTERNS**
- What patterns are present?
- Which patterns should be added?
- Any anti-patterns?

**3. MODULARITY & COUPLING**
- How modular is the code?
- Tight vs loose coupling
- Dependency management

**4. SCALABILITY**
- What breaks at 100 users? 1000? 10,000?
- Bottlenecks and performance issues
- Database/API scaling concerns

**5. TECHNICAL DEBT**
- Current technical debt
- Areas that will cause problems later
- Refactoring recommendations

**6. ARCHITECTURAL ROADMAP**
- Short-term improvements (1-2 weeks)
- Medium-term changes (1-3 months)
- Long-term evolution (6+ months)

Be specific about which files/modules need changes.`;
        break;
        
      case 'quick':
        aiPrompt = `Quick assessment of "${folderName}":

\`\`\`
${tree}
\`\`\`

Give me a fast, concise overview:

**Project Type:** [web app/library/mobile/etc]
**Tech Stack:** [languages, frameworks]
**Main Purpose:** [what it does in 1 sentence]

**Structure:**
- Key folders and what they contain
- Entry points
- Config files

**Current Features:** [list main functionality]
**Missing:** [critical gaps]
**Quick Wins:** [3 things I can add in <2 hours]

**Next Step:** [single most important thing to do next]

Keep it brief and actionable!`;
        break;
        
      case 'custom':
        const customInput = document.getElementById('custom-prompt-input') as HTMLTextAreaElement;
        const customPrompt = customInput?.value.trim();
        
        if (!customPrompt) {
          alert('Please enter a custom prompt');
          return;
        }
        
        aiPrompt = `Project: "${folderName}"

Structure:
\`\`\`
${tree}
\`\`\`

${customPrompt}`;
        break;
    }
    
    // Close dialog with fade out
    dialog.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => closeDialog(), 200);
    
    // Show loading notification
    if ((window as any).showNotification) {
      (window as any).showNotification('🤖 Sending to AI...', 'info');
    }
    
    // Show AI panel
    const aiPanel = document.querySelector('.assistant-panel') as HTMLElement;
    if (aiPanel) {
      aiPanel.style.display = 'block';
      aiPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Send to AI
    const aiInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
    const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
    const actualInput = aiInput || userInput;
    
    if (actualInput) {
      actualInput.value = '';
      await new Promise(resolve => setTimeout(resolve, 50));
      actualInput.value = aiPrompt;
      actualInput.focus();
      
      actualInput.dispatchEvent(new Event('input', { bubbles: true }));
      actualInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Send message
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn) {
        sendBtn.click();
        console.log('✅ Analysis request sent:', selectedType);
        
        if ((window as any).showNotification) {
          (window as any).showNotification('✅ AI is analyzing...', 'success');
        }
        
        setTimeout(() => {
          const chatContainer = document.querySelector('.ai-chat-container') as HTMLElement;
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 1000);
      }
    }
  });
}

/**
 * Show file analysis dialog with multiple analysis options
 */
async function showFileAnalysisDialog(filePath: string): Promise<void> {
  const fileName = filePath.split(/[\\/]/).pop() || 'file';
  
  // Remove existing dialog
  document.getElementById('file-analysis-dialog')?.remove();
  
  // Read file content first
  let fileContent = '';
  let fileSize = 0;
  
  try {
    fileContent = await invoke('read_file', { path: filePath }) as string;
    fileSize = fileContent.length;
  } catch (error) {
    console.error('Failed to read file:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Cannot read file', 'error');
    }
    return;
  }
  
  const dialog = document.createElement('div');
  dialog.id = 'file-analysis-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
  `;
  
  dialog.innerHTML = `
    <div style="
      background: linear-gradient(145deg, #1a1a1d 0%, #252529 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      max-width: 700px;
      width: 92%;
      max-height: 85vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      <!-- Header -->
      <div style="
        padding: 24px 28px 20px 28px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        flex-shrink: 0;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <h2 style="
              margin: 0 0 8px 0;
              color: #ffffff;
              font-size: 24px;
              font-weight: 700;
            ">🤖 AI Analysis</h2>
            <p style="
              margin: 0;
              color: rgba(255, 255, 255, 0.65);
              font-size: 14px;
            ">Choose analysis type for this file</p>
          </div>
          <button id="close-file-analysis" style="
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            font-size: 24px;
            padding: 0;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        ">
          <span style="font-size: 20px;">📄</span>
          <div style="flex: 1; min-width: 0;">
            <div style="
              color: #4fc3f7;
              font-weight: 600;
              font-size: 14px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${fileName}</div>
            <div style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">${fileSize.toLocaleString()} characters</div>
          </div>
        </div>
      </div>
      
      <!-- Options -->
      <div style="
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
      ">
        <div style="display: grid; gap: 10px;">
          
          <button class="analysis-option" data-type="explain" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          ">
            <span style="font-size: 24px;">📄</span>
            <div>
              <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">Explain this file</div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">Get a detailed explanation of the code's purpose and functionality</div>
            </div>
          </button>
          
          <button class="analysis-option" data-type="summary" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          ">
            <span style="font-size: 24px;">📋</span>
            <div>
              <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">High-level summary</div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">Quick overview of the file's purpose and main components</div>
            </div>
          </button>
          
          <button class="analysis-option" data-type="architecture" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          ">
            <span style="font-size: 24px;">🏗️</span>
            <div>
              <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">Architecture overview</div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">Analyze design patterns, structure, and architectural decisions</div>
            </div>
          </button>
          
          <button class="analysis-option" data-type="dependencies" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          ">
            <span style="font-size: 24px;">🔗</span>
            <div>
              <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">Show dependencies</div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">List and explain all imports and external references</div>
            </div>
          </button>
          
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 8px 0;"></div>
          
          <button class="analysis-option" data-type="comprehensive" style="
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(79, 195, 247, 0.05));
            border: 2px solid rgba(79, 195, 247, 0.3);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          ">
            <span style="font-size: 24px;">🤖</span>
            <div>
              <div style="color: #4fc3f7; font-weight: 600; font-size: 15px; margin-bottom: 4px;">Analyze all results</div>
              <div style="color: rgba(255, 255, 255, 0.7); font-size: 13px;">Comprehensive analysis with all insights and recommendations</div>
            </div>
          </button>
          
        </div>
      </div>
    </div>
  `;
  
  // Add hover styles
  const style = document.createElement('style');
  style.textContent = `
    .analysis-option:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(79, 195, 247, 0.4) !important;
      transform: translateY(-2px);
    }
    .analysis-option:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(dialog);
  
  // Close button
  const closeBtn = dialog.querySelector('#close-file-analysis');
  closeBtn?.addEventListener('click', () => dialog.remove());
  
  // Analysis option buttons
  const options = dialog.querySelectorAll('.analysis-option');
  options.forEach(option => {
    option.addEventListener('click', async () => {
      const type = option.getAttribute('data-type');
      if (!type) return;
      
      console.log('🤖 Analyzing file:', fileName, 'Type:', type);
      
      // Close dialog
      dialog.remove();
      
      // Show loading notification
      if ((window as any).showNotification) {
        (window as any).showNotification(`Analyzing ${fileName}...`, 'info');
      }
      
      // Build prompt
      let prompt = '';
      const maxLength = 5000;
      const content = fileContent.length > maxLength 
        ? fileContent.substring(0, maxLength) + '\n\n...(content truncated)'
        : fileContent;
      
      switch (type) {
        case 'explain':
          prompt = `Please explain this file in detail:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide a clear explanation of what this code does, its purpose, and key functionality.`;
          break;
        case 'summary':
          prompt = `Provide a high-level summary:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nGive a concise summary of the file's purpose and main components.`;
          break;
        case 'architecture':
          prompt = `Analyze the architecture:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nDescribe architectural patterns, design choices, and structure.`;
          break;
        case 'dependencies':
          prompt = `Analyze dependencies:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nList all dependencies, imports, and external references with their purpose.`;
          break;
        case 'comprehensive':
          prompt = `Perform comprehensive analysis:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide:\n1. Purpose and functionality\n2. Architecture and patterns\n3. Dependencies\n4. Code quality observations\n5. Potential improvements`;
          break;
      }
      
      // Send to AI assistant
      if ((window as any).aiAssistant && typeof (window as any).aiAssistant.sendMessage === 'function') {
        (window as any).aiAssistant.sendMessage(prompt);
        console.log('✅ Sent to AI assistant');
        if ((window as any).showNotification) {
          (window as any).showNotification('AI analysis started - check AI panel', 'success');
        }
      } else {
        console.warn('⚠️ AI Assistant not available');
        console.log('📋 Analysis prompt:', prompt);
        if ((window as any).showNotification) {
          (window as any).showNotification('AI Assistant not available', 'warning');
        }
      }
    });
  });
  
  // Close on escape or background click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.remove();
  });
  document.addEventListener('keydown', function closeOnEscape(e) {
    if (e.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', closeOnEscape);
    }
  });
}

/**
 * Setup context menu for file explorer items - ENHANCED WITH TREE GENERATOR AND AI
 */

// Flag to prevent double-triggering
let isTogglingFolder = false;

// Flag to prevent duplicate listeners
let contextMenuInitialized = false;

export function setupContextMenu(): void {
  console.log('Setting up enhanced file explorer context menu with tree generator and AI...');
  
  // IMPORTANT: Hide the old HTML context menu permanently
  const oldMenu = document.getElementById('context-menu');
  if (oldMenu) {
    oldMenu.style.display = 'none';
    oldMenu.style.visibility = 'hidden';
    oldMenu.style.pointerEvents = 'none';
  }
  
  // Remove any existing listeners by removing old menu
  document.getElementById('file-explorer-context-menu')?.remove();
  
  // Only add listener once
  if (!contextMenuInitialized) {
    contextMenuInitialized = true;
    
    // Use document-level handler with capture to intercept before other handlers
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is within file tree area
      const fileTree = target.closest('.file-tree, #file-tree, #files-content, .file-container');
      if (!fileTree) return;
      
      // Find the file/folder item
      const fileItem = target.closest('.file-item, .folder-item, .tree-folder, .tree-file, [data-path]') as HTMLElement;
      if (!fileItem) return;
      
      // Don't handle project header - let projectFolderContextMenu handle that
      if (target.closest('.project-header')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const path = fileItem.getAttribute('data-path') || '';
      const isDirectory = fileItem.classList.contains('folder-item') || 
                         fileItem.classList.contains('tree-folder') ||
                         fileItem.classList.contains('directory') ||
                         fileItem.getAttribute('data-is-directory') === 'true';
      
      console.log('Context menu for:', path, 'isDirectory:', isDirectory);
      
      if (path) {
        showEnhancedContextMenu(e.clientX, e.clientY, path, isDirectory);
      }
    }, true); // Use capture phase to run first
    
    // Also hide old menu whenever it tries to show
    const observer = new MutationObserver(() => {
      const oldMenu = document.getElementById('context-menu');
      if (oldMenu && oldMenu.style.display !== 'none') {
        oldMenu.style.display = 'none';
      }
    });
    
    observer.observe(document.body, { 
      attributes: true, 
      subtree: true, 
      attributeFilter: ['style'] 
    });
  }
  
  // Inject styles (safe to call multiple times)
  injectContextMenuStyles();
  
  console.log('✅ Enhanced context menu with tree generator and AI initialized');
  
  // Enable single click to open files
  enableSingleClickOpen();
}

/**
 * Helper function to send prompt to AI assistant
 * 🔧 NUCLEAR FIX v3: Ensures ONLY ONE user message appears
 * Strategy:
 * 1. Inject CSS to hide duplicates immediately
 * 2. Create ONE collapsible message
 * 3. Send via input field
 * 4. Aggressive DOM cleanup to remove any duplicates
 */
async function sendToAI(prompt: string, fileName: string, analysisType: string = 'analysis'): Promise<void> {
  console.log('📤 [AI Analysis NUCLEAR v3] Starting:', fileName, '-', analysisType);
  
  // 🔧 NUCLEAR: Set flags IMMEDIATELY
  (window as any).__aiAnalysisActive = true;
  (window as any).__aiAnalysisFileName = fileName;
  (window as any).__aiAnalysisTimestamp = Date.now();
  
  // Inject collapsible message styles
  injectCollapsibleMessageStyles();
  
  const chatContainer = document.querySelector('.ai-chat-container') ||
                       document.querySelector('.chat-messages');
  
  if (!chatContainer) {
    console.error('[AI Analysis] Chat container not found');
    return;
  }
  
  // ========================================
  // STEP 1: NUCLEAR CSS - Hide any user message containing the prompt text
  // ========================================
  const nuclearStyleId = 'ai-analysis-nuclear-hide';
  let nuclearStyle = document.getElementById(nuclearStyleId);
  if (!nuclearStyle) {
    nuclearStyle = document.createElement('style');
    nuclearStyle.id = nuclearStyleId;
    document.head.appendChild(nuclearStyle);
  }
  
  // Escape filename for CSS
  const escapedFileName = fileName.replace(/['"\\]/g, '');
  nuclearStyle.textContent = `
    /* NUCLEAR: Hide duplicate user messages during AI Analysis */
    .ai-message.user-message:not([data-analysis-primary="true"]):not(.collapsible) {
      display: none !important;
      opacity: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* But show our primary message */
    .ai-message.user-message[data-analysis-primary="true"],
    .ai-message.user-message.collapsible[data-analysis-message="true"] {
      display: block !important;
      opacity: 1 !important;
      height: auto !important;
    }
  `;
  
  // ========================================
  // STEP 2: Remove ALL existing user messages about this analysis
  // ========================================
  const removeExistingMessages = () => {
    const allUserMsgs = chatContainer.querySelectorAll('.user-message, .ai-message.user-message');
    allUserMsgs.forEach(msg => {
      const text = (msg.textContent || '').toLowerCase();
      const isPrimary = msg.getAttribute('data-analysis-primary') === 'true';
      const isOurCollapsible = msg.getAttribute('data-analysis-message') === 'true';
      
      if (!isPrimary && !isOurCollapsible) {
        const mentionsFile = text.includes(fileName.toLowerCase()) || 
                            text.includes(analysisType.toLowerCase()) ||
                            text.includes('please explain') ||
                            text.includes('analyze');
        if (mentionsFile) {
          console.log('🗑️ [NUCLEAR] Removing duplicate message');
          msg.remove();
        }
      }
    });
  };
  
  // Remove any pre-existing messages
  removeExistingMessages();
  
  // ========================================
  // STEP 3: Create ONE clean collapsible user message
  // ========================================
  const lineCount = prompt.split('\n').length;
  
  const userMessage = document.createElement('div');
  userMessage.className = 'ai-message user-message collapsible';
  userMessage.setAttribute('data-analysis-message', 'true');
  userMessage.setAttribute('data-analysis-primary', 'true');
  userMessage.setAttribute('data-timestamp', Date.now().toString());
  
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  
  userMessage.innerHTML = `
    <div class="ai-message-content message-content">
      <div class="message-summary">
        <span class="expand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
        <span class="ai-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </span>
        <span class="summary-content">
          <span class="file-name">${fileName}</span>
          <span class="analysis-type">• ${analysisType}</span>
        </span>
        <span class="line-count">${lineCount} lines</span>
      </div>
      <div class="message-full-content"><pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;color:#aaa;">${escapeHtml(prompt)}</pre></div>
    </div>
  `;
  
  const summary = userMessage.querySelector('.message-summary');
  if (summary) {
    summary.addEventListener('click', (e) => {
      e.stopPropagation();
      userMessage.classList.toggle('expanded');
    });
  }
  
  chatContainer.appendChild(userMessage);
  console.log('✅ [NUCLEAR] Created primary collapsible message');
  
  // ========================================
  // STEP 4: Set up aggressive cleanup - runs every 100ms for 5 seconds
  // ========================================
  let cleanupCount = 0;
  const cleanupInterval = setInterval(() => {
    removeExistingMessages();
    cleanupCount++;
    if (cleanupCount >= 50) { // 5 seconds
      clearInterval(cleanupInterval);
      // Remove the nuclear CSS after cleanup is done
      setTimeout(() => {
        if (nuclearStyle && nuclearStyle.parentNode) {
          nuclearStyle.textContent = ''; // Clear but don't remove (in case of re-use)
        }
      }, 1000);
    }
  }, 100);
  
  // ========================================
  // STEP 5: MutationObserver to catch any new messages
  // ========================================
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        
        const isUserMsg = node.classList.contains('user-message') || 
                         node.classList.contains('ai-message');
        if (!isUserMsg) return;
        
        const isPrimary = node.getAttribute('data-analysis-primary') === 'true';
        const isOurMessage = node.getAttribute('data-analysis-message') === 'true';
        
        if (!isPrimary && !isOurMessage) {
          const text = (node.textContent || '').toLowerCase();
          const mentionsFile = text.includes(fileName.toLowerCase()) || 
                              text.includes('please explain') ||
                              text.includes('analyze');
          if (mentionsFile) {
            console.log('🗑️ [NUCLEAR Observer] Removing duplicate message');
            node.style.display = 'none';
            setTimeout(() => node.remove(), 50);
          }
        }
      });
    });
  });
  
  observer.observe(chatContainer, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000); // Stop after 6 seconds
  
  // ========================================
  // STEP 6: Send to AI via input field (duplicates will be caught)
  // ========================================
  const aiInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement ||
                  document.getElementById('user-input') as HTMLTextAreaElement;
  
  if (aiInput) {
    aiInput.value = prompt;
    aiInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const sendBtn = document.getElementById('send-btn') ||
                   document.querySelector('.send-button') as HTMLButtonElement;
    
    if (sendBtn) {
      sendBtn.click();
      console.log('✅ [NUCLEAR] Sent via input field');
      
      if ((window as any).showNotification) {
        (window as any).showNotification('AI analysis started', 'success');
      }
    }
  }
  
  // Scroll to our message
  userMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
  
  // Clear flags after everything is done
  setTimeout(() => {
    (window as any).__aiAnalysisActive = false;
    (window as any).__aiAnalysisFileName = null;
    (window as any).__aiAnalysisTimestamp = null;
  }, 7000);
}

/**
 * Inject CSS styles for collapsible messages - Professional IDE style
 */
function injectCollapsibleMessageStyles(): void {
  if (document.getElementById('collapsible-message-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'collapsible-message-styles';
  style.textContent = `
    /* Collapsible User Message - Professional IDE Style */
    .user-message.collapsible {
      position: relative;
    }
    
    /* CRITICAL: Hide any chevrons injected by file tree scripts */
    .user-message.collapsible .folder-chevron,
    .user-message.collapsible [class*="chevron"]:not(.expand-icon),
    .user-message.collapsible .ai-icon .folder-chevron,
    .user-message.collapsible .ai-icon [class*="chevron"] {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
    }
    
    /* Prevent unwanted ::before content */
    .user-message.collapsible .ai-icon::before,
    .user-message.collapsible .ai-icon::after {
      content: none !important;
      display: none !important;
    }
    
    .user-message.collapsible .ai-message-content,
    .user-message.collapsible .message-content {
      padding: 0 !important;
      background: transparent !important;
    }
    
    .user-message.collapsible .message-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(30, 30, 35, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .user-message.collapsible .message-summary:hover {
      background: rgba(40, 40, 48, 0.9);
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    .user-message.collapsible .message-summary .expand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.4);
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    .user-message.collapsible .message-summary .expand-icon svg {
      width: 10px;
      height: 10px;
      transition: transform 0.2s ease;
    }
    
    .user-message.collapsible.expanded .message-summary .expand-icon svg {
      transform: rotate(90deg);
    }
    
    .user-message.collapsible .message-summary .ai-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.2) 0%, rgba(224, 64, 251, 0.2) 100%);
      border-radius: 4px;
      flex-shrink: 0;
    }
    
    .user-message.collapsible .message-summary .ai-icon svg {
      width: 12px;
      height: 12px;
      color: #b388ff;
    }
    
    .user-message.collapsible .message-summary .summary-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    
    .user-message.collapsible .message-summary .file-name {
      color: #e6edf3;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .user-message.collapsible .message-summary .analysis-type {
      color: rgba(255, 255, 255, 0.45);
      font-size: 11px;
      font-weight: 400;
    }
    
    .user-message.collapsible .message-summary .line-count {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      flex-shrink: 0;
    }
    
    .user-message.collapsible .message-full-content {
      display: none;
      margin-top: 6px;
      padding: 10px 12px;
      background: rgba(20, 20, 24, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 11px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .user-message.collapsible.expanded .message-full-content {
      display: block;
      animation: collapseExpand 0.15s ease-out;
    }
    
    @keyframes collapseExpand {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .user-message.collapsible .message-full-content::-webkit-scrollbar {
      width: 5px;
    }
    
    .user-message.collapsible .message-full-content::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .user-message.collapsible .message-full-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    
    .user-message.collapsible .message-full-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Code blocks inside expanded content */
    .user-message.collapsible .message-full-content code {
      background: rgba(255, 255, 255, 0.05);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .user-message.collapsible .message-full-content pre {
      background: rgba(0, 0, 0, 0.3);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 6px 0;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Make the last user message collapsible - Professional IDE style
 */
function makeLastUserMessageCollapsible(summaryText: string): void {
  // 🔧 NUCLEAR FIX: Skip if we already created a collapsible message
  if ((window as any).__aiAnalysisActive === true) {
    console.log('⏭️ [makeLastUserMessageCollapsible] Skipping - NUCLEAR mode active');
    return;
  }
  
  const chatContainer = document.querySelector('.ai-chat-container') ||
                       document.querySelector('.chat-messages');
  if (!chatContainer) {
    console.warn('Chat container not found');
    return;
  }
  
  // Find the last user message
  const userMessages = chatContainer.querySelectorAll('.user-message');
  if (userMessages.length === 0) {
    console.warn('No user messages found');
    return;
  }
  
  const lastUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
  
  // Skip if already collapsible
  if (lastUserMessage.classList.contains('collapsible')) {
    console.log('Message already collapsible');
    return;
  }
  
  // Get the original content
  const contentElement = lastUserMessage.querySelector('.ai-message-content, .message-content');
  if (!contentElement) {
    console.warn('Message content not found');
    return;
  }
  
  const originalContent = contentElement.innerHTML;
  const originalText = contentElement.textContent || '';
  const lineCount = originalText.split('\n').length;
  
  // Only make collapsible if content is long (more than 3 lines or 200 chars)
  if (lineCount <= 3 && originalText.length <= 200) {
    console.log('Message too short to collapse');
    return;
  }
  
  // Parse the summary text to extract file name and analysis type
  // Format: "🤖 Analyzing: filename.ts (Analysis Type)"
  const match = summaryText.match(/Analyzing:\s*(.+?)\s*\((.+?)\)/);
  const fileName = match ? match[1] : 'file';
  const analysisType = match ? match[2] : 'Analysis';
  
  // Add collapsible class
  lastUserMessage.classList.add('collapsible');
  
  // Create new structure with professional styling
  contentElement.innerHTML = `
    <div class="message-summary">
      <span class="expand-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
      <span class="ai-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </span>
      <span class="summary-content">
        <span class="file-name">${fileName}</span>
        <span class="analysis-type">• ${analysisType}</span>
      </span>
      <span class="line-count">${lineCount} lines</span>
    </div>
    <div class="message-full-content">${originalContent}</div>
  `;
  
  // Add click handler to toggle
  const summary = contentElement.querySelector('.message-summary');
  if (summary) {
    summary.addEventListener('click', (e) => {
      e.stopPropagation();
      lastUserMessage.classList.toggle('expanded');
      
      // Scroll to show content if expanding
      if (lastUserMessage.classList.contains('expanded')) {
        setTimeout(() => {
          lastUserMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });
  }
  
  console.log('✅ Made user message collapsible:', fileName, '-', analysisType);
}

/**
 * Add AI Analysis submenu to context menu - Professional UI matching main menu style
 */
function addAIAnalysisSubmenu(menu: HTMLElement, path: string, fileName: string, isDirectory: boolean): void {
  // Always show AI menu - individual features will check for API availability
  console.log('🤖 Adding AI Analysis submenu for:', fileName);
  
  // Add separator before AI section
  const separator = document.createElement('div');
  separator.className = 'fcm-divider';
  menu.appendChild(separator);
  
  // Create AI Analysis submenu trigger
  const aiMenuItem = document.createElement('div');
  aiMenuItem.className = 'fcm-item fcm-has-submenu';
  aiMenuItem.style.cssText = 'position: relative;';
  aiMenuItem.innerHTML = `
    <div class="fcm-icon" style="background: linear-gradient(135deg, rgba(224, 64, 251, 0.15), rgba(156, 39, 176, 0.15)); color: #e040fb;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
    </div>
    <span class="fcm-text" style="background: linear-gradient(90deg, #e040fb, #7c4dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 600;">AI Analysis</span>
    <span style="margin-left: auto; color: #666; font-size: 10px;">▶</span>
  `;
  
  // Create submenu container
  const submenu = document.createElement('div');
  submenu.className = 'fcm-submenu';
  submenu.style.cssText = `
    position: fixed;
    min-width: 240px;
    background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(20px);
    display: none;
    z-index: 100002;
  `;
  
  // Submenu header with filename
  const submenuHeader = document.createElement('div');
  submenuHeader.className = 'fcm-header';
  submenuHeader.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 4px;
  `;
  
  // Create icon container separately to hide any injected chevrons
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #e040fb 0%, #7c4dff 100%);
    flex-shrink: 0;
    position: relative;
  `;
  iconContainer.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="position: relative; z-index: 1;">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
    </svg>
  `;
  // Remove any injected chevrons
  setTimeout(() => {
    iconContainer.querySelectorAll('[class*="chevron"], .folder-chevron').forEach(el => el.remove());
  }, 0);
  
  const infoContainer = document.createElement('div');
  infoContainer.style.cssText = 'flex: 1; min-width: 0;';
  infoContainer.innerHTML = `
    <div style="font-size: 13px; font-weight: 600; color: #e6edf3;">AI Analysis</div>
    <div style="font-size: 10px; color: #7d8590; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</div>
  `;
  
  submenuHeader.appendChild(iconContainer);
  submenuHeader.appendChild(infoContainer);
  submenu.appendChild(submenuHeader);
  
  // SVG icons matching main menu style
  const AI_ICONS = {
    explain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    summary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>`,
    architecture: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    dependencies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    comprehensive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
  };
  
  // AI analysis options
  const aiOptions = [
    { type: 'explain', icon: AI_ICONS.explain, label: 'Explain this file' },
    { type: 'summary', icon: AI_ICONS.summary, label: 'High-level summary' },
    { type: 'architecture', icon: AI_ICONS.architecture, label: 'Architecture overview' },
    { type: 'dependencies', icon: AI_ICONS.dependencies, label: 'Show dependencies' },
    { type: 'comprehensive', icon: AI_ICONS.comprehensive, label: 'Analyze all results', highlight: true }
  ];
  
  aiOptions.forEach((opt, index) => {
    const item = document.createElement('div');
    item.className = 'fcm-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      cursor: pointer;
      color: #d4d4d4;
      border-radius: 6px;
      margin: 1px 0;
      transition: all 0.15s ease;
      position: relative;
      overflow: hidden;
      animation: fcmItemIn 0.2s ease forwards;
      animation-delay: ${index * 0.03}s;
      opacity: 0;
    `;
    
    item.innerHTML = `
      <div style="
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${opt.highlight ? 'rgba(224, 64, 251, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
        border-radius: 6px;
        flex-shrink: 0;
        transition: all 0.15s ease;
        color: ${opt.highlight ? '#e040fb' : '#999'};
      ">
        ${opt.icon}
      </div>
      <span style="
        flex: 1; 
        font-size: 12.5px; 
        font-weight: 450;
        letter-spacing: -0.01em;
        color: ${opt.highlight ? '#e040fb' : '#d4d4d4'};
      ">${opt.label}</span>
    `;
    
    // Style the SVG icon
    const iconContainer = item.querySelector('div') as HTMLElement;
    const svg = iconContainer?.querySelector('svg');
    if (svg) {
      svg.style.width = '14px';
      svg.style.height = '14px';
    }
    
    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(255, 255, 255, 0.06)';
      item.style.color = '#fff';
      item.style.transform = 'translateX(2px)';
      if (iconContainer) {
        iconContainer.style.background = opt.highlight ? 'rgba(224, 64, 251, 0.2)' : 'rgba(255, 255, 255, 0.08)';
        iconContainer.style.color = opt.highlight ? '#e040fb' : '#fff';
        iconContainer.style.transform = 'scale(1.05)';
      }
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
      item.style.color = opt.highlight ? '#e040fb' : '#d4d4d4';
      item.style.transform = 'translateX(0)';
      if (iconContainer) {
        iconContainer.style.background = opt.highlight ? 'rgba(224, 64, 251, 0.15)' : 'rgba(255, 255, 255, 0.04)';
        iconContainer.style.color = opt.highlight ? '#e040fb' : '#999';
        iconContainer.style.transform = 'scale(1)';
      }
    });
    
    // Click handler - DIRECTLY send to AI
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('🤖 AI Analysis clicked:', opt.type, path);
      
      // Close the menu and submenu
      closeContextMenu(menu);
      submenu.style.display = 'none';
      submenu.remove();
      
      // Show loading notification
      if ((window as any).showNotification) {
        (window as any).showNotification(`Analyzing ${fileName}...`, 'info');
      }
      
      try {
        if (!isDirectory) {
          // For FILES - read content and send to AI directly
          let fileContent = '';
          try {
            fileContent = await invoke('read_file_content', { path: path }) as string;
          } catch (e1) {
            try {
              fileContent = await invoke('read_file', { path: path }) as string;
            } catch (e2) {
              console.error('Failed to read file:', e2);
              if ((window as any).showNotification) {
                (window as any).showNotification('Failed to read file', 'error');
              }
              return;
            }
          }
          
          // Build prompt based on type
          const maxLength = 5000;
          const content = fileContent.length > maxLength 
            ? fileContent.substring(0, maxLength) + '\n\n...(content truncated)'
            : fileContent;
          
          let prompt = '';
          switch (opt.type) {
            case 'explain':
              prompt = `Please explain this file in detail:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide a clear explanation of what this code does, its purpose, and key functionality.`;
              break;
            case 'summary':
              prompt = `Provide a high-level summary:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nGive a concise summary of the file's purpose and main components.`;
              break;
            case 'architecture':
              prompt = `Analyze the architecture:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nDescribe architectural patterns, design choices, and structure.`;
              break;
            case 'dependencies':
              prompt = `Analyze dependencies:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nList all dependencies, imports, and external references with their purpose.`;
              break;
            case 'comprehensive':
              prompt = `Perform comprehensive analysis:\n\n**File:** ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide:\n1. Purpose and functionality\n2. Architecture and patterns\n3. Dependencies\n4. Code quality observations\n5. Potential improvements`;
              break;
          }
          
          // Send to AI - try multiple methods
          await sendToAI(prompt, fileName, opt.label);
          
        } else {
          // For FOLDERS - generate tree and send to AI directly
          let treeText = '';
          try {
            treeText = await FileTreeGenerator.generateTreeText(path, {
              maxDepth: 5,
              includeFiles: true,
              includeFolders: true,
              showSize: false,
              showDate: false
            });
          } catch (e) {
            console.error('Failed to generate tree:', e);
            if ((window as any).showNotification) {
              (window as any).showNotification('Failed to analyze folder', 'error');
            }
            return;
          }
          
          const folderName = path.split(/[\\/]/).pop() || 'folder';
          
          // Truncate tree if too long
          const maxLength = 8000;
          const treeContent = treeText.length > maxLength 
            ? treeText.substring(0, maxLength) + '\n\n...(tree truncated)'
            : treeText;
          
          // Build prompt based on analysis type
          let prompt = '';
          switch (opt.type) {
            case 'explain':
              prompt = `Please explain this folder structure:\n\n**Folder:** ${folderName}\n**Path:** ${path}\n\n\`\`\`\n${treeContent}\n\`\`\`\n\nExplain the purpose of this folder, its organization, and what each subfolder/file is for.`;
              break;
            case 'summary':
              prompt = `Provide a high-level summary of this folder:\n\n**Folder:** ${folderName}\n\n\`\`\`\n${treeContent}\n\`\`\`\n\nGive a concise overview of what this folder contains and its role in the project.`;
              break;
            case 'architecture':
              prompt = `Analyze the architecture of this folder:\n\n**Folder:** ${folderName}\n\n\`\`\`\n${treeContent}\n\`\`\`\n\nDescribe the architectural patterns, project structure, and design decisions visible in this folder layout.`;
              break;
            case 'dependencies':
              prompt = `Analyze the structure and relationships:\n\n**Folder:** ${folderName}\n\n\`\`\`\n${treeContent}\n\`\`\`\n\nIdentify how files and folders relate to each other, potential dependencies, and module organization.`;
              break;
            case 'comprehensive':
              prompt = `Perform comprehensive analysis of this folder:\n\n**Folder:** ${folderName}\n**Path:** ${path}\n\n\`\`\`\n${treeContent}\n\`\`\`\n\nProvide:\n1. Purpose and role in the project\n2. Folder organization and structure\n3. Key files and their purposes\n4. Architecture patterns used\n5. Suggestions for improvements`;
              break;
          }
          
          // Send to AI
          await sendToAI(prompt, folderName, opt.label);
        }
      } catch (error) {
        console.error('AI Analysis failed:', error);
        if ((window as any).showNotification) {
          (window as any).showNotification('Analysis failed: ' + error, 'error');
        }
      }
    });
    
    submenu.appendChild(item);
  });
  
  // Append submenu to body (not to menu item) for better positioning
  document.body.appendChild(submenu);
  
  // Show submenu on hover with proper positioning
  let hideTimeout: number | null = null;
  
  const showSubmenu = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    const rect = aiMenuItem.getBoundingClientRect();
    
    // Position to the right of the menu item
    let left = rect.right + 4;
    let top = rect.top;
    
    // Show temporarily to measure
    submenu.style.display = 'block';
    const submenuRect = submenu.getBoundingClientRect();
    
    // Adjust if going off right edge
    if (left + submenuRect.width > window.innerWidth - 10) {
      left = rect.left - submenuRect.width - 4;
    }
    
    // Adjust if going off bottom
    if (top + submenuRect.height > window.innerHeight - 10) {
      top = window.innerHeight - submenuRect.height - 10;
    }
    
    submenu.style.left = `${left}px`;
    submenu.style.top = `${top}px`;
  };
  
  const hideSubmenu = () => {
    hideTimeout = window.setTimeout(() => {
      submenu.style.display = 'none';
    }, 150);
  };
  
  aiMenuItem.addEventListener('mouseenter', showSubmenu);
  aiMenuItem.addEventListener('mouseleave', hideSubmenu);
  submenu.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  submenu.addEventListener('mouseleave', hideSubmenu);
  
  // Clean up submenu when menu closes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          if (node === menu || (node as Element)?.contains?.(menu)) {
            submenu.remove();
            observer.disconnect();
          }
        });
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also remove submenu when clicking outside
  const removeOnClick = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && !submenu.contains(e.target as Node)) {
      submenu.remove();
      document.removeEventListener('click', removeOnClick);
    }
  };
  setTimeout(() => document.addEventListener('click', removeOnClick), 100);
  
  menu.appendChild(aiMenuItem);
}

/**
 * Show enhanced context menu with tree generator and AI options
 * Professional UI with animations
 */
function showEnhancedContextMenu(x: number, y: number, path: string, isDirectory: boolean): void {
  // Debounce: prevent double-fire within 300ms
  const __now = Date.now();
  if ((window as any).__menuLastShown && __now - (window as any).__menuLastShown < 300) { console.log('[Menu] Debounced double-fire'); return; }
  (window as any).__menuLastShown = __now;
  // Close any existing menus (both old and new)
  const existingMenu = document.querySelector('.file-context-menu');
  if (existingMenu) {
    existingMenu.classList.add('closing');
    setTimeout(() => existingMenu.remove(), 150);
  }
  
  // Hide old HTML context menu if visible
  const oldMenu = document.getElementById('context-menu');
  if (oldMenu) {
    oldMenu.style.display = 'none';
  }
  
  // Also hide any other context menus
  document.querySelectorAll('.context-menu:not(.file-context-menu):not(.project-context-menu)').forEach(m => {
    (m as HTMLElement).style.display = 'none';
  });
  
  // Inject professional styles
  injectContextMenuStyles();
  
  const menu = document.createElement('div');
  menu.className = 'file-context-menu';
  menu.id = 'file-explorer-context-menu';
  
  // Extract file info
  const fileName = path.split(/[/\\]/).pop() || 'Unknown';
  const parentPath = path.split(/[/\\]/).slice(0, -1).join('/');
  
  // Create header with file info
  const header = document.createElement('div');
  header.className = 'fcm-header';
  header.innerHTML = `
    <div class="fcm-header-icon ${isDirectory ? 'folder' : 'file'}">
      ${isDirectory ? CONTEXT_ICONS.folder : CONTEXT_ICONS.file}
    </div>
    <div class="fcm-header-info">
      <div class="fcm-header-name">${fileName}</div>
      <div class="fcm-header-path">${parentPath || 'Project root'}</div>
    </div>
  `;
  menu.appendChild(header);
  
  // Menu items configuration
  const menuItems: Array<{
    label: string;
    icon: string;
    action: () => void;
    separator?: boolean;
    disabled?: boolean;
    shortcut?: string;
    className?: string;
  }> = [];
  
  if (isDirectory) {
    menuItems.push(
      {
        label: 'Open Folder',
        icon: CONTEXT_ICONS.open,
        shortcut: 'Enter',
        className: 'primary',
        action: () => toggleFolder(path)
      },
      { separator: true, label: '', icon: '', action: () => {} },
      {
        label: 'Generate File Tree...',
        icon: CONTEXT_ICONS.tree,
        action: () => {
          console.log('Opening tree generator dialog for:', path);
          FileTreeGenerator.showTreeDialog(path);
        }
      },
      {
        label: 'Quick Tree (tree.txt)',
        icon: CONTEXT_ICONS.quickTree,
        action: async () => {
          try {
            console.log('Generating quick tree for:', path);
            if ((window as any).showNotification) {
              (window as any).showNotification('Generating file tree...', 'info');
            }
            
            const treeText = await FileTreeGenerator.generateTreeText(path, {
              maxDepth: 10,
              includeFiles: true,
              includeFolders: true,
              showSize: true,
              showDate: false
            });
            
            const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
            const treePath = path.replace(/\\/g, '/') + '/tree.txt';
            await writeTextFile(treePath, treeText);
            
            console.log('✅ Tree saved to:', treePath);
            
            if ((window as any).showNotification) {
              (window as any).showNotification('File tree saved to tree.txt', 'success');
            }
            
            document.dispatchEvent(new CustomEvent('file-tree-refresh'));
          } catch (error) {
            console.error('Failed to generate quick tree:', error);
            if ((window as any).showNotification) {
              (window as any).showNotification('Failed to generate tree', 'error');
            }
          }
        }
      },
      { separator: true, label: '', icon: '', action: () => {} },
      {
        label: 'New File',
        icon: CONTEXT_ICONS.newFile,
        shortcut: 'Ctrl+N',
        action: () => showCreateNewDialog('file', path)
      },
      {
        label: 'New Folder',
        icon: CONTEXT_ICONS.newFolder,
        shortcut: 'Ctrl+Shift+N',
        action: () => showCreateNewDialog('folder', path)
      },
      { separator: true, label: '', icon: '', action: () => {} },
      {
        label: 'Open Terminal Here',
        icon: CONTEXT_ICONS.terminal,
        action: () => {
          document.dispatchEvent(new CustomEvent('open-terminal', { detail: { path } }));
        }
      },
      {
        label: 'Reveal in Explorer',
        icon: CONTEXT_ICONS.reveal,
        action: () => revealInFileExplorer(path)
      }
    );
  } else {
    menuItems.push(
      {
        label: 'Open File',
        icon: CONTEXT_ICONS.open,
        shortcut: 'Enter',
        className: 'primary',
        action: () => handleFileOpen(path)
      },
      {
        label: 'Duplicate',
        icon: CONTEXT_ICONS.duplicate,
        action: () => duplicateItem(path)
      },
      { separator: true, label: '', icon: '', action: () => {} },
      {
        label: 'New File',
        icon: CONTEXT_ICONS.newFile,
        shortcut: 'Ctrl+N',
        action: () => {
          const parentDir = path.split(/[/\\]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
          showCreateNewDialog('file', parentDir);
        }
      },
      {
        label: 'New Folder',
        icon: CONTEXT_ICONS.newFolder,
        action: () => {
          const parentDir = path.split(/[/\\]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
          showCreateNewDialog('folder', parentDir);
        }
      },
      { separator: true, label: '', icon: '', action: () => {} },
      {
        label: 'Open Terminal Here',
        icon: CONTEXT_ICONS.terminal,
        action: () => {
          const parentDir = path.split(/[/\\]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
          document.dispatchEvent(new CustomEvent('open-terminal', { detail: { path: parentDir } }));
        }
      },
      {
        label: 'Reveal in Explorer',
        icon: CONTEXT_ICONS.reveal,
        action: () => revealInFileExplorer(path)
      }
    );
  }
  
  // Common items for both file and folder
  menuItems.push(
    { separator: true, label: '', icon: '', action: () => {} },
    {
      label: 'Copy Path',
      icon: CONTEXT_ICONS.copy,
      action: () => copyPathToClipboard(path)
    },
    {
      label: 'Rename',
      icon: CONTEXT_ICONS.rename,
      shortcut: 'F2',
      action: () => renameItem(path)
    },
    { separator: true, label: '', icon: '', action: () => {} },
    {
      label: 'Delete',
      icon: CONTEXT_ICONS.delete,
      shortcut: 'Del',
      className: 'danger',
      action: () => deleteItem(path)
    }
  );
  
  // Render menu items
  menuItems.forEach((item, index) => {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'fcm-divider';
      menu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `fcm-item ${item.className || ''}`;
      menuItem.style.animationDelay = `${index * 0.02}s`;
      
      menuItem.innerHTML = `
        <div class="fcm-icon">${item.icon}</div>
        <span class="fcm-text">${item.label}</span>
        ${item.shortcut ? `<span class="fcm-shortcut">${item.shortcut}</span>` : ''}
      `;
      
      if (!item.disabled) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`Context menu action: ${item.label}`);
          closeContextMenu(menu);
          setTimeout(() => item.action(), 100);
        });
      }
      
      menu.appendChild(menuItem);
    }
  });
  
  // Add AI Analysis submenu AFTER regular menu items are rendered
  addAIAnalysisSubmenu(menu, path, fileName, isDirectory);
  
  // Position menu
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  document.body.appendChild(menu);
  
  // Adjust position if menu would go off screen
  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    const padding = 10;
    
    if (menuRect.right > window.innerWidth - padding) {
      menu.style.left = `${window.innerWidth - menuRect.width - padding}px`;
    }
    if (menuRect.bottom > window.innerHeight - padding) {
      menu.style.top = `${window.innerHeight - menuRect.height - padding}px`;
    }
  });
  
  // Close handlers
  setTimeout(() => {
    const closeMenu = (e: MouseEvent) => {
      if (e.button === 2) return; // ignore right-clicks
      if (!menu.contains(e.target as Node)) {
        closeContextMenu(menu);
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
    
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu(menu);
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
  }, 800);
  
  console.log('Context menu displayed at:', { x, y });
}

// Close menu with animation
function closeContextMenu(menu: HTMLElement): void {
  menu.classList.add('closing');
  setTimeout(() => menu.remove(), 150);
}

// SVG Icons for context menu
const CONTEXT_ICONS = {
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  newFile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  newFolder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  reveal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  duplicate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/></svg>`,
  tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="6" y1="6" x2="6" y2="18"/></svg>`,
  quickTree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>`,
};

// Inject professional context menu styles
function injectContextMenuStyles(): void {
  if (document.getElementById('fcm-professional-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'fcm-professional-styles';
  style.textContent = `
/* IMPORTANT: Hide old HTML context menu permanently */
#context-menu {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Professional File Context Menu */
.file-context-menu {
  position: fixed;
  background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
  min-width: 240px;
  max-width: 300px;
  z-index: 100000;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  transform-origin: top left;
  animation: fcmSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  overflow: hidden;
}

.file-context-menu::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

@keyframes fcmSlideIn {
  0% { opacity: 0; transform: scale(0.95) translateY(-8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.file-context-menu.closing {
  animation: fcmSlideOut 0.15s ease-out forwards;
  pointer-events: none;
}

@keyframes fcmSlideOut {
  0% { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.95) translateY(-4px); }
}

/* Header */
.fcm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
}

.fcm-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fcm-header-icon.file {
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
}

.fcm-header-icon.folder {
  background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
}

.fcm-header-icon svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

.fcm-header-info {
  flex: 1;
  min-width: 0;
}

.fcm-header-name {
  font-size: 13px;
  font-weight: 600;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fcm-header-path {
  font-size: 10px;
  color: #7d8590;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* CRITICAL: Hide any chevrons injected by file tree scripts */
.file-context-menu .folder-chevron,
.file-context-menu [class*="chevron"],
.fcm-header .folder-chevron,
.fcm-header [class*="chevron"],
.fcm-header-icon .folder-chevron,
.fcm-header-icon [class*="chevron"],
.fcm-item .folder-chevron,
.fcm-item [class*="chevron"]:not(.fcm-submenu-arrow) {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  font-size: 0 !important;
}

/* Prevent list-style markers */
.file-context-menu,
.file-context-menu * {
  list-style: none !important;
  list-style-type: none !important;
}

/* Prevent unwanted ::before and ::after content injection on icons */
.fcm-header-icon::before,
.fcm-header-icon::after {
  content: none !important;
  display: none !important;
}

/* Menu Items */
.fcm-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  color: #d4d4d4;
  border-radius: 6px;
  margin: 1px 0;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
  opacity: 0;
  animation: fcmItemIn 0.2s ease forwards;
}

@keyframes fcmItemIn {
  0% { opacity: 0; transform: translateX(-8px); }
  100% { opacity: 1; transform: translateX(0); }
}

.fcm-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  border-radius: 0 2px 2px 0;
  transition: all 0.15s ease;
}

.fcm-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  transform: translateX(2px);
}

.fcm-item:hover::before {
  background: #4fc3f7;
}

.fcm-item:active {
  transform: translateX(2px) scale(0.98);
  background: rgba(255, 255, 255, 0.08);
}

/* Primary action */
.fcm-item.primary .fcm-icon {
  background: rgba(79, 195, 247, 0.15);
  color: #4fc3f7;
}

.fcm-item.primary:hover {
  background: rgba(79, 195, 247, 0.1);
}

/* Danger action */
.fcm-item.danger:hover {
  background: rgba(244, 67, 54, 0.12);
  color: #f44336;
}

.fcm-item.danger:hover::before {
  background: #f44336;
}

.fcm-item.danger:hover .fcm-icon {
  color: #f44336;
  background: rgba(244, 67, 54, 0.15);
}

/* Icon */
.fcm-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  color: #999;
}

.fcm-icon svg {
  width: 14px;
  height: 14px;
}

.fcm-item:hover .fcm-icon {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: scale(1.05);
}

/* Text */
.fcm-text {
  flex: 1;
  font-size: 12.5px;
  font-weight: 450;
  letter-spacing: -0.01em;
}

/* Shortcut */
.fcm-shortcut {
  font-size: 10px;
  color: #666;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  letter-spacing: 0.5px;
  transition: all 0.15s ease;
}

.fcm-item:hover .fcm-shortcut {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

/* Divider */
.fcm-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 5%, rgba(255, 255, 255, 0.08) 50%, transparent 95%);
  margin: 6px 8px;
}

/* AI Submenu Styles */
.fcm-has-submenu {
  position: relative;
}

.fcm-has-submenu:hover > .fcm-submenu {
  display: block !important;
}

.fcm-submenu {
  animation: fcmSubmenuIn 0.15s ease-out forwards;
}

@keyframes fcmSubmenuIn {
  0% { opacity: 0; transform: translateX(-8px); }
  100% { opacity: 1; transform: translateX(0); }
}

.fcm-submenu .fcm-item {
  padding: 8px 10px;
  border-radius: 6px;
  margin: 2px 0;
}

.fcm-submenu .fcm-item:hover {
  background: rgba(224, 64, 251, 0.1);
  transform: translateX(2px);
}

.fcm-submenu .fcm-item:hover::before {
  background: #e040fb;
}
`;
  document.head.appendChild(style);
}

// ============================================================================
// CONTEXT MENU ACTION HANDLERS
// ============================================================================

function copyPathToClipboard(path: string): void {
  navigator.clipboard.writeText(path).then(() => {
    console.log('Path copied to clipboard:', path);
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(30, 30, 35, 0.95);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 8px;
      padding: 10px 20px;
      color: #4caf50;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      z-index: 100002;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      animation: toastIn 0.3s ease forwards;
    `;
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg><span>Path copied to clipboard</span>`;
    
    // Add animation keyframes if not present
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes toastIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, 2000);
    
  }).catch((err: any) => {
    console.error('Failed to copy path:', err);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to copy path', 'error');
    }
  });
}

function copyPath(path: string): void {
  navigator.clipboard.writeText(path).then(() => {
    console.log('Path copied to clipboard:', path);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Path copied to clipboard', 'info');
    }
  }).catch((err: any) => {
    console.error('Failed to copy path:', err);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to copy path', 'error');
    }
  });
}

function copyRelativePath(path: string): void {
  const workspaceRoot = (window as any).fileSystem?.currentPath || '';
  
  let relativePath = path;
  if (workspaceRoot && path.startsWith(workspaceRoot)) {
    relativePath = path.substring(workspaceRoot.length).replace(/^[\\\/]/, '');
  }
  
  navigator.clipboard.writeText(relativePath).then(() => {
    console.log('Relative path copied:', relativePath);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Relative path copied', 'info');
    }
  }).catch((err: any) => {
    console.error('Failed to copy relative path:', err);
  });
}

// ============================================================================
// CONTEXT MENU ACTION FUNCTIONS
// ============================================================================

/**
 * Create a new file in the specified directory
 */
async function createNewFile(folderPath: string): Promise<void> {
  const fileName = prompt('Enter new file name:');
  if (!fileName) return;
  
  const newFilePath = `${folderPath}\\${fileName}`;
  
  try {
    await invoke('write_file', {
      path: newFilePath,
      content: ''
    });
    
    console.log('✅ New file created:', newFilePath);
    
    if ((window as any).showNotification) {
      (window as any).showNotification(`File "${fileName}" created`, 'success');
    }
    
    if ((window as any).fileExplorer?.refresh) {
      (window as any).fileExplorer.refresh();
    }
    
    setTimeout(() => handleFileOpen(newFilePath), 100);
    
  } catch (error) {
    console.error('❌ Failed to create file:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to create file', 'error');
    }
  }
}

/**
 * Create a new folder in the specified directory
 */
async function createNewFolder(parentPath: string): Promise<void> {
  const folderName = prompt('Enter new folder name:');
  if (!folderName) return;
  
  const newFolderPath = `${parentPath}\\${folderName}`;
  
  try {
    await invoke('create_directory', { path: newFolderPath });
    
    console.log('✅ New folder created:', newFolderPath);
    
    if ((window as any).showNotification) {
      (window as any).showNotification(`Folder "${folderName}" created`, 'success');
    }
    
    if ((window as any).fileExplorer?.refresh) {
      (window as any).fileExplorer.refresh();
    }
    
  } catch (error) {
    console.error('❌ Failed to create folder:', error);
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to create folder', 'error');
    }
  }
}

/**
 * Rename a file or folder
 */
async function renameItem(oldPath: string): Promise<void> {
  const pathParts = oldPath.split(/[\\/]/);
  const oldName = pathParts.pop() || '';
  const parentPath = pathParts.join(oldPath.includes('/') ? '/' : '\\');
  const projectName = parentPath.split(/[\\/]/).pop() || 'project';
  
  // Determine if it's a file or folder
  const isDirectory = document.querySelector(`[data-path="${CSS.escape(oldPath)}"]`)?.classList.contains('folder-item') ||
                      document.querySelector(`[data-path="${CSS.escape(oldPath)}"]`)?.classList.contains('directory') ||
                      document.querySelector(`[data-path="${CSS.escape(oldPath)}"]`)?.getAttribute('data-is-directory') === 'true';
  
  const iconEmoji = isDirectory ? '📁' : '✏️';
  
  // Create modal using DOM methods
  const overlay = document.createElement('div');
  overlay.className = 'fcm-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'fcm-modal';
  
  const header = document.createElement('div');
  header.className = 'fcm-modal-header';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'fcm-modal-icon ' + (isDirectory ? 'folder' : 'file');
  iconDiv.textContent = iconEmoji;
  iconDiv.style.fontSize = '20px';
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'fcm-modal-title';
  
  const heading = document.createElement('div');
  heading.className = 'fcm-modal-heading';
  heading.textContent = 'Rename ' + (isDirectory ? 'Folder' : 'File');
  
  const subtitle = document.createElement('div');
  subtitle.className = 'fcm-modal-subtitle';
  subtitle.textContent = 'in ' + projectName;
  
  titleDiv.appendChild(heading);
  titleDiv.appendChild(subtitle);
  header.appendChild(iconDiv);
  header.appendChild(titleDiv);
  
  const body = document.createElement('div');
  body.className = 'fcm-modal-body';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fcm-modal-input';
  input.value = oldName;
  input.placeholder = 'Enter new name';
  
  const hint = document.createElement('div');
  hint.className = 'fcm-modal-hint';
  hint.textContent = 'Enter the new name for this ' + (isDirectory ? 'folder' : 'file');
  
  body.appendChild(input);
  body.appendChild(hint);
  
  const footer = document.createElement('div');
  footer.className = 'fcm-modal-footer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fcm-modal-btn cancel';
  cancelBtn.textContent = 'Cancel';
  
  const primaryBtn = document.createElement('button');
  primaryBtn.className = 'fcm-modal-btn primary';
  primaryBtn.textContent = 'Rename';
  
  footer.appendChild(cancelBtn);
  footer.appendChild(primaryBtn);
  
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  
  injectModalStyles();
  document.body.appendChild(overlay);
  
  // Select filename without extension for files
  input.focus();
  if (!isDirectory && oldName.includes('.')) {
    const extIndex = oldName.lastIndexOf('.');
    input.setSelectionRange(0, extIndex);
  } else {
    input.select();
  }
  
  const closeModal = () => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  };
  
  const performRename = async () => {
    const newName = input.value.trim();
    if (!newName || newName === oldName) {
      closeModal();
      return;
    }
    
    const sep = oldPath.includes('/') ? '/' : '\\';
    const newPath = `${parentPath}${sep}${newName}`;
    
    try {
      await invoke('rename_file_or_folder', {
        oldPath: oldPath,
        newPath: newPath
      });
      
      console.log('✅ Item renamed:', oldPath, '→', newPath);
      showModalToast(`Renamed to "${newName}"`, 'success');
      
      // Trigger refresh
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to rename item:', error);
      showModalToast('Failed to rename item', 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  primaryBtn.addEventListener('click', performRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performRename();
    if (e.key === 'Escape') closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * Duplicate a file or folder
 */
async function duplicateItem(path: string): Promise<void> {
  const pathParts = path.split(/[\\/]/);
  const name = pathParts.pop() || '';
  const parentPath = pathParts.join(path.includes('/') ? '/' : '\\');
  const projectName = parentPath.split(/[\\/]/).pop() || 'project';
  
  // Generate default copy name
  const nameParts = name.split('.');
  const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
  const baseName = nameParts.join('.');
  const defaultName = `${baseName} copy${ext}`;
  
  // Determine if it's a file or folder
  const isDirectory = document.querySelector(`[data-path="${CSS.escape(path)}"]`)?.classList.contains('folder-item') ||
                      document.querySelector(`[data-path="${CSS.escape(path)}"]`)?.classList.contains('directory');
  
  // Create modal using DOM methods
  const overlay = document.createElement('div');
  overlay.className = 'fcm-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'fcm-modal';
  
  const header = document.createElement('div');
  header.className = 'fcm-modal-header';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'fcm-modal-icon duplicate';
  iconDiv.textContent = '📋';
  iconDiv.style.fontSize = '20px';
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'fcm-modal-title';
  
  const heading = document.createElement('div');
  heading.className = 'fcm-modal-heading';
  heading.textContent = 'Duplicate ' + (isDirectory ? 'Folder' : 'File');
  
  const subtitle = document.createElement('div');
  subtitle.className = 'fcm-modal-subtitle';
  subtitle.textContent = 'in ' + projectName;
  
  titleDiv.appendChild(heading);
  titleDiv.appendChild(subtitle);
  header.appendChild(iconDiv);
  header.appendChild(titleDiv);
  
  const body = document.createElement('div');
  body.className = 'fcm-modal-body';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fcm-modal-input';
  input.value = defaultName;
  input.placeholder = 'Enter name for duplicate';
  
  const hint = document.createElement('div');
  hint.className = 'fcm-modal-hint';
  hint.textContent = 'Enter name for the duplicate ' + (isDirectory ? 'folder' : 'file');
  
  body.appendChild(input);
  body.appendChild(hint);
  
  const footer = document.createElement('div');
  footer.className = 'fcm-modal-footer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fcm-modal-btn cancel';
  cancelBtn.textContent = 'Cancel';
  
  const primaryBtn = document.createElement('button');
  primaryBtn.className = 'fcm-modal-btn primary';
  primaryBtn.textContent = 'Duplicate';
  
  footer.appendChild(cancelBtn);
  footer.appendChild(primaryBtn);
  
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  
  injectModalStyles();
  document.body.appendChild(overlay);
  
  input.focus();
  input.select();
  
  const closeModal = () => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  };
  
  const performDuplicate = async () => {
    const newName = input.value.trim();
    if (!newName) {
      closeModal();
      return;
    }
    
    const sep = path.includes('/') ? '/' : '\\';
    const newPath = `${parentPath}${sep}${newName}`;
    
    try {
      await invoke('duplicate_file_or_folder', {
        sourcePath: path,
        targetPath: newPath
      });
      
      console.log('✅ Item duplicated:', path, '→', newPath);
      showModalToast(`Duplicated as "${newName}"`, 'success');
      
      // Trigger refresh
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to duplicate item:', error);
      showModalToast('Failed to duplicate item', 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  primaryBtn.addEventListener('click', performDuplicate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performDuplicate();
    if (e.key === 'Escape') closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * Delete a file or folder
 */
async function deleteItem(path: string): Promise<void> {
  const itemName = path.split(/[\\/]/).pop() || path;
  const parentPath = path.split(/[\\/]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
  const projectName = parentPath.split(/[\\/]/).pop() || 'project';
  
  // Determine if it's a file or folder
  const isDirectory = document.querySelector(`[data-path="${CSS.escape(path)}"]`)?.classList.contains('folder-item') ||
                      document.querySelector(`[data-path="${CSS.escape(path)}"]`)?.classList.contains('directory') ||
                      document.querySelector(`[data-path="${CSS.escape(path)}"]`)?.getAttribute('data-is-directory') === 'true';
  
  // Create modal using DOM methods
  const overlay = document.createElement('div');
  overlay.className = 'fcm-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'fcm-modal';
  
  const header = document.createElement('div');
  header.className = 'fcm-modal-header';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'fcm-modal-icon danger';
  iconDiv.textContent = '🗑️';
  iconDiv.style.fontSize = '20px';
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'fcm-modal-title';
  
  const heading = document.createElement('div');
  heading.className = 'fcm-modal-heading';
  heading.textContent = 'Delete ' + (isDirectory ? 'Folder' : 'File');
  
  const subtitle = document.createElement('div');
  subtitle.className = 'fcm-modal-subtitle';
  subtitle.textContent = 'from ' + projectName;
  
  titleDiv.appendChild(heading);
  titleDiv.appendChild(subtitle);
  header.appendChild(iconDiv);
  header.appendChild(titleDiv);
  
  const body = document.createElement('div');
  body.className = 'fcm-modal-body';
  
  const message = document.createElement('div');
  message.className = 'fcm-modal-message';
  message.innerHTML = `Are you sure you want to delete <strong>"${itemName}"</strong>?`;
  
  if (isDirectory) {
    const warning = document.createElement('div');
    warning.className = 'fcm-modal-warning';
    warning.style.marginTop = '12px';
    warning.textContent = '⚠️ This will delete all files inside the folder.';
    message.appendChild(warning);
  }
  
  const hint = document.createElement('div');
  hint.className = 'fcm-modal-hint danger';
  hint.textContent = 'This action cannot be undone.';
  
  body.appendChild(message);
  body.appendChild(hint);
  
  const footer = document.createElement('div');
  footer.className = 'fcm-modal-footer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fcm-modal-btn cancel';
  cancelBtn.textContent = 'Cancel';
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'fcm-modal-btn danger';
  deleteBtn.textContent = 'Delete';
  
  footer.appendChild(cancelBtn);
  footer.appendChild(deleteBtn);
  
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  
  injectModalStyles();
  document.body.appendChild(overlay);
  
  // Focus delete button
  deleteBtn.focus();
  
  const closeModal = () => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  };
  
  const performDelete = async () => {
    try {
      await invoke('delete_file_or_folder', { path: path });
      
      console.log('✅ Item deleted:', path);
      showModalToast(`Deleted "${itemName}"`, 'success');
      
      notifyFileDeleted(path);
      
      // Trigger refresh
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      showModalToast('Failed to delete item', 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  deleteBtn.addEventListener('click', performDelete);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') performDelete();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

// Toast notification for modals
function showModalToast(message: string, type: 'success' | 'error' = 'success'): void {
  const iconText = type === 'success' ? '✓' : '✕';
  
  const toast = document.createElement('div');
  toast.className = 'fcm-toast';
  toast.style.borderColor = type === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
  toast.style.color = type === 'success' ? '#4caf50' : '#f44336';
  
  const icon = document.createElement('span');
  icon.textContent = iconText;
  icon.style.fontWeight = 'bold';
  
  const text = document.createElement('span');
  text.textContent = message;
  
  toast.appendChild(icon);
  toast.appendChild(text);
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

// Inject modal styles
function injectModalStyles(): void {
  if (document.getElementById('fcm-modal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'fcm-modal-styles';
  style.textContent = `
/* Modal Overlay */
.fcm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100010;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  animation: fcmOverlayIn 0.2s ease forwards;
}

@keyframes fcmOverlayIn {
  to { opacity: 1; }
}

.fcm-modal-overlay.closing {
  animation: fcmOverlayOut 0.2s ease forwards;
}

@keyframes fcmOverlayOut {
  to { opacity: 0; }
}

/* Modal Container */
.fcm-modal {
  background: linear-gradient(135deg, #2a2a2e 0%, #1e1e22 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  min-width: 380px;
  max-width: 450px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3);
  transform: scale(0.95) translateY(-10px);
  animation: fcmModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  overflow: hidden;
}

@keyframes fcmModalIn {
  to { transform: scale(1) translateY(0); }
}

.fcm-modal-overlay.closing .fcm-modal {
  animation: fcmModalOut 0.15s ease forwards;
}

@keyframes fcmModalOut {
  to { transform: scale(0.95) translateY(-10px); opacity: 0; }
}

/* Modal Header */
.fcm-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px 16px;
}

.fcm-modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fcm-modal-icon.file {
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
}

.fcm-modal-icon.folder {
  background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
}

.fcm-modal-icon.duplicate {
  background: linear-gradient(135deg, #9575cd 0%, #7e57c2 100%);
}

.fcm-modal-icon.danger {
  background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
}

.fcm-modal-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.fcm-modal-title {
  flex: 1;
}

.fcm-modal-heading {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.02em;
}

.fcm-modal-subtitle {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

/* Modal Body */
.fcm-modal-body {
  padding: 0 24px 20px;
}

.fcm-modal-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 16px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.fcm-modal-input:focus {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.15);
  background: rgba(0, 0, 0, 0.4);
}

.fcm-modal-input::placeholder {
  color: #666;
}

.fcm-modal-hint {
  font-size: 11px;
  color: #666;
  margin-top: 10px;
  padding-left: 2px;
}

.fcm-modal-hint.danger {
  color: #ef5350;
}

.fcm-modal-message {
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
}

.fcm-modal-message strong {
  color: #fff;
  font-weight: 600;
}

.fcm-modal-warning {
  color: #ffb74d;
  font-size: 12px;
}

/* Modal Footer */
.fcm-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  background: rgba(0, 0, 0, 0.15);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.fcm-modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  font-family: inherit;
}

.fcm-modal-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #aaa;
}

.fcm-modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.fcm-modal-btn.primary {
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  color: #fff;
}

.fcm-modal-btn.primary:hover {
  background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.fcm-modal-btn.danger {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: #fff;
}

.fcm-modal-btn.danger:hover {
  background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(229, 57, 53, 0.3);
}

/* Toast */
.fcm-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(30, 30, 35, 0.95);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  z-index: 100020;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  animation: fcmToastIn 0.3s ease forwards;
}

@keyframes fcmToastIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.fcm-toast.hiding {
  animation: fcmToastOut 0.2s ease forwards;
}

@keyframes fcmToastOut {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

.fcm-toast svg {
  flex-shrink: 0;
}
`;
  document.head.appendChild(style);
}

/**
 * Show create new file/folder dialog
 */
function showCreateNewDialog(type: 'file' | 'folder', parentPath: string): void {
  console.log('🔍 DEBUG: showCreateNewDialog called', { type, parentPath });
  
  const projectName = parentPath.split(/[\\/]/).pop() || 'project';
  const isFolder = type === 'folder';
  const defaultName = isFolder ? 'new-folder' : 'example.ts';
  const iconEmoji = isFolder ? '📁' : '📄';
  
  console.log('🔍 DEBUG: Creating modal elements');
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fcm-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 100010;
    display: flex;
    align-items: center;
    justify-content: center;
    list-style: none !important;
    margin: 0;
    padding: 0;
  `;
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'fcm-modal';
  modal.style.cssText = `
    background: linear-gradient(135deg, #2a2a2e 0%, #1e1e22 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    min-width: 380px;
    max-width: 450px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    list-style: none !important;
    margin: 0;
    padding: 0;
  `;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 24px 16px;
    list-style: none !important;
    margin: 0;
  `;
  
  // Icon
  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: ${isFolder ? 'linear-gradient(135deg, #ffb74d 0%, #ffa726 100%)' : 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)'};
    list-style: none !important;
    margin: 0;
    padding: 0;
  `;
  iconDiv.textContent = iconEmoji;
  
  // Title container
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = `
    flex: 1;
    list-style: none !important;
    margin: 0;
    padding: 0;
  `;
  
  // Heading
  const heading = document.createElement('div');
  heading.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    letter-spacing: -0.02em;
    list-style: none !important;
    margin: 0;
    padding: 0;
  `;
  heading.textContent = 'New ' + (isFolder ? 'Folder' : 'File');
  
  // Subtitle
  const subtitle = document.createElement('div');
  subtitle.style.cssText = `
    font-size: 12px;
    color: #888;
    margin-top: 2px;
    list-style: none !important;
    padding: 0;
  `;
  subtitle.textContent = 'in ' + projectName;
  
  titleDiv.appendChild(heading);
  titleDiv.appendChild(subtitle);
  header.appendChild(iconDiv);
  header.appendChild(titleDiv);
  
  // Body
  const body = document.createElement('div');
  body.style.cssText = `
    padding: 0 24px 20px;
    list-style: none !important;
    margin: 0;
  `;
  
  // Input
  const input = document.createElement('input');
  input.type = 'text';
  input.value = defaultName;
  input.placeholder = 'Enter ' + (isFolder ? 'folder' : 'file') + ' name';
  input.style.cssText = `
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    list-style: none !important;
    margin: 0;
  `;
  
  // Hint
  const hint = document.createElement('div');
  hint.style.cssText = `
    font-size: 11px;
    color: #666;
    margin-top: 10px;
    padding-left: 2px;
    list-style: none !important;
  `;
  hint.textContent = isFolder ? 'Enter folder name' : 'Enter file name with extension (e.g., index.ts, styles.css)';
  
  body.appendChild(input);
  body.appendChild(hint);
  
  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 16px 24px 20px;
    background: rgba(0, 0, 0, 0.15);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    list-style: none !important;
    margin: 0;
  `;
  
  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.08);
    color: #aaa;
    list-style: none !important;
    margin: 0;
  `;
  
  // Primary button
  const primaryBtn = document.createElement('button');
  primaryBtn.textContent = 'Create';
  primaryBtn.style.cssText = `
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: #fff;
    list-style: none !important;
    margin: 0;
  `;
  
  footer.appendChild(cancelBtn);
  footer.appendChild(primaryBtn);
  
  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  
  // Add a style tag to reset any global styles that might affect the modal
  const resetStyle = document.createElement('style');
  resetStyle.textContent = `
    .fcm-modal-overlay, .fcm-modal-overlay * {
      list-style: none !important;
      list-style-type: none !important;
    }
    .fcm-modal-overlay *::before,
    .fcm-modal-overlay *::after {
      content: none !important;
    }
  `;
  overlay.appendChild(resetStyle);
  
  document.body.appendChild(overlay);
  
  console.log('🔍 DEBUG: Modal HTML:', modal.outerHTML);
  
  // Focus and select input
  input.focus();
  input.select();
  
  const closeModal = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  };
  
  const performCreate = async () => {
    const name = input.value.trim();
    if (!name) {
      closeModal();
      return;
    }
    
    const sep = parentPath.includes('/') ? '/' : '\\';
    const newPath = parentPath + sep + name;
    
    console.log('🔍 DEBUG: Creating', type, 'at', newPath);
    
    try {
      if (isFolder) {
        await invoke('create_directory', { path: newPath });
        console.log('✅ Folder created:', newPath);
        showModalToast('Created folder "' + name + '"', 'success');
      } else {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(newPath, '');
        console.log('✅ File created:', newPath);
        showModalToast('Created file "' + name + '"', 'success');
        handleFileOpen(newPath);
      }
      
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      console.error('❌ Failed to create ' + type + ':', error);
      showModalToast('Failed to create ' + type, 'error');
    }
    
    closeModal();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  primaryBtn.addEventListener('click', performCreate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performCreate();
    if (e.key === 'Escape') closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

/**
 * Open file in a new tab
 */
function openInNewTab(filePath: string): void {
  console.log('📂 Opening file in new tab:', filePath);
  
  const event = new CustomEvent('open-in-new-tab', {
    detail: { path: filePath }
  });
  document.dispatchEvent(event);
  
  handleFileOpen(filePath);
  
  if ((window as any).showNotification) {
    const fileName = filePath.split(/[\\/]/).pop() || 'file';
    (window as any).showNotification(`Opening "${fileName}" in new tab`, 'info');
  }
}

// ============================================================================
// FILE EXPLORER INTEGRATION
// ============================================================================

/**
 * Show file in Windows Explorer (reveals the file in its containing folder)
 */
// Alias for revealInFileExplorer
async function revealInFileExplorer(path: string): Promise<void> {
  return showFileInFolder(path);
}

async function showFileInFolder(filePath: string): Promise<void> {
  console.log('📂 Showing file in folder:', filePath);
  
  try {
    if ((window as any).__TAURI__) {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Call Tauri command to reveal file in Explorer
      // This will open Explorer and select/highlight the file
      await invoke('reveal_in_explorer', { path: filePath });
      
      console.log('✅ Revealed file in Explorer:', filePath);
      
      // Show notification if available
      if ((window as any).showNotification) {
        const fileName = filePath.split(/[\\/]/).pop() || 'file';
        (window as any).showNotification(`Showing "${fileName}" in folder`, 'success');
      }
    } else {
      console.warn('⚠️ Tauri not available - cannot open Explorer');
      
      if ((window as any).showNotification) {
        (window as any).showNotification('Desktop app required to show in folder', 'warning');
      }
    }
  } catch (error) {
    console.error('❌ Failed to show file in folder:', error);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to show in folder', 'error');
    }
  }
}


async function openFolderInExplorer(folderPath: string): Promise<void> {
  console.log('📂 Opening folder in Explorer:', folderPath);
  
  try {
    // Check if Tauri is available
    if ((window as any).__TAURI__) {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Call Tauri command to reveal folder in Explorer
      await invoke('reveal_in_explorer', { path: folderPath });
      
      console.log('✅ Opened in Explorer:', folderPath);
      
      // Show notification if available
      if ((window as any).showNotification) {
        const folderName = folderPath.split(/[\\/]/).pop() || 'folder';
        (window as any).showNotification(`Opened "${folderName}" in Explorer`, 'success');
      }
    } else {
      console.warn('⚠️ Tauri not available - cannot open Explorer');
      
      if ((window as any).showNotification) {
        (window as any).showNotification('Desktop app required to open Explorer', 'warning');
      }
    }
  } catch (error) {
    console.error('❌ Failed to open folder in Explorer:', error);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('Failed to open Explorer', 'error');
    }
  }
}


function toggleFolder(folderPath: string): void {
  console.log('📂 Toggle folder:', folderPath);
  
  try {
    // Instead of CSS selectors, just iterate and compare directly
    const allFolders = document.querySelectorAll('.folder-item, .directory, .tree-folder');
    console.log('📊 Total folders found:', allFolders.length);
    
    let folderElement: HTMLElement | null = null;
    
    // Search for the folder by comparing data-path directly
    for (const folder of allFolders) {
      const el = folder as HTMLElement;
      const dataPath = el.getAttribute('data-path');
      
      // Direct string comparison (no CSS escaping issues!)
      if (dataPath === folderPath) {
        console.log('✅ Found folder by direct comparison!');
        console.log('   Path:', dataPath);
        folderElement = el;
        break;
      }
    }
    
    if (!folderElement) {
      console.error('❌ Folder not found:', folderPath);
      console.log('📁 Available folder paths:');
      allFolders.forEach((folder, i) => {
        if (i < 10) {  // Show first 10
          const path = folder.getAttribute('data-path');
          console.log(`   ${i}: ${path}`);
        }
      });
      return;
    }
    
    console.log('✅ Folder element found!');
    toggleFolderElement(folderElement, folderPath);
    
  } catch (error) {
    console.error('❌ Failed to toggle folder:', error);
  }
}

/**
 * Helper function to actually toggle a folder element
 */
function toggleFolderElement(folderElement: HTMLElement, folderPath: string): void {
  console.log('📊 Toggling folder:', {
    className: folderElement.className,
    dataPath: folderElement.getAttribute('data-path'),
    textContent: folderElement.textContent?.trim()
  });
  
  // Set flag to prevent single-click handler from triggering
  isTogglingFolder = true;
  
  // Check if folder is currently expanded
  const isExpanded = folderElement.classList.contains('expanded') || 
                     folderElement.classList.contains('open') ||
                     folderElement.getAttribute('data-expanded') === 'true';
  
  console.log('📊 Current state:', isExpanded ? 'expanded' : 'collapsed');
  
  // Toggle the expanded state
  if (isExpanded) {
    folderElement.classList.remove('expanded', 'open');
    folderElement.setAttribute('data-expanded', 'false');
    console.log('📁 Collapsing folder...');
  } else {
    folderElement.classList.add('expanded', 'open');
    folderElement.setAttribute('data-expanded', 'true');
    console.log('📂 Expanding folder...');
  }
  
  // Find children by looking for files/folders with paths that start with this folder's path
  const allItems = document.querySelectorAll('.file-item, .folder-item');
  let childrenFound = 0;
  
  allItems.forEach((item) => {
    const el = item as HTMLElement;
    const itemPath = el.getAttribute('data-path') || '';
    
    // Check if this item is a child of the current folder
    if (itemPath !== folderPath && itemPath.startsWith(folderPath)) {
      // Count path segments to determine if it's a direct child
      const folderSegments = folderPath.split(/[\\/]/).length;
      const itemSegments = itemPath.split(/[\\/]/).length;
      
      // Direct child: exactly one more segment
      if (itemSegments === folderSegments + 1) {
        childrenFound++;
        
        if (isExpanded) {
          // Collapse: hide child
          el.style.display = 'none';
          console.log('  👁️ Hiding:', itemPath.split(/[\\/]/).pop());
        } else {
          // Expand: show child
          el.style.display = '';
          console.log('  👁️ Showing:', itemPath.split(/[\\/]/).pop());
        }
      }
    }
  });
  
  console.log(`✅ Toggled ${childrenFound} children`);
  
  // Try to find and click toggle element (if it exists)
  const toggleSelectors = [
    '.folder-toggle',
    '.tree-toggle', 
    '.chevron',
    '.arrow',
    '[class*="toggle"]',
    '[class*="chevron"]',
    '[class*="arrow"]'
  ];
  
  let toggle: HTMLElement | null = null;
  
  for (const selector of toggleSelectors) {
    toggle = folderElement.querySelector(selector) as HTMLElement;
    if (toggle) {
      console.log('✅ Found toggle element, updating it...');
      // Update toggle icon
      if (isExpanded) {
        toggle.textContent = '▶'; // Collapsed
      } else {
        toggle.textContent = '▼'; // Expanded
      }
      break;
    }
  }
  
  // Update folder icon
  const folderIcon = folderElement.querySelector('span:first-child');
  if (folderIcon && folderIcon.textContent === '📁' || folderIcon?.textContent === '📂') {
    folderIcon.textContent = isExpanded ? '📁' : '📂';
  }
  
  // Reset flag after a short delay
  setTimeout(() => {
    isTogglingFolder = false;
  }, 100);
  
  // Visual feedback - blue highlight for 500ms
  const originalBg = folderElement.style.backgroundColor;
  folderElement.style.backgroundColor = 'rgba(0, 120, 215, 0.3)';
  folderElement.style.transition = 'background-color 0.3s ease';
  
  setTimeout(() => {
    folderElement.style.backgroundColor = originalBg;
  }, 500);
  
  // Scroll into view
  folderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  console.log('✅ Folder toggle complete');
}

/**
 * Enable single-click to open files and folders
 */
function enableSingleClickOpen(): void {
  console.log('📂 Enabling single-click to open files/folders...');
  
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.warn('File tree not found');
    return;
  }
  
  // Add click handler to file tree
  fileTree.addEventListener('click', (e: Event) => {
    // Ignore if we're in the middle of toggling from menu
    if (isTogglingFolder) {
      console.log('⏭️ Skipping single-click (toggle in progress)');
      return;
    }
    
    const target = e.target as HTMLElement;
    const fileItem = target.closest('.file-item, .folder-item, .tree-file, .tree-folder') as HTMLElement;
    
    if (!fileItem) return;
    
    const path = fileItem.getAttribute('data-path') || '';
    const isDirectory = fileItem.classList.contains('folder-item') || 
                       fileItem.classList.contains('tree-folder') ||
                       fileItem.getAttribute('data-is-directory') === 'true';
    
    if (!path) return;
    
    if (isDirectory) {
      console.log('📂 Single-click folder:', path);
      toggleFolder(path);
    } else {
      console.log('📄 Single-click file:', path);
      handleFileOpen(path);
    }
  });
  
  console.log('✅ Single-click open enabled');
}


export function initializeFileClickHandlers(): void {
  console.log('🚀 Initializing all file click handlers...');
  
  setupFileClickHandlers();
  setupKeyboardNavigation();
  setupDragAndDrop();
  setupContextMenu();
  
  console.log('✅ All file click handlers initialized successfully');
}