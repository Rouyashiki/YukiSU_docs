---
permalink: /en/dev/overview/
title: Developers
---

# Developers

The source lives at [Rouyashiki/YukiSU](https://github.com/Rouyashiki/YukiSU). Identify whether a change belongs to the kernel, userspace, YukiZygisk, manager or WebUI before selecting a toolchain and validation path.

| Directory | Main content |
| --- | --- |
| `kernel/` | LKM, policy, hooks and kernel extensions |
| `uapi/` | Shared kernel/userspace UAPI |
| `userspace/common/` | Shared C++ build constraints, including the compile-time Android API 31 floor |
| `userspace/ksud/` | C++ daemon, modules and image tools |
| `userspace/ksuinit/` | Early boot loader |
| `userspace/su/` | su client |
| `userspace/zygisk/` | YukiZygisk daemon, core and API |
| `manager/` | Android manager |
| `js/` | Module WebUI JavaScript package |
| `scripts/` | Windows/Linux full-build entry points |

- [Compatibility](/en/guide/compatibility/): supported Android 12/API 31 through Android 17/6.18 boundary and KMI matrix
- [Kernel integration](/en/dev/integration/)
- [Build guide](/en/dev/build/)
- [Boot-image commands](/en/dev/boot-images/): `boot-info`, traditional `boot-patch`, ImgPatch `boot-patch-v2` and restore boundaries
- [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/)

## Starting from the `ksud` CLI

Current `ksud help` exposes command families for module, plugin, late-load, soft-reboot, feature, uts-view, yzctl, dynamic manager, boot patch/info/restore, Ramdisk Editor, flash, profile and sepolicy operations. This site does not duplicate a complete option table that would drift quickly:

```sh
ksud help
ksud <command>
ksud boot-patch --help
```

Not every command family accepts one universal `--help` form; no-argument behavior and exit status are part of each command's contract.

High-risk boot-image commands have a maintained [Boot-image commands](/en/dev/boot-images/) page, while the Ramdisk binary protocol has its own [YRCP v3](/en/dev/ramdisk-protocol/) page. For other commands, use help from the exact build and [`userspace/ksud/src/cli.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/cli.cpp) as sources of truth. Third-party tooling should pin a YukiSU commit and inspect exit status instead of parsing only human-readable output.

Public UAPI and CLI behavior may still change between YukiSU versions. A host build is only build evidence; device behavior needs deployed hashes, runtime state and logs.
