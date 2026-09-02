---
permalink: /yukizygisk/native-zn/
title: Native ZN API
---

# Native ZN API

Native ZN 用来把原生库加载进指定可执行进程。它不依赖 Zygote specialize，也不使用普通 `zygisk.hpp` 的 `ModuleBase`；模块入口、目标清单与 companion 都由 [`zygisk_next_api.h`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/zygisk/include/zygisk_next_api.h) 定义。

::: warning 面向原生模块开发者
这是进程级 Root 注入接口。错误的目标、ABI、inline hook 或符号假设会直接让目标/系统服务崩溃；Native 目标崩溃本身不会增加 Zygote restart 计数，只有故障连带造成 Zygote 重启时才可能触发 YukiZygisk 注入安全模式。先在可恢复设备和单一模块环境中验证。
:::

## 与普通 Zygisk 模块的区别

| | 普通 Zygisk | Native ZN |
| --- | --- | --- |
| 发现方式 | `zygisk/<abi>.so` | `zn_modules.txt` |
| 目标 | Zygote 派生的 app/system_server | 匹配名称或路径的原生可执行进程 |
| 入口 | `zygisk_module_entry` | 全局 `zn_module` 结构 |
| 当前 API | `zygisk.hpp` v5，core 接受 v1–v5 | native API v4，core 接受 v3/v4 |
| 主回调 | pre/post specialize | `onModuleLoaded` |
| Companion | `zygisk_companion_entry` | 全局 `zn_companion_module` 结构 + 清单 `companion` |

一个普通模块可以同时提供两类库，但 YukiZygisk 会沿两套路径分别扫描和报告。

## `zn_modules.txt`

文件位于普通模块根目录，每个非空、非注释行声明一个目标与一个库：

```text
# 按 exec 文件 basename 精确匹配
name=logd lib/arm64-v8a/libexample.so

# 按 exec 路径精确匹配，并启用 Root companion
path=/system/bin/audioserver lib/arm64-v8a/libexample_audio.so companion
```

语法为：

```text
name=<basename> <library> [companion]
path=<absolute-exec-path> <library> [companion]
```

- `name=` 比较 exec 文件的 basename，`path=` 比较完整 exec 路径；二者都是精确匹配；
- 库路径相对时以 `/data/adb/modules/<目录 ID>/` 为基准，也接受绝对路径；
- `$moduleId` 与 `${moduleId}` 会替换成模块目录 ID；
- 引用文件必须存在，且 ELF class 必须是 32 位或 64 位 little-endian；
- 同一个目标要覆盖两种 ABI 时，应分别提供指向 ARM64/ARM32 ELF 的行；
- 模块有 `disable` 或 `remove` 时，清单不会进入活动库存。

优先使用模块内相对路径，避免把生命周期绑到另一个可变目录。Native ZN 不会向已经运行的 PID 动态 `dlopen`；它匹配的是新的 exec。

正常 `post-fs-data` 后登记的 live 目标只在受支持的 init-child exec 路径注入，不是任意进程注入器。

## 当前启动与 early 快照

部分原生服务早于 `post-fs-data` 启动，来不及等待 `zygiskd` 扫描。YukiSU 为此在 pre-init 存储区生成 `native_snapshot.bin`：

1. 安装、更新、启用、禁用或卸载普通模块时，`ksud` 刷新快照；
2. 快照复制专用 loader/core 与符合条件的 ZN 库，并记录 linker offsets、目标和 ELF ABI；
3. 下一次 LKM 初始化时，内核读取快照以匹配 early exec；
4. `post-fs-data` 后 daemon 再建立 live 模块库存与运行报告。

快照只收录**没有 `companion`** 的有效条目；需要 companion 的模块必须等 `zygiskd` 可用。快照缺失、格式/版本不符、记录的 linker 大小与当前文件不符，或生成时拿不到必需符号 offsets 时，early Native 会对本次启动关闭，而不是盲目使用旧数据。

因此：

- 刷新快照成功只代表“下次启动材料已准备”，不代表当前进程已注入；
- 更新模块后必须重启，才能验证 early 目标；
- 禁用/卸载模块也不会从现有进程抽出已经加载的库；
- YukiZygisk 安全模式激活后，后续 Native 目标与 Zygote 一并跳过。

