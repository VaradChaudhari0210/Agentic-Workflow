# Getting Started Checklist

Follow this checklist to get your Backend Engineer Agent up and running.

## ✅ Prerequisites

Before you start, make sure you have:

- [ ] Node.js 18 or higher installed
  ```bash
  node --version  # Should be 18.0.0 or higher
  ```

- [ ] An Anthropic API key
  - Get one at: https://console.anthropic.com/
  - Make sure it has credits available

- [ ] A backend project to work with
  - Node.js/TypeScript project
  - Uses npm, yarn, or pnpm
  - Has a git repository

## ✅ Installation (5 minutes)

### Step 1: Verify Installation
```bash
cd "c:\Varad\Projects\Agentic Workflow"
npm test
```

**Expected**: All tests should pass ✓

### Step 2: Configure Environment
```bash
# The .env file should already exist from setup
# Open it and add your API key
notepad .env
```

Add these values:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
TARGET_REPO_PATH=C:\path\to\your\backend\project
MODEL=claude-sonnet-4-20250514
MAX_IMPLEMENTATION_ATTEMPTS=3
APPROVAL_MODE=manual
```

### Step 3: Test the CLI
```bash
npm run dev -- --help
```

**Expected**: Should show CLI help with available commands

## ✅ Initialize Your Project (10 minutes)

### Step 1: Create Agent Knowledge Base
```bash
npm run dev init "C:\path\to\your\backend\project"
```

**Expected**: Creates `.agent/` directory with template files

### Step 2: Navigate to Your Project
```bash
cd "C:\path\to\your\backend\project"
```

### Step 3: Verify Knowledge Base
```bash
dir .agent
```

**Expected**: Should show:
- instructions.md
- architecture.md
- conventions.md
- database.md
- api.md
- security.md
- testing.md
- decisions\ (directory)

### Step 4: Customize for Your Project

Edit each file to match YOUR project:

**1. Edit architecture.md**
```bash
notepad .agent\architecture.md
```

Update with YOUR stack:
- What framework? (Express, Fastify, NestJS)
- What database? (PostgreSQL, MySQL, MongoDB)
- What ORM? (Prisma, TypeORM, Sequelize)
- Your architecture pattern

**2. Edit conventions.md**
```bash
notepad .agent\conventions.md
```

Add YOUR naming conventions:
- File naming (kebab-case? camelCase?)
- Class naming
- Function naming
- Directory structure

**3. Edit database.md**
```bash
notepad .agent\database.md
```

Document YOUR database:
- Schema overview
- Migration tool
- Query patterns

**4. Edit api.md**
```bash
notepad .agent\api.md
```

Document YOUR API patterns:
- REST conventions
- Response format
- Status codes
- Error handling

**5. Edit security.md**
```bash
notepad .agent\security.md
```

Document YOUR security requirements:
- Authentication method (JWT, Session, OAuth)
- Authorization patterns
- Validation rules

**6. Edit testing.md**
```bash
notepad .agent\testing.md
```

Document YOUR testing practices:
- Test framework (Jest, Vitest, Mocha)
- Test structure
- Coverage requirements

## ✅ First Task (5 minutes)

### Step 1: Run a Simple Task
```bash
cd "c:\Varad\Projects\Agentic Workflow"

npm run dev task "Add GET /api/health endpoint that returns status 200 and { status: 'healthy', uptime: process.uptime() }" --repo "C:\path\to\your\backend\project"
```

### Step 2: Watch the Output

You should see:
```
╔══════════════════════════════════════════════════════════╗
║  Backend Engineer Agent - Task Execution               ║
╚══════════════════════════════════════════════════════════╝

Task: Add GET /api/health endpoint...
────────────────────────────────────────────────────────────

📋 Phase 1: Understanding & Planning
✓ Plan created
  • X steps
  • Y files to modify
  • Complexity: low

✓ Created branch: agent/task-xxxxx

🔨 Phase 2: Implementation
✓ Implementation successful
  • Z files changed
  • Tests passed

👁️  Phase 3: Code Review
✓ Review passed

📊 Changes Summary
[shows git diff]

✓ Task completed successfully
```

### Step 3: Review the Changes
```bash
cd "C:\path\to\your\backend\project"
git status
git diff agent/task-xxxxx
```

### Step 4: Test It
```bash
# Run your server
npm run dev

