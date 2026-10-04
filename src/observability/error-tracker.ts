/**
 * Error Tracker
 * 
 * Provides structured error capture, retry logic with exponential backoff,
 * circuit breaker pattern for API protection, and error aggregation.
 */

import { Logger, getLogger } from './logger.js';
import {
  ErrorDetails,
  ErrorType,
  RetryStrategy,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerStatus,
  ErrorTrackerConfig
} from '../types/observability.js';

/**
 * Default retry strategy
 */
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'RATE_LIMIT', 'NETWORK_ERROR'],
  timeout: 60000
};

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 30000,
  enabled: true
};

/**
 * Default error tracker configuration
 */
const DEFAULT_CONFIG: ErrorTrackerConfig = {
  retryStrategy: DEFAULT_RETRY_STRATEGY,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  captureStackTrace: true,
  maxStoredErrors: 100
};

/**
 * Error Tracker
 */
export class ErrorTracker {
  private config: ErrorTrackerConfig;
  private logger: Logger;
  private circuitState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private errorHistory: ErrorDetails[] = [];

  constructor(config?: Partial<ErrorTrackerConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger || getLogger();
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: {
      retryable?: boolean;
      timeout?: number;
      context?: Record<string, any>;
    }
  ): Promise<T> {
    const retryable = options?.retryable ?? true;
    const timeout = options?.timeout ?? this.config.retryStrategy.timeout;
    
    // Check circuit breaker
    if (this.config.circuitBreaker.enabled && !this.canExecute()) {
      const error = this.createError(
        'api',
        'CIRCUIT_OPEN',
        `Circuit breaker is open for ${operationName}`,
        false,
        false,
        options?.context
      );
      
      this.logger.error('Circuit breaker prevented execution', {
        operation: operationName,
        circuitState: this.circuitState
      });
      
      throw error;
    }

    let lastError: Error | undefined;
    const maxAttempts = retryable ? this.config.retryStrategy.maxAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName}`, {
          attempt,
          maxAttempts,
          circuitState: this.circuitState
        });

        // Execute with timeout
        const result = timeout
          ? await this.executeWithTimeout(operation, timeout)
          : await operation();

        // Record success
        this.recordSuccess();

        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded after ${attempt} attempts`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        const errorDetails = this.captureError(error as Error, {
          operation: operationName,
          attempt,
          maxAttempts,
          ...options?.context
        });

        // Record failure
        this.recordFailure();

