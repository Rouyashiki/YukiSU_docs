---
permalink: /en/troubleshoot/common/
title: Common troubleshooting
---

# Common troubleshooting

Record the last working state, the change before failure, and the Manager, running LKM, and installed `ksud` versions. Updating the APK does not replace the running LKM. Installed `ksud` also needs separate synchronization.

## Start with the symptom

| Symptom | Check first |
| --- | --- |
| APK installed, but Home says not installed/unsupported | Actual LKM loading, KMI, kernel facilities, authentication |
| New control appears but fails | Installed `ksud` version and running LKM support |
| Module installs without file effects | Active backend, module state, target namespace |
| Installation without reboot fails | Hot-install request, eligibility, and scripts |
| Preinit prepared but no effect | Full reboot, early logs, protection counter, actual action result |
| Zygisk module has no effect | Ordinary/Native type, ABI, target, injection and exit evidence |
| Android cannot boot | Image/slot, ordinary modules, or preinit; see [Recovery](/en/guide/rescue-bootloop/) |

## Root, Manager, and shell

Installing the APK does not load an LKM. Verify [Android/KMI support](/en/guide/compatibility/), runtime mode, and authentication. Signature rejection, an incorrect SuperKey, and an unloaded LKM are different failures.

For apps, check authorization and App Profile identity, capabilities, SELinux domain, namespace, and YukiSU no-new-privs. Revocation does not demote existing root processes; restart them before checking.

If an authorized shell is denied, inspect feature 6. It requires a trusted `adbd` or YukiSU root-domain ancestor; UID 2000 alone is insufficient. Dynamic-manager compatibility values also do not replace authorization or add capabilities.

## `ksud` integrity or version warnings

Manager compares its bundled ELF with `/data/adb/ksud`. It does not execute an untrusted mismatching file to obtain its version, so the installed version may intentionally display as unknown.

Keep the bundled version, original display, and warning time. After verifying the APK source, use synchronization in Home's details. Cold-start auto-sync is off by default. Synchronization does not update the LKM or boot image.

If replacement recurs, investigate other managers, installers, or startup scripts instead of repeatedly overwriting the evidence. See [Settings](/en/manager/settings/).

## Unsupported, rolled-back, or forced features

- Check the ID first: v1.8.0 retires IDs 5 and 100, so upgrading will not restore those controls. For other features, update the matching `ksud` and a compatible LKM that supports them, then reboot fully.
- Preserve errors from saving or follow-up ADB/Magisk operations and check rollback of runtime and saved values.
- Forced state comes from boot configuration. Change the relevant image and reboot fully.
- Disabled/Traditional/KSM su entries are coupled. Unavailable or disabled Kasumi limits dependent su features.
- If a module manages the feature, inspect that module and its `manage.*` configuration instead of repeatedly overwriting its value. See [Module configuration](/en/modules/module-config/).
- Early boot configuration, preinit, and LKM updates require a full reboot. Emulated soft reboot follows daemon support status and must finish Kasumi rule restoration.

See [Feature controls](/en/manager/feature-control/) and [Boot configuration](/en/manager/boot-config/).

## Module scripts did not run or slowed boot

Check disable/removal/update state, safe mode, line endings, shebangs, required commands, and the corresponding stage logs.

`post-fs-data.sh` should not wait for an unavailable framework or network. Use `post-mount` or later for mounted files. Late-load does not replay `post-fs-data.sh`; modules need `late-load.sh` for that initialization.

Ordinary early scripts share a waiting deadline. Timing out ends waiting, not necessarily the process. Preinit has separate action and stage termination mechanisms. See [Modules](/en/modules/overview/) and [Preinit](/en/modules/preinit/).

## Module files are not mounted

First confirm the module has `system/` content and no `skip_mount`, then identify the mount owner:

1. An enabled external MetaModule provides `metamount.sh`: inspect its install, boot, and mount output. Failure does not fall back to Kagami.
2. No such external script exists: inspect built-in Kagami settings, selected backend, and status. Absence of a MetaModule is not itself a missing dependency.
3. Kagami `auto` selects OverlayFS when eligible, otherwise enabled Magic Mount; execution failure does not retry another backend. Kasumi requires explicit selection and kernel support.
4. If global paths work but an app cannot see them, check App Profile, kernel unmounting, Kasumi views, and feature 107.

