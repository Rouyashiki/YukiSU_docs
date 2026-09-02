---
permalink: /en/guide/update/
title: Update
---

# Update YukiSU

The manager APK, installed `ksud`, traditional-Ramdisk `ksuinit`, ImgPatch capsule and LKM are separate components. Updating one is not automatically a complete update.

## Manager

- Stable releases: [GitHub Releases](https://github.com/Rouyashiki/YukiSU/releases)
- CI builds: explicitly enable the CI update option in settings

The CI path verifies a PGP signature under a pinned key, then checks the APK signature and build metadata. CI builds remain test builds.

After installing the APK, check the home page. The manager compares the actual ELF content of embedded `ksud` and `/data/adb/ksud`. It can synchronize manually, or at app cold start when the off-by-default auto-update option is enabled. Runtime replacement of the installed path is recorded and raised as an integrity alert.

Synchronizing `ksud` does not replace the LKM, modify a boot image or reboot. Conversely, updating only the LKM does not prove that installed `ksud` contains matching commands and resources.

## LKM and boot components

Use the manager's LKM patch/install flow for the current slot, inactive slot or a local/remote image source. Before updating, verify target KMI, that the bundled resources include it (current full builds extend through `android17-6.18`), target partition/slot, a recoverable stock image, component provenance, and whether the resulting layout should remain Ramdisk or switch to boot-only ImgPatch.

Do not treat “replace a `.ko` and reboot” as a universal update procedure. The loading location is part of the patched boot layout.

ImgPatch repatching first tries to replace the LKM using metadata already stored in its capsule and falls back to full analysis when reuse is not possible. A transition between traditional Ramdisk and ImgPatch removes the other layout's payload first. Stop if the backend cannot safely clean a Magisk Ramdisk, validate a backup or verify a capsule. See [Installation and image modes](/en/guide/install-modes/) for the full boundary.

## OTA

“Install to inactive slot after OTA” is intended only after the OTA has completed and before the slot-switch reboot. The manager reads target KMI from `boot` in the inactive slot instead of reusing the running kernel's value. Do not continue with a guessed near-match if parsing fails.

When OTA changes the kernel, an LKM valid on the old slot may no longer be valid. ImgPatch still writes `boot` in the target slot, while traditional Ramdisk chooses `boot` or `init_boot` from the target layout.
