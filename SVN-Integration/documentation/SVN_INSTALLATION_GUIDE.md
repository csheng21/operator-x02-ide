# 🔄 SVN Integration - Complete Installation Guide

This guide will help you integrate SVN (Subversion) functionality into your AI IDE with TortoiseSVN compatibility.

## 📋 Prerequisites

1. **SVN Command Line Tools** installed on your system
   - Windows: Install TortoiseSVN with command line tools
   - macOS: `brew install subversion`
   - Linux: `sudo apt-get install subversion`

2. **Your existing AI IDE project** with Tauri v2

---

## 🚀 Installation Steps

### **STEP 1: Backend Setup (Rust)**

#### 1.1 Copy SVN Commands Module

Copy `svn_commands.rs` to your Rust source directory:

```
src-tauri/src/svn_commands.rs
```

#### 1.2 Update main.rs

Edit `src-tauri/src/main.rs`:

**A. Add module import (after line 16, after `use build_commands::*;`):**

```rust
mod svn_commands;
use svn_commands::*;
```

**B. Register SVN commands in the invoke_handler (around line 103):**

Add these lines before the closing bracket `]`:

```rust
            // SVN commands
            svn_check_installed,
            svn_status,
            svn_info,
            svn_commit,
            svn_update,
            svn_revert,
            svn_add,
            svn_delete,
            svn_diff,
            svn_log,
            svn_resolve,
            svn_cat,
            open_tortoise_svn,
            svn_cleanup,
```

**C. Update setup message (around line 119):**

Add this line after the terminal integration message:

```rust
            println!("🔄 SVN integration enabled (TortoiseSVN compatible)");
```

---

### **STEP 2: Frontend Setup (TypeScript)**

#### 2.1 Create SVN Directory

Create a new directory in your `src/ide` folder:

```
src/ide/svn/
```

#### 2.2 Copy Frontend Files

Copy all TypeScript files to `src/ide/svn/`:

```
src/ide/svn/
├── svnManager.ts
├── svnUI.ts
├── svnDiffViewer.ts
├── svnFileExplorerIntegration.ts
└── svnStatusBar.ts
```

#### 2.3 Copy CSS File

Copy `svn.css` to the SVN directory:

```
src/ide/svn/svn.css
```

---

### **STEP 3: Import SVN in main.ts**

Edit your `src/main.ts` file:

**Add these imports at the top with your other IDE imports:**

```typescript
// SVN Integration
import { svnManager } from './ide/svn/svnManager';
import { svnUI } from './ide/svn/svnUI';
import { svnFileExplorerIntegration } from './ide/svn/svnFileExplorerIntegration';
import { svnStatusBar } from './ide/svn/svnStatusBar';
import './ide/svn/svn.css';
```

**In your initialization code (inside DOMContentLoaded or initialization function):**

```typescript
// Initialize SVN integration
async function initializeSVN() {
    // Check if SVN is installed
    const isSvnInstalled = await svnManager.checkSvnInstalled();
    
    if (isSvnInstalled) {
        console.log('✅ SVN integration enabled');
        
        // Initialize SVN UI
        await svnUI.initialize();
        
        // Initialize status bar
        svnStatusBar.initialize();
        
        // Start auto-refresh every 5 seconds
        svnManager.startAutoRefresh(5000);
    } else {
        console.warn('⚠️ SVN not installed. SVN features disabled.');
    }
}

// Call during initialization
document.addEventListener('DOMContentLoaded', async () => {
    // ... your existing initialization code
    
    // Initialize SVN
    await initializeSVN();
    
    // ... rest of your initialization
});
```

---

### **STEP 4: Integrate with File Explorer (Optional but Recommended)**

If you want SVN status indicators in your file explorer, add this to your file explorer code:

**In your file tree renderer (e.g., `src/ide/fileExplorer/fileTreeRenderer.ts`):**

```typescript
import { svnFileExplorerIntegration } from '../svn/svnFileExplorerIntegration';

// After rendering files, add SVN status indicators
function renderFileTree() {
    // ... your existing file tree rendering code
    
    // Refresh SVN indicators after rendering
    svnFileExplorerIntegration.refreshFileExplorer();
}
```

**For context menus (e.g., in `src/ide/fileExplorer/fileClickHandlers.ts`):**

```typescript
import { svnFileExplorerIntegration } from '../svn/svnFileExplorerIntegration';

function showFileContextMenu(filePath: string, event: MouseEvent) {
    const menu = createContextMenu();
    
    // ... your existing context menu items
    
    // Add SVN context menu items
    svnFileExplorerIntegration.addContextMenuItems(filePath, menu);
    
    // Show menu
    positionMenu(menu, event);
}
```

