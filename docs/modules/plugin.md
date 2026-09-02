---
permalink: /modules/plugin/
title: Lua 插件
---

# Lua 插件

Lua 插件系统已经合入 YukiSU `main`，不是只存在于开发分支的占位功能。当前 `ksud` 内嵌 Lua 5.5.1，管理器提供插件列表、本地 ZIP 安装、仓库浏览、启用/禁用、配置、快捷操作和日志界面。

::: warning 高权限代码
插件回调由 `ksud` 以 Root 权限执行。资源上限、ZIP 路径检查与独立 worker 能限制一部分故障，但它们不是权限沙箱。安装插件应按安装原生 Root 程序的标准审查，而不是按普通网页脚本对待。
:::

## 它和模块、WebUI 有什么不同

| 类型 | 安装位置 | 入口 | 主要时机 |
| --- | --- | --- | --- |
| 普通模块 | `/data/adb/modules/<id>/` | shell 脚本、文件树、原生库 | 启动阶段、Action、进程创建 |
| 模块 WebUI | 普通模块的 `webroot/` | `index.html` | 用户打开界面时 |
| Lua 插件 | `/data/adb/plugins/<id>/` | `plugin.json` 指定的 Lua 文件 | `ksud` 生命周期回调或手动操作 |

Lua 插件不经过 MetaModule，不会因为含 `.so` 就变成 Native ZN 模块，也不使用 `zn_modules.txt`。插件目录中的 Lua C 扩展由 Lua 的 `require`/`package.cpath` 在插件 worker 内加载；Native ZN 则注入另一个目标进程，二者 ABI 与生命周期完全不同。

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
  "callbacks": ["post_fs_data", "post_mount", "service", "boot_completed", "action"]
}
```

`id` 必须存在，且只能使用字母、数字、点、下划线和连字符。`entry` 默认为 `main.lua`，当前只接受安全的单个文件名。入口脚本必须返回一个 table：

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

`callbacks` 是清单/UI 元数据，不负责把函数注册进运行时。派发阶段仍以入口返回 table 中是否真的存在同名函数为准；只在清单里写 `action` 或 `has_action=true`，却没有返回 `action` 函数，点击后仍会失败。

插件每次回调都会重新建立受内存限制的 Lua state、加载入口并取出对应函数。不要依赖不同回调之间的 Lua 全局变量；持久状态写进插件配置或明确的数据文件。

## `plugin.json` 能声明什么

除基础名称、版本、作者、说明、许可证与入口外，当前清单还支持：

- `min_version`：最低 `ksud` version code；
- `depends`：插件 ID 数组；依赖必须已安装且启用，并按拓扑顺序执行；
- `descriptions`：按语言标签提供本地化说明；
- `callbacks` 与 `has_action`：让管理器识别可用动作；
- `quick_action`：一个回调名，或带 `function`、`label`、`labels` 的对象；
- `config`：由管理器呈现的 `text`、`number`、`bool` 或 `select` 字段。

安装、启用、禁用和卸载都会检查依赖。启用中的其他插件仍依赖某插件时，`ksud` 会拒绝禁用或卸载它；循环依赖也不会进入运行队列。

## 生命周期与是否需要重启

| 回调 | 来源 | 当前行为 |
| --- | --- | --- |
| `post_fs_data` | 正常 `post-fs-data` | 在普通模块早期脚本后执行，阻塞等待，单次上限 120 秒 |
| `post_mount` | 正常 `post-mount` | 在普通模块脚本后执行，阻塞等待，单次上限 120 秒 |
| `service` | service stage | 独立后台 worker |
| `boot_completed` | boot-completed stage | 独立后台 worker |
| `action` 或其他手动回调 | 管理器/`ksud plugin run` | 阻塞等待，单次上限 300 秒 |
| `main` | service stage 自动发现 | 以 1 秒间隔的托管 daemon 回调启动 |

`start_daemon("callback", seconds)` 可以启动另一个托管周期回调。禁用或卸载插件时，`ksud` 会停止属于该插件的 daemon；不要另行启动无法归属、无法回收的后台进程。

安装或更新插件目录本身不要求重启，更新时会保留 `config.json`、`last_output.log` 与禁用标记。但已经错过的启动回调不会补跑；要验证 `post_fs_data`/`post_mount`，仍应在下一次正常启动观察。

当前 late-load 流程不会重放 Lua 插件的 `post_fs_data` 与 `post_mount` 回调；后续的 `service` 和 `boot_completed` 仍会派发。需要真正 early-boot 时机的功能不能用 late-load 冒充。

系统安全模式会跳过插件回调，但不会给 `/data/adb/plugins/` 中的插件写入永久 `disable` 标记。它与普通模块的禁用状态不同。

## 当前 Lua API

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

`exec` **不经过 shell**，每个参数单独传给程序。这避免了默认的 shell 拼接，但如果插件显式执行 `sh -c`，转义责任仍完全由插件承担。Lua 标准库也已打开，不能把上表的参数检查误认为权限隔离。

每个 Lua state 最多使用 64 MiB；单次命令输出、文件读取和 JSON 输入等还有独立大小限制。超时或超限会失败并写入 `last_output.log`，不会使有风险的操作变得安全。

实现接口以 [`plugin.hpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/plugin.hpp)、[`plugin.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/plugin.cpp) 与 [`lua_engine.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/plugin/lua_engine.cpp) 为准。

## 插件仓库与信任边界

管理器内置一个不可删除、但可以停用的 **FolkPatch Plugin Mirror** 源；也可以添加自定义源、调整优先级并缓存各源目录。远程源要求 HTTPS，仅回环地址的开发测试允许 HTTP。

仓库索引只提供插件元数据与下载 URL，当前模型没有把发布者签名或内容哈希绑定到条目。HTTPS、ZIP 大小限制、拒绝路径穿越/符号链接与原子目录替换可以保护传输和安装过程，但不能证明插件作者是谁。安装前仍应检查源码、下载目标与维护者身份。

安装器允许根目录或单层包装目录，拒绝加密条目、不支持的 ZIP 条目、符号链接、重复/越界路径及超出限制的包。更新会等正在执行的回调退出；插件繁忙时不会强行替换代码树。

## 排查顺序

1. 在插件卡片确认清单有效、插件已启用、依赖无错误；
2. 区分“尚未到达回调时机”和“回调执行失败”；
3. 查看插件日志，而不是只看快捷操作提示；
4. 长期服务先确认 daemon 已被托管并能在禁用时停止；
5. late-load 环境不要期待 `post_fs_data`/`post_mount`；
6. 若插件带 Lua C 扩展，另外检查 YukiSU 设备 ABI 与动态依赖。
