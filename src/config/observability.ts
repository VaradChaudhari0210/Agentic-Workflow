/**
 * Observability Configuration
 * 
 * Loads observability settings from environment variables and provides
 * factory functions for creating configured observability instances.
 */

import {
  ObservabilityConfig,
  LoggerConfig,
  PerformanceMonitorConfig,
  ErrorTrackerConfig,
  HealthCheckerConfig,
  MetricsCollectorConfig,
  DashboardConfig,
  LogLevel,
  LogFormat,
  LogDestination,
  MetricsFormat
} from '../types/observability.js';

/**
 * Load observability configuration from environment variables
 */
export function loadObservabilityConfig(): ObservabilityConfig {
  return {
    logger: loadLoggerConfig(),
    performance: loadPerformanceConfig(),
    errorTracker: loadErrorTrackerConfig(),
    healthChecker: loadHealthCheckerConfig(),
    metricsCollector: loadMetricsCollectorConfig(),
    dashboard: loadDashboardConfig(),
    enabled: getEnvBoolean('OBSERVABILITY_ENABLED', true)
  };
}

/**
 * Load logger configuration
 */
export function loadLoggerConfig(): LoggerConfig {
  return {
    level: getEnvEnum<LogLevel>('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info'),
    format: getEnvEnum<LogFormat>('LOG_FORMAT', ['json', 'pretty'], 'pretty'),
    destination: getEnvEnum<LogDestination>('LOG_DESTINATION', ['console', 'file', 'both'], 'console'),
    filePath: getEnvString('LOG_FILE_PATH', './logs/backend-agent.log'),
    maxFileSize: getEnvNumber('LOG_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    maxFiles: getEnvNumber('LOG_MAX_FILES', 7),
    redactFields: getEnvArray('LOG_REDACT_FIELDS', ['apiKey', 'password', 'token', 'secret', 'authorization']),
    includeStackTrace: getEnvBoolean('LOG_INCLUDE_STACK_TRACE', true)
  };
}

/**
 * Load performance monitor configuration
 */
function loadPerformanceConfig(): PerformanceMonitorConfig {
  return {
    slowOperationThreshold: getEnvNumber('PERF_SLOW_THRESHOLD', 5000), // 5 seconds
    metricsFlushInterval: getEnvNumber('PERF_FLUSH_INTERVAL', 60000), // 1 minute
    trackMemory: getEnvBoolean('PERF_TRACK_MEMORY', true),
    trackTokens: getEnvBoolean('PERF_TRACK_TOKENS', true),
    maxStoredMetrics: getEnvNumber('PERF_MAX_STORED_METRICS', 1000)
  };
}

/**
 * Load error tracker configuration
 */
function loadErrorTrackerConfig(): ErrorTrackerConfig {
  return {
    retryStrategy: {
      maxAttempts: getEnvNumber('ERROR_RETRY_MAX_ATTEMPTS', 3),
      initialDelay: getEnvNumber('ERROR_RETRY_INITIAL_DELAY', 1000),
      maxDelay: getEnvNumber('ERROR_RETRY_MAX_DELAY', 30000),
      backoffMultiplier: getEnvNumber('ERROR_RETRY_BACKOFF_MULTIPLIER', 2),
      retryableErrors: getEnvArray('ERROR_RETRYABLE_CODES', [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'RATE_LIMIT',
        'NETWORK_ERROR'
      ]),
      timeout: getEnvNumber('ERROR_RETRY_TIMEOUT', 60000)
    },
    circuitBreaker: {
      failureThreshold: getEnvNumber('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
      successThreshold: getEnvNumber('CIRCUIT_BREAKER_SUCCESS_THRESHOLD', 2),
      timeout: getEnvNumber('CIRCUIT_BREAKER_TIMEOUT', 60000),
      resetTimeout: getEnvNumber('CIRCUIT_BREAKER_RESET_TIMEOUT', 30000),
      enabled: getEnvBoolean('CIRCUIT_BREAKER_ENABLED', true)
    },
    captureStackTrace: getEnvBoolean('ERROR_CAPTURE_STACK_TRACE', true),
    maxStoredErrors: getEnvNumber('ERROR_MAX_STORED', 100),
    externalService: getEnvString('ERROR_EXTERNAL_SERVICE') // e.g., Sentry DSN
  };
}

/**
 * Load health checker configuration
 */
export function loadHealthCheckerConfig(): HealthCheckerConfig {
  return {
    checkInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000), // 30 seconds
    memoryThreshold: getEnvNumber('HEALTH_MEMORY_THRESHOLD', 0.85), // 85%
    cpuThreshold: getEnvNumber('HEALTH_CPU_THRESHOLD', 0.80), // 80%
    diskThreshold: getEnvNumber('HEALTH_DISK_THRESHOLD', 0.90), // 90%
    autoCheck: getEnvBoolean('HEALTH_AUTO_CHECK', false)
  };
}

/**
 * Load metrics collector configuration
 */
export function loadMetricsCollectorConfig(): MetricsCollectorConfig {
  return {
    aggregationInterval: getEnvNumber('METRICS_AGGREGATION_INTERVAL', 60000), // 1 minute
    retentionPeriod: getEnvNumber('METRICS_RETENTION_PERIOD', 30 * 24 * 60 * 60 * 1000), // 30 days
    maxOperations: getEnvNumber('METRICS_MAX_OPERATIONS', 100),
    exportFormat: getEnvEnum<MetricsFormat>('METRICS_EXPORT_FORMAT', ['json', 'prometheus', 'influxdb'], 'json')
  };
}

/**
 * Load dashboard configuration
 */
function loadDashboardConfig(): DashboardConfig {
  return {
    refreshInterval: getEnvNumber('DASHBOARD_REFRESH_INTERVAL', 5000), // 5 seconds
    historyLimit: getEnvNumber('DASHBOARD_HISTORY_LIMIT', 20),
    realTime: getEnvBoolean('DASHBOARD_REAL_TIME', true),
    useColors: getEnvBoolean('DASHBOARD_USE_COLORS', true)
  };
}

/**
 * Get environment variable as string
 */
function getEnvString(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Get environment variable as array (comma-separated)
 */
function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Get environment variable as enum
 */
function getEnvEnum<T extends string>(
  key: string,
  allowedValues: T[],
  defaultValue: T
): T {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const lower = value.toLowerCase() as T;
  return allowedValues.includes(lower) ? lower : defaultValue;
}

/**
 * Validate observability configuration
 */
export function validateConfig(config: ObservabilityConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate logger
  if (config.logger.maxFileSize && config.logger.maxFileSize < 1024) {
    errors.push('LOG_MAX_FILE_SIZE must be at least 1024 bytes');
  }
  if (config.logger.maxFiles && config.logger.maxFiles < 1) {
    errors.push('LOG_MAX_FILES must be at least 1');
  }

  // Validate performance monitor
  if (config.performance.slowOperationThreshold < 0) {
    errors.push('PERF_SLOW_THRESHOLD must be positive');
  }
  if (config.performance.metricsFlushInterval < 0) {
    errors.push('PERF_FLUSH_INTERVAL must be positive');
  }

  // Validate error tracker
  if (config.errorTracker.retryStrategy.maxAttempts < 1) {
    errors.push('ERROR_RETRY_MAX_ATTEMPTS must be at least 1');
  }
  if (config.errorTracker.retryStrategy.backoffMultiplier < 1) {
    errors.push('ERROR_RETRY_BACKOFF_MULTIPLIER must be at least 1');
  }
  if (config.errorTracker.circuitBreaker.failureThreshold < 1) {
    errors.push('CIRCUIT_BREAKER_FAILURE_THRESHOLD must be at least 1');
  }

  // Validate health checker
  if (config.healthChecker.memoryThreshold < 0 || config.healthChecker.memoryThreshold > 1) {
    errors.push('HEALTH_MEMORY_THRESHOLD must be between 0 and 1');
  }
  if (config.healthChecker.cpuThreshold < 0 || config.healthChecker.cpuThreshold > 1) {
    errors.push('HEALTH_CPU_THRESHOLD must be between 0 and 1');
  }
  if (config.healthChecker.diskThreshold < 0 || config.healthChecker.diskThreshold > 1) {
    errors.push('HEALTH_DISK_THRESHOLD must be between 0 and 1');
  }

  // Validate metrics collector
  if (config.metricsCollector.retentionPeriod < 0) {
    errors.push('METRICS_RETENTION_PERIOD must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create observability instances from configuration
 */
export async function createObservabilityStack(config?: ObservabilityConfig) {
  const finalConfig = config || loadObservabilityConfig();

  // Validate configuration
  const validation = validateConfig(finalConfig);
  if (!validation.valid) {
    throw new Error(`Invalid observability configuration: ${validation.errors.join(', ')}`);
  }

  // Import observability modules
  const { Logger } = await import('../observability/logger.js');
  const { PerformanceMonitor } = await import('../observability/performance-monitor.js');
  const { ErrorTracker } = await import('../observability/error-tracker.js');
  const { HealthChecker } = await import('../observability/health-checker.js');
  const { MetricsCollector } = await import('../observability/metrics-collector.js');

  // Create instances
  const logger = new Logger(finalConfig.logger);
  const performanceMonitor = new PerformanceMonitor(finalConfig.performance, logger);
  const errorTracker = new ErrorTracker(finalConfig.errorTracker, logger);
  const healthChecker = new HealthChecker(finalConfig.healthChecker, logger);
  const metricsCollector = new MetricsCollector(
    finalConfig.metricsCollector,
    logger,
    performanceMonitor,
    errorTracker,
    healthChecker
  );

  return {
    logger,
    performanceMonitor,
    errorTracker,
    healthChecker,
    metricsCollector,
    config: finalConfig
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): ObservabilityConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const config = loadObservabilityConfig();

  // Adjust configuration based on environment
  if (nodeEnv === 'production') {
    // Production: JSON logs to file, less verbose
    config.logger.format = 'json';
    config.logger.destination = 'both';
    config.logger.level = 'info';
    config.performance.trackMemory = true;
    config.performance.trackTokens = true;
    config.healthChecker.autoCheck = true;
  } else if (nodeEnv === 'development') {
    // Development: Pretty logs to console, more verbose
    config.logger.format = 'pretty';
    config.logger.destination = 'console';
    config.logger.level = 'debug';
    config.performance.trackMemory = true;
    config.healthChecker.autoCheck = false;
  } else if (nodeEnv === 'test') {
    // Test: Minimal logging
    config.logger.level = 'error';
    config.logger.destination = 'console';
    config.performance.metricsFlushInterval = 0; // Disable periodic flush
    config.metricsCollector.aggregationInterval = 0; // Disable periodic aggregation
    config.healthChecker.autoCheck = false;
  }

  return config;
}

/**
 * Print configuration summary
 */
export function printConfigSummary(config: ObservabilityConfig): void {
  console.log('\n📊 Observability Configuration');
  console.log('─'.repeat(60));
  console.log(`Enabled:              ${config.enabled ? 'Yes' : 'No'}`);
  console.log(`\nLogger:`);
  console.log(`  Level:              ${config.logger.level}`);
  console.log(`  Format:             ${config.logger.format}`);
  console.log(`  Destination:        ${config.logger.destination}`);
  console.log(`  File Path:          ${config.logger.filePath || 'N/A'}`);
  console.log(`\nPerformance:`);
  console.log(`  Slow Threshold:     ${config.performance.slowOperationThreshold}ms`);
  console.log(`  Track Memory:       ${config.performance.trackMemory ? 'Yes' : 'No'}`);
  console.log(`  Track Tokens:       ${config.performance.trackTokens ? 'Yes' : 'No'}`);
  console.log(`\nError Tracking:`);
  console.log(`  Max Retry Attempts: ${config.errorTracker.retryStrategy.maxAttempts}`);
  console.log(`  Circuit Breaker:    ${config.errorTracker.circuitBreaker.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`\nHealth Checks:`);
  console.log(`  Auto Check:         ${config.healthChecker.autoCheck ? 'Yes' : 'No'}`);
  console.log(`  Memory Threshold:   ${(config.healthChecker.memoryThreshold * 100).toFixed(0)}%`);
  console.log(`\nMetrics:`);
  console.log(`  Export Format:      ${config.metricsCollector.exportFormat}`);
  console.log(`  Retention:          ${Math.floor(config.metricsCollector.retentionPeriod / (24 * 60 * 60 * 1000))} days`);
  console.log('─'.repeat(60) + '\n');
}

/**
 * Example .env configuration
 */
export const EXAMPLE_ENV_CONFIG = `
# Observability Configuration

# General
OBSERVABILITY_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
LOG_DESTINATION=console
LOG_FILE_PATH=./logs/backend-agent.log
LOG_MAX_FILE_SIZE=10485760
LOG_MAX_FILES=7
LOG_REDACT_FIELDS=apiKey,password,token,secret
LOG_INCLUDE_STACK_TRACE=true

# Performance Monitoring
PERF_SLOW_THRESHOLD=5000
PERF_FLUSH_INTERVAL=60000
PERF_TRACK_MEMORY=true
PERF_TRACK_TOKENS=true
PERF_MAX_STORED_METRICS=1000

# Error Tracking
ERROR_RETRY_MAX_ATTEMPTS=3
ERROR_RETRY_INITIAL_DELAY=1000
ERROR_RETRY_MAX_DELAY=30000
ERROR_RETRY_BACKOFF_MULTIPLIER=2
ERROR_RETRYABLE_CODES=ECONNRESET,ETIMEDOUT,ENOTFOUND,RATE_LIMIT
ERROR_RETRY_TIMEOUT=60000
ERROR_CAPTURE_STACK_TRACE=true
ERROR_MAX_STORED=100
# ERROR_EXTERNAL_SERVICE=https://sentry.io/...

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Health Checks
HEALTH_CHECK_INTERVAL=30000
HEALTH_MEMORY_THRESHOLD=0.85
HEALTH_CPU_THRESHOLD=0.80
HEALTH_DISK_THRESHOLD=0.90
HEALTH_AUTO_CHECK=false

# Metrics Collection
METRICS_AGGREGATION_INTERVAL=60000
METRICS_RETENTION_PERIOD=2592000000
METRICS_MAX_OPERATIONS=100
METRICS_EXPORT_FORMAT=json

# Dashboard
DASHBOARD_REFRESH_INTERVAL=5000
DASHBOARD_HISTORY_LIMIT=20
DASHBOARD_REAL_TIME=true
DASHBOARD_USE_COLORS=true
`.trim();
