---
permalink: /yukizygisk/modules/
title: 普通 Zygisk 模块
---

# 普通 Zygisk 模块

普通 Zygisk 模块跟随 `zygisk.hpp` 的跨实现 ABI，在 Zygote 派生的应用或 system_server 进程中获得 specialize 回调。它与按可执行文件注入的 [Native ZN API](/yukizygisk/native-zn/) 是两套接口。

## YukiZygisk 如何识别模块

模块仍作为普通 YukiSU 模块安装。对每个未禁用、未待卸载的 `/data/adb/modules/<目录 ID>/`，64 位 daemon 查找：

```text
zygisk/arm64-v8a.so
```

32 位 daemon 查找：

```text
zygisk/armeabi-v7a.so
```

目录存在但当前 ABI 文件缺失时，该 daemon 不会加载它。仅有一个空 `zygisk/` 目录也不会被计入模块库存。

安装、更新、启用、禁用或卸载后应完整重启。已运行 Zygote 及其子进程不会热卸载/热加载模块；模块状态标记只能影响之后的扫描与新进程。

## 当前 API 范围

YukiSU 仓库的 [`zygisk.hpp`](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/zygisk/include/zygisk.hpp) 当前声明 `ZYGISK_API_VERSION=5`。集成 core 接受 API v1 到 v5，并为旧版参数布局与旧 PLT hook 入口保留兼容桥。

API v5 模块可实现：

- `onLoad`；
- `preAppSpecialize` / `postAppSpecialize`；
- `preServerSpecialize` / `postServerSpecialize`。

当前 `Api` 提供 companion 连接、模块目录 fd、进程 Root/拒绝名单 flags、fd 豁免、JNI native method 替换、PLT hook 注册/提交与 module options。API 方法只应在头文件规定的阶段调用；不要在 post-specialize 阶段结束后继续调用。

依赖 Magisk/Zygisk Next 私有接口、特定 ART/JNI 签名或特定应用版本的模块，需针对 YukiZygisk 单独适配和测试。

::: warning `FORCE_DENYLIST_UNMOUNT` 未实现强制卸载
`FORCE_DENYLIST_UNMOUNT` 目前只记录选项，不执行额外卸载。普通模块挂载的卸载由 YukiSU UID/profile 与 YukiZygisk 拒绝名单模式决定。
:::

`DLCLOSE_MODULE_LIBRARY` 请求在 post-specialize 后卸载库。运行时会拒绝卸载仍有活动 hook、待恢复 hook 或已发布 PLT replacement 的模块；即使一次安装后来回滚，也不能据此假设没有线程持有 replacement。模块应让 hook 代码与原函数存储持续有效。

## 加载与回调时机

普通模块库在派生子进程中加载，而不是把所有第三方库常驻在 Zygote 父进程：

1. YukiZygisk 取得目标 UID 的 Root/拒绝名单状态；
2. 非 isolated app 子进程加载当前 ABI 的模块；
3. 调用 `onLoad` 与对应 pre-specialize；
4. Android 完成 specialization；
5. 调用 post-specialize；
6. 根据 module option 与 hook 状态卸载可安全释放的库；仍有模块或运行时引用时保留相关映射。

UID 位于 isolated-process 范围的 app 子进程与 child Zygote 自身会跳过普通模块加载。符合“应用 UID + 包名形式 `_zygote`”条件的 app Zygote，其后代是 isolated 进程，可以在安全条件满足后释放 core；`webview_zygote` 等仍需处理普通后代的 Zygote 会保留 core。system_server 使用 server 回调，不应把 app 参数结构套上去。

v1.9.0 使用 YukiLinker SDK。开启 YukiLinker 时，普通模块优先使用自带加载器。只有符合回退条件的加载错误才会改用系统加载器。日志里会记录实际使用的后端。

## PLT hook：YukiPLT

从 v1.8.0 起，PLT 后端使用 YukiPLT，公开 Zygisk API 版本与表布局不变。模块仍调用 `pltHookRegister` 和 `pltHookCommit`，但需要遵守这些约束：

