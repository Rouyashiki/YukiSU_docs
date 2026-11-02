---
permalink: /en/modules/hot-install/
title: Module hot installation
---

# Module hot installation

Hot installation activates the new module directory as soon as installation finishes. Modules needing immediate initialization can run a hot-install script. System-file mounts, boot scripts and native libraries in existing processes follow the rules below.

Users do not need to enable a general hot-install switch. ZIPs that do not request it retain normal installation behavior.

## Requesting activation

The installer exports `KSU_HAS_HOT_INSTALL=true`. A module can check it in `customize.sh` and set:

```sh
if [ "$KSU_HAS_HOT_INSTALL" = true ]; then
  MODULE_HOT_INSTALL_REQUEST=true
  MODULE_HOT_RUN_SCRIPT=hot-install.sh
fi
```

`MODULE_HOT_RUN_SCRIPT` is an optional path relative to the module. Keep this script in the final module directory; `ksud` runs it after activation. Do not put persistent logic in `customize.sh`, which is removed after installation. The request value must be exactly `true`. Do not ship a `.ksu_hot_install` marker in the ZIP; the completed installer creates it.

The script path must not be absolute or contain `..`. Its resolved target must be a regular file inside the module tree. A missing script is reported and skipped; other invalid paths prevent hot activation.

## What activation does

1. Extract and install the ZIP normally under `/data/adb/modules_update/<id>/`;
2. Validate the request and path; MetaModules and safe mode are excluded;
3. Move the old active directory into storage grouped by the current boot, then move the staged directory to `/data/adb/modules/<id>/`;
4. Attempt to apply the new `sepolicy.rule`;
5. Run the optional validated script in the global mount namespace;
6. Refresh init rc, preinit and YukiZygisk early snapshots for later boots.

The hot script receives the ordinary module script environment, including `KSU_MODULE`, with standard input redirected to `/dev/null`. `ksud` waits for at most 30 seconds, then reports a timeout and stops waiting while the script keeps running. Authors must handle task exit and cleanup on failure. Closing the installation page does not stop services.

## What still needs a reboot

| Content | Behavior after hot installation |
| --- | --- |
| Ordinary files, WebUI and Action | The active directory contains the new version; reopen pages or files to read it. Existing file handles still point to old files |
| `sepolicy.rule` | Immediate application is attempted; errors appear in the installation log |
| Partition files such as `system/` | Installation does not remount them; rebuild the plan through a full or eligible emulated soft reboot |
| `system.prop` and ordinary boot scripts | Not replayed automatically; the module must handle them explicitly or wait for the relevant boot stage |
| `initrc/`, `preinit/` | Update the next full boot's content; not executed during installation |
| Zygisk / Native ZN libraries | Existing processes do not have old libraries unloaded and replaced; activation follows later process/injection lifecycles |
| MetaModule | Always uses normal reboot-based activation |

An [emulated soft reboot](/en/manager/soft-reboot/) can reapply module scripts and mounts when its requirements are met. It is a separate operation, not automatic hot-install cleanup, and does not run preinit or init rc.

## Failures and fallback

If validation or directory activation fails, the log prints `Hot install skipped` and requests a reboot. Installation continues through the normal pending-update path. If the old directory was moved but activation of the new directory fails, `ksud` attempts to restore the old one and logs any restoration failure.

After a successful directory switch, a failed SELinux rule, nonzero hot-script exit or timeout **does not automatically roll back the active directory**. When `Hot install script failed` appears, the new directory is already active. Modules that need to restore configuration or undo system changes must implement recovery in their scripts.

Old directories remain under the current boot's group in `/data/adb/ksu/hot_install_trash/` for processes still using their content. Later boots clean old groups automatically. Keep these directories until reboot; the manager has no version-rollback control for them.

Source references: [installer variables](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh), [hot installation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/hot_install.cpp), [script execution and installation completion](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp).
