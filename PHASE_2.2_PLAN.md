# Phase 2.2: Dependency Mapper - Implementation Plan

**Started:** 2026-10-03
**Goal:** Analyze project dependencies, detect outdated packages, scan vulnerabilities, and suggest updates

---

## Overview

The Dependency Mapper provides comprehensive dependency analysis for npm projects, helping identify security issues, outdated packages, and dependency usage patterns.

## Features to Implement

### 1. Dependency Lister
- Parse package.json
- List all dependencies (prod + dev)
- Show current versions
- Show latest versions available

### 2. Outdated Package Detector
- Check npm registry for latest versions
- Identify major, minor, and patch updates
- Categorize by update type
- Show changelog/breaking changes

### 3. Vulnerability Scanner
- Run npm audit
- Parse security advisories
- Categorize by severity (critical, high, medium, low)
- Suggest fixes

### 4. Usage Tracker
- Scan codebase for import statements
- Map which files use which packages
- Identify unused dependencies
- Find dependencies used but not declared

### 5. Update Suggester
- Recommend safe updates (patch, minor)
- Warn about breaking changes (major)
- Group related updates
- Generate update commands

## Architecture

```
DependencyMapperAgent
    ↓
├─ DependencyAnalyzer
│  ├─ parseDependencies()
│  ├─ checkOutdated()
│  └─ scanVulnerabilities()
│
├─ UsageTracker
│  ├─ scanImports()
│  ├─ findUnused()
│  └─ findUndeclared()
│
└─ UpdateSuggester
   ├─ categorizeupdates()
   ├─ assessRisk()
   └─ generateCommands()
```

## File Structure

```
src/
├── analyzers/
│   ├── dependency-analyzer.ts      # NEW
│   ├── usage-tracker.ts            # NEW
│   └── __tests__/
│       ├── dependency-analyzer.test.ts
│       └── usage-tracker.test.ts
│
├── agents/
│   └── dependency-mapper.ts        # NEW
│
└── types/
    └── dependencies.ts             # NEW
```

## Type Definitions

```typescript
interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'production' | 'development';
  updateType?: 'major' | 'minor' | 'patch';
}

interface Vulnerability {
  package: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  description: string;
  fixVersion?: string;
  cve?: string;
}

interface UsageInfo {
  package: string;
  usedInFiles: string[];
  importCount: number;
  isDeclared: boolean;
}

interface DependencyReport {
  dependencies: DependencyInfo[];
  vulnerabilities: Vulnerability[];
  usage: UsageInfo[];
  unused: string[];
  undeclared: string[];
  suggestions: UpdateSuggestion[];
}
```

## CLI Integration

```bash
# Basic dependency analysis
backend-agent analyze deps

# Check for outdated packages
backend-agent analyze deps --outdated

# Check for vulnerabilities
backend-agent analyze deps --vulnerabilities

# Full analysis
backend-agent analyze deps --full

# Generate update commands
backend-agent analyze deps --suggest-updates
```

## Expected Output

```
📦 Dependency Analysis

Total Dependencies: 45 (32 prod, 13 dev)

⚠️  Outdated Packages (5):
  • express: 4.18.2 → 4.19.0 (minor) ✅ Safe
  • typescript: 5.3.3 → 5.7.2 (minor) ✅ Safe
  • vitest: 1.6.0 → 2.1.9 (major) ⚠️  Breaking changes

🔒 Security Issues (2):
  • HIGH: axios@0.27.0 (CVE-2023-12345)
    Fix: npm install axios@latest
  • MODERATE: json5@2.2.0
    Fix: npm audit fix

📊 Usage Analysis:
  • Unused (3): lodash, moment, request
  • Undeclared (1): @types/node (used but not in package.json)

💡 Suggested Updates:
  Safe updates:
    npm install express@latest typescript@latest

  Requires review:
    npm install vitest@latest  # Breaking changes - check docs

  Security fixes:
    npm audit fix
```

## Implementation Steps

### Week 1: Core Dependency Analysis
1. Create type definitions
2. Implement DependencyAnalyzer
3. Parse package.json
4. Check npm registry for latest versions
5. Categorize updates
6. Tests

### Week 2: Vulnerability Scanning
1. Run npm audit programmatically
2. Parse audit output
3. Categorize by severity
4. Generate fix suggestions
5. Tests

### Week 3: Usage Tracking
1. Scan for import statements
2. Build usage map
3. Identify unused dependencies
4. Find undeclared dependencies
5. Tests

### Week 4: Integration & Polish
1. Integrate with DependencyMapperAgent
2. Add CLI commands
3. Create output formatters
4. Documentation
5. End-to-end tests

## Success Metrics

- ✅ Accurately lists all dependencies
- ✅ Detects outdated packages correctly
- ✅ Identifies security vulnerabilities
- ✅ Finds unused dependencies
- ✅ Generates actionable suggestions
- ✅ 90%+ test coverage
- ✅ Performance: <5 seconds for typical project

## Technical Considerations

### npm Registry Access
- Use npm view command
- Cache results to avoid rate limits
- Handle network failures gracefully

### npm audit
- Run as child process
- Parse JSON output
- Handle different npm versions

### Import Scanning
- Regex for import/require statements
- Handle dynamic imports
- Support both ESM and CommonJS

## Next After This

Phase 2.3: Architecture Documenter
- Auto-detect tech stack
- Generate architecture.md
- Keep documentation synchronized

---

## Ready to Implement!

Starting with:
1. Type definitions
2. DependencyAnalyzer core
3. Basic dependency listing
4. Outdated package detection
