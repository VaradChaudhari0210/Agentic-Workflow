/**
 * Filesystem tools for repository inspection and manipulation
 */

import { readdir, readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { ToolResult } from '../types/index.js';

export class FilesystemTools {
  constructor(private repoPath: string) {}

  async listFiles(path: string = '', recursive: boolean = false): Promise<ToolResult> {
    try {
      const fullPath = join(this.repoPath, path);
      const files: string[] = [];
      
      const items = await readdir(fullPath, { withFileTypes: true });
      
      for (const item of items) {
        // Skip node_modules, .git, dist, etc.
        if (this.shouldSkip(item.name)) continue;
        
        const relativePath = join(path, item.name);
        
        if (item.isDirectory()) {
          if (recursive) {
            const subResult = await this.listFiles(relativePath, true);
            if (subResult.success) {
              files.push(...subResult.output.split('\n').filter(f => f));
            }
          } else {
            files.push(`${relativePath}/`);
          }
        } else {
          files.push(relativePath);
        }
      }
      
      return {
        success: true,
        output: files.join('\n')
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to list files: ${error}`
      };
    }
  }

  async readFile(path: string): Promise<ToolResult> {
    try {
      const fullPath = join(this.repoPath, path);
      const content = await readFile(fullPath, 'utf-8');
      
      return {
        success: true,
        output: content
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to read file: ${error}`
      };
    }
  }

  async writeFile(path: string, content: string): Promise<ToolResult> {
    try {
      const fullPath = join(this.repoPath, path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      
      return {
        success: true,
        output: `Successfully wrote to ${path}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to write file: ${error}`
      };
    }
  }

  async deleteFile(path: string): Promise<ToolResult> {
    try {
      const fullPath = join(this.repoPath, path);
      await rm(fullPath, { recursive: true });
      
      return {
        success: true,
        output: `Successfully deleted ${path}`
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to delete file: ${error}`
      };
    }
  }

  async searchCode(query: string, filePattern?: string): Promise<ToolResult> {
    try {
      const results: Array<{ file: string; line: number; content: string }> = [];
      const files = await this.getAllFiles(filePattern);
      
      for (const file of files) {
        const content = await readFile(join(this.repoPath, file), 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              file,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
      
      const output = results
        .map(r => `${r.file}:${r.line}: ${r.content}`)
        .join('\n');
      
      return {
        success: true,
        output: output || 'No matches found'
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Search failed: ${error}`
      };
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const fullPath = join(this.repoPath, path);
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private async getAllFiles(pattern?: string): Promise<string[]> {
    const result = await this.listFiles('', true);
    if (!result.success) return [];
    
    let files = result.output.split('\n').filter(f => f && !f.endsWith('/'));
    
    if (pattern) {
      const regex = new RegExp(pattern);
      files = files.filter(f => regex.test(f));
    }
    
    return files;
  }

  private shouldSkip(name: string): boolean {
    const skipList = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.turbo',
      '.env',
      '.DS_Store'
    ];
    
    return skipList.includes(name) || name.startsWith('.');
  }
}
