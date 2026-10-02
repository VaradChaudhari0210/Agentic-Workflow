/**
 * Summary Generator Agent - Creates concise task summaries after completion
 */

import Anthropic from '@anthropic-ai/sdk';
import { TaskSummary, ImplementationPlan, ImplementationResult } from '../types/index.js';

const SUMMARY_SYSTEM_PROMPT = `You are a Task Summary Generator for backend engineering tasks.

Your job is to create a **brief, scannable summary** of what was implemented.

**Key principles:**
- Be concise but informative
- Focus on decisions and trade-offs
- Explain WHY, not just WHAT
- Keep it under 500 words
- Use bullet points and structure

**What to include:**
1. Quick overview of what was implemented
2. Key architectural/product decisions made (with reasoning)
3. Alternative approaches considered (and why rejected)
4. Current limitations (if any)
5. 2-3 practical test scenarios

**What to avoid:**
- Over-explaining obvious things
- Lengthy descriptions
- Implementation details (code is self-documenting)
- Repeating the requirement

Return JSON:
{
  "approach": "One sentence describing the chosen approach",
  "keyDecisions": [
    {
      "decision": "Placed logic in service layer",
      "reasoning": "Follows existing architecture pattern",
      "impact": "Maintains consistency, easier to test",
      "category": "architecture"
    }
  ],
  "alternatives": [
    {
      "approach": "Controller-based implementation",
      "whyNotChosen": "Violates architecture pattern",
      "tradeoff": "Would be faster but less maintainable"
    }
  ],
  "limitations": [
    "Does not handle pagination for large result sets",
    "Assumes user is authenticated"
  ],
  "testScenarios": [
    {
      "scenario": "Successful statistics retrieval",
      "steps": [
        "Authenticate as a valid user",
        "GET /api/users/123/statistics",
        "Verify response contains loginCount and lastLogin"
      ],
      "expectedResult": "200 OK with statistics object"
    }
  ]
}`;

export class SummaryGeneratorAgent {
  constructor(
    private client: Anthropic,
    private model: string
  ) {}

  async generateSummary(
    taskDescription: string,
    plan: ImplementationPlan,
    result: ImplementationResult
  ): Promise<TaskSummary> {
    const userMessage = `
Generate a brief task summary for:

**Requirement:** ${taskDescription}

**Implementation Plan:**
- Approach: ${plan.approach}
- Files Changed: ${plan.affectedFiles.join(', ')}
- New Files: ${plan.newFiles.join(', ')}
- Complexity: ${plan.estimatedComplexity}

**Architecture Decisions:**
${plan.architectureDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join('\n')}

**Alternatives Considered:**
${plan.alternatives.map(a => `- ${a.approach}: ${a.whyNotChosen}`).join('\n')}

**Implementation Result:**
- Success: ${result.success}
- Files Changed: ${result.filesChanged.join(', ')}
- Tests Passed: ${result.testsPassed}

Generate a concise summary focusing on decisions, trade-offs, and test scenarios.
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from summary generator');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract summary JSON from response');
    }

    try {
      const summaryData = JSON.parse(jsonMatch[0]);
      
      const summary: TaskSummary = {
        taskId: Date.now().toString(36),
        description: taskDescription,
        timestamp: new Date(),
        approach: summaryData.approach,
        keyDecisions: summaryData.keyDecisions,
        alternatives: summaryData.alternatives,
        limitations: summaryData.limitations || [],
        testScenarios: summaryData.testScenarios,
        filesChanged: result.filesChanged,
        complexity: plan.estimatedComplexity
      };
      
      return summary;
    } catch (error) {
      throw new Error(`Failed to parse summary: ${error}`);
    }
  }

  formatSummaryAsMarkdown(summary: TaskSummary): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`# Task Summary: ${summary.description}`);
    sections.push('');
    sections.push(`**Date:** ${summary.timestamp.toISOString()}`);
    sections.push(`**Complexity:** ${summary.complexity}`);
    sections.push(`**Files Changed:** ${summary.filesChanged.length}`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Approach
    sections.push('## Approach');
    sections.push('');
    sections.push(summary.approach);
    sections.push('');
    
    // Key Decisions
    sections.push('## Key Decisions');
    sections.push('');
    
    const grouped = this.groupDecisionsByCategory(summary.keyDecisions);
    
    for (const [category, decisions] of Object.entries(grouped)) {
      sections.push(`### ${this.capitalizeCategory(category)}`);
      sections.push('');
      
      decisions.forEach(decision => {
        sections.push(`**${decision.decision}**`);
        sections.push(`- *Why:* ${decision.reasoning}`);
        sections.push(`- *Impact:* ${decision.impact}`);
        sections.push('');
      });
    }
    
    // Alternatives
    if (summary.alternatives.length > 0) {
      sections.push('## Alternatives Considered');
      sections.push('');
      
      summary.alternatives.forEach((alt, idx) => {
        sections.push(`${idx + 1}. **${alt.approach}**`);
        sections.push(`   - Not chosen: ${alt.whyNotChosen}`);
        sections.push(`   - Trade-off: ${alt.tradeoff}`);
        sections.push('');
      });
    }
    
    // Limitations
    if (summary.limitations.length > 0) {
      sections.push('## Current Limitations');
      sections.push('');
      summary.limitations.forEach(limitation => {
        sections.push(`- ${limitation}`);
      });
      sections.push('');
    }
    
    // Test Scenarios
    sections.push('## Test Scenarios');
    sections.push('');
    
    summary.testScenarios.forEach((scenario, idx) => {
      sections.push(`### ${idx + 1}. ${scenario.scenario}`);
      sections.push('');
      sections.push('**Steps:**');
      scenario.steps.forEach(step => {
        sections.push(`1. ${step}`);
      });
      sections.push('');
      sections.push(`**Expected:** ${scenario.expectedResult}`);
      sections.push('');
    });
    
    // Files Changed
    sections.push('---');
    sections.push('');
    sections.push('## Files Modified');
    sections.push('');
    summary.filesChanged.forEach(file => {
      sections.push(`- \`${file}\``);
    });
    sections.push('');
    
    return sections.join('\n');
  }

  private groupDecisionsByCategory(decisions: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    decisions.forEach(decision => {
      const category = decision.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(decision);
    });
    
    return grouped;
  }

  private capitalizeCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
}
