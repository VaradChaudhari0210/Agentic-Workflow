/**
 * Cache Utility
 * 
 * Provides in-memory caching with TTL support for analyzer results
 * and file system operations to improve performance.
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  size: number;
}

export class Cache<T = any> {
  private store: Map<string, CacheEntry<T>>;
  private readonly ttl: number;
  private readonly maxSize: number;
  private currentSize: number;

  constructor(options: CacheOptions = {}) {
    this.store = new Map();
    this.ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize || 1000; // Default 1000 entries
    this.currentSize = 0;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Check size limit
    if (this.currentSize >= this.maxSize && !this.store.has(key)) {
      // Evict oldest entry (LRU-like behavior)
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      expiry: Date.now() + (ttl || this.ttl),
      size: this.estimateSize(value),
    };

    // Update size tracking
    const existing = this.store.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }
    
    this.store.set(key, entry);
    this.currentSize++;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (entry) {
      this.currentSize--;
      return this.store.delete(key);
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get or compute value
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry < oldestExpiry) {
        oldestExpiry = entry.expiry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Estimate size of cached value
   */
  private estimateSize(value: T): number {
    try {
      // Rough estimate based on JSON stringification
      return JSON.stringify(value).length;
    } catch {
      // Fallback for circular references or complex objects
      return 1;
    }
  }
}

/**
 * File content cache specifically for file system operations
 */
export class FileCache extends Cache<string> {
  constructor() {
    super({
      ttl: 10 * 60 * 1000, // 10 minutes for file content
      maxSize: 500, // Limit file cache size
    });
  }

  /**
   * Get file content with caching
   */
  async getFileContent(
    path: string,
    reader: () => Promise<string>
  ): Promise<string> {
    return this.getOrSet(path, reader);
  }
}

/**
 * Analysis result cache for analyzer outputs
 */
export class AnalysisCache extends Cache<any> {
  constructor() {
    super({
      ttl: 5 * 60 * 1000, // 5 minutes for analysis results
      maxSize: 100, // Smaller limit for analysis results
    });
  }

  /**
   * Create cache key from analysis options
   */
  static createKey(analyzerName: string, options: Record<string, any>): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((acc, key) => {
        acc[key] = options[key];
        return acc;
      }, {} as Record<string, any>);
    
    return `${analyzerName}:${JSON.stringify(sortedOptions)}`;
  }
}

/**
 * Global cache instances
 */
export const fileCache = new FileCache();
export const analysisCache = new AnalysisCache();

/**
 * Cache decorator for methods
 */
export function Cacheable(options: { ttl?: number; keyGenerator?: (...args: any[]) => string } = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = new Cache(options);

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // Compute and cache
      const result = await originalMethod.apply(this, args);
      cache.set(key, result, options.ttl);
      return result;
    };

    return descriptor;
  };
}

/**
 * Clear all global caches
 */
export function clearAllCaches(): void {
  fileCache.clear();
  analysisCache.clear();
}
