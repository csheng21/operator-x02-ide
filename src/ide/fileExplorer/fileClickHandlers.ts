// src/ide/fileExplorer/fileClickHandlers.ts
import { setSelectedFolder } from '../explorerButtons';
import { FileNode } from './types';
import { FileTreeGenerator } from '../../fileOperations/treeGenerator';
import { invoke } from '@tauri-apps/api/core';
import { notifyFileDeleted } from '../../editor/fileDeletionHandler';
// ✅ SVN Integration
import { svnManager } from '../svn/svnManager';
import { enhancedSvnUI } from '../svn/svnUIEnhanced';
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
 * ⭐ NEW: Send to AI with collapsible response panel
 * Shows response in a professional collapsible panel instead of raw text
 */
async function sendToAIWithCollapsibleResponse(
  prompt: string, 
  fileName: string, 
  analysisType: string,
  analysisLabel: string
): Promise<void> {
  console.log('📤 [AI Analysis] Sending with collapsible response:', analysisType);
  
  // Inject styles
  injectCollapsibleMessageStyles();
  injectAIAnalysisPanelStyles();
  
  // Get chat container
  const container = document.querySelector('.ai-chat-container') as HTMLElement ||
                   document.querySelector('.chat-messages') as HTMLElement;
  
  if (!container) {
    console.error('[AI Analysis] No chat container found');
    // Fallback to regular sendToAI
    await sendToAI(prompt, fileName, analysisLabel);
    return;
  }
  
  // Add user message (collapsed)
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.innerHTML = `
    <div class="ai-message-content" style="padding: 10px 14px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">📊</span>
        <strong style="color: #58a6ff;">${analysisLabel}</strong>
        <code style="background: rgba(110,118,129,0.3); padding: 2px 8px; border-radius: 4px; font-size: 12px;">${fileName}</code>
      </div>
    </div>`;
  container.appendChild(userDiv);
  
  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message assistant-message';
  loadingDiv.innerHTML = `
    <div style="background:#0d0d14;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);box-shadow:0 2px 12px rgba(0,0,0,0.3);animation:faPanelIn 0.3s ease;">
      <div style="padding:8px 12px;background:linear-gradient(135deg,rgba(79,195,247,0.05),rgba(139,92,246,0.03));border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:8px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:-100%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(79,195,247,0.03),transparent);animation:faShimmer 3s ease-in-out infinite;"></div>
        <div style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#1a365d,#2b6cb0);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(66,153,225,0.2);z-index:1;flex-shrink:0;">
          <div style="width:10px;height:10px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:faSpin 0.7s linear infinite;"></div>
        </div>
        <div style="z-index:1;flex:1;min-width:0;">
          <div style="font-weight:600;color:#ddd;font-size:11px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Analyzing <code style="background:rgba(255,255,255,0.07);padding:0 4px;border-radius:3px;font-size:10px;color:#4fc3f7;">${fileName}</code></div>
          <div style="font-size:9px;color:#555;margin-top:1px;letter-spacing:0.3px;">${analysisLabel}</div>
        </div>
        <div style="display:flex;align-items:center;gap:3px;padding:2px 6px;background:rgba(79,195,247,0.07);border:1px solid rgba(79,195,247,0.1);border-radius:10px;font-size:8px;color:#4fc3f7;font-weight:500;z-index:1;flex-shrink:0;">
          <span style="width:4px;height:4px;border-radius:50%;background:#4fc3f7;animation:faDotGlow 1.5s ease-in-out infinite;"></span>
          Operator X02
        </div>
      </div>
      <div style="padding:8px 12px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#4fc3f7;">
          <span style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.15);font-size:7px;animation:faSpin 0.7s linear infinite;">&#9694;</span>
          Reading file content...
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#444;">
          <span style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);font-size:7px;">&#9675;</span>
          AI processing...
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#444;">
          <span style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);font-size:7px;">&#9675;</span>
          Generating report...
        </div>
      </div>
      <div style="margin:0 12px 6px;height:2px;background:rgba(255,255,255,0.03);border-radius:1px;overflow:hidden;">
        <div style="height:100%;width:30%;background:linear-gradient(90deg,#2b6cb0,#4fc3f7);border-radius:1px;animation:faProgress 2s ease-in-out infinite;"></div>
      </div>
    </div>
    <style>
      @keyframes faSpin{to{transform:rotate(360deg)}}
      @keyframes faPanelIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes faShimmer{0%,100%{left:-100%}50%{left:100%}}
      @keyframes faDotGlow{0%,100%{box-shadow:0 0 2px rgba(79,195,247,0.3)}50%{box-shadow:0 0 5px rgba(79,195,247,0.6)}}
      @keyframes faProgress{0%{width:10%;margin-left:0}50%{width:50%;margin-left:25%}100%{width:10%;margin-left:90%}}
    </style>`;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  
  try {
    // Try to get AI response using available methods
    let response = '';
    
    // Method 1: Direct API call via Tauri
    if ((window as any).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const config = getAIConfig();
        
        response = await invoke('call_ai_api', {
          provider: config.provider || 'groq',
          apiKey: config.apiKey,
          baseUrl: config.apiBaseUrl || '',
          model: config.model || '',
          message: prompt,
          maxTokens: 2000,
          temperature: 0.7
        }) as string;
        
        console.log('✅ [AI Analysis] Got response via Tauri invoke');
      } catch (e) {
        console.log('[AI Analysis] Tauri invoke failed, trying other methods...', e);
      }
    }
    
    // Method 2: Use window.aiAssistant if no response yet
    if (!response && (window as any).aiAssistant?.callAPI) {
      try {
        response = await (window as any).aiAssistant.callAPI(prompt);
        console.log('✅ [AI Analysis] Got response via aiAssistant.callAPI');
      } catch (e) {
        console.log('[AI Analysis] aiAssistant.callAPI failed', e);
      }
    }
    
    // Method 3: Fallback to regular sendToAI (won't get response back)
    if (!response) {
      console.log('[AI Analysis] No direct API access, falling back to sendToAI');
      loadingDiv.remove();
      await sendToAI(prompt, fileName, analysisLabel);
      return;
    }
    
    // Render the response in a collapsible panel
    loadingDiv.innerHTML = createCollapsibleAnalysisPanel(response, analysisType, fileName);
    container.scrollTop = container.scrollHeight;
    
  } catch (error: any) {
    console.error('[AI Analysis] Error:', error);
    loadingDiv.innerHTML = `
      <div style="color: #f85149; padding: 12px 16px;">
        ❌ Analysis failed: ${error.message || 'Unknown error'}
      </div>`;
  }
}

/**
 * Get AI API configuration
 */
function getAIConfig(): any {
  try {
    const stored = localStorage.getItem('aiApiConfig');
    if (stored) return JSON.parse(stored);
  } catch {}
  try {
    const ide = JSON.parse(localStorage.getItem('ai-ide-api-configuration') || '{}');
    if (ide.apiKey) return ide;
  } catch {}
  return { provider: 'groq', apiKey: localStorage.getItem('apiKey') || '' };
}

/**
 * Create collapsible analysis panel HTML
 */
function createCollapsibleAnalysisPanel(response: string, analysisType: string, fileName: string): string {
  const panelId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const lines = response.split('\n');
  const lineCount = lines.length;
  const shouldCollapse = lineCount > 5;
  
  // Format the response with proper styling
  const formattedContent = formatAnalysisResponse(response);
  const previewContent = formatAnalysisResponse(lines.slice(0, 3).join('\n'));
  
  // Type labels and colors
  const typeInfo: Record<string, { label: string; color: string; icon: string }> = {
    explain: { label: 'EXPLANATION', color: '#4fc3f7', icon: '📖' },
    summary: { label: 'SUMMARY', color: '#81c784', icon: '📋' },
    architecture: { label: 'ARCHITECTURE', color: '#ce93d8', icon: '🏗️' },
    dependencies: { label: 'DEPENDENCIES', color: '#ffb74d', icon: '🔗' },
    comprehensive: { label: 'FULL ANALYSIS', color: '#90caf9', icon: '🔍' }
  };
  
  const info = typeInfo[analysisType] || { label: 'ANALYSIS', color: '#90caf9', icon: '🔍' };
  
  if (!shouldCollapse) {
    return `
      <div class="ai-analysis-panel" data-panel-id="${panelId}">
        <div class="ai-analysis-header">
          <span class="ai-analysis-icon">${info.icon}</span>
          <span class="ai-analysis-label" style="color: ${info.color};">${info.label}</span>
          <span class="ai-analysis-file">${fileName}</span>
          <span class="ai-analysis-lines">${lineCount} lines</span>
        </div>
        <div class="ai-analysis-content">${formattedContent}</div>
      </div>`;
  }
  
  return `
    <div class="ai-analysis-panel collapsible" data-panel-id="${panelId}" data-collapsed="true">
      <div class="ai-analysis-header">
        <span class="ai-analysis-icon">${info.icon}</span>
        <span class="ai-analysis-label" style="color: ${info.color};">${info.label}</span>
        <span class="ai-analysis-file">${fileName}</span>
        <span class="ai-analysis-lines">${lineCount} lines</span>
      </div>
      <div class="ai-analysis-content">
        <div class="ai-analysis-preview">${previewContent}</div>
        <div class="ai-analysis-full">${formattedContent}</div>
      </div>
      <div class="ai-analysis-expand-bar" onclick="toggleAnalysisPanel('${panelId}')">
        <button class="ai-analysis-expand-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span class="expand-text">Show all ${lineCount} lines</span>
        </button>
      </div>
    </div>`;
}

/**
 * Format analysis response with markdown styling
 */
function formatAnalysisResponse(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #e6edf3;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="analysis-h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="analysis-h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="analysis-h1">$1</div>')
    .replace(/^[-*] (.+)$/gm, '<div class="analysis-bullet">• $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="analysis-numbered">$1. $2</div>')
    .replace(/\n/g, '<br>');
}

/**
 * Inject AI Analysis panel styles
 */
