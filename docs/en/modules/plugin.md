---
permalink: /en/modules/plugin/
title: Lua plugins
---

# Lua plugins

Lua plugins run under `ksud` using embedded Lua 5.5.1. The manager provides installed-plugin listing, local ZIP installation, repository browsing, enable/disable controls, configuration, quick actions and logs.

::: warning Privileged code
Plugin callbacks run as root and can access system files and start processes. Install plugins only from trusted sources and read their source code first. Memory, time and ZIP limits do not restrict their root permissions.
:::

## Different from modules and WebUI

| Type | Installed at | Entry | Main activation |
| --- | --- | --- | --- |
| Ordinary module | `/data/adb/modules/<id>/` | Shell scripts, file trees and native libraries | Boot stages, Action and process creation |
| One-shot script | Temporary manager extraction directory | `action.sh` and optional parameter form | One manual run, followed by cleanup |
| Module WebUI | `webroot/` inside an ordinary module | `index.html` | When the user opens it |
| Lua plugin | `/data/adb/plugins/<id>/` | Lua file selected by `plugin.json` | `ksud` lifecycle callback or manual operation |

`ksud` runs Lua plugins directly, without MetaModule. Lua C extensions load into the plugin worker through `require`/`package.cpath`. To inject code into another native process, use [Native ZN](/en/yukizygisk/native-zn/).

For a single ZIP operation without a persistent plugin, use a [one-shot script](/en/modules/one-shot/). Immediate plugin-directory updates are separate from ordinary modules' [hot-install protocol](/en/modules/hot-install/).

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
  "callbacks": ["post_mount", "action"]
}
```

`id` is required and may contain letters, digits, dots, underscores and hyphens. `entry` defaults to `main.lua` and accepts a single filename, not a directory path. The entry script must return a table:

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

After declaring a callback in `callbacks`, implement the matching function in the table returned by the entry script. `has_action=true` also requires an `action` function; otherwise clicking the action returns an error.

Each callback creates a new Lua state and reloads the entry. Store state shared across callbacks in plugin configuration or a data file; Lua globals do not persist.

## `plugin.json` fields

In addition to name, version, author, description, license and entry metadata, the manifest supports:

- `min_version`: minimum `ksud` version code;
- `depends`: plugin ID array; dependencies must be installed and enabled and execute in topological order;
- `descriptions`: localized descriptions keyed by language tag;
- `callbacks` and `has_action`: action metadata used by the manager;
- `quick_action`: a callback name or an object containing `function`, `label` and `labels`;
- `config`: manager-rendered fields of type `text`, `number`, `bool` or `select`.

Installation and state changes validate dependencies. `ksud` refuses to disable or uninstall a plugin while another enabled plugin depends on it, and dependency cycles never enter the execution queue.

## Lifecycle and reboots

| Callback | Source | Execution |
| --- | --- | --- |
| `post_fs_data` | Normal `post-fs-data` | After ordinary early scripts; blocking, 120-second limit per run |
| `post_mount` | Normal `post-mount` | After ordinary module scripts; blocking, 120-second limit per run |
| `service` | Service stage | Detached background worker |
| `boot_completed` | Boot-completed stage | Detached background worker |
| `action` or another manual callback | Manager/`ksud plugin run` | Blocking, 300-second limit per run |
| `main` | Automatically detected at service stage | Starts as a managed daemon callback at a one-second interval |

Use `start_daemon("callback", seconds)` for periodic tasks. `ksud` manages the task and stops it when the plugin is disabled or uninstalled.

Installing or updating the plugin directory itself needs no reboot. Updates preserve `config.json`, `last_output.log` and the disable marker. Installation does not replay completed boot stages. Fully reboot after updating callbacks such as `post_fs_data` or `post_mount`. An eligible [emulated soft reboot](/en/manager/soft-reboot/) also dispatches these stages again; make callbacks repeatable to avoid duplicate services or rules.

Late-load dispatches later `service` and `boot_completed` callbacks without replaying `post_fs_data` or `post_mount`. Use normal boot loading for plugins that need early callbacks.

System safe mode skips plugin callbacks but does not write persistent `disable` markers under `/data/adb/plugins/`. This differs from how ordinary modules are disabled.

## Lua API

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

`exec` does **not** invoke a shell: every value is a separate program argument. If you use `sh -c`, validate and quote all dynamic values. The standard Lua libraries are available and also run with root privileges.

Each Lua state is limited to 64 MiB. Command output, file reads and JSON input have separate limits. Timeout and size failures are recorded in `last_output.log`.

The source contract is defined by [`plugin.hpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.hpp), [`plugin.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.cpp) and [`lua_engine.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/lua_engine.cpp).

## Plugin repositories

The manager includes a non-removable but disableable **FolkPatch Plugin Mirror** source. Users can add custom sources, change priority and cache each catalog. Remote sources require HTTPS; HTTP is accepted only for loopback development.

Repository entries contain plugin metadata and a download URL. They include neither a publisher signature nor a bound content hash. Inspect the final download URL and source code before installing, and use a maintainer you trust.

The installer accepts root-level or one-wrapper archives and rejects encryption, unsupported ZIP entries, symlinks, duplicate/escaping paths and packages over its limits. An update waits for active callbacks to leave; it will not forcibly exchange a busy code tree.

## Troubleshooting order

1. Enable the plugin and resolve manifest or dependency errors shown on its card.
2. Fully reboot after updating boot callbacks; run manual callbacks through their action button.
3. Open the plugin log and inspect exit codes, timeouts and loading errors.
4. Use managed daemons for periodic tasks and test that disabling the plugin stops them.
5. Switch to normal boot loading when late-load is missing a required early callback.
6. For Lua C extension load failures, check the device ABI and dynamic dependencies.