---

### **STEP 5: Set Working Directory**

When a project is opened, set the SVN working directory:

```typescript
// When user opens a folder/project
async function openProject(projectPath: string) {
    // ... your existing project opening code
    
    // Set SVN working directory
    svnManager.setCurrentPath(projectPath);
    
    // Refresh SVN status
    await svnManager.refreshStatus();
    
    // Update status bar
    svnStatusBar.updateStatusBar();
}
```

---

### **STEP 6: Add SVN Menu (Optional)**

Add an SVN menu to your top menu bar:

**In your menu setup code (e.g., `src/menuSystem.ts`):**

```typescript
{
    label: 'SVN',
    submenu: [
        {
            label: '🔄 Update',
            accelerator: 'CmdOrCtrl+Shift+U',
            click: async () => {
                try {
                    const result = await svnManager.update();
                    showNotification('Update complete: ' + result);
                } catch (error) {
                    showNotification('Update failed: ' + error, 'error');
                }
            }
        },
        {
            label: '📤 Commit...',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => {
                svnUI.show();
                // Focus on commit message
                const commitMessage = document.querySelector('#svn-commit-message') as HTMLTextAreaElement;
                commitMessage?.focus();
            }
        },
        { type: 'separator' },
        {
            label: '📊 Show Changes',
            click: () => {
                svnUI.show();
            }
        },
        {
            label: '📜 View Log',
            click: async () => {
                const entries = await svnManager.getLog();
                console.log('Log entries:', entries);
                // TODO: Show log viewer dialog
            }
        },
        { type: 'separator' },
        {
            label: '🔧 TortoiseSVN',
            submenu: [
                {
                    label: 'Update',
                    click: () => svnManager.openTortoiseSVN('update')
                },
                {
                    label: 'Commit',
                    click: () => svnManager.openTortoiseSVN('commit')
                },
                {
                    label: 'Log',
                    click: () => svnManager.openTortoiseSVN('log')
                },
                {
                    label: 'Repository Browser',
                    click: () => svnManager.openTortoiseSVN('repobrowser')
                },
                { type: 'separator' },
                {
                    label: 'Cleanup',
                    click: async () => {
                        try {
                            const result = await svnManager.cleanup();
                            showNotification(result);
                        } catch (error) {
                            showNotification('Cleanup failed: ' + error, 'error');
                        }
                    }
                }
            ]
        }
    ]
}
```

---

## 🎨 UI Features Included

### 1. **Source Control Panel**
- Accessible via SVN tab in left sidebar
- Shows repository info (URL, revision, branch)
- Commit message input with Ctrl+Enter support
- Changes list with diff viewer
- Conflicts section with resolution options
- Unversioned files section

### 2. **File Explorer Integration**
- Colored status indicators (●) next to files:
  - 🔵 Blue = Modified
  - 🟢 Green = Added
  - 🔴 Red = Deleted
  - 🟡 Yellow = Conflicted
  - ⚪ Gray = Unversioned
- SVN context menu on right-click
- Quick actions (diff, revert, commit)

### 3. **Status Bar**
- Shows current branch and revision
- Displays changes count
- Highlights conflicts with yellow badge
- Click to open SVN panel

### 4. **Diff Viewer**
- Side-by-side comparison using Monaco editor
- Toggle inline view
- Syntax highlighting
- Quick revert action

### 5. **TortoiseSVN Integration** (Windows)
- Launch TortoiseSVN dialogs directly
- Update, commit, log, repo browser
- Seamless integration with your workflow

---

## 🔧 Configuration

### Auto-Refresh Interval

Change the auto-refresh interval (default: 5 seconds):

```typescript
// In your initialization code
svnManager.startAutoRefresh(10000); // 10 seconds
```

### Disable Auto-Refresh

```typescript
svnManager.stopAutoRefresh();
```

---

## 🧪 Testing

### 1. Check SVN Installation

Open your IDE's developer console and run:

```javascript
const result = await svnManager.checkSvnInstalled();
console.log('SVN installed:', result);
```

### 2. Test Status

```javascript
const statuses = await svnManager.getStatus();
console.log('SVN status:', statuses);
```

### 3. Test Repository Info

```javascript
const info = await svnManager.getInfo();
console.log('SVN info:', info);
```

---

## 📝 Usage Examples

### Open SVN Panel
```typescript
svnUI.show();
```

### Get Changes Count
```typescript
const count = svnManager.getChangesCount();
console.log('Changes:', count);
```