function injectAIAnalysisPanelStyles(): void {
  if (document.getElementById('ai-analysis-panel-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-analysis-panel-styles';
  style.textContent = `
    .ai-analysis-panel {
      background: rgba(30, 30, 30, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      margin: 8px 0;
      overflow: hidden;
    }
    
    .ai-analysis-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    .ai-analysis-icon { font-size: 14px; }
    .ai-analysis-label { font-weight: 600; font-size: 12px; text-transform: uppercase; }
    .ai-analysis-file { 
      background: rgba(110, 118, 129, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: #8b949e;
      font-family: monospace;
    }
    .ai-analysis-lines { 
      margin-left: auto;
      color: #6e7681;
      font-size: 11px;
    }
    
    .ai-analysis-content {
      padding: 14px 16px;
      font-size: 13px;
      line-height: 1.6;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .ai-analysis-panel[data-collapsed="true"] .ai-analysis-content {
      max-height: 80px;
      overflow: hidden;
    }
    
    .ai-analysis-panel[data-collapsed="true"] .ai-analysis-full { display: none; }
    .ai-analysis-panel[data-collapsed="false"] .ai-analysis-preview { display: none; }
    
    .ai-analysis-expand-bar {
      display: flex;
      justify-content: center;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
    }
    
    .ai-analysis-expand-bar:hover {
      background: rgba(0, 0, 0, 0.3);
    }
    
    .ai-analysis-expand-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: #58a6ff;
      font-size: 12px;
      cursor: pointer;
    }
    
    .ai-analysis-expand-btn svg {
      transition: transform 0.2s;
    }
    
    .ai-analysis-panel[data-collapsed="false"] .ai-analysis-expand-btn svg {
      transform: rotate(180deg);
    }
    
    .analysis-h1 { color: #58a6ff; font-weight: 700; font-size: 16px; margin: 16px 0 8px; }
    .analysis-h2 { color: #58a6ff; font-weight: 600; font-size: 14px; margin: 14px 0 6px; }
    .analysis-h3 { color: #79c0ff; font-weight: 600; font-size: 13px; margin: 12px 0 4px; }
    .analysis-bullet { padding-left: 16px; margin: 4px 0; }
    .analysis-numbered { padding-left: 16px; margin: 4px 0; }
    
    .inline-code {
      background: rgba(110, 118, 129, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
  `;
  document.head.appendChild(style);
}

// Global toggle function for analysis panels
(window as any).toggleAnalysisPanel = function(panelId: string) {
  const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
  if (!panel) return;
  
  const isCollapsed = panel.getAttribute('data-collapsed') === 'true';
  panel.setAttribute('data-collapsed', isCollapsed ? 'false' : 'true');
  
  const expandText = panel.querySelector('.expand-text');
  if (expandText) {
    const lineCount = panel.querySelector('.ai-analysis-lines')?.textContent || '';
    expandText.textContent = isCollapsed ? 'Collapse' : `Show all ${lineCount}`;
  }
};

/**
 * Helper function to send prompt to AI assistant
 * Sends as a COLLAPSIBLE message - shows summary, expands on click
 */
async function sendToAI(prompt: string, fileName: string, analysisType: string = 'analysis'): Promise<void> {
  console.log('📤 Sending to AI:', prompt.substring(0, 100) + '...');
  
  // Inject collapsible message styles if not present
  injectCollapsibleMessageStyles();
  
  // Create a summary for the collapsed view
  const summaryText = `🤖 Analyzing: ${fileName} (${analysisType})`;
  
  // Method 1: Use window.aiAssistant.sendMessage with collapsible wrapper
  if ((window as any).aiAssistant && typeof (window as any).aiAssistant.sendMessage === 'function') {
    // Send the full prompt but add custom handler for display
    (window as any).aiAssistant.sendMessage(prompt);
    console.log('✅ Sent via aiAssistant.sendMessage');
    
    // Make the last user message collapsible after a short delay
    setTimeout(() => makeLastUserMessageCollapsible(summaryText), 100);
    
    if ((window as any).showNotification) {
      (window as any).showNotification('AI analysis started - check AI panel', 'success');
    }
    return;
  }
  
  // Method 2: Use the AI input field and send button
  const aiInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement ||
                  document.getElementById('user-input') as HTMLTextAreaElement ||
                  document.querySelector('.ai-input') as HTMLTextAreaElement ||
                  document.querySelector('[data-ai-input]') as HTMLTextAreaElement;
  
  if (aiInput) {
    // Clear and set value
    aiInput.value = '';
    await new Promise(resolve => setTimeout(resolve, 50));
    aiInput.value = prompt;
    aiInput.focus();
    
    // Trigger input events
    aiInput.dispatchEvent(new Event('input', { bubbles: true }));
    aiInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find and click send button
    const sendBtn = document.getElementById('send-btn') ||
                   document.querySelector('.send-button') as HTMLButtonElement ||
                   document.querySelector('[data-send-button]') as HTMLButtonElement ||
                   document.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (sendBtn) {
      sendBtn.click();
      console.log('✅ Sent via input field + send button');
      
      // Make the last user message collapsible after a short delay
      setTimeout(() => makeLastUserMessageCollapsible(summaryText), 200);
      
      if ((window as any).showNotification) {
        (window as any).showNotification('AI analysis started - check AI panel', 'success');
      }
      
      // Scroll chat to bottom after a delay
      setTimeout(() => {
        const chatContainer = document.querySelector('.ai-chat-container') as HTMLElement ||
                             document.querySelector('.chat-messages') as HTMLElement;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 500);
      return;
    }
  }
  
  // Method 3: Dispatch custom event
  const aiEvent = new CustomEvent('ai-send-message', {
    detail: { message: prompt, fileName: fileName }
  });
  document.dispatchEvent(aiEvent);
  console.log('📢 Dispatched ai-send-message event');
  
  // Method 4: Try window.sendAIMessage
  if ((window as any).sendAIMessage && typeof (window as any).sendAIMessage === 'function') {
    (window as any).sendAIMessage(prompt);
    console.log('✅ Sent via window.sendAIMessage');
    setTimeout(() => makeLastUserMessageCollapsible(summaryText), 100);
    if ((window as any).showNotification) {
      (window as any).showNotification('AI analysis started', 'success');
    }
    return;
  }
  
  // If nothing worked, show warning
  console.warn('⚠️ Could not find AI assistant to send message');
  console.log('📋 Prompt ready:', prompt);
  
  if ((window as any).showNotification) {
    (window as any).showNotification('AI Assistant not available - check console for prompt', 'warning');
  }
  
  // Copy to clipboard as fallback
  try {
    await navigator.clipboard.writeText(prompt);
    if ((window as any).showNotification) {
      (window as any).showNotification('Prompt copied to clipboard', 'info');
    }
  } catch (e) {
    console.log('Could not copy to clipboard');
  }
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
  separator.style.scrollSnapAlign = 'start';
  menu.appendChild(separator);
  
  // Create AI Analysis submenu trigger
  const aiMenuItem = document.createElement('div');
  aiMenuItem.className = 'fcm-item fcm-has-submenu';
  aiMenuItem.style.cssText = 'position: relative; scroll-snap-align: start;';
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
          
          // ⭐ FIX: Add format instruction for collapsible display
          const formatInstruction = '\n\n**IMPORTANT:** Format your response with clear sections using markdown headers (##) and bullet points. Keep it well-structured.';
          
          let prompt = '';
          switch (opt.type) {
            case 'explain':
              prompt = `Please explain this file in detail:\n\n**File:** \`${fileName}\`\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide a clear explanation of what this code does, its purpose, and key functionality.${formatInstruction}`;
              break;
            case 'summary':
              prompt = `Provide a high-level summary:\n\n**File:** \`${fileName}\`\n\n\`\`\`\n${content}\n\`\`\`\n\nGive a concise summary of the file's purpose and main components.${formatInstruction}`;
              break;
            case 'architecture':
              prompt = `Analyze the architecture:\n\n**File:** \`${fileName}\`\n\n\`\`\`\n${content}\n\`\`\`\n\nDescribe architectural patterns, design choices, and structure.${formatInstruction}`;
              break;
            case 'dependencies':
              prompt = `Analyze dependencies:\n\n**File:** \`${fileName}\`\n\n\`\`\`\n${content}\n\`\`\`\n\nList all dependencies, imports, and external references with their purpose.${formatInstruction}`;
              break;
            case 'comprehensive':
              prompt = `Perform comprehensive analysis:\n\n**File:** \`${fileName}\`\n\n\`\`\`\n${content}\n\`\`\`\n\nProvide:\n1. Purpose and functionality\n2. Architecture and patterns\n3. Dependencies\n4. Code quality observations\n5. Potential improvements${formatInstruction}`;
              break;
          }
          
          // Send to AI - use collapsible response handler
      (window as any).__analysisMode = true; // disable auto-apply during analysis
          (window as any).__analysisMode = true; await sendToAIWithCollapsibleResponse(prompt, fileName, opt.type, opt.label);
          
        } else {
          // For FOLDERS - generate tree and show analysis dialog
          const treeText = await FileTreeGenerator.generateTreeText(path, {
            maxDepth: 5,
            includeFiles: true,
            includeFolders: true,
            showSize: false,
            showDate: false
          });
          const folderName = path.split(/[\\/]/).pop() || 'folder';
          showAnalysisTypeDialog(folderName, treeText, path);
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
      top = rect.bottom - submenuRect.height; if (top < 10) { top = 10; }
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
  setTimeout(() => document.addEventListener("click", (e) => { if (e.button !== 2) removeOnClick(e); }, { once: true }), 100);
  
  menu.appendChild(aiMenuItem);
}

/**
 * Show enhanced context menu with tree generator and AI options
 * Professional UI with animations
 */
function showEnhancedContextMenu(x: number, y: number, path: string, isDirectory: boolean): void {
  // Close any existing menus (both old and new)
  const existingMenu = document.querySelector('.file-context-menu');
  if (existingMenu) {
    existingMenu.classList.add('closing');
    existingMenu.remove();
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
  
  // ✅ Create scrollable container for menu items
  // Initially no max-height to measure natural size
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'fcm-scroll-container';
  scrollContainer.style.cssText = `
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.2) transparent;
  `;
  
  // Create scroll indicators
  const scrollUpIndicator = document.createElement('div');
  scrollUpIndicator.className = 'fcm-scroll-indicator fcm-scroll-up';
  scrollUpIndicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"/></svg>`;
  scrollUpIndicator.style.cssText = `
    display: none;
    justify-content: center;
    align-items: center;
    padding: 4px;
    color: #888;
    font-size: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: pointer;
    transition: all 0.15s ease;
  `;
  scrollUpIndicator.addEventListener('click', () => {
    scrollContainer.scrollBy({ top: -40, behavior: 'smooth' });
  });
  scrollUpIndicator.addEventListener('mouseenter', () => {
    scrollUpIndicator.style.background = 'rgba(255,255,255,0.05)';
    scrollUpIndicator.style.color = '#fff';
  });
  scrollUpIndicator.addEventListener('mouseleave', () => {
    scrollUpIndicator.style.background = 'transparent';
    scrollUpIndicator.style.color = '#888';
  });
  
  const scrollDownIndicator = document.createElement('div');
  scrollDownIndicator.className = 'fcm-scroll-indicator fcm-scroll-down';
  scrollDownIndicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>`;
  scrollDownIndicator.style.cssText = `
    display: none;
    justify-content: center;
    align-items: center;
    padding: 4px;
    color: #888;
    font-size: 10px;
    border-top: 1px solid rgba(255,255,255,0.06);
    cursor: pointer;
    transition: all 0.15s ease;
  `;
  scrollDownIndicator.addEventListener('click', () => {
    scrollContainer.scrollBy({ top: 40, behavior: 'smooth' });
  });
  scrollDownIndicator.addEventListener('mouseenter', () => {
    scrollDownIndicator.style.background = 'rgba(255,255,255,0.05)';
    scrollDownIndicator.style.color = '#fff';
  });
  scrollDownIndicator.addEventListener('mouseleave', () => {
    scrollDownIndicator.style.background = 'transparent';
    scrollDownIndicator.style.color = '#888';
  });
  
  // Update scroll indicators based on scroll position
  const updateScrollIndicators = () => {
    const canScrollUp = scrollContainer.scrollTop > 5;
    const canScrollDown = scrollContainer.scrollTop < (scrollContainer.scrollHeight - scrollContainer.clientHeight - 5);
    
    scrollUpIndicator.style.display = canScrollUp ? 'flex' : 'none';
    scrollDownIndicator.style.display = canScrollDown ? 'flex' : 'none';
  };
  
  scrollContainer.addEventListener('scroll', updateScrollIndicators);
  
  // Menu items configuration
  const menuItems: Array<{
    label: string;
    icon: string;
    action: () => void;
    separator?: boolean;
    disabled?: boolean;
    shortcut?: string;
    className?: string;
    hasSubmenu?: boolean;
    submenuItems?: Array<{label: string; icon: string; action: () => void; shortcut?: string; className?: string}>;
    submenuColor?: string;
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
      // ✅ CREATE SUBMENU (for folders)
      {
        label: 'Create',
        icon: CONTEXT_ICONS.newFile,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#4caf50',
        submenuItems: [
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
          }
        ]
      },
      // ✅ NAVIGATE SUBMENU (for folders)
      {
        label: 'Navigate',
        icon: CONTEXT_ICONS.reveal,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#2196f3',
        submenuItems: [
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
          },
          {
            label: 'Copy Path',
            icon: CONTEXT_ICONS.copy,
            action: () => copyPathToClipboard(path)
          }
        ]
      },
      // ✅ EDIT SUBMENU (for folders)
      {
        label: 'Edit',
        icon: CONTEXT_ICONS.rename,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#ff9800',
        submenuItems: [
          {
            label: 'Rename',
            icon: CONTEXT_ICONS.rename,
            shortcut: 'F2',
            action: () => renameItem(path)
          },
          {
            label: 'Delete',
            icon: CONTEXT_ICONS.delete,
            shortcut: 'Del',
            className: 'danger',
            action: () => deleteItem(path)
          }
        ]
      },
      { separator: true, label: '', icon: '', action: () => {} },
      // Tree generator options
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
      { separator: true, label: '', icon: '', action: () => {} },
      // ✅ CREATE SUBMENU (for files)
      {
        label: 'Create',
        icon: CONTEXT_ICONS.newFile,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#4caf50',
        submenuItems: [
          {
            label: 'Duplicate',
            icon: CONTEXT_ICONS.duplicate,
            action: () => duplicateItem(path)
          },
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
          }
        ]
      },
      // ✅ NAVIGATE SUBMENU (for files)
      {
        label: 'Navigate',
        icon: CONTEXT_ICONS.reveal,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#2196f3',
        submenuItems: [
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
          },
          {
            label: 'Copy Path',
            icon: CONTEXT_ICONS.copy,
            action: () => copyPathToClipboard(path)
          }
        ]
      },
      // ✅ EDIT SUBMENU (for files)
      {
        label: 'Edit',
        icon: CONTEXT_ICONS.rename,
        action: () => {},
        hasSubmenu: true,
        submenuColor: '#ff9800',
        submenuItems: [
          {
            label: 'Rename',
            icon: CONTEXT_ICONS.rename,
            shortcut: 'F2',
            action: () => renameItem(path)
          },
          {
            label: 'Delete',
            icon: CONTEXT_ICONS.delete,
            shortcut: 'Del',
            className: 'danger',
            action: () => deleteItem(path)
          }
        ]
      }
    );
  }
  
  // ✅ Common items removed - now in Edit/Navigate submenus
  
  // Render menu items into scroll container
  menuItems.forEach((item, index) => {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'fcm-divider';
      separator.style.scrollSnapAlign = 'start';
      scrollContainer.appendChild(separator);
    } else if (item.hasSubmenu && item.submenuItems) {
      // ✅ Render item with submenu
      const menuItem = document.createElement('div');
      menuItem.className = 'fcm-item fcm-has-submenu';
      menuItem.style.animationDelay = `${index * 0.02}s`;
      menuItem.style.position = 'relative';
      menuItem.style.scrollSnapAlign = 'start';
      
      const color = item.submenuColor || '#888';
      menuItem.innerHTML = `
        <div class="fcm-icon" style="background: linear-gradient(135deg, ${color}22, ${color}11); color: ${color};">${item.icon}</div>
        <span class="fcm-text" style="background: linear-gradient(90deg, ${color}, ${color}cc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 600;">${item.label}</span>
        <span style="margin-left: auto; color: #666; font-size: 10px;">▶</span>
      `;
      
      // Create submenu
      const submenu = document.createElement('div');
      submenu.className = 'fcm-generic-submenu';
      submenu.style.cssText = `
        position: fixed;
        min-width: 180px;
        background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 4px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(20px);
        display: none;
        z-index: 100003;
      `;
      
      // Add submenu items
      item.submenuItems.forEach((subItem) => {
        const subMenuItem = document.createElement('div');
        subMenuItem.className = `fcm-item ${subItem.className || ''}`;
        subMenuItem.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          cursor: pointer;
          color: #d4d4d4;
          border-radius: 6px;
          margin: 1px 0;
          transition: all 0.15s ease;
        `;
        
        subMenuItem.innerHTML = `
          <div class="fcm-icon" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.04); border-radius: 5px;">${subItem.icon}</div>
          <span style="flex: 1; font-size: 12px;">${subItem.label}</span>
          ${subItem.shortcut ? `<span style="font-size: 10px; color: #666;">${subItem.shortcut}</span>` : ''}
        `;
        
        // Hover effects
        subMenuItem.addEventListener('mouseenter', () => {
          subMenuItem.style.background = `${color}22`;
          subMenuItem.style.color = '#fff';
        });
        subMenuItem.addEventListener('mouseleave', () => {
          subMenuItem.style.background = 'transparent';
          subMenuItem.style.color = '#d4d4d4';
        });
        
        // Click handler
        subMenuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          closeContextMenu(menu);
          // Remove all submenus
          document.querySelectorAll('.fcm-generic-submenu').forEach(s => s.remove());
          setTimeout(() => subItem.action(), 100);
        });
        
        submenu.appendChild(subMenuItem);
      });
      
      // Append submenu to body for fixed positioning
      document.body.appendChild(submenu);
      
      // Hover logic
      let hideTimeout: number | null = null;
      
      menuItem.addEventListener('mouseenter', () => {
        if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
        const rect = menuItem.getBoundingClientRect();
        submenu.style.display = 'block';
        submenu.style.left = `${rect.right + 4}px`;
        submenu.style.top = `${rect.top}px`;
        
        requestAnimationFrame(() => {
          const subRect = submenu.getBoundingClientRect();
          if (subRect.right > window.innerWidth - 10) {
            submenu.style.left = `${rect.left - subRect.width - 4}px`;
          }
          if (subRect.bottom > window.innerHeight - 10) {
            submenu.style.top = `${window.innerHeight - subRect.height - 10}px`;
          }
        });
        menuItem.style.background = 'rgba(255, 255, 255, 0.06)';
      });
      
      menuItem.addEventListener('mouseleave', (e) => {
        const related = e.relatedTarget as HTMLElement;
        if (submenu.contains(related)) return;
        hideTimeout = window.setTimeout(() => {
          submenu.style.display = 'none';
          menuItem.style.background = 'transparent';
        }, 150);
      });
      
      submenu.addEventListener('mouseenter', () => {
        if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
      });
      
      submenu.addEventListener('mouseleave', () => {
        hideTimeout = window.setTimeout(() => {
          submenu.style.display = 'none';
          menuItem.style.background = 'transparent';
        }, 150);
      });
      
      // Cleanup when menu closes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === menu || (node as HTMLElement).contains?.(menuItem)) {
              submenu.remove();
              observer.disconnect();
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      
      scrollContainer.appendChild(menuItem);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `fcm-item ${item.className || ''}`;
      menuItem.style.animationDelay = `${index * 0.02}s`;
      menuItem.style.scrollSnapAlign = 'start';
      
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
      
      scrollContainer.appendChild(menuItem);
    }
  });
  
  // ✅ Append scroll container structure to menu
  menu.appendChild(scrollUpIndicator);
  menu.appendChild(scrollContainer);
  menu.appendChild(scrollDownIndicator);
  
  // Add AI Analysis submenu AFTER regular menu items are rendered
  // ✅ Add SVN submenu FIRST (before AI Analysis so it's higher in menu)
  addSvnSubmenu(scrollContainer, path, fileName, isDirectory);
  
  // Add AI Analysis submenu (at the bottom)
  addAIAnalysisSubmenu(scrollContainer, path, fileName, isDirectory);
  
  // ✅ SMART POSITIONING - Always show full menu content
  // First, make menu invisible to measure its size
  menu.style.visibility = 'hidden';
  menu.style.left = '0px';
  menu.style.top = '0px';
  
  // X02: Pop-in animation (visibility restored after positioning rAF)
  menu.style.opacity = "0";
  menu.style.transform = "translateY(-6px) scale(0.97)";
  menu.style.transition = "opacity 0.13s ease, transform 0.13s cubic-bezier(0.22,1,0.36,1)";

  // X02: Stop propagation so item clicks dont trigger outside handler
  menu.addEventListener("click", (ev) => ev.stopPropagation());

  // X02: Click-outside closes menu (uses click not mousedown - safe for item actions)
  const __menuOutsideClick = (_ev: MouseEvent) => {
    if (!menu) return;
    menu.style.opacity = "0";
    menu.style.transform = "translateY(-4px) scale(0.97)";
    menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";
    setTimeout(() => { menu?.remove(); }, 120);
    document.removeEventListener("click", __menuOutsideClick);
    document.removeEventListener("keydown", __menuKeyHandler, true);
  };
  // X02: Escape key + arrow navigation
  const __menuKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      __menuOutsideClick(ev as any);
    }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const items = Array.from(menu.querySelectorAll(".ctx-item, [data-action]")) as HTMLElement[];
      const cur = items.findIndex(el => el === document.activeElement);
      const nxt = ev.key === "ArrowDown" ? Math.min(cur+1, items.length-1) : Math.max(cur-1, 0);
      items[nxt]?.focus();
    }
  };
  // 80ms delay so the right-click that opened menu doesnt immediately close it
  setTimeout(() => {
    document.addEventListener("click", __menuOutsideClick);
    document.addEventListener("keydown", __menuKeyHandler, true);
  }, 80);
  
  document.body.appendChild(menu);

  // Wait for render to get accurate measurements
  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    const padding = 15;
    const menuHeight = menuRect.height;
    const menuWidth = menuRect.width;
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    // Calculate available space in each direction
    const spaceBelow = screenHeight - y - padding;
    const spaceAbove = y - padding;
    const spaceRight = screenWidth - x - padding;
    const spaceLeft = x - padding;
    
    console.log(`📐 Menu size: ${menuWidth}x${menuHeight}, Click: (${x}, ${y})`);
    console.log(`📐 Space - Above: ${spaceAbove}, Below: ${spaceBelow}, Left: ${spaceLeft}, Right: ${spaceRight}`);
    
    let finalX = x;
    let finalY = y;
    let needsScroll = false;
    let maxScrollHeight = menuHeight;
    
    // ===== VERTICAL POSITIONING =====
    if (menuHeight <= spaceBelow) {
      // ✅ Fits below cursor - ideal position
      finalY = y;
      console.log('📍 Position: Below cursor (fits)');
    } else if (menuHeight <= spaceAbove) {
      // ✅ Fits above cursor
      finalY = y - menuHeight;
      console.log('📍 Position: Above cursor (fits)');
    } else {
      // ❌ Doesn't fit either way - need scrolling
      needsScroll = true;
      if (spaceBelow >= spaceAbove) {
        // More space below - position at cursor, scroll needed
        finalY = y;
        maxScrollHeight = spaceBelow - 70; // Reserve space for header
        console.log(`📍 Position: Below with scroll (max: ${maxScrollHeight}px)`);
      } else {
        // More space above - position to use above space
        maxScrollHeight = spaceAbove - 70;
        finalY = y - Math.min(menuHeight, spaceAbove);
        console.log(`📍 Position: Above with scroll (max: ${maxScrollHeight}px)`);
      }
    }
    
    // ===== HORIZONTAL POSITIONING =====
    if (menuWidth <= spaceRight) {
      finalX = x;
    } else if (menuWidth <= spaceLeft) {
      finalX = x - menuWidth;
    } else {
      finalX = Math.max(padding, screenWidth - menuWidth - padding);
    }
    
    // Ensure bounds
    finalX = Math.max(padding, Math.min(finalX, screenWidth - menuWidth - padding));
    finalY = Math.max(padding, Math.min(finalY, screenHeight - menuHeight - padding));
    
    // Apply scroll limit if needed
    if (needsScroll) {
      scrollContainer.style.maxHeight = `${Math.max(150, maxScrollHeight)}px`;
    }
    
    // Apply final position
    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;
    menu.style.visibility = 'visible';
      menu.style.opacity = "1";
      menu.style.transform = "translateY(0) scale(1)";
    
    // Update scroll indicators
    setTimeout(() => {
      updateScrollIndicators();
    }, 50);
    
    console.log(`✅ Final position: (${finalX}, ${finalY}), Scroll: ${needsScroll}`);
  });
  
  // Close handlers
  setTimeout(() => {
    const closeMenu = (e: MouseEvent) => {
      if (e.button === 2) return; // ignore right-click
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
  }, 10000);
  
  console.log('Context menu displayed at:', { x, y });
}

