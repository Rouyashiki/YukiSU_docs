---
permalink: /en/modules/webui/
title: WebUI development
---

# WebUI development

An ordinary module can expose a WebUI by placing `index.html`, CSS and JavaScript under `webroot/`. The WebUI is an interactive frontend, not a boot script: opening it does not replay `post-fs-data.sh`, and closing it does not undo root operations already launched by the page.

A standalone configuration page needs no MetaModule. A mount backend is required only when the feature behind the page also depends on replacing files through `system/`.

## Two WebUI engines

The YukiSU manager currently includes KSU WebUI and WebUI X:

- in global automatic mode, a module that does not explicitly request WebUI X uses the more compatible KSU WebUI path;
- automatic mode selects WebUI X when the parsed module metadata resolves its engine to `wx`;
- the user can globally force WebUI X or KSU WebUI for every module.

Developers must therefore test outside their own forced-engine setting. A module with no WebUI X declaration should at least work in KSU WebUI. A module that requests WebUI X must document the WebUI X APIs it needs rather than assuming that both bridges are identical.

YukiSU Release builds force WebView debugging off and do not package Eruda. Debugging and Eruda injection are available only in Debug builds and cannot be runtime requirements of a released module.

## KSU WebUI loading boundary

The KSU engine maps module files into a local resource handler at `https://mui.kernelsu.org/` and starts from `/index.html`. Direct Android WebView file access is disabled. This does not restrict the JavaScript bridge from launching root commands.

The engine also serves app icons through `ksu://icon/<packageName>`. This is a resource-request convention and grants no permission from the target app.

## `kernelsu` JavaScript API

KSU WebUI can use the `kernelsu` package published from the repository's `js/` directory:

```sh
yarn add kernelsu
```

The current public API is:

- `exec(command, options)`: run a command string in a root shell and return `errno`, `stdout` and `stderr`;
- `spawn(command, args, options)`: start a root child process with stdout, stderr, exit and error events;
- `fullScreen(boolean)`: request fullscreen state;
- `toast(message)`: show an Android Toast;
- `moduleInfo()`: read the current module information string.

```js
import { spawn, toast } from 'kernelsu'

const child = spawn('id', [])
let output = ''

child.stdout.on('data', chunk => { output += chunk })
child.on('exit', code => {
  toast(code === 0 ? output : `id exited with ${code}`)
})
```

Use [`js/README.md`](https://github.com/Rouyashiki/YukiSU/blob/main/js/README.md) and [`js/index.d.ts`](https://github.com/Rouyashiki/YukiSU/blob/main/js/index.d.ts) as the maintained parameter and return-value contract.

## The root bridge is not a web sandbox

`exec` accepts a shell command string. This is command injection:

```js
await exec(`setprop persist.example.mode ${new URL(location.href).searchParams.get('mode')}`)
```

Treat URL values, forms, module configuration, files and network responses as untrusted. Prefer a fixed executable with separated arguments instead of shell concatenation. When a shell is unavoidable, constrain allowed values and quote them correctly. A page being stored inside a module does not make every byte trustworthy: a remote script, iframe, mutable updater or modified module file receives the same root bridge.

At minimum:

1. do not load executable code from a mutable remote URL;
2. do not concatenate unvalidated values into `exec`;
3. show the final target and require confirmation for dangerous operations;
4. handle failure explicitly for writes, flashing, deletion and service control;
5. keep secrets and complete sensitive configuration out of logs, Toasts and page content;
6. clean up temporary work on exit without killing a module's intended persistent service.

## Choosing WebUI, Action or Lua

- Use `action.sh` for one fixed maintenance action.
- Use WebUI for interactive configuration and immediate results.
- Use [Lua plugins](/en/modules/plugin/) for `ksud` lifecycle stages or managed periodic callbacks.
- System-file replacement still requires an ordinary module and [MetaModule](/en/modules/meta-module/) in addition to any UI or logic.
- Code that must enter Zygote or a selected native process belongs in an [ordinary Zygisk module](/en/yukizygisk/modules/) or the [Native ZN API](/en/yukizygisk/native-zn/), not WebUI.
