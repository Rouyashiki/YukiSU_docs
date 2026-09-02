---
permalink: /en/modules/plugin/
title: Lua plugins
---

# Lua plugins

The Lua plugin system is now merged into YukiSU `main`; it is no longer a development-branch placeholder. The current `ksud` embeds Lua 5.5.1, while the manager provides installed-plugin listing, local ZIP installation, repository browsing, enable/disable controls, configuration, quick actions and logs.

::: warning Privileged code
Plugin callbacks run from `ksud` as root. Resource limits, ZIP path validation and isolated workers contain some failures, but they are not a permission sandbox. Review a plugin like a native root program, not like an ordinary webpage script.
:::

## Different from modules and WebUI

| Type | Installed at | Entry | Main activation |
| --- | --- | --- | --- |
| Ordinary module | `/data/adb/modules/<id>/` | Shell scripts, file trees and native libraries | Boot stages, Action and process creation |
| Module WebUI | `webroot/` inside an ordinary module | `index.html` | When the user opens it |
| Lua plugin | `/data/adb/plugins/<id>/` | Lua file selected by `plugin.json` | `ksud` lifecycle callback or manual operation |

Lua plugins do not pass through MetaModule. A `.so` inside a plugin is not a Native ZN module and does not use `zn_modules.txt`. Lua C extensions are loaded by Lua `require`/`package.cpath` inside the plugin worker; Native ZN injects a different target process and has a separate ABI and lifecycle.

## Minimal package

The ZIP may contain `plugin.json` at its root or inside exactly one wrapper directory:

```text
example-plugin.zip
├── plugin.json
└── main.lua
```

```json
{
  "id": "example.plugin",
  "name": "Example plugin",
  "version": "1.0.0",
  "author": "Example author",
  "description": "A minimal lifecycle plugin",
  "entry": "main.lua",
  "callbacks": ["post_fs_data", "post_mount", "service", "boot_completed", "action"]
}
```

`id` is required and may contain letters, digits, dots, underscores and hyphens. `entry` defaults to `main.lua` and currently accepts only a safe single filename. The entry script must return a table:

```lua
return {
  post_mount = function()
    info("mounted stage reached")
  end,

  action = function()
    local result = exec("/system/bin/id")
    info(result.stdout)
  end,
}
```

`callbacks` is manifest/UI metadata; it does not register functions with the runtime. Stage dispatch still looks for a real function of that name in the table returned by the entry. Declaring `action` or `has_action=true` without returning an `action` function therefore produces a failed click.

Every callback creates a memory-limited Lua state, loads the entry and looks up the requested function again. Do not rely on Lua globals persisting across callbacks; store durable state in plugin configuration or an explicit data file.

## `plugin.json` fields

In addition to name, version, author, description, license and entry metadata, the current manifest supports:

- `min_version`: minimum `ksud` version code;
- `depends`: plugin ID array; dependencies must be installed and enabled and execute in topological order;
- `descriptions`: localized descriptions keyed by language tag;
- `callbacks` and `has_action`: action metadata used by the manager;
- `quick_action`: a callback name or an object containing `function`, `label` and `labels`;
- `config`: manager-rendered fields of type `text`, `number`, `bool` or `select`.

Installation and state changes validate dependencies. `ksud` refuses to disable or uninstall a plugin while another enabled plugin depends on it, and dependency cycles never enter the execution queue.

## Lifecycle and reboot boundaries

| Callback | Source | Current behavior |
| --- | --- | --- |
| `post_fs_data` | Normal `post-fs-data` | After ordinary early scripts; blocking, 120-second limit per run |
| `post_mount` | Normal `post-mount` | After ordinary module scripts; blocking, 120-second limit per run |
| `service` | Service stage | Detached background worker |
| `boot_completed` | Boot-completed stage | Detached background worker |
| `action` or another manual callback | Manager/`ksud plugin run` | Blocking, 300-second limit per run |
| `main` | Automatically detected at service stage | Starts as a managed daemon callback at a one-second interval |

