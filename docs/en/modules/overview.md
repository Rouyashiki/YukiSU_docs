---
permalink: /en/modules/overview/
title: Module system
---

# Module system

YukiSU follows KernelSU-style module directories, packages and boot stages while delegating system-file mounting to an external MetaModule. An ordinary module defines what it provides and when its scripts run. The MetaModule decides how required files appear at system paths.

This separation makes backends composable, while adding a compatibility relationship that users and module authors must check explicitly.

## A module is more than its ZIP

The ZIP is only the distribution format. An installed ordinary module lives at:

```text
/data/adb/modules/<module-id>/
```

It may contain:

| File or directory | Purpose |
| --- | --- |
| `module.prop` | ID, name, version, author, description and other metadata |
| `post-fs-data.sh` | Blocking early-boot preparation |
| `service.sh` | Asynchronous background initialization during services |
| `boot-completed.sh` | Work that requires Android framework boot completion |
| `system.prop` | Properties loaded by YukiSU userspace |
| `sepolicy.rule` | Additional module SELinux policy |
| `system/` | Files to be exposed through the MetaModule backend |
| `skip_mount` | Explicitly skip system-file mounting for this module |
| `action.sh` | A user-triggered manager action |
| `webroot/` | A module WebUI displayed by the manager |

These files are optional except for the basic `module.prop` used to identify the module. Actual behavior depends on present content and the runtime environment.

## Installed, enabled and working are different states

After ZIP installation, a module enters `/data/adb/modules` or a pending-update area. Some state changes complete on the next boot.

- **Installed:** files were written to a module directory.
- **Enabled:** no `disable` state prevents the module from running.
- **Executed:** the expected lifecycle scripts actually ran.
- **Mounted:** MetaModule exposed the file tree at target paths.
- **Working:** the system or target app shows the intended effect.

An “installed” card does not prove that a module is effective. Troubleshooting starts by identifying the module type and the stage where progress stopped.

## Boot stages and ordering

YukiSU handles common scripts, module state, SELinux, properties and mounting during boot.

| Stage | Typical use | Behavior |
| --- | --- | --- |
| `post-fs-data` | Early directories, policy and required preparation | Blocking; keep it short |
| `post-mount` | Work that needs completed MetaModule mounts | Runs after mounting |
| `service` | Daemons and tasks that need not block early boot | Asynchronous |
| `boot-completed` | Tasks requiring Android framework boot completion | Latest normal stage |

On the normal `post-fs-data` path, YukiSU handles module state, contexts and SELinux first, then runs MetaModule and ordinary-module `post-fs-data.sh`, loads `system.prop`, calls `metamount.sh`, and enters `post-mount`.

A module must not wait indefinitely for framework services or networking from `post-fs-data.sh`. One blocked script can delay or break the whole boot chain.

## Which modules need MetaModule?

The following commonly work **without** MetaModule:

- lifecycle scripts only;
- `system.prop` only;
- `sepolicy.rule` only;
- `action.sh` or WebUI whose feature does not replace system files.

The following commonly **require** MetaModule:

- files under `/system`, `/vendor`, `/product`, `/system_ext` and similar trees;
- replaced system configuration, framework resources, native libraries or executables;
- a declared dependency on OverlayFS, bind mounts or a particular backend.

Only one MetaModule may be active. It can provide installation, mount and removal interfaces. Read [MetaModule](/en/modules/meta-module/) for the full contract.

::: tip Relationship to current official KernelSU
YukiSU fully follows official KernelSU's MetaModule interface and lifecycle, so an existing backend does not need reinstallation merely because the root solution changed. An ordinary module can still require a particular Android version, ABI, backend implementation or private tool.
:::

## Module state files

The manager schedules next-boot state through markers in the module directory:

- `disable`: do not run this module;
- `remove`: clean it during a later boot stage;
- `update` or pending-update directory: apply an update on the next boot;
- `skip_mount`: do not pass the `system/` tree to the mount backend.

Avoid manually toggling markers while a module or MetaModule update/removal is pending. Allow one complete reboot for state to converge.

## Safe mode

In YukiSU safe mode, userspace skips normal `post-fs-data.d` and module scripts and disables all ordinary modules. The purpose is to return the device closer to a base-root state.

Safe mode can identify a module-induced boot problem. It cannot repair an incompatible LKM, wrong partition or damaged boot image. Use [Rescue and recovery](/en/guide/rescue-bootloop/) if the device still fails before modules are involved.

## WebUI and Action

### WebUI

A module can ship HTML, CSS and JavaScript in `webroot/`. The manager displays it in a WebView and exposes supported `kernelsu` JavaScript bridge operations.

This is not an ordinary web sandbox. A WebUI may launch root commands, read module data or change system configuration. Therefore:

- install modules only from trusted sources;
- never concatenate unvalidated input into shell commands;
- be cautious with remote scripts, frames and dynamic updates;
- show a target summary and confirmation for dangerous actions.

### Action

`action.sh` suits a one-shot operation such as regenerating configuration, clearing module cache or exporting state. Long-running daemons belong in an appropriate lifecycle stage instead of repeated Action clicks.

## Evaluating compatibility before installation

Check at least:

1. supported Android versions, ABIs and the upstream KernelSU module lifecycle;
2. required MetaModule backend and version;
3. dependencies on Magisk-only tools, paths or built-in Zygisk;
4. `customize.sh`, root shell, native libraries or WebUI content;
5. changes to boot-critical files and a safe uninstall path;
6. supported Android versions, ABIs and target app versions;
7. recent maintenance, available source and credible issue tracking.

A selectable ZIP and an install log without red lines are not complete compatibility evidence.

## Recommended rollout

- Stabilize base root before adding MetaModule.
- Start with one narrow, easily verifiable ordinary module.
- Install or update only a small batch at a time.
- Reboot and inspect scripts, mounts and target behavior after each batch.
- Retain the previous version and configuration before an important update.
- Disable the latest changes first instead of immediately wiping the environment.

## Common misconceptions

- **“Installed means mounted.”** Installation and mounting occur at different stages.
- **“A `system/` directory guarantees a mount.”** An active MetaModule is still required, and `skip_mount` must be absent.
- **“Following upstream means there are no external dependencies.”** The MetaModule protocol is identical, but a module can still bind itself to an Android version, ABI, backend or private tool.
- **“WebUI is only a settings page.”** It may execute with root and deserves high-privilege review.
- **“Every module issue requires reflashing the LKM.”** Start with disabling recent modules, safe mode and logs.

If a module has no effect, follow [Common troubleshooting](/en/troubleshoot/common/) layer by layer instead of reporting only its manager card.
