#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASCII Art Banner
const banner = `
${chalk.cyan.bold('┌─────────────────────────────────────────────────────────────────┐')}
${chalk.cyan.bold('│')}  ${chalk.yellow.bold('🏔️  Ginko AI')}                                                   ${chalk.cyan.bold('│')}
${chalk.cyan.bold('│')}     ${chalk.gray('Intelligent Context Management for Claude Code')}             ${chalk.cyan.bold('│')}
${chalk.cyan.bold('└─────────────────────────────────────────────────────────────────┘')}
`;

class GinkoInstaller {
  constructor() {
    this.projectName = '';
    this.projectPath = '';
    this.template = 'basic';
    this.description = 'A project with Ginko AI context management';
    this.nonInteractive = false;
    this.dryRun = false;
  }

  parseCliArgs(args) {
    for (const arg of args) {
      if (arg.startsWith('--template=')) {
        this.template = arg.split('=')[1];
      } else if (arg.startsWith('--description=')) {
        this.description = arg.split('=')[1];
      }
    }

    // Also check environment variables
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

    try {
      await this.validateArgs();
      await this.checkPrerequisites();
      await this.gatherProjectInfo();
      await this.createProject();
      await this.initializeGit();
      await this.initializeGinko();
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

  async checkPrerequisites() {
    const spinner = ora('Checking prerequisites...').start();

    // Check for git
    try {
      execSync('git --version', { stdio: 'pipe' });
    } catch {
      spinner.fail('Git is not installed');
      console.log(chalk.yellow('\nPlease install Git: https://git-scm.com/downloads'));
      process.exit(1);
    }

    // Check for ginko CLI
    try {
      execSync('ginko --version', { stdio: 'pipe' });
    } catch {
      spinner.fail('Ginko CLI is not installed');
      console.log(chalk.yellow('\nPlease install Ginko CLI:'));
      console.log(chalk.gray('  npm install -g @ginkoai/cli'));
      process.exit(1);
    }

    // Check for ginko authentication
    try {
      const result = execSync('ginko whoami 2>&1', { encoding: 'utf8', stdio: 'pipe' });
      if (result.includes('Not authenticated') || result.includes('not authenticated')) {
        throw new Error('Not authenticated');
      }
      spinner.succeed('Prerequisites verified');
    } catch {
      spinner.warn('Not logged in to Ginko');
      console.log(chalk.yellow('\nPlease authenticate first:'));
      console.log(chalk.white('  ginko login\n'));

      if (this.nonInteractive) {
        process.exit(1);
      }

      const { shouldLogin } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldLogin',
          message: 'Would you like to login now?',
          default: true
        }
      ]);

      if (shouldLogin) {
        console.log(chalk.blue('\nStarting ginko login...\n'));
        try {
          execSync('ginko login', { stdio: 'inherit' });
          console.log(''); // Add spacing after login
        } catch {
          console.log(chalk.red('\nLogin failed. Please try again with: ginko login'));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('\nPlease run "ginko login" before creating a project.'));
        process.exit(0);
      }
    }
  }

  async gatherProjectInfo() {
    console.log(chalk.blue.bold('\n📋 Project Setup\n'));

    if (this.nonInteractive) {
      console.log(chalk.gray(`   Name: ${this.projectName}`));
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

## Getting Started

This project uses [Ginko AI](https://ginkoai.com) for intelligent context management with Claude Code.

\`\`\`bash
# Start a session
ginko start

# Do your work with Claude Code...

# Save context before switching tasks
ginko handoff
\`\`\`

## Ginko Commands

| Command | Description |
|---------|-------------|
| \`ginko start\` | Begin a session with context loading |
| \`ginko handoff\` | Save progress for seamless continuation |
| \`ginko vibecheck\` | Quick realignment when stuck |
| \`ginko status\` | Check current session status |

## Learn More

- [Ginko Documentation](https://ginkoai.com/docs)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
`;

    await fs.writeFile(path.join(this.projectPath, 'README.md'), readme);

    // Create basic .gitignore (ginko init will append to this)
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

    await fs.ensureDir(path.join(this.projectPath, 'src'));
    await fs.writeFile(path.join(this.projectPath, 'src/App.jsx'), `import React from 'react';

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🏔️ ${this.projectName}</h1>
      <p>${this.description}</p>
      <p style={{ color: '#666' }}>
        Run <code>ginko start</code> to begin your session
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

console.log('🏔️ ${this.projectName}');
console.log('${this.description}');
console.log('');
console.log('Run "ginko start" to begin your session');

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
 */

export function hello() {
  return '🏔️ Hello from ${this.projectName}!';
}

export default {
  hello
};
`);
  }

  async initializeGit() {
    const spinner = ora('Initializing git repository...').start();

    try {
      if (!this.dryRun) {
        execSync('git init', { cwd: this.projectPath, stdio: 'pipe' });
      }
      spinner.succeed('Git repository initialized');
    } catch (error) {
      spinner.fail('Failed to initialize git');
      throw error;
    }
  }

  async initializeGinko() {
    const spinner = ora('Initializing Ginko...').start();

    try {
      if (!this.dryRun) {
        // Run ginko init in the project directory
        execSync('ginko init', {
          cwd: this.projectPath,
          stdio: 'pipe',
          env: { ...process.env, FORCE_COLOR: '0' }
        });
      }
      spinner.succeed('Ginko initialized');
    } catch (error) {
      spinner.warn('Ginko initialization had issues');
      console.log(chalk.dim(`  You can run "ginko init" manually in the project directory`));
    }
  }

  async showSuccessMessage() {
    console.log(chalk.green.bold('\n🎉 Project created successfully!\n'));

    console.log(chalk.blue.bold('📁 Project Details:'));
    console.log(chalk.gray(`   Name: ${this.projectName}`));
    console.log(chalk.gray(`   Template: ${this.template}`));
    console.log(chalk.gray(`   Location: ${this.projectPath}`));

    console.log(chalk.blue.bold('\n🚀 Next Steps:'));
    console.log(chalk.white(`   cd ${this.projectName}`));
    console.log(chalk.white('   claude                    # Open Claude Code'));
    console.log(chalk.white('   ginko start               # Begin your session'));

    console.log(chalk.blue.bold('\n📚 Ginko Commands:'));
    console.log(chalk.gray('   ginko start      Begin session with context'));
    console.log(chalk.gray('   ginko handoff    Save progress before switching'));
    console.log(chalk.gray('   ginko vibecheck  Quick realignment when stuck'));
    console.log(chalk.gray('   ginko status     Check current session\n'));

    console.log(chalk.cyan('🏔️ Happy coding with Ginko AI!'));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const installer = new GinkoInstaller();
  await installer.run(args);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

main().catch(console.error);
