/**
 * Git tools for version control operations
 */

import simpleGit, { SimpleGit } from 'simple-git';
import { ToolResult } from '../types/index.js';

export class GitTools {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  async status(): Promise<ToolResult> {
    try {
      const status = await this.git.status();
      
      const output = `
Branch: ${status.current}
Ahead: ${status.ahead}, Behind: ${status.behind}

Modified: ${status.modified.length}
${status.modified.map(f => `  - ${f}`).join('\n')}

Created: ${status.created.length}
${status.created.map(f => `  - ${f}`).join('\n')}

Deleted: ${status.deleted.length}
${status.deleted.map(f => `  - ${f}`).join('\n')}

Untracked: ${status.not_added.length}
${status.not_added.map(f => `  - ${f}`).join('\n')}
      `.trim();
      
      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Git status failed: ${error}`
      };
    }
  }

  async diff(file?: string): Promise<ToolResult> {
    try {
      const diff = file 
        ? await this.git.diff([file])
        : await this.git.diff();
      
      return {
        success: true,
        output: diff || 'No changes'
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Git diff failed: ${error}`
      };
    }
  }

  async log(count: number = 10): Promise<ToolResult> {
    try {
      const log = await this.git.log({ maxCount: count });
      
      const output = log.all
        .map(commit => `${commit.hash.substring(0, 7)} - ${commit.message} (${commit.author_name})`)
        .join('\n');
      
      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Git log failed: ${error}`
      };
    }
  }

  async createBranch(branchName: string): Promise<ToolResult> {
    try {
      await this.git.checkoutLocalBranch(branchName);
      
      return {
        success: true,
        output: `Created and checked out branch: ${branchName}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to create branch: ${error}`
      };
    }
  }

  async checkout(branchName: string): Promise<ToolResult> {
    try {
      await this.git.checkout(branchName);
      
      return {
        success: true,
        output: `Checked out branch: ${branchName}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to checkout branch: ${error}`
      };
    }
  }

  async add(files: string[]): Promise<ToolResult> {
    try {
      await this.git.add(files);
      
      return {
        success: true,
        output: `Staged files: ${files.join(', ')}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to stage files: ${error}`
      };
    }
  }

  async commit(message: string): Promise<ToolResult> {
    try {
      const result = await this.git.commit(message);
      
      return {
        success: true,
        output: `Committed: ${result.commit} - ${message}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to commit: ${error}`
      };
    }
  }

  async currentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch {
      return 'unknown';
    }
  }

  async branches(): Promise<ToolResult> {
    try {
      const result = await this.git.branch();
      
      const output = `
Current: ${result.current}

All branches:
${result.all.map(b => b === result.current ? `* ${b}` : `  ${b}`).join('\n')}
      `.trim();
      
      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to list branches: ${error}`
      };
    }
  }
}
