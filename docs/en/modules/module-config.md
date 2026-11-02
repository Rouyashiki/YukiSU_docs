---
permalink: /en/modules/module-config/
title: Module configuration and managed features
---

# Module configuration and managed features

Use `ksud module config` to store module settings. It supports persistent values and temporary overrides, and declares which YukiSU features a module manages. Configuration belongs to the module directory ID and is deleted when the module is removed.

## Reading and writing settings

Installation scripts, lifecycle scripts and `action.sh` already receive `KSU_MODULE`. Run:

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config list
```

When debugging from an ordinary root shell, specify the actual module directory ID:

```sh
KSU_MODULE=example.report ksud module config get mode
```

The command fails without a valid `KSU_MODULE`. IDs require at least two characters, start with an ASCII letter and contain only ASCII letters, digits, dots, underscores and hyphens. `--internal <name>` selects the `internal.<name>` namespace for internal tools; ordinary modules use their own ID.

| Command | Behavior |
| --- | --- |
| `set <key> <value>` | Write a persistent value |
| `set <key> <value> --temp` | Write a temporary override |
| `get <key>` | Read the temporary value, then the persistent value; exit nonzero if neither exists |
| `list` | List merged `key=value` entries sorted by key |
| `delete <key>` | Delete the persistent value; exit nonzero if absent from that layer |
| `delete <key> --temp` | Delete the temporary value, exposing the persistent value again |
| `clear` | Clear persistent configuration; keep temporary configuration |
| `clear --temp` | Clear temporary configuration; keep persistent configuration |

`--temp` applies only to `set`, `delete` and `clear`. `get` and `list` always read merged values. A temporary value overrides the same persistent key, so it remains readable even after deleting the persistent value.

Temporary configuration is cleared at the start of the next `post-fs-data` flow and during late-load initialization. An [emulated soft reboot](/en/manager/soft-reboot/) dispatches `post-fs-data` again and also clears it. Keep user settings that must survive these stages in persistent storage.

## Multiline values, limits and storage

Omit `VALUE` or pass `--stdin` to read until EOF. Newlines are preserved. Use `printf` to avoid adding an unintended newline:

```sh
printf '%s' '{"mode":"balanced","enabled":true}' | ksud module config set settings --stdin
ksud module config get settings
```

- Keys are 2–256 bytes, start with an ASCII letter, and contain only letters, digits, dots, underscores and hyphens.
- Values must be UTF-8, up to 1 MiB. Empty and multiline values are allowed.
- Each layer holds at most 32 keys; persistent and temporary layers are counted separately.
- `get` adds a newline after the value. Shell `$(...)` removes trailing newlines and cannot retrieve multiline text byte for byte.
- `list` is text for inspection, and values may span lines. Do not `source` or `eval` its output.

Files are stored at `/data/adb/ksu/module_configs/<directory-id>/persist.config` and `tmp.config`. v1.8.0 uses a binary format with explicit lengths. Do not edit these files with a text editor or `sed`. Older `key=value` files written by the C++ implementation remain readable and migrate on the next save. Use the commands, check their exit status, and show save failures to the user.

## Managing a YukiSU feature

Write `manage.<feature-name>` when your module needs to own a kernel feature. For example, a module designed to manage `sulog` can declare this in `customize.sh`:

```sh
ksud module config set manage.sulog true || abort 'Cannot register sulog management'
```

Then set the runtime value from the module's own boot script:

```sh
ksud feature set sulog 1 || exit 1
```

`manage.sulog=true` **declares ownership; it does not enable sulog**. The module must set the feature, handle failure, offer user settings and provide a recovery path when it stops managing the feature. Use `ksud feature list` for feature names; numeric IDs also work after `manage.`.

Ownership follows these rules:

1. Only modules under `/data/adb/modules/` without `disable` or `remove` are scanned. Writing configuration alone does not create an active module.
2. After trimming surrounding whitespace, case-insensitive `true`, `yes`, `1` and `on` enable a `manage.*` declaration. Other values do not. Temporary values still take priority.
3. Saved feature restoration skips managed features so module scripts can set them.
4. Direct changes from an ordinary root shell or another module are rejected. The caller's `KSU_MODULE` must identify a module managing that feature.
5. Features forced by boot configuration take priority and cannot be overridden by a module.

`su_compat`, `magisk_compat` and `kasumi_sucompat` are coupled. Managing one restricts transitions across the group; disabling Kasumi also checks ownership of this group. Do not split control of coupled su modes across multiple modules.

You may additionally declare this in `module.prop`:

```properties
managedFeatures=sulog
```

This comma-separated list requests installation checks and warnings for unsupported or already managed features. It **does not write `manage.*`, establish ownership or prevent installation of conflicting modules**. Implement the actual configuration and feature changes yourself.

## Inspecting and releasing ownership

```sh
ksud feature check sulog
ksud feature list
ksud feature get sulog
ksud feature get sulog --config
```

`check` reports `supported`, `unsupported`, `managed` or `forced`; `list` names managing modules. `get` reads the running kernel value. `get --config` reads the saved feature value and prints `Not set in config` when absent. A saved value does not mean it was applied during this boot.

To release ownership, delete or turn off the relevant `manage.*` entry. Clear a temporary override first if present. Disabling or uninstalling the module also removes its ownership from subsequent checks. These actions do not undo an already applied kernel value: follow the module's recovery steps, then reboot and check the feature state.

Sources: [configuration implementation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module_config.cpp), [CLI arguments](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli_args.cpp), [managed features](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp), [module scan](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp), [installation checks](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh).
