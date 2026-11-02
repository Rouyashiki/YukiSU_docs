---
permalink: /dev/overview/
title: 开发者
---

# 开发者

本章以 **YukiSU v1.8.0** 为基线。源码在 [Rouyashiki/YukiSU](https://github.com/Rouyashiki/YukiSU)。按下面的目录定位组件，再选择对应的构建入口。

| 目录 | 主要内容 |
| --- | --- |
| `kernel/` | LKM、策略、Hook 与内核扩展 |
| `uapi/` | 内核/用户空间共享 UAPI |
| `userspace/common/` | C++ 公共构建约束；包含 Android API 31 编译期门槛 |
| `userspace/ksud/` | C++ 守护进程、模块与镜像工具 |
| `userspace/ksuinit/` | 早期启动加载器 |
| `userspace/ksud/src/su.cpp` | su 命令处理 |
| `userspace/busybox/` | 单独构建并随 APK 分发的 BusyBox |
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

当前 `ksud help` 暴露 module、plugin、late-load、soft-reboot、feature、uts-view、yzctl、dynamic、boot patch/info/restore、Ramdisk Editor、flash、profile、sepolicy 等命令族。模块 preinit 可用 `ksud module preinit status --json` 查询；YukiZygisk 的配置与恢复入口见[功能与状态](/yukizygisk/features/)。查看当前构建提供的命令和启动镜像参数：

```sh
ksud help
ksud boot-patch --help
```

各命令的帮助形式不同；不要为了查看帮助直接运行会修改系统的命令。

启动镜像参数见[启动镜像命令](/dev/boot-images/)；Ramdisk 二进制协议见 [YRCP v3](/dev/ramdisk-protocol/)。其他命令参考当前构建的帮助输出和 [`userspace/ksud/src/cli.cpp`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli.cpp)。第三方工具应固定 YukiSU 提交或发布版本，检查命令退出码，并优先使用命令提供的 JSON 输出。

升级依赖版本时，重新检查所用 UAPI、命令参数和返回字段；构建与设备测试步骤见[构建指南](/dev/build/)。

## Feature 与默认 Root 环境

v1.8.0 定义 13 项 Feature，旧 ID `5` 和 `100` 已移除并保留编号。WebView 挂载卸载改由应用配置控制，不能再写入旧的 `webview_zygote_umount` 或 `enhanced_security` 开关。

下面两个查询分别读取当前内核值与持久配置：

```sh
ksud feature get default_no_new_privs
ksud feature get default_no_new_privs --config
```

默认 Root SELinux domain 为 `u:r:ksu:s0`，默认 Root Profile 的 Feature 102 防逃逸标记开启。工具应读取实际 App Profile 与运行身份，不要硬编码旧 `su` domain。自定义 Profile 和旧配置迁移规则见[应用配置](/manager/app-profile/)和[功能控制](/manager/feature-control/)。

## 临时加载与卸载

已有加载权限、且尚未加载 YukiSU 时，可以指定内置 KMI：

```sh
ksud boot-info supported-kmis
ksud late-load --kmi android14-6.1
```

`--kmi` 选择这份 `ksud` 内嵌的 `<KMI>_kernelsu.ko`，不接收 `.ko` 路径，也不放宽内核兼容要求；省略时自动检测。`--magica` 分支单独引导，不使用这个 KMI 参数。late-load 在后台继续执行，命令返回不代表模块阶段已完成；查看日志与管理器运行状态。详细前提见[越狱模式](/guide/jailbreak-mode/)。

`ksud unload` 是开发和故障处理命令：它停止 Android 服务、终止持有 YukiSU 驱动资源或处于 `ksu` domain 的进程，再尝试卸载 LKM，最后重新启动 Android 服务。它要求 UAPI 匹配、LKM 声明安全卸载能力，并确认 Kasumi 尚未初始化；Kasumi 已初始化或状态不明时拒绝卸载。失败后查看错误，不要强制 `rmmod`。该命令不清除启动镜像中的安装，完整重启仍会按原启动链加载。

查询软重启能力与最近结果使用 `ksud soft-reboot-status --json`。`ksud soft-reboot` 重启 Android 并重放对应模块阶段；它不重新加载内核，也不执行 preinit。

- [CLI 参数表](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli_args.cpp)
- [临时加载](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/late_load.cpp)
- [受保护的卸载流程](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/unload.cpp)
- [Feature 配置与迁移](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp)
