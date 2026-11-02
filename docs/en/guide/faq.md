---
permalink: /en/guide/faq/
title: FAQ
---

# FAQ

Find answers to common installation, module, authorization, and update questions here. For a failed operation, use [Common troubleshooting](/en/troubleshoot/common/).

## Which devices are supported?

Android 12 (API 31) or later, ARM64, GKI 2.0, Linux 5.10+, and the required module-loading, Kprobes, Kretprobes, and syscall tracepoints. YukiSU supports only `CONFIG_KSU=m`. If a vendor changes exported symbols, vermagic, or module configuration, use an LKM built for that kernel. See [Compatibility](/en/guide/compatibility/).

## Does installing the APK provide root?

No. It supplies Manager and bundled resources; a matching LKM must still load. If the device has no root access, patch a stock image and flash it using the device’s procedure. [Jailbreak mode](/en/guide/jailbreak-mode/) also has separate bootstrap requirements.

## How do Ramdisk, ImgPatch, and configuration-only images differ?

Ramdisk loads the LKM through `ksuinit`. ImgPatch embeds a bootstrap and LKM capsule in the ARM64 `boot` kernel. A configuration-only Ramdisk preserves the existing loading chain without installing or replacing an LKM; it cannot add root to a stock image by itself. See [Image modes](/en/guide/install-modes/) and [Boot configuration](/en/manager/boot-config/).

## Why are features missing after updating the APK?

The APK, `/data/adb/ksud`, and running LKM are separate components. Synchronizing `ksud` does not change boot images; an updated on-disk LKM needs a full reboot before its running version can be checked. See [Updating](/en/guide/update/).

## Do modules still require a MetaModule?

Not necessarily. Script, property, and policy modules need no system-file mounting. Modules that need mounting can use built-in Kagami. An enabled external MetaModule with `metamount.sh` takes precedence; otherwise Kagami runs. See [Module mounting](/en/modules/magic-mount/).

## Why does a successfully installed module have no effect?

First check whether a reboot is pending, then read the script logs and identify the active mount backend. If global files changed but the app sees old files, check that app’s mount-isolation settings. For Zygisk modules, also check ABI, target processes, and injection results in YukiZygisk.

## Can every module be hot-installed?

No. The author must opt in, the module must not be a MetaModule, safe mode must be off, and request/path checks must pass. `init.rc`, preinit, boot snapshots, and existing processes still require a reboot. A failed hot-install script does not restore the old module directory or undo changes already made by the script. See [Hot installation](/en/modules/hot-install/).

## Why are one-shot scripts absent from installed modules?

They execute once and retain the latest run result without becoming installed modules or entering module updates. See [One-shot scripts](/en/modules/one-shot/).

## Does successful preinit preparation mean actions ran?

No. It means a snapshot is prepared for the next boot. Check boot logs for action results. Consecutive failed boots trigger separate protection; resetting its counter does not run actions immediately. See [Preinit](/en/modules/preinit/).

## Why is a feature marked forced and uneditable?

It is fixed by boot configuration. Change the corresponding image configuration and reboot fully; a runtime toggle cannot override it. See [Boot configuration](/en/manager/boot-config/).

## Why is shell denied even after root authorization?

Check ID 6, `SHELL_SU_ADB_ONLY`. In addition to authorization, it requires an `adbd` or YukiSU root-domain ancestor. A shell without either trusted ancestor is denied. This differs from ADB Root and ordinary app grants.

## Where did WebView unmounting and Enhanced security go?

v1.8.0 moves WebView unmounting to the non-root profile under Superuser → WebView Zygote. Restart affected processes after changing it; reboot fully to recreate the shared WebView Zygote. Feature 5 is retired, and Enhanced security and feature 100 have been removed. Those IDs in older guides no longer apply. See [App Profile](/en/manager/app-profile/).

## Why did the default root domain and escape-prevention setting change?

v1.8.0 defaults to `u:r:ksu:s0` and enables feature 102 during its first migration. Existing custom domains and per-app flags remain, with compatibility handling for legacy `su` policies. To adjust an app, open its App Profile, check whether it uses the default or a custom profile, then change that profile's setting.

## Is SuperKey required?

No. The official Manager uses APK identity authentication. Setting a SuperKey does not automatically disable signature fallback. It authenticates a manager UID, not ordinary app root requests. See [SuperKey](/en/manager/superkey/).

## Do compatibility overrides change the kernel?

No. They change compatibility values exposed to particular consumers, not the real implementation or version. They do not ensure third-party private commands work. Global module-installation overrides and per-signature manager overrides are separate settings.

## Does root work without YukiZygisk?

Yes. Basic root, App Profile, and ordinary modules do not require it. Enable it for ordinary Zygisk or Native ZN modules, using the Android version, ABI, and target processes specified by the module author.

## Are YukiZygisk safe mode and module crash protection the same?

No. Repeated PID changes for the same Zygote trigger global injection protection at the kernel threshold. When crash evidence meets the correlation conditions, module crash protection suspends the affected ordinary Zygisk module's later injection for this boot. It does not suspend Native ZN modules or unload code already loaded. After a process exits, inspect the exit code, crash log, and suspended-module list before choosing which module to disable. See [Features and status](/en/yukizygisk/features/).

## Can a soft reboot replace a full reboot?

No. It does not reload the kernel or rerun the bootloader, early boot configuration, or preinit. v1.8.0 allows emulated soft reboot when the daemon confirms recovery support, including restoring Kasumi rules. If a prerequisite fails, Manager shows the reason. After acceptance, wait for the final recovery result. On failure, retain logs and reboot fully. See [Soft reboot](/en/manager/soft-reboot/).

## Must I delete every module when switching root solutions?

Back up configuration and stock images before changing root solutions; do not start by deleting the module directory, follow the [KernelSU](/en/guide/switch/kernelsu/), [Magisk](/en/guide/switch/magisk/), or [APatch](/en/guide/switch/apatch/) migration guide, and verify each backend and module.

## Do hiding features guarantee passing detection?

No. Property views, UTS, mount cleanup, and SELinux Hide have limited scopes. They do not relock the bootloader or alter remote or hardware-backed attestation results.

## What if the device cannot boot?

Distinguish image/LKM, ordinary module, and preinit failures, then follow [Rescue and recovery](/en/guide/rescue-bootloop/). Include complete versions, partition/slot, the last change, and the first useful error when [reporting a problem](/en/troubleshoot/asking/).
