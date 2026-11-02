---
permalink: /en/yukizygisk/features/
title: YukiZygisk features and status
---

# YukiZygisk features and status

## Two module APIs

YukiZygisk currently has two distinct module paths:

- **Ordinary Zygisk:** reads `zygisk/<abi>.so`; the current public `zygisk.hpp` is API v5 and the runtime accepts API v1 through v5.
- **Native ZN:** reads `zn_modules.txt` and injects selected native executables; the current header is Zygisk Next native API v4, the runtime accepts v3/v4, and an optional HYOS runtime extension is available.

Ordinary Zygisk uses callbacks such as `preAppSpecialize`/`postAppSpecialize`; Native ZN uses `onModuleLoaded`. Manager labels modules “Zygisk” or “Native” from their libraries and manifests. A module that supplies both formats follows both loading paths.

## Loading settings and defaults

The status page separates the loader, mapping strategy, early loading and protection. Defaults without saved configuration are:

| Setting / key | Default | Effect |
| --- | --- | --- |
| YukiLinker / `yukilinker` | `true` | Prefer the bundled loader for ordinary Zygisk modules; disabling uses the system loader |
| Anonymous memory / `anonymous_memory` | `true` | Select ordinary Zygisk module mapping policy; Native modules retain Bionic mappings |
| Early Native loading / `early_load` | `false` | Prepare next-boot Native snapshots for targets before `post-fs-data` |
| Module crash protection / `crash_protection` | `true` | Suspend ordinary Zygisk injection for this boot when crash-evidence conditions match |
| Denylist / `denylist_mode` | `0` | `0` off, `1` force, `2` restore |
| Log mirroring / `dmesg_log` | `false` | Mirror daemon logs to dmesg |

Ordinary Zygisk modules with `PT_TLS` use the system linker directly; other libraries try the system path if the bundled loader fails. In v1.8.0, Native ZN modules always load through Bionic and retain system-managed handles, dependencies and mappings. These two module-loading settings do not switch Native modules to another loader. The core uses a separate anonymous bootstrap path.

Settings are stored in `/data/adb/ksu/yukizygisk/yzconfig.json`. `yzctl reload` notifies daemons and refreshes the early snapshot. Existing processes do not unload and reload; early loading affects the next-boot snapshot. After saving, a connected runtime receives reload. If no runtime channel exists yet, the command saves configuration and updates the snapshot for the next YukiZygisk start. A failed reload still attempts an early-snapshot refresh; failure does not roll back saved settings. Run `ksud yzctl config get`, then inspect runtime state and errors.

A missing file uses defaults. Malformed JSON or a non-object top level is replaced with defaults. Read-permission errors and unsafe file states return an error without overwriting the file. Recheck the settings above after configuration repair.

## Denylist modes

The status page exposes three behaviors:

| Mode | Ordinary module mounts | Ordinary Zygisk modules |
| --- | --- | --- |
| Off | Still decided by the YukiSU root profile | Denylist does not additionally block injection |
| Force | Unmount ordinary module mounts for a matched app | Skip module loading and callbacks |
| Restore | Preserve the ordinary-module unmount result | Still inject and run module callbacks |

The denylist decision comes from YukiSU's UID profile. It is not a MetaModule switch and does not perform a post-specialization sweep of private mounts created by a Zygisk module. See [Module mounting](/en/modules/magic-mount/).

`FORCE_DENYLIST_UNMOUNT` currently records the option without an additional unmount. Module authors should handle mounts according to the UID/profile and denylist behavior above.

## 64-bit and 32-bit processes

YukiZygisk packages ARM64 and ARM32 runtimes/daemons. The 32-bit daemon starts only when the device has a 32-bit Zygote or a valid 32-bit Native target. Third-party modules still need a library matching the target process.

Ordinary Zygisk modules are not loaded into app child processes whose UID is in the isolated-process range. system_server follows the separate server-specialize callbacks. Native ZN matching instead uses its `name=`/`path=` target and ELF class.

## YukiZygisk injection safe mode

The kernel tracks PIDs separately by Zygote socket name. The first PID establishes a baseline; each different PID later observed for the same name counts as one restart. When one name reaches `3` restarts, YukiZygisk enters global injection safe mode:

- the triggering Zygote is not injected;
- later Zygote and Native targets are also skipped;
- the manager reports the triggering name and count;
- root, MetaModule, ordinary modules and Lua plugins are not automatically disabled.

The restart counter tracks PID replacements; use the matching kernel/daemon logs to investigate the cause. Toggling the feature does not clear the counter. Address the faulty module, export diagnostics, then reboot to reset safe mode for the new boot.

This differs from YukiSU **system safe mode**, which skips module/plugin stages and disables modules under `/data/adb/modules/`. YukiZygisk safe mode protects only the injection chain.

## Module crash protection

This is separate from global injection safe mode. With module crash protection enabled, the daemon correlates current-boot Zygote exit events and tombstones by process, ABI, generation and module-file identity. If an ordinary Zygisk module occupies frame 0 of a correlated direct fault or system_server fault, protection suspends that module's later injection for this boot. The 32-bit and 64-bit daemons share suspensions.

