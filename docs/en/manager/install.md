---
permalink: /en/manager/install/
title: LKM patching and installation
---

# LKM patching and installation

::: danger This touches the boot chain
“Direct install” and “Install to inactive slot” write block devices. Patching a file does not write a partition, but flashing that output for the wrong device, firmware, or slot can still prevent boot. Prepare the stock image for the current firmware and a recovery route independent of Android first.
:::

Tap the Home status card to open installation and choose a method:

| Method | Input | Result | Requirements |
| --- | --- | --- | --- |
| Select an image to patch | Local boot image | Patched output in Downloads | Does not write a partition; input must belong to the target firmware |
| Download an image | HTTPS OTA, factory ZIP, or raw `payload.bin` URL | Extracts a selected boot partition and produces patched output | Server must support byte ranges; no ImgPatch switch in this path |
| Direct install | Current-slot boot partition | Patches and writes the current slot | Requires existing root; the new boot chain is used after reboot |
| Install to inactive slot | The other slot after an OTA | Patches and writes the inactive slot | A/B devices only; use after OTA completion and before its first reboot |

## Resolve the target before guessing a partition

For a normal installation through the traditional ramdisk path, the manager derives KMI from the actual patch target. Configuration-only patching installs no new LKM and skips automatic KMI selection:

- the kernel in a selected local image;
- the current or OTA target slot's boot image; or
- kernel data in `boot` or `vendor_kernel_boot` inside a remote package.

The manager selects a bundled LKM when the detected KMI matches exactly. If parsing fails, select the target KMI manually. A local `.ko` must come from a build for the target kernel; KMI detection does not check that file's symbols or kernel configuration.

::: warning UTS View can change `uname`
When UTS View overrides `release`, `uname -r` returns the configured view. Manager selection uses the target image or the kernel's recorded original identity. Do not copy the displayed terminal string into the KMI field.
:::

## Two patch layouts

The page keeps both the traditional ramdisk path and direct-kernel patching.

| Area | Ramdisk path | Direct-kernel ImgPatch |
| --- | --- | --- |
| Placement | KernelSU payload in the `boot` / `init_boot` ramdisk | LKM capsule injected into the arm64 Linux Image inside `boot` |
| Accepted image | Backend-supported `boot` or `init_boot`; the remote path can also select `vendor_boot` | AOSP `boot` containing a kernel only; rejects `init_boot` and `vendor_boot` |
| KMI choice | Manager resolves it and passes an explicit `ksud --kmi` | Detects `linux_banner` in the target kernel and loads the same-named bundled LKM; local `.ko` can override it |
| Old payload | Updates the traditional KernelSU ramdisk content | Removes known legacy ramdisk payload first; device installs also clean companion `init_boot` |
| Home label | `TSR Hook \| Ramdisk` | `TSR Hook \| ImgPatch` |

“Embed LKM directly into boot kernel” is available only for a local image, direct install, or inactive-slot install. When the running system already reports ImgPatch, the page defaults to continuing with that method.

The remote-URL path currently always uses traditional `boot-patch`; it does not silently switch to direct-kernel injection when the running system is ImgPatch.

## Remote image flow

“Download an image” reads required archive data through HTTP byte-range requests. The initial `GET` sends `Range: bytes=0-0` and `Accept-Encoding: identity`, obtains the total size from `Content-Range`, then reads other ranges as needed. The URL must:

- use HTTPS;
- return HTTP `206 Partial Content` for range requests instead of ignoring Range and returning the entire file;
- include a valid initial `Content-Range: bytes 0-0/total-size` response header; and
- contain a raw `payload.bin`, an OTA ZIP with an uncompressed `payload.bin`, or a recognized factory ZIP (including an uncompressed inner `image-*.zip`).

Only `boot`, `init_boot`, and `vendor_boot` entries actually found in the package are offered. After extracting a payload partition, the implementation verifies its new-partition hash from the manifest. If the structure, KMI, or target partition cannot be identified, stop and use the stock image for the target firmware.

Neither the remote server nor its firmware package is endorsed by YukiSU. Prefer an original device-vendor URL, then independently verify firmware identity and output hashes before flashing.

## LKM source

The page can:

- choose an APK-bundled LKM from detected KMI; or
- use a local `.ko` instead.

Choose a `.ko` built for the target Android/KMI, kernel configuration, and YukiSU version, and confirm its source. SuperKey, ImgPatch, and UTS options require their corresponding configuration blocks or startup parameters. The file picker does not perform these compatibility checks.

## Where advanced options are stored

Advanced options are collapsed by default; expand them after choosing an installation method. Besides the options below, they include forced boot Features, disabling module preinit or module init.rc, an explicitly enabled kernel-module block list, and “Update ramdisk configuration only” for local images. See [Boot configuration](/en/manager/boot-config/).

| Option | Effect | Requirements and timing |
| --- | --- | --- |
| SuperKey | Writes a salt, verifier, and auth mode into the LKM used by this patch | Bound to that LKM/image; see [SuperKey](/en/manager/superkey/) |
| SuperKey-only mode | Disables APK-signature authentication | Losing the key removes the official-APK fallback |
| Always grant shell root | Lets `adb shell` invoke `su` | Expands the privileged debug surface; leave off by default |
| Force-enable ADB on boot | Forces USB debugging and disables ADB authentication | Creates a high-risk physical/debug entry point; leave off by default |
| Boot-global UTS config | Applies a UTS template early on the next boot | Requires repatching and a full reboot after changes; see [UTS View](/en/manager/uts-view/) |

The traditional path stores module parameters in the ramdisk; ImgPatch uses capsule module parameters and embedded configuration. LKM patch data such as SuperKey still belongs to the LKM selected for this operation. Changing a manager switch never retroactively modifies an image that was already generated or flashed.

## Backup semantics

- Traditional direct install attempts a stock backup when the target ramdisk contains no detected KernelSU payload; an existing payload skips this automatic backup. Backup failure prints a warning but does not stop patching or flashing. Check the backup result in the log.
- For a selected local image, explicitly enable “Back up as stock image” to register it as a backup. This option also accepts patched images and does not establish that a file is stock. “Update ramdisk configuration only” creates no stock backup.
- ImgPatch device install keeps a per-target-slot original `boot` backup under `/data/adb/ksu/` and preserves an existing backup.
- ImgPatch “Select image” creates a matching `.yukisu-original.img` beside the patched output.

Keep the vendor package for the target firmware separately. Before restoring a backup, confirm its firmware version, slot, size, and hash. Do not use an older OTA image or an already-patched image as the current stock backup.

## Output and post-operation checks

Patch-only results go to the public Downloads directory, with the exact filename in the log. Flash the output to its matching partition and slot, then fully reboot and check the loaded state.

Direct installation to the current or inactive slot writes the target partition and **does not also export an image to Download**. Choose local-image patching when you need an output file to keep. Inspect installation logs for backup and flashing results.

After direct installation, check:

1. target partition and slot in the operation log;
2. Ramdisk versus ImgPatch mode;
3. selected LKM/KMI and every high-risk option;
4. full YukiSU version, UAPI, Working mode, and `ksud` state after reboot; and
5. continued availability of stock images and the external recovery route.

Check the APK, device-side `ksud`, and running LKM separately. After an APK update, sync `ksud` manually or automatically according to Settings. A persistently installed LKM takes effect after writing the boot image and fully rebooting.

For an architecture-level comparison, continue with [Installation and image modes](/en/guide/install-modes/). For exact CLI parameters, see [Boot image commands](/en/dev/boot-images/).

## Jailbreak install

When the APK is not currently the YukiSU manager and SELinux is Permissive, the installation page enables a late-load entry. It runs `ksud late-load` when a root shell already exists, otherwise it attempts a Magica bootstrap.

Loading requires a matching bundled LKM and either an existing root shell or the required Magica bootstrap conditions. Save the installation log after failure; do not repeatedly retry an incompatible LKM. Late-load lasts only for the current boot; see [Jailbreak mode](/en/guide/jailbreak-mode/).

## Source references

[Install.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt), [BootConfigOptions.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/BootConfigOptions.kt), [DataSourceChannel.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/core/utils/DataSourceChannel.kt), [boot_patch.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp).

[KsuCli.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt).
