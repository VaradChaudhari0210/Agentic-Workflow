/**
 * Core types for the backend engineer agent system
 */

export interface AgentConfig {
  apiKey: string;
  model: string;
  maxAttempts: number;
  approvalMode: 'manual' | 'auto' | 'suggest-only';
  targetRepoPath: string;
}

export interface Task {
  id: string;
  description: string;
  createdAt: Date;
  status: 'pending' | 'understanding' | 'planning' | 'implementing' | 'testing' | 'reviewing' | 'completed' | 'failed';
  error?: string;
}

export interface UnderstandingResult {
  relevantFiles: string[];
  existingPatterns: string[];
  dependencies: string[];
  architecture: string;
  securityConsiderations: string[];
}

export interface ImplementationPlan {
  steps: PlanStep[];
  affectedFiles: string[];
  newFiles: string[];
  testsRequired: string[];
  migrationRequired: boolean;
  securityReview: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface PlanStep {
  order: number;
  action: 'create' | 'modify' | 'delete' | 'test' | 'migrate';
  target: string;
  description: string;
  rationale: string;
}

export interface ImplementationResult {
  success: boolean;
  filesChanged: string[];
  testsRun: string[];
  testsPassed: boolean;
  diff: string;
  error?: string;
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
  securityConcerns: string[];
  performanceConcerns: string[];
}

export interface ReviewIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'architecture' | 'performance' | 'testing' | 'style';
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}