// ============================================================================
// ✅ QUICK COMMIT DIALOG
// ============================================================================

function showQuickCommitDialog(filePath: string, fileName: string): void {
  // Remove any existing dialog
  document.querySelector('.svn-quick-commit-dialog')?.remove();
  document.querySelector('.svn-dialog-overlay')?.remove();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'svn-dialog-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 100010;
    animation: fadeIn 0.15s ease;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'svn-quick-commit-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    width: 480px;
    max-width: 90vw;
    background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 10px 30px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(20px);
    z-index: 100011;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    opacity: 0;
    animation: dialogSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `;
  
  // Add animation keyframes
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes dialogSlideIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes dialogSlideOut {
      from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(styleEl);
  
  // Dialog content
  dialog.innerHTML = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2" x2="12" y2="8"/>
            <polyline points="8,4 12,2 16,4"/>
          </svg>
        </div>
        <div>
          <div style="font-size: 16px; font-weight: 600; color: #fff;">SVN Commit</div>
          <div style="font-size: 12px; color: #888; margin-top: 2px;">${fileName}</div>
        </div>
        <button class="close-btn" style="
          margin-left: auto;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- File info -->
      <div style="
        background: rgba(255, 152, 0, 0.1);
        border: 1px solid rgba(255, 152, 0, 0.2);
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
        <span style="font-size: 12px; color: #ccc; word-break: break-all; flex: 1;">${filePath}</span>
      </div>
      
      <!-- AI Suggest Section -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <label style="font-size: 12px; color: #888; font-weight: 500;">
            Commit Message
          </label>
          <button class="ai-suggest-btn" style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #7c4dff 0%, #536dfe 100%);
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 8px rgba(124, 77, 255, 0.3);
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            AI Suggest
          </button>
        </div>
        
        <textarea id="commit-message" placeholder="Enter your commit message or click AI Suggest..." style="
          width: 100%;
          height: 100px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          max-height: 200px;
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        "></textarea>
      </div>
      
      <!-- AI Suggestions Container (hidden by default) -->
      <div id="ai-suggestions-container" style="
        display: none;
        margin-bottom: 16px;
        background: rgba(124, 77, 255, 0.08);
        border: 1px solid rgba(124, 77, 255, 0.2);
        border-radius: 10px;
        padding: 12px;
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <span style="font-size: 11px; color: #7c4dff; font-weight: 600;">AI Suggestions</span>
        </div>
        <div id="ai-suggestions-list" style="display: flex; flex-direction: column; gap: 6px;">
          <!-- Suggestions will be inserted here -->
        </div>
      </div>
      
      <!-- Buttons -->
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="cancel-btn" style="
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        ">Cancel</button>
        <button class="commit-btn" style="
          padding: 10px 24px;
          background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
        ">
          <span style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            Commit
          </span>
        </button>
      </div>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  // Get elements
  const textarea = dialog.querySelector('#commit-message') as HTMLTextAreaElement;
  const closeBtn = dialog.querySelector('.close-btn') as HTMLButtonElement;
  const cancelBtn = dialog.querySelector('.cancel-btn') as HTMLButtonElement;
  const commitBtn = dialog.querySelector('.commit-btn') as HTMLButtonElement;
  const aiSuggestBtn = dialog.querySelector('.ai-suggest-btn') as HTMLButtonElement;
  const suggestionsContainer = dialog.querySelector('#ai-suggestions-container') as HTMLDivElement;
  const suggestionsList = dialog.querySelector('#ai-suggestions-list') as HTMLDivElement;
  
  // Focus textarea
  setTimeout(() => textarea?.focus(), 100);
  
  // Close dialog function
  const closeDialog = () => {
    dialog.style.animation = 'dialogSlideOut 0.15s ease forwards';
    overlay.style.opacity = '0';
    setTimeout(() => {
      dialog.remove();
      overlay.remove();
      styleEl.remove();
    }, 150);
  };
  
  // Event handlers
  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);
  overlay.addEventListener('click', closeDialog);
  
  // Button hover effects
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    closeBtn.style.color = '#fff';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    closeBtn.style.color = '#888';
  });
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.color = '#fff';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    cancelBtn.style.color = '#aaa';
  });
  
  commitBtn.addEventListener('mouseenter', () => {
    commitBtn.style.transform = 'translateY(-1px)';
    commitBtn.style.boxShadow = '0 6px 16px rgba(255, 152, 0, 0.4)';
  });
  commitBtn.addEventListener('mouseleave', () => {
    commitBtn.style.transform = 'translateY(0)';
    commitBtn.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
  });
  
  aiSuggestBtn.addEventListener('mouseenter', () => {
    aiSuggestBtn.style.transform = 'translateY(-1px)';
    aiSuggestBtn.style.boxShadow = '0 4px 12px rgba(124, 77, 255, 0.4)';
  });
  aiSuggestBtn.addEventListener('mouseleave', () => {
    aiSuggestBtn.style.transform = 'translateY(0)';
    aiSuggestBtn.style.boxShadow = '0 2px 8px rgba(124, 77, 255, 0.3)';
  });
  
  // Textarea focus effect
  textarea.addEventListener('focus', () => {
    textarea.style.borderColor = 'rgba(255, 152, 0, 0.5)';
  });
  textarea.addEventListener('blur', () => {
    textarea.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  // Escape key to close
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Ctrl+Enter to commit
  textarea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      commitBtn.click();
    }
  });
  
  // ✅ AI Suggest functionality using Operator X02 API
  aiSuggestBtn.addEventListener('click', async () => {
    // Show loading state
    aiSuggestBtn.disabled = true;
    aiSuggestBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
      Thinking...
    `;
    
    // Add spin animation if not exists
    if (!document.getElementById('spin-animation')) {
      const spinStyle = document.createElement('style');
      spinStyle.id = 'spin-animation';
      spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(spinStyle);
    }
    
    try {
      // Get diff for context (if available)
      let diffContent = '';
      let linesAdded = 0;
      let linesRemoved = 0;
      let linesChanged = 0;
      
      try {
        diffContent = await svnManager.getDiff(filePath);
        
        // ✅ Count lines added and removed from diff
        if (diffContent) {
          const diffLines = diffContent.split('\n');
          diffLines.forEach(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              linesAdded++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              linesRemoved++;
            }
          });
          linesChanged = linesAdded + linesRemoved;
        }
        
        console.log(`📊 Diff stats: +${linesAdded} -${linesRemoved} (${linesChanged} total changes)`);
      } catch (e) {
        console.log('Could not get diff, using file info only');
      }
      
      // ✅ Operator X02 API Configuration
      const OPERATOR_X02_CONFIG = {
        apiKey: 'PROXY',
        apiBaseUrl: 'PROXY',
        model: 'x02-coder'
      };
      
      // ✅ Updated prompt for structured commit message format with line counts
      const prompt = `You are a helpful assistant that generates detailed SVN/Git commit messages.

File: ${fileName}
Path: ${filePath}
Lines Added: ${linesAdded}
Lines Removed: ${linesRemoved}
Total Lines Changed: ${linesChanged}
${diffContent ? `\nChanges (diff preview):\n\`\`\`\n${diffContent.substring(0, 2000)}\n\`\`\`` : ''}