- 在模块自己的生命周期回调线程中注册并提交；请求按模块隔离，不要从异步工作线程调用。
- `(dev, inode)` 必须唯一标识可枚举的目标 ELF；symbol 必须对应唯一、非空的 `JUMP_SLOT`。每个槽位只允许一个 hook 所有者。
- 一次提交按目标 ELF 分组，每组最多 64 个槽位。不同 ELF 可以部分成功；`pltHookCommit()` 返回 `false` 时，检查各组的 `module … PLT` 日志，不要假定所有已安装 hook 都已撤销。
- 原函数存储须长期有效，不能重复使用。replacement 内用 `zygisk::loadPltOriginal(original)` 读取原函数。
- 安装或恢复尚未完成时，core 会阻止继续安装；保留 handler 和目标库，交由对应恢复流程处理。

core 内部使用映射缓存，并在受管的 Zygote/HYOS fork 边界同步缓存与 hook 状态。模块无需调用 YukiPLT 私有 API，也不能通过自己重置锁或缓存来绕过失败。排查 fork/barrier 错误时，保留发生错误的 PID、模块和完整日志。

## Companion

模块可以在相同 ABI 库中用 `REGISTER_ZYGISK_COMPANION` 导出 `zygisk_companion_entry`。`connectCompanion()` 在 pre-specialize 阶段请求一个连接到 Root companion 的 socket fd；64 位进程连接 64 位 companion，32 位进程连接 32 位 companion。

Companion 由 `zygiskd` 按需启动，可并发处理连接。模块应定义协议和长度上限，支持并发连接，并在请求失败或结束时关闭 fd。

## 拒绝名单

拒绝名单模式影响是否在命中应用中继续加载模块：

- **关闭**：YukiZygisk 不因拒绝名单跳过模块；
- **强制**：跳过普通 Zygisk 模块，并保留普通模块挂载卸载；
- **恢复**：仍加载普通 Zygisk 模块，但保留普通模块挂载卸载。

模块通过 `getFlags()` 看到 `PROCESS_GRANTED_ROOT` 与 `PROCESS_ON_DENYLIST`。分别表示当前 UID 已获 Root 授权、已命中拒绝名单。

集成版不会在 post-specialize 后再次清理第三方模块于应用私有 namespace 中创建的挂载。创建者必须自己管理它们的生命周期。

## 查看模块加载状态

列表里的数量表示已找到多少个对应 ABI 的模块库。想知道运行结果，点开模块详情看当前 Zygote 的记录。v1.9.0 会同时保留成功和失败，某个应用加载失败时，其他应用里的成功记录仍然可见。`unknown` 表示还没有匹配的报告。

`injected` 表示模块已完成入口注册、加载和 `onLoad`。接下来在目标应用中测试 pre/post 回调和模块功能。崩溃保护暂停与回溯信息单独展示，详见[功能与状态](/yukizygisk/features/)。

检查顺序：

1. 对应 ABI 库确实存在且是目标架构；
2. YukiZygisk 状态页中目标 Zygote 为 `injected`；
3. daemon/core 日志记录了模块注册与加载；
4. 模块自己的 companion/业务日志无错误；
5. 目标应用出现可复现的最终效果。

core 日志中的 “loaded N module(s)” 对应第 3 项；模块功能以第 4、5 项的测试结果为准。

## 冲突与排查

内置 YukiZygisk 开启后，`zygisksu`、`rezygisk` 与独立模块版 `yukizygisk` 会被强制禁用。排查前停用其他 Zygisk 实现并重启。

排查单个模块时：

1. 只保留一个待测注入模块；
2. 重启并确认正确 32/64 位 Zygote 的状态；
3. 核对模块 API/ABI、Android 与目标应用版本；
4. 保持匿名内存设置不变，分别开启和关闭 YukiLinker；每次重启后测试同一目标并记录加载日志与结果；
5. 导出包含 `yukizygisk.tar.gz` 的完整 bugreport，并附模块目录 ID、版本、目标与步骤。

## 源码参考

- [模块加载与报告](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/zygisk/core/src/core.cpp)
- [specialize 与 app Zygote](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/zygisk/core/src/hook.cpp)

- [PLT 与 fork 生命周期](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/zygisk/core/src/plt_lifecycle.cpp)
