/**
 * Reviewer Agent - Reviews implementation for quality, security, and correctness
 * Enhanced with specialized security, performance, and coverage analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { ImplementationPlan, ImplementationResult, ReviewResult, ReviewIssue } from '../types/index.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';
import { SecuritySpecialist } from '../analyzers/security-specialist.js';
import { PerformanceAnalyzer } from '../analyzers/performance-analyzer.js';
import { CoverageTracker } from '../analyzers/coverage-tracker.js';
import { SecurityReport } from '../types/security.js';
import { PerformanceReport } from '../types/performance.js';
import { CoverageReport } from '../types/coverage.js';

const REVIEWER_SYSTEM_PROMPT = `You are a Backend Code Reviewer Agent.

Your responsibility is to review implementations for correctness, security, and quality.

Review checklist:

**Correctness**
□ Does implementation satisfy the original requirement?
□ Are all edge cases handled?
□ Is error handling complete?
□ Are there any logical errors?

**Architecture**
□ Does it follow existing architecture patterns?
□ Are responsibilities properly separated (controller/service/repository)?
□ Are module boundaries respected?
□ Are there any unnecessary dependencies?

**Security**
□ Are inputs validated?
□ Are authorization checks present?
□ Are database queries parameterized (no SQL injection)?
□ Are secrets handled properly?
□ Is user data sanitized?
□ Are rate limits considered?

**Performance**
□ Are there N+1 query problems?
□ Are database queries optimized?
□ Are proper indexes used?
□ Is caching appropriate?

**Testing**
□ Are tests sufficient?
□ Do tests cover edge cases?
□ Are failure paths tested?

**Code Quality**
□ Is the code readable and maintainable?
□ Are naming conventions followed?
□ Is there unnecessary code duplication?
□ Are types properly defined?

Return your review as JSON:
{
  "approved": true/false,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "security|architecture|performance|testing|style",
      "description": "Clear description",
      "file": "optional file path",
      "line": 42,
      "suggestion": "How to fix"
    }
  ],
  "suggestions": ["Improvement suggestions"],
  "securityConcerns": ["Security-related concerns"],
  "performanceConcerns": ["Performance-related concerns"]
}`;

export class ReviewerAgent {
  private repoPath: string;

  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools,
    private gitTools: GitTools,
    repoPath?: string
  ) {
    this.repoPath = repoPath || process.cwd();
  }

  /**
   * Standard review (existing functionality)
   */
  async review(
    requirement: string,
    plan: ImplementationPlan,
    implementation: ImplementationResult
  ): Promise<ReviewResult> {
    // Gather the actual file contents
    const implementedFiles = await this.gatherImplementedFiles(implementation.filesChanged);
    
    const userMessage = `
Original Requirement: ${requirement}

Implementation Plan:
${JSON.stringify(plan, null, 2)}

Implementation Result:
- Files Changed: ${implementation.filesChanged.join(', ')}
- Tests Passed: ${implementation.testsPassed}

Git Diff:
${implementation.diff}

Implemented Files:
${implementedFiles}

Review this implementation against the checklist and return your assessment as JSON.
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: REVIEWER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from reviewer');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract review JSON from response');
    }

    try {
      const review = JSON.parse(jsonMatch[0]) as ReviewResult;
      return review;
    } catch (error) {
      throw new Error(`Failed to parse review: ${error}`);
    }
  }

  /**
   * Enhanced review with specialized analysis
   */
  async enhancedReview(options: {
    requirement: string;
    plan: ImplementationPlan;
    implementation: ImplementationResult;
    includeSecurity?: boolean;
    includePerformance?: boolean;
    includeCoverage?: boolean;
  }): Promise<{
    basicReview: ReviewResult;
    securityReport?: SecurityReport;
    performanceReport?: PerformanceReport;
    coverageReport?: CoverageReport;
    combinedScore: number;
    summary: string;
  }> {
    const {
      requirement,
      plan,
      implementation,
      includeSecurity = true,
      includePerformance = true,
      includeCoverage = true
    } = options;

    // Run basic review
    const basicReview = await this.review(requirement, plan, implementation);

    // Run specialized analyses in parallel
    const [securityReport, performanceReport, coverageReport] = await Promise.all([
      includeSecurity ? this.runSecurityAnalysis() : Promise.resolve(undefined),
      includePerformance ? this.runPerformanceAnalysis() : Promise.resolve(undefined),
      includeCoverage ? this.runCoverageAnalysis() : Promise.resolve(undefined)
    ]);

    // Calculate combined score
    const combinedScore = this.calculateCombinedScore(
      basicReview,
      securityReport,
      performanceReport,
      coverageReport
    );

    // Generate summary
    const summary = this.generateEnhancedSummary(
      basicReview,
      securityReport,
      performanceReport,
      coverageReport
    );

    return {
      basicReview,
      securityReport,
      performanceReport,
      coverageReport,
      combinedScore,
      summary
    };
  }

  /**
   * Security-focused review
   */
  async reviewSecurity(): Promise<SecurityReport> {
    return await this.runSecurityAnalysis();
  }

  /**
   * Performance-focused review
   */
  async reviewPerformance(): Promise<PerformanceReport> {
    return await this.runPerformanceAnalysis();
  }

  /**
   * Coverage-focused review
   */
  async reviewCoverage(): Promise<CoverageReport> {
    return await this.runCoverageAnalysis();
  }

  /**
   * Run security analysis
   */
  private async runSecurityAnalysis(): Promise<SecurityReport> {
    const specialist = new SecuritySpecialist({
      path: this.repoPath,
      includeFixes: true,
      minSeverity: 'low'
    });

    return await specialist.analyze();
  }

  /**
   * Run performance analysis
   */
  private async runPerformanceAnalysis(): Promise<PerformanceReport> {
    const analyzer = new PerformanceAnalyzer({
      path: this.repoPath,
      includeOptimizations: true,
      minSeverity: 'low'
    });

    return await analyzer.analyze();
  }

  /**
   * Run coverage analysis
   */
  private async runCoverageAnalysis(): Promise<CoverageReport> {
    const tracker = new CoverageTracker({
      path: this.repoPath,
      includeSuggestions: true,
      maxSuggestions: 20
    });

    return await tracker.analyze();
  }

  /**
   * Calculate combined score from all analyses
   */
  private calculateCombinedScore(
    basicReview: ReviewResult,
    securityReport?: SecurityReport,
    performanceReport?: PerformanceReport,
    coverageReport?: CoverageReport
  ): number {
    let totalScore = 0;
    let components = 0;

    // Basic review score (0-100)
    // Approved = 100, critical issues = -20 each, high = -10, medium = -5, low = -2
    let basicScore = basicReview.approved ? 100 : 80;
    for (const issue of basicReview.issues || []) {
      switch (issue.severity) {
        case 'critical': basicScore -= 20; break;
        case 'high': basicScore -= 10; break;
        case 'medium': basicScore -= 5; break;
        case 'low': basicScore -= 2; break;
      }
    }
    basicScore = Math.max(0, basicScore);
    totalScore += basicScore;
    components++;

    // Security score
    if (securityReport) {
      totalScore += securityReport.score;
      components++;
    }

    // Performance score
    if (performanceReport) {
      totalScore += performanceReport.score;
      components++;
    }

    // Coverage score
    if (coverageReport) {
      totalScore += coverageReport.score;
      components++;
    }

    return components > 0 ? Math.round(totalScore / components) : 0;
  }

  /**
   * Generate enhanced summary combining all reports
   */
  private generateEnhancedSummary(
    basicReview: ReviewResult,
    securityReport?: SecurityReport,
    performanceReport?: PerformanceReport,
    coverageReport?: CoverageReport
  ): string {
    let summary = '📊 Enhanced Code Review Summary\n\n';

    // Basic review
    summary += `✅ Basic Review: ${basicReview.approved ? 'APPROVED' : 'NEEDS WORK'}\n`;
    if (basicReview.issues && basicReview.issues.length > 0) {
      summary += `   Issues: ${basicReview.issues.length} (`;
      const critical = basicReview.issues.filter(i => i.severity === 'critical').length;
      const high = basicReview.issues.filter(i => i.severity === 'high').length;
      if (critical > 0) summary += `${critical} critical, `;
      if (high > 0) summary += `${high} high, `;
      summary += `${basicReview.issues.length - critical - high} other)\n`;
    }
    summary += '\n';

    // Security
    if (securityReport) {
      const emoji = securityReport.score >= 80 ? '✅' : securityReport.score >= 60 ? '⚠️' : '🚨';
      summary += `${emoji} Security: ${securityReport.score}/100\n`;
      if (securityReport.summary.total > 0) {
        summary += `   Issues: ${securityReport.summary.total} (`;
        if (securityReport.summary.critical > 0) summary += `${securityReport.summary.critical} critical, `;
        if (securityReport.summary.high > 0) summary += `${securityReport.summary.high} high, `;
        summary += `${securityReport.summary.medium + securityReport.summary.low} other)\n`;
      }
      summary += '\n';
    }

    // Performance
    if (performanceReport) {
      const emoji = performanceReport.score >= 80 ? '✅' : performanceReport.score >= 60 ? '⚠️' : '🚨';
      summary += `${emoji} Performance: ${performanceReport.score}/100\n`;
      if (performanceReport.summary.total > 0) {
        summary += `   Issues: ${performanceReport.summary.total} (`;
        if (performanceReport.summary.critical > 0) summary += `${performanceReport.summary.critical} critical, `;
        if (performanceReport.summary.high > 0) summary += `${performanceReport.summary.high} high, `;
        summary += `${performanceReport.summary.medium + performanceReport.summary.low} other)\n`;
      }
      summary += '\n';
    }

    // Coverage
    if (coverageReport) {
      const emoji = coverageReport.score >= 80 ? '✅' : coverageReport.score >= 60 ? '⚠️' : '🚨';
      summary += `${emoji} Coverage: ${coverageReport.score}%\n`;
      if (coverageReport.summary.filesAnalyzed > 0) {
        summary += `   Files: ${coverageReport.summary.filesAnalyzed} analyzed`;
        if (coverageReport.summary.criticalUncoveredFiles > 0) {
          summary += `, ${coverageReport.summary.criticalUncoveredFiles} critical uncovered`;
        }
        summary += '\n';
        if (coverageReport.summary.totalSuggestions > 0) {
          summary += `   Suggestions: ${coverageReport.summary.totalSuggestions} test improvements\n`;
        }
      }
      summary += '\n';
    }

    // Overall
    const combinedScore = this.calculateCombinedScore(basicReview, securityReport, performanceReport, coverageReport);
    const overallEmoji = combinedScore >= 80 ? '🎉' : combinedScore >= 60 ? '⚠️' : '🚨';
    summary += `${overallEmoji} Overall Score: ${combinedScore}/100\n`;

    return summary;
  }

  private async gatherImplementedFiles(files: string[]): Promise<string> {
    const contents: string[] = [];
    
    for (const file of files) {
      const content = await this.fsTools.readFile(file);
      if (content.success) {
        contents.push(`\n--- ${file} ---`);
        contents.push(content.output);
      }
    }
    
    return contents.join('\n');
  }
}
