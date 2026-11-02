---
permalink: /en/yukizygisk/modules/
title: Ordinary Zygisk modules
---

# Ordinary Zygisk modules

An ordinary Zygisk module follows the cross-implementation `zygisk.hpp` ABI and receives specialization callbacks in Zygote-derived app or system_server processes. This is separate from executable-targeted [Native ZN](/en/yukizygisk/native-zn/).

## Module discovery

The package is still installed as an ordinary YukiSU module. For every `/data/adb/modules/<directory-id>/` that is neither disabled nor pending removal, the 64-bit daemon looks for:

```text
zygisk/arm64-v8a.so
```

The 32-bit daemon looks for:

```text
zygisk/armeabi-v7a.so
```

If the library for that daemon's ABI is absent, it is not loaded. An empty `zygisk/` directory alone is not module inventory.

Complete a reboot after installing, updating, enabling, disabling or uninstalling the module. A running Zygote and its children do not hot-load or unload module libraries; state markers affect later scans and new processes.

## Current API range

The repository's [`zygisk.hpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/include/zygisk.hpp) currently declares `ZYGISK_API_VERSION=5`. The integrated core accepts API v1 through v5 and retains compatibility bridges for old argument layouts and old PLT-hook entries.

An API v5 module can implement:

- `onLoad`;
- `preAppSpecialize` / `postAppSpecialize`;
- `preServerSpecialize` / `postServerSpecialize`.

The current `Api` exposes companion connection, module-directory fd, root/denylist flags, fd exemption, JNI native-method replacement, PLT-hook registration/commit and module options. Call API methods only during the phases specified by the header; do not keep calling them after post-specialize ends.

Modules that depend on private Magisk/Zygisk Next interfaces, specific ART/JNI signatures or a particular app version need separate adaptation and testing for YukiZygisk.

::: warning `FORCE_DENYLIST_UNMOUNT` does not force unmounting
`FORCE_DENYLIST_UNMOUNT` currently records the option without performing an additional unmount. Ordinary-module mounts are unmounted according to the YukiSU UID/profile and YukiZygisk denylist mode.
:::

`DLCLOSE_MODULE_LIBRARY` requests library unload after post-specialize. v1.8.0 refuses unload while a module has active hooks, recovery handles or a published PLT replacement. A rolled-back installation does not establish that no thread still holds the replacement. Keep replacement code and original-function storage alive.

## Load and callback timing

Ordinary module libraries are loaded in the derived child rather than keeping every third-party library resident in the parent Zygote:

1. YukiZygisk obtains root/denylist state for the target UID.
2. A non-isolated app child loads libraries for its ABI.
3. It calls `onLoad` and the relevant pre-specialize callback.
4. Android completes specialization.
5. It calls post-specialize.
6. Libraries are released according to module options and hook state; mappings with remaining module or runtime references are retained.

App children in the isolated UID range and child Zygotes themselves skip ordinary module loading. An app Zygote matching an app UID and package-style `_zygote` name can release the core when safety checks pass because its children are isolated. Zygotes such as `webview_zygote` that still need to process ordinary descendants retain it. system_server uses server callbacks rather than the app argument layout.

YukiLinker prefers the bundled loader. Ordinary modules with `PT_TLS` use the system linker directly; a failed bundled load also attempts the system path. Anonymous memory is a separate setting. The loading log records the actual path. Modules must declare their dynamic dependencies and keep their library mapped while persistent hooks remain active.

## PLT hooks: YukiPLT

v1.8.0 replaces LSPlt with YukiPLT without changing the public Zygisk API version or table layout. Modules still call `pltHookRegister` and `pltHookCommit`, with these requirements:

- Register and commit on the module's own lifecycle callback thread, not an asynchronous worker thread. Requests are isolated per module.
- `(dev, inode)` must identify one enumerable target ELF. The symbol must have a unique, non-null `JUMP_SLOT`, with one hook owner per slot.
- A commit groups requests by target ELF, with at most 64 slots per group. Different ELF groups can partially succeed. If `pltHookCommit()` returns `false`, inspect each group's `module … PLT` log; do not assume all installed hooks were undone.
- Original-function storage must remain valid and must not be reused. Read it inside the replacement with `zygisk::loadPltOriginal(original)`.
- An incomplete installation or recovery blocks further installation in that core. Retain the handler and target library while the owning recovery path handles it.

The core caches mappings and synchronizes cache and hook state at managed Zygote/HYOS fork boundaries. Modules do not need YukiPLT private APIs and must not reset locks or caches to bypass a failure. Preserve the PID, module and full log when investigating fork/barrier errors.

## Companion

The same ABI library can use `REGISTER_ZYGISK_COMPANION` to export `zygisk_companion_entry`. `connectCompanion()` requests a socket fd connected to a root companion during pre-specialize. A 64-bit process connects to a 64-bit companion and a 32-bit process to a 32-bit companion.

`zygiskd` starts companions on demand and can deliver concurrent connections. Define framing and size limits, support concurrent connections, and close each fd when its request fails or finishes.

## Denylist

Denylist mode controls whether a matched app continues loading ordinary modules:

- **Off:** YukiZygisk does not skip modules because of the denylist.
- **Force:** skip ordinary Zygisk modules and retain ordinary-module mount unmounting.
- **Restore:** still load ordinary Zygisk modules while retaining ordinary-module mount unmounting.

`getFlags()` exposes `PROCESS_GRANTED_ROOT` and `PROCESS_ON_DENYLIST`. They indicate that the current UID has root authorization or matches the denylist, respectively.

Integrated YukiZygisk performs no post-specialization sweep of mounts created by a third-party module in the app's private namespace. The creator owns their lifecycle.

## Check module load status

The ordinary Zygisk module count comes from ABI libraries in active module directories. Current versions also expose module runtime state. Reports count only when the kernel advertises module monitoring and they match the current Zygote ABI, PID and generation. Explicit failure takes priority over success. Without a matching report, status is `unknown`: start the target app and refresh the page. If no result arrives, check daemon/core logs for the target ABI.

`injected` means module entry registration, loading and `onLoad` completed. Next, test pre/post callbacks and module functionality in the target app. Crash-protection suspensions and backtrace details appear separately; see [Features and status](/en/yukizygisk/features/).

Check in this order:

1. the target-ABI library exists and has the correct architecture;
2. the target Zygote is `injected` on the YukiZygisk status page;
3. daemon/core logs record module registration and loading;
4. the module's own companion/business log contains no error;
5. the target app shows a reproducible final effect.

The core log “loaded N module(s)” corresponds to step 3. Use steps 4 and 5 to test module functionality.

## Conflicts and troubleshooting

With integrated YukiZygisk enabled, `zygisksu`, `rezygisk` and the standalone `yukizygisk` module are force-disabled. Disable other Zygisk implementations and reboot before troubleshooting.

For one failing module:

1. keep only that injection module enabled;
2. reboot and confirm the correct 32/64-bit Zygote state;
3. verify module API/ABI, Android and target-app versions;
4. keep the anonymous-memory setting fixed and test with YukiLinker enabled and disabled; reboot for each test, use the same target, and record loading logs and results;
5. export a complete bugreport containing `yukizygisk.tar.gz` and include the module directory ID, version, target and steps.

## Source references

- [Loading and reports](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/core.cpp)
- [Specialization and app Zygotes](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/hook.cpp)

- [PLT and fork lifecycle](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/plt_lifecycle.cpp)