For WebView sandbox-only differences, check the non-root profile under Superuser → WebView Zygote and global Kernel Umount. v1.8.0 no longer uses feature 5. Save, reboot fully to recreate the shared Zygote, then check the affected page. Change one backend/module/policy variable at a time. See [Mounting](/en/modules/magic-mount/).

## Soft reboot unavailable or recovery failed

Read Manager's reason first. An outdated device-side `ksud`, incomplete boot, safe mode, unrestorable rules, or mount protection can block a request. Synchronize the v1.8.0 `ksud` and check the LKM version before retrying. Reboot fully after changing boot components.

“Request accepted” means the flow has started; keep waiting for the result. `completed_pending` means Android has started while some hide rules await their parent directories. Check the pending count and Kasumi rule state, then refresh after those directories appear. For `failed`, inspect the phase and error, retain logs, resolve the fault, and reboot fully if needed. Do not repeatedly submit soft-reboot requests. See [Soft reboot](/en/manager/soft-reboot/) for steps and status meanings.

## Hot installation failed or still needs reboot

Keep installer and immediate-script output. Verify module opt-in, ordinary-module status, safe mode, and request/path validity.

After the new module directory is committed, script errors or timeouts do not roll back the active directory or undo changes already made. `init.rc`, preinit, and existing processes still have boot/restart boundaries. See [Hot installation](/en/modules/hot-install/).

## Preinit is unprepared, skipped, or protected

The module page's preinit dialog shows kernel support, preparation state, and failed-boot count. The three causes of `unsupported` are late-load, the `preinit=0` boot parameter, and an LKM built without preinit. For `no_space`, reduce the module’s preinit content; do not remove encryption or OTA data from `/metadata`.

`ok` means the boot files are ready. Actions run on the next full boot. After a full boot, inspect both runner action diagnostics (`ksu_preinit: [MODULE_ID]`) and program output (`ksu_preinit[MODULE_ID]:`). Fix or disable the offending module before resetting protection. Reset does not execute actions immediately. See [Preinit](/en/modules/preinit/).

## One-shot script missing, invalid, or not applicable

One-shot scripts do not enter installed-module or update lists; check the latest run record. Verify ZIP structure, `action.sh`, `params.json`, and inputs. Exit code 2 means not applicable, not successful module installation.

Temporary content is cleaned after execution. The retained last-run record is not an installed module and does not undo the script's changes. See [One-shot scripts](/en/modules/one-shot/).

## YukiZygisk enabled without module effects

1. Verify basic root and required file mounts.
2. Check whether global injection safe mode is active or crash protection has suspended the ordinary Zygisk module being tested. Then check module type, ABI, and supported targets.
3. Check load policies for ordinary Zygisk modules. Native ZN always uses Bionic: inspect its loader and dependency errors; changing the YukiLinker switch does not change its path. Reboot fully after boot-configuration changes.
4. Start the target, then inspect process monitoring, Native targets, module diagnostics, and daemon recovery.
5. Record PID, process start time, injection result, exit details, and a bugreport.

For an unobserved target, start it and refresh. For injection failure, read the error for that module. If a process exits after successful injection, inspect its exit code and crash log to find why it exited.

Global Zygote protection and module crash isolation are separate. Recovering the daemon does not rerun module initialization in existing processes. After successful recovery, restart the target app. If the failure involves Zygote or boot services, or the status shows `reboot_required`, reboot fully before checking injection results. See [Runtime status](/en/yukizygisk/features/) and [Native ZN](/en/yukizygisk/native-zn/).

## Image or restoration failure

Record source, SHA-256, target KMI, partition/slot, and Ramdisk/ImgPatch/configuration-only mode. ImgPatch validates content-associated backups; do not rename an old backup to bypass this check.

Configuration-only mode does not install an LKM. Repatching rebuilds managed configuration, so omitted shell grants, forced features, and blacklists are cleared. AVB controls do not repair an incorrect image. See [Image modes](/en/guide/install-modes/), [Partition tools](/en/manager/partition/), and [Recovery](/en/guide/rescue-bootloop/).

## Reporting

Provide the shortest reproduction, first useful error, full versions, and last change, preserving before/after states. Remove SuperKey, accounts, and unnecessary personal data before sharing. See [How to ask](/en/troubleshoot/asking/).
