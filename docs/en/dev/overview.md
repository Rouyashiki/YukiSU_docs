---
permalink: /en/dev/overview/
title: Developers
---

# Developers

The source lives at [Anatdx/YukiSU](https://github.com/Anatdx/YukiSU). Identify whether a change belongs to the kernel, userspace, YukiZygisk, manager or WebUI before selecting a toolchain and validation path.

| Directory | Main content |
| --- | --- |
| `kernel/` | LKM, policy, hooks and kernel extensions |
| `uapi/` | Shared kernel/userspace UAPI |
| `userspace/ksud/` | C++ daemon, modules and image tools |
| `userspace/ksuinit/` | Early boot loader |
| `userspace/su/` | su client |
| `userspace/zygisk/` | YukiZygisk daemon, core and API |
| `manager/` | Android manager |
| `js/` | Module WebUI JavaScript package |
| `scripts/` | Windows/Linux full-build entry points |

- [Kernel integration](/en/dev/integration/)
- [Build guide](/en/dev/build/)
- [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/)

Public UAPI and CLI behavior may still change between YukiSU versions. Third-party tooling should pin a matching release or commit.
