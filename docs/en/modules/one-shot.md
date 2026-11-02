---
permalink: /en/modules/one-shot/
title: One-shot scripts
---

# One-shot scripts

A one-shot script packages a manual root operation as a ZIP. The manager presents its description, parameters, source and output. It is not installed as a persistent module and does not join later boot stages. Cleaning its temporary directory does not undo changes it made to the system.

To keep a module installed, use its `action.sh` or [hot installation](/en/modules/hot-install/). For boot callbacks or periodic tasks, use a [Lua plugin](/en/modules/plugin/).

## Running a script

1. Select a script entry in the module repository, or open a local one-shot ZIP through the ZIP picker;
2. Read the description and `action.sh` source, confirm that you trust the maintainer, then fill in the parameters;
3. Run it and inspect its output and final exit status;
4. Check the result as described by the script; save the log if it fails.

The repository classifies these entries as `kind: script` and verifies download size and SHA-256. Preparation verifies the content and module ID again. A local ZIP has no expected repository hash. Download it from the maintainer's official channel and compare its checksum when one is provided. Scripts do not count as installed modules or pending module updates. The manager records the latest run's version, time and exit code.

Run the script directly; module installation is unnecessary. Use the local “Install as module anyway” option only when you want ordinary module installation.

## ZIP format

Place these files directly at the ZIP root, without a wrapper directory:

```text
example-script.zip
├── module.prop
├── action.sh
└── params.json       # optional
```

```properties
id=example.report
name=Example report
version=1.0
versionCode=1
author=Example author
description=Print a device property once
oneshot=true
```

`oneshot=1` is also accepted; `true` is case-insensitive. IDs must be 2–64 characters, begin with an ASCII letter, and otherwise contain only letters, digits, dots, underscores or hyphens. `action.sh` must be a regular file.

The runner allows at most 64 MiB of extracted content and 4096 entries. `module.prop` and `params.json` are each limited to 64 KiB; a local ZIP itself is limited to 80 MiB. Absolute paths, `..`, duplicate paths, symlinks and special files are rejected. After validation, the script runs as root and can modify the system.

## Parameter forms

`params.json` uses `schemaVersion: 1` and allows at most 16 parameters:

```json
{
  "schemaVersion": 1,
  "params": [
    {
      "key": "DETAILS",
      "type": "bool",
      "label": "Include kernel version",
      "default": false
    },
    {
      "key": "MODE",
      "type": "enum",
      "label": "Report mode",
      "default": "brief",
      "options": [
        { "value": "brief", "label": "Brief" },
        { "value": "full", "label": "Full" }
      ]
    }
  ]
}
```

| Type | Constraints | Value received by the script |
| --- | --- | --- |
| `bool` | Defaults to `false` | `true` / `false` |
| `enum` | 1–32 unique options; values are 1–64 letters, digits, dots, underscores or hyphens | Selected `value` |
| `string` | Optional `required`; `maxLength` defaults to 256 and accepts 1–1024; no NUL or newlines | Original string |
| `int` | Signed 32-bit integer; optional `min` / `max` | Canonical decimal integer |

Each parameter requires `key`, `type` and `label`, with optional `description` and a correctly typed `default`. Keys must match `[A-Z][A-Z0-9_]{0,31}` and be unique. Values arrive as `KSU_PARAM_<KEY>`. Without a default, an enum uses its first option and an integer uses `min`, or 0 when no minimum exists. Trimmed labels and descriptions must contain 1–200 characters.

## Execution environment

Each run uses a fresh root shell in the global mount namespace and the BusyBox `sh` supplied with the manager. Its working directory and `MODPATH` are the temporary extraction directory. Standard input is `/dev/null`; collect input through the parameter form instead of interactive `read` commands.

The runner supplies `ASH_STANDALONE=1`, `KSU=true`, `KSU_VER`, `KSU_VER_CODE`, `KSU_KERNEL_VER_CODE`, `KSU_MODULE`, `KSU_ONESHOT=1`, `MODPATH` and declared `KSU_PARAM_*` variables, plus `KSU_LATE_LOAD=1` in late-load mode. Query any other module-specific values explicitly when needed.

```sh
#!/system/bin/sh
printf 'Model: %s\n' "$(getprop ro.product.model)"
if [ "$KSU_PARAM_DETAILS" = true ]; then
  uname -r
fi
exit 0
```

The manager quotes environment values, but the script must still quote its own variables and avoid `eval` on user input. The source preview displays at most 256 Ki characters and marks truncation. Review additional binaries and called scripts separately.

| Exit code | Manager result |
| --- | --- |
| `0` | Success |
| `2` | Not applicable to this device |
| Other | Failure |

After execution, the manager removes the extraction directory and records the exit code. Running scripts continue after you leave the page. Store durable data in a persistent directory managed by the script. After running, inspect the target configuration or files as described by the script.

Source references: [package validation](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptPackage.kt), [parameter schema](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptParams.kt), [execution environment](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptCommand.kt), [run lifecycle](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/viewmodel/ScriptRunViewModel.kt).
