---
permalink: /en/manager/uts-view/
title: UTS View
---

# UTS View

UTS View changes the kernel identity a process observes through its UTS namespace, including `uname` fields. It presents a view; it does not replace the running kernel, change the real KMI, or alter the kernel security patch level.

Open it through “Settings → UTS View.” When the running LKM does not support the interface, the Settings entry is marked unsupported and disabled.

## Editable fields

The page controls six UTS fields independently:

- `sysname`;
- `nodename`;
- `release`;
- `version`;
- `machine`; and
- `domainname`.

Each field has its own switch. A selected value must be non-empty and no more than 64 UTF-8 bytes. The limit is bytes, not displayed characters.

::: warning Keep the original kernel identity
Changing `release` or `machine` changes UTS query results only. Boot properties, files, and other kernel interfaces still expose their own information. Installers, modules, or diagnostic scripts that use the changed value for compatibility checks will select paths using that value. Use the saved original identity when downloading an LKM or troubleshooting.
:::

## Three configuration targets

| Target | Scope | When it applies | Main limitation |
| --- | --- | --- | --- |
| Runtime global | Tasks still sharing the initial UTS namespace | Updates covered tasks immediately after save | Existing private UTS namespaces retain old identity; unavailable when boot-locked |
| Denylist scoped | Future app processes entering denylist scope | On the target app's next start/specialization | Running processes do not change; fully restart the target app |
| Boot global | Global identity established early from the LKM on the next boot | Repatch, flash the correct slot, then fully reboot | Locks the global identity for that boot, so runtime global cannot override it |

Runtime global and denylist scope can be active together; the status then reads “Global + denylist scoped.”

Denylist scope has no separate package list. Ordinary apps enter it according to their [Non-root Profile module-unmount policy](/en/manager/app-profile/); root apps and managers are excluded, while isolated processes are included separately. All eligible new processes share one denylist template. A process that already owns a private UTS namespace is skipped.

## Reading status

### Configuration source

- **Early boot:** the current global identity came from LKM boot configuration.
- **Runtime:** configuration was restored during `post-fs-data` or written from the live page.
- **Not configured:** no UTS View mode is active.

### Boot locked

When boot-global configuration is active for this boot, the global identity is marked locked. The runtime-global switch is disabled. Changing or disabling it requires repatching the target boot chain and rebooting.

The denylist template remains a separate scope; boot lock does not make it identical to the global template.

### Original identity valid

The page shows both:

- the original identity captured by the kernel; and
- the effective global identity.

“Original identity valid” means the kernel retained a snapshot for diagnosis and KMI selection. When the LKM supports UTS View but original `release` is unavailable, installation refuses automatic KMI detection. Identify the KMI from the target stock boot image and select it manually.

### Late capture and coverage gaps

- **Original identity captured late:** the LKM loaded after system startup. The original snapshot comes from load time and cannot reconstruct earlier identity or tasks.
- **Runtime coverage gaps:** some tasks already own private UTS namespaces and cannot receive the runtime-global update.

Runtime updates cannot change existing private namespaces. To establish global identity from startup, configure a boot-global template, repatch, and fully reboot.

## How boot-global configuration reaches the LKM

The page first stores a local draft and stages a pending patch configuration. “Repatch” opens a patch flow limited to current-slot or inactive-slot installation. The ordinary installation page can also carry the pending configuration through a later supported patch.

- The traditional ramdisk path encodes the template as LKM startup parameters.
- ImgPatch writes it into the LKM's 512-byte ImgPatch configuration block.

Leaving with unpatched changes prompts for repatching. A damaged staging file or invalid template blocks patching. Return to UTS View, correct the fields, and save again before retrying.

::: important Fully reboot after installation
If patching a file, flash the output to the target firmware's correct `boot`/`init_boot` partition and slot. If installing directly, confirm completion and fully reboot. Return to UTS View, confirm the source is Early boot and Boot locked is Yes, then inspect the effective identity.
:::

## Workflows

### Test an app's denylist view

1. Open the target app in Superuser, leave root ungranted, and enable module unmount in its custom Non-root Profile. With global Kernel Umount enabled, this also changes its module visibility.
2. Return to UTS View, enable Denylist scoped, and enter values for only the fields you need.
3. Save, fully stop the target app, and restart it.
4. Read `uname` inside the target process; a terminal app's result is not a substitute.
5. Preserve both original identity and the target process result, and check other apps using the same template.

### Change as much of the live system as possible

1. Record Original identity valid and the current effective identity.
2. Use Runtime global.
3. Check whether the page reports coverage gaps.
4. Processes with existing private namespaces retain old values. To update them, use a boot-global template and fully reboot.

### Cover early boot

1. Configure a Boot-global template.
2. Keep the stock image for the target firmware.
3. Enter Repatch and verify slot and patch mode.
4. Perform a full reboot.
5. Confirm source is Early boot, Boot locked is Yes, and compare original/effective identities.

Disabling boot-global mode also requires repatching and rebooting. A page switch cannot modify an LKM that was already flashed.

## Record all of this when troubleshooting

- configuration source and active mode;
- Boot locked, Original identity valid, late capture, and coverage gaps;
- original and effective `release`;
- KMI parsed from the actual boot image; and
- the last patch's target partition, slot, and Working mode.

Include both the original identity and `uname -a` from the target process. The latter shows the UTS view that process actually uses.

## Source references

[UtsViewScreen.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/UtsViewScreen.kt), [uts_view.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/extension/uts_view.c), and [Non-root policy](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/policy/allowlist.c).
