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

The repository's [`zygisk.hpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/zygisk/include/zygisk.hpp) currently declares `ZYGISK_API_VERSION=5`. The integrated core accepts API v1 through v5 and retains compatibility bridges for old argument layouts and old PLT-hook entries.

An API v5 module can implement:

- `onLoad`;
- `preAppSpecialize` / `postAppSpecialize`;
- `preServerSpecialize` / `postServerSpecialize`.

The current `Api` exposes companion connection, module-directory fd, root/denylist flags, fd exemption, JNI native-method replacement, PLT-hook registration/commit and module options. API methods are no longer guaranteed after post-specialize; follow the timing documented in the header.

“Header API v5” is not a promise that every module is compatible. A module can still depend on private Magisk/Zygisk Next behavior, a particular Android ART/JNI signature, injection traces, loader details or a target-app version.

::: warning Current `FORCE_DENYLIST_UNMOUNT` boundary
The public header declares `FORCE_DENYLIST_UNMOUNT`, but the current integrated core only records that option. Real ordinary-module unmount remains driven by the YukiSU UID/profile and YukiZygisk denylist mode. Do not currently rely on this option to force a mount-state change.
:::

`DLCLOSE_MODULE_LIBRARY` is connected to the real unload path. A module that installs persistent hooks must not request unloading its own library.

## Load and callback timing

Ordinary module libraries are loaded in the derived child rather than keeping every third-party library resident in the parent Zygote:

1. YukiZygisk obtains root/denylist state for the target UID.
2. A non-isolated app child loads libraries for its ABI.
3. It calls `onLoad` and the relevant pre-specialize callback.
4. Android completes specialization.
5. It calls post-specialize.
6. Libraries that safely requested it are unloaded, and YukiZygisk removes its own runtime traces where possible.

App children whose UID is in the isolated-process range skip ordinary module loading. A child Zygote retains the core so that it can process descendants. system_server uses server callbacks and must not be treated as the app argument layout.

## Companion

The same ABI library can use `REGISTER_ZYGISK_COMPANION` to export `zygisk_companion_entry`. `connectCompanion()` requests a socket fd connected to a root companion during pre-specialize. A 64-bit process connects to a 64-bit companion and a 32-bit process to a 32-bit companion.

`zygiskd` starts companions on demand and can deliver concurrent connections. Define framing, size limits, error closure and concurrency correctly; do not assume a single connection or caller.

## Denylist

Denylist mode controls whether a matched app continues loading ordinary modules:

- **Off:** YukiZygisk does not skip modules because of the denylist.
- **Force:** skip ordinary Zygisk modules and retain ordinary-module mount unmounting.
- **Restore:** still load ordinary Zygisk modules while retaining ordinary-module mount unmounting.

`getFlags()` exposes `PROCESS_GRANTED_ROOT` and `PROCESS_ON_DENYLIST`. These flags describe current UID state; they are neither target-app consent nor a compatibility result.

Integrated YukiZygisk performs no post-specialization sweep of mounts created by a third-party module in the app's private namespace. The creator owns their lifecycle.

## Inventory versus runtime evidence

The manager's ordinary Zygisk module count comes from ABI libraries in active module directories. The Zygisk/runtime tag on a module card is also primarily inventory plus feature state; it is not per-module, per-app callback-completion evidence.

Verify separately that:

1. the target-ABI library exists and has the correct architecture;
2. the target Zygote is `injected` on the YukiZygisk status page;
3. daemon/core logs record module registration and loading;
4. the module's own companion/business log contains no error;
5. the target app shows a reproducible final effect.

Even a core log saying “loaded N module(s)” proves only that the libraries registered and returned from `onLoad`, not that later target callbacks or item 5 succeeded.

## Conflicts and troubleshooting

With integrated YukiZygisk enabled, `zygisksu`, `rezygisk` and the standalone `yukizygisk` module are force-disabled. Do not run two Zygisk implementations and attribute duplicate-injection behavior to a single module.

For one failing module:

1. keep only that injection module enabled;
2. reboot and confirm the correct 32/64-bit Zygote state;
3. verify module API/ABI, Android and target-app versions;
4. compare anonymous loading and system `dlopen`, recording the result without generalizing it to other modules;
5. export a complete bugreport containing `yukizygisk.tar.gz` and include the module directory ID, version, target and steps.
