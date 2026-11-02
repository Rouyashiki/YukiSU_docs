---
permalink: /guide/intro/
title: 介绍
---

# YukiSU 介绍

YukiSU 是面向 **Android 12+、ARM64 GKI 2.0** 设备的内核级 Root 方案，fork 自 [SukiSU-Ultra](https://github.com/ShirkNeko/SukiSU-Ultra)。它使用 LKM 内核模块、C++ 用户空间与自己的管理器，支持 KernelSU 风格的授权、App Profile 和模块生态。

第一次使用，请从[快速开始](/guide/get-started/)安装。已经在用 YukiSU，请按[更新指南](/guide/update/)升级并检查配置迁移。

本站以 **v1.8.0（2026-11-02）** 为基线，管理器版本码为 **10670**。功能入口、命令参数和配置行为均按这一版本说明。

## 由哪些组件组成

| 组件 | 职责 |
| --- | --- |
| `kernelsu.ko` | 内核授权、Hook、Feature、App Profile 与 Kasumi 能力 |
| `ksuinit` / ImgPatch bootstrap | 分别在 Ramdisk 或内核镜像布局中加载 LKM |
| `ksud` 与 `su` | 模块、安装、策略、诊断，以及用户空间提权入口 |
| Manager | 授权、配置、安装、模块与分区维护界面 |
| 内置 Kagami / 外部 MetaModule | 把模块文件挂到系统路径 |
| YukiZygisk | 可选的 Zygisk 与 Native ZN 注入运行时 |

Root 正常、Zygisk 模块无效时，打开 YukiZygisk 页面检查目标进程的注入结果。模块脚本已运行、文件却没变化时，检查 Kagami 或 MetaModule 的挂载日志，以及目标应用的挂载命名空间。

## 设备范围

| 项目 | 要求 |
| --- | --- |
| Android | Android 12（API 31）及以上 |
| 架构 | ARM64 |
| 内核 | GKI 2.0，Linux 5.10 及以上 |
| 部署 | LKM，`CONFIG_KSU=m` |
| 内核能力 | `CONFIG_MODULES=y`、Kprobes、Kretprobes 与 syscall tracepoints |

Android 11 及以下、GKI 1.0、non-GKI、ARM32、x86_64 和 built-in `CONFIG_KSU=y` 不在支持范围。YukiZygisk 的 32 位组件用于 ARM64 设备上的 32 位应用，不代表支持 ARM32 设备。

完整构建维护 8 个标准 KMI，从 `android12-5.10` 到 `android17-6.18`。系统版本不能直接决定选哪枚 LKM，仍需匹配 KMI、vermagic、符号和配置；见[兼容范围](/guide/compatibility/)。

## 当前功能

- 应用授权与 App Profile，支持结构化备份恢复。
- 传统 Ramdisk、ImgPatch 与临时 late-load；另有不安装或替换 LKM 的仅配置 Ramdisk 修补。
- 内置 Kagami 挂载，并允许启用的外部 MetaModule 接管；内置 Kasumi 提供 su、路径规则与挂载视图能力。
- 普通模块、一次性脚本、显式支持的热安装，以及早期 preinit 动作。
- 13 项 Feature 与启动强制配置、可选的 SuperKey、动态管理器和 UTS View。
- YukiZygisk 加载策略、进程监视、退出证据与崩溃保护。
- 远程镜像提取、分区备份、AVB 控制、Ramdisk 文本/二进制编辑和诊断导出。

完整说明见[功能概览](/guide/features/)；与上游的具体差异见[KernelSU 对比](/guide/yukisu-vs-kernelsu/)。

## 使用前要分清

安装 APK 不等于已经加载 LKM；同步 `ksud` 不等于更新启动镜像。YukiSU 的 TSR 沿用 KernelSU LKM 的 tracepoint syscall redirect 模型，但两边二进制和私有接口不可随意互换。

SuperKey 认证管理器 UID，不是应用 Root 密码。YukiZygisk 可关闭，基础 Root 与普通模块仍可运行。模块安装成功、挂载完成和功能实际有效也需要分别确认。

安装前选好匹配 KMI 的 LKM，模块则按作者列出的 Android、ABI 和接口要求选择。遇到故障，请在报告中写出 LKM、`ksud` 与 Manager 的完整版本，按[排查指南](/troubleshoot/common/)定位。

## 文档入口与社区

- [安装与镜像模式](/guide/install-modes/)
- [模块系统](/modules/overview/)
- [管理器](/manager/overview/)
- [排查与恢复](/troubleshoot/common/)
- [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues) · [Telegram](https://t.me/manosaba)

`kernel/` 使用 GPL-2.0-only；其他 YukiSU 自有代码使用 GPL-3.0-or-later，第三方组件遵循各自许可。具体见项目与管理器的许可说明。
