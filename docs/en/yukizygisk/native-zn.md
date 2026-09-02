---
permalink: /en/yukizygisk/native-zn/
title: Native ZN API
---

# Native ZN API

Native ZN loads a native library into a selected executable process. It does not depend on Zygote specialization or use ordinary `zygisk.hpp` `ModuleBase`. Its target manifest, entry and companion are defined by [`zygisk_next_api.h`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/zygisk/include/zygisk_next_api.h).

::: warning For native module developers
This is process-level root injection. A wrong target, ABI, inline hook or symbol assumption can crash the target or a system service. A Native-target crash alone does not increment the Zygote restart counter; injection safe mode is possible only if the failure also causes Zygote restarts. Validate on a recoverable device with one module at a time.
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

Live targets registered after `post-fs-data` are injected only on the supported init-child exec path. This is not an arbitrary-process injector.

## Current boot and the early snapshot

Some native services start before `post-fs-data`, too early for a `zygiskd` scan. YukiSU generates `native_snapshot.bin` in pre-init storage for them:

1. installing, updating, enabling, disabling or removing an ordinary module refreshes the snapshot;
2. the snapshot copies the dedicated loader/core and eligible ZN libraries, plus linker offsets, targets and ELF ABI;
3. the kernel reads it during the next LKM initialization to match early execs;
4. after `post-fs-data`, daemons establish live inventory and runtime reporting.

Only valid entries **without `companion`** enter the snapshot; a module that needs a companion must wait for `zygiskd`. If the snapshot is missing, has the wrong format/version, records a linker size that no longer matches, or could not obtain required symbol offsets when generated, early Native is disabled for that boot instead of blindly using stale data.

Consequently:

- a successful snapshot refresh means “next-boot material prepared,” not “current process injected”;
- reboot after an update to validate an early target;
- disabling or removing a module cannot extract its library from an existing process;
- after YukiZygisk safe mode activates, later Native targets are skipped together with Zygotes.

## v4 module entry

The current header declares:

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

The runtime accepts v3 and v4 entries. New modules should compile against the current v4 header and check the actual interface/environment before using a new v4 slot.

## `ZygiskNextAPI`

The v4 function table provides:

- `pltHook(base, symbol, handler, original)`;
- `inlineHook(target, handler, original)` and `inlineUnhook(target)`;
- `newSymbolResolver(path, base)` / `freeSymbolResolver(resolver)`;
- `getBaseAddress`, `symbolLookup`, `forEachSymbols`;
- `connectCompanion(self_handle)`;
- `getRuntime()`.

Hook calls return `ZN_SUCCESS` (0) or `ZN_FAILED` (1). Check every result, retain the original function, reject duplicate hooks and keep hook code mapped for at least as long as the patch. Pair every resolver with `freeSymbolResolver`; do not retain callback-owned symbol pointers past their lifetime.

## Native companion

When a manifest line contains `companion`, the library can also export the global symbol `zn_companion_module`:

```c
struct ZygiskNextCompanionModule {
    int target_api_version;
    void (*onCompanionLoaded)(void);
    void (*onModuleConnected)(int fd);
};
```

`connectCompanion(self_handle)` returns a connection only when that entry declared a companion and the daemon can validate the calling process/module/target relation. Connections may be dispatched on separate threads; the module must handle concurrency, protocol framing and fd closure.

## API v4 HYOS runtime

`getRuntime()` is the new v4 slot. It does not promise an extra runtime in every process. The current implementation returns a descriptor only when an AArch64 process contains a valid `/system_ext/bin/hyos_spawner` Rust runtime mapping; otherwise it returns `NULL`.

Check both fields:

```c
runtime->type == ZN_RUNTIME_HYOS
runtime->api_version == ZYGISK_NEXT_HYOS_API_VERSION  /* currently 1 */
```

HYOS runtime v1 lets a module call `registerModule` during `onModuleLoaded` with a `ZygiskNextHyosModule`. Its `onAppSpecialized` receives:

- `process_name`;
- `package_name`;
- `se_info`.

Registration closes when Native module loading ends. YukiZygisk installs a `fork` and `selinux_android_setcontext` bridge for the HYOS spawner, and reports completion only when the bridge, control session and registered callback all succeed. Non-HyperOS systems, 32-bit processes, a mismatched mapping or `getRuntime()==NULL` are normal fallback cases, not values to dereference anyway.

## Status verification

The manager groups Native modules by directory ID + `name/path` type + target value. Process view additionally groups raw PID and exec strings. States mean:

- `unknown`: configured but unobserved, or only detected/redirected without an explicit module result;
- `injected`: positive completion exists for this module and target; the aggregate remains injected after a normal target exit;
- `failed`: explicit failure exists, or base injection completed while an expected matching module did not;
- `crashed`: that generation was marked `SAFEMODE` and skipped; this UI label does not prove that the Native target itself crashed.

A library file and a detected target are not substitutes for `injected`; `injected` is not a substitute for final feature validation. Include `zn_modules.txt`, ELF ABI/dynamic dependencies, the real target exec path, the raw status target and the full `yukizygisk.tar.gz` in an issue report.
