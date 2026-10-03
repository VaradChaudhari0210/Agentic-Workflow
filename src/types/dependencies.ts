/**
 * Type definitions for dependency analysis
 */

export type DependencyType = 'production' | 'development' | 'peer' | 'optional';
export type UpdateType = 'major' | 'minor' | 'patch' | 'none';
export type VulnerabilitySeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
export type UpdateRisk = 'safe' | 'review' | 'breaking';

/**
 * Information about a single dependency
 */
export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: DependencyType;
  updateType: UpdateType;
  updateRisk: UpdateRisk;
  description?: string;
  homepage?: string;
  license?: string;
}

/**
 * Security vulnerability information
 */
export interface Vulnerability {
  id: number | string;
  package: string;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  vulnerableVersions: string;
  patchedVersions?: string;
  fixVersion?: string;
  cve?: string;
  cwe?: string;
  url?: string;
  foundIn: string[];
}

/**
 * Package usage information
 */
export interface UsageInfo {
  package: string;
  usedInFiles: string[];
  importCount: number;
  isDeclared: boolean;
  declarationType?: DependencyType;
}

/**
 * Update suggestion
 */
export interface UpdateSuggestion {
  package: string;
  from: string;
  to: string;
  updateType: UpdateType;
  risk: UpdateRisk;
  reason: string;
  command: string;
  breaking?: string[];
  notes?: string;
}

/**
 * Complete dependency analysis report
 */
export interface DependencyReport {
  timestamp: string;
  projectName: string;
  projectVersion: string;
  totalDependencies: number;
  dependencies: {
    production: DependencyInfo[];
    development: DependencyInfo[];
  };
  outdated: DependencyInfo[];
  vulnerabilities: Vulnerability[];
  usage: UsageInfo[];
  unused: string[];
  undeclared: string[];
  suggestions: UpdateSuggestion[];
  summary: {
    upToDate: number;
    outdated: number;
    vulnerabilities: {
      critical: number;
      high: number;
      moderate: number;
      low: number;
      total: number;
    };
    unused: number;
    undeclared: number;
  };
}

/**
 * Package.json structure (simplified)
 */
export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * npm view output (simplified)
 */
export interface NpmViewResult {
  name: string;
  version: string;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  description?: string;
  homepage?: string;
  license?: string;
}

/**
 * npm audit output structure
 */
export interface NpmAuditOutput {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmAuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      peerOptional: number;
      total: number;
    };
  };
}

export interface NpmAuditVulnerability {
  name: string;
  severity: VulnerabilitySeverity;
  isDirect: boolean;
  via: Array<string | AuditVia>;
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | FixAvailable;
}

export interface AuditVia {
  source: number;
  name: string;
  dependency: string;
  title: string;
  url: string;
  severity: VulnerabilitySeverity;
  cwe?: string[];
  cvss?: {
    score: number;
    vectorString: string;
  };
  range: string;
}

export interface FixAvailable {
  name: string;
  version: string;
  isSemVerMajor: boolean;
}

/**
 * Analysis options
 */
export interface DependencyAnalysisOptions {
  repoPath: string;
  checkOutdated?: boolean;
  checkVulnerabilities?: boolean;
  checkUsage?: boolean;
  includeDevDependencies?: boolean;
  registry?: string;
}
