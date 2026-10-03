/**
 * Architecture Documenter Agent - Generates comprehensive architecture documentation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { TechStackDetector } from '../analyzers/tech-stack-detector.js';
import { ProjectStructureAnalyzer } from '../analyzers/project-structure.js';
import { DocumentationGenerator } from '../analyzers/documentation-generator.js';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';
import { 
  ArchitectureReport, 
  DependencySummary, 
  EntryPointInfo,
  BuildScript 
} from '../types/architecture.js';

export class ArchitectureDocumenterAgent {
  private techStackDetector: TechStackDetector;
  private structureAnalyzer: ProjectStructureAnalyzer;
  private docGenerator: DocumentationGenerator;
  private depAnalyzer: DependencyAnalyzer;

  constructor(private repoPath: string) {
    this.techStackDetector = new TechStackDetector(repoPath);
    this.structureAnalyzer = new ProjectStructureAnalyzer(repoPath);
    this.docGenerator = new DocumentationGenerator();
    this.depAnalyzer = new DependencyAnalyzer(repoPath);
  }

  async generateArchitectureReport(): Promise<ArchitectureReport> {
    console.log('📊 Analyzing project architecture...\n');

    // Detect tech stack
    console.log('  🔍 Detecting tech stack...');
    const techStack = await this.techStackDetector.detect();
    console.log(`  ✓ Tech stack: ${techStack.language}, ${techStack.framework || 'Node.js'}`);

    // Analyze structure
    console.log('  🏗️  Analyzing project structure...');
    const structure = await this.structureAnalyzer.analyze();
    console.log(`  ✓ Structure: ${structure.directories.length} directories, ${structure.patterns.length} patterns`);

    // Analyze dependencies
    console.log('  📦 Analyzing dependencies...');
    const dependencies = await this.analyzeDependencies();
    console.log(`  ✓ Dependencies: ${dependencies.length} key dependencies`);

    // Find entry points
    console.log('  🚪 Finding entry points...');
    const entryPoints = await this.findEntryPoints();
    console.log(`  ✓ Entry points: ${entryPoints.length} found`);

    // Extract build scripts
    console.log('  🔨 Extracting build scripts...');
    const buildScripts = await this.extractBuildScripts();
    console.log(`  ✓ Build scripts: ${buildScripts.length} found\n`);

    const report: ArchitectureReport = {
      projectName: await this.getProjectName(),
      techStack,
      structure,
      dependencies,
      entryPoints,
      buildScripts,
      generatedAt: new Date(),
      confidence: this.assessConfidence(techStack, structure, dependencies)
    };

    return report;
  }

  async generateDocumentation(): Promise<string> {
    const report = await this.generateArchitectureReport();
    return this.docGenerator.generate(report);
  }

  private async analyzeDependencies(): Promise<DependencySummary[]> {
    try {
      const deps = await this.depAnalyzer.getDependencies();
      const summaries: DependencySummary[] = [];

      // Convert production dependencies
      for (const dep of deps.production) {
        summaries.push({
          name: dep.name,
          version: dep.currentVersion,
          purpose: this.guessPurpose(dep.name),
          category: 'runtime',
          importance: this.assessImportance(dep.name, 'runtime')
        });
      }

      // Convert dev dependencies
      for (const dep of deps.development) {
        summaries.push({
          name: dep.name,
          version: dep.currentVersion,
          purpose: this.guessPurpose(dep.name),
          category: 'dev',
          importance: this.assessImportance(dep.name, 'dev')
        });
      }

      return summaries.slice(0, 30); // Top 30 dependencies
    } catch {
      // If dependency analysis fails, return empty array
      return [];
    }
  }

  private async findEntryPoints(): Promise<EntryPointInfo[]> {
    const entryPoints: EntryPointInfo[] = [];

    try {
      const pkgPath = join(this.repoPath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      if (pkg.main) {
        entryPoints.push({
          file: pkg.main,
          type: 'main',
          description: 'Main entry point'
        });
      }

      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          entryPoints.push({
            file: pkg.bin,
            type: 'cli',
            description: 'CLI entry point'
          });
        } else {
          Object.entries(pkg.bin).forEach(([name, file]) => {
            entryPoints.push({
              file: file as string,
              type: 'cli',
              description: `CLI command: ${name}`
            });
          });
        }
      }
    } catch {
      // Ignore
    }

    return entryPoints;
  }

  private async extractBuildScripts(): Promise<BuildScript[]> {
    const scripts: BuildScript[] = [];

    try {
      const pkgPath = join(this.repoPath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      if (pkg.scripts) {
        const scriptPurposes: Record<string, string> = {
          'dev': 'Development server',
          'build': 'Production build',
          'start': 'Start production server',
          'test': 'Run tests',
          'lint': 'Lint code',
          'format': 'Format code',
          'typecheck': 'Type checking',
          'prebuild': 'Pre-build tasks',
          'postbuild': 'Post-build tasks'
        };

        for (const [name, command] of Object.entries(pkg.scripts)) {
          scripts.push({
            name,
            command: command as string,
            purpose: scriptPurposes[name] || ''
          });
        }
      }
    } catch {
      // Ignore
    }

    return scripts;
  }

  private async getProjectName(): Promise<string> {
    try {
      const pkgPath = join(this.repoPath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      return pkg.name || 'Unknown Project';
    } catch {
      return 'Unknown Project';
    }
  }

  private guessPurpose(depName: string): string {
    const purposes: Record<string, string> = {
      'express': 'Web framework',
      'fastify': 'Web framework',
      '@nestjs/core': 'Application framework',
      'prisma': 'Database ORM',
      'typeorm': 'Database ORM',
      'mongoose': 'MongoDB ODM',
      '@prisma/client': 'Database client',
      'pg': 'PostgreSQL client',
      'mysql2': 'MySQL client',
      'redis': 'Redis client',
      'typescript': 'TypeScript compiler',
      'vitest': 'Testing framework',
      'jest': 'Testing framework',
      'eslint': 'Linting',
      'prettier': 'Code formatting',
      'dotenv': 'Environment variables',
      'zod': 'Schema validation',
      'joi': 'Validation',
      'bcrypt': 'Password hashing',
      'jsonwebtoken': 'JWT authentication',
      'passport': 'Authentication middleware',
      'cors': 'CORS middleware',
      'helmet': 'Security middleware',
      'morgan': 'HTTP logging',
      'winston': 'Logging',
      'pino': 'Logging'
    };

    return purposes[depName] || 'Utility';
  }

  private assessImportance(depName: string, category: string): 'critical' | 'major' | 'minor' {
    const critical = [
      'express', 'fastify', '@nestjs/core', 'typescript',
      'prisma', '@prisma/client', 'typeorm', 'mongoose',
      'pg', 'mysql2', 'mongodb'
    ];

    const major = [
      'zod', 'joi', 'jsonwebtoken', 'passport',
      'dotenv', 'vitest', 'jest'
    ];

    if (critical.includes(depName)) return 'critical';
    if (major.includes(depName)) return 'major';
    return 'minor';
  }

  private assessConfidence(
    techStack: any,
    structure: any,
    dependencies: DependencySummary[]
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Check if key components detected
    if (techStack.framework) score += 2;
    if (techStack.database) score += 2;
    if (techStack.testing) score += 1;
    if (structure.patterns.length > 0) score += 2;
    if (structure.directories.length > 3) score += 1;
    if (dependencies.length > 10) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}
