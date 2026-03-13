// ============================================================================
// explorerLoadingState.ts - Explorer Loading State for Project Creation
// Animation: Option B — Cascade Drop + Bouncy Icons
// ============================================================================

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const name = filename.toLowerCase();
  const nameIcons: Record<string, string> = {
    'package.json': '📦', 'tsconfig.json': '🔧', 'vite.config.ts': '⚡',
    'vite.config.js': '⚡', '.gitignore': '🙈', '.env': '🔒',
    'readme.md': '📖', 'dockerfile': '🐳', 'requirements.txt': '📋',
    'cargo.toml': '🦀', 'go.mod': '🐹', 'makefile': '🔨',
  };
  if (nameIcons[name]) return nameIcons[name];
  const extIcons: Record<string, string> = {
    'ts': '🔷', 'tsx': '⚛️', 'js': '🟨', 'jsx': '⚛️',
    'py': '🐍', 'rs': '🦀', 'go': '🐹', 'java': '☕',
    'html': '🌐', 'css': '🎨', 'scss': '🎨',
    'json': '📋', 'yaml': '📋', 'yml': '📋', 'toml': '📋',
    'md': '📝', 'txt': '📄', 'svg': '🖼️', 'png': '🖼️',
    'sql': '🗃️', 'sh': '🐚', 'bat': '🐚', 'vue': '💚', 'svelte': '🔥',
    'kt': '🟣', 'cs': '🟢', 'cpp': '🔵', 'c': '🔵',
    'lock': '🔒',
  };
  return extIcons[ext] || '📄';
}

interface TreeNode {
  name: string;
  isFolder: boolean;
  children: TreeNode[];
  depth: number;
}

function buildTree(filePaths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find(n => n.name === part);
      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = { name: part, isFolder: !isLast, children: [], depth: i };
        current.push(node);
        current = node.children;
      }
    }
  }
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  }
  sortNodes(root);
  return root;
}

// Global row counter for staggered animations
let rowIndex = 0;

function renderTreeHTML(nodes: TreeNode[], depth: number = 0): string {
  return nodes.map((node) => {
    const idx = rowIndex++;
    const indent = depth * 18 + 8;
    const icon = node.isFolder ? '📁' : getFileIcon(node.name);
    const nameColor = node.isFolder ? '#ffb74d' : '#e6edf3';
    const entryDelay = (depth * 0.06 + idx * 0.06).toFixed(2);
    const bounceDelay = (idx * 0.15).toFixed(2);

    let html = `<div class="explorer-loading-row" style="
      display: flex; align-items: center; gap: 6px;
      padding: 3px 8px 3px ${indent}px;
      height: 24px; font-size: 13px;
      opacity: 0; position: relative;
      animation: explorerDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${entryDelay}s forwards;
    ">
      <span style="
        font-size: 14px; flex-shrink: 0; width: 18px; text-align: center;
        animation: explorerIconBounce 2s ease-in-out ${bounceDelay}s infinite;
      ">${icon}</span>
      <span style="color: ${nameColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${node.name}${node.isFolder ? '/' : ''}
      </span>
    </div>`;

    if (node.isFolder && node.children.length > 0) {
      html += renderTreeHTML(node.children, depth + 1);
    }
    return html;
  }).join('');
}

const LOADING_STYLES = `
  @keyframes explorerDrop {
    0% { opacity: 0; transform: translateY(-10px) scale(0.97); }
    60% { transform: translateY(2px) scale(1.01); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes explorerIconBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  @keyframes explorerHeaderPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @keyframes explorerProgress {
    0% { width: 0%; }
    40% { width: 50%; }
    100% { width: 90%; }
  }
  @keyframes explorerFooterBounce {
    0%, 100% { transform: translateY(0); opacity: 0.5; }
    50% { transform: translateY(-2px); opacity: 1; }
  }
  .explorer-loading-row:hover {
    background: rgba(255,255,255,0.03);
  }
`;

