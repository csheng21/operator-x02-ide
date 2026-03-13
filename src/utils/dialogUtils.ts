/**
 * Open a file or folder dialog using a custom Tauri command
 * @param options Dialog options
 * @returns Selected path or null if canceled
 */
export async function openDialog(options: {
  directory?: boolean;
  title?: string;
  multiple?: boolean;
}): Promise<string | null> {
  try {
    if (!window.__TAURI__) {
      throw new Error("Tauri environment not available");
    }
    
    console.log("Using custom dialog command via invoke");
    // Use the custom open_dialog command we defined in main.rs
    const result = await window.__TAURI__.invoke('open_dialog', options);
    console.log("Dialog result:", result);
    return result;
  } catch (error) {
    console.error("Error using custom dialog command:", error);
    
    // Fall back to development mock dialog
    try {
      console.log("Falling back to development dialog");
      const { openFolderDialog } = await import('../devModeFallbacks');
      return await openFolderDialog();
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return null;
    }
  }
}

/**
 * Select a folder using custom dialog command
 */
export async function selectFolder(title = 'Select Folder'): Promise<string | null> {
  return openDialog({
    directory: true,
    title
  });
}