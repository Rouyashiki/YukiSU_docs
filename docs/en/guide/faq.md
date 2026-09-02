---
permalink: /en/guide/faq/
title: FAQ
---

# FAQ

## Is YukiSU just a KernelSU skin?

No. It comes from the KernelSU ecosystem and was forked from SukiSU-Ultra. It keeps TSR/LKM hook semantics aligned with upstream, while its C++ userspace, manager, authentication extensions, ImgPatch and YukiZygisk are maintained by YukiSU. Shared ecosystem contracts do not make managers or `ksud` interchangeable. See [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/).

## What devices are supported?

The current supported scope is Android 12 (API 31) or newer, ARM64, GKI 2.0, Linux 5.10+, LKM (`CONFIG_KSU=m`), with loadable modules and the required Kprobe, Kretprobe and syscall tracepoint facilities. Android 11 and older, GKI 1.0, non-GKI, ARM32, x86_64 and built-in `CONFIG_KSU=y` are unsupported. Full builds currently cover eight standard targets from `android12-5.10` through `android17-6.18`; every device still needs matching KMI, vermagic, symbols and configuration. See [Compatibility](/en/guide/compatibility/).

## Does “LKM-only” mean there is no userspace?

No. It only describes kernel deployment. A complete environment still has `kernelsu.ko`, C++ `ksud`/`ksuinit`/`su`, the Android manager, modules and optional MetaModule/YukiZygisk.

## Can the manager one-click root every supported device?

No. It can patch a local image, extract a boot partition from a range-readable HTTPS OTA/factory package, install directly, install to an inactive post-OTA slot, and use a bundled or local LKM. It cannot replace KMI, partition, slot, vendor-layout or Ramdisk/ImgPatch decisions. Follow [Get started](/en/guide/get-started/).

## What happens if I install only the APK?

You get the UI, not kernel capability. Without a compatible LKM, “not installed” and unavailable pages are expected.

## Why does an LKM fail on another Linux 5.10 kernel?

The major version is only one condition. KMI, vermagic, symbol versions, configuration and vendor patches may differ. Obtain a matching build or compile against the device kernel tree; never force-load or disable checks.

## What is the difference between Ramdisk and ImgPatch?

Traditional mode uses `ksuinit` in a boot Ramdisk and may patch `boot` or `init_boot` according to the layout. ImgPatch embeds a bootstrap and LKM capsule directly in the ARM64 kernel inside `boot`; it accepts only an AOSP `boot` image containing a kernel. Both are LKM modes, not different grades of root. Their inputs, backups and restore paths differ. See [Installation and image modes](/en/guide/install-modes/).

## Is SuperKey required?

No. Trusted official package/signature authentication is the default. SuperKey serves custom signing and private-manager deployments. Leave it empty on a first installation.

## Does SuperKey replace APK signatures?

Not by default. Signature authentication may remain after setting a key. YukiSU submits SuperKey through `prctl` to establish the manager UID; it is not the KernelPatch/APatch NR45 general SuperCall credential. Read [SuperKey authentication](/en/manager/superkey/).

## Embedded vs installed `ksud`?

One binary ships in the APK and another is installed at `/data/adb/ksud`. The home page compares their actual ELF content and offers manual synchronization; cold-start auto-sync is off by default. Runtime replacement also raises an integrity alert. Either synchronization path changes only `ksud`, not the LKM, boot image or device reboot state.

## Does every module need MetaModule?

No. Script-only, `system.prop`, `sepolicy.rule` and independent WebUI modules may not need mounting. Modules that provide files under `/system`, `/vendor` and similar paths usually require a compatible active MetaModule.

## Why did an installed module not mount files?

Installed only means content reached the module directory. Check for a `system/` tree, absence of `skip_mount`, active MetaModule state, pending update/removal and successful `metamount.sh`. See [Module system](/en/modules/overview/).

## Is YukiSU MetaModule the same as KernelSU?

The public protocol is shared. YukiSU follows official KernelSU MetaModule interfaces, scripts and lifecycle, so an existing backend can usually remain when its device, version and interface requirements still match. Its real mount behavior and every module's Android/ABI/version requirements still need validation.

## What is Jailbreak mode?

It is YukiSU Manager's name for upstream-compatible late-load: load a matching-KMI LKM after Android has booted and establish YukiSU for the current boot. The userspace flow is implemented in C++, requires SELinux Permissive and cannot provide PID 1 early stages. See [Jailbreak mode](/en/guide/jailbreak-mode/).

## Must I remove every module before switching from KernelSU?

No blanket removal is needed. For built-in KernelSU, restore stock boot but do not reboot before using the still-rooted current session to install YukiSU. From KernelSU LKM, no image restoration is needed. MetaModule and ordinary modules that still satisfy the shared protocol and device/version requirements can usually remain, but verify each layer after reboot. See [Switch from KernelSU](/en/guide/switch/kernelsu/).

## Can Magisk or KernelSU modules be reused directly?

Do not decide from ZIP layout alone. Installers, mount backends, private tools, WebUI APIs, Android versions and ABIs create dependencies. Follow explicit author support and single-module testing.

## What is YukiZygisk?

YukiZygisk is YukiSU's optional built-in Zygisk environment. YukiSU handles Zygote injection and module loading directly, so it can use modules compatible with Zygisk Next without Magisk or a separate Zygisk Next installation.

## Does YukiSU work with YukiZygisk disabled?

Yes. Root grants, App Profile, ordinary-module scripts and MetaModule mounts do not depend on YukiZygisk.

## Does YukiZygisk guarantee every module?

No. The standard API is the compatibility target; actual behavior depends on Android version, 32/64-bit ABI, target process, app version and module implementation. Discovery or injection status is not proof of feature success.

## Why did YukiZygisk enter safe mode?

The kernel tracks PIDs by Zygote socket name. When PID replacement for one name reaches three, YukiZygisk enters global injection safe mode. The counter proves process-generation replacement, not the cause of death or a responsible module. Export diagnostics around the trigger and interpret them with [Features and status](/en/yukizygisk/features/).

## Is App Profile exclusive to YukiSU?

No. Official KernelSU also has App Profile. YukiSU maintains its own implementation across kernel, userspace and manager, so validate UID, capabilities, SELinux and namespace behavior here.

## Must LKM be updated immediately after the manager?

Not necessarily. Manager, embedded/installed `ksud`, LKM, installation layout, MetaModule and modules have separate state. The home page can synchronize `ksud` alone; kernel or early-boot fixes require another LKM patch. Do not assume old combinations across a UAPI or boot-layout change are compatible.

## What should I do after an OTA?

Identify A/B support, whether OTA finished, and current/inactive slots. The manager reads target KMI from `boot` in the inactive slot. Ramdisk mode selects a target partition from that layout; ImgPatch writes only `boot` in the target slot. Never guess a slot or patch a new slot with an old-firmware image.

## Does YukiSU guarantee passing integrity/root checks?

No. It provides root, authorization, modules and optional extensions. Detection policies change and results also depend on bootloader state, ROM, modules and device configuration.

## What should an issue include?

Provide build fingerprint, kernel/KMI, LKM/manager/`ksud` state (preserving installed-side “Unknown” on an integrity mismatch), partition/slot, module versions, last change and first useful error. Use manager-exported diagnostics for YukiZygisk. See [How to ask](/en/troubleshoot/asking/).
