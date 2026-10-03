# PowerShell script to test the npm package locally before publishing
# Run this to verify the package works as expected

$ErrorActionPreference = "Stop"

Write-Host "Testing Backend Engineer Agent Package" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "Step 1: Building package..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful" -ForegroundColor Green
} else {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Run tests
Write-Host "Step 2: Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -eq 0) {
    Write-Host "Tests passed" -ForegroundColor Green
} else {
    Write-Host "Tests failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create tarball
Write-Host "Step 3: Creating package tarball..." -ForegroundColor Yellow
npm pack
if ($LASTEXITCODE -eq 0) {
    $tarball = Get-ChildItem -Filter "backend-engineer-agent-*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "Package created: $($tarball.Name)" -ForegroundColor Green
} else {
    Write-Host "Failed to create package" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Check package size
Write-Host "Step 4: Checking package details..." -ForegroundColor Yellow
$size = [math]::Round($tarball.Length / 1KB, 2)
Write-Host "  Package: $($tarball.Name)"
Write-Host "  Size: $size KB"
Write-Host ""

# Step 5: Test with npm link
Write-Host "Step 5: Testing with npm link..." -ForegroundColor Yellow
npm link
if ($LASTEXITCODE -eq 0) {
    Write-Host "Package linked globally" -ForegroundColor Green
} else {
    Write-Host "Failed to link package" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Test commands
Write-Host "Step 6: Testing commands..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Testing: backend-agent --version"
backend-agent --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "Version command works" -ForegroundColor Green
} else {
    Write-Host "Version command failed" -ForegroundColor Red
    npm unlink -g backend-engineer-agent
    exit 1
}
Write-Host ""

Write-Host "  Testing: backend-agent --help"
backend-agent --help | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Help command works" -ForegroundColor Green
} else {
    Write-Host "Help command failed" -ForegroundColor Red
    npm unlink -g backend-engineer-agent
    exit 1
}
Write-Host ""

Write-Host "  Testing: backend-agent config --show"
backend-agent config --show
if ($LASTEXITCODE -eq 0) {
    Write-Host "Config command works" -ForegroundColor Green
} else {
    Write-Host "Config command failed" -ForegroundColor Red
    npm unlink -g backend-engineer-agent
    exit 1
}
Write-Host ""

Write-Host "  Testing: be-agent --version (short alias)"
be-agent --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "Short alias works" -ForegroundColor Green
} else {
    Write-Host "Short alias failed" -ForegroundColor Red
    npm unlink -g backend-engineer-agent
    exit 1
}
Write-Host ""

# Step 7: Cleanup
Write-Host "Step 7: Cleaning up..." -ForegroundColor Yellow
npm unlink -g backend-engineer-agent
Write-Host "Package unlinked" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Package details:"
Write-Host "  - Tarball: $($tarball.Name)"
Write-Host "  - Size: $size KB"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the tarball contents"
Write-Host "  2. Test installation: npm install -g ./$($tarball.Name)"
Write-Host "  3. When ready: npm publish"
Write-Host ""
