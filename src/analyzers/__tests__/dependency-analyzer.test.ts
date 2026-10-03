/**
 * Tests for Dependency Analyzer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DependencyAnalyzer } from '../dependency-analyzer.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock child_process
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    exec: vi.fn()
  };
});

describe('DependencyAnalyzer', () => {
  let testDir: string;
  let analyzer: DependencyAnalyzer;

  beforeEach(async () => {
    testDir = join(tmpdir(), `dep-analyzer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    analyzer = new DependencyAnalyzer(testDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('loadPackageJson', () => {
    it('should load package.json correctly', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.2'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await analyzer.loadPackageJson();

      expect(result.name).toBe('test-project');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toEqual({ express: '^4.18.2' });
    });
  });

  describe('getDependencies', () => {
    it('should return production and development dependencies', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.2',
          lodash: '^4.17.21'
        },
        devDependencies: {
          typescript: '^5.3.3',
          vitest: '^1.6.0'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await analyzer.getDependencies();

      expect(result.production).toHaveLength(2);
      expect(result.production.map(d => d.name)).toContain('express');
      expect(result.production.map(d => d.name)).toContain('lodash');
      expect(result.production[0].type).toBe('production');
      
      expect(result.development).toHaveLength(2);
      expect(result.development.map(d => d.name)).toContain('typescript');
      expect(result.development[0].type).toBe('development');
    });

    it('should strip semver range prefixes from versions', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^1.2.3',
          lodash: '~4.5.6',
          axios: '>=1.0.0'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await analyzer.getDependencies();

      const expressDep = result.production.find(d => d.name === 'express');
      const lodashDep = result.production.find(d => d.name === 'lodash');
      const axiosDep = result.production.find(d => d.name === 'axios');

      expect(expressDep?.currentVersion).toBe('1.2.3');
      expect(lodashDep?.currentVersion).toBe('4.5.6');
      expect(axiosDep?.currentVersion).toBe('1.0.0');
    });
  });

  describe('checkOutdated', () => {
    it('should return none updateType when no outdated packages', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '4.18.2'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      // Mock exec to return empty output
      (exec as any).mockImplementation((cmd: string, opts: any, cb: any) => {
        cb(null, { stdout: '', stderr: '' });
      });

      const result = await analyzer.checkOutdated();

      expect(result[0].updateType).toBe('none');
    });

    it('should detect outdated packages correctly', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '4.18.2'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      // Mock exec to return outdated info
      const mockOutdated = {
        express: {
          current: '4.18.2',
          latest: '4.19.0',
          wanted: '4.19.0',
          dependent: 'test-project'
        }
      };

      (exec as any).mockImplementation((cmd: string, opts: any, cb: any) => {
        if (cmd.includes('npm outdated')) {
          cb(null, { stdout: JSON.stringify(mockOutdated), stderr: '' });
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.checkOutdated();

      const expressDep = result.find(d => d.name === 'express');
      expect(expressDep?.latestVersion).toBe('4.19.0');
      expect(expressDep?.updateType).toBe('minor');
      expect(expressDep?.updateRisk).toBe('review');
    });
  });

  describe('scanVulnerabilities', () => {
    it('should return empty array when no vulnerabilities', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {}
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const mockAudit = {
        auditReportVersion: 2,
        vulnerabilities: {},
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 0,
            critical: 0,
            total: 0
          },
          dependencies: {
            prod: 0,
            dev: 0,
            optional: 0,
            peer: 0,
            peerOptional: 0,
            total: 0
          }
        }
      };

      (exec as any).mockImplementation((cmd: string, opts: any, cb: any) => {
        if (cmd.includes('npm audit')) {
          cb(null, { stdout: JSON.stringify(mockAudit), stderr: '' });
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.scanVulnerabilities();

      expect(result).toEqual([]);
    });
  });

  describe('getCount', () => {
    it('should return correct dependency counts', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.2',
          lodash: '^4.17.21'
        },
        devDependencies: {
          typescript: '^5.3.3'
        }
      };
      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await analyzer.getCount();

      expect(result.total).toBe(3);
      expect(result.production).toBe(2);
      expect(result.development).toBe(1);
    });
  });
});