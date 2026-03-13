// src/utils/eventEmitter.ts
// Simple typed EventEmitter for internal use

export type Listener<T> = (event: T) => void;

export class EventEmitter<T> {
  private listeners: Set<Listener<T>> = new Set();

  /**
   * Add an event listener
   */
  on(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  /**
   * Remove an event listener
   */
  off(listener: Listener<T>): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('EventEmitter listener error:', error);
      }
    });
  }

  /**
   * Add a one-time listener
   */
  once(listener: Listener<T>): () => void {
    const wrapper: Listener<T> = (event) => {
      this.off(wrapper);
      listener(event);
    };
    return this.on(wrapper);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count
   */
  listenerCount(): number {
    return this.listeners.size;
  }
}
