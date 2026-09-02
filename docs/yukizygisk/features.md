---
permalink: /yukizygisk/features/
title: YukiZygisk 功能与状态
---

# YukiZygisk 功能与状态

## 两套模块接口

YukiZygisk 当前有两条明确分开的模块链：

- **普通 Zygisk**：读取 `zygisk/<abi>.so`，当前公开 `zygisk.hpp` 为 API v5，运行时接受 API v1 到 v5；
- **Native ZN**：读取 `zn_modules.txt` 并注入指定原生可执行文件，当前头文件为 Zygisk Next native API v4，运行时兼容 v3/v4，并提供可选 HYOS runtime 扩展。

普通 Zygisk 的 `preAppSpecialize`/`postAppSpecialize` 与 Native ZN 的 `onModuleLoaded` 不是同一回调。模块卡片被标成 “Zygisk” 或 “Native” 只表示目录内容分类，不能把其中一套 API 用到另一条路径。

## 普通模块 loader

状态页可以在两种普通 Zygisk 加载方式之间切换：

- `yukilinker（匿名）`：使用 YukiZygisk 自带的匿名 loader；
- `system dlopen`：使用系统动态加载路径。

设置通过 `yzconfig.json` 保存并用 `yzctl reload` 通知 daemon，主要影响后续创建/加载的进程。已经加载模块的应用不会因为切换选项而卸载重载。Native ZN 自身始终使用其专用 loader 链，不应拿这个普通模块选项推断 ZN 加载方式。

## 拒绝名单模式

状态页提供三种行为：

| 模式 | 普通模块挂载 | 普通 Zygisk 模块 |
| --- | --- | --- |
| 关闭 | 仍由 YukiSU Root profile 决定 | 拒绝名单不额外阻止注入 |
| 强制 | 对命中的应用执行普通模块卸载 | 跳过模块加载与回调 |
| 恢复 | 保留普通模块卸载结果 | 仍执行注入与模块回调 |

拒绝名单判断来自 YukiSU 的 UID profile。它不是 MetaModule 开关，也不会在 specialization 结束后替 Zygisk 模块清理模块自己创建的私有挂载。详见[模块挂载](/modules/magic-mount/)。

普通 Zygisk 公共头文件仍声明 `FORCE_DENYLIST_UNMOUNT`。当前集成 core 会记录这个 module option，但实际卸载决策仍来自上述 UID/profile 路径；源码尚未把该 option 接到额外卸载动作。模块作者目前不应依赖该选项强制改变挂载状态。

## 64 位与 32 位进程

YukiZygisk 包含 ARM64 与 ARM32 runtime/daemon。32 位 daemon 只在设备有 32 位 Zygote，或 Native 清单包含有效 32 位目标时启动。第三方模块仍必须提供与目标进程一致的库。

普通 Zygisk 模块不会加载进 UID 落在 isolated-process 范围的应用子进程；system_server 走单独的 server specialize 回调。Native ZN 是否匹配则由 `name=`/`path=` 与 ELF class 决定。

## YukiZygisk 注入安全模式

内核按 Zygote socket name 分别记录 PID。首个 PID 建立基线；同名 Zygote 每出现一个不同 PID 就计一次 restart。当某个名称达到 `3` 次 restart，YukiZygisk 进入全局注入安全模式：

- 当前触发的 Zygote 不再注入；
- 后续 Zygote 与 Native 目标也被跳过；
- 管理器报告触发名称与计数；
- Root、MetaModule、普通模块与 Lua 插件不会因此自动停用。

这个计数来自 PID 更替，不能单独证明崩溃原因一定是某个模块。当前实现也不会因为把功能开关关掉再打开就显式清零；完整重启会得到新的内核运行状态。排查时保留触发前后的 kernel/daemon 诊断，而不是只截“安全模式”标签。

这与 YukiSU **系统安全模式**不同。系统安全模式会跳过模块/插件阶段并禁用 `/data/adb/modules/` 下的模块；YukiZygisk 安全模式只保护注入链。

## 状态页究竟证明什么

管理器每约 2 秒读取一次 `yzctl status --json`。关键字段语义如下：

| 显示 | 证据含义 | 不能证明什么 |
| --- | --- | --- |
| 功能已启用 | 当前内核 feature flag 为 on | daemon、Zygote core 或模块一定成功 |
| Zygote `injected` | 对该 PID/代际收到 core 注入完成报告 | 每个第三方模块业务逻辑都成功 |
| Zygote `unknown` | 只检测/重定向，尚无明确完成或失败报告 | 不能按成功或失败统计 |
| Zygote `failed` | 当前代际有明确注入失败状态 | 不自动指出失败调用或责任模块 |
| 普通模块数量 | 活动模块目录中存在 `zygisk/arm64-v8a.so` 或 `armeabi-v7a.so` | 这些库在目标应用里完成回调 |
| Native `unknown` | 清单存在，但目标尚未观察到或没有正/负报告 | 不是“已加载” |
| Native `injected` | 指定模块、目标类型与目标已有正向运行报告 | 模块最终功能一定正确 |
| Native `failed` | 对该模块/目标存在明确失败证据 | 不能仅凭它断言 API 不兼容 |

Native 汇总键是“模块目录 ID + 目标类型 + 目标值”。一个成功目标随后正常退出时，汇总仍保留 `injected`；配置存在但从未观察到目标时保持 `unknown`。按进程视图会保留原始 PID/进程数据进行分组，但界面名称只显示路径 basename。

状态页的“注入次数”只统计有正向 `injected` 基础记录的 Zygote/Native 目标代际，不是所有 exec，也不是模块回调总次数。

## 日志与诊断

`zygiskd` 默认写入当前启动诊断目录中的独立 64/32 位日志。打开“镜像到 dmesg”后，daemon 日志也写入 kernel log；内核侧 YukiZygisk 日志本来就进入 dmesg。

YukiSU 会保留 `diagnostics/current` 与上一代 `diagnostics/old`，并记录 boot ID、状态、loader、capture 以及可获得的 tombstone/pstore 证据。通过管理器导出完整 bugreport 时，只要功能开启或存在实际诊断证据，外层报告会包含 `yukizygisk.tar.gz`。

报告问题至少提供：

1. 实际加载的 LKM/`ksud`/payload 版本或哈希；
2. Android、内核/KMI 与 32/64 位目标；
3. 模块目录 ID、版本、目标与复现步骤；
4. 完整 `yukizygisk.tar.gz`，而不只是状态页截图；
5. 最近一次正常启动和异常启动分别发生了什么。

继续阅读[普通 Zygisk 模块](/yukizygisk/modules/)或 [Native ZN API](/yukizygisk/native-zn/)。
