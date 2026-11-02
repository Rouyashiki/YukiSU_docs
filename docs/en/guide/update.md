---
permalink: /en/guide/update/
title: Update
---

# Update YukiSU

The manager APK, installed `ksud`, traditional-Ramdisk `ksuinit`, ImgPatch capsule and LKM are separate components. Updating one is not automatically a complete update.

## Upgrading to v1.8.0

Download the APK with version code **10670** from the [v1.8.0 release](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0). Keep stock images, an App Profile backup, and module configuration. Synchronize `ksud`, update the matching-KMI LKM as described below, then reboot fully.

- The default root domain changes to `u:r:ksu:s0`. Existing custom domains and per-app flags remain, with compatibility handling for legacy `su` policies.
- Feature 102 is enabled during its first migration even if its old global value was off. Later manual choices are retained. Check apps using the default profile; see [App Profile](/en/manager/app-profile/).
- WebView module unmounting moves to the non-root profile under Superuser → WebView Zygote. Feature 5 and the removed Enhanced security ID 100 are no longer used. Remove both IDs when updating old forced boot settings or module scripts.
- Classic UI and aggressive Kasumi mount hiding are removed. Keep ordinary hiding configuration and check saved and applied rules on the [Kasumi](/en/manager/kasumi/) page.
- Emulated soft reboot checks recovery capabilities first. After a request is accepted, wait for its final recovery result. LKM and boot-configuration updates require a full reboot. See [Soft reboot](/en/manager/soft-reboot/).

## Manager

- Stable releases: [GitHub Releases](https://github.com/Rouyashiki/YukiSU/releases)
- CI builds: explicitly enable the CI update option in settings

The CI path verifies a PGP signature under a pinned key, then checks the APK signature and build metadata. Signatures verify the publisher and file integrity. Use stable releases for everyday use; switch to CI to test fixes still in development.

After installing the APK, check the home page. Manager compares the actual ELF content of embedded `ksud` and `/data/adb/ksud` and offers manual synchronization. Auto-update is off by default. When enabled, it checks and synchronizes at app cold start only if kernel Manager authentication has already succeeded. Otherwise it skips the attempt; synchronize manually after authentication. Runtime replacement of the installed path is recorded and raised as an integrity alert.

Synchronizing `ksud` does not replace the LKM, modify a boot image or reboot. When updating the LKM, also synchronize the matching `ksud` so new commands and resources are available.

## LKM and boot components

Use the manager's LKM patch/install flow for the current slot, inactive slot or a local/remote image source. Before updating, verify target KMI, that the bundled resources include it (current full builds extend through `android17-6.18`), target partition/slot, a recoverable stock image, component provenance, and whether the resulting layout should remain Ramdisk or switch to boot-only ImgPatch.

Update the LKM through the installation page. Ramdisk loads it from the boot Ramdisk; ImgPatch loads it from a capsule in the `boot` kernel. Both require updating the corresponding boot image.

In v1.8.0, direct installation and installation to the inactive OTA slot no longer copy patched images to Download. Use local or remote image patching when you need an output file. For direct installation, retain the install log and a separate stock-image backup.

ImgPatch repatching first tries to replace the LKM using metadata already stored in its capsule and falls back to full analysis when reuse is not possible. A transition between traditional Ramdisk and ImgPatch removes the other layout's payload first. Without a valid backup, restoration can use a verifiable, reversible capsule. Stop and retain the error if the backend cannot safely clean a Magisk Ramdisk, restore the capsule, or rebuild the backup. See [Installation and image modes](/en/guide/install-modes/) for options and recovery steps.

## OTA

“Install to inactive slot after OTA” is intended only after the OTA has completed and before the slot-switch reboot. The manager reads target KMI from `boot` in the inactive slot instead of reusing the running kernel's value. Do not continue with a guessed near-match if parsing fails.

When OTA changes the kernel, an LKM valid on the old slot may no longer be valid. ImgPatch still writes `boot` in the target slot, while traditional Ramdisk chooses `boot` or `init_boot` from the target layout.

## Updating configuration and modules

- Keep an App Profile backup, module list, mount-backend settings, and boot configuration. Profile restoration rechecks app identity and UID; another device's UID is not automatically the correct authorization target.
- Without an enabled external `metamount.sh`, current YukiSU uses built-in Kagami. Verify the selected backend after upgrading instead of assuming a missing MetaModule is an error.
- Ordinary updates are merged at the next boot. Use [hot installation](/en/modules/hot-install/) only with explicit support and suitable conditions; preinit and init.rc take effect on the next full boot.
- When repatching forced features, preinit, or a blacklist, retain every intended option. Configuration-only mode rebuilds managed settings from the current arguments instead of merging them incrementally. See [Boot configuration](/en/manager/boot-config/).
- Compatibility-value overrides are not real upgrades. Record the actual build and override values separately.

## Verify after updating

After a full boot, check Manager authentication, running LKM and installed `ksud`, one trusted app's root access, the selected mount backend, and required YukiZygisk targets. For preinit, confirm preparation first, then reboot fully and read the early action logs.

See [Feature overview](/en/guide/features/) for available controls. If an older version lacks them, update the matching components as described above.
