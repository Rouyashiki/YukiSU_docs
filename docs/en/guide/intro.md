---
permalink: /en/guide/intro/
title: Introduction
---

# Introducing YukiSU

YukiSU is a kernel-level Android root solution for **ARM64 GKI 2.0** devices, forked from [SukiSU-Ultra](https://github.com/ShirkNeko/SukiSU-Ultra). It keeps KernelSU authorization, App Profile, modules and MetaModule compatibility, while shipping its own C++ userspace, manager and additions such as YukiZygisk and SuperKey.

In one sentence: **YukiSU is an LKM-only, KernelSU-compatible root solution that does not stop at repackaging upstream.**

It is not only `kernelsu.ko`, and it is not only a manager APK. A working setup combines the kernel module, `ksud`, the manager, ordinary modules and optional YukiZygisk.

## Why YukiSU exists

The goal was never just another screen that grants root. YukiSU makes a few deliberate choices:

- **Root belongs in the kernel.** The caller, resulting identity and available capabilities should be explicit.
- **Userspace is maintained here.** C++ `ksud`, `ksuinit` and `su` let installation, modules, diagnostics and new features evolve together.
- **Upstream compatibility should not be broken for novelty.** LKM hooks, Features 0–4, the module lifecycle and MetaModule follow official KernelSU contracts.
- **Extras remain optional.** YukiZygisk, SuperKey, dynamic managers, Features 100–103 and UTS View are additions, not dependencies of basic root.
- **The manager should do real work.** It handles grants and modules, but also LKM installation, partition backups, ramdisk editing and diagnostics.

This separation makes troubleshooting simpler. Root works but a Zygisk module does not? Start with YukiZygisk. Scripts run but files are absent? Check MetaModule before rebuilding the LKM.

## Supported devices

| Area | Requirement |
| --- | --- |
| Architecture | ARM64 |
| Kernel | GKI 2.0, Linux 5.10 or newer |
| Installation | LKM only, `CONFIG_KSU=m` |
| Kernel facilities | `CONFIG_KPROBES=y`, `CONFIG_KRETPROBES=y`, `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y` |

GKI 1.0, non-GKI, ARM32, x86_64 and built-in `CONFIG_KSU=y` are not supported. YukiZygisk includes 64-bit and 32-bit runtimes for app processes on an ARM64 phone; that does not add ARM32 device support.

::: warning Matching the major kernel version is not enough
KMI, symbol versions, vermagic, configuration and vendor changes still have to match. Loading a random `kernelsu.ko` merely because both devices say “6.1” is an excellent way to turn a clear compatibility error into a boot problem.
:::

## What runs where

| Component | Job |
| --- | --- |
| `kernelsu.ko` | Kernel authorization, hooks, App Profile and Features |
| `ksuinit` | Connect the LKM to the early boot environment |
| `ksud` | Modules, installation, SELinux handling and manager backend |
| `su` | Open an elevated session for an authorized caller |
| YukiSU Manager | Status, grants, modules, LKM install, backups and diagnostics |
| MetaModule | Mount module files into system paths |
| YukiZygisk | Inject Zygote and load compatible Zygisk Next modules |

Use the same order when debugging: LKM and manager authentication first, then `ksud` and root grants, then MetaModule, and YukiZygisk last. An APK that opens proves only that the APK was installed.

## Common misunderstandings

### LKM-only does not mean LKM-only functionality

YukiSU does not support built-in integration. The C++ userspace, manager, modules and optional additions are still a complete stack.

### TSR is not a private hook design

TSR is shorthand for **Tracepoint Syscall Redirect**. The actual hook is identical to official KernelSU LKM; the shorter name simply fits better in UI and logs.

### MetaModule is not forked either

YukiSU follows the official KernelSU MetaModule interface, scripts and ordering. A working MetaModule can remain installed when switching from KernelSU.

### YukiZygisk is a bonus, not the foundation

Enable it when you need Zygisk modules. Root, App Profile, ordinary modules and MetaModule continue to work when it is off.

### SuperKey is not a root password

It establishes the manager UID. It neither grants applications root nor implements the KernelPatch/APatch NR45 command plane. Most users of the official manager should leave it empty.

## Who it is for

YukiSU is aimed at users who know what boot images, slots, GKI and KMI are—or are willing to check before touching them. It suits people who want to try a more aggressive modern design without blindly experimenting on a device they cannot recover.

Technical users still deserve readable documentation. Kernel knowledge is not a reason to tolerate corporate prose.

## What YukiSU does not promise

It does not guarantee every integrity check, every Magisk/KernelSU module or every Zygisk module. The device kernel, Android release, selected MetaModule and each module implementation still matter.

When reporting a problem, include YukiSU's own LKM, `ksud` and manager versions instead of writing only “KernelSU failed.”

## Where next

- Installing: [Get started](/en/guide/get-started/)
- Choosing between projects: [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/)
- Trying it temporarily: [Jailbreak mode](/en/guide/jailbreak-mode/)
- Installing modules: [Module system](/en/modules/overview/) and [MetaModule](/en/modules/meta-module/)
- Troubleshooting: [Common troubleshooting](/en/troubleshoot/common/)

## License and community

- `kernel/`: GPL-2.0-only
- Other YukiSU-owned code: GPL-3.0-or-later
- Project: [YukiSU README](https://github.com/Anatdx/YukiSU/blob/main/README.md)
- Telegram: [t.me/manosaba](https://t.me/manosaba)
- Issues: [GitHub Issues](https://github.com/Anatdx/YukiSU/issues)
