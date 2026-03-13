// FIX: Code blocks invisible in production (content-visibility: auto causing h=0)
// This removes the problematic content-visibility: auto from all code elements
// and prevents it from being re-applied

export function fixCodeBlockVisibility(): void {
  console.log('🔧 [CodeBlockFix] Removing content-visibility: auto from code blocks...');
  
  // 1. Inject CSS override
  const style = document.createElement('style');
  style.id = 'code-block-visibility-fix';
  style.textContent = `
/* ===== FIX: Code block visibility (content-visibility: auto caused h=0) ===== */
.enh-code, .muf-code, .cbe-code,
pre code, pre.enh-pre code, pre.muf-pre code {
  content-visibility: visible !important;
  contain-intrinsic-size: auto !important;
}

.enh-code-scroll, .muf-code-scroll {
  overflow: auto !important;
  max-height: 500px !important;
  min-height: 20px !important;
}

pre.enh-pre, pre.muf-pre {
  min-height: 20px !important;
}
`;
  
  if (!document.getElementById('code-block-visibility-fix')) {
    document.head.appendChild(style);
  }
  
  // 2. Remove inline content-visibility styles from existing elements
  const codeElements = document.querySelectorAll('code[style*="content-visibility"], pre[style*="content-visibility"]');
  codeElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.contentVisibility = 'visible';
    htmlEl.style.removeProperty('contain-intrinsic-size');
  });
  
  console.log(`✅ [CodeBlockFix] Fixed ${codeElements.length} elements`);
  
  // 3. Watch for new code blocks and fix them
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement) {
          const codes = node.querySelectorAll('code[style*="content-visibility"], pre[style*="content-visibility"]');
          codes.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.contentVisibility = 'visible';
            htmlEl.style.removeProperty('contain-intrinsic-size');
          });
          // Also check the node itself
          if (node.style?.contentVisibility === 'auto' && 
              (node.tagName === 'CODE' || node.tagName === 'PRE')) {
            node.style.contentVisibility = 'visible';
            node.style.removeProperty('contain-intrinsic-size');
          }
        }
      }
    }
  });
  
  const chatContainer = document.querySelector('.ai-chat-container') || document.body;
  observer.observe(chatContainer, { childList: true, subtree: true });
  
  console.log('👀 [CodeBlockFix] Watching for new code blocks');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixCodeBlockVisibility);
} else {
  fixCodeBlockVisibility();
}