Suspensions are bound to the boot ID. They do not write the module's `disable` marker, uninstall it or undo code already loaded. A full reboot does not inherit the old boot's suspension set, so address the problematic module before rebooting. Native ZN crash details are also recorded, but ordinary-Zygisk automatic module isolation does not apply to Native modules.

“Appeared in a crash backtrace” means the module library appears in a stack frame. Check the card's suspension state to see whether injection was suspended. Use the tombstone fault location and full stack to investigate the cause.

## Status meanings and troubleshooting

The manager polls `yzctl status --json` about every two seconds. Use the displayed state to choose the next check:

| Display | Meaning | Next step |
| --- | --- | --- |
| Feature enabled | The live kernel feature flag is on | Reboot after first enabling it, then check daemon and Zygote state |
| Zygote `injected` | Core injection completed for this PID/generation | Start the target app and check module state and functionality |
| Zygote `unknown` | Detection/redirection occurred, but no completion or failure arrived | Refresh status. If no result arrives, inspect daemon/core logs for that ABI, record the PID and export diagnostics |
| Zygote `failed` | Injection failed for this generation | Inspect loader/core logs for the same PID/generation |
| Ordinary module count | Active directories contain `zygisk/*.so` for the corresponding ABI | Open module status to inspect load reports |
| Ordinary module `injected` | The current monitored Zygote PID/generation has a successful module registration/load report | Test pre/post callbacks and module functionality in the target app |
| Native `unknown` | The manifest is registered, but no module result has arrived for the target | Start the target normally and refresh; reboot for a boot-time service. If no result arrives, check its manifest, ABI and logs |
| Native `injected` | A completion report arrived for this module, target type and target | Test module functionality; a normal target exit preserves this result |
| Native `failed` | Failure was recorded for this module/target | Inspect target loader/core logs, ELF ABI and dynamic dependencies |

Native aggregation is keyed by module directory ID + target type + target value. A successful target that later exits normally remains `injected` in the aggregate. A configured target never observed stays `unknown`. Process view retains raw PID/process values for grouping while the displayed process name uses the path basename.

Aggregation prioritizes explicit `crashed` / `failed` over success. Success plus unobserved scopes remains `injected`; only entirely unobserved scopes are `unknown`. Process exit is shown separately as `exited`, preserving the recorded injection result.

The page's injection count includes only Zygote/Native target generations with a positive base `injected` record. It is neither every exec nor the number of module callbacks.

## CLI status and daemon recovery

Read runtime state and current configuration:

```sh
ksud yzctl status --json
ksud yzctl config get
```

JSON fields `kernel_health`, `daemon_health` and `native_exit_evidence` distinguish kernel support, live daemon responses and recorded exits. Daemon sockets use randomized names discovered through endpoint state published by the kernel. Scripts should query health through `yzctl status --json` instead of constructing socket names.

If a daemon is missing, run `ksud yzctl ensure-daemon --abi all` in a root shell. It starts only required instances that are not already running. It refuses while the feature is disabled or in safe mode, and leaves an existing unresponsive instance untouched. Reboot if it returns `reboot_required`; module-catalog changes require a reboot to load a consistent inventory. After daemon recovery, start the target again through its normal workflow; reboot the device for Zygotes and boot-time services.

`ksud yzctl config set KEY VALUE` saves settings and applies them according to the runtime state described above. Use `true` / `false` for booleans and `0` / `1` / `2` for denylist mode. For example, `ksud yzctl config set dmesg_log true` enables daemon log mirroring. `ksud yzctl refresh-snapshot` rebuilds or clears the next-boot snapshot; reboot after changing early modules.

## Logs and diagnostics

Current-boot daemon logs are at `/data/adb/ksu/yukizygisk/diagnostics/current/logs/zygiskd64.log` and `zygiskd32.log`. “Mirror to dmesg” additionally sends daemon logs to the kernel log; kernel-side YukiZygisk messages already go to dmesg.

YukiSU retains `diagnostics/current` and the previous `diagnostics/old` generation with boot ID, state, loader, capture and available tombstone/pstore files. A complete manager bugreport includes `yukizygisk.tar.gz` whenever the feature is enabled or diagnostic records exist.

An issue report should include at least:

1. versions or hashes of the actually loaded LKM, `ksud` and payloads;
2. Android release, kernel/KMI and target ABI;
3. module directory ID, version, target and reproduction steps;
4. the complete `yukizygisk.tar.gz`, not only a status screenshot;
5. what differed between the last working and failing boots.

Continue with [ordinary Zygisk modules](/en/yukizygisk/modules/) or the [Native ZN API](/en/yukizygisk/native-zn/).

## Source references

- [Configuration defaults](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/settings.hpp)
- [Status and CLI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yzctl.cpp)
- [Daemon recovery](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_daemon.cpp)
- [Crash correlation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/daemon/crash_monitor.cpp)
- [Status screen](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/yukizygisk/YukiZygiskScreen.kt)
