# Complete Setup & Publishing Guide

**Everything you need** to set up, publish, and use the Backend Engineer Agent.

---

## Table of Contents

1. [Project Setup (Development)](#project-setup-development)
2. [Publishing to NPM](#publishing-to-npm)
3. [Installation (End Users)](#installation-end-users)
4. [Features Overview](#features-overview)
5. [CLI Usage Examples](#cli-usage-examples)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## Project Setup (Development)

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git
- Anthropic API key (for testing)

### Step 1: Clone & Install

```bash
# Navigate to the project
cd "c:\Varad\Projects\Agentic Workflow"

# Install dependencies
npm install

# Verify installation
npm list
```

### Step 2: Build the Project

```bash
# Compile TypeScript to JavaScript
npm run build

# Output will be in ./dist directory
```

### Step 3: Test Locally

```bash
# Link package globally for testing
npm link

# Verify it's linked
backend-agent --version
be-agent --version  # Short alias

# Test commands
backend-agent --help
backend-agent config --show
```

### Step 4: Configure API Key

```bash
# Option 1: Interactive setup
backend-agent config --set

# Option 2: Direct set
backend-agent config --set anthropic.apiKey sk-ant-your-key-here

# Option 3: Environment variable
# Windows PowerShell:
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"

# Linux/Mac:
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### Step 5: Test Analysis Commands

```bash
# Test in your project directory
cd /path/to/your/backend/project

# Run security analysis
backend-agent analyze security

# Run performance analysis
backend-agent analyze performance

# Check health
backend-agent health
```

---

## Publishing to NPM

### Step 1: Update package.json

**Before publishing, update these fields:**

```json
{
  "name": "backend-engineer-agent",
  "version": "1.0.0",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR-USERNAME/backend-engineer-agent.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR-USERNAME/backend-engineer-agent/issues"
  },
  "homepage": "https://github.com/YOUR-USERNAME/backend-engineer-agent#readme"
}
```

**If the package name is taken**, use a scoped name:
```json
{
  "name": "@your-username/backend-engineer-agent"
}
```

### Step 2: Check Package Name Availability

```bash
# Check if name is available
npm view backend-engineer-agent

# If it exists, use scoped name:
npm view @your-username/backend-engineer-agent
```

### Step 3: Create NPM Account (if needed)

```bash
# Visit https://www.npmjs.com/signup
# Or create via CLI:
npm adduser
```

### Step 4: Login to NPM

```bash
npm login

# Enter your credentials:
# - Username
# - Password  
# - Email
# - OTP (if 2FA enabled)
```

### Step 5: Test Package

```bash
# Run tests
npm test

# Build
npm run build

# Check what will be published
npm pack --dry-run

# Or create actual tarball to inspect
npm pack
# This creates backend-engineer-agent-1.0.0.tgz
# Extract and inspect if needed
```

### Step 6: Publish

```bash
# Dry run first (see what would be published)
npm publish --dry-run

# Actual publish
npm publish --access public

# If using scoped package:
npm publish --access public
```

### Step 7: Verify Publication

```bash
# Wait 30-60 seconds for npm to propagate

# Test with npx
npx backend-engineer-agent@latest --version

# View on npm
# https://www.npmjs.com/package/backend-engineer-agent

# Check if it's discoverable
npm search backend-engineer-agent
```

### Step 8: Create GitHub Release

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# Create release on GitHub
# Go to: https://github.com/YOUR-USERNAME/backend-engineer-agent/releases/new
# - Tag: v1.0.0
# - Title: v1.0.0 - Initial Release
# - Description: Copy from PHASE_4_SUMMARY.md
```

---

## Installation (End Users)

### Global Installation

```bash
# Install globally
npm install -g backend-engineer-agent

# Verify installation
backend-agent --version
backend-agent --help
```

### Using npx (No Installation)

```bash
# Run without installing
npx backend-engineer-agent analyze security

# Always use latest version
npx backend-engineer-agent@latest health
```

### Project-specific Installation

```bash
# Install as dev dependency
npm install --save-dev backend-engineer-agent

# Use via npm scripts
# In package.json:
{
  "scripts": {
    "analyze:security": "backend-agent analyze security",
    "analyze:perf": "backend-agent analyze performance",
    "health": "backend-agent health"
  }
}

# Run
npm run analyze:security
```

---

## Features Overview

### 1. Security Analysis

**What it does**: Scans code for security vulnerabilities

**Detects**:
- SQL injection risks
- XSS vulnerabilities  
- Hardcoded credentials
- Weak cryptography
- Missing authentication
- Session security issues
- Data exposure
- Input validation issues

**Output**: Security report with severity levels and fix suggestions

---

### 2. Performance Analysis

**What it does**: Identifies performance bottlenecks

**Detects**:
- N+1 database queries
- Missing pagination
- Memory leaks
- Inefficient algorithms
- Blocking operations
- Resource leaks
- Synchronous file I/O
- Large data processing

**Output**: Performance report with optimization recommendations

---

### 3. Coverage Analysis

**What it does**: Analyzes test coverage

**Provides**:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage
- Coverage gaps identification
- Test suggestions

**Output**: Detailed coverage report with uncovered code

---

### 4. Dependency Analysis

**What it does**: Analyzes project dependencies

**Provides**:
- Outdated packages list
- Security vulnerabilities
- License information
- Dependency tree
- Update recommendations

**Output**: Dependency health report

---

### 5. Architecture Documentation

**What it does**: Auto-generates architecture documentation

**Creates**:
- Project structure overview
- Component relationships
- Design patterns used
- Technology stack
- API endpoints (if detected)

**Output**: Markdown, JSON, or HTML documentation

---

### 6. Tech Stack Detection

**What it does**: Automatically detects technologies used

**Identifies**:
- Frameworks (Express, NestJS, Fastify, etc.)
- Databases (PostgreSQL, MongoDB, Redis, etc.)
- ORMs (TypeORM, Prisma, Sequelize, etc.)
- Testing tools
- Build tools
- Deployment tools

**Output**: Complete tech stack inventory

---

### 7. Health Monitoring

**What it does**: Checks system health

**Monitors**:
- API connectivity
- System resources
- Configuration validity
- Dependencies status

**Output**: Health status report

---

### 8. Metrics & Logging

**What it does**: Provides observability

**Features**:
- Performance metrics
- Operation logs
- Error tracking
- Execution history

**Output**: Metrics and logs for debugging

---

## CLI Usage Examples

### Basic Commands

```bash
# Show version
backend-agent --version
be-agent --version  # Short alias

# Show help
backend-agent --help
backend-agent analyze --help
backend-agent analyze security --help

# Check health
backend-agent health
```

---

### Security Analysis

```bash
# Full security scan
backend-agent analyze security

# High severity only (faster)
backend-agent analyze security --min-severity high

# Critical only
backend-agent analyze security --min-severity critical

# Save to file
backend-agent analyze security --output security-report.txt

# Specific directory
backend-agent analyze security --repo ./src
```

**Example Output**:
```
🔒 Security Analysis

Overall Score: 85/100 ✅

Issues Found: 12
  • Critical: 0
  • High: 2
  • Medium: 5
  • Low: 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  HIGH Issues:

1. Hardcoded credentials in code
   File: src/config/database.ts
   Line: 15
   Code: password = "admin123"
   
   Fix: Move credentials to environment variables
   OWASP: A02:2021 - Cryptographic Failures

2. Missing authentication middleware
   File: src/routes/users.ts
   Line: 25
   Code: router.post('/admin', handler)
   
   Fix: Add authentication middleware
   OWASP: A01:2021 - Broken Access Control

...

💡 Recommendations:

1. 🔴 Move all secrets to environment variables
2. 🟡 Add authentication to 5 unprotected routes
3. 🟡 Enable HTTPS in production

Analyzed 142 files in 18,234ms
```

---

### Performance Analysis

```bash
# Full performance analysis
backend-agent analyze performance

# High severity only
backend-agent analyze performance --min-severity high

# Save to file
backend-agent analyze performance --output perf-report.txt

# Specific directory
backend-agent analyze performance --repo ./src/services
```

**Example Output**:
```
⚡ Performance Analysis

Overall Score: 72/100 ⚠️

Issues Found: 8
  • Critical: 1
  • High: 3
  • Medium: 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 CRITICAL Issues:

1. N+1 Query Problem Detected
   File: src/services/blog.service.ts
   Line: 45-48
   
   Current Code:
   const posts = await this.postRepo.find();
   for (const post of posts) {
     post.author = await this.userRepo.findById(post.authorId);
   }
   
   Impact: 1000+ queries for 1000 posts
   Fix: Use join or eager loading
   
   Better Approach:
   const posts = await this.postRepo.find({
     relations: ['author']
   });

...

💡 Recommendations:

1. 🔴 Fix N+1 query in BlogService
2. 🟡 Add pagination to /api/posts endpoint
3. 🟡 Use connection pooling for database

Analyzed 89 files in 12,456ms
```

---

### Coverage Analysis

```bash
# Prerequisites: Run tests with coverage first
npm test -- --coverage

# Then analyze
backend-agent analyze coverage

# With threshold (fail if below 80%)
backend-agent analyze coverage --threshold 80

# Save to file
backend-agent analyze coverage --output coverage-report.txt
```

**Example Output**:
```
📊 Test Coverage Analysis

Overall Coverage: 76% ⚠️

Statements: 1,245/1,580 (78%)
Branches:     432/620 (69%)
Functions:    189/245 (77%)
Lines:      1,187/1,520 (78%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Critical Uncovered Files:

1. src/services/payment.service.ts
   Coverage: 35%
   Lines: 45/128
   Priority: HIGH (payment logic)

2. src/services/auth.service.ts
   Coverage: 52%
   Lines: 78/150
   Priority: HIGH (authentication)

...

💡 Test Suggestions:

1. Add tests for payment flow
2. Test authentication edge cases
3. Add integration tests for API endpoints
```

---

### Dependency Analysis

```bash
# Analyze dependencies
backend-agent analyze deps

# Check vulnerabilities
backend-agent analyze deps --check-vulnerabilities

# Check outdated
backend-agent analyze deps --check-outdated

# Full scan (both)
backend-agent analyze deps --check-vulnerabilities --check-outdated

# Save to file
backend-agent analyze deps --output deps-report.txt
```

**Example Output**:
```
📦 Dependency Analysis

Total Dependencies: 87
  • Production: 45
  • Development: 42

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 Vulnerabilities Found: 3

1. Critical: lodash@4.17.19
   Vulnerability: Prototype Pollution
   CVE: CVE-2020-8203
   Fix: Update to lodash@4.17.21

2. High: express@4.16.0
   Vulnerability: Open Redirect
   CVE: CVE-2022-24999
   Fix: Update to express@4.18.2

...

⚠️  Outdated Packages: 12

1. typescript: 4.5.2 → 5.2.2
2. vitest: 0.28.0 → 0.34.6
3. express: 4.16.0 → 4.18.2

...

💡 Recommendations:

1. Run: npm update
2. Fix vulnerabilities: npm audit fix
3. Update major versions manually
```

---

### Architecture Documentation

```bash
# Generate markdown (default)
backend-agent analyze arch

# Generate JSON
backend-agent analyze arch --format json

# Generate HTML
backend-agent analyze arch --format html

# Save to file
backend-agent analyze arch --output ARCHITECTURE.md

# Specific directory
backend-agent analyze arch --repo ./src
```

**Example Output** (Markdown):
```markdown
# Project Architecture

## Overview
Express.js REST API with PostgreSQL database

## Technology Stack
- Framework: Express 4.18.2
- Language: TypeScript 5.2.2
- Database: PostgreSQL 15
- ORM: TypeORM 0.3.17
- Testing: Vitest 0.34.6

## Project Structure
```
src/
├── controllers/    # HTTP request handlers
├── services/       # Business logic
├── repositories/   # Database access
├── models/         # Data models
├── routes/         # API routes
└── utils/          # Utilities
```

## Design Patterns
- Repository Pattern
- Dependency Injection
- Factory Pattern
- Singleton Pattern (database connection)

## API Endpoints
- GET /api/users - List users
- POST /api/users - Create user
- GET /api/users/:id - Get user
...
```

---

### Tech Stack Detection

```bash
# Detect tech stack
backend-agent analyze tech-stack

# Save to file
backend-agent analyze tech-stack --output tech-stack.json
```

**Example Output**:
```json
{
  "framework": {
    "name": "Express",
    "version": "4.18.2",
    "type": "web-framework"
  },
  "language": {
    "name": "TypeScript",
    "version": "5.2.2"
  },
  "database": [
    {
      "name": "PostgreSQL",
      "version": "15.0",
      "type": "relational"
    },
    {
      "name": "Redis",
      "version": "7.0",
      "type": "cache"
    }
  ],
  "orm": {
    "name": "TypeORM",
    "version": "0.3.17"
  },
  "testing": {
    "name": "Vitest",
    "version": "0.34.6"
  },
  "buildTool": {
    "name": "TypeScript",
    "version": "5.2.2"
  }
}
```

---

### Health Check

```bash
# Check system health
backend-agent health

# JSON format
backend-agent health --format json
```

**Example Output**:
```
🏥 System Health Check

✅ Status: Healthy

Components:
  ✅ API Connection: OK
  ✅ Configuration: OK
  ✅ Dependencies: OK
  ⚠️  Disk Space: Low (85% used)

System Info:
  • Node.js: v18.17.0
  • Memory: 245MB / 2GB
  • CPU: 12%
  • Uptime: 2h 34m

Last Check: 2026-10-04 14:30:15
```

---

### Metrics

```bash
# View metrics
backend-agent metrics

# Filter by type
backend-agent metrics --filter performance

# Prometheus format
backend-agent metrics --format prometheus
```

**Example Output**:
```
📊 Metrics

Performance:
  • Avg Analysis Time: 18.5s
  • Cache Hit Rate: 67%
  • Files Analyzed: 1,247

Operations:
  • Total Analyses: 42
  • Errors: 3
  • Success Rate: 92%

Resource Usage:
  • Memory: 245MB
  • CPU: 12%
```

---

### Logs

```bash
# View recent logs
backend-agent logs

# Error logs only
backend-agent logs --level error

# Last 100 lines
backend-agent logs --lines 100

# Follow logs (like tail -f)
backend-agent logs --follow

# Save to file
backend-agent logs --output debug.log
```

**Example Output**:
```
[2026-10-04 14:30:15] INFO  Analysis started
[2026-10-04 14:30:16] DEBUG Loading configuration
[2026-10-04 14:30:17] INFO  Analyzing 142 files
[2026-10-04 14:30:32] WARN  High severity issue found
[2026-10-04 14:30:35] INFO  Analysis complete
[2026-10-04 14:30:35] INFO  Found 12 issues
```

---

## Configuration

### View Configuration

```bash
# Show all config
backend-agent config --show

# Show specific value
backend-agent config --get anthropic.apiKey
```

### Set Configuration

```bash
# Interactive setup
backend-agent config --set

# Set specific value
backend-agent config --set anthropic.apiKey sk-ant-...
backend-agent config --set log.level debug
backend-agent config --set output.format json
```

### Configuration File Location

```
Windows: C:\Users\USERNAME\.backend-agent\config.json
Mac/Linux: ~/.backend-agent/config.json
```

### Configuration Format

```json
{
  "anthropic": {
    "apiKey": "sk-ant-your-key-here"
  },
  "log": {
    "level": "info",
    "format": "pretty"
  },
  "output": {
    "format": "markdown",
    "verbose": false
  },
  "analysis": {
    "parallel": true,
    "cache": true
  }
}
```

---

## Common Workflows

### Pre-Commit Checks

```bash
# Create git hook: .git/hooks/pre-commit
#!/bin/bash
backend-agent analyze security --min-severity high || exit 1
backend-agent analyze performance --min-severity high || exit 1
```

### CI/CD Integration

**GitHub Actions**:
```yaml
name: Code Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Agent
        run: npm install -g backend-engineer-agent
      
      - name: Security Scan
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: backend-agent analyze security --min-severity high
      
      - name: Performance Check
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: backend-agent analyze performance --min-severity high
```

### Daily Monitoring

```bash
# Create cron job (Linux/Mac)
0 9 * * * cd /path/to/project && backend-agent analyze security --output daily-security.txt

# Or Windows Task Scheduler
# Action: backend-agent analyze security --output daily-security.txt
# Trigger: Daily at 9 AM
```

---

## Troubleshooting

### Command Not Found

```bash
# Reinstall globally
npm install -g backend-engineer-agent

# Verify
backend-agent --version
```

### API Key Errors

```bash
# Set API key
backend-agent config --set

# Or use environment variable
export ANTHROPIC_API_KEY=sk-ant-your-key
backend-agent analyze security
```

### Analysis Not Working

```bash
# Check you're in project directory
pwd

# Navigate to project
cd /path/to/your/project

# Run analysis
backend-agent analyze security
```

### Performance Issues

```bash
# Use higher severity threshold
backend-agent analyze security --min-severity high

# Analyze specific directory
backend-agent analyze security --repo ./src

# Clear cache
rm -rf ~/.backend-agent/cache
```

### View Detailed Errors

```bash
# Enable debug logging
export LOG_LEVEL=debug
backend-agent analyze security

# Check logs
backend-agent logs --level error --lines 100
```

---

## Getting Help

### Documentation

- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Examples**: [EXAMPLES.md](./EXAMPLES.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **FAQ**: [FAQ.md](./FAQ.md)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

### Support

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Email**: your-email@example.com
- **Stack Overflow**: Tag with `backend-engineer-agent`

---

## Quick Reference Card

```bash
# Installation
npm install -g backend-engineer-agent

# Configuration
backend-agent config --set

# Analysis Commands
backend-agent analyze security           # Security scan
backend-agent analyze performance        # Performance scan
backend-agent analyze coverage           # Coverage report
backend-agent analyze deps               # Dependencies
backend-agent analyze arch               # Documentation
backend-agent analyze tech-stack         # Tech stack

# Monitoring
backend-agent health                     # Health check
backend-agent metrics                    # View metrics
backend-agent logs                       # View logs

# Help
backend-agent --help                     # General help
backend-agent analyze --help             # Analysis help
backend-agent <command> --help           # Command help
```

---

**You're ready to go!** 🚀

Start by installing the package and running your first analysis. Check out [QUICKSTART.md](./QUICKSTART.md) for a 5-minute tutorial.

---

**Last Updated**: October 4, 2026  
**Version**: 1.0.0
