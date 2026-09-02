---
permalink: /en/guide/features/
title: Feature overview
---

# Feature overview

YukiSU capabilities fall into five layers: kernel root, app policy, userspace and modules, optional YukiZygisk, and manager tools. This is more useful than one long switch list because each layer has different prerequisites, risks and diagnostics.

::: info Visible does not mean enabled by default
Available controls depend on the LKM build configuration, manager version, installed `ksud`, device facilities and MetaModule. “Unsupported” usually means the current runtime chain lacks that capability, not that the page failed to load.
:::

## Capability map

| Capability | Layer | Requires MetaModule | Requires YukiZygisk |
| --- | --- | --- | --- |
| App root grant | Kernel + manager | No | No |
| App Profile | Kernel + manager | No | No |
| Boot-stage scripts | `ksud` module lifecycle | No | No |
| Files under `/system` and similar paths | Module + MetaModule | Yes | No |
| Module WebUI | Manager + module | Usually no; depends on module behavior | No |
| Zygisk module injection | YukiZygisk | No | Yes |
| Image and partition tools | Manager + `ksud` | No | No |

MetaModule and YukiZygisk solve different problems. The former mounts system files; the latter injects modules into Zygote processes. Neither replaces the other.

## Feature API: upstream versus extensions

The current source registers 11 Features. IDs `0–99` are reserved for KernelSU-compatible numbering; YukiSU-owned additions start at `100`:

| ID | Feature | Source | Purpose |
| --- | --- | --- | --- |
| 0 | `SU_COMPAT` | Upstream-compatible | Compatible `su` request path |
| 1 | `KERNEL_UMOUNT` | Upstream-compatible | Kernel unmount handling for app environments |
| 2 | `SULOG` | Upstream-compatible | Log `su` requests and authorization decisions |
| 3 | `ADB_ROOT` | Upstream-compatible | Root for the supported ADB debug chain |
| 4 | `SELINUX_HIDE` | Upstream-compatible | Sanitize app-facing SELinux probe results |
| 5 | `WEBVIEW_ZYGOTE_UMOUNT` | KernelSU-reserved range | Remove module mounts before WebView sandboxes inherit them |
| 100 | `ENHANCED_SECURITY` | YukiSU | Restrict elevation outside YukiSU and unauthorized UID downgrade |
| 101 | `MAGISK_COMPAT` | YukiSU | Magisk-style authorization prompt for apps not pre-authorized |
| 102 | `DEFAULT_NO_NEW_PRIVS` | YukiSU | Apply `no_new_privs` to the default root profile |
| 103 | `YUKIZYGISK` | YukiSU | Control the built-in YukiZygisk capability |
| 104 | `HIDE_BOOTLOADER` | YukiSU | Rewrite visible unlock/Verified Boot properties after Android boot completes |

As of 2026-09-02, official KernelSU `main` `e38512f1` enumerates `0–4` in `feature.rs`. YukiSU places WebView Zygote unmount at ID 5 in the upstream-reserved range and groups it with KernelSU Features in the manager; it should not be described as currently identical on both sides. SuperKey, dynamic managers and UTS View have separate interfaces and are not Feature IDs.

All kernel-backed switches are now grouped under Settings → Feature controls, separated into KernelSU and YukiSU sections. The manager changes runtime state through `ksud feature set`, persists it with `feature save`, and rolls back when persistence or required ADB/Magisk follow-up work fails.

## Kernel root and authorization

### Allowlist

Applications do not automatically receive root just because YukiSU is installed. The manager synchronizes a user decision to the kernel, which validates the caller when `su` is requested. Revoking a grant blocks new elevation requests; it does not retroactively drop privileges from an already running process.

### App Profile

App Profile goes beyond a binary allow/deny state. The current implementation can configure or constrain:

- target UID and GID;
- supplementary groups;
- Linux capabilities;
- SELinux domain;
- namespace behavior;
- `no_new_privs` and related runtime properties;
- root and non-root profiles.

This allows narrower grants and policies for unprivileged apps. An incorrect identity, SELinux domain or namespace can immediately break an app, so change one field at a time and retain the original values.

## LKM and TSR

