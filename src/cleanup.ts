// cleanup.ts - Centralized cleanup management
class CleanupManager {
  private cleanupTasks: Array<() => void> = [];
  private intervals: Set<number> = new Set();
  private timeouts: Set<number> = new Set();
  private eventListeners: Array<{element: EventTarget, type: string, listener: any}> = [];
  private isCleaningUp = false;

  // Register cleanup task
  register(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  // Track intervals
  registerInterval(id: number): void {
    this.intervals.add(id);
  }

  // Track timeouts
  registerTimeout(id: number): void {
    this.timeouts.add(id);
  }

  // Track event listeners
  registerEventListener(element: EventTarget, type: string, listener: any): void {
    this.eventListeners.push({ element, type, listener });
    element.addEventListener(type, listener);
  }

  // Perform complete cleanup
  cleanup(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    console.log('🧹 Starting cleanup process...');

    // Clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();

    // Clear all timeouts  
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    // Remove all event listeners
    this.eventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this.eventListeners = [];

    // Run registered cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];

    console.log('✅ Cleanup complete');
    this.isCleaningUp = false;
  }

  // Clear all global intervals/timeouts (nuclear option)
  clearAllTimers(): void {
    // Clear all intervals
    const maxId = setTimeout(() => {}, 0);
    for (let i = 0; i < maxId; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
  }
}

export const cleanupManager = new CleanupManager();