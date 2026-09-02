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

YukiSU 仓库的 [`zygisk.hpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/zygisk/include/zygisk.hpp) 当前声明 `ZYGISK_API_VERSION=5`。集成 core 接受 API v1 到 v5，并为旧版参数布局与旧 PLT hook 入口保留兼容桥。

API v5 模块可实现：

- `onLoad`；
- `preAppSpecialize` / `postAppSpecialize`；
- `preServerSpecialize` / `postServerSpecialize`。

当前 `Api` 提供 companion 连接、模块目录 fd、进程 Root/拒绝名单 flags、fd 豁免、JNI native method 替换、PLT hook 注册/提交与 module options。API 方法在 post-specialize 之后不再保证可用；模块应遵守头文件标注的调用时机。

“头文件 API v5”不是“任意模块都兼容”的保证。模块仍可能依赖某个 Magisk/Zygisk Next 的未公开行为、特定 Android ART/JNI 签名、注入痕迹、加载器细节或目标应用版本。

::: warning 当前 `FORCE_DENYLIST_UNMOUNT` 边界
头文件声明了 `FORCE_DENYLIST_UNMOUNT`，但当前集成 core 只记录该 option，真正的普通模块卸载仍由 YukiSU UID/profile 与 YukiZygisk 拒绝名单模式决定。现阶段不要依赖这个 option 强制卸载挂载。
:::

`DLCLOSE_MODULE_LIBRARY` 已接入实际卸载路径；模块一旦安装持久 hook，就不应要求卸载自己的库。

## 加载与回调时机

普通模块库在派生子进程中加载，而不是把所有第三方库常驻在 Zygote 父进程：

1. YukiZygisk 取得目标 UID 的 Root/拒绝名单状态；
2. 非 isolated app 子进程加载当前 ABI 的模块；
3. 调用 `onLoad` 与对应 pre-specialize；
4. Android 完成 specialization；
5. 调用 post-specialize；
6. 根据 module option 卸载可安全卸载的库，并移除 YukiZygisk 自身运行痕迹。

UID 位于 isolated-process 范围的 app 子进程会跳过普通模块加载。child Zygote 会保留 core，以便继续处理自己的后代。system_server 使用 server 回调，不应把 app 参数结构套上去。

## Companion

模块可以在相同 ABI 库中用 `REGISTER_ZYGISK_COMPANION` 导出 `zygisk_companion_entry`。`connectCompanion()` 在 pre-specialize 阶段请求一个连接到 Root companion 的 socket fd；64 位进程连接 64 位 companion，32 位进程连接 32 位 companion。

Companion 由 `zygiskd` 按需启动，可并发处理连接。模块应定义协议、长度上限、错误关闭与并发安全，不能假设一次连接或一个全局调用者。

## 拒绝名单

拒绝名单模式影响是否在命中应用中继续加载模块：

- **关闭**：YukiZygisk 不因拒绝名单跳过模块；
- **强制**：跳过普通 Zygisk 模块，并保留普通模块挂载卸载；
- **恢复**：仍加载普通 Zygisk 模块，但保留普通模块挂载卸载。

模块通过 `getFlags()` 看到 `PROCESS_GRANTED_ROOT` 与 `PROCESS_ON_DENYLIST`。这些 flags 描述当前 UID 状态，不是目标应用同意被修改，也不是兼容性结论。

集成版不会在 post-specialize 后再次清理第三方模块于应用私有 namespace 中创建的挂载。创建者必须自己管理它们的生命周期。

## 列表与运行证据

管理器的普通 Zygisk 模块数量来自活动目录中的 ABI 库库存。模块卡片的 Zygisk/运行标签也主要基于该库存与功能状态；它不提供逐模块、逐应用的回调完成证明。

应分别验证：

1. 对应 ABI 库确实存在且是目标架构；
2. YukiZygisk 状态页中目标 Zygote 为 `injected`；
3. daemon/core 日志记录了模块注册与加载；
4. 模块自己的 companion/业务日志无错误；
5. 目标应用出现可复现的最终效果。

即使 core 日志显示 “loaded N module(s)”，也只能证明这些库完成注册并从 `onLoad` 返回，不能证明后续目标回调与第 5 项。

## 冲突与排查

内置 YukiZygisk 开启后，`zygisksu`、`rezygisk` 与独立模块版 `yukizygisk` 会被强制禁用。不要同时运行两套 Zygisk，再把重复注入造成的结果当作单个模块问题。

排查单个模块时：

1. 只保留一个待测注入模块；
2. 重启并确认正确 32/64 位 Zygote 的状态；
3. 核对模块 API/ABI、Android 与目标应用版本；
4. 分别试验匿名 loader 与系统 `dlopen`，记录差异但不要把某次成功外推给所有模块；
5. 导出包含 `yukizygisk.tar.gz` 的完整 bugreport，并附模块目录 ID、版本、目标与步骤。
