---
permalink: /guide/switch/apatch/
title: 从 APatch 切换
---

# 从 APatch 切换

APatch 走 KernelPatch，YukiSU 走 KernelSU LKM。内核方案都不一样，不能只换个管理器就完成迁移。

## 建议流程

1. 备份 APatch 配置、模块列表和当前固件原厂启动镜像
2. 停用 APatch/KPM 模块并确认设备仍可启动
3. 使用 APatch 自身流程卸载，或恢复它修改过的正确启动分区
4. 设备恢复正常、且满足 [Android 12+/ARM64 GKI 2.0 范围](/guide/compatibility/)后，再按[快速开始](/guide/get-started/)安装 YukiSU

YukiSU 的 SuperKey 只用于认证管理器 UID，不是应用 Root 密码。迁移时重新按 YukiSU 的认证方式配置，不要直接复制 APatch 的密钥设置、内核补丁或管理器；KPM 也不能作为 YukiSU 模块安装。

APatch 与 YukiSU ImgPatch 都会涉及 `boot` 内核，但 capsule、加载器和恢复元数据完全不同。不要把带 KernelPatch/KPM 的内核直接当成 YukiSU ImgPatch 原厂输入；先按 APatch 流程恢复，再选择 YukiSU 的 [Ramdisk 或 ImgPatch 布局](/guide/install-modes/)。
