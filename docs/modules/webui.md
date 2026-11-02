---
permalink: /modules/webui/
title: WebUI 开发
---

# WebUI 开发

把 `index.html`、CSS 和 JavaScript 放进模块的 `webroot/`，即可从管理器打开 WebUI。页面用于交互配置和手动操作。启动任务放在模块生命周期脚本中；页面关闭时，已执行的 Root 修改会保留。

一个只读配置页不需要 MetaModule；只有页面背后的功能依赖 `system/` 文件替换时，才另外依赖挂载后端。

## 两个 WebUI 引擎

YukiSU 管理器包含 KSU WebUI 与 WebUI X 两个引擎：

- 全局设为“自动选择”时，未明确请求 WebUI X 的模块使用 KSU WebUI；
- 模块元数据解析为 `wx` 时，自动模式选择 WebUI X；
- 用户也可以在管理器设置中强制所有模块使用 WebUI X 或 KSU WebUI。

未声明 WebUI X 的模块应在 KSU WebUI 下测试。使用 WebUI X 专属接口时，声明 `wx` 并在模块说明中列出所需接口；两套引擎分别测试。

YukiSU Release 构建会强制关闭 WebView 调试，也不会打包 Eruda。调试时使用 Debug 构建，发布前再用 Release 构建测试。

模块根目录中的 `config.json`（不存在时再读 `config.mmrl.json`）可声明：

```json
{ "webui-engine": "wx" }
```

也支持以管理器包名为键的对象；当前管理器包名为 `com.anatdx.yukisu`，未匹配时读取 `en` 键。该配置不写在 `module.prop` 中。

## 本地资源与应用图标

KSU 引擎把模块文件映射到 `https://mui.kernelsu.org/` 的本地资源处理器，并从 `/index.html` 开始加载。页面通过此地址读取模块资源；Root 命令通过下文的 JavaScript API 执行。WebView 直接文件访问保持关闭。

应用图标使用 `ksu://icon/<packageName>`，例如 `ksu://icon/com.android.settings`。

## `kernelsu` JavaScript API

KSU WebUI 可以使用仓库 `js/` 发布的 `kernelsu` 包：

```sh
yarn add kernelsu
```

v1.8.0 源码中的 JS SDK 版本为 `3.3.0`，包含下文的 `pm` 和 `io`。页面若已打包旧 SDK，需要更新前端依赖并重新构建；升级管理器 APK 不会改写模块内的 JavaScript。

公开 API：

- `exec(command, options)`：在 Root shell 中执行一个命令字符串，返回 `errno`、`stdout` 与 `stderr`；
- `spawn(command, args, options)`：启动 Root 子进程，提供 stdout、stderr、exit 与 error 事件；
- `fullScreen(boolean)`：请求进入或退出全屏；
- `enableEdgeToEdge(boolean)`：控制安全区布局；
- `toast(message)`：显示 Android Toast；
- `moduleInfo()`：读取当前模块信息字符串；
- `pm`：跨 Android 用户查询应用，包括工作资料；
- `io`：以 Root 操作文件与数据流；
- `exit()`：关闭当前 WebUI Activity。

```js
import { spawn, toast } from 'kernelsu'

const child = spawn('id', [])
let output = ''

child.stdout.on('data', chunk => { output += chunk })
child.on('exit', code => {
  toast(code === 0 ? output : `id exited with ${code}`)
})
```

完整参数和返回值以 [`js/README.md`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/js/README.md) 与 [`js/index.d.ts`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/js/index.d.ts) 为准。

## 多用户应用查询

v1.8.0 提供 `pm.support` 与 `pm.version`，当前接口版本为 `1`。管理器在打开页面前加载应用清单。`support` 在 JavaScript 库加载时计算，需在宿主桥接就绪后导入。YukiSU 的 KSU WebUI 和 WebUI X 都提供该桥接。

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

`listPackages('user' | 'system' | 'all')` 返回排序、去重后的包名。`getPackagesInfo(names)` 返回平铺数组：先按输入包名顺序，同一包名再按 UID 升序。同一个应用同时装在主用户和工作资料中时会返回两条记录。选择操作目标时同时保存包名与用户 ID，不要把一次选择默认应用到所有用户。

| 字段 | 含义 |
| --- | --- |
| `packageName`、`appLabel` | 包名与显示名称 |
| `versionName`、`versionCode` | 版本名（缺失时为空字符串）与数字版本号 |
| `uid`、`userId` | 完整 Android UID 与用户 ID（`uid / 100000` 取整数） |
| `isSystem` | 是否为系统应用 |
| `error` | 没有可访问的匹配应用时，与 `packageName` 一起返回 |

应用元数据不可用时，`uid`、`userId`、`isSystem` 可以是 `null`。JS 包装层遇到桥接或 JSON 错误会返回 `[]`；不能仅凭空数组判断查询成功。

顶层 `listPackages`、`getPackagesInfo` 保留兼容，但已弃用。旧信息接口每个包名只保留一条记录。新代码使用 `pm`，避免丢失工作资料和其他用户的安装记录。

## Root 文件 API

v1.8.0 两种引擎均提供 `io.support`、`io.version`，当前版本为 `1`。调用是同步的，使用管理器的 Root shell。这些接口可以访问模块目录以外的路径；校验文件名，并把操作限定在模块自己管理的路径内。

