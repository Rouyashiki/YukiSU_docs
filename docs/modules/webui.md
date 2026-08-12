---
permalink: /modules/webui/
title: WebUI 开发
---

# WebUI 开发

模块要在管理器里做一个设置页，可以直接使用 YukiSU 仓库 `js/` 目录发布的 `kernelsu` JavaScript 包：

```sh
yarn add kernelsu
```

## 目前能用的 API

- `exec(command, options)`：在 root shell 中执行命令，返回 `errno`、`stdout` 与 `stderr`
- `spawn(command, args, options)`：启动 root 子进程并提供 stdout/stderr/exit 事件
- `fullScreen(boolean)`：请求 WebView 进入或退出全屏
- `toast(message)`：显示 Android Toast
- `moduleInfo()`：读取当前模块信息

```js
import { exec, toast } from 'kernelsu'

const { errno, stdout, stderr } = await exec('id')
toast(errno === 0 ? stdout : stderr)
```

## 别把输入直接塞进 shell

`exec` 和 `spawn` 跑的是 **root shell**。URL 参数、表单输入、模块配置和远程返回值都不能未经处理就拼进命令，否则一个设置页就能变成 Root 命令注入入口。

WebUI 也不要随手加载远程脚本。网页更新方便是一回事，把 Root 执行权交给一个随时会变的 URL 是另一回事。

完整参数和返回值看仓库里的 [`js/README.md`](https://github.com/Anatdx/YukiSU/blob/main/js/README.md)，不要根据上面的短表猜接口。
