/**
 * Coverage Tracker
 * 
 * Analyzes test coverage reports, identifies gaps, and suggests tests for uncovered code.
 * Supports Istanbul/NYC coverage format.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';
import {
  CoverageReport,
  CoverageAnalysisOptions,
  FileCoverage,
  CoverageData,
  CoverageMetrics,
  CoverageSummary,
  CoverageGap,
  TestSuggestion,
  IstanbulCoverageData,
  ParsedCoverage,
  TestPriority,
  CoverageRecommendation
} from '../types/coverage.js';

/**
 * CoverageTracker - Analyzes test coverage and suggests improvements
 */
export class CoverageTracker {
  private options: CoverageAnalysisOptions;
  private parsedCoverage: Map<string, ParsedCoverage> = new Map();

  constructor(options: CoverageAnalysisOptions) {
    this.options = {
      minCoverage: 80,
      includeSuggestions: true,
      maxSuggestions: 20,
      includeExamples: true,
      criticalPaths: ['auth', 'payment', 'security', 'crypto'],
      excludePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/test/**', '**/__tests__/**'],
      ...options
    };
  }

  /**
   * Run comprehensive coverage analysis
   */
  async analyze(): Promise<CoverageReport> {
    const startTime = Date.now();

    // Find and parse coverage file
    const coverageData = await this.loadCoverageData();
    
    if (!coverageData) {
      return this.generateEmptyReport();
    }

    // Parse coverage for each file
    this.parseCoverage(coverageData);

    // Build file coverage details
    const files = this.buildFileCoverages();

    // Identify coverage gaps
    const gaps = this.identifyGaps(files);

    // Generate test suggestions
    const suggestions = this.generateTestSuggestions(gaps, files);

    // Calculate score
    const score = this.calculateCoverageScore(files);

    // Build summary
    const summary = this.buildSummary(files, suggestions);

    // Find critical files
    const criticalFiles = files
      .filter(f => f.criticalUncovered)
      .map(f => f.file);

    const durationMs = Date.now() - startTime;

    return {
      summary,
      score,
      files,
      gaps,
      suggestions,
      criticalFiles,
      generatedAt: new Date().toISOString(),
      durationMs
    };
  }

  /**
   * Load coverage data from file
   */
  private async loadCoverageData(): Promise<IstanbulCoverageData | null> {
    // Try to find coverage file
    const coveragePaths = [
      this.options.coverageFile,
      join(this.options.path, 'coverage/coverage-final.json'),
      join(this.options.path, 'coverage/coverage.json'),
      join(this.options.path, '.nyc_output/coverage.json')
    ].filter(Boolean) as string[];

    for (const path of coveragePaths) {
      if (existsSync(path)) {
        try {
          const content = await readFile(path, 'utf-8');
          return JSON.parse(content) as IstanbulCoverageData;
        } catch (error) {
          console.warn(`Warning: Could not parse coverage file ${path}`);
        }
      }
    }

    console.warn('No coverage file found. Run tests with coverage to generate report.');
    return null;
  }

  /**
   * Parse Istanbul coverage data
   */
  private parseCoverage(data: IstanbulCoverageData): void {
    for (const [filePath, fileData] of Object.entries(data)) {
      // Skip excluded patterns
      if (this.shouldExcludeFile(filePath)) {
        continue;
      }

      const parsed: ParsedCoverage = {
        file: filePath,
        totalLines: 0,
        coveredLines: new Set(),
        uncoveredLines: new Set(),
        totalBranches: 0,
        coveredBranches: 0,
        totalFunctions: 0,
        coveredFunctions: 0,
        functions: [],
        totalStatements: 0,
        coveredStatements: 0
      };

      // Parse statements
      parsed.totalStatements = Object.keys(fileData.s).length;
      for (const [key, hits] of Object.entries(fileData.s)) {
        if (hits > 0) {
          parsed.coveredStatements++;
          const loc = fileData.statementMap[key];
          if (loc) {
            parsed.coveredLines.add(loc.start.line);
          }
        } else {
          const loc = fileData.statementMap[key];
          if (loc) {
            parsed.uncoveredLines.add(loc.start.line);
          }
        }
      }

      // Parse functions
      parsed.totalFunctions = Object.keys(fileData.f).length;
      for (const [key, hits] of Object.entries(fileData.f)) {
        const fnData = fileData.fnMap[key];
        if (fnData) {
          parsed.functions.push({
            name: fnData.name || 'anonymous',
            line: fnData.line,
            covered: hits > 0,
            hits
          });
          if (hits > 0) {
            parsed.coveredFunctions++;
          }
        }
      }

      // Parse branches
      parsed.totalBranches = Object.keys(fileData.b).length;
      for (const hits of Object.values(fileData.b)) {
        if (hits.some(h => h > 0)) {
          parsed.coveredBranches++;
        }
      }

      // Calculate total lines
      const allLines = new Set([...parsed.coveredLines, ...parsed.uncoveredLines]);
      parsed.totalLines = allLines.size;

      this.parsedCoverage.set(filePath, parsed);
    }
  }

  /**
   * Check if file should be excluded
   */
  private shouldExcludeFile(filePath: string): boolean {
    const patterns = this.options.excludePatterns || [];
    for (const pattern of patterns) {
      if (filePath.includes(pattern.replace(/\*\*/g, '')) || 
          filePath.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Build file coverage details
   */
  private buildFileCoverages(): FileCoverage[] {
    const files: FileCoverage[] = [];

    for (const [filePath, parsed] of this.parsedCoverage.entries()) {
      const coverage = this.calculateMetrics(parsed);
      const uncoveredLines = Array.from(parsed.uncoveredLines).sort((a, b) => a - b);
      const criticalUncovered = this.isCriticalFile(filePath) && coverage.lines.percentage < 80;

      const functions = parsed.functions.map(f => ({
        name: f.name,
        line: f.line,
        covered: f.covered,
        executionCount: f.hits,
        critical: this.isCriticalFunction(f.name)
      }));

      files.push({
        file: relative(this.options.path, filePath),
        coverage,
        uncoveredLines,
        uncoveredRanges: this.groupIntoRanges(uncoveredLines),
        criticalUncovered,
        functions
      });
    }

    return files.sort((a, b) => a.coverage.lines.percentage - b.coverage.lines.percentage);
  }

  /**
   * Calculate coverage metrics for parsed data
   */
  private calculateMetrics(parsed: ParsedCoverage): CoverageData {
    return {
      lines: {
        total: parsed.totalLines,
        covered: parsed.coveredLines.size,
        uncovered: parsed.uncoveredLines.size,
        percentage: this.calculatePercentage(parsed.coveredLines.size, parsed.totalLines)
      },
      branches: {
        total: parsed.totalBranches,
        covered: parsed.coveredBranches,
        uncovered: parsed.totalBranches - parsed.coveredBranches,
        percentage: this.calculatePercentage(parsed.coveredBranches, parsed.totalBranches)
      },
      functions: {
        total: parsed.totalFunctions,
        covered: parsed.coveredFunctions,
        uncovered: parsed.totalFunctions - parsed.coveredFunctions,
        percentage: this.calculatePercentage(parsed.coveredFunctions, parsed.totalFunctions)
      },
      statements: {
        total: parsed.totalStatements,
        covered: parsed.coveredStatements,
        uncovered: parsed.totalStatements - parsed.coveredStatements,
        percentage: this.calculatePercentage(parsed.coveredStatements, parsed.totalStatements)
      }
    };
  }

  /**
   * Calculate percentage safely
   */
  private calculatePercentage(covered: number, total: number): number {
    if (total === 0) return 100;
    return Math.round((covered / total) * 100);
  }

  /**
   * Group uncovered lines into ranges
   */
  private groupIntoRanges(lines: number[]): Array<{ start: number; end: number }> {
    if (lines.length === 0) return [];

    const ranges: Array<{ start: number; end: number }> = [];
    let start = lines[0];
    let end = lines[0];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === end + 1) {
        end = lines[i];
      } else {
        ranges.push({ start, end });
        start = lines[i];
        end = lines[i];
      }
    }
    ranges.push({ start, end });

    return ranges;
  }

  /**
   * Check if file is critical based on path
   */
  private isCriticalFile(filePath: string): boolean {
    const criticalKeywords = this.options.criticalPaths || [];
    return criticalKeywords.some(keyword => 
      filePath.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if function is critical based on name
   */
  private isCriticalFunction(name: string): boolean {
    const criticalKeywords = [
      'auth', 'login', 'authenticate', 'authorize',
      'payment', 'charge', 'refund', 'transaction',
      'encrypt', 'decrypt', 'hash', 'verify',
      'validate', 'sanitize', 'escape'
    ];
    const lowerName = name.toLowerCase();
    return criticalKeywords.some(keyword => lowerName.includes(keyword));
  }

  /**
   * Identify coverage gaps
   */
  private identifyGaps(files: FileCoverage[]): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    for (const file of files) {
      // Uncovered functions
      const uncoveredFunctions = file.functions?.filter(f => !f.covered) || [];
      if (uncoveredFunctions.length > 0) {
        const criticalUncovered = uncoveredFunctions.filter(f => f.critical);
        
        gaps.push({
          type: 'uncovered-function',
          file: file.file,
          description: `${uncoveredFunctions.length} uncovered function(s)${criticalUncovered.length > 0 ? ` (${criticalUncovered.length} critical)` : ''}`,
          severity: criticalUncovered.length > 0 ? 'critical' : file.coverage.functions.percentage < 50 ? 'high' : 'medium',
          locations: uncoveredFunctions.map(f => f.line),
          suggestions: []
        });
      }

      // Low branch coverage
      if (file.coverage.branches.total > 0 && file.coverage.branches.percentage < 70) {
        gaps.push({
          type: 'uncovered-branch',
          file: file.file,
          description: `Low branch coverage: ${file.coverage.branches.percentage}% (${file.coverage.branches.uncovered} branches untested)`,
          severity: file.coverage.branches.percentage < 50 ? 'high' : 'medium',
          suggestions: []
        });
      }

      // Critical uncovered lines
      if (file.criticalUncovered) {
        gaps.push({
          type: 'uncovered-lines',
          file: file.file,
          description: `Critical file with low coverage: ${file.coverage.lines.percentage}%`,
          severity: 'critical',
          locations: file.uncoveredLines.slice(0, 10),
          suggestions: []
        });
      }
    }

    return gaps;
  }

  /**
   * Generate test suggestions
   */
  private generateTestSuggestions(gaps: CoverageGap[], files: FileCoverage[]): TestSuggestion[] {
    if (!this.options.includeSuggestions) return [];

    const suggestions: TestSuggestion[] = [];
    const maxSuggestions = this.options.maxSuggestions || 20;

    // Suggest tests for critical uncovered functions
    for (const file of files) {
      if (!file.functions) continue;

      const criticalUncovered = file.functions.filter(f => !f.covered && f.critical);
      for (const func of criticalUncovered) {
        if (suggestions.length >= maxSuggestions) break;

        suggestions.push({
          file: file.file,
          function: func.name,
          line: func.line,
          reason: 'Critical function with no test coverage',
          priority: 'high',
          testType: func.name.toLowerCase().includes('auth') ? 'security' : 'unit',
          example: `Test ${func.name} with valid inputs, edge cases, and error conditions`,
          scenarios: this.generateScenarios(func.name),
          suggestedTest: this.options.includeExamples ? this.generateTestExample(func.name, file.file) : undefined
        });
      }
    }

    // Suggest tests for uncovered functions
    for (const file of files.filter(f => f.coverage.functions.percentage < 70)) {
      if (!file.functions) continue;

      const uncovered = file.functions.filter(f => !f.covered && !f.critical);
      for (const func of uncovered.slice(0, 3)) {
        if (suggestions.length >= maxSuggestions) break;

        suggestions.push({
          file: file.file,
          function: func.name,
          line: func.line,
          reason: 'Uncovered function',
          priority: file.coverage.functions.percentage < 50 ? 'high' : 'medium',
          testType: 'unit',
          example: `Test ${func.name} behavior`,
          scenarios: this.generateScenarios(func.name)
        });
      }
    }

    // Suggest integration tests for files with low branch coverage
    for (const gap of gaps.filter(g => g.type === 'uncovered-branch')) {
      if (suggestions.length >= maxSuggestions) break;

      suggestions.push({
        file: gap.file,
        function: 'various',
        reason: 'Low branch coverage indicates missing conditional tests',
        priority: 'medium',
        testType: 'edge-case',
        example: 'Test edge cases and error paths to cover untested branches',
        scenarios: [
          'Test with null/undefined inputs',
          'Test with boundary values',
          'Test error conditions',
          'Test with invalid input types'
        ]
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate test scenarios for a function
   */
  private generateScenarios(functionName: string): string[] {
    const lowerName = functionName.toLowerCase();
    const scenarios: string[] = [];

    // Auth-related
    if (lowerName.includes('auth') || lowerName.includes('login')) {
      scenarios.push('Test with valid credentials');
      scenarios.push('Test with invalid credentials');
      scenarios.push('Test with missing credentials');
      scenarios.push('Test with expired token');
    }
    // Payment-related
    else if (lowerName.includes('payment') || lowerName.includes('charge')) {
      scenarios.push('Test successful payment');
      scenarios.push('Test with insufficient funds');
      scenarios.push('Test with invalid payment method');
      scenarios.push('Test idempotency');
    }
    // Validation
    else if (lowerName.includes('validate') || lowerName.includes('check')) {
      scenarios.push('Test with valid input');
      scenarios.push('Test with invalid input');
      scenarios.push('Test with edge cases (empty, null, undefined)');
    }
    // Generic
    else {
      scenarios.push('Test successful execution');
      scenarios.push('Test error handling');
      scenarios.push('Test edge cases');
    }

    return scenarios;
  }

  /**
   * Generate example test code
   */
  private generateTestExample(functionName: string, filePath: string): string {
    const fileName = filePath.split('/').pop()?.replace('.ts', '').replace('.js', '') || 'module';
    
    return `
describe('${functionName}', () => {
  it('should execute successfully with valid input', async () => {
    const result = await ${functionName}(validInput);
    expect(result).toBeDefined();
  });

  it('should handle error cases', async () => {
    await expect(${functionName}(invalidInput)).rejects.toThrow();
  });

  it('should handle edge cases', () => {
    expect(${functionName}(null)).toThrow();
    expect(${functionName}(undefined)).toThrow();
  });
});`.trim();
  }

  /**
   * Calculate overall coverage score
   */
  private calculateCoverageScore(files: FileCoverage[]): number {
    if (files.length === 0) return 0;

    // Aggregate coverage
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const file of files) {
      totalLines += file.coverage.lines.total;
      coveredLines += file.coverage.lines.covered;
      totalBranches += file.coverage.branches.total;
      coveredBranches += file.coverage.branches.covered;
    }

    const linePercentage = this.calculatePercentage(coveredLines, totalLines);
    const branchPercentage = this.calculatePercentage(coveredBranches, totalBranches);

    // Weighted average: 60% lines, 40% branches
    const score = Math.round(linePercentage * 0.6 + branchPercentage * 0.4);

    return score;
  }

  /**
   * Build summary statistics
   */
  private buildSummary(files: FileCoverage[], suggestions: TestSuggestion[]): CoverageSummary {
    // Calculate overall metrics
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalStatements = 0;
    let coveredStatements = 0;

    for (const file of files) {
      totalLines += file.coverage.lines.total;
      coveredLines += file.coverage.lines.covered;
      totalBranches += file.coverage.branches.total;
      coveredBranches += file.coverage.branches.covered;
      totalFunctions += file.coverage.functions.total;
      coveredFunctions += file.coverage.functions.covered;
      totalStatements += file.coverage.statements.total;
      coveredStatements += file.coverage.statements.covered;
    }

    const overall: CoverageData = {
      lines: {
        total: totalLines,
        covered: coveredLines,
        uncovered: totalLines - coveredLines,
        percentage: this.calculatePercentage(coveredLines, totalLines)
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        uncovered: totalBranches - coveredBranches,
        percentage: this.calculatePercentage(coveredBranches, totalBranches)
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        uncovered: totalFunctions - coveredFunctions,
        percentage: this.calculatePercentage(coveredFunctions, totalFunctions)
      },
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        uncovered: totalStatements - coveredStatements,
        percentage: this.calculatePercentage(coveredStatements, totalStatements)
      }
    };

    const lowCoverageFiles = files.filter(f => f.coverage.lines.percentage < 50).length;
    const goodCoverageFiles = files.filter(f => f.coverage.lines.percentage >= 80).length;
    const criticalUncoveredFiles = files.filter(f => f.criticalUncovered).length;
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high').length;

    return {
      overall,
      filesAnalyzed: files.length,
      lowCoverageFiles,
      goodCoverageFiles,
      criticalUncoveredFiles,
      totalSuggestions: suggestions.length,
      highPrioritySuggestions
    };
  }

  /**
   * Generate empty report when no coverage data available
   */
  private generateEmptyReport(): CoverageReport {
    return {
      summary: {
        overall: {
          lines: { total: 0, covered: 0, uncovered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, uncovered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, uncovered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, uncovered: 0, percentage: 0 }
        },
        filesAnalyzed: 0,
        lowCoverageFiles: 0,
        goodCoverageFiles: 0,
        criticalUncoveredFiles: 0,
        totalSuggestions: 0,
        highPrioritySuggestions: 0
      },
      score: 0,
      files: [],
      gaps: [],
      suggestions: [],
      criticalFiles: [],
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Format report as human-readable text
   */
  formatReport(report: CoverageReport): string {
    let output = '\n🧪 Test Coverage Analysis\n\n';

    if (report.summary.filesAnalyzed === 0) {
      output += '⚠️  No coverage data found. Run tests with coverage:\n';
      output += '   npm run test:coverage\n\n';
      return output;
    }

    // Score
    const scoreEmoji = report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '🚨';
    output += `Overall Coverage: ${report.score}% ${scoreEmoji}\n\n`;

    // Detailed metrics
    const { overall } = report.summary;
    output += `Metrics:\n`;
    output += `  • Lines: ${overall.lines.covered}/${overall.lines.total} (${overall.lines.percentage}%)\n`;
    output += `  • Branches: ${overall.branches.covered}/${overall.branches.total} (${overall.branches.percentage}%)\n`;
    output += `  • Functions: ${overall.functions.covered}/${overall.functions.total} (${overall.functions.percentage}%)\n`;
    output += `  • Statements: ${overall.statements.covered}/${overall.statements.total} (${overall.statements.percentage}%)\n`;
    output += '\n';

    // File breakdown
    output += `Files: ${report.summary.filesAnalyzed}\n`;
    output += `  ✓ Good coverage (≥80%): ${report.summary.goodCoverageFiles}\n`;
    output += `  ⚠️  Low coverage (<50%): ${report.summary.lowCoverageFiles}\n`;
    if (report.summary.criticalUncoveredFiles > 0) {
      output += `  🔴 Critical uncovered: ${report.summary.criticalUncoveredFiles}\n`;
    }
    output += '\n';

    output += '━'.repeat(60) + '\n\n';

    // Critical files
    if (report.criticalFiles.length > 0) {
      output += '🔴 Critical Files with Low Coverage:\n\n';
      for (const file of report.criticalFiles) {
        const fileCov = report.files.find(f => f.file === file);
        if (fileCov) {
          output += `  • ${file} - ${fileCov.coverage.lines.percentage}%\n`;
        }
      }
      output += '\n';
    }

    // Top test suggestions
    if (report.suggestions.length > 0) {
      output += '💡 Suggested Tests (Priority: High):\n\n';
      const highPriority = report.suggestions.filter(s => s.priority === 'high').slice(0, 5);
      
      highPriority.forEach((suggestion, idx) => {
        output += `${idx + 1}. ${suggestion.file} - ${suggestion.function}()\n`;
        output += `   Reason: ${suggestion.reason}\n`;
        output += `   Type: ${suggestion.testType}\n`;
        if (suggestion.scenarios) {
          output += `   Scenarios:\n`;
          suggestion.scenarios.slice(0, 3).forEach(s => {
            output += `     - ${s}\n`;
          });
        }
        output += '\n';
      });

      if (report.suggestions.length > highPriority.length) {
        output += `... and ${report.suggestions.length - highPriority.length} more suggestions\n\n`;
      }
    }

    output += '━'.repeat(60) + '\n';
    output += `\nAnalyzed ${report.summary.filesAnalyzed} files in ${report.durationMs}ms\n`;

    return output;
  }
}
