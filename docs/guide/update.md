---
permalink: /guide/update/
title: 更新
---

# 更新 YukiSU

YukiSU 不是“更新一个 APK，全家一起升级”。管理器、设备里的 `ksud`、传统 Ramdisk 中的 `ksuinit`、ImgPatch capsule 与 LKM 都是不同组件。

## 只更新管理器

- 正式版从 [GitHub Releases](https://github.com/Rouyashiki/YukiSU/releases) 下载；
- 想试 CI 版，再去设置里明确开启 CI 更新。

CI 更新会检查固定公钥对应的 PGP 签名、APK 签名和构建信息，但测试版就是测试版，签名校验通过不等于它和正式版一样稳。

装完 APK 后先看首页。管理器会比较内置 `ksud` 与 `/data/adb/ksud` 的实际 ELF：主页可以手动同步；“自动更新 ksud”在应用冷启动时同步，默认关闭。运行时监视到文件被替换后，还会留下证据并发出完整性警报。

同步 `ksud` 不会替换 LKM、修改启动镜像或重启设备。反过来，只更新 LKM 也不能证明设备上的 `ksud` 已包含配套资源和命令。

## 更新 LKM 和启动组件

需要更新内核侧时，重新走管理器的“LKM 修补/安装”：可以写当前槽位、OTA 后的未使用槽位，也可以从本地或远程来源只生成镜像。

开始前确认：

- 新 LKM 匹配当前内核 KMI；
- 内置资源确实包含目标 KMI；当前全量构建覆盖到 `android17-6.18`；
- 分区和 A/B 槽位没选错；
- 原厂启动镜像还在；
- 准备部署的组件来自同一套构建；
- 继续使用 Ramdisk，还是切到只修补 `boot` 的 ImgPatch，已经明确选择。

不要把“随便替换某个 `.ko` 然后重启”当成通用更新法。LKM 实际放在哪、由谁加载，取决于当前启动镜像里的安装布局。

ImgPatch 再修补会优先用 capsule 中已有的布局信息原位替换 LKM，不满足复用条件时退回完整分析。传统 Ramdisk 与 ImgPatch 互相切换时，后端会先清除另一种布局留下的内容；检测到无法安全清理的 Magisk Ramdisk、无效备份或不可验证 capsule 时应停止。完整边界见[安装与镜像模式](/guide/install-modes/)。

## OTA 后更新

“安装到未使用槽位”只适合这个时间点：OTA 已经完成，但你还没重启切槽。

在页面上核对目标槽位、启动分区和新槽位的 KMI。管理器会从未使用槽位的 `boot` 解析目标 KMI，而不是复用当前运行内核的结果；解析失败时不要手填一个看起来接近的值继续。

OTA 把内核一起换了时，旧槽位能用的 LKM 不一定还能继续用。ImgPatch 仍然只写目标槽位的 `boot`，传统 Ramdisk 则按新槽位实际布局选择 `boot` 或 `init_boot`。
