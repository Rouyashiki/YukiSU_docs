---
permalink: /en/guide/rescue-bootloop/
title: Rescue and recovery
---

# Rescue and recovery

::: danger Stop repeated flashing
If the device stops booting after an install or update, first identify the last partition, slot and image that were written.
:::

## The device still boots

Prefer the manager's recovery actions:

- “Restore stock image” restores an available backup, commonly before an OTA
- “Permanent uninstall” removes YukiSU, root access and modules

Export the install log and verify the current slot first. These are different operations.

Also record the load mode shown on Home. Ramdisk normally means recovering the modified `boot`/`init_boot` Ramdisk, while an ImgPatch capsule lives in the kernel inside `boot`. `boot-restore` validates stock backups first. With no usable ImgPatch backup, it removes only a capsule it can verify rather than rewriting an unknown kernel. See [Boot-image commands](/en/dev/boot-images/) for command boundaries.

## The device does not boot

Recovery depends on the boot layout, bootloader and vendor tools. Identify the active slot, modified partition and selected Ramdisk/ImgPatch mode; obtain an untouched image for the exact device and firmware; then restore it with the device-supported fastboot, fastbootd, recovery or vendor tool.

Do not use an image from another device, firmware build or slot. This guide intentionally provides no universal flash command.

## Preserve evidence

Record the device model, Android version, complete `uname -r`, current/target slot, modified partition, reported Ramdisk/ImgPatch/late-load mode, manager and LKM versions, LKM source, input/output image sizes and SHA-256, stock-backup location, install log and any available bootloader/kernel log. Then follow [How to ask](/en/troubleshoot/asking/).