YukiSU runs only as `kernelsu.ko`; there is no built-in mode. TSR is the documentation and UI abbreviation for **Tracepoint Syscall Redirect**, following the same tracepoint syscall-redirect model as current official KernelSU LKM. YukiSU still carries its own ports and extensions, so the two modules are not interchangeable identical binaries; TSR is not a second exclusive hook design either.

The runtime requirements are explicit:

- syscall tracepoints must exist;
- Kprobes and Kretprobes must be enabled as required by the project;
- the LKM must match KMI, symbol versions and module configuration;
- hook health should be judged from both manager status and kernel logs.

`CONFIG_KSU_KRETPROBES_SUCOMPAT` remains declared in the current `Kconfig`, but no implementation source reads it to select another sucompat path. Do not describe enabling this inert option as activating an experimental hook. Still include the actual kernel configuration in a report.

## Userspace

YukiSU implements `ksud`, `ksuinit` and `su` in C++.

### `ksuinit`

Connects the early boot environment with the LKM loading chain. Failures happen before the manager is usable, so startup logs, kernel logs and a recoverable stock image are especially important.

### `ksud`

Acts as the manager backend and module runtime. Its responsibilities include:

- module installation, updates, state and removal;
- `post-fs-data`, `service`, `boot-completed` and related lifecycle stages;
- MetaModule mount interfaces;
- sessions for image patching, LKM installation and Ramdisk Editor;
- configuration, SELinux handling and diagnostics.

The APK-embedded `ksud` and `/data/adb/ksud` are separate files. The home page compares their actual ELF content: it can synchronize manually, or the off-by-default auto-update setting can do so at app cold start. Runtime replacement of the installed file raises an integrity warning. None of these actions updates the LKM or boot image.

### `su`

Provides an elevation entry for authorized callers. The kernel and app policy still make the authorization decision; replacing a command-line binary does not bypass manager grants.

## Manager authentication

The default trust chain uses a trusted manager package and APK signature. Normal official builds require no extra credential.

YukiSU additionally offers:

- **SuperKey**, optional manager-identity authentication through `prctl`; it confirms the manager and is not a generic privileged-call credential;
- **dynamic managers**, allowing additional trusted-manager deployments;
- **disable APK signature verification**, a high-risk explicit option that changes fallback behavior.

SuperKey and signature authentication can coexist. The normal signature path is removed only after APK signature verification is deliberately disabled. See [SuperKey authentication](/en/manager/superkey/).

## Modules and MetaModule

### Ordinary module lifecycle

YukiSU supports KernelSU-style module directories, properties and boot-stage scripts. A module may only run scripts, set properties or add SELinux rules without replacing system files.

### System-file mounting

An external MetaModule handles files under `/system`, `/vendor`, `/product` and similar trees. YukiSU fully follows official KernelSU's interfaces, lifecycle order and one-active-backend rule. Its C++ userspace executes the same upstream contract rather than defining a private format. A backend may use OverlayFS, bind mounts or another design.

A successful ZIP installation therefore proves only that files entered the module directory. It does not prove that target paths were mounted. Inspect the ordinary module, MetaModule and both logs separately. See [Module system](/en/modules/overview/).

### WebUI

A module with `webroot/` can expose a manager WebUI through the supported `kernelsu` JavaScript bridge. These interfaces often execute with root, making module provenance, input validation and remote content security boundaries.

## YukiZygisk

YukiZygisk is YukiSU's optional built-in Zygisk environment. YukiSU handles Zygote injection and module loading directly, allowing modules compatible with Zygisk Next to run without another Zygisk implementation installed alongside it.

The manager provides:

- master control and current runtime state;
- discovered modules and their enabled state;
- injection, Zygote and module counts;
- persistent diagnostic export across reboots;
- injection-safe-mode status after three PID replacements for the same Zygote name.

YukiZygisk neither authorizes ordinary `su` requests nor performs MetaModule mounts. Root and ordinary modules should continue independently when it is disabled. Read [YukiZygisk introduction](/en/yukizygisk/intro/) and [Module compatibility](/en/yukizygisk/modules/).

## KernelSU-numbered Features (IDs 0–5)

Current official KernelSU `main` exposes IDs `0–4`. YukiSU keeps those five compatible and implements WebView Zygote unmount at reserved-range ID `5`. The manager groups IDs 0–5 together, but that does not make ID 5 a capability currently shared by both projects.

