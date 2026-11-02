---
permalink: /en/guide/get-started/
title: Get started
---

# Get started

Follow these steps to install YukiSU and test basic root access.

The manager patches images and installs the LKM. Before starting, identify the target KMI, boot partition, and slot; the steps below explain what to check.

::: danger Plan recovery before changing the boot chain
Keep stock images from the exact current firmware. Confirm that the device can enter bootloader/fastboot and that the computer recognizes it. A wrong partition, slot or LKM can stop Android from booting.
:::

## Check the device first

Current support is limited to:

- ARM64;
- Android 12 (API 31) or newer;
- GKI 2.0;
- Linux 5.10 or newer;
- LKM, `CONFIG_KSU=m`;
- loadable-module support plus the required Kprobes, Kretprobes and syscall tracepoints.

Also identify:

| Item | What you need to know |
| --- | --- |
| KMI | The LKM must match the running kernel KMI |
| Boot partition | Whether this device uses `boot`, `init_boot` or a vendor layout |
| Slot | Which slot is active and which slot an OTA is preparing |
| Recovery | Where stock images are stored and how to restore them |

“Linux 6.1” alone is not a compatibility check. KMI, symbols, configuration and vendor changes can all differ.

Current standard builds cover eight KMI targets from Android 12/5.10 through Android 17/6.18, but Android releases and kernel generations are not one-to-one. Read the complete [Compatibility](/en/guide/compatibility/) matrix and select from the target kernel or `boot` image.

## 1. Download the files

Download `YukiSU_v1.8.0_10670-arm64-v8a-release.apk` from the [v1.8.0 release](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0). The `.asc` file is a signature and Source code is a source archive; neither is an installable APK.

Full Manager builds embed eight standard-KMI LKMs. Single-target builds contain only the selected KMI; confirm that the installation page offers your target. Prepare these files:

- **YukiSU Manager APK** for installation, grants, modules and diagnostics;
- **stock boot images from the exact current firmware** for first install and recovery;
- **a separate matching LKM when needed**, only when no embedded target matches or the device requires a dedicated build.

Use a bundled matching resource when available. Otherwise build against the device kernel as described in [Kernel integration](/en/dev/integration/). Disabling version checks is not a substitute for a matching module.

## 2. Choose the right installation entry

| Entry | When to use it |
| --- | --- |
| Direct install | The current environment already has root; update the active slot |
| Install to inactive slot | An A/B OTA has finished but the device has not rebooted into it |
| Patch an image | First installation or generating an output for manual flashing |
| Download an image | An HTTPS URL exposes a range-readable OTA/factory ZIP or `payload.bin`, and only one boot partition should be extracted |
| Local `.ko` | A device-specific or self-built LKM |

If the device has no root access, patch a stock image from the current firmware and flash it using the device’s documented method. If another root solution is already active, read the relevant migration page first.

Local image patching and direct/inactive-slot installation can choose traditional Ramdisk or direct-kernel ImgPatch layouts. They have different partitions, input constraints and restore paths. ImgPatch accepts only a `boot` image containing an ARM64 kernel, while the remote-image entry currently uses the traditional path. Read [Installation and image modes](/en/guide/install-modes/) before enabling “Embed LKM directly into boot kernel”.

Advanced options include boot configuration and configuration-only patching. Keep normal LKM installation for initial root: configuration-only mode does not install an LKM. See [Boot configuration](/en/manager/boot-config/).

## 3. Read the summary before pressing start

Confirm that:

1. the input image belongs to the **current firmware**;
2. LKM KMI matches the target kernel;
3. Ramdisk or ImgPatch was selected deliberately and the input fits that mode;
4. partition and slot are correct;
5. a location is ready for output images and logs; direct installation produces logs without exporting an extra image;
6. stock recovery is ready.

If Manager detection disagrees with the device maintainer’s instructions, stop. Confirm the firmware version, boot partition, and target slot before continuing.

## 4. Leave SuperKey alone on the first install

The official manager uses package and APK signature trust. SuperKey is not required.

| Choice | Result |
| --- | --- |
| Empty | Official manager signature authentication; recommended |
| Set | Adds key-based manager authentication |
| Disable APK signature verification | Removes signature fallback; high risk |

Leave SuperKey empty for your first installation with the official Manager. For custom signing or a private manager, follow [SuperKey authentication](/en/manager/superkey/).

## 5. Write and reboot

After checking the target, perform the patch or installation. For manual flashing, use instructions written for this device and kernel—not a command copied from a different model.

Keep these on the computer before rebooting:

- stock images for the current firmware;
- the output from image patching; direct and OTA-slot installation do not export an extra image file;
- patch/install logs;
- working platform-tools or vendor recovery tools.

If the first boot is clearly stuck, do not keep rebooting for luck. Restore a known-good image using [Rescue and recovery](/en/guide/rescue-bootloop/) and inspect the first error.

## 6. Test root before adding everything else

After boot:

1. Home recognizes YukiSU and shows the expected LKM version.
2. Manager authentication succeeded.
3. The reported Ramdisk / ImgPatch / late-load mode matches the intended layout.
4. The actual integrity state of embedded `ksud` and `/data/adb/ksud` matches; synchronize manually if needed, because auto-sync is off by default.
5. One trusted test app can open and close an authorized `su` session.
6. The same state survives one more reboot.

Once these checks pass, continue with your everyday modules.

## 7. Add modules and YukiZygisk afterwards

1. Start with built-in Kagami, or identify which existing external MetaModule owns mounting.
2. Install one trusted module, reboot when required, and verify its files and behavior.
3. Select an external MetaModule or explicitly configure the Kasumi backend only when needed.
4. Enable YukiZygisk for modules that need it, reboot fully, and verify them individually.
5. Follow the separate guides for one-shot scripts, hot installation, and preinit.

See [Module system](/en/modules/overview/) and [Mount backends](/en/modules/magic-mount/). Change one major component at a time to keep failures attributable.

## Installation is complete when

- YukiSU remains detected after reboot;
- the manager-reported load mode matches the installed layout;
- only authorized apps receive root;
- installed `ksud` matches the APK's bundled version, and the running LKM matches the selected build;
- the selected Kagami or MetaModule backend mounts the required files;
- root and ordinary modules work while YukiZygisk is off.

## Next

- [Feature overview](/en/guide/features/)
- [Compatibility](/en/guide/compatibility/)
- [Installation and image modes](/en/guide/install-modes/)
- [App Profile](/en/manager/app-profile/)
- [Jailbreak mode](/en/guide/jailbreak-mode/)
- [Switch from KernelSU](/en/guide/switch/kernelsu/)
- [Common troubleshooting](/en/troubleshoot/common/)
