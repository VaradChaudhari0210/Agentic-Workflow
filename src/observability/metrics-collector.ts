/**
 * Metrics Collector
 * 
 * Aggregates metrics from all observability sources (logger, performance monitor,
 * error tracker, health checker) and provides unified access and export capabilities.
 */

import { Logger, getLogger } from './logger.js';
import { PerformanceMonitor, getPerformanceMonitor } from './performance-monitor.js';
import { ErrorTracker, getErrorTracker } from './error-tracker.js';
import { HealthChecker, getHealthChecker } from './health-checker.js';
import {
  SystemMetrics,
  MetricsCollectorConfig,
  MetricsFormat,
  TaskExecution
} from '../types/observability.js';

/**
 * Default metrics collector configuration
 */
const DEFAULT_CONFIG: MetricsCollectorConfig = {
  aggregationInterval: 60000, // 1 minute
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxOperations: 100,
  exportFormat: 'json'
};

/**
 * Metrics Collector
 */
export class MetricsCollector {
  private config: MetricsCollectorConfig;
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  private errorTracker: ErrorTracker;
  private healthChecker: HealthChecker;
  private taskHistory: TaskExecution[] = [];
  private aggregationInterval?: NodeJS.Timeout;

  constructor(
    config?: Partial<MetricsCollectorConfig>,
    logger?: Logger,
    performanceMonitor?: PerformanceMonitor,
    errorTracker?: ErrorTracker,
    healthChecker?: HealthChecker
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger || getLogger();
    this.performanceMonitor = performanceMonitor || getPerformanceMonitor();
    this.errorTracker = errorTracker || getErrorTracker();
    this.healthChecker = healthChecker || getHealthChecker();

    // Start periodic aggregation if configured
    if (this.config.aggregationInterval > 0) {
      this.startPeriodicAggregation();
    }
  }

  /**
   * Record task execution
   */
  recordTaskExecution(task: TaskExecution): void {
    this.taskHistory.unshift(task);

    // Clean old tasks based on retention period
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    this.taskHistory = this.taskHistory.filter(t => {
      const taskTime = new Date(t.startTime).getTime();
      return taskTime > cutoffTime;
    });

    this.logger.debug('Task execution recorded', {
      taskId: task.taskId,
      success: task.success,
      duration: task.duration
    });
  }

