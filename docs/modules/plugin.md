---
permalink: /modules/plugin/
title: Lua 插件
---

# Lua 插件

Lua 插件由 `ksud` 独立管理，使用内嵌的 Lua 5.5.1，管理器提供插件列表、本地 ZIP 安装、仓库浏览、启用/禁用、配置、快捷操作和日志界面。

::: warning 高权限代码
插件回调以 Root 执行，可以访问系统文件和启动进程。只安装可信来源的插件，并在安装前阅读源码。内存、时间和 ZIP 限制不会限制其 Root 权限。
:::

## 它和模块、WebUI 有什么不同

| 类型 | 安装位置 | 入口 | 主要时机 |
| --- | --- | --- | --- |
| 普通模块 | `/data/adb/modules/<id>/` | shell 脚本、文件树、原生库 | 启动阶段、Action、进程创建 |
| 一次性脚本 | 管理器临时解压目录 | `action.sh` 与可选参数表单 | 用户执行一次后清理 |
| 模块 WebUI | 普通模块的 `webroot/` | `index.html` | 用户打开界面时 |
| Lua 插件 | `/data/adb/plugins/<id>/` | `plugin.json` 指定的 Lua 文件 | `ksud` 生命周期回调或手动操作 |

Lua 插件由 `ksud` 直接执行，无需 MetaModule。Lua C 扩展通过 `require`/`package.cpath` 加载到插件 worker；要向其他原生进程注入代码，请使用 [Native ZN](/yukizygisk/native-zn/)。

不需要安装持久插件、只想从 ZIP 执行一次操作时，可以使用[一次性脚本](/modules/one-shot/)。Lua 插件安装即时更新目录，与普通模块的[热安装协议](/modules/hot-install/)无关。

## 最小插件包

ZIP 根目录可以直接放 `plugin.json`，也可以只有一层包装目录。一个最小包如下：

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

`id` 必须存在，且只能使用字母、数字、点、下划线和连字符。`entry` 默认为 `main.lua`，只接受单个文件名，不接受目录路径。入口脚本必须返回一个 table：

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

在 `callbacks` 声明回调后，还必须在入口返回的 table 中实现同名函数。`has_action=true` 也需要对应的 `action` 函数，否则点击操作会报错。

每次回调都会新建 Lua state 并重新加载入口。跨回调状态写进插件配置或数据文件，Lua 全局变量不会保留。

## `plugin.json` 能声明什么

除名称、版本、作者、说明、许可证与入口外，清单还支持：

- `min_version`：最低 `ksud` version code；
- `depends`：插件 ID 数组；依赖必须已安装且启用，并按拓扑顺序执行；
- `descriptions`：按语言标签提供本地化说明；
- `callbacks` 与 `has_action`：让管理器识别可用动作；
- `quick_action`：一个回调名，或带 `function`、`label`、`labels` 的对象；
- `config`：由管理器呈现的 `text`、`number`、`bool` 或 `select` 字段。

安装、启用、禁用和卸载都会检查依赖。启用中的其他插件仍依赖某插件时，`ksud` 会拒绝禁用或卸载它；循环依赖也不会进入运行队列。

## 生命周期与是否需要重启

| 回调 | 来源 | 执行方式 |
| --- | --- | --- |
| `post_fs_data` | 正常 `post-fs-data` | 在普通模块早期脚本后执行，阻塞等待，单次上限 120 秒 |
| `post_mount` | 正常 `post-mount` | 在普通模块脚本后执行，阻塞等待，单次上限 120 秒 |
| `service` | service stage | 独立后台 worker |
| `boot_completed` | boot-completed stage | 独立后台 worker |
| `action` 或其他手动回调 | 管理器/`ksud plugin run` | 阻塞等待，单次上限 300 秒 |
| `main` | service stage 自动发现 | 以 1 秒间隔的托管 daemon 回调启动 |

