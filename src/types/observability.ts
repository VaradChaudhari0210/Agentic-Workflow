/**
 * Observability Types
 * 
 * Defines types for logging, performance monitoring, error tracking, health checks,
 * and metrics collection for production observability.
 */

/**
 * Log Levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log output format
 */
export type LogFormat = 'json' | 'pretty';

/**
 * Log destination
 */
export type LogDestination = 'console' | 'file' | 'both';

/**
 * Single log entry
 */
export interface LogEntry {
  /** Timestamp in ISO format */
  timestamp: string;
  
  /** Log level */
  level: LogLevel;
  
  /** Log message */
  message: string;
  
  /** Additional context data */
  context?: Record<string, any>;
  
  /** Agent identifier */
  agentId?: string;
  
  /** Task identifier */
  taskId?: string;
  
  /** Request identifier */
  requestId?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Error details if this is an error log */
  error?: ErrorDetails;
  
  /** Performance data if included */
  performance?: PerformanceData;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  
  /** Output format */
  format: LogFormat;
  
  /** Where to write logs */
  destination: LogDestination;
  
  /** File path for file logging */
  filePath?: string;
  
  /** Maximum file size in bytes before rotation */
  maxFileSize?: number;
  
  /** Maximum number of log files to keep */
  maxFiles?: number;
  
  /** Fields to redact from logs (e.g., apiKey, password) */
  redactFields?: string[];
  
  /** Whether to include stack traces in error logs */
  includeStackTrace?: boolean;
}

/**
 * Performance timing data
 */
export interface PerformanceData {
  /** Operation name */
  operation: string;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Memory used in bytes */
  memoryUsed?: number;
  
  /** Tokens consumed (for API calls) */
  tokensUsed?: number;
}

/**
 * Performance metrics for an operation
 */
export interface PerformanceMetrics {
  /** Operation identifier */
  operation: string;
  
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Memory used in bytes */
  memoryUsed: number;
  
  /** Memory delta (after - before) */
  memoryDelta: number;
  
  /** Tokens consumed */
  tokensUsed?: number;
  
  /** Whether operation succeeded */
  success: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Timestamp when recorded */
  timestamp: string;
}

/**
 * Aggregated statistics for an operation
 */
export interface OperationStats {
  /** Operation name */
  operation: string;
  
  /** Number of times executed */
  count: number;
  
  /** Total duration across all executions */
  totalDuration: number;
  
  /** Average duration */
  avgDuration: number;
  
  /** Minimum duration */
  minDuration: number;
  
  /** Maximum duration */
  maxDuration: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Number of successful executions */
  successCount: number;
  
  /** Number of failed executions */
  failureCount: number;
  
  /** Last execution timestamp */
  lastExecuted: string;
  
  /** Total tokens used */
  totalTokens?: number;
  
  /** Average tokens per execution */
  avgTokens?: number;
}

/**
 * System-wide metrics
 */
export interface SystemMetrics {
  /** System uptime in milliseconds */
  uptime: number;
  
  /** Total operations executed */
  totalOperations: number;
  
  /** Successful operations */
  successfulOperations: number;
  
  /** Failed operations */
  failedOperations: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Average response time in milliseconds */
  avgResponseTime: number;
  
  /** Current memory usage */
  memoryUsage: MemoryUsage;
  
  /** Token usage statistics */
  tokenUsage: TokenUsage;
  
  /** When metrics were last updated */
  lastUpdated: string;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  /** Memory used in bytes */
  used: number;
  
  /** Total memory available in bytes */
  total: number;
  
  /** Usage percentage (0-100) */
  percentage: number;
  
  /** Heap used in bytes */
  heapUsed: number;
  
  /** Heap total in bytes */
  heapTotal: number;
  
  /** External memory in bytes */
  external: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Total tokens consumed */
  totalTokens: number;
  
  /** Estimated cost in USD */
  estimatedCost: number;
  
  /** Average tokens per operation */
  avgTokensPerOperation: number;
  
  /** Peak tokens in single operation */
  peakTokens: number;
  
  /** Tokens in last operation */
  lastOperationTokens?: number;
}

/**
 * Error type categories
 */
export type ErrorType = 'user' | 'system' | 'api' | 'validation' | 'network' | 'timeout';

/**
 * Detailed error information
 */
export interface ErrorDetails {
  /** Error type category */
  type: ErrorType;
  
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Stack trace */
  stack?: string;
  
  /** Additional context */
  context?: Record<string, any>;
  
  /** When error occurred */
  timestamp: string;
  
  /** Whether error is recoverable */
  recoverable: boolean;
  
  /** Whether error should be retried */
  retryable: boolean;
  
  /** Original error if this is a wrapped error */
  originalError?: any;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Initial delay in milliseconds */
  initialDelay: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  
  /** Error codes/types that should trigger retry */
  retryableErrors: string[];
  
  /** Timeout for each attempt in milliseconds */
  timeout?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  
  /** Number of successes needed to close circuit */
  successThreshold: number;
  
  /** Timeout for operations in milliseconds */
  timeout: number;
  
  /** Time to wait before attempting to close circuit (milliseconds) */
  resetTimeout: number;
  
  /** Whether circuit breaker is enabled */
  enabled: boolean;
}

