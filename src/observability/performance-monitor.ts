/**
 * Performance Monitor
 * 
 * Tracks operation timing, memory usage, token consumption, and aggregates
 * statistics for performance analysis and optimization.
 */

import * as os from 'os';
import { Logger, getLogger } from './logger.js';
import {
  PerformanceMetrics,
  PerformanceTimer,
  OperationStats,
  SystemMetrics,
  MemoryUsage,
  TokenUsage,
  PerformanceMonitorConfig
} from '../types/observability.js';

/**
 * Default performance monitor configuration
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  slowOperationThreshold: 5000, // 5 seconds
  metricsFlushInterval: 60000, // 1 minute
  trackMemory: true,
  trackTokens: true,
  maxStoredMetrics: 1000
};

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private logger: Logger;
  private metrics: PerformanceMetrics[] = [];
  private stats: Map<string, OperationStats> = new Map();
  private activeTimers: Map<string, PerformanceTimer> = new Map();
  private startTime: number = Date.now();
  private totalTokens = 0;
  private flushInterval?: NodeJS.Timeout;

  constructor(config?: Partial<PerformanceMonitorConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger || getLogger();

    // Start periodic flush if configured
    if (this.config.metricsFlushInterval > 0) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): PerformanceTimer {
    const timerId = this.generateTimerId(operation);
    
    const timer: PerformanceTimer = {
      operation,
      startTime: Date.now(),
      startMemory: this.config.trackMemory ? this.getMemoryUsage().used : 0,
      metadata
    };

    this.activeTimers.set(timerId, timer);

    this.logger.debug(`Performance timer started: ${operation}`, {
      timerId,
      ...metadata
    });

    return timer;
  }

  /**
   * Stop timing an operation and record metrics
   */
  stopTimer(
    timer: PerformanceTimer,
    result?: {
      success?: boolean;
      tokensUsed?: number;
      metadata?: Record<string, any>;
    }
  ): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = this.config.trackMemory ? this.getMemoryUsage().used : 0;
    const duration = endTime - timer.startTime;
    const memoryDelta = endMemory - timer.startMemory;

    const metrics: PerformanceMetrics = {
      operation: timer.operation,
      startTime: timer.startTime,
      endTime,
      duration,
      memoryUsed: endMemory,
      memoryDelta,
      tokensUsed: result?.tokensUsed,
      success: result?.success ?? true,
      metadata: { ...timer.metadata, ...result?.metadata },
      timestamp: new Date().toISOString()
    };

    // Store metrics
    this.storeMetrics(metrics);

    // Update stats
    this.updateStats(metrics);

    // Track tokens
    if (metrics.tokensUsed && this.config.trackTokens) {
      this.totalTokens += metrics.tokensUsed;
    }

    // Remove timer
    const timerId = this.generateTimerId(timer.operation);
    this.activeTimers.delete(timerId);

    // Log slow operations
    if (duration > this.config.slowOperationThreshold) {
      this.logger.warn(`Slow operation detected: ${timer.operation}`, {
        duration: `${duration}ms`,
        threshold: `${this.config.slowOperationThreshold}ms`
      });
    }

    // Log performance data
    this.logger.perf(`${timer.operation} completed`, {
      operation: timer.operation,
      duration,
      memoryUsed: memoryDelta,
      tokensUsed: metrics.tokensUsed
    });

    return metrics;
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const timer = this.startTimer(operation, metadata);

    try {
      const result = await fn();
      const metrics = this.stopTimer(timer, { success: true, metadata });
      return { result, metrics };
    } catch (error) {
      const metrics = this.stopTimer(timer, { success: false, metadata });
      throw error;
    }
  }

  /**
   * Generate unique timer ID
   */
  private generateTimerId(operation: string): string {
    return `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.unshift(metrics);

    // Limit storage size
    if (this.config.maxStoredMetrics && this.metrics.length > this.config.maxStoredMetrics) {
      this.metrics = this.metrics.slice(0, this.config.maxStoredMetrics);
    }
  }

  /**
   * Update aggregated statistics
   */
  private updateStats(metrics: PerformanceMetrics): void {
    const existing = this.stats.get(metrics.operation);

    if (existing) {
      // Update existing stats
      const newCount = existing.count + 1;
      const newTotalDuration = existing.totalDuration + metrics.duration;
      const newSuccessCount = existing.successCount + (metrics.success ? 1 : 0);
      const newFailureCount = existing.failureCount + (metrics.success ? 0 : 1);
      const newTotalTokens = existing.totalTokens || 0 + (metrics.tokensUsed || 0);

      this.stats.set(metrics.operation, {
        operation: metrics.operation,
        count: newCount,
        totalDuration: newTotalDuration,
        avgDuration: newTotalDuration / newCount,
        minDuration: Math.min(existing.minDuration, metrics.duration),
        maxDuration: Math.max(existing.maxDuration, metrics.duration),
        successRate: newSuccessCount / newCount,
        successCount: newSuccessCount,
        failureCount: newFailureCount,
        lastExecuted: metrics.timestamp,
        totalTokens: newTotalTokens,
        avgTokens: newTotalTokens / newCount
      });
    } else {
      // Create new stats
      this.stats.set(metrics.operation, {
        operation: metrics.operation,
        count: 1,
        totalDuration: metrics.duration,
        avgDuration: metrics.duration,
        minDuration: metrics.duration,
        maxDuration: metrics.duration,
        successRate: metrics.success ? 1 : 0,
        successCount: metrics.success ? 1 : 0,
        failureCount: metrics.success ? 0 : 1,
        lastExecuted: metrics.timestamp,
        totalTokens: metrics.tokensUsed || 0,
        avgTokens: metrics.tokensUsed || 0
      });
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation: string): OperationStats | undefined {
    return this.stats.get(operation);
  }

  /**
   * Get statistics for all operations
   */
  getAllStats(): OperationStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    const allStats = this.getAllStats();
    const totalOperations = allStats.reduce((sum, stat) => sum + stat.count, 0);
    const successfulOperations = allStats.reduce((sum, stat) => sum + stat.successCount, 0);
    const failedOperations = allStats.reduce((sum, stat) => sum + stat.failureCount, 0);
    const totalDuration = allStats.reduce((sum, stat) => sum + stat.totalDuration, 0);

    return {
      uptime: Date.now() - this.startTime,
      totalOperations,
      successfulOperations,
      failedOperations,
      successRate: totalOperations > 0 ? successfulOperations / totalOperations : 0,
      avgResponseTime: totalOperations > 0 ? totalDuration / totalOperations : 0,
      memoryUsage: this.getMemoryUsage(),
      tokenUsage: this.getTokenUsage(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = totalMemory - os.freemem();

    return {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    };
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): TokenUsage {
    const allStats = this.getAllStats();
    const totalOperations = allStats.reduce((sum, stat) => sum + stat.count, 0);
    const peakTokens = Math.max(...this.metrics.map(m => m.tokensUsed || 0));
    const lastOperation = this.metrics[0];

    // Rough cost estimate: $3 per million tokens (adjust based on your model)
    const costPerToken = 3 / 1000000;

    return {
      totalTokens: this.totalTokens,
      estimatedCost: this.totalTokens * costPerToken,
      avgTokensPerOperation: totalOperations > 0 ? this.totalTokens / totalOperations : 0,
      peakTokens,
      lastOperationTokens: lastOperation?.tokensUsed
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(0, limit);
  }

  /**
   * Get metrics for specific operation
   */
  getOperationMetrics(operation: string, limit?: number): PerformanceMetrics[] {
    const filtered = this.metrics.filter(m => m.operation === operation);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold?: number): PerformanceMetrics[] {
    const slowThreshold = threshold || this.config.slowOperationThreshold;
    return this.metrics.filter(m => m.duration > slowThreshold);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit?: number): PerformanceMetrics[] {
    const failed = this.metrics.filter(m => !m.success);
    return limit ? failed.slice(0, limit) : failed;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.stats.clear();
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Clear metrics for specific operation
   */
  clearOperationMetrics(operation: string): void {
    this.metrics = this.metrics.filter(m => m.operation !== operation);
    this.stats.delete(operation);
    this.logger.info(`Performance metrics cleared for: ${operation}`);
  }

  /**
   * Start periodic flush of metrics
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.config.metricsFlushInterval);
  }

  /**
   * Flush metrics (log aggregated stats)
   */
  private flushMetrics(): void {
    const systemMetrics = this.getSystemMetrics();
    
    this.logger.info('Performance metrics flush', {
      uptime: `${Math.round(systemMetrics.uptime / 1000)}s`,
      totalOperations: systemMetrics.totalOperations,
      successRate: `${(systemMetrics.successRate * 100).toFixed(2)}%`,
      avgResponseTime: `${Math.round(systemMetrics.avgResponseTime)}ms`,
      memoryUsage: `${systemMetrics.memoryUsage.percentage.toFixed(2)}%`,
      totalTokens: systemMetrics.tokenUsage.totalTokens,
      estimatedCost: `$${systemMetrics.tokenUsage.estimatedCost.toFixed(4)}`
    });
  }

  /**
   * Format metrics for display
   */
  formatMetrics(metrics: PerformanceMetrics): string {
    const lines = [
      `Operation: ${metrics.operation}`,
      `Duration: ${metrics.duration}ms`,
      `Memory Delta: ${this.formatBytes(metrics.memoryDelta)}`,
      `Success: ${metrics.success ? 'Yes' : 'No'}`,
      `Timestamp: ${metrics.timestamp}`
    ];

    if (metrics.tokensUsed) {
      lines.push(`Tokens: ${metrics.tokensUsed}`);
    }

    if (metrics.metadata && Object.keys(metrics.metadata).length > 0) {
      lines.push(`Metadata: ${JSON.stringify(metrics.metadata)}`);
    }

    return lines.join('\n');
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 0) return `-${this.formatBytes(-bytes)}`;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const systemMetrics = this.getSystemMetrics();

    // System metrics
    lines.push(`# HELP system_uptime_seconds System uptime in seconds`);
    lines.push(`# TYPE system_uptime_seconds gauge`);
    lines.push(`system_uptime_seconds ${Math.round(systemMetrics.uptime / 1000)}`);

    lines.push(`# HELP system_total_operations Total operations executed`);
    lines.push(`# TYPE system_total_operations counter`);
    lines.push(`system_total_operations ${systemMetrics.totalOperations}`);

    lines.push(`# HELP system_success_rate Operation success rate`);
    lines.push(`# TYPE system_success_rate gauge`);
    lines.push(`system_success_rate ${systemMetrics.successRate}`);

    lines.push(`# HELP system_memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE system_memory_usage_bytes gauge`);
    lines.push(`system_memory_usage_bytes ${systemMetrics.memoryUsage.used}`);

    lines.push(`# HELP system_token_usage_total Total tokens consumed`);
    lines.push(`# TYPE system_token_usage_total counter`);
    lines.push(`system_token_usage_total ${systemMetrics.tokenUsage.totalTokens}`);

    // Per-operation metrics
    for (const stats of this.getAllStats()) {
      const opName = stats.operation.replace(/[^a-zA-Z0-9_]/g, '_');

      lines.push(`# HELP operation_${opName}_duration_ms Operation duration in milliseconds`);
      lines.push(`# TYPE operation_${opName}_duration_ms summary`);
      lines.push(`operation_${opName}_duration_ms{quantile="0.5"} ${stats.avgDuration}`);
      lines.push(`operation_${opName}_duration_ms{quantile="0.95"} ${stats.maxDuration}`);
      lines.push(`operation_${opName}_duration_ms_sum ${stats.totalDuration}`);
      lines.push(`operation_${opName}_duration_ms_count ${stats.count}`);

      lines.push(`# HELP operation_${opName}_success_rate Success rate for operation`);
      lines.push(`# TYPE operation_${opName}_success_rate gauge`);
      lines.push(`operation_${opName}_success_rate ${stats.successRate}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart flush interval if changed
    if (config.metricsFlushInterval !== undefined) {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      if (this.config.metricsFlushInterval > 0) {
        this.startPeriodicFlush();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Stop monitoring and clean up
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
    this.logger.info('Performance monitor stopped');
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(config?: Partial<PerformanceMonitorConfig>): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor(config);
  }
  return globalPerformanceMonitor;
}

/**
 * Set global performance monitor instance
 */
export function setPerformanceMonitor(monitor: PerformanceMonitor): void {
  globalPerformanceMonitor = monitor;
}
