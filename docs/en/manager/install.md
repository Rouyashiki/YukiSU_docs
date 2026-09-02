---
permalink: /en/manager/install/
title: LKM patching and installation
---

# LKM patching and installation

::: danger This touches the boot chain
“Direct install” and “Install to inactive slot” write block devices. Patching a file does not write a partition, but flashing that output for the wrong device, firmware, or slot can still prevent boot. Prepare the stock image for the current firmware and a recovery route independent of Android first.
:::

The installation page, opened from the Home status card, currently provides four source/target paths:

| Method | Input | Result | Main boundary |
| --- | --- | --- | --- |
| Select an image to patch | Local boot image | Patched output in Downloads | Does not write a partition; input must belong to the target firmware |
| Download an image | HTTPS OTA, factory ZIP, or raw `payload.bin` URL | Extracts a selected boot partition and produces patched output | Server must support byte ranges; no ImgPatch switch in this path |
| Direct install | Current-slot boot partition | Patches and writes the current slot | Requires existing root; the new boot chain is used after reboot |
| Install to inactive slot | The other slot after an OTA | Patches and writes the inactive slot | A/B devices only; use after OTA completion and before its first reboot |

## Resolve the target before guessing a partition

For the traditional ramdisk path, the manager derives KMI from the actual patch target:

- the kernel in a selected local image;
- the current or OTA target slot's boot image; or
- kernel data in `boot` or `vendor_kernel_boot` inside a remote package.

It automatically uses a bundled KMI resource only on an exact match. If the target cannot be resolved reliably, the UI asks for a manual selection. A locally selected `.ko` lets the flow continue with a detected KMI, but it does not prove that module's symbols, configuration, or provenance are compatible.

::: warning UTS View can change `uname`
With UTS View active, ordinary `uname -r` may be a modified view. Manager selection uses the target image or the kernel's recorded original identity. Do not copy the displayed terminal string into the KMI field.
:::

## Two patch layouts

The page keeps both the traditional ramdisk path and direct-kernel patching.

| Area | Ramdisk path | Direct-kernel ImgPatch |
| --- | --- | --- |
| Placement | KernelSU payload in the `boot` / `init_boot` ramdisk | LKM capsule injected into the arm64 Linux Image inside `boot` |
| Accepted image | Backend-supported `boot` or `init_boot`; the remote path can also select `vendor_boot` | AOSP `boot` containing a kernel only; rejects `init_boot` and `vendor_boot` |
| KMI choice | Manager resolves it and passes an explicit `ksud --kmi` | Detects `linux_banner` in the target kernel and loads the same-named bundled LKM; local `.ko` can override it |
| Old payload | Updates the traditional KernelSU ramdisk content | Removes known legacy ramdisk payload first; device installs also clean companion `init_boot` |
| Home label | `TSR Hook | Ramdisk` | `TSR Hook | ImgPatch` |

“Embed LKM directly into boot kernel” is available only for a local image, direct install, or inactive-slot install. When the running system already reports ImgPatch, the page defaults to continuing with that method.

The remote-URL path currently always uses traditional `boot-patch`; it does not silently switch to direct-kernel injection when the running system is ImgPatch.

## Remote image flow

“Download an image” does not blindly save an entire web page or archive first. The manager obtains its size with HTTP `HEAD`, then uses `Range` requests to probe and extract the required data. The URL must:

- use HTTPS;
- return `Content-Length`;
- explicitly support `Accept-Ranges: bytes`; and
- contain a raw `payload.bin`, an OTA ZIP with an uncompressed `payload.bin`, or a recognized factory ZIP (including an uncompressed inner `image-*.zip`).

Only `boot`, `init_boot`, and `vendor_boot` entries actually found in the package are offered. After extracting a payload partition, the implementation verifies its new-partition hash from the manifest. Stop when structure, KMI, or target partition cannot be identified; a similar filename is not evidence.

Neither the remote server nor its firmware package is endorsed by YukiSU. Prefer an original device-vendor URL, then independently verify firmware identity and output hashes before flashing.

## LKM source

The page can:

- choose an APK-bundled LKM from detected KMI; or
- use a local `.ko` instead.

A local file is only accepted as the LKM input; that does not establish trustworthy provenance. Check Android/KMI, kernel configuration, YukiSU version, signature/source, and support for the selected SuperKey, ImgPatch configuration, and UTS options.

## Where advanced options are stored

| Option | Effect | Risk and lifecycle |
| --- | --- | --- |
| SuperKey | Writes a salt, verifier, and auth mode into the LKM used by this patch | Bound to that LKM/image; see [SuperKey](/en/manager/superkey/) |
| SuperKey-only mode | Disables APK-signature authentication | Losing the key removes the official-APK fallback |
| Always grant shell root | Lets `adb shell` invoke `su` | Expands the privileged debug surface; leave off by default |
| Force-enable ADB on boot | Forces USB debugging and disables ADB authentication | Creates a high-risk physical/debug entry point; leave off by default |
| Boot-global UTS config | Applies a UTS template early on the next boot | Requires repatching and a full reboot after changes; see [UTS View](/en/manager/uts-view/) |

The traditional path stores the corresponding startup configuration in the ramdisk. ImgPatch embeds SuperKey, shell, ADB, and boot-global UTS settings in the injected LKM. Changing a manager switch never retroactively modifies an image that was already generated or flashed.

## Backup semantics

- Traditional direct install saves a stock boot backup when appropriate. For a selected local image, “Back up as stock image” must be enabled explicitly before treating it as stock.
- ImgPatch device install keeps a per-target-slot original `boot` backup under `/data/adb/ksu/` and preserves an existing backup.
- ImgPatch “Select image” creates a matching `.yukisu-original.img` beside the patched output.

Built-in backups help recovery but must not be the only rescue plan. They may belong to an earlier OTA or slot, or may already have been modified. Keep the vendor package elsewhere and verify backup size and hash before the operation.

## Output and post-operation checks

Patch-only results go to the public Downloads directory; preserve the page log for the exact filename. Patch success does not mean the output was flashed or that it will boot.

After a direct write, verify at least:

1. target partition and slot in the operation log;
2. Ramdisk versus ImgPatch mode;
3. selected LKM/KMI and every high-risk option;
4. full YukiSU version, UAPI, Working mode, and `ksud` state after reboot; and
5. continued availability of stock images and the external recovery route.

Updating the APK, syncing device-side `ksud`, and installing an LKM are separate operations. Completing one does not update the other two.

For an architecture-level comparison, continue with [Installation and image modes](/en/guide/install-modes/). For exact CLI parameters, see [Boot image commands](/en/dev/boot-images/).

## Jailbreak install

When the APK is not currently the YukiSU manager and SELinux is Permissive, the installation page enables a late-load entry. It runs `ksud late-load` when a root shell already exists, otherwise it attempts a Magica bootstrap.

An enabled button establishes only the UI prerequisites. Actual loading still depends on a matching bundled LKM, kernel capability, and a usable Magica/root environment. Late-load lasts only for the current boot; see [Jailbreak mode](/en/guide/jailbreak-mode/).
