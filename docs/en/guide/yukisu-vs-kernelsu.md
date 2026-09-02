---
permalink: /en/guide/yukisu-vs-kernelsu/
title: YukiSU vs KernelSU
---

# YukiSU vs KernelSU

YukiSU comes from the KernelSU ecosystem and continues to implement its public module and policy contracts. It is not merely a renamed manager. The meaningful current differences are supported release surface, userspace implementation, image backends, bundled extensions and maintenance cadence.

::: info Comparison snapshot
“Current official KernelSU” on this page was checked on **2026-09-02** at official `main` `e38512f1`; YukiSU was checked at `main` `6a7638ba`. Moving CI matrices and Feature enums link to those commits. They are not inferred from cached GitHub HTML or old documentation.
:::

## At a glance

On Android 12+ ARM64 GKI 2.0 with Linux 5.10+ and an LKM workflow, either project may be a candidate. Choose YukiSU for its C++ userspace, ImgPatch, remote-image tooling, built-in YukiZygisk, SuperKey/dynamic-manager options or 100-series Features—not because TSR is a second hook design absent from KernelSU.

Choose official KernelSU when you want its Rust userspace, release cadence and module documentation directly. For built-in, old-kernel or non-GKI requirements, do not rely on the obsolete shorthand that official mainline currently ships several ready-made modes. Check the exact branch and device maintainer because the current official build path has moved to LKM.

## Current comparison

| Area | YukiSU `6a7638ba` | Official KernelSU `e38512f1` | Result |
| --- | --- | --- | --- |
| Supported device boundary | Android 12+, ARM64, GKI 2.0, Linux 5.10+, LKM only | Official FAQ scopes official support to GKI Linux 5.10+; old/non-GKI needs source integration | Overlapping; source portability is not release support |
| CI LKM targets | Eight, `android12-5.10` through `android17-6.18` | The same eight, `android12-5.10` through `android17-6.18` | Current matrices match |
| Kernel deployment | `CONFIG_KSU=m`; Ramdisk, ImgPatch and late-load | Current official build guidance recommends DDK LKM; protocol still recognizes built-in/LKM/late-load | Current releases focus on LKM; ImgPatch is YukiSU-specific |
| Userspace | C++ `ksud`, `ksuinit` and `su` | Mainline Rust userspace | Not interchangeable |
| LKM hooks | TSR is shorthand for Tracepoint Syscall Redirect and tracks upstream LKM semantics | Tracepoint syscall hooks | Not a YukiSU-exclusive distinction |
| Official Features | Keeps IDs `0–4` compatible | Current `feature.rs` enumerates IDs `0–4` | Treat these five as upstream behavior |
| WebView Zygote unmount | Implements ID `5` in the KernelSU-reserved range | Current official `main` does not enumerate ID `5` | Not currently identical |
| YukiSU Features | IDs `100–104` | No such ID range | YukiSU extensions |
| Modules and MetaModule | Follows upstream public interfaces and single-backend contract | Official contract | Compatibility target |
| Zygisk | Optional built-in YukiZygisk | Official FAQ says no built-in Zygisk; Zygisk Next can be installed | Different deployment |
| Manager authentication | Official signature plus optional SuperKey and dynamic managers | Official manager trust mechanism | Additional YukiSU entry points |
| Image tooling | Local/remote Ramdisk patching, ImgPatch, restore and partition tools | Official `boot-patch` LKM flow | Different backends and recovery metadata |

## 1. Support is more than “5.10+”

YukiSU enforces a userspace API 31 floor, so Android 11 and older are out of scope. The device must also be ARM64 GKI 2.0, load YukiSU as `CONFIG_KSU=m`, and have a compatible LKM. Current full builds explicitly cover eight DDK targets from Android 12/5.10 through Android 17/6.18.

The current official KernelSU FAQ defines GKI Linux 5.10+ as its official support range while explaining that old/non-GKI kernels can be integrated from source. The latter does not mean official ready-to-flash images are published for every old device. Both current `build-lkm.yml` files list the same eight targets including `android17-6.18`. See [Compatibility](/en/guide/compatibility/) for YukiSU's complete boundary.

## 2. LKM-only versus the current official release path

YukiSU explicitly does not support built-in `CONFIG_KSU=y`. Its two persistent layouts are:

- traditional Ramdisk, where `ksuinit` loads the LKM from a boot Ramdisk;
- ImgPatch, where a bootstrap and LKM capsule are embedded directly in the kernel inside `boot`.

It also supports non-persistent late-load. All three still load `kernelsu.ko`; they are not different privilege levels.

Official KernelSU's installation page retains descriptions of GKI/built-in runtime and the module protocol still reports `built-in`. However, its current build page explicitly says official GKI image-mode support was dropped starting with v3.0 and recommends DDK-built LKM. Therefore “choose KernelSU for a currently shipped official built-in/GKI image” is no longer an accurate simple differentiator. Check the exact version, source-integration guidance and device-maintainer artifact for that path.

## 3. C++ userspace is the engineering fork

YukiSU implements `ksud`, `ksuinit` and `su` in C++. Its full build combines LKMs, `ksuinit`, `su`, YukiZygisk runtimes and Manager in order. `ksud` also embeds image tooling, Ramdisk Editor, Feature persistence and integrity monitoring.

