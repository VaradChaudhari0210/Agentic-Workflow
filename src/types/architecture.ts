/**
 * Type definitions for Architecture Documenter
 */

export interface TechStack {
  language: string;
  version?: string;
  framework?: string;
  frameworkVersion?: string;
  buildTool?: string;
  testing?: string;
  api?: string;
  database?: string;
  orm?: string;
  styling?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  runtime?: string;
}

export interface ProjectStructure {
  root: string;
  src: string;
  entryPoints: string[];
  testLocation: string;
  configFiles: string[];
  directories: DirectoryInfo[];
  patterns: StructurePattern[];
}

export interface DirectoryInfo {
  name: string;
  path: string;
  purpose?: string;
  fileCount: number;
  subdirectories: number;
}

export interface StructurePattern {
  pattern: string;
  description: string;
  files: string[];
}

export interface ArchitectureReport {
  projectName: string;
  techStack: TechStack;
  structure: ProjectStructure;
  dependencies: DependencySummary[];
  entryPoints: EntryPointInfo[];
  buildScripts: BuildScript[];
  generatedAt: Date;
  confidence: 'high' | 'medium' | 'low';
}

export interface DependencySummary {
  name: string;
  version: string;
  purpose: string;
  category: 'runtime' | 'dev' | 'build' | 'test';
  importance: 'critical' | 'major' | 'minor';
}

export interface EntryPointInfo {
  file: string;
  type: 'main' | 'test' | 'build' | 'cli';
  description: string;
}

export interface BuildScript {
  name: string;
  command: string;
  purpose: string;
}

export interface DocumentationState {
  lastGenerated: Date;
  techStackHash: string;
  structureHash: string;
  dependenciesHash: string;
}

export interface SyncResult {
  upToDate: boolean;
  changes: ArchitectureChange[];
  recommendations: string[];
}

export interface ArchitectureChange {
  type: 'tech-stack' | 'structure' | 'dependencies';
  change: string;
  severity: 'major' | 'minor';
  description: string;
}
