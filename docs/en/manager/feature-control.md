---
permalink: /en/manager/feature-control/
title: Feature controls
---

# Feature controls

The current manager places formal kernel Features under “Settings → Feature controls.” IDs come from [`uapi/feature.h`](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/feature.h): 0–99 are the upstream-compatibility reserved range, while explicitly numbered YukiSU extensions start at 100.

There are currently 11 entries, not the older 0–4 and 100–103 set.

## How the page reads and writes state

The manager reads support and the live value directly from the **running kernel** over ioctl. If an older LKM does not implement an ID, that switch is disabled as unsupported. A visible row does not establish kernel support.

On change, the manager asks `ksud` to set the runtime value and persist the feature configuration. If persistence fails, it attempts to restore the previous runtime value and save again. sulog, Magisk compatibility, and YukiZygisk also require daemon or boot-snapshot side effects owned by `ksud`; a kernel setter alone is not an equivalent configuration path.

## The manager's KernelSU group

The UI places IDs 0–5 on its “KernelSU features” card, but UI grouping is not sufficient attribution. Current official KernelSU `main` exposes IDs 0–4. ID 5, WebView Zygote Umount, is implemented by YukiSU inside the upstream-reserved range and is not currently a feature shared identically by both projects.

| ID | UI label | Actual effect | Lifecycle note |
| --- | --- | --- | --- |
| 0 | Disable su compatibility | Inverted display of `SU_COMPAT`; when disabled, apps cannot start new elevation through traditional `su` | Existing root processes are not revoked |
| 1 | Disable kernel umount | Inverted display of `KERNEL_UMOUNT`; disables kernel handling of profile-driven module unmount | Affects module visibility for later app processes |
| 2 | Superuser logging | Records kernel superuser events and persists them through `sulogd` | The usage-log viewer appears in Settings while enabled |
| 3 | ADB Root | Runs `adbd` with root privileges | The manager restarts `adbd` after saving, so the current ADB connection may drop |
| 4 | SELinux hide | Hides YukiSU/KernelSU policy changes from app-facing SELinux probes | The UI explicitly requires a reboot |
| 5 | Unmount modules for WebView | Removes module mounts before WebView sandbox processes inherit the WebView zygote namespace | Requires global Kernel Umount to remain enabled; reboot required; modules that modify WebView resources may break |

`KERNEL_UMOUNT` is the global mechanism. “Unmount modules” in App Profile and Feature 5 are policies layered on it; disabling the global mechanism prevents either one from performing a kernel unmount by itself.

## YukiSU Features 100–104

| ID | UI label | Actual effect | Lifecycle note |
| --- | --- | --- | --- |
| 100 | Use strict security policy | Blocks elevation outside the YukiSU domain and unauthorized app-UID downgrade | Authorization hardening, not root hiding |
| 101 | Magisk-style su prompt | Provides visible `su` and a first-use prompt for apps absent from the allowlist, with `msud` support | Manager runs `magisk-compat apply`; follow its reboot prompt when enabling |
| 102 | Default anti-escape (no-new-privs) | Makes callers still using the default root profile—including manager and shell—block re-escalation by default | Primarily affects subsequent default-profile elevation; custom profiles decide separately |
| 103 | YukiZygisk | Enables kernel Zygote capture and the integrated YukiZygisk chain | Saves the master state; verify injection after a full reboot |
| 104 | Unlock Status Hide | Uses built-in resetprop during service stage to rewrite selected bootloader/verified-boot properties to a locked-looking view | Reboot after enabling; reboot after disabling to restore properties already rewritten this boot |

### Unlock Status Hide does not relock the device

Feature 104 changes an Android property view, including properties such as `ro.boot.vbmeta.device_state`, `ro.boot.verifiedbootstate`, and selected vendor variants. It does not:

- relock the bootloader;
- restore the AVB chain of trust;
- repair a modified boot image; or
- guarantee bypass of other unlock or root signals.

Treat it as soft property rewriting. A displayed `locked` or `green` value is not the real boot-security state.

### Magisk-style prompting does not replace App Profile

Feature 101 changes the interaction when an unlisted app first invokes `su`. The Superuser list and [App Profile](/en/manager/app-profile/) still determine the final allow/deny decision and the resulting UID, capabilities, SELinux domain, and namespace.

### The YukiZygisk switch does not prove injection

Feature 103 is only the master switch. After reboot, separately inspect kernel injection, Zygote, native-target, and module state on the YukiZygisk page. Safe mode or daemon failure can leave “enabled” different from “injected.”

## Changes that deserve extra care

- **Disabling su:** the manager may retain driver access, but tools that depend on `su` lose the ability to open new root sessions.
- **ADB Root:** restarting `adbd` drops transport; prepare another access route for remote-only work.
- **Strict security / no-new-privs:** tools that depend on re-elevation or UID transitions may stop working.
- **WebView unmount:** there is a direct trade-off with modules that modify WebView resources.
- **SELinux and unlock-status hiding:** each covers a defined observation surface, not general root hiding.

Change one item at a time, record its old value, and honor the UI's reboot requirement. If saving fails, do not trust the switch animation: refresh the page to read the running kernel again and inspect `ksud` output.
