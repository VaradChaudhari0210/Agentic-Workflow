/**
 * Dependency Analyzer
 * Analyzes project dependencies, checks for updates and vulnerabilities
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  PackageJson,
  DependencyInfo,
  Vulnerability,
  UpdateType,
  UpdateRisk,
  DependencyType,
  NpmAuditOutput,
  DependencyAnalysisOptions
} from '../types/dependencies.js';

const execAsync = promisify(exec);

export class DependencyAnalyzer {
  private repoPath: string;
  private packageJson: PackageJson | null = null;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * Load and parse package.json
   */
  async loadPackageJson(): Promise<PackageJson> {
    if (this.packageJson) {
      return this.packageJson;
    }

    const packageJsonPath = join(this.repoPath, 'package.json');
    const content = await readFile(packageJsonPath, 'utf-8');
    this.packageJson = JSON.parse(content);
    return this.packageJson!;
  }

  /**
   * Get all dependencies
   */
  async getDependencies(): Promise<{
    production: DependencyInfo[];
    development: DependencyInfo[];
  }> {
    const pkg = await this.loadPackageJson();

    const production: DependencyInfo[] = [];
    const development: DependencyInfo[] = [];

    // Production dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        production.push({
          name,
          currentVersion: this.cleanVersion(version),
          latestVersion: '', // Will be filled by checkOutdated
          type: 'production',
          updateType: 'none',
          updateRisk: 'safe'
        });
      }
    }

    // Development dependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        development.push({
          name,
          currentVersion: this.cleanVersion(version),
          latestVersion: '', // Will be filled by checkOutdated
          type: 'development',
          updateType: 'none',
          updateRisk: 'safe'
        });
      }
    }

    return { production, development };
  }

  /**
   * Check for outdated packages
   */
  async checkOutdated(): Promise<DependencyInfo[]> {
    const { production, development } = await this.getDependencies();
    const allDeps = [...production, ...development];

    // Use npm outdated to get update information
    try {
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: this.repoPath,
        timeout: 30000
      });

      if (!stdout.trim()) {
        // No outdated packages
        return allDeps.map(dep => ({
          ...dep,
          latestVersion: dep.currentVersion,
          updateType: 'none'
        }));
      }

      const outdatedData = JSON.parse(stdout);
      
      return allDeps.map(dep => {
        const outdatedInfo = outdatedData[dep.name];
        
        if (!outdatedInfo) {
          return {
            ...dep,
            latestVersion: dep.currentVersion,
            updateType: 'none'
          };
        }

        const current = this.cleanVersion(outdatedInfo.current || dep.currentVersion);
        const latest = this.cleanVersion(outdatedInfo.latest);
        const updateType = this.determineUpdateType(current, latest);
        const updateRisk = this.assessUpdateRisk(updateType);

        return {
          ...dep,
          currentVersion: current,
          latestVersion: latest,
          updateType,
          updateRisk
        };
      });
    } catch (error) {
      // npm outdated exits with code 1 if there are outdated packages
      // Try to parse the output anyway
      if (error && typeof error === 'object' && 'stdout' in error) {
        const stdout = (error as any).stdout as string;
        if (stdout && stdout.trim()) {
          try {
            const outdatedData = JSON.parse(stdout);
            return allDeps.map(dep => {
              const outdatedInfo = outdatedData[dep.name];
              if (!outdatedInfo) {
                return {
                  ...dep,
                  latestVersion: dep.currentVersion,
                  updateType: 'none' as UpdateType
                };
              }

              const current = this.cleanVersion(outdatedInfo.current || dep.currentVersion);
              const latest = this.cleanVersion(outdatedInfo.latest);
              const updateType = this.determineUpdateType(current, latest);
              const updateRisk = this.assessUpdateRisk(updateType);

              return {
                ...dep,
                currentVersion: current,
                latestVersion: latest,
                updateType,
                updateRisk
              };
            });
          } catch {
            // Fall through to default
          }
        }
      }

      // Return dependencies with current versions as latest
      return allDeps.map(dep => ({
        ...dep,
        latestVersion: dep.currentVersion,
        updateType: 'none' as UpdateType
      }));
    }
  }

  /**
   * Scan for security vulnerabilities
   */
  async scanVulnerabilities(): Promise<Vulnerability[]> {
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: this.repoPath,
        timeout: 30000
      });

      const auditData: NpmAuditOutput = JSON.parse(stdout);
      const vulnerabilities: Vulnerability[] = [];

      if (!auditData.vulnerabilities) {
        return [];
      }

      // Parse vulnerabilities
      for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
        // Extract via information (advisory details)
        const vias = Array.isArray(vulnData.via) ? vulnData.via : [vulnData.via];
        
        for (const via of vias) {
          if (typeof via === 'object' && via.title) {
            vulnerabilities.push({
              id: via.source || packageName,
              package: packageName,
              severity: vulnData.severity,
              title: via.title,
              description: via.title, // npm v7+ doesn't include full description
              vulnerableVersions: vulnData.range,
              patchedVersions: vulnData.fixAvailable ? 
                (typeof vulnData.fixAvailable === 'object' ? vulnData.fixAvailable.version : undefined) : 
                undefined,
              fixVersion: vulnData.fixAvailable ? 
                (typeof vulnData.fixAvailable === 'object' ? vulnData.fixAvailable.version : undefined) : 
                undefined,
              cve: via.url?.match(/CVE-\d{4}-\d+/)?.[0],
              cwe: via.cwe?.join(', '),
              url: via.url,
              foundIn: vulnData.nodes || []
            });
          }
        }
      }

      return vulnerabilities;
    } catch (error) {
      // npm audit exits with non-zero if vulnerabilities found
      if (error && typeof error === 'object' && 'stdout' in error) {
        const stdout = (error as any).stdout as string;
        if (stdout && stdout.trim()) {
          try {
            const auditData: NpmAuditOutput = JSON.parse(stdout);
            const vulnerabilities: Vulnerability[] = [];

            if (auditData.vulnerabilities) {
              for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
                const vias = Array.isArray(vulnData.via) ? vulnData.via : [vulnData.via];
                
                for (const via of vias) {
                  if (typeof via === 'object' && via.title) {
                    vulnerabilities.push({
                      id: via.source || packageName,
                      package: packageName,
                      severity: vulnData.severity,
                      title: via.title,
                      description: via.title,
                      vulnerableVersions: vulnData.range,
                      patchedVersions: vulnData.fixAvailable ? 
                        (typeof vulnData.fixAvailable === 'object' ? vulnData.fixAvailable.version : undefined) : 
                        undefined,
                      fixVersion: vulnData.fixAvailable ? 
                        (typeof vulnData.fixAvailable === 'object' ? vulnData.fixAvailable.version : undefined) : 
                        undefined,
                      cve: via.url?.match(/CVE-\d{4}-\d+/)?.[0],
                      cwe: via.cwe?.join(', '),
                      url: via.url,
                      foundIn: vulnData.nodes || []
                    });
                  }
                }
              }
            }

            return vulnerabilities;
          } catch {
            return [];
          }
        }
      }
      return [];
    }
  }

  /**
   * Clean version string (remove ^, ~, >=, etc.)
   */
  private cleanVersion(version: string): string {
    return version.replace(/^[\^~>=<]+/, '').trim();
  }

  /**
   * Determine update type (major, minor, patch)
   */
  private determineUpdateType(current: string, latest: string): UpdateType {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    if (currentParts[0] < latestParts[0]) {
      return 'major';
    }

    if (currentParts[1] < latestParts[1]) {
      return 'minor';
    }

    if (currentParts[2] < latestParts[2]) {
      return 'patch';
    }

    return 'none';
  }

  /**
   * Assess update risk
   */
  private assessUpdateRisk(updateType: UpdateType): UpdateRisk {
    switch (updateType) {
      case 'major':
        return 'breaking';
      case 'minor':
        return 'review';
      case 'patch':
        return 'safe';
      default:
        return 'safe';
    }
  }

  /**
   * Get dependency count
   */
  async getCount(): Promise<{
    total: number;
    production: number;
    development: number;
  }> {
    const { production, development } = await this.getDependencies();
    
    return {
      total: production.length + development.length,
      production: production.length,
      development: development.length
    };
  }
}
