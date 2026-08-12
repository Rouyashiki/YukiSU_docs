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

## The device does not boot

Recovery depends on the boot layout, bootloader and vendor tools. The general process is to identify the active slot and modified partition, obtain an untouched image for the exact device and firmware, then restore it with the device-supported fastboot, fastbootd, recovery or vendor tool.

Do not use an image from another device, firmware build or slot. This guide intentionally provides no universal flash command.

## Preserve evidence

Record the device model, Android version, complete `uname -r`, current/target slot, modified partition, manager and LKM versions, LKM source, install log and any available bootloader/kernel log. Then follow [How to ask](/en/troubleshoot/asking/).
