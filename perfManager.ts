// ============================================================
// core/perfManager.ts
// X02PerfManager - Interval throttle manager
// Extracted from main.ts | Operator X02
//
// USAGE: import './core/perfManager';  ← just importing runs it
// CONTROL:
//   (window as any).X02Perf.throttle(5)   // slow 5x
//   (window as any).X02Perf.restore()      // back to normal
//   (window as any).X02Perf.status()       // debug
//
// Auto-wired events:
//   jetson-streaming-start  → throttle(5)
//   jetson-streaming-stop   → restore()
//   jetson-connected        → throttle(5)
//   jetson-disconnected     → restore()
// ============================================================

(function installX02PerfManager() {
  if ((window as any).X02Perf) return; // already installed

  const _origSetInterval = window.setInterval.bind(window);
  const _origClearInterval = window.clearInterval.bind(window);

  interface TrackedInterval {
    id: number;
    fn: TimerHandler;
    delay: number;
    active: boolean;
  }

  const tracked: Map<number, TrackedInterval> = new Map();
  let _throttleFactor = 1;

  (window as any).setInterval = function(fn: TimerHandler, delay?: number, ...args: any[]): number {
    const realDelay = delay ?? 0;
    const id = _origSetInterval(fn, realDelay * _throttleFactor, ...args) as unknown as number;
    tracked.set(id, { id, fn, delay: realDelay, active: true });
    return id;
  };

  (window as any).clearInterval = function(id: number): void {
    _origClearInterval(id);
    tracked.delete(id);
  };

  const X02Perf = {
    throttle(factor: number): void {
      if (factor === _throttleFactor) return;
      console.log('[X02Perf] Throttling intervals by ' + factor + 'x (' + tracked.size + ' tracked)');
      _throttleFactor = factor;
      tracked.forEach((entry) => {
        if (!entry.active) return;
        _origClearInterval(entry.id);
        const newId = _origSetInterval(entry.fn, entry.delay * factor) as unknown as number;
        tracked.delete(entry.id);
        entry.id = newId;
        tracked.set(newId, entry);
      });
    },

    restore(): void {
      if (_throttleFactor === 1) return;
      console.log('[X02Perf] Restoring intervals to normal speed');
      X02Perf.throttle(1);
    },

    status(): void {
      console.log('[X02Perf] ' + tracked.size + ' intervals tracked, throttle=' + _throttleFactor + 'x');
      tracked.forEach((e) => console.log('  id=' + e.id + ' delay=' + e.delay + 'ms'));
    }
  };

  (window as any).X02Perf = X02Perf;

  document.addEventListener('jetson-streaming-start', () => {
    console.log('[X02Perf] Tegrastats streaming - throttling 5x');
    X02Perf.throttle(5);
  });
  document.addEventListener('jetson-streaming-stop', () => {
    console.log('[X02Perf] Tegrastats stopped - restoring speed');
    X02Perf.restore();
  });
  document.addEventListener('jetson-connected', () => {
    console.log('[X02Perf] Jetson connected - throttling non-essential intervals 5x');
    X02Perf.throttle(5);
  });
  document.addEventListener('jetson-disconnected', () => {
    console.log('[X02Perf] Jetson disconnected - restoring interval speed');
    X02Perf.restore();
  });

  console.log('[X02Perf] Interval manager installed');
})();
