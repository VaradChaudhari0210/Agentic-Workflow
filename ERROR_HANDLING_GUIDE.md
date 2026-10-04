# Error Handling Guide

**Comprehensive guide** to error handling in Backend Engineer Agent.

---

## Overview

The Backend Engineer Agent uses a structured error handling system that provides:
- **Clear error messages** - User-friendly descriptions
- **Recovery suggestions** - Actionable steps to fix issues
- **Context information** - Relevant details about what went wrong
- **Proper error codes** - Standard HTTP status codes for error types

---

## Error Types

### ConfigurationError

**When it occurs**: Configuration file issues

**Example**:
```
❌ Error: Invalid configuration format

Details:
  • file: ~/.backend-agent/config.json
  • issue: JSON parse error

💡 Suggestions:
  1. Check your configuration file at ~/.backend-agent/config.json
  2. Run "backend-agent config --show" to see current config
  3. Run "backend-agent config --set" to update configuration
```

**How to fix**:
```bash
# Reset configuration
rm ~/.backend-agent/config.json
backend-agent config --set
```

---

### APIKeyError

**When it occurs**: Missing or invalid Anthropic API key

**Example**:
```
❌ Error: Anthropic API key not configured

💡 Suggestions:
  1. Get your API key from https://console.anthropic.com/
  2. Run "backend-agent config --set anthropic.apiKey YOUR_KEY"
  3. Or set environment variable: ANTHROPIC_API_KEY=YOUR_KEY
```

**How to fix**:
```bash
# Option 1: Save to config
backend-agent config --set anthropic.apiKey sk-ant-...

# Option 2: Use environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Option 3: Pass inline
ANTHROPIC_API_KEY=sk-ant-... backend-agent analyze security
```

---

### FileSystemError

**When it occurs**: File read/write/delete failures

**Example**:
```
❌ Error: Failed to read file: src/config.ts

Details:
  • operation: read
  • path: src/config.ts
  • originalError: ENOENT: no such file or directory

💡 Suggestions:
  1. Check that the file exists and is readable
  2. Verify you have permission to read the file
```

**Common causes**:
- File doesn't exist
- No read/write permissions
- File is locked by another process
- Path contains invalid characters

---

### AnalysisError

**When it occurs**: Analysis operation fails

**Example**:
```
❌ Error: SecuritySpecialist analysis failed: No files found

Details:
  • analyzer: SecuritySpecialist
  • path: /invalid/path

💡 Suggestions:
  1. Check that you are in a valid project directory
  2. Verify the project files are accessible
  3. Try running with --verbose for more details
  4. Check the logs: backend-agent logs --level error
```

**How to fix**:
```bash
# Navigate to correct directory
cd /path/to/your/project

# Or specify path explicitly
backend-agent analyze security --repo /path/to/your/project
```

---

### ValidationError

**When it occurs**: Invalid command-line arguments

**Example**:
```
❌ Error: Invalid value for severity: 'super-high'

Details:
  • field: severity
  • value: super-high
  • validValues: ['low', 'medium', 'high', 'critical']

💡 Suggestions:
  1. Valid options: low, medium, high, critical
```

**How to fix**:
```bash
# Use valid severity level
backend-agent analyze security --min-severity high

# Check help for valid options
backend-agent analyze security --help
```

---

### NetworkError

**When it occurs**: Network/API connection failures

**Example**:
```
❌ Error: Network error during API request

Details:
  • operation: fetch analysis results
  • originalError: connect ETIMEDOUT

💡 Suggestions:
  1. Check your internet connection
  2. Verify the API endpoint is accessible
  3. Try again in a few moments
  4. Check if you are behind a proxy or firewall
```

**How to fix**:
- Check internet connection
- Verify firewall settings
- Check proxy configuration
- Wait and retry

---

### RateLimitError

**When it occurs**: API rate limit exceeded

**Example**:
```
❌ Error: API rate limit exceeded

Details:
  • retryAfter: 60

💡 Suggestions:
  1. Wait 60 seconds and try again
  2. Check your API usage limits
  3. Consider upgrading your API tier if needed
```

**How to fix**:
```bash
# Wait and retry
sleep 60
backend-agent analyze security

# Or reduce request frequency
backend-agent analyze security --min-severity high  # Fewer checks
```

---

### NotFoundError

