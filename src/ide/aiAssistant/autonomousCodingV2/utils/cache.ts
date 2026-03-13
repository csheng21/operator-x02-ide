// cache.ts - LRU Cache with TTL for Processed Blocks
// ============================================================================
// Memory-efficient caching to prevent unbounded Set growth
// Features:
// - Least Recently Used (LRU) eviction
// - Time-To-Live (TTL) expiration
// - Configurable max size
// - Memory-safe operation
// ============================================================================

/**
 * LRU Cache entry with timestamp
 */
interface CacheEntry<V> {
  value: V;
  timestamp: number;
  accessCount: number;
}

/**
 * LRU Cache configuration
 */
export interface LRUCacheConfig {
  /** Maximum number of entries */
  maxSize: number;
  /** Time-to-live in milliseconds (0 = no expiration) */
  ttlMs: number;
  /** Callback when entry is evicted */
  onEvict?: (key: string, value: any) => void;
}

/**
 * LRU Cache with TTL support
 * 
 * Efficiently tracks processed blocks without unbounded memory growth.
 * Automatically evicts oldest entries when capacity is reached.
 */
export class LRUCache<V = any> {
  private cache: Map<string, CacheEntry<V>> = new Map();
  private config: LRUCacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(config: Partial<LRUCacheConfig> = {}) {
    this.config = {
      maxSize: 500,
      ttlMs: 30 * 60 * 1000, // 30 minutes default
      ...config
    };
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return false;
    }
    
    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      this.misses++;
      return false;
    }
    
    // Update access (LRU behavior)
    this.touch(key, entry);
    this.hits++;
    return true;
  }
  
  /**
   * Get value for key
   */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Update access (LRU behavior)
    this.touch(key, entry);
    this.hits++;
    return entry.value;
  }
  
  /**
   * Set key-value pair
   */
  set(key: string, value: V): void {
    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }
    
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      accessCount: 1
    };
    
    this.cache.set(key, entry);
  }
  
  /**
   * Add key with default value (convenience for Set-like behavior)
   */
  add(key: string): void {
    this.set(key, true as any);
  }
  
  /**
   * Delete key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.config.onEvict) {
      this.config.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    if (this.config.onEvict) {
      this.cache.forEach((entry, key) => {
        this.config.onEvict!(key, entry.value);
      });
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get all values
   */
  values(): V[] {
    return Array.from(this.cache.values())
      .filter(entry => !this.isExpired(entry))
      .map(entry => entry.value);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    oldestAge: number;
    newestAge: number;
  } {
    const now = Date.now();
    let oldestAge = 0;
    let newestAge = Infinity;
    
    this.cache.forEach(entry => {
      const age = now - entry.timestamp;
      oldestAge = Math.max(oldestAge, age);
      newestAge = Math.min(newestAge, age);
    });
    
    const totalRequests = this.hits + this.misses;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      oldestAge,
      newestAge: newestAge === Infinity ? 0 : newestAge
    };
  }
  
  /**
   * Remove all expired entries
   */
  prune(): number {
    let removed = 0;
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry, now)) {
        this.delete(key);
        removed++;
      }
    });
    
    return removed;
  }
  
  /**
   * Resize cache (evicts if new size is smaller)
   */
  resize(newMaxSize: number): void {
    this.config.maxSize = newMaxSize;
    
    while (this.cache.size > newMaxSize) {
      this.evictOldest();
    }
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<V>, now: number = Date.now()): boolean {
    if (this.config.ttlMs === 0) return false;
    return (now - entry.timestamp) > this.config.ttlMs;
  }
  
  /**
   * Update entry access time (LRU touch)
   */
  private touch(key: string, entry: CacheEntry<V>): void {
    // Delete and re-insert to move to end of Map (most recently used)
    this.cache.delete(key);
    entry.timestamp = Date.now();
    entry.accessCount++;
    this.cache.set(key, entry);
  }
  
  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    // Evict 25% of entries or at least 1
    const toEvict = Math.max(1, Math.floor(this.config.maxSize * 0.25));
    const now = Date.now();
    
    // First, try to evict expired entries
    const expiredKeys: string[] = [];
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry, now)) {
        expiredKeys.push(key);
      }
    });
    
    for (const key of expiredKeys.slice(0, toEvict)) {
      this.delete(key);
    }
    
    // If we still need to evict, remove oldest entries
    let remaining = toEvict - expiredKeys.length;
    if (remaining > 0) {
      // Map maintains insertion order, so first entries are oldest
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < remaining && i < keys.length; i++) {
        this.delete(keys[i]);
      }
    }
  }
}

// ============================================================================
// PROCESSED BLOCKS CACHE
// ============================================================================

/**
 * Specialized cache for tracking processed code blocks
 */
export class ProcessedBlockCache extends LRUCache<{
  processedAt: number;
  fileName: string | null;
  applied: boolean;
}> {
  constructor(maxSize: number = 500, ttlMs: number = 30 * 60 * 1000) {
    super({
      maxSize,
      ttlMs,
      onEvict: (key, value) => {
        console.log(`🗑️ [BlockCache] Evicted: ${key} (age: ${Date.now() - value.processedAt}ms)`);
      }
    });
  }
  
  /**
   * Mark a block as processed
   */
  markProcessed(blockId: string, fileName: string | null, applied: boolean): void {
    this.set(blockId, {
      processedAt: Date.now(),
      fileName,
      applied
    });
  }
  
  /**
   * Check if block was already processed
   */
  wasProcessed(blockId: string): boolean {
    return this.has(blockId);
  }
  
  /**
   * Get processed block info
   */
  getBlockInfo(blockId: string): { processedAt: number; fileName: string | null; applied: boolean } | undefined {
    return this.get(blockId);
  }
  
  /**
   * Get recently applied blocks
   */
  getRecentlyApplied(limit: number = 10): Array<{ blockId: string; info: any }> {
    const results: Array<{ blockId: string; info: any }> = [];
    
    this.keys().reverse().forEach(key => {
      if (results.length >= limit) return;
      const info = this.get(key);
      if (info?.applied) {
        results.push({ blockId: key, info });
      }
    });
    
    return results;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

let processedBlockCacheInstance: ProcessedBlockCache | null = null;

/**
 * Get the singleton processed block cache
 */
export function getProcessedBlockCache(): ProcessedBlockCache {
  if (!processedBlockCacheInstance) {
    processedBlockCacheInstance = new ProcessedBlockCache();
  }
  return processedBlockCacheInstance;
}

/**
 * Reset the processed block cache
 */
export function resetProcessedBlockCache(): void {
  if (processedBlockCacheInstance) {
    processedBlockCacheInstance.clear();
  }
  processedBlockCacheInstance = null;
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).blockCache = {
    get: getProcessedBlockCache,
    reset: resetProcessedBlockCache,
    markProcessed: (id: string, file: string | null, applied: boolean) => 
      getProcessedBlockCache().markProcessed(id, file, applied),
    wasProcessed: (id: string) => 
      getProcessedBlockCache().wasProcessed(id),
    getStats: () => 
      getProcessedBlockCache().getStats(),
    prune: () => 
      getProcessedBlockCache().prune()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  LRUCache,
  ProcessedBlockCache,
  getProcessedBlockCache,
  resetProcessedBlockCache
};

console.log('✅ cache.ts loaded - LRU Cache with TTL support');
