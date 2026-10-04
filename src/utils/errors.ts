/**
 * Error Handling Utilities
 * 
 * Provides custom error classes with user-friendly messages,
 * recovery suggestions, and structured error information.
 */

import { Logger } from '../observability/logger.js';

const logger = new Logger({ component: 'ErrorHandler' });

/**
 * Base error class with enhanced information
 */
export class BackendAgentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly suggestions?: string[];

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>,
    suggestions?: string[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.suggestions = suggestions;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for user display
   */
  toUserMessage(): string {
    let message = `❌ Error: ${this.message}\n`;
    
    if (this.context && Object.keys(this.context).length > 0) {
      message += `\nDetails:\n`;
      for (const [key, value] of Object.entries(this.context)) {
        message += `  • ${key}: ${value}\n`;
      }
    }

    if (this.suggestions && this.suggestions.length > 0) {
      message += `\n💡 Suggestions:\n`;
      this.suggestions.forEach((suggestion, i) => {
        message += `  ${i + 1}. ${suggestion}\n`;
      });
    }

    return message;
  }

  /**
   * Format error for logging
   */
  toLogFormat(): Record<string, any> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends BackendAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    suggestions?: string[]
  ) {
    super(
      message,
      'CONFIG_ERROR',
      400,
      true,
      context,
      suggestions || [
        'Check your configuration file at ~/.backend-agent/config.json',
        'Run "backend-agent config --show" to see current config',
        'Run "backend-agent config --set" to update configuration',
      ]
    );
  }
}

/**
 * API key errors
 */
export class APIKeyError extends BackendAgentError {
  constructor(message: string = 'Anthropic API key not configured') {
    super(
      message,
      'API_KEY_ERROR',
      401,
      true,
      {},
      [
        'Get your API key from https://console.anthropic.com/',
        'Run "backend-agent config --set anthropic.apiKey YOUR_KEY"',
        'Or set environment variable: ANTHROPIC_API_KEY=YOUR_KEY',
      ]
    );
  }
}

/**
 * File system errors
 */
export class FileSystemError extends BackendAgentError {
  constructor(
    operation: string,
    path: string,
    originalError?: Error
  ) {
    const suggestions = [];
    
    if (operation === 'read') {
      suggestions.push('Check that the file exists and is readable');
      suggestions.push('Verify you have permission to read the file');
    } else if (operation === 'write') {
      suggestions.push('Check that you have write permission');
      suggestions.push('Verify the parent directory exists');
    } else if (operation === 'delete') {
      suggestions.push('Check that the file is not in use');
      suggestions.push('Verify you have delete permission');
    }

    super(
      `Failed to ${operation} file: ${path}`,
      'FILE_SYSTEM_ERROR',
      500,
      true,
      {
        operation,
        path,
        originalError: originalError?.message,
      },
      suggestions
    );
  }
}

/**
 * Analysis errors
 */