周期任务使用 `start_daemon("callback", seconds)`。`ksud` 会管理该任务，并在禁用或卸载插件时停止它。

安装或更新插件目录本身不要求重启，更新时会保留 `config.json`、`last_output.log` 与禁用标记。`post_fs_data`/`post_mount` 等已结束的启动阶段不因安装自动补跑，更新这类回调后完整重启。符合条件的[模拟软重启](/manager/soft-reboot/)也会重新派发这些阶段；回调应支持重复执行，避免留下重复服务或重复规则。

late-load 只派发后续的 `service` 和 `boot_completed`，不补跑 `post_fs_data` 与 `post_mount`。需要早期回调的插件使用正常开机加载。

系统安全模式会跳过插件回调，但不会给 `/data/adb/plugins/` 中的插件写入永久 `disable` 标记。它与普通模块的禁用状态不同。

## Lua API

入口可以直接使用这些全局函数：

| API | 行为 |
| --- | --- |
| `info(message)`、`warn(message)` | 写入插件日志 |
| `getprop(name)`、`setprop(name, value)` | 读取属性或通过内置 `resetprop` 路径设置属性 |
| `exec(program, arg1, ...)` | 直接 `execvp` 一个 argv，返回 `ok`、`code`、`stdout`、`stderr` |
| `read_file(path)`、`write_file(path, content)` | 读取/覆盖文件 |
| `sysctl(key, value)` | 将合法点分键映射到 `/proc/sys/` 后写入 |
| `chmod(path, mode)`、`mkdir(path, recursive)`、`rm(path)` | 基础文件操作；`rm` 只移除一个文件或空目录 |
| `list_dir(path)`、`file_exists(path)` | 枚举与存在性检查 |
| `get_config(key)`、`set_config(key, value)` | 读取或保存该插件的字符串配置 |
| `json_decode(text)`、`json_encode(value)` | JSON 与 Lua 值互转 |
| `start_daemon(callback, interval)` | 启动受 `ksud` 管理的周期回调 |

运行时还提供：

- `PLUGIN_ID`：插件 ID；
- `PLUGIN_DIR`：活动插件目录，适合配置与数据；
- `PLUGIN_CODE_DIR`：本次锁定的代码快照，适合 `require` 与只读资源。

`exec` **不经过 shell**，每个参数单独传给程序。需要使用 `sh -c` 时，由插件校验并引用所有动态参数。Lua 标准库已开放，调用它们同样使用 Root 权限。

每个 Lua state 最多使用 64 MiB；单次命令输出、文件读取和 JSON 输入等还有独立大小限制。超时或超限会失败，原因写入 `last_output.log`。

实现接口以 [`plugin.hpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.hpp)、[`plugin.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.cpp) 与 [`lua_engine.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/lua_engine.cpp) 为准。

## 插件仓库

管理器内置一个不可删除、但可以停用的 **FolkPatch Plugin Mirror** 源；也可以添加自定义源、调整优先级并缓存各源目录。远程源要求 HTTPS，仅回环地址的开发测试允许 HTTP。

仓库条目提供插件元数据和下载 URL，不提供发布者签名或绑定到条目的内容哈希。安装前检查最终下载地址和源码，确保来源是你信任的维护者。

安装器允许根目录或单层包装目录，拒绝加密条目、不支持的 ZIP 条目、符号链接、重复/越界路径及超出限制的包。更新会等正在执行的回调退出；插件繁忙时不会强行替换代码树。

## 排查顺序

1. 在插件卡片启用插件，并处理清单和依赖错误；
2. 启动回调更新后完整重启，手动回调直接点击操作；
3. 打开插件日志，查看返回码、超时或加载错误；
4. 周期任务使用托管 daemon，并测试禁用插件后是否停止；
5. late-load 缺少早期回调时，改用正常开机加载；
6. Lua C 扩展加载失败时，检查设备 ABI 和动态依赖。
