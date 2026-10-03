/**
 * Dependency Mapper Agent
 * Orchestrates dependency analysis, vulnerability scanning, and usage tracking
 */

import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';
import { UsageTracker } from '../analyzers/usage-tracker.js';
import type {
  DependencyReport,
  DependencyAnalysisOptions,
  DependencyInfo,
  Vulnerability,
  UpdateSuggestion,
  UpdateRisk,
  PackageJson
} from '../types/dependencies.js';

export interface FormatOptions {
  outdatedOnly?: boolean;
  vulnsOnly?: boolean;
  usageOnly?: boolean;
  suggestUpdates?: boolean;
}

export class DependencyMapperAgent {
  private analyzer: DependencyAnalyzer;
  private tracker: UsageTracker;

  constructor(repoPath: string) {
    this.analyzer = new DependencyAnalyzer(repoPath);
    this.tracker = new UsageTracker(repoPath);
  }

  /**
   * Generate comprehensive dependency analysis report
   */
  async generateReport(options: DependencyAnalysisOptions): Promise<DependencyReport> {
    // Load package.json
    const pkg = await this.analyzer.loadPackageJson();
    
    // Get all dependencies
    let dependencies: { production: DependencyInfo[]; development: DependencyInfo[] };
    let outdated: DependencyInfo[] = [];
    let vulnerabilities: Vulnerability[] = [];
    let usage: { usedInFiles: string[]; importCount: number; isDeclared: boolean; package: string }[] = [];
    let unused: string[] = [];
    let undeclared: string[] = [];

    // Get declared packages list
    const declaredPackages = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];

    // Check outdated if requested
    if (options.checkOutdated) {
      outdated = await this.analyzer.checkOutdated();
      // Merge with getDependencies output to get complete info
      dependencies = {
        production: outdated.filter(d => d.type === 'production'),
        development: outdated.filter(d => d.type === 'development')
      };
    } else {
      dependencies = await this.analyzer.getDependencies();
      // Set latestVersion to currentVersion for non-outdated check
      outdated = [
        ...dependencies.production.map(d => ({ ...d, latestVersion: d.currentVersion })),
        ...dependencies.development.map(d => ({ ...d, latestVersion: d.currentVersion }))
      ];
    }

    // Check vulnerabilities if requested
    if (options.checkVulnerabilities) {
      vulnerabilities = await this.analyzer.scanVulnerabilities();
    }

    // Check usage if requested
    if (options.checkUsage) {
      usage = await this.tracker.trackUsage(declaredPackages);
      unused = await this.tracker.findUnused(declaredPackages);
      undeclared = await this.tracker.findUndeclared(declaredPackages);
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(outdated, vulnerabilities);

    // Build summary
    const vulnCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      total: vulnerabilities.length
    };

    const upToDate = outdated.filter(d => d.updateType === 'none').length;
    const outdatedCount = outdated.filter(d => d.updateType !== 'none').length;