Official KernelSU mainline implements the corresponding userspace primarily in Rust. Public module contracts can remain compatible while internal CLI arguments, logs, binaries, release cadence and private UAPIs differ. A useful report identifies the project, commit, LKM, Manager and actual `/data/adb/ksud` together.

## 4. Separate hooks from Features

TSR is only shorthand for **Tracepoint Syscall Redirect**. YukiSU continues to port upstream LKM behavior, including coverage after new bionic routes execution through `execveat` for ksud, sucompat, ADB root, sulog and lifecycle observation. Semantic alignment does not mean byte-identical modules; YukiSU still carries its own policy and extension code.

At this snapshot, official KernelSU `feature.rs` enumerates:

| ID | Feature |
| --- | --- |
| 0 | `SU_COMPAT` |
| 1 | `KERNEL_UMOUNT` |
| 2 | `SULOG` |
| 3 | `ADB_ROOT` |
| 4 | `SELINUX_HIDE` |

YukiSU keeps these five compatible and adds `WEBVIEW_ZYGOTE_UMOUNT` at ID `5` in the reserved range. Its own additions are:

| ID | Feature | Purpose |
| --- | --- | --- |
| 100 | `ENHANCED_SECURITY` | Restrict elevation outside YukiSU and unauthorized UID downgrade |
| 101 | `MAGISK_COMPAT` | Visible su authorization prompts for apps not pre-authorized |
| 102 | `DEFAULT_NO_NEW_PRIVS` | Apply `no_new_privs` to the default root profile |
| 103 | `YUKIZYGISK` | Control built-in YukiZygisk |
| 104 | `HIDE_BOOTLOADER` | Rewrite visible unlock/Verified Boot properties after boot completes |

See [Feature overview](/en/guide/features/) for reboot requirements and compatibility costs.

## 5. Modules and MetaModule are shared contracts

YukiSU follows official KernelSU module directories, script stages, MetaModule interfaces and the one-active-backend rule. A script/property/SELinux-only module does not need a different format solely because the project name changed. Files placed under `/system` and similar paths still need an appropriate MetaModule.

Compatibility applies to public contracts, not every module unconditionally. A module tied to an internal `ksud`, Manager WebUI, Android release, mount backend or unpublished path needs separate validation.

## 6. YukiSU-specific tradeoffs

- **YukiZygisk:** built in and optional. Official KernelSU has no built-in Zygisk and commonly uses a Zygisk Next module.
- **ImgPatch:** accepts only an AOSP `boot` containing an ARM64 kernel and has its own capsule, early-boot configuration and restore logic.
- **Remote images:** Manager can use HTTP Range to inspect an HTTPS OTA/factory ZIP or `payload.bin` and extract one selected boot partition; this entry currently uses traditional Ramdisk patching.
- **SuperKey/dynamic managers:** extend manager authentication; they are not a password for arbitrary privileged commands.
- **`ksud` integrity:** compares the APK and `/data/adb/ksud` ELF content, supports manual/optional cold-start synchronization and reports runtime replacement.

These features create useful choices and a larger coordinated update surface. If you only need the closest route to official mainline root and none of these additions, official KernelSU is the more direct choice.

## 7. Switching from KernelSU

The public module directory and MetaModule contract are shared, so `/data/adb` normally does not need to be wiped:

- built-in/replacement-kernel path: grant YukiSU Manager root from KernelSU, restore stock boot from the exact current firmware, **do not reboot**, and install YukiSU while the current session still has root;
- KernelSU LKM: use the current rooted session to select a matching LKM and Ramdisk/ImgPatch layout directly, without an intermediate unrooted boot.

ImgPatch removes known legacy KernelSU Ramdisk files. It stops on a Magisk Ramdisk or content that cannot be validated safely. Follow [Switch from KernelSU](/en/guide/switch/kernelsu/) for the full sequence.

## Which should you choose?

Choose YukiSU when you specifically need its current C++ userspace, ImgPatch/remote-image tooling, built-in YukiZygisk or authentication extensions and accept its coordinated release stack.

Choose official KernelSU when you want its Rust userspace, current official LKM flow and documentation directly, without YukiSU additions.

For an old kernel, non-GKI, built-in, emulator or unusual architecture, inspect the target project's **current commit** and device-maintainer evidence. Do not infer support from an old comparison table.

## Pinned snapshot sources

- [YukiSU `6a7638ba` KMI build matrix](https://github.com/Rouyashiki/YukiSU/blob/6a7638ba668dad17f319dc2567f30a06a4771187/.github/workflows/build-lkm.yml)
- [YukiSU `6a7638ba` Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/6a7638ba668dad17f319dc2567f30a06a4771187/uapi/feature.h)
- [KernelSU `e38512f1` KMI build matrix](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/.github/workflows/build-lkm.yml)
- [KernelSU `e38512f1` Feature enum](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/userspace/ksud/src/feature.rs)
- [KernelSU current build guidance](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/how-to-build.md)
- [KernelSU device-support FAQ](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/faq.md)
- [KernelSU module and late-load guide](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/module.md)
