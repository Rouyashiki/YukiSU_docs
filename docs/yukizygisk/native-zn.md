---
permalink: /yukizygisk/native-zn/
title: Native ZN API
---

# Native ZN API

Native ZN 用来把原生库加载进指定可执行进程。它不依赖 Zygote specialize，也不使用普通 `zygisk.hpp` 的 `ModuleBase`；模块入口、目标清单与 companion 都由 [`zygisk_next_api.h`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/include/zygisk_next_api.h) 定义。

::: warning 面向原生模块开发者
Native ZN 在原生进程中运行模块代码。目标、ABI 或 hook 错误会造成目标或系统服务崩溃。先准备原厂启动镜像，并在可恢复设备上一次测试一个模块。Native 目标退出不会增加 Zygote restart 计数；只有连带发生的 Zygote 重启才计入注入安全模式阈值。
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

正常 `post-fs-data` 后登记的 live 目标只在受支持的 init-child exec 路径注入，目标必须通过这条 exec 路径启动。

## 当前启动与 early 快照

部分原生服务早于 `post-fs-data` 启动，来不及等待 `zygiskd` 扫描。需要同时开启 YukiZygisk 和“早加载原生模块”（`early_load`，**默认关闭**），YukiSU 才会在 pre-init 存储区生成 `native_snapshot.bin`。这与模块 `preinit.sh` 是不同机制：

1. 安装、更新、启用、禁用或卸载普通模块，以及 `yzctl reload` 时，`ksud` 刷新快照；未满足开关条件则清除旧快照；
2. 快照复制专用 loader/core 与符合条件的 ZN 库，并记录 linker offsets、目标和 ELF ABI；
3. 下一次 LKM 初始化时，内核读取快照以匹配 early exec；
4. `post-fs-data` 后 daemon 再建立 live 模块库存与运行报告。

快照只收录**没有 `companion`** 的有效条目；需要 companion 的模块必须等 `zygiskd` 可用。快照缺失、格式/版本不符、记录的 linker 大小与当前文件不符，或生成时拿不到必需符号 offsets 时，本次启动会关闭 early Native。检查诊断中的快照错误，确认 YukiZygisk 和 `early_load` 已开启，重新生成快照并重启。

更新与禁用时注意：

- 刷新快照后，重启才能让 early 目标使用新内容；
- 禁用/卸载模块也不会从现有进程抽出已经加载的库；
- YukiZygisk 安全模式激活后，后续 Native 目标与 Zygote 一并跳过。

## 加载器与进程退出

v1.8.0 的 Native 模块统一通过 Bionic `__loader_android_dlopen_ext` 加载，使用 `RTLD_NOW | RTLD_LOCAL` 与 `ANDROID_DLEXT_USE_LIBRARY_FD`。加载调用以经过身份校验的常驻 libc 为调用方，动态依赖由该系统 linker namespace 解析。YukiLinker 和匿名内存开关不改变 Native 模块的加载器，也不会匿名化其 Bionic 映射。

模块进入 `onModuleLoaded` 后，运行时将库句柄保留到进程退出，供后续回调和 `libdl` 调用使用。同一模块目录 ID 在一个进程中只初始化一次；同一文件身份或 Bionic 句柄被另一个模块 ID 复用时会拒绝重复初始化。模块更新、禁用或卸载后，重新启动目标；early 目标需要重新生成快照并完整重启。

加载失败时，在 core 日志中查找 `native caller` 和 `Bionic load failed`。日志会给出失败阶段 `linker`、`anchor`、`revalidate` 或 `load`；最后一类同时检查动态依赖、符号和 linker namespace 错误。

当前状态把注入结果与进程 `running` / `exited` / `unknown` 分开，并可关联内核退出历史和 tombstone。正常退出保留先前的注入成功状态。发生崩溃时，结合退出记录和 tombstone 的故障栈定位问题；Native 模块不适用普通 Zygisk 的自动崩溃隔离。

## v4 模块入口

模块结构如下：

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

运行时兼容 v3 与 v4 入口。新模块应使用 v4 头文件，并将 `target_api_version` 设为 `4`；声明 v3 的模块不得调用 v4 新增的 `getRuntime()` slot。

## `ZygiskNextAPI`

v4 函数表提供：

- `pltHook(base, symbol, handler, original)`；
- `inlineHook(target, handler, original)` 与 `inlineUnhook(target)`；
- `newSymbolResolver(path, base)` / `freeSymbolResolver(resolver)`；
- `getBaseAddress`、`symbolLookup`、`forEachSymbols`；
- `connectCompanion(self_handle)`；
- `getRuntime()`。

