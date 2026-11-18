---
permalink: /guide/intro/
title: 介绍
---

# YukiSU 介绍

YukiSU 可以让你在支持的 Android 手机上决定哪些应用能用 Root，也能安装模块、修补启动镜像。它从 [SukiSU-Ultra](https://github.com/SukiSU-Ultra/SukiSU-Ultra) 发展而来，沿用 KernelSU 的应用授权和模块格式。

第一次用 YukiSU，可以从[快速开始](/guide/get-started/)检查设备、下载管理器。手机上已经装了旧版，请先看[升级步骤](/guide/update/)再动手。

本文档对应 2026 年 11 月 16 日发布的 **v1.9.0**，管理器版本码为 **10745**。这一版换了包名和签名，如果旧版还在，安装后手机上会多出一个 YukiSU 图标。[v1.9.0 发布说明](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.9.0)

## 管理器、内核模块和 `ksud` 各管什么

| 组件 | 职责 |
| --- | --- |
| `kernelsu.ko` | 运行在内核里的模块（LKM），负责执行 Root 授权、应用配置与 Kasumi 规则 |
| `ksuinit` / ImgPatch bootstrap | 分别在 Ramdisk 或内核镜像布局中加载 LKM |
| `ksud` 与 `su` | `ksud` 负责安装、运行模块和收集诊断，应用通过 `su` 请求 Root |
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

正式版提供 8 个内核模块，从 `android12-5.10` 到 `android17-6.18`。手机升级 Android 后，内核可能还沿用旧版本。挑选 LKM 时，请按设备内核的 KMI（内核模块接口）对照[兼容范围](/guide/compatibility/)。

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

安装 APK 后就可以打开管理器。要让应用用上 Root，还要加载和设备匹配的 LKM。以后只同步 `ksud`，改动的是设备上的用户空间工具。要换启动镜像里的 LKM，还需要修补镜像并完整重启。

官方管理器默认靠签名认证。自己签名的管理器还可以用 SuperKey。普通应用能否获取 Root，由你在超级用户页决定。只有使用 Zygisk 模块时才需要开启 YukiZygisk。

模块有各自的 Android 版本、架构和接口要求，安装前看作者的说明。遇到问题需要反馈时，附上管理器、运行中的 LKM 和设备上 `ksud` 的完整版本。[排查指南](/troubleshoot/common/)

## 文档入口与社区

- [安装与镜像模式](/guide/install-modes/)
- [模块系统](/modules/overview/)
- [管理器](/manager/overview/)
- [排查与恢复](/troubleshoot/common/)
- [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues) · [Telegram](https://t.me/manosaba)

`kernel/` 使用 GPL-2.0-only；其他 YukiSU 自有代码使用 GPL-3.0-or-later，第三方组件遵循各自许可。具体见项目与管理器的许可说明。
