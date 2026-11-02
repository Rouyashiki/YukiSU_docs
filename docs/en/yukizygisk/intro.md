---
permalink: /en/yukizygisk/intro/
title: YukiZygisk
---

# YukiZygisk

YukiZygisk is YukiSU's optional integrated process-injection environment. It can run ordinary Zygisk modules and Native ZN modules without Magisk or another Zygisk implementation, but it is not part of the core root path.

YukiZygisk has its own switch and status page. YukiSU root authorization continues to work when it is disabled.

::: warning Experimental feature
YukiZygisk remains experimental. Check the module's Android, API, ABI and target-app requirements, and keep the deployed LKM, `ksud` and payload versions matched.
:::

## Implementation and conflicts

YukiZygisk implements its own kernel observation, entry redirection, Zygote runtime, module broker and diagnostics. It supports the module APIs listed below. Device processes named `zygiskd64`/`zygiskd32` are its userspace brokers.

Integrated YukiZygisk cannot run alongside another Zygisk implementation. While the feature is enabled, the module listing force-disables implementation directories named `zygisksu`, `rezygisk` and `yukizygisk`; the last ID is the standalone YukiZygisk module.

## Integrated versus standalone

This chapter describes the integrated version shipped with YukiSU v1.8.0. Its kernel hooks live in `kernelsu.ko`; YukiSU's `ksud` and manager handle configuration, payload deployment, startup and diagnostics. Update the integrated version through YukiSU's installation/update flow, keeping its LKM and userspace components matched. The standalone version has its own package, kernel component and update flow; do not mix their binaries.

## Requirements and enablement

1. The loaded `kernelsu.ko` must include `CONFIG_KSU_YUKIZYGISK=y`.
2. Device-side `/data/adb/ksud` and YukiZygisk payloads must come from a matching build.
3. Enable YukiZygisk under manager Settings → Feature control.
4. Complete a full reboot.

The official build scripts currently enable YukiZygisk by default and accept `--yukizygisk-off` to omit it. A manual LKM build must still pass the corresponding build configuration. If Manager reports that the kernel does not support the feature, install an LKM built with that configuration and reboot.

The switch writes both live kernel state and persisted `ksud` configuration. Reboot after enabling it: `post-fs-data` starts the required daemons, and new Zygotes start through the injection path. See [Features and status](/en/yukizygisk/features/) to recover a missing daemon.

## Current architecture

1. The kernel observes `execve` and `execveat` and identifies Zygote or registered native targets.
2. Before the target reaches its userspace entry point, the kernel prepares loader/core file descriptors and redirects `AT_ENTRY`.
3. `zygiskd64` brokers modules, configuration and companions whenever the feature is active; `zygiskd32` is also started when a 32-bit Zygote or Native target exists.
4. The Zygote core loads ordinary Zygisk modules in derived app or system_server processes and calls standard callbacks.
5. A separate Native core loads ZN modules through Bionic into native processes matched by `zn_modules.txt`.

Module images cross the boundary as controlled descriptors/memory files, so target processes do not need to open payload paths under `/data/adb` directly. Ordinary Zygisk and Native ZN share some injection infrastructure but have different manifests, entry symbols, APIs and lifecycles.

## 64-bit and 32-bit

The YukiSU LKM supports ARM64 kernel devices only. YukiZygisk packages both `arm64-v8a` and `armeabi-v7a` runtime components to cover 64-bit and 32-bit processes on an ARM64 device.

Modules must supply libraries for the target ABI:

- an ordinary module needs `zygisk/arm64-v8a.so` or `zygisk/armeabi-v7a.so` for the process;
- each Native ZN manifest entry must reference an ELF class matching its target;
- no 32-bit daemon is started when the device has no 32-bit Zygote/target.

## Current boot versus next boot

| Operation | Existing processes | New processes/next boot |
| --- | --- | --- |
| Enable the feature | Existing Zygotes retain their state; reboot to start daemons and inject new Zygotes | Reboot restores configuration and fully enables it at `post-fs-data` |
| Disable the feature | Stops new kernel injection paths, but cannot extract code already loaded | Reboot creates a clean process tree without YukiZygisk |
| Install/update/toggle an ordinary Zygisk module | Existing apps and Zygotes retain their old state | Reboot lets the daemon rescan and new processes load it |
| Install/update/toggle a Native ZN module | A running target is not loaded or unloaded retroactively | New targets use the registered inventory; early targets use a prebuilt next-boot snapshot |
| Change loader/denylist/log settings | `yzctl reload` notifies daemons and primarily affects later loading/specialization | Reboot makes the saved value consistent across every process |

Module install, enable, disable and uninstall operations attempt to refresh the early Native snapshot. It is generated only when YukiZygisk and Early Native loading are both enabled; otherwise it is cleared. Early Native loading defaults to off. The snapshot serves next-boot targets that start before `post-fs-data`. Reboot after refreshing it to load updated modules into those targets.

## Runtime status

When the home page identifies integrated YukiZygisk, its dedicated status page polls the kernel runtime snapshot and shows:

- feature and YukiZygisk injection-safe-mode state;
- Zygote ABI, PID and injection state;
- discovered ordinary Zygisk modules;
- Native ZN module and process views, targets and companions;
- loader, anonymous-memory, early-loading, crash-protection, denylist and dmesg settings;
- current-generation ordinary-module load reports, injection suspensions and crash-backtrace details.

After installation, check that the module appears in the list, inspect its load state, and start the target app to test its functionality. See [Features and status](/en/yukizygisk/features/) for state meanings and troubleshooting, [Zygisk module compatibility](/en/yukizygisk/modules/) for ordinary modules, and [Native ZN API](/en/yukizygisk/native-zn/) for the native contract.

## Source references

- [Startup and recovery](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_daemon.cpp)
- [Kernel exec path](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/feature/yukizygisk/exec.c)
- [Early snapshot](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_snapshot.cpp)
