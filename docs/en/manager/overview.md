---
permalink: /en/manager/overview/
title: Manager overview
---

# YukiSU Manager

YukiSU Manager grants root access, manages modules and plugins, and patches boot images. It requires Android 12 (API 31) or later.

For a first installation, follow [Getting started](/en/guide/get-started/) to install the LKM. After YukiSU loads, the manager authenticates through its APK signature or SuperKey, manages grants through the kernel interface, and runs module, patching, and maintenance commands through `ksud`.

```text
UI action
   ↓
YukiSU Manager
   ├─ driver / ioctl ─→ kernelsu.ko
   └─ ksud commands ──→ installation, modules, plugins, and maintenance
```

After installation, refresh Home and check kernel authentication, UAPI, and `ksud` status.

## The five main pages

The bottom navigation, from left to right, contains:

| Page | Main purpose | Requires a working YukiSU root chain |
| --- | --- | --- |
| Home | Versions, authentication, working mode, daemon, and runtime status | Basic device information does not; management actions do |
| Plugins | Install and manage Lua plugins executed by `ksud` | Yes |
| Superuser | App root, non-root profiles, and dynamic managers | Yes |
| Modules | Module install/update/state, repositories, Action, WebUI, and shortcuts | Yes |
| Settings | Features, authentication, updates, diagnostics, uninstall, and appearance | Some items do |

See [Lua plugin management](/en/manager/plugins/) for installation, enable/disable, and configuration.

## Home status and actions

Pull to refresh Home, then use this table to handle errors:

| Home item | Displayed value | Action |
| --- | --- | --- |
| Full YukiSU version and UAPI | Loaded kernel version and manager/kernel interface versions | Resolve a UAPI mismatch with matching APK, LKM, and `ksud` builds |
| Signature / SuperKey badges | Manager authentication method | If unauthenticated, check APK provenance or authenticate a private build with its configured SuperKey |
| Kernel release | UTS identity, with an original-identity view | Select the LKM using the target image's KMI, not a modified `uname` |
| `ksud daemon` | Whether the installed file matches the bundled binary | Open details to inspect the error and sync the bundled version |
| Working mode | Hook type and LKM load method | After updating, check for the intended Ramdisk, ImgPatch, or Lateload mode |
| SELinux / Seccomp | System isolation state | Record the original state during diagnosis; do not disable it without a specific cause |
| Zygisk / MetaModule | Detected injection implementation or external mount backend | Open injection details; use Kasumi or backend logs for file-mount failures |

### Reading Working mode

The manager combines the reported hook type and load method, for example:

```text
TSR Hook | Ramdisk
TSR Hook | ImgPatch
TSR Hook | Lateload
```

- `TSR Hook` is the syscall-hook type reported by the current kernel.
- `Ramdisk` means the LKM came through the boot-ramdisk path.
- `ImgPatch` means the LKM is embedded directly in the kernel Image inside `boot`.
- `Lateload` means it was loaded after Android had already booted.

After updating the LKM, check that this line matches the installation method. For a boot or loading failure, preserve the first kernel error and `ksud` logs.

### When `ksud` is replaced

The current manager verifies the actual `/data/adb/ksud` file against its bundled `libksud.so`; it does not rely only on a version string. On mismatch:

- Home shows a warning and marks `ksud daemon` as abnormal.
- On Android 13 and later, a security notification can be posted after notification permission is granted.
- Tapping `ksud daemon` opens version details and a button that restores the bundled file.

After a mismatch alert, inspect recently installed root managers, modules, and scripts. To restore `ksud`, sync the bundled version from details. Update the LKM and boot image separately. See [Settings and maintenance](/en/manager/settings/).

### Reboot menu

The Home power menu offers reboot, Recovery, Bootloader, Fastbootd, Download, and EDL. “Userspace reboot” is added when Android reports support. Soft reboot appears when the device-side daemon reports support; v1.8.0 supports Kasumi when restoration requirements are met. Return to Home for completion or failure status; see [Soft reboot](/en/manager/soft-reboot/).

Most entries request the action immediately. In late-load mode, a normal full reboot first warns that temporary root will be lost. Confirm that the device implements the requested target, especially Download or EDL. The `ksud` soft restart is also distinct from Android userspace reboot.

## Superuser and App Profile

The Superuser page supports search, categories, sorting, system-app visibility, batch actions, swipe grant/revoke, and pull-to-refresh. Packages sharing one Android UID are managed as a group because the kernel policy ultimately applies to the UID.

