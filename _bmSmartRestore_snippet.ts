// ============================================================================
// SMART RESTORE — Auto-resolve file path, no prompt() needed
// Added by patch_backup_restore_fix.ps1
// ============================================================================

async function _bmSmartRestore(backupPath: string, originalFileName: string): Promise<void> {
  const mgr = SurgicalBackupManager.getInstance();

  // Step 1: Try to auto-resolve the file path
  let resolvedPath: string | null = null;
  const candidates: string[] = [];

  // 1a. Check currently active tab
  try {
    const tabMgr = (window as any).tabManager;
    if (tabMgr?.getActiveTab) {
      const activeTab = tabMgr.getActiveTab();
      if (activeTab?.filePath) {
        const activeFileName = activeTab.filePath.split(/[/\\]/).pop() || "";
        if (activeFileName === originalFileName) {
          resolvedPath = activeTab.filePath;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // 1b. Check all open tabs for matching filename
  if (!resolvedPath) {
    try {
      const tabMgr = (window as any).tabManager;
      const tabs = tabMgr?.getTabs?.() || tabMgr?.tabs || [];
      for (const tab of tabs) {
        const fp = tab.filePath || tab.path || "";
        const fn = fp.split(/[/\\]/).pop() || "";
        if (fn === originalFileName && fp) {
          candidates.push(fp);
        }
      }
      if (candidates.length === 1) {
        resolvedPath = candidates[0];
      }
    } catch (e) { /* ignore */ }
  }

  // 1c. Check global currentFilePath
  if (!resolvedPath && (window as any).currentFilePath) {
    const globalPath = (window as any).currentFilePath as string;
    const gfn = globalPath.split(/[/\\]/).pop() || "";
    if (gfn === originalFileName) {
      resolvedPath = globalPath;
    }
  }

  // 1d. Search the project directory via Rust backend
  if (!resolvedPath) {
    try {
      const projectRoot = (window as any).currentProjectPath
        || (window as any).projectRoot
        || localStorage.getItem('ide_last_project_path')
        || '';
      if (projectRoot) {
        const found = await mgr.findOriginal(originalFileName, projectRoot);
        if (found.length === 1) {
          resolvedPath = found[0];
        } else if (found.length > 1) {
          for (const f of found) {
            if (!candidates.includes(f)) candidates.push(f);
          }
        }
      }
    } catch (e) {
      console.warn('[BackupManager] Find original failed:', e);
    }
  }

  // Step 2: If multiple matches, let user choose from a styled dialog
  if (!resolvedPath && candidates.length > 1) {
    resolvedPath = await _bmShowFileChooser(originalFileName, candidates);
  }

  // Step 3: If still no match, fall back to a pre-filled prompt (last resort)
  if (!resolvedPath) {
    const hint = candidates.length > 0 ? candidates[0] : "";
    resolvedPath = prompt(
      'Could not auto-detect the file location.\n\nRestore "' + originalFileName + '" \u2014 enter the FULL path:',
      hint
    );
  }

  if (!resolvedPath) return; // User cancelled

  // Step 4: Confirm before restoring
  const shortPath = resolvedPath.length > 60
    ? "..." + resolvedPath.slice(-57)
    : resolvedPath;
  const confirmed = confirm(
    "Restore backup to:\n" + shortPath + "\n\nThis will OVERWRITE the current file with the backup content.\nContinue?"
  );
  if (!confirmed) return;

  // Step 5: Execute restore
  try {
    await mgr.restore(resolvedPath, backupPath);
    _bmToast("\u23EA", "Restored " + originalFileName + " successfully");

    // Refresh the editor if the restored file is currently open
    try {
      const tabMgr = (window as any).tabManager;
      if (tabMgr?.refreshActiveTab) {
        tabMgr.refreshActiveTab();
      } else if (tabMgr?.reloadFile) {
        tabMgr.reloadFile(resolvedPath);
      }
    } catch (e) { /* non-critical */ }
  } catch (err) {
    _bmToast("\u274C", "Restore failed: " + err);
  }
}

// Mini file chooser dialog when multiple files match the backup name
function _bmShowFileChooser(fileName: string, candidates: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0", right: "0", bottom: "0",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: "100060", display: "flex", alignItems: "center", justifyContent: "center"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px",
      padding: "20px", maxWidth: "600px", width: "90vw",
      boxShadow: "0 16px 48px rgba(0,0,0,0.5)"
    });

    const title = document.createElement("div");
    title.style.cssText = "font:700 13px 'JetBrains Mono',monospace;color:#cdd6f4;margin-bottom:4px";
    title.textContent = "Multiple files found: " + fileName;
    panel.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = "font:400 11px 'JetBrains Mono',monospace;color:#6c7086;margin-bottom:16px";
    subtitle.textContent = "Select which file to restore the backup to:";
    panel.appendChild(subtitle);

    candidates.forEach((c, i) => {
      const item = document.createElement("div");
      item.dataset.idx = String(i);
      Object.assign(item.style, {
        padding: "10px 14px", margin: "4px 0", borderRadius: "8px", cursor: "pointer",
        background: "rgba(137,180,250,0.06)", border: "1px solid #313244",
        font: "400 11px 'JetBrains Mono',monospace", color: "#9399b2",
        transition: "all 0.15s", wordBreak: "break-all"
      });
      item.textContent = c;
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(137,180,250,0.15)";
        item.style.borderColor = "rgba(137,180,250,0.3)";
        item.style.color = "#cdd6f4";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "rgba(137,180,250,0.06)";
        item.style.borderColor = "#313244";
        item.style.color = "#9399b2";
      });
      item.addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(candidates[i]);
      });
      panel.appendChild(item);
    });

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;margin-top:16px;justify-content:flex-end";
    const cancelBtn = document.createElement("button");
    Object.assign(cancelBtn.style, {
      padding: "6px 16px", borderRadius: "6px", border: "1px solid #313244",
      background: "rgba(243,139,168,0.08)", color: "#f38ba8", cursor: "pointer",
      font: "600 11px 'JetBrains Mono',monospace"
    });
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", escHandler);
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(null);
      }
    };
    document.addEventListener("keydown", escHandler);
  });
}

