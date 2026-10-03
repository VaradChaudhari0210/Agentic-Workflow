/**
 * Project Structure Analyzer - Analyzes directory structure and identifies patterns
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { ProjectStructure, DirectoryInfo, StructurePattern } from '../types/architecture.js';

export class ProjectStructureAnalyzer {
  constructor(private repoPath: string) {}

  async analyze(): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      root: this.repoPath,
      src: await this.findSourceDirectory(),
      entryPoints: await this.findEntryPoints(),
      testLocation: await this.findTestLocation(),
      configFiles: await this.findConfigFiles(),
      directories: await this.analyzeDirectories(),
      patterns: await this.detectPatterns()
    };

    return structure;
  }

  private async findSourceDirectory(): Promise<string> {
    const candidates = ['src', 'lib', 'app', 'source'];
    
    for (const candidate of candidates) {
      try {
        const path = join(this.repoPath, candidate);
        const stats = await stat(path);
        if (stats.isDirectory()) {
          return candidate;
        }
      } catch {
        continue;
      }
    }

    return '.'; // Root is source
  }

  private async findEntryPoints(): Promise<string[]> {
    const entryPoints: string[] = [];

    // Check package.json
    try {
      const pkgPath = join(this.repoPath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      
      if (pkg.main) entryPoints.push(pkg.main);
      if (pkg.module) entryPoints.push(pkg.module);
      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          entryPoints.push(pkg.bin);
        } else {
          const binValues = Object.values(pkg.bin) as string[];
          entryPoints.push(...binValues);
        }
      }
    } catch {
      // Ignore
    }

    // Common entry points
    const commonEntries = [
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'src/app.ts',
      'src/app.js',
      'src/server.ts',
      'src/server.js',
      'index.ts',
      'index.js',
      'main.ts',
      'main.js'
    ];

    for (const entry of commonEntries) {
      try {
        const path = join(this.repoPath, entry);
        await stat(path);
        if (!entryPoints.includes(entry)) {
          entryPoints.push(entry);
        }
      } catch {
        continue;
      }
    }

    return entryPoints;
  }

  private async findTestLocation(): Promise<string> {
    const candidates = [
      'tests',
      'test',
      '__tests__',
      'spec',
      'src/__tests__',
      'src/tests'
    ];

    for (const candidate of candidates) {
      try {
        const path = join(this.repoPath, candidate);
        const stats = await stat(path);
        if (stats.isDirectory()) {
          return candidate;
        }
      } catch {
        continue;
      }
    }

    // Check if tests are co-located
    try {
      const srcPath = join(this.repoPath, 'src');
      const files = await this.getAllFiles(srcPath);
      const hasTests = files.some(f => 
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
      );
      
      if (hasTests) {
        return 'src (co-located)';
      }
    } catch {
      // Ignore
    }

    return 'unknown';
  }

  private async findConfigFiles(): Promise<string[]> {
    const configFiles: string[] = [];
    
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'jsconfig.json',
      'vite.config.ts',
      'vite.config.js',
      'webpack.config.js',
      'rollup.config.js',
      'jest.config.js',
      'jest.config.ts',
      'vitest.config.ts',
      'vitest.config.js',
      '.eslintrc.js',
      '.eslintrc.json',
      '.prettierrc',
      '.prettierrc.json',
      'babel.config.js',
      '.babelrc',
      'next.config.js',
      'nuxt.config.js',
      'docker-compose.yml',
      'Dockerfile',
      '.env.example',
      'prisma/schema.prisma'
    ];

    for (const pattern of configPatterns) {
      try {
        const path = join(this.repoPath, pattern);
        await stat(path);
        configFiles.push(pattern);
      } catch {
        continue;
      }
    }

    return configFiles;
  }

  private async analyzeDirectories(): Promise<DirectoryInfo[]> {
    const directories: DirectoryInfo[] = [];
    
    try {
      const srcPath = await this.findSourceDirectory();
      const basePath = join(this.repoPath, srcPath);
      
      const dirs = await this.getDirectories(basePath);
      
      for (const dir of dirs) {
        const fullPath = join(basePath, dir);
        const files = await this.countFiles(fullPath);
        const subdirs = await this.countSubdirectories(fullPath);
        
        directories.push({
          name: dir,
          path: relative(this.repoPath, fullPath),
          purpose: this.guessPurpose(dir),
          fileCount: files,
          subdirectories: subdirs
        });
      }
    } catch {
      // Ignore if src directory doesn't exist
    }

    return directories;
  }

  private async detectPatterns(): Promise<StructurePattern[]> {
    const patterns: StructurePattern[] = [];

    // MVC pattern
    const hasMVC = await this.hasPattern(['models', 'views', 'controllers']);
    if (hasMVC) {
      patterns.push({
        pattern: 'MVC',
        description: 'Model-View-Controller architecture',
        files: ['models/', 'views/', 'controllers/']
      });
    }

    // Layered architecture
    const hasLayered = await this.hasPattern(['controllers', 'services', 'repositories']);
    if (hasLayered) {
      patterns.push({
        pattern: 'Layered',
        description: 'Controller-Service-Repository pattern',
        files: ['controllers/', 'services/', 'repositories/']
      });
    }

    // Feature-based
    const hasFeatures = await this.hasPattern(['features', 'modules']);
    if (hasFeatures) {
      patterns.push({
        pattern: 'Feature-based',
        description: 'Organized by feature/module',
        files: ['features/', 'modules/']
      });
    }

    // Domain-driven
    const hasDDD = await this.hasPattern(['domain', 'application', 'infrastructure']);
    if (hasDDD) {
      patterns.push({
        pattern: 'Domain-Driven Design',
        description: 'DDD architecture',
        files: ['domain/', 'application/', 'infrastructure/']
      });
    }

    return patterns;
  }

  private async hasPattern(dirs: string[]): Promise<boolean> {
    const srcPath = join(this.repoPath, await this.findSourceDirectory());
    
    let found = 0;
    for (const dir of dirs) {
      try {
        const path = join(srcPath, dir);
        await stat(path);
        found++;
      } catch {
        continue;
      }
    }

    return found >= 2; // At least 2 out of 3
  }

  private guessPurpose(dirName: string): string {
    const purposes: Record<string, string> = {
      'models': 'Data models and schemas',
      'controllers': 'Request handlers',
      'services': 'Business logic',
      'repositories': 'Data access layer',
      'routes': 'API routes',
      'middleware': 'Express/API middleware',
      'utils': 'Utility functions',
      'helpers': 'Helper functions',
      'config': 'Configuration',
      'types': 'TypeScript type definitions',
      'dto': 'Data transfer objects',
      'entities': 'Database entities',
      'schemas': 'Validation schemas',
      'guards': 'Authorization guards',
      'decorators': 'Custom decorators',
      'interceptors': 'Request/response interceptors',
      'pipes': 'Data transformation pipes',
      'modules': 'Feature modules',
      'features': 'Feature implementations',
      'domain': 'Domain logic',
      'infrastructure': 'Infrastructure layer',
      'application': 'Application layer',
      'presentation': 'Presentation layer',
      'api': 'API layer',
      'common': 'Shared/common code',
      'shared': 'Shared resources',
      'lib': 'Library code'
    };

    return purposes[dirName.toLowerCase()] || 'Unknown';
  }

  private async getDirectories(path: string): Promise<string[]> {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .filter(e => !e.name.startsWith('.'))
        .filter(e => e.name !== 'node_modules')
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  private async countFiles(path: string): Promise<number> {
    try {
      const files = await this.getAllFiles(path);
      return files.length;
    } catch {
      return 0;
    }
  }

  private async countSubdirectories(path: string): Promise<number> {
    try {
      const dirs = await this.getDirectories(path);
      return dirs.length;
    } catch {
      return 0;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }
}
