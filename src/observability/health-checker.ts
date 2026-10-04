/**
 * Health Checker
 * 
 * Monitors system health, component health, resource usage, and provides
 * readiness/liveness probes for production deployments.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger, getLogger } from './logger.js';
import {
  SystemHealth,
  ComponentHealth,
  ResourceHealth,
  ComponentStatus,
  HealthStatus,
  HealthCheckFn,
  HealthCheckerConfig
} from '../types/observability.js';

const execAsync = promisify(exec);

/**
 * Default health checker configuration
 */
const DEFAULT_CONFIG: HealthCheckerConfig = {
  checkInterval: 30000, // 30 seconds
  memoryThreshold: 0.85, // 85%
  cpuThreshold: 0.80, // 80%
  diskThreshold: 0.90, // 90%
  autoCheck: false
};

/**
 * Health Checker
 */
export class HealthChecker {
  private config: HealthCheckerConfig;
  private logger: Logger;
  private components: Map<string, HealthCheckFn> = new Map();
  private lastHealthCheck?: SystemHealth;
  private startTime: number = Date.now();
  private checkInterval?: NodeJS.Timeout;

  constructor(config?: Partial<HealthCheckerConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger || getLogger();

    // Start automatic health checks if configured
    if (this.config.autoCheck) {
      this.startAutoCheck();
    }
  }

  /**
   * Register a component for health checking
   */
  registerComponent(name: string, checkFn: HealthCheckFn): void {
    this.components.set(name, checkFn);
    this.logger.debug(`Health check registered for component: ${name}`);
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): void {
    this.components.delete(name);
    this.logger.debug(`Health check unregistered for component: ${name}`);
  }

  /**
   * Perform complete health check
   */
  async checkHealth(): Promise<SystemHealth> {
    this.logger.debug('Performing health check');

    const startTime = Date.now();

    // Check all components
    const componentResults = await this.checkComponents();

    // Check resources
    const resources = await this.checkResources();

    // Determine overall status
    const status = this.determineOverallStatus(componentResults, resources);

    const health: SystemHealth = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      components: componentResults,
      resources,
      message: this.generateHealthMessage(status, componentResults, resources)
    };

    this.lastHealthCheck = health;

    const duration = Date.now() - startTime;
    this.logger.info('Health check completed', {
      status,
      duration: `${duration}ms`,
      componentCount: componentResults.length
    });