Generate a structured commit message in this EXACT format:

[Type]: [Short description]
Lines Changed: +${linesAdded} -${linesRemoved} (${linesChanged} total)
Overall Purpose:
- [One line explaining the main goal]
Changes by File:
- ${fileName}: [Detailed description of what was changed]

Where [Type] is one of: Improvement, Fix, Feature, Refactor, Update, Add, Remove, Cleanup, Style, Docs, Test

Example output:
Improvement: Add logging for content script debugging
Lines Changed: +15 -3 (18 total)
Overall Purpose:
- Enhance debuggability of content script issues
Changes by File:
- contentScript.js: Added a test logging statement to facilitate debugging and troubleshooting of content script execution issues

Return ONLY the commit message in the format above. No markdown, no code blocks, no explanation.`;

      console.log('🤖 Calling Operator X02 API for commit suggestions...');
      
      // Call Operator X02 API
      const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: OPERATOR_X02_CONFIG.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful coding assistant that generates detailed, structured commit messages. Always follow the exact format requested.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      console.log('📝 AI Response:', content);
      
      // Clean up the response
      content = content
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/^```\w*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim();
      
      // Fallback if empty
      if (!content) {
        content = `Update: Modify ${fileName}
Lines Changed: +${linesAdded} -${linesRemoved} (${linesChanged} total)
Overall Purpose:
- Update file with latest changes
Changes by File:
- ${fileName}: Modified file content`;
      }
      
      // ✅ Ensure line counts are in the message (inject if AI didn't include them)
      if (!content.includes('Lines Changed:')) {
        const lines = content.split('\n');
        const titleLine = lines[0];
        const restLines = lines.slice(1).join('\n');
        content = `${titleLine}
Lines Changed: +${linesAdded} -${linesRemoved} (${linesChanged} total)${restLines}`;
      }
      
      // Show suggestion in container
      suggestionsContainer.style.display = 'block';
      suggestionsList.innerHTML = '';
      
      // Create the suggestion card
      const suggestionCard = document.createElement('div');
      suggestionCard.className = 'ai-suggestion-card';
      suggestionCard.style.cssText = `
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.15s ease;
      `;
      
      // Parse the commit message to highlight different sections
      const lines = content.split('\n');
      const titleLine = lines[0] || '';
      const restOfMessage = lines.slice(1).join('\n');
      
      // Extract type from title (e.g., "Improvement:", "Fix:", etc.)
      const typeMatch = titleLine.match(/^(\w+):\s*(.*)$/);
      const commitType = typeMatch ? typeMatch[1] : 'Update';
      const commitTitle = typeMatch ? typeMatch[2] : titleLine;
      
      // Type colors
      const typeColors: Record<string, string> = {
        'Improvement': '#4caf50',
        'Fix': '#ff5722',
        'Feature': '#2196f3',
        'Refactor': '#9c27b0',
        'Update': '#ff9800',
        'Add': '#00bcd4',
        'Remove': '#f44336',
        'Cleanup': '#607d8b',
        'Style': '#e91e63',
        'Docs': '#795548',
        'Test': '#ffeb3b'
      };
      const typeColor = typeColors[commitType] || '#ff9800';
      
      suggestionCard.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        ">
          <span style="
            padding: 4px 10px;
            background: ${typeColor}22;
            color: ${typeColor};
            font-size: 11px;
            font-weight: 600;
            border-radius: 4px;
            text-transform: uppercase;
          ">${commitType}</span>
          <span style="color: #fff; font-size: 13px; font-weight: 500; flex: 1;">${commitTitle}</span>
        </div>
        
        <!-- ✅ Line Statistics Section -->
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span style="color: #4caf50; font-size: 12px; font-weight: 600;">${linesAdded}</span>
            <span style="color: #666; font-size: 11px;">added</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span style="color: #f44336; font-size: 12px; font-weight: 600;">${linesRemoved}</span>
            <span style="color: #666; font-size: 11px;">removed</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span style="color: #7c4dff; font-size: 12px; font-weight: 600;">${linesChanged}</span>
            <span style="color: #666; font-size: 11px;">total changes</span>
          </div>
        </div>
        
        <div style="padding: 12px 14px;">
          <pre style="
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            font-size: 12px;
            color: #aaa;
            line-height: 1.6;
          ">${restOfMessage}</pre>
        </div>
        <div style="
          display: flex;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.15);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        ">
          <button class="use-suggestion-btn" style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            background: linear-gradient(135deg, #7c4dff 0%, #536dfe 100%);
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            Use This Message
          </button>
          <button class="regenerate-btn" style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            color: #aaa;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Regenerate
          </button>
        </div>
      `;
      
      // Store the full message for use
      const fullMessage = content;
      
      // Use suggestion button
      const useBtn = suggestionCard.querySelector('.use-suggestion-btn') as HTMLButtonElement;
      useBtn.addEventListener('click', () => {
        textarea.value = fullMessage;
        textarea.focus();
        suggestionCard.style.borderColor = 'rgba(124, 77, 255, 0.4)';
        suggestionCard.style.background = 'rgba(124, 77, 255, 0.1)';
        
        if ((window as any).showNotification) {
          (window as any).showNotification('✅ Message applied!', 'success');
        }
      });
      useBtn.addEventListener('mouseenter', () => {
        useBtn.style.transform = 'translateY(-1px)';
        useBtn.style.boxShadow = '0 4px 12px rgba(124, 77, 255, 0.3)';
      });
      useBtn.addEventListener('mouseleave', () => {
        useBtn.style.transform = 'translateY(0)';
        useBtn.style.boxShadow = 'none';
      });
      
      // Regenerate button
      const regenBtn = suggestionCard.querySelector('.regenerate-btn') as HTMLButtonElement;
      regenBtn.addEventListener('click', () => {
        aiSuggestBtn.click(); // Trigger AI suggest again
      });
      regenBtn.addEventListener('mouseenter', () => {
        regenBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        regenBtn.style.color = '#fff';
      });
      regenBtn.addEventListener('mouseleave', () => {
        regenBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        regenBtn.style.color = '#aaa';
      });
      
      suggestionsList.appendChild(suggestionCard);
      
      console.log('✨ AI suggestion generated:', fullMessage);
      console.log(`📊 Stats: +${linesAdded} -${linesRemoved} = ${linesChanged} changes`);
      
      if ((window as any).showNotification) {
        (window as any).showNotification('✨ AI suggestion ready!', 'success');
      }
      
    } catch (error) {
      console.error('❌ AI suggest error:', error);
      
      // Show error in suggestions container
      suggestionsContainer.style.display = 'block';
      suggestionsList.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(255, 82, 82, 0.1);
          border: 1px solid rgba(255, 82, 82, 0.2);
          border-radius: 8px;
          color: #ff5252;
          font-size: 12px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style="flex: 1;">${error instanceof Error ? error.message : 'Failed to get AI suggestions. Please try again.'}</span>
        </div>
      `;
      
      if ((window as any).showNotification) {
        (window as any).showNotification('❌ AI suggestion failed', 'error');
      }
    } finally {
      // Reset button
      aiSuggestBtn.disabled = false;
      aiSuggestBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        AI Suggest
      `;
    }
  });
  
  // Commit action
  commitBtn.addEventListener('click', async () => {
    const message = textarea.value.trim();
    
    if (!message) {
      textarea.style.borderColor = '#ff5252';
      textarea.placeholder = '⚠️ Please enter a commit message!';
      textarea.focus();
      setTimeout(() => {
        textarea.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        textarea.placeholder = 'Enter your commit message or click AI Suggest...';
      }, 2000);
      return;
    }
    
    // Disable button and show loading
    commitBtn.disabled = true;
    commitBtn.innerHTML = `
      <span style="display: flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
        </svg>
        Committing...
      </span>
    `;
    
    try {
      await svnManager.commit(message, [filePath]);
      
      closeDialog();
      
      if ((window as any).showNotification) {
        (window as any).showNotification('✅ Commit successful!', 'success');
      }
      
      // Refresh file tree
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      
    } catch (error) {
      commitBtn.disabled = false;
      commitBtn.innerHTML = `
        <span style="display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          Commit
        </span>
      `;
      
      if ((window as any).showNotification) {
        (window as any).showNotification(`❌ Commit failed: ${error}`, 'error');
      }
    }
  });
  
  console.log('📝 Quick commit dialog opened for:', filePath);
}

// ✅ Export showQuickCommitDialog to window for use by other components
(window as any).showQuickCommitDialog = showQuickCommitDialog;

// ============================================================================
// ✅ HELPER FUNCTION
// ============================================================================

/**
 * Escape HTML special characters
 */
(window as any).showQuickCommitDialog = showQuickCommitDialog;

// ============================================================================
// ✅ HELPER FUNCTION
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// ✅ STANDALONE DIFF DIALOG
// ============================================================================

async function showStandaloneDiffDialog(filePath: string, fileName: string): Promise<void> {
  console.log('📊 Opening standalone diff dialog for:', filePath);
  
  // Remove any existing dialog
  document.querySelector('.svn-standalone-diff-dialog')?.remove();
  
  // Inject animation styles if not present
  injectAnimationStyles();
  
  // Create floating dialog (no dark overlay - truly independent)
  const dialog = document.createElement('div');
  dialog.className = 'svn-standalone-diff-dialog svn-dialog-animate-in';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85vw;
    max-width: 1400px;
    height: 80vh;
    min-width: 600px;
    min-height: 400px;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100010;
    resize: both;
    opacity: 0;
  `;
  
  // Loading state with animation
  dialog.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888;">
      <div class="svn-loading-spinner" style="width: 48px; height: 48px; border: 3px solid #3c3c3c; border-top-color: #569cd6; border-radius: 50%; animation: svnSpin 1s linear infinite; margin-bottom: 16px;"></div>
      <div style="font-size: 15px; animation: svnPulse 1.5s ease-in-out infinite;">Loading diff for ${escapeHtml(fileName)}...</div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Show dialog after it's positioned (prevents flash at wrong position)
  requestAnimationFrame(() => {
    dialog.style.opacity = '1';
    // Use crossfade when switching from another dialog, zoom in for fresh open
    if ((window as any).__svnDialogSwitching) {
      dialog.style.animation = 'svnDialogFadeIn 0.3s ease-out';
    } else {
      dialog.style.animation = 'svnDialogZoomIn 0.4s ease-out';
    }
  });
  
  
  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialogWithAnimation(dialog, handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  try {
    console.log('📊 Fetching diff...');
    const diff = await svnManager.getDiff(filePath);
    console.log('📊 Diff fetched, length:', diff?.length || 0);
    
    const diffLines = parseDiffLines(diff);
    
    dialog.innerHTML = `
      <!-- Draggable Title Bar -->
      <div id="diff-dialog-titlebar" style="
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        background: linear-gradient(180deg, #2d2d30 0%, #252526 100%);
        border-bottom: 1px solid #3c3c3c;
        cursor: move;
        user-select: none;
      ">
        <!-- Icon & Title -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #569cd6, #4ec9b0);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: svnIconPop 0.4s ease-out;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 3v18M3 12h18"/>
          </svg>
        </div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px;">Diff Viewer</div>
          <div style="font-size: 12px; color: #888; font-family: 'Consolas', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(filePath)}">${escapeHtml(fileName)}</div>
        </div>
        
        <!-- Stats with animation -->
        <div style="display: flex; gap: 8px;">
          <div class="svn-stat-badge" style="padding: 6px 14px; background: rgba(76, 175, 80, 0.15); border-radius: 6px; border: 1px solid rgba(76, 175, 80, 0.3); animation: svnFadeInUp 0.3s ease-out 0.1s both;">
            <span style="color: #4caf50; font-weight: 700; font-size: 14px;">+${diffLines.added}</span>
          </div>
          <div class="svn-stat-badge" style="padding: 6px 14px; background: rgba(244, 67, 54, 0.15); border-radius: 6px; border: 1px solid rgba(244, 67, 54, 0.3); animation: svnFadeInUp 0.3s ease-out 0.2s both;">
            <span style="color: #f44336; font-weight: 700; font-size: 14px;">−${diffLines.removed}</span>
          </div>
        </div>
        
        <!-- View Mode Toggle -->
        <div style="display: flex; gap: 0; background: #1e1e1e; border-radius: 8px; padding: 3px; border: 1px solid #3c3c3c; animation: svnFadeIn 0.3s ease-out 0.3s both;">
          <button id="dialog-mode-unified" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #569cd6, #4e8fba);
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Unified</button>
          <button id="dialog-mode-sidebyside" style="
            padding: 8px 16px;
            background: transparent;
            border: none;
            border-radius: 6px;
            color: #888;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Side by Side</button>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; animation: svnFadeIn 0.3s ease-out 0.4s both;">
          <!-- AI Analysis Button -->
          <button id="diff-dialog-ai-btn" style="
            padding: 8px 18px;
            background: linear-gradient(135deg, #7c4dff 0%, #536dfe 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(124, 77, 255, 0.3);
            transition: all 0.2s ease;
          ">
            <span style="font-size: 14px;">✨</span>
            AI Analysis
          </button>
          
          <button id="diff-dialog-commit-btn" style="
            padding: 8px 18px;
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
            transition: all 0.2s ease;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            Commit
          </button>
          <button id="diff-dialog-history-btn" style="
            padding: 8px 18px;
            background: #2d2d30;
            border: 1px solid #3c3c3c;
            border-radius: 8px;
            color: #ccc;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            History
          </button>
        </div>
        
        <!-- Close Button -->
        <button id="diff-dialog-close-btn" style="
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #808080;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s ease;
        " title="Close (Esc)">×</button>
      </div>
      
      <!-- Main Content Area -->
      <div style="flex: 1; display: flex; overflow: hidden;">
        <!-- Diff Content -->
        <div id="diff-dialog-content" style="flex: 1; overflow: auto; background: #1a1a1a; animation: svnFadeIn 0.4s ease-out;">
          ${formatUnifiedDiffClean(diff)}
        </div>
        
        <!-- AI Analysis Panel (Hidden by default) -->
        <div id="diff-ai-analysis-panel" style="
          width: 0;
          overflow: hidden;
          background: #1e1e1e;
          border-left: 1px solid #333;
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
        ">
          <div style="padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; display: flex; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: #ccc; text-transform: uppercase; letter-spacing: 0.5px;">AI Analysis</span>
            <button id="close-ai-panel-btn" style="margin-left: auto; background: none; border: none; color: #666; cursor: pointer; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 3px; transition: all 0.15s;" onmouseover="this.style.background='#333';this.style.color='#ccc'" onmouseout="this.style.background='none';this.style.color='#666'">×</button>
          </div>
          <div id="ai-analysis-content" style="flex: 1; overflow-y: auto; padding: 12px;">
            <!-- AI analysis will be inserted here -->
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
        font-size: 11px;
        color: #666;
      ">
        <div>Press <kbd style="background: #3c3c3c; padding: 2px 6px; border-radius: 3px; color: #ccc;">Esc</kbd> to close</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>${diffLines.added + diffLines.removed} changes</span>
          <span>•</span>
          <span>Drag title bar to move</span>
        </div>
      </div>
    `;
    
    // Make dialog draggable
    makeDraggable(dialog, dialog.querySelector('#diff-dialog-titlebar') as HTMLElement);
    
    // Setup button handlers
    const closeBtn = dialog.querySelector('#diff-dialog-close-btn');
    closeBtn?.addEventListener('click', () => closeDialogWithAnimation(dialog, handleEscape));
    closeBtn?.addEventListener('mouseenter', () => {
      (closeBtn as HTMLElement).style.background = 'rgba(244, 67, 54, 0.2)';
      (closeBtn as HTMLElement).style.color = '#f44336';
    });
    closeBtn?.addEventListener('mouseleave', () => {
      (closeBtn as HTMLElement).style.background = 'transparent';
      (closeBtn as HTMLElement).style.color = '#808080';
    });
    
    dialog.querySelector('#diff-dialog-commit-btn')?.addEventListener('click', () => {
      closeDialogWithAnimation(dialog, handleEscape);
      setTimeout(() => showQuickCommitDialog(filePath, fileName), 200);
    });
    
    dialog.querySelector('#diff-dialog-history-btn')?.addEventListener('click', () => {
      // Use flip animation for switching between dialogs
      closeDialogWithCrossfade(dialog, handleEscape);
      (window as any).__svnDialogSwitching = true;
      setTimeout(() => {
        showStandaloneHistoryDialog(filePath, fileName);
        (window as any).__svnDialogSwitching = false;
      }, 300);
    });
    
    // AI Analysis button
    const aiBtn = dialog.querySelector('#diff-dialog-ai-btn');
    const aiPanel = dialog.querySelector('#diff-ai-analysis-panel') as HTMLElement;
    const aiContent = dialog.querySelector('#ai-analysis-content') as HTMLElement;
    const closeAiPanelBtn = dialog.querySelector('#close-ai-panel-btn');
    
    aiBtn?.addEventListener('click', async () => {
      if (aiPanel.style.width === '360px') {
        // Close panel
        aiPanel.style.width = '0';
        return;
      }
      
      // Open panel with animation
      aiPanel.style.width = '360px';
      aiContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 20px 12px; color: #888;">
          <div class="svn-loading-spinner" style="width: 16px; height: 16px; border: 2px solid #333; border-top-color: #7c4dff; border-radius: 50%; animation: svnSpin 0.8s linear infinite;"></div>
          <div style="font-size: 13px; color: #888;">Analyzing changes...</div>
        </div>
      `;
      
      try {
        const analysis = await analyzeCodeDiff(diff, fileName);
        aiContent.innerHTML = `
          <div style="animation: svnFadeIn 0.2s ease-out;">
            ${analysis}
          </div>
        `;
      } catch (error) {
        aiContent.innerHTML = `
          <div style="padding: 12px; color: #f44336; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span style="font-weight: 600;">Analysis Failed</span>
            </div>
            <div style="color: #888; font-size: 10px;">${escapeHtml(String(error))}</div>
          </div>
        `;
      }
    });
    
    closeAiPanelBtn?.addEventListener('click', () => {
      aiPanel.style.width = '0';
    });
    
    // View mode toggle
    const unifiedBtn = dialog.querySelector('#dialog-mode-unified') as HTMLButtonElement;
    const sideBySideBtn = dialog.querySelector('#dialog-mode-sidebyside') as HTMLButtonElement;
    const contentContainer = dialog.querySelector('#diff-dialog-content') as HTMLElement;
    
    unifiedBtn?.addEventListener('click', () => {
      unifiedBtn.style.background = 'linear-gradient(135deg, #569cd6, #4e8fba)';
      unifiedBtn.style.color = '#fff';
      sideBySideBtn.style.background = 'transparent';
      sideBySideBtn.style.color = '#888';
      contentContainer.style.animation = 'none';
      contentContainer.offsetHeight; // Trigger reflow
      contentContainer.style.animation = 'svnFadeIn 0.2s ease-out';
      contentContainer.innerHTML = formatUnifiedDiffClean(diff);
    });
    
    sideBySideBtn?.addEventListener('click', () => {
      unifiedBtn.style.background = 'transparent';
      unifiedBtn.style.color = '#888';
      sideBySideBtn.style.background = 'linear-gradient(135deg, #569cd6, #4e8fba)';
      sideBySideBtn.style.color = '#fff';
      contentContainer.style.animation = 'none';
      contentContainer.offsetHeight; // Trigger reflow
      contentContainer.style.animation = 'svnFadeIn 0.2s ease-out';
      contentContainer.innerHTML = formatSideBySideDiffClean(diff);
    });
    
  } catch (error) {
    console.error('❌ Failed to load diff:', error);
    dialog.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888; padding: 40px; animation: svnFadeIn 0.3s ease-out;">
        <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
        <div style="font-size: 18px; color: #f44336; margin-bottom: 12px; font-weight: 600;">Failed to load diff</div>
        <div style="font-size: 14px; margin-bottom: 24px; max-width: 400px; text-align: center; line-height: 1.5;">${escapeHtml(String(error))}</div>
        <button onclick="this.closest('.svn-standalone-diff-dialog').remove()" style="
          padding: 10px 24px;
          background: #569cd6;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Close</button>
      </div>
    `;
  }
}

/**
 * Inject CSS animation styles
 */
function injectAnimationStyles(): void {
  if (document.getElementById('svn-dialog-animations')) return;
  
  const style = document.createElement('style');
  style.id = 'svn-dialog-animations';
  style.textContent = `
    /* ========================================
       ZOOM IN - Open Animation
    ======================================== */
    @keyframes svnDialogZoomIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.7);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    /* ========================================
       CROSSFADE - Switch Animation
    ======================================== */
    @keyframes svnDialogFadeOut {
      from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.98);
      }
    }
    
    @keyframes svnDialogFadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.02);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    /* ========================================
       CLOSE - Scale Fade Out
    ======================================== */
    @keyframes svnDialogSlideOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }
    
    /* Legacy - keep for compatibility */
    @keyframes svnDialogSlideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes svnFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes svnFadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes svnFadeInLeft {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes svnSpin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes svnPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @keyframes svnIconPop {
      0% { transform: scale(0); }
      70% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    @keyframes svnShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .svn-dialog-animate-out {
      animation: svnDialogSlideOut 0.3s ease-out forwards !important;
    }
    
    .svn-dialog-crossfade-out {
      animation: svnDialogFadeOut 0.25s ease-out forwards !important;
    }
    
    .svn-shimmer {
      background: linear-gradient(90deg, #3c3c3c 25%, #4a4a4a 50%, #3c3c3c 75%);
      background-size: 200% 100%;
      animation: svnShimmer 1.5s infinite;
    }
    
    .svn-history-entry {
      transition: all 0.2s ease;
    }
    
    .svn-history-entry:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .svn-btn-hover:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Close dialog with animation
 */
function closeDialogWithAnimation(dialog: HTMLElement, escapeHandler?: (e: KeyboardEvent) => void): void {
  dialog.classList.add('svn-dialog-animate-out');
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
  }
  setTimeout(() => dialog.remove(), 300);
}

/**
 * Close dialog with 3D flip animation (for switching between dialogs)
 */
function closeDialogWithCrossfade(dialog: HTMLElement, escapeHandler?: (e: KeyboardEvent) => void): void {
  dialog.classList.add('svn-dialog-crossfade-out');
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
  }
  setTimeout(() => dialog.remove(), 250);
}

/**
 * Show dialog with crossfade animation (for switching between dialogs)
 */
function showDialogWithCrossfade(dialog: HTMLElement): void {
  dialog.style.opacity = '1';
  dialog.style.animation = 'svnDialogFadeIn 0.3s ease-out';
}

/**
 * Analyze code diff using Operator X02 API
 */
async function analyzeCodeDiff(diff: string, fileName: string): Promise<string> {
  const OPERATOR_X02_CONFIG = {
    apiKey: 'PROXY',
    apiBaseUrl: 'PROXY',
    model: 'x02-coder'
  };
  
  const prompt = `Analyze the following code diff for the file "${fileName}". Provide:
1. **Summary**: Brief description of what changed (1-2 sentences)
2. **Changes**: List the specific changes made
3. **Impact**: Potential impact of these changes
4. **Suggestions**: Any improvements or potential issues

Keep the response concise and developer-friendly. Use emojis for visual appeal.

DIFF:
${diff.substring(0, 4000)}`;

  const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: OPERATOR_X02_CONFIG.model,
      messages: [
        { role: 'system', content: 'You are an expert code reviewer. Analyze diffs concisely and provide actionable insights. Format output with markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No analysis available';
  
  // Format the markdown response to HTML
  return formatAIResponse(content);
}

/**
 * Analyze commit history using Operator X02 API
 */
async function analyzeCommitHistory(log: any[], fileName: string): Promise<string> {
  const OPERATOR_X02_CONFIG = {
    apiKey: 'PROXY',
    apiBaseUrl: 'PROXY',
    model: 'x02-coder'
  };
  
  const historyText = log.slice(0, 20).map(entry => 
    `r${entry.revision} | ${entry.author} | ${entry.date} | ${entry.message || 'No message'}`
  ).join('\n');
  
  const prompt = `Analyze the commit history for file "${fileName}". Provide:
1. **Overview**: Summary of the file's evolution
2. **Activity Pattern**: How often and when changes occur
3. **Key Changes**: Most significant commits
4. **Contributors**: Who works on this file
5. **Recommendations**: Suggestions based on the history

Keep it concise. Use emojis for visual appeal.

COMMIT HISTORY:
${historyText}`;

  const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: OPERATOR_X02_CONFIG.model,
      messages: [
        { role: 'system', content: 'You are a software project analyst. Analyze commit history and provide insights about development patterns. Format with markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No analysis available';
  
  return formatAIResponse(content);
}

/**
 * Format AI response markdown to HTML
 */
function formatAIResponse(markdown: string): string {
  // SVG icons for different section types (14x14 for better visibility)
  const sectionIcons: Record<string, string> = {
    'summary': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    'changes': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
    'impact': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dcdcaa" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    'suggestions': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c586c0" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'overview': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    'activity': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>',
    'contributors': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce9178" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'recommendations': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
    'key': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dcdcaa" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
    'default': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  // Get icon based on header text
  const getIconForHeader = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('summary') || lower.includes('overview')) return sectionIcons.summary;
    if (lower.includes('change')) return sectionIcons.changes;
    if (lower.includes('impact')) return sectionIcons.impact;
    if (lower.includes('suggest') || lower.includes('recommend')) return sectionIcons.recommendations;
    if (lower.includes('activity') || lower.includes('pattern')) return sectionIcons.activity;
    if (lower.includes('contributor') || lower.includes('author')) return sectionIcons.contributors;
    if (lower.includes('key')) return sectionIcons.key;
    return sectionIcons.default;
  };
  
  let html = markdown
    // H1 headers - main sections
    .replace(/^# (.*?)$/gm, (_, text) => {
      const icon = getIconForHeader(text);
      return `<div style="display: flex; align-items: center; gap: 8px; margin: 12px 0 6px; padding: 6px 0; border-bottom: 1px solid #333;">${icon}<span style="color: #4ec9b0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${text}</span></div>`;
    })
    // H2 headers - sub sections
    .replace(/^## (.*?)$/gm, (_, text) => {
      const icon = getIconForHeader(text);
      return `<div style="display: flex; align-items: center; gap: 8px; margin: 10px 0 5px; padding: 5px 0; border-bottom: 1px solid #2a2a2a;">${icon}<span style="color: #4ec9b0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">${text}</span></div>`;
    })
    // H3 headers
    .replace(/^### (.*?)$/gm, '<div style="color: #dcdcaa; margin: 8px 0 4px; font-size: 12px; font-weight: 600;">$1</div>')
    // H4 headers
    .replace(/^#### (.*?)$/gm, '<div style="color: #888; margin: 6px 0 3px; font-size: 12px; font-weight: 500;">$1</div>')
    // Bold with **
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e6e6e6;">$1</strong>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background: #0d0d0d; padding: 8px 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin: 6px 0; border: 1px solid #333; font-family: Consolas, Monaco, monospace;"><code style="color: #ce9178;">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #2d2d2d; padding: 2px 5px; border-radius: 3px; font-size: 12px; color: #ce9178; font-family: Consolas, Monaco, monospace;">$1</code>')
    // Bullet lists
    .replace(/^- (.*?)$/gm, '<div style="display: flex; gap: 8px; margin: 4px 0; padding-left: 4px;"><span style="color: #569cd6; font-size: 12px;">▸</span><span style="color: #ccc; font-size: 13px; line-height: 1.4;">$1</span></div>')
    // Numbered lists
    .replace(/^(\d+)\. (.*?)$/gm, '<div style="display: flex; gap: 8px; margin: 4px 0; padding-left: 4px;"><span style="color: #4ec9b0; font-size: 12px; font-weight: 600; min-width: 14px;">$1.</span><span style="color: #ccc; font-size: 13px; line-height: 1.4;">$2</span></div>')
    // Double line breaks
    .replace(/\n\n/g, '<div style="height: 8px;"></div>')
    // Single line breaks
    .replace(/\n/g, '<br>');
  
  return `<div style="font-size: 13px; line-height: 1.45; color: #ccc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${html}</div>`;
}

/**
 * Make an element draggable by a handle
 */
function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let offsetX = 0, offsetY = 0, isDragging = false;
  let isFirstDrag = true;
  
  handle.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    isDragging = true;
    
    // Get current visual position
    const rect = element.getBoundingClientRect();
    
    // On first drag, convert from transform-based centering to absolute positioning
    if (isFirstDrag) {
      element.style.left = rect.left + 'px';
      element.style.top = rect.top + 'px';
      element.style.transform = 'none';
      isFirstDrag = false;
    }
    
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    element.style.transition = 'none';
    element.style.cursor = 'grabbing';
    handle.style.cursor = 'grabbing';
    
    // Prevent text selection during drag
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;
    
    // Keep dialog within viewport bounds
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    element.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
    element.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      element.style.cursor = '';
      handle.style.cursor = 'move';
    }
  });
}

