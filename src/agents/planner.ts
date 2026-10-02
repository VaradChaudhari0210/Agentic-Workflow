/**
 * Planner Agent - Creates implementation plans based on requirements
 */

import Anthropic from '@anthropic-ai/sdk';
import { ImplementationPlan, PlanStep } from '../types/index.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';

const PLANNER_SYSTEM_PROMPT = `You are a Backend Engineering Planner Agent.

Your responsibility is to create detailed, actionable implementation plans for backend engineering tasks.

Primary principles:

1. **Understand before planning**: Inspect the existing repository structure, patterns, and conventions
2. **Follow existing patterns**: Match the project's architecture, naming conventions, and code style
3. **Minimal changes**: Prefer the smallest change that satisfies requirements
4. **Database safety**: Always consider migration requirements and data integrity
5. **Testing requirements**: Identify what tests are needed
6. **Security first**: Flag authentication, authorization, and data validation concerns

Process:
1. Inspect relevant existing files to understand patterns
2. Identify all affected files and dependencies
3. Create a step-by-step plan with clear rationale
4. Estimate complexity realistically
5. Flag security concerns

Return your plan as a JSON object with this structure:
{
  "steps": [
    {
      "order": 1,
      "action": "modify",
      "target": "src/services/user.service.ts",
      "description": "Add method to fetch user statistics",
      "rationale": "Follows existing service pattern for data fetching"
    }
  ],
  "affectedFiles": ["src/services/user.service.ts", "src/routes/user.routes.ts"],
  "newFiles": ["src/dto/user-stats.dto.ts"],
  "testsRequired": ["user.service.test.ts", "user.routes.test.ts"],
  "migrationRequired": false,
  "securityReview": true,
  "estimatedComplexity": "medium"
}`;

export class PlannerAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools,
    private gitTools: GitTools
  ) {}

  async createPlan(requirement: string): Promise<ImplementationPlan> {
    // First, gather context about the repository
    const context = await this.gatherContext();
    
    const userMessage = `
Requirement: ${requirement}

Repository Context:
${context}

Create a detailed implementation plan for this requirement.
Inspect relevant files if needed to understand existing patterns.
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: PLANNER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from planner');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract plan JSON from response');
    }

    try {
      const plan = JSON.parse(jsonMatch[0]) as ImplementationPlan;
      return plan;
    } catch (error) {
      throw new Error(`Failed to parse plan: ${error}`);
    }
  }

  private async gatherContext(): Promise<string> {
    const context: string[] = [];
    
    // Get repository structure
    const filesResult = await this.fsTools.listFiles('src', false);
    if (filesResult.success) {
      context.push('Repository structure (src/):');
      context.push(filesResult.output);
    }
    
    // Check for common backend files
    const commonFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/app.ts',
      'prisma/schema.prisma'
    ];
    
    for (const file of commonFiles) {
      const exists = await this.fsTools.fileExists(file);
      if (exists) {
        const content = await this.fsTools.readFile(file);
        if (content.success) {
          context.push(`\n--- ${file} ---`);
          // Only include first 50 lines to avoid overwhelming context
          const lines = content.output.split('\n').slice(0, 50);
          context.push(lines.join('\n'));
        }
      }
    }
    
    // Get recent git history
    const logResult = await this.gitTools.log(5);
    if (logResult.success) {
      context.push('\nRecent commits:');
      context.push(logResult.output);
    }
    
    return context.join('\n');
  }
}
