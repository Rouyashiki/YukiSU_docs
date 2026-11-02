---
permalink: /en/guide/switch/kernelsu/
title: Switch from KernelSU
---

# Switch from KernelSU

Keep `/data/adb` and existing modules during migration. Back up configuration, then identify whether KernelSU is built in or loaded as an LKM. For a custom integration, first identify how to remove the old kernel component.

::: info Key idea
Install YukiSU Manager in the current KernelSU environment and grant it root from KernelSU. It can then restore or update the boot image during the same running session.
:::

## Before you start

Confirm that:

- the device runs Android 12 (API 31) or newer and is within YukiSU's ARM64, GKI 2.0, Linux 5.10+ scope;
- the latest YukiSU Manager is installed;
- a YukiSU LKM matching the current kernel KMI is available;
- stock boot matching the exact firmware is available for built-in KernelSU;
- the normal bootloader/fastboot recovery path still works.

Grant YukiSU Manager root in KernelSU Manager. Default APK signature authentication is sufficient; migration does not require SuperKey.

## From built-in KernelSU

This covers a kernel containing KernelSU, including `CONFIG_KSU=y` or a replacement GKI kernel.

1. Install YukiSU Manager and grant it root in KernelSU Manager.
2. Use KernelSU's restore function to restore stock boot matching the current firmware.
3. **Do not reboot after restoration.**
4. Open YukiSU Manager, explicitly choose traditional Ramdisk or ImgPatch, then use direct install with the matching-KMI YukiSU LKM.
5. Reboot after installation completes.

The running kernel still contains KernelSU even after the on-disk boot image has been restored. YukiSU Manager therefore keeps the root granted for this current session and can prepare the next boot directly. There is no need for an intermediate unrooted boot.

::: warning
The restored boot must match the current firmware and slot exactly. Never use an old image merely because it belongs to the same device model.
:::

## From KernelSU LKM

The LKM path is even shorter: **do not restore the image and do not uninstall the existing KernelSU LKM first.**

1. Install YukiSU Manager.
2. Grant it root in KernelSU Manager.
3. Select the matching-KMI LKM and target layout in YukiSU Manager, then use direct install.
4. Reboot when installation completes.

When traditional Ramdisk is retained, YukiSU replaces the old layout's LKM and userspace. When switching to ImgPatch, the backend writes a capsule only into `boot` and, during device installation, removes known legacy KernelSU Ramdisk files from `boot`/`init_boot`. It stops on a Magisk Ramdisk or content that cannot be cleaned safely; do not manually remove half the layout and continue.

See [Installation and image modes](/en/guide/install-modes/) for inputs and restore behavior.

## Modules, MetaModule and configuration

Keep the existing data, back it up before migration, and check module behavior after reboot:

| Data | Migration action |
| --- | --- |
| Ordinary KernelSU modules | Keep; YukiSU processes the upstream lifecycle |
| MetaModule | Keep; YukiSU continues processing its lifecycle and mount script |
| Module configuration | Keep in place; no bulk reconstruction is required |
| Root grants / App Profile | Keep the data; check each grant and profile after reboot, restoring from backup or reconfiguring entries that fail |
| Zygisk Next and modules | Keep using them; if moving to YukiZygisk, disable the external runtime before enabling YukiZygisk |
| KernelSU Manager | Remove after confirming the first successful YukiSU boot |

Do not reinstall MetaModule merely because the root solution changed. Only modules already tied to a specific Android version, kernel, mount implementation or private interface need their own compatibility handling.

## Verify after reboot

- YukiSU Manager reports an installed environment, the running LKM matches the selected build, and installed `ksud` matches the APK's bundled version.
- The Home-reported Ramdisk or ImgPatch mode matches the selected migration layout.
- Authorized apps can request root.
- MetaModule and ordinary module state remains visible.
- Modules that mount system files actually work.
- If enabled, YukiZygisk status and module loading are checked separately.

After these checks, uninstall the old KernelSU Manager. It served only as the source of root for YukiSU Manager during migration.

If direct install reports a KMI mismatch, missing LKM, ambiguous target partition or image verification failure, stop and verify the device and firmware details. Never disable version checks or force-load a mismatched module.

If restoring stock boot cannot remove a custom KernelSU integration in a vendor or self-built kernel, switch to a compatible kernel without that integration before installing YukiSU.

Read [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/) before deciding, or [Rescue and recovery](/en/guide/rescue-bootloop/) when the boot chain needs recovery.

## Built-in mounting after migration

Current YukiSU uses built-in Kagami when no enabled external `metamount.sh` is available; an existing enabled external backend takes precedence. Back up configuration and verify the actual mount owner instead of assuming the root migration also requires a backend change. See [Module mounting](/en/modules/magic-mount/).
