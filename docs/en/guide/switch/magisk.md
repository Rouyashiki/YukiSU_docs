---
permalink: /en/guide/switch/magisk/
title: Switch from Magisk
---

# Switch from Magisk

Magisk and YukiSU use different boot chains and privilege implementations. There is no in-place conversion that preserves every state.

1. Back up data, the module list and exact stock boot images
2. Disable Magisk modules and verify a normal boot
3. Use Magisk's own uninstall/restore flow, or restore the partition it changed using device documentation
4. After the device boots cleanly and is within the [Android 12+/ARM64 GKI 2.0 boundary](/en/guide/compatibility/), follow [Get started](/en/guide/get-started/)

Do not copy a generic `fastboot flash boot` command without confirming the partition and slot.

For ImgPatch, input must be a restored stock `boot` containing the ARM64 kernel. `boot-patch-v2` refuses automatic cleanup when it detects a Magisk Ramdisk instead of stacking both boot injection layouts. See [Installation and image modes](/en/guide/install-modes/) for the Ramdisk/ImgPatch boundary.

Magisk module layouts may look similar, but system-file mounting in YukiSU depends on an external MetaModule. Reuse a module only when its author declares compatibility.
