---
permalink: /en/guide/information/
title: Core concepts
---

# Core concepts

## LKM, KMI, and installation layouts

`kernelsu.ko` is YukiSU's loadable kernel module. YukiSU supports `CONFIG_KSU=m`, not built-in `CONFIG_KSU=y`. Userspace requires Android 12 (API 31) or later on ARM64 GKI 2.0 devices.

KMI identifies a kernel module interface baseline, not the phone's current Android version. Two Linux 6.1 kernels can differ in symbol versions, configuration, or vendor changes. See [Compatibility](/en/guide/compatibility/).

| Runtime mode | Loading path | Persistent across boots |
| --- | --- | --- |
| Ramdisk | `ksuinit` loads the LKM from the boot Ramdisk | Yes |
| ImgPatch | A bootstrap in the `boot` kernel loads the capsule's LKM | Yes |
| late-load | LKM loaded after Android starts | No |

A [configuration-only Ramdisk patch](/en/manager/boot-config/) is a separate image operation. It does not install or replace an LKM or provide initial root by itself; an existing Ramdisk loading chain can remain.

## Kernel, userspace, and Manager

- The LKM handles authorization, kernel hooks, features, and capabilities such as Kasumi.
- `ksuinit` connects the traditional Ramdisk boot flow.
- `ksud` handles modules, policies, images, configuration, and Manager operations; it embeds components including Kagami.
- `su` is the userspace elevation entry, currently implemented in `ksud`; kernel authorization and App Profile determine whether elevation is allowed.
- Manager provides controls and diagnostics. YukiZygisk daemon/core components implement injection.

The APK's bundled `ksud` and `/data/adb/ksud` are updated separately. Manager checks the actual ELF and offers manual synchronization. Automatic synchronization is off by default. When enabled, it checks and synchronizes at app cold start only if the kernel already recognizes Manager's identity. Without that identity, it skips the attempt; synchronize manually after authentication. This does not update the LKM or boot images.

## Modules, MetaModules, Kagami, and Kasumi

Ordinary modules live under `/data/adb/modules/` and can contain scripts, properties, policies, WebUI, and system files. `ksud` runs scripts, the mount backend handles system files, and the injection runtime loads Zygisk libraries. Read the logs for the component responsible for the failed operation.

Kagami is the built-in mounting implementation. An enabled external MetaModule providing `metamount.sh` takes precedence. Kasumi provides kernel capabilities for su entries, mount views, and path rules; it is separate from MetaModules and YukiZygisk.

One-shot scripts execute a task and record its result without becoming installed modules. Preinit stages early actions for the next full boot. See [Module system](/en/modules/overview/).

## Authorization and authentication

Manager authentication determines which manager the kernel trusts; app authorization determines which app may obtain root. SuperKey authenticates a manager UID through `prctl`; it is not a general root password. Dynamic managers allow additional trusted signatures. Compatibility overrides do not change actual versions or capabilities.

## Features and views

There are 13 defined feature IDs: `0–4`, `6`, and `101–107`. They cover su entries, unmount policy, logs, ADB, SELinux views, shell-session restrictions, YukiZygisk, and Kasumi. Boot-forced features cannot be changed directly at runtime. See [Feature controls](/en/manager/feature-control/).

UTS View changes reported system identity without replacing the kernel. Property hiding does not relock the bootloader. Mount-view cleanup does not revoke existing root processes. Inspect files from the target app process when checking visibility.