| API | 主要操作与返回值 |
| --- | --- |
| `io.File(path)` | 存在/类型/权限检查、`mkdirs()`、`renameTo(path)`、`delete()`、`deleteRecursive()`、长度与时间戳 |
| `file.list()` / `file.listFiles()` | 子项名称 / 子项绝对路径，均为字符串数组 |
| `file.newInputStream()` / `file.newOutputStream(append)` | 打开并返回流句柄，不是流对象 |
| `io.FileInputStream()` | `open(path)`、`read(handle, maxBytes?)`、`available(handle)`、`close(handle)` |
| `io.FileOutputStream()` | `open(path, append?)`、`write(handle, base64)`、`writeByte(handle, byte)`、`flush(handle)`、`close(handle)` |
| `io.RandomAccessFile()` | `open(path, mode)`、`seek`、`readBytes`、`writeBase64`、各类型读写、长度与关闭 |

输入/输出流的 `open()` 失败返回空字符串。输入流 `read()` 返回 Base64；空字符串既可能表示 EOF，也可能表示错误。`maxBytes` 按字节指定，范围为 1 字节至 64 KiB，默认每次读 8 KiB。输出流的 `write`、`flush`、`close` 返回布尔值；未传 `append=true` 时，打开文件就会清空原内容。

输出流有 64 KiB 缓冲，`write()` 成功时数据可能还只在缓冲区。**检查 `flush()` 和 `close()` 成功后再显示保存成功。**这两步等待底层 Root 写入命令结束，但不承诺 `fsync` 级别的断电持久性。更新配置文件时，先在同目录写临时文件，成功关闭后再改名覆盖：

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

上例只写小文件，先将文本编码为 UTF-8 字节再转 Base64。不要直接对任意中文文本调用 `btoa`；大文件分块处理。需要在模块更新后保留的设置，优先使用[模块配置](/modules/module-config/)。

每个 WebUI 文件会话最多同时打开 50 个输入/输出流、30 个随机访问句柄。在 `finally` 中主动关闭；桥接销毁也会清理，但页面无法再处理关闭失败。随机访问的各类写操作不返回成功标记，部分读取失败返回默认值；需要明确写入结果的界面使用普通输出流。`readLong()` 和大偏移量还需考虑 JavaScript 整数精度。完整方法签名见前文链接的 `js/index.d.ts`。

## 安全区与主题颜色

KSU 引擎提供本地 CSS 资源：

```html
<link rel="stylesheet" href="/internal/insets.css">
<link rel="stylesheet" href="/internal/colors.css">
```

请求 `insets.css` 会自动启用 edge-to-edge。使用 `--safe-area-inset-top`、`--safe-area-inset-bottom`、`--safe-area-inset-left`、`--safe-area-inset-right` 留出系统栏空间；`colors.css` 提供 `--primary`、`--background`、`--onBackground` 等主题变量。这些路由由 KSU 引擎提供；适配其他宿主时需单独处理样式。

```css
body {
  padding-top: var(--safe-area-inset-top, 0px);
  padding-bottom: var(--safe-area-inset-bottom, 0px);
  background: var(--background, #fff);
  color: var(--onBackground, #111);
}
```

## 安全执行 Root 命令

`exec` 接收的是 shell 命令字符串。下面这种写法存在命令注入：

```js
await exec(`setprop persist.example.mode ${new URL(location.href).searchParams.get('mode')}`)
```

**`exec` 和 `spawn` 都执行 shell 文本。**`spawn` 的 `command`、`args`，以及两者的 `cwd`、`env` 会参与命令拼接，动态值必须先校验，再按 shell 语法引用。将 `exec` 换成 `spawn` 不会消除注入。

URL、表单、配置文件和网络响应中的值都按外部输入处理。页面加载的远程脚本和 iframe 也能调用 Root 桥接，因此只加载你控制并审核过的代码。

开发时做到：

1. 不从可变远程 URL 直接加载执行脚本；
2. 不把未经验证的值拼进 `exec`；
3. 危险操作显示最终目标并要求确认；
4. 给写文件、刷写、删除和服务控制设置明确失败处理；
5. 不在日志、Toast 或页面中泄露密钥与完整敏感配置；
6. 页面退出时清理自己启动的临时任务，但不要误杀模块的持久服务。

## 与 Action、Lua 插件的选择

- 已安装模块只需一个维护动作：用 `action.sh`；
- 希望从 ZIP 独立运行、无需安装模块：用[一次性脚本](/modules/one-shot/)；
- 需要用户填写配置并即时查看结果：用 WebUI；
- 需要跟随 `ksud` 启动阶段或受托管周期运行：用 [Lua 插件](/modules/plugin/)；
- 需要修改系统文件：上述界面/逻辑之外，仍要普通模块与[内置或外部挂载后端](/modules/magic-mount/)；
- 需要进入 Zygote 或指定原生进程：使用[普通 Zygisk 模块](/yukizygisk/modules/)或 [Native ZN API](/yukizygisk/native-zn/)，不是 WebUI。

桥接行为依据：[WebViewInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/WebViewInterface.kt)、[ModuleConfig.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/ModuleConfig.kt)、[本地资源处理](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/SuFilePathHandler.kt)。

包与文件接口：[KsuPm.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/pm/KsuPm.kt), [KsuIO.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/KsuIO.kt), [FileInputStreamInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/FileInputStreamInterface.kt), [FileOutputStreamInterface.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/FileOutputStreamInterface.kt), [RootFileOutputStream.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/webui/file/RootFileOutputStream.kt).
