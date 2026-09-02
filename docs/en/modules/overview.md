---
permalink: /en/modules/overview/
title: Module system
---

# Module system

YukiSU root, module mounting and process injection are separate facilities. Keeping those boundaries visible prevents a failed mount, a skipped script and a failed Zygisk injection from being diagnosed as the same problem.

| Component | Responsibility | Not its responsibility |
| --- | --- | --- |
| YukiSU core root | Kernel authorization, `su` and the main `ksud` path | Root does not require an ordinary module, MetaModule or YukiZygisk |
| Ordinary module | Installed files, lifecycle scripts, properties and SELinux rules | It does not choose how `system/` is mounted |
| MetaModule | Exposes ordinary-module file trees at system paths | It is neither a root provider nor a Zygisk implementation |
| Lua plugin | Runs callbacks in the `ksud` Lua runtime | It is not an ordinary module and takes no part in MetaModule mounting |
| Ordinary Zygisk module | Runs standard Zygisk callbacks in Zygote children | It requires YukiZygisk and cannot replace root or MetaModule |
| Native ZN module | Injects selected native executables by name or path | It uses a separate ZN API, not the ordinary Zygisk API |

One ordinary module may contain scripts, system files, a WebUI, Zygisk libraries and a Native ZN manifest at the same time. Each part still follows its own activation path.

## Installed directory and common files

Active modules live under:

```text
/data/adb/modules/<directory-id>/
```

Updates are staged under `/data/adb/modules_update/<directory-id>/` and merged during the next normal boot. The directory name is the runtime identity used to address a module. The `id` in `module.prop` remains display/update metadata, but cannot merge two different directories into one runtime instance.

| File or directory | Purpose | Activation boundary |
| --- | --- | --- |
| `module.prop` | `id`, name, version, author, description, update/support links and other metadata | Installation and list scans |
| `customize.sh` | Customize ZIP installation | Installation |
| `post-fs-data.sh` | Blocking early preparation | Normal early boot stage |
| `post-mount.sh` | Work requiring final module mounts | After `metamount.sh` |
| `service.sh` | Daemons and asynchronous initialization | Service stage |
| `boot-completed.sh` | Work requiring completed Android framework boot | Boot-completed stage |
| `uninstall.sh` | Final cleanup | Boot after removal is scheduled |
| `system.prop` | Properties applied through YukiSU's `resetprop` path | After early scripts, before mounting |
| `sepolicy.rule` | Additional module SELinux rules | Before ordinary module scripts |
| `system/` | File tree supplied to MetaModule | Next mount stage |
| `skip_mount` | Keep `system/` out of the mount backend | Next mount stage |
| `initrc/*.rc` | Content aggregated into pre-init `modules.rc` | Next full boot |
| `action.sh` | User-triggered one-shot manager action | Runs immediately when selected |
| `webroot/` | Module WebUI | When opened |
| `zygisk/arm64-v8a.so`, `zygisk/armeabi-v7a.so` | Ordinary Zygisk libraries | New Zygote/app processes |
| `zn_modules.txt` | Native ZN targets and libraries | New matching native processes; early targets use a next-boot snapshot |

`actionIcon` and `webuiIcon` in `module.prop` may point to relative files inside the module. Absolute paths, paths containing `..`, and missing files are rejected by the module list.

## Installed does not mean effective

The manager can show a module card while its full payload is still staged for update. Verify each state separately:

1. **Installed:** the ZIP passed installation and produced pending state;
2. **Enabled:** neither `disable` nor `remove` blocks the module;
3. **Executed:** the expected lifecycle stage actually ran and succeeded;
4. **Mounted:** the active MetaModule exposed `system/` at the target paths;
5. **Process recreated:** a Zygisk or Native ZN target is not an old process;
6. **Working:** the system component or target app shows a verifiable effect.

`disable`, `remove` and update state affect later scans immediately. They cannot undo scripts already run during this boot, stop an existing service, remove current mounts, or extract a native library from a running process. Treat one complete reboot as the reliable convergence boundary for module state.

## Normal boot order

The current normal `post-fs-data` implementation runs in this order:

