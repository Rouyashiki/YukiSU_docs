---
permalink: /en/guide/get-started/
title: Get started
---

# Get started

This page has one job: install YukiSU and prove that basic root works.

The manager can patch images and install an LKM. It cannot turn the wrong KMI into the right one, and it cannot know every vendor boot layout. You still need to know the device you are modifying.

::: danger Plan recovery before changing the boot chain
Keep stock images from the exact current firmware and verify that bootloader/fastboot recovery still works. A wrong partition, slot or LKM can stop Android from booting.
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

Get the official manager from [YukiSU Releases](https://github.com/Rouyashiki/YukiSU/releases/latest). Avoid mirrored drives, chat attachments and similarly named repositories.

The official full Manager APK embeds all eight current standard-KMI LKMs. Normally prepare:

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

On a first install, YukiSU does not yet provide root, so you normally patch a stock image from the current firmware and flash it using the device's documented method. If another root solution is already active, read the relevant migration page first.

Each entry still chooses between traditional Ramdisk and direct-kernel ImgPatch layouts. They have different partitions, input constraints and restore paths. ImgPatch accepts only a `boot` image containing an ARM64 kernel, while the remote-image entry currently uses the traditional path. Read [Installation and image modes](/en/guide/install-modes/) before enabling “Embed LKM directly into boot kernel”.

There is no universal fastboot command for every phone. If there were, vendors would not have made `boot`, `init_boot`, vendor layouts and A/B slots this entertaining.

## 3. Read the summary before pressing start

Confirm that:

1. the input image belongs to the **current firmware**;
2. LKM KMI matches the target kernel;
3. Ramdisk or ImgPatch was selected deliberately and the input fits that mode;
4. partition and slot are correct;
5. output image and logs will be kept;
6. stock recovery is ready.

If manager detection and device-maintainer documentation disagree, stop and investigate. Many bad flashes come from giving a perfectly working tool the wrong target with great confidence.

## 4. Leave SuperKey alone on the first install

The official manager uses package and APK signature trust. SuperKey is not required.

| Choice | Result |
| --- | --- |
| Empty | Official manager signature authentication; recommended |
| Set | Adds key-based manager authentication |
| Disable APK signature verification | Removes signature fallback; high risk |

SuperKey authenticates the manager. It is not an app root password or a feature that becomes better merely because it sounds advanced. Read [SuperKey authentication](/en/manager/superkey/) when you actually need custom signing or a private manager.

## 5. Write and reboot

After checking the target, perform the patch or installation. For manual flashing, use instructions written for this device and kernel—not a command copied from a different model.

Keep these on the computer before rebooting:

- stock images for the current firmware;
- the newly patched image;
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

This proves the LKM → `ksud` → manager → app-grant path.

## 7. Add modules and YukiZygisk afterwards

1. Keep or install a suitable MetaModule only when a module needs files mounted under paths such as `system/`.
2. When a MetaModule is needed, reboot and confirm its mount backend first.
3. Then add ordinary modules.
4. Enable YukiZygisk only if Zygisk modules are needed.
5. Enable injection modules one at a time, or at least know which recent change to disable first.

This is not asking for a laboratory-grade seven-stage experiment. It simply avoids changing root, the mount backend, ten modules and Zygisk before the first reboot, then having no idea which layer failed.

## Installation is complete when

- YukiSU remains detected after reboot;
- the manager-reported load mode matches the installed layout;
- only authorized apps receive root;
- `ksud`, manager and LKM versions make sense together;
- MetaModule mounts files required by modules;
- root and ordinary modules work while YukiZygisk is off.

## Next

- [Feature overview](/en/guide/features/)
- [Compatibility](/en/guide/compatibility/)
- [Installation and image modes](/en/guide/install-modes/)
- [App Profile](/en/manager/app-profile/)
- [Jailbreak mode](/en/guide/jailbreak-mode/)
- [Switch from KernelSU](/en/guide/switch/kernelsu/)
- [Common troubleshooting](/en/troubleshoot/common/)
