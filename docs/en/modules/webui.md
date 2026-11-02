---
permalink: /en/modules/webui/
title: WebUI development
---

# WebUI development

Place `index.html`, CSS and JavaScript under the module's `webroot/` to open a WebUI from the manager. Use it for interactive configuration and manual operations. Put boot tasks in module lifecycle scripts. Root changes already made by the page remain after it closes.

A standalone configuration page needs no MetaModule. A mount backend is required only when the feature behind the page also depends on replacing files through `system/`.

## Two WebUI engines

The YukiSU manager includes KSU WebUI and WebUI X:

- in global automatic mode, a module that does not explicitly request WebUI X uses KSU WebUI;
- automatic mode selects WebUI X when the parsed module metadata resolves its engine to `wx`;
- the user can globally force WebUI X or KSU WebUI for every module.

Test modules without a WebUI X declaration in KSU WebUI. When using WebUI X-specific APIs, declare `wx` and list the required APIs in the module documentation. Test each supported engine separately.

YukiSU Release builds force WebView debugging off and do not package Eruda. Use Debug builds during development, then test with a Release build before publishing.

Declare the engine in `config.json` at the module root, or `config.mmrl.json` when the first file is absent:

```json
{ "webui-engine": "wx" }
```

The value may also be an object keyed by manager package name. The current manager uses `com.anatdx.yukisu`, falling back to the `en` key when unmatched. This setting does not belong in `module.prop`.

## Local resources and app icons

The KSU engine maps module files into a local resource handler at `https://mui.kernelsu.org/` and starts from `/index.html`. Load module resources from this address and run root commands through the JavaScript APIs below. Direct WebView file access remains disabled.

Load app icons through `ksu://icon/<packageName>`, for example `ksu://icon/com.android.settings`.

## `kernelsu` JavaScript API

KSU WebUI can use the `kernelsu` package published from the repository's `js/` directory:

```sh
yarn add kernelsu
```

The JS SDK in the v1.8.0 source is version `3.3.0` and includes `pm` and `io`. If your page bundles an older SDK, update its dependency and rebuild. Updating the manager APK does not rewrite JavaScript inside a module.

Public API:

- `exec(command, options)`: run a command string in a root shell and return `errno`, `stdout` and `stderr`;
- `spawn(command, args, options)`: start a root child process with stdout, stderr, exit and error events;
- `fullScreen(boolean)`: request fullscreen state;
- `enableEdgeToEdge(boolean)`: control safe-area layout;
- `toast(message)`: show an Android Toast;
- `moduleInfo()`: read the current module information string;
- `pm`: query packages across Android users, including work profiles;
- `io`: root file and stream operations;
- `exit()`: close the current WebUI Activity.

```js
import { spawn, toast } from 'kernelsu'

const child = spawn('id', [])
let output = ''

child.stdout.on('data', chunk => { output += chunk })
child.on('exit', code => {
  toast(code === 0 ? output : `id exited with ${code}`)
})
```

Use [`js/README.md`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/js/README.md) and [`js/index.d.ts`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/js/index.d.ts) as the maintained parameter and return-value contract.

## Packages across users

v1.8.0 provides `pm.support` and `pm.version`; the current interface version is `1`. The manager loads its package inventory before opening the page. `support` is evaluated when the JavaScript library loads, so import it after the host bridge is available. YukiSU exposes this bridge in both KSU WebUI and WebUI X.

```js
import { pm } from 'kernelsu'

if (!pm.support || pm.version < 1) {
  throw new Error('This WebUI requires the multi-user package API')
}

const names = pm.listPackages('user')
const records = pm.getPackagesInfo(names)
for (const record of records) {
  if ('error' in record) {
    console.warn(record.packageName, record.error)
    continue
  }
  console.log(record.packageName, record.userId, record.uid, record.appLabel)
}
```

`listPackages('user' | 'system' | 'all')` returns sorted, deduplicated package names. `getPackagesInfo(names)` returns a flat array: input package order first, then ascending UID for each package. A package installed for the owner and a work profile therefore produces two records. Use both package name and user ID when selecting the target; do not silently apply a choice to every user.

| Field | Meaning |
| --- | --- |
| `packageName`, `appLabel` | Package name and display label |
| `versionName`, `versionCode` | Version name (empty when unavailable) and numeric version code |
| `uid`, `userId` | Full Android UID and user ID (`uid / 100000`, integer division) |
| `isSystem` | Whether it is a system app |
| `error` | Returned with `packageName` when no accessible matching package exists |

`uid`, `userId` and `isSystem` can be `null` when application metadata is unavailable. The JS wrapper returns `[]` on a bridge or JSON error; an empty array is not a reliable success signal.

The top-level `listPackages` and `getPackagesInfo` APIs remain for compatibility but are deprecated. The old info API retains only one record per package name. New code should use `pm` to avoid losing work-profile or secondary-user entries.

## Root file API

v1.8.0 provides `io.support` and `io.version` (currently `1`) in both engines. Calls are synchronous and use the manager's root shell. These APIs can access paths outside the module directory; validate file names and keep operations within paths your module owns.

| API | Main operations and results |
| --- | --- |
| `io.File(path)` | Existence/type/permission checks, `mkdirs()`, `renameTo(path)`, `delete()`, `deleteRecursive()`, lengths and timestamps |
| `file.list()` / `file.listFiles()` | Child names / absolute child paths, both arrays of strings |
| `file.newInputStream()` / `file.newOutputStream(append)` | Open and return a stream handle, not a stream object |
| `io.FileInputStream()` | `open(path)`, `read(handle, maxBytes?)`, `available(handle)`, `close(handle)` |
| `io.FileOutputStream()` | `open(path, append?)`, `write(handle, base64)`, `writeByte(handle, byte)`, `flush(handle)`, `close(handle)` |
| `io.RandomAccessFile()` | `open(path, mode)`, `seek`, `readBytes`, `writeBase64`, typed reads/writes, length and close |

