/**
 * Test Coverage Analysis Types
 * 
 * Defines types for test coverage tracking, gap detection, and test suggestions.
 */

/**
 * Coverage metrics for a specific aspect (lines, branches, functions, statements)
 */
export interface CoverageMetrics {
  /** Total number of items */
  total: number;
  
  /** Number of covered items */
  covered: number;
  
  /** Coverage percentage (0-100) */
  percentage: number;
  
  /** Number of uncovered items */
  uncovered: number;
}

/**
 * Overall coverage data with all metrics
 */
export interface CoverageData {
  /** Line coverage */
  lines: CoverageMetrics;
  
  /** Branch coverage */
  branches: CoverageMetrics;
  
  /** Function coverage */
  functions: CoverageMetrics;
  
  /** Statement coverage */
  statements: CoverageMetrics;
}

/**
 * Coverage information for a single file
 */
export interface FileCoverage {
  /** File path */
  file: string;
  
  /** Coverage metrics for this file */
  coverage: CoverageData;
  
  /** Specific line numbers that are uncovered */
  uncoveredLines: number[];
  
  /** Line ranges that are uncovered (start, end) */
  uncoveredRanges?: Array<{ start: number; end: number }>;
  
  /** Whether this file contains critical uncovered code */
  criticalUncovered: boolean;
  
  /** Functions in this file */
  functions?: FunctionCoverage[];
}

/**
 * Coverage for a specific function
 */
export interface FunctionCoverage {
  /** Function name */
  name: string;
  
  /** Line where function starts */
  line: number;
  
  /** Whether function is covered */
  covered: boolean;
  
  /** Execution count */
  executionCount: number;
  
  /** Whether this is a critical function (e.g., payment, auth) */
  critical?: boolean;
}

/**
 * Test suggestion priority
 */
export type TestPriority = 'high' | 'medium' | 'low';

/**
 * Type of test needed
 */
export type TestType = 
  | 'unit'              // Unit test for isolated function
  | 'integration'       // Integration test for multiple components
  | 'edge-case'         // Edge case or boundary test
  | 'error-handling'    // Error handling test
  | 'security'          // Security-related test
  | 'performance';      // Performance test

/**
 * Suggestion for a missing test
 */
export interface TestSuggestion {
  /** File that needs testing */
  file: string;
  
  /** Function or code block that needs testing */
  function: string;
  
  /** Line number */
  line?: number;
  
  /** Reason why this test is needed */
  reason: string;
  
  /** Priority level */
  priority: TestPriority;
  
  /** Type of test needed */
  testType: TestType;
  
  /** Example test case description */
  example?: string;
  
  /** Suggested test code (optional) */
  suggestedTest?: string;
  
  /** Specific scenarios to test */
  scenarios?: string[];
}

/**
 * Gap in test coverage
 */
export interface CoverageGap {
  /** Type of gap */
  type: 'uncovered-function' | 'uncovered-branch' | 'uncovered-lines' | 'missing-error-handling' | 'missing-edge-cases';
  
  /** File where gap exists */
  file: string;
  
  /** Description of the gap */
  description: string;
  
  /** Severity of the gap */
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  /** Specific locations (lines or ranges) */
  locations?: number[];
  
  /** Suggested tests to fill this gap */
  suggestions: TestSuggestion[];
}

/**
 * Summary of test coverage
 */
export interface CoverageSummary {
  /** Overall coverage metrics */
  overall: CoverageData;
  
  /** Number of files analyzed */
  filesAnalyzed: number;
  
  /** Number of files with low coverage (< 50%) */
  lowCoverageFiles: number;
  
  /** Number of files with good coverage (>= 80%) */
  goodCoverageFiles: number;
  
  /** Number of critical uncovered files */
  criticalUncoveredFiles: number;
  
  /** Total test suggestions generated */
  totalSuggestions: number;
  
  /** High priority suggestions */
  highPrioritySuggestions: number;
}

/**
 * Complete coverage analysis report
 */
