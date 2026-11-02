---
permalink: /yukizygisk/intro/
title: YukiZygisk 介绍
---

# YukiZygisk

YukiZygisk 是 YukiSU 集成的可选进程注入环境。它让普通 Zygisk 模块和 Native ZN 模块在不安装 Magisk 或另一套 Zygisk 实现的情况下运行，但它不是核心 Root 主链的一部分。

YukiZygisk 有独立的开关和状态页。关闭它后，YukiSU 的 Root 授权继续工作。

::: warning 实验性功能
YukiZygisk 仍是实验性功能。使用前核对模块要求的 Android 版本、API、ABI 与目标应用版本，并保持设备上的 LKM、`ksud` 和 payload 版本匹配。
:::

## 实现与冲突

YukiZygisk 自行实现内核观测、入口重定向、Zygote 运行库、模块代理和诊断，并兼容下文列出的模块 API。设备上的 `zygiskd64`/`zygiskd32` 是它的用户空间代理。

内置 YukiZygisk 与第三方 Zygisk 实现不能并行。功能开启时，模块列表会强制给目录 ID 为 `zygisksu`、`rezygisk` 或 `yukizygisk` 的实现写入 `disable`，其中 `yukizygisk` 指独立模块版 YukiZygisk。

## 集成版与独立模块版

本章描述随 YukiSU v1.8.0 分发的集成版：内核 Hook 在 `kernelsu.ko`，配置、payload 部署、启动与诊断由 YukiSU 的 `ksud` 和管理器负责。更新集成版时，通过 YukiSU 的安装/更新流程同步 LKM 和用户空间组件。独立模块版使用自己的安装包、内核组件和更新流程，两者的二进制不能混装。

## 启用条件

1. 当前加载的 `kernelsu.ko` 必须包含 `CONFIG_KSU_YUKIZYGISK=y`；
2. 设备侧 `/data/adb/ksud` 与 YukiZygisk payload 必须来自匹配的构建；
3. 在管理器的“设置 → 功能控制”中开启 YukiZygisk；
4. 完整重启。

官方构建脚本当前默认启用 YukiZygisk，也可用 `--yukizygisk-off` 明确关闭；手工构建 LKM 时仍要传入对应构建配置。若管理器显示内核不支持该功能，安装包含上述配置的 LKM 后再重启。

开关同时写入当前内核状态和 `ksud` 持久配置。开启后必须重启：`post-fs-data` 会启动所需 daemon，新 Zygote 才能沿注入路径启动。缺失 daemon 的恢复方法见[功能与状态](/yukizygisk/features/)。

## 当前架构

1. 内核侧观察 `execve` 与 `execveat`，识别 Zygote 或已登记的原生目标；
2. 在目标进程真正进入用户入口前，内核准备 loader/core 文件描述符并改写 `AT_ENTRY`；
3. `zygiskd64` 总是为已启用功能提供模块、配置和 companion 代理；存在 32 位 Zygote 或 32 位 Native 目标时再启动 `zygiskd32`；
4. Zygote core 在派生的应用或 system_server 进程中加载普通 Zygisk 模块并调用标准回调；
5. 独立的 Native core 按 `zn_modules.txt` 匹配原生进程，再通过 Bionic 加载 ZN 模块。

模块映像通过受控文件描述符/内存文件交接；目标进程不需要直接读取 `/data/adb` 下的 payload 路径。普通 Zygisk 与 Native ZN 共用部分注入基础设施，但清单、入口符号、API 和生命周期不同。

## 64 位与 32 位

YukiSU LKM 只支持 ARM64 内核设备。YukiZygisk payload 同时包含 `arm64-v8a` 和 `armeabi-v7a` 运行组件，以覆盖 ARM64 设备上的 64 位与 32 位进程。

模块需要提供对应 ABI 的库：

- 普通 Zygisk 模块要提供相应的 `zygisk/arm64-v8a.so` 或 `zygisk/armeabi-v7a.so`；
- Native ZN 每条清单引用的 ELF class 必须与目标进程一致；
- 设备没有 32 位 Zygote/目标时，不会启动 32 位 daemon。

## 当前启动与下一次启动

| 操作 | 当前进程 | 新进程/下一次启动 |
| --- | --- | --- |
| 开启功能 | 现有 Zygote 保持原状态；需要重启启动 daemon 和注入新 Zygote | 重启后在 `post-fs-data` 恢复配置并完整启用 |
| 关闭功能 | 停止新的内核注入路径，但已加载代码不会从现有进程消失 | 重启后以无 YukiZygisk 的干净进程树启动 |
| 安装/更新/启停普通 Zygisk 模块 | 现有应用与 Zygote 保持旧状态 | 重启后 daemon 重新扫描并由新进程加载 |
| 安装/更新/启停 Native ZN 模块 | 已运行目标不会卸载或补载 | 新目标使用已登记清单；early 目标以预先生成的下次启动快照为准 |
| 修改 loader/拒绝名单/日志设置 | `yzctl reload` 通知 daemon，主要影响后续加载与 specialization | 重启后所有进程统一使用保存值 |

模块安装、启用、禁用和卸载会尝试刷新 early Native 快照；只有 YukiZygisk 与“早加载原生模块”同时开启才生成，否则清除快照。“早加载原生模块”默认关闭，快照供下一次启动中早于 `post-fs-data` 的目标使用。刷新后重启，才能让这些目标加载更新后的模块。

## 从哪里看状态

主页识别到集成版 YukiZygisk 后，可以进入专用状态页。页面轮询内核运行快照，显示：

- 功能是否启用、是否进入 YukiZygisk 注入安全模式；
- 各 Zygote 的 ABI、PID 与注入状态；
- 已发现的普通 Zygisk 模块；
- Native ZN 的模块视图、进程视图、目标与 companion；
- 加载器、匿名内存、早加载、崩溃保护、拒绝名单与 dmesg 镜像设置；
- 普通模块的当前代际加载报告、暂停注入提示与崩溃回溯信息。

安装后先确认模块出现在列表中，再查看加载状态并启动目标应用测试功能。状态含义和排查步骤见[功能与状态](/yukizygisk/features/)，普通模块格式见[普通 Zygisk 模块](/yukizygisk/modules/)，原生接口见 [Native ZN API](/yukizygisk/native-zn/)。

## 源码参考

- [启动与恢复](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_daemon.cpp)
- [内核 exec 入口](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/feature/yukizygisk/exec.c)
- [早期快照](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_snapshot.cpp)