# Test the endpoint (in another terminal)
curl http://localhost:3000/api/health
```

### Step 5: Merge (if good)
```bash
git checkout main
git merge agent/task-xxxxx --no-ff
git branch -d agent/task-xxxxx
```

## ✅ Verification Checklist

After completing the above, verify:

- [ ] Agent successfully created a branch
- [ ] Agent modified/created files correctly
- [ ] Files follow your project's patterns
- [ ] Tests pass (if you have tests)
- [ ] The implementation works when you run it
- [ ] Git diff shows sensible changes

## ✅ Next Steps

### Learn More
- [ ] Read [EXAMPLES.md](./EXAMPLES.md) for more task examples
- [ ] Read [README.md](./README.md) for complete documentation
- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system

### Try More Tasks
- [ ] Add a simple endpoint
- [ ] Add input validation
- [ ] Add a test
- [ ] Fix a bug
- [ ] Refactor code

### Improve Agent Knowledge
- [ ] Add an Architecture Decision Record (ADR)
  ```bash
  notepad "C:\path\to\your\project\.agent\decisions\ADR-001-example.md"
  ```

- [ ] Update conventions as you discover patterns
- [ ] Document security requirements specific to your app

### Customize the Agent
- [ ] Adjust MAX_IMPLEMENTATION_ATTEMPTS in .env
- [ ] Try different approval modes (auto, suggest-only)
- [ ] Add custom tools (see [EXTENDING.md](./EXTENDING.md))

## 🚨 Troubleshooting

### "ANTHROPIC_API_KEY environment variable is required"
**Solution**: 
```bash
notepad .env
# Add: ANTHROPIC_API_KEY=your-key-here
```

### "No test runner detected"
**Solution**: 
Add test script to your project's package.json:
```json
{
  "scripts": {
    "test": "jest"  // or vitest, mocha, etc.
  }
}
```

### "Failed to parse plan"
**Possible causes**:
1. Invalid API key
2. No API credits
3. Network issues
4. Model name typo

**Solution**: Check .env configuration and API key status

### Agent creates wrong pattern
**Solution**: 
1. Update .agent/ files with correct patterns
2. Run a new task to test
3. The agent learns from what you document

### Tests fail
**First time**: This is normal! The agent will retry.
**After max attempts**: 
1. Review what the agent tried
2. Check if your test setup is correct
3. Try a simpler task first

### Git branch issues
**Solution**:
```bash
# See all branches
git branch -a

# Delete old agent branches
git branch -D agent/task-xxxxx
```

## 📊 Success Metrics

After using the agent for a few days, you should notice:

- ✅ Faster implementation of routine features
- ✅ More consistent code across the project
- ✅ Better test coverage
- ✅ Fewer simple bugs (validation, error handling)
- ✅ More time for complex problems

## 🎯 Daily Workflow

Once set up, your daily workflow becomes:

**Morning**
```bash
# Assign routine tasks to agent
npm run dev task "Task 1" --repo "path"
npm run dev task "Task 2" --repo "path"
```

**During Day**
- Work on complex features yourself
- Agent handles routine tasks in background

**Afternoon**
```bash
# Review agent's work
cd your-project
git branch | grep agent/
git diff agent/task-xxx
git merge agent/task-xxx
```

**Evening**
```bash
# Merge completed work
git push origin main
```

## ✅ You're Ready!

If you've completed this checklist:
- ✅ Agent is installed and tested
- ✅ .agent/ knowledge base is customized
- ✅ First task completed successfully
- ✅ You understand the workflow

**You're ready to use the agent in your daily development!**

## 🆘 Need Help?

1. Check the error message carefully
2. Read the relevant documentation
3. Try a simpler task
4. Verify .env configuration
5. Check that .agent/ files exist and are accurate

## 📚 Documentation Index

- [QUICKSTART.md](./QUICKSTART.md) - Fast 5-minute setup
- [README.md](./README.md) - Complete documentation
- [EXAMPLES.md](./EXAMPLES.md) - Usage examples and patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and architecture
- [EXTENDING.md](./EXTENDING.md) - How to add custom features
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Project overview

---

**Ready to build? Start with a simple task and iterate from there!** 🚀
