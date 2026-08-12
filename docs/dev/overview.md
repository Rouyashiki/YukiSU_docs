---
permalink: /dev/overview/
title: 开发者
---

# 开发者

源码在 [Anatdx/YukiSU](https://github.com/Anatdx/YukiSU)。准备动手前先找对目录：改 LKM、改 `ksud`、改 YukiZygisk 和改管理器，用的工具链完全不是一套。

| 目录 | 主要内容 |
| --- | --- |
| `kernel/` | LKM、策略、Hook 与内核扩展 |
| `uapi/` | 内核/用户空间共享 UAPI |
| `userspace/ksud/` | C++ 守护进程、模块与镜像工具 |
| `userspace/ksuinit/` | 早期启动加载器 |
| `userspace/su/` | su 客户端 |
| `userspace/zygisk/` | YukiZygisk daemon、core 与 API |
| `manager/` | Android 管理器 |
| `js/` | 模块 WebUI JavaScript 包 |
| `scripts/` | Windows/Linux 本地完整构建入口 |

## 文档入口

- [内核集成](/dev/integration/)：为匹配的 ARM64 GKI 2.0 内核构建 LKM
- [构建指南](/dev/build/)：使用仓库脚本构建完整包
- [Ramdisk Editor 协议](/dev/ramdisk-protocol/)：YRCP v3 摘要与规范链接

公开 UAPI 和 CLI 还会继续演进。第三方工具最好固定一个提交或发布版本，别根据文档里几行摘要猜协议，然后期待以后永远不变。
