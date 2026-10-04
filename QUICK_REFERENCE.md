# Quick Reference Guide

**One-page reference** for Backend Engineer Agent commands and patterns.

---

## Installation & Setup

```bash
# Install globally
npm install -g backend-engineer-agent

# Configure API key
backend-agent config --set

# Verify installation
backend-agent --version
backend-agent health
```

---

## Common Commands

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
```

**When to use**: Before commits, in CI/CD, weekly audits

---

### Performance Analysis

```bash
# Full performance analysis
backend-agent analyze performance

# High severity only
backend-agent analyze performance --min-severity high

# Specific directory
backend-agent analyze performance --repo ./src

# Save to file
backend-agent analyze performance --output perf-report.txt
```

**When to use**: Before deploys, after major changes, monthly reviews

---

### Coverage Analysis

```bash
# Analyze test coverage
backend-agent analyze coverage

# With threshold (fail if below)
backend-agent analyze coverage --threshold 80

# Show coverage gaps
backend-agent analyze coverage --show-gaps
```

**Prerequisites**: Run tests with coverage first
```bash
npm test -- --coverage  # Generate coverage data
```

**When to use**: After writing tests, before PRs, in CI/CD

---

### Dependency Analysis

```bash
# Analyze dependencies
backend-agent analyze deps

# Check for vulnerabilities
backend-agent analyze deps --check-vulnerabilities

# Check for outdated packages
backend-agent analyze deps --check-outdated

# Full scan (vulnerabilities + outdated)
backend-agent analyze deps --check-vulnerabilities --check-outdated
```

**When to use**: Weekly, before upgrades, security audits

---

### Architecture Documentation

```bash
# Generate markdown docs
backend-agent analyze arch

# Generate JSON
backend-agent analyze arch --format json

# Generate HTML
backend-agent analyze arch --format html

# Save to file
backend-agent analyze arch --output ARCHITECTURE.md
```

**When to use**: Onboarding, documentation updates, architecture reviews

---

### Tech Stack Detection

```bash
# Auto-detect tech stack
backend-agent analyze tech-stack

# Save to file
backend-agent analyze tech-stack --output tech-stack.json
```

**When to use**: New project, documentation, migration planning

---

## Monitoring Commands

### Health Check

```bash
# System health
backend-agent health

# JSON output
backend-agent health --format json
```

**When to use**: Before starting work, debugging issues

---

### Metrics

```bash
# View metrics
backend-agent metrics

# Specific metric
backend-agent metrics --filter performance

# Export format
backend-agent metrics --format prometheus
```

**When to use**: Performance monitoring, capacity planning

---

### Logs

```bash
# View recent logs
backend-agent logs

# Error logs only
backend-agent logs --level error

# Last 100 lines
backend-agent logs --lines 100

# Follow (tail -f)
backend-agent logs --follow

# Save to file
backend-agent logs --output debug.log
```

**When to use**: Debugging, error investigation

---

## Configuration

### View Config

```bash
# Show all config
backend-agent config --show

# Show specific key
backend-agent config --get anthropic.apiKey
```

---

### Set Config

```bash
# Interactive setup
backend-agent config --set

# Set specific value
backend-agent config --set anthropic.apiKey sk-ant-...

# Set multiple values
backend-agent config --set log.level debug
backend-agent config --set output.format json
```

---

### Reset Config

```bash
# Reset to defaults
backend-agent config --reset

# Confirm path
backend-agent config --path
```

**Config location**: `~/.backend-agent/config.json`

---

## Common Workflows

### Pre-Commit Checks

```bash
# Quick security + performance
backend-agent analyze security --min-severity high
backend-agent analyze performance --min-severity high
```

**Add to git hooks**:
```bash
# .git/hooks/pre-commit
#!/bin/bash
backend-agent analyze security --min-severity high || exit 1
```

---

### Pre-Deploy Checks

```bash
# Full security scan
backend-agent analyze security

# Performance check
backend-agent analyze performance

# Dependency vulnerabilities
backend-agent analyze deps --check-vulnerabilities

# System health
backend-agent health
```

---

### Weekly Maintenance

```bash
# Check for outdated dependencies
backend-agent analyze deps --check-outdated

# Security audit
backend-agent analyze security

# Review performance
backend-agent analyze performance --min-severity medium
```

---

### New Project Setup

```bash
# 1. Detect tech stack
backend-agent analyze tech-stack --output tech-stack.json

# 2. Generate architecture docs
backend-agent analyze arch --output ARCHITECTURE.md

# 3. Initial security scan
backend-agent analyze security --output security-baseline.txt

# 4. Dependency check
backend-agent analyze deps --check-vulnerabilities
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Backend Agent Checks

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

---

### GitLab CI

```yaml
backend-agent:
  image: node:18
  before_script:
    - npm install -g backend-engineer-agent
  script:
    - backend-agent analyze security --min-severity high
    - backend-agent analyze performance --min-severity high
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

---

## Environment Variables

```bash
# API Key
export ANTHROPIC_API_KEY=sk-ant-...

