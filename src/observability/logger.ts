/**
 * Structured Logger
 * 
 * Provides structured logging with multiple formats (JSON/pretty), transports (console/file),
 * log levels, sensitive data redaction, and context injection.
 */

import { writeFile, appendFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import chalk from 'chalk';
import {
  LogEntry,
  LogLevel,
  LoggerConfig,
  ErrorDetails,
  PerformanceData
} from '../types/observability.js';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  format: 'pretty',
  destination: 'console',
  filePath: './logs/backend-agent.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 7,
  redactFields: ['apiKey', 'password', 'token', 'secret', 'authorization'],
  includeStackTrace: true
};

/**
 * Log level priorities (higher = more important)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Structured Logger
 */
export class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set persistent context that will be included in all log entries
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context key
   */
  clearContext(key: string): void {
    delete this.context[key];
  }

  /**
   * Clear all context
   */
  clearAllContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    const errorDetails = error ? this.extractErrorDetails(error) : undefined;
    this.log('error', message, context, errorDetails);
  }

  /**
   * Log with performance data
   */
  perf(message: string, perfData: PerformanceData, context?: Record<string, any>): void {
    this.log('info', message, context, undefined, perfData);
  }

  /**
   * Main logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: ErrorDetails,
    performance?: PerformanceData
  ): void {
    // Check if this log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.mergeContext(context),
      error,
      performance,
      ...this.extractContextFields()
    };

    // Redact sensitive data
    const redacted = this.redactSensitiveData(entry);

    // Output based on configuration
    if (this.config.destination === 'console' || this.config.destination === 'both') {
      this.outputToConsole(redacted);
    }

    if (this.config.destination === 'file' || this.config.destination === 'both') {
      this.outputToFile(redacted).catch(err => {
        console.error('Failed to write log to file:', err);
      });
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Merge provided context with persistent context
   */
  private mergeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context && Object.keys(this.context).length === 0) {
      return undefined;
    }
    return { ...this.context, ...context };
  }

  /**
   * Extract special context fields (agentId, taskId, etc.)
   */
  private extractContextFields(): Partial<LogEntry> {
    const fields: Partial<LogEntry> = {};
    
    if (this.context.agentId) fields.agentId = this.context.agentId;
    if (this.context.taskId) fields.taskId = this.context.taskId;
    if (this.context.requestId) fields.requestId = this.context.requestId;
    if (this.context.userId) fields.userId = this.context.userId;
    
    return fields;
  }

  /**
   * Extract error details from Error object
   */
  private extractErrorDetails(error: Error): ErrorDetails {
    return {
      type: 'system',
      code: (error as any).code || 'UNKNOWN',
      message: error.message,
      stack: this.config.includeStackTrace ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      recoverable: false,
      retryable: false
    };
  }

  /**
   * Redact sensitive data from log entry
   */
  private redactSensitiveData(entry: LogEntry): LogEntry {
    if (!this.config.redactFields || this.config.redactFields.length === 0) {
      return entry;
    }

    const redacted = JSON.parse(JSON.stringify(entry));

    const redactObject = (obj: any): void => {
      if (!obj || typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Check if this key should be redacted
        if (this.config.redactFields!.some(field => lowerKey.includes(field.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redactObject(obj[key]);
        }
      }
    };

    if (redacted.context) redactObject(redacted.context);
    if (redacted.error?.context) redactObject(redacted.error.context);

    return redacted;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    if (this.config.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      this.outputPretty(entry);
    }
  }

  /**
   * Output pretty formatted log to console
   */
  private outputPretty(entry: LogEntry): void {
    const timestamp = chalk.dim(entry.timestamp);
    const level = this.colorizeLevel(entry.level);
    const message = entry.level === 'error' ? chalk.red(entry.message) : entry.message;

    let output = `${timestamp} ${level} ${message}`;

    // Add context fields
    if (entry.taskId) {
      output += chalk.dim(` [task:${entry.taskId}]`);
    }
    if (entry.agentId) {
      output += chalk.dim(` [agent:${entry.agentId}]`);
    }

    console.log(output);

    // Add context data
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(chalk.dim('  Context:'), this.formatObject(entry.context, 2));
    }

    // Add performance data
    if (entry.performance) {
      const perf = entry.performance;
      console.log(chalk.dim('  Performance:'), 
        chalk.cyan(`${perf.duration}ms`),
        perf.memoryUsed ? chalk.dim(`(${this.formatBytes(perf.memoryUsed)})`) : '',
        perf.tokensUsed ? chalk.dim(`[${perf.tokensUsed} tokens]`) : ''
      );
    }

    // Add error details
    if (entry.error) {
      console.log(chalk.red('  Error:'), entry.error.message);
      if (entry.error.code) {
        console.log(chalk.dim('  Code:'), entry.error.code);
      }
      if (entry.error.stack && this.config.includeStackTrace) {
        console.log(chalk.dim('  Stack:'));
        console.log(chalk.dim(entry.error.stack.split('\n').map(line => '    ' + line).join('\n')));
      }
    }
  }

  /**
   * Colorize log level
   */
  private colorizeLevel(level: LogLevel): string {
    switch (level) {
      case 'debug': return chalk.gray('[DEBUG]');
      case 'info': return chalk.blue('[INFO] ');
      case 'warn': return chalk.yellow('[WARN] ');
      case 'error': return chalk.red('[ERROR]');
    }
  }

  /**
   * Format object for pretty printing
   */
  private formatObject(obj: any, indent: number = 0): string {
    const spaces = ' '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    return entries
      .map(([key, value]) => {
        const formattedValue = typeof value === 'object' 
          ? JSON.stringify(value, null, 2).split('\n').map((line, i) => i === 0 ? line : spaces + '  ' + line).join('\n')
          : String(value);
        return `${spaces}${chalk.cyan(key)}: ${formattedValue}`;
      })
      .join('\n');
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
   * Output log entry to file
   */
  private async outputToFile(entry: LogEntry): Promise<void> {
    if (!this.config.filePath) return;

    const logDir = dirname(this.config.filePath);
    
    // Ensure log directory exists
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }

    // Check file size and rotate if needed
    await this.rotateLogFileIfNeeded();

    // Format entry as JSON line
    const line = JSON.stringify(entry) + '\n';

    // Append to file
    await appendFile(this.config.filePath, line, 'utf-8');
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateLogFileIfNeeded(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFileSize) return;

    try {
      const stats = await stat(this.config.filePath);
      
      if (stats.size >= this.config.maxFileSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
    }
  }

  /**
   * Rotate log file
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) return;

    const logDir = dirname(this.config.filePath);
    const baseName = this.config.filePath.split('/').pop()!.replace('.log', '');

    // Rotate existing files
    for (let i = this.config.maxFiles - 1; i > 0; i--) {
      const oldFile = join(logDir, `${baseName}.${i}.log`);
      const newFile = join(logDir, `${baseName}.${i + 1}.log`);
      
      if (existsSync(oldFile)) {
        if (i === this.config.maxFiles - 1) {
          // Delete oldest file
          await import('fs/promises').then(fs => fs.unlink(oldFile));
        } else {
          // Rename to next number
          await import('fs/promises').then(fs => fs.rename(oldFile, newFile));
        }
      }
    }

    // Rotate current file to .1
    const firstRotated = join(logDir, `${baseName}.1.log`);
    if (this.config.filePath && existsSync(this.config.filePath)) {
      await import('fs/promises').then(fs => fs.rename(this.config.filePath!, firstRotated));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * Set global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}
