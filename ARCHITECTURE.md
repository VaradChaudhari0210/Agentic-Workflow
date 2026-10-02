# System Architecture

## Overview

The Backend Engineer Agent is a multi-agent system designed to autonomously handle backend engineering tasks from requirement to tested implementation.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│                     (Task Request)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ORCHESTRATOR AGENT                         │
│  • Manages overall workflow                                 │
│  • Coordinates between agents                               │
│  • Handles retries and error recovery                       │
│  • Reports progress                                         │
└───┬──────────────────┬──────────────────┬──────────────────┘
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐      ┌──────────┐      ┌──────────┐
│ PLANNER │      │IMPLEMENTER│      │ REVIEWER │
│  AGENT  │      │   AGENT   │      │  AGENT   │
└────┬────┘      └─────┬────┘      └─────┬────┘
     │                 │                  │
     │                 │                  │
     └─────────────────┼──────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌────────────────┐            ┌────────────────┐
│     TOOLS      │            │   GIT LAYER    │
│ • Filesystem   │            │ • Branching    │
│ • Shell        │            │ • Commits      │
│ • Search       │            │ • Diff         │
└────────────────┘            └────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│      TARGET REPOSITORY                 │
│  • Source code                         │
│  • Tests                               │
│  • .agent/ knowledge base              │
└────────────────────────────────────────┘
```

## Core Components

### 1. Orchestrator Agent

**Responsibility**: Main coordinator of the workflow

**Workflow**:
```
1. Receive task from user
2. Create work branch
3. Invoke Planner
4. Invoke Implementer (with retries)
5. Run tests
6. Invoke Reviewer
7. Present results to user
```

**Key Features**:
- Error recovery with configurable retry attempts
- Progress reporting with colored console output
- Git branch management
- Success/failure tracking

**Code**: `src/agents/orchestrator.ts`

### 2. Planner Agent

**Responsibility**: Create detailed implementation plans

**Process**:
```
Input: Task requirement
  ↓
1. Gather repository context
   • List files
   • Read key configuration files
   • Understand existing patterns
  ↓
2. Analyze requirement
   • Identify affected files
   • Determine new files needed
   • Plan step-by-step implementation
  ↓
3. Create structured plan
   • Steps with rationale
   • Test requirements
   • Security considerations
   • Complexity estimate
  ↓
Output: ImplementationPlan
```

**System Prompt Focus**:
- Understand before planning
- Follow existing patterns
- Minimal changes
- Security awareness

**Code**: `src/agents/planner.ts`

### 3. Implementer Agent

**Responsibility**: Execute implementation plans

**Process**:
```
Input: ImplementationPlan + Requirement
  ↓
1. Gather context
   • Read files to be modified
   • Understand existing patterns
  ↓
2. Generate implementation
   • Create/modify files
   • Follow plan precisely
   • Include error handling
  ↓
3. Write files to disk
  ↓
4. Run tests
  ↓
Output: ImplementationResult
```

**System Prompt Focus**:
- Follow the plan exactly
- Match existing patterns
- Complete implementations (no TODOs)
- Proper error handling

**Code**: `src/agents/implementer.ts`

### 4. Reviewer Agent

**Responsibility**: Review code for quality, security, correctness

**Process**:
```
Input: Requirement + Plan + Implementation
  ↓
1. Read implemented files
  ↓
2. Check against requirements
  ↓
3. Review checklist:
   ✓ Correctness
   ✓ Architecture compliance
   ✓ Security
   ✓ Performance
   ✓ Testing
   ✓ Code quality
  ↓
Output: ReviewResult with issues and suggestions
```

**System Prompt Focus**:
- Comprehensive review checklist
- Security-first mindset
- Performance awareness
- Testing sufficiency

**Code**: `src/agents/reviewer.ts`

## Tool Layer

### Filesystem Tools

**Purpose**: Repository inspection and manipulation

**Capabilities**:
- `listFiles()` - Recursive file listing (skips node_modules, .git)
- `readFile()` - Read file content
- `writeFile()` - Write/create files with directory creation
- `deleteFile()` - Remove files
- `searchCode()` - Search for code patterns
- `fileExists()` - Check file existence

**Safety Features**:
- Automatic skipping of build artifacts
- Parent directory creation
- Graceful error handling

**Code**: `src/tools/filesystem.ts`

### Git Tools

**Purpose**: Version control operations

**Capabilities**:
- `status()` - Repository status
- `diff()` - Show changes
- `log()` - Commit history
- `createBranch()` - Create and checkout branch
- `checkout()` - Switch branches
- `add()` - Stage files
- `commit()` - Create commits
- `branches()` - List branches

**Safety Features**:
- Never modifies main branch directly
- All work on feature branches
- Structured diff output

**Code**: `src/tools/git.ts`

### Shell Tools

**Purpose**: Execute commands, tests, builds

**Capabilities**:
- `runCommand()` - Execute arbitrary commands
- `runTests()` - Auto-detect and run test runner
- `runLinter()` - Run linter
- `runTypecheck()` - Run TypeScript checks
- `buildProject()` - Build project
- `installDependencies()` - Install packages

**Safety Features**:
- Configurable timeouts
- Large buffer for output
- Test runner detection (Jest, Vitest, Mocha)
- Package manager detection (npm, yarn, pnpm)

**Code**: `src/tools/shell.ts`

## Data Flow

### Task Execution Flow

```
1. User submits task
   "Add GET /api/users/:id/posts endpoint"
        │
        ▼
