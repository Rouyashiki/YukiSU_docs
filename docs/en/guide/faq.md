---
permalink: /en/guide/faq/
title: FAQ
---

# FAQ

## Is YukiSU just a KernelSU skin?

No. It comes from the KernelSU ecosystem and was forked from SukiSU-Ultra, but its userspace, LKM hooks, authentication extensions, manager and built-in YukiZygisk have evolved independently. Shared ecosystem concepts do not make managers or `ksud` interchangeable. See [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/).

## What devices are supported?

The current supported scope is ARM64, GKI 2.0, Linux 5.10+, LKM (`CONFIG_KSU=m`), with the required Kprobe, Kretprobe and syscall tracepoint facilities. GKI 1.0, non-GKI, ARM32, x86_64 and built-in `CONFIG_KSU=y` are unsupported. A device inside this broad scope still needs matching KMI, symbols and configuration.

## Does “LKM-only” mean there is no userspace?

No. It only describes kernel deployment. A complete environment still has `kernelsu.ko`, C++ `ksud`/`ksuinit`/`su`, the Android manager, modules and optional MetaModule/YukiZygisk.

## Can the manager one-click root every supported device?

No. It can patch an image, install directly, install to an inactive post-OTA slot, and use a bundled or local LKM. It cannot replace KMI, partition, slot and vendor-layout decisions. Follow [Get started](/en/guide/get-started/).

## What happens if I install only the APK?

You get the UI, not kernel capability. Without a compatible LKM, “not installed” and unavailable pages are expected.

## Why does an LKM fail on another Linux 5.10 kernel?

The major version is only one condition. KMI, vermagic, symbol versions, configuration and vendor patches may differ. Obtain a matching build or compile against the device kernel tree; never force-load or disable checks.

## Is SuperKey required?

No. Trusted official package/signature authentication is the default. SuperKey serves custom signing and private-manager deployments. Leave it empty on a first installation.

## Does SuperKey replace APK signatures?

Not by default. Signature authentication may remain after setting a key. YukiSU submits SuperKey through `prctl` to establish the manager UID; it is not the KernelPatch/APatch NR45 general SuperCall credential. Read [SuperKey authentication](/en/manager/superkey/).

## Embedded vs installed `ksud`?

The embedded binary ships in the APK. The installed `/data/adb/ksud` participates in real boot/module handling. Updating the APK does not automatically synchronize device userspace; an unexpected mismatch can cause UAPI or feature/backend failures.

## Does every module need MetaModule?

No. Script-only, `system.prop`, `sepolicy.rule` and independent WebUI modules may not need mounting. Modules that provide files under `/system`, `/vendor` and similar paths usually require a compatible active MetaModule.

## Why did an installed module not mount files?

Installed only means content reached the module directory. Check for a `system/` tree, absence of `skip_mount`, active MetaModule state, pending update/removal and successful `metamount.sh`. See [Module system](/en/modules/overview/).

## Is YukiSU MetaModule the same as KernelSU?

Yes. YukiSU fully follows official KernelSU's MetaModule interfaces, scripts and lifecycle, so an existing MetaModule can remain during migration. Backend-specific Android, ABI and version requirements still apply, but they are not protocol differences.

## What is Jailbreak mode?

It is YukiSU Manager's name for upstream-compatible late-load: load a matching-KMI LKM after Android has booted and establish YukiSU for the current boot. The userspace flow is implemented in C++, requires SELinux Permissive and cannot provide PID 1 early stages. See [Jailbreak mode](/en/guide/jailbreak-mode/).

## Must I remove every module before switching from KernelSU?

No. For built-in KernelSU, restore stock boot but do not reboot before using the still-rooted current session to install YukiSU. From KernelSU LKM, no image restoration is needed. MetaModule and ordinary modules can remain. See [Switch from KernelSU](/en/guide/switch/kernelsu/).

## Can Magisk or KernelSU modules be reused directly?

Do not decide from ZIP layout alone. Installers, mount backends, private tools, WebUI APIs, Android versions and ABIs create dependencies. Follow explicit author support and single-module testing.

## What is YukiZygisk?

YukiZygisk is YukiSU's optional built-in Zygisk environment. YukiSU handles Zygote injection and module loading directly, so it can use modules compatible with Zygisk Next without Magisk or a separate Zygisk Next installation.

## Does YukiSU work with YukiZygisk disabled?

Yes. Root grants, App Profile, ordinary-module scripts and MetaModule mounts do not depend on YukiZygisk.

## Does YukiZygisk guarantee every module?

No. The standard API is the compatibility target; actual behavior depends on Android version, 32/64-bit ABI, target process, app version and module implementation. Discovery or injection status is not proof of feature success.

## Why did YukiZygisk enter safe mode?

After three consecutive Zygote crashes it stops injection to avoid a persistent process crash loop. Disable the latest module and export persistent diagnostics before restoring the feature.

## Is App Profile exclusive to YukiSU?

No. Official KernelSU also has App Profile. YukiSU maintains its own implementation across kernel, userspace and manager, so validate UID, capabilities, SELinux and namespace behavior here.

## Must LKM be updated immediately after the manager?

Not necessarily. Manager, embedded/installed `ksud`, LKM, MetaModule and modules have separate versions. Read release notes and current compatibility state, then change only the required layers.

## What should I do after an OTA?

Identify A/B support, whether OTA finished, and current/inactive slots. The manager can install to the inactive slot, but you still verify the target. Never guess a slot or patch a new slot with an old-firmware image.

## Does YukiSU guarantee passing integrity/root checks?

No. It provides root, authorization, modules and optional extensions. Detection policies change and results also depend on bootloader state, ROM, modules and device configuration.

## What should an issue include?

Provide build fingerprint, kernel/KMI, full LKM/manager/`ksud` versions, partition/slot, module versions, last change and first useful error. Use manager-exported diagnostics for YukiZygisk. See [How to ask](/en/troubleshoot/asking/).