## v4 模块入口

当前头文件声明：

```c
#define ZYGISK_NEXT_API_VERSION 4

struct ZygiskNextModule {
    int target_api_version;
    void (*onModuleLoaded)(void *self_handle,
                           const struct ZygiskNextAPI *api);
};
```

库必须导出可见的全局 `zn_module`。示意：

```c
#include "zygisk_next_api.h"

static void on_loaded(void *self_handle, const struct ZygiskNextAPI *api) {
    (void)self_handle;
    (void)api;
}

__attribute__((visibility("default")))
struct ZygiskNextModule zn_module = {
    .target_api_version = ZYGISK_NEXT_API_VERSION,
    .onModuleLoaded = on_loaded,
};
```

运行时兼容 v3 与 v4 入口；新模块应对当前 v4 头文件编译，并在使用 v4 新 slot 前检查自己实际拿到的接口与运行环境。

## `ZygiskNextAPI`

v4 函数表提供：

- `pltHook(base, symbol, handler, original)`；
- `inlineHook(target, handler, original)` 与 `inlineUnhook(target)`；
- `newSymbolResolver(path, base)` / `freeSymbolResolver(resolver)`；
- `getBaseAddress`、`symbolLookup`、`forEachSymbols`；
- `connectCompanion(self_handle)`；
- `getRuntime()`。

Hook API 使用 `ZN_SUCCESS`（0）/`ZN_FAILED`（1）。检查返回值、保存原函数、避免重复 hook，并让 hook 代码与库映射拥有相同或更长生命周期。resolver 必须配对释放；枚举符号的 callback 也不能保存短生命周期指针后继续使用。

## Native companion

需要 companion 时，清单行加 `companion`，库再以全局符号 `zn_companion_module` 导出：

```c
struct ZygiskNextCompanionModule {
    int target_api_version;
    void (*onCompanionLoaded)(void);
    void (*onModuleConnected)(int fd);
};
```

`connectCompanion(self_handle)` 只有在该条目声明 companion 且 daemon 能验证调用进程/模块/目标关系时才返回连接 fd。每次连接可在独立线程回调，模块必须处理并发、协议边界与 fd 关闭。

## API v4 的 HYOS runtime

`getRuntime()` 是 v4 新 slot。它并不保证任何进程都有额外 runtime：当前只在 AArch64 进程中检测到有效的 `/system_ext/bin/hyos_spawner` Rust runtime 映射时返回非空描述符，否则返回 `NULL`。

返回值需要同时检查：

```c
runtime->type == ZN_RUNTIME_HYOS
runtime->api_version == ZYGISK_NEXT_HYOS_API_VERSION  /* 当前为 1 */
```

HYOS runtime v1 允许模块在 `onModuleLoaded` 期间通过 `registerModule` 登记 `ZygiskNextHyosModule`，其 `onAppSpecialized` 接收：

- `process_name`；
- `package_name`；
- `se_info`。

登记窗口在 Native 模块加载阶段结束后关闭。YukiZygisk 为 HYOS spawner 安装 `fork` 与 `selinux_android_setcontext` bridge；只有 bridge、控制会话和已登记回调都成功时才报告完成。非 HyperOS、32 位进程、映射签名不符或 `getRuntime()==NULL` 都应当是模块的正常降级分支，不是强行解引用的异常。

## 状态验证

管理器按“模块目录 ID + `name/path` 类型 + 目标值”显示 Native 模块；按进程视图再用原始 PID 与 exec 字符串分组。状态含义：

- `unknown`：已配置但目标没出现，或只有检测/重定向、没有明确模块结果；
- `injected`：该模块对该目标有正向完成报告；目标后来正常退出仍保留此汇总结论；
- `failed`：存在明确失败报告，或基础注入完成但该应匹配模块没有完成；
- `crashed`：该代际被标成 `SAFEMODE` 并跳过；这是 UI 状态名，不证明 Native 目标自己发生了崩溃。

“库文件存在”与“目标被检测”都不能替代 `injected`；`injected` 也不能替代模块最终功能验证。报告问题时附 `zn_modules.txt`、ELF ABI/动态依赖、目标实际 exec 路径、状态页原始目标以及完整 `yukizygisk.tar.gz`。
