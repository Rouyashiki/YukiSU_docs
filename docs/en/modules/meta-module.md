---
permalink: /en/modules/meta-module/
title: MetaModule
---

# MetaModule

MetaModule is the replaceable mount backend of the YukiSU module system. YukiSU **fully follows official KernelSU's MetaModule interface and lifecycle**: identification, script entries, call order and the one-active-backend rule are identical.

YukiSU's C++ userspace executes that upstream contract. The MetaModule still decides whether mounting uses OverlayFS, bind mounts or another implementation; there is no separate YukiSU-private MetaModule format.

::: tip Switching from KernelSU
A MetaModule already working under official KernelSU can remain installed when moving to YukiSU. Any Android, kernel or version requirement specific to that backend still applies.
:::

## Why MetaModule exists

Modules that only run scripts, set properties or load SELinux rules may not change system files. When files must appear under read-only system paths, YukiSU delegates these tasks to MetaModule:

- collect ordinary-module file trees;
- resolve directory and file overlays;
- create the actual mounts;
- maintain backend state during install and removal;
- provide implementation-specific rollback and diagnostics.

This allows mount technology to evolve independently. It also makes the active MetaModule a shared dependency of every system-file module; one backend failure can affect several ordinary modules at once.

## Identification and active instance

Set this in `module.prop`:

```properties
metamodule=1
```

`true` is also accepted. After installation, YukiSU maintains a link under `/data/adb/metamodule/` to locate the active implementation.

Only one MetaModule may be active. This avoids two backends processing the same module trees and creating duplicate or conflicting mounts.

A MetaModule is still a module under `/data/adb/modules/`, so ordinary state markers apply to it. `disable` stops backend scripts and `remove` performs final cleanup in a later boot stage. It is not part of the core root path: root and scripts/plugins that need no mounts can remain functional without it.

## Interface scripts

| File | Invocation | Context | Purpose |
| --- | --- | --- | --- |
| `metainstall.sh` | Installing an ordinary module | Ordinary-module install environment | Backend-specific install and preprocessing |
| `post-fs-data.sh` | MetaModule early boot | MetaModule environment | Prepare the backend before ordinary-module scripts |
| `metamount.sh` | After ordinary `post-fs-data` and property loading | `MODULE_DIR` | Scan modules and create mounts |
| `metauninstall.sh` | Removing an ordinary module | `MODULE_ID` | Clean backend state for that module |
| `post-mount.sh`, `service.sh`, `boot-completed.sh`, and other stages | Matching YukiSU lifecycle stages | MetaModule environment | Run backend work before ordinary modules and Lua plugins in that stage |

If a script is absent, that hook is skipped. A disabled, pending-removal or otherwise unsafe MetaModule should not be treated as a normal active backend.

## What happens during boot

The normal mount-related order is:

1. run common `post-fs-data.d` scripts;
2. apply pending update/removal state, directory contexts, SELinux rules and persisted features;
3. run the MetaModule `post-fs-data.sh`;
4. run ordinary-module `post-fs-data.sh` files;
5. run Lua plugin `post_fs_data` callbacks;
6. load module `system.prop` files;
7. call the active MetaModule `metamount.sh`;
8. apply per-app unmount configuration;
9. enter `post-mount`, ordered as common scripts, MetaModule, ordinary modules, then Lua plugins.

`metamount.sh` runs after ordinary early scripts so modules can prepare required files first. Work that requires final mounted paths belongs in `post-mount` or later, not in an ordinary `post-fs-data.sh` that assumes replacement paths already exist.

Late-load mode uses `late-load.sh` after real early boot has already passed, then loads properties and invokes `metamount.sh`. It is a delayed-loading path and cannot give init-early or already-running consumers the same timing as a normal boot.

## During ordinary-module installation

If the active MetaModule provides `metainstall.sh`, YukiSU lets it participate in ordinary-module installation. The same module ZIP can therefore receive different install-time handling under different MetaModules.

Record all of these when reporting an issue:

- YukiSU version;
- MetaModule name and version;
- ordinary module name and version;
- full install log;
- declared backend requirements.

A ZIP name alone is rarely sufficient for reproduction.

## Replacing a MetaModule

Do not treat a backend replacement like an ordinary module update. Use this sequence:

1. record the current MetaModule, ordinary modules and important settings;
2. remove the current MetaModule in the manager;
3. complete a reboot so removal scripts and state cleanup can finish;
4. confirm that no active MetaModule remains;
5. install the replacement;
6. reboot and verify one simple mount module first;
7. inspect other modules instead of assuming old backend state is reusable.

If the current MetaModule is pending update/removal or disabled, let that state complete across one reboot. YukiSU install safety checks reject some operations that would overlap backends.

That installation gate protects a custom `metainstall.sh` only when the active backend provides one. An allowed installation is not proof that the backend currently mounts correctly.

## Effect of removal

Removing the active MetaModule affects every ordinary module that depends on system-file mounting. Module directories and scripts can remain while their `/system` trees no longer appear as before.

- script-only modules may continue to work;
- a standalone WebUI may still open;
- system-file modules lose their core behavior;
- services tightly coupled to mounted results may fail or restart.

## Verifying a MetaModule

Do not stop at “installed.” Confirm that:

- only one active MetaModule is shown;
- it is not pending update/removal or disabled;
- its `post-fs-data` and `metamount.sh` complete without errors;
- one simple test module appears in the expected namespace;
- disabling that module and rebooting removes the target file;
- `metauninstall.sh` leaves no error when an ordinary module is removed.

If a shell sees a mount but one app does not, inspect that app's namespace and module-unmount policy before declaring the entire backend broken.

When “unmount modules for WebView” is enabled, the WebView Zygote loses ordinary module mounts in its namespace. A module that replaces WebView resources may therefore be invisible by design. This is a kernel per-app unmount policy, not a MetaModule installation failure. See [Module mounting](/en/modules/magic-mount/).

## Capability and trust boundaries

YukiSU does not promise that a particular MetaModule provides:

- Magic Mount-compatible semantics;
- OverlayFS;
- automatic file-conflict resolution;
- module hiding or integrity-check bypass;
- seamless migration across root solutions;
- recovery-mode installation for an unbootable device.

Those belong to the implementation. A MetaModule processes files and scripts from many modules as root, placing it at a high-trust boundary. Use a backend with a credible source, history, update process and recovery guide.

MetaModule does not process Lua plugins under `/data/adb/plugins/`, load `zygisk/*.so`, or interpret `zn_modules.txt`. Those paths belong to the `ksud` plugin runtime and YukiZygisk respectively.

Continue with [Module system](/en/modules/overview/) for ordinary modules, or [Common troubleshooting](/en/troubleshoot/common/) for mount failures.