Hook API 使用 `ZN_SUCCESS`（0）/`ZN_FAILED`（1）。检查返回值，并让目标库、hook 代码和原函数存储在 hook 使用期间保持有效。resolver 必须配对释放；枚举符号的 callback 不能保存超出其生命周期的指针。

### v1.8.0 的 PLT 与 inline hook 约束

PLT 后端已改用 YukiPLT，ZN API v4 布局保持不变。`pltHook` 要求目标有唯一、非空、可枚举的 `JUMP_SLOT`，且每个目标槽位只有一个所有者。相同 image/symbol/handler 的重复请求会验证已有 hook 并返回保存的原函数，不创建新的 hook 链；不同 handler 的竞争请求会失败。

将原函数保存到持续有效的存储中，在 replacement 内通过头文件的 `zn_plt_load_original(&original)` 读取；不要重用已经发布的原函数存储。返回失败后仍可能有待恢复状态，不能立即释放目标库、handler 或原函数存储。

`inlineHook` 和 `inlineUnhook` 要求当前进程只有一个线程；重叠 patch 区间、无效参数或无法处理的指令会被拒绝。应在目标开始并发执行前安装 hook，并检查返回值。

## Native companion

需要 companion 时，清单行加 `companion`，库再以全局符号 `zn_companion_module` 导出：

```c
struct ZygiskNextCompanionModule {
    int target_api_version;
    void (*onCompanionLoaded)(void);
    void (*onModuleConnected)(int fd);
};
```

`connectCompanion(self_handle)` 只有在该条目声明 companion 且 daemon 能验证调用进程/模块/目标关系时才返回连接 fd。每次连接可在独立线程回调，模块必须处理并发、协议边界与 fd 关闭。daemon 重新登记时，模块与 companion 的关联由运行时一起更新，模块继续使用传入的 `self_handle`。`connectCompanion` 返回失败时，检查 daemon 及该模块的 companion 状态，不要自行连接内部 socket。

## API v4 的 HYOS runtime

`getRuntime()` 是 v4 新 slot。仅在 AArch64 进程中检测到有效的 `/system_ext/bin/hyos_spawner` Rust runtime 映射时返回非空描述符，否则返回 `NULL`。

先判断返回值非空，再检查：

```c
runtime->type == ZN_RUNTIME_HYOS
runtime->api_version == ZYGISK_NEXT_HYOS_API_VERSION  /* 当前为 1 */
```

HYOS runtime v1 允许模块在 `onModuleLoaded` 期间通过 `registerModule` 登记 `ZygiskNextHyosModule`，其 `onAppSpecialized` 接收：

- `process_name`；
- `package_name`；
- `se_info`。

登记窗口在 Native 模块加载阶段结束后关闭。YukiZygisk 为 HYOS spawner 安装 `fork` 与 `selinux_android_setcontext` bridge；只有 bridge、控制会话和已登记回调都成功时才报告完成。在非 HyperOS、32 位进程或映射签名不符时，`getRuntime()` 返回 `NULL`；模块应跳过 HYOS 功能，继续执行其余可用功能。

## 状态验证

管理器按“模块目录 ID + `name/path` 类型 + 目标值”显示 Native 模块；按进程视图再用原始 PID 与 exec 字符串分组。状态含义：

- `unknown`：尚未收到模块结果。先通过正常流程启动目标，再刷新状态；目标是开机服务时重启设备。仍无结果时核对清单、目标实际 exec 路径和对应 ABI 的 daemon/core 日志；
- `injected`：该模块对该目标有正向完成报告；目标后来正常退出仍保留此汇总结论；
- `failed`：收到失败报告，或基础注入完成后应匹配模块仍未完成。检查该目标的 loader/core 日志、ELF ABI 和动态依赖；
- `crashed`：该代际因 `SAFEMODE` 被跳过。查看状态页的安全模式触发名称与计数，处理故障模块后再重启；此标签不表示该 Native 目标自身崩溃。

出现 `injected` 后，继续测试模块预期修改的功能。报告问题时附 `zn_modules.txt`、ELF ABI/动态依赖、目标实际 exec 路径、状态页原始目标以及完整 `yukizygisk.tar.gz`。

## 源码参考

- [Native 模块加载](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/yukizncore.cpp)
- [快照生成](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_snapshot.cpp)
- [清单解析](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/daemon/native_modules.hpp)

- [Native Bionic 加载](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/native_bionic.cpp)
- [模块与 companion 绑定](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/src/native_module_binding.hpp)
