/**
 * Orchestrator Agent - Main coordinator for backend engineering tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import { Task, AgentConfig, ImplementationResult } from '../types/index.js';
import { PlannerAgent } from './planner.js';
import { ImplementerAgent } from './implementer.js';
import { ReviewerAgent } from './reviewer.js';
import { DiscoveryAgent } from './discovery.js';
import { SummaryGeneratorAgent } from './summary-generator.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';
import { ShellTools } from '../tools/shell.js';
import chalk from 'chalk';
import { createInterface } from 'readline';
import {
  createObservabilityStack,
  withObservability,
  trackOperation,
  logAgentAction,
  shutdownObservability,
  type ObservabilityStack
} from '../observability/agent-wrapper.js';

export class OrchestratorAgent {
  private client: Anthropic;
  private planner: PlannerAgent;
  private implementer: ImplementerAgent;
  private reviewer: ReviewerAgent;
  private discovery: DiscoveryAgent;
  private summaryGenerator: SummaryGeneratorAgent;
  private fsTools: FilesystemTools;
  private gitTools: GitTools;
  private shellTools: ShellTools;
  private obs: ObservabilityStack | null = null;

  constructor(private config: AgentConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.fsTools = new FilesystemTools(config.targetRepoPath);
    this.gitTools = new GitTools(config.targetRepoPath);
    this.shellTools = new ShellTools(config.targetRepoPath);
    
    this.planner = new PlannerAgent(this.client, this.config.model, this.fsTools, this.gitTools);
    this.implementer = new ImplementerAgent(this.client, this.config.model, this.fsTools, this.gitTools, this.shellTools);
    this.reviewer = new ReviewerAgent(this.client, this.config.model, this.fsTools, this.gitTools);
    this.discovery = new DiscoveryAgent(this.client, this.config.model, this.fsTools, this.gitTools);
    this.summaryGenerator = new SummaryGeneratorAgent(this.client, this.config.model);
  }

  async executeTask(description: string): Promise<Task> {
    // Initialize observability if not already done
    if (!this.obs) {
      this.obs = await createObservabilityStack();
    }

    const task: Task = {
      id: this.generateTaskId(),
      description,
      createdAt: new Date(),
      status: 'pending'
    };

    return withObservability(this.obs, task.id, description, async () => {
      logAgentAction(this.obs!, 'Orchestrator', 'Task execution started', {
        taskId: task.id,
        description
      });

      console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════╗'));
      console.log(chalk.blue('║') + chalk.bold('  Backend Engineer Agent - Task Execution') + chalk.blue('               ║'));
      console.log(chalk.blue('╚══════════════════════════════════════════════════════════╝\n'));
      console.log(chalk.cyan('Task:'), description);
      console.log(chalk.dim('─'.repeat(60)) + '\n');

      try {
        // Check if .agent/ exists, if not, run discovery
        const agentDirExists = await trackOperation(
          this.obs!,
          'check_agent_dir',
          () => this.fsTools.fileExists('.agent/instructions.md')
        );
        
        if (!agentDirExists) {
        console.log(chalk.yellow('📡 .agent/ directory not found. Running auto-discovery...\n'));
        
        const shouldDiscover = await this.promptUserForDiscovery();
        
        if (shouldDiscover) {
          await this.runDiscoveryAndSetup();
        } else {
          console.log(chalk.yellow('\n⚠️  Skipping discovery. Using minimal defaults.'));
          console.log(chalk.dim('   You can run discovery later with: npm run dev discover\n'));
        }
      }

      // Phase 1: Understanding & Planning
      task.status = 'understanding';
      console.log(chalk.yellow('📋 Phase 1: Understanding & Planning'));
      
      logAgentAction(this.obs!, 'Planner', 'Creating plan', { taskId: task.id });
      
      const plan = await trackOperation(
        this.obs!,
        'create_plan',
        () => this.planner.createPlan(description),
        { taskId: task.id }
      );
      
      logAgentAction(this.obs!, 'Planner', 'Plan created', {
        taskId: task.id,
        steps: plan.steps.length,
        affectedFiles: plan.affectedFiles.length,
        complexity: plan.estimatedComplexity
      });
      
      console.log(chalk.green('✓ Plan created'));
      console.log(chalk.dim(`  • ${plan.steps.length} steps`));
      console.log(chalk.dim(`  • ${plan.affectedFiles.length} files to modify`));
      console.log(chalk.dim(`  • Complexity: ${plan.estimatedComplexity}\n`));

      // Show plan details if confirmPlan mode is enabled
      if (this.config.confirmPlan) {
        await this.displayPlanForConfirmation(plan);
        
        const approved = await this.promptForPlanApproval();
        
        if (!approved) {
          console.log(chalk.yellow('\n✗ Plan rejected by user\n'));
          task.status = 'failed';
          task.error = 'Plan not approved';
          return task;
        }
        
        console.log(chalk.green('\n✓ Plan approved. Proceeding with implementation...\n'));
      }

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
        
        implementationResult = await trackOperation(
          this.obs!,
          'implement',
          () => this.implementer.implement(plan, task.description),
          { taskId: task.id, attempt: attempts }
        );
        
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
      
      logAgentAction(this.obs!, 'Reviewer', 'Starting code review', { taskId: task.id });
      
      const review = await trackOperation(
        this.obs!,
        'review',
        () => this.reviewer.review(task.description, plan, implementationResult!),
        { taskId: task.id }
      );
      
      logAgentAction(this.obs!, 'Reviewer', 'Review completed', {
        taskId: task.id,
        approved: review.approved,
        issuesCount: review.issues.length,
        suggestionsCount: review.suggestions.length
      });
      
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
      
      logAgentAction(this.obs!, 'Orchestrator', 'Task completed successfully', {
        taskId: task.id,
        branch: branchName
      });
      
      console.log(chalk.green('\n✓ Task completed successfully'));
      console.log(chalk.dim(`Branch: ${branchName}`));
      console.log(chalk.dim('Review the changes and merge when ready.\n'));

      // Generate task summary if enabled
      if (this.config.generateSummary !== false) { // Default true
        await trackOperation(
          this.obs!,
          'generate_summary',
          () => this.generateTaskSummary(task.description, plan, implementationResult!, branchName),
          { taskId: task.id }
        );
      }

      return task;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      
      logAgentAction(this.obs!, 'Orchestrator', 'Task failed', {
        taskId: task.id,
        error: task.error
      });
      
      console.log(chalk.red('\n✗ Task failed:'), task.error + '\n');
      throw error; // Re-throw so withObservability can track it
    }
    });
  }

  private generateTaskId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  private async displayPlanForConfirmation(plan: any): Promise<void> {
    console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue('║') + chalk.bold('  Implementation Plan Review') + chalk.blue('                          ║'));
    console.log(chalk.blue('╚══════════════════════════════════════════════════════════╝\n'));
    
    // Approach
    console.log(chalk.cyan('Approach:'));
    console.log(chalk.dim(plan.approach));
    console.log('');
    
    // Key Architecture Decisions
    if (plan.architectureDecisions && plan.architectureDecisions.length > 0) {
      console.log(chalk.cyan('Key Decisions:'));
      plan.architectureDecisions.forEach((decision: any) => {
        console.log(chalk.yellow(`  • ${decision.decision}`));
        console.log(chalk.dim(`    Reasoning: ${decision.rationale}`));
        console.log(chalk.dim(`    Impact: ${decision.impact}`));
      });
      console.log('');
    }
    
    // Alternatives Considered
    if (plan.alternatives && plan.alternatives.length > 0) {
      console.log(chalk.cyan('Alternatives Considered:'));
      plan.alternatives.forEach((alt: any) => {
        console.log(chalk.yellow(`  ✗ ${alt.approach}`));
        console.log(chalk.dim(`    Pros: ${alt.pros.join(', ')}`));
        console.log(chalk.dim(`    Cons: ${alt.cons.join(', ')}`));
        console.log(chalk.dim(`    Not chosen: ${alt.whyNotChosen}`));
      });
      console.log('');
    }
    
    // Risks & Trade-offs
    if (plan.risks && plan.risks.length > 0) {
      console.log(chalk.cyan('Risks:'));
      plan.risks.forEach((risk: string) => {
        console.log(chalk.yellow(`  ⚠️  ${risk}`));
      });
      console.log('');
    }
    
    if (plan.tradeoffs && plan.tradeoffs.length > 0) {
      console.log(chalk.cyan('Trade-offs:'));
      plan.tradeoffs.forEach((tradeoff: string) => {
        console.log(chalk.dim(`  ⚖️  ${tradeoff}`));
      });
      console.log('');
    }
    
    // Implementation Steps
    console.log(chalk.cyan('Implementation Steps:'));
    plan.steps.forEach((step: any, idx: number) => {
      console.log(chalk.dim(`  ${idx + 1}. ${step.action} ${step.target}`));
      console.log(chalk.dim(`     ${step.description}`));
    });
    console.log('');
    
    // Summary
    console.log(chalk.cyan('Summary:'));
    console.log(chalk.dim(`  • Files to modify: ${plan.affectedFiles.length}`));
    console.log(chalk.dim(`  • New files: ${plan.newFiles.length}`));
    console.log(chalk.dim(`  • Tests required: ${plan.testsRequired.length}`));
    console.log(chalk.dim(`  • Complexity: ${plan.estimatedComplexity}`));
    console.log('');
  }

  private async promptForPlanApproval(): Promise<boolean> {
    // In non-interactive mode, default to approved
    if (process.env.CI || !process.stdin.isTTY) {
      console.log(chalk.green('✓ Auto-approved (non-interactive mode)\n'));
      return true;
    }
    
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      readline.question(
        chalk.cyan('Do you approve this plan? (y/n): '),
        (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  private async generateTaskSummary(
    description: string,
    plan: any,
    implementation: any,
    branchName: string
  ): Promise<void> {
    try {
      console.log(chalk.yellow('📝 Generating task summary...'));
      
      const summary = await this.summaryGenerator.generateSummary(
        description,
        plan,
        implementation
      );
      
      const markdown = this.summaryGenerator.formatSummaryAsMarkdown(summary);
      
      // Save summary to .agent/summaries/
      const summaryPath = `.agent/summaries/task-${summary.taskId}.md`;
      const writeResult = await this.fsTools.writeFile(summaryPath, markdown);
      
      if (writeResult.success) {
        console.log(chalk.green('✓ Task summary generated'));
        console.log(chalk.dim(`  Saved to: ${summaryPath}\n`));
      } else {
        console.log(chalk.yellow('⚠️  Could not save summary:'), writeResult.error);
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Summary generation failed:'), error);
      console.log(chalk.dim('   Task completed successfully, but summary could not be generated\n'));
    }
  }

  private async promptUserForDiscovery(): Promise<boolean> {
    console.log(chalk.yellow('🤔 Would you like me to analyze your repository and auto-generate'));
    console.log(chalk.yellow('   the .agent/ knowledge base?'));
    console.log(chalk.dim('\n   This will:'));
    console.log(chalk.dim('   • Scan your codebase'));
    console.log(chalk.dim('   • Detect patterns and conventions'));
    console.log(chalk.dim('   • Generate architecture documentation'));
    console.log(chalk.dim('   • You can review and modify afterwards\n'));
    
    // For now, default to yes in autopilot mode
    // In a real interactive CLI, you'd use a prompt library
    console.log(chalk.green('✓ Auto-discovery enabled (set SKIP_DISCOVERY=true to disable)\n'));
    return process.env.SKIP_DISCOVERY !== 'true';
  }

  private async runDiscoveryAndSetup(): Promise<void> {
    console.log(chalk.yellow('Phase 0: Repository Discovery\n'));
    
    try {
      // Run discovery
      const discoveryResult = await this.discovery.discoverRepository();
      
      console.log(chalk.green('✓ Repository analyzed'));
      console.log(chalk.dim(`  Confidence: ${discoveryResult.confidence}\n`));
      
      // Create .agent directory structure
      const agentFiles = [
        {
          path: '.agent/instructions.md',
          content: `# Backend Engineering Instructions

This directory contains knowledge and instructions for the Backend Engineer Agent.

These files were **auto-generated** by analyzing your repository.
Please review and customize them to match your exact requirements.

## Files

- \`architecture.md\` - System architecture (auto-detected)
- \`conventions.md\` - Coding conventions (auto-detected)
- \`database.md\` - Database patterns (auto-detected)
- \`api.md\` - API conventions (auto-detected)
- \`security.md\` - Security requirements (auto-detected)
- \`testing.md\` - Testing practices (auto-detected)
- \`decisions/\` - Architecture Decision Records (you can add these)

## Auto-Discovery

These files were generated on ${new Date().toISOString()} by analyzing your codebase.

**Next Steps:**
1. Review each file
2. Correct any misunderstandings
3. Add project-specific details
4. Document any special requirements
5. Add ADRs in the decisions/ folder

The agent will learn from these files and follow your patterns.
`
        },
        {
          path: '.agent/architecture.md',
          content: discoveryResult.architecture
        },
        {
          path: '.agent/conventions.md',
          content: discoveryResult.conventions
        },
        {
          path: '.agent/database.md',
          content: discoveryResult.database
        },
        {
          path: '.agent/api.md',
          content: discoveryResult.api
        },
        {
          path: '.agent/security.md',
          content: discoveryResult.security
        },
        {
          path: '.agent/testing.md',
          content: discoveryResult.testing
        },
        {
          path: '.agent/decisions/README.md',
          content: `# Architecture Decision Records (ADRs)

Store significant architectural decisions here.

## Format

Each ADR should follow this template:

\`\`\`markdown
# ADR-XXX: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue we're trying to solve?

## Decision
What did we decide to do?

## Consequences
What are the trade-offs and implications?

## Alternatives Considered
What other options did we look at?
\`\`\`

## Example

See ADR-001-example.md for a sample ADR.
`
        },
        {
          path: '.agent/decisions/ADR-001-example.md',
          content: `# ADR-001: Example Architecture Decision

## Status
Accepted

## Context
This is an example ADR to show the format.

## Decision
We will use ADRs to document important architectural decisions.

## Consequences
- Better documentation of decisions
- Easier onboarding for new team members
- Historical record of why decisions were made

## Alternatives Considered
- Wiki pages (harder to keep in sync with code)
- Code comments (not discoverable enough)
`
        }
      ];
      
      console.log(chalk.yellow('📝 Generating knowledge base files...\n'));
      
      for (const file of agentFiles) {
        const result = await this.fsTools.writeFile(file.path, file.content);
        if (result.success) {
          console.log(chalk.green('  ✓'), chalk.dim(file.path));
        } else {
          console.log(chalk.red('  ✗'), chalk.dim(file.path), chalk.red(result.error));
        }
      }
      
      console.log(chalk.green('\n✓ Knowledge base created!\n'));
      
      if (discoveryResult.recommendations.length > 0) {
        console.log(chalk.yellow('💡 Recommendations:\n'));
        discoveryResult.recommendations.forEach(rec => {
          console.log(chalk.dim(`   • ${rec}`));
        });
        console.log();
      }
      
      console.log(chalk.cyan('📋 Next: Review the generated files in .agent/ directory'));
      console.log(chalk.dim('   Edit them to correct any misunderstandings\n'));
      
    } catch (error) {
      console.log(chalk.red('✗ Discovery failed:'), error);
      console.log(chalk.yellow('   Falling back to minimal defaults\n'));
      
      // Create minimal .agent structure as fallback
      await this.createMinimalAgentStructure();
    }
  }

  private async createMinimalAgentStructure(): Promise<void> {
    const minimalFiles = [
      {
        path: '.agent/instructions.md',
        content: '# Backend Engineering Instructions\n\nMinimal setup. Please customize these files.'
      },
      {
        path: '.agent/architecture.md',
        content: '# Architecture\n\nPlease document your architecture here.'
      }
    ];
    
    for (const file of minimalFiles) {
      await this.fsTools.writeFile(file.path, file.content);
    }
  }

  /**
   * Cleanup observability stack gracefully
   */
  async cleanup(): Promise<void> {
    if (this.obs) {
      await shutdownObservability(this.obs);
      this.obs = null;
    }
  }

  /**
   * Get observability metrics for inspection
   */
  async getMetrics() {
    if (!this.obs) {
      return null;
    }
    return this.obs.metrics.getAllMetrics();
  }
}
