---
permalink: /en/guide/update/
title: Update
---

# Update YukiSU

The manager APK, installed `ksud`, `ksuinit` and LKM in the boot image are separate components. Updating one is not a complete update.

## Manager

- Stable releases: [GitHub Releases](https://github.com/Anatdx/YukiSU/releases)
- CI builds: explicitly enable the CI update option in settings

The CI path verifies a PGP signature under a pinned key, then checks the APK signature and build metadata. CI builds remain test builds.

## LKM and boot components

Use the manager's LKM patch/install flow for the current slot, inactive slot or selected image. Before updating, verify the device KMI, target partition/slot, recoverable stock image and that the manager's embedded resources belong to the intended build.

Do not treat “replace a `.ko` and reboot” as a universal update procedure. The loading location is part of the patched boot layout.

## OTA

“Install to inactive slot after OTA” is intended only after the OTA has completed and before the slot-switch reboot. Verify the target slot's boot partition and KMI.
