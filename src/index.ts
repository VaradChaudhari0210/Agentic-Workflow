/**
 * Backend Engineer Agent - Main entry point
 */

import { config } from 'dotenv';
import { Command } from 'commander';
import { OrchestratorAgent } from './agents/orchestrator.js';
import { AgentConfig } from './types/index.js';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { join } from 'path';

config();

const program = new Command();

program
  .name('backend-agent')
  .description('Personal agentic workflow for backend engineering tasks')
  .version('0.1.0');

program
  .command('task')
  .description('Execute a backend engineering task')
  .argument('<description>', 'Task description')
  .option('-r, --repo <path>', 'Path to target repository', process.env.TARGET_REPO_PATH || '.')
  .option('-m, --model <model>', 'Claude model to use', process.env.MODEL || 'claude-sonnet-4-20250514')
  .option('--max-attempts <number>', 'Maximum implementation attempts', '3')
  .option('--approval <mode>', 'Approval mode: manual, auto, or suggest-only', 'manual')
  .option('--confirm-plan', 'Review and approve plan before implementation', false)
  .option('--no-summary', 'Skip generating task summary', false)
  .action(async (description: string, options) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable is required'));
      process.exit(1);
    }

    const agentConfig: AgentConfig = {
      apiKey,
      model: options.model,
      maxAttempts: parseInt(options.maxAttempts),
      approvalMode: options.approval,
      targetRepoPath: options.repo,
      confirmPlan: options.confirmPlan,
      generateSummary: options.summary !== false
    };

    const orchestrator = new OrchestratorAgent(agentConfig);
    
    try {
      await orchestrator.executeTask(description);
    } catch (error) {
      console.error(chalk.red('\nFatal error:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize agent knowledge base in target repository')
  .argument('[repo-path]', 'Path to target repository', '.')
  .option('--auto-discover', 'Automatically discover patterns', false)
  .action(async (repoPath: string, options) => {
    console.log(chalk.blue('Initializing agent knowledge base...\n'));
    
    if (options.autoDiscover) {
      // Use auto-discovery
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.error(chalk.red('Error: ANTHROPIC_API_KEY required for auto-discovery'));
        console.log(chalk.yellow('Tip: Use init without --auto-discover for template-based setup'));
        process.exit(1);
      }

      const agentConfig: AgentConfig = {
        apiKey,
        model: process.env.MODEL || 'claude-sonnet-4-20250514',
        maxAttempts: 3,
        approvalMode: 'manual',
        targetRepoPath: repoPath
      };

      const orchestrator = new OrchestratorAgent(agentConfig);
      
      console.log(chalk.yellow('🔍 Analyzing repository...\n'));
      
      // Access private method through a public interface
      // For now, we'll create a public method
      console.log(chalk.yellow('Running auto-discovery...'));
      console.log(chalk.dim('This may take 30-60 seconds\n'));
      
      // We'll trigger discovery by trying to execute a dummy task
      // The orchestrator will auto-discover first
      process.env.SKIP_DISCOVERY = 'false';
      
      try {
        // Instead, let's add a public discover method
        console.log(chalk.red('Error: Direct discovery not yet implemented'));
        console.log(chalk.yellow('Use: npm run dev task "your task" instead'));
        console.log(chalk.dim('The first task will trigger auto-discovery\n'));
      } catch (error) {
        console.error(chalk.red('Discovery failed:'), error);
        process.exit(1);
      }
      
      return;
    }
    
    const agentDir = join(repoPath, '.agent');
    
    // Create .agent directory structure
    const files = [
      {
        path: join(agentDir, 'instructions.md'),
        content: `# Backend Engineering Instructions

This directory contains knowledge and instructions for the Backend Engineer Agent.

## Purpose

The agent uses these files to understand:
- Project architecture and patterns
- Coding conventions and standards
- Database schema and migrations
- API conventions
- Security requirements
- Testing practices

## Files

- \`architecture.md\` - System architecture overview
- \`conventions.md\` - Coding conventions and standards
- \`database.md\` - Database schema and patterns
- \`api.md\` - API design conventions
- \`security.md\` - Security requirements
- \`testing.md\` - Testing practices
- \`decisions/\` - Architecture Decision Records (ADRs)
`
      },
      {
        path: join(agentDir, 'architecture.md'),
        content: `# Architecture

## Stack

- Node.js
- Express / Fastify / NestJS (specify your framework)
- TypeScript
- PostgreSQL / MySQL / MongoDB (specify your database)
- Prisma / TypeORM (specify your ORM)

## Architecture Pattern

\`\`\`
Request
  ↓
Controller (HTTP layer)
  ↓
Service (Business logic)
  ↓
Repository (Data access)
  ↓
Database
\`\`\`

## Key Principles

- Controllers handle HTTP concerns only
- Business logic belongs in services
- Data access belongs in repositories
- Services should not directly access the database layer
`
      },
      {
        path: join(agentDir, 'conventions.md'),
        content: `# Coding Conventions

## Naming

- Files: kebab-case (user-service.ts)
- Classes: PascalCase (UserService)
- Functions: camelCase (getUserById)
- Constants: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)

## File Organization

\`\`\`
src/
  ├── controllers/
  ├── services/
  ├── repositories/
  ├── models/
  ├── dto/
  ├── middleware/
  └── utils/
\`\`\`

## TypeScript

- Always use strict mode
- No implicit any
- Prefer interfaces over types for object shapes
- Use const assertions where appropriate
`
      },
      {
        path: join(agentDir, 'database.md'),
        content: `# Database

## Schema

(Document your schema here, or reference schema files)

## Migrations

- Migration tool: (Prisma Migrate / TypeORM migrations / etc.)
- Always create migrations for schema changes
- Never modify existing migrations
- Test migrations in development first

## Query Patterns

- Always use parameterized queries
- Use transactions for multi-step operations
- Consider indexes for frequent queries
`
      },
      {
        path: join(agentDir, 'api.md'),
        content: `# API Conventions

## REST Conventions

- GET /resources - List
- GET /resources/:id - Get one
- POST /resources - Create
- PUT /resources/:id - Update (full)
- PATCH /resources/:id - Update (partial)
- DELETE /resources/:id - Delete

## Response Format

\`\`\`typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}
\`\`\`

## Status Codes

- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 500 - Internal Server Error
`
      },
      {
        path: join(agentDir, 'security.md'),
        content: `# Security Requirements

## Authentication

- Method: JWT / Session / OAuth (specify)
- Token storage: (specify)
- Token expiry: (specify)

## Authorization

- Role-based access control
- Check permissions at service layer
- Never trust client-provided authorization claims

## Input Validation

- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Validate file uploads

## Secrets

- Never commit secrets
- Use environment variables
- Rotate secrets regularly
`
      },
      {
        path: join(agentDir, 'testing.md'),
        content: `# Testing Practices

## Test Structure

\`\`\`
tests/
  ├── unit/
  ├── integration/
  └── e2e/
\`\`\`

## Unit Tests

- Test business logic in isolation
- Mock external dependencies
- Cover edge cases and error paths

## Integration Tests

- Test database interactions
- Test API endpoints
- Use test database

## Test Naming

\`\`\`typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when user exists', () => {});
    it('should throw NotFoundError when user does not exist', () => {});
  });
});
\`\`\`
`
      },
      {
        path: join(agentDir, 'decisions', 'README.md'),
        content: `# Architecture Decision Records (ADRs)

Store significant architectural decisions here.

Format:
- ADR-XXX-title.md

Example: ADR-001-authentication-strategy.md
`
      }
    ];

    const { mkdir, writeFile } = await import('fs/promises');
    
    for (const file of files) {
      await mkdir(join(file.path, '..'), { recursive: true });
      await writeFile(file.path, file.content);
      console.log(chalk.green('✓'), chalk.dim(file.path.replace(repoPath, '.')));
    }
    
    console.log(chalk.green('\n✓ Agent knowledge base initialized'));
    console.log(chalk.dim('\nEdit the files in .agent/ to customize for your project.'));
  });

program
  .command('discover')
  .description('Auto-discover repository patterns and generate .agent/ knowledge base')
  .argument('[repo-path]', 'Path to target repository', '.')
  .action(async (repoPath: string) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable is required'));
      process.exit(1);
    }

    console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue('║') + chalk.bold('  Repository Auto-Discovery') + chalk.blue('                           ║'));
    console.log(chalk.blue('╚══════════════════════════════════════════════════════════╝\n'));
    console.log(chalk.cyan('Target:'), repoPath);
    console.log(chalk.dim('─'.repeat(60)) + '\n');

    const agentConfig: AgentConfig = {
      apiKey,
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      maxAttempts: 3,
      approvalMode: 'manual',
      targetRepoPath: repoPath
    };

    try {
      const orchestrator = new OrchestratorAgent(agentConfig);
      
      // We need to expose the discovery as a public method
      // For now, we'll import and use the DiscoveryAgent directly
      const { DiscoveryAgent } = await import('./agents/discovery.js');
      const { FilesystemTools } = await import('./tools/filesystem.js');
      const { GitTools } = await import('./tools/git.js');
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      
      const client = new Anthropic({ apiKey });
      const fsTools = new FilesystemTools(repoPath);
      const gitTools = new GitTools(repoPath);
      const discoveryAgent = new DiscoveryAgent(client, agentConfig.model, fsTools, gitTools);
      
      console.log(chalk.yellow('🔍 Analyzing repository patterns...\n'));
      console.log(chalk.dim('This may take 30-60 seconds depending on repository size\n'));
      
      const discoveryResult = await discoveryAgent.discoverRepository();
      
      console.log(chalk.green('✓ Repository analyzed'));
      console.log(chalk.dim(`  Confidence: ${discoveryResult.confidence}\n`));
      
      // Create .agent directory structure
      const agentFiles = [
        { path: '.agent/instructions.md', name: 'Instructions' },
        { path: '.agent/architecture.md', name: 'Architecture', content: discoveryResult.architecture },
        { path: '.agent/conventions.md', name: 'Conventions', content: discoveryResult.conventions },
        { path: '.agent/database.md', name: 'Database', content: discoveryResult.database },
        { path: '.agent/api.md', name: 'API Patterns', content: discoveryResult.api },
        { path: '.agent/security.md', name: 'Security', content: discoveryResult.security },
        { path: '.agent/testing.md', name: 'Testing', content: discoveryResult.testing },
      ];
      
      const instructionsContent = `# Backend Engineering Instructions

This directory contains knowledge and instructions for the Backend Engineer Agent.

**Auto-generated on:** ${new Date().toISOString()}
**Confidence Level:** ${discoveryResult.confidence}

## Files

- \`architecture.md\` - System architecture (auto-detected)
- \`conventions.md\` - Coding conventions (auto-detected)
- \`database.md\` - Database patterns (auto-detected)
- \`api.md\` - API conventions (auto-detected)
- \`security.md\` - Security requirements (auto-detected)
- \`testing.md\` - Testing practices (auto-detected)
- \`decisions/\` - Architecture Decision Records (add your own)

## Important: Review Required

These files were auto-generated by analyzing your codebase. Please:

1. ✅ Review each file for accuracy
2. ✅ Correct any misunderstandings
3. ✅ Add project-specific details
4. ✅ Document special requirements
5. ✅ Add ADRs in decisions/ folder

The agent learns from these files and follows your documented patterns.
`;
      
      agentFiles[0].content = instructionsContent;
      
      console.log(chalk.yellow('📝 Generating knowledge base files...\n'));
      
      for (const file of agentFiles) {
        if (!file.content) continue;
        const result = await fsTools.writeFile(file.path, file.content);
        if (result.success) {
          console.log(chalk.green('  ✓'), chalk.dim(file.name.padEnd(15)), chalk.gray(file.path));
        } else {
          console.log(chalk.red('  ✗'), file.name, chalk.red(result.error));
        }
      }
      
      // Create decisions directory
      const decisionsReadme = `# Architecture Decision Records

Document important architectural decisions here using the ADR format.

## Template

Create new ADRs as: ADR-XXX-title.md

Format:
- Status: Proposed | Accepted | Deprecated
- Context: What problem are we solving?
- Decision: What did we decide?
- Consequences: What are the implications?
`;
      
      await fsTools.writeFile('.agent/decisions/README.md', decisionsReadme);
      console.log(chalk.green('  ✓'), chalk.dim('Decisions       '), chalk.gray('.agent/decisions/'));
      
      console.log(chalk.green('\n✓ Knowledge base generated!\n'));
      
      if (discoveryResult.recommendations.length > 0) {
        console.log(chalk.yellow('💡 Recommendations:\n'));
        discoveryResult.recommendations.forEach((rec, i) => {
          console.log(chalk.dim(`   ${i + 1}. ${rec}`));
        });
        console.log();
      }
      
      console.log(chalk.cyan('📋 Next Steps:\n'));
      console.log(chalk.dim('   1. Review files in .agent/ directory'));
      console.log(chalk.dim('   2. Edit them to match your exact requirements'));
      console.log(chalk.dim('   3. Add any missing information'));
      console.log(chalk.dim('   4. Run your first task:\n'));
      console.log(chalk.cyan(`      npm run dev task "Add health check endpoint" --repo "${repoPath}"`));
      console.log();
      
    } catch (error) {
      console.error(chalk.red('\nError during discovery:'), error);
      process.exit(1);
    }
  });

program.parse();
