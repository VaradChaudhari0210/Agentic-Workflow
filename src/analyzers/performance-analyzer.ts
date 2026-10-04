/**
 * Performance Analyzer
 * 
 * Detects performance bottlenecks including N+1 queries, missing pagination,
 * memory leaks, inefficient algorithms, and resource management issues.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import {
  PerformanceIssue,
  PerformanceReport,
  PerformancePattern,
  PerformanceAnalysisOptions,
  PerformanceSeverity,
  PerformanceIssueType,
  PerformanceSummary,
  PerformanceRecommendation,
  PerformanceIssueContext,
  PerformanceImpact
} from '../types/performance.js';
import { fileCache, analysisCache, AnalysisCache } from '../utils/cache.js';
import { parallelMap } from '../utils/parallel.js';

/**
 * Performance patterns for detecting common bottlenecks
 */
const PERFORMANCE_PATTERNS: PerformancePattern[] = [
  // Database Performance - N+1 Query Problems
  {
    id: 'n-plus-one-loop-query',
    type: 'database',
    severity: 'critical',
    impact: 'high',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*\.(find|findOne|findById|query|get)\(/gi,
    description: 'Potential N+1 query problem: Database query inside loop',
    message: 'N+1 Query Problem: Database call inside loop causes multiple queries',
    suggestion: 'Use eager loading, JOIN queries, or batch fetching to load all data in one query',
    estimatedImprovement: '90% query reduction',
    fileExtensions: ['.ts', '.js']
  },
  {
    id: 'n-plus-one-foreach',
    type: 'database',
    severity: 'critical',
    impact: 'high',
    pattern: /\.forEach\([^)]*\)[^}]*\.(find|findOne|findById|query|get)\(/gi,
    description: 'N+1 query in forEach loop',
    message: 'N+1 Query Problem: Database call inside forEach',
    suggestion: 'Refactor to use Promise.all() with batched queries or use eager loading',
    estimatedImprovement: '90% query reduction'
  },
  {
    id: 'n-plus-one-map',
    type: 'database',
    severity: 'critical',
    impact: 'high',
    pattern: /\.map\([^)]*\)[^}]*await\s+\w+\.(find|findOne|findById|query)/gi,
    description: 'N+1 query in map function',
    message: 'N+1 Query Problem: Async database call inside map',
    suggestion: 'Use Promise.all() with map or fetch all related data beforehand',
    estimatedImprovement: '90% query reduction'
  },
  
  // Missing Indexes
  {
    id: 'query-without-index',
    type: 'database',
    severity: 'high',
    impact: 'high',
    pattern: /\.find\(\{[^}]*\$regex|\.find\(\{[^}]*\$gt|\.find\(\{[^}]*\$lt/gi,
    description: 'Complex query that may need indexing',
    message: 'Complex query operation: Consider adding database index',
    suggestion: 'Add appropriate indexes for regex, range, or sorting queries',
    estimatedImprovement: '95% faster queries'
  },
  
  // Missing Pagination
  {
    id: 'missing-pagination-find-all',
    type: 'database',
    severity: 'high',
    impact: 'high',
    pattern: /\.find\(\s*\)\s*(?!\.limit|\.skip|\.take)/gi,
    description: 'Query fetches all records without pagination',
    message: 'Missing Pagination: Fetching all records can exhaust memory',
    suggestion: 'Add .limit() and .skip() or implement cursor-based pagination',
    estimatedImprovement: '80% memory reduction'
  },
  {
    id: 'select-star',
    type: 'database',
    severity: 'medium',
    impact: 'medium',
    pattern: /SELECT\s+\*\s+FROM/gi,
    description: 'SELECT * fetches unnecessary columns',
    message: 'Inefficient Query: SELECT * fetches all columns',
    suggestion: 'Select only needed columns: SELECT id, name, email FROM users',
    estimatedImprovement: '30-50% data transfer reduction'
  },
  
  // API Performance
  {
    id: 'missing-cache',
    type: 'caching',
    severity: 'medium',
    impact: 'medium',
    pattern: /router\.get\([^)]*\)[^}]*\.(find|query|get)\([^)]*\)\s*(?!.*cache|.*redis|.*memcached)/gi,
    description: 'GET endpoint without caching',
    message: 'Missing Cache: Consider caching frequently accessed data',
    suggestion: 'Implement caching layer (Redis, in-memory cache) for read-heavy endpoints',
    estimatedImprovement: '90% faster response'
  },
  {
    id: 'sync-in-async',
    type: 'async',
    severity: 'high',
    impact: 'high',
    pattern: /async\s+function[^{]*\{[^}]*fs\.readFileSync|async\s+\([^)]*\)[^{]*\{[^}]*fs\.readFileSync/gi,
    description: 'Synchronous operation in async function',
    message: 'Blocking Operation: Synchronous call in async function blocks event loop',
    suggestion: 'Use async version: replace readFileSync with readFile with await',
    estimatedImprovement: '100% non-blocking'
  },
  {
    id: 'missing-timeout',
    type: 'api',
    severity: 'medium',
    impact: 'medium',
    pattern: /axios\.|fetch\(|http\.request\(/gi,
    description: 'HTTP request without timeout',
    message: 'Missing Timeout: External API calls should have timeout',
    suggestion: 'Add timeout to prevent hanging requests: axios.get(url, { timeout: 5000 })',
    estimatedImprovement: 'Better reliability'
  },
  
  // Memory Issues
  {
    id: 'memory-leak-event-listener',
    type: 'memory',
    severity: 'high',
    impact: 'high',
    pattern: /\.on\(['"][^'"]+['"][^)]*\)\s*(?!.*\.off\(|.*\.removeListener\(|.*\.removeAllListeners\()/gi,
    description: 'Event listener without cleanup',
    message: 'Memory Leak: Event listener not removed, causes memory leak',
    suggestion: 'Remove event listeners in cleanup: emitter.off(event, handler) or use once()',
    estimatedImprovement: 'Prevents memory leak'
  },
  {
    id: 'large-array-allocation',
    type: 'memory',
    severity: 'medium',
    impact: 'medium',
    pattern: /new Array\(\s*\d{6,}\s*\)|Array\(\s*\d{6,}\s*\)/gi,
    description: 'Large array allocation',
    message: 'Large Memory Allocation: Creating large array upfront',
    suggestion: 'Consider using streaming, generators, or incremental allocation',
    estimatedImprovement: '90% memory reduction'
  },
  {
    id: 'memory-loop-concat',
    type: 'memory',
    severity: 'medium',
    impact: 'medium',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*\+=\s*[^;]+\;|for\s*\([^)]*\)\s*\{[^}]*\.concat\(/gi,
    description: 'String concatenation in loop',
    message: 'Inefficient Memory Usage: String concatenation in loop',
    suggestion: 'Use array and join: arr.push(str); result = arr.join("")',
    estimatedImprovement: '50% faster, less memory'
  },
  
  // Algorithmic Inefficiency
  {
    id: 'nested-loop-search',
    type: 'algorithm',
    severity: 'high',
    impact: 'high',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{[^}]*===|for\s*\([^)]*\)\s*\{[^}]*\.find\(/gi,
    description: 'Nested loop with linear search (O(n²))',
    message: 'Algorithm Inefficiency: Nested loops cause O(n²) complexity',
    suggestion: 'Use Map or Set for O(1) lookups instead of nested loops',
    estimatedImprovement: '95% faster for large datasets'
  },
  {
    id: 'array-includes-in-loop',
    type: 'algorithm',
    severity: 'medium',
    impact: 'medium',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*\.includes\(|\.forEach\([^)]*\)[^}]*\.includes\(/gi,
    description: 'Array.includes() in loop (O(n²))',
    message: 'Algorithm Inefficiency: includes() in loop causes O(n²)',
    suggestion: 'Convert array to Set first: const set = new Set(arr); use set.has()',
    estimatedImprovement: '90% faster'
  },
  {
    id: 'redundant-filter-map',
    type: 'algorithm',
    severity: 'low',
    impact: 'low',
    pattern: /\.filter\([^)]*\)\.map\(/gi,
    description: 'Separate filter and map operations',
    message: 'Optimization Opportunity: Combine filter and map with reduce',
    suggestion: 'Use reduce to filter and map in single pass',
    estimatedImprovement: '30% faster'
  },
  
  // Resource Management
  {
    id: 'missing-connection-close',
    type: 'resource',
    severity: 'critical',
    impact: 'high',
    pattern: /createConnection\(|connect\(\s*\{[^}]*\}\s*\)\s*(?!.*\.close\(|.*\.end\(|.*\.disconnect\()/gi,
    description: 'Database connection not closed',
    message: 'Resource Leak: Database connection not closed',
    suggestion: 'Always close connections: use try/finally or connection pooling',
    estimatedImprovement: 'Prevents resource exhaustion'
  },
  {
    id: 'missing-stream-cleanup',
    type: 'resource',
    severity: 'high',
    impact: 'high',
    pattern: /createReadStream\(|createWriteStream\(\s*(?!.*\.close\(|.*\.destroy\()/gi,
    description: 'Stream not properly closed',
    message: 'Resource Leak: Stream should be closed after use',
    suggestion: 'Use stream.pipeline() or ensure cleanup with .destroy() in finally',
    estimatedImprovement: 'Prevents file handle leaks'
  },
  {
    id: 'no-connection-pool',
    type: 'resource',
    severity: 'high',
    impact: 'high',
    pattern: /new\s+Client\(\s*\{|createConnection\(\s*\{[^}]*\}\s*\)\s*(?!.*pool|.*poolSize)/gi,
    description: 'Database client without connection pooling',
    message: 'Missing Connection Pool: Creating connections per request is inefficient',
    suggestion: 'Use connection pooling: new Pool({ max: 20 }) instead of creating clients',
    estimatedImprovement: '80% faster connection'
  },
  {
    id: 'missing-stream-backpressure',
    type: 'resource',
    severity: 'medium',
    impact: 'medium',
    pattern: /\.pipe\([^)]*\)(?!.*\.on\(['"]drain['"])/gi,
    description: 'Stream without backpressure handling',
    message: 'Stream Backpressure: Should handle backpressure for large data',
    suggestion: 'Use stream.pipeline() which handles backpressure automatically',
    estimatedImprovement: 'Better memory management'
  },
  
  // Async/Await Issues
  {
    id: 'sequential-awaits',
    type: 'async',
    severity: 'medium',
    impact: 'medium',
    pattern: /await\s+\w+[^;]*;\s*await\s+\w+[^;]*;(?!.*Promise\.all)/gi,
    description: 'Sequential awaits that could be parallel',
    message: 'Async Inefficiency: Independent awaits should run in parallel',
    suggestion: 'Use Promise.all() for independent async operations',
    estimatedImprovement: '50% faster'
  },
  {
    id: 'await-in-loop',
    type: 'async',
    severity: 'medium',
    impact: 'medium',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*await\s+/gi,
    description: 'Await inside loop (sequential execution)',
    message: 'Async Inefficiency: Awaiting in loop runs sequentially',
    suggestion: 'Collect promises and use Promise.all() for parallel execution',
    estimatedImprovement: '80% faster'
  },
  
  // Caching Issues
  {
    id: 'repeated-computation',
    type: 'caching',
    severity: 'low',
    impact: 'medium',
    pattern: /function\s+\w+\([^)]*\)\s*\{[^}]*return\s+[^;]*\.[a-z]+\([^)]*\)\s*\}/gi,
    description: 'Pure function without memoization',
    message: 'Optimization Opportunity: Consider memoization for expensive computations',
    suggestion: 'Use memoization for pure functions with expensive calculations',
    estimatedImprovement: '90% faster for repeated calls'
  }
];

/**
 * PerformanceAnalyzer - Detects performance bottlenecks in code
 */
export class PerformanceAnalyzer {
  private options: PerformanceAnalysisOptions;
  private issues: PerformanceIssue[] = [];
  private filesAnalyzed = 0;

  constructor(options: PerformanceAnalysisOptions) {
    this.options = {
      includeOptimizations: true,
      minSeverity: 'low',
      checkDatabase: true,
      checkAPI: true,
      checkMemory: true,
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/analyzers/**', // Exclude analyzer source files to prevent self-analysis
        '**/security-specialist.ts',
        '**/coverage-tracker.ts',
        '**/performance-analyzer.ts'
      ],
      ...options
    };
  }

  /**
   * Run comprehensive performance analysis
   */
  async analyze(): Promise<PerformanceReport> {
    const startTime = Date.now();
    this.issues = [];
    this.filesAnalyzed = 0;

    // Check cache first
    const cacheKey = AnalysisCache.createKey('performance', {
      path: this.options.path,
      minSeverity: this.options.minSeverity,
      checkDatabase: this.options.checkDatabase,
      checkAPI: this.options.checkAPI,
      checkMemory: this.options.checkMemory,
      excludePatterns: this.options.excludePatterns
    });

    const cached = analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all files to analyze
    const files = await this.getFilesToAnalyze();

    // Analyze files in parallel (5 at a time)
    const fileIssues = await parallelMap(
      files,
      async (file) => {
        const issues = await this.analyzeFile(file);
        return issues;
      },
      5 // concurrency
    );

    // Flatten results
    this.issues = fileIssues.flat();
    this.filesAnalyzed = files.length;

    // Calculate score
    const score = this.calculatePerformanceScore();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Build summary
    const summary = this.buildSummary();

    const durationMs = Date.now() - startTime;

    const report: PerformanceReport = {
      summary,
      issues: this.issues,
      score,
      recommendations,
      generatedAt: new Date().toISOString(),
      filesAnalyzed: this.filesAnalyzed,
      durationMs
    };

    // Cache the result
    analysisCache.set(cacheKey, report);

    return report;
  }

  /**
   * Get list of files to analyze
   */
  private async getFilesToAnalyze(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.js',
      '**/*.tsx',
      '**/*.jsx'
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(join(this.options.path, pattern), {
        ignore: this.options.excludePatterns || [],
        absolute: true
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Analyze a single file for performance issues
   */
  private async analyzeFile(filePath: string): Promise<PerformanceIssue[]> {
    try {
      // Use cached file content
      const content = await fileCache.getFileContent(
        filePath,
        () => readFile(filePath, 'utf-8')
      );
      
      const lines = content.split('\n');
      const issues: PerformanceIssue[] = [];

      // Filter patterns based on options
      const patterns = this.getApplicablePatterns();

      for (const pattern of patterns) {
        // Check if pattern applies to this file type
        if (pattern.fileExtensions && pattern.fileExtensions.length > 0) {
          const fileExt = '.' + filePath.split('.').pop();
          if (!pattern.fileExtensions.includes(fileExt)) {
            continue;
          }
        }

        // Search for pattern in file
        const matches = this.findPatternMatches(content, lines, pattern, filePath);
        
        for (const context of matches) {
          const issue = this.createIssueFromContext(context);
          
          // Check if severity meets minimum threshold
          if (this.meetsMinimumSeverity(issue.severity)) {
            issues.push(issue);
          }
        }
      }
      
      return issues;
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not analyze ${filePath}`);
      return [];
    }
  }

  /**
   * Get patterns applicable to current analysis options
   */
  private getApplicablePatterns(): PerformancePattern[] {
    let patterns = PERFORMANCE_PATTERNS;

    // Filter by issue types if specified
    if (this.options.checkTypes && this.options.checkTypes.length > 0) {
      patterns = patterns.filter(p => this.options.checkTypes!.includes(p.type));
    }

    // Filter by analysis options
    if (!this.options.checkDatabase) {
      patterns = patterns.filter(p => p.type !== 'database');
    }
    if (!this.options.checkAPI) {
      patterns = patterns.filter(p => p.type !== 'api');
    }
    if (!this.options.checkMemory) {
      patterns = patterns.filter(p => p.type !== 'memory');
    }

    return patterns;
  }

  /**
   * Find all matches of a pattern in file content
   */
  private findPatternMatches(
    content: string,
    lines: string[],
    pattern: PerformancePattern,
    filePath: string
  ): PerformanceIssueContext[] {
    const contexts: PerformanceIssueContext[] = [];
    const matches = content.matchAll(pattern.pattern);

    for (const match of matches) {
      // Skip if match.index is undefined (shouldn't happen with matchAll, but be defensive)
      if (match.index === undefined) continue;

      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      // Get context lines
      const contextStart = Math.max(0, lineNumber - 4);
      const contextEnd = Math.min(lines.length, lineNumber + 3);
      const contextLines = lines.slice(contextStart, contextEnd);

      contexts.push({
        pattern,
        file: filePath,
        line: lineNumber,
        match: match[0],
        context: contextLines
      });
    }

    return contexts;
  }

  /**
   * Create a PerformanceIssue from a detected context
   */
  private createIssueFromContext(context: PerformanceIssueContext): PerformanceIssue {
    const { pattern, file, line, match } = context;

    const issue: PerformanceIssue = {
      type: pattern.type,
      severity: pattern.severity,
      impact: pattern.impact,
      title: pattern.message,
      description: pattern.description,
      file: file.replace(this.options.path, '.'),
      line,
      codeSnippet: match.substring(0, 100), // Limit snippet length
      suggestion: pattern.suggestion,
      estimatedImprovement: pattern.estimatedImprovement
    };

    // Add optimization code if enabled
    if (this.options.includeOptimizations) {
      issue.optimizedCode = this.generateOptimization(pattern, match);
    }

    return issue;
  }

  /**
   * Generate optimized code suggestion
   */
  private generateOptimization(pattern: PerformancePattern, match: string): string | undefined {
    switch (pattern.id) {
      case 'n-plus-one-loop-query':
      case 'n-plus-one-foreach':
        return '// Use eager loading:\nconst items = await Model.find().populate("relatedField");\n// or batch fetch:\nconst ids = items.map(i => i.relatedId);\nconst related = await Related.find({ _id: { $in: ids } });';
      
      case 'n-plus-one-map':
        return '// Use Promise.all():\nconst results = await Promise.all(items.map(item => fetchRelated(item.id)));';
      
      case 'missing-pagination-find-all':
        return 'const page = req.query.page || 1;\nconst limit = Math.min(req.query.limit || 20, 100);\nconst items = await Model.find().limit(limit).skip((page - 1) * limit);';
      
      case 'sync-in-async':
        return 'const data = await fs.readFile(path, "utf-8"); // Use async version';
      
      case 'sequential-awaits':
        return 'const [result1, result2] = await Promise.all([fetchData1(), fetchData2()]);';
      
      case 'nested-loop-search':
        return 'const map = new Map(array2.map(item => [item.id, item]));\nfor (const item of array1) {\n  const related = map.get(item.relatedId); // O(1) lookup\n}';
      
      case 'array-includes-in-loop':
        return 'const set = new Set(largeArray);\nfor (const item of items) {\n  if (set.has(item)) { /* O(1) lookup */ }\n}';
      
      case 'no-connection-pool':
        return 'const pool = new Pool({ max: 20, min: 5 });\n// Reuse pool for all requests\nconst client = await pool.connect();\ntry { /* use client */ } finally { client.release(); }';
      
      default:
        return undefined;
    }
  }

  /**
   * Check if severity meets minimum threshold
   */
  private meetsMinimumSeverity(severity: PerformanceSeverity): boolean {
    const severityOrder: PerformanceSeverity[] = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(this.options.minSeverity || 'low');
    const issueIndex = severityOrder.indexOf(severity);
    return issueIndex >= minIndex;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculatePerformanceScore(): number {
    if (this.issues.length === 0) return 100;

    // Weight issues by severity
    const weights = { critical: 20, high: 10, medium: 5, low: 2 };
    let totalDeduction = 0;

    for (const issue of this.issues) {
      totalDeduction += weights[issue.severity];
    }

    const score = Math.max(0, 100 - totalDeduction);
    return Math.round(score);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const issuesByType = this.groupIssuesByType();

    // Critical/High severity recommendations
    const criticalIssues = this.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'database',
        text: `Fix ${criticalIssues.length} critical/high severity performance issues immediately`,
        expectedImpact: 'high',
        effort: 'medium',
        files: [...new Set(criticalIssues.map(i => i.file))]
      });
    }

    // Database-specific recommendations
    if (issuesByType.database && issuesByType.database.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'database',
        text: 'Optimize database queries: use eager loading, add pagination, implement connection pooling',
        expectedImpact: 'high',
        effort: 'medium',
        files: [...new Set(issuesByType.database.map(i => i.file))]
      });
    }

    // Memory recommendations
    if (issuesByType.memory && issuesByType.memory.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'memory',
        text: 'Fix memory leaks: remove event listeners, avoid large allocations, use streaming',
        expectedImpact: 'high',
        effort: 'low',
        files: [...new Set(issuesByType.memory.map(i => i.file))]
      });
    }

    // Algorithm recommendations
    if (issuesByType.algorithm && issuesByType.algorithm.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'algorithm',
        text: 'Improve algorithm efficiency: use Map/Set for lookups, avoid nested loops',
        expectedImpact: 'medium',
        effort: 'medium',
        files: [...new Set(issuesByType.algorithm.map(i => i.file))]
      });
    }

    // Caching recommendations
    if (issuesByType.caching && issuesByType.caching.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'caching',
        text: 'Implement caching for frequently accessed data (Redis, in-memory cache)',
        expectedImpact: 'high',
        effort: 'medium',
        files: [...new Set(issuesByType.caching.map(i => i.file))]
      });
    }

    return recommendations;
  }

  /**
   * Group issues by type
   */
  private groupIssuesByType(): Partial<Record<PerformanceIssueType, PerformanceIssue[]>> {
    const grouped: Partial<Record<PerformanceIssueType, PerformanceIssue[]>> = {};
    
    for (const issue of this.issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type]!.push(issue);
    }

    return grouped;
  }

  /**
   * Build summary statistics
   */
  private buildSummary(): PerformanceSummary {
    const summary: PerformanceSummary = {
      total: this.issues.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      databaseIssues: 0,
      apiIssues: 0,
      memoryIssues: 0,
      algorithmIssues: 0,
      resourceIssues: 0,
      asyncIssues: 0,
      cachingIssues: 0
    };

    for (const issue of this.issues) {
      // By severity
      summary[issue.severity]++;
      
      // By type
      switch (issue.type) {
        case 'database': summary.databaseIssues++; break;
        case 'api': summary.apiIssues++; break;
        case 'memory': summary.memoryIssues++; break;
        case 'algorithm': summary.algorithmIssues++; break;
        case 'resource': summary.resourceIssues++; break;
        case 'async': summary.asyncIssues++; break;
        case 'caching': summary.cachingIssues++; break;
      }
    }

    return summary;
  }

  /**
   * Format report as human-readable text
   */
  formatReport(report: PerformanceReport): string {
    let output = '\n⚡ Performance Analysis\n\n';
    
    // Score
    const scoreEmoji = report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '🚨';
    output += `Overall Score: ${report.score}/100 ${scoreEmoji}\n\n`;

    // Summary
    output += `Issues Found: ${report.summary.total}\n`;
    if (report.summary.critical > 0) output += `  • Critical: ${report.summary.critical}\n`;
    if (report.summary.high > 0) output += `  • High: ${report.summary.high}\n`;
    if (report.summary.medium > 0) output += `  • Medium: ${report.summary.medium}\n`;
    if (report.summary.low > 0) output += `  • Low: ${report.summary.low}\n`;
    output += '\n';

    if (report.issues.length === 0) {
      output += '✅ No performance issues detected!\n\n';
      return output;
    }

    output += '━'.repeat(60) + '\n\n';

    // Group and display issues
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    const highIssues = report.issues.filter(i => i.severity === 'high');
    const mediumIssues = report.issues.filter(i => i.severity === 'medium');

    if (criticalIssues.length > 0) {
      output += '🚨 CRITICAL Issues:\n\n';
      criticalIssues.forEach((issue, idx) => {
        output += this.formatIssue(issue, idx + 1);
      });
    }

    if (highIssues.length > 0) {
      output += '⚠️  HIGH Issues:\n\n';
      highIssues.forEach((issue, idx) => {
        output += this.formatIssue(issue, idx + 1);
      });
    }

    if (mediumIssues.length > 0) {
      output += '⚡ MEDIUM Issues (showing first 5):\n\n';
      mediumIssues.slice(0, 5).forEach((issue, idx) => {
        output += this.formatIssue(issue, idx + 1);
      });
      if (mediumIssues.length > 5) {
        output += `... and ${mediumIssues.length - 5} more medium severity issues\n\n`;
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output += '━'.repeat(60) + '\n\n';
      output += '💡 Recommendations:\n\n';
      report.recommendations.forEach((rec, idx) => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        const impactBadge = rec.expectedImpact === 'high' ? '[HIGH IMPACT]' : '';
        output += `${idx + 1}. ${priorityEmoji} ${rec.text} ${impactBadge}\n`;
        if (rec.effort) output += `   Effort: ${rec.effort}\n`;
      });
      output += '\n';
    }

    output += `Analyzed ${report.filesAnalyzed} files in ${report.durationMs}ms\n`;

    return output;
  }

  /**
   * Format a single issue
   */
  private formatIssue(issue: PerformanceIssue, index: number): string {
    let output = `${index}. ${issue.title}\n`;
    output += `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
    output += `   Impact: ${issue.impact.toUpperCase()}`;
    if (issue.estimatedImprovement) {
      output += ` - ${issue.estimatedImprovement}`;
    }
    output += '\n';
    
    if (issue.codeSnippet) {
      output += `   \n   ${issue.codeSnippet.substring(0, 80)}...\n`;
    }
    
    output += `   \n   Suggestion: ${issue.suggestion}\n`;
    
    if (issue.optimizedCode) {
      output += `   \n   ✓ Optimized version:\n   ${issue.optimizedCode.split('\n').join('\n   ')}\n`;
    }
    
    output += '\n';
    
    return output;
  }
}