### Commit Files
```typescript
await svnManager.commit('Fix bug in authentication', ['src/auth.ts', 'src/login.ts']);
```

### Update Working Copy
```typescript
const result = await svnManager.update();
console.log(result);
```

### Revert Files
```typescript
await svnManager.revert(['src/config.ts']);
```

### Show Diff
```typescript
import { showSvnDiffViewer } from './ide/svn/svnDiffViewer';
showSvnDiffViewer('src/main.ts');
```

---

## 🎯 Keyboard Shortcuts (Suggested)

Add these to your keyboard shortcuts:

- `Ctrl+Shift+U`: SVN Update
- `Ctrl+Shift+C`: Open SVN Commit
- `Ctrl+Shift+D`: Show Diff for current file
- `Ctrl+Shift+L`: Show SVN Log

---

## 🐛 Troubleshooting

### SVN Not Detected

**Problem:** SVN panel not showing

**Solution:**
1. Verify SVN is installed: `svn --version` in terminal
2. On Windows, install TortoiseSVN with command line tools
3. Restart your IDE

### TortoiseSVN Not Working

**Problem:** "TortoiseSVN not found" error

**Solution:**
1. Install TortoiseSVN from https://tortoisesvn.net/
2. Make sure `TortoiseProc.exe` is in your PATH
3. Typical location: `C:\Program Files\TortoiseSVN\bin\TortoiseProc.exe`

### File Status Not Updating

**Problem:** Status indicators not showing in file explorer

**Solution:**
1. Make sure you've set the working directory: `svnManager.setCurrentPath(projectPath)`
2. Refresh manually: `svnManager.refreshStatus()`
3. Check console for errors

### Diff Viewer Not Opening

**Problem:** Diff viewer shows errors

**Solution:**
1. Ensure Monaco editor is properly initialized
2. Check if file exists in BASE revision
3. Look for console errors

---

## 🎨 Customization

### Change Status Colors

Edit `src/ide/svn/svn.css`:

```css
.file-item .svn-status.modified {
    background: #your-color; /* Change blue color */
}
```

### Customize Panel Style

Edit the SVN panel styles in `svn.css`:

```css
.svn-panel {
    background: #your-background;
    /* Your custom styles */
}
```

---

## 📚 API Reference

### svnManager

```typescript
// Status operations
getStatus(path?: string): Promise<SvnFileStatus[]>
getInfo(path?: string): Promise<SvnInfo | null>
refreshStatus(): Promise<void>

// File operations
commit(message: string, files: string[]): Promise<string>
update(path?: string): Promise<string>
revert(files: string[]): Promise<string>
add(files: string[]): Promise<string>
delete(files: string[]): Promise<string>

// Diff and log
getDiff(filePath: string): Promise<string>
getLog(path?: string, limit?: number): Promise<SvnLogEntry[]>

// Conflict resolution
resolve(file: string, resolution: string): Promise<string>

// TortoiseSVN
openTortoiseSVN(action: string, path?: string): Promise<void>

// Utility
startAutoRefresh(intervalMs?: number): void
stopAutoRefresh(): void
onStatusChange(listener: (statuses) => void): () => void
```

---

## ✅ Installation Checklist

- [ ] Copied `svn_commands.rs` to `src-tauri/src/`
- [ ] Updated `main.rs` with SVN module and commands
- [ ] Created `src/ide/svn/` directory
- [ ] Copied all TypeScript files to `src/ide/svn/`
- [ ] Copied `svn.css` to `src/ide/svn/`
- [ ] Added SVN imports to `main.ts`
- [ ] Added SVN initialization code
- [ ] Tested SVN detection
- [ ] Tested status display
- [ ] Tested commit/update/revert operations
- [ ] Integrated with file explorer (optional)
- [ ] Added SVN menu (optional)
- [ ] Configured keyboard shortcuts (optional)

---

## 🎉 Congratulations!

You've successfully integrated SVN into your AI IDE! 

Your IDE now has:
- ✅ Professional SVN source control panel
- ✅ File status indicators
- ✅ Diff viewer with Monaco editor
- ✅ Commit/Update/Revert operations
- ✅ TortoiseSVN integration
- ✅ Status bar display
- ✅ Context menu integration
- ✅ Auto-refresh capabilities

Enjoy your enhanced development workflow! 🚀

---

## 📞 Support

If you encounter any issues:

1. Check the console for errors
2. Verify SVN is installed correctly
3. Ensure all files are in the correct locations
4. Check that main.rs has all SVN commands registered

For further assistance, refer to the troubleshooting section above.
