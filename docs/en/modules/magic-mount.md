---
permalink: /en/modules/magic-mount/
title: Module mounting
---

# Module mounting

YukiSU uses built-in Kagami for module system files by default; no separate mounting module is required. It supports OverlayFS, Magic Mount and explicitly selected Kasumi. An enabled external [MetaModule](/en/modules/meta-module/) with `metamount.sh` takes ownership and skips built-in mounting.

Kagami arranges mounts in userspace; Kasumi provides kernel file mappings. Before using Kasumi, inspect kernel support and the protocol version in the manager. Built-in Kagami does not automatically load an external Kasumi LKM.

## Modes and defaults

| Mode | Selection rule |
| --- | --- |
| `auto` | Use OverlayFS when suitable, otherwise Magic Mount; no mounting when both are unavailable/disabled |
| `overlay` | Use enabled, kernel-supported OverlayFS, otherwise use fallback selection |
| `magic` | Use enabled Magic Mount, otherwise use fallback selection |
| `kasumi` | Use Kasumi only when explicitly selected, enabled and protocol-compatible; otherwise fall back to OverlayFS/Magic Mount |
| `none` | Do not mount the module's files; ordinary lifecycle scripts are not disabled by this mode |

Built-in mounting defaults to enabled, with global mode `auto`. **`auto` does not automatically prefer Kasumi.** Automatic selection also checks module layout: for example, replacing files directly at a partition root selects Magic Mount rather than forcing OverlayFS.

Fallback selection happens before mounting. If the selected backend fails while mounting, it reports failure without automatically retrying the module through another backend.

A global mode other than `auto` overrides per-module modes. With global `auto`, individual module settings apply. Module cards can show configured modes and selected strategies, edit module rules and check file conflicts. These built-in mount controls do not apply when an external backend owns mounting or built-in mounting is disabled.

## When changes take effect

After saving a mode, updating system files or changing module state, a full reboot builds a new mount plan. Eligible devices can also use an [emulated soft reboot](/en/manager/soft-reboot/) to remove the old plan, apply updates and mount again. It restarts Android userspace without running preinit or reparsing module init rc.

An ordinary post-boot Kasumi refresh only replays modules recorded in this boot's mapping plan. It cannot add an entirely new module. Use a full reboot for new modules, or an emulated soft reboot after checking its requirements.

[Hot installation](/en/modules/hot-install/) switches the active directory without remounting. The new mount plan skips modules marked `skip_mount`, `disable` or `remove`, and modules set to `none`.

## Mounting, scripts and injection

- `ksud` dispatches `post-fs-data.sh`, `service.sh` and other scripts;
- Built-in Kagami or an external MetaModule handles trees such as `system/`;
- YukiZygisk handles `zygisk/*.so` and `zn_modules.txt`.

If scripts succeed but files are missing, inspect the mount plan. If system paths are visible but an app cannot see them, inspect views and namespaces. If Zygisk has no effect, inspect injection status.

## Per-app unmounting and WebView

The kernel can unmount module mounts in a Zygote child's own namespace according to its root profile. When files are missing inside an app, inspect that app PID's namespace rather than only the root shell.

v1.8.0 moves WebView unmounting into app profiles. Open **WebView Zygote** (UID 1053) in the superuser list and inspect its “Unmount modules” setting; there is no separate global WebView switch. When enabled, its descendants inherit the unmounted view and cannot read the removed WebView resource, library or configuration replacements. Disable unmounting for this entry when your module depends on those replacements, then fully reboot. This setting does not control Zygisk callbacks. See [App profiles](/en/manager/app-profile/).

YukiZygisk denylist modes also use per-app unmount results. Disabled mode adds no injection restriction; Enforce skips ordinary Zygisk injection for targets; Restore retains injection while preserving ordinary-module unmounting. Zygisk modules must clean up their own private mounts.

## Kasumi rules and ordinary hiding

v1.8.0 uses Kasumi API 18. The built-in backend uses it only when the kernel protocol matches and Kasumi is enabled. This does not change the OverlayFS/Magic Mount selection used by `auto`.

Kasumi module mappings can bypass policy:

- By default, bypass is off and rules follow Kasumi's access policy.
- Enabling module-level bypass makes all of that module's Kasumi rules global.
- Enabling rule-level bypass affects only that ADD, MERGE or HIDE rule. A rule cannot opt out while module-level bypass is on.
- Bypass changes neither OverlayFS nor Magic Mount rules and does not grant root access.

Keep the default when limiting which processes see module content. Enable bypass only for rules that must apply globally. See [Kasumi settings](/en/manager/kasumi/) for UID policy, shared/isolated views and user hide rules.

Mount hiding now has a single ordinary toggle, disabled by default; aggressive hiding has been removed. Hiding mount records does not restore original files for an app, so it cannot replace app-profile unmounting. SELinux Guard defaults to off and provides experimental compensation for context-write timing. It does not disable SELinux or replace a module's required `sepolicy.rule`.

## Diagnosis and recovery

For a mount failure, query the backend, configuration, module strategies and recovery status from a root shell:

```sh
ksud kagami api meta
ksud kagami api backends
ksud kagami config show
ksud kagami module list --all
ksud kagami module check-conflicts
ksud kagami recovery status
```

Conflict checks list modules replacing the same path. Disable conflicting modules, inspect the strategy selected in `module list --all`, then fully reboot and check the file inside the target app.

Kagami mount recovery and module preinit use separate counters. When Kagami protection triggers, repair the failing module or mount configuration, then use Kagami's recovery control. `ksud module preinit reset` resets only preinit.

If the cause remains unclear, enable one simple file module, fully reboot and inspect its file. Then disable the module, reboot and check that the original file is restored.

Source references: [built-in entry](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/embedded.cpp), [mode selection and mount plans](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/backend.cpp), [defaults](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/include/kagami/config.hpp), [manager controls](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/util/KasumiManager.kt).

Rule implementation: [Kasumi](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/kasumi.cpp).