`start_daemon("callback", seconds)` starts another managed periodic callback. Disabling or uninstalling a plugin stops daemons owned by that plugin; do not replace this with an untracked background process that cannot be attributed or reaped.

Installing or updating the plugin directory itself needs no reboot. Updates preserve `config.json`, `last_output.log` and the disable marker. Boot callbacks that have already passed are not replayed, however, so verify `post_fs_data` and `post_mount` on the next normal boot.

The current late-load path does not replay Lua plugin `post_fs_data` or `post_mount`. Later `service` and `boot_completed` callbacks are still dispatched. A feature requiring real early boot cannot treat late-load as an equivalent event.

System safe mode skips plugin callbacks but does not write persistent `disable` markers under `/data/adb/plugins/`. This differs from how ordinary modules are disabled.

## Current Lua API

The entry can call these globals directly:

| API | Behavior |
| --- | --- |
| `info(message)`, `warn(message)` | Append to the plugin log |
| `getprop(name)`, `setprop(name, value)` | Read a property or set it through the built-in `resetprop` path |
| `exec(program, arg1, ...)` | Direct `execvp` argv call returning `ok`, `code`, `stdout`, `stderr` |
| `read_file(path)`, `write_file(path, content)` | Read or overwrite a file |
| `sysctl(key, value)` | Validate a dotted key, map it under `/proc/sys/`, then write it |
| `chmod(path, mode)`, `mkdir(path, recursive)`, `rm(path)` | Basic file operations; `rm` removes one file or empty directory only |
| `list_dir(path)`, `file_exists(path)` | Directory listing and existence check |
| `get_config(key)`, `set_config(key, value)` | Read or save this plugin's string configuration |
| `json_decode(text)`, `json_encode(value)` | Convert between JSON and Lua values |
| `start_daemon(callback, interval)` | Start a periodic callback managed by `ksud` |

The runtime also exposes:

- `PLUGIN_ID`: plugin ID;
- `PLUGIN_DIR`: active plugin directory, suitable for configuration and data;
- `PLUGIN_CODE_DIR`: locked code snapshot for this run, suitable for `require` and read-only assets.

`exec` does **not** invoke a shell: every value is a separate program argument. This avoids shell concatenation by default, but a plugin that explicitly runs `sh -c` owns all quoting and validation. The standard Lua libraries are also open, so the argument checks above must not be mistaken for privilege isolation.

Each Lua state is limited to 64 MiB. Command output, file reads and JSON input have separate limits. A timeout or size failure is recorded in `last_output.log`; limits do not make a dangerous operation trustworthy.

The source contract is defined by [`plugin.hpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/plugin.hpp), [`plugin.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/plugin.cpp) and [`lua_engine.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/lua_engine.cpp).

## Repositories and trust

The manager includes a non-removable but disableable **FolkPatch Plugin Mirror** source. Users can add custom sources, change priority and cache each catalog. Remote sources require HTTPS; HTTP is accepted only for loopback development.

Repository entries currently carry metadata and a download URL, not a publisher signature or a content hash bound to the catalog entry. HTTPS, ZIP size limits, path/symlink rejection and atomic directory replacement protect transport and installation mechanics, but do not prove the author's identity. Review the source, final download target and maintainer before installation.

The installer accepts root-level or one-wrapper archives and rejects encryption, unsupported ZIP entries, symlinks, duplicate/escaping paths and packages over its limits. An update waits for active callbacks to leave; it will not forcibly exchange a busy code tree.

## Troubleshooting order

1. Check that the manifest is valid, the plugin is enabled and dependencies have no error.
2. Distinguish a callback whose stage has not occurred from one that failed.
3. Read the plugin log instead of relying only on a quick-action toast.
4. For a long-running service, verify that its daemon is managed and stops on disable.
5. Do not expect `post_fs_data`/`post_mount` in late-load mode.
6. For Lua C extensions, separately verify the YukiSU device ABI and dynamic dependencies.
