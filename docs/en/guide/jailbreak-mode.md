---
permalink: /en/guide/jailbreak-mode/
title: Jailbreak mode
---

# Jailbreak mode

“Jailbreak mode” is YukiSU Manager's entry to **late-load**: after Android has booted, load a `kernelsu.ko` matching the running kernel KMI, then initialize YukiSU userspace, modules and manager state.

It follows official KernelSU late-load semantics, with the corresponding YukiSU userspace flow implemented in C++. It is useful for entering YukiSU temporarily, validating an LKM or obtaining a management environment without a persistent installation. It does not define a separate module format.

::: warning Not a persistent installation
Jailbreak mode enables YukiSU only for the current boot. After reboot, it must be started again manually or automatically unless YukiSU has been installed into the boot chain separately.
:::

## Requirements

The UI uses only two live conditions to expose and enable this entry:

- no YukiSU kernel is currently active; and
- **SELinux is currently Permissive**.

Visibility proves only these UI prerequisites. Successful execution additionally requires an Android 12 (API 31) or newer ARM64 GKI 2.0 / Linux 5.10+ device, a bundled `kernelsu.ko` matching the running KMI, a usable existing-root or Magica bootstrap path, and the manager service. Auto-jailbreak also needs app autostart permission.

Permissive is a bootstrap requirement for this path, not a requirement to leave SELinux disabled during an ordinary persistent YukiSU installation. A full APK currently packages standard targets from `android12-5.10` through `android17-6.18`; the running kernel KMI must still match. See [Compatibility](/en/guide/compatibility/).

## Two bootstrap paths

### An existing root shell is available

The manager executes `ksud late-load` through the available root shell. Existing root loads the matching LKM, then YukiSU's C++ userspace completes initialization.

### No root shell is available

The manager uses the Magica service to obtain the temporary capability needed for late-load. After YukiSU takes over the current session, the Magica path performs cleanup, restores ADB-related properties and returns SELinux to Enforcing.

Both paths produce the same YukiSU late-load state. They differ only in where the initial permission to load the LKM comes from.

## What C++ userspace does

YukiSU implements late-load in C++ `ksud`:

1. inspect the running kernel and determine KMI;
2. extract the matching `<kmi>_kernelsu.ko` from manager resources;
3. load the LKM through the kernel module interface;
4. install or update YukiSU userspace required by this session;
5. process module updates/removals, contexts, SELinux rules, App Profiles and Feature configuration;
6. run `late-load.d` and module `late-load.sh` scripts;
7. load `system.prop` and call the active MetaModule's `metamount.sh`;
8. enter `post-mount`, `service` and `boot-completed` stages;
9. refresh manager state so the current YukiSU session is recognized.

MetaModule and module interfaces still follow upstream. The constraint is that the normal early boot window has already passed.

## Difference from normal boot

| Behavior | Normal boot | Jailbreak / late-load |
| --- | --- | --- |
| LKM load time | During the boot chain | After Android has booted |
| PID 1 early handling | Available | Unavailable |
| initrc injection | Normal boot-chain handling | Skipped |
| Early module script | `post-fs-data.sh` | **`late-load.sh`** |
| Stage environment | Normal environment | `KSU_LATE_LOAD=1` |
| `system.prop` | Supported | Supported |
| MetaModule mount | Supported | Supported |
| `post-mount` / `service` / `boot-completed` | Supported | Supported |
| Volume-key safe mode | Supported | Unavailable during late-load |
| Early boot-log capture | Supported | Skipped |
| Persistence | Loaded by the boot image | Current boot only |

Upstream late-load also skips Magisk coexistence checks, the `post-fs-data` report and other work tied to early boot, then advances directly to the stages usable in the current session.

## Module support

late-load cannot replay a missed `post-fs-data.sh` after Android has already booted. A module that supports this mode should provide:

```text
/data/adb/modules/<module-id>/late-load.sh
```

The script can check `KSU_LATE_LOAD=1`. Work that depends on PID 1, early init, pre-decryption storage or volume-key safe mode cannot simply be moved to this path.

MetaModule, `system.prop`, `post-mount`, `service` and `boot-completed` remain available in upstream late-load order. A module without `late-load.sh` does not necessarily lose every capability, but initialization implemented only in `post-fs-data.sh` will not run.

## Auto-jailbreak

With auto-jailbreak enabled, the manager checks state during app autostart. If SELinux remains Permissive, YukiSU is not active and the other requirements are met, it can use Magica to bootstrap late-load again.

The manager must be allowed to start automatically and must not be frozen by aggressive battery policy during boot. Auto-jailbreak still means “repeat late-load on every boot”; it does not modify the boot image.

## When to use it

Good use cases include temporary validation of a matching-KMI LKM, exploring YukiSU in the current session, avoiding boot-image writes during a test, or obtaining a management environment before a normal installation.

It is a poor permanent default when the device depends on continuous SELinux Enforcing isolation, modules require PID 1 or `post-fs-data`, manager autostart is unreliable, or root must be predictable on every boot without userspace bootstrap.

::: danger Permissive weakens SELinux isolation
Do not leave a device Permissive long-term solely for Jailbreak mode without understanding the security impact. A normal matching-KMI LKM installation remains the more predictable everyday path.
:::

## Troubleshooting

- **No Jailbreak entry:** check whether YukiSU is already active and whether SELinux is really Permissive. Device support and a matching bundled LKM determine execution success, not entry visibility.
- **No matching LKM:** do not bypass version checks or force another KMI. Use a build with the correct resource or compile for the running kernel.
- **Module partially works:** inspect whether initialization exists only in `post-fs-data.sh`, then check `late-load.sh`, MetaModule `metamount.sh`, `post-mount` and `service` logs.
- **YukiSU disappears after reboot:** expected for a temporary session. Use the normal LKM installation flow for persistence.

## References

- [Official KernelSU late-load documentation](https://kernelsu.org/guide/module.html#late-load-mode)
- [YukiSU get started](/en/guide/get-started/)
- [Module system](/en/modules/overview/)
