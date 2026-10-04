/**
 * Agent Observability Wrapper
 * 
 * Wraps agent operations with comprehensive observability:
 * - Logging of all agent actions
 * - Performance monitoring of operations
 * - Error tracking with retry logic
 * - Health checks for agent components
 * - Metrics collection for analysis
 */

import { Logger } from './logger.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { ErrorTracker } from './error-tracker.js';
import { HealthChecker } from './health-checker.js';
import { MetricsCollector } from './metrics-collector.js';
import { loadObservabilityConfig } from '../config/observability.js';
import { TaskExecution, ErrorDetails } from '../types/observability.js';

/**
 * Observability stack for agents
 */
export interface ObservabilityStack {
  logger: Logger;
  performance: PerformanceMonitor;
  errorTracker: ErrorTracker;
  healthChecker: HealthChecker;
  metrics: MetricsCollector;
}

/**
 * Create and initialize observability stack
 */
export async function createObservabilityStack(): Promise<ObservabilityStack> {
  const config = loadObservabilityConfig();

  const logger = new Logger(config.logger);
  const performance = new PerformanceMonitor(config.performance, logger);
  const errorTracker = new ErrorTracker(config.errorTracker, logger);
  const healthChecker = new HealthChecker(config.healthChecker, logger);
  const metrics = new MetricsCollector(
    config.metricsCollector,
    logger,
    performance,
    errorTracker,
    healthChecker
  );

  // Register health checks
  healthChecker.registerComponent('logger', async () => ({
    name: 'logger',
    status: 'up' as const,
    message: 'Logger operational',
    lastCheck: new Date().toISOString()
  }));

  healthChecker.registerComponent('performance', async () => ({
    name: 'performance',
    status: 'up' as const,
    message: 'Performance monitor operational',
    lastCheck: new Date().toISOString()
  }));

  logger.info('Observability stack initialized', {
    context: 'observability',
    components: ['logger', 'performance', 'errorTracker', 'healthChecker', 'metrics']
  });

  return {
    logger,
    performance,
    errorTracker,
    healthChecker,
    metrics
  };
}

/**
 * Wrap a task execution with observability
 */
export async function withObservability<T>(
  obs: ObservabilityStack,
  taskId: string,
  taskDescription: string,
  operation: () => Promise<T>
): Promise<T> {
  const { logger, performance, errorTracker, metrics: metricsCollector } = obs;

  // Start performance tracking
  const timer = performance.startTimer('task_execution');

  // Record task start
  const taskExecution: TaskExecution = {
    taskId,
    requirement: taskDescription,
    startTime: new Date().toISOString()
  };

  logger.info('Task execution started', {
    context: 'task',
    taskId,
    description: taskDescription
  });

  try {
    // Execute the operation
    const result = await operation();

    // Record success
    const perfMetrics = performance.stopTimer(timer, { success: true });
    taskExecution.endTime = new Date().toISOString();
    taskExecution.duration = perfMetrics.duration;
    taskExecution.success = true;

    metricsCollector.recordTaskExecution(taskExecution);

    logger.info('Task execution completed', {
      context: 'task',
      taskId,
      duration: `${perfMetrics.duration}ms`,
      success: true
    });

    return result;

  } catch (error) {
    // Record failure
    const perfMetrics = performance.stopTimer(timer, { success: false });
    taskExecution.endTime = new Date().toISOString();
    taskExecution.duration = perfMetrics.duration;
    taskExecution.success = false;

    const errorDetails: ErrorDetails = {
      type: 'system',
      message: error instanceof Error ? error.message : String(error),
      code: 'TASK_EXECUTION_ERROR',
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
      recoverable: false,
      retryable: false,
      context: {
        taskId,
        description: taskDescription
      }
    };

    taskExecution.error = errorDetails;
    metricsCollector.recordTaskExecution(taskExecution);

    // Capture error
    errorTracker.captureError(
      error instanceof Error ? error : new Error(String(error)),
      { taskId, description: taskDescription }
    );

    logger.error('Task execution failed', {
      context: 'task',
      taskId,
      duration: `${perfMetrics.duration}ms`,
      error: errorDetails
    });

    throw error;
  }
}