1. common scripts from `/data/adb/post-fs-data.d`;
2. pending update/removal handling, directory contexts and module SELinux rules;
3. persisted feature restoration and required YukiSU userspace services;
4. the MetaModule's `post-fs-data.sh`;
5. ordinary-module `post-fs-data.sh` files;
6. Lua plugin `post_fs_data` callbacks;
7. module `system.prop` files;
8. the active MetaModule's `metamount.sh`;
9. per-app unmount configuration;
10. `post-mount`, ordered as common scripts, MetaModule, ordinary modules, then Lua plugins.

The `service` and `boot-completed` stages use the same common-script → MetaModule → ordinary-module → Lua-plugin order. Those stages do not block the whole chain in the same way as `post-fs-data`.

Consequently:

- prepare files in `post-fs-data.sh`, but do not assume the final system path is already replaced;
- put work that consumes mounted paths in `post-mount.sh`;
- do not wait for networking or framework services from a blocking early stage;
- place long-running work in `service.sh` instead of requiring repeated Action clicks.

Jailbreak/late-load mode has already missed real early boot. Ordinary modules and MetaModule use `late-load.sh`, followed by property loading, mounting and later stages; this cannot send code back to an init or Zygote event that already passed. See [Jailbreak mode](/en/guide/jailbreak-mode/).

## Script environment and module configuration

YukiSU supplies a common environment to installer/lifecycle scripts, including:

- `KSU=true` and `YUKISU=1`;
- `KSU_VER`, `KSU_VER_CODE`, `KSU_KERNEL_VER_CODE` and `KSU_UAPI_VER`;
- `KSU_RUNTIME_MODE`;
- `KSU_MODULE=<directory-id>` for module-specific scripts;
- `ZYGISK_ENABLED=1` while the feature flag is on;
- `KSU_LATE_LOAD=1` in late-load mode.

Do not use `ZYGISK_ENABLED` as proof that a particular Zygote or module was injected. It only describes the feature switch.

Module scripts can also store their own values through `ksud module config`:

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config set once 1 --temp
```

The command selects the module through `KSU_MODULE`. Persistent values live in `/data/adb/ksu/module_configs/<directory-id>/persist.config`. `--temp` values override persistent values and are cleared at the beginning of the next `post-fs-data` run.

## When MetaModule is required

Script-only modules, properties, SELinux rules, and Action/WebUI features that do not replace system files usually need no MetaModule.

A module needs a suitable MetaModule when it exposes files under `/system`, `vendor`, `product`, `system_ext` and similar trees, or explicitly requires OverlayFS, bind mounts or Magic Mount semantics. Only one backend may be active. See [MetaModule](/en/modules/meta-module/) and [Module mounting](/en/modules/magic-mount/).

## Do not confuse the two safe modes

YukiSU **system safe mode** is triggered by Android safe-mode properties or kernel Volume Down detection. `ksud` skips common, ordinary-module, MetaModule and Lua-plugin stages, then writes `disable` for ordinary modules under `/data/adb/modules/`, including the MetaModule. It is a test and recovery path for module-layer boot failures.

YukiZygisk has a separate **injection safe mode**. When one named Zygote reaches the restart threshold, it suppresses YukiZygisk injection for the rest of the current kernel session. It does not turn off core root or disable ordinary modules and Lua plugins. See [YukiZygisk features and status](/en/yukizygisk/features/).

System safe mode cannot repair a mismatched KMI, a wrong flashed partition or a damaged boot image. If the device still fails with modules disabled, use [Rescue and recovery](/en/guide/rescue-bootloop/).

## Minimum pre-install review

1. Android release, target ABI and target app version;
2. required MetaModule and its version;
3. dependencies on Magisk-only tools, paths or another Zygisk implementation;
4. root installers, native libraries, WebUI, init rc or Native ZN manifests in the ZIP;
5. which changes require a reboot and whether a reliable uninstall/rescue path exists;
6. trustworthy distribution, source, maintenance history and issue channel.

The module list now classifies ordinary Zygisk and Native ZN modules. Those tags are inventory and runtime clues, not proof of the module's final effect.
