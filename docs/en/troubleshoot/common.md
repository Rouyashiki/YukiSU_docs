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
| Patch, restore, or post-OTA install fails | Input image, working mode, target KMI/partition/slot | Complete install output, input provenance, slots before and after |
| Home warns that `ksud` was replaced | Device daemon differs from the current manager | Bundled version, installed-side unknown/mismatch state, and warning time |
| Feature switch fails or rolls back | Unsupported kernel, persistence, or live-apply failure | Feature name, message, and before/after state |
| Root works; module scripts do not | `ksud`, safe mode or module state | Versions, module state and boot logs |
| Scripts run; system files are absent | MetaModule or mount namespace | Backend state and `metamount.sh` log |
| Ordinary modules work; Zygisk module does not | YukiZygisk, ABI or target process | YukiZygisk status screen and manager bugreport |
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

When UTS View is active, ordinary `uname` may show the modified identity. Also record the original kernel identity shown by the manager and use the KMI parsed from the actual target image for installation decisions.

Also record from the manager:

- full YukiSU/LKM version;
- original and effective kernel releases, Hook type, and working mode;
- manager version;
- embedded and installed `ksud` versions;
- authentication method;
- MetaModule, YukiZygisk, safe-mode, and relevant Feature state.

The first direct error is usually more useful than dozens of downstream failures.

## Identify the working mode first

Home combines the Hook type and load method under “Working mode.” The second half determines where evidence lives:

| Mode | How the LKM enters the kernel | First places to inspect |
| --- | --- | --- |
| Ramdisk | YukiSU boot chain in a Ramdisk | `boot`/`init_boot`, Ramdisk payload, and early boot logs |
| ImgPatch | LKM embedded directly into the ARM64 kernel Image in `boot` | Original `boot`, target KMI, patch/restore output, and backups |
| Lateload | Temporary load after Android starts | Current-session load output and SELinux prerequisites; disappearing after reboot is expected |

These modes do not share one recovery procedure. ImgPatch is not a `.ko` copied into a Ramdisk, and Lateload is not a persistent installation. Do not report only “LKM mode.”

## LKM does not load

### Symptoms

- manager reports YukiSU as not installed;
- full LKM version is empty or unreadable;
- Android boots after flashing but no YukiSU kernel capability appears;
- kernel log reports module, vermagic, symbol or relocation errors.

### Check in order

1. **Device scope:** Android 12 or newer, ARM64, and GKI 2.0 (Linux 5.10 or newer).
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

Current official builds provide `android12-5.10`, `android13-5.10`, `android13-5.15`, `android14-5.15`, `android14-6.1`, `android15-6.6`, `android16-6.12`, and `android17-6.18` KMI targets. This is a list of prebuilt artifacts, not a promise that every vendor kernel with the same KMI label will load them; vermagic, symbol versions, and vendor changes still matter. See [Compatibility](/en/guide/compatibility/) for the complete boundary.

## Image patch or restore fails

Save the complete output first, then determine whether the operation used the traditional Ramdisk path or ImgPatch. The manager can work from a local image, extract an OTA/factory image from a URL, install directly, or install to the inactive slot after OTA. Similar entry points can target different images and slots. The remote-URL entry currently uses traditional Ramdisk patching only; ImgPatch is available for a local image, device direct install, or the inactive-slot direct-kernel branch.

### Before patching

1. The input must belong to the exact device and firmware, including remote URLs.
2. Let the manager parse KMI from the target image. Select one manually only when detection fails, and record why.
3. Verify the selected `boot`/`init_boot`, current slot, and target slot.
4. Use “Install to inactive slot” only after OTA completes and before the slot-switch reboot.
5. Mark an input as a stock-image backup only when it is genuinely unmodified.

### ImgPatch-specific boundaries

- ImgPatch modifies the kernel Image in `boot`; a device install also removes known legacy KernelSU Ramdisk payloads.
- Shell root, USB debugging, and early-boot UTS settings are embedded in the LKM used for that patch. Changing them requires repatching and a full reboot.
- Updating an existing ImgPatch may replace the LKM in place, but success still requires the post-reboot Home mode/version and kernel log.
- Restore validates original-image backups. If output says the backup contains an ImgPatch capsule, cannot be verified, or falls back to manual cleanup, do not call it restored to stock.

Keep the original image, complete patch output, generated-file hashes, and actual write record. Creating an output does not prove a partition was written, and a successful write does not prove the next boot. See [Installation and image modes](/en/guide/install-modes/) for the full flow.

## LKM is installed but manager cannot authenticate

Distinguish “no LKM” from “LKM does not trust this manager.” If the full LKM version is readable but grant functions are unavailable, focus on authentication.

### Default signature authentication

