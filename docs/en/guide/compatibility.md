---
permalink: /en/guide/compatibility/
title: Compatibility
---

# Compatibility

Your device must meet every requirement below and use an LKM built for the target kernel.

## Supported devices

Device requirements:

- Android 12 (API 31) or newer;
- an ARM64 device;
- GKI 2.0 on Linux 5.10 or newer;
- loadable-module support: `CONFIG_MODULES=y` and YukiSU as `CONFIG_KSU=m`;
- `CONFIG_KPROBES=y`, `CONFIG_KRETPROBES=y` and `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`;
- an LKM compatible with the target kernel's KMI, vermagic, symbol versions and configuration.

Android 11 and older, GKI 1.0, non-GKI, ARM32, x86_64 and built-in `CONFIG_KSU=y` are outside YukiSU's supported scope. Use another root solution on these devices; do not force-load a YukiSU LKM.

## KMIs included in v1.8.0

The [v1.8.0 release](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0) provides LKMs named `<KMI>_kernelsu.ko` for these eight targets. Full repository builds use the same set:

| KMI target | GKI generation |
| --- | --- |
| `android12-5.10` | Android 12 / 5.10 |
| `android13-5.10` | Android 13 / 5.10 |
| `android13-5.15` | Android 13 / 5.15 |
| `android14-5.15` | Android 14 / 5.15 |
| `android14-6.1` | Android 14 / 6.1 |
| `android15-6.6` | Android 15 / 6.6 |
| `android16-6.12` | Android 16 / 6.12 |
| `android17-6.18` | Android 17 / 6.18 |

This is a **build-target matrix**, not a direct mapping from the installed Android release to an LKM. A device may keep an older kernel KMI after an Android upgrade. Read KMI from the running kernel or the `boot` image being patched; do not select it from the Android version shown in Settings.

An official full Manager build packages all eight LKMs as `ksud` resources. A local single-target build made with `scripts/build.* -k <KMI>` contains only that target. If no bundled asset matches, the manager can accept a device-specific `.ko`; that does not waive kernel ABI requirements.

::: warning Linux 5.10+ is not a universal-module promise
Bundled LKMs target standard GKI. If a vendor changes exported symbols, signing requirements, vermagic, or kernel configuration, use an LKM built for that kernel instead of force-loading a bundled one.
:::

## Pre-install checks

These read-only commands provide a useful first record:

```sh
adb shell getprop ro.build.version.sdk
adb shell uname -m
adb shell uname -r
```

`uname -r` often exposes a KMI line such as `android14-6.1`, but a vendor-modified release should still be checked against the target image. Traditional Ramdisk patching resolves KMI from the current slot, inactive slot or selected image. When an embedded LKM is requested, the detected value must exist in the packaged resource list; otherwise the manager asks for an explicit choice instead of silently guessing.

Also verify separately:

1. whether the target is the current slot or the post-OTA inactive slot;
2. whether traditional Ramdisk mode belongs in `boot`, `init_boot` or another Ramdisk partition actually present on the device;
3. that ImgPatch is used only with an AOSP `boot` image containing an ARM64 kernel;
4. that a stock image, recovery command and correct slot are known before writing.

See [Installation and image modes](/en/guide/install-modes/), [Build guide](/en/dev/build/) and [Kernel integration](/en/dev/integration/) for the next steps.

## Source code

- [Local/CI KMI matrix](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/.github/workflows/build-lkm.yml)
- [Windows full-build script](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.ps1)
- [Linux/macOS full-build script](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.sh)
- [Compile-time API 31 userspace floor](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/common/api_floor.hpp)
