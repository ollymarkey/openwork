# Contributing to OpenWork

Thank you for your interest in contributing to OpenWork! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop builds)
- [Git](https://git-scm.com/)

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/openwork.git
   cd openwork
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the development server:
   ```bash
   bun dev
   ```

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check existing issues to avoid duplicates
- Collect relevant information (OS, Bun version, error messages, steps to reproduce)

When submitting a bug report, include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or logs if applicable
- Your environment details

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Provide a clear description of the feature
- Explain the use case and why it would be valuable
- Consider how it fits with the project's goals

### Submitting Pull Requests

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding guidelines below

3. Test your changes:
   ```bash
   bun test
   bun run build
   ```

4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request against the `main` branch

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Coding Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add type annotations where possible
- Prefer `const` over `let`, avoid `var`

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use Tailwind CSS for styling

### File Organization

- Place new components in appropriate directories under `packages/`
- Keep related files together
- Use index files for clean exports

### Testing

- Write tests for new features and bug fixes
- Ensure existing tests pass before submitting PR
- Test across different platforms when possible

## Project Structure

```
openwork/
├── packages/
│   ├── openwork/        # Core server (Hono.js)
│   ├── app/             # Frontend (React)
│   ├── desktop/         # Desktop wrapper (Tauri)
│   └── ui/              # Shared components
├── agents/              # Default agents
├── skills/              # Default skills
└── plan/                # Implementation docs
```

## Areas for Contribution

We welcome contributions in these areas:

- **Bug fixes** - Help us squash bugs
- **Documentation** - Improve guides, API docs, and examples
- **New tools** - Add built-in tool integrations
- **MCP servers** - Create or document MCP server integrations
- **Skills** - Contribute skill templates
- **Agent templates** - Share useful agent configurations
- **UI/UX improvements** - Enhance the desktop application interface
- **Performance** - Optimize server and client performance
- **Testing** - Expand test coverage

## Getting Help

If you need help:
- Check the documentation in `plan/` directory
- Open a GitHub Discussion for questions
- Join community channels (if available)

## License

By contributing to OpenWork, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

OpenWork is inspired by [OpenCode](https://opencode.ai/). We thank the OpenCode team and all contributors to the open-source AI tooling ecosystem.