function parseDiffLines(diff: string): { added: number; removed: number; total: number } {
  const lines = diff.split('\n');
  let added = 0, removed = 0;
  lines.forEach(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  });
  return { added, removed, total: added + removed };
}

/**
 * Format unified diff - clean version without SVN headers
 */
function formatUnifiedDiffClean(diff: string): string {
  const lines = diff.split('\n');
  let html = '<div style="font-family: \'Consolas\', \'Monaco\', \'Courier New\', monospace; font-size: 14px; line-height: 1.6;">';
  let lineNum = 0;
  let oldLineNum = 0;
  let newLineNum = 0;
  
  lines.forEach(line => {
    // Skip SVN header lines
    if (line.startsWith('Index:') || line.startsWith('===') || line.startsWith('---') || line.startsWith('+++')) {
      return;
    }
    
    let bgColor = 'transparent';
    let textColor = '#d4d4d4';
    let prefix = ' ';
    let showOldLine = '';
    let showNewLine = '';
    
    if (line.startsWith('@@')) {
      // Parse hunk header for line numbers
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1]) - 1;
        newLineNum = parseInt(match[2]) - 1;
      }
      bgColor = 'rgba(86, 156, 214, 0.1)';
      textColor = '#569cd6';
      html += `<div style="display: flex; background: ${bgColor}; border-bottom: 1px solid rgba(60,60,60,0.5); padding: 8px 0; margin: 8px 0;">
        <span style="width: 100px; padding: 0 12px; color: #569cd6; text-align: center; font-size: 12px; font-weight: 500;">${escapeHtml(line)}</span>
      </div>`;
      return;
    }
    
    if (line.startsWith('+')) {
      bgColor = 'rgba(76, 175, 80, 0.12)';
      textColor = '#89d185';
      prefix = '+';
      newLineNum++;
      showNewLine = String(newLineNum);
    } else if (line.startsWith('-')) {
      bgColor = 'rgba(244, 67, 54, 0.12)';
      textColor = '#f48771';
      prefix = '−';
      oldLineNum++;
      showOldLine = String(oldLineNum);
    } else if (line.length > 0) {
      oldLineNum++;
      newLineNum++;
      showOldLine = String(oldLineNum);
      showNewLine = String(newLineNum);
    }
    
    const content = line.startsWith('+') || line.startsWith('-') ? line.substring(1) : line;
    
    html += `<div style="display: flex; background: ${bgColor}; border-bottom: 1px solid rgba(60,60,60,0.3);">
      <span style="width: 50px; padding: 4px 8px; color: #5a5a5a; text-align: right; border-right: 1px solid #2d2d2d; user-select: none; font-size: 12px;">${showOldLine}</span>
      <span style="width: 50px; padding: 4px 8px; color: #5a5a5a; text-align: right; border-right: 1px solid #2d2d2d; user-select: none; font-size: 12px;">${showNewLine}</span>
      <span style="width: 24px; padding: 4px 0; color: ${textColor}; text-align: center; font-weight: 600; user-select: none;">${prefix}</span>
      <span style="flex: 1; padding: 4px 16px; color: ${textColor}; white-space: pre; overflow-x: auto;">${escapeHtml(content)}</span>
    </div>`;
  });
  
  return html + '</div>';
}