/**
 * Circuit breaker state
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  /** Current state */
  state: CircuitBreakerState;
  
  /** Number of consecutive failures */
  failureCount: number;
  
  /** Number of consecutive successes */
  successCount: number;
  
  /** When circuit was last opened */
  lastFailureTime?: string;
  
  /** When circuit will attempt to close */
  nextAttemptTime?: string;
}

/**
 * Error tracking configuration
 */
export interface ErrorTrackerConfig {
  /** Retry strategy */
  retryStrategy: RetryStrategy;
  
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
  
  /** Whether to capture stack traces */
  captureStackTrace: boolean;
  
  /** Maximum number of errors to store */
  maxStoredErrors?: number;
  
  /** External error tracking service (e.g., Sentry DSN) */
  externalService?: string;
}

/**
 * Health status values
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component status values
 */
export type ComponentStatus = 'up' | 'down' | 'degraded';

/**
 * System health report
 */
export interface SystemHealth {
  /** Overall health status */
  status: HealthStatus;
  
  /** Timestamp of health check */
  timestamp: string;
  
  /** System uptime in milliseconds */
  uptime: number;
  
  /** Individual component health */
  components: ComponentHealth[];
  
  /** Resource health */
  resources: ResourceHealth;
  
  /** Overall health message */
  message?: string;
}

/**
 * Health of a single component
 */
export interface ComponentHealth {
  /** Component name */
  name: string;
  
  /** Component status */
  status: ComponentStatus;
  
  /** Status message */
  message?: string;
  
  /** When last checked */
  lastCheck: string;
  
  /** Response time in milliseconds */
  responseTime?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Resource health metrics
 */
export interface ResourceHealth {
  /** CPU usage */
  cpu: {
    usage: number;
    threshold: number;
    status: ComponentStatus;
  };
  
  /** Memory usage */
  memory: {
    used: number;
    total: number;
    percentage: number;
    threshold: number;
    status: ComponentStatus;
  };
  
  /** Disk usage */
  disk: {
    used: number;
    total: number;
    percentage: number;
    threshold: number;
    status: ComponentStatus;
  };
}

/**
 * Health check function type
 */
export type HealthCheckFn = () => Promise<ComponentHealth>;

/**
 * Health checker configuration
 */
export interface HealthCheckerConfig {
  /** Interval between health checks in milliseconds */
  checkInterval: number;
  
  /** Memory usage threshold (0-1) */
  memoryThreshold: number;
  
  /** CPU usage threshold (0-1) */
  cpuThreshold: number;
  
  /** Disk usage threshold (0-1) */
  diskThreshold: number;
  
  /** Whether to run checks automatically */
  autoCheck: boolean;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  /** Threshold for slow operations in milliseconds */
  slowOperationThreshold: number;
  
  /** Interval for flushing metrics in milliseconds */
  metricsFlushInterval: number;
  
  /** Whether to track memory usage */
  trackMemory: boolean;
  
  /** Whether to track token usage */
  trackTokens: boolean;
  
  /** Maximum number of metrics to store in memory */
  maxStoredMetrics?: number;
}

/**
 * Timer handle for performance tracking
 */
export interface PerformanceTimer {
  /** Operation being timed */
  operation: string;
  
  /** Start time in milliseconds */
  startTime: number;
  
  /** Initial memory usage */
  startMemory: number;
  
  /** Metadata attached to this timer */
  metadata?: Record<string, any>;
}

/**
 * Metrics export format
 */
export type MetricsFormat = 'json' | 'prometheus' | 'influxdb';

/**
 * Metrics collector configuration
 */
export interface MetricsCollectorConfig {
  /** How often to aggregate metrics in milliseconds */
  aggregationInterval: number;
  
  /** How long to retain metrics in milliseconds */
  retentionPeriod: number;
  
  /** Maximum number of operations to track */
  maxOperations?: number;
  
  /** Export format */
  exportFormat: MetricsFormat;
}

/**
 * Dashboard display configuration
 */
export interface DashboardConfig {
  /** Refresh interval in milliseconds */
  refreshInterval: number;
  
  /** Number of history items to show */
  historyLimit: number;
  
  /** Whether to show real-time updates */
  realTime: boolean;
  
  /** Whether to use colors in output */
  useColors: boolean;
}

/**
 * Task execution record
 */
export interface TaskExecution {
  /** Task identifier */
  taskId: string;
  
  /** Task requirement */
  requirement: string;
  
  /** Start time */
  startTime: string;
  
  /** End time */
  endTime?: string;
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Whether task succeeded */
  success?: boolean;
  
  /** Error if task failed */
  error?: ErrorDetails;
  
  /** Performance metrics */
  metrics?: PerformanceMetrics[];
  
  /** Files changed */
  filesChanged?: string[];
  
  /** Tokens used */
  tokensUsed?: number;
}

/**
 * Observability configuration (master config)
 */
export interface ObservabilityConfig {
  /** Logger configuration */
  logger: LoggerConfig;
  
  /** Performance monitor configuration */
  performance: PerformanceMonitorConfig;
  
  /** Error tracker configuration */
  errorTracker: ErrorTrackerConfig;
  
  /** Health checker configuration */
  healthChecker: HealthCheckerConfig;
  
  /** Metrics collector configuration */
  metricsCollector: MetricsCollectorConfig;
  
  /** Dashboard configuration */
  dashboard: DashboardConfig;
  
  /** Whether observability is enabled */
  enabled: boolean;
}
