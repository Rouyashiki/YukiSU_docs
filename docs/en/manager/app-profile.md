---
permalink: /en/manager/app-profile/
title: App Profile
---

# App Profile

The Superuser switch grants root to an Android UID. App Profile sets the UID/GID, capabilities, SELinux domain, and mount namespace used after approval, plus the module-unmount policy for apps without root.

The complete kernel ABI is [`uapi/app_profile.h`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/app_profile.h). Its current version is `KSU_APP_PROFILE_VER 4`; do not write configuration using an old tutorial's structure size or field order.

## Policy applies to a UID

Android allows multiple packages to share one UID. The Superuser page groups such packages, and App Profile lists every app in that UID group.

::: warning A shared UID cannot grant only one package
The kernel observes the same UID. Root, module visibility, or dynamic-manager identity granted to one package affects the other packages using that UID. Check all package names before granting access. If any package should not receive these permissions, do not grant them to that UID.
:::

Pull to refresh Superuser after a change to read the profile saved in the kernel. New grants apply to the next root request.

## Multiple users and work profiles

The manager enumerates Android users and groups apps by full UID. The same package has different UIDs in the owner, secondary users, and work profiles, so root grants and module unmount are configured separately. Check the card's UID before changing an app with the same name in another user.

If user enumeration fails, the app list falls back to user 0 only. Grants for other users are not deleted. Restore manager root communication and refresh the list. Authorization backup requires successful enumeration of all users and aborts on failure instead of exporting a partial user inventory.

## Three Root Profile modes

### Default

The kernel default uses UID/GID 0, default groups, full capabilities, the YukiSU `ksu` SELinux domain (`u:r:ksu:s0`), and the caller's inherited mount namespace. Global Default anti-escape (no-new-privs) is enabled by default in v1.8.0, and default profiles inherit it. Upgrade migration enables this global default; existing custom profile domains and anti-escape flags retain their saved values.

Use Default for general root tools. Choose Custom when you need to restrict identity or permissions, and retain the groups and capabilities the tool needs.

### Template

A template stores a reusable root profile. Settings can:

- synchronize online templates from the KernelSU template service;
- create, edit, and delete local templates;
- import one or more JSON templates from the clipboard; and
- export local templates to the clipboard.

Online templates are read-only in the manager; local templates can be edited. Review UID/GID, groups, capabilities, namespace, and SELinux rules before applying a template: they directly determine the UID's elevated permissions.

### Custom

Custom provides:

- UID and GID;
- up to 32 supplementary groups;
- one Linux capability selection;
- SELinux domain and additional rules;
- inherited, global, or individual mount namespace; and
- the `FLAG_KSU_NO_NEW_PRIVS` anti-escape flag.

#### Capabilities

The UAPI structure retains three 64-bit fields named `effective`, `permitted`, and `inheritable`, but the current Manager displays and writes **one** capability selection. The kernel uses those effective bits to establish its effective, permitted, and bounding sets. The UI does not independently edit three lists.

Third-party configuration tools must use the ABI v4 layout and field semantics. Do not infer three separate sets from the UI's single selection.

#### Namespace selection

| Mode | Behavior | Common effect |
| --- | --- | --- |
| Inherited | Retains the caller's current mount namespace | Closest to the normal app environment |
| Global | Switches to YukiSU's saved global mount namespace | Exposes global mounts and expands visibility |
| Individual | Creates an individual mount namespace for the elevated process | Later mount changes may not propagate to other namespaces |

If a root shell has elevated successfully but cannot see an expected file or mount, check the namespace selection and create a new `su` session after changing it.

#### SELinux domain and rules

A custom profile selects a domain and lets `ksud` persist and apply additional rules. The manager checks syntax before saving; the rules you enter determine which access is granted.

An empty custom domain uses `u:r:ksu:s0`. Enter the full name to use another domain. For SELinux denials, use the AVC logs for the affected operation to add the required rules.

#### no-new-privs

This flag prevents a process already elevated under that root profile from using YukiSU again for secondary elevation/escape. It is not merely a UI alias for generic Linux `PR_SET_NO_NEW_PRIVS`, and it does not replace correct UID, capability, and SELinux restriction.

## Non-root Profile

A UID without root can choose whether module mounts are removed:

- **Default:** follows Settings → Unmount modules by default; the current global default is off.
- **Custom:** explicitly enables or disables unmount for this UID.

The global Kernel Umount Feature must remain enabled. Unmounting affects module mounts in the target app namespace. Other root paths, properties, files, and detection surfaces remain.

Profiles enter their relevant paths when an app process starts/specializes or requests elevation. Fully stop and restart the app after changing non-root unmount or namespace state; an existing process does not rebuild its namespace automatically.

## WebView Zygote

v1.8.0 replaces Feature 5 with a **WebView Zygote** entry (UID 1053) in Superuser. Open its App Profile and select the default non-root policy, or use a custom policy to enable/disable module unmount. This entry remains visible when system apps are hidden and cannot receive root or dynamic-manager identity.

