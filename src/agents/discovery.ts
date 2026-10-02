/**
 * Discovery Agent - Automatically analyzes repository and generates .agent/ knowledge base
 */

import Anthropic from '@anthropic-ai/sdk';
import { FilesystemTools } from '../tools/filesystem.js';
import { GitTools } from '../tools/git.js';

const DISCOVERY_SYSTEM_PROMPT = `You are a Repository Discovery Agent specialized in analyzing backend projects.

Your task is to thoroughly analyze a repository and generate comprehensive documentation for the .agent/ knowledge base.

Analyze:

**1. Technology Stack**
- Framework (Express, Fastify, NestJS, Koa, Hapi)
- Language version (Node.js version, TypeScript config)
- Database (PostgreSQL, MySQL, MongoDB, etc.)
- ORM/Query builder (Prisma, TypeORM, Sequelize, Knex)
- Authentication (JWT, Passport, OAuth, Sessions)
- Testing framework (Jest, Vitest, Mocha)
- Other key dependencies

**2. Architecture Pattern**
- Project structure (how code is organized)
- Layer separation (controllers, services, repositories, models)
- Data flow pattern
- Middleware usage
- Error handling approach

**3. Code Conventions**
- File naming (kebab-case, camelCase, PascalCase)
- Directory structure
- Class/function naming patterns
- Import/export patterns
- Comment style

**4. API Patterns**
- REST conventions used
- Response format structure
- Status code usage
- Error response format
- Pagination approach
- Validation approach

**5. Database Patterns**
- Schema structure
- Migration approach
- Query patterns
- Transaction usage
- Relationship handling

**6. Security Patterns**
- Authentication mechanism
- Authorization approach
- Input validation
- Password handling
- Secret management

**7. Testing Patterns**
- Test organization
- Naming conventions
- Mock/stub patterns
- Coverage approach

Return a JSON object with complete documentation:
{
  "architecture": "markdown content for architecture.md",
  "conventions": "markdown content for conventions.md",
  "database": "markdown content for database.md",
  "api": "markdown content for api.md",
  "security": "markdown content for security.md",
  "testing": "markdown content for testing.md",
  "confidence": "high|medium|low",
  "recommendations": ["suggestions for missing patterns"]
}

Be thorough and specific. Quote actual code patterns you find.`;

export interface DiscoveryResult {
  architecture: string;
  conventions: string;
  database: string;
  api: string;
  security: string;
  testing: string;
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export class DiscoveryAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private fsTools: FilesystemTools,
    private gitTools: GitTools
  ) {}

  async discoverRepository(): Promise<DiscoveryResult> {
    console.log('🔍 Discovering repository patterns...\n');

    // Gather comprehensive context
    const context = await this.gatherRepositoryContext();

    const userMessage = `
Analyze this repository and generate comprehensive documentation for the .agent/ knowledge base.

${context}

Generate detailed documentation based on the actual patterns found in this codebase.
`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: DISCOVERY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from discovery agent');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract discovery results from response');
    }

    try {
      const result = JSON.parse(jsonMatch[0]) as DiscoveryResult;
      return result;
    } catch (error) {
      throw new Error(`Failed to parse discovery results: ${error}`);
    }
  }

  private async gatherRepositoryContext(): Promise<string> {
    const context: string[] = [];

    // 1. Package.json - Most important for stack detection
    const packageJson = await this.readImportantFile('package.json');
    if (packageJson) {
      context.push('=== package.json ===');
      context.push(packageJson);
    }

    // 2. TypeScript config
    const tsConfig = await this.readImportantFile('tsconfig.json');
    if (tsConfig) {
      context.push('\n=== tsconfig.json ===');
      context.push(tsConfig);
    }

    // 3. Database schema (Prisma)
    const prismaSchema = await this.readImportantFile('prisma/schema.prisma');
    if (prismaSchema) {
      context.push('\n=== prisma/schema.prisma ===');
      context.push(prismaSchema);
    }

    // 4. Main entry point
    const entryPoints = ['src/index.ts', 'src/main.ts', 'src/app.ts', 'src/server.ts', 'index.ts', 'app.ts'];
    for (const entry of entryPoints) {
      const content = await this.readImportantFile(entry);
      if (content) {
        context.push(`\n=== ${entry} ===`);
        context.push(content);
        break; // Only need one entry point
      }
    }

    // 5. Sample controller (to understand API patterns)
    const controllerFiles = await this.findFiles('controller');
    if (controllerFiles.length > 0) {
      const sampleController = await this.fsTools.readFile(controllerFiles[0]);
      if (sampleController.success) {
        context.push(`\n=== Sample Controller: ${controllerFiles[0]} ===`);
        context.push(sampleController.output);
      }
    }

    // 6. Sample service (to understand business logic patterns)
    const serviceFiles = await this.findFiles('service');
    if (serviceFiles.length > 0) {
      const sampleService = await this.fsTools.readFile(serviceFiles[0]);
      if (sampleService.success) {
        context.push(`\n=== Sample Service: ${serviceFiles[0]} ===`);
        context.push(sampleService.output);
      }
    }

    // 7. Sample test (to understand testing patterns)
    const testFiles = await this.findFiles('test');
    if (testFiles.length > 0) {
      const sampleTest = await this.fsTools.readFile(testFiles[0]);
      if (sampleTest.success) {
        context.push(`\n=== Sample Test: ${testFiles[0]} ===`);
        context.push(sampleTest.output);
      }
    }

    // 8. Directory structure
    const structure = await this.fsTools.listFiles('src', true);
    if (structure.success) {
      context.push('\n=== Directory Structure (src/) ===');
      context.push(structure.output);
    }

    // 9. Environment example (for configuration patterns)
    const envExample = await this.readImportantFile('.env.example');
    if (envExample) {
      context.push('\n=== .env.example ===');
      context.push(envExample);
    }

    // 10. README (for additional context)
    const readme = await this.readImportantFile('README.md');
    if (readme) {
      context.push('\n=== README.md (first 100 lines) ===');
      const lines = readme.split('\n').slice(0, 100);
      context.push(lines.join('\n'));
    }

    // 11. Git history (recent commits give context)
    const gitLog = await this.gitTools.log(10);
    if (gitLog.success) {
      context.push('\n=== Recent Git History ===');
      context.push(gitLog.output);
    }

    return context.join('\n');
  }

  private async readImportantFile(path: string): Promise<string | null> {
    const exists = await this.fsTools.fileExists(path);
    if (!exists) return null;

    const result = await this.fsTools.readFile(path);
    return result.success ? result.output : null;
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const allFiles = await this.fsTools.listFiles('src', true);
    if (!allFiles.success) return [];

    const files = allFiles.output
      .split('\n')
      .filter(f => f.toLowerCase().includes(pattern) && !f.includes('node_modules'));

    return files.slice(0, 3); // Return up to 3 samples
  }
}
