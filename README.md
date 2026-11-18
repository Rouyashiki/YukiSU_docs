# YukiSU Documentation

Read the guides in [English](https://yukisu.rouyashiki.org/en/) or [简体中文](https://yukisu.rouyashiki.org/).

The site is generated with [VuePress](https://vuepress.vuejs.org/) and [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume).

Product and compatibility claims must be supported by [YukiSU source](https://github.com/Rouyashiki/YukiSU) at the documented version. Avoid copying behavior from another KernelSU fork without verifying it in YukiSU.

## Documented baseline

These guides cover [YukiSU v1.9.0](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.9.0), released November 16, 2026, with Manager version code 10745. Use the [release commit](https://github.com/Rouyashiki/YukiSU/tree/a66faee724c6ff2d79757cb1cc8030fdf71a30f8) when checking a feature. The [update guide](docs/en/guide/update.md) explains how to switch from the old Manager and which data to keep before removing it.

## Content workflow

- Write for users and developers: state what to do, when it takes effect, and how to handle failure. Use direct conclusions supported by the implementation.
- Replace vague qualifiers with explicit conditions. Keep a real limitation, but explain its cause and the reader's next action instead of repeating disclaimers.
- Keep source-audit notes in source references and maintenance guidance; introduce product pages with the feature and its use.
- Keep Chinese and English pages paired and update both sidebars when adding a route.
- Derive KMI targets from `scripts/build.ps1`, `scripts/build.sh`, and the build workflows.
- Derive Feature IDs and behavior from `uapi/feature.h`, the kernel implementation, `ksud`, and the current manager UI together.
- Treat manager screens, boot patching, modules, and YukiZygisk as separate runtime layers; a UI label alone is not proof that the final effect succeeded.
- Cite immutable source commits and verify file paths, including submodule sources.
- Keep installation, runtime changes, snapshot preparation, and observed device effects distinct.
- Run a production build and check generated routes, internal anchors, language pairs, and sidebar entries before publishing.

## Install

```sh
pnpm i
```

## Usage

```sh
# Start the development server
pnpm docs:dev
# Build for production
pnpm docs:build
# Preview the production build locally
pnpm docs:preview
# Update VuePress and the theme
pnpm vp-update
```

## Deployment

Use a Node.js version supported by `package.json` and its specified pnpm version. Install development dependencies for the build:

```sh
pnpm install --frozen-lockfile --prod=false
pnpm docs:build
```

Publish the contents of `docs/.vuepress/dist/` at the root of [yukisu.rouyashiki.org](https://yukisu.rouyashiki.org/). The `hostname` in `docs/.vuepress/config.ts` supplies the domain for canonical URLs, the sitemap, and robots.txt. Rebuild after changing it.

Replace the previous build as a whole to remove deleted pages and obsolete search assets. Preserve the directory structure so paths such as `/en/guide/intro/` serve their `index.html`. Missing paths should return `404.html` with HTTP 404.

Preview before uploading:

```sh
pnpm docs:preview
```

Check both homepages, deep routes, search, and the 404 response, then publish that same artifact. This repository contains no hosting-platform configuration or automatic deployment workflow; the build command only generates local static files.

## Documents

- [vuepress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