### sucompat

Provides a compatible `su` path for authorized apps. Availability still depends on the LKM build and active policy.

### Kernel unmount

Controls kernel unmount handling in app environments to reduce unnecessary module-mount exposure. It is separate from root authorization, App Profile and MetaModule.

### sulog

Records `su`-related events for identifying callers, authorization results and failure stages. Logs can contain application identifiers and operation context; review them before sharing.

### ADB root

Raises the capabilities of the supported ADB debugging chain. This expands what a connected host can do, so it should not remain enabled around untrusted computers or long-lived wireless debugging.

### SELinux hide

Keeps the upstream SELinux-state hiding behavior. It is not the same as disabling SELinux and is not a guarantee of passing integrity checks. Preserve enforcing state and logs when debugging policy instead of globally switching to permissive.

### WebView Zygote unmount (5)

This is an explicit compatibility/isolation tradeoff. While global Kernel Umount remains enabled, it removes module mounts before the UID 1053 WebView Zygote produces sandbox children, reducing mount state inherited by those processes. Disabling the global mechanism prevents this unmount too. Modules that replace WebView resources may stop working, and a reboot is required for the setting to be reflected consistently in newly created processes.

## YukiSU Features (IDs 100–104)

### Enhanced Security (100)

Restricts privilege elevation outside YukiSU and blocks unauthorized UID downgrade. It hardens the authorization boundary; it is not a generic root-hiding switch.

### Magisk-compatible prompt (101)

Provides a Magisk-style authorization prompt when an app that is not already allowlisted makes a compatible request. The user still decides the grant.

### Default `no_new_privs` (102)

Applies YukiSU's no-new-privs flag to the default root profile, blocking that thread and descendants from escalating through YukiSU again. It is not general Linux `PR_SET_NO_NEW_PRIVS`; tools that require another YukiSU escalation need a separate profile.

### YukiZygisk (103)

Controls built-in YukiZygisk. It affects Zygote injection and Zygisk modules, not the base root switch.

### Unlock-state hiding (104)

After Android boot completes, `ksud` uses its built-in resetprop implementation to rewrite visible bootloader, Verified Boot, build-type and ADB-security properties. It is off by default and enabling it requires a reboot. It does not relock the bootloader or guarantee integrity/root-check results. Disabling the switch cannot instantly restore read-only properties already rewritten during the current boot; judge the next boot state.

## Other YukiSU extensions

### UTS View

Adjusts system identity presented through a UTS namespace, including views related to `uname`. It changes a view; it does not replace the running kernel.

SuperKey and dynamic managers are authentication extensions, while UTS View is a namespace-view capability. They have their own interfaces and do not occupy the `100–104` Feature IDs.

## Manager tools

YukiSU Manager also combines device maintenance features:

- patch a selected boot image;
- direct install to the current slot;
- install to an inactive slot after OTA;
- choose between traditional Ramdisk and direct-kernel ImgPatch layouts;
- probe a range-readable HTTPS OTA/factory ZIP or `payload.bin` and extract only a selected boot partition;
- select a local LKM or bundled KMI resource;
- inspect, back up and flash partitions;
- run supported AnyKernel3 packages;
- use Ramdisk Editor through a `ksud` session;
- select supported update channels and verify PGP/APK signatures.

Having these tools in one manager does not make every action low risk. Operations that write a boot partition, change slots or synchronize device-side `ksud` still require saved logs and stock images.

## Keep the relationships straight

- Root, authorization and ordinary modules do not require YukiZygisk.
- Without MetaModule, script-only modules may work, but system files are not mounted automatically.
- Installing the manager does not install the LKM.
- Updating the manager does not update the LKM or boot image; check the home-page integrity state to see whether `ksud` was synchronized.
- A root grant is not the same thing as a well-designed App Profile.
- An implemented feature is not automatically safe or supported on every device.

For an upstream comparison, continue with [YukiSU vs KernelSU](/en/guide/yukisu-vs-kernelsu/).

## Feature sources of truth

- [YukiSU Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/feature.h)
- [YukiSU `ksud` Feature registry and persistence](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/core/feature.cpp)
- [Official KernelSU `e38512f1` Feature enumeration](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/userspace/ksud/src/feature.rs)
