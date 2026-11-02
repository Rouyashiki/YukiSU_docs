---
permalink: /manager/settings/
title: 设置与维护
---

# 设置与维护

设置页提供功能控制、App Profile 模板、SuperKey、UTS View、日志和卸载工具。下表列出各项的作用和生效时间。

## 配置

| 入口 | 用途 | 生效时间与条件 |
| --- | --- | --- |
| App Profile 模板 | 同步在线模板，创建/编辑本地模板，从剪贴板导入或导出本地模板 | 被应用选用后才影响对应 UID |
| 功能控制 | 13 项 Feature：0–4、6、101–107，包括 su 模式、Kasumi 与挂载视图整理 | 各项生效时间见[功能控制](/manager/feature-control/) |
| 不存储 SuperKey | 删除已保存密钥，并禁止以后自动保存 | 只改管理器存储，不会移除 LKM 中的校验值 |
| 开机自动验证 SuperKey | 用户解锁、收到 `BOOT_COMPLETED` 后用已保存密钥尝试一次 | 需要自启动权限；失败不重试 |
| 清除 SuperKey | 删除管理器保存的明文并关闭自动验证 | 不会更换或撤销 LKM 的 SuperKey |
| 默认卸载模块 | 对没有显式 Non-root Profile 的应用设置默认模块卸载策略 | 作用于之后启动的应用；还依赖 Kernel Umount Feature |
| UTS View | 管理原始/当前内核身份、运行时、denylist 与早启动模板 | 见 [UTS View](/manager/uts-view/) |
| 内置挂载 | 使用内置 Kagami 引擎规划模块挂载 | 默认开启，完整重启生效；外部挂载所有者优先，见 [Kasumi](/manager/kasumi/) |

在线 App Profile 模板来自 KernelSU 模板服务，远程模板在页面中只读。本地模板可编辑和导出；套用之前仍应审查 UID、capability、SELinux 规则与 namespace。

## 应用设置

### 更新检查

- “检查更新”控制打开管理器时的正式版检查；
- “检测 CI 更新”只在更新检查开启时出现，默认关闭，用于经过签名的 nightly Manager 构建；
- APK 更新不会刷写 LKM 或启动镜像；设备侧 `ksud` 需要手动同步，或开启下方的自动更新功能。

