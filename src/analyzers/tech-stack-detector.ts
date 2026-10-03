/**
 * Tech Stack Detector - Analyzes project to identify technology stack
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { TechStack } from '../types/architecture.js';

export class TechStackDetector {
  constructor(private repoPath: string) {}

  async detect(): Promise<TechStack> {
    const stack: TechStack = {
      language: 'JavaScript',
      packageManager: await this.detectPackageManager()
    };

    // Detect from package.json
    const packageJson = await this.readPackageJson();
    if (packageJson) {
      Object.assign(stack, await this.analyzePackageJson(packageJson));
    }

    // Detect TypeScript
    if (await this.hasTypeScript()) {
      stack.language = 'TypeScript';
      stack.version = await this.getTypeScriptVersion(packageJson);
    }

    // Detect framework
    stack.framework = await this.detectFramework(packageJson);
    stack.frameworkVersion = await this.getFrameworkVersion(packageJson, stack.framework);

    // Detect build tool
    stack.buildTool = await this.detectBuildTool(packageJson);

    // Detect testing framework
    stack.testing = await this.detectTesting(packageJson);

    // Detect API framework
    stack.api = await this.detectApiFramework(packageJson);

    // Detect database/ORM
    const dbInfo = await this.detectDatabase(packageJson);
    stack.database = dbInfo.database;
    stack.orm = dbInfo.orm;

    // Detect runtime
    stack.runtime = await this.detectRuntime(packageJson);

    return stack;
  }

  private async readPackageJson(): Promise<any> {
    try {
      const path = join(this.repoPath, 'package.json');
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async analyzePackageJson(pkg: any): Promise<Partial<TechStack>> {
    const stack: Partial<TechStack> = {};
    
    // Check for monorepo tools
    if (pkg.workspaces) {
      stack.buildTool = 'npm workspaces';
    }

    return stack;
  }

  private async hasTypeScript(): Promise<boolean> {
    return existsSync(join(this.repoPath, 'tsconfig.json'));
  }

  private async getTypeScriptVersion(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return deps.typescript?.replace(/[\^~]/, '');
  }

  private async detectFramework(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Node.js frameworks
    if (deps.express) return 'Express';
    if (deps.fastify) return 'Fastify';
    if (deps['@nestjs/core']) return 'NestJS';
    if (deps.koa) return 'Koa';
    if (deps.hapi || deps['@hapi/hapi']) return 'Hapi';

    // Frontend frameworks (if present)
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue';
    if (deps['@angular/core']) return 'Angular';
    if (deps.svelte) return 'Svelte';
    if (deps.next) return 'Next.js';
    if (deps.nuxt) return 'Nuxt';

    return undefined;
  }

  private async getFrameworkVersion(pkg: any, framework?: string): Promise<string | undefined> {
    if (!pkg || !framework) return undefined;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const frameworkMap: Record<string, string> = {
      'Express': 'express',
      'Fastify': 'fastify',
      'NestJS': '@nestjs/core',
      'Koa': 'koa',
      'Hapi': 'hapi',
      'React': 'react',
      'Vue': 'vue',
      'Angular': '@angular/core',
      'Next.js': 'next',
      'Nuxt': 'nuxt'
    };

    const depName = frameworkMap[framework];
    return deps[depName]?.replace(/[\^~]/, '');
  }

  private async detectBuildTool(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.webpack) return 'Webpack';
    if (deps.vite) return 'Vite';
    if (deps.esbuild) return 'esbuild';
    if (deps.rollup) return 'Rollup';
    if (deps.parcel) return 'Parcel';
    if (deps.turbo) return 'Turborepo';
    if (deps.nx) return 'Nx';
    
    // Check for tsc
    if (deps.typescript && !deps.webpack && !deps.vite) {
      return 'tsc';
    }

    // Check for ts-node / tsx
    if (deps['ts-node'] || deps.tsx) return 'ts-node/tsx';

    return undefined;
  }

  private async detectTesting(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.vitest) return 'Vitest';
    if (deps.jest) return 'Jest';
    if (deps.mocha) return 'Mocha';
    if (deps.ava) return 'AVA';
    if (deps.tap) return 'Tap';
    if (deps['@playwright/test']) return 'Playwright';
    if (deps.cypress) return 'Cypress';

    return undefined;
  }

  private async detectApiFramework(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // GraphQL
    if (deps.graphql || deps['apollo-server']) return 'GraphQL';
    if (deps['@apollo/server']) return 'Apollo Server';

    // tRPC
    if (deps['@trpc/server']) return 'tRPC';

    // REST helpers
    if (deps['express-validator']) return 'REST with validation';

    return 'REST'; // Default assumption for backend
  }

  private async detectDatabase(pkg: any): Promise<{ database?: string; orm?: string }> {
    if (!pkg) return {};

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const result: { database?: string; orm?: string } = {};

    // ORM detection
    if (deps.prisma || deps['@prisma/client']) {
      result.orm = 'Prisma';
    } else if (deps.typeorm) {
      result.orm = 'TypeORM';
    } else if (deps.sequelize) {
      result.orm = 'Sequelize';
    } else if (deps.mongoose) {
      result.orm = 'Mongoose';
    } else if (deps['drizzle-orm']) {
      result.orm = 'Drizzle';
    } else if (deps.knex) {
      result.orm = 'Knex';
    }

    // Database detection
    if (deps.pg || deps.postgres) {
      result.database = 'PostgreSQL';
    } else if (deps.mysql || deps.mysql2) {
      result.database = 'MySQL';
    } else if (deps.mongodb) {
      result.database = 'MongoDB';
    } else if (deps.sqlite3 || deps['better-sqlite3']) {
      result.database = 'SQLite';
    } else if (deps.redis || deps.ioredis) {
      result.database = 'Redis';
    }

    return result;
  }

  private async detectRuntime(pkg: any): Promise<string | undefined> {
    if (!pkg) return undefined;

    // Check engines field
    if (pkg.engines?.node) {
      return `Node.js ${pkg.engines.node}`;
    }

    // Check for Deno
    if (existsSync(join(this.repoPath, 'deno.json'))) {
      return 'Deno';
    }

    // Check for Bun
    if (existsSync(join(this.repoPath, 'bun.lockb'))) {
      return 'Bun';
    }

    return 'Node.js';
  }

  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    if (existsSync(join(this.repoPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (existsSync(join(this.repoPath, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }
}
