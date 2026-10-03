/**
 * Security Specialist Analyzer
 * 
 * Detects security vulnerabilities including SQL injection, XSS, authentication issues,
 * data exposure, and other common security problems in backend code.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import {
  SecurityIssue,
  SecurityReport,
  SecurityPattern,
  SecurityAnalysisOptions,
  SecuritySeverity,
  SecurityIssueType,
  SecuritySummary,
  SecurityRecommendation,
  SecurityIssueContext
} from '../types/security.js';

/**
 * Security patterns for detecting common vulnerabilities
 */
const SECURITY_PATTERNS: SecurityPattern[] = [
  // SQL Injection patterns
  {
    id: 'sql-injection-string-concat',
    type: 'injection',
    severity: 'critical',
    pattern: /query\s*=\s*[`'"]\s*SELECT.*\$\{|query\s*=\s*[`'"].*\+\s*\w+|execute\([`'"].*\$\{/gi,
    description: 'SQL query with string concatenation or template literals',
    message: 'SQL injection vulnerability: Query uses string concatenation',
    remediation: 'Use parameterized queries with placeholders ($1, $2, etc.) instead of string concatenation',
    owasp: 'A03:2021 - Injection'
  },
  {
    id: 'sql-injection-query-format',
    type: 'injection',
    severity: 'critical',
    pattern: /\.query\s*\(\s*[`'"][^`'"]*\$\{|\.query\s*\(\s*[`'"][^`'"]*\+\s*\w+/gi,
    description: 'Database query using string interpolation',
    message: 'SQL injection vulnerability: Direct variable interpolation in query',
    remediation: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [userId])',
    owasp: 'A03:2021 - Injection'
  },
  
  // NoSQL Injection patterns
  {
    id: 'nosql-injection-find',
    type: 'injection',
    severity: 'high',
    pattern: /\.find\(\s*req\.(body|query|params)\)|\.findOne\(\s*req\.(body|query|params)\)/gi,
    description: 'NoSQL query using user input directly',
    message: 'NoSQL injection vulnerability: Direct use of request parameters in query',
    remediation: 'Sanitize and validate input before using in queries. Use schema validation.',
    owasp: 'A03:2021 - Injection'
  },
  
  // XSS patterns
  {
    id: 'xss-innerhtml',
    type: 'injection',
    severity: 'high',
    pattern: /\.innerHTML\s*=.*req\.(body|query|params)|\.innerHTML\s*=\s*\$\{/gi,
    description: 'Setting innerHTML with user input',
    message: 'XSS vulnerability: User input rendered as HTML',
    remediation: 'Use textContent instead of innerHTML, or sanitize HTML with a library like DOMPurify',
    owasp: 'A03:2021 - Injection'
  },
  {
    id: 'xss-dangerously-set',
    type: 'injection',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML/gi,
    description: 'Using dangerouslySetInnerHTML',
    message: 'XSS vulnerability: dangerouslySetInnerHTML allows arbitrary HTML',
    remediation: 'Avoid dangerouslySetInnerHTML or sanitize HTML content before rendering',
    owasp: 'A03:2021 - Injection'
  },
  
  // Command Injection patterns
  {
    id: 'command-injection-exec',
    type: 'injection',
    severity: 'critical',
    pattern: /exec\([`'"][^`'"]*\$\{|exec\([`'"][^`'"]*\+|spawn\([`'"][^`'"]*\$\{/gi,
    description: 'Command execution with string interpolation',
    message: 'Command injection vulnerability: User input in shell command',
    remediation: 'Use spawn with argument array instead of exec with string interpolation',
    owasp: 'A03:2021 - Injection'
  },
  
  // Authentication/Authorization issues
  {
    id: 'weak-jwt-secret',
    type: 'auth',
    severity: 'critical',
    pattern: /jwt.*secret.*=\s*[`'"][a-zA-Z0-9]{1,20}[`'"]/gi,
    description: 'Weak or hardcoded JWT secret',
    message: 'Weak JWT secret: Secret should be long, random, and stored in environment variables',
    remediation: 'Use process.env.JWT_SECRET with a strong random secret (32+ characters)',
    owasp: 'A02:2021 - Cryptographic Failures'
  },
  {
    id: 'missing-jwt-expiration',
    type: 'auth',
    severity: 'high',
    pattern: /jwt\.sign\([^)]*\)\s*(?!.*expiresIn)/gi,
    description: 'JWT token without expiration',
    message: 'JWT tokens should have expiration time',
    remediation: 'Add expiresIn option: jwt.sign(payload, secret, { expiresIn: "1h" })',
    owasp: 'A07:2021 - Identification and Authentication Failures'
  },
  {
    id: 'missing-auth-check',
    type: 'auth',
    severity: 'high',
    pattern: /router\.(post|put|delete|patch)\([^)]*\)\s*(?!.*authenticate|.*auth|.*requireAuth)/gi,
    description: 'Route without authentication middleware',
    message: 'Potentially unprotected route: No authentication middleware detected',
    remediation: 'Add authentication middleware to protect sensitive routes',
    owasp: 'A01:2021 - Broken Access Control'
  },
  
  // Session Management
  {
    id: 'insecure-session-config',
    type: 'session',
    severity: 'high',
    pattern: /session\(\{[^}]*secure:\s*false/gi,
    description: 'Session cookie without secure flag',
    message: 'Insecure session configuration: Cookie should use secure flag in production',
    remediation: 'Set secure: true for production: session({ secret, cookie: { secure: true, httpOnly: true } })',
    owasp: 'A07:2021 - Identification and Authentication Failures'
  },
  {
    id: 'missing-httponly',
    type: 'session',
    severity: 'medium',
    pattern: /cookie\(\s*[^)]*\)\s*(?!.*httpOnly)/gi,
    description: 'Cookie without httpOnly flag',
    message: 'Cookie missing httpOnly flag: Vulnerable to XSS attacks',
    remediation: 'Set httpOnly: true to prevent JavaScript access to cookies',
    owasp: 'A05:2021 - Security Misconfiguration'
  },
  
  // Data Security
  {
    id: 'hardcoded-credentials',
    type: 'data',
    severity: 'critical',
    pattern: /password\s*=\s*[`'"][^`'"]{3,}[`'"]|api[_-]?key\s*=\s*[`'"][^`'"]{10,}[`'"]/gi,
    description: 'Hardcoded credentials in code',
    message: 'Hardcoded credentials: Sensitive data should be in environment variables',
    remediation: 'Move credentials to .env file and use process.env.PASSWORD or process.env.API_KEY',
    owasp: 'A02:2021 - Cryptographic Failures'
  },
  {
    id: 'sensitive-data-logging',
    type: 'data',
    severity: 'high',
    pattern: /console\.log\([^)]*password|console\.log\([^)]*token|console\.log\([^)]*secret|console\.log\([^)]*key/gi,
    description: 'Logging sensitive data',
    message: 'Sensitive data in logs: Passwords, tokens, or secrets should not be logged',
    remediation: 'Remove sensitive data from logs or redact it before logging',
    owasp: 'A09:2021 - Security Logging and Monitoring Failures'
  },
  {
    id: 'weak-crypto-algorithm',
    type: 'crypto',
    severity: 'high',
    pattern: /createCipher\(|createHash\(['"]md5['"]|createHash\(['"]sha1['"]/gi,
    description: 'Weak cryptographic algorithm',
    message: 'Weak cryptographic algorithm: MD5 and SHA1 are deprecated',
    remediation: 'Use strong algorithms: createHash("sha256") or createHash("sha512")',
    owasp: 'A02:2021 - Cryptographic Failures'
  },
  
  // API Security
  {
    id: 'missing-rate-limit',
    type: 'api',
    severity: 'medium',
    pattern: /app\.use\([^)]*\)\s*(?!.*rateLimit|.*rateLimiter)/gi,
    description: 'No rate limiting detected',
    message: 'Missing rate limiting: API endpoints should have rate limiting',
    remediation: 'Add rate limiting middleware: app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))',
    owasp: 'A04:2021 - Insecure Design'
  },
  {
    id: 'permissive-cors',
    type: 'api',
    severity: 'medium',
    pattern: /cors\(\s*\{[^}]*origin:\s*[`'"]?\*[`'"]?/gi,
    description: 'Permissive CORS configuration',
    message: 'Overly permissive CORS: origin set to "*" allows any domain',
    remediation: 'Restrict CORS to specific domains: cors({ origin: "https://yourdomain.com" })',
    owasp: 'A05:2021 - Security Misconfiguration'
  },
  {
    id: 'missing-helmet',
    type: 'api',
    severity: 'medium',
    pattern: /express\(\)\s*(?!.*helmet)/gi,
    description: 'Missing security headers middleware',
    message: 'Missing Helmet.js: Security headers not configured',
    remediation: 'Add Helmet middleware for security headers: app.use(helmet())',
    owasp: 'A05:2021 - Security Misconfiguration'
  },
  
  // Input Validation
  {
    id: 'missing-input-validation',
    type: 'data',
    severity: 'high',
    pattern: /router\.(post|put|patch)\([^)]*\)\s*,\s*async\s*\([^)]*\)\s*=>\s*\{\s*(?!.*validate|.*check|.*sanitize)/gi,
    description: 'Route without input validation',
    message: 'Missing input validation: User input should be validated',
    remediation: 'Add validation middleware (e.g., express-validator) to validate and sanitize input',
    owasp: 'A03:2021 - Injection'
  },
  
  // Configuration issues
  {
    id: 'debug-mode-enabled',
    type: 'config',
    severity: 'medium',
    pattern: /debug:\s*true|DEBUG\s*=\s*true/gi,
    description: 'Debug mode enabled',
    message: 'Debug mode in production: Should be disabled in production',
    remediation: 'Disable debug mode in production or use environment-based configuration',
    owasp: 'A05:2021 - Security Misconfiguration'
  },
  {
    id: 'exposed-error-details',
    type: 'config',
    severity: 'medium',
    pattern: /res\.(send|json)\s*\(\s*err\.stack|res\.(send|json)\s*\(\s*error\.message/gi,
    description: 'Exposing error details to client',
    message: 'Error details exposed: Stack traces should not be sent to clients',
    remediation: 'Send generic error messages in production, log detailed errors server-side',
    owasp: 'A05:2021 - Security Misconfiguration'
  }
];

/**
 * SecuritySpecialist - Analyzes code for security vulnerabilities
 */
export class SecuritySpecialist {
  private options: SecurityAnalysisOptions;
  private issues: SecurityIssue[] = [];
  private filesAnalyzed = 0;

  constructor(options: SecurityAnalysisOptions) {
    this.options = {
      includeDependencies: true,
      includeFixes: true,
      minSeverity: 'low',
      excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      ...options
    };
  }

  /**
   * Run comprehensive security analysis
   */
  async analyze(): Promise<SecurityReport> {
    const startTime = Date.now();
    this.issues = [];
    this.filesAnalyzed = 0;

    // Get all files to analyze
    const files = await this.getFilesToAnalyze();

    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(file);
      this.filesAnalyzed++;
    }

    // Calculate score
    const score = this.calculateSecurityScore();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Build summary
    const summary = this.buildSummary();

    const durationMs = Date.now() - startTime;

    return {
      summary,
      issues: this.issues,
      score,
      recommendations,
      generatedAt: new Date().toISOString(),
      filesAnalyzed: this.filesAnalyzed,
      durationMs
    };
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
   * Analyze a single file for security issues
   */
  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Filter patterns based on options
      const patterns = this.getApplicablePatterns();

      for (const pattern of patterns) {
        // Check if pattern applies to this file type
        if (pattern.fileExtensions && pattern.fileExtensions.length > 0) {
          const fileExt = filePath.split('.').pop();
          if (!pattern.fileExtensions.includes(`.${fileExt}`)) {
            continue;
          }
        }

        // Search for pattern in file
        const matches = this.findPatternMatches(content, lines, pattern, filePath);
        
        for (const context of matches) {
          const issue = this.createIssueFromContext(context);
          
          // Check if severity meets minimum threshold
          if (this.meetsMinimumSeverity(issue.severity)) {
            this.issues.push(issue);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not analyze ${filePath}`);
    }
  }

  /**
   * Get patterns applicable to current analysis options
   */
  private getApplicablePatterns(): SecurityPattern[] {
    let patterns = SECURITY_PATTERNS;

    // Filter by issue types if specified
    if (this.options.checkTypes && this.options.checkTypes.length > 0) {
      patterns = patterns.filter(p => this.options.checkTypes!.includes(p.type));
    }

    return patterns;
  }

  /**
   * Find all matches of a pattern in file content
   */
  private findPatternMatches(
    content: string,
    lines: string[],
    pattern: SecurityPattern,
    filePath: string
  ): SecurityIssueContext[] {
    const contexts: SecurityIssueContext[] = [];
    const matches = content.matchAll(pattern.pattern);

    for (const match of matches) {
      if (!match.index) continue;

      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      // Get context lines (3 lines before and after)
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
   * Create a SecurityIssue from a detected context
   */
  private createIssueFromContext(context: SecurityIssueContext): SecurityIssue {
    const { pattern, file, line, match, context: contextLines } = context;

    const issue: SecurityIssue = {
      type: pattern.type,
      severity: pattern.severity,
      title: pattern.message,
      description: pattern.description,
      file: file.replace(this.options.path, '.'),
      line,
      codeSnippet: match,
      remediation: pattern.remediation,
      owasp: pattern.owasp
    };

    // Add fix suggestion if enabled
    if (this.options.includeFixes) {
      issue.fixedCode = this.generateFixSuggestion(pattern, match);
    }

    return issue;
  }

  /**
   * Generate a fix suggestion for a detected issue
   */
  private generateFixSuggestion(pattern: SecurityPattern, match: string): string | undefined {
    // Provide specific fix examples based on pattern type
    switch (pattern.id) {
      case 'sql-injection-string-concat':
      case 'sql-injection-query-format':
        return 'const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);';
      
      case 'nosql-injection-find':
        return 'const sanitizedQuery = { _id: mongoose.Types.ObjectId(req.params.id) };\nconst result = await Model.findOne(sanitizedQuery);';
      
      case 'weak-jwt-secret':
        return 'const JWT_SECRET = process.env.JWT_SECRET;\nif (!JWT_SECRET) throw new Error("JWT_SECRET required");';
      
      case 'missing-jwt-expiration':
        return 'const token = jwt.sign(payload, secret, { expiresIn: "1h" });';
      
      case 'hardcoded-credentials':
        return 'const password = process.env.DB_PASSWORD;\nconst apiKey = process.env.API_KEY;';
      
      case 'permissive-cors':
        return 'app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "https://yourdomain.com" }));';
      
      default:
        return undefined;
    }
  }

  /**
   * Check if severity meets minimum threshold
   */
  private meetsMinimumSeverity(severity: SecuritySeverity): boolean {
    const severityOrder: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(this.options.minSeverity || 'low');
    const issueIndex = severityOrder.indexOf(severity);
    return issueIndex >= minIndex;
  }

  /**
   * Calculate overall security score (0-100)
   */
  private calculateSecurityScore(): number {
    if (this.issues.length === 0) return 100;

    // Weight issues by severity
    const weights = { critical: 25, high: 10, medium: 5, low: 2 };
    let totalDeduction = 0;

    for (const issue of this.issues) {
      totalDeduction += weights[issue.severity];
    }

    // Cap deduction at 100
    const score = Math.max(0, 100 - totalDeduction);
    return Math.round(score);
  }

  /**
   * Generate high-level security recommendations
   */
  private generateRecommendations(): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];
    const issuesByType = this.groupIssuesByType();

    // Critical/High severity recommendations
    const criticalIssues = this.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'injection',
        text: `Address ${criticalIssues.length} critical/high severity security issues immediately`,
        files: [...new Set(criticalIssues.map(i => i.file))]
      });
    }

    // Type-specific recommendations
    if (issuesByType.injection && issuesByType.injection.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'injection',
        text: 'Implement input validation and use parameterized queries to prevent injection attacks',
        files: [...new Set(issuesByType.injection.map(i => i.file))]
      });
    }

    if (issuesByType.auth && issuesByType.auth.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'auth',
        text: 'Review authentication and authorization implementation. Use environment variables for secrets.',
        files: [...new Set(issuesByType.auth.map(i => i.file))]
      });
    }

    if (issuesByType.data && issuesByType.data.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'data',
        text: 'Protect sensitive data: use environment variables, avoid logging secrets, use strong encryption',
        files: [...new Set(issuesByType.data.map(i => i.file))]
      });
    }

    if (issuesByType.api && issuesByType.api.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'api',
        text: 'Enhance API security: add rate limiting, configure CORS properly, use Helmet.js',
        files: [...new Set(issuesByType.api.map(i => i.file))]
      });
    }

    return recommendations;
  }

  /**
   * Group issues by type
   */
  private groupIssuesByType(): Record<SecurityIssueType, SecurityIssue[]> {
    const grouped: Partial<Record<SecurityIssueType, SecurityIssue[]>> = {};
    
    for (const issue of this.issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type]!.push(issue);
    }

    return grouped as Record<SecurityIssueType, SecurityIssue[]>;
  }

  /**
   * Build summary statistics
   */
  private buildSummary(): SecuritySummary {
    const summary: SecuritySummary = {
      total: this.issues.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const issue of this.issues) {
      summary[issue.severity]++;
    }

    return summary;
  }

  /**
   * Format report as human-readable text
   */
  formatReport(report: SecurityReport): string {
    let output = '\n🔒 Security Analysis\n\n';
    
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
      output += '✅ No security issues detected!\n\n';
      return output;
    }

    output += '━'.repeat(60) + '\n\n';

    // Group issues by severity
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    const highIssues = report.issues.filter(i => i.severity === 'high');
    const mediumIssues = report.issues.filter(i => i.severity === 'medium');
    const lowIssues = report.issues.filter(i => i.severity === 'low');

    // Display critical issues
    if (criticalIssues.length > 0) {
      output += '🚨 CRITICAL Issues:\n\n';
      criticalIssues.forEach((issue, idx) => {
        output += this.formatIssue(issue, idx + 1);
      });
    }

    // Display high issues
    if (highIssues.length > 0) {
      output += '⚠️  HIGH Issues:\n\n';
      highIssues.forEach((issue, idx) => {
        output += this.formatIssue(issue, idx + 1);
      });
    }

    // Display medium issues (limit to first 5)
    if (mediumIssues.length > 0) {
      output += '⚡ MEDIUM Issues:\n\n';
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
        output += `${idx + 1}. ${priorityEmoji} ${rec.text}\n`;
      });
      output += '\n';
    }

    output += `Analyzed ${report.filesAnalyzed} files in ${report.durationMs}ms\n`;

    return output;
  }

  /**
   * Format a single issue
   */
  private formatIssue(issue: SecurityIssue, index: number): string {
    let output = `${index}. ${issue.title}\n`;
    output += `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
    
    if (issue.codeSnippet) {
      output += `   \n   ${issue.codeSnippet}\n`;
    }
    
    output += `   \n   Remediation: ${issue.remediation}\n`;
    
    if (issue.fixedCode) {
      output += `   \n   ✓ Fixed version:\n   ${issue.fixedCode}\n`;
    }
    
    if (issue.owasp) {
      output += `   OWASP: ${issue.owasp}\n`;
    }
    
    output += '\n';
    
    return output;
  }
}
