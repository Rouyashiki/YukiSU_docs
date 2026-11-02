---
permalink: /manager/overview/
title: 管理器概览
---

# YukiSU 管理器

YukiSU Manager 用来授权 Root、管理模块与插件、修补启动镜像。最低支持 Android 12（API 31）。

首次安装先按[快速开始](/guide/get-started/)配置 LKM。设备加载 YukiSU 后，管理器通过 APK 签名或 SuperKey 认证，再通过内核接口管理授权，通过 `ksud` 执行模块、修补和维护命令。

```text
界面操作
   ↓
YukiSU Manager
   ├─ 驱动 / ioctl ─→ kernelsu.ko
   └─ ksud 命令 ───→ 安装、模块、插件与维护功能
```

安装后先刷新首页，检查内核认证、UAPI 和 `ksud` 状态。

## 五个主页面

底部导航从左到右为：

| 页面 | 主要用途 | 是否需要可用的 YukiSU Root 链路 |
| --- | --- | --- |
| 首页 | 查看版本、认证、工作模式、守护进程和运行状态 | 查看基础设备信息不需要；管理操作需要 |
| 插件 | 安装与管理由 `ksud` 运行的 Lua 插件 | 需要 |
| 超级用户 | 管理应用 Root、非 Root Profile 与动态管理器 | 需要 |
| 模块 | 安装、更新、启停模块，进入仓库、Action、WebUI 与快捷方式 | 需要 |
| 设置 | Feature、认证、更新、诊断、卸载和界面设置 | 部分项目需要 |

插件的安装、启停与配置见 [Lua 插件管理](/manager/plugins/)。

## 首页状态与处理方法

下拉刷新首页后，按下表处理异常：

| 首页内容 | 显示内容 | 操作 |
| --- | --- | --- |
| YukiSU 完整版本与 UAPI | 已加载内核版本、管理器与内核接口版本 | UAPI 不匹配时，安装同一版本配套的 APK、LKM 和 `ksud` |
| 签名 / SuperKey 标签 | 管理器认证方式 | 未认证时检查 APK 来源；私有构建按 SuperKey 配置认证 |
| 内核版本 | UTS 身份，支持切换查看原始身份 | 选择 LKM 时使用目标镜像 KMI；启用 UTS View 后不要照抄 `uname` |
| `ksud daemon` | 内置与设备侧文件的一致性 | 点开详情，查看异常并手动同步内置版本 |
| 工作模式 | Hook 类型与 LKM 加载方式 | 更新后检查是否为预期的 Ramdisk、ImgPatch 或 Lateload |
| SELinux / Seccomp | 系统隔离状态 | 排障时记录原始状态，不随意关闭 |
| Zygisk / MetaModule | 已识别的注入实现或外部挂载后端 | 点击详情检查注入状态；文件挂载问题转到 Kasumi 或后端日志 |

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

更新 LKM 后，检查这行是否与安装方式一致。无法启动或加载失败时，保留内核中的第一条错误和 `ksud` 日志。

### `ksud` 被替换时

当前管理器会把 APK 内置的 `libksud.so` 与 `/data/adb/ksud` 做实际文件校验，而不只比较版本字符串。检测到不一致时：

- 首页显示警告，并把 `ksud daemon` 标为异常；
- Android 13 及以上在用户授予通知权限后，可以收到安全通知；
- 点开 `ksud daemon` 详情，可查看 APK 内置版本并手动同步内置文件。

出现不一致警告后，先检查最近安装的 Root 管理器、模块或脚本。恢复时在详情中同步 APK 内置版本；LKM 和启动镜像需要分别更新。详见[设置与维护](/manager/settings/)。

### 重启菜单

首页右上角电源菜单提供普通重启、Recovery、Bootloader、Fastbootd、Download 与 EDL；设备声明支持 Android userspace reboot 时还会显示“用户空间重启”。软重启在设备侧 daemon 报告支持时显示；v1.8.0 支持满足恢复条件的 Kasumi 软重启。操作后返回首页查看完成或失败结果，见[软重启](/manager/soft-reboot/)。

大部分菜单项直接发起相应操作；late-load 模式的普通完整重启会先提示临时 Root 将丢失。先确认设备是否支持对应重启目标；特别是 Download/EDL，不同厂商的行为并不一致。“软重启”是 `ksud` 实现的 Android 服务重启，也不等同于 Android 的 userspace reboot。

## 超级用户与 App Profile

超级用户页支持搜索、分类、排序、显示系统应用、批量操作、侧滑授权/撤权和下拉刷新。共享同一 Android UID 的包会作为一组处理，因为内核授权最终按 UID 生效。

