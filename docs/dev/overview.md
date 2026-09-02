---
permalink: /dev/overview/
title: 开发者
---

# 开发者

源码在 [Rouyashiki/YukiSU](https://github.com/Rouyashiki/YukiSU)。准备动手前先找对目录：改 LKM、改 `ksud`、改 YukiZygisk 和改管理器，用的工具链完全不是一套。

| 目录 | 主要内容 |
| --- | --- |
| `kernel/` | LKM、策略、Hook 与内核扩展 |
| `uapi/` | 内核/用户空间共享 UAPI |
| `userspace/common/` | C++ 公共构建约束；包含 Android API 31 编译期门槛 |
| `userspace/ksud/` | C++ 守护进程、模块与镜像工具 |
| `userspace/ksuinit/` | 早期启动加载器 |
| `userspace/su/` | su 客户端 |
| `userspace/zygisk/` | YukiZygisk daemon、core 与 API |
| `manager/` | Android 管理器 |
| `js/` | 模块 WebUI JavaScript 包 |
| `scripts/` | Windows/Linux 本地完整构建入口 |

## 文档入口

- [兼容范围](/guide/compatibility/)：Android 12/API 31 到 Android 17/6.18 的正式边界与 KMI 矩阵
- [内核集成](/dev/integration/)：为匹配的 ARM64 GKI 2.0 内核构建 LKM
- [构建指南](/dev/build/)：使用仓库脚本构建完整包
- [启动镜像命令](/dev/boot-images/)：`boot-info`、传统 `boot-patch`、ImgPatch `boot-patch-v2` 与恢复边界
- [Ramdisk Editor 协议](/dev/ramdisk-protocol/)：YRCP v3 摘要与规范链接

## `ksud` CLI 从哪里开始

当前 `ksud help` 暴露 module、plugin、late-load、soft-reboot、feature、uts-view、yzctl、dynamic、boot patch/info/restore、Ramdisk Editor、flash、profile、sepolicy 等命令族。这里不复制一份很快会漂移的完整参数表：

```sh
ksud help
ksud <command>
ksud boot-patch --help
```

并非每个命令族都接受统一的 `--help`；无参数用法和退出码也属于各命令契约。

破坏性与跨版本风险最高的启动镜像命令单独维护在[启动镜像命令](/dev/boot-images/)；Ramdisk 二进制协议单独维护在 [YRCP v3](/dev/ramdisk-protocol/)。其他命令以当前构建的帮助输出和 [`userspace/ksud/src/cli.cpp`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/cli.cpp) 为事实源。第三方工具应固定 YukiSU commit，并检查命令退出码，不能只匹配人类可读输出。

公开 UAPI 和 CLI 还会继续演进。第三方工具最好固定一个提交或发布版本，别根据文档里几行摘要猜协议，然后期待以后永远不变。主机构建成功也只算构建证据；设备行为要用实际部署哈希、运行状态与日志证明。
