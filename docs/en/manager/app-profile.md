---
permalink: /en/manager/app-profile/
title: App Profile
---

# App Profile

The Superuser switch answers whether an Android UID may elevate through YukiSU. App Profile then defines the UID/GID, capabilities, SELinux domain, and mount namespace used after approval, plus module-unmount policy when root is not granted.

The complete kernel ABI is [`uapi/app_profile.h`](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/app_profile.h). Its current version is `KSU_APP_PROFILE_VER 4`; do not write configuration using an old tutorial's structure size or field order.

## Policy applies to a UID

Android allows multiple packages to share one UID. The current Superuser page groups such packages, and App Profile lists every app in that UID group.

::: warning A shared UID cannot grant only one package
The kernel observes the same UID. Root, module visibility, or dynamic-manager identity granted to one package affects the other packages using that UID. Review every package name and signature source in the group first.
:::

Superuser supports pull-to-refresh. If the list looks stale after a change, refresh the profile returned by the kernel instead of trusting old Compose state.

## Three Root Profile modes

### Default

The kernel default uses UID/GID 0, default groups, full capabilities, the YukiSU `su` SELinux domain, and the caller's inherited mount namespace. When global Default anti-escape (no-new-privs) is enabled, apps still using the default profile inherit that restriction too.

Prefer Default without a concrete isolation requirement. Custom does not automatically mean safer; one missing group or capability can make a tool fail later and less visibly.

### Template

A template stores a reusable root profile. Settings can:

- synchronize online templates from the KernelSU template service;
- create, edit, and delete local templates;
- import one or more JSON templates from the clipboard; and
- export local templates to the clipboard.

Online templates are read-only in the manager; local templates can be edited. Author and display name are not a security guarantee. Review every field and SELinux rule before applying one.

### Custom

The current manager exposes:

- UID and GID;
- up to 32 supplementary groups;
- one Linux capability selection;
- SELinux domain and additional rules;
- inherited, global, or individual mount namespace; and
- the `FLAG_KSU_NO_NEW_PRIVS` anti-escape flag.

#### Current capability semantics

The UAPI structure retains three 64-bit fields named `effective`, `permitted`, and `inheritable`, but the current Manager displays and writes **one** capability selection. The kernel uses those effective bits to establish its effective, permitted, and bounding sets. The UI does not independently edit three lists.

Do not make a third-party writer interpret the manager's one selection as three, and do not copy an older `app_profile` binary layout.

#### Namespace selection

| Mode | Behavior | Common effect |
| --- | --- | --- |
| Inherited | Retains the caller's current mount namespace | Closest to the normal app environment |
| Global | Switches to YukiSU's saved global mount namespace | Exposes global mounts and expands visibility |
| Individual | Creates an individual mount namespace for the elevated process | Later mount changes may not propagate to other namespaces |

An incorrect namespace often does not look like “root failed.” Instead, a root shell cannot see the expected file or mount.

#### SELinux domain and rules

A custom profile selects a domain and lets `ksud` persist and apply additional rules. The manager checks rule syntax before saving, but parseable does not mean least-privilege or safe.

An empty custom domain falls back to `u:r:su:s0`; do not rely on that fallback to conceal bad configuration. Overbroad rules expand attack surface, while narrow rules can leave the elevated process denied by SELinux.

#### no-new-privs

This flag prevents a process already elevated under that root profile from using YukiSU again for secondary elevation/escape. It is not merely a UI alias for generic Linux `PR_SET_NO_NEW_PRIVS`, and it does not replace correct UID, capability, and SELinux restriction.

## Non-root Profile

A UID without root can choose whether module mounts are removed:

- **Default:** follows Settings → Unmount modules by default; the current global default is off.
- **Custom:** explicitly enables or disables unmount for this UID.

The global Kernel Umount Feature must remain enabled. This changes module-mount visibility in the target app namespace only. It neither revokes other root paths nor guarantees root-detection bypass.

Profiles enter their relevant paths when an app process starts/specializes or requests elevation. Fully stop and restart the app after changing non-root unmount or namespace state; an existing process does not rebuild its namespace automatically.

## Dynamic managers

“Set as dynamic manager” and “Superuser” are independent. Dynamic-manager configuration persistently trusts signature information for the target APK so the kernel can recognize that app as a YukiSU manager. It is not merely an ordinary root shell grant.

By default, the switch appears only for preset signature candidates or already trusted dynamic managers. “More settings → Allow any app as dynamic manager” only exposes the switch for every app; it does not automatically trust them.

::: danger Manager identity exceeds an ordinary root grant
A manager can administer other app policies, modules, and system configuration. Enable this only for an audited replacement manager. Revoke it from the same App Profile after testing, then refresh Superuser to confirm trust was removed.
:::

Dynamic-manager trust also differs from SuperKey:

- dynamic-manager configuration persistently trusts a target APK signature;
- SuperKey records the UID that successfully submits the key in the running kernel; and
- an ordinary root grant only decides whether a UID may elevate through `su`.

They are not interchangeable fallback passwords. See [SuperKey authentication](/en/manager/superkey/).

## Verification after a change

1. Record package name, UID, and every package in a shared UID group.
2. Change only one class of field: grant, identity, capabilities, SELinux, namespace, or module unmount.
3. Refresh Superuser and confirm the profile returned by the kernel.
4. Fully stop and restart the app; create a new `su` session for root-profile testing.
5. Inspect `id`, groups, capabilities, SELinux context, and mount namespace in the target process.
6. On failure, return to Default before blaming the app itself.

“The app starts” is not least-privilege validation. Missing access may appear only when it reaches network, storage, Binder, or module mounts.
