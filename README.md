# Backend Engineer Agent

> **Your Personal AI Backend Engineer** - Automates routine backend tasks from requirements to tested implementation

A production-ready agentic workflow system designed specifically for backend engineers working with Node.js, TypeScript, and modern backend stacks.

## What This Does

This agent system helps you with backend engineering tasks by:

1. **Understanding** your repository structure and patterns
2. **Planning** implementations based on your architecture
3. **Implementing** features following your conventions
4. **Testing** the implementation automatically
5. **Reviewing** code for quality, security, and correctness

## Architecture

```
                  YOU
                   │
                   ▼
          ┌─────────────────┐
          │  Orchestrator   │
          │     Agent       │
          └────────┬────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌─────────┐
│ Planner │  │Implementer│  │Reviewer │
└─────────┘  └──────────┘  └─────────┘
     │             │             │
     └──────┬──────┴──────┬──────┘
            ▼             ▼
       ┌─────────┐   ┌─────────┐
       │  Tools  │   │   Git   │
       └─────────┘   └─────────┘
```

### Workflow

```
Requirement
    ↓
Understand & Plan
    ↓
Create Branch
    ↓
Implement
    ↓
Run Tests
    ↓
Review
    ↓
Present Diff
```

## 🔬 Production Features (Phase 3)

**Enterprise-grade observability built-in:**

### Structured Logging
- Multiple formats: JSON (production) and pretty (development)
- Log levels: debug, info, warn, error
- Sensitive data redaction
- File rotation and retention
- Context-aware logging

### Performance Monitoring
- Operation timing with memory tracking
- Token usage tracking for LLM calls
- Slow operation detection
- Prometheus export format
- System resource monitoring

### Error Tracking
- Structured error capture
- Automatic retry with exponential backoff
- Circuit breaker pattern for API protection
- Error categorization and history

### Health Checks
- Component health monitoring
- Resource usage (CPU, memory, disk)
- Readiness and liveness probes
- Configurable thresholds

### Metrics & Analytics
- Task execution history
- Success/failure rates
- Performance statistics
- Multi-format export (JSON, Prometheus, InfluxDB)
- HTML dashboard generation

### CLI Commands
```bash
backend-agent health              # System health check
backend-agent metrics             # Performance metrics
backend-agent logs                # View logs
backend-agent dashboard           # Observability dashboard
```

See [PHASE_3_PROGRESS.md](./PHASE_3_PROGRESS.md) for complete documentation.

## Installation

```bash
npm install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_api_key_here
TARGET_REPO_PATH=../your-backend-repo
```

## Quick Start

### Auto-Discovery (Recommended)

The agent can automatically analyze your repository and generate the `.agent/` knowledge base:

```bash
# Discover patterns and generate .agent/ files
npm run dev discover /path/to/your/backend/project

# Review the generated files in /path/to/your/backend/project/.agent/
# Edit them to match your exact requirements

# Run your first task
npm run dev task "Add health check endpoint" --repo /path/to/your/backend/project
```

**What auto-discovery does:**
- 🔍 Scans your entire codebase
- 📊 Detects framework, database, patterns
- 📝 Generates architecture documentation
- ✅ Creates conventions guide
- 🔒 Documents security patterns
- 🧪 Identifies testing practices

**Time:** 30-60 seconds for discovery

### Manual Setup (Alternative)

If you prefer to create the files manually:

```bash
npm run dev init /path/to/your/backend/project
# Then manually edit the template files in .agent/
```

### Run a Task

```bash
npm run dev task "Add endpoint to return monthly statistics for a user"
```

The agent will:

1. **Analyze** your repository structure and existing patterns
2. **Create a plan** with specific steps
3. **Create a branch** (`agent/task-xxx`)
4. **Implement** the feature following your patterns
5. **Run tests** to verify the implementation
6. **Review** the code for issues
7. **Show you the diff**

### Example Tasks

```bash
# Add a new API endpoint
npm run dev task "Add GET /api/users/:id/stats endpoint"

# Fix a bug
npm run dev task "Fix the race condition in session cleanup"

# Add authentication
npm run dev task "Add JWT authentication middleware"

# Database changes
npm run dev task "Add userId index to posts table"
```

## Configuration Options

```bash
npm run dev task "your task" \
  --repo /path/to/repo \
  --model claude-sonnet-4-20250514 \
  --max-attempts 3
```

