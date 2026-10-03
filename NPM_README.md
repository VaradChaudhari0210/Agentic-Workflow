# Backend Engineer Agent

> Your Personal AI Backend Engineer - Automates routine backend tasks from requirements to tested implementation

An AI-powered agentic workflow system that autonomously implements backend features, following your patterns and conventions.

## 🚀 Quick Start

### No Installation Required (npx)

```bash
# Run directly with npx
npx backend-engineer-agent task "Add health check endpoint"
```

### Or Install Globally

```bash
# Install once
npm install -g backend-engineer-agent

# Use anywhere
backend-agent task "Add GET /api/users endpoint"
```

## 📋 Setup

### First Time: Set Your API Key

```bash
# Method 1: Save to config (recommended)
backend-agent config --set-api-key sk-ant-your-key-here

# Method 2: Use environment variable
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Method 3: Inline (for one-time use)
ANTHROPIC_API_KEY=sk-ant-xxx backend-agent task "..."
```

**Get your API key:** https://console.anthropic.com/

## 💻 Usage

### Run a Task

```bash
# In current directory
backend-agent task "Add GET /api/users/:id endpoint with error handling"

# In specific directory
backend-agent task "Add validation to registration" --repo /path/to/project

# With options
backend-agent task "Add JWT auth middleware" --model claude-opus-4 --max-attempts 3
```

### Initialize Knowledge Base

```bash
# Auto-discover your project patterns (recommended)
backend-agent discover

# Or use templates
backend-agent init

# Then edit .agent/ files to match your project
```

### Manage Configuration

```bash
# Show current config
backend-agent config --show

# Update API key
backend-agent config --set-api-key sk-ant-new-key

# Show config file location
backend-agent config --path
```

## ✨ What It Does

```
You give a task description
         ↓
Agent analyzes your codebase
         ↓
Creates detailed plan
         ↓
Creates git branch
         ↓
Implements feature (matches your patterns)
         ↓
Runs tests automatically
         ↓
Reviews code for issues
         ↓
Shows you the diff
         ↓
You review and merge
```

## 🎯 Example Tasks

```bash
# Add API endpoint
backend-agent task "Add GET /api/users/:id/statistics endpoint"

# Fix bugs
backend-agent task "Fix race condition in session cleanup"

# Add features
backend-agent task "Add pagination to posts endpoint with limit and offset"

# Refactor
backend-agent task "Extract validation logic into ValidationService"

# Add tests
backend-agent task "Add integration tests for authentication flow"
```

## 🛡️ Safety Features

- ✅ **Branch-based workflow** - Every task runs on a new branch
- ✅ **Never touches main** - Your main branch is always safe
- ✅ **Test-driven** - Won't complete until tests pass
- ✅ **Code review** - Automatic security and quality checks
- ✅ **Multiple attempts** - Retries on failure (configurable)
- ✅ **You're in control** - You review and decide when to merge

## 📚 How It Learns Your Patterns

The agent reads `.agent/` files in your repository:

```
your-project/
└── .agent/
    ├── architecture.md    # Your system design
    ├── conventions.md     # Coding standards
    ├── database.md        # Schema and patterns
    ├── api.md            # API conventions
    ├── security.md       # Security requirements
    └── testing.md        # Testing practices
```

**Initialize with auto-discovery:**
```bash
cd your-project
backend-agent discover
# Edit generated files to refine
```

## ⚙️ Configuration Options

### Command Options

```bash
backend-agent task "..." \
  --repo /path/to/project \      # Target repository (default: current dir)
  --model claude-opus-4 \         # Claude model (default: sonnet-4)
  --max-attempts 3 \              # Max retry attempts (default: 3)
  --approval manual \             # Approval mode (manual/auto/suggest-only)
  --confirm-plan \                # Review plan before implementing
  --no-summary                    # Skip task summary generation
```

### Approval Modes

- `manual` (default): Agent implements, you review before merge
- `suggest-only`: Agent creates plan only, no implementation
- `auto`: Agent implements and commits (use with caution)

## 🎓 Architecture

```
Orchestrator (coordinates everything)
    ↓
Planner (creates implementation plan)
    ↓
Implementer (writes code)
    ↓
Reviewer (security & quality checks)
```

**Multi-agent system with:**
- Repository intelligence
- Git integration
- Automatic testing
- Code review
- Pattern matching

## 💰 Cost

- Uses Anthropic Claude API (~$2-5 per day typical usage)
- No subscription fees
- Pay only for what you use
- ROI: 10x-50x for routine tasks

## 📖 Full Documentation

- [Quickstart Guide](https://github.com/yourusername/backend-engineer-agent/blob/main/QUICKSTART.md)
- [Examples](https://github.com/yourusername/backend-engineer-agent/blob/main/EXAMPLES.md)
- [Architecture](https://github.com/yourusername/backend-engineer-agent/blob/main/ARCHITECTURE.md)
- [Extending](https://github.com/yourusername/backend-engineer-agent/blob/main/EXTENDING.md)

## 🐛 Troubleshooting

### "No API key configured"

Set your API key using one of the methods in Setup section above.

### "No test runner detected"

Ensure your `package.json` has a test script:
```json
{
  "scripts": {
    "test": "jest" // or vitest, mocha, etc.
  }
}
```

### Agent creates wrong implementation

1. Run `backend-agent discover` to generate `.agent/` files
2. Edit `.agent/` files to match your exact patterns
3. Be more specific in task descriptions

## 🤝 Requirements

- Node.js 18+ 
- Anthropic API key
- Git repository
- Backend project (Node.js/TypeScript)

## 📄 License

MIT - Use freely, modify freely, share freely

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/backend-engineer-agent)
- [Report Issues](https://github.com/yourusername/backend-engineer-agent/issues)
- [Anthropic Console](https://console.anthropic.com/)

## 🌟 Why This Matters

**Before:**
- 30-60 minutes for simple CRUD endpoint
- Manual testing
- Repetitive boilerplate
- Pattern inconsistencies

**With Agent:**
- 3-5 minutes for same endpoint
- Automatic testing
- Consistent patterns
- More time for complex problems

**You focus on:** Architecture, algorithms, optimization, innovation  
**Agent handles:** CRUD, validation, error handling, tests, boilerplate

---

**Ready to get started?**

```bash
npx backend-engineer-agent task "Add health check endpoint"
```

🚀 Start building!
