# Auto-Discovery Feature

## Overview

The Backend Engineer Agent now features **intelligent auto-discovery** that automatically analyzes your repository and generates the `.agent/` knowledge base for you.

No more manual documentation! The agent scans your code and creates accurate documentation of your patterns, conventions, and architecture.

## How It Works

```
Your Repository
      ↓
  [Scan Code]
      ↓
 [Analyze Patterns]
      ↓
[Detect Stack & Conventions]
      ↓
[Generate Documentation]
      ↓
  .agent/ files
      ↓
[You Review & Approve]
```

## What Gets Discovered

### 1. Technology Stack
- Framework (Express, Fastify, NestJS, etc.)
- Database (PostgreSQL, MySQL, MongoDB)
- ORM (Prisma, TypeORM, Sequelize)
- Testing framework (Jest, Vitest, Mocha)
- Authentication method (JWT, Passport, Sessions)

### 2. Architecture Patterns
- Directory structure
- Layer separation (controllers, services, repositories)
- Data flow patterns
- Middleware usage
- Error handling approach

### 3. Code Conventions
- File naming patterns (kebab-case, camelCase)
- Class and function naming
- Import/export patterns
- Comment style

### 4. API Patterns
- REST conventions used
- Response format structure
- Status code usage
- Error response format
- Pagination approach

### 5. Database Patterns
- Schema structure
- Migration approach
- Query patterns
- Transaction usage

### 6. Security Patterns
- Authentication mechanism
- Authorization approach
- Input validation patterns
- Password handling

### 7. Testing Patterns
- Test organization
- Naming conventions
- Mock/stub patterns

## Usage

### Method 1: Standalone Discovery Command (Recommended)

Run discovery before your first task:

```bash
# Discover and generate .agent/ files
npm run dev discover /path/to/your/backend/project

# Output shows what was discovered
# Files are created in /path/to/your/backend/project/.agent/

# Review the generated files
cd /path/to/your/backend/project/.agent
ls
# architecture.md  conventions.md  database.md  api.md  security.md  testing.md

# Edit files to correct any misunderstandings
notepad architecture.md  # (or your preferred editor)

# Now run your first task
npm run dev task "Add health check endpoint" --repo /path/to/your/backend/project
```

### Method 2: Auto-Discovery on First Task

The agent will automatically run discovery on your first task:

```bash
# Run any task without .agent/ setup
npm run dev task "Add health check endpoint" --repo /path/to/your/backend/project

# Agent detects no .agent/ directory
# Agent asks: "Would you like me to analyze your repository?"
# Agent runs discovery
# Agent generates .agent/ files
# Agent shows you what was created
# Then continues with your task
```

## Example Output

```
╔══════════════════════════════════════════════════════════╗
║  Repository Auto-Discovery                              ║
╚══════════════════════════════════════════════════════════╝

Target: /path/to/your/backend/project
────────────────────────────────────────────────────────────

🔍 Analyzing repository patterns...

This may take 30-60 seconds depending on repository size

✓ Repository analyzed
  Confidence: high

📝 Generating knowledge base files...

  ✓ Instructions     .agent/instructions.md
  ✓ Architecture     .agent/architecture.md
  ✓ Conventions      .agent/conventions.md
  ✓ Database         .agent/database.md
  ✓ API Patterns     .agent/api.md
  ✓ Security         .agent/security.md
  ✓ Testing          .agent/testing.md
  ✓ Decisions        .agent/decisions/

✓ Knowledge base generated!

💡 Recommendations:

   1. Add rate limiting middleware for public endpoints
   2. Consider adding API versioning
   3. Document pagination parameters in api.md

📋 Next Steps:

   1. Review files in .agent/ directory
   2. Edit them to match your exact requirements
   3. Add any missing information
   4. Run your first task:

      npm run dev task "Add health check endpoint"
```

## What Gets Analyzed

The discovery agent reads:

