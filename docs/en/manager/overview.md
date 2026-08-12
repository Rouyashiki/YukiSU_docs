---
permalink: /en/manager/overview/
title: Manager
---

# YukiSU Manager

YukiSU Manager is an Android app built with Kotlin and Jetpack Compose. It combines runtime state, app authorization, modules, YukiZygisk, LKM installation and device-maintenance tools, communicating with kernel-side YukiSU through `ksud`.

The manager is not root itself. Installing the APK only provides the interface. Grants and most tools require a compatible YukiSU LKM in the boot chain, successful authentication and working userspace.

## Where the manager fits

```text
User action
   ↓
YukiSU Manager
   ↓ authentication and requests
ksud / su
   ↓
kernelsu.ko
```

Module installation, image patching and diagnostics also pass through `ksud`. MetaModule and YukiZygisk are additional layers controlled from the manager but with independent runtime states.

This explains why an APK can open normally while still showing “not installed” or unavailable pages. A visible UI does not prove that the kernel, authentication and userspace chain is connected.

## Home: read status before acting

Layouts change between releases, but the important states are:

| State | Question answered | First check on failure |
| --- | --- | --- |
| Kernel and device | Is architecture/kernel in scope? | ARM64, GKI 2.0, Linux 5.10+ |
| YukiSU / LKM | Did the kernel recognize YukiSU, and which full version? | Boot image, KMI and LKM load log |
| Hook | Are TSR and related runtime facilities ready? | Kernel config, tracepoints and first kernel error |
| Manager authentication | Does the kernel trust this APK? | Package/signature, SuperKey and device clock |
| `ksud` | Which embedded and installed userspace versions are active? | Synchronization and mixed builds |
| MetaModule | Is an active mount backend available? | Disabled/pending states and boot logs |
| YukiZygisk | Is it supported, enabled and running? | Master switch, safe mode and diagnostics |

A home screenshot is a useful summary, but not a replacement for the full version strings and logs in a report.

## Superuser: grants are not a permanent global switch

The Superuser page lists applications that requested or can receive policy. Each app can be allowed or denied root, with App Profile for finer behavior.

### Before granting

- verify package name and source;
- understand why root is required and whether scope can be reduced;
- check for background services or remote interfaces;
- re-evaluate trust after application updates.

A root grant gives an app extensive control over the device. Do not approve a request merely because it appeared, and remove stale test grants.

### App Profile

App Profile controls UID/GID, supplementary groups, capabilities, SELinux domain, namespaces and `no_new_privs`. It enables advanced isolation and least privilege, but a wrong value can crash an app or hide storage from it. Read [App Profile](/en/manager/app-profile/).

### Module unmount policy

Per-app module-unmount policy affects which module mounts are visible in an app namespace. It is not the same as revoking root and does not guarantee that the app cannot observe other device-state signals.

## Modules: inspect ordinary modules and MetaModule together

The Modules page can:

- install a module ZIP;
- show name, version, author and description;
- enable, disable, update and remove modules;
- trigger `action.sh`;
- open module WebUI;
- identify the active MetaModule and pending state.

Many state changes complete after a reboot. A card appearing after installation only proves that installer content was written. Scripts, mounts and final behavior must be verified separately through the [Module system](/en/modules/overview/).

Remove the current MetaModule and reboot before installing a replacement. Do not keep batch-installing ordinary modules while the backend is pending update or removal.

## YukiZygisk

The YukiZygisk page controls YukiSU's optional built-in Zygisk implementation:

- enable or disable the feature;
- display support and runtime state;
- list discovered modules;
- show Zygote, injection and module counts;
- export diagnostics retained across reboots;
- report safe mode after consecutive crashes.

YukiZygisk is more than a UI toggle: after it is enabled, YukiSU still has to complete Zygote injection and module loading. Verify the result against the target process and actual module behavior. See [YukiZygisk introduction](/en/yukizygisk/intro/).

## LKM patch and installation

| Function | Use | Main risk |
| --- | --- | --- |
| Direct install | Update current slot from an already rooted environment | Wrong partition or mismatched current image |
| Install to inactive slot | Carry YukiSU into a post-OTA A/B slot | Wrong slot or changed OTA state |
| Patch selected image | Generate an output containing YukiSU LKM | Input is not exact firmware or wrong image type |
| Select local `.ko` | Device-specific or self-built LKM | KMI, symbol or config mismatch |
| Bundled KMI resource | Use a resource shipped with the manager | Choosing a similarly named but incompatible build |

The manager can provide detection and recommendations; the user still owns the final write target. Complete the recovery checklist in [Get started](/en/guide/get-started/) first.

## Jailbreak mode

When YukiSU is not active, SELinux is Permissive and the manager contains a matching-KMI LKM, Home can offer Jailbreak mode. It follows upstream late-load behavior to establish YukiSU after Android has booted. An existing root shell runs `ksud late-load` directly; otherwise Magica provides the initial bootstrap.

This is not a persistent installation, and the early module entry changes from `post-fs-data.sh` to `late-load.sh`. Read [Jailbreak mode](/en/guide/jailbreak-mode/) for requirements, stage differences and auto-jailbreak.

## Partition Manager

Partition Manager can inspect partitions, create backups, write images and run supported AnyKernel3 packages.

### Inspect and back up

Inspection is read-only. A backup reads device content into a file. Verify the file size, location and readability—an empty or automatically removed backup is useless during recovery.

### Flash

Flashing directly modifies a partition. Verify partition name, slot, input path, size and summary. Never copy a partition name from a tutorial for another device.

### AnyKernel3

The manager can execute supported AnyKernel3 packages, but package scripts remain controlled by the package author. Review source, device scope, target partitions and removal path. Being openable by the manager is not proof that a package fits the device.

## Ramdisk Editor

Ramdisk Editor uses a constrained `ksud` session to inspect, modify and repack Ramdisks in supported boot images.

It is for users who know the exact file they intend to change, not a general file manager. Verify input provenance, target partition and repacked output. See [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/) for development details.

## Updates and version relationships

Download stable builds only from [YukiSU Releases](https://github.com/Anatdx/YukiSU/releases/latest). Supported manager channels can verify corresponding PGP or APK signatures.

One environment has several versions:

- manager APK;
- `ksud` embedded in that APK;
- `ksud` installed on the device;
- full LKM version and KMI;
- MetaModule and ordinary modules;
- YukiZygisk userspace components.

Do not describe the whole environment with the manager version alone. After an APK update, inspect home state before deciding whether to synchronize `ksud`, update LKM or change modules. Those are separate actions.

## Operations that modify the device

These operations write data or change state:

- direct and inactive-slot installation;
- flashing patched images or partitions;
- running an AnyKernel3 package;
- permanent YukiSU removal;
- synchronizing device-side `ksud`;
- installing, updating, disabling or removing modules;
- changing SuperKey, signature trust, ADB root or SELinux-related settings.

Save page logs, target summaries and stock images before acting. Verify the affected layer afterward instead of relying on one “success” toast.

## Recommended daily workflow

1. Open Home and verify LKM, authentication and `ksud` state.
2. Grant only applications with a real need.
3. Check modules and MetaModule for pending state.
4. Read release notes before manager or LKM updates.
5. Save logs for every high-risk operation.
6. Stop making changes and export the current state when something becomes abnormal.

The manager's value is not only putting tools in one place. It makes each runtime layer visible, helping avoid confusing a module failure with an LKM failure or an APK update with a complete environment update.
