---
permalink: /en/guide/install-modes/
title: Installation and image modes
---

# Installation and image modes

“Direct install”, “Select an image” and “Embed LKM directly into boot kernel” are not alternatives at the same layer. The first choices decide **where the image comes from and where the result goes**. The last one decides **how the LKM enters the boot chain**.

## Manager entries

| Entry | Input | Output or write target | Use case |
| --- | --- | --- | --- |
| Select an image | Local image | Patched image in Downloads | First install, offline patching or manual flashing |
| Download an image | HTTPS OTA/factory ZIP or raw `payload.bin` | Extract and patch one selected boot partition | Avoid downloading the complete package to the phone first |
| Direct install | Current device boot partition | Current slot | Install or update while a working root environment exists |
| Install to inactive slot | Post-OTA slot | Inactive slot, then prepare slot switch | OTA has completed but the device has not rebooted |
| Use local LKM | User-selected `.ko` | Passed to the selected patch flow | No bundled target or a device-specific build |

Direct install writes a block device; selecting an image only creates a file. Do not confuse the direct-install entry with direct-kernel embedding below.

## Persistent installation layouts

| Layout | Backend command | Modified area | Target boundary |
| --- | --- | --- | --- |
| Traditional Ramdisk | `ksud boot-patch` | Places `ksuinit`, LKM and configuration in a boot Ramdisk | Selects `boot`, `init_boot` or another Ramdisk partition from target KMI and device layout |
| ImgPatch / direct kernel | `ksud boot-patch-v2` | Embeds a bootstrap and LKM capsule in the ARM64 kernel inside `boot` | Accepts **only an AOSP `boot` image containing a kernel**; rejects `init_boot` and `vendor_boot` |

The home page reports the active load mode as Ramdisk, ImgPatch or late-load. This tells you where the running LKM came from; it is not a different grade of Android root access.

### Traditional Ramdisk

The manager resolves target KMI from the current slot, OTA target slot or selected image, then passes the validated value to `ksud` through `--kmi`. When a bundled asset is requested, KMI must be present in the APK resource list. A failed or unmatched detection causes an explicit selection prompt instead of a guess based on the current Android release.

For ordinary LKM installation, a present `init_boot` is normally preferred when the target is not `android12-*`; otherwise selection falls back to `boot`. This is the current general rule, not an override for device-maintainer instructions on unusual layouts.

### ImgPatch / direct kernel

Direct-kernel mode detects KMI from the `linux_banner` inside `boot`. If no local `.ko` was selected, it extracts the matching embedded `<kmi>_kernelsu.ko`. It then recovers the kallsyms/BTF information required by the target and writes the LKM and loader metadata into the kernel image.

Important current boundaries:

- only `boot` is patched; the selected file must be a valid AOSP boot image containing an ARM64 kernel;
- a device direct or inactive-slot install also inspects `boot` and `init_boot` and removes known files from a previous KernelSU Ramdisk layout;
- cleanup refuses a Magisk-patched Ramdisk; restore it through Magisk's own flow first;
- SuperKey, signature-fallback choice, shell allowance, boot-time ADB debugging and the early UTS View template are embedded into the selected LKM for early kernel initialization;
- repatching an image with an existing capsule replaces its LKM and reuses recorded metadata when possible, falling back to full analysis when needed;
- `boot-restore` can consume a verified stock backup and can remove a verifiable capsule to reconstruct the pre-patch raw kernel when no usable backup remains.

::: danger Direct-kernel embedding is not a universal force-load mechanism
It changes the load layout; it does not erase KMI, vermagic, symbol or vendor-kernel differences. Stop and preserve the log when parsing, injection or cleanup fails.
:::

## Remote-image entry

The remote entry accepts an HTTPS URL and reads it through HTTP ranges. Supported package layouts are:

- raw `payload.bin`;
- an OTA ZIP containing an uncompressed `payload.bin` entry;
- a factory ZIP containing `boot.img`, `init_boot.img` or `vendor_boot.img` directly;
- a factory ZIP with a STORED `image-*.zip` inner archive.

The server must report `Content-Length` and `Accept-Ranges: bytes` to a HEAD request. The manager probes available boot partitions and boot KMI before extracting only the selected partition. A compressed `payload.bin`, a file-sharing landing page without Range support, or an authentication redirect is not a valid input.

The remote entry currently uses traditional `boot-patch`. To use ImgPatch, provide a local `boot.img`, or choose device direct/inactive-slot installation from an already rooted environment.

## Update and recovery

- Ramdisk and ImgPatch can be switched, but the transition must remove the other layout's payload. Do not manually overwrite only one `.ko`.
- Device-side ImgPatch installation retains a stock boot backup for each slot. Keep a separate stock image from the exact firmware; an on-device copy must not be the only recovery plan.
- Restore stock image and permanent uninstall are different operations. The latter also removes YukiSU userspace and module data.
- Installing an APK does not modify the LKM or boot image. `ksud` also has an independent synchronization and integrity state; see [Update YukiSU](/en/guide/update/).

For exact command-line parameters, continue with [Boot-image commands](/en/dev/boot-images/).

## Sources of truth

- [Manager installation flow](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt)
- [`boot-patch` and restore implementation](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2` ImgPatch implementation](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [Remote-image extraction](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/core/tasks/ExtractImage.kt)