1. **package.json** - Dependencies and scripts
2. **tsconfig.json** - TypeScript configuration
3. **prisma/schema.prisma** - Database schema (if Prisma)
4. **src/index.ts or app.ts** - Main entry point
5. **Sample controller** - To understand API patterns
6. **Sample service** - To understand business logic patterns
7. **Sample test** - To understand testing patterns
8. **Directory structure** - To understand organization
9. **.env.example** - To understand configuration
10. **README.md** - For additional context
11. **Recent git commits** - To understand evolution

## Generated Files

### .agent/architecture.md
```markdown
# Architecture

## Stack
- Node.js 20.x
- Express 4.x
- TypeScript 5.x
- PostgreSQL 15
- Prisma ORM

## Architecture Pattern
Request → Controller → Service → Repository → Database

## Key Principles
- Controllers handle HTTP only
- Business logic in services
- Data access in repositories
```

### .agent/conventions.md
```markdown
# Coding Conventions

## File Naming
- Controllers: user.controller.ts (kebab-case)
- Services: user.service.ts (kebab-case)
- Tests: user.service.test.ts

## Class Naming
- Controllers: UserController (PascalCase)
- Services: UserService (PascalCase)

## Function Naming
- camelCase: getUserById, createUser
```

### .agent/database.md
```markdown
# Database Patterns

## ORM
Prisma

## Schema Location
prisma/schema.prisma

## Migrations
- Tool: Prisma Migrate
- Location: prisma/migrations/
- Pattern: Never modify existing migrations

## Query Patterns
- Always use Prisma Client
- Parameterized queries only
- Transactions for multi-step operations
```

And so on for each file...

## Confidence Levels

The discovery agent reports confidence:

- **High**: Found clear patterns, consistent code, good documentation
- **Medium**: Found patterns but some inconsistencies or missing docs
- **Low**: Limited code to analyze or unclear patterns

**You should always review**, but low confidence means extra scrutiny needed.

## Skipping Auto-Discovery

If you don't want auto-discovery:

```bash
# Set environment variable
export SKIP_DISCOVERY=true

# Or in .env file
SKIP_DISCOVERY=true

# Now tasks won't auto-discover
npm run dev task "..."

# Use manual init instead
npm run dev init /path/to/project
```

## Re-Running Discovery

Want to re-run discovery after code changes?

```bash
# Discovery will overwrite existing .agent/ files
npm run dev discover /path/to/your/project

# Or delete .agent/ and run a task
rm -rf /path/to/your/project/.agent
npm run dev task "..." --repo /path/to/your/project
```

## Customizing After Discovery

Discovery creates a starting point. **You should customize:**

1. **Review for accuracy**
   - Did it detect the right framework?
   - Are the patterns correct?
   - Any misunderstandings?

2. **Add project-specific details**
   - Special requirements
   - Business rules
   - Team conventions not in code

3. **Document edge cases**
   - Special authentication flows
   - Custom validation rules
   - Performance requirements

4. **Add Architecture Decision Records**
   ```bash
   cd .agent/decisions
   # Create ADR-001-why-we-use-postgres.md
   # Create ADR-002-api-versioning-strategy.md
   ```

## Benefits

### Before Auto-Discovery
```
Manual Setup: 30-60 minutes
- Read through codebase
- Document patterns
- Write architecture.md
- Write conventions.md
- Write all other files
- Hope you didn't miss anything
```

### With Auto-Discovery
```
Auto Setup: 1-2 minutes
- Run: npm run dev discover
- Review generated files (5-10 min)
- Make corrections
- Add project-specific details
- Done!
```

**Time saved: ~45 minutes per project**

## Limitations

### What It Can Detect
✅ Technology stack (frameworks, databases, ORMs)
✅ File and directory patterns
✅ Naming conventions
✅ API response formats
✅ Common authentication patterns
✅ Testing patterns