export class AnalysisError extends BackendAgentError {
  constructor(
    analyzerName: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `${analyzerName} analysis failed: ${reason}`,
      'ANALYSIS_ERROR',
      500,
      true,
      { analyzer: analyzerName, ...context },
      [
        'Check that you are in a valid project directory',
        'Verify the project files are accessible',
        'Try running with --verbose for more details',
        'Check the logs: backend-agent logs --level error',
      ]
    );
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BackendAgentError {
  constructor(
    field: string,
    value: any,
    validValues?: string[]
  ) {
    const suggestions = validValues
      ? [`Valid options: ${validValues.join(', ')}`]
      : ['Check the command help: backend-agent <command> --help'];

    super(
      `Invalid value for ${field}: '${value}'`,
      'VALIDATION_ERROR',
      400,
      true,
      { field, value, validValues },
      suggestions
    );
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends BackendAgentError {
  constructor(
    operation: string,
    originalError?: Error
  ) {
    super(
      `Network error during ${operation}`,
      'NETWORK_ERROR',
      503,
      true,
      { operation, originalError: originalError?.message },
      [
        'Check your internet connection',
        'Verify the API endpoint is accessible',
        'Try again in a few moments',
        'Check if you are behind a proxy or firewall',
      ]
    );
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends BackendAgentError {
  constructor(
    retryAfter?: number
  ) {
    const suggestions = retryAfter
      ? [`Wait ${retryAfter} seconds and try again`]
      : ['Wait a few minutes and try again'];

    suggestions.push('Check your API usage limits');
    suggestions.push('Consider upgrading your API tier if needed');

    super(
      'API rate limit exceeded',
      'RATE_LIMIT_ERROR',
      429,
      true,
      { retryAfter },
      suggestions
    );
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends BackendAgentError {
  constructor(
    resourceType: string,
    identifier: string
  ) {
    super(
      `${resourceType} not found: ${identifier}`,
      'NOT_FOUND_ERROR',
      404,
      true,
      { resourceType, identifier },
      [
        'Check that the path is correct',
        'Verify the resource exists',
        'Try using absolute paths instead of relative',
      ]
    );
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends BackendAgentError {
  constructor(
    operation: string,
    timeoutMs: number
  ) {
    super(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      'TIMEOUT_ERROR',
      408,
      true,
      { operation, timeoutMs },
      [
        'Try increasing the timeout value',
        'Check if the operation is stuck',
        'Consider breaking the operation into smaller chunks',
      ]
    );
  }
}

/**
 * Dependency errors
 */
export class DependencyError extends BackendAgentError {
  constructor(
    dependency: string,
    reason: string
  ) {
    super(
      `Dependency error: ${dependency} - ${reason}`,
      'DEPENDENCY_ERROR',
      500,
      true,
      { dependency, reason },
      [
        `Install ${dependency}: npm install ${dependency}`,
        'Check that all dependencies are installed: npm install',
        'Verify your package.json is correct',
      ]
    );
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle error and provide user-friendly output
   */
  static handle(error: Error | BackendAgentError): void {
    if (error instanceof BackendAgentError) {
      // Custom error with structured information
      console.error(error.toUserMessage());
      logger.error('Operation failed', error.toLogFormat());
    } else {
      // Unknown error
      console.error(`❌ Error: ${error.message}`);
      logger.error('Unexpected error', {
        error: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Wrap async function with error handling
   */
  static async wrap<T>(
    fn: () => Promise<T>,
    errorTransform?: (error: Error) => BackendAgentError
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const handledError = errorTransform
        ? errorTransform(error as Error)
        : error as Error;
      
      this.handle(handledError);
      process.exit(1);
    }
  }

  /**
   * Check if error is operational (expected) or programmer error
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof BackendAgentError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Exit gracefully with error message
   */
  static exit(message: string, code: number = 1): never {
    console.error(`❌ ${message}`);
    process.exit(code);
  }
}

/**
 * Validation helpers
 */
export class Validator {
  /**
   * Validate that value is one of allowed values
   */
  static validateEnum<T extends string>(
    value: string,
    allowedValues: readonly T[],
    fieldName: string
  ): T {
    if (!allowedValues.includes(value as T)) {
      throw new ValidationError(
        fieldName,
        value,
        allowedValues as string[]
      );
    }
    return value as T;
  }

  /**
   * Validate that path exists
   */
  static async validatePathExists(path: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.access(path);
    } catch {
      throw new NotFoundError('path', path);
    }
  }

  /**
   * Validate that value is a number in range
   */
  static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): number {
    if (value < min || value > max) {
      throw new ValidationError(
        fieldName,
        value,
        [`Must be between ${min} and ${max}`]
      );
    }
    return value;
  }

  /**
   * Validate that value is not empty
   */
  static validateNotEmpty(value: string, fieldName: string): string {
    if (!value || value.trim().length === 0) {
      throw new ValidationError(fieldName, value, ['Must not be empty']);
    }
    return value;
  }

  /**
   * Validate API key format
   */
  static validateAPIKey(key: string): void {
    if (!key.startsWith('sk-ant-')) {
      throw new ValidationError(
        'apiKey',
        key.substring(0, 10) + '...',
        ['Must start with "sk-ant-"']
      );
    }

    if (key.length < 20) {
      throw new ValidationError(
        'apiKey',
        'too short',
        ['API key appears to be invalid (too short)']
      );
    }
  }
}

/**
 * Recovery suggestions based on error patterns
 */
export class RecoverySuggester {
  private static readonly suggestions: Map<RegExp, string[]> = new Map([
    [
      /ENOENT.*package\.json/i,
      [
        'You may not be in a Node.js project directory',
        'Run "npm init" to create a new project',
        'Or navigate to your project directory with "cd"',
      ],
    ],
    [
      /EACCES|EPERM/i,
      [
        'Permission denied - check file/directory permissions',
        'On Windows: Run as administrator if needed',
        'On Unix: Use "chmod" to fix permissions',
      ],
    ],
    [
      /ETIMEDOUT|ECONNREFUSED/i,
      [
        'Network connection failed',
        'Check your internet connection',
        'Verify firewall settings',
        'Try again in a few moments',
      ],
    ],
    [
      /out of memory|heap.*limit/i,
      [
        'Increase Node.js memory limit: node --max-old-space-size=4096',
        'Process fewer files at once',
        'Clear cache: backend-agent config --clear-cache',
      ],
    ],
    [
      /ENOSPC/i,
      [
        'Disk space full',
        'Free up disk space',
        'Check available space: df -h (Unix) or dir (Windows)',
      ],
    ],
  ]);

  /**
   * Get recovery suggestions for an error
   */
  static getSuggestions(error: Error): string[] {
    const message = error.message;
    
    for (const [pattern, suggestions] of this.suggestions.entries()) {
      if (pattern.test(message)) {
        return suggestions;
      }
    }

    // Default suggestions
    return [
      'Check the error message above for details',
      'Run with --verbose for more information',
      'Check logs: backend-agent logs --level error',
      'See troubleshooting guide: TROUBLESHOOTING.md',
    ];
  }

  /**
   * Enhance error with recovery suggestions
   */
  static enhance(error: Error): BackendAgentError {
    if (error instanceof BackendAgentError) {
      return error;
    }

    const suggestions = this.getSuggestions(error);
    
    return new BackendAgentError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      false,
      { originalError: error.name },
      suggestions
    );
  }
}

/**
 * Format errors for different output contexts
 */
export class ErrorFormatter {
  /**
   * Format for console output
   */
  static forConsole(error: BackendAgentError): string {
    return error.toUserMessage();
  }

  /**
   * Format for JSON output
   */
  static forJSON(error: BackendAgentError): Record<string, any> {
    return {
      error: true,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      suggestions: error.suggestions,
    };
  }

  /**
   * Format for logging
   */
  static forLog(error: BackendAgentError): Record<string, any> {
    return error.toLogFormat();
  }

  /**
   * Format stack trace for debugging
   */
  static stackTrace(error: Error): string {
    return error.stack || 'No stack trace available';
  }
}

/**
 * Assertion helpers
 */
export class Assert {
  static isTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new BackendAgentError(message, 'ASSERTION_ERROR', 500, false);
    }
  }

  static isDefined<T>(value: T | undefined | null, name: string): asserts value is T {
    if (value === undefined || value === null) {
      throw new BackendAgentError(
        `${name} is required but was not provided`,
        'ASSERTION_ERROR',
        400,
        true,
        { field: name }
      );
    }
  }

  static isType(value: any, type: string, name: string): void {
    if (typeof value !== type) {
      throw new ValidationError(
        name,
        typeof value,
        [type]
      );
    }
  }
}
