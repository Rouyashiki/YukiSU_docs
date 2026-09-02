---
permalink: /en/manager/settings/
title: Settings and maintenance
---

# Settings and maintenance

Settings combines kernel configuration, userspace behavior, maintenance tools, and display-only preferences. Before changing an item, identify who applies it and when it takes effect.

## Configuration

| Entry | Current purpose | Lifecycle |
| --- | --- | --- |
| App Profile templates | Sync online templates, create/edit local templates, and import from or export local templates to the clipboard | Affects a UID only after its profile selects the template |
| Feature controls | Formal Features 0–5 and 100–104 as grouped by the manager UI | Attribution and lifecycle differ; see [Feature controls](/en/manager/feature-control/) |
| Do not store SuperKey | Deletes a saved key and prevents future automatic storage | Manager storage only; does not remove the verifier from an LKM |
| Authenticate SuperKey at boot | Makes one saved-key attempt after user unlock and `BOOT_COMPLETED` | Requires app autostart permission; no retry on failure |
| Clear SuperKey | Deletes manager-stored plaintext and disables automatic authentication | Does not rotate or revoke the LKM's SuperKey |
| Unmount modules by default | Default non-root unmount policy for apps without an explicit profile | Applies to later app starts and still requires Kernel Umount Feature |
| UTS View | Original/effective identity plus runtime, denylist, and early-boot templates | See [UTS View](/en/manager/uts-view/) |

Online App Profile templates come from the KernelSU template service and are read-only in the page. Local templates can be edited and exported. Review UID, capabilities, SELinux rules, and namespace before applying either kind.

## App settings

### Update checks

- “Check for updates” controls stable-release checks when the app opens.
- “Check for CI updates” appears only while update checks are enabled. It is off by default and covers signed nightly Manager builds.
- An APK update does not automatically replace the LKM, boot image, or device-side `ksud`.

Obtain stable builds from [YukiSU Releases](https://github.com/Rouyashiki/YukiSU/releases). See [Update YukiSU](/en/guide/update/) for component and verification boundaries.

### Automatic `ksud` update

This is off by default. On a cold start, once the kernel recognizes the app as manager, it compares the actual APK-bundled `libksud.so` with `/data/adb/ksud`. On mismatch it atomically installs the bundled version through the manager's JNI/driver root channel and repairs tool links under `/data/adb/ksu/bin`.

With automatic sync off, tap the `ksud daemon` row on Home to inspect and sync manually.

::: warning Sync scope
This replaces device-side `/data/adb/ksud` and related links only. It does not flash the LKM or alter a boot image. Recheck Home versions and the complete runtime state afterward.
:::

### WebUI engine

The choices are:

- automatic selection;
- force WebUI X; or
- force KSU WebUI.

Automatic mode selects WebUI X only when module configuration explicitly requests `wx`; an undeclared or unreadable preference uses KSU WebUI. A module WebUI remains privileged module-provided content; engine selection is not a content security check.

### Auto jailbreak

This is configurable only while the current system is in late-load mode. After boot, when SELinux is detected as Permissive, the manager attempts an automatic Magica late-load bootstrap. App autostart permission is required.

It is not persistent installation and does not make SELinux Permissive. See [Jailbreak mode](/en/guide/jailbreak-mode/) for the actual prerequisites.

### Soft restart instead of reboot

This preference controls the completion action after module install, update, enable, disable, or removal. `ksud soft-reboot`:

1. runs the `emulated-soft-reboot` stage;
2. stops Android services;
3. runs YukiSU `post-fs-data` again;
4. starts Android services; and
5. runs service and boot-completed stages again.

The kernel does not restart. This cannot apply a new LKM, boot image, ImgPatch configuration, early-boot UTS template, or other state that requires a full reboot. Late-load mode forces module flows to prefer soft restart because a full reboot discards the LKM loaded for that boot.

Android “Userspace reboot” in the Home power menu is a separate platform operation shown only when the device reports support. It is not the `ksud` soft restart.

## Tools

### Logs and bugreport

“Send log” can save or share `YukiSU_bugreport_*.tar.gz`. When Superuser logging Feature is enabled, a usage-log viewer also appears with:

- current and historical log-file selection;
- search by UID, command, or details;
- event-type filters and exclusions for the manager/viewer refresh;
- raw records and paged loading; and
- clear-current-file or delete-history actions.

Clear and delete are irreversible. Preserve the original archive for a report instead of keeping only one filtered screenshot.

### Unmount Path Management

This manages kernel module-unmount paths and flags (`0` for normal unmount, `2` for `MNT_DETACH`). It can add, remove, clear custom paths, save, and apply the configuration to the running kernel.

An incorrect custom path can detach a legitimate system mount. Do not copy another device's list without understanding its mount and namespace. The page treats persisted edits as reboot-applied; “Apply configuration” pushes the current list to the live kernel but cannot retrofit namespaces of processes that already started.

### Uninstall YukiSU

Settings provides two flows:

- **Permanent uninstall:** enters the uninstall flashing flow.
- **Restore stock image:** attempts to restore the boot partition from a saved stock image.

Both modify the boot chain. Confirm that the backup belongs to the current firmware and slot, and keep an external recovery route.

## More settings

### Manager-display only

Language, Material 3 / Material 3 Expressive, light/dark theme, dynamic color, theme palette, app DPI, custom background, card opacity/dimming, and Home/module-card visibility options change only Manager presentation.

Simplicity and hide options can remove Working mode, Android version, Zygisk/MetaModule, or link cards from Home. Disable the relevant hiding options before collecting troubleshooting screenshots; absent UI is not absent functionality.

### Advanced items that change live system state

- **SELinux:** directly runs `setenforce 1/0` for the current boot; it is not persistent. Permissive materially weakens system isolation.
- **Allow any app as dynamic manager:** only exposes “Set as dynamic manager” in every app profile. It does not trust every app automatically. Once granted, manager identity is more powerful than an ordinary root grant.
- **WebView debugging / Eruda:** shown only in debug APKs. Release builds remove these developer controls and the Eruda bundle.

See [App Profile](/en/manager/app-profile/) for the dynamic-manager boundary.

## `ksud` integrity alerts

After boot, the `ksud` monitor watches the directory containing `/data/adb/ksud`, including atomic replacement that a watch on only the old inode could miss. On an event, the manager re-verifies the actual file rather than trusting broadcast data.

On an alert:

1. record the bundled version, installed-side “Unknown/mismatch” state, and alert time; if `/data/adb/ksu/ksud-integrity.json` is collected, retain its baseline/current SHA-256 and reason without executing the suspect daemon for a version;
2. review recently installed or updated root managers, scripts, and modules;
3. if recovery is intended, sync the current APK's bundled daemon from Home details; and
4. recheck root, modules, plugins, and YukiZygisk after sync instead of stopping when the warning disappears.

If a custom-built `ksud` is intentional, mismatch is expected. Pair the APK and daemon from the same build instead of permanently ignoring the alert.
