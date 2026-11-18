---
permalink: /en/guide/update/
title: Update
---

# Update YukiSU

## Switching from the old Manager to v1.9.0

**Install the v1.9.0 APK manually and keep the old Manager for now.** The official package name changed from `com.anatdx.yukisu` to `org.rouyashiki.yukisu`, and the APK has a new signing certificate. Android installs it as a separate app, so you may see two YukiSU icons. The old Manager’s CI updater cannot make this switch.

1. **Save what you need from the old app.** Note any module and plugin repository URLs you added and export the backups you want to keep to Downloads or a computer. Check your last patch log. If the only copy of your stock image is in the old app’s private `boot_backup/` directory, get a separate copy that matches your current firmware.
2. **Install the new Manager.** Download `YukiSU_v1.9.0_10745-arm64-v8a-release.apk` from the [v1.9.0 release](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.9.0). To tell the icons apart, long-press one and open App info. Look for **v1.9.0 (10745)** or the new package name, depending on what your device displays.
3. **Update the kernel module (LKM) using your usual method.** For a boot-image installation, use the v1.9.0 LKM for your kernel’s KMI and reboot fully. An old kernel may only trust the old certificate. If the new Manager cannot install directly, use it to patch the stock image for your current firmware, then flash it using your device’s usual method. See [Installation and image modes](/en/guide/install-modes/) for the partition and slot. If you use [temporary root](/en/guide/jailbreak-mode/), fully reboot to end the old session and use the new Manager to load the matching LKM again.
4. **Check the result in the new Manager.** Home should show the running v1.9.0 LKM. Tap `ksud daemon` and sync if the installed copy differs from the bundled one. Try root with a trusted app and check your modules and repositories. If you use Kasumi, its status page should show API 19.

### What carries over?

| Where the data lives | What to do |
| --- | --- |
| Shared data under `/data/adb`, including installed modules and their configuration | Leave it in place. The new Manager can read it once the kernel recognizes the app. |
| The old app’s settings, repository sources, and private backups | Recreate your preferences and add your repositories in the new app. Keep any backups you need before removing the old APK. |
| A SuperKey you saved yourself | Enter it again in the new Manager. Android excludes the saved key from backups and device transfers. Official signature authentication works with this field empty. |

The official v1.9.0 LKM trusts both certificates during the transition. The new `ksud` opens the new Manager by default, including for root prompts and when late-load finishes. Once you have everything you need, you can remove the old package through Android’s app info. The Manager’s permanent uninstall action removes YukiSU from the device.

### Other changes you may notice

- **If you use built-in Kagami**, late-load mounts module files before the later scripts run. This release also fixes old files left behind after uninstalling a module. [Module mounting](/en/modules/magic-mount/)
- **If YukiZygisk reports mixed results**, some loads succeeded and others failed during the same Zygote session. Open the module details to find the record for the affected app. [YukiZygisk status](/en/yukizygisk/features/)
- **If you use Magisk su compatibility**, the Manager warns you when default module unmounting could prevent a root prompt. You can change the setting for the affected app. [Feature controls](/en/manager/feature-control/)

## Future updates

Download stable builds from [GitHub Releases](https://github.com/Rouyashiki/YukiSU/releases). To try development builds, turn on **Check for CI updates** in the new Manager. It uses the [CI update site](https://yukisuupdates.rouyashiki.org/) and checks the repository, package name, APK signer, and build signature.

Automatic `ksud` updates are on by default. On a cold start, the Manager compares its bundled `ksud` with `/data/adb/ksud` if the kernel already recognizes the app. If authentication finishes later, use the sync button on Home. This setting updates the device-side `ksud` only.

## LKM and boot components

Keep a stock image for your current firmware on a computer. For a Ramdisk installation, patch `boot` or `init_boot` according to your device layout. ImgPatch uses the `boot` image containing the kernel. See [Installation and image modes](/en/guide/install-modes/) if you are switching layouts or the patcher reports a backup error.

Direct installation writes to the target partition and records it in the install log. To keep a patched image file, choose local or remote image patching. Fully reboot to load the updated LKM and boot configuration.

## After an OTA

On an A/B device, use **Install to inactive slot** after the OTA finishes and before rebooting into the new slot. Verify the slot, partition, and KMI on the install page. The Manager reads the KMI from the new slot’s `boot` image. If it cannot read it, check the OTA and the stock image before continuing.

## Updating configuration and modules

If you use forced boot settings, preinit, or a kernel module blocklist, select them again when patching. Configuration-only mode rebuilds the settings from the options you choose this time. Ordinary module updates are merged at the next boot. Use a full reboot for early boot scripts. When restoring an App Profile backup, check the app and Android user before applying its old grants. [Boot configuration](/en/manager/boot-config/) · [App Profile backups](/en/manager/app-profile/)

## Coming from a release older than v1.8.0?

If you skipped v1.8.0, check two settings. The default root domain is `u:r:ksu:s0`. The first migration enables Feature 102. Existing custom profiles keep their domains and flags. WebView module unmounting moved to **Superuser → WebView Zygote**. Remove retired Feature IDs 5 and 100 from old scripts and forced boot settings. See [App Profile](/en/manager/app-profile/) and [Feature controls](/en/manager/feature-control/).
