// src/ui/dialogs/saveConfirmationDialog.ts

export interface SaveDialogOptions {
  fileName: string;
  filePath?: string;
  onSave: () => Promise<void> | void;
  onDontSave: () => void;
  onCancel: () => void;
}

export class SaveConfirmationDialog {
  private dialog: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;

  /**
   * Show a modern save confirmation dialog
   */
  public show(options: SaveDialogOptions): void {
    // Remove any existing dialog
    this.close();

    // Create overlay
    this.overlay = this.createOverlay();
    
    // Create dialog
    this.dialog = this.createDialog(options);

    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.dialog);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add('visible');
      this.dialog?.classList.add('visible');
    });

    // Focus on Save button by default
    setTimeout(() => {
      const saveBtn = this.dialog?.querySelector('.save-btn') as HTMLElement;
      saveBtn?.focus();
    }, 100);

    // Handle ESC key
    this.setupKeyboardHandlers(options);
  }

  /**
   * Create overlay backdrop
   */
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'save-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    overlay.addEventListener('click', () => {
      // Click outside to cancel (optional)
      // this.close();
    });

    return overlay;
  }

  /**
   * Create the dialog element
   */
  private createDialog(options: SaveDialogOptions): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'save-confirmation-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: #2d2d30;
      border: 1px solid #454545;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 10001;
      min-width: 480px;
      max-width: 600px;
      opacity: 0;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;

    // Build dialog content
    dialog.innerHTML = `
      <div class="save-dialog-header" style="
        padding: 20px 24px 16px 24px;
        border-bottom: 1px solid #454545;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div class="save-dialog-icon" style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #007acc 0%, #0098ff 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        ">
          💾
        </div>
        <div class="save-dialog-title-section" style="flex: 1; min-width: 0;">
          <div class="save-dialog-title" style="
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
          ">
            Save Changes
          </div>
          <div class="save-dialog-subtitle" style="
            color: #cccccc;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${options.fileName}
          </div>
        </div>
      </div>

      <div class="save-dialog-body" style="
        padding: 20px 24px;
      ">
        <div class="save-dialog-message" style="
          color: #e0e0e0;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 8px;
        ">
          Do you want to save the changes you made to <strong style="color: #ffffff;">${options.fileName}</strong>?
        </div>
        <div class="save-dialog-warning" style="
          color: #d4d4d4;
          font-size: 13px;
          line-height: 1.5;
          padding: 12px;
          background: rgba(255, 193, 7, 0.1);
          border-left: 3px solid #ffc107;
          border-radius: 4px;
          margin-top: 12px;
        ">
          ⚠️ Your changes will be lost if you don't save them.
        </div>
      </div>

      <div class="save-dialog-footer" style="
        padding: 16px 24px 20px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        border-top: 1px solid #454545;
      ">
        <button class="cancel-btn dialog-btn" style="
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #5a5a5a;
          border-radius: 5px;
          color: #cccccc;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 90px;
        ">
          Cancel
        </button>
        <button class="dont-save-btn dialog-btn" style="
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #5a5a5a;
          border-radius: 5px;
          color: #cccccc;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 110px;
        ">
          Don't Save
        </button>
        <button class="save-btn dialog-btn" style="
          padding: 10px 20px;
          background: linear-gradient(135deg, #007acc 0%, #0098ff 100%);
          border: none;
          border-radius: 5px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 90px;
          box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
        ">
          Save
        </button>
      </div>
    `;

    // Add button hover effects
    this.addButtonStyles();

    // Set up button handlers
    this.setupButtonHandlers(dialog, options);

    return dialog;
  }

  /**
   * Add CSS for button hover effects
   */
  private addButtonStyles(): void {
    if (document.getElementById('save-dialog-styles')) return;

    const style = document.createElement('style');
    style.id = 'save-dialog-styles';
    style.textContent = `
      .save-dialog-overlay.visible {
        opacity: 1;
      }

      .save-confirmation-dialog.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .dialog-btn {
        outline: none;
        position: relative;
        overflow: hidden;
      }

      .dialog-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
      }

      .dialog-btn:hover::before {
        width: 300px;
        height: 300px;
      }

      .save-btn:hover {
        background: linear-gradient(135deg, #0086e0 0%, #00a8ff 100%);
        box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4);
        transform: translateY(-1px);
      }

      .save-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
      }

      .dont-save-btn:hover,
      .cancel-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: #707070;
        color: #ffffff;
      }

      .dont-save-btn:active,
      .cancel-btn:active {
        background: rgba(255, 255, 255, 0.1);
      }

      .save-btn:focus,
      .dont-save-btn:focus,
      .cancel-btn:focus {
        outline: 2px solid #007acc;
        outline-offset: 2px;
      }

      .dialog-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .save-btn.saving {
        animation: pulse 1s ease-in-out infinite;
        cursor: wait;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Set up button click handlers
   */
  private setupButtonHandlers(dialog: HTMLElement, options: SaveDialogOptions): void {
    const saveBtn = dialog.querySelector('.save-btn') as HTMLButtonElement;
    const dontSaveBtn = dialog.querySelector('.dont-save-btn') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('.cancel-btn') as HTMLButtonElement;

    // Save button
    saveBtn?.addEventListener('click', async () => {
      try {
        // Disable all buttons
        this.disableButtons(dialog);
        saveBtn.classList.add('saving');
        saveBtn.textContent = 'Saving...';

        // Execute save action
        await options.onSave();

        // Close dialog on success
        this.close();
      } catch (error) {
        console.error('Error saving file:', error);
        
        // Re-enable buttons on error
        this.enableButtons(dialog);
        saveBtn.classList.remove('saving');
        saveBtn.textContent = 'Save';
        
        // Show error message
        this.showError(dialog, 'Failed to save file. Please try again.');
      }
    });

    // Don't Save button
    dontSaveBtn?.addEventListener('click', () => {
      options.onDontSave();
      this.close();
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      options.onCancel();
      this.close();
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardHandlers(options: SaveDialogOptions): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        options.onCancel();
        this.close();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to save
        e.preventDefault();
        options.onSave();
        this.close();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        // Prevent default save
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handler);

    // Store handler for cleanup
    (this.dialog as any)._keyHandler = handler;
  }

  /**
   * Disable all buttons
   */
  private disableButtons(dialog: HTMLElement): void {
    const buttons = dialog.querySelectorAll('.dialog-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach(btn => {
      btn.disabled = true;
    });
  }

  /**
   * Enable all buttons
   */
  private enableButtons(dialog: HTMLElement): void {
    const buttons = dialog.querySelectorAll('.dialog-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach(btn => {
      btn.disabled = false;
    });
  }

  /**
   * Show error message in dialog
   */
  private showError(dialog: HTMLElement, message: string): void {
    let errorDiv = dialog.querySelector('.save-dialog-error') as HTMLElement;
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'save-dialog-error';
      errorDiv.style.cssText = `
        padding: 12px;
        margin: 0 24px 16px 24px;
        background: rgba(244, 67, 54, 0.1);
        border-left: 3px solid #f44336;
        border-radius: 4px;
        color: #ffcdd2;
        font-size: 13px;
      `;
      
      const footer = dialog.querySelector('.save-dialog-footer');
      footer?.parentNode?.insertBefore(errorDiv, footer);
    }

    errorDiv.textContent = `❌ ${message}`;

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Close and cleanup the dialog
   */
  public close(): void {
    if (this.dialog) {
      // Remove keyboard handler
      const handler = (this.dialog as any)._keyHandler;
      if (handler) {
        document.removeEventListener('keydown', handler);
      }

      // Animate out
      this.dialog.classList.remove('visible');
      this.overlay?.classList.remove('visible');

      // Remove from DOM after animation
      setTimeout(() => {
        this.dialog?.remove();
        this.overlay?.remove();
        this.dialog = null;
        this.overlay = null;
      }, 200);
    }
  }
}

// Export singleton instance
export const saveConfirmationDialog = new SaveConfirmationDialog();

// Convenience function for quick usage
export async function showSaveConfirmation(
  fileName: string,
  filePath?: string
): Promise<'save' | 'dontSave' | 'cancel'> {
  return new Promise((resolve) => {
    saveConfirmationDialog.show({
      fileName,
      filePath,
      onSave: async () => {
        resolve('save');
      },
      onDontSave: () => {
        resolve('dontSave');
      },
      onCancel: () => {
        resolve('cancel');
      }
    });
  });
}