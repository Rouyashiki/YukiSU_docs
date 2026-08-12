---
permalink: /en/troubleshoot/common/
title: Common troubleshooting
---

# Common troubleshooting

Effective YukiSU troubleshooting begins by locating the failed layer, not by toggling more switches. The LKM, manager authentication, `ksud`, ordinary modules, MetaModule and YukiZygisk cooperate, but each has different evidence.

## Classify the symptom first

| Symptom | Most likely layer | First evidence |
| --- | --- | --- |
| Device fails immediately after flashing | Boot image, partition, slot or LKM | Write record, stock image, bootloader state |
| Android boots; manager says not installed | LKM did not load or boot chain is unchanged | Home state and complete kernel log |
| Installed, but manager has no permission | Package/signature or SuperKey authentication | Auth mode, APK source and device time |
| Root works; module scripts do not | `ksud`, safe mode or module state | Versions, module state and boot logs |
| Scripts run; system files are absent | MetaModule or mount namespace | Backend state and `metamount.sh` log |
| Ordinary modules work; Zygisk module does not | YukiZygisk, ABI or target process | Manager-exported YukiZygisk diagnostics |
| Problem appeared after an update | Version combination or pending state | Before/after versions and first error |

Choose the closest row and follow that layer. Do not attribute every problem to kernel root merely because the project name contains “SU.”

## Collect a minimum environment record

If Android boots and ADB is already authorized, record basic read-only state:

```sh
adb shell getprop ro.product.cpu.abi
adb shell uname -a
adb shell getprop ro.build.fingerprint
adb shell getprop ro.boot.slot_suffix
```

Also record from the manager:

- full YukiSU/LKM version;
- kernel version and hook state;
- manager version;
- embedded and installed `ksud` versions;
- authentication method;
- MetaModule, YukiZygisk and safe-mode state.

The first direct error is usually more useful than dozens of downstream failures.

## LKM does not load

### Symptoms

- manager reports YukiSU as not installed;
- full LKM version is empty or unreadable;
- Android boots after flashing but no YukiSU kernel capability appears;
- kernel log reports module, vermagic, symbol or relocation errors.

### Check in order

1. **Device scope:** ARM64, GKI 2.0, Linux 5.10+.
2. **Actual boot image:** patched input belongs to the current firmware and real boot path.
3. **Slot:** the A/B device boots from the slot that was intentionally modified.
4. **KMI:** LKM matches KMI, symbol versions and build configuration.
5. **Kernel facilities:** required probes and syscall tracepoints are available.
6. **First kernel error:** capture the direct failure, not just a final “failed.”
7. **Known-good state:** restore exact stock images if input provenance is uncertain.

### Do not

- force-load a mismatched `.ko`;
- disable module version or symbol checks as an experiment;
- assume another device of the same retail model uses the same LKM;
- write both slots repeatedly without knowing which one is active.

Bypassing compatibility checks can turn a clear rejected load into a later, less recoverable kernel failure.

## LKM is installed but manager cannot authenticate

Distinguish “no LKM” from “LKM does not trust this manager.” If the full LKM version is readable but grant functions are unavailable, focus on authentication.

### Default signature authentication

