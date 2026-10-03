/**
 * Usage Tracker
 * Tracks which packages are actually used in the codebase
 */

import { readdir, readFile } from 'fs/promises';
import { join, extname, relative } from 'path';
import type { UsageInfo, PackageJson } from '../types/dependencies.js';

export class UsageTracker {
  private repoPath: string;
  private excludePatterns: string[];

  constructor(repoPath: string, excludePatterns: string[] = ['node_modules', '.git', 'dist', 'build', 'coverage']) {
    this.repoPath = repoPath;
    this.excludePatterns = excludePatterns;
  }

  /**
   * Track package usage across the codebase
   */
  async trackUsage(declaredPackages: string[]): Promise<UsageInfo[]> {
    const files = await this.scanFiles(this.repoPath);
    const usageMap = new Map<string, Set<string>>();

    // Scan all files for imports
    for (const file of files) {
      const imports = await this.extractImports(file);
      
      for (const importedPackage of imports) {
        if (!usageMap.has(importedPackage)) {
          usageMap.set(importedPackage, new Set());
        }
        usageMap.get(importedPackage)!.add(relative(this.repoPath, file));
      }
    }

    // Build usage info
    const usageInfo: UsageInfo[] = [];

    // Check all used packages
    for (const [packageName, files] of usageMap.entries()) {
      usageInfo.push({
        package: packageName,
        usedInFiles: Array.from(files),
        importCount: files.size,
        isDeclared: declaredPackages.includes(packageName)
      });
    }

    // Add unused declared packages
    for (const packageName of declaredPackages) {
      if (!usageMap.has(packageName)) {
        usageInfo.push({
          package: packageName,
          usedInFiles: [],
          importCount: 0,
          isDeclared: true
        });
      }
    }

    return usageInfo;
  }

  /**
   * Find unused dependencies
   */
  async findUnused(declaredPackages: string[]): Promise<string[]> {
    const usage = await this.trackUsage(declaredPackages);
    return usage
      .filter(u => u.isDeclared && u.importCount === 0)
      .map(u => u.package);
  }

  /**
   * Find undeclared dependencies (used but not in package.json)
   */
  async findUndeclared(declaredPackages: string[]): Promise<string[]> {
    const usage = await this.trackUsage(declaredPackages);
    return usage
      .filter(u => !u.isDeclared && u.importCount > 0)
      .map(u => u.package);
  }

  /**
   * Scan directory for code files
   */
  private async scanFiles(dir: string, files: string[] = []): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.excludePatterns.some(pattern => entry.name.includes(pattern))) {
            await this.scanFiles(fullPath, files);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return files;
  }

  /**
   * Extract imported package names from a file
   */
  private async extractImports(filePath: string): Promise<string[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const packages = new Set<string>();

      // ES6 imports: import ... from 'package'
      const es6ImportRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = es6ImportRegex.exec(content)) !== null) {
        const packageName = this.extractPackageName(match[1]);
        if (packageName) {
          packages.add(packageName);
        }
      }

      // CommonJS require: require('package')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const packageName = this.extractPackageName(match[1]);
        if (packageName) {
          packages.add(packageName);
        }
      }

      // Dynamic imports: import('package')
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const packageName = this.extractPackageName(match[1]);
        if (packageName) {
          packages.add(packageName);
        }
      }

      return Array.from(packages);
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract package name from import path
   * Examples:
   *   'express' -> 'express'
   *   '@types/node' -> '@types/node'
   *   'express/lib/router' -> 'express'
   *   './local/file' -> null (skip relative imports)
   */
  private extractPackageName(importPath: string): string | null {
    // Skip relative imports
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return null;
    }

    // Skip node built-ins
    const builtins = [
      'fs', 'path', 'http', 'https', 'crypto', 'util', 'os', 'events',
      'stream', 'buffer', 'child_process', 'net', 'url', 'querystring',
      'assert', 'console', 'process', 'timers', 'zlib', 'dns', 'cluster'
    ];
    
    if (builtins.includes(importPath) || importPath.startsWith('node:')) {
      return null;
    }

    // Handle scoped packages (@org/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return importPath;
    }

    // Regular packages - take first part before /
    const firstPart = importPath.split('/')[0];
    return firstPart;
  }

  /**
   * Get usage statistics
   */
  async getStats(declaredPackages: string[]): Promise<{
    total: number;
    used: number;
    unused: number;
    undeclared: number;
  }> {
    const usage = await this.trackUsage(declaredPackages);
    
    const used = usage.filter(u => u.isDeclared && u.importCount > 0).length;
    const unused = usage.filter(u => u.isDeclared && u.importCount === 0).length;
    const undeclared = usage.filter(u => !u.isDeclared && u.importCount > 0).length;

    return {
      total: declaredPackages.length,
      used,
      unused,
      undeclared
    };
  }
}
