---
permalink: /en/manager/kasumi/
title: Kasumi and mount configuration
---

# Kasumi and mount configuration

YukiSU v1.9.0 uses **Kasumi API 19**. Tap Kasumi at the top right of Home to check the running version, change settings, manage rules, or read logs. To change how one module is mounted, open its module card.

## Three separate controls

| Control | Location | Effect and lifecycle |
| --- | --- | --- |
| Kasumi Feature 106 | Settings → Feature controls | Controls the built-in Kasumi enable request; disabling does not immediately tear down existing views, so fully reboot as prompted |
| Built-in mounting | Settings | Selects the built-in Kagami mounting engine; takes effect after reboot |
| Kasumi views and individual options | Kasumi → Settings | Configures kernel views, hiding, and related capabilities; supported runtime settings are applied after saving, while mount-backend settings wait for the next boot |

Built-in mounting does not require installing a separate MetaModule. If an external MetaModule owns mounting, the page displays its ID and disables inapplicable built-in mount controls. Do not have two engines process the same module tree. See [MetaModule](/en/modules/meta-module/) for mount selection.

Refresh status after saving configuration. “Saved, but kernel apply failed” means configuration is persisted but runtime application is incomplete. Preserve the error, resolve the cause, then retry applying and refresh status.

## Status

Check kernel availability, protocol compatibility, and version first. Status also shows storage/mount information, actual module strategies, and active views. After changing a module mode, fully reboot and read its actual strategy on Status.

API 19 checks the protocol version before applying changes. If Status reports a mismatch, check the installed `ksud` and the running LKM. Update both to v1.9.0 and reboot fully before trying again. [Upgrade steps](/en/guide/update/)

Kasumi prepares a batch of rule changes before committing them together. If that batch fails, the previous rules stay active. Soft reboot has additional recovery requirements. See [Soft reboot](/en/manager/soft-reboot/).

## Mount strategies and module rules

Module cards offer `auto`, `kasumi`, `overlay`, `magic`, and `none`, plus rules for absolute target paths. Path rules additionally support `hide`. `none` selects a mount strategy; it does not disable the entire module, whose scripts still follow its state and lifecycle.

The Modules menu can filter by strategy, show only active Kasumi modules, and check mount conflicts. The conflict list identifies modules competing for the same paths. Inspect the corresponding logs for script execution and mounts created by scripts.

Settings control whether OverlayFS and Magic Mount may participate in planning, the storage filesystem (automatic, ext4, erofs, or tmpfs), mount-source name, temporary directory, and mirror path. After storage or backend changes, fully reboot and inspect actual strategies again.

## Kernel views and hiding rules

Available controls depend on capabilities reported by the running kernel, including mount hiding, maps mapping, OverlayFS xattr hiding, statfs views, and SELinux Guard. Aggressive mount hiding was removed in v1.8.0; do not continue configuring that mode from older instructions.

**SELinux Guard** is disabled by default. It experimentally applies bounded timing compensation to SELinux context writes. It neither changes Enforcing/Permissive nor replaces App Profile domains and SELinux rules. Enable it when investigating that class of compatibility problem and compare target-app behavior.

User hide rules require absolute paths and cannot hide the reserved `/system/bin/su` through this entry point. Rules distinguish pending, binding, bound, and error states. A rule can remain pending while its parent directory does not exist; if the path exists but binding does not complete, or an error appears, inspect logs and retry. Maps rules address path, device, and inode information for mappings; they do not change the real origin of the file.

“Clear rules” changes active rules; it is not a complete uninstaller or a reset of every persistent setting. Record the original configuration first and verify mount/view effects inside the target application process.

## Global rules: bypassing process policy

“Global rules (bypass policy)” skips ordinary process policy for selected Kasumi rules, affecting all processes, including managers or root processes normally exempted. It does not grant root or change OverlayFS/Magic Mount rules.

- **Module switch:** makes every Kasumi rule of that module global.
- **Path-rule switch:** makes only that rule global. A per-rule off setting cannot override an enabled module switch.
- **User hide rules:** existing rules have editable scope. “Make the new rule global” beside the input affects only the next path saved with Add.

This is off by default. Enable it when root and ordinary apps must share the same file view. Hiding paths required by the manager or tools removes their access too; record the rule before changing it so you can undo it from the same page. Saving module configuration attempts to apply Kasumi rules immediately; mount-backend changes still require reboot.

## Conflicting kernel components

Kasumi refuses activation alongside recognized conflicting components: `kasumi_lkm`, `pathmask`, `procguard`, `nomount`, `susfs_guard_lkm`, `hybridmount`, and running-kernel configurations `CONFIG_KSU_SUSFS=y`, `CONFIG_NOMOUNT=y`, or `CONFIG_HYBRIDMOUNT=y`. Loading these conflicting `.ko` modules while Kasumi is active is also rejected.

The dialog distinguishes an already loaded module blocking Kasumi, a built-in feature conflict, and a newly rejected module load. “I understand” acknowledges the warning only. It does not change settings, unload components, or remove the restriction.

Choose one implementation: disable the conflicting module's load source or disable Kasumi, then fully reboot. For a built-in conflict, keep Kasumi disabled or use a kernel without that feature. This check covers recognized components only; an absent warning does not establish compatibility with arbitrary kernel modifications.

## Reboot and diagnosis

You can use soft reboot with Kasumi when the running kernel and controller support recovery. Follow the daemon support state shown in Manager and the specific remedies in [Soft reboot](/en/manager/soft-reboot/). After disabling Feature 106, a full reboot is still needed to end its current kernel lifecycle. A full reboot also ends temporary late-load root.

Include the following in an issue report:

- YukiSU, `ksud`, and Kasumi versions and support state;
- built-in mount setting, external mount owner, and global/per-module configuration;
- requested versus actual strategies and rule states;
- original logs and file/mount observations from the reproducing process.

The Kasumi Logs tab supports refresh and clear. Preserve relevant output before clearing it. Include actual strategies and rule states in screenshots, together with file or mount results from the target process.

## Source references

[Kasumi UI](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/src/main/java/org/rouyashiki/yukisu/ui/kasumi/KasumiConfig.kt), [settings and capabilities](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/src/main/java/org/rouyashiki/yukisu/ui/kasumi/KasumiSettings.kt), [controller](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/src/main/java/org/rouyashiki/yukisu/ui/kasumi/util/KasumiManager.kt), [kernel lifecycle](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/kernel/kasumi/core/kasumi_bootstrap.c), and [soft-reboot restrictions](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/ksud/src/init_event.cpp).

[kasumi.h](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/uapi/kasumi.h), [KasumiMountConfigDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/src/main/java/org/rouyashiki/yukisu/ui/kasumi/KasumiMountConfigDialog.kt), [sucompat_module_guard.c](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/kernel/feature/sucompat_module_guard.c), [kasumi_config_guard.c](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/kernel/kasumi/core/kasumi_config_guard.c), [KasumiConflictDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/src/main/java/org/rouyashiki/yukisu/ui/component/KasumiConflictDialog.kt).