2. Orchestrator receives task
   • Creates task object
   • Sets status: 'pending'
        │
        ▼
3. Planner gathers context
   • Lists repository structure
   • Reads package.json, tsconfig.json
   • Reads existing route/controller files
   • Checks database schema
        │
        ▼
4. Planner creates plan
   {
     steps: [
       { action: 'create', target: 'dto/user-posts.dto.ts', ... },
       { action: 'modify', target: 'services/user.service.ts', ... },
       { action: 'modify', target: 'controllers/user.controller.ts', ... },
       { action: 'modify', target: 'routes/user.routes.ts', ... },
       { action: 'create', target: 'tests/user.service.test.ts', ... }
     ],
     affectedFiles: [...],
     testsRequired: [...]
   }
        │
        ▼
5. Git creates branch
   agent/task-abc123
        │
        ▼
6. Implementer reads affected files
   • user.service.ts
   • user.controller.ts
   • user.routes.ts
        │
        ▼
7. Implementer generates code
   • Creates complete file contents
   • Matches existing patterns
   • Includes error handling
        │
        ▼
8. Implementer writes files
   • dto/user-posts.dto.ts (new)
   • services/user.service.ts (modified)
   • controllers/user.controller.ts (modified)
   • routes/user.routes.ts (modified)
   • tests/user.service.test.ts (new)
        │
        ▼
9. Shell runs tests
   npm test
        │
        ├─ PASS ─────────────────────┐
        │                            │
        │                            ▼
        │                    10. Reviewer inspects
        │                        • Reads files
        │                        • Checks diff
        │                        • Runs checklist
        │                            │
        │                            ▼
        │                    11. Review result
        │                        {
        │                          approved: true,
        │                          suggestions: [...]
        │                        }
        │                            │
        │                            ▼
        └──────────────────> 12. Present to user
                                    • Show summary
                                    • Show diff
                                    • List branch
                                    │
                                    ▼
                            13. User reviews and merges
                                git merge agent/task-abc123
        │
        └─ FAIL ────────────────────┐
                                    │
                                    ▼
                            Retry (up to MAX_ATTEMPTS)
                            • Analyze failure
                            • Implement fix
                            • Test again
```

## Knowledge System

### Repository Knowledge (`.agent/` directory)

Created in target repository:

```
.agent/
├── instructions.md       # Overview
├── architecture.md       # System architecture
├── conventions.md        # Coding standards
├── database.md          # Database patterns
├── api.md               # API conventions
├── security.md          # Security requirements
├── testing.md           # Testing practices
└── decisions/           # Architecture Decision Records
    ├── README.md
    └── ADR-XXX-title.md
```

**Purpose**:
- Teach agents about project-specific patterns
- Document architectural decisions
- Establish coding standards
- Define security requirements

**Usage**:
- Planner reads these during context gathering
- Implementer references them for pattern matching
- Reviewer checks compliance against them

## Agent Communication

### Agent → Agent Communication

Agents don't communicate directly. The Orchestrator coordinates:

```typescript
// Orchestrator pattern
const plan = await this.planner.createPlan(requirement);
const implementation = await this.implementer.implement(plan, requirement);
const review = await this.reviewer.review(requirement, plan, implementation);
```

### Data Structures

**Task**:
```typescript
{
  id: string;
  description: string;
  createdAt: Date;
  status: 'pending' | 'understanding' | 'planning' | 'implementing' | 'testing' | 'reviewing' | 'completed' | 'failed';
  error?: string;
}
```

**ImplementationPlan**:
```typescript
{
  steps: PlanStep[];
  affectedFiles: string[];
  newFiles: string[];
  testsRequired: string[];
  migrationRequired: boolean;
  securityReview: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}
```

**ImplementationResult**:
```typescript
{
  success: boolean;
  filesChanged: string[];
  testsRun: string[];
  testsPassed: boolean;
  diff: string;
  error?: string;
}
```

**ReviewResult**:
```typescript
{
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
  securityConcerns: string[];
  performanceConcerns: string[];
}
```

## Safety Mechanisms

### 1. Branch Isolation

Every task runs on a dedicated branch:
- Pattern: `agent/task-{taskId}`
- Main branch never modified directly
- User reviews before merge

### 2. Test-Driven Verification

If tests exist:
- Automatically run after implementation
- Retry on failure (up to MAX_ATTEMPTS)
- Won't complete until tests pass

### 3. Code Review

Every implementation reviewed:
- Security checklist
- Architecture compliance
- Performance concerns
- Testing sufficiency

### 4. Retry Logic

Failed implementations retry:
- Maximum attempts configurable (default: 3)
- Each attempt learns from previous failure
- User informed after max attempts

### 5. Read Before Write

Agents read existing code before modifying:
- Understand patterns
- Match style
- Maintain consistency

## Extensibility Points

### Adding New Agents

Implement agent interface:
```typescript
export class NewAgent {
  constructor(
    private client: Anthropic,
    private model: string,
    private tools: RequiredTools
  ) {}

