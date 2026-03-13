# Git Integration for Operator X02 IDE

Complete Git version control integration with modern UI, AI-powered features, and seamless IDE integration.

## 📁 File Structure

```
git-integration/
├── vcs/
│   ├── core/
│   │   ├── vcsTypes.ts          # TypeScript interfaces & types
│   │   └── vcsManager.ts        # Unified VCS abstraction layer
│   │
│   ├── git/
│   │   ├── gitManager.ts        # Git operations wrapper
│   │   ├── gitUIEnhanced.ts     # Main UI component (Part 1)
│   │   ├── gitUIEnhanced_part2.ts  # Rendering methods (merge with Part 1)
│   │   ├── gitUIEnhanced_part3.ts  # Operations & AI (merge with Part 1)
│   │   ├── gitUIStyles.css      # Complete stylesheet
│   │   └── gitContextMenu.ts    # File explorer context menu
│   │
│   └── index.ts                 # Main exports
│
└── rust/
    └── git_commands.rs          # Tauri backend commands
```

## 🚀 Installation

### Step 1: Copy TypeScript Files

Copy the `vcs` folder to your project:

```
src/ide/vcs/
├── core/
│   ├── vcsTypes.ts
│   └── vcsManager.ts
├── git/
│   ├── gitManager.ts
│   ├── gitUIEnhanced.ts  (combine all 3 parts)
│   ├── gitUIStyles.css
│   └── gitContextMenu.ts
└── index.ts
```

### Step 2: Merge UI Files

The UI is split into 3 parts for readability. Combine them into one file:

```typescript
// gitUIEnhanced.ts
// Copy content from:
// 1. gitUIEnhanced.ts (Part 1 - Core class)
// 2. gitUIEnhanced_part2.ts (Rendering methods)
// 3. gitUIEnhanced_part3.ts (Operations & utilities)
```

### Step 3: Add Rust Backend

1. Copy `git_commands.rs` to `src-tauri/src/commands/`

2. Update `Cargo.toml`:

```toml
[dependencies]
git2 = "0.18"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri = { version = "1.5", features = ["shell-open"] }
```

3. Register commands in `main.rs`:

```rust
mod commands;
use commands::git_commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Existing commands...
            
            // Git commands
            git_is_repository,
            git_init,
            git_clone,
            git_get_info,
            git_status,
            git_add,
            git_add_all,
            git_unstage,
            git_unstage_all,
            git_commit,
            git_branches,
            git_create_branch,
            git_switch_branch,
            git_delete_branch,
            git_rename_branch,
            git_remotes,
            git_add_remote,
            git_remove_remote,
            git_fetch,
            git_pull,
            git_push,
            git_log,
            git_show_commit,
            git_file_log,
            git_diff,
            git_show_diff,
            git_stash_list,
            git_stash_push,
            git_stash_apply,
            git_stash_pop,
            git_stash_drop,
            git_stash_clear,
            git_reset,
            git_checkout_file,
            git_revert,
            git_merge,
            git_merge_abort,
            git_conflicts,
            git_tags,
            git_create_tag,
            git_delete_tag,
            git_config_get,
            git_config_set,
            git_blame,
            check_git_repository,
            find_git_root,
            path_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 4: Initialize in App

```typescript
// In your App.tsx or main entry point
import { initializeVcs } from './ide/vcs';

// When project is opened
async function onProjectOpen(projectPath: string) {
    await initializeVcs(projectPath);
}
```

### Step 5: Add to Sidebar

```typescript
// In sidebar.ts or navigation component
import { showSourceControl } from './ide/vcs';

// Add Git icon to sidebar
const gitButton = createSidebarButton({
    icon: gitIcon,
    tooltip: 'Source Control',
    onClick: () => showSourceControl(currentProjectPath),
});
```

### Step 6: Integrate Context Menu

```typescript
// In contextMenuHandlers.ts
import { gitContextMenu } from './ide/vcs';

// When building context menu
const gitMenuItems = await gitContextMenu.getMenuItems(targetPath, isDirectory);
menuItems.push(...gitMenuItems);
```

## 🎨 Customization

### Change Colors

Edit `gitUIStyles.css`:

```css
:root {
    --git-staged: #4ec9b0;
    --git-modified: #dcdcaa;
    --git-deleted: #f14c4c;
    --git-untracked: #808080;
    --git-accent: #569cd6;
}
```

### Change AI Provider

Edit `gitUIEnhanced.ts`:

```typescript
const OPERATOR_X02_CONFIG = {
    apiKey: 'your-api-key',
    apiBaseUrl: 'https://api.your-provider.com/v1',
    model: 'your-model'
};
```

### Adjust Auto-Refresh

```typescript
// In gitUIEnhanced.ts
private autoRefreshInterval: number = 30000; // Change to desired ms
```

## 🔧 API Reference

### VCS Manager

```typescript
import { vcsManager } from './ide/vcs';

// Initialize
await vcsManager.initialize(projectPath);

// Get status
const status = await vcsManager.getStatus();

// Stage files
await vcsManager.stage(['file1.ts', 'file2.ts']);

// Commit
const commit = await vcsManager.commit('feat: Add feature');

// Branch operations
await vcsManager.switchBranch('feature/new');
await vcsManager.createBranch('feature/another');

// Remote operations
await vcsManager.push();
await vcsManager.pull();
```

### Git Manager (Direct)

```typescript
import { gitManager } from './ide/vcs';

// Open repository
await gitManager.open(projectPath);

// Get branches
const branches = await gitManager.getBranches();

// Get history
const commits = await gitManager.getLog({ maxCount: 50 });

// Get diff
const diff = await gitManager.getDiffString('file.ts', true);

// Stash
await gitManager.stash('WIP');
await gitManager.applyStash(0);
```

### Git UI

```typescript
import { gitUIEnhanced } from './ide/vcs';

// Show panel
gitUIEnhanced.show(projectPath);

// Hide panel
gitUIEnhanced.hide();

// Refresh
await gitUIEnhanced.refresh();
```

## ✨ Features

### Implemented
- ✅ Repository status with file grouping
- ✅ Stage/unstage files
- ✅ Commit with message
- ✅ AI-powered commit message generation
- ✅ Branch management (create, switch, delete)
- ✅ Push/Pull/Fetch operations
- ✅ Commit history with search
- ✅ Diff viewer (unified mode)
- ✅ Stash management
- ✅ File explorer context menu
- ✅ Dark theme matching VS Code

### Coming Soon
- 🔜 Split diff view
- 🔜 3-way merge editor
- 🔜 Visual branch graph
- 🔜 Blame view
- 🔜 Interactive rebase
- 🔜 GitHub/GitLab integration

## 🐛 Troubleshooting

### "Failed to open repository"
- Ensure the path contains a `.git` directory
- Check if Git is installed and accessible

### "Tauri API not available"
- Make sure you're running in the Tauri environment
- Check that `@tauri-apps/api` is properly configured

### Styling issues
- Ensure `gitUIStyles.css` is imported or the styles are injected
- Check for CSS conflicts with existing styles

### Performance issues with large repos
- Increase auto-refresh interval
- Use pagination for history (already implemented)

## 📝 License

MIT License - Feel free to use and modify for your projects.

---

Built for **Operator X02 IDE** by the development team.
