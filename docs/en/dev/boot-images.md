---
permalink: /en/dev/boot-images/
title: Boot-image commands
---

# Boot-image commands

YukiSU currently has two image backends: traditional Ramdisk `boot-patch` and direct-kernel `boot-patch-v2`. Their inputs, backups and target partitions differ; automation must not merge their arguments merely because both install an LKM.

::: danger Review partition-writing options separately
The file examples below do not write block devices unless `--flash` or `-f` is present. `--flash`, `-f` and `--ota` change device boot state. Resolve the actual slot and partition first, then require an explicit operator decision before running them.
:::

## Inspect the target first

```sh
ksud boot-info current-kmi
ksud boot-info target-kmi --boot /path/to/boot.img
ksud boot-info target-kmi --ota
ksud boot-info supported-kmis
ksud boot-info is-ab-device
ksud boot-info default-partition
ksud boot-info available-partitions
ksud boot-info slot-suffix --ota
```

`target-kmi --boot` reads the supplied image, while `--ota` reads `boot` from the inactive slot. They are mutually exclusive. `supported-kmis` reports only the LKM assets actually packaged into this `ksud`, not every target for which the source might be built separately.

## Traditional Ramdisk: `boot-patch`

Minimal file-only example:

```sh
ksud boot-patch \
  --boot /path/to/init_boot.img \
  --out /path/to/output \
  --kmi android14-6.1
```

Use the current built-in help as the final authority. Important parameters are:

| Argument | Effect and boundary |
| --- | --- |
| `-b, --boot <img>` | Patch a file; when omitted, read an automatically selected device partition |
| `-f, --flash` | Write the result to the target partition; without it no partition is written |
| `-o, --out <dir>` | Output directory |
| `-m, --module <ko>` | Use an explicit LKM; otherwise select an embedded asset from KMI |
| `-u, --ota` | Target the inactive slot; use only after OTA and before reboot |
| `--partition <name>` | Select a Ramdisk target; public help supports `boot` and `init_boot` |
| `--kmi <kmi>` | Set target KMI |
| `--backup` | Treat the selected input as a stock backup |
| `--superkey <key>` | Inject SuperKey into the LKM |
| `--signature-bypass` | Effective only together with SuperKey |
| `--allow-shell` | Allow shell root in boot configuration |
| `--enable-adbd` | Embed boot-time ADB-debug configuration |
| `--uts-config <file>` | Embed one early UTS View template; may be supplied once |

Manager no longer lets the running kernel and patch target make separate KMI guesses. It resolves the target through `boot-info target-kmi`, then always passes a validated `--kmi` to `boot-patch`. Autonomous detection remains only for a manual CLI invocation without that option.

## ImgPatch: `boot-patch-v2`

File-only mode:

```sh
ksud boot-patch-v2 \
  --boot /path/to/boot.img \
  --output /path/to/patched.img
```

Current-slot or inactive-slot device modes:

```sh
ksud boot-patch-v2 --flash
ksud boot-patch-v2 --flash --ota
```

This command has a narrower contract than traditional patching:

- file mode requires both `--boot` and `--output`; device mode takes `--flash` and must not also receive those file arguments;
- `--ota` is valid only with `--flash`;
- input must be an AOSP `boot` image containing a raw ARM64 kernel; `init_boot` and `vendor_boot` are rejected;
- an existing output is rejected unless `--force` is explicit, and output may not alias the boot or module input;
- `--module <ko>` overrides automatic LKM selection; otherwise KMI is detected from the kernel `linux_banner` and the corresponding embedded asset is extracted;
- `--superkey`, `--signature-bypass`, `--allow-shell`, `--enable-adbd` and `--uts-config` have the same intent as in the traditional path, but the configuration is written into the LKM itself;
- `--no-reuse` forces full re-analysis of an already patched kernel and is normally unnecessary.

File mode creates `<boot.img>.yukisu-original.img` beside the input. Device mode stores one backup per slot at `/data/adb/ksu/boot-patch-v2-original<slot>.img`. Repatching preserves an existing stock backup; a capsule-bearing current image must never be reclassified as stock.

Device mode also checks the corresponding `init_boot` and removes traditional KernelSU/YukiSU Ramdisk files. If a Magisk Ramdisk is detected, cleanup fails closed rather than combining both injection layouts.

## Restore

Read the current help first:

```sh
ksud boot-restore --help
```

Without `-f`, `boot-restore` only creates a restored image; `-f` writes a partition. The implementation validates available backups first. An ImgPatch backup must be an original image without a capsule. When no valid backup exists, restore may locate and remove a verifiable capsule from the target kernel; it returns failure when reversibility cannot be established.

## Evidence for automation

Retain at least:

- the complete command line, with secret values redacted;
- input-image size and SHA-256;
- resolved KMI, partition and slot;
- selected-LKM version, size and SHA-256;
- `ksud` stdout, stderr and exit status;
- output-image size and SHA-256;
- stock-backup path and validation result.

A successful image-generation command proves only that patching completed. It does not prove a successful device boot or working root. Device evidence also needs the deployed image identity, startup and kernel logs, and the active load mode reported by the manager.

## Source entry points

- [`boot-patch`, `boot-restore` and `boot-info`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [ImgPatch LKM configuration ABI](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/imgpatch_config.h)
- [Manager command construction and KMI resolution](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt)
