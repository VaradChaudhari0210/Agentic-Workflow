# Pre-Flight Checklist

Complete this checklist before publishing to npm.

## ✅ Phase 1: Environment Setup

- [ ] Node.js 18+ installed
  ```powershell
  node --version  # Should be 18.x or higher
  ```

- [ ] npm account created
  - Visit: https://www.npmjs.com/signup
  - Verify email

- [ ] Git repository clean
  ```powershell
  git status  # Should be clean
  ```

## ✅ Phase 2: Package Information

- [ ] Update `package.json` with your information:
  ```json
  {
    "name": "backend-engineer-agent",  // Check if available!
    "author": "Your Name <your.email@example.com>",
    "repository": {
      "url": "https://github.com/YOUR-USERNAME/backend-engineer-agent"
    },
    "bugs": {
      "url": "https://github.com/YOUR-USERNAME/backend-engineer-agent/issues"
    },
    "homepage": "https://github.com/YOUR-USERNAME/backend-engineer-agent#readme"
  }
  ```

- [ ] Check if package name is available:
  ```powershell
  npm view backend-engineer-agent
  # If exists, choose different name or use scoped: @your-username/backend-engineer-agent
  ```

- [ ] Decide on README:
  - [ ] Option A: Use NPM_README.md (recommended for npm)
    ```powershell
    Copy-Item NPM_README.md README.md -Force
    ```
  - [ ] Option B: Keep current README (developer-focused)

## ✅ Phase 3: Code Verification

- [ ] Install dependencies:
  ```powershell
  npm install
  ```

- [ ] Build successfully:
  ```powershell
  npm run build
  # Should create dist/ folder
  Test-Path dist\index.js  # Should return True
  ```

- [ ] All tests pass:
  ```powershell
  npm test
  # Should show 12/12 tests passing
  ```

- [ ] Test locally with npm link:
  ```powershell
  npm link
  backend-agent --version
  backend-agent --help
  backend-agent config --show
  npm unlink -g backend-engineer-agent
  ```

## ✅ Phase 4: Package Testing

- [ ] Run automated tests:
  ```powershell
  .\scripts\test-package.ps1
  # Should end with "✅ All tests passed!"
  ```

- [ ] Create and inspect package:
  ```powershell
  npm pack
  # Creates backend-engineer-agent-1.0.0.tgz
  
  # Check size (should be < 1MB)
  Get-Item backend-engineer-agent-*.tgz | Select-Object Name, @{N='Size (KB)';E={[math]::Round($_.Length/1KB,2)}}
  ```

- [ ] Verify package contents:
  ```powershell
  tar -tzf backend-engineer-agent-1.0.0.tgz | Select-String "dist|README|LICENSE|package.json"
  # Should show dist/, README.md, LICENSE, package.json
  ```

- [ ] Install from tarball and test:
  ```powershell
  npm install -g .\backend-engineer-agent-1.0.0.tgz
  backend-agent --version
  backend-agent config --path
  npm uninstall -g backend-engineer-agent
  ```

## ✅ Phase 5: Documentation

- [ ] README is user-friendly (npm-focused)
- [ ] LICENSE file exists (MIT)
- [ ] QUICKSTART.md exists
- [ ] EXAMPLES.md exists
- [ ] All GitHub URLs updated to your repository

## ✅ Phase 6: Git Preparation

- [ ] Commit all changes:
  ```powershell
  git add .
  git commit -m "Prepare for npm publication"
  ```

- [ ] Push to GitHub:
  ```powershell
  git push origin main
  ```

- [ ] Create git tag:
  ```powershell
  git tag v1.0.0
  git push origin v1.0.0
  ```

## ✅ Phase 7: npm Preparation

- [ ] Login to npm:
  ```powershell
  npm login
  # Enter username, password, email, OTP (if 2FA enabled)
  ```

- [ ] Verify login:
  ```powershell
  npm whoami
  # Should show your npm username
  ```

## ✅ Phase 8: Final Verification

Before publishing, verify one more time:

- [ ] Package name is correct and available
- [ ] Version is 1.0.0
- [ ] Author information is correct
- [ ] Repository URLs are correct
- [ ] README is appropriate for npm users
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Package size is reasonable (< 1MB)

## ✅ Phase 9: Publish

When all above are complete:

```powershell
# Dry run first (optional - see what would be published)
npm publish --dry-run

# Actual publish
npm publish --access public
```

Expected output:
```
+ backend-engineer-agent@1.0.0
```

## ✅ Phase 10: Post-Publish Verification

- [ ] Check npm page:
  - Visit: https://www.npmjs.com/package/backend-engineer-agent
  - Verify README displays correctly
  - Check package metadata

- [ ] Test with npx:
  ```powershell
  npx backend-engineer-agent@latest --version
  npx backend-engineer-agent@latest config --show
  ```

- [ ] Test installation:
  ```powershell
  npm install -g backend-engineer-agent@latest
  backend-agent --version
  npm uninstall -g backend-engineer-agent
  ```

- [ ] Create GitHub release:
  - Go to: https://github.com/YOUR-USERNAME/backend-engineer-agent/releases/new
  - Tag: v1.0.0
  - Title: v1.0.0 - Initial Release
  - Description: Add release notes

## ✅ Phase 11: Announcement

- [ ] Update GitHub README with npm badge:
  ```markdown
  [![npm version](https://badge.fury.io/js/backend-engineer-agent.svg)](https://www.npmjs.com/package/backend-engineer-agent)
  [![Downloads](https://img.shields.io/npm/dm/backend-engineer-agent.svg)](https://www.npmjs.com/package/backend-engineer-agent)
  ```

- [ ] Update GitHub README with installation instructions:
  ```markdown
  ## Installation
  
  \`\`\`bash
  npm install -g backend-engineer-agent
  \`\`\`
  ```

- [ ] Optional: Share on social media, dev.to, Reddit, etc.

## Troubleshooting

### "Package name already exists"
```powershell
# Use scoped package
# Update package.json name to: "@your-username/backend-engineer-agent"
npm publish --access public
```

### "Must be logged in"
```powershell
npm logout
npm login
```

### "Tests failing"
```powershell
# Check specific errors
npm test

# Usually due to missing dependencies
npm install
npm test
```

### "Build failing"
```powershell
# Clean and rebuild
Remove-Item -Recurse -Force dist
npm run build
```

### "Package too large"
```powershell
# Check .npmignore is excluding properly
npm pack
Get-Item backend-engineer-agent-*.tgz | Select-Object Length

# Should be < 1MB (typically 500KB)
```

## Quick Command Reference

```powershell
# Complete test sequence
npm install
npm test
npm run build
.\scripts\test-package.ps1
npm login
npm publish --access public

# Verify published
npx backend-engineer-agent@latest --version

# Update after changes
npm version patch  # 1.0.0 → 1.0.1
npm publish
git push origin main --follow-tags
```

---

## Ready to Publish?

When all checkboxes are checked above:

1. Take a deep breath 😊
2. Run: `npm publish --access public`
3. Verify on npm
4. Test with npx
5. 🎉 Celebrate!

**Your package will be live at:**
- npm: https://www.npmjs.com/package/backend-engineer-agent
- npx: `npx backend-engineer-agent task "..."`

Good luck! 🚀
