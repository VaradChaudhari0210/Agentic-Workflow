# Quick Start Guide

Get your Backend Engineer Agent running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- An Anthropic API key ([get one here](https://console.anthropic.com/))
- A backend project (Node.js/TypeScript)

## Step 1: Installation

```bash
cd backend-engineer-agent
npm install
```

## Step 2: Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API key
# Windows:
notepad .env

# Set these values:
ANTHROPIC_API_KEY=your_key_here
TARGET_REPO_PATH=C:\path\to\your\backend\project
```

## Step 3: Initialize Agent Knowledge (Auto-Discovery) 🆕

The agent can **automatically analyze** your repository and generate documentation:

```bash
npm run dev discover C:\path\to\your\backend\project
```

**What this does:**
- 🔍 Scans your codebase (30-60 seconds)
- 📊 Detects framework, database, patterns
- 📝 Generates `.agent/` directory automatically
- ✅ Creates architecture.md, conventions.md, api.md, etc.

**Alternative (Manual Setup):**
```bash
npm run dev init C:\path\to\your\backend\project
# Then manually edit each template file
```

**Recommended:** Use `discover` - it's much faster and more accurate!

### Review Generated Files

```bash
cd C:\path\to\your\backend\project\.agent

# Review and edit if needed:
notepad architecture.md    # Check detected architecture
notepad conventions.md     # Check detected conventions
notepad database.md        # Check database patterns
```

The agent learns from these files, so review for accuracy!

## Step 4: First Task

```bash
npm run dev task "Add a health check endpoint at GET /api/health that returns status 200 and server uptime"
```

Watch the agent:
1. ✅ Analyze your repository
2. ✅ Create a plan
3. ✅ Create a branch
4. ✅ Implement the feature
5. ✅ Run tests
6. ✅ Review the code
7. ✅ Show you the diff

## Step 5: Review & Merge

```bash
cd C:\path\to\your\backend\project

# See what changed
git diff agent/task-xxxxx

# If good, merge
git checkout main
git merge agent/task-xxxxx

# Clean up
git branch -d agent/task-xxxxx
```

## Common First Tasks

### 1. Simple Endpoint
```bash
npm run dev task "Add GET /api/version endpoint that returns the app version from package.json"
```

### 2. Add Validation
```bash
npm run dev task "Add input validation to the user registration endpoint"
```

### 3. Add Tests
```bash
npm run dev task "Add unit tests for the UserService.createUser method"
```

### 4. Fix a Bug
```bash
npm run dev task "Fix the bug where getUserById returns null instead of throwing NotFoundError"
```

## Understanding the Output

```
╔══════════════════════════════════════════════════════════╗
║  Backend Engineer Agent - Task Execution               ║
╚══════════════════════════════════════════════════════════╝

Task: Add health check endpoint
────────────────────────────────────────────────────────────

📋 Phase 1: Understanding & Planning
✓ Plan created
  • 3 steps
  • 2 files to modify
  • Complexity: low

✓ Created branch: agent/task-abc123

🔨 Phase 2: Implementation
✓ Implementation successful
  • 2 files changed
  • Tests passed

👁️  Phase 3: Code Review
✓ Review passed

  Suggestions:
  • Consider adding response time metrics

📊 Changes Summary
[git diff output]

✓ Task completed successfully
Branch: agent/task-abc123
Review the changes and merge when ready.
```

## Next Steps

### Customize for Your Project

Edit `.agent/architecture.md`:

```markdown
# Architecture

## Stack
- Node.js 20
- Express
- TypeScript
- PostgreSQL
- Prisma

## Patterns
Controllers -> Services -> Repositories -> Database

## Rules
- Controllers never access database directly
- All errors go through global error handler
- Use dependency injection for services
```

### Try More Complex Tasks

```bash
# Add a feature
npm run dev task "Add pagination to GET /api/users endpoint with page and limit query params"

# Refactor
npm run dev task "Extract duplicate error handling from controllers into a shared ErrorHandler utility"

# Database
npm run dev task "Add index on email column in users table for faster lookups"
```

### Review Agent Behavior

After a few tasks, check what patterns the agent learned:

```bash
cd C:\path\to\your\backend\project
git log --oneline | grep agent
```

### Improve Agent Knowledge

As you use the agent, update `.agent/` files:

1. **Add common patterns** to `conventions.md`
2. **Document decisions** in `decisions/ADR-XXX.md`
3. **Update security rules** in `security.md`

The agent gets better as your knowledge base grows!

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
```bash
# Make sure .env exists and has the key
notepad .env
```

### "No test runner detected"
```bash
# Add test script to package.json
{
  "scripts": {
    "test": "jest"  // or vitest, mocha, etc.
  }
}
```

### "Failed to parse plan"
- Check your API key is valid
- Check you have internet connection
- Try again (sometimes Claude has rate limits)

### Agent creates wrong pattern
- Update `.agent/` files with correct patterns
- Run a new task after updating

## Tips for Success

### ✅ Do This
- Be specific in task descriptions
- Keep `.agent/` files updated
- Review diffs before merging
- Start with small tasks

### ❌ Avoid This
- Vague tasks like "improve code"
- Assuming agent knows your specific patterns
- Merging without reviewing
- Complex tasks before `.agent/` is configured

## Daily Workflow

```bash
# Morning: assign tasks
npm run dev task "Add logging to authentication endpoints"
npm run dev task "Add rate limiting to public API endpoints"

# Work on complex features yourself while agent handles these

# Afternoon: review agent work
cd your-project
git branch | grep agent/
git diff agent/task-xxx
git merge agent/task-xxx

# Evening: merge completed work
git push origin main
```

## What's Next?

- Read [EXAMPLES.md](./EXAMPLES.md) for more task examples
- Read [README.md](./README.md) for detailed documentation
- Read [EXTENDING.md](./EXTENDING.md) to add custom capabilities

## Getting Help

If something doesn't work:

1. Check the error message
2. Verify `.env` configuration
3. Ensure `.agent/` files exist in target repo
4. Try a simpler task first
5. Check that your API key has credits

## Success Metrics

After using the agent for a week, you should see:

- ✅ Faster implementation of routine features
- ✅ Consistent code patterns across the project
- ✅ More time for complex problem-solving
- ✅ Better test coverage
- ✅ Fewer boilerplate mistakes

The agent is a **tool to augment your work**, not replace it. Use it for routine tasks while you focus on architecture and complex problems.

Happy coding! 🚀
