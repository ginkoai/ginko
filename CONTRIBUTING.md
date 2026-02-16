# Contributing to Ginko

Thank you for your interest in contributing to Ginko! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- Git

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ginko.git
cd ginko

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link CLI for local testing
cd packages/cli
npm link
ginko --version
```

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/ginkoai/ginko/issues) to avoid duplicates
2. Use the **Bug Report** template when creating a new issue
3. Include reproduction steps, expected behavior, and your environment details

### Suggesting Features

1. Search [existing issues](https://github.com/ginkoai/ginko/issues) for similar proposals
2. Use the **Feature Request** template
3. Describe the problem you're solving, not just the solution

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/your-feature`
3. **Make your changes** following the coding standards below
4. **Write tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Commit** with a conventional commit message (see below)
7. **Push** and open a Pull Request

## Coding Standards

### TypeScript

- Use strict mode
- Prefer `interface` over `type` for object shapes
- Avoid `any` — use `unknown` if the type is truly unknown
- Export types from `.types.ts` files

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add session resume from handoff
fix: resolve dotenv path for standalone installs
docs: update getting started guide
test: add coverage for task parser edge cases
chore: update dependencies
```

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what and why
- Add tests for new functionality
- Update documentation if behavior changes
- Ensure CI passes before requesting review

## Contributor License Agreement (CLA)

Before we can accept your first contribution, you must sign our [Contributor License Agreement (CLA)](CLA.md). This is a one-time requirement.

When you open your first pull request, the CLA bot will comment with instructions. Simply add a comment to your PR saying:

> I have read the CLA Document and I hereby sign the CLA.

The CLA grants Ginko AI the right to use your contributions under any license, which allows us to offer both open-source and commercial editions while keeping the project sustainable. Your contributions will always remain available under the AGPL-3.0 open-source license.

## License

By contributing to Ginko, you agree that your contributions will be licensed under the [AGPL-3.0-or-later](LICENSE) license.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

- Open a [Discussion](https://github.com/ginkoai/ginko/discussions) for general questions
- File an [Issue](https://github.com/ginkoai/ginko/issues) for bugs or feature requests