  /**
   * Get all metrics in one comprehensive object
   */
  async getAllMetrics(): Promise<{
    system: SystemMetrics;
    health: any;
    errors: any;
    tasks: TaskExecution[];
  }> {
    const [systemMetrics, health, errorStats] = await Promise.all([
      this.getSystemMetrics(),
      this.healthChecker.checkHealth(),
      Promise.resolve(this.errorTracker.getErrorStats())
    ]);

    return {
      system: systemMetrics,
      health,
      errors: errorStats,
      tasks: this.getRecentTasks(10)
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return this.performanceMonitor.getSystemMetrics();
  }

  /**
   * Get task history
   */
  getTaskHistory(limit?: number): TaskExecution[] {
    return limit ? this.taskHistory.slice(0, limit) : [...this.taskHistory];
  }

  /**
   * Get recent tasks
   */
  getRecentTasks(limit: number = 10): TaskExecution[] {
    return this.taskHistory.slice(0, limit);
  }

  /**
   * Get successful tasks
   */
  getSuccessfulTasks(limit?: number): TaskExecution[] {
    const successful = this.taskHistory.filter(t => t.success === true);
    return limit ? successful.slice(0, limit) : successful;
  }

  /**
   * Get failed tasks
   */
  getFailedTasks(limit?: number): TaskExecution[] {
    const failed = this.taskHistory.filter(t => t.success === false);
    return limit ? failed.slice(0, limit) : failed;
  }

  /**
   * Get task statistics
   */
  getTaskStats(): {
    total: number;
    successful: number;
    failed: number;
    inProgress: number;
    successRate: number;
    avgDuration: number;
    totalDuration: number;
  } {
    const completedTasks = this.taskHistory.filter(t => t.duration !== undefined);
    const successful = completedTasks.filter(t => t.success === true);
    const failed = completedTasks.filter(t => t.success === false);
    const inProgress = this.taskHistory.filter(t => t.duration === undefined);
    
    const totalDuration = completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgDuration = completedTasks.length > 0 ? totalDuration / completedTasks.length : 0;

    return {
      total: this.taskHistory.length,
      successful: successful.length,
      failed: failed.length,
      inProgress: inProgress.length,
      successRate: completedTasks.length > 0 ? successful.length / completedTasks.length : 0,
      avgDuration,
      totalDuration
    };
  }

  /**
   * Export metrics in specified format
   */
  async exportMetrics(format?: MetricsFormat): Promise<string> {
    const exportFormat = format || this.config.exportFormat;

    switch (exportFormat) {
      case 'json':
        return this.exportJSON();
      case 'prometheus':
        return this.exportPrometheus();
      case 'influxdb':
        return this.exportInfluxDB();
      default:
        return this.exportJSON();
    }
  }

  /**
   * Export metrics as JSON
   */
  private async exportJSON(): Promise<string> {
    const metrics = await this.getAllMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheus(): string {
    const lines: string[] = [];

    // Get system metrics
    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    const taskStats = this.getTaskStats();
    const errorStats = this.errorTracker.getErrorStats();

    // System metrics
    lines.push('# HELP backend_agent_uptime_seconds System uptime in seconds');
    lines.push('# TYPE backend_agent_uptime_seconds gauge');
    lines.push(`backend_agent_uptime_seconds ${Math.round(systemMetrics.uptime / 1000)}`);

    lines.push('# HELP backend_agent_memory_usage_bytes Memory usage in bytes');
    lines.push('# TYPE backend_agent_memory_usage_bytes gauge');
    lines.push(`backend_agent_memory_usage_bytes ${systemMetrics.memoryUsage.used}`);

    // Task metrics
    lines.push('# HELP backend_agent_tasks_total Total number of tasks');
    lines.push('# TYPE backend_agent_tasks_total counter');
    lines.push(`backend_agent_tasks_total ${taskStats.total}`);

    lines.push('# HELP backend_agent_tasks_successful Successful tasks');
    lines.push('# TYPE backend_agent_tasks_successful counter');
    lines.push(`backend_agent_tasks_successful ${taskStats.successful}`);

    lines.push('# HELP backend_agent_tasks_failed Failed tasks');
    lines.push('# TYPE backend_agent_tasks_failed counter');
    lines.push(`backend_agent_tasks_failed ${taskStats.failed}`);

    lines.push('# HELP backend_agent_task_success_rate Task success rate');
    lines.push('# TYPE backend_agent_task_success_rate gauge');
    lines.push(`backend_agent_task_success_rate ${taskStats.successRate}`);

    // Error metrics
    lines.push('# HELP backend_agent_errors_total Total errors captured');
    lines.push('# TYPE backend_agent_errors_total counter');
    lines.push(`backend_agent_errors_total ${errorStats.total}`);

    // Token metrics
    lines.push('# HELP backend_agent_tokens_total Total tokens consumed');
    lines.push('# TYPE backend_agent_tokens_total counter');
    lines.push(`backend_agent_tokens_total ${systemMetrics.tokenUsage.totalTokens}`);

    lines.push('# HELP backend_agent_cost_total Estimated cost in USD');
    lines.push('# TYPE backend_agent_cost_total counter');
    lines.push(`backend_agent_cost_total ${systemMetrics.tokenUsage.estimatedCost}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Export metrics in InfluxDB line protocol format
   */
  private exportInfluxDB(): string {
    const lines: string[] = [];
    const timestamp = Date.now() * 1000000; // nanoseconds

    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    const taskStats = this.getTaskStats();

    // System metrics
    lines.push(`backend_agent,type=system uptime=${Math.round(systemMetrics.uptime/1000)},memory_used=${systemMetrics.memoryUsage.used},memory_percentage=${systemMetrics.memoryUsage.percentage} ${timestamp}`);

    // Task metrics
    lines.push(`backend_agent,type=tasks total=${taskStats.total},successful=${taskStats.successful},failed=${taskStats.failed},success_rate=${taskStats.successRate} ${timestamp}`);

    // Token metrics
    lines.push(`backend_agent,type=tokens total=${systemMetrics.tokenUsage.totalTokens},cost=${systemMetrics.tokenUsage.estimatedCost} ${timestamp}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Generate dashboard summary
   */
  async generateDashboard(): Promise<string> {
    const lines: string[] = [];

    lines.push('╔════════════════════════════════════════════════════════════╗');
    lines.push('║              Backend Engineer Agent Dashboard              ║');
    lines.push('╚════════════════════════════════════════════════════════════╝');
    lines.push('');

    // System metrics
    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    lines.push('📊 System Metrics');
    lines.push('─'.repeat(60));
    lines.push(`Uptime:              ${this.formatDuration(systemMetrics.uptime)}`);
    lines.push(`Total Operations:    ${systemMetrics.totalOperations}`);
    lines.push(`Success Rate:        ${(systemMetrics.successRate * 100).toFixed(1)}%`);
    lines.push(`Avg Response Time:   ${Math.round(systemMetrics.avgResponseTime)}ms`);
    lines.push(`Memory Usage:        ${systemMetrics.memoryUsage.percentage.toFixed(1)}% (${this.formatBytes(systemMetrics.memoryUsage.used)})`);
    lines.push('');

    // Task stats
    const taskStats = this.getTaskStats();
    lines.push('📋 Task Statistics');
    lines.push('─'.repeat(60));
    lines.push(`Total Tasks:         ${taskStats.total}`);
    lines.push(`Successful:          ${taskStats.successful} (${(taskStats.successRate * 100).toFixed(1)}%)`);
    lines.push(`Failed:              ${taskStats.failed}`);
    lines.push(`In Progress:         ${taskStats.inProgress}`);
    lines.push(`Avg Duration:        ${this.formatDuration(taskStats.avgDuration)}`);
    lines.push('');

    // Token usage
    lines.push('🪙 Token Usage');
    lines.push('─'.repeat(60));
    lines.push(`Total Tokens:        ${systemMetrics.tokenUsage.totalTokens.toLocaleString()}`);
    lines.push(`Estimated Cost:      $${systemMetrics.tokenUsage.estimatedCost.toFixed(4)}`);
    lines.push(`Avg per Operation:   ${Math.round(systemMetrics.tokenUsage.avgTokensPerOperation)} tokens`);
    lines.push('');

    // Error stats
    const errorStats = this.errorTracker.getErrorStats();
    if (errorStats.total > 0) {
      lines.push('🚨 Error Summary');
      lines.push('─'.repeat(60));
      lines.push(`Total Errors:        ${errorStats.total}`);
      lines.push(`By Type:`);
      Object.entries(errorStats.byType).forEach(([type, count]) => {
        if (count > 0) {
          lines.push(`  ${type}:            ${count}`);
        }
      });
      lines.push('');
    }

    // Health status
    const health = await this.healthChecker.checkHealth();
    const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '🚨';
    lines.push('🏥 System Health');
    lines.push('─'.repeat(60));
    lines.push(`Status:              ${statusEmoji} ${health.status.toUpperCase()}`);
    lines.push(`Components:          ${health.components.length} registered`);
    lines.push(`CPU Usage:           ${health.resources.cpu.usage.toFixed(1)}%`);
    lines.push(`Memory:              ${health.resources.memory.percentage.toFixed(1)}%`);
    lines.push('');

    lines.push(`Generated: ${new Date().toISOString()}`);

    return lines.join('\n');
  }

  /**
   * Format duration to human readable
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }

  /**
   * Start periodic aggregation
   */
  private startPeriodicAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.aggregate();
    }, this.config.aggregationInterval);

    this.logger.info('Metrics aggregation started', {
      interval: `${this.config.aggregationInterval}ms`
    });
  }

  /**
   * Perform aggregation
   */
  private aggregate(): void {
    // Clean up old data
    this.cleanupOldData();

    // Log aggregated metrics
    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    const taskStats = this.getTaskStats();

    this.logger.info('Metrics aggregated', {
      operations: systemMetrics.totalOperations,
      tasks: taskStats.total,
      successRate: `${(taskStats.successRate * 100).toFixed(1)}%`,
      memoryUsage: `${systemMetrics.memoryUsage.percentage.toFixed(1)}%`
    });
  }

  /**
   * Clean up old data based on retention period
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const initialCount = this.taskHistory.length;

    this.taskHistory = this.taskHistory.filter(t => {
      const taskTime = new Date(t.startTime).getTime();
      return taskTime > cutoffTime;
    });

    const removed = initialCount - this.taskHistory.length;
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} old task records`);
    }
  }

  /**
   * Stop periodic aggregation
   */
  stopAggregation(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = undefined;
      this.logger.info('Metrics aggregation stopped');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MetricsCollectorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart aggregation if interval changed
    if (config.aggregationInterval !== undefined) {
      this.stopAggregation();
      if (this.config.aggregationInterval > 0) {
        this.startPeriodicAggregation();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MetricsCollectorConfig {
    return { ...this.config };
  }

  /**
   * Clean up and stop
   */
  stop(): void {
    this.stopAggregation();
    this.logger.info('Metrics collector stopped');
  }
}

/**
 * Global metrics collector instance
 */
let globalMetricsCollector: MetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export function getMetricsCollector(config?: Partial<MetricsCollectorConfig>): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector(config);
  }
  return globalMetricsCollector;
}

/**
 * Set global metrics collector instance
 */
export function setMetricsCollector(collector: MetricsCollector): void {
  globalMetricsCollector = collector;
}
