/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-28
 * @tags: [cli, create, project, scaffolding]
 * @related: [init.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, fs-extra, ora, inquirer]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import prompts from 'prompts';
import { getCurrentUser } from '../utils/auth-storage.js';
import { initCommand } from './init.js';

interface CreateOptions {
  template?: string;
  description?: string;
  nonInteractive?: boolean;
}

export async function createCommand(projectName: string | undefined, options: CreateOptions = {}) {
  console.log(chalk.cyan.bold('\n🏔️  Ginko AI - Create Project\n'));

  // Validate project name
  if (!projectName) {
    console.log(chalk.red('❌ Project name is required\n'));
    console.log(chalk.gray('Usage: ginko create <project-name>\n'));
    console.log(chalk.gray('Example: ginko create my-ai-project'));
    process.exit(1);
  }

  const projectPath = path.resolve(projectName);

  if (fs.existsSync(projectPath)) {
    console.log(chalk.red(`❌ Directory '${projectName}' already exists\n`));
    process.exit(1);
  }

  // Check prerequisites
  const spinner = ora('Checking prerequisites...').start();

  // Check for git
  try {
    execSync('git --version', { stdio: 'pipe' });
  } catch {
    spinner.fail('Git is not installed');
    console.log(chalk.yellow('\nPlease install Git: https://git-scm.com/downloads'));
    process.exit(1);
  }

  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    spinner.fail('Not authenticated');
    console.log(chalk.yellow('\nPlease login first:'));
    console.log(chalk.white('  ginko login\n'));
    process.exit(1);
  }

  spinner.succeed('Prerequisites verified');

  // Gather project info
  let template = options.template || 'basic';
  let description = options.description || 'A project with Ginko AI context management';

  if (!options.nonInteractive && process.stdin.isTTY) {
    console.log(chalk.blue.bold('\n📋 Project Setup\n'));

    const descAnswer = await prompts({
      type: 'text',
      name: 'description',
      message: 'Project description:',
      initial: description
    });

    if (descAnswer.description) {
      description = descAnswer.description;
    }

    const templateAnswer = await prompts({
      type: 'select',
      name: 'template',
      message: 'Choose a project template:',
      choices: [
        { title: '📁 Basic Project (just Ginko setup)', value: 'basic' },
        { title: '⚛️  React Project (with Ginko)', value: 'react' },
        { title: '🟢 Node.js Project (with Ginko)', value: 'node' },
        { title: '📦 Library Project (with Ginko)', value: 'library' }
      ],
      initial: 0
    });

    if (templateAnswer.template) {
      template = templateAnswer.template;
    }
  } else {
    console.log(chalk.gray(`\n   Name: ${projectName}`));
    console.log(chalk.gray(`   Description: ${description}`));
    console.log(chalk.gray(`   Template: ${template}\n`));
  }

  // Create project structure
  const structureSpinner = ora('Creating project structure...').start();

  try {
    await fs.ensureDir(projectPath);
    await createBasicStructure(projectPath, projectName, description);
    await createTemplateFiles(projectPath, projectName, description, template);
    structureSpinner.succeed('Project structure created');
  } catch (error) {
    structureSpinner.fail('Failed to create project structure');
    throw error;
  }

  // Initialize git
  const gitSpinner = ora('Initializing git repository...').start();
  try {
    execSync('git init', { cwd: projectPath, stdio: 'pipe' });
    gitSpinner.succeed('Git repository initialized');
  } catch (error) {
    gitSpinner.fail('Failed to initialize git');
    throw error;
  }

  // Initialize Ginko
  const ginkoSpinner = ora('Initializing Ginko...').start();
  try {
    // Change to project directory and run init
    const originalCwd = process.cwd();
    process.chdir(projectPath);
    await initCommand({});
    process.chdir(originalCwd);
    ginkoSpinner.succeed('Ginko initialized');
  } catch (error) {
    ginkoSpinner.warn('Ginko initialization had issues');
    console.log(chalk.dim(`  You can run "ginko init" manually in the project directory`));
  }

  // Success message
  console.log(chalk.green.bold('\n🎉 Project created successfully!\n'));

  console.log(chalk.blue.bold('📁 Project Details:'));
  console.log(chalk.gray(`   Name: ${projectName}`));
  console.log(chalk.gray(`   Template: ${template}`));
  console.log(chalk.gray(`   Location: ${projectPath}`));

  console.log(chalk.blue.bold('\n🚀 Next Steps:'));
  console.log(chalk.white(`   cd ${projectName}`));
  console.log(chalk.white('   claude                    # Open Claude Code'));
  console.log(chalk.white('   ginko start               # Begin your session'));

  console.log(chalk.blue.bold('\n📚 Ginko Commands:'));
  console.log(chalk.gray('   ginko start      Begin session with context'));
  console.log(chalk.gray('   ginko handoff    Save progress before switching'));
  console.log(chalk.gray('   ginko vibecheck  Quick realignment when stuck'));
  console.log(chalk.gray('   ginko status     Check current session\n'));

  console.log(chalk.cyan('🏔️ Happy coding with Ginko AI!\n'));
}

async function createBasicStructure(projectPath: string, projectName: string, description: string) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: description,
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

  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  const readme = `# ${projectName}

${description}

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

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);

  await fs.writeFile(path.join(projectPath, '.gitignore'), `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
`);
}

async function createTemplateFiles(projectPath: string, projectName: string, description: string, template: string) {
  switch (template) {
    case 'react':
      await createReactTemplate(projectPath, projectName, description);
      break;
    case 'node':
      await createNodeTemplate(projectPath, projectName, description);
      break;
    case 'library':
      await createLibraryTemplate(projectPath, projectName, description);
      break;
    default:
      // Basic template - just the structure we already created
      break;
  }
}

async function createReactTemplate(projectPath: string, projectName: string, description: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
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

  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.writeFile(path.join(projectPath, 'src/App.jsx'), `import React from 'react';

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>${projectName}</h1>
      <p>${description}</p>
      <p style={{ color: '#666' }}>
        Run <code>ginko start</code> to begin your session
      </p>
    </div>
  );
}

export default App;
`);

  await fs.writeFile(path.join(projectPath, 'src/main.jsx'), `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);

  await fs.writeFile(path.join(projectPath, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);

  await fs.writeFile(path.join(projectPath, 'vite.config.js'), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`);
}

async function createNodeTemplate(projectPath: string, projectName: string, description: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);

  packageJson.type = "module";
  packageJson.main = "src/index.js";
  packageJson.scripts = {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "echo 'No tests specified'"
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.writeFile(path.join(projectPath, 'src/index.js'), `#!/usr/bin/env node

console.log('${projectName}');
console.log('${description}');
console.log('');
console.log('Run "ginko start" to begin your session');

function main() {
  console.log('\\n✅ Application started successfully');
}

main();
`);
}

async function createLibraryTemplate(projectPath: string, projectName: string, description: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
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

  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.writeFile(path.join(projectPath, 'src/index.js'), `/**
 * ${projectName}
 * ${description}
 */

export function hello() {
  return 'Hello from ${projectName}!';
}

export default {
  hello
};
`);
}
