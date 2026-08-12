---
permalink: /en/guide/information/
title: Core concepts
---

# Core concepts

## LKM, KMI and boot images

The YukiSU kernel component is `kernelsu.ko`. GKI 2.0 or a similar-looking kernel version does not make modules interchangeable. KMI, symbol versions, configuration and vendor changes can all affect loading.

Although YukiSU is LKM-only, its boot chain must still arrange `ksuinit` and the LKM. The manager patches or installs them into the appropriate boot partition. This is different from built-in `CONFIG_KSU=y`.

## Userspace components

- `ksuinit`: early boot and LKM loading
- `ksud`: boot events, modules, policy and install tools
- `su`: userspace entry point
- `zygiskd` and libraries: YukiZygisk userspace

The manager APK embeds `ksud` and build resources. Updating the APK does not automatically prove that all installed device components were synchronized.

## Signature and SuperKey

YukiSU has two manager authentication paths: trusted APK package/signature and optional SuperKey password authentication. Dynamic manager configuration is a separate mechanism for additional trusted managers.

## Modules and mount backends

Normal modules live under `/data/adb/modules/`. YukiSU runs their lifecycle while one external MetaModule supplies the system-file mount backend. OverlayFS, bind mounts or other semantics belong to that MetaModule, not to a universal YukiSU promise.

## Feature controls

Feature IDs `0–4` are upstream-compatible: sucompat, kernel unmount, sulog, ADB root and SELinux hide. YukiSU additions start at `100`: enhanced security, Magisk-compatible authorization prompts, default `no_new_privs` and YukiZygisk. Presence in source does not mean every build and kernel enables a feature.
