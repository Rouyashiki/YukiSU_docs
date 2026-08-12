---
permalink: /en/manager/partition/
title: Partition and Ramdisk tools
---

# Partition and Ramdisk tools

::: danger
These tools handle boot-critical partitions and images. A matching partition name does not make an image portable across devices, firmware or slots.
:::

## Partition Manager

The current manager can distinguish physical/logical partitions and A/B slots, create batch backups with `manifest.tsv`, back up or flash one partition, map inactive-slot logical partitions, and execute trusted AnyKernel3 packages with slot checks.

The flash preflight shows the image, target, capacity and slot. Large images also require enough app cache space.

## Ramdisk Editor

The manager opens supported boot images through `ksud boot-ramdisk-editor`. Edits stay in the in-process document until `DUMP`; closing first discards them.

```text
ksud ramdisk-editor <ramdisk.cpio>
ksud boot-ramdisk-editor <source.img> <output.img>
```

Boot-image mode supports standard AOSP boot/init_boot header v3-v4 and retains supported Ramdisk compression and AVB footer layouts. The command itself does not write a block device.

See [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/) for the YRCP v3 summary.
