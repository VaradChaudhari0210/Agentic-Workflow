# Extending the Backend Engineer Agent

This guide shows how to extend the agent system with new capabilities.

## Architecture Overview

```
src/
├── agents/          # Reasoning agents
│   ├── orchestrator.ts
│   ├── planner.ts
│   ├── implementer.ts
│   └── reviewer.ts
├── tools/           # Capabilities
│   ├── filesystem.ts
│   ├── git.ts
│   └── shell.ts
└── types/           # Type definitions
    └── index.ts
```

**Key principle**: Agents reason, tools provide capabilities.

## Adding New Tools

### Example: Database Tools

Create `src/tools/database.ts`:

```typescript
import { ToolResult } from '../types/index.js';
import { Pool } from 'pg'; // or your DB client

export class DatabaseTools {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async inspectSchema(): Promise<ToolResult> {
    try {
      const query = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `;
      
      const result = await this.pool.query(query);
      
      const schema = this.formatSchema(result.rows);
      
      return {
        success: true,
        output: schema
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Schema inspection failed: ${error}`
      };
    }
  }

  async inspectIndexes(): Promise<ToolResult> {
    try {
      const query = `
        SELECT 
          schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;
      
      const result = await this.pool.query(query);
      
      return {
        success: true,
        output: JSON.stringify(result.rows, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Index inspection failed: ${error}`
      };
    }
  }

  async explainQuery(query: string): Promise<ToolResult> {
    try {
      const result = await this.pool.query(`EXPLAIN ANALYZE ${query}`);
      
      return {
        success: true,
        output: result.rows.map(r => r['QUERY PLAN']).join('\n')
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Query explain failed: ${error}`
      };
    }
  }

  private formatSchema(rows: any[]): string {
    const tables = new Map<string, any[]>();
    
    rows.forEach(row => {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, []);
      }
      tables.get(row.table_name)!.push(row);
    });
    
    const output: string[] = [];
    
    tables.forEach((columns, tableName) => {
      output.push(`\nTable: ${tableName}`);
      columns.forEach(col => {
        output.push(`  - ${col.column_name}: ${col.data_type}`);
      });
    });
    
    return output.join('\n');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### Integrating the Tool

Update `src/agents/orchestrator.ts`:

```typescript
import { DatabaseTools } from '../tools/database.js';

export class OrchestratorAgent {
  private dbTools?: DatabaseTools;

  constructor(private config: AgentConfig) {
    // ... existing tools ...
    
    // Add database tools if connection string provided
    if (config.databaseUrl) {
      this.dbTools = new DatabaseTools(config.databaseUrl);
    }
  }
}
```

Update `src/types/index.ts`:

```typescript
export interface AgentConfig {
  // ... existing fields ...
  databaseUrl?: string;
}
```

Now agents can inspect database schema!

## Adding New Agents

### Example: Security Reviewer Agent

Create `src/agents/security-reviewer.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ImplementationResult, SecurityReview } from '../types/index.js';
import { FilesystemTools } from '../tools/filesystem.js';

const SECURITY_SYSTEM_PROMPT = `You are a Security Review Agent specializing in backend security.

Review code for:

**Authentication & Authorization**
- Are endpoints properly authenticated?
- Are authorization checks present?
- Are roles/permissions verified?

**Input Validation**
- Are all inputs validated?
- Are types checked?
- Are lengths/ranges validated?

**SQL Injection**
- Are queries parameterized?
- Are ORMs used correctly?
- Are raw queries avoided?

**Data Protection**
- Are passwords hashed?
- Are secrets not logged?
- Is sensitive data encrypted?

**API Security**
- Are rate limits implemented?
- Is CORS configured correctly?
- Are security headers present?

**Session Security**
- Are sessions secure?
- Are tokens validated?
- Are sessions expired properly?

Return JSON:
{
  "approved": boolean,
  "criticalIssues": [
    {
      "issue": "No authentication check",
      "file": "user.controller.ts",
      "line": 42,
      "severity": "critical",
      "recommendation": "Add authentication middleware"
    }
  ],
  "warnings": [...],
  "recommendations": [...]
}`;

export interface SecurityReview {
  approved: boolean;
  criticalIssues: SecurityIssue[];
  warnings: SecurityIssue[];
  recommendations: string[];
}

export interface SecurityIssue {
  issue: string;
  file?: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export class SecurityReviewerAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools
  ) {}

  async reviewSecurity(
    implementation: ImplementationResult
  ): Promise<SecurityReview> {
    const fileContents = await this.gatherFiles(implementation.filesChanged);
    
    const userMessage = `
Review this implementation for security issues:

Files Changed:
${implementation.filesChanged.join(', ')}

${fileContents}

