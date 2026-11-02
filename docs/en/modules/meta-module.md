---
permalink: /en/modules/meta-module/
title: MetaModule
---

# MetaModule

A MetaModule is an external module-mount backend. Ordinary system-file modules use built-in Kagami by default. Install a MetaModule when the author requires that backend or you want its features.

## Selection alongside built-in Kagami

The mount stage checks for an enabled `metamount.sh` in the active MetaModule:

- Present: execute the external script and skip built-in Kagami mounting;
- Absent or the backend is disabled: use built-in Kagami. It runs the configured plan when built-in mounting is enabled, and skips it when disabled;
- External script fails: report the error without automatically retrying built-in mounting in the same call.

If external mounting fails, read `metamount.sh` output and repair the backend. To return to Kagami, disable or uninstall the external backend, enable built-in mounting and fully reboot. See [Module mounting](/en/modules/magic-mount/).

## Identification

A MetaModule declares this in `module.prop`:

```properties
metamodule=1
```

`true` is also recognized. It remains under `/data/adb/modules/<id>/`, with the active backend addressed through the `/data/adb/metamodule/` symlink. Only one external MetaModule is maintained at a time. `disable`, `remove` and pending updates follow ordinary module handling.

YukiSU implements the KernelSU-style interfaces listed below. Before installing, follow the backend's Android, kernel-version and migration requirements.

## Interface scripts

| File | Invocation | Additional context |
| --- | --- | --- |
| `metainstall.sh` | Take over installation after an ordinary module is pre-extracted | `ZIPFILE`, `KSU_MODULE` and installer helper functions |
| `post-fs-data.sh` | Before ordinary early module scripts | MetaModule's own script environment |
| `metamount.sh` | After ordinary early scripts, Lua `post_fs_data` and property loading | `MODULE_DIR` points to the modules root |
| `metauninstall.sh` | Clean backend state when removing an ordinary module | `MODULE_ID` identifies the removed module |
| `post-mount.sh`, `service.sh`, `boot-completed.sh` | Corresponding lifecycle, before ordinary modules and Lua plugins | MetaModule's own script environment |
| `late-load.sh` | Jailbreak/late-load stage | Cannot replace real early boot |

Missing interfaces are skipped. When there is no enabled mount interface, selection follows the built-in rules above. `metamount.sh` waits until completion and does not share ordinary early scripts' 35-second wait deadline. Avoid network waits or persistent services here.

## Installing and changing backends

When an external backend provides `metainstall.sh`, YukiSU first extracts the ordinary module into `/data/adb/modules_update/<id>/`, excluding any `.ksu_hot_install` supplied by the ZIP, then sources the script to take over installation. The old active module remains in place. A failed custom installer process removes this staging directory. Call `abort` or explicitly exit nonzero on failure; letting one command fail and continuing does not report a failed installation.

Pre-extraction supports ZIP entries such as LZMA/XZ and validates paths and entry types through YukiSU's extractor. The backend must still perform its own conversion, cleanup and installation-completion handling. Extracted files alone do not mean installation is complete. Report YukiSU, backend and ordinary-module versions with the full log when installation fails.

To change external backends:

1. Record the current backend, dependent modules and configuration;
2. Uninstall the old backend in the manager, then fully reboot to finish removal;
3. Confirm it no longer owns mounting; when returning to built-in Kagami, check its enable switch and modes;
4. If choosing another external backend, install it and reboot again;
5. Verify a simple file module before checking the remaining modules.

MetaModules do not support [hot installation](/en/modules/hot-install/). The manager also restricts ordinary installation while a backend with `metainstall.sh` is pending update/removal or disabled. Reboot after installation to run mounting.

Removing an external backend does not immediately remove existing mounts. The next boot selects a backend again. Enabled built-in Kagami handles file modules using its own modes. Migrate the external backend's private data and settings according to its documentation.

## Uninstall hooks

When an ordinary module is actually removed, the still-enabled backend's `metauninstall.sh` runs first if present, followed by the module's own `uninstall.sh`. `MODULE_ID` identifies the ordinary module being removed; `KSU_MODULE` identifies the MetaModule running the hook. Both hooks wait for completion. A nonzero exit is logged and file cleanup continues.

When removing multiple modules, MetaModule is removed last. Full YukiSU uninstall follows this order after restoring the boot image; a failed boot restoration stops before module cleanup. Make cleanup repeatable and keep resources that other modules still need during their uninstall hooks.

## Mount failures

Read the backend script log, then inspect the target file. If a root shell sees the file but the app does not, inspect that app's unmount policy, WebView unmounting and Kasumi view settings. Disable the test module and fully reboot to check that the original file is restored.

MetaModule does not provide core root, handle Lua plugins under `/data/adb/plugins/`, load `zygisk/*.so` or interpret `zn_modules.txt`. For system-file mount failures, start with backend scripts and target paths.

Source references: [backend selection and interfaces](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp), [installation and module state](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp).
