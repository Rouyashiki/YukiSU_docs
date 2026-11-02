---
permalink: /en/guide/yukisu-vs-kernelsu/
title: YukiSU vs KernelSU
---

# YukiSU vs KernelSU

YukiSU keeps KernelSU-style authorization and module workflows, provides its own C++ userspace, and embeds Kagami, Kasumi, and YukiZygisk. You can use built-in mounting and Zygisk without installing separate runtimes, while retaining an existing external MetaModule.

## Main differences

| Area | YukiSU | Official KernelSU |
| --- | --- | --- |
| Supported devices | Android 12+, ARM64, GKI 2.0, LKM | Official support targets GKI Linux 5.10+; other kernels need source integration |
| Standard KMI builds | Eight targets, `android12-5.10` through `android17-6.18` | The same eight targets |
| Userspace | C++ `ksud` (including su) and `ksuinit` | Mainline `ksud` uses Rust |
| Persistent loading | Ramdisk and ImgPatch, both using an LKM | Official ready-made builds focus on LKM; the old GKI-image build guide is archived |
| System-file mounting | Built-in Kagami, with external MetaModule precedence | Official module flow uses a MetaModule for file mounting |
| Zygisk | Optional built-in YukiZygisk | External runtime; no built-in Zygisk |
| Features | `0–4`, `6`, and `101–107` | `0–4` and `6`; `5` remains unused |
| Extensions | Kasumi, SuperKey, dynamic-manager compatibility, UTS View, ImgPatch, partition tools | These YukiSU private interfaces are not provided |

Official support, mounting, and Zygisk statements come from the pinned [FAQ](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/website/docs/guide/faq.md); see the [build guide](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/website/docs/guide/how-to-build.md) for release-build scope. For either project, install an LKM matching the target kernel’s KMI, symbols, and configuration.

## Hooks and features

TSR means Tracepoint Syscall Redirect. YukiSU follows the KernelSU LKM syscall-hook model with its own policies and extensions. This is not another level of root and does not make `.ko` or `ksud` binaries interchangeable.

Both projects leave historical WebView feature ID 5 unused. YukiSU v1.8.0 configures WebView unmounting through the WebView Zygote app profile and removes Enhanced security ID 100. ID 6 restricts trusted session origins after shell is authorized. YukiSU IDs 105–107 cover Kasumi su, the Kasumi switch, and mount-view cleanup. See [Feature controls](/en/manager/feature-control/).

## Module compatibility

YukiSU supports KernelSU-style module directories, scripts, and MetaModule contracts, plus one-shot scripts, hot installation, and preinit. Check the module's actual Manager APIs, installer environment, mount backend, Android version, and ABI requirements.

Mounting is an important difference: without an enabled external `metamount.sh`, YukiSU invokes built-in Kagami. Upstream instructions requiring a separate MetaModule therefore do not apply unchanged. An existing external MetaModule can remain, but verify its mounts. See [Module mounting](/en/modules/magic-mount/).

## When compatibility values help

Use compatibility values when a manager or module rejects YukiSU solely because of a version check. Dynamic-manager values are configured per signature; module-installation values are global. If the caller needs an unimplemented command or private interface, changing a version value will not fix it; its integration code must be updated.

Use each project's matching APK, `ksud`, and LKM. For migration, follow [Switching from KernelSU](/en/guide/switch/kernelsu/) and check existing authorization, modules, and backends.

## Compared versions and source code

This comparison covers YukiSU v1.8.0 (`9d046af4`) and KernelSU mainline snapshot `28db74f6`, checked on 2026-11-02. For older builds, read that version’s release notes first.

- [YukiSU features](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h)
- [YukiSU mount selection](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp)
- [KernelSU feature definitions](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/userspace/ksud/src/feature_id.rs)
- [KernelSU KMI matrix](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/.github/workflows/build-lkm.yml)
