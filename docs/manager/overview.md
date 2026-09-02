---
permalink: /manager/overview/
title: 管理器概览
---

# YukiSU 管理器

YukiSU Manager 是 Android 端的管理界面，使用 Kotlin 与 Jetpack Compose 开发。当前 APK 的最低系统版本是 Android 12（API 31）。

管理器本身不是 Root。它只有在设备加载了兼容的 YukiSU LKM、当前 APK 完成管理器认证，并且相应用户空间组件可用时，才能执行授权、模块、插件、修补和维护操作。

```text
界面操作
   ↓
YukiSU Manager
   ├─ 驱动 / ioctl ─→ kernelsu.ko
   └─ ksud 命令 ───→ 安装、模块、插件与维护功能
```

因此，“APK 能打开”“首页显示 YukiSU”“设备侧 `ksud` 正常”是三件不同的事。

## 五个主页面

当前底部导航顺序如下：

| 页面 | 主要用途 | 是否需要可用的 YukiSU Root 链路 |
| --- | --- | --- |
| 首页 | 查看版本、认证、工作模式、守护进程和运行状态 | 查看基础设备信息不需要；管理操作需要 |
| 插件 | 安装与管理由 `ksud` 运行的 Lua 插件 | 需要 |
| 超级用户 | 管理应用 Root、非 Root Profile 与动态管理器 | 需要 |
| 模块 | 安装、更新、启停模块，进入仓库、Action、WebUI 与快捷方式 | 需要 |
| 设置 | Feature、认证、更新、诊断、卸载和界面设置 | 部分项目需要 |

插件页已经进入当前 `main`，不再只是开发分支占位功能。使用方法与安全边界见 [Lua 插件管理](/manager/plugins/)。

## 首页：先分清状态来自哪一层

下拉刷新首页后，优先记录这些内容：

| 首页内容 | 它能说明什么 | 它不能单独证明什么 |
| --- | --- | --- |
| YukiSU 完整版本与 UAPI | 当前内核暴露的版本，以及管理器/内核 UAPI 是否一致 | 模块、插件或 YukiZygisk 已正常工作 |
| 签名 / SuperKey 标签 | 当前可见的管理器认证路径 | 所有应用都已获得 Root |
| 内核版本 | 当前 UTS 视图中的内核身份；启用 UTS View 时可切换查看原始身份 | 目标镜像的 KMI 一定与显示值相同 |
| `ksud daemon` | APK 内置版本与已安装文件是否一致 | LKM 或启动镜像已经同步更新 |
| 工作模式 | Hook 类型与 LKM 加载方式 | 每个 Hook、daemon 和目标进程都健康 |
| SELinux / Seccomp | 当前系统状态 | 关闭安全机制就能解决某个兼容问题 |
| Zygisk / MetaModule | 当前识别到的实现 | 模块最终行为已经验证 |

### 工作模式怎么读

当前管理器把 Hook 类型与加载方式拼成一行，例如：

```text
TSR Hook | Ramdisk
TSR Hook | ImgPatch
TSR Hook | Lateload
```

- `TSR Hook` 是当前内核报告的 syscall Hook 类型；
- `Ramdisk` 表示从启动 Ramdisk 链路加载；
- `ImgPatch` 表示 LKM 直接嵌入 `boot` 内核镜像；
- `Lateload` 表示本次开机通过 late-load 加载。

这行是“怎么加载”的标识，不是健康检查。真实故障仍要结合完整版本、首条内核错误、`ksud` 日志和目标进程行为判断。

### `ksud` 被替换时

当前管理器会把 APK 内置的 `libksud.so` 与 `/data/adb/ksud` 做实际文件校验，而不只比较版本字符串。检测到不一致时：

- 首页显示警告，并把 `ksud daemon` 标为异常；
- Android 13 及以上在用户授予通知权限后，可以收到安全通知；
- 点开 `ksud daemon` 详情，可查看 APK 内置版本并手动同步内置文件。

警告表示两份二进制不一致，原因仍需调查；不要仅凭警告断言是哪一个应用替换了它。同步只修复设备侧 `ksud`，不会刷新 LKM 或启动镜像。详见[设置与维护](/manager/settings/)。

### 重启菜单

首页右上角电源菜单当前提供：普通重启、软重启、Recovery、Bootloader、Fastbootd、Download 与 EDL；设备声明支持 Android userspace reboot 时还会显示“用户空间重启”。

