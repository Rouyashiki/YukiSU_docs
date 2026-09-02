---
permalink: /en/yukizygisk/intro/
title: YukiZygisk
---

# YukiZygisk

YukiZygisk is YukiSU's optional integrated process-injection environment. It can run ordinary Zygisk modules and Native ZN modules without Magisk or another Zygisk implementation, but it is not part of the core root path.

Turning YukiZygisk off does not revoke YukiSU root. Conversely, working root does not prove that YukiZygisk's kernel hooks, daemons, runtime libraries and third-party modules all work.

::: warning Experimental feature
YukiZygisk remains experimental. Compatibility depends on the Android release, Zygote signatures, target ABI, module API, target app/native process, and the LKM/userspace versions actually deployed on the device.
:::

## It is not a bundled copy of Zygisk Next

YukiZygisk implements its own kernel observation, entry redirection, Zygote runtime, module broker and diagnostics. It targets compatible module ABIs rather than starting a complete packaged Zygisk Next. Device processes named `zygiskd64`/`zygiskd32` are YukiZygisk userspace brokers, not Magisk daemons.

Integrated YukiZygisk cannot run alongside another Zygisk implementation. While the feature is enabled, the module listing force-disables implementation directories named `zygisksu`, `rezygisk` and `yukizygisk`; the last ID is the standalone YukiZygisk module.

## Requirements and enablement

1. The loaded `kernelsu.ko` must include `CONFIG_KSU_YUKIZYGISK=y`.
2. Device-side `/data/adb/ksud` and YukiZygisk payloads must come from a matching build.
3. Enable YukiZygisk under manager Settings → Feature control.
4. Complete a full reboot.

The official build scripts currently enable YukiZygisk by default and accept `--yukizygisk-off` to omit it. A manual LKM build must still select the Kconfig option. If the running kernel does not expose the feature ID, updating only the APK cannot add that kernel capability.

The switch writes both live kernel state and persisted `ksud` configuration. The required daemons are fully started only at `post-fs-data`, however, and existing Zygotes/apps are never retroactively injected. This is why the manager requires a reboot; a newly lit switch is not success evidence.

## Current architecture

1. The kernel observes `execve` and `execveat` and identifies Zygote or registered native targets.
2. Before the target reaches its userspace entry point, the kernel prepares loader/core file descriptors and redirects `AT_ENTRY`.
3. `zygiskd64` brokers modules, configuration and companions whenever the feature is active; `zygiskd32` is also started when a 32-bit Zygote or Native target exists.
4. The Zygote core loads ordinary Zygisk modules in derived app or system_server processes and calls standard callbacks.
5. A separate Native core loads ZN modules from `zn_modules.txt` into matching native processes.

Module images cross the boundary as controlled descriptors/memory files, so target processes do not need to open payload paths under `/data/adb` directly. Ordinary Zygisk and Native ZN share some injection infrastructure but have different manifests, entry symbols, APIs and lifecycles.

## 64-bit and 32-bit

The YukiSU LKM supports ARM64 kernel devices only. YukiZygisk packages both `arm64-v8a` and `armeabi-v7a` runtime components to cover 64-bit and 32-bit processes on an ARM64 device.

This does not synthesize a missing third-party ABI:

- an ordinary module needs `zygisk/arm64-v8a.so` or `zygisk/armeabi-v7a.so` for the process;
- each Native ZN manifest entry must reference an ELF class matching its target;
- no 32-bit daemon is started solely for an unusable library when the device has no 32-bit Zygote/target.

## Current boot versus next boot

| Operation | Existing processes | New processes/next boot |
| --- | --- | --- |
| Enable the feature | Does not inject an existing Zygote; complete daemon startup is not guaranteed | Reboot restores configuration and fully enables it at `post-fs-data` |
| Disable the feature | Stops new kernel injection paths, but cannot extract code already loaded | Reboot creates a clean process tree without YukiZygisk |
| Install/update/toggle an ordinary Zygisk module | Existing apps and Zygotes retain their old state | Reboot lets the daemon rescan and new processes load it |
| Install/update/toggle a Native ZN module | A running target is not loaded or unloaded retroactively | New targets use the registered inventory; early targets use a prebuilt next-boot snapshot |
| Change loader/denylist/log settings | `yzctl reload` notifies daemons and primarily affects later loading/specialization | Reboot makes the saved value consistent across every process |

Module install, enable, disable and uninstall operations refresh the early Native snapshot. That snapshot specifically exists for next-boot targets that start before `post-fs-data`; a successful refresh is not proof that a current process was reinjected.

## Runtime status

When the home page identifies integrated YukiZygisk, its dedicated status page polls the kernel runtime snapshot and shows:

- feature and YukiZygisk injection-safe-mode state;
- Zygote ABI, PID and injection state;
- discovered ordinary Zygisk modules;
- Native ZN module and process views, targets and companions;
- anonymous-loader, denylist and dmesg-mirroring configuration.

A discovered module is inventory, not proof that its business callback completed. See [Features and status](/en/yukizygisk/features/) for exact state meanings, [Zygisk module compatibility](/en/yukizygisk/modules/) for ordinary modules, and [Native ZN API](/en/yukizygisk/native-zn/) for the native contract.
