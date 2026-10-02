/**
 * Shell tools for running commands, tests, and builds
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolResult } from '../types/index.js';

const execAsync = promisify(exec);

export class ShellTools {
  constructor(private repoPath: string) {}

  async runCommand(command: string, timeout: number = 60000): Promise<ToolResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.repoPath,
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        success: true,
        output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
    }
  }

  async runTests(testPattern?: string): Promise<ToolResult> {
    try {
      // Detect test runner
      const testCommand = await this.detectTestCommand();
      
      if (!testCommand) {
        return {
          success: false,
          output: '',
          error: 'No test runner detected (npm test, jest, vitest, etc.)'
        };
      }
      
      const command = testPattern 
        ? `${testCommand} ${testPattern}`
        : testCommand;
      
      return await this.runCommand(command, 120000); // 2 minute timeout for tests
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Test execution failed: ${error}`
      };
    }
  }

  async runLinter(): Promise<ToolResult> {
    const lintCommands = ['npm run lint', 'yarn lint', 'pnpm lint'];
    
    for (const command of lintCommands) {
      const result = await this.runCommand(command, 60000);
      if (result.success || result.output) {
        return result;
      }
    }
    
    return {
      success: false,
      output: '',
      error: 'No linter configuration found'
    };
  }

  async runTypecheck(): Promise<ToolResult> {
    const typecheckCommands = ['npm run typecheck', 'tsc --noEmit', 'yarn typecheck'];
    
    for (const command of typecheckCommands) {
      const result = await this.runCommand(command, 60000);
      if (result.success || result.output) {
        return result;
      }
    }
    
    return {
      success: false,
      output: '',
      error: 'No TypeScript configuration found'
    };
  }

  async buildProject(): Promise<ToolResult> {
    const buildCommands = ['npm run build', 'yarn build', 'pnpm build'];
    
    for (const command of buildCommands) {
      const result = await this.runCommand(command, 180000); // 3 minute timeout
      if (result.success || result.output) {
        return result;
      }
    }
    
    return {
      success: false,
      output: '',
      error: 'No build script found'
    };
  }

  async installDependencies(): Promise<ToolResult> {
    // Detect package manager
    const packageManager = await this.detectPackageManager();
    const command = packageManager === 'npm' ? 'npm install' :
                    packageManager === 'yarn' ? 'yarn install' :
                    'pnpm install';
    
    return await this.runCommand(command, 180000);
  }

  private async detectTestCommand(): Promise<string | null> {
    try {
      const packageJsonResult = await this.runCommand('cat package.json');
      if (packageJsonResult.success) {
        const packageJson = JSON.parse(packageJsonResult.output);
        
        if (packageJson.scripts?.test) {
          return 'npm test';
        }
        
        if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
          return 'npx jest';
        }
        
        if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
          return 'npx vitest run';
        }
      }
    } catch {
      // Ignore errors
    }
    
    return null;
  }

  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    const yarnResult = await this.runCommand('test -f yarn.lock && echo "yarn"');
    if (yarnResult.output.includes('yarn')) return 'yarn';
    
    const pnpmResult = await this.runCommand('test -f pnpm-lock.yaml && echo "pnpm"');
    if (pnpmResult.output.includes('pnpm')) return 'pnpm';
    
    return 'npm';
  }
}
