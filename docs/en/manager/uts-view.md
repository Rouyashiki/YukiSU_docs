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

::: warning This is not general hiding
Changing `release` or `machine` affects only observation paths using that UTS view. Apps can still obtain signals from boot properties, files, kernel interfaces, hardware traits, and behavior. Incorrect values can also make installers, modules, or diagnostic scripts select the wrong compatibility path.
:::

## Three configuration targets

| Target | Scope | When it applies | Main limitation |
| --- | --- | --- | --- |
| Runtime global | Tasks still sharing the initial UTS namespace | Updates covered tasks immediately after save | Existing private UTS namespaces retain old identity; unavailable when boot-locked |
| Denylist scoped | Future app processes entering denylist scope | On the target app's next start/specialization | Running processes do not change; fully restart the target app |
| Boot global | Global identity established early from the LKM on the next boot | Repatch, flash the correct slot, then fully reboot | Locks the global identity for that boot, so runtime global cannot override it |

Runtime global and denylist scope can be active together; the status then reads “Global + denylist scoped.”

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

“Original identity valid” means the kernel retained a usable snapshot for diagnosis and KMI selection. On a new kernel that supports UTS View, installation refuses automatic KMI detection when original `release` is unavailable rather than guessing from modified `uname` output.

### Late capture and coverage gaps

- **Original identity captured late:** early coverage cannot be guaranteed.
- **Runtime coverage gaps:** some tasks already own private UTS namespaces and cannot receive the runtime-global update.

These are scope warnings, not errors to clear by toggling repeatedly. Use a validated boot-global configuration and a full reboot when consistent early coverage is required.

## How boot-global configuration reaches the LKM

The page first stores a local draft and stages a pending patch configuration. “Repatch” opens a patch flow limited to current-slot or inactive-slot installation. The ordinary installation page can also carry the pending configuration through a later supported patch.

- The traditional ramdisk path encodes the template as LKM startup parameters.
- ImgPatch writes it into the LKM's 512-byte ImgPatch configuration block.

A configuration token tracks whether the current draft matches the most recent patch. Leaving with unpatched changes prompts for repatching. A damaged staging file or invalid template blocks patching instead of being ignored.

::: danger A successful patch is not an active configuration
Generating output produces only a file; direct install writes a partition. In either case, verify the target firmware, correct `boot`/`init_boot` partition, and slot. Then fully reboot and check source, lock state, and effective identity on this page.
:::

## Recommended workflows

### Test one app

1. Select Denylist scoped.
2. Enable only required fields and enter values.
3. Fully stop the target app after saving.
4. Restart it and read `uname` from the same process context.
5. Preserve both original identity and the target process result.

### Change as much of the live system as possible

1. Record Original identity valid and the current effective identity.
2. Use Runtime global.
3. Check whether the page reports coverage gaps.
4. Do not misclassify old values in existing private namespaces as a save failure.

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

Do not report only `uname -a`. With UTS View enabled, that may be the output intentionally designed to change.
