# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-04-24

### Added

- **Nested layouts support** — layouts can now have parent-child relationships using `setParentLayout()`, `getParentLayout()`, and `getLayoutChain()`. The `createNestedLayoutWrapper()` function creates wrapper components for multi-level nesting. The `defineNestedLayout()` decorator simplifies declaring nested layouts on components.
- **Image optimization module** — new `modules/image.ts` with `generateSrcSet()`, `calculateAspectRatio()`, `generateSizesAttribute()`, `createResponsiveImage()`, `prefetchImage()`, `prefetchImages()`, `isImageLoaded()`, `getImageDimensions()`, `observeImageVisibility()`, `swapImageSource()`, and `generateDominantColorPlaceholder()`.
- **Fonts optimization module** — new `modules/fonts.ts` with `defineFontFace()`, `loadFont()`, `loadFontFamily()`, `isFontLoaded()`, `preloadFont()`, `removeFontPreload()`, `createFontFaceRule()`, `injectFontFaceRules()`, `measureTextWidth()`, `estimateFontMetrics()`, `adjustFontForFout()`, and `getFontLoadStatus()`.

### Changed

- **TypeScript migration completed** — the framework source, Vite integration, CLI entrypoints,
  and test suite now use TypeScript as the primary source of truth while preserving the existing
  public API and runtime behavior.
- **Runtime build output separated from source** — publishable JavaScript is now emitted to
  `build/runtime`, and package `main`, `exports`, and `bin` entries resolve from that generated
  runtime output.

### Removed

- **Redundant source JavaScript files** — legacy hand-maintained `.js` source files in `modules/`,
  `bin/`, `vite/`, and the root entrypoint were removed in favor of the TypeScript sources and the
  generated runtime build.

### Added

- **Release build workflow** — added dedicated runtime build and release helper scripts for
  clean runtime generation, release checks, and package dry-run validation.

## [0.5.0] - 2026-04-24

### Changed

- **TypeScript migration completed** — the framework source, Vite integration, CLI entrypoints,
  and test suite now use TypeScript as the primary source of truth while preserving the existing
  public API and runtime behavior.
- **Runtime build output separated from source** — publishable JavaScript is now emitted to
  `build/runtime`, and package `main`, `exports`, and `bin` entries resolve from that generated
  runtime output.

### Removed

- **Redundant source JavaScript files** — legacy hand-maintained `.js` source files in `modules/`,
  `bin/`, `vite/`, and the root entrypoint were removed in favor of the TypeScript sources and the
  generated runtime build.

### Added

- **Release build workflow** — added dedicated runtime build and release helper scripts for
  clean runtime generation, release checks, and package dry-run validation.

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