# Log level (debug, info, warn, error)
export LOG_LEVEL=debug

# Output format (json, text)
export OUTPUT_FORMAT=json

# Config file location
export BACKEND_AGENT_CONFIG=/path/to/config.json
```

**Windows PowerShell**:
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:LOG_LEVEL = "debug"
```

---

## Common Options

### Global Options

```bash
--help, -h              Show help
--version, -v           Show version
--config <path>         Config file location
--verbose               Verbose output
--quiet                 Minimal output
--no-color              Disable colors
```

---

### Analyze Options

```bash
--repo <path>           Repository path (default: .)
--output <file>         Save to file
--format <type>         Output format (markdown, json, html)
--min-severity <level>  Minimum severity (low, medium, high, critical)
```

---

## Severity Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| **low** | Development, comprehensive scan | All issues |
| **medium** | Regular checks, PR reviews | Important issues |
| **high** | Pre-deploy, CI/CD | Critical & high issues |
| **critical** | Production, emergency | Only critical issues |

**Recommendation**: 
- Development: `low` or `medium`
- CI/CD: `high`
- Production alerts: `critical`

---

## Output Formats

### Markdown (default)

```bash
backend-agent analyze security
# Human-readable, emoji formatting
```

**Best for**: Console output, documentation

---

### JSON

```bash
backend-agent analyze security --format json
```

**Best for**: Automation, parsing, integration

---

### HTML

```bash
backend-agent analyze arch --format html --output docs.html
```

**Best for**: Reports, sharing, web display

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |
| 2 | Validation error (bad input) |
| 3 | API error |
| 4 | Config error |

**In CI/CD**:
```bash
backend-agent analyze security || exit 1
```

---

## Troubleshooting Quick Fixes

### "Command not found"

```bash
npm install -g backend-engineer-agent
backend-agent --version
```

---

### "API key not found"

```bash
backend-agent config --set
# Enter API key when prompted
```

---

### "No coverage file"

```bash
# Generate coverage first
npm test -- --coverage
# Then analyze
backend-agent analyze coverage
```

---

### Slow performance

```bash
# Use higher severity threshold
backend-agent analyze security --min-severity high

# Or analyze specific directory
backend-agent analyze performance --repo ./src
```

---

## Cheat Sheet

```bash
# Essential commands
backend-agent --help                                  # Help
backend-agent config --set                           # Configure
backend-agent health                                  # Health check

# Quick security check
backend-agent analyze security --min-severity high

# Quick performance check
backend-agent analyze performance --min-severity high

# Check coverage
npm test -- --coverage
backend-agent analyze coverage --threshold 80

# Check dependencies
backend-agent analyze deps --check-vulnerabilities

# View logs
backend-agent logs --level error --lines 50

# Generate docs
backend-agent analyze arch --output ARCHITECTURE.md
```

---

## Common Patterns

### Daily Development

```bash
# Morning: Check system health
backend-agent health

# Before commit: Quick checks
backend-agent analyze security --min-severity high

# After changes: View logs
backend-agent logs --level error
```

---

### Pull Request Review

```bash
# Run before creating PR
backend-agent analyze security
backend-agent analyze performance
npm test -- --coverage
backend-agent analyze coverage --threshold 80
```

---

### Production Deployment

```bash
# Pre-deploy checklist
backend-agent health
backend-agent analyze security
backend-agent analyze performance
backend-agent analyze deps --check-vulnerabilities
backend-agent metrics
```

---

### Security Audit

```bash
# Comprehensive security check
backend-agent analyze security --output security-report.txt
backend-agent analyze deps --check-vulnerabilities --output deps-report.txt
backend-agent logs --level error --output error-log.txt
```

---

## Keyboard Shortcuts

When prompted for input:
- `Ctrl+C` - Cancel
- `Enter` - Confirm
- `Tab` - Autocomplete (where available)
- `↑/↓` - History (where available)

---

## Tips & Tricks

### Faster Scans

```bash
# Skip low severity (5-10x faster)
--min-severity high
```

---

### Better Reports

```bash
# Save all reports for comparison
backend-agent analyze security --output "security-$(date +%Y%m%d).txt"
```

---

### Automation

```bash
# Daily security scan
0 9 * * * backend-agent analyze security --min-severity high
```

---

### Multi-repo

```bash
# Scan multiple projects
for dir in /projects/*/; do
  backend-agent analyze security --repo "$dir" --min-severity high
done
```

---

## Documentation Links

- **[README.md](./README.md)** - Complete guide
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup
- **[EXAMPLES.md](./EXAMPLES.md)** - Usage examples
- **[FAQ.md](./FAQ.md)** - Frequently asked questions
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problem solving
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How it works

---

## Get Help

- 💬 **GitHub Discussions**: Community help
- 🐛 **GitHub Issues**: Bug reports
- 📧 **Email**: your-email@example.com
- 📚 **Docs**: All guides in repository

---

**Print this reference** or bookmark for quick access!

**Last Updated**: October 4, 2026  
**Version**: 1.0.0