Diff:
${implementation.diff}
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SECURITY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON');
    }

    return JSON.parse(jsonMatch[0]) as SecurityReview;
  }

  private async gatherFiles(files: string[]): Promise<string> {
    const contents: string[] = [];
    
    for (const file of files) {
      const result = await this.fsTools.readFile(file);
      if (result.success) {
        contents.push(`\n--- ${file} ---\n${result.output}`);
      }
    }
    
    return contents.join('\n');
  }
}
```

### Using the Security Agent

Update `src/agents/orchestrator.ts`:

```typescript
import { SecurityReviewerAgent } from './security-reviewer.js';

export class OrchestratorAgent {
  private securityReviewer: SecurityReviewerAgent;

  constructor(private config: AgentConfig) {
    // ... existing agents ...
    this.securityReviewer = new SecurityReviewerAgent(
      this.client,
      this.config.model,
      this.fsTools
    );
  }

  async executeTask(description: string): Promise<Task> {
    // ... after implementation ...

    // Add security review for sensitive changes
    if (this.requiresSecurityReview(implementationResult)) {
      console.log(chalk.yellow('🔒 Security Review'));
      
      const securityReview = await this.securityReviewer.reviewSecurity(
        implementationResult
      );
      
      if (securityReview.criticalIssues.length > 0) {
        console.log(chalk.red('✗ Critical security issues found:'));
        securityReview.criticalIssues.forEach(issue => {
          console.log(chalk.red(`  [CRITICAL] ${issue.issue}`));
          console.log(chalk.dim(`    ${issue.recommendation}`));
        });
      }
    }

    // ... continue with regular review ...
  }

  private requiresSecurityReview(result: ImplementationResult): boolean {
    const securityPatterns = [
      /auth/i,
      /password/i,
      /token/i,
      /session/i,
      /permission/i,
      /security/i
    ];
    
    return result.filesChanged.some(file => 
      securityPatterns.some(pattern => pattern.test(file))
    );
  }
}
```

## Adding Specialized Workflows

### Example: Migration Workflow

Create `src/workflows/migration.ts`:

```typescript
import { OrchestratorAgent } from '../agents/orchestrator.js';
import { DatabaseTools } from '../tools/database.js';

export class MigrationWorkflow {
  constructor(
    private orchestrator: OrchestratorAgent,
    private dbTools: DatabaseTools
  ) {}

  async createMigration(description: string): Promise<void> {
    console.log('Migration Workflow\n');
    
    // Step 1: Inspect current schema
    console.log('1. Inspecting current schema...');
    const schema = await this.dbTools.inspectSchema();
    
    // Step 2: Plan migration
    console.log('2. Planning migration...');
    const task = `
Create a database migration: ${description}

Current schema:
${schema.output}

Requirements:
- Use Prisma migrations
- Include both up and down migrations
- Consider data safety
- Add appropriate indexes
`;
    
    // Step 3: Execute through orchestrator
    await this.orchestrator.executeTask(task);
    
    // Step 4: Validation instructions
    console.log('\n✓ Migration created');
    console.log('Next steps:');
    console.log('1. Review the migration file');
    console.log('2. Test in development: npm run migrate:dev');
    console.log('3. Verify schema changes');
    console.log('4. Commit migration file');
  }
}
```

Use it:

```typescript
// In src/index.ts
program
  .command('migrate')
  .description('Create a database migration')
  .argument('<description>', 'Migration description')
  .action(async (description: string) => {
    // Initialize tools and orchestrator
    const workflow = new MigrationWorkflow(orchestrator, dbTools);
    await workflow.createMigration(description);
  });
```

## Adding Memory/Context

### Example: Task Memory

Create `src/memory/task-memory.ts`:

```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface TaskHistory {
  id: string;
  description: string;
  timestamp: Date;
  status: string;
  filesChanged: string[];
  learnings: string[];
}

export class TaskMemory {
  private memoryPath: string;
  private history: TaskHistory[] = [];

  constructor(repoPath: string) {
    this.memoryPath = join(repoPath, '.agent', 'memory', 'tasks.json');
  }

  async load(): Promise<void> {
    try {
      const data = await readFile(this.memoryPath, 'utf-8');
      this.history = JSON.parse(data);
    } catch {
      this.history = [];
    }
  }

  async save(): Promise<void> {
    await mkdir(join(this.memoryPath, '..'), { recursive: true });
    await writeFile(
      this.memoryPath,
      JSON.stringify(this.history, null, 2)
    );
  }

  async recordTask(task: TaskHistory): Promise<void> {
    this.history.push(task);
    await this.save();
  }

  getSimilarTasks(description: string, limit: number = 5): TaskHistory[] {
    // Simple similarity: check for common words
    const words = description.toLowerCase().split(/\s+/);
    
    const scored = this.history.map(task => {
      const taskWords = task.description.toLowerCase().split(/\s+/);
      const commonWords = words.filter(w => taskWords.includes(w));
      return {
        task,
        score: commonWords.length
      };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.task);
  }

  getRecentTasks(limit: number = 10): TaskHistory[] {
    return this.history
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }
}
```

Use it in the orchestrator:

```typescript
import { TaskMemory } from '../memory/task-memory.js';

export class OrchestratorAgent {
  private memory: TaskMemory;