**When it occurs**: Resource not found

**Example**:
```
❌ Error: path not found: /path/to/file.ts

Details:
  • resourceType: path
  • identifier: /path/to/file.ts

💡 Suggestions:
  1. Check that the path is correct
  2. Verify the resource exists
  3. Try using absolute paths instead of relative
```

---

### TimeoutError

**When it occurs**: Operation takes too long

**Example**:
```
❌ Error: Operation timed out after 30000ms: file analysis

Details:
  • operation: file analysis
  • timeoutMs: 30000

💡 Suggestions:
  1. Try increasing the timeout value
  2. Check if the operation is stuck
  3. Consider breaking the operation into smaller chunks
```

**How to fix**:
```bash
# Analyze smaller directory
backend-agent analyze security --repo ./src

# Or exclude large directories
# (add to .gitignore)
```

---

### DependencyError

**When it occurs**: Required dependency missing

**Example**:
```
❌ Error: Dependency error: glob - Module not found

Details:
  • dependency: glob
  • reason: Module not found

💡 Suggestions:
  1. Install glob: npm install glob
  2. Check that all dependencies are installed: npm install
  3. Verify your package.json is correct
```

**How to fix**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Error Recovery Patterns

### Pattern Recognition

The system automatically recognizes error patterns and provides specific suggestions:

#### ENOENT (File Not Found)
```
💡 Suggestions:
  1. You may not be in a Node.js project directory
  2. Run "npm init" to create a new project
  3. Or navigate to your project directory with "cd"
```

#### EACCES/EPERM (Permission Denied)
```
💡 Suggestions:
  1. Permission denied - check file/directory permissions
  2. On Windows: Run as administrator if needed
  3. On Unix: Use "chmod" to fix permissions
```

#### ETIMEDOUT/ECONNREFUSED (Network Error)
```
💡 Suggestions:
  1. Network connection failed
  2. Check your internet connection
  3. Verify firewall settings
  4. Try again in a few moments
```

#### Out of Memory
```
💡 Suggestions:
  1. Increase Node.js memory limit: node --max-old-space-size=4096
  2. Process fewer files at once
  3. Clear cache: backend-agent config --clear-cache
```

#### ENOSPC (Disk Full)
```
💡 Suggestions:
  1. Disk space full
  2. Free up disk space
  3. Check available space: df -h (Unix) or dir (Windows)
```

---

## Using Error Handling in Code

### Throwing Custom Errors

```typescript
import { ValidationError, AnalysisError } from './utils/errors.js';

// Validation error
if (!validInput) {
  throw new ValidationError('inputField', value, ['valid1', 'valid2']);
}

// Analysis error
if (analysisFailed) {
  throw new AnalysisError(
    'SecurityAnalyzer',
    'No files to analyze',
    { path: options.path }
  );
}
```

---

### Handling Errors

```typescript
import { ErrorHandler, BackendAgentError } from './utils/errors.js';

try {
  await performOperation();
} catch (error) {
  ErrorHandler.handle(error as Error);
  process.exit(1);
}
```

---

### Wrapping Async Functions

```typescript
import { ErrorHandler, NetworkError } from './utils/errors.js';

await ErrorHandler.wrap(
  async () => {
    return await fetchData();
  },
  (error) => new NetworkError('data fetch', error)
);
```

---

### Validation Helpers

```typescript
import { Validator } from './utils/errors.js';

// Validate enum
const severity = Validator.validateEnum(
  input,
  ['low', 'medium', 'high'],
  'severity'
);

// Validate path exists
await Validator.validatePathExists('/path/to/file');

// Validate number range
const port = Validator.validateNumberRange(value, 1, 65535, 'port');

// Validate not empty
const name = Validator.validateNotEmpty(input, 'name');

// Validate API key format
Validator.validateAPIKey(apiKey);
```

---

### Assertions

```typescript
import { Assert } from './utils/errors.js';

// Assert condition is true
Assert.isTrue(value > 0, 'Value must be positive');

// Assert value is defined
Assert.isDefined(config, 'config');

// Assert type
Assert.isType(value, 'string', 'name');
```

---

## Error Output Formats

### Console Output (Default)

```
❌ Error: Invalid severity level

Details:
  • field: severity
  • value: super-high

💡 Suggestions:
  1. Valid options: low, medium, high, critical
```