    return {
      timestamp: new Date().toISOString(),
      projectName: pkg.name,
      projectVersion: pkg.version,
      totalDependencies: dependencies.production.length + dependencies.development.length,
      dependencies,
      outdated,
      vulnerabilities,
      usage,
      unused,
      undeclared,
      suggestions,
      summary: {
        upToDate,
        outdated: outdatedCount,
        vulnerabilities: vulnCounts,
        unused: unused.length,
        undeclared: undeclared.length
      }
    };
  }

  /**
   * Generate update suggestions based on outdated deps and vulnerabilities
   */
  generateSuggestions(deps: DependencyInfo[], vulns: Vulnerability[]): UpdateSuggestion[] {
    const suggestions: UpdateSuggestion[] = [];

    // Process outdated dependencies
    const outdatedDeps = deps.filter(d => d.updateType !== 'none' && d.latestVersion && d.latestVersion !== d.currentVersion);

    // Group by risk level
    const safe: DependencyInfo[] = [];
    const review: DependencyInfo[] = [];
    const breaking: DependencyInfo[] = [];

    for (const dep of outdatedDeps) {
      if (dep.updateRisk === 'safe') {
        safe.push(dep);
      } else if (dep.updateRisk === 'review') {
        review.push(dep);
      } else if (dep.updateRisk === 'breaking') {
        breaking.push(dep);
      }
    }

    // Safe updates (patch)
    for (const dep of safe) {
      suggestions.push({
        package: dep.name,
        from: dep.currentVersion,
        to: dep.latestVersion,
        updateType: dep.updateType,
        risk: 'safe',
        reason: 'Safe patch update',
        command: `npm install ${dep.name}@latest`
      });
    }

    // Review updates (minor)
    for (const dep of review) {
      suggestions.push({
        package: dep.name,
        from: dep.currentVersion,
        to: dep.latestVersion,
        updateType: dep.updateType,
        risk: 'review',
        reason: 'Minor update - review changelog recommended',
        command: `npm install ${dep.name}@latest`,
        notes: 'Check changelog for breaking changes'
      });
    }

    // Breaking updates (major)
    for (const dep of breaking) {
      suggestions.push({
        package: dep.name,
        from: dep.currentVersion,
        to: dep.latestVersion,
        updateType: dep.updateType,
        risk: 'breaking',
        reason: 'Major version update - potential breaking changes',
        command: `npm install ${dep.name}@latest`,
        breaking: ['Check migration guide', 'Review breaking changes in changelog', 'Test thoroughly before deploying']
      });
    }

    // Add vulnerability fixes
    const vulnerablePackages = new Set(vulns.map(v => v.package));
    for (const pkgName of vulnerablePackages) {
      const pkgVulns = vulns.filter(v => v.package === pkgName);
      const hasFix = pkgVulns.some(v => v.fixVersion || v.patchedVersions);
      
      if (!hasFix) {
        // No fix available, suggest checking npm audit
        suggestions.push({
          package: pkgName,
          from: 'unknown',
          to: 'latest',
          updateType: 'patch',
          risk: 'review',
          reason: `Security vulnerability found (${pkgVulns.length} issues)`,
          command: `npm audit fix`,
          notes: 'No specific fix version available. Run npm audit for details.'
        });
      }
    }

    return suggestions;
  }

  /**
   * Format report as a readable string
   */
  formatReport(report: DependencyReport, options: FormatOptions = {}): string {
    const lines: string[] = [];

    // Header
    lines.push('📦 Dependency Analysis');
    lines.push('');
    
    const prodCount = report.dependencies.production.length;
    const devCount = report.dependencies.development.length;
    lines.push(`Total Dependencies: ${report.totalDependencies} (${prodCount} prod, ${devCount} dev)`);
    lines.push('');

    // Show outdated section (unless filtered out)
    if (!options.usageOnly) {
      const outdatedDeps = report.outdated.filter(d => d.updateType !== 'none');
      if (outdatedDeps.length > 0 && !options.vulnsOnly) {
        lines.push(`⚠️  Outdated Packages (${outdatedDeps.length}):`);
        for (const dep of outdatedDeps) {
          const riskEmoji = this.getRiskEmoji(dep.updateRisk);
          lines.push(`  • ${dep.name}: ${dep.currentVersion} → ${dep.latestVersion} (${dep.updateType}) ${riskEmoji}`);
        }
        lines.push('');
      }
    }

    // Show vulnerabilities section (unless filtered out)
    if (!options.usageOnly && !options.outdatedOnly) {
      if (report.vulnerabilities.length > 0 || options.vulnsOnly) {
        lines.push(`🔒 Security Issues (${report.vulnerabilities.length}):`);
        for (const vuln of report.vulnerabilities) {
          const severityLabel = this.getSeverityLabel(vuln.severity);
          const fixCmd = vuln.fixVersion 
            ? `npm install ${vuln.package}@${vuln.fixVersion}` 
            : 'npm audit fix';
          lines.push(`  • ${severityLabel}: ${vuln.package}@${vuln.foundIn[0] || 'unknown'}${vuln.cve ? ` (${vuln.cve})` : ''}`);
          lines.push(`    Fix: ${fixCmd}`);
        }
        lines.push('');
      }
    }

    // Show usage section (unless filtered out)
    if (!options.outdatedOnly && !options.vulnsOnly) {
      if (report.unused.length > 0 || report.undeclared.length > 0 || options.usageOnly) {
        lines.push('📊 Usage Analysis:');
        if (report.unused.length > 0) {
          lines.push(`  • Unused (${report.unused.length}): ${report.unused.join(', ')}`);
        }
        if (report.undeclared.length > 0) {
          lines.push(`  • Undeclared (${report.undeclared.length}): ${report.undeclared.join(', ')}`);
        }
        lines.push('');
      }
    }

    // Show suggestions section (if requested)
    if (options.suggestUpdates && report.suggestions.length > 0) {
      lines.push('💡 Suggested Updates:');
      
      const safeSuggestions = report.suggestions.filter(s => s.risk === 'safe');
      const reviewSuggestions = report.suggestions.filter(s => s.risk === 'review');
      const breakingSuggestions = report.suggestions.filter(s => s.risk === 'breaking');
      const vulnSuggestions = report.suggestions.filter(s => s.reason.includes('Security vulnerability'));

      if (safeSuggestions.length > 0) {
        lines.push('  Safe updates:');
        const pkgs = safeSuggestions.map(s => `${s.package}@latest`).join(' ');
        lines.push(`    npm install ${pkgs}`);
        lines.push('');
      }

      if (reviewSuggestions.length > 0) {
        lines.push('  Requires review:');
        for (const s of reviewSuggestions) {
          const note = s.notes ? ` # ${s.notes}` : '';
          lines.push(`    npm install ${s.package}@latest${note}`);
        }
        lines.push('');
      }

      if (breakingSuggestions.length > 0) {
        lines.push('  Breaking changes:');
        for (const s of breakingSuggestions) {
          const breakingNotes = s.breaking?.map(b => `    - ${b}`).join('\n') || '';
          lines.push(`    npm install ${s.package}@latest  # Breaking changes - check docs`);
          if (breakingNotes) {
            lines.push(breakingNotes);
          }
        }
        lines.push('');
      }

      if (vulnSuggestions.length > 0) {
        lines.push('  Security fixes:');
        lines.push('    npm audit fix');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private getRiskEmoji(risk: UpdateRisk): string {
    switch (risk) {
      case 'safe':
        return '✅ Safe';
      case 'review':
        return '⚠️  Review';
      case 'breaking':
        return '⚠️  Breaking changes';
      default:
        return '';
    }
  }

  private getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'CRITICAL';
      case 'high':
        return 'HIGH';
      case 'moderate':
        return 'MODERATE';
      case 'low':
        return 'LOW';
      default:
        return severity.toUpperCase();
    }
  }
}