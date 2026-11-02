---
permalink: /en/dev/overview/
title: Developers
---

# Developers

This chapter targets **YukiSU v1.8.0**. The source lives at [Rouyashiki/YukiSU](https://github.com/Rouyashiki/YukiSU). Use the directory map below to locate the component and choose its build entry point.

| Directory | Main content |
| --- | --- |
| `kernel/` | LKM, policy, hooks and kernel extensions |
| `uapi/` | Shared kernel/userspace UAPI |
| `userspace/common/` | Shared C++ build constraints, including the compile-time Android API 31 floor |
| `userspace/ksud/` | C++ daemon, modules and image tools |
| `userspace/ksuinit/` | Early boot loader |
| `userspace/ksud/src/su.cpp` | su command handling |
| `userspace/busybox/` | BusyBox built separately and packaged in the APK |
| `userspace/zygisk/` | YukiZygisk daemon, core and API |
| `manager/` | Android manager |
| `js/` | Module WebUI JavaScript package |
| `scripts/` | Windows/Linux full-build entry points |

## Documentation entry points

- [Compatibility](/en/guide/compatibility/): supported Android 12/API 31 through Android 17/6.18 boundary and KMI matrix
- [Kernel integration](/en/dev/integration/)
- [Build guide](/en/dev/build/)
- [Boot-image commands](/en/dev/boot-images/): `boot-info`, traditional `boot-patch`, ImgPatch `boot-patch-v2` and restore boundaries
- [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/)

## Starting from the `ksud` CLI

Current `ksud help` exposes command families for module, plugin, late-load, soft-reboot, feature, uts-view, yzctl, dynamic manager, boot patch/info/restore, Ramdisk Editor, flash, profile and sepolicy operations. Query module preinit with `ksud module preinit status --json`; see [YukiZygisk features and status](/en/yukizygisk/features/) for its configuration and recovery commands. List the commands and boot-patch options provided by your build:

```sh
ksud help
ksud boot-patch --help
```

Help syntax varies by command. Do not invoke a command that changes the system just to look for its usage text.

See [Boot-image commands](/en/dev/boot-images/) for image parameters and [YRCP v3](/en/dev/ramdisk-protocol/) for the Ramdisk binary protocol. For other commands, use help from the exact build and [`userspace/ksud/src/cli.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli.cpp). Third-party tools should pin a YukiSU commit or release, check command exit status, and use JSON output where the command provides it.

When upgrading the dependency, recheck the UAPI, command arguments and response fields your tool uses. See the [Build guide](/en/dev/build/) for build and device-test steps.

## Features and the default root environment

v1.8.0 defines 13 features. Former IDs `5` and `100` are removed and remain reserved. App profiles now control WebView unmounting; do not write the retired `webview_zygote_umount` or `enhanced_security` settings.

Read the live kernel value and saved configuration separately:

```sh
ksud feature get default_no_new_privs
ksud feature get default_no_new_privs --config
```

The default root SELinux domain is `u:r:ksu:s0`, and feature 102 enables the default Root Profile's anti-escape flag. Tools should read the actual App Profile and runtime identity instead of hard-coding the old `su` domain. See [App profiles](/en/manager/app-profile/) and [Feature controls](/en/manager/feature-control/) for custom profiles and configuration migration.

## Temporary loading and unloading

With permission to load modules and YukiSU not yet loaded, select an embedded KMI explicitly:

```sh
ksud boot-info supported-kmis
ksud late-load --kmi android14-6.1
```

`--kmi` selects this `ksud` build's embedded `<KMI>_kernelsu.ko`; it does not take a `.ko` path or relax kernel compatibility requirements. Omitting it uses detection. The separate `--magica` bootstrap branch does not use this KMI argument. Late-load continues in the background, so command return does not mean module stages finished; inspect logs and Manager runtime state. See [Jailbreak mode](/en/guide/jailbreak-mode/) for prerequisites.

`ksud unload` is for development and recovery. It stops Android services, terminates processes holding YukiSU driver resources or running in the `ksu` domain, attempts LKM removal, then restarts Android services. It requires matching UAPI, an LKM advertising safe-unload support, and confirmation that Kasumi has not initialized. Initialized or indeterminate Kasumi state blocks unload. Inspect failures rather than forcing `rmmod`. The command does not remove the installation from boot images; a full reboot follows the existing boot loading chain.

Use `ksud soft-reboot-status --json` to query support and the last result. `ksud soft-reboot` restarts Android and replays the corresponding module stages; it neither reloads the kernel nor executes preinit.

- [CLI arguments](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli_args.cpp)
- [Temporary loading](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/late_load.cpp)
- [Guarded unload](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/unload.cpp)
- [Feature configuration and migration](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp)