    return health;
  }

  /**
   * Check all registered components
   */
  private async checkComponents(): Promise<ComponentHealth[]> {
    const results: ComponentHealth[] = [];

    for (const [name, checkFn] of this.components.entries()) {
      try {
        const result = await this.checkComponent(name, checkFn);
        results.push(result);
      } catch (error) {
        this.logger.error(`Health check failed for component: ${name}`, {}, error as Error);
        
        results.push({
          name,
          status: 'down',
          message: (error as Error).message,
          lastCheck: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Check a single component
   */
  private async checkComponent(name: string, checkFn: HealthCheckFn): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const result = await checkFn();
      const responseTime = Date.now() - startTime;

      return {
        ...result,
        name,
        lastCheck: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check system resources
   */
  private async checkResources(): Promise<ResourceHealth> {
    const [cpu, memory, disk] = await Promise.all([
      this.checkCPU(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    return { cpu, memory, disk };
  }

  /**
   * Check CPU usage
   */
  private async checkCPU(): Promise<ResourceHealth['cpu']> {
    try {
      const os = await import('os');
      const cpus = os.cpus();
      
      // Calculate average CPU usage
      let totalIdle = 0;
      let totalTick = 0;

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      }

      const usage = 1 - (totalIdle / totalTick);
      const percentage = usage * 100;

      return {
        usage: percentage,
        threshold: this.config.cpuThreshold * 100,
        status: this.determineResourceStatus(usage, this.config.cpuThreshold)
      };
    } catch (error) {
      this.logger.warn('Failed to check CPU usage', { error });
      return {
        usage: 0,
        threshold: this.config.cpuThreshold * 100,
        status: 'degraded'
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ResourceHealth['memory']> {
    try {
      const os = await import('os');
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const percentage = (usedMemory / totalMemory) * 100;

      return {
        used: usedMemory,
        total: totalMemory,
        percentage,
        threshold: this.config.memoryThreshold * 100,
        status: this.determineResourceStatus(usedMemory / totalMemory, this.config.memoryThreshold)
      };
    } catch (error) {
      this.logger.warn('Failed to check memory usage', { error });
      return {
        used: 0,
        total: 0,
        percentage: 0,
        threshold: this.config.memoryThreshold * 100,
        status: 'degraded'
      };
    }
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<ResourceHealth['disk']> {
    try {
      // Try to get disk usage (works on Unix-like systems)
      const { stdout } = await execAsync('df -k . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      if (parts.length >= 5) {
        const total = parseInt(parts[1]) * 1024; // Convert from KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const percentage = (used / total) * 100;

        return {
          used,
          total,
          percentage,
          threshold: this.config.diskThreshold * 100,
          status: this.determineResourceStatus(used / total, this.config.diskThreshold)
        };
      }
    } catch (error) {
      // Disk check failed (probably Windows or permission issue)
      this.logger.debug('Disk check not available on this system');
    }

    // Return unavailable status
    return {
      used: 0,
      total: 0,
      percentage: 0,
      threshold: this.config.diskThreshold * 100,
      status: 'up' // Don't fail health check if disk check unavailable
    };
  }

  /**
   * Determine resource status based on usage
   */
  private determineResourceStatus(usage: number, threshold: number): ComponentStatus {
    if (usage >= threshold) {
      return 'degraded';
    }
    if (usage >= threshold * 0.9) {
      return 'degraded';
    }
    return 'up';
  }

  /**
   * Determine overall system health status
   */
  private determineOverallStatus(
    components: ComponentHealth[],
    resources: ResourceHealth
  ): HealthStatus {
    // Check if any component is down
    const hasDownComponent = components.some(c => c.status === 'down');
    if (hasDownComponent) {
      return 'unhealthy';
    }

    // Check if any resource is degraded
    const hasResourceIssue = 
      resources.cpu.status === 'degraded' ||
      resources.memory.status === 'degraded' ||
      resources.disk.status === 'degraded';

    // Check if any component is degraded
    const hasDegradedComponent = components.some(c => c.status === 'degraded');

    if (hasResourceIssue || hasDegradedComponent) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate health message
   */
  private generateHealthMessage(
    status: HealthStatus,
    components: ComponentHealth[],
    resources: ResourceHealth
  ): string {
    if (status === 'healthy') {
      return 'All systems operational';
    }

    const issues: string[] = [];

    // Check for down components
    const downComponents = components.filter(c => c.status === 'down');
    if (downComponents.length > 0) {
      issues.push(`${downComponents.length} component(s) down: ${downComponents.map(c => c.name).join(', ')}`);
    }

    // Check for resource issues
    if (resources.memory.status === 'degraded') {
      issues.push(`Memory usage high: ${resources.memory.percentage.toFixed(1)}%`);
    }
    if (resources.cpu.status === 'degraded') {
      issues.push(`CPU usage high: ${resources.cpu.usage.toFixed(1)}%`);
    }
    if (resources.disk.status === 'degraded') {
      issues.push(`Disk usage high: ${resources.disk.percentage.toFixed(1)}%`);
    }

    return issues.join('; ');
  }

  /**
   * Check if system is ready (can accept requests)
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.status !== 'unhealthy';
  }

  /**
   * Check if system is alive (basic liveness check)
   */
  isAlive(): boolean {
    // Simple check - if we can respond, we're alive
    return true;
  }

  /**
   * Get last health check result (cached)
   */
  getLastHealthCheck(): SystemHealth | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get health summary
   */
  async getHealthSummary(): Promise<{
    status: HealthStatus;
    uptime: number;
    componentCount: number;
    healthyComponents: number;
    degradedComponents: number;
    downComponents: number;
    memoryUsage: number;
  }> {
    const health = await this.checkHealth();

    return {
      status: health.status,
      uptime: health.uptime,
      componentCount: health.components.length,
      healthyComponents: health.components.filter(c => c.status === 'up').length,
      degradedComponents: health.components.filter(c => c.status === 'degraded').length,
      downComponents: health.components.filter(c => c.status === 'down').length,
      memoryUsage: health.resources.memory.percentage
    };
  }

  /**
   * Format health report for display
   */
  formatHealthReport(health: SystemHealth): string {
    const lines: string[] = [];
    
    // Overall status
    const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '🚨';
    lines.push(`${statusEmoji} System Health: ${health.status.toUpperCase()}`);
    lines.push(`Uptime: ${this.formatUptime(health.uptime)}`);
    
    if (health.message) {
      lines.push(`Message: ${health.message}`);
    }
    
    lines.push('');

    // Components
    if (health.components.length > 0) {
      lines.push('Components:');
      for (const component of health.components) {
        const icon = component.status === 'up' ? '✅' : component.status === 'degraded' ? '⚠️' : '❌';
        const responseTime = component.responseTime ? ` (${component.responseTime}ms)` : '';
        lines.push(`  ${icon} ${component.name}${responseTime}`);
        
        if (component.message) {
          lines.push(`     ${component.message}`);
        }
      }
      lines.push('');
    }

    // Resources
    lines.push('Resources:');
    lines.push(`  CPU:    ${health.resources.cpu.usage.toFixed(1)}% (threshold: ${health.resources.cpu.threshold}%)`);
    lines.push(`  Memory: ${health.resources.memory.percentage.toFixed(1)}% (${this.formatBytes(health.resources.memory.used)} / ${this.formatBytes(health.resources.memory.total)})`);
    
    if (health.resources.disk.total > 0) {
      lines.push(`  Disk:   ${health.resources.disk.percentage.toFixed(1)}% (${this.formatBytes(health.resources.disk.used)} / ${this.formatBytes(health.resources.disk.total)})`);
    }

    lines.push('');
    lines.push(`Last Check: ${health.timestamp}`);

    return lines.join('\n');
  }

  /**
   * Format uptime to human readable
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
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
   * Start automatic health checks
   */
  private startAutoCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkHealth().catch(error => {
        this.logger.error('Automatic health check failed', {}, error);
      });
    }, this.config.checkInterval);

    this.logger.info('Automatic health checks started', {
      interval: `${this.config.checkInterval}ms`
    });
  }

  /**
   * Stop automatic health checks
   */
  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      this.logger.info('Automatic health checks stopped');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HealthCheckerConfig>): void {
    const oldAutoCheck = this.config.autoCheck;
    this.config = { ...this.config, ...config };

    // Restart auto-check if setting changed
    if (config.autoCheck !== undefined && config.autoCheck !== oldAutoCheck) {
      if (config.autoCheck) {
        this.startAutoCheck();
      } else {
        this.stopAutoCheck();
      }
    }

    // Restart with new interval if changed
    if (config.checkInterval !== undefined && this.checkInterval) {
      this.stopAutoCheck();
      if (this.config.autoCheck) {
        this.startAutoCheck();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): HealthCheckerConfig {
    return { ...this.config };
  }

  /**
   * Clean up and stop
   */
  stop(): void {
    this.stopAutoCheck();
    this.logger.info('Health checker stopped');
  }
}

/**
 * Global health checker instance
 */
let globalHealthChecker: HealthChecker | null = null;

/**
 * Get or create global health checker
 */
export function getHealthChecker(config?: Partial<HealthCheckerConfig>): HealthChecker {
  if (!globalHealthChecker) {
    globalHealthChecker = new HealthChecker(config);
  }
  return globalHealthChecker;
}

/**
 * Set global health checker instance
 */
export function setHealthChecker(checker: HealthChecker): void {
  globalHealthChecker = checker;
}