Options:
- `--repo` - Path to your repository (default: current directory)
- `--model` - Claude model to use (default: claude-sonnet-4-20250514)
- `--max-attempts` - Maximum implementation attempts (default: 3)
- `--approval` - Approval mode: manual, auto, or suggest-only (default: manual)

## Commands

### 1. Run Tasks (Main Feature)

```bash
npm run dev task "Add endpoint to return monthly statistics for a user"
```

Execute backend engineering tasks from requirements to implementation.

### 2. Auto-Discovery

```bash
npm run dev discover /path/to/your/backend/project
```

Automatically analyze your repository and generate the `.agent/` knowledge base.

### 3. Architecture Analysis (NEW)

```bash
npm run dev analyze arch [repo-path] [options]
```

Generate comprehensive architecture documentation for your project.

**Options:**
- `--output <file>` - Save documentation to a file (default: stdout)
- `--format <format>` - Output format: `markdown` or `json` (default: markdown)

**Examples:**

```bash
# Generate markdown documentation to console
npm run dev analyze arch .

# Save to file
npm run dev analyze arch . --output ARCHITECTURE.md

# Generate JSON report
npm run dev analyze arch . --format json --output architecture.json

# Analyze different project
npm run dev analyze arch /path/to/other/project
```

**What it detects:**
- 🏗️ Tech stack (language, runtime, framework, database, ORM)
- 📁 Project structure (directories, entry points, patterns)
- 📦 Dependencies (production and development)
- 🚪 Entry points (main, CLI commands)
- 🔨 Build scripts (with purposes)
- 📝 Configuration files

**Output includes:**
- Overview and tech stack summary
- Project structure tree with directory purposes
- Key dependencies categorized by type
- Entry points with descriptions
- Build scripts with inferred purposes
- Configuration files list

### 4. Dependency Analysis

```bash
npm run dev analyze deps [options]
```

Analyze project dependencies for outdated packages, vulnerabilities, and usage patterns.

**Options:**
- `--outdated` - Only show outdated packages
- `--vulnerabilities` - Only show vulnerability info
- `--usage` - Only show usage analysis
- `--full` - Full analysis (default)
- `--suggest-updates` - Include update commands

## How It Works

### 1. Planner Agent

The planner:
- Inspects your repository structure
- Reads relevant existing files
- Understands your patterns and conventions
- Creates a detailed step-by-step implementation plan
- Identifies affected files, new files, and tests needed
- Flags security concerns

### 2. Implementer Agent

The implementer:
- Reads existing files to match patterns
- Follows the plan exactly
- Writes complete, working code (no TODOs)
- Includes proper error handling and validation
- Runs tests automatically
- Retries on failure (up to max attempts)

### 3. Reviewer Agent (Enhanced)

The reviewer checks:
- ✓ Does it satisfy the requirement?
- ✓ Does it follow existing architecture?
- ✓ Are security checks present?
- ✓ Are inputs validated?
- ✓ Are database queries safe?
- ✓ Are tests sufficient?
- ✓ Are there performance issues?

**NEW in Phase 2.4 - Specialized Analysis:**
- 🔒 **Security Specialist**: Detects 20+ vulnerability types (SQL injection, XSS, weak secrets, etc.)
- ⚡ **Performance Analyzer**: Identifies N+1 queries, memory leaks, inefficient algorithms
- 🧪 **Coverage Tracker**: Analyzes test coverage and suggests missing tests

## Enhanced Review Capabilities (Phase 2.4)

### Security Analysis
Comprehensive security scanning with OWASP coverage:
```bash
# Scan for vulnerabilities
backend-agent analyze security .

# Focus on high/critical issues
backend-agent analyze security src/controllers --min-severity high
```

**Detects:**
- SQL/NoSQL injection patterns
- XSS vulnerabilities
- Weak JWT secrets & missing expiration
- Hardcoded credentials
- Missing authentication/authorization
- Insecure session configuration
- Missing rate limiting & CORS issues
- And 13+ more patterns...

### Performance Analysis
Identify bottlenecks and optimization opportunities:
```bash
# Analyze performance
backend-agent analyze performance .

# Save detailed report
backend-agent analyze performance src/services --output perf-report.txt
```

**Detects:**
- N+1 query problems
- Missing pagination & indexes
- Memory leaks (event listeners, large allocations)
- Inefficient algorithms (O(n²) complexity)
- Sequential awaits that should be parallel
- Missing connection pooling
- And 14+ more patterns...

