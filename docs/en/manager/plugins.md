---
permalink: /en/manager/plugins/
title: Lua plugin management
---

# Lua plugin management

Plugins is the second bottom-navigation tab and manages Lua plugins executed by `ksud`. Use the Modules tab to install Zygisk or ordinary KernelSU modules.

::: danger Plugins have root-level capability
Plugin callbacks run as root. They can execute commands, read and write files, modify properties and sysctls, and start persistent daemons. Install plugins only when you trust their authors and code.
:::

## Installed plugins

The page supports:

- installation from a local ZIP;
- search and optional enabled-first sorting;
- pull-to-refresh from the real `ksud plugin list` state;
- enable and disable;
- Action when the manifest declares it;
- manifest-declared quick actions;
- manifest-declared configuration fields;
- per-plugin log viewing and clearing; and
- uninstall.

The bottom-navigation badge shows the installed plugin count. Each card shows its enabled state and errors; execution results are in the plugin log.

An invalid manifest produces a card error and disables Action/quick actions. Reinstall a package with a valid manifest before using them. Local plugin ZIPs must not exceed 272 MiB.

## Enable, disable, and dependencies

`ksud` validates the manifest and dependencies before enabling a plugin. It refuses to disable or uninstall a plugin while another enabled plugin depends on it. Disable the dependents listed in the error first, then retry.

Disabling first saves the disabled state, then stops daemons registered by that plugin. If it reports “disabled but daemon could not be stopped,” the disabled state is saved but the old process still needs attention. Inspect the plugin log and resolve the stop failure or fully reboot. If uninstall reports an active callback or busy runtime tree, disable the plugin, wait for the callback to exit, then retry.

Enabling does not replay boot stages that have already passed. If the plugin needs `post-fs-data`, `post-mount`, `service`, or `boot-completed` callbacks, fully reboot after enabling it and inspect its log.

## Action, quick actions, and configuration

- **Action** appears only when the plugin actually declares one.
- **Quick action** invokes the Lua function selected by its manifest.
- **Configure** stores manifest-defined fields. Plugins that implement runtime reload use them immediately; otherwise follow the plugin instructions to rerun an Action, restart its daemon, or fully reboot.
- **Plugin log** is that plugin's own record, not the complete `ksud`, kernel, or logcat output.

A successful Action means that invocation returned normally. Check the settings or files it was meant to change; boot callbacks and daemons have separate log results. Disabling or uninstalling does not automatically undo system-file or setting changes made by a plugin. Follow the plugin's restoration instructions.

## Plugin repositories

The repository action in the top bar can browse, search, install, update, or reinstall repository plugins. Repository Sources can enable, disable, refresh, reorder, add, and remove sources.

The manager ships one built-in **FolkPatch Plugin Mirror** source. It can be disabled but, as a built-in source, cannot be removed. User-added remote sources must use HTTPS; HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1` test sources. Repository index responses are limited to 4 MiB.

::: warning Repository plugins are not signed by YukiSU
YukiSU does not verify repository-plugin authorship or release signatures. HTTPS encrypts transport; confirm the publisher and download address before adding a source or installing a plugin.
:::

Before installation, check at least:

1. that source URL and plugin homepage belong to the intended author;
2. a reproducible hash or release signature for the ZIP;
3. manifest ID, entry, dependencies, callbacks, Action, and configuration;
4. whether the Lua source executes external commands, downloads code, changes system properties, or writes critical paths; and
5. how to disable, uninstall, and restore system state changed by the plugin.

## First use and troubleshooting

1. Install with minimal configuration and confirm there is no manifest or dependency error.
2. Enable one plugin, then refresh the list.
3. If the plugin declares an Action or quick action, run the operation you need and inspect its log.
4. Fully reboot when boot stages are required. On failure, save plugin, `ksud`, and kernel logs.
5. On abnormal behavior, disable the plugin, then uninstall it. Follow its instructions to restore changed files and settings.

To investigate a plugin/module conflict, disable the most recently added plugin and reboot, then check whether the failure remains. Change one plugin or module at a time.

See [Lua plugins](/en/modules/plugin/) for package layout, manifest, Lua API, and resource limits.

## Source references

[Plugin.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Plugin.kt), [plugin.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.cpp).
