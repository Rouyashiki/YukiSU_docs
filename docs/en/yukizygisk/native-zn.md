---
permalink: /en/yukizygisk/native-zn/
title: Native ZN API
---

# Native ZN API

Native ZN loads a native library into a selected executable process. It does not depend on Zygote specialization or use ordinary `zygisk.hpp` `ModuleBase`. Its target manifest, entry and companion are defined by [`zygisk_next_api.h`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/include/zygisk_next_api.h).

::: warning For native module developers
Native ZN runs module code inside native processes. A wrong target, ABI or hook can crash a target or system service. Prepare a stock boot image and test one module at a time on a recoverable device. A Native-target exit does not increment the Zygote restart counter; only resulting Zygote restarts count toward injection safe mode.
:::

## Different from ordinary Zygisk

| | Ordinary Zygisk | Native ZN |
| --- | --- | --- |
| Discovery | `zygisk/<abi>.so` | `zn_modules.txt` |
| Target | Zygote-derived app/system_server | Native executable matched by name or path |
| Entry | `zygisk_module_entry` | Global `zn_module` structure |
| Current API | `zygisk.hpp` v5, core accepts v1–v5 | Native API v4, core accepts v3/v4 |
| Main callback | pre/post specialize | `onModuleLoaded` |
| Companion | `zygisk_companion_entry` | Global `zn_companion_module` + manifest `companion` |

An ordinary module can package both library types, but YukiZygisk scans and reports them through separate paths.

## `zn_modules.txt`

Place the file at the ordinary module root. Each non-empty, non-comment line selects one target and one library:

```text
# Exact exec basename match
name=logd lib/arm64-v8a/libexample.so

# Exact exec path match with a root companion
path=/system/bin/audioserver lib/arm64-v8a/libexample_audio.so companion
```

Grammar:

```text
name=<basename> <library> [companion]
path=<absolute-exec-path> <library> [companion]
```

- `name=` compares the exec basename and `path=` compares the full exec path; both are exact matches.
- A relative library path is resolved under `/data/adb/modules/<directory-id>/`; absolute library paths are also accepted.
- `$moduleId` and `${moduleId}` expand to the module directory ID.
- The referenced file must exist and be a 32-bit or 64-bit little-endian ELF.
- To cover the same target in both ABIs, provide separate lines referencing ARM64 and ARM32 ELF files.
- A module carrying `disable` or `remove` is excluded from active inventory.

Prefer module-relative paths so that lifecycle does not depend on another mutable directory. Native ZN never dynamically `dlopen`s an already-running PID; it matches a new exec.

Live targets registered after `post-fs-data` are injected only on the supported init-child exec path. The target must start through this exec path.

## Current boot and the early snapshot

Some native services start before `post-fs-data`, too early for a `zygiskd` scan. YukiSU generates `native_snapshot.bin` in pre-init storage only when both YukiZygisk and Early Native loading (`early_load`, **off by default**) are enabled. This is separate from module `preinit.sh`:

1. installing, updating, enabling, disabling or removing an ordinary module, or calling `yzctl reload`, refreshes the snapshot; unmet enablement conditions clear old snapshots;
2. the snapshot copies the dedicated loader/core and eligible ZN libraries, plus linker offsets, targets and ELF ABI;
3. the kernel reads it during the next LKM initialization to match early execs;
4. after `post-fs-data`, daemons establish live inventory and runtime reporting.

Only valid entries **without `companion`** enter the snapshot; a module that needs a companion must wait for `zygiskd`. If the snapshot is missing, has the wrong format/version, records a linker size that no longer matches, or could not obtain required symbol offsets when generated, early Native is disabled for that boot. Check the snapshot error in diagnostics, confirm that YukiZygisk and `early_load` are enabled, regenerate the snapshot, and reboot.

When updating or disabling modules:

- reboot after refreshing the snapshot so early targets use its new contents;
- disabling or removing a module cannot extract its library from an existing process;
- after YukiZygisk safe mode activates, later Native targets are skipped together with Zygotes.

## Loading and process exits

In v1.8.0, Native modules always load through Bionic `__loader_android_dlopen_ext` with `RTLD_NOW | RTLD_LOCAL` and `ANDROID_DLEXT_USE_LIBRARY_FD`. The caller is anchored to identity-checked resident libc; that system linker namespace resolves dependencies. YukiLinker and anonymous-memory settings neither change the Native module loader nor anonymize its Bionic mappings.

Once a module enters `onModuleLoaded`, its library handle is retained until process exit for later callbacks and `libdl` calls. Each module directory ID initializes once per process. Reusing the same file identity or Bionic handle under another module ID is rejected. Restart the target after updating, disabling or removing a module; regenerate the snapshot and fully reboot for early targets.

For load failures, find `native caller` and `Bionic load failed` in core logs. They identify the failing stage: `linker`, `anchor`, `revalidate` or `load`. For `load` failures, also inspect dependency, symbol and linker-namespace errors.

Current status separates injection results from process `running` / `exited` / `unknown` and can correlate kernel exit history with tombstones. A normal exit preserves the earlier successful injection state. For a crash, inspect exit records and the tombstone fault stack. Ordinary-Zygisk automatic crash isolation does not apply to Native modules.

## v4 module entry

Module structure:

```c
#define ZYGISK_NEXT_API_VERSION 4

struct ZygiskNextModule {
    int target_api_version;
    void (*onModuleLoaded)(void *self_handle,
                           const struct ZygiskNextAPI *api);
};
```

The library must export a visible global `zn_module`:

```c
#include "zygisk_next_api.h"

static void on_loaded(void *self_handle, const struct ZygiskNextAPI *api) {
    (void)self_handle;
    (void)api;
}

__attribute__((visibility("default")))
struct ZygiskNextModule zn_module = {
    .target_api_version = ZYGISK_NEXT_API_VERSION,
    .onModuleLoaded = on_loaded,
};
```

The runtime accepts v3 and v4 entries. New modules should use the v4 header and set `target_api_version` to `4`. A module declaring v3 must not call the v4-only `getRuntime()` slot.

## `ZygiskNextAPI`

The v4 function table provides:

- `pltHook(base, symbol, handler, original)`;
- `inlineHook(target, handler, original)` and `inlineUnhook(target)`;
- `newSymbolResolver(path, base)` / `freeSymbolResolver(resolver)`;
- `getBaseAddress`, `symbolLookup`, `forEachSymbols`;
- `connectCompanion(self_handle)`;
- `getRuntime()`.

Hook calls return `ZN_SUCCESS` (0) or `ZN_FAILED` (1). Check every result and keep the target library, replacement code and original-function storage valid while the hook is in use. Pair every resolver with `freeSymbolResolver`; do not retain callback-owned symbol pointers past their lifetime.

### PLT and inline-hook requirements in v1.8.0

YukiPLT replaces the PLT backend without changing the ZN API v4 layout. `pltHook` requires a unique, non-null, enumerable `JUMP_SLOT` and a single owner per target slot. Repeating the same image/symbol/handler verifies the existing hook and returns its saved original without creating another hook chain. A competing handler fails.

Keep original-function storage alive and read it inside the replacement with the header helper `zn_plt_load_original(&original)`. Do not reuse published original storage. A failed call can retain recovery state, so do not immediately release the target library, handler or original storage.

`inlineHook` and `inlineUnhook` require a single-threaded process. Overlapping patch ranges, invalid arguments and unsupported instructions are rejected. Install hooks before the target starts concurrent execution and check every return value.

## Native companion

When a manifest line contains `companion`, the library can also export the global symbol `zn_companion_module`:

```c
struct ZygiskNextCompanionModule {
    int target_api_version;
    void (*onCompanionLoaded)(void);
    void (*onModuleConnected)(int fd);
};
```

`connectCompanion(self_handle)` returns a connection only when that entry declared a companion and the daemon can validate the calling process/module/target relation. Connections may be dispatched on separate threads; the module must handle concurrency, protocol framing and fd closure. The runtime maintains the module-to-companion binding as daemon registrations change. Keep using the supplied `self_handle`. If `connectCompanion` fails, inspect the daemon and that module's companion status instead of connecting to internal sockets yourself.

## API v4 HYOS runtime

`getRuntime()` is the new v4 slot. It returns a descriptor only when an AArch64 process contains a valid `/system_ext/bin/hyos_spawner` Rust runtime mapping; otherwise it returns `NULL`.

Check that the return value is non-null, then check both fields:

```c
runtime->type == ZN_RUNTIME_HYOS
runtime->api_version == ZYGISK_NEXT_HYOS_API_VERSION  /* currently 1 */
```

HYOS runtime v1 lets a module call `registerModule` during `onModuleLoaded` with a `ZygiskNextHyosModule`. Its `onAppSpecialized` receives:

- `process_name`;
- `package_name`;
- `se_info`.

Registration closes when Native module loading ends. YukiZygisk installs a `fork` and `selinux_android_setcontext` bridge for the HYOS spawner, and reports completion only when the bridge, control session and registered callback all succeed. On non-HyperOS systems, in 32-bit processes or with a mismatched mapping, `getRuntime()` returns `NULL`. Skip HYOS functionality and continue with the module's other available features.

## Status verification

The manager groups Native modules by directory ID + `name/path` type + target value. Process view additionally groups raw PID and exec strings. States mean:

- `unknown`: no module result has arrived. Start the target through its normal workflow and refresh status; reboot for a boot-time service. If no result arrives, check the manifest, actual exec path and daemon/core logs for its ABI;
- `injected`: positive completion exists for this module and target; the aggregate remains injected after a normal target exit;
- `failed`: failure was reported, or base injection completed while an expected matching module did not. Inspect target loader/core logs, ELF ABI and dynamic dependencies;
- `crashed`: that generation was skipped because of `SAFEMODE`. Check the triggering name and count on the status page, address the faulty module, and reboot. The label does not mean that this Native target crashed.

After status becomes `injected`, test the functionality the module is intended to change. Include `zn_modules.txt`, ELF ABI/dynamic dependencies, the real target exec path, the raw status target and the full `yukizygisk.tar.gz` in an issue report.

## Source references

- [Native module loading](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/yukizncore.cpp)
- [Snapshot generation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_snapshot.cpp)
- [Manifest parsing](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/daemon/native_modules.hpp)

- [Native Bionic loader](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/native_bionic.cpp)
- [Module and companion binding](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/native_module_binding.hpp)