export interface CoverageReport {
  /** Summary statistics */
  summary: CoverageSummary;
  
  /** Overall coverage score (0-100) */
  score: number;
  
  /** Per-file coverage details */
  files: FileCoverage[];
  
  /** Identified coverage gaps */
  gaps: CoverageGap[];
  
  /** Test suggestions */
  suggestions: TestSuggestion[];
  
  /** Files with critical uncovered code */
  criticalFiles: string[];
  
  /** Timestamp when report was generated */
  generatedAt: string;
  
  /** Analysis duration in milliseconds */
  durationMs?: number;
}

/**
 * Configuration for coverage analysis
 */
export interface CoverageAnalysisOptions {
  /** Path to project root */
  path: string;
  
  /** Path to coverage report file (e.g., coverage/coverage-final.json) */
  coverageFile?: string;
  
  /** Minimum coverage threshold for scoring */
  minCoverage?: number;
  
  /** Paths to consider as critical (auth, payment, etc.) */
  criticalPaths?: string[];
  
  /** Exclude certain files/patterns from analysis */
  excludePatterns?: string[];
  
  /** Include test suggestions */
  includeSuggestions?: boolean;
  
  /** Maximum number of suggestions to generate */
  maxSuggestions?: number;
  
  /** Generate example test code */
  includeExamples?: boolean;
}

/**
 * Istanbul/NYC coverage JSON format (standard format)
 */
export interface IstanbulCoverageData {
  [filePath: string]: {
    path: string;
    statementMap: Record<string, { start: LineColumn; end: LineColumn }>;
    fnMap: Record<string, { name: string; line: number; loc: { start: LineColumn; end: LineColumn } }>;
    branchMap: Record<string, { line: number; locations: Array<{ start: LineColumn; end: LineColumn }> }>;
    s: Record<string, number>; // Statement hits
    f: Record<string, number>; // Function hits
    b: Record<string, number[]>; // Branch hits
  };
}

/**
 * Line and column position
 */
export interface LineColumn {
  line: number;
  column: number;
}

/**
 * Parsed coverage from Istanbul format
 */
export interface ParsedCoverage {
  /** File path */
  file: string;
  
  /** Total lines in file */
  totalLines: number;
  
  /** Covered lines */
  coveredLines: Set<number>;
  
  /** Uncovered lines */
  uncoveredLines: Set<number>;
  
  /** Total branches */
  totalBranches: number;
  
  /** Covered branches */
  coveredBranches: number;
  
  /** Total functions */
  totalFunctions: number;
  
  /** Covered functions */
  coveredFunctions: number;
  
  /** Function details */
  functions: Array<{
    name: string;
    line: number;
    covered: boolean;
    hits: number;
  }>;
  
  /** Total statements */
  totalStatements: number;
  
  /** Covered statements */
  coveredStatements: number;
}

/**
 * Test quality metrics
 */
export interface TestQuality {
  /** File path to test file */
  testFile: string;
  
  /** Number of test cases */
  testCount: number;
  
  /** Number of assertions */
  assertionCount: number;
  
  /** Whether tests check error cases */
  hasErrorTests: boolean;
  
  /** Whether tests check edge cases */
  hasEdgeCaseTests: boolean;
  
  /** Test isolation score (0-100) */
  isolationScore: number;
  
  /** Issues found in tests */
  issues: string[];
  
  /** Suggestions for improvement */
  improvements: string[];
}

/**
 * Recommendation for improving coverage
 */
export interface CoverageRecommendation {
  /** Priority level */
  priority: TestPriority;
  
  /** Category of recommendation */
  category: 'critical' | 'high-value' | 'edge-cases' | 'error-handling' | 'integration';
  
  /** Recommendation text */
  text: string;
  
  /** Files affected */
  files: string[];
  
  /** Expected coverage improvement */
  expectedImprovement?: string;
  
  /** Effort level */
  effort?: 'low' | 'medium' | 'high';
}
