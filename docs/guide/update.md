---
permalink: /guide/update/
title: 更新
---

# 更新 YukiSU

更新 YukiSU 需要分别处理管理器、设备侧 `ksud` 和启动镜像中的 LKM。传统 Ramdisk 的 `ksuinit`、ImgPatch capsule 也随对应安装流程更新。

## 升级到 v1.8.0

从 [v1.8.0 发布页](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0)下载版本码 **10670** 的 APK。保留原厂镜像、App Profile 备份和模块配置，按下文同步 `ksud`、更新匹配 KMI 的 LKM，再完整重启。

- 默认 Root 域改为 `u:r:ksu:s0`；已有自定义域和逐应用标志保留，旧 `su` 策略仍受兼容处理。
- Feature 102 首次迁移会设为开启，即使旧全局值为关闭；迁移完成后的手动设置会保留。检查使用默认 Profile 的应用，详见[App Profile](/manager/app-profile/)。
- WebView 模块卸载改到“超级用户 → WebView Zygote”的非 Root 配置；旧 Feature 5 和已移除的“增强安全”ID 100 不再使用。修改旧启动强制配置或模块脚本时一并移除这两个编号。
- Classic UI 和 Kasumi 激进挂载隐藏已移除。保留普通隐藏配置，并在 [Kasumi](/manager/kasumi/) 页面检查规则保存与应用结果。
- 模拟软重启会先检查恢复能力；请求被接受后还要等待最终恢复结果。更新 LKM 和启动配置必须完整重启，见[软重启](/manager/soft-reboot/)。

## 只更新管理器

- 正式版从 [GitHub Releases](https://github.com/Rouyashiki/YukiSU/releases) 下载；
- 想试 CI 版，再去设置里明确开启 CI 更新。

CI 更新会检查固定公钥对应的 PGP 签名、APK 签名和构建信息，签名用于确认发布来源和文件完整性。日常使用选正式版；需要测试开发中的修复时再切到 CI 版。

装完 APK 后先看首页。管理器会比较内置 `ksud` 与 `/data/adb/ksud` 的实际 ELF，主页可以手动同步。“自动更新 ksud”默认关闭；开启后，只有应用冷启动时已取得内核管理器身份才会检查并同步。尚未认证时会跳过，认证完成后使用手动同步。运行时监视到文件被替换后，还会记录变化并发出完整性警报。

同步 `ksud` 不会替换 LKM、修改启动镜像或重启设备。更新 LKM 时，也要同步配套的 `ksud`，让新命令和资源一起到位。

## 更新 LKM 和启动组件

需要更新内核侧时，重新走管理器的“LKM 修补/安装”：可以写当前槽位、OTA 后的未使用槽位，也可以从本地或远程来源只生成镜像。

开始前确认：

- 新 LKM 匹配当前内核 KMI；
- 内置资源确实包含目标 KMI；当前全量构建覆盖到 `android17-6.18`；
- 分区和 A/B 槽位没选错；
- 原厂启动镜像还在；
- 准备部署的组件来自同一套构建；
- 继续使用 Ramdisk，还是切到只修补 `boot` 的 ImgPatch，已经明确选择。

使用安装页面更新 LKM，不要手工覆盖来源不明的 `.ko`。Ramdisk 从启动 Ramdisk 加载，ImgPatch 从 `boot` 内核的 capsule 加载，两种布局都要更新对应启动镜像。

v1.8.0 的直接安装和 OTA 未使用槽位安装不再把修补镜像复制到 Download。需要保留输出文件时，使用“选择镜像修补”或“下载镜像”；设备直装时保存安装日志和独立原厂备份即可。

ImgPatch 再修补会优先用 capsule 中已有的布局信息原位替换 LKM，不满足复用条件时退回完整分析。传统 Ramdisk 与 ImgPatch 互相切换时，后端会先清除另一种布局留下的内容。没有有效备份时，可以从可验证、可逆的 capsule 恢复；无法安全清理 Magisk Ramdisk、无法恢复 capsule 或重建备份失败时，停止并保存错误。完整流程见[安装与镜像模式](/guide/install-modes/)。

## OTA 后更新

“安装到未使用槽位”只适合这个时间点：OTA 已经完成，但你还没重启切槽。

在页面上核对目标槽位、启动分区和新槽位的 KMI。管理器会从未使用槽位的 `boot` 解析目标 KMI，而不是复用当前运行内核的结果；解析失败时不要手填一个看起来接近的值继续。

OTA 把内核一起换了时，旧槽位能用的 LKM 不一定还能继续用。ImgPatch 仍然只写目标槽位的 `boot`，传统 Ramdisk 则按新槽位实际布局选择 `boot` 或 `init_boot`。

## 配置与模块一起升级时

- 先保留 App Profile 备份、模块列表、挂载后端和启动配置。App Profile 恢复会重新核对应用身份与 UID，不应直接把其他设备的 UID 当作当前授权对象。
- 当前无启用的外部 `metamount.sh` 时使用内置 Kagami；从旧版本升级后应确认实际后端，不再按“必须另装 MetaModule”排查。
- 普通更新在下次启动合并；只有显式支持且满足条件时才使用[热安装](/modules/hot-install/)。preinit 与 init.rc 在下次完整启动生效。
- 修改启动强制 Feature、preinit 或黑名单，需要确认重新修补时保留了所有预期选项。仅配置模式按本次参数重建受管配置，不是增量合并，见[启动配置](/manager/boot-config/)。
- 兼容版本覆盖不是实际升级；排查时记录真实构建与所设覆盖值。

## 更新后验证

完整启动后重新检查 Manager 认证、实际 LKM 与 `ksud`、一项可信应用的 Root、所用挂载后端，以及需要的 YukiZygisk 目标。preinit 先确认文件已准备，再完整重启并查看早期动作日志。

功能入口见[功能概览](/guide/features/)。旧版本没有这些入口时，按上面的步骤更新配套组件。