### Coverage Analysis
Test coverage insights and suggestions:
```bash
# Analyze test coverage
backend-agent analyze coverage

# Set minimum threshold (exits with error if below)
backend-agent analyze coverage --min-coverage 80
```

**Provides:**
- Overall and per-file coverage metrics
- Critical uncovered code identification
- Prioritized test suggestions with scenarios
- Example test code generation
- Gap analysis (uncovered functions, branches, error paths)

## Safety Features

### Automatic Branch Creation

Every task runs on a new branch (`agent/task-xxx`). Your main branch is never touched directly.

### Test-Driven

If tests exist, the agent runs them automatically and won't complete until tests pass.

### Multiple Attempts

If implementation fails or tests fail, the agent will retry (up to `--max-attempts`).

### Code Review

Every implementation is reviewed automatically before being presented to you.

## Tools Available to Agents

### Filesystem Tools
- List files
- Read files
- Write files
- Search code
- Find symbols

### Git Tools
- Status
- Diff
- Log
- Create branch
- Commit

### Shell Tools
- Run commands
- Run tests
- Run linter
- Run type checker
- Build project

## Best Practices

### 1. Keep `.agent/` Updated

The agent learns from `.agent/` files. Keep them updated with:
- Architecture changes
- New conventions
- Important decisions
- Security requirements

### 2. Use Architecture Decision Records (ADRs)

Document significant decisions in `.agent/decisions/`:

```markdown
# ADR-001: Authentication Strategy

## Status
Accepted

## Context
We need to authenticate API requests.

## Decision
Use JWT tokens with RS256 signing.

## Consequences
- Stateless authentication
- Can verify tokens without database lookup
- Must manage key rotation
```

### 3. Be Specific in Task Descriptions

Good:
```bash
npm run dev task "Add GET /api/users/:id/posts endpoint that returns paginated posts for a user, with limit and offset query params"
```

Less good:
```bash
npm run dev task "add posts endpoint"
```

### 4. Review Before Merging

Always review the diff before merging:

```bash
git diff agent/task-xxx
```

## Advanced Usage

### Running in Different Modes

**Manual mode** (default): Agent implements but you review before merge
```bash
npm run dev task "..." --approval manual
```

**Suggest-only mode**: Agent only creates a plan
```bash
npm run dev task "..." --approval suggest-only
```

**Auto mode**: Agent implements and commits (use with caution)
```bash
npm run dev task "..." --approval auto
```

## Extending the Agent

### Add Custom Tools

Create new tools in `src/tools/`:

```typescript
// src/tools/database.ts
export class DatabaseTools {
  async inspectSchema() { ... }
  async runQuery() { ... }
}
```

### Add Specialist Agents

Create new agents in `src/agents/`:

```typescript
// src/agents/security.ts
export class SecurityAgent {
  async reviewSecurity() { ... }
}
```

Update the orchestrator to use them.

## Troubleshooting

### "No test runner detected"

Make sure your `package.json` has a `test` script:

```json
{
  "scripts": {
    "test": "jest" // or vitest, mocha, etc.
  }
}
```

### "Failed to parse plan"

The planner couldn't extract JSON. Check that:
- Your Anthropic API key is valid
- The model name is correct
- You have network connectivity

### Agent creates wrong implementation

1. Check `.agent/` files are accurate
2. Be more specific in your task description
3. Inspect what files the agent read during planning

## Limitations

Current limitations (Phase 1):

- ❌ No database query execution (read-only inspection only)
- ❌ No automatic PR creation (coming in Phase 5)
- ❌ No multi-agent conversations for complex problems
- ❌ Limited to TypeScript/JavaScript projects

These will be addressed in future phases.

## Roadmap

### Phase 2: Repository Intelligence
- Automatic architecture documentation
- Dependency mapping
- Pattern detection

### Phase 3: Self-Review Enhancement
- Security-specific reviewer
- Performance analyzer
- Test coverage checker

### Phase 4: Specialized Agents
- Database specialist
- API design specialist
- Security specialist

### Phase 5: Autonomous Development
- GitHub issue → PR workflow
- Multi-agent collaboration
- Continuous learning from feedback

## Contributing

This is a personal project, but improvements are welcome!

## License

MIT

## Credits

Built with:
- [Anthropic Claude](https://www.anthropic.com/) - LLM reasoning
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [simple-git](https://github.com/steveukx/git-js) - Git operations
- [Commander](https://github.com/tj/commander.js) - CLI framework
