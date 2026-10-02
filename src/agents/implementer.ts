/**
 * Implementer Agent - Executes the implementation plan
 */

import Anthropic from '@anthropic-ai/sdk';
import { ImplementationPlan, ImplementationResult } from '../types/index.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';
import { ShellTools } from '../tools/shell.js';

const IMPLEMENTER_SYSTEM_PROMPT = `You are a Backend Implementation Agent.

Your responsibility is to execute implementation plans with precision and care.

Core principles:

1. **Follow the plan**: Implement exactly what the plan specifies
2. **Match existing patterns**: Use the same coding style, naming conventions, and architecture patterns
3. **Complete implementations**: Never leave TODO comments or placeholder code
4. **Error handling**: Always include proper error handling and validation
5. **Type safety**: Ensure TypeScript types are correct and complete
6. **Security**: Validate inputs, check authorization, sanitize data
7. **Testing**: Write tests that actually verify behavior

Important rules:

- Read existing files before modifying them to understand patterns
- Never modify unrelated code
- Follow single responsibility principle
- Use existing dependencies, don't introduce new ones without necessity
- Database queries must use parameterized queries (no SQL injection)
- API responses should follow existing response patterns
- Always handle edge cases and errors

When implementing, provide the complete file content for each file you create or modify.`;

export class ImplementerAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools,
    private gitTools: GitTools,
    private shellTools: ShellTools
  ) {}

  async implement(
    plan: ImplementationPlan,
    requirement: string
  ): Promise<ImplementationResult> {
    const result: ImplementationResult = {
      success: false,
      filesChanged: [],
      testsRun: [],
      testsPassed: false,
      diff: ''
    };

    try {
      // Gather context from files that need to be modified
      const fileContexts = await this.gatherFileContexts(plan.affectedFiles);
      
      const userMessage = `
Requirement: ${requirement}

Implementation Plan:
${JSON.stringify(plan, null, 2)}

Existing File Contexts:
${fileContexts}

Implement this plan. For each file to create or modify, provide the complete file content.

Format your response as:
FILE: path/to/file.ts
\`\`\`typescript
// complete file content here
\`\`\`

FILE: path/to/another.ts
\`\`\`typescript
// complete file content here
\`\`\`
`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: IMPLEMENTER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from implementer');
      }

      // Parse the response and write files
      const files = this.parseImplementationResponse(content.text);
      
      for (const [path, content] of files) {
        const writeResult = await this.fsTools.writeFile(path, content);
        if (writeResult.success) {
          result.filesChanged.push(path);
        } else {
          throw new Error(`Failed to write ${path}: ${writeResult.error}`);
        }
      }

      // Run tests if specified
      if (plan.testsRequired.length > 0) {
        const testResult = await this.shellTools.runTests();
        result.testsRun = plan.testsRequired;
        result.testsPassed = testResult.success;
        
        if (!testResult.success) {
          result.error = `Tests failed: ${testResult.error || testResult.output}`;
        }
      } else {
        // No tests specified, consider it passed
        result.testsPassed = true;
      }

      // Get the diff
      const diffResult = await this.gitTools.diff();
      if (diffResult.success) {
        result.diff = diffResult.output;
      }

      result.success = result.filesChanged.length > 0 && result.testsPassed;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.success = false;
    }

    return result;
  }

  private async gatherFileContexts(files: string[]): Promise<string> {
    const contexts: string[] = [];
    
    for (const file of files) {
      const exists = await this.fsTools.fileExists(file);
      if (exists) {
        const content = await this.fsTools.readFile(file);
        if (content.success) {
          contexts.push(`\n--- ${file} (existing) ---`);
          contexts.push(content.output);
        }
      } else {
        contexts.push(`\n--- ${file} (new file) ---`);
      }
    }
    
    return contexts.join('\n');
  }

  private parseImplementationResponse(response: string): Map<string, string> {
    const files = new Map<string, string>();
    
    // Match FILE: path followed by code block
    const filePattern = /FILE:\s*([^\n]+)\n```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/gi;
    
    let match;
    while ((match = filePattern.exec(response)) !== null) {
      const path = match[1].trim();
      const content = match[2].trim();
      files.set(path, content);
    }
    
    return files;
  }
}