v1.8.0 会枚举主用户、次用户与工作资料中的应用，按完整 UID 分别管理；WebView Zygote 有独立的 Non-root Profile 条目。点进应用后可选择默认、模板或自定义 Root Profile，也可配置非 Root 模块卸载策略。动态管理器是独立的高权限身份，不等同于普通 Root 授权。详见 [App Profile](/manager/app-profile/)。

## 模块与 MetaModule

模块页可以从本地 ZIP 或模块仓库安装，管理启用、停用、更新和卸载状态，并在模块声明相应入口时运行 `action.sh`、打开 WebUI 或创建桌面快捷方式。模块列表支持下拉刷新和排序。

普通安装完成后使用页面提供的重启操作，让待更新目录、启动脚本和挂载生效；软重启可用时也能执行这套流程。系统文件挂载可由内置 Kagami 引擎或外部 MetaModule 负责，需确认当前挂载所有者。完整生命周期见[模块系统](/modules/overview/)与 [MetaModule](/modules/meta-module/)。

模块仓库与本地 ZIP 还可运行一次性脚本；支持热安装的模块有独立安装行为，不能据此假定所有模块都无需重启。模块菜单新增全局版本兼容、preinit 状态/计数重置与挂载冲突检查。见[模块系统](/modules/overview/)和[设置与维护](/manager/settings/)。

## Kasumi

首页右上角可进入 Kasumi 的状态、设置、规则和日志页面。它显示内核能力、实际挂载策略与视图状态；模块卡片可单独配置挂载模式及路径规则。Feature 106、“内置挂载”和运行时视图不是同一开关，见 [Kasumi 与挂载配置](/manager/kasumi/)。

## YukiZygisk 状态页

首页识别到 YukiZygisk 后可进入专用状态页。当前页面区分：

- 内核注入是否活动、是否进入安全模式；
- Zygote 监控状态与本次会话注入数量；
- Native module 与 Native process 目标各自的真实状态；
- 匿名加载模式、denylist 行为与 dmesg 日志设置。

页面区分未知、失败、崩溃与已注入。未知表示尚未收到最终报告；目标即使已检测或重定向，也会保持未知。排查失败或崩溃时，记录具体目标、PID 和状态行。更多背景见 [YukiZygisk 介绍](/yukizygisk/intro/)。

## LKM 修补与安装

安装页现在同时覆盖传统 Ramdisk 修补、`ImgPatch` 内核直嵌、HTTPS 远程 OTA/factory 镜像提取、当前槽位安装与 OTA 后未使用槽位安装。各路径支持的镜像、备份和配置并不相同。高级选项新增[启动配置](/manager/boot-config/)，可锁定部分 Feature、限制早启动模块行为、阻止指定内核模块，以及只更新本地镜像的 Ramdisk 配置。

开始前阅读 [LKM 修补与安装](/manager/install/)，并准备与当前固件匹配的原厂镜像和可用恢复入口。

## 设置、Feature 与 UTS View

设置页把不同性质的项目分开：

- 内核正式 Feature 位于独立的[功能控制](/manager/feature-control/)页面；
- App Profile 模板、默认模块卸载、SuperKey 保存策略和 [UTS View](/manager/uts-view/)仍在配置区；
- 更新检查、WebUI 引擎、自动同步 `ksud`、自动越狱和模块软重启属于应用/用户空间设置；
- 日志、Umount 路径与永久卸载属于维护工具；
- 语言、主题、DPI、背景和首页显示选项只改变管理器界面。

修改前看清生效时间：界面偏好立即应用；启动配置需要重新修补和完整重启；按应用视图需要重启目标应用。

## 分区与 Ramdisk 工具

安装页的高级工具入口可以打开分区管理器；它能查看槽位与分区、备份和刷写镜像、运行 AnyKernel3，管理 `vbmeta` 的 AVB/dm-verity 标志，并为受支持的 `boot`、`init_boot`、`vendor_boot`、`recovery` 打开 Ramdisk Editor。编辑器支持文本与十六进制编辑、文件校验值和分享。详见[分区与 Ramdisk 工具](/manager/partition/)。

## 一次可靠的日常检查

1. 下拉刷新首页，记录 YukiSU 完整版本、UAPI、`ksud` 与工作模式。
2. 若有 `ksud`、UAPI 或 Root 警告，先解决这一层，再改模块。
3. 只给确实需要的 UID 授权；共享 UID 要整组评估。
4. 查看模块、MetaModule 与插件是否有待重启或错误状态。
5. 变更 Feature、UTS、启动镜像或分区前，先确认它是立即生效、重启生效还是必须重新修补。
6. 高风险操作完成后保存页面输出与日志，并验证对应层的实际行为。

遇到故障时，先处理首页的认证、UAPI 或 `ksud` 错误，再检查模块和注入状态。

## 源码

[Home.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Home.kt)、[Module.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Module.kt)。
