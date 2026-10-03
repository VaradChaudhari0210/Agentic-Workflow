#!/usr/bin/env node

/**
 * Post-install script
 * Shows helpful information after package installation
 */

const isGlobalInstall = process.env.npm_config_global === 'true';
const isNpx = process.env.npm_execpath?.includes('npx');

// Only show message for global installs, not npx or local installs
if (isGlobalInstall) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✨ Backend Engineer Agent installed successfully!        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

🚀 Quick Start:

  1. Set your API key:
     backend-agent config --set-api-key sk-ant-...

  2. Run your first task:
     backend-agent task "Add health check endpoint"

📖 Documentation:
   https://github.com/yourusername/backend-engineer-agent

💡 Need help?
   backend-agent --help
`);
}
