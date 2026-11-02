---
permalink: /en/dev/boot-images/
title: Boot-image commands
---

# Boot-image commands

YukiSU v1.8.0 provides two image backends: traditional Ramdisk `boot-patch` and direct-kernel `boot-patch-v2`. Choose the command for your installation mode; their inputs, backups and target partitions are described below.

::: danger `--flash` / `-f` writes partitions
The file examples below only create images. In device-partition mode, `--flash` / `-f` writes directly to the partition; `--ota` by itself only selects the inactive slot. Before flashing, use the `boot-info` commands below to confirm the target KMI, slot and partition.
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

`target-kmi --boot` reads the supplied image, while `--ota` reads `boot` from the inactive slot. They are mutually exclusive. `supported-kmis` reports only the LKM assets actually packaged into this `ksud`; use it to check whether you need to supply a custom LKM through `--module`.

## Traditional Ramdisk: `boot-patch`

Minimal file-only example:

```sh
ksud boot-patch \
  --boot /path/to/init_boot.img \
  --out /path/to/output \
  --kmi android14-6.1
```

Common parameters are listed below. Run `ksud boot-patch --help` for the remaining options.

| Argument | Effect and boundary |
| --- | --- |
| `-b, --boot <img>` | Patch a file; when omitted, read an automatically selected device partition |
| `-f, --flash` | In device-partition mode, write back to the selected partition; without it no partition is written |
| `-o, --out <dir>` | Output directory; defaults to the current directory |
| `--out-name <name>` | Output image filename |
| `-k, --kernel <img>` | Replace the unpacked kernel; incompatible with `--no-install` |
| `--cmdline <text>` | Replace the complete boot-header command line; empty clears it, newlines are rejected |
| `-m, --module <ko>` | Use an explicit LKM; otherwise select an embedded asset from KMI |
| `-u, --ota` | Target the inactive slot; use only after OTA and before reboot |
| `--partition <name>` | Select a Ramdisk target; public help supports `boot` and `init_boot` |
| `--kmi <kmi>` | Set target KMI |
| `--backup` | Save an image backup during installation; ignored with `--no-install` |
| `--superkey <key>` | Inject SuperKey into the LKM |
| `--signature-bypass` | Effective only together with SuperKey |
| `--allow-shell` | Allow shell root in boot configuration |
| `--enable-adbd` | Embed boot-time ADB-debug configuration |
| `--adb-debug-prop <text>` | Literal ADB debug properties, not a file path |
| `--uts-config <file>` | Embed one early UTS View template; may be supplied once |
| `--no-install` | Update Ramdisk configuration while retaining init/LKM; does not install root |
| `--no-custom-rc` | Write `norc=1` to skip custom init.rc injection |
| `--no-preinit` | Write `preinit=0` to disable module preinit |
| `--force-feature <FEATURE=VALUE>` | Force a supported boot feature; repeatable |
| `--block-module <NAME>` | Add kernel module names to the blacklist; repeatable or comma-separated |

### Output files, kernel replacement and command lines

Traditional `boot-patch` and `boot-restore` share these output rules:

- A `--boot` file input produces a retained output image. Relative input paths are resolved before unpacking. This mode selects no destination partition, so adding `--flash` does not flash the file to the device.
- Reading a device partition without `--flash` also produces a file, in the current directory by default.
- Direct partition installation or restore with `--flash` writes only the partition by default. Add `--out` or `--out-name` to export an image as well.

`--kernel` takes a kernel file, not a complete `boot.img`. Use a `boot.img` containing a kernel and explicitly select `--module` or `--kmi` for the **replacement kernel**. The option does not check that the replacement kernel and LKM are compatible.

`--cmdline` replaces the whole line; it does not append. Keep the parameters your device needs when composing the new value. This example updates configuration and the command line in an already patched image:

```sh
ksud boot-patch --boot ./boot.img --out ./output \
  --out-name boot-config.img --no-install \
  --cmdline "<complete kernel command line>"
```

`--cmdline ""` clears the command line; omitted old parameters are removed too. It changes only the selected image's header command line, not other partitions or Android bootconfig. `boot-patch-v2` accepts neither `--cmdline` nor `--kernel`.

### Configuration-only patching

```sh
ksud boot-patch --boot /path/to/init_boot.img \
  --out /path/to/output --no-install --no-preinit
```

`--no-install` belongs only to traditional Ramdisk patching and rejects `--module`, `--init`, `--kernel`, `--superkey` and `--signature-bypass`. KMI detection is unnecessary when an input image is explicit and neither LKM nor partition requires automatic selection. An existing compatible boot loader must consume the configuration; this does not add root to a stock image.

