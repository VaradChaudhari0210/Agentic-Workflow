/**
 * Security Analysis Types
 * 
 * Defines types for security vulnerability detection, reporting, and remediation.
 */

/**
 * Types of security issues that can be detected
 */
export type SecurityIssueType = 
  | 'auth'           // Authentication/Authorization issues
  | 'data'           // Data security (encryption, exposure)
  | 'injection'      // SQL, NoSQL, XSS, Command injection
  | 'api'            // API security (rate limiting, CORS)
  | 'dependency'     // Vulnerable dependencies
  | 'crypto'         // Cryptographic issues
  | 'session'        // Session management
  | 'config';        // Configuration security

/**
 * Severity levels for security issues
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Individual security issue found in code
 */
export interface SecurityIssue {
  /** Type of security issue */
  type: SecurityIssueType;
  
  /** Severity level */
  severity: SecuritySeverity;
  
  /** Short title of the issue */
  title: string;
  
  /** Detailed description of the vulnerability */
  description: string;
  
  /** File where the issue was found */
  file: string;
  
  /** Line number (optional) */
  line?: number;
  
  /** Code snippet showing the vulnerability (optional) */
  codeSnippet?: string;
  
  /** Remediation steps and recommendations */
  remediation: string;
  
  /** Fixed version of the code (optional) */
  fixedCode?: string;
  
  /** References to documentation or security advisories */
  references?: string[];
  
  /** CVE identifier if applicable */
  cve?: string;
  
  /** OWASP category if applicable */
  owasp?: string;
}

/**
 * Summary of security issues by severity
 */
export interface SecuritySummary {
  /** Total number of issues */
  total: number;
  
  /** Number of critical severity issues */
  critical: number;
  
  /** Number of high severity issues */
  high: number;
  
  /** Number of medium severity issues */
  medium: number;
  
  /** Number of low severity issues */
  low: number;
}

/**
 * Overall security recommendation
 */
export interface SecurityRecommendation {
  /** Priority of the recommendation */
  priority: 'high' | 'medium' | 'low';
  
  /** Category of the recommendation */
  category: SecurityIssueType;
  
  /** Recommendation text */
  text: string;
  
  /** Affected files (optional) */
  files?: string[];
}

/**
 * Complete security analysis report
 */
export interface SecurityReport {
  /** Summary statistics */
  summary: SecuritySummary;
  
  /** All detected issues */
  issues: SecurityIssue[];
  
  /** Overall security score (0-100, higher is better) */
  score: number;
  
  /** High-level recommendations */
  recommendations: SecurityRecommendation[];
  
  /** Timestamp when report was generated */
  generatedAt: string;
  
  /** Files analyzed */
  filesAnalyzed: number;
  
  /** Analysis duration in milliseconds */
  durationMs?: number;
}

/**
 * Configuration for security analysis
 */
export interface SecurityAnalysisOptions {
  /** Path to analyze */
  path: string;
  
  /** Include dependency vulnerabilities */
  includeDependencies?: boolean;
  
  /** Minimum severity to report */
  minSeverity?: SecuritySeverity;
  
  /** Specific issue types to check (default: all) */
  checkTypes?: SecurityIssueType[];
  
  /** Exclude certain files/patterns */
  excludePatterns?: string[];
  
  /** Include fix suggestions in report */
  includeFixes?: boolean;
}

/**
 * Pattern definition for detecting security issues
 */
export interface SecurityPattern {
  /** Pattern identifier */
  id: string;
  
  /** Issue type this pattern detects */
  type: SecurityIssueType;
  
  /** Severity of issues detected by this pattern */
  severity: SecuritySeverity;
  
  /** Regex pattern to match */
  pattern: RegExp;
  
  /** Description of what this pattern detects */
  description: string;
  
  /** Message to show when pattern is detected */
  message: string;
  
  /** Remediation advice */
  remediation: string;
  
  /** OWASP category if applicable */
  owasp?: string;
  
  /** File extensions to check (default: all) */
  fileExtensions?: string[];
}

/**
 * Context for a detected security issue
 */
export interface SecurityIssueContext {
  /** The matched pattern */
  pattern: SecurityPattern;
  
  /** File path */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Matched code */
  match: string;
  
  /** Surrounding lines for context */
  context?: string[];
}
