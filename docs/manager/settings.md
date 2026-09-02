---
permalink: /manager/settings/
title: 设置与维护
---

# 设置与维护

设置页同时放着内核配置、用户空间行为、维护工具和纯界面偏好。判断一个开关前，先看它由谁执行、何时生效。

## 配置

| 入口 | 当前用途 | 生效边界 |
| --- | --- | --- |
| App Profile 模板 | 同步在线模板，创建/编辑本地模板，从剪贴板导入或导出本地模板 | 被应用选用后才影响对应 UID |
| 功能控制 | 管理界面分组展示的正式 Feature 0–5、100–104 | 各项归属与生效方式不同，见[功能控制](/manager/feature-control/) |
| 不存储 SuperKey | 删除已保存密钥，并禁止以后自动保存 | 只改管理器存储，不会移除 LKM 中的校验值 |
| 开机自动验证 SuperKey | 用户解锁、收到 `BOOT_COMPLETED` 后用已保存密钥尝试一次 | 需要自启动权限；失败不重试 |
| 清除 SuperKey | 删除管理器保存的明文并关闭自动验证 | 不会更换或撤销 LKM 的 SuperKey |
| 默认卸载模块 | 对没有显式 Non-root Profile 的应用设置默认模块卸载策略 | 作用于之后启动的应用；还依赖 Kernel Umount Feature |
| UTS View | 管理原始/当前内核身份、运行时、denylist 与早启动模板 | 见 [UTS View](/manager/uts-view/) |

在线 App Profile 模板来自 KernelSU 模板服务，远程模板在页面中只读。本地模板可编辑和导出；套用之前仍应审查 UID、capability、SELinux 规则与 namespace。

## 应用设置

### 更新检查

- “检查更新”控制打开管理器时的正式版检查；
- “检测 CI 更新”只在更新检查开启时出现，默认关闭，用于经过签名的 nightly Manager 构建；
- APK 更新不会自动替换 LKM、启动镜像或设备侧 `ksud`。

正式版从 [YukiSU Releases](https://github.com/Rouyashiki/YukiSU/releases) 获取。更新层次与校验说明见[更新 YukiSU](/guide/update/)。

### 自动更新 `ksud`

此项默认关闭。开启后，管理器冷启动且已被内核认作管理器时，会比较 APK 内置 `libksud.so` 与 `/data/adb/ksud` 的实际文件；不一致时通过管理器 JNI/驱动 Root 通道原子安装内置版本，并修复 `/data/adb/ksu/bin` 下的工具链接。

不开自动同步时，可点首页的 `ksud daemon` 行查看状态并手动同步。

::: warning 同步范围
这个按钮只替换设备侧 `/data/adb/ksud` 及相关链接。它不会刷 LKM，也不会修改启动镜像。同步后应重新看首页版本和完整运行状态。
:::

### WebUI 引擎

可选择：

- 自动选择；
- 强制 WebUI X；
- 强制 KSU WebUI。

自动模式只在模块配置明确请求 `wx` 时选择 WebUI X；模块未声明或配置不可读时使用 KSU WebUI。模块 WebUI 本身仍是模块提供的高权限界面，不要把引擎选择当成内容安全检查。

### 自动越狱

只在当前为 late-load 模式时可配置。开启后，管理器在开机检测到 SELinux Permissive 时尝试通过 Magica 自动引导 late-load；它需要应用自启动权限。

这不是持久安装，也不是把 SELinux 自动改成 Permissive。实际条件见[越狱模式](/guide/jailbreak-mode/)。

### 使用软重启代替重启

此项用于模块安装、更新、启用、停用或卸载后的完成操作。`ksud soft-reboot` 会：

1. 运行 `emulated-soft-reboot` 阶段；
2. `stop` Android 服务；
3. 重新执行 YukiSU `post-fs-data`；
4. `start` Android 服务；
5. 再执行 service 与 boot-completed 阶段。

内核并没有重新启动，所以它不能应用新 LKM、启动镜像、ImgPatch 配置、早启动 UTS 或要求完整重启的内核状态。late-load 模式会强制模块流程优先使用软重启，因为完整重启会失去本次开机临时加载的 LKM。

首页电源菜单里的 Android “用户空间重启”是平台报告支持时才显示的另一种操作，与 `ksud` 软重启不是同一个实现。

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

自定义错误路径可能卸载正常系统挂载。除非你能解释目标 mount 与 namespace，不要照抄别人的列表。页面把持久配置标为重启生效；“应用配置”只负责把当前配置推给运行内核，无法补救已经启动进程的旧 namespace。

### 卸载 YukiSU

设置页提供两类操作：

- **永久卸载：** 进入卸载刷写流程；
- **恢复原厂镜像：** 尝试使用已保存的 stock image 恢复启动分区。

两者都会修改启动链。执行前先核对备份属于当前固件与槽位，并准备外部恢复方法。

## 更多设置

### 只影响管理器界面

语言、Material 3 / Material 3 Expressive、明暗主题、动态颜色、主题色、应用 DPI、自定义背景、卡片透明度/遮罩，以及首页/模块卡片信息隐藏选项，只改变 Manager 的显示。

简洁模式可能隐藏工作模式、Android 版本、Zygisk/MetaModule 或链接卡片。排障截图前先关闭相应隐藏项，避免把“没显示”误解为“功能不存在”。

### 会改运行系统的高级项

- **SELinux：** 直接执行 `setenforce 1/0` 改当前运行状态；不是持久配置。切到 Permissive 会显著削弱系统隔离。
- **允许授权任何应用为动态管理器：** 只让所有应用的 App Profile 都显示“设为动态管理器”开关，不会自动信任所有应用。真正授权后，该应用获得管理器身份，风险高于普通 Root grant。
- **WebView 调试 / Eruda：** 仅 debug APK 显示；release 构建会移除这些开发工具及 Eruda 资源。

动态管理器与普通 App Profile 的区别见 [App Profile](/manager/app-profile/)。

## `ksud` 完整性警报

设备启动后的 `ksud` monitor 会关注 `/data/adb/ksud` 所在目录，包括原子替换这种只盯旧 inode 容易漏掉的变化。管理器收到事件后会重新校验实际文件，而不是相信广播内容。

出现警报时建议：

1. 记录管理器内置版本、已安装侧的“未知/不一致”原始状态与警报时间；若读取 `/data/adb/ksu/ksud-integrity.json`，再保留其中的 baseline/current SHA-256 和 reason，但不要为取版本而执行可疑 daemon；
2. 查最近安装/更新过的 Root 管理器、脚本和模块；
3. 需要恢复时从首页 daemon 详情同步当前 APK 内置版本；
4. 同步后重新检查 Root、模块、插件和 YukiZygisk，而不是只看警报消失。

若你本来就在有意运行自编译 `ksud`，不一致是预期结果；应让 APK 与 daemon 来自同一构建，而不是长期忽略警报。