The operation rewrites managed keys `allow_shell`, `norc`, `preinit`, `force_feature` and `block_modules`: **old managed values omitted from this invocation are cleared**. It is not an incremental per-key update. Other existing configuration survives; old UTS configuration is replaced only when a new UTS template is supplied.

### Forced features and kernel-module blocking

`--force-feature` currently accepts names or numeric IDs: `su_compat` (0), `kernel_umount` (1), `sulog` (2), `adb_root` (3), `selinux_hide` (4) and `shell_su_adb_only` (6). ID 5 is reserved. Use `0` / `1` for boolean switches. A forced feature cannot be overridden by the ordinary runtime switch during that boot; deploy a revised image and reboot to change it.

`--block-module` takes kernel module names, not YukiSU module directory IDs. Each name permits letters, digits and underscores, up to 64 bytes; the combined list is limited to 255 bytes. It blocks later loads and does not unload an already loaded kernel module. Blocking requires explicit arguments; keep required device drivers out of the list.

For LKM installation/update, Manager resolves the target through `boot-info target-kmi` and passes a validated `--kmi` to `boot-patch`. Configuration-only mode skips LKM/KMI selection. Manual CLI calls without `--kmi` detect it only when automatic LKM or partition selection requires it.

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
- input must be an AOSP `boot` image that unpacks to a supported raw ARM64 kernel; `init_boot` and `vendor_boot` are rejected;
- an existing output is rejected unless `--force` is explicit, and output may not alias the boot or module input;
- `--module <ko>` overrides automatic LKM selection; otherwise KMI is detected from the kernel `linux_banner` and the corresponding embedded asset is extracted;
- `--superkey`, `--signature-bypass`, `--allow-shell`, `--enable-adbd` and `--uts-config` have the same intent as in the traditional path, SuperKey/ADB/UTS data is patched into the LKM, while other load parameters travel in the capsule;
- `--no-custom-rc`, `--no-preinit`, `--force-feature` and `--block-module` are also accepted; **`--no-install` is not**. The new capsule parameter layout supports upgrading configuration when updating an older capsule;
- `--no-reuse` forces full re-analysis of an already patched kernel and is normally unnecessary.

Current backups use `ksu_backup_<stock-image SHA-1>`, preferably under `/data/adb/ksu/`, with the current Android user's Manager-private `boot_backup/` directory as a fallback. ImgPatch also writes `imgpatch_backup_<patched-image identifier>.sha1` to bind the output to its original backup and verifies backup contents when restoring. Restore uses these backups and binding records.

Record the actual backup path printed in the log and separately retain a stock image usable from fastboot/recovery. Clearing Manager data can delete private backups. Repatching prefers a verified original backup; without one it must recover original content from a reversible capsule/legacy Ramdisk or stop on failure.

Device mode also checks the corresponding `init_boot` and removes traditional KernelSU/YukiSU Ramdisk files. If a Magisk Ramdisk is detected, cleanup stops with an error. Restore the stock image for that partition before installing again.

## Restore

Choose an output directory and filename for the restored image:

```sh
ksud boot-restore --boot ./boot.img --out ./output --out-name restored.img
ksud boot-restore --help
```

Without `-f`, `boot-restore` only creates a restored image. When `--boot` is omitted and input comes from a device partition, `-f` writes back to that partition. Recovery depends on the image layout:

- **ImgPatch:** prefer a verified original backup without a capsule. Without a valid backup, try removing the reversible capsule from the target kernel, then repack.
- **Traditional Ramdisk:** prefer a valid backup matching the hash recorded in the Ramdisk. Without one, remove `kernelsu.ko` and legacy `kasumi.ko`, restore `init.real` to `init` when present, then repack.

If the command returns an error, stop, retain the error, and restore your separately saved stock image. A fallback-repacked image is not guaranteed to be byte-for-byte identical to the complete stock image.

## Automation logs and deployment checks

Retain at least:

- the complete command line, with secret values redacted;
- input-image size and SHA-256;
- resolved KMI, partition and slot;
- selected-LKM version, size and SHA-256;
- `ksud` stdout, stderr and exit status;
- output-image size and SHA-256;
- stock-backup path and validation result.

After deploying the generated image, reboot and check root authorization and the active load mode in Manager. If boot fails, use the deployed-image hash together with startup and kernel logs to investigate.

## Source entry points

- [`boot-patch`, `boot-restore` and `boot-info`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [ImgPatch LKM configuration ABI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/imgpatch_config.h)
- [Manager command construction and KMI resolution](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt)
- [Boot argument validation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_config.hpp)
- [Backup identity](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_backup.cpp)
