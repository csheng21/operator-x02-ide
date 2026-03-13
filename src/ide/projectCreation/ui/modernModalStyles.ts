// ide/projectCreation/ui/modernModalStyles.ts
// All CSS styles for the Modern Project Modal

/**
 * Inject all modal styles into the document
 * Only injects once - checks for existing style element
 */
export function injectModalStyles(): void {
  if (document.getElementById('modern-project-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'modern-project-modal-styles';
  style.textContent = `
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; animation: fadeIn 0.2s ease;
    }

    .modal-container {
      width: 1200px; max-width: 95vw; height: 700px; max-height: 90vh;
      background: #1e1e1e; border-radius: 8px; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    .modal-header {
      background: linear-gradient(135deg, #0078d4 0%, #1e88e5 100%);
      padding: 20px 30px; display: flex; justify-content: space-between;
      align-items: center; border-bottom: 2px solid #007acc;
    }

    .header-content { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
    .header-title { font-size: 24px; font-weight: 600; color: #ffffff; margin: 0; letter-spacing: 0.3px; }
    
    .close-btn {
      background: rgba(255, 255, 255, 0.1); border: none; width: 36px; height: 36px;
      border-radius: 6px; color: white; font-size: 28px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; line-height: 1;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }

    .modal-body { flex: 1; display: grid; grid-template-columns: 280px 1fr 320px; overflow: hidden; }
    
    .section-title {
      font-size: 11px; font-weight: 700; color: #8e8e8e;
      letter-spacing: 1px; text-transform: uppercase;
      margin: 0 0 16px 0; display: flex; align-items: center; gap: 6px;
    }
    .title-icon { font-size: 16px; }

    .sidebar-section {
      background: #252526; padding: 24px 16px;
      border-right: 1px solid #333; overflow-y: auto;
    }

    .project-types { display: flex; flex-direction: column; gap: 8px; }
    
    .project-type-item {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      background: #2d2d30; border: 2px solid transparent;
      border-radius: 6px; cursor: pointer; transition: all 0.2s;
    }
    .project-type-item:hover { background: #323337; border-color: #007acc; }
    .project-type-item.active {
      background: #094771; border-color: #007acc;
      box-shadow: 0 0 0 1px rgba(0, 122, 204, 0.3);
    }

    .type-icon { font-size: 28px; line-height: 1; }
    .type-info { flex: 1; }
    .type-name { font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 2px; }
    .type-desc { font-size: 11px; color: #8e8e8e; }

    .templates-section { background: #1e1e1e; padding: 24px; overflow-y: auto; }

    .ai-advisor-section-pro {
      background: linear-gradient(135deg, 
        rgba(99, 102, 241, 0.08) 0%, 
        rgba(139, 92, 246, 0.08) 100%
      );
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      position: relative;
      backdrop-filter: blur(10px);
    }

    .advisor-header-pro {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 12px;
    }

    .advisor-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .advisor-icon-pro {
      width: 24px;
      height: 24px;
      color: #8b5cf6;
      flex-shrink: 0;
      filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
    }

    .advisor-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .advisor-title-pro {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
      line-height: 1.2;
    }

    .advisor-subtitle {
      font-size: 11px;
      color: #a78bfa;
      font-weight: 400;
      line-height: 1;
    }

    .advisor-badge-pro {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border-radius: 6px;
      font-size: 9px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }

    .advisor-badge-pro svg {
      animation: pulseGlow 2s ease-in-out infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    .advisor-input-area-pro {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .input-wrapper-pro {
      flex: 1;
      position: relative;
      min-width: 0;
    }

    .input-icon-pro {
      position: absolute;
      left: 12px;
      top: 12px;
      width: 18px;
      height: 18px;
      color: #8b5cf6;
      pointer-events: none;
      opacity: 0.6;
    }

    .advisor-input-pro {
      width: 100%;
      min-height: 60px;
      max-height: 140px;
      padding: 12px 12px 12px 38px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .advisor-input-pro:focus {
      outline: none;
      border-color: #8b5cf6;
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .advisor-input-pro::placeholder {
      color: #6b7280;
    }

    .ask-ai-btn-pro {
      padding: 12px 16px;
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .ask-ai-btn-pro::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .ask-ai-btn-pro:hover::before {
      opacity: 1;
    }

    .ask-ai-btn-pro:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    }

    .ask-ai-btn-pro:active:not(:disabled) {
      transform: translateY(0);
    }

    .ask-ai-btn-pro:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-icon-pro {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .btn-text-pro {
      font-weight: 600;
    }

    .btn-kbd-pro {
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      font-size: 10px;
      font-family: 'Consolas', monospace;
      font-weight: 500;
      opacity: 0.8;
    }

    .spinner {
      width: 16px;
      height: 16px;
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ai-suggestions-pro {
      margin-top: 12px;
      animation: slideDownSmooth 0.3s ease-out;
    }

    @keyframes slideDownSmooth {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        max-height: 800px;
        transform: translateY(0);
      }
    }

    .suggestions-header-pro {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      margin-bottom: 10px;
      position: relative;
    }

    .suggestions-icon-pro {
      width: 18px;
      height: 18px;
      color: #8b5cf6;
      flex-shrink: 0;
      animation: rotate 2s linear infinite;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .suggestions-title-pro {
      font-size: 13px;
      font-weight: 600;
      color: #a78bfa;
      flex: 1;
    }

    .suggestions-pulse {
      width: 8px;
      height: 8px;
      background: #8b5cf6;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulseCircle 2s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
    }

    @keyframes pulseCircle {
      0% {
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
      }
    }

    .minimize-btn-pro {
      background: transparent;
      border: none;
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: auto;
    }

    .minimize-btn-pro:hover {
      background: rgba(139, 92, 246, 0.2);
    }

    .minimize-icon {
      width: 18px;
      height: 18px;
      color: #8b5cf6;
      transition: transform 0.3s ease;
    }

    .ai-suggestions-pro.minimized .minimize-icon {
      transform: rotate(180deg);
    }

    .ai-suggestions-pro.minimized {
      margin-bottom: 0;
    }

    .ai-suggestions-pro.minimized .suggestions-header-pro {
      cursor: pointer;
      margin-bottom: 0;
    }

    .ai-suggestions-pro.minimized .suggestions-header-pro:hover {
      background: rgba(139, 92, 246, 0.15);
    }

    .minimized-badge {
      padding: 3px 8px;
      background: rgba(139, 92, 246, 0.3);
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      color: #a78bfa;
      margin-left: auto;
      margin-right: 8px;
    }

    .ai-suggestions-pro:not(.minimized) .minimized-badge {
      display: none !important;
    }

    .ai-suggestions-pro.minimized .suggestions-pulse {
      display: none !important;
    }

    @keyframes expandDown {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        max-height: 1000px;
        transform: translateY(0);
      }
    }

    @keyframes collapseUp {
      from {
        opacity: 1;
        max-height: 1000px;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
    }

    .ai-response-content-pro {
      color: #cccccc;
    }

    .ai-loading {
      padding: 20px;
      text-align: center;
      color: #8b5cf6;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 8px;
      border: 1px dashed rgba(139, 92, 246, 0.3);
    }

    .ai-loading svg {
      width: 24px;
      height: 24px;
    }

    .ai-error {
      padding: 14px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #fca5a5;
      display: flex;
      align-items: start;
      gap: 10px;
    }

    .error-icon-pro {
      flex-shrink: 0;
    }

    .error-icon-pro svg {
      width: 20px;
      height: 20px;
      color: #ef4444;
    }

    .error-content strong {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: #fca5a5;
    }

    .error-content p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .ai-suggestion-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05));
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 10px;
      animation: fadeInUp 0.3s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestion-main {
      margin-bottom: 12px;
    }

    .suggestion-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .suggestion-badge svg {
      width: 12px;
      height: 12px;
    }

    .suggestion-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px 0;
    }

    .suggestion-idea {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
      font-style: italic;
      padding-left: 12px;
      border-left: 2px solid #8b5cf6;
    }

    .suggestion-idea strong {
      color: #a78bfa;
      font-weight: 600;
    }

    .suggestion-template {
      padding: 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .template-info-pro {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .template-info-pro svg {
      width: 20px;
      height: 20px;
      color: #8b5cf6;
    }

    .template-info-pro strong {
      color: #a78bfa;
      font-size: 13px;
    }

    .apply-suggestion-btn {
      padding: 8px 16px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }

    .apply-suggestion-btn svg {
      width: 14px;
      height: 14px;
    }

    .apply-suggestion-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
    }

    .suggestion-reasoning,
    .suggestion-tech,
    .suggestion-alternatives {
      margin-bottom: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      border-left: 3px solid #8b5cf6;
    }

    .suggestion-reasoning:last-child,
    .suggestion-tech:last-child,
    .suggestion-alternatives:last-child {
      margin-bottom: 0;
    }

    .suggestion-reasoning strong,
    .suggestion-tech strong,
    .suggestion-alternatives strong {
      color: #a78bfa;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 12px;
    }

    .suggestion-reasoning strong svg,
    .suggestion-tech strong svg,
    .suggestion-alternatives strong svg {
      width: 16px;
      height: 16px;
    }

    .suggestion-reasoning p,
    .suggestion-tech p,
    .suggestion-alternatives p {
      margin: 0;
      color: #d1d5db;
      line-height: 1.5;
      font-size: 12px;
    }

    .full-ai-response {
      margin-top: 10px;
    }

    .full-ai-response details {
      cursor: pointer;
    }

    .full-ai-response summary {
      color: #8b5cf6;
      font-size: 12px;
      font-weight: 500;
      padding: 8px 10px;
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 6px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .full-ai-response summary:hover {
      background: rgba(139, 92, 246, 0.1);
    }

    .full-ai-response summary svg {
      width: 14px;
      height: 14px;
    }

    .full-ai-response pre {
      margin: 8px 0 0 0;
      padding: 12px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 6px;
      color: #d1d5db;
      font-size: 11px;
      overflow-x: auto;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .ai-success-toast {
      padding: 10px 12px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 6px;
      color: #6ee7b7;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      animation: slideInDown 0.3s ease-out;
      transition: opacity 0.3s;
    }

    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .ai-success-toast svg {
      width: 16px;
      height: 16px;
      color: #10b981;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .template-card {
      background: #252526; border: 2px solid #333;
      border-radius: 8px; padding: 20px; cursor: pointer;
      transition: all 0.2s; position: relative;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 12px;
    }
    .template-card:hover {
      border-color: #007acc; background: #2d2d30;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 122, 204, 0.2);
    }
    .template-card.active {
      border-color: #007acc; background: #094771;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.3);
    }

    .template-icon-wrapper {
      width: 80px; height: 80px;
      background: rgba(0, 122, 204, 0.1);
      border-radius: 12px; display: flex;
      align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .template-card.active .template-icon-wrapper {
      background: rgba(79, 195, 247, 0.15);
    }

    .template-icon { font-size: 48px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); }
    .template-name { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    .template-desc { font-size: 12px; color: #8e8e8e; line-height: 1.4; }

    .selected-badge {
      position: absolute; top: 12px; right: 12px;
      width: 28px; height: 28px; background: #007acc;
      color: white; border-radius: 50%; display: flex;
      align-items: center; justify-content: center;
      font-size: 16px; font-weight: bold;
      box-shadow: 0 2px 8px rgba(0, 122, 204, 0.5);
    }

    .preview-section {
      background: #252526; padding: 24px;
      border-left: 1px solid #333; overflow-y: auto;
    }

    .preview-content { display: flex; flex-direction: column; gap: 20px; }
    
    .preview-block {
      background: #1e1e1e; padding: 16px;
      border-radius: 6px; border: 1px solid #333;
    }

    .preview-label {
      font-size: 10px; font-weight: 700; color: #8e8e8e;
      letter-spacing: 1px; margin-bottom: 10px; text-transform: uppercase;
    }

    .preview-input {
      width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; color: #cccccc; background: #0a0a0a;
      padding: 10px 12px; border: 1px solid #3e3e42;
      border-radius: 4px; transition: all 0.2s; box-sizing: border-box;
    }
    .preview-input:hover { border-color: #007acc; }
    .preview-input:focus {
      outline: none; border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }

    .preview-path-container { display: flex; gap: 8px; align-items: stretch; }
    
    .preview-path-input {
      flex: 1; font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px; color: #4FC3F7; background: #0a0a0a;
      padding: 10px 12px; border: 1px solid #3e3e42;
      border-radius: 4px; transition: all 0.2s;
      cursor: pointer; box-sizing: border-box;
    }
    .preview-path-input:hover { border-color: #007acc; }
    .preview-path-input:focus {
      outline: none; border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      cursor: text;
    }

    .browse-btn {
      padding: 10px 16px; background: #007acc; border: none;
      border-radius: 4px; color: white; cursor: pointer;
      font-size: 18px; transition: all 0.2s; display: flex;
      align-items: center; justify-content: center;
      min-width: 44px; flex-shrink: 0;
    }
    .browse-btn:hover { background: #005a9e; transform: scale(1.05); }
    .browse-btn:active { transform: scale(0.95); }

    .quick-paths { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    
    .quick-path-btn {
      padding: 6px 12px; background: #2d2d30;
      border: 1px solid #3e3e42; border-radius: 4px;
      color: #cccccc; font-size: 11px; cursor: pointer;
      transition: all 0.2s; display: flex;
      align-items: center; gap: 4px;
    }
    .quick-path-btn:hover {
      background: #007acc; border-color: #007acc;
      color: white; transform: translateY(-1px);
    }
    .quick-path-btn:active { transform: translateY(0); }

    .preview-path-display {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px; color: #4FC3F7; background: #0a0a0a;
      padding: 10px 12px; border-radius: 4px; word-break: break-all;
      border: 1px solid #3e3e42; line-height: 1.5;
    }

    .input-hint {
      font-size: 10px; color: #666; margin-top: 6px;
      font-style: italic; line-height: 1.4;
    }

    .preview-list { display: flex; flex-direction: column; gap: 8px; }
    
    .preview-item {
      font-size: 13px; color: #cccccc; display: flex;
      align-items: center; gap: 8px;
    }
    .preview-item::before {
      content: ''; width: 4px; height: 4px;
      background: #4FC3F7; border-radius: 50%; flex-shrink: 0;
    }

    .modal-footer {
      background: #252526; padding: 16px 30px;
      border-top: 1px solid #333; display: flex;
      justify-content: space-between; align-items: center;
    }

    .footer-info {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: #8e8e8e;
    }
    .info-icon { font-size: 16px; }

    .footer-actions { display: flex; gap: 12px; }
    
    .btn-cancel, .btn-create {
      padding: 10px 24px; border-radius: 6px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      border: none; display: flex;
      align-items: center; gap: 8px;
    }

    .btn-cancel {
      background: transparent; color: #cccccc;
      border: 1px solid #3e3e42;
    }
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #007acc;
    }

    .btn-create {
      background: linear-gradient(135deg, #0078d4 0%, #1e88e5 100%);
      color: white; box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
    }
    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 122, 204, 0.5);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes slideDown {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(30px) scale(0.95); }
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(100px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideOutRight {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(100px); }
    }

    @media (max-width: 1024px) {
      .advisor-input-area-pro {
        flex-direction: column;
        align-items: stretch;
      }

      .ask-ai-btn-pro {
        width: 100%;
      }
    }

    .sidebar-section::-webkit-scrollbar,
    .templates-section::-webkit-scrollbar,
    .preview-section::-webkit-scrollbar {
      width: 8px;
    }

    .sidebar-section::-webkit-scrollbar-track,
    .templates-section::-webkit-scrollbar-track,
    .preview-section::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    .sidebar-section::-webkit-scrollbar-thumb,
    .templates-section::-webkit-scrollbar-thumb,
    .preview-section::-webkit-scrollbar-thumb {
      background: #3e3e42; border-radius: 4px;
    }

    .sidebar-section::-webkit-scrollbar-thumb:hover,
    .templates-section::-webkit-scrollbar-thumb:hover,
    .preview-section::-webkit-scrollbar-thumb:hover {
      background: #007acc;
    }

    /* ============================================================================
       ENHANCED AI RESPONSE VIEWER - NEW STYLES
       ============================================================================ */
    
    .enhanced-ai-response {
      margin-top: 12px;
    }

    .ai-response-details {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(124, 58, 237, 0.03));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 10px;
      overflow: hidden;
    }

    .ai-response-details[open] {
      border-color: rgba(139, 92, 246, 0.4);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1);
    }

    .ai-response-summary {
      padding: 14px 16px;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
      background: rgba(139, 92, 246, 0.05);
      border-bottom: 1px solid transparent;
    }

    .ai-response-summary:hover {
      background: rgba(139, 92, 246, 0.1);
    }

    .ai-response-details[open] .ai-response-summary {
      border-bottom-color: rgba(139, 92, 246, 0.2);
      background: rgba(139, 92, 246, 0.08);
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .summary-icon {
      width: 20px;
      height: 20px;
      color: #8b5cf6;
      flex-shrink: 0;
    }

    .summary-text {
      font-size: 13px;
      font-weight: 600;
      color: #a78bfa;
    }

    .summary-badge {
      padding: 3px 8px;
      background: rgba(139, 92, 246, 0.2);
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      color: #c4b5fd;
    }

    .chevron-icon {
      width: 18px;
      height: 18px;
      color: #8b5cf6;
      transition: transform 0.3s ease;
      flex-shrink: 0;
    }

    .ai-response-details[open] .chevron-icon {
      transform: rotate(180deg);
    }

    .ai-response-content {
      padding: 20px;
      animation: expandDownFull 0.3s ease-out;
    }

    @keyframes expandDownFull {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        max-height: 2000px;
        transform: translateY(0);
      }
    }

    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    .response-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #9ca3af;
    }

    .meta-item svg {
      width: 14px;
      height: 14px;
      color: #8b5cf6;
      opacity: 0.7;
    }

    .copy-response-btn {
      padding: 6px 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 6px;
      color: #a78bfa;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .copy-response-btn svg {
      width: 14px;
      height: 14px;
    }

    .copy-response-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.5);
      transform: translateY(-1px);
    }

    .copy-response-btn:active {
      transform: translateY(0);
    }

    .response-sections {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .response-section {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 14px;
      border-left: 3px solid #8b5cf6;
      transition: all 0.2s ease;
    }

    .response-section:hover {
      background: rgba(0, 0, 0, 0.3);
      border-left-width: 4px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .section-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8b5cf6;
      flex-shrink: 0;
    }

    .section-icon svg {
      width: 100%;
      height: 100%;
    }

    .section-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: #c4b5fd;
      text-transform: capitalize;
    }

    .section-content {
      padding-left: 30px;
    }

    .content-text {
      margin: 0;
      color: #d1d5db;
      line-height: 1.6;
      font-size: 13px;
    }

    .content-list {
      margin: 0;
      padding-left: 20px;
      color: #d1d5db;
      line-height: 1.7;
    }

    .content-list li {
      margin-bottom: 6px;
      font-size: 13px;
    }

    .content-list li:last-child {
      margin-bottom: 0;
    }

    .inline-code {
      padding: 2px 6px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #c4b5fd;
      font-weight: 500;
    }

    .tech-term {
      color: #4FC3F7;
      font-weight: 500;
    }

    .response-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(139, 92, 246, 0.2);
    }

    .footer-note {
      display: flex;
      align-items: start;
      gap: 8px;
      padding: 10px;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 6px;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }

    .footer-note svg {
      width: 16px;
      height: 16px;
      color: #8b5cf6;
      flex-shrink: 0;
      margin-top: 2px;
    }
  `;

  document.head.appendChild(style);
}