- APK came from [YukiSU Releases](https://github.com/Anatdx/YukiSU/releases/latest);
- package name and APK signature match the expected official build;
- LKM belongs to YukiSU, not another KernelSU fork;
- APK signature verification was not disabled during installation.

### SuperKey authentication

- LKM was built with `CONFIG_KSU_SUPERKEY=y`;
- entered key matches build/patch time exactly;
- device date and time are sane;
- request is within the allowed authentication window;
- whitespace, Unicode variants or encoding did not change the credential.

Never publish a SuperKey, patch parameter containing one, or a build log that exposes it. If the key is lost and signature auth was disabled, patch and install an LKM with a known trust configuration.

## Root request has no prompt or is denied

1. Confirm the manager authenticated, not merely that the APK is installed.
2. Check whether the app appears in Superuser and was explicitly denied.
3. Verify the request comes from the expected package, UID and process.
4. Restore the default App Profile temporarily to exclude identity/SELinux mistakes.
5. Inspect sulog or relevant diagnostics for caller and decision.
6. Fully stop the target app before testing a new `su` request.

Grant changes mainly affect new elevation sessions. An already running root process is not automatically demoted by a UI change.

## `ksud` versions differ

The manager APK embeds one `ksud`; `/data/adb/ksud` is a separately installed state. Typical symptoms include:

- authentication works, but modules or tools fail;
- Home reports different embedded and installed versions;
- a manager update displays a feature that the backend command does not understand;
- boot logs report a UAPI/version mismatch.

Record both full versions, then follow release-specific guidance for synchronization. Never copy a same-named `ksud` from another fork; the protocol and behavior may differ.

## Module script does not run

Check that:

1. the module is not disabled, pending removal or pending update;
2. YukiSU safe mode is not disabling all modules;
3. scripts use Unix line endings, a valid shebang and reasonable installed permissions;
4. `post-fs-data.sh` does not wait for framework services or networking;
5. `ksud` and LKM UAPI versions match;
6. boot logs show the relevant stage and first module error.

Code that requires completed mounts belongs in `post-mount` or later, not an early script that assumes MetaModule has already finished.

## Module installed, but files are not mounted

### Confirm that it should mount files

A module containing only scripts, `system.prop` or `sepolicy.rule` may have no system-file mount. Check for a `system/` tree and make sure `skip_mount` is absent.

### Check MetaModule

- exactly one active MetaModule exists;
- it is not disabled or pending update/removal;
- it follows the upstream interface and the backend fits the device and ordinary-module requirements;
- `post-fs-data.sh` and `metamount.sh` completed;
- any `metainstall.sh` processing completed during installation.

### Check the namespace

If a root shell sees the file but the target app does not, inspect that app's namespace and module-unmount policy. If no environment sees it, the backend likely did not establish the mount.

Do not replace MetaModule, update the ordinary module and change unmount policy simultaneously. Change one variable at a time.

## A module causes instability or slow boot

- disable the most recently installed or updated module first;
- change one suspect at a time;
- inspect blocking work in `post-fs-data.sh`;
- inspect crash/restart loops started by `service.sh`;
- check whether modules replace the same target file;
- use YukiSU safe mode if normal module control is unavailable.

Normal behavior in safe mode points toward the module layer. Persistent failure means the LKM, boot image or base system still needs investigation.

## YukiZygisk is enabled but a module has no effect

“Enabled,” “module discovered,” “target injected” and “feature working” are four separate states.

1. Stabilize ordinary root and MetaModule first.
2. Confirm YukiZygisk is not in safe mode.
3. Match 64/32-bit target ABI with module payload.
4. Verify Android, app and target-process support.
5. Keep only one test Zygisk module and reboot fully.
6. Inspect current injected targets after launching the app.
7. Export YukiZygisk diagnostics from the manager instead of copying only the last live-log lines.

After three consecutive Zygote crashes, YukiZygisk enters safe mode and stops injection. Remove or disable the newest Zygisk module before trying to leave the crash loop.

## A feature broke after updating

Split the version layers:

- Was only the manager APK updated?
- Was device-side `ksud` synchronized?
- Did the LKM or KMI change?
- Is MetaModule pending update?
- Were ordinary or Zygisk modules updated at the same time?

The most useful reproduction is “old combination works; changing only this one item fails.” Updating the whole stack and reporting “latest is broken” leaves little evidence for isolation.

## Device does not boot

Stop repeated flashing and random slot changes. Record the last image, partition and slot modified, then follow [Rescue and recovery](/en/guide/rescue-bootloop/) to restore a known-good boot chain matching current firmware.

If failure followed an ordinary-module installation, start with safe mode or disabling the newest module. If Android never booted after writing an LKM image, restore stock first instead of debugging modules.

## Before filing an issue

Include:

- device model, Android build fingerprint, kernel version and architecture;
- full LKM, manager, embedded/installed `ksud` versions;
- installation method, actual partition and slot;
- MetaModule and relevant module versions;
- the final change before failure;
- shortest repeatable steps;
- first useful error and complete diagnostic attachment;
- results of one-variable isolation.

Remove SuperKey, personal paths, account identifiers and unrelated application data before sharing logs. Read [How to ask](/en/troubleshoot/asking/) for a report template.