        // Check if we should retry
        if (attempt < maxAttempts && this.shouldRetry(errorDetails)) {
          const delay = this.calculateDelay(attempt);
          
          this.logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
            attempt,
            maxAttempts,
            error: errorDetails.message,
            nextAttempt: attempt + 1
          });

          await this.sleep(delay);
        } else {
          this.logger.error(`${operationName} failed after ${attempt} attempts`, {
            error: errorDetails.message,
            code: errorDetails.code
          });
          
          throw error;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError!;
  }

  /**
   * Capture and structure an error
   */
  captureError(error: Error, context?: Record<string, any>): ErrorDetails {
    const errorDetails = this.extractErrorDetails(error, context);

    // Store error in history
    this.storeError(errorDetails);

    // Log error
    this.logger.error('Error captured', context, error);

    // Send to external service if configured
    if (this.config.externalService) {
      this.sendToExternalService(errorDetails).catch(err => {
        this.logger.warn('Failed to send error to external service', { error: err.message });
      });
    }

    return errorDetails;
  }

  /**
   * Extract error details from Error object
   */
  private extractErrorDetails(error: Error, context?: Record<string, any>): ErrorDetails {
    const errorType = this.categorizeError(error);
    const code = (error as any).code || error.name || 'UNKNOWN';
    const retryable = this.isRetryableError(code);

    return {
      type: errorType,
      code,
      message: error.message,
      stack: this.config.captureStackTrace ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      recoverable: this.isRecoverableError(error),
      retryable,
      originalError: error
    };
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';

    if (code.includes('timeout') || message.includes('timeout')) {
      return 'timeout';
    }
    
    if (code.includes('network') || code.includes('econnreset') || code.includes('enotfound')) {
      return 'network';
    }
    
    if (code.includes('validation') || message.includes('validation')) {
      return 'validation';
    }
    
    if (code.includes('api') || code.includes('rate') || message.includes('api')) {
      return 'api';
    }

    if (message.includes('user') || message.includes('invalid input')) {
      return 'user';
    }

    return 'system';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const code = (error as any).code?.toUpperCase() || '';
    const message = error.message.toLowerCase();

    // Network errors are usually recoverable
    if (code.includes('ECONNRESET') || code.includes('ETIMEDOUT') || code.includes('ENOTFOUND')) {
      return true;
    }

    // Rate limits are recoverable
    if (code.includes('RATE_LIMIT') || message.includes('rate limit')) {
      return true;
    }

    // Validation errors are not recoverable without user intervention
    if (message.includes('validation') || message.includes('invalid')) {
      return false;
    }

    return true;
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: ErrorDetails): boolean {
    if (!error.retryable) {
      return false;
    }

    // Check if error code is in retryable list
    return this.config.retryStrategy.retryableErrors.some(retryableCode =>
      error.code.includes(retryableCode)
    );
  }

  /**
   * Check if error code is retryable
   */
  private isRetryableError(code: string): boolean {
    return this.config.retryStrategy.retryableErrors.some(retryableCode =>
      code.includes(retryableCode)
    );
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.retryStrategy.initialDelay *
      Math.pow(this.config.retryStrategy.backoffMultiplier, attempt - 1);
    
    return Math.min(delay, this.config.retryStrategy.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Check if circuit breaker allows execution
   */
  private canExecute(): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return true;
    }

    const now = new Date();

    switch (this.circuitState) {
      case 'closed':
        return true;

      case 'open':
        // Check if enough time has passed to try half-open
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.circuitState = 'half-open';
          this.successCount = 0;
          this.logger.info('Circuit breaker moving to half-open state');
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.successCount++;
    this.failureCount = 0;

    // If in half-open state, check if we can close the circuit
    if (this.circuitState === 'half-open') {
      if (this.successCount >= this.config.circuitBreaker.successThreshold) {
        this.circuitState = 'closed';
        this.successCount = 0;
        this.logger.info('Circuit breaker closed after successful operations');
      }
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = new Date();

    // Check if we should open the circuit
    if (
      this.circuitState === 'closed' &&
      this.failureCount >= this.config.circuitBreaker.failureThreshold
    ) {
      this.openCircuit();
    } else if (this.circuitState === 'half-open') {
      // Any failure in half-open state opens the circuit again
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.circuitState = 'open';
    this.failureCount = 0;
    this.nextAttemptTime = new Date(
      Date.now() + this.config.circuitBreaker.resetTimeout
    );

    this.logger.warn('Circuit breaker opened due to failures', {
      nextAttemptTime: this.nextAttemptTime.toISOString()
    });
  }

  /**
   * Store error in history
   */
  private storeError(error: ErrorDetails): void {
    this.errorHistory.unshift(error);

    // Limit history size
    if (this.config.maxStoredErrors && this.errorHistory.length > this.config.maxStoredErrors) {
      this.errorHistory = this.errorHistory.slice(0, this.config.maxStoredErrors);
    }
  }

  /**
   * Send error to external service (e.g., Sentry)
   */
  private async sendToExternalService(error: ErrorDetails): Promise<void> {
    // Placeholder for external service integration
    // In real implementation, this would send to Sentry, Rollbar, etc.
    this.logger.debug('Would send error to external service', {
      service: this.config.externalService,
      error: error.code
    });
  }

  /**
   * Create structured error
   */
  private createError(
    type: ErrorType,
    code: string,
    message: string,
    recoverable: boolean,
    retryable: boolean,
    context?: Record<string, any>
  ): Error {
    const error = new Error(message) as any;
    error.code = code;
    error.type = type;
    error.recoverable = recoverable;
    error.retryable = retryable;
    error.context = context;
    return error;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerStatus {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime?.toISOString(),
      nextAttemptTime: this.nextAttemptTime?.toISOString()
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): ErrorDetails[] {
    return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    byCode: Record<string, number>;
    recentErrors: ErrorDetails[];
  } {
    const byType: Record<ErrorType, number> = {
      user: 0,
      system: 0,
      api: 0,
      validation: 0,
      network: 0,
      timeout: 0
    };

    const byCode: Record<string, number> = {};

    for (const error of this.errorHistory) {
      byType[error.type]++;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }

    return {
      total: this.errorHistory.length,
      byType,
      byCode,
      recentErrors: this.errorHistory.slice(0, 5)
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.logger.info('Circuit breaker manually reset');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorTrackerConfig {
    return { ...this.config };
  }
}

/**
 * Global error tracker instance
 */
let globalErrorTracker: ErrorTracker | null = null;

/**
 * Get or create global error tracker
 */
export function getErrorTracker(config?: Partial<ErrorTrackerConfig>): ErrorTracker {
  if (!globalErrorTracker) {
    globalErrorTracker = new ErrorTracker(config);
  }
  return globalErrorTracker;
}

/**
 * Set global error tracker instance
 */
export function setErrorTracker(tracker: ErrorTracker): void {
  globalErrorTracker = tracker;
}
