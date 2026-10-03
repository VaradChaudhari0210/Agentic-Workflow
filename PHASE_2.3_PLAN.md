# Phase 2.3: Architecture Documenter - Implementation Plan

**Started:** 2026-10-03
**Goal:** Auto-detect tech stack, generate architecture documentation, and keep it synchronized

---

## Overview

The Architecture Documenter analyzes a project's codebase to automatically detect its technology stack, dependencies, file structure, and patterns, then generates comprehensive architecture documentation.

## Features to Implement

### 1. Tech Stack Detector
- Detect language/framework from package.json, tsconfig, etc.
- Identify build tools (webpack, vite, esbuild, etc.)
- Detect testing frameworks (jest, vitest, mocha, etc.)
- Identify API frameworks (express, fastify, nest, etc.)
- Detect database/ORM usage
- Identify styling solutions (CSS modules, Tailwind, styled-components, etc.)

### 2. Project Structure Analyzer
- Scan directory structure
- Identify source code organization patterns
- Detect configuration files
- Find entry points (main, index files)
- Identify test organization

### 3. Dependency Analyzer Integration
- Use Phase 2.2 Dependency Mapper
- Extract key dependencies
- Categorize dependencies by purpose
- Identify major/minor dependencies

### 4. Architecture Documentation Generator
- Generate architecture.md content
- Include tech stack section
- Include project structure section
- Include dependency overview
- Include entry points and startup info
- Support incremental updates

### 5. Documentation Synchronizer
- Detect when documentation is stale
- Compare current state vs documented state
- Highlight changes that need documentation update

## Architecture

```
ArchitectureDocumenterAgent
    ↓
├─ TechStackDetector
│  ├─ detectLanguage()
│  ├─ detectFramework()
│  ├─ detectBuildTools()
│  ├─ detectTesting()
│  └─ detectDatabase()
│
├─ ProjectStructureAnalyzer
│  ├─ scanDirectory()
│  ├─ findEntryPoints()
│  └─ analyzePatterns()
│
├─ DocumentationGenerator
│  ├─ generateOverview()
│  ├─ generateTechStack()
│  ├─ generateStructure()
│  └─ generateDependencies()
│
└─ DocumentationSynchronizer
   ├─ compareState()
   └─ detectChanges()
```

## File Structure

```
src/
├── analyzers/
│   ├── tech-stack-detector.ts     # NEW
│   ├── project-structure.ts       # NEW
│   └── documentation-generator.ts # NEW
│
└── agents/
    └── architecture-documenter.ts # NEW
```

## Type Definitions

```typescript
interface TechStack {
  language: string;
  framework?: string;
  buildTool?: string;
  testing?: string;
  api?: string;
  database?: string;
  orm?: string;
  styling?: string;
  packageManager?: string;
}

interface ProjectStructure {
  root: string;
  src: string;
  entryPoints: string[];
  testLocation: string;
  configFiles: string[];
  directories: DirectoryInfo[];
}

interface DirectoryInfo {
  name: string;
  path: string;
  purpose?: string;
  fileCount: number;
}

interface ArchitectureReport {
  techStack: TechStack;
  structure: ProjectStructure;
  dependencies: DependencySummary[];
  generatedAt: string;
}

interface DependencySummary {
  name: string;
  version: string;
  purpose: string;
  category: 'runtime' | 'dev' | 'build';
}
```

## CLI Integration

```bash
# Generate architecture documentation
backend-agent analyze arch

# Generate and save to file
backend-agent analyze arch --output architecture.md

# Check if documentation is up to date
backend-agent analyze arch --check

# Full analysis with sync
backend-agent analyze arch --sync
```

## Expected Output

```markdown
# Project Architecture

## Tech Stack

- **Language:** TypeScript
- **Framework:** Node.js / Express
- **Build:** ts-node / nodemon
- **Testing:** Vitest
- **Package Manager:** npm

## Project Structure

```
src/
├── agents/          # AI agent implementations
├── analyzers/       # Code analysis tools
├── config/          # Configuration management
├── tools/           # Capability tools
└── types/           # TypeScript definitions
```

## Key Dependencies

- express: ^4.18.2 (API framework)
- typescript: ^5.3.3 (Language)
- vitest: ^1.6.0 (Testing)

## Entry Points

- Main: src/index.ts
- Tests: src/**/*.test.ts
```

## Implementation Steps

### Week 1: Tech Stack Detection
1. Create type definitions
2. Implement TechStackDetector
3. Parse package.json for dependencies
4. Detect frameworks from imports
5. Identify build/test tools from config files

### Week 2: Structure Analysis
1. Implement ProjectStructureAnalyzer
2. Scan directory tree
3. Identify entry points (main, index)
4. Categorize directories by purpose

### Week 3: Documentation Generation
1. Implement DocumentationGenerator
2. Generate tech stack section
3. Generate structure section
4. Generate dependency overview

### Week 4: Integration & Polish
1. Integrate with ArchitectureDocumenterAgent
2. Add CLI commands
3. Add sync/check functionality
4. Tests and documentation

## Success Metrics

- ✅ Correctly identifies tech stack
- ✅ Generates accurate project structure
- ✅ Integrates with Dependency Mapper
- ✅ Produces readable documentation
- ✅ Detects when docs are stale
- ✅ 90%+ test coverage

## Technical Considerations

### Detection Logic
- Check package.json for primary dependencies
- Look for config files (tsconfig.json, jest.config.js, etc.)
- Parse imports to identify runtime dependencies
- Analyze file extensions for language detection

### Documentation Format
- Follow existing architecture.md format
- Include diagrams if possible (Mermaid)
- Keep it human-readable
- Machine-parseable for sync checks

## Next After This

Phase 2.4: Enhanced Review Agent
- Security specialist
- Performance analyzer
- Coverage tracker

---

## Ready to Implement!