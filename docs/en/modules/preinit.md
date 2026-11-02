---
permalink: /en/modules/preinit/
title: Module preinit
---

# Module preinit

`preinit/` lets a module perform a small number of early actions before Android loads SELinux policy and parses regular init rc files. It runs earlier than `post-fs-data.sh` and uses the `preinit.conf` language described below.

Preinit requires kernel build support, an enabled boot setting and YukiSU loaded before PID 1 executes `selinux_setup`. Late loading and `preinit=0` disable this path. Restore normal boot loading and the boot-image setting, then fully reboot to execute it. The installation option to disable module preinit corresponds to `--no-preinit`; see [Manager and root installation](/en/manager/install/).

An [emulated soft reboot](/en/manager/soft-reboot/) does not pass through the kernel preinit entry again. Even if it refreshes the snapshot, a full reboot is still required to execute the new actions.

## Module layout

```text
example-module/
├── module.prop
└── preinit/
    ├── preinit.conf
    └── helper          # optional static executable
```

Installation, enable/disable, removal and normal `post-fs-data` synchronize a copy for the next boot. `ksud` prefers `/metadata/vold/ksu/` with UAPI 6 or later when its parent exists, otherwise `/metadata/watchdog/ksu/` when available, then `/metadata/ksu/`. Copies live under `preinit/<id>/` there. Include all early-action resources in `preinit/` so they are copied with it; do not depend on `/data/adb/modules/` being accessible yet.

`preinit.conf` must be a regular file. Synchronization accepts only regular files and directories, rejecting symlinks and special files. Total storage has a 4 MiB maximum budget, including block rounding and manifests, while retaining 8 MiB of free space. Use large binaries and ordinary resources from `post-fs-data` or a later stage.

## Configuration language

Use one action per line. Blank lines and lines beginning with `#` are skipped. Whitespace separates arguments; double quotes group arguments containing whitespace, and `\"` and `\\` are supported escapes. There is no shell variable expansion, piping, redirection or command substitution.

| Action | Syntax | Behavior |
| --- | --- | --- |
| `insmod` | `insmod module.ko [name=value ...]` | Load the kernel module, which must still satisfy target kernel requirements |
| `exec` | `exec [-t milliseconds] helper [arg ...]` | Execute a program and forward output; default wait is 5000 milliseconds |
| `write` | `write /absolute/path "content"` | Write content to an existing target without adding a newline |

For example, a static `helper` that only prints diagnostic information can be invoked as:

```text
# helper must be built for the target device
exec -t 1000 ./helper --report
```

Use a static ELF for the device ABI with `exec`. Do not depend on a dynamic linker, shell, Java, networking or `/data/adb` tools at this stage. The working directory is the module's preinit copy. The environment supplies only `KSU=true`, `KSU_PREINIT=1`, `MODID`, `PREINIT_DIR` and `PATH=/system/bin:/vendor/bin`. Standard input is closed; stdout and stderr are forwarded to the kernel log.

An action name may end with `?`, such as `exec?` or `insmod?`, to continue after that action fails. This does not suppress configuration syntax errors. Modules execute in ID order, with actions in line order. A failed non-optional action stops that module's remaining actions, then other modules continue. The entire worker has a 30-second limit; `exec -t` cannot extend it. The supervisor also cleans up descendants, so preinit is unsuitable for persistent daemons.

## Status and logs

Open “Module preinit” on the Modules page to view kernel support, boot count and preparation status. From a root shell, run:

```sh
ksud module preinit status
ksud module preinit status --json
```

| State | Meaning |
| --- | --- |
| `ok` | Files are prepared for execution on the next full boot |
| `unsupported` | The current kernel does not report available preinit support |
| `no_space` | Storage budget exceeded or insufficient free space |
| `error` | Invalid content, file or persistence error |
| `bootloop` | Successfully synchronized content is blocked by repeated-boot-failure protection |

After seeing `ok`, fully reboot and read the kernel log. `ksu_preinit: [MODULE_ID]` records action results; `ksu_preinit[MODULE_ID]:` records program output. Export logs promptly before older entries are overwritten. Include the module ID, action, return code and current boot information when reporting a failure.

After manually editing a module's `preinit/`, `ksud initrc refresh` synchronizes the next-boot snapshot. This writes state and also updates init rc. It does not run preinit in the current system.

## Repeated boot failure protection

When preinit content exists, the runner persists an attempt counter before execution. After three consecutive attempts fail to reach YukiSU's boot-completed path, the next boot skips preinit and retains a count of 4. Once protection is triggered, a later successful boot does not automatically clear it.

Disable or repair the module causing the failure, then reset the counter in the manager or run:

```sh
ksud module preinit reset
```

Resetting only clears the guard; execution retries on the next full boot. A normal successful boot clears attempts that have not triggered protection. A real source-content change successfully synchronized can clear the counter; repairing copied output, repeating refresh or migrating an old manifest does not count as a new source version that lifts protection.

Preinit runs before ordinary-module safe-mode handling. For preinit boot failures, use the protection and reset steps on this page. If the device cannot boot, remove the early snapshot as described in [Rescue and recovery](/en/guide/rescue-bootloop/). [System safe mode](/en/modules/overview/) and YukiZygisk injection safe mode handle their own later stages.

## Different from `initrc/`

`initrc/*.rc` files are combined into `modules.rc` for Android init's rc parsing stage. `preinit/preinit.conf` is interpreted by the earlier runner. `--no-custom-rc` and `--no-preinit` are separate boot options; disabling one does not disable the other.

Source references: [snapshots, budgets and status](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/preinit.cpp), [early runner](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/preinit/runner/runner.c), [kernel entry](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/preinit/preinit.c).
