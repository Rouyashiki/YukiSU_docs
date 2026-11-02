---
permalink: /en/manager/soft-reboot/
title: Soft reboot
---

# Soft reboot

YukiSU soft reboot uses the device-side `ksud` to restart Android services, rerun module boot stages, and rebuild integrated mounts and Kasumi rules. **The kernel does not restart**, so a late-loaded LKM can remain active. A new LKM, boot image, ImgPatch configuration, or early-boot UTS template requires a full reboot.

This differs from Android “Userspace reboot” in the power menu. That platform operation does not replace YukiSU's rule restoration flow.

## Where to use it

- Soft reboot in Home's top-right power menu.
- Settings → Soft restart instead of reboot, disabled by default, for the completion button after module installation, update, enable, disable, or removal.
- Late-load mode prefers soft reboot when supported, avoiding a full reboot that ends temporary root.

The manager queries device-side `ksud soft-reboot-status --json`. Until the query completes, or when it fails, the daemon is too old, or another soft reboot is running, the action is unavailable. If it remains unavailable after updating the APK, inspect Home's `ksud daemon` state, sync the matching version, and address the reported reason.

## Requirements

v1.8.0 no longer blocks soft reboot merely because Kasumi is enabled. These conditions are checked before starting:

| Requirement | Remedy when unmet |
| --- | --- |
| Compatible APK, `ksud`, and running-kernel UAPI | Update matching components; fully reboot after installing a new LKM |
| Android has completed boot and no other soft reboot is running | Wait for boot or the current operation; do not submit duplicate requests |
| Neither safe mode nor Magisk boot ownership | Fix the module/boot environment and fully reboot into normal operation |
| Bootloop protection has not disabled module mounting | Repair the faulty module and address protection state; do not force execution by deleting state files |
| Kagami configuration and persisted rules are readable and valid | Repair the file or rule named in the error |
| The running mount controller supports soft-reboot protocol 1 | Sync the new `ksud` and fully reboot to replace the old running controller |
| When Kasumi participates, its state is known and `safe_rule_retire` is supported | Update the running kernel/LKM; turning off a switch cannot add an old kernel capability |
| Persisted user hide rules have `managed_hide` support | Use an LKM that can restore them, or remove unwanted rules through Kasumi |

If the controller is not running, `ksud` can start it through the normal flow. An existing controller with an unsupported protocol is rejected. Neither the UI preference nor direct CLI invocation bypasses these checks.

## Execution

After preflight, background-process startup, and the controller handshake, Manager reports “Request accepted.” The background flow then:

1. Prepares service-exit monitoring and sets `sys.boot_completed` to `0`.
2. Runs `emulated-soft-reboot` callbacks, stops Android, and waits for the old `system_server` and related services to exit.
3. Has the controller safely retire old mounts and rules, then reruns `post-fs-data` to process module updates, mounts, and configuration.
4. Restores persisted user hide rules and their global/policy scopes.
5. Starts Android, runs service stages, waits for boot completion, and runs boot-completed stages.
6. Checks hide-rule restoration and records completion, pending paths, or failure.

A temporarily black screen and closed apps are part of restarting Android services. “Request accepted” means background work started; it is not final completion. Do not request another reboot at that point.

## Reading the result

Return to Manager for the last result, or read it from a root terminal:

```sh
/data/adb/ksud soft-reboot-status --json
```

Top-level `supported`, `blocked_reason`, and `running` describe current availability. The `last` object contains `result`, `phase`, `error`, and `pending` for the last flow.

| State | Meaning and action |
| --- | --- |
| `running: true` / `accepted` | Work is still in progress. Wait and inspect `phase` |
| `completed` | Android boot stages finished and rule checks passed. Test the module functionality you need |
| `completed_pending` | Android has started, but hide rules await parent directories that do not yet exist. Inspect `pending` and Kasumi rule states |
| `failed` | Read `error` and `phase`, preserve logs, and resolve that stage's failure |

A missing parent directory permits a pending rule. An existing parent with an unbound rule, missing rule, wrong scope, or binding error is a restoration failure. Later status queries recheck `completed_pending` and change it to `completed` when binding finishes.

## Handling failure

Depending on the failed stage, the flow restores the boot flag, removes partial rebuilt state, or restarts Android services. It does not undo arbitrary system-file changes made by module scripts, and rollback does not replace stock-image backups.

If a controller request times out without confirmed completion, the coordinator **does not immediately run cleanup or Android startup concurrently**. Recovery is deferred to the controller. For `controller completion unconfirmed`, inspect logs and status before doing anything else; do not repeatedly request soft reboot or start a second mount flow.

Logs are in `/data/adb/ksu/kagami/run/soft-reboot.log`, with the previous log at `soft-reboot.log.old` in the same directory. Also retain status JSON, `ksud` logs, and Kasumi logs. Waiting for Android boot completion is bounded to 180 seconds; a timeout records the failed stage. If Android cannot recover interaction, use the device's forced-restart procedure for a full reboot, then inspect the faulty module. Late-load root must be loaded again after a full reboot.

## Source references

[Manager status and entry points](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/SoftReboot.kt), [Execution and status](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp), [Failure recovery](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/soft_reboot_flow.hpp), [Support checks](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/core/reboot_state.cpp), [Controller protocol](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/core/daemon.cpp), [Rule verification](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/kasumi.cpp).
