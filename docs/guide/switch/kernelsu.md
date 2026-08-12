---
permalink: /guide/switch/kernelsu/
title: 从 KernelSU 切换
---

# 从 KernelSU 切换

先放心：不用清空 `/data/adb`，不用把模块全卸了，也不用迁移完再一个个装回来。你只要先弄清楚现在用的是 built-in KernelSU 还是 KernelSU LKM。

::: info 关键思路
先把 YukiSU 管理器安装到当前 KernelSU 环境，并由 KernelSU 授予它 Root。这样 YukiSU 管理器就能在当前开机周期内完成镜像恢复或直接安装。
:::

## 开始前准备

准备这些就够了：

- 设备属于 YukiSU 支持的 ARM64、GKI 2.0、Linux 5.10+ 范围；
- 已安装最新 YukiSU 管理器；
- 有匹配当前内核 KMI 的 YukiSU LKM；
- 如果当前是 built-in KernelSU，准备与当前固件完全匹配的原厂 boot；
- 保留正常的 bootloader / fastboot 恢复手段。

在 KernelSU 管理器中给 YukiSU 管理器授予 Root。首次迁移使用默认 APK 签名认证即可，不需要设置 SuperKey。

## 当前是 built-in KernelSU

这里指 KernelSU 已经编入当前启动内核，例如 `CONFIG_KSU=y` 或替换 GKI 内核的安装方式。

1. 安装 YukiSU 管理器，并在 KernelSU 管理器中授予它 Root；
2. 使用 KernelSU 的恢复功能还原当前固件的原厂 boot；
3. **还原完成后不要重启；**
4. 直接打开 YukiSU 管理器，选择直接安装，让它把匹配 KMI 的 YukiSU LKM 安装到刚恢复的启动镜像；
5. 安装完成后重启。

关键就是**还原后别急着重启**。磁盘上的 boot 已经恢复了，但内存里跑的还是 KernelSU 内核，刚授予 YukiSU 管理器的 Root 也还在。趁这一轮直接把 YukiSU 装好，再重启，一步到位。

::: warning
还原的 boot 必须与当前固件和槽位匹配。不要使用同机型旧版本镜像，也不要在 OTA 槽位状态不明时猜测目标。
:::

## 当前是 KernelSU LKM

LKM 切换更简单：**不需要先还原镜像，也不需要卸载现有 KernelSU LKM。**

1. 安装 YukiSU 管理器；
2. 在 KernelSU 管理器中授予 YukiSU 管理器 Root；
3. 在 YukiSU 管理器中选择匹配 KMI 的 LKM并直接安装；
4. 安装完成后重启。

YukiSU 会直接替换启动镜像里的 LKM 并更新用户空间，没必要先还原再修补，白绕一圈。

## 模块、MetaModule 与配置怎么办

基本都能原样留下：

| 内容 | 迁移处理 |
| --- | --- |
| 普通 KernelSU 模块 | 保留；YukiSU 按上游生命周期继续处理 |
| MetaModule | 保留；YukiSU 完全遵循上游 MetaModule 接口与顺序 |
| 模块配置 | 保留在原位置，无需批量导出重建 |
| Root 授权 / App Profile | 数据通常会继续存在；迁移后在管理器中确认即可 |
| Zygisk Next 与其模块 | 可以继续使用；若改用 YukiZygisk，再按需停用外部方案，避免同时启用两套运行时 |
| KernelSU 管理器 | 确认 YukiSU 正常后即可卸载 |

别因为换了 Root 就顺手重装 MetaModule。只有模块自己绑定了某个 Android 版本、内核、挂载后端或私有接口时，才需要单独处理。

## 重启后确认

重启后看几眼就行：

- YukiSU 管理器显示已安装，LKM、`ksud` 与管理器版本合理；
- 已授权应用可以正常请求 Root；
- MetaModule 和普通模块状态仍在；
- 需要系统文件挂载的模块实际生效；
- 如果启用 YukiZygisk，单独确认其状态与模块加载结果。

都正常的话，就可以卸载旧 KernelSU 管理器了。它在迁移过程中只是负责“借”一次 Root 给 YukiSU 管理器，任务已经完成。

## 安装没有继续时

如果 YukiSU 管理器报告 KMI 不匹配、找不到合适 LKM、目标分区不明确或镜像校验失败，应停在当前步骤并核对设备与固件信息。不要关闭版本检查或强行加载不匹配模块。

若设备本身是厂商或自编译内核中的非标准 KernelSU 集成，也无法通过恢复普通 boot 去掉旧实现，应先切换到不包含旧 KernelSU 的兼容内核，再安装 YukiSU。

还没有决定是否切换时，可先看 [YukiSU 与 KernelSU 的区别](/guide/yukisu-vs-kernelsu/)；需要恢复启动链时，参考[救砖与恢复](/guide/rescue-bootloop/)。
