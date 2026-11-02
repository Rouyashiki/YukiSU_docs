---
permalink: /en/guide/features/
title: Feature overview
---

# Feature overview

YukiSU provides app authorization, built-in module mounting, YukiZygisk, and boot-image tools. Use the table below to find the component you need. When upgrading, update Manager, installed `ksud`, and any LKM that needs replacing by following [Updating](/en/guide/update/).

## Responsibilities

| Need | Component | Notes |
| --- | --- | --- |
| Application root and permissions | Kernel, Manager, App Profile | Per-app identity, capabilities, SELinux, and namespace settings |
| Module scripts, properties, policies | `ksud` | Does not require file mounting or Zygisk |
| Mount module files over system paths | Built-in Kagami or external MetaModule | An enabled external `metamount.sh` takes precedence; otherwise Kagami runs |
| Zygisk / Native ZN modules | YukiZygisk | Optional; check ABI, process targets, and module APIs |
| Boot images, partitions, AVB | Manager and `ksud` | File patching, device writes, and boot configuration are separate operations |
| One-time maintenance | Manager script runner | Keeps run history without creating an installed module |

Kagami `auto` selects OverlayFS or Magic Mount using kernel support, enabled backends, and the module’s file layout. An actual mount failure does not retry with another backend. Kasumi requires explicit selection. An external mount-script failure does not trigger a second mounting attempt through Kagami. See [Module mounting](/en/modules/magic-mount/).

## Feature IDs

The current UAPI defines 13 features with sparse IDs. `0–99` is the KernelSU range; YukiSU extensions start at `100`. Open Settings → Feature controls to see supported entries, current values, and forced states.

| ID | Name | Purpose |
| --- | --- | --- |
| 0 | `SU_COMPAT` | Traditional su entry |
| 1 | `KERNEL_UMOUNT` | Module unmount policy for application environments |
| 2 | `SULOG` | su request and authorization logs |
| 3 | `ADB_ROOT` | Supported ADB root path |
| 4 | `SELINUX_HIDE` | Adjust application-visible SELinux state |
| 6 | `SHELL_SU_ADB_ONLY` | Restrict an already authorized shell to trusted session origins |
| 101 | `MAGISK_COMPAT` | Magisk-style su authorization prompts |
| 102 | `DEFAULT_NO_NEW_PRIVS` | YukiSU no-new-privs flag for the default root profile |
| 103 | `YUKIZYGISK` | Built-in YukiZygisk runtime |
| 104 | `HIDE_BOOTLOADER` | Adjust bootloader / Verified Boot property views after boot |
| 105 | `KASUMI_SUCOMPAT` | Kasumi su entry |
| 106 | `KASUMI` | Built-in Kasumi switch |
| 107 | `UNSHARE_MNT` | Optional mount-view cleanup |

Manager presents the su entry as Disabled, Traditional, or KSM instead of independent combinations of IDs 0 and 105. Disabling Kasumi also handles dependent su settings. See [Feature controls](/en/manager/feature-control/) and [Kasumi](/en/manager/kasumi/).

ID 6 does not grant shell root and is separate from ADB Root. Once shell is authorized, it additionally checks for an `adbd` or YukiSU root-domain ancestor.

v1.8.0 no longer uses IDs 5 and 100. Configure WebView unmounting in Superuser → WebView Zygote, under its non-root profile. Enhanced security has been removed. Remove these retired IDs from boot configuration and scripts.

## Runtime settings and boot configuration

Manager saves feature changes. ADB Root also restarts `adbd`; Magisk compatibility adjusts the su entry. If an operation fails, read the error and restore the setting. Module-managed features identify their managing module; disable that module's feature management before changing the value manually. Entries marked as requiring a reboot need a full reboot.

Boot configuration can force supported features. Forced entries cannot be overridden at runtime; change the relevant boot image and perform a full reboot. Installation also offers preinit controls, boot debugging, shell authorization, and an optional kernel-module blacklist. See [Boot configuration](/en/manager/boot-config/).

These options do not disable SELinux, relock the bootloader, or guarantee integrity-check results. ID 102 is YukiSU's own elevation restriction, not Linux `PR_SET_NO_NEW_PRIVS`.

## Modules and execution stages

- Ordinary modules use `module.prop`, lifecycle scripts, `system.prop`, and `sepolicy.rule`.
- [Hot installation](/en/modules/hot-install/) requires explicit module support and a suitable running environment. It cannot replay every boot behavior immediately.
- [Preinit](/en/modules/preinit/) executes synchronized early actions before SELinux setup on the next full boot; hot installation cannot replay it.
- [One-shot scripts](/en/modules/one-shot/) support independent maintenance through repository entries or local ZIPs, parameter forms, and run history.
- [WebUI](/en/modules/webui/) and [Lua plugins](/en/modules/plugin/) use different extension APIs and permission boundaries.

## Authorization and authentication

Root authorization permits elevation; [App Profile](/en/manager/app-profile/) constrains the resulting identity and environment. Revocation affects new requests; restart processes that already obtained root before checking it.

v1.8.0 uses `u:r:ksu:s0` as the default root SELinux domain and enables feature 102 by default. Existing custom domains and per-app flags are retained. Test existing grants after upgrading; there is no need to recreate all profiles.

The official Manager uses APK identity authentication. [SuperKey](/en/manager/superkey/) and dynamic managers provide additional authentication paths. Per-signature compatibility values change the versions a trusted manager sees. They cannot make a third-party command work when YukiSU does not implement it.

Global module-installation compatibility values are separate from dynamic-manager compatibility overrides. Record both when diagnosing version checks.

## YukiZygisk

The built-in runtime handles ordinary Zygisk modules and Native ZN targets. Manager exposes load policies, anonymous memory, process monitoring, crash protection, and recovery state. After enabling the runtime, reboot fully, start the target app, check its injection result in YukiZygisk, then test the module’s feature.

Basic root and ordinary modules remain available when YukiZygisk is disabled. See [Features and status](/en/yukizygisk/features/) and [Native ZN](/en/yukizygisk/native-zn/).

## Manager maintenance tools

Manager supports local and remote image patching, OTA slots, partition backups and writes, text and binary Ramdisk editing, AVB controls, App Profile backup restoration, and diagnostics. Check the exact file or partition an operation will write. See [Manager overview](/en/manager/overview/).

Manager now uses Material 3 Expressive throughout, with compact layout and motion preferences. Kasumi rules include policy bypass controls, conflict notices, and SELinux Guard. Emulated soft reboot is offered according to daemon capabilities and reports rule-restoration progress. See [Kasumi](/en/manager/kasumi/) and [Soft reboot](/en/manager/soft-reboot/).

## Sources

- [Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h)
- [Feature persistence](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp)
- [Mount-backend selection](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp)