v1.8.0 enumerates apps in the owner, secondary users, and work profiles, managing each full UID separately. WebView Zygote has its own non-root profile entry. An app can use the default, a template, or a custom root profile, plus a separate non-root module-unmount policy. Dynamic-manager trust is a separate high-privilege identity and is not an ordinary root grant. See [App Profile](/en/manager/app-profile/).

## Modules and MetaModule

The Modules page installs from local ZIPs or module repositories, manages enable/disable/update/uninstall state, and exposes `action.sh`, WebUI, and desktop shortcuts when a module declares them. The list supports pull-to-refresh and sorting.

After a normal installation, use the offered restart action to apply the staged directory, boot scripts, and mounts. Soft reboot can also run this flow when available. System-file mounting can be owned by the built-in Kagami engine or an external MetaModule; check the current owner. See the [Module system](/en/modules/overview/) and [MetaModule](/en/modules/meta-module/).

Repositories and local ZIPs can also run one-shot scripts. Modules supporting hot installation have a separate install flow; this does not make every module reboot-free. The Modules menu adds global version compatibility, preinit status/count reset, and mount-conflict checks. See the [Module system](/en/modules/overview/) and [Settings and maintenance](/en/manager/settings/).

## Kasumi

The Kasumi button at the top right of Home opens Status, Settings, Rules, and Logs. It reports kernel capabilities, actual mount strategies, and view state; module cards support per-module modes and path rules. Feature 106, “Built-in mounting,” and runtime views are separate controls. See [Kasumi and mount configuration](/en/manager/kasumi/).

## YukiZygisk status page

When Home detects YukiZygisk, its dedicated status page separates:

- active kernel injection and safe mode;
- Zygote monitor state and this-session injection counts;
- the actual state of native-module and native-process targets;
- anonymous loading, denylist behavior, and dmesg logging settings.

The page distinguishes unknown, failed, crashed, and injected states. Unknown means no final report has arrived, even if the target was detected or redirected. For failures or crashes, record the target, PID, and status row. See the [YukiZygisk introduction](/en/yukizygisk/intro/).

## LKM patching and installation

The installation page now covers traditional ramdisk patching, direct-kernel `ImgPatch`, remote HTTPS OTA/factory extraction, current-slot installation, and post-OTA inactive-slot installation. Supported images, backups, and embedded settings differ by path. Advanced [Boot configuration](/en/manager/boot-config/) can force selected Features, restrict early module actions, block named kernel modules, or update only the ramdisk configuration of a local image.

Read [LKM patching and installation](/en/manager/install/) and prepare the stock image for the current firmware plus a working recovery route before writing anything.

## Settings, Features, and UTS View

Settings separates items with different owners:

- formal kernel Features live on [Feature controls](/en/manager/feature-control/);
- profile templates, default module unmount, SuperKey storage, and [UTS View](/en/manager/uts-view/) remain in Configuration;
- update checks, WebUI engine, automatic `ksud` sync, auto-jailbreak, and module soft restart are app/userspace settings;
- logs, unmount paths, and permanent uninstall are maintenance tools;
- language, theme, DPI, background, and Home visibility change only the manager UI.

Check the required action before changing a setting: UI preferences apply immediately, boot configuration requires repatching and a full reboot, and per-app views require restarting the target app.

## Partition and Ramdisk tools

The installation page's advanced-tools entry opens Partition Manager. It can inspect slots and partitions, back up and flash images, run AnyKernel3, control AVB/dm-verity flags on `vbmeta`, and open supported `boot`, `init_boot`, `vendor_boot`, or `recovery` ramdisks in the editor. The editor supports text and hex editing, checksums, and sharing. See [Partition and Ramdisk tools](/en/manager/partition/).

## A reliable routine check

1. Pull to refresh Home and record full YukiSU version, UAPI, `ksud`, and Working mode.
2. Resolve `ksud`, UAPI, or root warnings before changing modules.
3. Grant only UIDs with a real need; evaluate every package in a shared UID group.
4. Check modules, MetaModule, and plugins for pending-reboot or error states.
5. Before changing a Feature, UTS setting, image, or partition, identify whether it is live, reboot-applied, or repatch-required.
6. Preserve page output and logs after high-risk operations, then verify the affected layer's real behavior.

Resolve authentication, UAPI, and `ksud` errors on Home before investigating module or injection failures.

## Source references

[Home.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Home.kt), [Module.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Module.kt).
