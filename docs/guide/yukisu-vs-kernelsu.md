---
permalink: /guide/yukisu-vs-kernelsu/
title: 与 KernelSU 的区别
---

# YukiSU 与 KernelSU 的区别

YukiSU 来自 KernelSU 生态，也继续复用它的公开模块与策略契约；但它不是只换包名和主题的管理器。两边当前最重要的区别是受支持的发布面、用户空间实现、安装后端、内置扩展与维护节奏。

::: info 比较快照
本页的“当前官方 KernelSU”核对到 **2026-09-02** 的官方 `main` `e38512f1`；YukiSU 对应 `main` `6a7638ba`。会变动的 CI 矩阵与 Feature 枚举均链接到这两个提交，不根据 GitHub HTML 缓存或旧版文档推断。
:::

## 先看结论

如果设备是 Android 12+、ARM64、GKI 2.0、Linux 5.10+，并准备使用 LKM，两边都可能进入候选。YukiSU 的选择理由主要是 C++ 用户空间、ImgPatch、远程镜像工具、内置 YukiZygisk、SuperKey/动态管理器与 100 系列 Feature，而不是“TSR 比 KernelSU 多一套 Hook”。

反过来，想直接跟随官方 KernelSU 的 Rust 用户空间、发布节奏和模块文档，就选官方 KernelSU。需要 built-in、旧内核或 non-GKI 时，不要再沿用“官方主线现在直接提供多种现成模式”的旧印象：应先核对具体分支与设备维护者，因为当前官方构建已转向 LKM。

## 当前差异一览

| 项目 | YukiSU `6a7638ba` | 官方 KernelSU `e38512f1` | 结论 |
| --- | --- | --- | --- |
| 正式设备边界 | Android 12+、ARM64、GKI 2.0、Linux 5.10+、仅 LKM | 官方 FAQ 以 GKI Linux 5.10+ 为正式范围；旧/非 GKI 需自行集成 | 重叠，但不要把源码可移植性写成正式支持 |
| CI LKM 目标 | 8 个，`android12-5.10` 到 `android17-6.18` | 同为 8 个，`android12-5.10` 到 `android17-6.18` | 当前矩阵一致 |
| 内核部署 | `CONFIG_KSU=m`；Ramdisk、ImgPatch、late-load | 当前官方构建推荐 DDK LKM；协议仍识别 built-in/LKM/late-load | 当前发布都以 LKM 为主，YukiSU 额外有 ImgPatch |
| 用户空间 | C++ `ksud`、`ksuinit`、`su` | Rust `ksud` 等主线用户空间 | 不可互换 |
| LKM Hook | TSR 是 Tracepoint Syscall Redirect 简称；与上游 LKM 语义对齐 | Tracepoint syscall hook | 不是 YukiSU 独占差异 |
| 官方 Feature | 保持 ID `0–4` 兼容 | 当前 `feature.rs` 枚举 ID `0–4` | 对这五项按上游看 |
| WebView Zygote umount | 在 KernelSU 预留编号区实现 ID `5` | 当前官方 `main` 未枚举 ID `5` | 不能写成两边完全一致 |
| YukiSU Feature | ID `100–104` | 无这组编号 | YukiSU 扩展 |
| 模块与 MetaModule | 跟随上游公开接口与单后端约定 | 官方契约 | 目标是兼容 |
| Zygisk | 内置、可关闭的 YukiZygisk | 官方 FAQ 明确不内置；可另装 Zygisk Next | 部署方式不同 |
| 管理器认证 | 官方签名 + 可选 SuperKey、动态管理器 | 官方签名/管理器机制 | YukiSU 有额外入口 |
| 镜像工具 | 本地/远程 Ramdisk 修补、ImgPatch、恢复与分区工具 | 官方 `boot-patch` LKM 流程 | 后端与恢复元数据不同 |

## 1. 支持范围不能只写“5.10+”

YukiSU 用户空间有编译期 API 31 门槛，所以 Android 11 及以下不在范围内；设备还必须是 ARM64 GKI 2.0，并能按 `CONFIG_KSU=m` 加载匹配 LKM。当前完整构建明确覆盖 Android 12/5.10 到 Android 17/6.18 的 8 个 DDK 目标。

官方 KernelSU FAQ 当前把 GKI Linux 5.10+ 作为正式范围，同时说明旧内核/non-GKI 可以自行集成。后一句不等于官方为所有旧设备发布可直接刷的内核。当前两边 `build-lkm.yml` 都列出同样 8 个目标并包含 `android17-6.18`。完整 YukiSU 边界见[兼容范围](/guide/compatibility/)。

## 2. “仅 LKM”与当前官方发布方式

YukiSU 明确不支持 built-in `CONFIG_KSU=y`。持久安装有两种布局：

- 传统 Ramdisk：`ksuinit` 从启动 Ramdisk 加载 LKM；
- ImgPatch：把 bootstrap 与 LKM capsule 直接放进 `boot` 内核。

另有不持久的 late-load。三者加载的仍是 `kernelsu.ko`，不是三种权限等级。

官方 KernelSU 的安装页仍保留 GKI/built-in 运行模式说明，模块协议也仍会报告 `built-in`；但当前官方构建页明确写明从 v3.0 起停止官方 GKI image mode 支持，推荐用 DDK 构建 LKM。因此，“需要官方现成 built-in/GKI 就选 KernelSU”已经不是严谨的当前比较。需要这类路径时，应核对具体版本、源码集成说明和设备维护者提供物。

## 3. C++ 用户空间是真正的工程分叉

YukiSU 的 `ksud`、`ksuinit` 与 `su` 使用 C++，当前完整构建把 LKM、`ksuinit`、`su`、YukiZygisk 运行时和 Manager 按顺序组合。`ksud` 还内置镜像工具、Ramdisk Editor、Feature 持久化与完整性监视。