export function showOptimisticTree(files: Record<string, string>, projectName: string): void {
  const explorer = document.getElementById('file-explorer')
    || document.querySelector('.file-tree')
    || document.querySelector('.explorer-content');
  if (!explorer) {
    console.warn('[ExplorerLoading] No explorer panel found');
    return;
  }

  rowIndex = 0;
  const filePaths = Object.keys(files).sort();
  const tree = buildTree(filePaths);
  const treeHTML = renderTreeHTML(tree);
  const fileCount = filePaths.length;

  explorer.innerHTML = `
    <style>${LOADING_STYLES}</style>
    <div style="padding: 0;">
      <div style="
        padding: 8px 12px;
        border-bottom: 1px solid #3c3c3c;
        display: flex; align-items: center; gap: 8px;
        animation: explorerHeaderPulse 2s ease-in-out infinite;
      ">
        <span style="font-size: 14px;">📦</span>
        <span style="color: #4fc3f7; font-size: 13px; font-weight: 600;">${projectName}</span>
        <span style="
          color: #7d8590; font-size: 11px; margin-left: auto;
          background: rgba(79, 195, 247, 0.1);
          padding: 1px 6px; border-radius: 8px;
        ">${fileCount} files</span>
      </div>
      <div style="height: 2px; background: #2d2d2d; overflow: hidden;">
        <div style="
          height: 100%;
          background: linear-gradient(90deg, #4fc3f7, #81d4fa);
          animation: explorerProgress 3.5s ease-out forwards;
          border-radius: 1px;
        "></div>
      </div>
      <div style="padding: 4px 0;">${treeHTML}</div>
      <div style="
        padding: 8px 12px; color: #7d8590; font-size: 11px;
        text-align: center; border-top: 1px solid #2d2d2d; margin-top: 4px;
        animation: explorerFooterBounce 1.8s ease-in-out infinite;
      ">Setting up project workspace...</div>
    </div>
  `;
  console.log('[ExplorerLoading] Optimistic tree displayed:', fileCount, 'files for', projectName);
}

export function showExplorerSkeleton(projectName?: string): void {
  const explorer = document.getElementById('file-explorer')
    || document.querySelector('.file-tree')
    || document.querySelector('.explorer-content');
  if (!explorer) return;

  const rows = [
    { indent: 0, width: 90, isFolder: true },
    { indent: 18, width: 70, isFolder: true },
    { indent: 36, width: 85, isFolder: false },
    { indent: 36, width: 65, isFolder: false },
    { indent: 36, width: 95, isFolder: false },
    { indent: 18, width: 75, isFolder: true },
    { indent: 36, width: 80, isFolder: false },
    { indent: 36, width: 60, isFolder: false },
    { indent: 18, width: 100, isFolder: false },
    { indent: 18, width: 70, isFolder: false },
    { indent: 18, width: 85, isFolder: false },
  ];

  const skeletonHTML = rows.map((row, i) => {
    const entryDelay = (i * 0.06).toFixed(2);
    const bounceDelay = (i * 0.15).toFixed(2);
    return `
    <div class="explorer-loading-row" style="
      display: flex; align-items: center; gap: 6px;
      padding: 3px 8px 3px ${row.indent + 8}px; height: 24px;
      opacity: 0;
      animation: explorerDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${entryDelay}s forwards;
    ">
      <div style="
        width: 16px; height: 16px;
        border-radius: ${row.isFolder ? '3px' : '2px'};
        background: ${row.isFolder ? 'rgba(255, 183, 77, 0.15)' : 'rgba(79, 195, 247, 0.1)'};
        animation: explorerIconBounce 2s ease-in-out ${bounceDelay}s infinite;
      "></div>
      <div style="
        width: ${row.width}px; height: 11px; border-radius: 3px;
        background: rgba(125, 133, 144, 0.15);
        animation: explorerIconBounce 2s ease-in-out ${bounceDelay}s infinite;
      "></div>
    </div>`;
  }).join('');

  explorer.innerHTML = `
    <style>${LOADING_STYLES}</style>
    <div style="padding: 0;">
      <div style="
        padding: 8px 12px;
        border-bottom: 1px solid #3c3c3c;
        display: flex; align-items: center; gap: 8px;
        animation: explorerHeaderPulse 2s ease-in-out infinite;
      ">
        <span style="font-size: 14px;">📂</span>
        <span style="color: #4fc3f7; font-size: 13px; font-weight: 600;">
          ${projectName || 'Loading project...'}</span>
      </div>
      <div style="height: 2px; background: #2d2d2d; overflow: hidden;">
        <div style="
          height: 100%;
          background: linear-gradient(90deg, #4fc3f7, #81d4fa);
          animation: explorerProgress 4s ease-out forwards;
        "></div>
      </div>
      <div style="padding: 4px 0;">${skeletonHTML}</div>
      <div style="
        padding: 8px 12px; color: #7d8590; font-size: 11px;
        text-align: center; border-top: 1px solid #2d2d2d; margin-top: 4px;
        animation: explorerFooterBounce 1.8s ease-in-out infinite;
      ">Scanning project files...</div>
    </div>
  `;
  console.log('[ExplorerLoading] Skeleton loader displayed');
}

export function clearExplorerLoading(): void {
  const loadingRows = document.querySelectorAll('.explorer-loading-row');
  if (loadingRows.length > 0) {
    console.log('[ExplorerLoading] Cleared loading state');
  }
}