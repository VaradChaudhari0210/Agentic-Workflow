/**
 * Tests for Usage Tracker
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UsageTracker } from '../usage-tracker.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('UsageTracker', () => {
  let testDir: string;
  let tracker: UsageTracker;

  beforeEach(async () => {
    testDir = join(tmpdir(), `usage-tracker-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    tracker = new UsageTracker(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('trackUsage', () => {
    it('should detect ES6 imports', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import express from 'express';
import lodash from 'lodash';`
      );

      const result = await tracker.trackUsage(['express', 'lodash']);

      const expressInfo = result.find(r => r.package === 'express');
      const lodashInfo = result.find(r => r.package === 'lodash');

      expect(expressInfo).toBeDefined();
      expect(expressInfo?.importCount).toBeGreaterThan(0);
      expect(expressInfo?.isDeclared).toBe(true);

      expect(lodashInfo).toBeDefined();
      expect(lodashInfo?.importCount).toBeGreaterThan(0);
      expect(lodashInfo?.isDeclared).toBe(true);
    });

    it('should skip relative imports', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import something from './local';
import other from '../shared/utils';`
      );

      const result = await tracker.trackUsage([]);

      const localInfo = result.find(r => r.package === './local');
      const relativeInfo = result.find(r => r.package === '../shared/utils');

      expect(localInfo).toBeUndefined();
      expect(relativeInfo).toBeUndefined();
    });

    it('should handle scoped packages', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import { something } from '@types/node';
import axios from '@types/express';`
      );

      const result = await tracker.trackUsage(['@types/node']);

      const typesNodeInfo = result.find(r => r.package === '@types/node');
      expect(typesNodeInfo).toBeDefined();
      expect(typesNodeInfo?.importCount).toBeGreaterThan(0);
      expect(typesNodeInfo?.isDeclared).toBe(true);
    });
  });

  describe('findUnused', () => {
    it('should detect unused packages', async () => {
      // Create a file that doesn't use lodash
      await writeFile(
        join(testDir, 'index.ts'),
        `import express from 'express';`
      );

      const result = await tracker.findUnused(['express', 'lodash']);

      expect(result).toContain('lodash');
      expect(result).not.toContain('express');
    });
  });

  describe('findUndeclared', () => {
    it('should detect packages used but not declared', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import axios from 'axios';
import express from 'express';`
      );

      const result = await tracker.findUndeclared(['express']);

      expect(result).toContain('axios');
    });
  });

  describe('getStats', () => {
    it('should return correct usage statistics', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import express from 'express';`
      );

      const result = await tracker.getStats(['express', 'lodash']);

      expect(result.total).toBe(2);
      expect(result.used).toBe(1);
      expect(result.unused).toBe(1);
      expect(result.undeclared).toBe(0);
    });
  });

  describe('extractPackageName', () => {
    it('should handle regular packages', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import express from 'express';`
      );

      const result = await tracker.trackUsage(['express']);
      const expressInfo = result.find(r => r.package === 'express');

      expect(expressInfo).toBeDefined();
      expect(expressInfo?.package).toBe('express');
    });

    it('should handle subpath imports', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import { Router } from 'express/lib/router';`
      );

      const result = await tracker.trackUsage(['express']);

      const expressInfo = result.find(r => r.package === 'express');
      expect(expressInfo).toBeDefined();
    });

    it('should skip node built-ins', async () => {
      await writeFile(
        join(testDir, 'index.ts'),
        `import fs from 'fs';
import path from 'path';
import crypto from 'crypto';`
      );

      const result = await tracker.trackUsage([]);

      const fsInfo = result.find(r => r.package === 'fs');
      const pathInfo = result.find(r => r.package === 'path');
      const cryptoInfo = result.find(r => r.package === 'crypto');

      expect(fsInfo).toBeUndefined();
      expect(pathInfo).toBeUndefined();
      expect(cryptoInfo).toBeUndefined();
    });
  });
});