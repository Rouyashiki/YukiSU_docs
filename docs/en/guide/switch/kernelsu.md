---
permalink: /en/guide/switch/kernelsu/
title: Switch from KernelSU
---

# Switch from KernelSU

Switching from KernelSU does not require wiping `/data/adb` or reinstalling and testing every module one by one. YukiSU follows the upstream module lifecycle and MetaModule contract, so the normal migration is a short path determined by whether the current KernelSU is built in or loaded as an LKM.

::: info Key idea
Install YukiSU Manager in the current KernelSU environment and grant it root from KernelSU. It can then restore or update the boot image during the same running session.
:::

## Before you start

Confirm that:

- the device is within YukiSU's ARM64, GKI 2.0, Linux 5.10+ scope;
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
4. Open YukiSU Manager and use direct install with the matching-KMI YukiSU LKM.
5. Reboot after installation completes.

The running kernel still contains KernelSU even after the on-disk boot image has been restored. YukiSU Manager therefore keeps the root granted for this current session and can prepare the next boot directly. There is no need for an intermediate unrooted boot.

::: warning
The restored boot must match the current firmware and slot exactly. Never use an old image merely because it belongs to the same device model.
:::

## From KernelSU LKM

The LKM path is even shorter: **do not restore the image and do not uninstall the existing KernelSU LKM first.**

1. Install YukiSU Manager.
2. Grant it root in KernelSU Manager.
3. Select the matching-KMI LKM in YukiSU Manager and use direct install.
4. Reboot when installation completes.

YukiSU updates the LKM and corresponding userspace in the boot image directly; restoring stock and patching again is unnecessary.

## Modules, MetaModule and configuration

They normally remain in place:

| Data | Migration action |
| --- | --- |
| Ordinary KernelSU modules | Keep; YukiSU processes the upstream lifecycle |
| MetaModule | Keep; YukiSU fully follows the upstream interface and order |
| Module configuration | Keep in place; no bulk reconstruction is required |
| Root grants / App Profile | Data normally remains; confirm it after migration |
| Zygisk Next and modules | May remain; if moving to YukiZygisk, disable the external runtime as appropriate instead of running both |
| KernelSU Manager | Remove after confirming the first successful YukiSU boot |

Do not reinstall MetaModule merely because the root solution changed. Only modules already tied to a specific Android version, kernel, mount implementation or private interface need their own compatibility handling.

## Verify after reboot

- YukiSU Manager reports an installed environment with reasonable LKM, `ksud` and manager versions.
- Authorized apps can request root.
- MetaModule and ordinary module state remains visible.
- Modules that mount system files actually work.
- If enabled, YukiZygisk status and module loading are checked separately.

After these checks, uninstall the old KernelSU Manager. It served only as the source of root for YukiSU Manager during migration.

If direct install reports a KMI mismatch, missing LKM, ambiguous target partition or image verification failure, stop and verify the device and firmware details. Never disable version checks or force-load a mismatched module.

Read [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/) before deciding, or [Rescue and recovery](/en/guide/rescue-bootloop/) when the boot chain needs recovery.