菜单项会直接发起相应操作，没有统一的二次确认。先确认设备是否支持对应重启目标；特别是 Download/EDL，不同厂商的行为并不一致。“软重启”是 `ksud` 实现的 Android 服务重启，也不等同于 Android 的 userspace reboot。

## 超级用户与 App Profile

超级用户页支持搜索、分类、排序、显示系统应用、批量操作、侧滑授权/撤权和下拉刷新。共享同一 Android UID 的包会作为一组处理，因为内核授权最终按 UID 生效。

点进应用后可选择默认、模板或自定义 Root Profile，也可配置非 Root 模块卸载策略。动态管理器是独立的高权限身份，不等同于普通 Root 授权。详见 [App Profile](/manager/app-profile/)。

## 模块与 MetaModule

模块页可以从本地 ZIP 或模块仓库安装，管理启用、停用、更新和卸载状态，并在模块声明相应入口时运行 `action.sh`、打开 WebUI 或创建桌面快捷方式。模块列表支持下拉刷新和排序。

模块卡片出现只证明模块目录已经写入；脚本、挂载和最终功能往往要到下一次启动阶段才能验证。系统文件挂载仍由单个 MetaModule 后端负责。完整生命周期见[模块系统](/modules/overview/)与 [MetaModule](/modules/meta-module/)。

## YukiZygisk 状态页

首页识别到 YukiZygisk 后可进入专用状态页。当前页面区分：

- 内核注入是否活动、是否进入安全模式；
- Zygote 监控状态与本次会话注入数量；
- Native module 与 Native process 目标各自的真实状态；
- 匿名加载模式、denylist 行为与 dmesg 日志设置。

“已配置 Native 目标”不等于“已经注入”。当前 `yzctl` 会让页面区分未知、失败、崩溃与已注入；未知还可能表示目标已检测/重定向但尚无最终报告。排查时应保存具体行的状态。更多背景见 [YukiZygisk 介绍](/yukizygisk/intro/)。

## LKM 修补与安装

安装页现在同时覆盖传统 Ramdisk 修补、`ImgPatch` 内核直嵌、HTTPS 远程 OTA/factory 镜像提取、当前槽位安装与 OTA 后未使用槽位安装。各路径支持的镜像、备份和配置并不相同，不应只看一个“直接安装”按钮。

开始前阅读 [LKM 修补与安装](/manager/install/)，并准备与当前固件匹配的原厂镜像和可用恢复入口。

## 设置、Feature 与 UTS View

设置页把不同性质的项目分开：

- 内核正式 Feature 位于独立的[功能控制](/manager/feature-control/)页面；
- App Profile 模板、默认模块卸载、SuperKey 保存策略和 [UTS View](/manager/uts-view/)仍在配置区；
- 更新检查、WebUI 引擎、自动同步 `ksud`、自动越狱和模块软重启属于应用/用户空间设置；
- 日志、Umount 路径与永久卸载属于维护工具；
- 语言、主题、DPI、背景和首页显示选项只改变管理器界面。

不要因为选项都长得像开关，就把它们当成同一层功能。Feature、应用偏好、运行时系统状态和下次修补配置的生效时机不同。

## 分区与 Ramdisk 工具

安装页的高级工具入口可以打开分区管理器；它能查看槽位与分区、备份和刷写镜像、运行 AnyKernel3，并为受支持的 `boot`、`init_boot`、`vendor_boot` 打开 Ramdisk Editor。详见[分区与 Ramdisk 工具](/manager/partition/)。

## 一次可靠的日常检查

1. 下拉刷新首页，记录 YukiSU 完整版本、UAPI、`ksud` 与工作模式。
2. 若有 `ksud`、UAPI 或 Root 警告，先解决这一层，再改模块。
3. 只给确实需要的 UID 授权；共享 UID 要整组评估。
4. 查看模块、MetaModule 与插件是否有待重启或错误状态。
5. 变更 Feature、UTS、启动镜像或分区前，先确认它是立即生效、重启生效还是必须重新修补。
6. 高风险操作完成后保存页面输出与日志，并验证对应层的实际行为。

管理器的价值不只是集中按钮，而是把 LKM、认证、`ksud`、授权、模块、插件和注入状态拆开显示。排障时也应按这些边界逐层验证。
