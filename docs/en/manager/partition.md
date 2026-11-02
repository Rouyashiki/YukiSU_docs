---
permalink: /en/manager/partition/
title: Partition and Ramdisk tools
---

# Partition and Ramdisk tools

::: danger These tools can destroy boot and calibration data
Flash only images for the target device, firmware, and slot. Partitions such as `persist`, `modem`, `fsg`, and `nvram` store calibration or device data; do not overwrite them with another device's backup.
:::

Open Partition Manager from “Advanced tools” on the installation page before selecting a patch method.

## Partition list and slots

The manager uses the `ksud flash` backend to read:

- whether the device is A/B and its current/other slot;
- common boot partitions: `boot`, `init_boot`, `recovery`, `dtbo`, `vbmeta`, `vendor_boot`, and `vendor_kernel_boot`;
- the full partition scan;
- physical/logical type, capacity, resolved block device, and slot suffix.

The page switches between common and all partitions, searches name or block device, and filters physical/logical entries. Changing A/B slot reloads the target; do not infer the current target from a screenshot of the previous slot.

When inactive-slot dynamic partitions have no device nodes, the page provides an explicit mapping action. Wait for the OTA to finish before mapping or operating on the inactive slot. Mapping a node does not complete the OTA.

## Backups

### One partition

After choosing a backup directory, a single backup creates a timestamped `.img`. When partition capacity is known, the manager requires output size to match it; command failure or size mismatch removes that invalid output.

### Batch backup

Batch mode can select visible entries or a boot-partition set and estimates free space in the destination. `userdata` / `data` are excluded from batch backup.

Each run creates its own directory and a `manifest.tsv` recording:

- slot;
- partition name and physical/logical type;
- expected and actual byte counts; and
- per-item success/failure.

The manifest is not a hash. Save SHA-256 values on another storage medium and at least inspect file headers. A “backup” left only in the same phone's Downloads directory cannot handle data-partition loss or loss of the device.

## Direct image flashing

After file selection, the manager stages it in app cache and checks:

- the file is non-empty;
- it does not exceed known target capacity;
- app cache has enough staging space; and
- a target block device can be resolved.

Preflight shows filename, size, partition, block device, slot, and capacity. Known dangerous partitions receive an extra warning, but the list cannot know every vendor-private partition. Confirm the purpose in the device's partition documentation before writing.

::: warning Capacity checks do not validate image content
“Fits in the partition” prevents an obvious overflow only. It does not validate device model, firmware, AVB chain, header content, or intended target.
:::

## AnyKernel3

The `boot` partition action can select an AnyKernel3 ZIP. The manager first asks `ksud` to recognize it, then shows:

- package and kernel name;
- declared device list;
- current target slot;
- declared package slot policy; and
- whether AK3 should use the `ksud`-built-in `mkbootfs`.

The backend checks package form and slot policy, but package scripts remain controlled by their author. Check that the release supports your firmware, review the target partitions in `anykernel.sh`, and prepare a recovery image. Treat an empty device list as unspecified compatibility.

## Ramdisk Editor entry

The page exposes the editor only on the ramdisk carrier appropriate to the detected layout:

- when `init_boot` exists, `boot` does not get the editor action;
- `init_boot`, `vendor_boot`, and `recovery` can enter; and
- devices without `init_boot` can enter through `boot`.

On entry, the manager backs the target partition into app cache and starts a persistent `ksud boot-ramdisk-editor` session. Reading does not modify the block device.

## Currently supported image layouts

The backend accepts plain AOSP `boot`, `init_boot`, and `vendor_boot` headers v3–v4, and rejects vendor layouts it cannot rebuild safely. The `recovery` entry requires the same layout. The editor rejects legacy v0–v2 and unsupported proprietary recovery layouts. Supported ramdisk compression includes:

- gzip / zopfli;
- xz;
- lz4, legacy lz4, and lz4_lg; and
- uncompressed CPIO.

For a v4 `vendor_boot` with multiple vendor-ramdisk fragments, the UI shows each name, type, packed size, and board ID. All fragments remain in one edit session and are rebuilt together.

## Editor operations

The current protocol/file browser supports:

- directory browsing, search, and reads;
- file and directory creation;
- regular-file import, export, and replacement;
- rename, copy, move, and recursive removal;
- symbolic and hard links;
- Unix metadata such as mode, UID, and GID;
- text editing up to 2 MiB with encoding selection;
- read-only ELF header summaries;
- binary viewing and editing of regular files through the integrated YukiFB hex editor;
- checksums including SHA-256/SHA-512, plus MD5, SHA-1, CRC32, and others; and
- temporary exports for external opening or sharing.

External opening/sharing gives the selected app a copy; external edits are not automatically written back into the ramdisk. Explicitly import a replacement when needed. Checksums compare content; MD5/CRC32 are not publisher authentication or trusted signatures.

Edits live in an in-memory CPIO document. Saving text or hex edits writes back to that document; it does not yet produce a boot image. Handle unsaved file edits and unexported rebuilt output before leaving.

## Rebuild, export, and exit

The correct sequence is:

1. modify files;
2. choose “Rebuild boot image” (protocol `DUMP`) to create output in app cache;
3. choose “Export rebuilt image” to save it persistently through Android's document UI; and
4. confirm no rebuilt output remains unexported before leaving.

Leaving closes the session and deletes cached source and rebuilt images. “Rebuilt in app cache” without export does not preserve the file.

Ramdisk Editor **never writes a block device automatically**. If the exported image is to be flashed, return to Partition Manager and repeat target/capacity preflight.

## AVB / dm-verity controls

The action menu for `vbmeta`, `vbmeta_a`, and `vbmeta_b` includes “AVB / dm-verity.” It reads **flags stored on the selected block device**, with separate AVB verification and dm-verity controls. It does not infer the current boot state from rewritten Android properties or edit every chained `vbmeta_*` partition together.

Before writing, the page shows partition, block device, and slot and requests confirmation. The manager rereads the old state and verifies the requested result after writing. Controls are disabled when the bootloader reports locked. Refresh and preserve errors after a failed read; do not assume a write succeeded.

Saved flags apply on the next boot of that slot. With AVB verification disabled, enabling only the dm-verity flag does not restore verification. Re-enabling requires valid verified images and signatures. Back up the selected `vbmeta` partition first; an incorrect change can prevent boot.

## AVB signatures after rebuilding

The backend attempts to preserve original compression, boot-header layout, and supported AVB footer/vbmeta placement. It copies existing vbmeta data; it **does not create a new trusted signature for the modified ramdisk**.

After content changes, the old signature cannot authenticate the new content. Devices requiring verified boot need matching hashes and signatures regenerated; retaining the footer does not do this. Confirm the real unlock state and Verified Boot requirements before flashing.

See the [Ramdisk Editor protocol](/en/dev/ramdisk-protocol/) for third-party clients. Regular users should preserve both the original partition backup and exported image before considering a flash.

## Source references

[PartitionAvbDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/partition/PartitionAvbDialog.kt), [PartitionManagerHelper.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/partition/PartitionManagerHelper.kt), [RamdiskEditorScreen.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/ramdisk/RamdiskEditorScreen.kt).