### JSON Output

```json
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Invalid value for severity: 'super-high'",
  "statusCode": 400,
  "context": {
    "field": "severity",
    "value": "super-high",
    "validValues": ["low", "medium", "high", "critical"]
  },
  "suggestions": [
    "Valid options: low, medium, high, critical"
  ]
}
```

### Log Output

```json
{
  "error": "ValidationError",
  "message": "Invalid value for severity: 'super-high'",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "isOperational": true,
  "context": {
    "field": "severity",
    "value": "super-high",
    "validValues": ["low", "medium", "high", "critical"]
  },
  "stack": "ValidationError: Invalid value for severity...\n    at ..."
}
```

---

## Best Practices

### 1. Use Specific Error Types

**Bad**:
```typescript
throw new Error('Something went wrong');
```

**Good**:
```typescript
throw new AnalysisError('SecurityAnalyzer', 'No files found', {
  path: options.path
});
```

---

### 2. Provide Context

**Bad**:
```typescript
throw new Error('Failed to read file');
```

**Good**:
```typescript
throw new FileSystemError('read', filePath, originalError);
```

---

### 3. Include Recovery Suggestions

**Bad**:
```typescript
throw new Error('Invalid API key');
```

**Good**:
```typescript
throw new APIKeyError('Invalid API key format');
// Automatically includes recovery suggestions
```

---

### 4. Validate Early

```typescript
// Validate at entry point
function analyzeCode(options: Options) {
  Validator.validateNotEmpty(options.path, 'path');
  Validator.validateEnum(options.severity, VALID_SEVERITIES, 'severity');
  
  // Then proceed with logic
}
```

---

### 5. Log for Debugging

```typescript
import { Logger } from './observability/logger.js';

try {
  await operation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: additionalContext
  });
  throw error;
}
```

---

## Error Code Reference

| Code | Status | Meaning | Operational |
|------|--------|---------|-------------|
| `CONFIG_ERROR` | 400 | Configuration issue | ✅ |
| `API_KEY_ERROR` | 401 | API key missing/invalid | ✅ |
| `FILE_SYSTEM_ERROR` | 500 | File operation failed | ✅ |
| `ANALYSIS_ERROR` | 500 | Analysis failed | ✅ |
| `VALIDATION_ERROR` | 400 | Invalid input | ✅ |
| `NETWORK_ERROR` | 503 | Network/API failure | ✅ |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded | ✅ |
| `NOT_FOUND_ERROR` | 404 | Resource not found | ✅ |
| `TIMEOUT_ERROR` | 408 | Operation timeout | ✅ |
| `DEPENDENCY_ERROR` | 500 | Missing dependency | ✅ |
| `UNKNOWN_ERROR` | 500 | Unexpected error | ❌ |
| `ASSERTION_ERROR` | 500 | Assertion failed | ❌ |

**Operational**: Expected errors that can be recovered from  
**Non-operational**: Programming errors that indicate bugs

---

## Debugging Errors

### Enable Verbose Logging

```bash
export LOG_LEVEL=debug
backend-agent analyze security
```

### Check Error Logs

```bash
backend-agent logs --level error --lines 100
```

### Get Stack Traces

```bash
# Stack traces are automatically logged
backend-agent logs --level error | grep -A 20 "stack"
```

### Test Error Handling

```bash
# Invalid input (should show ValidationError)
backend-agent analyze security --min-severity invalid

# Missing API key (should show APIKeyError)
unset ANTHROPIC_API_KEY
backend-agent analyze security

# Invalid path (should show NotFoundError)
backend-agent analyze security --repo /nonexistent/path
```

---

## Contributing

When adding new error types:

1. **Extend BackendAgentError**
2. **Provide clear messages**
3. **Include recovery suggestions**
4. **Add context information**
5. **Document the error type**

**Example**:
```typescript
export class MyCustomError extends BackendAgentError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'MY_CUSTOM_ERROR',
      500,  // HTTP status code
      true, // Is operational
      context,
      [
        'Suggestion 1',
        'Suggestion 2',
        'Suggestion 3'
      ]
    );
  }
}
```

---

## See Also

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common problems and solutions
- [FAQ.md](./FAQ.md) - Frequently asked questions
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command reference

---

**Last Updated**: October 4, 2026  
**Version**: 1.0.0
