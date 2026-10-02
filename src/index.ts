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
      targetRepoPath: options.repo
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
  .action(async (repoPath: string) => {
    console.log(chalk.blue('Initializing agent knowledge base...\n'));
    
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

program.parse();
