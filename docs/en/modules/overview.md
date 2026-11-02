---
permalink: /en/modules/overview/
title: Module system
---

# Module system

YukiSU modules can provide boot scripts, system files, a WebUI and process injection. Start by identifying the components your module uses:

| Component | Responsibility | Not its responsibility |
| --- | --- | --- |
| YukiSU core root | Kernel authorization, `su` and the main `ksud` path | Root does not require an ordinary module, MetaModule or YukiZygisk |
| Ordinary module | Installed files, lifecycle scripts, properties and SELinux rules | It does not choose how `system/` is mounted |
| Built-in Kagami / external MetaModule | Exposes ordinary-module trees at system paths; an external mount script takes priority | Neither provides root or Zygisk |
| One-shot script | Runs a parameterized root operation once from a ZIP | Does not install a persistent module or join later boot stages |
| Lua plugin | Runs callbacks in the `ksud` Lua runtime | It is not an ordinary module and takes no part in MetaModule mounting |
| Ordinary Zygisk module | Runs standard Zygisk callbacks in Zygote children | It requires YukiZygisk and cannot replace root or MetaModule |
| Native ZN module | Injects selected native executables by name or path | It uses a separate ZN API, not the ordinary Zygisk API |

One ordinary module may contain scripts, system files, a WebUI, Zygisk libraries and a Native ZN manifest at the same time. Each part still follows its own activation path.

## Minimal ordinary module package

Place `module.prop` directly at the ZIP root, without wrapping the entire module in another directory. A module providing only a manual diagnostic action can contain:

```text
example-module.zip
├── module.prop
└── action.sh
```

```properties
id=example.report
name=Example report
version=1.0
versionCode=1
author=Example author
description=Print a diagnostic report
```

```sh
#!/system/bin/sh
MODDIR=${0%/*}
printf 'Module directory: %s\n' "$MODDIR"
uname -r
```

Use LF line endings. Derive the module path from the script location instead of hardcoding the install-time `modules_update` path. Add `customize.sh` for installation customization; the installer sources it with `MODPATH`, `ui_print` and `abort` available, then removes it. Place system files under `system/`; see [Module mounting](/en/modules/magic-mount/) for how they replace system paths.

Module packages use a ZIP container. The v1.8.0 extraction path supports Store, Deflate, BZip2, LZMA and XZ entries; this does not add `.tar.xz` or `.7z` support. Prefer Deflate when supporting older managers and test installation on them.

To run this operation once and discard the extracted package, use a [one-shot script](/en/modules/one-shot/) without installing an ordinary module.

## Installed directory and common files

Active modules live under:

```text
/data/adb/modules/<directory-id>/
```

Normal installations/updates are staged under `/data/adb/modules_update/<directory-id>/` and merged during the next normal boot. Author-requested [hot installation](/en/modules/hot-install/) can activate the new directory earlier. Commands and runtime status identify a module by its directory name. The `id` in `module.prop` is used for display and updates. Two directories are always handled as separate modules.

| File or directory | Purpose | Takes effect |
| --- | --- | --- |
| `module.prop` | `id`, name, version, author, description, update/support links and other metadata | Installation and list scans |
| `customize.sh` | Customize ZIP installation | Installation |
| `post-fs-data.sh` | Blocking early preparation | Normal early boot stage |
| `post-mount.sh` | Work requiring final module mounts | After built-in or external mounting |
| `service.sh` | Daemons and asynchronous initialization | Service stage |
| `boot-completed.sh` | Work requiring completed Android framework boot | Boot-completed stage |
| `uninstall.sh` | Final cleanup | Boot after removal is scheduled, or full YukiSU uninstall |
| `system.prop` | Properties applied through YukiSU's `resetprop` path | After early scripts, before mounting |
| `sepolicy.rule` | Additional module SELinux rules | Before ordinary module scripts |
| `system/` | File tree supplied to built-in Kagami or an external MetaModule | Next mount stage |
| `skip_mount` | Keep `system/` out of the mount backend | Next mount stage |
| `initrc/*.rc` | Content aggregated into `modules.rc` for init parsing | Next full boot |
| `preinit/preinit.conf` | Early actions before SELinux setup | Next full boot with preinit support |
| `action.sh` | User-triggered one-shot manager action | Runs immediately when selected |
| `webroot/` | Module WebUI | When opened |
| `zygisk/arm64-v8a.so`, `zygisk/armeabi-v7a.so` | Ordinary Zygisk libraries | New Zygote/app processes |
| `zn_modules.txt` | Native ZN targets and libraries | New matching native processes; early targets use a next-boot snapshot |