/**
 * Format side-by-side diff - clean version
 */
function formatSideBySideDiffClean(diff: string): string {
  const lines = diff.split('\n');
  const left: Array<{num: string; content: string; type: string}> = [];
  const right: Array<{num: string; content: string; type: string}> = [];
  let leftNum = 0, rightNum = 0;
  
  lines.forEach(line => {
    // Skip SVN headers
    if (line.startsWith('Index:') || line.startsWith('===') || line.startsWith('---') || line.startsWith('+++')) {
      return;
    }
    
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        leftNum = parseInt(match[1]) - 1;
        rightNum = parseInt(match[2]) - 1;
      }
      left.push({ num: '···', content: line, type: 'hunk' });
      right.push({ num: '···', content: line, type: 'hunk' });
    } else if (line.startsWith('-')) {
      leftNum++;
      left.push({ num: String(leftNum), content: line.substring(1), type: 'deleted' });
      right.push({ num: '', content: '', type: 'empty' });
    } else if (line.startsWith('+')) {
      rightNum++;
      left.push({ num: '', content: '', type: 'empty' });
      right.push({ num: String(rightNum), content: line.substring(1), type: 'added' });
    } else if (line.length > 0) {
      leftNum++;
      rightNum++;
      left.push({ num: String(leftNum), content: line, type: 'context' });
      right.push({ num: String(rightNum), content: line, type: 'context' });
    }
  });
  
  const renderLine = (item: typeof left[0], side: 'left' | 'right') => {
    const bg = item.type === 'deleted' ? 'rgba(244, 67, 54, 0.12)' :
               item.type === 'added' ? 'rgba(76, 175, 80, 0.12)' :
               item.type === 'hunk' ? 'rgba(86, 156, 214, 0.08)' :
               item.type === 'empty' ? 'rgba(0,0,0,0.2)' : 'transparent';
    const color = item.type === 'deleted' ? '#f48771' :
                  item.type === 'added' ? '#89d185' :
                  item.type === 'hunk' ? '#569cd6' : '#d4d4d4';
    
    return `<div style="display: flex; background: ${bg}; border-bottom: 1px solid rgba(60,60,60,0.3); min-height: 28px;">
      <span style="width: 50px; padding: 4px 8px; color: #5a5a5a; text-align: right; border-right: 1px solid #2d2d2d; user-select: none; font-size: 12px;">${item.num}</span>
      <span style="flex: 1; padding: 4px 16px; color: ${color}; white-space: pre; overflow-x: auto; font-size: 14px;">${escapeHtml(item.content)}</span>
    </div>`;
  };
  
  return `<div style="display: flex; width: 100%; font-family: 'Consolas', 'Monaco', monospace; height: 100%;">
    <div style="flex: 1; border-right: 2px solid #3c3c3c; display: flex; flex-direction: column; min-width: 0;">
      <div style="background: rgba(244, 67, 54, 0.1); padding: 10px 16px; font-size: 12px; color: #f48771; font-weight: 600; border-bottom: 1px solid #3c3c3c; display: flex; align-items: center; gap: 8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Original (Base)
      </div>
      <div style="flex: 1; overflow-y: auto; line-height: 1.5;">${left.map(item => renderLine(item, 'left')).join('')}</div>
    </div>
    <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
      <div style="background: rgba(76, 175, 80, 0.1); padding: 10px 16px; font-size: 12px; color: #89d185; font-weight: 600; border-bottom: 1px solid #3c3c3c; display: flex; align-items: center; gap: 8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        Modified (Working)
      </div>
      <div style="flex: 1; overflow-y: auto; line-height: 1.5;">${right.map(item => renderLine(item, 'right')).join('')}</div>
    </div>
  </div>`;
}

