---
permalink: /en/modules/webui/
title: WebUI development
---

# WebUI development

Module WebUIs can use the `kernelsu` JavaScript package from the repository's `js/` directory.

```sh
yarn add kernelsu
```

## Public API

- `exec(command, options)`: run a root shell command and return `errno`, `stdout`, `stderr`
- `spawn(command, args, options)`: start a root child process with stream and exit events
- `fullScreen(boolean)`: request WebView fullscreen state
- `toast(message)`: show an Android Toast
- `moduleInfo()`: read information about the current module

```js
import { exec, toast } from 'kernelsu'

const { errno, stdout, stderr } = await exec('id')
toast(errno === 0 ? stdout : stderr)
```

`exec` and `spawn` run in a root shell. Never concatenate URL parameters, form input or remote content directly into commands, and do not load untrusted remote scripts.

See [`js/README.md`](https://github.com/Anatdx/YukiSU/blob/main/js/README.md) for the maintained API contract.
