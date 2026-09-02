---
permalink: /en/guide/information/
title: Core concepts
---

# Core concepts

## LKM, KMI and boot images

The YukiSU kernel component is `kernelsu.ko`. GKI 2.0 or a similar-looking kernel version does not make modules interchangeable. KMI, symbol versions, configuration and vendor changes can all affect loading.

In the traditional Ramdisk layout, the boot chain places `ksuinit` and the LKM in an appropriate boot image. ImgPatch instead embeds a bootstrap and LKM capsule directly in the kernel inside `boot`. Both remain `CONFIG_KSU=m`; only their loading layout differs from each other and from built-in `CONFIG_KSU=y`.

Userspace requires Android 12 (API 31) or newer. A current full build packages standard KMI targets from `android12-5.10` through `android17-6.18`; see [Compatibility](/en/guide/compatibility/) for all eight. A KMI name identifies the kernel baseline, not necessarily the Android version currently installed on the phone.

## Three load states

| Manager state | LKM source | Persistent |
| --- | --- | --- |
| Ramdisk | `ksuinit` loads the `.ko` from a boot Ramdisk | Yes |
| ImgPatch | a bootstrap in the `boot` kernel loads an LKM capsule | Yes |
| late-load | `ksud` loads the LKM after Android has booted | No; lost at reboot |

Ramdisk and ImgPatch have different inputs, partitions and restore paths. See [Installation and image modes](/en/guide/install-modes/).

## Userspace components

- `ksuinit`: early boot and LKM loading
- `ksud`: boot events, modules, policy and install tools
- `su`: userspace entry point
- `zygiskd` and libraries: YukiZygisk userspace

The manager APK embeds one `ksud`, while `/data/adb/ksud` is a separately installed binary. The manager compares their actual ELF content rather than only a version string. The home page can synchronize it manually; the cold-start auto-update option is off by default. Runtime replacement of the installed path is recorded and surfaced as an integrity alert.

This synchronization changes only `/data/adb/ksud`; it does not rewrite a boot image, replace the LKM or reboot the device.

## Signature and SuperKey

YukiSU has two manager authentication paths: trusted APK package/signature and optional SuperKey password authentication. Dynamic manager configuration is a separate mechanism for additional trusted managers.

## Modules and mount backends

Normal modules live under `/data/adb/modules/`. YukiSU runs their lifecycle while one external MetaModule supplies the system-file mount backend. OverlayFS, bind mounts or other semantics belong to that MetaModule, not to a universal YukiSU promise.

## Feature controls

The current 11 formal Features occupy two ranges. IDs `0–4` remain compatible with official KernelSU: sucompat, kernel unmount, sulog, ADB root and SELinux hide. ID `5` is WebView Zygote unmount in the KernelSU-reserved range. YukiSU additions `100–104` are enhanced security, Magisk-compatible authorization prompts, default `no_new_privs`, YukiZygisk and unlock-state hiding.

They are grouped in the manager's Feature controls page. Presence in source does not make a feature supported by every running kernel; use the runtime report and the actual `ksud` save result.
