/**
 * Reviewer Agent - Reviews implementation for quality, security, and correctness
 */

import Anthropic from '@anthropic-ai/sdk';
import { ImplementationPlan, ImplementationResult, ReviewResult, ReviewIssue } from '../types/index.js';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';

const REVIEWER_SYSTEM_PROMPT = `You are a Backend Code Reviewer Agent.

Your responsibility is to review implementations for correctness, security, and quality.

Review checklist:

**Correctness**
□ Does implementation satisfy the original requirement?
□ Are all edge cases handled?
□ Is error handling complete?
□ Are there any logical errors?

**Architecture**
□ Does it follow existing architecture patterns?
□ Are responsibilities properly separated (controller/service/repository)?
□ Are module boundaries respected?
□ Are there any unnecessary dependencies?

**Security**
□ Are inputs validated?
□ Are authorization checks present?
□ Are database queries parameterized (no SQL injection)?
□ Are secrets handled properly?
□ Is user data sanitized?
□ Are rate limits considered?

**Performance**
□ Are there N+1 query problems?
□ Are database queries optimized?
□ Are proper indexes used?
□ Is caching appropriate?

**Testing**
□ Are tests sufficient?
□ Do tests cover edge cases?
□ Are failure paths tested?

**Code Quality**
□ Is the code readable and maintainable?
□ Are naming conventions followed?
□ Is there unnecessary code duplication?
□ Are types properly defined?

Return your review as JSON:
{
  "approved": true/false,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "security|architecture|performance|testing|style",
      "description": "Clear description",
      "file": "optional file path",
      "line": 42,
      "suggestion": "How to fix"
    }
  ],
  "suggestions": ["Improvement suggestions"],
  "securityConcerns": ["Security-related concerns"],
  "performanceConcerns": ["Performance-related concerns"]
}`;

export class ReviewerAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools,
    private gitTools: GitTools
  ) {}

  async review(
    requirement: string,
    plan: ImplementationPlan,
    implementation: ImplementationResult
  ): Promise<ReviewResult> {
    // Gather the actual file contents
    const implementedFiles = await this.gatherImplementedFiles(implementation.filesChanged);
    
    const userMessage = `
Original Requirement: ${requirement}

Implementation Plan:
${JSON.stringify(plan, null, 2)}

Implementation Result:
- Files Changed: ${implementation.filesChanged.join(', ')}
- Tests Passed: ${implementation.testsPassed}

Git Diff:
${implementation.diff}

Implemented Files:
${implementedFiles}

Review this implementation against the checklist and return your assessment as JSON.
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: REVIEWER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from reviewer');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract review JSON from response');
    }

    try {
      const review = JSON.parse(jsonMatch[0]) as ReviewResult;
      return review;
    } catch (error) {
      throw new Error(`Failed to parse review: ${error}`);
    }
  }

  private async gatherImplementedFiles(files: string[]): Promise<string> {
    const contents: string[] = [];
    
    for (const file of files) {
      const content = await this.fsTools.readFile(file);
      if (content.success) {
        contents.push(`\n--- ${file} ---`);
        contents.push(content.output);
      }
    }
    
    return contents.join('\n');
  }
}
