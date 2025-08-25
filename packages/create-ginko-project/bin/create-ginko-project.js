#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASCII Art Banner
const banner = `
${chalk.cyan.bold('┌─────────────────────────────────────────────────────────────────┐')}
${chalk.cyan.bold('│                                                                 │')}
${chalk.cyan.bold('│')}  ${chalk.yellow.bold('🏔️  Ginko AI')}                                          ${chalk.cyan.bold('│')}
${chalk.cyan.bold('│')}     ${chalk.gray('Intelligent Context Management for Claude Code')}        ${chalk.cyan.bold('│')}
${chalk.cyan.bold('│                                                                 │')}
${chalk.cyan.bold('└─────────────────────────────────────────────────────────────────┘')}
`;

class GinkoInstaller {
  constructor() {
    this.projectName = '';
    this.projectPath = '';
    this.apiKey = '';
    this.dryRun = false;
    this.nonInteractive = false;
    this.template = 'basic';
    this.description = 'A project with Ginko AI context management';
  }

  parseCliArgs(args) {
    for (const arg of args) {
      if (arg.startsWith('--template=')) {
        this.template = arg.split('=')[1];
      } else if (arg.startsWith('--description=')) {
        this.description = arg.split('=')[1];
      } else if (arg.startsWith('--api-key=')) {
        this.apiKey = arg.split('=')[1];
      }
    }
    
    // Also check environment variables
    if (process.env.GINKO_API_KEY) {
      this.apiKey = process.env.GINKO_API_KEY;
    }
    if (process.env.GINKO_TEMPLATE) {
      this.template = process.env.GINKO_TEMPLATE;
    }
    if (process.env.GINKO_DESCRIPTION) {
      this.description = process.env.GINKO_DESCRIPTION;
    }
  }

  async run(args) {
    console.clear();
    console.log(banner);
    
    // Parse arguments
    this.projectName = args[0];
    this.dryRun = args.includes('--dry-run');
    this.nonInteractive = args.includes('--non-interactive') || process.env.CI || !process.stdin.isTTY;
    
    // Parse CLI arguments
    this.parseCliArgs(args);
    
    if (this.dryRun) {
      console.log(chalk.yellow('🧪 Running in dry-run mode\n'));
    }
    
    if (this.nonInteractive) {
      console.log(chalk.yellow('🤖 Running in non-interactive mode\n'));
    }

    try {
      await this.validateArgs();
      await this.gatherProjectInfo();
      await this.createProject();
      await this.configureGinko();
      await this.testConnection();
      await this.showSuccessMessage();
    } catch (error) {
      console.error(chalk.red('\n❌ Installation failed:'), error.message);
      process.exit(1);
    }
  }

  async validateArgs() {
    if (!this.projectName) {
      console.log(chalk.red('❌ Project name is required\n'));
      console.log(chalk.gray('Usage: npx create-ginko-project <project-name>\n'));
      console.log(chalk.gray('Example: npx create-ginko-project my-ai-project'));
      process.exit(1);
    }

    if (fs.existsSync(this.projectName)) {
      console.log(chalk.red(`❌ Directory '${this.projectName}' already exists\n`));
      process.exit(1);
    }

    this.projectPath = path.resolve(this.projectName);
  }

