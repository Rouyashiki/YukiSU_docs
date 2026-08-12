---
permalink: /en/guide/yukisu-vs-kernelsu/
title: YukiSU vs KernelSU
---

# YukiSU vs KernelSU

The short answer: YukiSU is neither an unrelated reinvention nor KernelSU with a different manager.

It keeps KernelSU grants, App Profile, modules, MetaModule and LKM hook contracts, then adds C++ userspace, its own manager, YukiZygisk, SuperKey and 100-series Features. **Keep compatibility where it matters; build independently where there is more to do.**

::: info Scope
“KernelSU” on this page means the current [tiann/KernelSU](https://github.com/tiann/KernelSU) mainline, not KernelSU-Next, SukiSU-Ultra, APatch or another fork.
:::

## At a glance

On a supported **ARM64 GKI 2.0 device running Linux 5.10 or newer**, both projects can be candidates. Choose YukiSU when you want its C++ userspace, manager, built-in YukiZygisk, SuperKey or 100-series Features.

Choose official KernelSU when you need built-in/GKI, x86_64, broader integration, or simply want to stay directly on upstream.

## Core comparison

| Area | YukiSU | Official KernelSU | Difference? |
| --- | --- | --- | --- |
| Project | Independently maintained complete root solution in the KernelSU ecosystem | Official KernelSU mainline | Yes |
| Supported scope | ARM64, GKI 2.0, Linux 5.10+ | Broader scope and integration choices | Yes |
| Kernel deployment | LKM only, `CONFIG_KSU=m` | LKM plus official built-in/GKI paths | Yes |
| Userspace | C++ `ksud`, `ksuinit` and `su` | Current mainline is primarily Rust | Yes |
| Kernel hooks | Identical to official KernelSU LKM; the docs/UI abbreviate it as **TSR** | Tracepoint syscall redirect | **Identical** |
| App Profile | Follows upstream | Supported | Identical |
| Features 0–4 | Compatible `sucompat`, kernel unload, sulog, ADB root and SELinux hide | Upstream Features | **Identical** |
| MetaModule | Fully follows upstream interfaces, lifecycle and single-backend rule | Official MetaModule contract | **Identical** |
| Zygisk | Optional built-in YukiZygisk | Not built in; Zygisk Next is commonly installed separately | Yes |
| Manager trust | Official signature trust; optional manager-only SuperKey; dynamic-manager support | Official manager authentication | Yes |
| YukiSU Features | IDs 100–103: enhanced security, Magisk-style authorization prompt, default `no_new_privs`, YukiZygisk | No YukiSU 100-series IDs | Yes |
| Other additions | UTS View plus partition and ramdisk tools | Depends on current upstream | Yes |
| Jailbreak mode | Upstream late-load semantics with a C++ userspace implementation | Late-load support | Same semantics, different implementation language |

Do not count every shared checkbox as a YukiSU invention. TSR, ADB root, sulog, SELinux hide and MetaModule come from upstream. The real differences are userspace, the manager, YukiZygisk, authentication additions and the 100-series Features.

## 1. LKM-only is a deployment boundary

YukiSU enters the kernel as `kernelsu.ko` and does not support built-in `CONFIG_KSU=y`. The manager, C++ userspace, grants, modules, MetaModule and YukiZygisk are still a full stack. LKM-only describes installation, not a reduced feature set.

The focused LKM path lets installation, updates, diagnostics and bundled KMI resources follow one model. The tradeoff is a strict support envelope: ARM64, GKI 2.0, Linux 5.10+, matching KMI and the required kernel configuration.

## 2. TSR is identical to the upstream LKM hook

**TSR is just short for Tracepoint Syscall Redirect.** The UI and docs use the abbreviation because the full name is long; it is not a fork-specific hook.

This part is identical to official KernelSU LKM. Kprobes, Kretprobes, syscall tracepoints, KMI and symbols still matter for device support, but TSR itself is not a unique reason to choose YukiSU.

## 3. C++ userspace is a real engineering difference

YukiSU implements `ksud`, `ksuinit` and `su` in C++. They cover installation, authorization, module stages, Feature configuration, late-load and the manager backend. Current official KernelSU primarily uses Rust for the corresponding userspace.

The language alone is not a performance or safety verdict. The practical consequences are independently evolving internals, diagnostics and releases. Use mutually compatible YukiSU manager, LKM and installed `ksud` versions, and make modules depend on public lifecycle contracts instead of undocumented internals.

## 4. Separate upstream Features from YukiSU extensions

YukiSU preserves upstream Feature IDs `0–4`:

| ID | Capability | Ownership |
| --- | --- | --- |
| 0 | `sucompat` | Upstream-compatible |
| 1 | Kernel module unload | Upstream-compatible |
| 2 | sulog | Upstream-compatible |
| 3 | ADB root | Upstream-compatible |
| 4 | SELinux hide | Upstream-compatible |

YukiSU additions start at ID `100`:

| ID | Capability | Purpose |
| --- | --- | --- |
| 100 | Enhanced Security | Restricts elevation outside YukiSU and unauthorized UID downgrade |
| 101 | Magisk Compatibility | Offers a Magisk-style authorization prompt for apps not pre-authorized |
| 102 | Default `no_new_privs` | Prevents further privilege expansion in the default root profile |
| 103 | YukiZygisk | Controls the built-in YukiZygisk capability |

See [Feature overview](/en/guide/features/) for their boundaries.

## 5. MetaModule fully follows upstream

MetaModule is not merely similar: its interface, scripts, ordering and one-active-backend rule are the same. A working backend does not need reinstallation when moving from KernelSU.

YukiSU's C++ userspace executes the same upstream contract. A particular backend or ordinary module can still have its own Android, kernel or version requirements, but that is not a protocol difference between the two root solutions.

## 6. YukiZygisk is an optional advantage

Official KernelSU does not include Zygisk, so users commonly install Zygisk Next. YukiSU includes YukiZygisk, intended to run modules using the standard Zygisk API and compatible with Zygisk Next, without installing Magisk or Zygisk Next separately.

YukiZygisk combines kernel-side support and a userspace runtime for Zygote injection, discovery and loading. It is optional: root access, App Profile, ordinary modules and MetaModule do not depend on it. Real module results still depend on Android version, ABI, target process and module implementation. See [YukiZygisk](/en/yukizygisk/intro/).

## 7. SuperKey authenticates only the manager

Official builds still use package and APK signature trust. SuperKey exists for custom-signed or private managers and has one job: **tell the kernel which caller is the manager.**

The manager submits the key and timestamp through a `prctl` authentication entry. Once verified, the kernel records the manager UID and subsequent management requests use the YukiSU driver interface. This is not the KernelPatch/APatch NR45 SuperCall and cannot directly execute root, KPM or other generic privileged commands. Read [SuperKey authentication](/en/manager/superkey/) for the full comparison.

## 8. Jailbreak mode follows upstream late-load

“Jailbreak mode” is late-load in the manager: Android boots first, then a matching-KMI LKM is loaded for the current session. It follows upstream behavior with the userspace flow rewritten in C++.

This is temporary for the current boot, not a persistent boot-image installation. PID 1 early stages are unavailable, so modules use `late-load.sh` and cannot assume normal `post-fs-data.sh` execution. See [Jailbreak mode](/en/guide/jailbreak-mode/).

## 9. Switching from KernelSU is direct

- **Built-in KernelSU:** install YukiSU Manager and grant it root from KernelSU. Restore the stock boot for the current firmware, do not reboot yet, then use the still-rooted current session to install YukiSU directly. Reboot once installation finishes.
- **KernelSU LKM:** no image restoration is needed. Install YukiSU Manager, grant it root and install YukiSU directly.

Existing MetaModule, ordinary modules and their configuration can remain because YukiSU follows the upstream contracts. Remove the old KernelSU Manager after the first successful YukiSU boot. See [Switch from KernelSU](/en/guide/switch/kernelsu/).

## Which should you choose?

Choose YukiSU if you use a supported ARM64 GKI 2.0 LKM device, prefer its C++ userspace and manager, and need built-in YukiZygisk, SuperKey, dynamic managers or the 100-series Features.

Choose official KernelSU if you need built-in/GKI, x86_64, broader upstream integration, or simply want to track official mainline directly.

Pick the project that supports the device, can be recovered when something goes wrong, and has features you will actually use. The longest checkbox list does not automatically win.

## References

- [YukiSU README](https://github.com/Anatdx/YukiSU/blob/main/README.md)
- [Official KernelSU project](https://github.com/tiann/KernelSU)
- [Official KernelSU installation guide](https://kernelsu.org/guide/installation.html)
- [Official KernelSU MetaModule guide](https://kernelsu.org/guide/metamodule.html)
