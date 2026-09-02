---
permalink: /en/modules/magic-mount/
title: Module mounting
---

# Module mounting

YukiSU does not include a fixed Magic Mount backend. During normal boot, `ksud` calls the active MetaModule's `metamount.sh` after ordinary-module `post-fs-data.sh`, Lua plugin `post_fs_data` callbacks and `system.prop`. That backend decides how `/data/adb/modules/` is processed.

Core YukiSU therefore does not promise that a backend:

- always uses bind mounts or OverlayFS;
- exactly reproduces Magisk Magic Mount conflict, whiteout or replacement semantics;
- accepts every Magisk module unchanged;
- exposes an ordinary module's `system/` without MetaModule;
- makes the same mounts visible in every app namespace.

“MetaModule required” means that a module has files to mount but no active backend is available. Select a MetaModule suitable for the Android release, kernel and module, then validate it using its own documentation. See [MetaModule](/en/modules/meta-module/).

## Mounts, scripts and injection are separate

- YukiSU dispatches `post-fs-data.sh`, `service.sh` and other scripts.
- MetaModule mounts the `system/` tree.
- YukiZygisk handles `zygisk/*.so` and `zn_modules.txt`.

If scripts succeed but system files do not appear, inspect MetaModule. If files appear in a shell but not one app, inspect that app's namespace and unmount policy. If a Zygisk module has no effect, diagnose YukiZygisk instead of replacing the mount backend.

## Per-app unmount

After mounts are established, the YukiSU kernel can still unmount module paths according to root profiles while an app is derived from Zygote. This happens in the app's own namespace; it is not another MetaModule installation or mount pass.

A shell, manager, ordinary app and isolated process can therefore expose different mountinfo. Always name the PID/namespace used for verification. A result from the init namespace does not prove visibility to every app.

## WebView Zygote

“Unmount modules for WebView” is a separate kernel feature and is off by default. When enabled, the UID 1053 WebView Zygote receives a namespace with ordinary module mounts removed; descendant WebView sandbox processes inherit that view.

The benefit is reduced module-mount visibility from WebView processes. The explicit cost is that modules replacing WebView resources, libraries or configuration may stop working. Reboot after a change so a new WebView Zygote and its children inherit consistent state.

This feature is not YukiZygisk and does not decide whether Zygisk callbacks run.

## YukiZygisk denylist and private mounts

YukiZygisk denylist mode combines with YukiSU's per-app unmount result to decide whether ordinary Zygisk modules run in a target app:

- Off: the denylist does not add a YukiZygisk injection decision.
- Force: unmount ordinary module mounts and skip Zygisk module injection for the target.
- Restore: keep Zygisk injection while retaining the ordinary-module unmount result.

Integrated YukiZygisk does not scan and remove mounts that a Zygisk module itself creates in the app's private namespace after specialization. The creating module owns those mounts and their lifecycle; they are not MetaModule system-file mounts.

## Minimal verification

1. Enable one file-mount module with an obvious result.
2. Confirm that `disable`, `remove` and `skip_mount` are absent.
3. Confirm that the single MetaModule completes `post-fs-data.sh` and `metamount.sh`.
4. Reboot, then inspect from both an init/root shell and the target app namespace.
5. If only WebView loses visibility, check the WebView Zygote unmount feature.
6. Disable the test module, reboot again, and confirm that the target file disappears.
