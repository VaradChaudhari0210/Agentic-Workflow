# Troubleshooting Guide

**Quick Links**: [Common Issues](#common-issues) | [Error Messages](#error-messages) | [Performance](#performance) | [Configuration](#configuration) | [Getting Help](#getting-help)

---

## Common Issues

### Installation Problems

#### "Cannot find module" errors after install

**Problem**: Dependencies not installed correctly

**Solution**:
```bash
# Clear everything and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

**Why it happens**: Package lock file out of sync with package.json

---

#### "Permission denied" on Windows

**Problem**: PowerShell execution policy blocking scripts

**Solution**:
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass
powershell -ExecutionPolicy Bypass -File script.ps1
```

---

#### Build fails with TypeScript errors

**Problem**: TypeScript version mismatch or missing types

**Solution**:
```bash
# Clear build cache
rm -rf dist/
npm run build

# If still failing, reinstall dependencies
npm ci
npm run build
```

**Check**: Ensure Node.js version >= 18
```bash
node --version
```

---

### Configuration Issues

#### "API key not found" error

**Problem**: Anthropic API key not configured

**Solution**:
```bash
# Set API key interactively
backend-agent config --set

# Or set directly
backend-agent config --set anthropic.apiKey YOUR_KEY_HERE

# Verify it's set
backend-agent config --show
```

**Location**: Config stored at `~/.backend-agent/config.json`

---

#### "Invalid API key" error

**Problem**: API key is incorrect or expired

**Solution**:
1. Get new API key from https://console.anthropic.com/
2. Update config:
   ```bash
   backend-agent config --set anthropic.apiKey NEW_KEY_HERE
   ```

**Test it**:
```bash
backend-agent health
```

---

#### Config file corrupted

**Problem**: JSON parse error when loading config

**Solution**:
```bash
# Reset config to defaults
rm ~/.backend-agent/config.json
backend-agent config --set

# Or manually edit
notepad ~/.backend-agent/config.json  # Windows
nano ~/.backend-agent/config.json     # Linux/Mac
```

---

### Analysis Command Issues

#### "No coverage file found"

**Problem**: Coverage analysis but no coverage data generated

**Solution**:
```bash
# Generate coverage first
npm test -- --coverage

# Or with vitest
npm test -- --run --coverage

# Then analyze
backend-agent analyze coverage
```

**Expected location**: `coverage/coverage-final.json`

---

#### "No package.json found"

**Problem**: Running analyzer outside project directory

**Solution**:
```bash
# Navigate to project root
cd /path/to/your/project

# Or specify path explicitly
backend-agent analyze deps --repo /path/to/your/project
```

---

#### Security scan shows too many false positives

**Problem**: Pattern-based detection has false positives

**Solution**:
```bash
# Use higher severity threshold
backend-agent analyze security --min-severity high

# Or critical only
backend-agent analyze security --min-severity critical
```

**Note**: Medium confidence issues are marked with `[Medium Confidence]` label

---

#### Performance analysis takes too long

**Problem**: Large codebase with many files

**Solution**:
```bash
# Use .gitignore patterns to exclude files
# Already excludes node_modules, dist, build by default

# Or analyze specific directory
backend-agent analyze performance --repo ./src
```

**Tip**: Analyzers automatically skip test files

---

### Task Execution Issues

#### Task fails with "command not found"

**Problem**: CLI not properly installed globally

**Solution**:
```bash
# Link package globally
npm link

# Or install globally
npm install -g backend-engineer-agent

# Verify
backend-agent --version
```

---

#### "Git repository not initialized"

**Problem**: Running in non-git directory

**Solution**:
```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Then run task
backend-agent task "Your task description"
```

---

#### Task creates branch but no code changes

**Problem**: Task description too vague or LLM couldn't determine actions

**Solution**:
```bash
# Be more specific
# Bad:  "Add feature"
# Good: "Add GET /api/users/:id endpoint with error handling"

# Check logs for details
backend-agent logs --level error --lines 50
```

---

### Build & Test Issues

#### TypeScript compilation errors

**Problem**: Type mismatch or missing imports

**Solution**:
```bash
# Check which files have errors
npm run build

# Common fixes:
# 1. Add missing imports
import { Type } from './types/index.js';

# 2. Use .js extension for imports (ES modules)
import { tool } from './tools/filesystem.js';  // Not .ts!

# 3. Check tsconfig.json module resolution
```

---

#### Tests failing after changes

**Problem**: Breaking changes to existing code

**Solution**:
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- src/path/to/test.test.ts

# Update snapshots if needed (if using snapshot testing)
npm test -- -u
```

---

## Error Messages

### "EACCES: permission denied"

**Cause**: Trying to write to protected directory

**Solution**:
```bash
# Don't use sudo with npm
# Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Then reinstall
npm install -g backend-engineer-agent
```

---

### "ENOENT: no such file or directory"

**Cause**: File or directory doesn't exist

**Solution**:
1. Check the path is correct
2. Create missing directories:
   ```bash
   mkdir -p path/to/directory
   ```
3. Check working directory:
   ```bash
   pwd  # Print working directory
   ```

---

### "Module not found: Error: Can't resolve"

**Cause**: Import path is wrong or module not installed

**Solution**:
```bash
# For imports: Use .js extension
import { x } from './file.js';  // Not ./file or ./file.ts

# For modules: Install dependency
npm install missing-package

# Rebuild
npm run build
```

---

### "Maximum call stack size exceeded"

**Cause**: Infinite recursion or circular dependency

**Solution**:
1. Check for circular imports
2. Look at stack trace for repeating function calls
3. If in analyzers, check if excluding source files:
   ```typescript
   excludePatterns: ['**/analyzers/**']
   ```

---

### "Out of memory" errors

**Cause**: Analyzing very large codebase

**Solution**:
```bash
# Increase Node memory limit
node --max-old-space-size=4096 dist/index.js analyze ...

# Or add to package.json scripts:
"analyze": "node --max-old-space-size=4096 dist/index.js"
```

---

### "Rate limit exceeded" (Anthropic API)

**Cause**: Too many API calls too quickly

**Solution**:
1. Wait a few minutes
2. Check your Anthropic API tier limits
3. Implement delays between calls (already built-in for most operations)

**Retry**: Agent has automatic retry with exponential backoff

---

### "Invalid format" or "Invalid severity"

**Cause**: Wrong command-line argument value

**Solution**:
```bash
# Check help for valid options
backend-agent analyze arch --help

# Valid formats: markdown, json, html
backend-agent analyze arch --format markdown

# Valid severities: low, medium, high, critical  
backend-agent analyze security --min-severity high
```

---

## Performance Issues

### Analysis takes too long

**Symptoms**: Commands take several minutes to complete

**Solutions**:

1. **Exclude unnecessary files**:
   ```bash
   # Add to .gitignore
   echo "coverage/" >> .gitignore
   echo "*.log" >> .gitignore
   ```

2. **Use specific directories**:
   ```bash
   # Analyze only src/ directory
   backend-agent analyze performance --repo ./src
   ```

3. **Increase severity threshold**:
   ```bash
   # Skip low severity issues (faster)
   backend-agent analyze security --min-severity high
   ```

4. **Check system resources**:
   ```bash
   # Monitor during execution
   # Linux/Mac:
   top
   # Windows:
   Task Manager
   ```

---

### High memory usage

**Symptoms**: Process using >2GB RAM

**Solutions**:

1. **Process files in batches** (already implemented)
2. **Exclude large generated files**:
   ```javascript
   // Already excluded: node_modules, dist, build, coverage
   // Add more in analyzer options
   ```

3. **Close other applications** during large analysis

4. **Use streaming for large files** (already implemented for logs)

---

### Slow startup time

**Symptoms**: Takes >5 seconds to show first output

**Causes**:
- Large number of dependencies
- Slow disk I/O
- Network requests

**Solutions**:
1. Use SSD instead of HDD
2. Disable antivirus scanning for node_modules (temporarily)
3. Keep dependencies updated

---

## Configuration Issues

### Can't find config file

**Problem**: Config not loading or saving

**Solution**:
```bash
# Check config location
backend-agent config --show

# Expected location:
# Windows: C:\Users\USERNAME\.backend-agent\config.json
# Mac/Linux: ~/.backend-agent/config.json

# Manually create if missing
mkdir -p ~/.backend-agent
echo '{"anthropic":{"apiKey":"YOUR_KEY"}}' > ~/.backend-agent/config.json
```

---

### Config not updating

**Problem**: Changes don't persist

**Solution**:
```bash
# Check file permissions
# Linux/Mac:
ls -la ~/.backend-agent/config.json
chmod 644 ~/.backend-agent/config.json

# Windows: Check file is not read-only in Properties
```

---

### Want to use different config location

**Solution**:
```bash
# Set environment variable
export BACKEND_AGENT_CONFIG=/path/to/config.json

# Windows PowerShell:
$env:BACKEND_AGENT_CONFIG = "C:\path\to\config.json"

# Or pass as CLI option (if implemented):
backend-agent --config /path/to/config.json analyze ...
```

---

## Platform-Specific Issues

### Windows

#### PowerShell execution policy

**Problem**: Scripts won't run

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Path issues with backslashes

**Problem**: Path errors in git commands

**Solution**: Use forward slashes or double backslashes
```javascript
// Good
"C:/Projects/my-app"
// Or
"C:\\Projects\\my-app"
```

#### CRLF vs LF line endings

**Problem**: Git warnings about line endings

**Solution**:
```bash
git config --global core.autocrlf true
```

---

### Mac/Linux

#### Permission errors

**Problem**: EACCES errors

**Solution**:
```bash
# Never use sudo with npm
# Fix npm permissions instead:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

#### Bash vs Zsh

**Problem**: Environment variables not persisting

**Solution**:
```bash
# Zsh users: Edit ~/.zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Bash users: Edit ~/.bashrc or ~/.bash_profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide** ✅
2. **Check the logs**:
   ```bash
   backend-agent logs --level error --lines 100
   ```
3. **Check the documentation**:
   - [README.md](./README.md) - Complete guide
   - [QUICKSTART.md](./QUICKSTART.md) - Getting started
   - [EXAMPLES.md](./EXAMPLES.md) - Usage examples
   - [FAQ.md](./FAQ.md) - Frequently asked questions

4. **Try with verbose logging**:
   ```bash
   export LOG_LEVEL=debug
   backend-agent analyze security
   ```

5. **Check GitHub issues**: Someone may have had the same problem

---

### How to Report an Issue

When reporting a bug, include:

1. **Environment**:
   ```bash
   node --version
   npm --version
   backend-agent --version
   # Operating system and version
   ```

2. **Command run**:
   ```bash
   backend-agent analyze security --min-severity high
   ```

3. **Full error message**:
   ```
   Copy the complete error output
   ```

4. **Steps to reproduce**:
   - Step 1
   - Step 2
   - Step 3

5. **Expected vs actual behavior**

6. **Relevant logs**:
   ```bash
   backend-agent logs --level error --lines 50
   ```

---

### Where to Get Help

1. **GitHub Issues**: https://github.com/YOUR-USERNAME/backend-engineer-agent/issues
2. **Discussions**: https://github.com/YOUR-USERNAME/backend-engineer-agent/discussions
3. **Stack Overflow**: Tag with `backend-engineer-agent`
4. **Email Support**: your-email@example.com

---

## Quick Diagnostic Commands

Run these to diagnose issues:

```bash
# 1. Check versions
node --version
npm --version
backend-agent --version

# 2. Check configuration
backend-agent config --show

# 3. Check health
backend-agent health

# 4. Check logs
backend-agent logs --level error

# 5. Test API connection
backend-agent analyze tech-stack

# 6. Verify build
npm run build

# 7. Run tests
npm test
```

---

## Advanced Debugging

### Enable debug logging

```bash
# Set environment variable
export LOG_LEVEL=debug
export DEBUG=backend-agent:*

# Windows PowerShell:
$env:LOG_LEVEL = "debug"

# Run command
backend-agent analyze security
```

### Inspect internal state

```bash
# Check what files are being analyzed
export LOG_LEVEL=debug
backend-agent analyze security | grep "Analyzing file"

# Check API calls
backend-agent analyze tech-stack | grep "API"
```

### Profile performance

```bash
# Time command execution
time backend-agent analyze performance

# Windows PowerShell:
Measure-Command { backend-agent analyze performance }
```

### Check memory usage

```bash
# Linux/Mac:
/usr/bin/time -v backend-agent analyze security

# Windows: Use Task Manager and look for node.exe
```

---

## Still Having Issues?

If this guide didn't help:

1. 💬 **Ask in Discussions**: https://github.com/YOUR-USERNAME/backend-engineer-agent/discussions
2. 🐛 **Report a Bug**: https://github.com/YOUR-USERNAME/backend-engineer-agent/issues/new
3. 📧 **Email**: your-email@example.com

**Include**:
- What you tried from this guide
- Your diagnostic command outputs
- Any error messages

We're here to help! 🚀

---

**Last Updated**: October 4, 2026  
**Version**: 1.0.0