官方 KernelSU 当前主线用户空间以 Rust 实现。公开模块协议可以兼容，不代表内部 CLI 参数、日志、二进制、更新节奏或私有 UAPI 可以交叉替换。遇到问题要同时报告项目、commit、LKM、Manager 与实际 `/data/adb/ksud`。

## 4. Hook 与 Feature 要拆开说

TSR 只是 **Tracepoint Syscall Redirect** 的缩写。YukiSU 持续移植上游 LKM 行为，包括新 bionic 把执行路径转到 `execveat` 后，对 ksud、sucompat、ADB root、sulog 与生命周期的覆盖。说“语义对齐”不等于两个模块二进制相同；YukiSU 仍有自己的策略和扩展代码。

截至比较快照，官方 KernelSU `feature.rs` 只枚举：

| ID | Feature |
| --- | --- |
| 0 | `SU_COMPAT` |
| 1 | `KERNEL_UMOUNT` |
| 2 | `SULOG` |
| 3 | `ADB_ROOT` |
| 4 | `SELINUX_HIDE` |

YukiSU 保持这五项兼容，并在预留编号区加入 `WEBVIEW_ZYGOTE_UMOUNT`（5）。自己的扩展是：

| ID | Feature | 用途 |
| --- | --- | --- |
| 100 | `ENHANCED_SECURITY` | 收紧绕过 YukiSU 的提权与未经授权 UID 降级 |
| 101 | `MAGISK_COMPAT` | 为未预授权应用提供可见 su 授权提示 |
| 102 | `DEFAULT_NO_NEW_PRIVS` | 默认 Root Profile 使用 `no_new_privs` |
| 103 | `YUKIZYGISK` | 控制内置 YukiZygisk |
| 104 | `HIDE_BOOTLOADER` | 启动完成后重写解锁/Verified Boot 属性视图 |

开关、重启要求和兼容代价见[功能概览](/guide/features/)。

## 5. 模块与 MetaModule 是共享契约

YukiSU 按官方 KernelSU 的模块目录、脚本阶段、MetaModule 接口与单活动后端约定执行。只跑脚本、属性或 SELinux 规则的模块不必为了项目名变化而改格式；要把文件挂进 `/system` 等路径时，仍需要合适的 MetaModule。

兼容的是公开契约，不是所有模块都能无条件复用。模块若依赖某个内部 `ksud`、特定 Manager WebUI、Android 版本、挂载实现或未公开路径，仍需单独验证。

## 6. YukiSU 的额外取舍

- **YukiZygisk**：内置并可关闭；官方 KernelSU 不内置，通常通过 Zygisk Next 模块补充。
- **ImgPatch**：只修补含 ARM64 内核的 AOSP `boot`，有独立 capsule、早启动配置与恢复逻辑。
- **远程镜像**：管理器可通过 HTTP Range 探测 HTTPS OTA/factory ZIP 或 `payload.bin`，只提取所选启动分区；当前走传统 Ramdisk 修补。
- **SuperKey/动态管理器**：扩展管理器认证，不是给任意应用执行通用 Root 命令的密码。
- **`ksud` 完整性**：比较 APK 与 `/data/adb/ksud` 的实际 ELF，支持手动/可选冷启动同步，并报告运行时替换。

这些功能增加了选择，也增加了需要配套更新的表面。只需要最接近官方主线的 Root、且不使用这些扩展时，官方 KernelSU 会更直接。

## 7. 从 KernelSU 切换

公开模块目录与 MetaModule 契约相同，所以一般不必清空 `/data/adb`：

- built-in/替换内核路径：先让 KernelSU 给 YukiSU Manager Root，恢复与当前固件完全匹配的原厂 boot，**不要先重启**，在当前仍有 Root 的会话里安装 YukiSU；
- KernelSU LKM：可在当前 Root 会话中直接选择匹配 LKM 与 Ramdisk/ImgPatch 布局安装，不必先空启动一次。

ImgPatch 会清理能够识别的旧 KernelSU Ramdisk 文件；遇到 Magisk Ramdisk 或无法安全验证的内容会停止。完整步骤见[从 KernelSU 切换](/guide/switch/kernelsu/)。

## 应该选哪一个

选择 YukiSU，如果你明确需要它当前提供的 C++ 用户空间、ImgPatch/远程镜像工具、内置 YukiZygisk 或认证扩展，并愿意按它自己的发布组合更新。

选择官方 KernelSU，如果你希望直接跟随官方 Rust 用户空间、当前正式 LKM 流程和官方文档，不需要 YukiSU 扩展。

需要旧内核、non-GKI、built-in、模拟器或特殊架构时，先检查目标项目**当前 commit**与设备维护者证据；不要从旧对比表推导支持。

## 固定快照来源

- [YukiSU `6a7638ba` KMI 构建矩阵](https://github.com/Rouyashiki/YukiSU/blob/6a7638ba668dad17f319dc2567f30a06a4771187/.github/workflows/build-lkm.yml)
- [YukiSU `6a7638ba` Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/6a7638ba668dad17f319dc2567f30a06a4771187/uapi/feature.h)
- [KernelSU `e38512f1` KMI 构建矩阵](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/.github/workflows/build-lkm.yml)
- [KernelSU `e38512f1` Feature 枚举](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/userspace/ksud/src/feature.rs)
- [KernelSU 当前构建说明](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/how-to-build.md)
- [KernelSU 设备支持 FAQ](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/faq.md)
- [KernelSU 模块与 late-load 文档](https://github.com/tiann/KernelSU/blob/e38512f1255ea454d34cc2008d2ef7932547fad6/website/docs/guide/module.md)