  async executeTask(description: string): Promise<Task> {
    // Check similar past tasks
    const similar = this.memory.getSimilarTasks(description);
    
    if (similar.length > 0) {
      console.log(chalk.dim('Similar past tasks:'));
      similar.forEach(t => {
        console.log(chalk.dim(`  • ${t.description} (${t.status})`));
      });
      console.log();
    }

    // ... execute task ...

    // Record task
    await this.memory.recordTask({
      id: task.id,
      description: task.description,
      timestamp: new Date(),
      status: task.status,
      filesChanged: implementationResult.filesChanged,
      learnings: [
        // Extract learnings from the execution
      ]
    });
  }
}
```

## Advanced: Multi-Agent Collaboration

### Example: Feature Team Pattern

Create `src/workflows/feature-team.ts`:

```typescript
export class FeatureTeamWorkflow {
  constructor(
    private planner: PlannerAgent,
    private implementer: ImplementerAgent,
    private reviewer: ReviewerAgent,
    private securityReviewer: SecurityReviewerAgent
  ) {}

  async buildFeature(description: string): Promise<void> {
    // 1. Architecture planning
    const architecturePlan = await this.planner.createPlan(description);
    
    // 2. Security planning
    const securityRequirements = await this.securityReviewer.planSecurity(
      description,
      architecturePlan
    );
    
    // 3. Implementation (with security requirements)
    const implementation = await this.implementer.implement(
      architecturePlan,
      description,
      securityRequirements
    );
    
    // 4. Parallel reviews
    const [codeReview, securityReview] = await Promise.all([
      this.reviewer.review(description, architecturePlan, implementation),
      this.securityReviewer.reviewSecurity(implementation)
    ]);
    
    // 5. Aggregate results
    this.presentResults({
      plan: architecturePlan,
      implementation,
      codeReview,
      securityReview
    });
  }
}
```

## Testing Your Extensions

### Unit Tests for Tools

```typescript
// src/tools/__tests__/database.test.ts
describe('DatabaseTools', () => {
  let dbTools: DatabaseTools;

  beforeAll(() => {
    dbTools = new DatabaseTools(process.env.TEST_DATABASE_URL!);
  });

  it('should inspect schema', async () => {
    const result = await dbTools.inspectSchema();
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('users');
  });

  afterAll(async () => {
    await dbTools.close();
  });
});
```

### Integration Tests for Agents

```typescript
// src/agents/__tests__/security-reviewer.integration.test.ts
describe('SecurityReviewerAgent', () => {
  it('should identify missing authentication', async () => {
    const mockImplementation: ImplementationResult = {
      success: true,
      filesChanged: ['src/controllers/admin.controller.ts'],
      testsRun: [],
      testsPassed: true,
      diff: '+ router.delete("/users/:id", deleteUser);'
    };

    const review = await securityReviewer.reviewSecurity(mockImplementation);
    
    expect(review.approved).toBe(false);
    expect(review.criticalIssues).toContainEqual(
      expect.objectContaining({
        issue: expect.stringContaining('authentication')
      })
    );
  });
});
```

## Configuration for Extensions

Update `.env.example`:

```env
# Database (optional, for DatabaseTools)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Security scanning (optional)
ENABLE_SECURITY_SCAN=true

# Performance monitoring (optional)
ENABLE_PERFORMANCE_MONITORING=true
```

## Best Practices

### 1. Keep Tools Focused

Each tool should have a single responsibility:
- ✅ `DatabaseTools` - database operations
- ✅ `GitTools` - git operations
- ❌ `HelperTools` - vague, unclear purpose

### 2. Consistent Error Handling

All tools return `ToolResult`:

```typescript
try {
  // operation
  return { success: true, output: result };
} catch (error) {
  return { success: false, output: '', error: String(error) };
}
```

### 3. Agent System Prompts

Make system prompts:
- Specific about responsibilities
- Include clear principles
- Provide output format
- Include examples

### 4. Graceful Degradation

If a tool isn't available, continue:

```typescript
if (this.dbTools) {
  const schema = await this.dbTools.inspectSchema();
  context += schema.output;
} else {
  context += '(Database inspection unavailable)';
}
```

### 5. Observable Operations

Log what's happening:

```typescript
console.log(chalk.yellow('🔍 Inspecting database schema'));
const schema = await dbTools.inspectSchema();
console.log(chalk.green('✓ Schema inspected'));
```

## Next Steps

Once you've added extensions:

1. Update `README.md` with new capabilities
2. Add examples to `EXAMPLES.md`
3. Update `.agent/instructions.md` for the target repo
4. Test with real scenarios
5. Iterate based on results

## Community Extensions (Ideas)

Future extensions to build:

- **API Documentation Generator** - Auto-generate OpenAPI specs
- **Performance Profiler** - Identify N+1 queries and slow endpoints
- **Dependency Analyzer** - Track and update dependencies
- **Code Metrics** - Track complexity, coverage, technical debt
- **Deployment Agent** - Handle deployments with safety checks

The architecture is designed to be extended. Build what you need!
