---
permalink: /en/guide/switch/magisk/
title: Switch from Magisk
---

# Switch from Magisk

Magisk and YukiSU use different boot chains and privilege implementations. There is no in-place conversion that preserves every state.

1. Back up data, the module list and exact stock boot images
2. Disable Magisk modules and verify a normal boot
3. Use Magisk's own uninstall/restore flow, or restore the partition it changed using device documentation
4. After the device boots cleanly, follow [Get started](/en/guide/get-started/)

Do not copy a generic `fastboot flash boot` command without confirming the partition and slot.

Magisk module layouts may look similar, but system-file mounting in YukiSU depends on an external MetaModule. Reuse a module only when its author declares compatibility.
