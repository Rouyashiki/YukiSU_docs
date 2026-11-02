---
permalink: /en/guide/rescue-bootloop/
title: Rescue and recovery
---

# Rescue and recovery

Record the last image, partition, slot, or module changed. Repeatedly flashing different images obscures the cause. Use safe mode for ordinary modules, remove the early snapshot for preinit, and restore the affected boot partition for image or LKM failures.

## Android still boots

1. Export diagnostics, installation output, and module state first.
2. Disable recently changed ordinary modules and reboot as required.
3. For preinit, inspect the module page's preinit dialog, fix or disable the offending module, then consider resetting protection.
4. For image/LKM failures, restore a verified stock backup or prepare external recovery.

Restore stock image primarily handles the boot chain. Permanent uninstall also removes YukiSU userspace and the module environment. Do not use deletion of `/data/adb` as a default troubleshooting step.

In v1.8.0, permanent uninstall restores boot images first. Only after success does it run module uninstall scripts and remove userspace, injected init rc, and preinit files. A restoration failure stops the flow. Keep the error, backups, and tools, resolve restoration, then retry uninstall. The temporary LKM command `ksud unload` does not restore on-disk boot images and cannot replace permanent uninstall.

## Ordinary module boot failures: safe mode

Press volume down at least **three times** early during boot. The kernel enters safe mode after receiving three events within its detection window. If the device does not respond, continue with preinit or image recovery below instead of repeatedly rebooting.

When `ksud` detects safe mode, it disables modules and skips ordinary module stages and built-in mounting. System safe-mode properties are also recognized. After boot, inspect actual module state and re-enable only verified modules individually.

Safe mode does not remove an incorrect LKM or repair images. It cannot undo preinit actions that have already run earlier. Late-load misses the boot-time volume-key detection window.

## Earlier failures caused by preinit

Preinit runs before SELinux setup and ordinary module stages. The runner increments a boot counter before executing actions; `ksud` clears it after successful boot. After three boots fail to complete, subsequent boots skip preinit until effective content changes or protection is manually reset.

If the device still fails, use a Recovery with access to the relevant partition, or stock-image temporary boot where supported. Remove only the actual **YukiSU preinit snapshot directory**. Possible locations are:

- `/metadata/vold/ksu/preinit`
- `/metadata/watchdog/ksu/preinit`
- `/metadata/ksu/preinit`

Do not delete `/metadata`, `vold`, or encryption/OTA data. Removing the snapshot does not repair the source module under `/data/adb/modules/`; disable or fix that source after boot so it is not synchronized again.

Resetting the counter merely permits a later retry; it does not run or repair actions immediately. To disable preinit entirely, use `--no-preinit` through a supported boot-image installation flow. See [Preinit](/en/modules/preinit/) and [Boot configuration](/en/manager/boot-config/).

## Failure after image flashing or LKM update

1. Identify the active slot, last written partition, and selected mode.
2. Obtain stock images from the **same device and firmware version**.
3. Restore the correct target using the device's supported bootloader fastboot, Recovery, or vendor procedure.
4. Verify an uncertain slot instead of switching randomly or substituting another firmware's image.

Ramdisk normally modifies the Ramdisk in `boot` / `init_boot`; ImgPatch modifies the ARM64 kernel inside `boot`. Recovery must address the actual changed location. Managed restoration validates backups and capsules. If no content can be verified, preserve the error and use a matching external stock image. See [Boot-image commands](/en/dev/boot-images/).

A configuration-only Ramdisk installs no LKM, but its boot settings can still affect the system. AVB controls do not replace correct images or remove every vendor boot restriction.

## YukiZygisk failures

Global injection safe mode stops injection. Module crash protection suspends only later injection of ordinary Zygisk modules that meet the crash-correlation conditions, for the current boot. It does not cover Native ZN or unload code already loaded. Both differ from the boot safe mode that disables ordinary modules. Preserve exit records and crash logs, disable recently introduced injection modules, and reboot fully. See [YukiZygisk status](/en/yukizygisk/features/).

## Evidence to retain

Keep model, firmware, full kernel version, APK/`ksud`/LKM versions, partition/slot, image SHA-256, runtime mode, recent module/configuration changes, installation output, and available kernel/preinit logs or bugreport. Follow [How to ask](/en/troubleshoot/asking/).

## Sources

- [Boot-time key detection](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/runtime/ksud_integration.c)
- [Safe-mode module handling](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp)
- [Preinit synchronization and status](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/preinit.cpp)
