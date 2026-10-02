/**
 * Orchestrator Agent - Main coordinator for backend engineering tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import { Task, AgentConfig, ImplementationResult } from '../types/index.js';
import { PlannerAgent } from './planner.js';
import { ImplementerAgent } from './implementer.js';
import { ReviewerAgent } from './reviewer.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';
import { ShellTools } from '../tools/shell.js';
import chalk from 'chalk';

export class OrchestratorAgent {
  private client: Anthropic;
  private planner: PlannerAgent;
  private implementer: ImplementerAgent;
  private reviewer: ReviewerAgent;
  private fsTools: FilesystemTools;
  private gitTools: GitTools;
  private shellTools: ShellTools;

  constructor(private config: AgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.fsTools = new FilesystemTools(config.targetRepoPath);
    this.gitTools = new GitTools(config.targetRepoPath);
    this.shellTools = new ShellTools(config.targetRepoPath);
    
    this.planner = new PlannerAgent(this.client, this.config.model, this.fsTools, this.gitTools);
    this.implementer = new ImplementerAgent(this.client, this.config.model, this.fsTools, this.gitTools, this.shellTools);
    this.reviewer = new ReviewerAgent(this.client, this.config.model, this.fsTools, this.gitTools);
  }

  async executeTask(description: string): Promise<Task> {
    const task: Task = {
      id: this.generateTaskId(),
      description,
      createdAt: new Date(),
      status: 'pending'
    };

    console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue('║') + chalk.bold('  Backend Engineer Agent - Task Execution') + chalk.blue('               ║'));
    console.log(chalk.blue('╚══════════════════════════════════════════════════════════╝\n'));
    console.log(chalk.cyan('Task:'), description);
    console.log(chalk.dim('─'.repeat(60)) + '\n');

    try {
      // Phase 1: Understanding & Planning
      task.status = 'understanding';
      console.log(chalk.yellow('📋 Phase 1: Understanding & Planning'));
      
      const plan = await this.planner.createPlan(description);
      
      console.log(chalk.green('✓ Plan created'));
      console.log(chalk.dim(`  • ${plan.steps.length} steps`));
      console.log(chalk.dim(`  • ${plan.affectedFiles.length} files to modify`));
      console.log(chalk.dim(`  • Complexity: ${plan.estimatedComplexity}\n`));

      // Create a branch for this work
      const branchName = `agent/task-${task.id}`;
      const branchResult = await this.gitTools.createBranch(branchName);
      
      if (branchResult.success) {
        console.log(chalk.green('✓ Created branch:'), chalk.dim(branchName + '\n'));
      }

      // Phase 2: Implementation
      task.status = 'implementing';
      console.log(chalk.yellow('🔨 Phase 2: Implementation'));
      
      let implementationResult: ImplementationResult | null = null;
      let attempts = 0;
      
      while (attempts < this.config.maxAttempts) {
        attempts++;
        
        if (attempts > 1) {
          console.log(chalk.yellow(`\n  Attempt ${attempts}/${this.config.maxAttempts}`));
        }
        
        implementationResult = await this.implementer.implement(plan, task.description);
        
        if (implementationResult.success && implementationResult.testsPassed) {
          console.log(chalk.green('✓ Implementation successful'));
          console.log(chalk.dim(`  • ${implementationResult.filesChanged.length} files changed`));
          console.log(chalk.dim(`  • Tests passed\n`));
          break;
        } else {
          console.log(chalk.red('✗ Implementation failed'));
          if (implementationResult.error) {
            console.log(chalk.dim(`  • Error: ${implementationResult.error}`));
          }
          if (!implementationResult.testsPassed) {
            console.log(chalk.dim(`  • Tests failed`));
          }
          
          if (attempts === this.config.maxAttempts) {
            console.log(chalk.red(`\n  Maximum attempts (${this.config.maxAttempts}) reached\n`));
            task.status = 'failed';
            task.error = implementationResult.error || 'Tests failed after maximum attempts';
            return task;
          }
        }
      }

      if (!implementationResult || !implementationResult.success) {
        task.status = 'failed';
        task.error = 'Implementation failed';
        return task;
      }

      // Phase 3: Review
      task.status = 'reviewing';
      console.log(chalk.yellow('👁️  Phase 3: Code Review'));
      
      const review = await this.reviewer.review(
        task.description,
        plan,
        implementationResult
      );
      
      if (review.approved) {
        console.log(chalk.green('✓ Review passed'));
        
        if (review.suggestions.length > 0) {
          console.log(chalk.dim('\n  Suggestions:'));
          review.suggestions.forEach(s => console.log(chalk.dim(`  • ${s}`)));
        }
      } else {
        console.log(chalk.red('✗ Review identified issues:'));
        review.issues.forEach(issue => {
          const color = issue.severity === 'critical' ? chalk.red :
                       issue.severity === 'high' ? chalk.yellow :
                       chalk.dim;
          console.log(color(`  [${issue.severity.toUpperCase()}] ${issue.description}`));
        });
      }

      // Show final diff
      console.log(chalk.yellow('\n📊 Changes Summary'));
      const diffResult = await this.gitTools.diff();
      if (diffResult.success && diffResult.output !== 'No changes') {
        console.log(chalk.dim(diffResult.output));
      }

      task.status = 'completed';
      
      console.log(chalk.green('\n✓ Task completed successfully'));
      console.log(chalk.dim(`Branch: ${branchName}`));
      console.log(chalk.dim('Review the changes and merge when ready.\n'));

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      console.log(chalk.red('\n✗ Task failed:'), task.error + '\n');
    }

    return task;
  }

  private generateTaskId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
}
