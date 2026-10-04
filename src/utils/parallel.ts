/**
 * Parallel Execution Utility
 * 
 * Provides utilities for running tasks in parallel with proper
 * concurrency control and error handling.
 */

export interface ParallelOptions {
  concurrency?: number; // Max concurrent tasks
  stopOnError?: boolean; // Stop all on first error
  timeout?: number; // Timeout per task in ms
}

export interface ParallelResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  duration: number;
}

/**
 * Execute tasks in parallel with concurrency control
 */
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  options: ParallelOptions = {}
): Promise<ParallelResult<T>[]> {
  const {
    concurrency = 5,
    stopOnError = false,
    timeout,
  } = options;

  const results: ParallelResult<T>[] = [];
  const executing: Set<Promise<void>> = new Set();
  let stopped = false;

  for (let i = 0; i < tasks.length; i++) {
    if (stopped) break;

    const task = tasks[i];
    const index = i;

    // Wrap task with timing and error handling
    const promise = executeTask(task, timeout)
      .then(result => {
        results[index] = result;
        if (!result.success && stopOnError) {
          stopped = true;
        }
      })
      .finally(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    // Wait if we've hit concurrency limit
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for remaining tasks
  await Promise.all(executing);

  return results;
}

/**
 * Execute a single task with timeout and error handling
 */
async function executeTask<T>(
  task: () => Promise<T>,
  timeout?: number
): Promise<ParallelResult<T>> {
  const startTime = Date.now();

  try {
    const value = timeout
      ? await withTimeout(task(), timeout)
      : await task();

    return {
      success: true,
      value,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Process items in parallel batches
 */
export async function parallelBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: ParallelOptions = {}
): Promise<ParallelResult<R>[]> {
  const tasks = items.map(item => () => processor(item));
  return parallel(tasks, options);
}

/**
 * Map over array in parallel
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results = await parallel(
    items.map((item, index) => () => mapper(item, index)),
    { concurrency, stopOnError: false }
  );

  return results.map(result => {
    if (!result.success) {
      throw result.error;
    }
    return result.value!;
  });
}

/**
 * Filter array in parallel
 */
export async function parallelFilter<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  concurrency: number = 5
): Promise<T[]> {
  const results = await parallelMap(items, predicate, concurrency);
  return items.filter((_, index) => results[index]);
}

/**
 * Execute all promises and return results (like Promise.allSettled)
 */
export async function allSettled<T>(
  promises: Array<Promise<T>>
): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
  return Promise.all(
    promises.map(promise =>
      promise
        .then(value => ({ status: 'fulfilled' as const, value }))
        .catch(reason => ({ status: 'rejected' as const, reason }))
    )
  );
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Queue for sequential execution with rate limiting
 */
export class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private readonly concurrency: number;
  private readonly rateLimit?: { requests: number; period: number };
  private requestTimes: number[] = [];

  constructor(options: {
    concurrency?: number;
    rateLimit?: { requests: number; period: number };
  } = {}) {
    this.concurrency = options.concurrency || 5;
    this.rateLimit = options.rateLimit;
  }

  /**
   * Add task to queue
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  /**
   * Process queue
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    // Check rate limit
    if (this.rateLimit) {
      await this.checkRateLimit();
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;
    
    try {
      await task();
    } finally {
      this.running--;
      this.process(); // Process next task
    }
  }

  /**
   * Check and enforce rate limit
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimit) return;

    const now = Date.now();
    const { requests, period } = this.rateLimit;

    // Remove old request times
    this.requestTimes = this.requestTimes.filter(
      time => now - time < period
    );

    // Wait if we've hit the limit
    if (this.requestTimes.length >= requests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = period - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requestTimes.push(now);
  }

  /**
   * Get queue statistics
   */
  stats(): {
    queued: number;
    running: number;
    total: number;
  } {
    return {
      queued: this.queue.length,
      running: this.running,
      total: this.queue.length + this.running,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Debounce async function
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  }) as T;
}

/**
 * Throttle async function
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): T {
  let lastCall = 0;
  let pendingArgs: any[] | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall >= delayMs) {
        // Execute immediately
        lastCall = now;
        fn(...args).then(resolve).catch(reject);
      } else {
        // Schedule for later
        pendingArgs = args;
        
        if (!timeoutId) {
          timeoutId = setTimeout(async () => {
            if (pendingArgs) {
              lastCall = Date.now();
              try {
                const result = await fn(...pendingArgs);
                resolve(result);
              } catch (error) {
                reject(error);
              }
              pendingArgs = null;
              timeoutId = null;
            }
          }, delayMs - timeSinceLastCall);
        }
      }
    });
  }) as T;
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}

/**
 * Execute with progress callback
 */
export async function withProgress<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void,
  concurrency: number = 5
): Promise<void> {
  let completed = 0;
  const total = items.length;

  await parallel(
    items.map((item, index) => async () => {
      await processor(item, index);
      completed++;
      
      if (onProgress) {
        onProgress({
          current: completed,
          total,
          percentage: Math.round((completed / total) * 100),
        });
      }
    }),
    { concurrency }
  );
}
