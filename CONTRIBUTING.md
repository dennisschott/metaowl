# Contributing to metaowl

Thank you for considering a contribution! Here is how to get started.

## Reporting Issues

Before opening a new issue, please [search existing issues](https://github.com/dennisschott/metaowl/issues) to avoid duplicates. When filing a bug report, include:

- metaowl version (`npm ls metaowl`)
- Node.js version (`node --version`)
- Minimal reproduction steps or a repository link
- Expected vs. actual behaviour

## Development Setup

```bash
git clone https://github.com/dennisschott/metaowl.git
cd metaowl
npm install
```

## Submitting a Pull Request

1. **Open an issue first** to discuss significant changes before investing time in an implementation.
2. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. Make your changes, keeping scope minimal and focused.
4. Ensure the project is lint-clean:
   ```bash
   node bin/metaowl-lint.js
   ```
5. Commit using [Conventional Commits](https://www.conventionalcommits.org):
   - `feat:` — new features
   - `fix:` — bug fixes
   - `docs:` — documentation only
   - `chore:` — tooling, dependencies
6. Push your branch and open a pull request against `main`.

## Code Style

- ES modules (`import`/`export`) throughout.
- No semicolons; single quotes; no trailing commas (enforced by ESLint).
- Keep public API surface minimal — prefer extending existing modules over adding new entry points.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