`actionIcon` and `webuiIcon` in `module.prop` may point to relative files inside the module. Absolute paths, paths containing `..`, and missing files are rejected by the module list.

## Actions and home-screen shortcuts

The manager runs Action only when the module is installed, enabled, has `action.sh`, and has no pending update or removal. Both module-card actions and desktop shortcuts recheck current state before execution. An old shortcut cannot bypass these conditions. Complete the reboot or author-supported hot installation first when an update is pending.

Choose Action or WebUI in the module shortcut settings, customize its name and icon, then add it to the home screen. An Action shortcut opens the execution page and closes it when the action finishes. Launching from the module card keeps the output page available for saving logs. Pinning also requires launcher support and any applicable permission.

Shortcuts use `ksu://action` or `ksu://webui` links containing a token for this manager installation. Use the manager's “Copy URL Scheme” option for automation instead of inventing a token, and do not share the full link publicly. Action runs as root. Scripts targeting an app must select the intended Android user instead of assuming a package belongs to the owner user.

## Activation after installation

After a normal installation, the manager displays a module card and merges the full files on the next boot. To check activation, follow this order:

1. **Installed:** the ZIP passed installation and produced pending state or completed hot activation;
2. **Enabled:** neither `disable` nor `remove` blocks the module;
3. **Executed:** the expected lifecycle stage actually ran and succeeded;
4. **Mapped:** the selected mount backend exposed `system/` at the target paths;
5. **Process recreated:** a Zygisk or Native ZN target is not an old process;
6. **Working:** open the target app or system component and test the module's feature.

`disable`, `remove` and update state affect later scans immediately. They cannot undo scripts already run during this boot, stop an existing service, remove current mounts, or extract a native library from a running process. Fully reboot after changing module state so files, services and target processes use the same version. Eligible devices can also use an [emulated soft reboot](/en/manager/soft-reboot/) to reapply module stages; it does not run preinit, reparse init rc or reload the kernel.

## Normal boot order

Earlier [preinit](/en/modules/preinit/) and init rc stages use previously synchronized snapshots. The main normal `post-fs-data` order is:

1. common scripts from `/data/adb/post-fs-data.d`;
2. pending update/removal handling, directory contexts and module SELinux rules;
3. persisted feature restoration and required YukiSU userspace services;
4. the MetaModule's `post-fs-data.sh`;
5. ordinary-module `post-fs-data.sh` files;
6. Lua plugin `post_fs_data` callbacks;
7. module `system.prop` files;
8. the active external MetaModule's `metamount.sh`, or built-in Kagami when no enabled external mount script exists;
9. per-app unmount configuration;
10. `post-mount`, ordered as common scripts, MetaModule, ordinary modules, then Lua plugins.

Ordinary `post-fs-data` and `post-mount` common/module scripts share a 35-second wait deadline. On expiry, `ksud` continues boot while the script keeps running. Lua callbacks have a separate 120-second limit per run; external `metamount.sh` waits until completion.

When a waited boot-stage script exits nonzero or is terminated by a signal, the dispatcher logs a warning and continues. A failure to create the process, change its working directory or execute the shell is an execution failure. Asynchronous `service` and `boot-completed` dispatch confirms that the process started, without waiting for its work to finish. Check critical commands and report errors within the script; a module card or completed-stage message does not confirm that the script completed its intended work.

`metamount.sh`, hot-install scripts and manual Action check exit results; see their respective sections.

The `service` and `boot-completed` stages use the same common-script → MetaModule → ordinary-module → Lua-plugin order. Those stages do not block the whole chain in the same way as `post-fs-data`.

Consequently:

- prepare files in `post-fs-data.sh`; system paths have not been replaced yet;
- put work that consumes mounted paths in `post-mount.sh`;
- do not wait for networking or framework services from a blocking early stage;
- place long-running work in `service.sh`.

Jailbreak/late-load mode has already missed real early boot. Ordinary modules and MetaModule use `late-load.sh`, followed by property loading, mounting and later stages; features that need an early init or Zygote event require normal boot loading. See [Jailbreak mode](/en/guide/jailbreak-mode/).

## Script environment and module configuration

YukiSU supplies a common environment to installer/lifecycle scripts, including:

- `KSU=true` and `YUKISU=1`;
- `KSU_VER`, `KSU_VER_CODE`, `KSU_KERNEL_VER_CODE` and `KSU_UAPI_VER`;
- `KSU_RUNTIME_MODE`;
- `KSU_MODULE=<directory-id>` for module-specific scripts;
- `ZYGISK_ENABLED=1` while the feature flag is on;
- `KSU_LATE_LOAD=1` in late-load mode.

`ZYGISK_ENABLED` reports the feature switch. Read [YukiZygisk status](/en/yukizygisk/features/) for module injection results.

Module version compatibility settings can override script version variables and corresponding `ksud` version queries through inherited `YUKISU_MODULE_COMPAT`. The actual kernel and UAPI keep their original versions, and modules must still meet their requirements. To diagnose a version rejection, disable overrides and retry with the real versions. One-shot scripts and preinit have their own environments, described on their pages.

Module scripts can also store their own values through `ksud module config`:

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config set once 1 --temp
```

The command selects the module through `KSU_MODULE`. Temporary values override persistent values and are cleared at the next `post-fs-data`, including an emulated soft reboot. Configuration files use a binary format; read and write them through the CLI. See [Module configuration](/en/modules/module-config/) for commands, multiline values, limits and `manage.*` feature ownership.

## Choosing a mount backend

Built-in Kagami is enabled by default. Automatic mode selects OverlayFS / Magic Mount; select Kasumi explicitly to use it. System-file modules use built-in mounting by default. Install an external MetaModule when the author requires that backend. Scripts, properties, rules and interfaces without file replacement need no mounting.

An external MetaModule mount script takes priority over built-in Kagami rather than constructing two overlapping plans. See [MetaModule](/en/modules/meta-module/) and [Module mounting](/en/modules/magic-mount/).

## Safe modes and early protection

YukiSU **system safe mode** is triggered by Android safe-mode properties or kernel Volume Down detection. `ksud` skips common, ordinary-module, MetaModule and Lua-plugin stages, then writes `disable` for ordinary modules under `/data/adb/modules/`, including the MetaModule. It is a test and recovery path for module-layer boot failures. In safe mode, the manager rejects module installation, including module ZIPs opened from a file manager or share entry. Repair the fault and leave safe mode before installing new modules.

YukiZygisk has a separate **injection safe mode**. When one named Zygote reaches the restart threshold, it suppresses YukiZygisk injection for the rest of the current kernel session. It does not turn off core root or disable ordinary modules and Lua plugins. See [YukiZygisk features and status](/en/yukizygisk/features/).

[Preinit failure protection](/en/modules/preinit/) and Kagami mount recovery have separate counters and recovery controls. Preinit runs before ordinary-module safe-mode handling. Use the dedicated preinit recovery steps for failures at that stage.

System safe mode cannot repair a mismatched KMI, a wrong flashed partition or a damaged boot image. If the device still fails with modules disabled, use [Rescue and recovery](/en/guide/rescue-bootloop/).

## Cleanup during removal

Removing a module in the manager first writes `remove`. During actual cleanup, an ordinary module calls `metauninstall.sh` if provided by the still-enabled external backend, runs its own `uninstall.sh`, then loses its configuration and directory. MetaModule is removed after ordinary modules so its backend hooks remain available. Cleanup waits for uninstall scripts; a nonzero exit is logged and deletion continues. Make cleanup repeatable and avoid waiting for network access or user input.

Full YukiSU uninstall restores and flashes the boot image first. If restoration fails, it stops and keeps tools, backups and modules. Module uninstall hooks and YukiSU file cleanup run only after successful restoration. Do not assume full uninstall skips `uninstall.sh`, and do not flash boot partitions again from a cleanup hook.

## Before installing

1. Android release, target ABI and target app version;
2. the selected mount backend and any specifically required MetaModule version;
3. dependencies on Magisk-only tools, paths or another Zygisk implementation;
4. root installers, native libraries, WebUI, init rc or Native ZN manifests in the ZIP;
5. which changes require a reboot and whether a reliable uninstall/rescue path exists;
6. trustworthy distribution, source, maintenance history and issue channel.

The module list can show both ordinary Zygisk and Native ZN labels for one module. It no longer summarizes all processes with a single “loaded” state. Enable YukiZygisk for these modules and inspect injection status for their target processes.

Source references: [module.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp), [init_event.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp), [installer.sh](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh), [module_compat.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module_compat.cpp).

Also see [ZIP](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/archive_zip.cpp), [Action](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/ModuleActionAvailability.kt), [Uninstall](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/utils.cpp).