  async performTask(input: Input): Promise<Output> {
    // Agent logic
  }
}
```

Register with orchestrator:
```typescript
this.newAgent = new NewAgent(this.client, this.config.model, this.tools);
```

### Adding New Tools

Implement tool interface:
```typescript
export class NewTool {
  constructor(config: Config) {}

  async operation(): Promise<ToolResult> {
    try {
      // operation
      return { success: true, output: result };
    } catch (error) {
      return { success: false, output: '', error: String(error) };
    }
  }
}
```

Register with orchestrator:
```typescript
this.newTool = new NewTool(config);
```

### Adding Workflows

Create workflow classes:
```typescript
export class CustomWorkflow {
  constructor(private orchestrator: OrchestratorAgent) {}

  async execute(input: Input): Promise<Output> {
    // Workflow logic using orchestrator
  }
}
```

## Performance Characteristics

### Time Complexity

Typical task execution:
- Simple endpoint: 30-60 seconds
- Medium feature: 60-120 seconds
- Complex feature: 120-300 seconds

Breakdown:
- Planning: 10-20 seconds (depends on repo size)
- Implementation: 15-40 seconds (depends on complexity)
- Testing: 5-60 seconds (depends on test suite)
- Review: 10-20 seconds

### Token Usage

Approximate token usage per task:
- Planner: 2,000-5,000 tokens
- Implementer: 3,000-8,000 tokens
- Reviewer: 2,000-4,000 tokens

Total: ~7,000-17,000 tokens per task

### Scalability

Current limitations:
- Single task at a time
- No parallel agent execution
- Context window bounded

Future improvements:
- Task queue system
- Parallel implementation streams
- Persistent memory across tasks

## Error Handling

### Error Types

1. **Tool Errors**: File not found, git operation failed
   - Handled: Return ToolResult with error
   - Recovery: Graceful degradation or retry

2. **Agent Errors**: Failed to parse response, timeout
   - Handled: Try-catch blocks
   - Recovery: Retry or fail task

3. **Test Failures**: Tests don't pass
   - Handled: Captured in ImplementationResult
   - Recovery: Automatic retry with fix

4. **User Errors**: Invalid configuration
   - Handled: Validation at startup
   - Recovery: Clear error message, exit

### Logging

Console output with colors:
- 🔵 Blue: Headers and structure
- 🟡 Yellow: Section headers
- 🟢 Green: Success
- 🔴 Red: Errors
- ⚪ Dim: Details and context

## Future Architecture

### Phase 2: Repository Intelligence

```
Add:
├── Pattern Detector
│   ├── Analyze existing code
│   ├── Extract patterns
│   └── Update .agent/ automatically
├── Dependency Mapper
│   ├── Track dependencies
│   └── Suggest updates
└── Architecture Documenter
    ├── Generate docs
    └── Keep docs in sync
```

### Phase 3: Enhanced Review

```
Add:
├── Security Specialist Agent
│   ├── Deep security analysis
│   └── Vulnerability scanning
├── Performance Analyzer
│   ├── N+1 query detection
│   └── Slow query identification
└── Test Coverage Analyzer
    ├── Coverage tracking
    └── Gap identification
```

### Phase 4: Specialized Agents

```
Add:
├── Database Specialist
│   ├── Schema management
│   ├── Query optimization
│   └── Migration safety
├── API Specialist
│   ├── REST conventions
│   ├── OpenAPI generation
│   └── Version management
└── Security Specialist
    ├── Auth/authz
    ├── Input validation
    └── Secret management
```

### Phase 5: Autonomous Development

```
Complete workflow:
GitHub Issue
    ↓
Issue Parser
    ↓
Task Decomposition
    ↓
Parallel Implementation
    ↓
Integration
    ↓
PR Creation
    ↓
CI/CD Pipeline
```

## Technical Decisions

### Why TypeScript?

- Type safety for tool interfaces
- Better IDE support for development
- Matches typical backend projects

### Why Simple Architecture?

- Easier to understand
- Easier to extend
- Fewer failure modes
- Clear data flow

### Why Branch-Per-Task?

- Safe isolation
- User control
- Easy rollback
- Clear history

### Why Claude?

- Strong reasoning capability
- Good at following instructions
- Large context window
- JSON output reliability

## Deployment Considerations

### Local Development

Current mode:
- Run locally with npm
- Access local repositories
- Direct file system access

### Future: Remote Execution

Potential architecture:
- Agent server
- API for task submission
- Webhook for completion
- Git operations via API

### Security

Current:
- API key in environment
- Local file access
- Git operations with user credentials

Production considerations:
- Secure API key management
- Sandboxed file access
- Read-only repository modes
- Audit logging

---

This architecture supports the goal: **autonomous backend development from requirement to tested implementation**, while maintaining safety, clarity, and extensibility.
