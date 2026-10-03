/**
 * Performance Analysis Types
 * 
 * Defines types for performance issue detection, impact assessment, and optimization recommendations.
 */

/**
 * Types of performance issues that can be detected
 */
export type PerformanceIssueType =
  | 'database'      // Database query performance
  | 'api'           // API/HTTP performance
  | 'memory'        // Memory usage and leaks
  | 'algorithm'     // Algorithmic complexity
  | 'resource'      // Resource management (connections, files)
  | 'async'         // Async/await inefficiencies
  | 'caching';      // Missing or improper caching

/**
 * Severity levels for performance issues
 */
export type PerformanceSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Performance impact level
 */
export type PerformanceImpact = 'high' | 'medium' | 'low';

/**
 * Individual performance issue found in code
 */
export interface PerformanceIssue {
  /** Type of performance issue */
  type: PerformanceIssueType;
  
  /** Severity level */
  severity: PerformanceSeverity;
  
  /** Short title of the issue */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** File where the issue was found */
  file: string;
  
  /** Line number (optional) */
  line?: number;
  
  /** Performance impact level */
  impact: PerformanceImpact;
  
  /** Code snippet showing the issue (optional) */
  codeSnippet?: string;
  
  /** Optimization suggestion */
  suggestion: string;
  
  /** Optimized version of the code (optional) */
  optimizedCode?: string;
  
  /** Estimated improvement (e.g., "80% faster", "50% less memory") */
  estimatedImprovement?: string;
  
  /** Additional context or notes */
  notes?: string;
}

/**
 * Summary of performance issues by category
 */
export interface PerformanceSummary {
  /** Total number of issues */
  total: number;
  
  /** Issues by severity */
  critical: number;
  high: number;
  medium: number;
  low: number;
  
  /** Issues by type */
  databaseIssues: number;
  apiIssues: number;
  memoryIssues: number;
  algorithmIssues: number;
  resourceIssues: number;
  asyncIssues: number;
  cachingIssues: number;
}

/**
 * Performance optimization recommendation
 */
export interface PerformanceRecommendation {
  /** Priority of the recommendation */
  priority: 'high' | 'medium' | 'low';
  
  /** Category of the recommendation */
  category: PerformanceIssueType;
  
  /** Recommendation text */
  text: string;
  
  /** Expected impact if implemented */
  expectedImpact: PerformanceImpact;
  
  /** Affected files (optional) */
  files?: string[];
  
  /** Implementation effort level */
  effort?: 'low' | 'medium' | 'high';
}

/**
 * Complete performance analysis report
 */
export interface PerformanceReport {
  /** Summary statistics */
  summary: PerformanceSummary;
  
  /** All detected issues */
  issues: PerformanceIssue[];
  
  /** Overall performance score (0-100, higher is better) */
  score: number;
  
  /** High-level optimization recommendations */
  recommendations: PerformanceRecommendation[];
  
  /** Timestamp when report was generated */
  generatedAt: string;
  
  /** Files analyzed */
  filesAnalyzed: number;
  
  /** Analysis duration in milliseconds */
  durationMs?: number;
}

/**
 * Configuration for performance analysis
 */
export interface PerformanceAnalysisOptions {
  /** Path to analyze */
  path: string;
  
  /** Minimum severity to report */
  minSeverity?: PerformanceSeverity;
  
  /** Specific issue types to check (default: all) */
  checkTypes?: PerformanceIssueType[];
  
  /** Exclude certain files/patterns */
  excludePatterns?: string[];
  
  /** Include optimization suggestions in report */
  includeOptimizations?: boolean;
  
  /** Check for database-specific issues */
  checkDatabase?: boolean;
  
  /** Check for API-specific issues */
  checkAPI?: boolean;
  
  /** Check for memory-related issues */
  checkMemory?: boolean;
}

/**
 * Pattern definition for detecting performance issues
 */
export interface PerformancePattern {
  /** Pattern identifier */
  id: string;
  
  /** Issue type this pattern detects */
  type: PerformanceIssueType;
  
  /** Severity of issues detected by this pattern */
  severity: PerformanceSeverity;
  
  /** Impact level */
  impact: PerformanceImpact;
  
  /** Regex pattern to match */
  pattern: RegExp;
  
  /** Description of what this pattern detects */
  description: string;
  
  /** Message to show when pattern is detected */
  message: string;
  
  /** Optimization suggestion */
  suggestion: string;
  
  /** Estimated improvement if fixed */
  estimatedImprovement?: string;
  
  /** File extensions to check (default: all) */
  fileExtensions?: string[];
}

/**
 * Context for a detected performance issue
 */
export interface PerformanceIssueContext {
  /** The matched pattern */
  pattern: PerformancePattern;
  
  /** File path */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Matched code */
  match: string;
  
  /** Surrounding lines for context */
  context?: string[];
}

/**
 * Database query analysis result
 */
export interface QueryAnalysis {
  /** Query string or pattern */
  query: string;
  
  /** File and line where query appears */
  location: { file: string; line: number };
  
  /** Detected issues with this query */
  issues: string[];
  
  /** Suggestions for optimization */
  suggestions: string[];
}

/**
 * Memory allocation analysis
 */
export interface MemoryAllocation {
  /** Type of allocation (array, object, buffer, etc.) */
  type: string;
  
  /** File and line */
  location: { file: string; line: number };
  
  /** Potential issue (large allocation, loop allocation, etc.) */
  issue: string;
  
  /** Suggestion */
  suggestion: string;
}

/**
 * Algorithmic complexity analysis
 */
export interface ComplexityAnalysis {
  /** Function or code block */
  name: string;
  
  /** Estimated complexity (O(n), O(n²), etc.) */
  complexity: string;
  
  /** Location */
  location: { file: string; line: number };
  
  /** Issue description */
  issue: string;
  
  /** Improvement suggestion */
  improvement: string;
}
