---
permalink: /en/modules/plugin/
title: Lua plugins (in development)
---

# Lua plugins (in development)

Lua plugin support currently exists on a development branch and is not a stable public interface in a YukiSU release.

Development code is adding a plugin directory, CLI entry points, logging and a manager page, but the package format, lifecycle, permission model and Lua API may still change. This page intentionally provides no installable layout or API example that third-party code could mistake for a promise.

Contributors should use the current branch's `userspace/ksud/src/plugin/`, CLI implementation and manager `Plugin` page, then re-audit the documentation before release.
