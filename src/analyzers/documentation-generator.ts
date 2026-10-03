/**
 * Documentation Generator - Creates markdown documentation from architecture analysis
 */

import { ArchitectureReport, DependencySummary } from '../types/architecture.js';

export class DocumentationGenerator {
  generate(report: ArchitectureReport): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(report));
    sections.push('');
    
    // Overview
    sections.push(this.generateOverview(report));
    sections.push('');
    
    // Tech Stack
    sections.push(this.generateTechStack(report));
    sections.push('');
    
    // Project Structure
    sections.push(this.generateStructure(report));
    sections.push('');
    
    // Dependencies
    sections.push(this.generateDependencies(report));
    sections.push('');
    
    // Entry Points
    sections.push(this.generateEntryPoints(report));
    sections.push('');
    
    // Build Scripts
    sections.push(this.generateBuildScripts(report));
    sections.push('');

    // Footer
    sections.push(this.generateFooter(report));

    return sections.join('\n');
  }

  private generateHeader(report: ArchitectureReport): string {
    return `# ${report.projectName} - Architecture Documentation

**Generated:** ${report.generatedAt.toISOString()}  
**Confidence:** ${report.confidence}

---`;
  }

  private generateOverview(report: ArchitectureReport): string {
    const { techStack } = report;
    
    return `## Overview

This is a ${techStack.language} project using ${techStack.framework || 'Node.js'} as the primary framework${techStack.database ? ` with ${techStack.database} database` : ''}.`;
  }

  private generateTechStack(report: ArchitectureReport): string {
    const { techStack } = report;
    const lines: string[] = ['## Tech Stack', ''];

    lines.push(`- **Language:** ${techStack.language}${techStack.version ? ` ${techStack.version}` : ''}`);
    
    if (techStack.runtime) {
      lines.push(`- **Runtime:** ${techStack.runtime}`);
    }

    if (techStack.framework) {
      lines.push(`- **Framework:** ${techStack.framework}${techStack.frameworkVersion ? ` ${techStack.frameworkVersion}` : ''}`);
    }

    if (techStack.api) {
      lines.push(`- **API:** ${techStack.api}`);
    }

    if (techStack.database) {
      lines.push(`- **Database:** ${techStack.database}`);
    }

    if (techStack.orm) {
      lines.push(`- **ORM:** ${techStack.orm}`);
    }

    if (techStack.buildTool) {
      lines.push(`- **Build:** ${techStack.buildTool}`);
    }

    if (techStack.testing) {
      lines.push(`- **Testing:** ${techStack.testing}`);
    }

    if (techStack.packageManager) {
      lines.push(`- **Package Manager:** ${techStack.packageManager}`);
    }

    return lines.join('\n');
  }

  private generateStructure(report: ArchitectureReport): string {
    const { structure } = report;
    const lines: string[] = ['## Project Structure', ''];

    // Show structure tree
    lines.push('```');
    lines.push(`${structure.src}/`);
    
    for (const dir of structure.directories.slice(0, 15)) { // Limit to 15 dirs
      const indent = '├── ';
      lines.push(`${indent}${dir.name}/`);
      if (dir.purpose) {
        lines.push(`│   └── ${dir.purpose} (${dir.fileCount} files)`);
      }
    }
    
    lines.push('```');
    lines.push('');

    // Patterns
    if (structure.patterns.length > 0) {
      lines.push('### Architecture Patterns', '');
      for (const pattern of structure.patterns) {
        lines.push(`- **${pattern.pattern}**: ${pattern.description}`);
      }
      lines.push('');
    }

    // Directory purposes
    if (structure.directories.length > 0) {
      lines.push('### Key Directories', '');
      for (const dir of structure.directories.slice(0, 10)) {
        if (dir.purpose) {
          lines.push(`- \`${dir.path}/\` - ${dir.purpose}`);
        }
      }
    }

    return lines.join('\n');
  }

  private generateDependencies(report: ArchitectureReport): string {
    const lines: string[] = ['## Key Dependencies', ''];

    // Group by category
    const byCategory = this.groupByCategory(report.dependencies);

    for (const [category, deps] of Object.entries(byCategory)) {
      if (deps.length === 0) continue;

      lines.push(`### ${this.formatCategory(category)}`, '');
      
      for (const dep of deps.slice(0, 10)) { // Top 10 per category
        lines.push(`- **${dep.name}** \`${dep.version}\` - ${dep.purpose}`);
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateEntryPoints(report: ArchitectureReport): string {
    const lines: string[] = ['## Entry Points', ''];

    if (report.entryPoints.length === 0) {
      lines.push('No entry points detected.');
      return lines.join('\n');
    }

    for (const entry of report.entryPoints) {
      lines.push(`- **${entry.type}**: \`${entry.file}\``);
      if (entry.description) {
        lines.push(`  - ${entry.description}`);
      }
    }

    return lines.join('\n');
  }

  private generateBuildScripts(report: ArchitectureReport): string {
    const lines: string[] = ['## Build Scripts', ''];

    if (report.buildScripts.length === 0) {
      lines.push('No build scripts defined.');
      return lines.join('\n');
    }

    for (const script of report.buildScripts) {
      lines.push(`- **${script.name}**: \`${script.command}\``);
      if (script.purpose) {
        lines.push(`  - ${script.purpose}`);
      }
    }

    return lines.join('\n');
  }

  private generateFooter(report: ArchitectureReport): string {
    return `---

## Configuration Files

${report.structure.configFiles.map(f => `- \`${f}\``).join('\n')}

---

*This documentation was auto-generated by the Backend Engineer Agent.*  
*Last updated: ${report.generatedAt.toISOString()}*`;
  }

  private groupByCategory(deps: DependencySummary[]): Record<string, DependencySummary[]> {
    const grouped: Record<string, DependencySummary[]> = {
      runtime: [],
      dev: [],
      build: [],
      test: []
    };

    for (const dep of deps) {
      grouped[dep.category].push(dep);
    }

    // Sort by importance
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => {
        const order = { critical: 0, major: 1, minor: 2 };
        return order[a.importance] - order[b.importance];
      });
    }

    return grouped;
  }

  private formatCategory(category: string): string {
    const names: Record<string, string> = {
      runtime: 'Runtime Dependencies',
      dev: 'Development Dependencies',
      build: 'Build Tools',
      test: 'Testing Dependencies'
    };
    return names[category] || category;
  }
}