- APK came from [YukiSU Releases](https://github.com/Rouyashiki/YukiSU/releases/latest);
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

## `ksud` versions differ or replacement is detected

The manager APK embeds one `ksud`; `/data/adb/ksud` is a separately installed state. Typical symptoms include:

- authentication works, but modules or tools fail;
- Home reports different embedded and installed versions;
- Home or a system notification reports that device-side `ksud` does not match this manager;
- a manager update displays a feature that the backend command does not understand;
- boot logs report a UAPI/version mismatch.

Current `ksud` monitors its installed path, and the manager also verifies the device-side file. The warning may mean that a newly updated manager has not been synchronized, or that another root manager or process replaced the daemon; it is not based on the filename alone.

Record the bundled full version, the installed side's exact display, and warning time, then open the “`ksud` daemon” detail on Home. On a binary mismatch, the manager deliberately does not execute the untrusted file to query its version, so “Unknown” is an intentional safety result rather than a missing version that Home can provide. Only after confirming that the current APK is trusted should you restore its bundled build. Automatic `ksud` update is off by default and, when enabled, synchronizes on app cold start. Reopen the detail and inspect boot logs after synchronization.

Never copy a same-named `ksud` from another fork; the protocol and behavior may differ. If replacement repeats, identify the manager, script, or module doing it instead of overwriting the file in a loop. See [Settings and maintenance](/en/manager/settings/) for synchronization and soft-reboot boundaries.

## A Feature switch fails, has no effect, or is unsupported

The Feature controls screen queries support and state from the running kernel. Its KernelSU group contains upstream-compatible IDs `0–4` plus WebView Zygote unmount at reserved-range ID `5`, currently implemented by YukiSU; project extensions occupy `100–104`. State has three layers: the live kernel value, persistent `ksud` configuration, and any immediate userspace follow-up required by that feature.

- “Kernel does not support this feature” usually means the running LKM is older or lacks the implementation; updating only the APK cannot add it.
- If the manager reports failure or rolls the switch back, preserve the message and logs instead of repeatedly toggling until the UI happens to stay on.
- SELinux Hide and WebView Zygote unmount explicitly require a reboot.
- ADB Root also restarts `adbd`; the Magisk-style su prompt must apply or remove its visible `su` mount. The current manager rolls Feature state back when these follow-up actions fail.
- YukiZygisk, early-boot UTS, and ImgPatch-embedded settings have boot snapshots or early-apply boundaries. Follow the UI requirement for a full reboot or repatch.

Capture the failed state before rebooting. Soft reboot stops and restarts Android services and replays module stages, but it does not reload the LKM or replay bootloader, kernel, and early-Image setup. Use a full reboot when validating an LKM, ImgPatch, slot change, or security switch explicitly marked for reboot. See [Feature controls](/en/manager/feature-control/) for all 11 switches and their exact boundaries.

## Module script does not run

Check that:

1. the module is not disabled or pending removal; if an update is pending, complete one normal reboot and verify the version actually applied;
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

If only WebView or its sandbox cannot see a modification, check “Unmount modules for WebView” (Feature `5`). With global Kernel Umount still enabled, it gives the UID 1053 WebView zygote a clean mount view before sandbox children inherit it; disabling the global mechanism prevents this unmount too. The tradeoff is that modules modifying WebView resources may stop working. Reboot after changing it before evaluating the result.

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

1. Stabilize ordinary root first. Treat MetaModule as a prerequisite only when the tested module depends on mounted files such as a `system/` tree.
2. Confirm the YukiZygisk Feature is enabled and not in safe mode.
3. Identify an ordinary Zygisk module versus a native ZN module, then match its 64/32-bit ABI.
4. For a native ZN module, confirm it uses supported Zygisk Next native API 3/4. For every module, verify author support for the Android release, app, or native target.
5. Keep only one test module and perform a full reboot.
6. Launch the target, refresh the YukiZygisk screen, and inspect Zygote injection, ordinary-module inventory, and the native target monitor separately; use daemon/core logs to decide whether an ordinary module actually loaded.
7. Save or share the complete manager bugreport instead of copying only the last live-log lines.

Read native states literally:

- **Unknown:** the target may be unobserved, or it may be detected/redirected without an explicit success or failure report. Launch it, then inspect the raw state and logs.
- **Target observed, module injection did not complete:** this is an explicit module/target failure.
- **Injected:** the runtime completed the injection path, but the module's end feature still needs its own test.

After three PID replacements for the same Zygote name, YukiZygisk enters injection safe mode and stops injection. The counter establishes process restarts, not their cause. Disable the newest module, perform a full reboot, then use [Features and status](/en/yukizygisk/features/) to separate Zygote evidence from [Native ZN](/en/yukizygisk/native-zn/) evidence.

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

If failure followed an ordinary-module installation, start with safe mode or disabling the newest module. If Android never booted after writing an LKM image, restore stock first instead of debugging modules. ImgPatch changes the kernel Image in `boot`; even when the traditional Ramdisk path on that device normally uses `init_boot`, recovery must follow the actual working mode and modified partition.

Lateload does not keep the LKM loaded across a reboot. If a persistent boot failure follows a temporary session, separately check whether that session installed a module, wrote a partition, or saved other boot configuration instead of attributing it merely to having entered Jailbreak mode.

## Before filing an issue

Include:

- device model, Android build fingerprint, original/effective kernel release, and architecture;
- full LKM, manager, embedded/installed `ksud` versions; preserve the installed-side “Unknown” state on mismatch;
- Hook type, working mode, target KMI, actual partition, and slot;
- input-image provenance, patch/write output, and available backups;
- MetaModule, relevant module, and Feature state;
- YukiZygisk module type, ABI, target, and runtime state when involved;
- the final change before failure;
- shortest repeatable steps;
- first useful error and complete diagnostic attachment;
- results of one-variable isolation.

Remove SuperKey, personal paths, account identifiers and unrelated application data before sharing logs. Read [How to ask](/en/troubleshoot/asking/) for a report template.
