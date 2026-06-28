// eventHandlers/domReady.ts
// ============================================================================
// SHARED DOM-READINESS HELPER (no imports — safe from circular dependencies)
// ============================================================================
// The chat panel mounts asynchronously, so setup* functions may run before
// their target elements exist. waitForElement polls briefly and resolves when
// the element appears, or null after the timeout. Lives in its own dependency-
// free module so importing it never creates an import cycle.

export function waitForElement(
  selector: string,
  timeoutMs: number = 8000,
  intervalMs: number = 100
): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const immediate = document.querySelector(selector);
    if (immediate instanceof HTMLElement) {
      resolve(immediate);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}
