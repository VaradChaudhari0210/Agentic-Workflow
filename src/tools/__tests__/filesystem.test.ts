/**
 * Tests for Filesystem Tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemTools } from '../filesystem.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemTools', () => {
  let testDir: string;
  let fsTools: FilesystemTools;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `agent-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    fsTools = new FilesystemTools(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      await writeFile(join(testDir, 'file1.txt'), 'content1');
      await writeFile(join(testDir, 'file2.txt'), 'content2');

      const result = await fsTools.listFiles();

      expect(result.success).toBe(true);
      expect(result.output).toContain('file1.txt');
      expect(result.output).toContain('file2.txt');
    });

    it('should list files recursively', async () => {
      await mkdir(join(testDir, 'subdir'), { recursive: true });
      await writeFile(join(testDir, 'subdir', 'nested.txt'), 'nested');

      const result = await fsTools.listFiles('', true);

      expect(result.success).toBe(true);
      expect(result.output).toContain('subdir');
    });

    it('should skip node_modules and .git', async () => {
      await mkdir(join(testDir, 'node_modules'), { recursive: true });
      await mkdir(join(testDir, '.git'), { recursive: true });
      await writeFile(join(testDir, 'node_modules', 'package.js'), 'code');

      const result = await fsTools.listFiles('', true);

      expect(result.success).toBe(true);
      expect(result.output).not.toContain('node_modules');
      expect(result.output).not.toContain('.git');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'test content';
      await writeFile(join(testDir, 'test.txt'), content);

      const result = await fsTools.readFile('test.txt');

      expect(result.success).toBe(true);
      expect(result.output).toBe(content);
    });

    it('should fail gracefully for non-existent file', async () => {
      const result = await fsTools.readFile('nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const content = 'new content';
      const result = await fsTools.writeFile('new.txt', content);

      expect(result.success).toBe(true);

      // Verify file was written
      const readResult = await fsTools.readFile('new.txt');
      expect(readResult.output).toBe(content);
    });

    it('should create parent directories', async () => {
      const result = await fsTools.writeFile('deep/nested/file.txt', 'content');

      expect(result.success).toBe(true);

      const readResult = await fsTools.readFile('deep/nested/file.txt');
      expect(readResult.success).toBe(true);
    });
  });

  describe('searchCode', () => {
    beforeEach(async () => {
      await writeFile(join(testDir, 'file1.ts'), 'function getUserById() {}');
      await writeFile(join(testDir, 'file2.ts'), 'function getUser() {}');
    });

    it('should find matches in files', async () => {
      const result = await fsTools.searchCode('getUserById');

      expect(result.success).toBe(true);
      expect(result.output).toContain('file1.ts');
      expect(result.output).toContain('getUserById');
    });

    it('should be case-insensitive', async () => {
      const result = await fsTools.searchCode('GETUSERBYID');

      expect(result.success).toBe(true);
      expect(result.output).toContain('file1.ts');
    });

    it('should return no matches message when nothing found', async () => {
      const result = await fsTools.searchCode('nonexistent');

      expect(result.success).toBe(true);
      expect(result.output).toBe('No matches found');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await writeFile(join(testDir, 'exists.txt'), 'content');

      const exists = await fsTools.fileExists('exists.txt');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await fsTools.fileExists('notexists.txt');

      expect(exists).toBe(false);
    });
  });
});