/**
 * Wrap an agent operation with performance tracking
 */
export async function trackOperation<T>(
  obs: ObservabilityStack,
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const { performance, logger } = obs;

  const timer = performance.startTimer(operationName);

  logger.debug(`Operation started: ${operationName}`, {
    context: 'operation',
    operation: operationName,
    ...metadata
  });

  try {
    const result = await operation();
    const metrics = performance.stopTimer(timer, { success: true, metadata });

    logger.debug(`Operation completed: ${operationName}`, {
      context: 'operation',
      operation: operationName,
      duration: `${metrics.duration}ms`,
      success: true,
      ...metadata
    });

    return result;

  } catch (error) {
    const metrics = performance.stopTimer(timer, { success: false, metadata });

    logger.error(`Operation failed: ${operationName}`, {
      context: 'operation',
      operation: operationName,
      duration: `${metrics.duration}ms`,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : { message: String(error) },
      ...metadata
    });

    throw error;
  }
}

/**
 * Wrap an agent operation with retry logic
 */
export async function withRetry<T>(
  obs: ObservabilityStack,
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const { errorTracker, logger } = obs;

  logger.debug(`Starting retryable operation: ${operationName}`, {
    context: 'retry',
    operation: operationName
  });

  try {
    const result = await errorTracker.executeWithRetry(operationName, operation);
    
    logger.debug(`Retryable operation succeeded: ${operationName}`, {
      context: 'retry',
      operation: operationName
    });

    return result;

  } catch (error) {
    logger.error(`Retryable operation failed: ${operationName}`, {
      context: 'retry',
      operation: operationName,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : { message: String(error) }
    });

    throw error;
  }
}

/**
 * Log agent decision/action
 */
export function logAgentAction(
  obs: ObservabilityStack,
  agent: string,
  action: string,
  details?: Record<string, any>
): void {
  obs.logger.info(`[${agent}] ${action}`, {
    context: 'agent_action',
    agent,
    action,
    ...details
  });
}

/**
 * Log agent reasoning
 */
export function logAgentReasoning(
  obs: ObservabilityStack,
  agent: string,
  reasoning: string,
  details?: Record<string, any>
): void {
  obs.logger.debug(`[${agent}] ${reasoning}`, {
    context: 'agent_reasoning',
    agent,
    reasoning,
    ...details
  });
}

/**
 * Log LLM API call
 */
export async function trackApiCall<T>(
  obs: ObservabilityStack,
  model: string,
  operation: () => Promise<T>,
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }
): Promise<T> {
  const { performance, logger } = obs;

  const timer = performance.startTimer('llm_api_call');

  logger.debug('LLM API call started', {
    context: 'llm_api',
    model,
    ...metadata
  });

  try {
    const result = await operation();
    const metrics = performance.stopTimer(timer, {
      success: true,
      metadata: { ...metadata, tokens: metadata?.totalTokens }
    });

    logger.info('LLM API call completed', {
      context: 'llm_api',
      model,
      duration: `${metrics.duration}ms`,
      tokens: metadata?.totalTokens,
      success: true
    });

    return result;

  } catch (error) {
    const metrics = performance.stopTimer(timer, { success: false });

    logger.error('LLM API call failed', {
      context: 'llm_api',
      model,
      duration: `${metrics.duration}ms`,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : { message: String(error) }
    });

    throw error;
  }
}

/**
 * Create child logger for specific agent
 */
export function createAgentLogger(
  obs: ObservabilityStack,
  agentName: string,
  taskId?: string
): Logger {
  return obs.logger.child({
    agent: agentName,
    taskId
  });
}

/**
 * Shutdown observability stack gracefully
 */
export async function shutdownObservability(obs: ObservabilityStack): Promise<void> {
  obs.logger.info('Shutting down observability stack', {
    context: 'observability'
  });

  // Stop all background timers and intervals
  obs.healthChecker.stop();
  obs.performance.stop();
  obs.metrics.stopAggregation();

  obs.logger.info('Observability stack shutdown complete', {
    context: 'observability'
  });
}
