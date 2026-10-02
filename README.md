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

## Usage

### Initialize Agent Knowledge Base

First, initialize the agent knowledge base in your target repository:

```bash
npm run dev init /path/to/your/repo
```

This creates a `.agent/` directory with:
- `architecture.md` - Your system architecture
- `conventions.md` - Coding conventions
- `database.md` - Database patterns
- `api.md` - API conventions
- `security.md` - Security requirements
- `testing.md` - Testing practices
- `decisions/` - Architecture Decision Records

**Important**: Edit these files to match your actual project!

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

### 3. Reviewer Agent

The reviewer checks:
- ✓ Does it satisfy the requirement?
- ✓ Does it follow existing architecture?
- ✓ Are security checks present?
- ✓ Are inputs validated?
- ✓ Are database queries safe?
- ✓ Are tests sufficient?
- ✓ Are there performance issues?

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