### What It Cannot Detect
❌ Business logic requirements
❌ Non-obvious security requirements
❌ Performance SLAs
❌ Deployment procedures
❌ Team-specific conventions not in code
❌ Reasons for architectural decisions

**Solution**: Add these manually after discovery

## Advanced: Discovery Algorithm

How does it work?

1. **Scan Phase**
   - Read package.json
   - Read config files
   - Read sample code files
   - Read git history

2. **Analysis Phase**
   - Detect frameworks from dependencies
   - Identify patterns from code structure
   - Understand conventions from naming
   - Extract API patterns from controllers
   - Understand testing from test files

3. **Generation Phase**
   - Create architecture documentation
   - Document conventions found
   - Write database patterns
   - Document API patterns
   - Document security patterns
   - Document testing patterns

4. **Validation Phase**
   - Estimate confidence level
   - Generate recommendations
   - Flag inconsistencies

## Troubleshooting

### "Discovery failed"

**Possible causes:**
1. Invalid API key
2. Network issues
3. Repository structure unusual
4. Not enough code to analyze

**Solution:**
- Check API key in .env
- Verify network connection
- Use manual init instead: `npm run dev init`

### "Low confidence"

**What it means:**
- Not much code to analyze
- Inconsistent patterns found
- Unclear conventions

**What to do:**
- Review files extra carefully
- Add missing information manually
- Document your actual patterns

### "Wrong framework detected"

**Example:** Uses Fastify but detected Express

**Solution:**
- Edit .agent/architecture.md
- Correct the framework
- Add Fastify-specific patterns
- Agent will learn from corrections

### Discovery takes too long

**Expected:** 30-60 seconds
**Too long:** > 2 minutes

**Possible causes:**
- Very large repository
- Slow API response

**Solution:**
- Be patient (large repos take time)
- Use manual init for extremely large projects

## Best Practices

### 1. Always Review

Even with high confidence, review the generated files:
```bash
cd .agent
cat architecture.md  # Review each file
cat conventions.md
# etc.
```

### 2. Correct Immediately

Found an error? Fix it right away:
```bash
notepad architecture.md
# Fix the error
```

The agent learns from these files, so accuracy matters.

### 3. Add What's Missing

Discovery finds patterns in code, but can't read your mind:
- Document WHY decisions were made (use ADRs)
- Add business requirements
- Document deployment procedures
- Add team conventions

### 4. Re-Run After Major Changes

Changed frameworks? Refactored architecture?
```bash
npm run dev discover /path/to/project
# Review changes
```

### 5. Version Control .agent/

Commit .agent/ files to git:
```bash
git add .agent/
git commit -m "Add agent knowledge base"
```

Benefits:
- Team shares knowledge
- Track changes over time
- Onboard new devs faster

## Comparison

### Auto-Discovery vs Manual Init

| Aspect | Auto-Discovery | Manual Init |
|--------|----------------|-------------|
| **Time** | 1-2 min | 30-60 min |
| **Accuracy** | 80-95% | 100% (if done right) |
| **Effort** | Low (review + edit) | High (write everything) |
| **Best for** | Most projects | Greenfield or unusual projects |

**Recommendation**: Use auto-discovery, then edit. Much faster than manual.

## Future Improvements

Planned enhancements:

- **Continuous Learning**: Agent remembers corrections
- **Pattern Evolution**: Track how patterns change over time
- **Multi-Repo Discovery**: Analyze multiple services at once
- **Team Patterns**: Share discoveries across team
- **Confidence Scoring**: More detailed confidence metrics

## Summary

**Auto-discovery makes onboarding seamless:**

1. Run: `npm run dev discover /path/to/project`
2. Wait 30-60 seconds
3. Review generated files
4. Make corrections
5. Start using agent

**No more manual documentation of your codebase!**

The agent does the boring work, you verify and enhance. Perfect balance of automation and control.

---

**Ready to try it?**

```bash
npm run dev discover /path/to/your/backend/project
```

Or just run your first task and let the agent discover automatically! 🚀