  async gatherProjectInfo() {
    console.log(chalk.blue.bold('\n📋 Project Setup\n'));
    
    if (this.nonInteractive) {
      console.log(chalk.gray(`   Description: ${this.description}`));
      console.log(chalk.gray(`   Template: ${this.template}\n`));
      return;
    }
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: this.description
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose a project template:',
        choices: [
          { name: '📁 Basic Project (just Ginko setup)', value: 'basic' },
          { name: '⚛️  React Project (with Ginko)', value: 'react' },
          { name: '🟢 Node.js Project (with Ginko)', value: 'node' },
          { name: '📦 Library Project (with Ginko)', value: 'library' }
        ],
        default: this.template
      }
    ]);

    this.template = answers.template;
    this.description = answers.description;
  }

  async createProject() {
    const spinner = ora('Creating project structure...').start();
    
    try {
      if (!this.dryRun) {
        // Create project directory
        await fs.ensureDir(this.projectPath);
        
        // Create basic structure
        await this.createBasicStructure();
        
        // Create template-specific files
        await this.createTemplateFiles();
      }
      
      spinner.succeed('Project structure created');
    } catch (error) {
      spinner.fail('Failed to create project structure');
      throw error;
    }
  }

  async createBasicStructure() {
    const packageJson = {
      name: this.projectName,
      version: '1.0.0',
      description: this.description,
      private: true,
      scripts: {
        dev: 'echo "Development server not configured yet"',
        build: 'echo "Build script not configured yet"',
        test: 'echo "Tests not configured yet"'
      },
      keywords: ['ginko', 'ai', 'context-management'],
      author: '',
      license: 'MIT'
    };

    await fs.writeJSON(path.join(this.projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    // Create README
    const readme = `# ${this.projectName}

${this.description}

## 🏔️ Ginko AI Integration

This project is configured with Ginko AI for intelligent context management in Claude Code.

### Getting Started

1. Make sure you have Claude Code installed
2. Open this project in Claude Code
3. Your Ginko context will be automatically loaded

### Available Commands

\`\`\`bash
# Capture current session
capture_session

# List available sessions  
list_sessions

# Resume a previous session
resume_session <session-id>

# Get best practices for your project
get_best_practices
\`\`\`

### Learn More

- [Ginko Documentation](https://ginko.ai/docs)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)

---

🤖 Generated with Ginko AI
`;

    await fs.writeFile(path.join(this.projectPath, 'README.md'), readme);
    await fs.writeFile(path.join(this.projectPath, '.gitignore'), `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
`);
  }

  async createTemplateFiles() {
    switch (this.template) {
      case 'react':
        await this.createReactTemplate();
        break;
      case 'node':
        await this.createNodeTemplate();
        break;
      case 'library':
        await this.createLibraryTemplate();
        break;
      default:
        // Basic template - just the structure we already created
        break;
    }
  }

  async createReactTemplate() {
    // Add React dependencies to package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    
    packageJson.dependencies = {
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    };
    
    packageJson.devDependencies = {
      "@vitejs/plugin-react": "^4.2.1",
      "vite": "^5.1.0"
    };
    
    packageJson.scripts = {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    
    // Create basic React files
    await fs.ensureDir(path.join(this.projectPath, 'src'));
    await fs.writeFile(path.join(this.projectPath, 'src/App.jsx'), `import React from 'react';

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🏔️ Ginko AI Project</h1>
      <p>Your React project with intelligent context management</p>
      <p style={{ color: '#666' }}>
        Open Claude Code to start using Ginko AI features
      </p>
    </div>
  );
}

export default App;
`);

    await fs.writeFile(path.join(this.projectPath, 'src/main.jsx'), `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);

    await fs.writeFile(path.join(this.projectPath, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);

    await fs.writeFile(path.join(this.projectPath, 'vite.config.js'), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`);
  }

  async createNodeTemplate() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    
    packageJson.type = "module";
    packageJson.main = "src/index.js";
    packageJson.scripts = {
      "dev": "node --watch src/index.js",
      "start": "node src/index.js",
      "test": "echo 'No tests specified'"
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    
    await fs.ensureDir(path.join(this.projectPath, 'src'));
    await fs.writeFile(path.join(this.projectPath, 'src/index.js'), `#!/usr/bin/env node

console.log('🏔️ Ginko AI Node.js Project');
console.log('Your Node.js project with intelligent context management');
console.log('');
console.log('Open Claude Code to start using Ginko AI features:');
console.log('- capture_session');
console.log('- list_sessions'); 
console.log('- get_best_practices');

// Your application code here
function main() {
  console.log('\\n✅ Application started successfully');
}

main();
`);
  }

  async createLibraryTemplate() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    
    packageJson.type = "module";
    packageJson.main = "dist/index.js";
    packageJson.module = "src/index.js";
    packageJson.exports = {
      ".": {
        "import": "./src/index.js",
        "require": "./dist/index.cjs"
      }
    };
    packageJson.scripts = {
      "build": "echo 'Build script not configured'",
      "test": "echo 'Tests not configured'",
      "dev": "echo 'Development mode not configured'"
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    
    await fs.ensureDir(path.join(this.projectPath, 'src'));
    await fs.writeFile(path.join(this.projectPath, 'src/index.js'), `/**
 * ${this.projectName}
 * ${this.description}
 * 
 * Built with Ginko AI context management
 */

export function hello() {
  return '🏔️ Hello from Ginko AI!';
}

export default {
  hello
};
`);
  }

  async configureGinko() {
    console.log(chalk.blue.bold('\n🔧 Ginko Configuration\n'));
    
    if (this.nonInteractive) {
      if (!this.apiKey) {
        console.log(chalk.red('❌ API key is required in non-interactive mode'));
        console.log(chalk.gray('   Use --api-key=your_key or set GINKO_API_KEY environment variable\n'));
        process.exit(1);
      }
      
      // Validate API key format
      if (!this.apiKey.startsWith('cmcp_') || this.apiKey.length < 20) {
        console.log(chalk.red('❌ Invalid API key format'));
        console.log(chalk.gray('   API key should start with "cmcp_" and be at least 20 characters\n'));
        process.exit(1);
      }
      
      console.log(chalk.gray(`   Using API key: ${this.apiKey.substring(0, 10)}...\n`));
    } else {
      // Guide user to dashboard
      console.log(chalk.yellow('📋 Step 1: Create your Ginko account'));
      console.log(chalk.gray('   Visit: https://app.ginko.ai/auth/login'));
      console.log(chalk.gray('   Sign up with your GitHub account\n'));
      
      // Wait for user confirmation
      const { hasAccount } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'hasAccount',
          message: 'Have you created your account and copied your API key?',
          default: false
        }
      ]);

      if (!hasAccount) {
        console.log(chalk.yellow('\n⏱️  Please complete the signup process first:'));
        console.log(chalk.gray('   1. Go to https://app.ginko.ai/auth/login'));
        console.log(chalk.gray('   2. Sign up with GitHub'));
        console.log(chalk.gray('   3. Copy your API key (starts with "cmcp_")'));
        console.log(chalk.gray('   4. Come back and run this installer again\n'));
        process.exit(0);
      }

      // Get API key
      const { apiKey } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your Ginko API key:',
          validate: (input) => {
            if (!input) return 'API key is required';
            if (!input.startsWith('cmcp_')) return 'API key should start with "cmcp_"';
            if (input.length < 20) return 'API key seems too short';
            return true;
          }
        }
      ]);

      this.apiKey = apiKey;
    }

    // Create MCP configuration
    if (!this.dryRun) {
      const mcpConfig = {
        mcpServers: {
          "ginko-context": {
            command: "npx",
            args: ["ginko-mcp-client"],
            env: {
              MCP_SERVER_URL: "https://mcp.ginko.ai",
              MCP_API_KEY: this.apiKey,
              NODE_ENV: "production"
            }
          }
        }
      };

      await fs.writeJSON(path.join(this.projectPath, '.mcp.json'), mcpConfig, { spaces: 2 });
    }

    console.log(chalk.green('✅ Ginko configuration created'));
  }

  async testConnection() {
    const spinner = ora('Testing Ginko connection...').start();
    
    try {
      if (this.dryRun) {
        // Simulate test in dry run mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        spinner.succeed('Connection test (simulated)');
        return;
      }

      // Test API connection
      const response = await fetch('https://mcp.ginko.ai/api/mcp/health', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        spinner.succeed('Ginko connection successful');
      } else {
        spinner.warn('Ginko connection test inconclusive (this is normal)');
        console.log(chalk.gray('   The connection will be fully tested when you open Claude Code'));
      }
    } catch (error) {
      spinner.warn('Unable to test connection (this is normal)');
      console.log(chalk.gray('   The connection will be tested when you open Claude Code'));
    }
  }

  async showSuccessMessage() {
    console.log(chalk.green.bold('\n🎉 Ginko project created successfully!\n'));
    
    console.log(chalk.blue.bold('📁 Project Details:'));
    console.log(chalk.gray(`   Name: ${this.projectName}`));
    console.log(chalk.gray(`   Template: ${this.template}`));
    console.log(chalk.gray(`   Location: ${this.projectPath}`));
    console.log(chalk.gray(`   MCP Config: .mcp.json`));
    
    console.log(chalk.blue.bold('\n🚀 Next Steps:'));
    console.log(chalk.white(`   cd ${this.projectName}`));
    console.log(chalk.white('   code .'));
    console.log(chalk.gray('   # Open in Claude Code\n'));
    
    console.log(chalk.blue.bold('🤖 Claude Code Commands:'));
    console.log(chalk.white('   capture_session      # Save your current context'));
    console.log(chalk.white('   list_sessions        # View saved sessions'));
    console.log(chalk.white('   get_best_practices   # Get AI-powered suggestions'));
    console.log(chalk.white('   resume_session <id>  # Continue previous work\n'));
    
    console.log(chalk.blue.bold('📚 Learn More:'));
    console.log(chalk.gray('   Documentation: https://ginko.ai/docs'));
    console.log(chalk.gray('   Dashboard: https://app.ginko.ai'));
    console.log(chalk.gray('   Support: https://github.com/ginko-ai/ginko/issues\n'));
    
    console.log(chalk.cyan('🏔️ Happy coding with Ginko AI!'));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const installer = new GinkoInstaller();
  await installer.run(args);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

main().catch(console.error);