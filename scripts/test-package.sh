#!/bin/bash

# Script to test the npm package locally before publishing
# Run this to verify the package works as expected

set -e

echo "🧪 Testing Backend Engineer Agent Package"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build
echo "📦 Step 1: Building package..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Run tests
echo "🧪 Step 2: Running tests..."
npm test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi
echo ""

# Step 3: Create tarball
echo "📦 Step 3: Creating package tarball..."
npm pack
if [ $? -eq 0 ]; then
    TARBALL=$(ls -t backend-engineer-agent-*.tgz | head -1)
    echo -e "${GREEN}✓ Package created: $TARBALL${NC}"
else
    echo -e "${RED}✗ Failed to create package${NC}"
    exit 1
fi
echo ""

# Step 4: Check package contents
echo "📋 Step 4: Checking package contents..."
tar -tzf "$TARBALL" | head -20
echo "..."
echo ""

# Step 5: Test with npm link
echo "🔗 Step 5: Testing with npm link..."
npm link
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Package linked globally${NC}"
else
    echo -e "${RED}✗ Failed to link package${NC}"
    exit 1
fi
echo ""

# Step 6: Test commands
echo "🎯 Step 6: Testing commands..."
echo ""

echo "  Testing: backend-agent --version"
backend-agent --version
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Version command works${NC}"
else
    echo -e "${RED}✗ Version command failed${NC}"
    npm unlink -g backend-engineer-agent
    exit 1
fi
echo ""

echo "  Testing: backend-agent --help"
backend-agent --help > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Help command works${NC}"
else
    echo -e "${RED}✗ Help command failed${NC}"
    npm unlink -g backend-engineer-agent
    exit 1
fi
echo ""

echo "  Testing: backend-agent config --show"
backend-agent config --show
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Config command works${NC}"
else
    echo -e "${RED}✗ Config command failed${NC}"
    npm unlink -g backend-engineer-agent
    exit 1
fi
echo ""

# Step 7: Cleanup
echo "🧹 Step 7: Cleaning up..."
npm unlink -g backend-engineer-agent
echo -e "${GREEN}✓ Package unlinked${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Package details:"
echo "  - Tarball: $TARBALL"
echo "  - Size: $(du -h $TARBALL | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Review the tarball contents"
echo "  2. Test installation: npm install -g ./$TARBALL"
echo "  3. When ready: npm publish"
echo ""
