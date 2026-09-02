---
permalink: /en/manager/overview/
title: Manager overview
---

# YukiSU Manager

YukiSU Manager is the Android management interface, built with Kotlin and Jetpack Compose. The current APK requires Android 12 (API 31) or later.

The manager is not root by itself. Authorization, modules, plugins, patching, and maintenance work only when a compatible YukiSU LKM is loaded, this APK has authenticated as the manager, and the required userspace components are available.

```text
UI action
   ↓
YukiSU Manager
   ├─ driver / ioctl ─→ kernelsu.ko
   └─ ksud commands ──→ installation, modules, plugins, and maintenance
```

An APK that opens, a Home page that sees YukiSU, and a healthy device-side `ksud` are three different states.

## The five main pages

The current bottom navigation order is:

| Page | Main purpose | Requires a working YukiSU root chain |
| --- | --- | --- |
| Home | Versions, authentication, working mode, daemon, and runtime status | Basic device information does not; management actions do |
| Plugins | Install and manage Lua plugins executed by `ksud` | Yes |
| Superuser | App root, non-root profiles, and dynamic managers | Yes |
| Modules | Module install/update/state, repositories, Action, WebUI, and shortcuts | Yes |
| Settings | Features, authentication, updates, diagnostics, uninstall, and appearance | Some items do |

The Plugins tab is present on current `main`; it is no longer only a development-branch placeholder. See [Lua plugin management](/en/manager/plugins/) for its use and security boundary.

## Home: identify the layer behind each state

Pull to refresh Home, then record these items first:

| Home item | What it establishes | What it cannot prove by itself |
| --- | --- | --- |
| Full YukiSU version and UAPI | Kernel-exposed version and whether manager/kernel UAPI match | Modules, plugins, or YukiZygisk work correctly |
| Signature / SuperKey badges | Authentication paths currently visible to the manager | Every app has root |
| Kernel release | Kernel identity in the current UTS view; the original can be shown when UTS View is active | The target image necessarily has the same KMI |
| `ksud daemon` | Whether the APK-bundled and installed files match | The LKM or boot image was updated too |
| Working mode | Hook type and LKM load method | Every hook, daemon, and target process is healthy |
| SELinux / Seccomp | Current system state | Disabling a protection will solve a compatibility issue |
| Zygisk / MetaModule | The implementation currently detected | A module's final behavior has been verified |

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

This describes how YukiSU was loaded; it is not a health check. Diagnose real failures with the full version, first kernel error, `ksud` logs, and behavior in the target process.

### When `ksud` is replaced

The current manager verifies the actual `/data/adb/ksud` file against its bundled `libksud.so`; it does not rely only on a version string. On mismatch:

- Home shows a warning and marks `ksud daemon` as abnormal.
- On Android 13 and later, a security notification can be posted after notification permission is granted.
- Tapping `ksud daemon` opens version details and a button that restores the bundled file.

A mismatch proves that the two binaries differ, not which app or process changed the file. Syncing repairs only device-side `ksud`; it does not update the LKM or boot image. See [Settings and maintenance](/en/manager/settings/).

### Reboot menu

The Home power menu currently offers reboot, soft restart, Recovery, Bootloader, Fastbootd, Download, and EDL. “Userspace reboot” is added when Android reports that the device supports it.

Selecting an entry immediately requests that action; there is no common confirmation step. Confirm that the device implements the requested target, especially Download or EDL. The `ksud` soft restart is also distinct from Android userspace reboot.

## Superuser and App Profile

The Superuser page supports search, categories, sorting, system-app visibility, batch actions, swipe grant/revoke, and pull-to-refresh. Packages sharing one Android UID are managed as a group because the kernel policy ultimately applies to the UID.

An app can use the default, a template, or a custom root profile, plus a separate non-root module-unmount policy. Dynamic-manager trust is a separate high-privilege identity and is not an ordinary root grant. See [App Profile](/en/manager/app-profile/).

## Modules and MetaModule

The Modules page installs from local ZIPs or module repositories, manages enable/disable/update/uninstall state, and exposes `action.sh`, WebUI, and desktop shortcuts when a module declares them. The list supports pull-to-refresh and sorting.

A module card appearing proves only that its directory was written. Scripts, mounts, and final behavior may require the next boot stage. System-file mounting still belongs to one MetaModule backend. See the [Module system](/en/modules/overview/) and [MetaModule](/en/modules/meta-module/).

## YukiZygisk status page

When Home detects YukiZygisk, its dedicated status page separates:

- active kernel injection and safe mode;
- Zygote monitor state and this-session injection counts;
- the actual state of native-module and native-process targets;
- anonymous loading, denylist behavior, and dmesg logging settings.

A configured native target is not necessarily injected. Current `yzctl` lets the UI distinguish unknown, failed, crashed, and injected states; unknown may also mean detected or redirected without a final report. Preserve the exact row status in a report. See the [YukiZygisk introduction](/en/yukizygisk/intro/).

## LKM patching and installation

The installation page now covers traditional ramdisk patching, direct-kernel `ImgPatch`, remote HTTPS OTA/factory extraction, current-slot installation, and post-OTA inactive-slot installation. Supported images, backups, and embedded settings differ by path.

Read [LKM patching and installation](/en/manager/install/) and prepare the stock image for the current firmware plus a working recovery route before writing anything.

## Settings, Features, and UTS View

Settings separates items with different owners:

- formal kernel Features live on [Feature controls](/en/manager/feature-control/);
- profile templates, default module unmount, SuperKey storage, and [UTS View](/en/manager/uts-view/) remain in Configuration;
- update checks, WebUI engine, automatic `ksud` sync, auto-jailbreak, and module soft restart are app/userspace settings;
- logs, unmount paths, and permanent uninstall are maintenance tools;
- language, theme, DPI, background, and Home visibility change only the manager UI.

Similar-looking switches do not imply the same lifecycle. Kernel Features, app preferences, live system state, and next-patch configuration take effect at different times.

## Partition and Ramdisk tools

The installation page's advanced-tools entry opens Partition Manager. It can inspect slots and partitions, back up and flash images, run AnyKernel3, and open supported `boot`, `init_boot`, or `vendor_boot` ramdisks in the editor. See [Partition and Ramdisk tools](/en/manager/partition/).

## A reliable routine check

1. Pull to refresh Home and record full YukiSU version, UAPI, `ksud`, and Working mode.
2. Resolve `ksud`, UAPI, or root warnings before changing modules.
3. Grant only UIDs with a real need; evaluate every package in a shared UID group.
4. Check modules, MetaModule, and plugins for pending-reboot or error states.
5. Before changing a Feature, UTS setting, image, or partition, identify whether it is live, reboot-applied, or repatch-required.
6. Preserve page output and logs after high-risk operations, then verify the affected layer's real behavior.

The manager's value is not merely collecting buttons. It exposes LKM, authentication, `ksud`, authorization, modules, plugins, and injection as separate layers—and they should be verified separately when troubleshooting.