It uses the same unmount logic as other non-root profiles and requires global Kernel Umount. Default mode follows “Unmount modules by default.” Old Feature 5 settings no longer apply; select the required policy here after upgrading. Fully reboot after saving so WebView Zygote and subsequent WebView processes use it.

## Dynamic managers

“Set as dynamic manager” and “Superuser” are independent. Dynamic-manager configuration persistently trusts signature information for the target APK so the kernel can recognize that app as a YukiSU manager. It is not merely an ordinary root shell grant.

By default, the switch appears only for preset signature candidates or already trusted dynamic managers. “More settings → Allow any app as dynamic manager” only exposes the switch for every app; it does not automatically trust them.

::: danger Manager identity exceeds an ordinary root grant
A manager can administer other app policies, modules, and system configuration. Enable this only for a trusted replacement manager that needs these capabilities. When no longer needed, revoke it from the same App Profile and refresh Superuser.
:::

### Compatibility settings and signature scope

When enabling a dynamic manager, the page reads the target APK and requests confirmation if it lacks a bundled `ksud`. Continuing does not install a daemon for it. If APK/signature inspection or trust saving fails, use the reported error to fix the APK or restore manager communication, then grant access again. Refresh authorization after a successful save.

You can also configure the kernel version code, UAPI version, and full version string for that signature. Blank or zero numeric fields and an empty full-version field use actual kernel values. **Settings apply to applications with the same signature, not only this package or UID.** Revoking that signature trust also removes the identity other managers obtained through the same trust.

Compatibility settings change version-query results only; they do not implement missing ioctls or change the real ABI. Use them when a manager rejects a version check but its required interfaces are supported. Reopen the manager after saving and test the grants, modules, and configuration operations you need. If its interfaces are incompatible, use a build that supports the installed YukiSU. Global module-script version compatibility is a [separate Modules setting](/en/manager/settings/).

Dynamic-manager trust also differs from SuperKey:

- dynamic-manager configuration persistently trusts a target APK signature;
- SuperKey records the UID that successfully submits the key in the running kernel; and
- an ordinary root grant only decides whether a UID may elevate through `su`.

For key setup and authentication, see [SuperKey authentication](/en/manager/superkey/).

## Backing up and restoring grants

Use the Superuser menu to export or restore authorization backups. New backups use `yukisu.allowlist` JSON v2, limited to 4 MiB. They contain profiles, additional SELinux rules, the global unmount default, and package signing information. They are not copies of the kernel's binary `.allowlist` file.

Review the restore preview first:

- Matching uses package names and signatures within the same Android user and allows an installed UID to change. Shared UIDs must retain the same package set.
- A missing single-package app can be manually mapped to a signature-compatible, non-shared-UID candidate in the same user. Root is not automatically granted across users.
- Signature mismatches, unreadable package information, shared-UID changes, and SELinux rule conflicts prevent those entries from applying. The manager, other protected manager identities, and the special WebView Zygote profile are excluded from ordinary authorization backups and cannot be overwritten through restore.
- Merge selected entries is the default. Replace is available only when every entry matches and existing grants can be identified; it resets ordinary grants absent from the backup. Restoring the global unmount default is a separate option.
- JSON v1 is readable but lacks signing records, so it cannot provide v2 signature checks or missing-package mapping. Other legacy formats are rejected.

Package identities are checked again before applying. If apps were installed, removed, or updated in the meantime, refresh the preview as requested. A write failure attempts to restore previous profiles and rules. If rollback is incomplete, inspect individual grants, retain the error, and export the current state again. After a successful restore, refresh the list and restart target apps or create new `su` sessions.

## Saving and troubleshooting

1. Record package name, UID, and every package in a shared UID group.
2. Change only one class of field: grant, identity, capabilities, SELinux, namespace, or module unmount.
3. Refresh Superuser and confirm the profile returned by the kernel.
4. Fully stop and restart the app; create a new `su` session for root-profile testing.
5. Inspect `id`, groups, capabilities, SELinux context, and mount namespace in the target process.
6. If an operation fails with a custom profile, restore Default and create a new `su` session. Once it works in Default, restrict custom permissions one at a time.

Test the tool's actual network, storage, Binder, and module-file operations. Missing permissions cause these operations to fail even when the app starts successfully.

## Source references

[AppProfile.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/AppProfile.kt), [DynamicManagerCompatDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/component/DynamicManagerCompatDialog.kt), [KsuCli.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt).

[allowlist.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/policy/allowlist.c), [selinux.h](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/selinux/selinux.h), [KsuService.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/KsuService.kt), [AllowlistPlan.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistPlan.kt), [AllowlistRestore.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistRestore.kt).

[SuperUserViewModel.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/viewmodel/SuperUserViewModel.kt), [AllowlistBackup.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistBackup.kt).
