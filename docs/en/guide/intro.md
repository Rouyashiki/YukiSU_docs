---
permalink: /en/guide/intro/
title: Introduction
---

# Introducing YukiSU

These guides cover **v1.9.0**, released November 16, 2026, with Manager version code **10745**. The app has a new package name and signing certificate. If you already have YukiSU installed, Android will show a second Manager icon. [v1.9.0 release notes](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.9.0)

YukiSU lets you choose which apps get root on a supported Android device. Its Manager also installs modules and patches boot images. YukiSU grew out of [SukiSU-Ultra](https://github.com/SukiSU-Ultra/SukiSU-Ultra) and supports KernelSU-style app grants and modules.

New to YukiSU? Start with [Get started](/en/guide/get-started/). If you have an older Manager, follow the [upgrade guide](/en/guide/update/) to keep your settings and backups at hand as you switch.

## Components

| Component | Responsibility |
| --- | --- |
| `kernelsu.ko` | The kernel module (LKM) enforces root grants, app profiles, and Kasumi rules |
| `ksuinit` / ImgPatch bootstrap | Load the LKM through the Ramdisk or kernel-image layout |
| `ksud` and `su` | `ksud` handles installation, runs modules, and collects diagnostics. Apps request root through `su`. |
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

The release provides eight kernel modules, from `android12-5.10` to `android17-6.18`. A phone can keep the same kernel when it updates Android. Use the kernel’s KMI identifier to find its matching module in [Compatibility](/en/guide/compatibility/).

## Current capabilities

- App authorization and App Profile, including structured backup restoration.
- Ramdisk, ImgPatch, and temporary late-load, plus configuration-only Ramdisk patches that preserve any existing LKM instead of installing or replacing one.
- Built-in Kagami mounting with external MetaModule precedence; built-in Kasumi for su, path rules, and mount views.
- Ordinary modules, one-shot scripts, opt-in hot installation, and early preinit actions.
- Thirteen features, forced boot configuration, optional SuperKey, dynamic managers, and UTS View.
- YukiZygisk load policies, process monitoring, exit evidence, and crash protection.
- Remote-image extraction, partition backups, AVB controls, text/binary Ramdisk editing, and diagnostic export.

See [Feature overview](/en/guide/features/) and the [KernelSU comparison](/en/guide/yukisu-vs-kernelsu/).

## Important distinctions

Installing the APK gives you the Manager. Apps can request root once you load a matching LKM. Syncing `ksud` updates the userspace tools. To replace the LKM in your boot image, patch the image and fully reboot.

The official Manager uses its signing certificate for authentication. Custom builds can also use SuperKey. You grant root to individual apps on the Superuser page. Enable YukiZygisk if you use Zygisk modules.

Before installing a module, check the Android version, ABI, and interfaces its author lists. If you report an issue, include the full versions of the Manager, the running LKM, and the installed `ksud`. [Troubleshooting](/en/troubleshoot/common/)

## Documentation and community

- [Installation and image modes](/en/guide/install-modes/)
- [Module system](/en/modules/overview/)
- [Manager](/en/manager/overview/)
- [Troubleshooting](/en/troubleshoot/common/)
- [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues) · [Telegram](https://t.me/manosaba)

`kernel/` uses GPL-2.0-only. Other YukiSU-owned code uses GPL-3.0-or-later; third-party components retain their own licenses. See the project and Manager license notices.
