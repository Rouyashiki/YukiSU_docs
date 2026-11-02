---
permalink: /en/manager/feature-control/
title: Feature controls
---

# Feature controls

Open “Settings → Feature controls.” YukiSU defines 13 Features: `0–4`, `6`, and `101–107`. The su mode selector coordinates IDs 0, 105, and the related 101; other features use their page controls.

## Support, current values, and boot locks

The manager reads support, live values, and forced flags from the running kernel. Unsupported features are disabled on older LKMs; updating the APK does not add features to an old kernel.

Normal changes go through `ksud` to set and persist the value, with rollback attempted on failure and actual state read back afterward. sulog, Magisk compatibility, and YukiZygisk also require daemon or boot-state handling, so calling a kernel setter alone is not equivalent.

Features **forced on or off by boot configuration** appear locked and reject runtime changes. To unlock one, choose “Not locked” during installation, repatch and flash the target image, then fully reboot. Reinstalling the APK or clearing its data cannot unlock it. See [Boot configuration](/en/manager/boot-config/).

## Feature IDs and behavior

`0–99` is the upstream-compatibility reserved range. Former ID 5 (WebView unmount) and ID 100 (enhanced security) have been removed and remain unused. Do not write old settings for them. Configure WebView unmount through the [WebView Zygote Profile in Superuser](/en/manager/app-profile/).

| ID | Feature | Current behavior and lifecycle |
| --- | --- | --- |
| 0 | Traditional su compatibility | The “Traditional” su mode; mutually exclusive with Kasumi su compatibility |
| 1 | Kernel Umount | Global profile-driven module unmount mechanism; “Disable kernel umount” is an inverted switch |
| 2 | Superuser logging | Records kernel superuser events, persisted by `sulogd`; enables the usage-log viewer in Settings |
| 3 | ADB Root | Runs `adbd` as root; the manager restarts it after saving, so reconnect the current ADB session |
| 4 | SELinux hide | Handles selected app-facing policy observation paths; follow the reboot prompt |
| 6 | Restrict Shell root to ADB | Adds an ancestry check to an existing shell grant: the chain must contain `adbd` or a YukiSU root-domain process; disabled by default |
| 101 | Magisk-style authorization prompt | Provides first-use interaction for ungranted apps in Kasumi su mode; App Profile still controls authorization |
| 102 | Default anti-escape (no-new-privs) | Enabled by default; blocks further YukiSU elevation for default root profiles; custom profiles can decide separately |
| 103 | YukiZygisk | Master switch for integrated injection; verify Zygote, native targets, and modules after a full reboot |
| 104 | Unlock Status Hide | Rewrites selected bootloader/verified-boot properties during service; reboot to verify either enabling or disabling |
| 105 | Kasumi su compatibility | The experimental Kasumi su mode; requires corresponding kernel support and an available Kasumi runtime |
| 106 | Kasumi | Built-in Kasumi feature switch; distinct from “Built-in mounting”; follow the reboot prompt |
| 107 | Mount view cleanup | Rebuilds the mount namespace after module unmount and adjusts corresponding visible IDs; restart the target app |

Kernel Umount, App Profile's module-unmount policy, WebView unmount, and mount view cleanup are related but distinct controls. Other options cannot replace the global unmount mechanism when it is disabled, and existing app namespaces are not rebuilt automatically.

## Upgrade defaults and module ownership

After upgrading to v1.8.0, `ksud` performs a one-time defaults migration that enables and saves Feature 102, including when an old configuration saved it as disabled. A manual change made after migration is preserved. Existing custom Root Profile flags and SELinux domains are not overwritten by the global default; edit those profiles individually when needed.

A feature marked “Managed by module” cannot be changed directly in Manager or with an ordinary `ksud feature set/set-save` command. Change it through the owning module, or disable that module and reboot before using Feature controls. su compatibility IDs 0, 101, and 105 form a coupled group: a module that owns one controls the group. Related transitions required to disable Kasumi are also restricted. Boot-forced values take precedence over module ownership.

To investigate a difference between saved and current values, query both:

```sh
/data/adb/ksud feature list
/data/adb/ksud feature get default_no_new_privs
/data/adb/ksud feature get default_no_new_privs --config
```

Ordinary `get` reads the running kernel. `--config` reads only persisted configuration and prints `Not set in config` when no value is saved. Check `list` for module ownership or boot locks, and whether configuration has been restored, before changing a value.

## Three su modes

| Mode | Meaning |
| --- | --- |
| Off | Disables both traditional and Kasumi su entry points; does not revoke existing root processes |
| Traditional | Uses the traditional compatibility path and disables Kasumi su compatibility and Magisk-style prompting |
| Kasumi (experimental) | Uses the Kasumi VFS su entry point; supports a custom su path and optional Magisk-style prompting |

Mode changes persist related Features and attempt to restore the previous state on failure. Forcing `su_compat` at boot also restricts the related mode, path, and prompt controls.

The custom su path defaults to `/system/bin/su` and is editable only in Kasumi mode. It must be a valid absolute path with an existing parent directory and must not overwrite an existing file. Update the su path in your tools after changing it; tools that search only the old path will not find the new entry point.

## Three separate shell settings

- **Always grant shell root:** an installation-time shell authorization policy.
- **ADB Root (ID 3):** whether `adbd` itself runs as root.
- **Trusted shell sessions only (ID 6):** restricts which process chains may use an existing shell grant.

ID 6 neither grants shell access nor enables USB debugging. A UID 2000 shell is rejected when its ancestry contains neither `adbd` nor a YukiSU root-domain process, even if a grant query says it is allowed. Processes detached from the original session and reparented to init must pass the same check.

## What hiding features change

Unlock Status Hide changes a property view, including `ro.boot.vbmeta.device_state` and `ro.boot.verifiedbootstate`. It does not relock the bootloader, rebuild AVB signatures, or repair modified images. A `locked/green` string is not the real boot-security state.

SELinux hiding handles policy queries, Kasumi handles configured file and mount views, and mount view cleanup handles namespaces and visible IDs. Apps can still detect root through other interfaces. See [Kasumi and mount configuration](/en/manager/kasumi/) for details.

Change one item at a time and check actual values and errors after saving. Restart the app or device as required. After enabling YukiZygisk, fully reboot and follow [injection-state checks](/en/yukizygisk/intro/) for Zygote and target processes.

## Source references

[Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h), [FeatureControlScreen.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/feature/FeatureControlScreen.kt), [SuCompatMode.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/feature/SuCompatMode.kt), [shell_su_adb_only.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/feature/shell_su_adb_only.c).

[Feature persistence and ownership](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp).
