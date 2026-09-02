---
permalink: /en/manager/plugins/
title: Lua plugin management
---

# Lua plugin management

Current `main` places Plugins second in the bottom navigation. These are Lua plugins executed by `ksud`; they are not Zygisk modules, ordinary KernelSU modules, or extensions loaded into the manager APK.

::: danger Plugins have root-level capability
Plugin callbacks run in privileged userspace. Their API can execute commands, read and write files, modify properties and sysctls, and start persistent daemons. Assess a plugin like a root script or native module—not like a harmless theme merely because it uses Lua.
:::

## Installed plugins

The page currently supports:

- installation from a local ZIP;
- search and optional enabled-first sorting;
- pull-to-refresh from the real `ksud plugin list` state;
- enable and disable;
- Action when the manifest declares it;
- manifest-declared quick actions;
- manifest-declared configuration fields;
- per-plugin log viewing and clearing; and
- uninstall.

The bottom-navigation badge is the installed plugin count. It does not mean every plugin is enabled, has satisfied dependencies, or ran successfully.

An invalid manifest is shown as an error and disables Action/quick actions. The manager also refuses a local plugin ZIP larger than 272 MiB. That size ceiling is not authenticity or safety verification.

## Enable, disable, and dependencies

`ksud` validates the manifest and dependencies before enabling a plugin. It refuses to disable or uninstall a plugin while another enabled plugin depends on it.

On disable, `ksud` also attempts to stop daemons registered by that plugin. The operation can fail while a callback is active, its runtime tree is busy, or a daemon cannot be stopped safely. Refresh the page and inspect the plugin log instead of assuming that a switch animation proves all old processes are gone.

Enabling does not replay boot stages that have already passed. A plugin that depends on `post-fs-data`, `post-mount`, `service`, or `boot-completed` callbacks normally waits until that stage occurs again; a full reboot is the clearest validation boundary.

## Action, quick actions, and configuration

- **Action** appears only when the plugin actually declares one.
- **Quick action** invokes the Lua function selected by its manifest.
- **Configure** stores manifest-defined fields; whether a live plugin rereads them immediately is plugin-defined.
- **Plugin log** is that plugin's own record, not the complete `ksud`, kernel, or logcat output.

A successful manual Action proves only that callback returned successfully on that run. It does not validate boot callbacks, daemons, or the final system effect.

## Plugin repositories

The repository action in the top bar can browse, search, install, update, or reinstall repository plugins. Repository Sources can enable, disable, refresh, reorder, add, and remove sources.

The current manager ships one built-in **FolkPatch Plugin Mirror** source. It can be disabled but, as a built-in source, cannot be removed. User-added remote sources must use HTTPS; HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1` test sources. Repository index responses are limited to 4 MiB.

::: warning Repository plugins are not signed by YukiSU
The installation confirmation explicitly states that YukiSU does not verify repository-plugin authorship or release signatures. HTTPS protects transport to the configured host; it does not make that host, index, or ZIP trustworthy.
:::

Before installation, check at least:

1. that source URL and plugin homepage belong to the intended author;
2. a reproducible hash or release signature for the ZIP;
3. manifest ID, entry, dependencies, callbacks, Action, and configuration;
4. whether the Lua source executes external commands, downloads code, changes system properties, or writes critical paths; and
5. how to disable, uninstall, and restore system state changed by the plugin.

## Recommended validation order

1. Install with minimal configuration and confirm there is no manifest or dependency error.
2. Enable one plugin, then refresh the list.
3. Start with an auditable manual Action or quick action and inspect its plugin log.
4. When boot stages are required, perform a full reboot and preserve `ksud` and kernel logs too.
5. On abnormal behavior, disable first; confirm its daemons stopped before uninstalling.

Lua plugins and ordinary modules can both change system state. Change one layer at a time so plugin callbacks, module scripts, and YukiZygisk injection do not become one indistinguishable failure.

See [Lua plugins](/en/modules/plugin/) for package layout, manifest, Lua API, and resource limits.
