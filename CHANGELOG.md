# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-03-25

### Added

- **Content hash for `templates.xml`** — the merged OWL template file is now written
  as `templates.<hash>.xml` (8-character SHA-256 content hash) during `build` and
  `generate`. All references in the built HTML and JS assets are rewritten accordingly,
  ensuring browsers always fetch the latest templates after a deployment and never serve
  stale cached versions.

## [0.4.0] - 2026-03-24

### Added

- **Link component** added.

## [0.3.7] - 2026-03-24

### Fixed

- **bin/metaowl-lint.js** — Fixed inconsistent default lint paths. Changed from `src/owl/pages/**` and `src/owl/components/**` to `src/pages/**` and `src/components/**` to match the documented project structure.
- **eslint.js** — Fixed `ignores` configuration placement. Moved `ignores` to a separate configuration object as required by ESLint Flat Config format. Also added `.metaowl/**` to the ignore list for the auto-generated component declarations.
- **modules/auto-import.js** — Fixed missing `node:` prefix for Node.js built-in module import.
