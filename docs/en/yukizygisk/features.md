---
permalink: /en/yukizygisk/features/
title: YukiZygisk features and status
---

# YukiZygisk features and status

## Two module APIs

YukiZygisk currently has two distinct module paths:

- **Ordinary Zygisk:** reads `zygisk/<abi>.so`; the current public `zygisk.hpp` is API v5 and the runtime accepts API v1 through v5.
- **Native ZN:** reads `zn_modules.txt` and injects selected native executables; the current header is Zygisk Next native API v4, the runtime accepts v3/v4, and an optional HYOS runtime extension is available.

Ordinary Zygisk `preAppSpecialize`/`postAppSpecialize` and Native ZN `onModuleLoaded` are unrelated callbacks. A “Zygisk” or “Native” tag on a module card classifies directory content; it does not make either API valid on the other path.

## Ordinary-module loader

The status page can select one of two ordinary Zygisk loading paths:

- `yukilinker (anonymous)`: YukiZygisk's anonymous loader;
- `system dlopen`: the system dynamic-loading path.

The value is stored in `yzconfig.json` and `yzctl reload` notifies the daemon. It primarily affects processes created or loaded later. Switching it does not unload and reload a module inside an existing app. Native ZN always follows its dedicated loader path, so this ordinary-module option does not describe ZN loading.

## Denylist modes

The status page exposes three behaviors:

| Mode | Ordinary module mounts | Ordinary Zygisk modules |
| --- | --- | --- |
| Off | Still decided by the YukiSU root profile | Denylist does not additionally block injection |
| Force | Unmount ordinary module mounts for a matched app | Skip module loading and callbacks |
| Restore | Preserve the ordinary-module unmount result | Still inject and run module callbacks |

The denylist decision comes from YukiSU's UID profile. It is not a MetaModule switch and does not perform a post-specialization sweep of private mounts created by a Zygisk module. See [Module mounting](/en/modules/magic-mount/).

The ordinary public header still declares `FORCE_DENYLIST_UNMOUNT`. The current integrated core records that module option, but the real unmount decision remains on the UID/profile path above; source does not yet connect the option to an additional unmount action. Module authors must not currently depend on that option to force mount-state changes.

## 64-bit and 32-bit processes

YukiZygisk packages ARM64 and ARM32 runtimes/daemons. The 32-bit daemon starts only when the device has a 32-bit Zygote or a valid 32-bit Native target. Third-party modules still need a library matching the target process.

Ordinary Zygisk modules are not loaded into app child processes whose UID is in the isolated-process range. system_server follows the separate server-specialize callbacks. Native ZN matching instead uses its `name=`/`path=` target and ELF class.

## YukiZygisk injection safe mode

The kernel tracks PIDs separately by Zygote socket name. The first PID establishes a baseline; each different PID later observed for the same name counts as one restart. When one name reaches `3` restarts, YukiZygisk enters global injection safe mode:

- the triggering Zygote is not injected;
- later Zygote and Native targets are also skipped;
- the manager reports the triggering name and count;
- root, MetaModule, ordinary modules and Lua plugins are not automatically disabled.

The counter proves PID replacement, not why the process died. The current implementation also has no explicit reset when the feature is toggled off and on; a full reboot creates a fresh kernel runtime state. Preserve kernel/daemon diagnostics around the trigger instead of reporting only the safe-mode badge.

This differs from YukiSU **system safe mode**, which skips module/plugin stages and disables modules under `/data/adb/modules/`. YukiZygisk safe mode protects only the injection chain.

## What runtime status proves

The manager polls `yzctl status --json` about every two seconds. Important meanings are:

| Display | Evidence | Not proven |
| --- | --- | --- |
| Feature enabled | Live kernel feature flag is on | Daemon, Zygote core or a module succeeded |
| Zygote `injected` | Core completion was reported for this PID/generation | Every third-party module completed its business logic |
| Zygote `unknown` | Detection/redirection exists without an explicit completion or failure | It must not be counted as success or failure |
| Zygote `failed` | This generation has explicit injection-failure state | It does not identify the failing call or responsible module |
| Ordinary module count | An active directory contains `zygisk/arm64-v8a.so` or `armeabi-v7a.so` | Those libraries completed callbacks in a target app |
| Native `unknown` | The manifest exists, but no target or positive/negative report was observed | It is not “loaded” |
| Native `injected` | That module, target type and target have positive runtime evidence | The module's final feature is correct |
| Native `failed` | Explicit failure exists for that module/target | API incompatibility is not established by this alone |

Native aggregation is keyed by module directory ID + target type + target value. A successful target that later exits normally remains `injected` in the aggregate. A configured target never observed stays `unknown`. Process view retains raw PID/process values for grouping while the displayed process name uses the path basename.

The page's injection count includes only Zygote/Native target generations with a positive base `injected` record. It is neither every exec nor the number of module callbacks.

## Logs and diagnostics

`zygiskd` writes separate 64-bit/32-bit logs in the current-boot diagnostics directory. “Mirror to dmesg” additionally sends daemon logs to the kernel log; kernel-side YukiZygisk messages already go to dmesg.

YukiSU retains `diagnostics/current` and the previous `diagnostics/old` generation with boot ID, state, loader, capture and available tombstone/pstore evidence. A complete manager bugreport includes `yukizygisk.tar.gz` whenever the feature is enabled or actual diagnostic evidence exists.

An issue report should include at least:

1. versions or hashes of the actually loaded LKM, `ksud` and payloads;
2. Android release, kernel/KMI and target ABI;
3. module directory ID, version, target and reproduction steps;
4. the complete `yukizygisk.tar.gz`, not only a status screenshot;
5. what differed between the last working and failing boots.

Continue with [ordinary Zygisk modules](/en/yukizygisk/modules/) or the [Native ZN API](/en/yukizygisk/native-zn/).