正式版从 [YukiSU Releases](https://github.com/Rouyashiki/YukiSU/releases) 获取。更新层次与校验说明见[更新 YukiSU](/guide/update/)。

### 自动更新 `ksud`

此项默认关闭。开启后，管理器冷启动且已被内核认作管理器时，会比较 APK 内置 `libksud.so` 与 `/data/adb/ksud` 的实际文件；不一致时通过管理器 JNI/驱动 Root 通道原子安装内置版本，并修复 `/data/adb/ksu/bin` 下的工具链接。

不开自动同步时，可点首页的 `ksud daemon` 行查看状态并手动同步。

::: warning 同步范围
这个按钮只替换设备侧 `/data/adb/ksud` 及相关链接。它不会刷 LKM，也不会修改启动镜像。同步后刷新首页，确认 daemon 状态已与 APK 一致，再检查 Root 和模块功能。
:::

### WebUI 引擎

可选择：

- 自动选择；
- 强制 WebUI X；
- 强制 KSU WebUI。

自动模式只在模块配置明确请求 `wx` 时选择 WebUI X；模块未声明或配置不可读时使用 KSU WebUI。两种引擎都运行模块提供的高权限界面；只打开受信任模块的 WebUI。

### 自动越狱

只在当前为 late-load 模式时可配置。开启后，管理器在开机检测到 SELinux Permissive 时尝试通过 Magica 自动引导 late-load；它需要应用自启动权限。

这不是持久安装，也不是把 SELinux 自动改成 Permissive。实际条件见[越狱模式](/guide/jailbreak-mode/)。

### 使用软重启代替重启

此项默认关闭，决定模块安装、更新、启停或卸载后的完成按钮是否优先使用软重启。late-load 模式在支持软重启时优先使用它，以保留当前加载的 LKM。

v1.8.0 从设备侧 daemon 查询支持条件，符合条件的 Kasumi 也能软重启。操作会等待旧 Android 服务退出、重建挂载并恢复隐藏规则，再启动 Android。页面的“请求已接受”表示后台流程开始；返回管理器查看最终完成、等待规则或失败状态。

新 LKM、启动镜像、ImgPatch 与早启动 UTS 仍须完整重启。支持条件、日志路径和失败处理见[软重启](/manager/soft-reboot/)。电源菜单的 Android“用户空间重启”是另一种平台操作。

## 工具

### 日志与 bugreport

“发送日志”可以保存或分享 `YukiSU_bugreport_*.tar.gz`。开启 Superuser logging Feature 后，还会出现使用日志查看器，支持：

- 选择当前或历史日志文件；
- 按 UID、命令或详情搜索；
- 按事件类型过滤并排除当前应用/查看器自刷新事件；
- 查看原始记录、分页加载；
- 清空当前文件或删除历史文件。

清空和删除不可恢复。提交问题前保留原始压缩包，不要只截一行筛选结果。

### Umount 路径管理

这里管理内核模块卸载路径及 flags（`0` 为普通卸载，`2` 为 `MNT_DETACH`），支持添加、删除、清除自定义路径、保存和把配置应用到当前内核。

先在目标应用的 mount namespace 中确认待卸载路径；填入系统正常使用的挂载点会使应用失去相应文件。保存配置后完整重启。“应用配置”可立即更新运行内核的列表，但已启动的应用仍需彻底结束后重新启动。

### 卸载 YukiSU

设置页提供两类操作：

- **永久卸载：** 进入卸载刷写流程；
- **恢复原厂镜像：** 尝试使用已保存的 stock image 恢复启动分区。

两者都会修改启动链。执行前准备当前固件和目标槽位的原厂镜像，并确认设备可通过 bootloader 或 Recovery 恢复。

## 模块页的维护选项

模块页菜单还集中提供以下入口：

- **模块兼容设置：** 全局覆盖模块脚本读到的 ksud 版本码、内核版本码、UAPI 与 ksud 版本名称。默认关闭，空值或 0 使用真实值，下次执行脚本时生效；不会补齐缺失的 API。
- **模块 preinit：** 读取支持状态、启动计数和各模块状态；先修复故障模块再重置计数，重置不会立即运行 preinit。
- **挂载筛选与冲突检查：** 比较配置策略、活动 Kasumi 模块和重复目标路径。

这些不是动态管理器的“兼容设置”：后者按 APK 签名控制管理器查询到的版本视图。分别见 [App Profile](/manager/app-profile/)、[启动配置](/manager/boot-config/)和 [Kasumi](/manager/kasumi/)。

## 更多设置

### 只影响管理器界面

v1.8.0 统一使用 Material 3 Expressive，已移除 Classic/Expressive 选择。语言、明暗主题、动态颜色、主题色、应用 DPI、自定义背景、卡片透明度/遮罩及卡片信息隐藏只改变管理器显示。

“动效强度”可选关闭、柔和或 Q弹，默认 Q弹；“切页动效”可选点击展开或经典弹簧滑入，默认点击展开。调整立即作用于后续界面交互，无须重启设备。

更多设置还提供“预测性返回手势”，默认关闭；它控制返回时的页面预览，不改变内核行为。

简洁模式及对应隐藏项会隐藏工作模式、Android 版本、Zygisk/MetaModule 或链接卡片。排障时关闭相应隐藏项，再保存首页截图。

### 会改运行系统的高级项

- **SELinux：** 直接执行 `setenforce 1/0` 改当前运行状态；不是持久配置。切到 Permissive 会显著削弱系统隔离。
- **允许授权任何应用为动态管理器：** 只让所有应用的 App Profile 都显示“设为动态管理器”开关，不会自动信任所有应用。真正授权后，该应用获得管理器身份，风险高于普通 Root grant。
- **WebView 调试 / Eruda：** 仅 debug APK 显示；release 构建会移除这些开发工具及 Eruda 资源。

动态管理器与普通 App Profile 的区别见 [App Profile](/manager/app-profile/)。

## `ksud` 完整性警报

设备启动后，`ksud` monitor 监视 `/data/adb/ksud` 所在目录。文件被修改或原子替换时，管理器重新校验文件并报告与 APK 内置版本的差异。

出现警报后：

1. 记录管理器内置版本、已安装侧的“未知/不一致”原始状态与警报时间；若读取 `/data/adb/ksu/ksud-integrity.json`，再保留其中的 baseline/current SHA-256 和 reason，但不要为取版本而执行可疑 daemon；
2. 查最近安装/更新过的 Root 管理器、脚本和模块；
3. 从首页 daemon 详情同步当前 APK 内置版本；
4. 同步后刷新 daemon 状态，并测试 Root、模块、插件和 YukiZygisk。

使用自编译 `ksud` 时，请同时安装同一构建产出的 APK；不同构建的文件不一致会触发警报。

## 源码

[Settings.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Settings.kt)、[SoftReboot.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/SoftReboot.kt)、[Module.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Module.kt)。

[Theme.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/theme/Theme.kt), [YukiMotion.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/motion/YukiMotion.kt).
