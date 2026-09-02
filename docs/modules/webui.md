---
permalink: /modules/webui/
title: WebUI 开发
---

# WebUI 开发

普通模块在 `webroot/` 中提供 `index.html`、CSS 与 JavaScript 后，管理器可以把它作为 WebUI 打开。WebUI 是模块的交互前端，不是启动脚本：打开页面不会补跑 `post-fs-data.sh`，关闭页面也不会撤销页面执行过的 Root 操作。

一个只读配置页不需要 MetaModule；只有页面背后的功能依赖 `system/` 文件替换时，才另外依赖挂载后端。

## 两个 WebUI 引擎

YukiSU 管理器当前包含 KSU WebUI 与 WebUI X 两个引擎：

- 全局设为“自动选择”时，未明确请求 WebUI X 的模块使用兼容性更稳妥的 KSU WebUI；
- 模块元数据解析为 `wx` 时，自动模式选择 WebUI X；
- 用户也可以在管理器设置中强制所有模块使用 WebUI X 或 KSU WebUI。

因此，开发者不能只在自己强制选择的引擎下测试。若模块没有声明 WebUI X 需求，应至少确保 KSU WebUI 正常；若声明了 WebUI X，则还要说明依赖的 WebUI X 接口，不能假设两套桥接完全相同。

YukiSU Release 构建会强制关闭 WebView 调试，也不会打包 Eruda。调试开关与 Eruda 注入只在 Debug 构建中有效，不能成为发布模块的运行依赖。

## KSU WebUI 的加载边界

KSU 引擎把模块文件映射到 `https://mui.kernelsu.org/` 的本地资源处理器，并从 `/index.html` 开始加载。Android WebView 的直接文件访问被关闭；这不妨碍 JavaScript 桥接以 Root 执行命令。

当前引擎还可以通过 `ksu://icon/<packageName>` 读取应用图标。这是资源请求约定，不会授予目标应用权限。

## `kernelsu` JavaScript API

KSU WebUI 可以使用仓库 `js/` 发布的 `kernelsu` 包：

```sh
yarn add kernelsu
```

当前公开 API 为：

- `exec(command, options)`：在 Root shell 中执行一个命令字符串，返回 `errno`、`stdout` 与 `stderr`；
- `spawn(command, args, options)`：启动 Root 子进程，提供 stdout、stderr、exit 与 error 事件；
- `fullScreen(boolean)`：请求进入或退出全屏；
- `toast(message)`：显示 Android Toast；
- `moduleInfo()`：读取当前模块信息字符串。

```js
import { spawn, toast } from 'kernelsu'

const child = spawn('id', [])
let output = ''

child.stdout.on('data', chunk => { output += chunk })
child.on('exit', code => {
  toast(code === 0 ? output : `id exited with ${code}`)
})
```

完整参数和返回值以 [`js/README.md`](https://github.com/Rouyashiki/YukiSU/blob/main/js/README.md) 与 [`js/index.d.ts`](https://github.com/Rouyashiki/YukiSU/blob/main/js/index.d.ts) 为准。

## Root 桥接不是网页沙箱

`exec` 接收的是 shell 命令字符串。下面这种写法存在命令注入：

```js
await exec(`setprop persist.example.mode ${new URL(location.href).searchParams.get('mode')}`)
```

URL、表单、模块配置、文件内容与网络响应都属于不可信输入。优先使用不经过 shell 拼接的固定程序与分离参数；确实需要 shell 时，要限制允许值并完成严格引用。不要把“页面来自模块目录”误认为“页面内容可信”：远程脚本、iframe、动态更新源或被篡改的模块文件都能取得同一 Root 桥接。

至少遵守这些边界：

1. 不从可变远程 URL 直接加载执行脚本；
2. 不把未经验证的值拼进 `exec`；
3. 危险操作显示最终目标并要求确认；
4. 给写文件、刷写、删除和服务控制设置明确失败处理；
5. 不在日志、Toast 或页面中泄露密钥与完整敏感配置；
6. 页面退出时清理自己启动的临时任务，但不要误杀模块的持久服务。

## 与 Action、Lua 插件的选择

- 只需一个固定的一次性维护动作：用 `action.sh`；
- 需要用户填写配置并即时查看结果：用 WebUI；
- 需要跟随 `ksud` 启动阶段或受托管周期运行：用 [Lua 插件](/modules/plugin/)；
- 需要修改系统文件：上述界面/逻辑之外，仍要普通模块与 [MetaModule](/modules/meta-module/)；
- 需要进入 Zygote 或指定原生进程：使用[普通 Zygisk 模块](/yukizygisk/modules/)或 [Native ZN API](/yukizygisk/native-zn/)，不是 WebUI。
