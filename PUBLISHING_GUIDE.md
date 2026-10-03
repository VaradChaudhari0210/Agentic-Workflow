# Publishing Guide

This guide walks you through publishing the Backend Engineer Agent to npm.

## Prerequisites

### 1. npm Account
- Create account at https://www.npmjs.com/signup
- Verify your email

### 2. Package Name
- Check availability: https://www.npmjs.com/package/backend-engineer-agent
- If taken, update `name` in package.json to something unique:
  - `@your-username/backend-engineer-agent` (scoped, recommended)
  - `backend-eng-agent`
  - `be-engineer-agent`

### 3. Two-Factor Authentication (Recommended)
```bash
npm profile enable-2fa auth-and-writes
```

## Pre-Publishing Checklist

### ✅ Step 1: Update Package Info

Edit `package.json`:
```json
{
  "name": "backend-engineer-agent",  // or your chosen name
  "version": "1.0.0",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/backend-engineer-agent"
  },
  "bugs": {
    "url": "https://github.com/yourusername/backend-engineer-agent/issues"
  },
  "homepage": "https://github.com/yourusername/backend-engineer-agent#readme"
}
```

### ✅ Step 2: Update README

Choose one:
- **Option A:** Replace README.md with NPM_README.md content
- **Option B:** Keep current README and ensure it's npm-user-friendly

```bash
# Option A (recommended for npm)
cp NPM_README.md README.md
```

### ✅ Step 3: Run Tests

```powershell
# Windows
.\scripts\test-package.ps1

# Linux/Mac
bash scripts/test-package.sh
```

Should see:
```
✅ All tests passed!
```

### ✅ Step 4: Test Locally

```bash
# Build
npm run build

# Create package
npm pack

# Install locally
npm install -g ./backend-engineer-agent-1.0.0.tgz

# Test it
backend-agent --version
backend-agent config --show

# Test a real command (if you have API key)
backend-agent task "Add health check" --repo ./test-project

# Uninstall
npm uninstall -g backend-engineer-agent
```

### ✅ Step 5: Review Package Contents

```bash
# Create tarball
npm pack

# List contents (Windows)
tar -tzf backend-engineer-agent-1.0.0.tgz

# Or extract and review
mkdir package-review
tar -xzf backend-engineer-agent-1.0.0.tgz -C package-review
cd package-review/package
# Review dist/, README.md, etc.
```

**Verify includes:**
- ✓ dist/ folder with compiled JavaScript
- ✓ dist/index.js (entry point)
- ✓ README.md
- ✓ LICENSE
- ✓ package.json

**Verify excludes:**
- ✗ src/ folder (TypeScript source)
- ✗ node_modules/
- ✗ .env files
- ✗ Test files
- ✗ Development docs

## Publishing

### Step 1: Login to npm

```bash
npm login
# Enter: username, password, email, OTP (if 2FA enabled)
```

Verify:
```bash
npm whoami
# Should show your npm username
```

### Step 2: Publish

```bash
# For scoped package (@username/package)
npm publish --access public

# For unscoped package
npm publish
```

**First publish output:**
```
+ backend-engineer-agent@1.0.0
```

### Step 3: Verify

```bash
# Check on npm
npm view backend-engineer-agent

# Try installing
npx backend-engineer-agent@latest --version
```

Visit: https://www.npmjs.com/package/backend-engineer-agent

## Post-Publishing

### 1. Test with npx

```bash
# Clear cache first
npm cache clean --force

# Test fresh install
npx backend-engineer-agent@latest config --show
```

### 2. Update GitHub

```bash
# Create git tag
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release
# Go to: https://github.com/yourusername/backend-engineer-agent/releases/new
```

### 3. Announce

Update:
- GitHub README with npm install instructions
- Add npm badge: 
  ```markdown
  [![npm version](https://badge.fury.io/js/backend-engineer-agent.svg)](https://www.npmjs.com/package/backend-engineer-agent)
  ```

## Publishing Updates

### Version Bumps

```bash
# Patch (1.0.0 → 1.0.1) - bug fixes
npm version patch

# Minor (1.0.0 → 1.1.0) - new features
npm version minor

# Major (1.0.0 → 2.0.0) - breaking changes
npm version major
```

This automatically:
- Updates package.json version
- Creates git commit
- Creates git tag

### Publish Update

```bash
# Push version bump
git push origin main --follow-tags

# Publish to npm
npm publish
```

## Troubleshooting

### "Package name already exists"

Solution: Use scoped package name
```json
{
  "name": "@your-username/backend-engineer-agent"
}
```

Then publish with:
```bash
npm publish --access public
```

### "Must be logged in"

```bash
npm logout
npm login
```

### "402 Payment Required"

You hit the private package limit. Either:
- Use `--access public` flag
- Or upgrade npm account

### "Version already published"

Bump version:
```bash
npm version patch
npm publish
```

### "No README"

Ensure README.md exists in root:
```bash
ls README.md  # Should exist
```

## Unpublishing (Emergency Only)

⚠️ **Warning:** Unpublish within 72 hours only, then it's permanent

```bash
# Unpublish specific version
npm unpublish backend-engineer-agent@1.0.0

# Unpublish entire package (within 72 hours)
npm unpublish backend-engineer-agent --force
```

## Best Practices

### Before Publishing

1. ✅ Run full test suite
2. ✅ Test with `npm link`
3. ✅ Test with `npm pack` + local install
4. ✅ Review tarball contents
5. ✅ Update CHANGELOG.md
6. ✅ Update version number
7. ✅ Commit all changes

### When Publishing

1. ✅ Use semantic versioning
2. ✅ Tag releases in git
3. ✅ Test with npx immediately after
4. ✅ Create GitHub release notes

### After Publishing

1. ✅ Test installation on clean machine
2. ✅ Monitor for issues
3. ✅ Respond to npm feedback

## Quick Reference

```bash
# Login
npm login

# Test package locally
.\scripts\test-package.ps1

# Publish (first time)
npm publish --access public

# Publish update
npm version patch  # or minor, major
npm publish

# View package info
npm view backend-engineer-agent

# Test installation
npx backend-engineer-agent@latest --version
```

## Support

- npm CLI docs: https://docs.npmjs.com/cli/
- Publishing guide: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
- Semantic versioning: https://semver.org/

---

**Ready to publish?**

1. Complete pre-publishing checklist
2. Run `npm login`
3. Run `npm publish --access public`
4. Test with `npx backend-engineer-agent@latest --version`
5. 🎉 Celebrate!