// Keep old functions for backward compatibility
function formatUnifiedDiff(diff: string): string {
  return formatUnifiedDiffClean(diff);
}

function formatSideBySideDiff(diff: string): string {
  return formatSideBySideDiffClean(diff);
}

// ============================================================================
// ✅ STANDALONE HISTORY DIALOG
// ============================================================================

async function showStandaloneHistoryDialog(filePath: string, fileName: string): Promise<void> {
  console.log('📜 Opening standalone history dialog for:', filePath);
  
  // Remove any existing dialog
  document.querySelector('.svn-standalone-history-dialog')?.remove();
  
  // Inject animation styles
  injectAnimationStyles();
  
  // Create floating dialog with animation
  const dialog = document.createElement('div');
  dialog.className = 'svn-standalone-history-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 75vw;
    max-width: 1100px;
    height: 80vh;
    min-width: 500px;
    min-height: 400px;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100010;
    resize: both;
    opacity: 0;
  `;
  
  // Loading state with animation
  dialog.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888;">
      <div class="svn-loading-spinner" style="width: 48px; height: 48px; border: 3px solid #3c3c3c; border-top-color: #dcdcaa; border-radius: 50%; animation: svnSpin 1s linear infinite; margin-bottom: 16px;"></div>
      <div style="font-size: 15px; animation: svnPulse 1.5s ease-in-out infinite;">Loading history for ${escapeHtml(fileName)}...</div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Show dialog after it's positioned (prevents flash at wrong position)
  requestAnimationFrame(() => {
    dialog.style.opacity = '1';
    // Use crossfade when switching from another dialog, zoom in for fresh open
    if ((window as any).__svnDialogSwitching) {
      dialog.style.animation = 'svnDialogFadeIn 0.3s ease-out';
    } else {
      dialog.style.animation = 'svnDialogZoomIn 0.4s ease-out';
    }
  });
  
  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialogWithAnimation(dialog, handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Store log for AI analysis
  let historyLog: any[] = [];
  
  try {
    const log = await svnManager.getLog(filePath, 50);
    historyLog = log || [];
    
    if (!log || log.length === 0) {
      dialog.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888; padding: 40px; animation: svnFadeIn 0.3s ease-out;">
          <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
          <div style="font-size: 18px; color: #ccc; margin-bottom: 12px; font-weight: 600;">No History Found</div>
          <div style="font-size: 14px; margin-bottom: 24px;">This file has no recorded revisions yet.</div>
          <button onclick="this.closest('.svn-standalone-history-dialog').remove()" style="
            padding: 10px 24px;
            background: #569cd6;
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Close</button>
        </div>
      `;
      return;
    }
    
    const getTimeAgo = (date: Date) => {
      const diffMs = Date.now() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffDays > 365) return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
      if (diffDays > 30) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      return 'just now';
    };
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    const authors = [...new Set(log.map(e => e.author))];
    const firstDate = new Date(log[log.length - 1].date);
    const daysSinceCreated = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    dialog.innerHTML = `
      <!-- Draggable Title Bar -->
      <div id="history-dialog-titlebar" style="
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        background: linear-gradient(180deg, #2d2d30 0%, #252526 100%);
        border-bottom: 1px solid #3c3c3c;
        cursor: move;
        user-select: none;
      ">
        <!-- Icon & Title -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #dcdcaa, #ce9178);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: svnIconPop 0.4s ease-out;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px;">File History</div>
          <div style="font-size: 12px; color: #888; font-family: 'Consolas', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(filePath)}">${escapeHtml(fileName)}</div>
        </div>
        
        <!-- Stats with animation -->
        <div style="display: flex; gap: 8px;">
          <div style="padding: 8px 16px; background: #252526; border: 1px solid #3c3c3c; border-radius: 8px; text-align: center; animation: svnFadeInUp 0.3s ease-out 0.1s both;">
            <div style="font-size: 18px; font-weight: 700; color: #4ec9b0;">${log.length}</div>
            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Revisions</div>
          </div>
          <div style="padding: 8px 16px; background: #252526; border: 1px solid #3c3c3c; border-radius: 8px; text-align: center; animation: svnFadeInUp 0.3s ease-out 0.2s both;">
            <div style="font-size: 18px; font-weight: 700; color: #dcdcaa;">${authors.length}</div>
            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Authors</div>
          </div>
          <div style="padding: 8px 16px; background: #252526; border: 1px solid #3c3c3c; border-radius: 8px; text-align: center; animation: svnFadeInUp 0.3s ease-out 0.3s both;">
            <div style="font-size: 18px; font-weight: 700; color: #ce9178;">${daysSinceCreated}</div>
            <div style="font-size: 10px; color: #888; text-transform: uppercase;">Days Old</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; animation: svnFadeIn 0.3s ease-out 0.4s both;">
          <!-- AI Analysis Button -->
          <button id="history-dialog-ai-btn" style="
            padding: 8px 18px;
            background: linear-gradient(135deg, #7c4dff 0%, #536dfe 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(124, 77, 255, 0.3);
            transition: all 0.2s ease;
          ">
            <span style="font-size: 14px;">✨</span>
            AI Analysis
          </button>
          
          <button id="history-dialog-diff-btn" style="
            padding: 8px 18px;
            background: linear-gradient(135deg, #569cd6 0%, #4e8fba 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(86, 156, 214, 0.3);
            transition: all 0.2s ease;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v18M3 12h18"/>
            </svg>
            View Diff
          </button>
        </div>
        
        <!-- Close Button -->
        <button id="history-dialog-close-btn" style="
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #808080;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s ease;
        " title="Close (Esc)">×</button>
      </div>
      
      <!-- Main Content Area -->
      <div style="flex: 1; display: flex; overflow: hidden;">
        <!-- History List -->
        <div id="history-list-container" style="flex: 1; overflow-y: auto; padding: 16px 20px; background: #1a1a1a;">
          <!-- Timeline Header -->
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #252526;
            border-radius: 8px;
            margin-bottom: 16px;
            animation: svnFadeInUp 0.3s ease-out;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2">
              <line x1="12" y1="2" x2="12" y2="22"/>
              <circle cx="12" cy="6" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="18" r="2"/>
            </svg>
            <span style="font-size: 12px; color: #888; font-weight: 500;">Revision Timeline</span>
            <span style="font-size: 11px; color: #666; margin-left: auto;">
              First: <span style="color: #ce9178;">r${log[log.length - 1].revision}</span>
              → Latest: <span style="color: #4ec9b0;">r${log[0].revision}</span>
            </span>
          </div>
          
          ${log.map((entry, idx) => {
            const entryDate = new Date(entry.date);
            const isLatest = idx === 0;
            const delay = Math.min(idx * 0.05, 0.5);
            
            return `
              <div class="svn-history-entry" style="
                display: flex;
                gap: 16px;
                padding: 16px;
                margin-bottom: 12px;
                background: ${isLatest ? 'linear-gradient(135deg, rgba(78, 201, 176, 0.08), rgba(86, 156, 214, 0.04))' : '#252526'};
                border: 1px solid ${isLatest ? 'rgba(78, 201, 176, 0.25)' : '#3c3c3c'};
                border-radius: 10px;
                position: relative;
                animation: svnFadeInLeft 0.3s ease-out ${delay}s both;
              ">
                ${isLatest ? `
                  <div style="
                    position: absolute;
                    top: -9px;
                    right: 16px;
                    background: linear-gradient(135deg, #4ec9b0, #3ba892);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  ">Latest</div>
                ` : ''}
                
                <!-- Timeline Dot -->
                <div style="display: flex; flex-direction: column; align-items: center; padding-top: 4px;">
                  <div style="
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: ${isLatest ? '#4ec9b0' : '#569cd6'};
                    box-shadow: 0 0 8px ${isLatest ? 'rgba(78, 201, 176, 0.5)' : 'rgba(86, 156, 214, 0.3)'};
                  "></div>
                  ${idx < log.length - 1 ? `
                    <div style="width: 2px; flex: 1; background: #3c3c3c; margin-top: 8px; min-height: 40px;"></div>
                  ` : ''}
                </div>
                
                <!-- Content -->
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                    <!-- Revision Badge -->
                    <div style="
                      padding: 6px 14px;
                      background: ${isLatest ? 'rgba(78, 201, 176, 0.15)' : 'rgba(86, 156, 214, 0.12)'};
                      border: 1px solid ${isLatest ? 'rgba(78, 201, 176, 0.3)' : 'rgba(86, 156, 214, 0.25)'};
                      border-radius: 8px;
                    ">
                      <span style="font-size: 14px; font-weight: 700; color: ${isLatest ? '#4ec9b0' : '#569cd6'}; font-family: 'Consolas', monospace;">
                        r${entry.revision}
                      </span>
                    </div>
                    
                    <!-- Author -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #dcdcaa, #ce9178);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 11px;
                        color: #1e1e1e;
                        font-weight: 700;
                      ">${escapeHtml(entry.author.charAt(0).toUpperCase())}</div>
                      <span style="font-size: 13px; color: #dcdcaa; font-weight: 500;">${escapeHtml(entry.author)}</span>
                    </div>
                    
                    <!-- Time -->
                    <div style="display: flex; align-items: center; gap: 6px; color: #888; font-size: 12px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span title="${formatDate(entryDate)}">${getTimeAgo(entryDate)}</span>
                    </div>
                    
                    <span style="font-size: 11px; color: #666; margin-left: auto;">${formatDate(entryDate)}</span>
                    
                    <!-- View Diff Button -->
                    <button class="view-rev-diff-btn" data-rev="${entry.revision}" style="
                      padding: 6px 14px;
                      background: rgba(86, 156, 214, 0.1);
                      border: 1px solid rgba(86, 156, 214, 0.25);
                      border-radius: 6px;
                      color: #569cd6;
                      font-size: 12px;
                      font-weight: 500;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      transition: all 0.2s ease;
                    ">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 3v18M3 12h18"/>
                      </svg>
                      View
                    </button>
                  </div>
                  
                  <!-- Commit Message -->
                  <div style="
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 8px;
                    padding: 12px 14px;
                    border-left: 3px solid ${isLatest ? '#4ec9b0' : '#3c3c3c'};
                  ">
                    <div style="font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Commit Message</div>
                    <div style="font-size: 13px; color: #d4d4d4; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(entry.message || 'No commit message')}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- AI Analysis Panel (Hidden by default) -->
        <div id="history-ai-analysis-panel" style="
          width: 0;
          overflow: hidden;
          background: #1e1e1e;
          border-left: 1px solid #333;
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
        ">
          <div style="padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; display: flex; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: #ccc; text-transform: uppercase; letter-spacing: 0.5px;">AI Analysis</span>
            <button id="close-history-ai-panel-btn" style="margin-left: auto; background: none; border: none; color: #666; cursor: pointer; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 3px; transition: all 0.15s;" onmouseover="this.style.background='#333';this.style.color='#ccc'" onmouseout="this.style.background='none';this.style.color='#666'">×</button>
          </div>
          <div id="history-ai-analysis-content" style="flex: 1; overflow-y: auto; padding: 12px;">
            <!-- AI analysis will be inserted here -->
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #252526;
        border-top: 1px solid #3c3c3c;
        font-size: 11px;
        color: #666;
      ">
        <div>Press <kbd style="background: #3c3c3c; padding: 2px 6px; border-radius: 3px; color: #ccc;">Esc</kbd> to close</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>Showing ${log.length} revision${log.length > 1 ? 's' : ''}</span>
          <span>•</span>
          <span>Drag title bar to move</span>
        </div>
      </div>
    `;
    
    // Make dialog draggable
    makeDraggable(dialog, dialog.querySelector('#history-dialog-titlebar') as HTMLElement);
    
    // Setup close button
    const closeBtn = dialog.querySelector('#history-dialog-close-btn');
    closeBtn?.addEventListener('click', () => closeDialogWithAnimation(dialog, handleEscape));
    closeBtn?.addEventListener('mouseenter', () => {
      (closeBtn as HTMLElement).style.background = 'rgba(244, 67, 54, 0.2)';
      (closeBtn as HTMLElement).style.color = '#f44336';
    });
    closeBtn?.addEventListener('mouseleave', () => {
      (closeBtn as HTMLElement).style.background = 'transparent';
      (closeBtn as HTMLElement).style.color = '#808080';
    });
    
    // AI Analysis button
    const aiBtn = dialog.querySelector('#history-dialog-ai-btn');
    const aiPanel = dialog.querySelector('#history-ai-analysis-panel') as HTMLElement;
    const aiContent = dialog.querySelector('#history-ai-analysis-content') as HTMLElement;
    const closeAiPanelBtn = dialog.querySelector('#close-history-ai-panel-btn');
    
    aiBtn?.addEventListener('click', async () => {
      if (aiPanel.style.width === '360px') {
        aiPanel.style.width = '0';
        return;
      }
      
      aiPanel.style.width = '360px';
      aiContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 20px 12px; color: #888;">
          <div class="svn-loading-spinner" style="width: 16px; height: 16px; border: 2px solid #333; border-top-color: #7c4dff; border-radius: 50%; animation: svnSpin 0.8s linear infinite;"></div>
          <div style="font-size: 13px; color: #888;">Analyzing history...</div>
        </div>
      `;
      
      try {
        const analysis = await analyzeCommitHistory(historyLog, fileName);
        aiContent.innerHTML = `
          <div style="animation: svnFadeIn 0.2s ease-out;">
            ${analysis}
          </div>
        `;
      } catch (error) {
        aiContent.innerHTML = `
          <div style="padding: 12px; color: #f44336; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span style="font-weight: 600;">Analysis Failed</span>
            </div>
            <div style="color: #888; font-size: 10px;">${escapeHtml(String(error))}</div>
          </div>
        `;
      }
    });
    
    closeAiPanelBtn?.addEventListener('click', () => {
      aiPanel.style.width = '0';
    });
    closeAiPanelBtn?.addEventListener('mouseenter', () => {
      (closeAiPanelBtn as HTMLElement).style.color = '#f44336';
    });
    closeAiPanelBtn?.addEventListener('mouseleave', () => {
      (closeAiPanelBtn as HTMLElement).style.color = '#888';
    });
    
    // View Diff button in header
    dialog.querySelector('#history-dialog-diff-btn')?.addEventListener('click', () => {
      // Use flip animation for switching between dialogs
      closeDialogWithCrossfade(dialog, handleEscape);
      (window as any).__svnDialogSwitching = true;
      setTimeout(() => {
        showStandaloneDiffDialog(filePath, fileName);
        (window as any).__svnDialogSwitching = false;
      }, 300);
    });
    
    // View buttons on each entry
    dialog.querySelectorAll('.view-rev-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Use flip animation for switching between dialogs
        closeDialogWithCrossfade(dialog, handleEscape);
        (window as any).__svnDialogSwitching = true;
        setTimeout(() => {
          showStandaloneDiffDialog(filePath, fileName);
          (window as any).__svnDialogSwitching = false;
        }, 300);
      });
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.background = 'rgba(86, 156, 214, 0.25)';
        (btn as HTMLElement).style.borderColor = 'rgba(86, 156, 214, 0.5)';
        (btn as HTMLElement).style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.background = 'rgba(86, 156, 214, 0.1)';
        (btn as HTMLElement).style.borderColor = 'rgba(86, 156, 214, 0.25)';
        (btn as HTMLElement).style.transform = 'scale(1)';
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to load history:', error);
    dialog.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888; padding: 40px; animation: svnFadeIn 0.3s ease-out;">
        <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
        <div style="font-size: 18px; color: #f44336; margin-bottom: 12px; font-weight: 600;">Failed to load history</div>
        <div style="font-size: 14px; margin-bottom: 24px; max-width: 400px; text-align: center; line-height: 1.5;">${escapeHtml(String(error))}</div>
        <button onclick="this.closest('.svn-standalone-history-dialog').remove()" style="
          padding: 10px 24px;
          background: #569cd6;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Close</button>
      </div>
    `;
  }
}

(window as any).showStandaloneDiffDialog = showStandaloneDiffDialog;
(window as any).showStandaloneHistoryDialog = showStandaloneHistoryDialog;

// ============================================================================
// ✅ SVN SUBMENU FOR CONTEXT MENU
// ============================================================================

async function addSvnSubmenu(menu: HTMLElement, path: string, fileName: string, isDirectory: boolean): Promise<void> {
  // Check if this is an SVN working copy
  const projectPath = (window as any).currentFolderPath || localStorage.getItem('currentProjectPath');
  
  try {
    const isSvn = await svnManager.isWorkingCopy(projectPath || path);
    if (!isSvn) {
      console.log('📁 Not an SVN working copy, skipping SVN menu');
      return;
    }
  } catch (error) {
    console.log('⚠️ SVN check failed:', error);
    return;
  }
  
  console.log('🔄 Adding SVN submenu for:', fileName);
  
  // Add separator before SVN section
  const separator = document.createElement('div');
  separator.className = 'fcm-divider';
  separator.style.scrollSnapAlign = 'start';
  menu.appendChild(separator);
  
  // Create SVN submenu trigger
  const svnMenuItem = document.createElement('div');
  svnMenuItem.className = 'fcm-item fcm-has-submenu';
  svnMenuItem.style.cssText = 'position: relative; scroll-snap-align: start;';
  svnMenuItem.innerHTML = `
    <div class="fcm-icon" style="background: linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 87, 34, 0.15)); color: #ff9800;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/>
      </svg>
    </div>
    <span class="fcm-text" style="background: linear-gradient(90deg, #ff9800, #ff5722); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 600;">SVN</span>
    <span style="margin-left: auto; color: #666; font-size: 10px;">▶</span>
  `;
  
  // Create submenu container
  const submenu = document.createElement('div');
  submenu.className = 'fcm-submenu svn-submenu';
  submenu.style.cssText = `
    position: fixed;
    min-width: 200px;
    background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(20px);
    display: none;
    z-index: 100002;
  `;
  
  // Submenu header
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
  
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
    flex-shrink: 0;
  `;
  iconContainer.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/>
    </svg>
  `;
  
  const infoContainer = document.createElement('div');
  infoContainer.style.cssText = 'flex: 1; min-width: 0;';
  infoContainer.innerHTML = `
    <div style="font-size: 13px; font-weight: 600; color: #e6edf3;">SVN</div>
    <div style="font-size: 10px; color: #7d8590; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</div>
  `;
  
  submenuHeader.appendChild(iconContainer);
  submenuHeader.appendChild(infoContainer);
  submenu.appendChild(submenuHeader);
  
  // SVN Icons for submenu
  const SVN_ICONS = {
    commit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="8"/><polyline points="8,4 12,2 16,4"/></svg>`,
    update: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    diff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
    revert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    tortoise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  };
  
  // SVN menu options
  const svnOptions: Array<{type?: string; icon?: string; label?: string; action?: () => Promise<void>; separator?: boolean}> = [
    { 
      type: 'commit', 
      icon: SVN_ICONS.commit, 
      label: 'Commit...', 
      action: async () => {
        // ✅ Show quick commit dialog instead of full panel
        showQuickCommitDialog(path, fileName);
      }
    },
    { 
      type: 'update', 
      icon: SVN_ICONS.update, 
      label: 'Update', 
      action: async () => {
        try {
          if ((window as any).showNotification) {
            (window as any).showNotification('🔄 Updating...', 'info');
          }
          const targetPath = isDirectory ? path : path.split(/[/\\]/).slice(0, -1).join(path.includes('/') ? '/' : '\\');
          await svnManager.update(targetPath);
          if ((window as any).showNotification) {
            (window as any).showNotification('✅ Update complete', 'success');
          }
          document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        } catch (error) {
          if ((window as any).showNotification) {
            (window as any).showNotification('❌ Update failed', 'error');
          }
        }
      }
    },
    { 
      type: 'diff', 
      icon: SVN_ICONS.diff, 
      label: 'Diff', 
      action: async () => {
        console.log('📊 SVN Diff menu clicked for:', path);
        // ✅ NEW: Show standalone diff dialog instead of full panel
        showStandaloneDiffDialog(path, fileName);
      }
    },
    { 
      type: 'history', 
      icon: SVN_ICONS.history, 
      label: 'History', 
      action: async () => {
        console.log('📜 SVN History menu clicked for:', path);
        // ✅ NEW: Show standalone history dialog
        showStandaloneHistoryDialog(path, fileName);
      }
    },
    { 
      type: 'revert', 
      icon: SVN_ICONS.revert, 
      label: 'Revert', 
      action: async () => {
        if (confirm(`Revert changes to "${fileName}"?\n\nThis cannot be undone!`)) {
          try {
            await svnManager.revert([path]);
            if ((window as any).showNotification) {
              (window as any).showNotification('✅ File reverted', 'success');
            }
            document.dispatchEvent(new CustomEvent('file-tree-refresh'));
          } catch (error) {
            if ((window as any).showNotification) {
              (window as any).showNotification('❌ Revert failed', 'error');
            }
          }
        }
      }
    },
    { 
      type: 'add', 
      icon: SVN_ICONS.add, 
      label: 'Add', 
      action: async () => {
        try {
          await svnManager.add([path]);
          if ((window as any).showNotification) {
            (window as any).showNotification('✅ File added to SVN', 'success');
          }
          document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        } catch (error) {
          if ((window as any).showNotification) {
            (window as any).showNotification('❌ Add failed', 'error');
          }
        }
      }
    },
    { separator: true },
    { 
      type: 'tortoise', 
      icon: SVN_ICONS.tortoise, 
      label: 'TortoiseSVN', 
      action: async () => {
        try {
          await svnManager.openTortoiseSVN('reposbrowser', path);
        } catch (error) {
          if ((window as any).showNotification) {
            (window as any).showNotification('❌ TortoiseSVN not available', 'error');
          }
        }
      }
    },
  ];
  
  svnOptions.forEach((opt) => {
    if (opt.separator) {
      const sep = document.createElement('div');
      sep.className = 'fcm-divider';
      submenu.appendChild(sep);
      return;
    }
    
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
    `;
    
    item.innerHTML = `
      <div class="fcm-icon" style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.04); border-radius: 6px;">
        ${opt.icon}
      </div>
      <span style="flex: 1; font-size: 12.5px;">${opt.label}</span>
    `;
    
    // Hover effects
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(255, 152, 0, 0.15)';
      item.style.color = '#fff';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
      item.style.color = '#d4d4d4';
    });
    
    // Click handler
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Close menu
      const contextMenu = document.querySelector('.file-context-menu');
      if (contextMenu) {
    // contextMenu.classList.add('closing');
    existingMenu.remove(); // instant remove
      }
      // Execute action
      if (opt.action) {
        await opt.action();
      }
    });
    
    submenu.appendChild(item);
  });
  
  // ✅ Append submenu to document.body for reliable fixed positioning
  document.body.appendChild(submenu);
  
  // Show/hide submenu on hover
  let hideTimeout: number | null = null;
  
  svnMenuItem.addEventListener('mouseenter', () => {
    console.log('🔄 SVN menu hover - showing submenu');
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    // Position submenu
    const rect = svnMenuItem.getBoundingClientRect();
    submenu.style.display = 'block';
    submenu.style.left = `${rect.right + 4}px`;
    submenu.style.top = `${rect.top}px`;
    
    // Adjust if goes off screen
    requestAnimationFrame(() => {
      const subRect = submenu.getBoundingClientRect();
      if (subRect.right > window.innerWidth - 10) {
        submenu.style.left = `${rect.left - subRect.width - 4}px`;
      }
      if (subRect.bottom > window.innerHeight - 10) {
        submenu.style.top = `${window.innerHeight - subRect.height - 10}px`;
      }
    });
    
    svnMenuItem.style.background = 'rgba(255, 255, 255, 0.06)';
  });
  
  svnMenuItem.addEventListener('mouseleave', (e) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (submenu.contains(relatedTarget)) return;
    
    hideTimeout = window.setTimeout(() => {
      submenu.style.display = 'none';
      svnMenuItem.style.background = 'transparent';
    }, 150);
  });
  
  submenu.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  submenu.addEventListener('mouseleave', () => {
    hideTimeout = window.setTimeout(() => {
      submenu.style.display = 'none';
      svnMenuItem.style.background = 'transparent';
    }, 150);
  });
  
  // ✅ Clean up submenu when main menu closes
  const cleanupSubmenu = () => {
    if (submenu && submenu.parentNode) {
      submenu.remove();
    }
  };
  
  // Watch for menu removal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === menu || (node as HTMLElement).contains?.(svnMenuItem)) {
          cleanupSubmenu();
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  menu.appendChild(svnMenuItem);
  console.log('✅ SVN submenu added');
}

// Close menu with animation
function closeContextMenu(menu: HTMLElement): void {
    // menu.classList.add('closing');
    menu?.remove(); document.querySelectorAll('.file-context-menu').forEach(m => m.remove()); // instant remove
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
  // ✅ SVN Icons
  svn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/></svg>`,
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
  overflow: visible; /* ✅ Changed from hidden to allow submenus */
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

/* ✅ Scroll Container Styles */
.fcm-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.fcm-scroll-container::-webkit-scrollbar {
  width: 4px;
}

.fcm-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.fcm-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.fcm-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.3);
}

.fcm-scroll-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  color: #666;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.fcm-scroll-up {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.fcm-scroll-down {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.fcm-scroll-indicator:hover {
  background: rgba(255,255,255,0.05);
  color: #fff;
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

/* ✅ SVN Submenu Styles */
.svn-submenu {
  position: fixed !important;
  z-index: 100003 !important;
  display: none;
}

.svn-submenu .fcm-item:hover {
  background: rgba(255, 152, 0, 0.15) !important;
}

.svn-submenu .fcm-item:hover::before {
  background: #ff9800 !important;
}

.fcm-has-submenu {
  position: relative;
  overflow: visible !important;
}

.fcm-has-submenu:hover > .svn-submenu {
  display: block !important;
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