Input/output stream `open()` returns an empty string on failure. Input `read()` returns Base64, with an empty string for EOF **or an error**. `maxBytes` is specified in bytes, clamped from 1 byte to 64 KiB, and defaults to 8 KiB. Output `write`, `flush` and `close` return booleans; opening without `append=true` truncates the target immediately.

Output uses a 64 KiB buffer. A successful `write()` can mean the data only reached that buffer. **Check `flush()` and `close()` before reporting success.** These calls wait for the underlying root write commands; they do not promise power-loss durability through `fsync`. For configuration changes, write a temporary file in the same directory, close it successfully, then rename it over the target:

```js
import { io, moduleInfo } from 'kernelsu'

if (!io.support || io.version < 1) throw new Error('Root file API unavailable')
const { moduleDir } = JSON.parse(moduleInfo())
const target = `${moduleDir}/report.txt`
const temporary = `${target}.tmp`
const bytes = new TextEncoder().encode('Report ready\n')
const base64 = btoa(String.fromCharCode(...bytes))
const output = io.FileOutputStream()
let handle = output.open(temporary)
if (!handle) throw new Error('Cannot open temporary file')
try {
  if (!output.write(handle, base64) || !output.flush(handle)) {
    throw new Error('Write failed')
  }
  const closed = output.close(handle)
  handle = ''
  if (!closed) throw new Error('Close failed')
  if (!io.File(temporary).renameTo(target)) throw new Error('Rename failed')
} finally {
  if (handle) output.close(handle)
}
```

This small-file example encodes UTF-8 bytes before Base64. Do not pass arbitrary Unicode text directly to `btoa`; split large data into chunks. For settings that should survive module updates, prefer [module configuration](/en/modules/module-config/).

Each WebUI file session allows at most 50 input/output streams combined and 30 random-access handles. Close handles in `finally`; destroying the bridge also closes them, but does not give your page a chance to handle close failures. Random-access typed writes return no success flag, and several reads return a default value on failure. Use ordinary output streams when the UI needs an explicit write result. Keep JavaScript's integer precision limit in mind for `readLong()` and large offsets. Full method signatures are in `js/index.d.ts` linked above.

## Insets and theme colors

The KSU engine provides local CSS resources:

```html
<link rel="stylesheet" href="/internal/insets.css">
<link rel="stylesheet" href="/internal/colors.css">
```

Requesting `insets.css` automatically enables edge-to-edge. Use `--safe-area-inset-top`, `--safe-area-inset-bottom`, `--safe-area-inset-left` and `--safe-area-inset-right` to leave room for system bars. `colors.css` provides theme variables such as `--primary`, `--background` and `--onBackground`. These routes belong to the KSU engine; handle styling separately when supporting other hosts.

```css
body {
  padding-top: var(--safe-area-inset-top, 0px);
  padding-bottom: var(--safe-area-inset-bottom, 0px);
  background: var(--background, #fff);
  color: var(--onBackground, #111);
}
```

## Running root commands safely

`exec` accepts a shell command string. This is command injection:

```js
await exec(`setprop persist.example.mode ${new URL(location.href).searchParams.get('mode')}`)
```

**Both `exec` and `spawn` execute shell text.** `spawn` joins `command` and `args`, and both APIs concatenate `cwd` and `env`. Validate each dynamic value, then quote it for the shell. Replacing `exec` with `spawn` does not remove injection.

Treat values from URLs, forms, configuration files and network responses as external input. Remote scripts and iframes loaded by the page can also call the root bridge. Load only code you control and have reviewed.

During development:

1. do not load executable code from a mutable remote URL;
2. do not concatenate unvalidated values into `exec`;
3. show the final target and require confirmation for dangerous operations;
4. handle failure explicitly for writes, flashing, deletion and service control;
5. keep secrets and complete sensitive configuration out of logs, Toasts and page content;
6. clean up temporary work on exit without killing a module's intended persistent service.

## Choosing WebUI, Action or Lua

- Use `action.sh` for a maintenance action in an installed module.
- Use a [one-shot script](/en/modules/one-shot/) for a standalone ZIP operation without module installation.
- Use WebUI for interactive configuration and immediate results.
- Use [Lua plugins](/en/modules/plugin/) for `ksud` lifecycle stages or managed periodic callbacks.
- System-file replacement still requires an ordinary module and a [built-in or external mount backend](/en/modules/magic-mount/) in addition to any UI or logic.
- Code that must enter Zygote or a selected native process belongs in an [ordinary Zygisk module](/en/yukizygisk/modules/) or the [Native ZN API](/en/yukizygisk/native-zn/), not WebUI.

Bridge implementation: [WebViewInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/WebViewInterface.kt), [ModuleConfig.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/ModuleConfig.kt), [local resource handler](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/SuFilePathHandler.kt).

Package and file interfaces: [KsuPm.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/pm/KsuPm.kt), [KsuIO.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/KsuIO.kt), [FileInputStreamInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/FileInputStreamInterface.kt), [FileOutputStreamInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/FileOutputStreamInterface.kt), [RootFileOutputStream.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/RootFileOutputStream.kt).
