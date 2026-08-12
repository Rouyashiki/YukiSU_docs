---
permalink: /en/manager/app-profile/
title: App Profile
---

# App Profile

App Profile separates whether an app may use `su` from the identity used after access is granted. The kernel structure is defined in [`uapi/app_profile.h`](https://github.com/Anatdx/YukiSU/blob/main/uapi/app_profile.h).

## Root profile

A custom profile can set UID, GID, up to 32 supplementary groups, effective/permitted/inheritable capabilities, SELinux domain, namespace options and `FLAG_KSU_NO_NEW_PRIVS`.

The current UAPI also includes `groups_count`, profile version and template fields. Do not copy an incomplete old C structure into a third-party configuration writer.

## Non-root profile

An app without `su` may independently unmount module changes. This limits what a normal app sees; it is not a guarantee of root hiding or detection bypass.

Profile changes apply when a process starts or requests privileges. Fully stop the target app before testing. Use the default profile unless custom UID, capability or SELinux behavior is required.
