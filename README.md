# YukiSU Documentation

The site is generated with [VuePress](https://vuepress.vuejs.org/) and [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume).

Product and compatibility claims must be supported by the current [YukiSU source repository](https://github.com/Rouyashiki/YukiSU). Avoid copying behavior from another KernelSU fork without verifying it in YukiSU.

## Content workflow

- Keep Chinese and English pages paired and update both sidebars when adding a route.
- Derive KMI targets from `scripts/build.ps1`, `scripts/build.sh`, and the build workflows.
- Derive Feature IDs and behavior from `uapi/feature.h`, the kernel implementation, `ksud`, and the current manager UI together.
- Treat manager screens, boot patching, modules, and YukiZygisk as separate runtime layers; a UI label alone is not proof that the final effect succeeded.
- Run a production build and check internal links before publishing.

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

## Documents

- [vuepress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
