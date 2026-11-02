---
permalink: /guide/yukisu-vs-kernelsu/
title: 与 KernelSU 的区别
---

# YukiSU 与 KernelSU 的区别

YukiSU 保留 KernelSU 的授权和模块用法，提供自己的 C++ 用户空间，并内置 Kagami、Kasumi 与 YukiZygisk。使用这些功能时，无需分别寻找挂载与 Zygisk 运行时；已有外部 MetaModule 也能继续使用。

## 主要区别

| 项目 | YukiSU | 官方 KernelSU |
| --- | --- | --- |
| 支持设备 | Android 12+、ARM64、GKI 2.0、LKM | 官方支持 GKI Linux 5.10+；其他内核需要自行集成 |
| 标准 KMI 构建目标 | 8 个，从 `android12-5.10` 到 `android17-6.18` | 相同的 8 个目标 |
| 用户空间 | C++ `ksud`（含 su）与 `ksuinit` | 主线 `ksud` 使用 Rust |
| 持久加载布局 | Ramdisk 与 ImgPatch，均为 LKM | 官方现成构建以 LKM 为主；旧 GKI image 构建文档已归档 |
| 系统文件挂载 | 内置 Kagami；支持外部 MetaModule 优先接管 | 官方模块流程要求文件挂载使用 MetaModule |
| Zygisk | 内置且可关闭的 YukiZygisk | 不内置，可使用外部运行时 |
| Feature | `0–4`、`6`、`101–107` | `0–4`、`6`；`5` 保留不用 |
| 扩展能力 | Kasumi、SuperKey、动态管理器兼容值、UTS View、ImgPatch 与分区工具 | 不提供这些 YukiSU 私有接口 |

上表的官方支持、挂载与 Zygisk 描述来自固定快照的 [FAQ](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/website/docs/guide/faq.md)，发布构建取舍见[构建说明](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/website/docs/guide/how-to-build.md)。安装时，两边都要使用与目标内核 KMI、符号和配置匹配的 LKM。

## Hook 与 Feature

YukiSU 的 TSR 是 Tracepoint Syscall Redirect，沿用 KernelSU LKM 的 syscall hook 基础模型，并有自己的策略与扩展。它不是新的 Root 权限等级，也不能据此混用两边的 `.ko` 或 `ksud`。

两边都将历史 WebView Feature ID 5 留空；YukiSU v1.8.0 使用 WebView Zygote 的 App Profile 配置模块卸载，并移除了 ID 100“增强安全”。ID 6 是 shell 已获授权后的可信会话限制。YukiSU 的 105–107 则覆盖 Kasumi su、Kasumi 总开关与挂载视图清理。具体值和条件见[功能控制](/manager/feature-control/)。

## 现有模块怎么用

YukiSU 支持 KernelSU 风格的模块目录、脚本和 MetaModule 契约，也提供一次性脚本、热安装与 preinit。是否能直接使用某个模块，要检查该模块实际依赖的 Manager API、安装器环境、挂载后端、Android 版本和 ABI。

系统文件挂载是当前很重要的区别：YukiSU 无启用的外部 `metamount.sh` 时调用内置 Kagami。因此不能继续把上游“必须另装 MetaModule”的步骤原样套用。保留已有外部 MetaModule 时，重启后检查它的挂载日志和目标文件，见[模块挂载](/modules/magic-mount/)。

## 版本兼容设置能解决什么

管理器或模块仅因版本检查拒绝运行时，可以设置兼容版本值。动态管理器按签名设置，模块安装使用全局设置，两者分开配置。若对方需要 YukiSU 没有实现的命令或私有接口，改版本值无法解决，必须修改对方的适配代码。

更新应使用各自项目配套的 APK、`ksud` 与 LKM。需要迁移时，看[从 KernelSU 切换](/guide/switch/kernelsu/)，并验证原有授权、模块和后端。

## 对比版本与源码

本文以 YukiSU v1.8.0（`9d046af4`）与 2026-11-02 核对的 KernelSU 主线快照 `28db74f6` 对比。使用旧版本时，先查看该版本的更新说明。

- [YukiSU Feature](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h)
- [YukiSU 内置与外部挂载选择](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp)
- [KernelSU Feature 定义](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/userspace/ksud/src/feature_id.rs)
- [KernelSU KMI 矩阵](https://github.com/tiann/KernelSU/blob/28db74f6f4692e97006ce9ebd8b19b9cc614b5b7/.github/workflows/build-lkm.yml)
