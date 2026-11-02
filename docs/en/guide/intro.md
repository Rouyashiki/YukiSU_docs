---
permalink: /en/guide/intro/
title: Introduction
---

# Introducing YukiSU

This site targets **v1.8.0 (2026-11-02)**, with Manager version code **10670**. Interface controls, command arguments, and configuration behavior are documented for this release.

YukiSU is a kernel-level root solution for **Android 12+ ARM64 GKI 2.0** devices, forked from [SukiSU-Ultra](https://github.com/ShirkNeko/SukiSU-Ultra). It combines an LKM, C++ userspace, and its own Manager while supporting KernelSU-style authorization, App Profile, and modules.

New to YukiSU? Start with [Get started](/en/guide/get-started/). Existing users should follow [Updating](/en/guide/update/) and check configuration migration.

## Components

| Component | Responsibility |
| --- | --- |
| `kernelsu.ko` | Kernel authorization, hooks, features, App Profile, and Kasumi |
| `ksuinit` / ImgPatch bootstrap | Load the LKM through the Ramdisk or kernel-image layout |
| `ksud` and `su` | Modules, installation, policies, diagnostics, and userspace elevation |
| Manager | Authorization, configuration, installation, modules, and partition tools |
| Built-in Kagami / external MetaModule | Mount module files over system paths |
| YukiZygisk | Optional Zygisk and Native ZN injection runtime |

If root works but a Zygisk module does not, open YukiZygisk and check injection for the target process. If module scripts run but files do not change, check Kagami or MetaModule logs and the target app’s mount namespace.

## Device scope

| Area | Requirement |
| --- | --- |
| Android | Android 12 (API 31) or later |
| Architecture | ARM64 |
| Kernel | GKI 2.0, Linux 5.10 or later |
| Deployment | LKM, `CONFIG_KSU=m` |
| Kernel facilities | `CONFIG_MODULES=y`, Kprobes, Kretprobes, and syscall tracepoints |

Android 11 and earlier, GKI 1.0, non-GKI, ARM32, x86_64, and built-in `CONFIG_KSU=y` are unsupported. YukiZygisk's 32-bit components serve 32-bit apps on ARM64 devices; they do not add ARM32 device support.

Full builds maintain eight standard KMI targets from `android12-5.10` to `android17-6.18`. Select an LKM by actual KMI, vermagic, symbols, and configuration, not the phone's Android version. See [Compatibility](/en/guide/compatibility/).

## Current capabilities

- App authorization and App Profile, including structured backup restoration.
- Ramdisk, ImgPatch, and temporary late-load, plus configuration-only Ramdisk patches that preserve any existing LKM instead of installing or replacing one.
- Built-in Kagami mounting with external MetaModule precedence; built-in Kasumi for su, path rules, and mount views.
- Ordinary modules, one-shot scripts, opt-in hot installation, and early preinit actions.
- Fifteen features, forced boot configuration, optional SuperKey, dynamic managers, and UTS View.
- YukiZygisk load policies, process monitoring, exit evidence, and crash protection.
- Remote-image extraction, partition backups, AVB controls, text/binary Ramdisk editing, and diagnostic export.

See [Feature overview](/en/guide/features/) and the [KernelSU comparison](/en/guide/yukisu-vs-kernelsu/).

## Important distinctions

Installing an APK does not load the LKM. Synchronizing `ksud` does not update boot images. TSR follows KernelSU LKM's tracepoint syscall-redirect model, but the projects' binaries and private interfaces are not interchangeable.

SuperKey authenticates a manager UID; it is not an app root password. YukiZygisk can be disabled while basic root and ordinary modules remain available. Installation, mounting, and a module's intended effect require separate checks.

Choose an LKM matching the target KMI, then select modules for the Android version, ABI, and interfaces listed by their authors. For failures, include complete LKM, installed `ksud`, and Manager versions and follow [Troubleshooting](/en/troubleshoot/common/).

## Documentation and community

- [Installation and image modes](/en/guide/install-modes/)
- [Module system](/en/modules/overview/)
- [Manager](/en/manager/overview/)
- [Troubleshooting](/en/troubleshoot/common/)
- [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues) · [Telegram](https://t.me/manosaba)

`kernel/` uses GPL-2.0-only. Other YukiSU-owned code uses GPL-3.0-or-later; third-party components retain their own licenses. See the project and Manager license notices.
