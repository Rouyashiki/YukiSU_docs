---
permalink: /manager/boot-config/
title: 启动配置
---

# 启动配置

安装页选择修补方式后，展开“高级选项”可设置启动行为。这些设置写入**本次生成或安装的镜像**，不会立即改变当前内核。写入正确分区和槽位并完整重启后才应检查结果。

## 强制功能

每项可选择“不锁定”“强制开启”或“强制关闭”：

| 功能 | 参数名 | ID |
| --- | --- | --- |
| 传统 su 兼容 | `su_compat` | 0 |
| Kernel Umount | `kernel_umount` | 1 |
| 超级用户日志 | `sulog` | 2 |
| ADB Root | `adb_root` | 3 |
| SELinux 隐藏 | `selinux_hide` | 4 |
| Shell 仅限可信会话提权 | `shell_su_adb_only` | 6 |

启动锁定支持上述六项。值直接对应内核的 `0/1`；例如 `kernel_umount=0` 表示关闭卸载机制，不能按运行时界面“关闭内核 umount”的反向标签理解。

强制值在本次启动中锁定，功能控制页显示强制状态并拒绝修改。选择“不锁定”只是修改下一份镜像的配置，必须重新修补并重启才解除旧锁定。不要通过反复保存运行时设置尝试覆盖。

## 禁用模块早启动行为

- **禁用模块 preinit：** 跳过模块在 SELinux 加载前运行的动作。
- **禁用模块 init.rc：** 不加载模块提供的自定义 `init.rc`。

两项独立，不等于禁用所有模块，也不等于删除模块。排查已定位的早启动故障时，开启对应的“禁用”选项，阻止该阶段的模块动作；普通 `post-fs-data.sh`、`service.sh` 和模块挂载不受这两个开关直接控制。

模块页菜单还提供“模块 preinit”状态，显示内核支持、启动计数、保护状态与模块条目。卡片用 `unsupported` 表示内核不支持、`no_space` 表示空间不足、`error` 表示同步失败、`bootloop` 表示触发保护。读取失败时先保存命令错误，恢复 `ksud` 通信后刷新。

先修复或禁用故障模块，再考虑“重置启动计数”。重置只允许下一次符合条件的启动重试，不会立即执行 preinit，也不能绕过镜像中禁用 preinit 的配置。

## 启动时阻止内核模块

“阻止内核模块”默认关闭。管理器可能预填当前已加载的候选名称，**预填不代表启用**；只有显式开启才会把列表传入本次修补。

这里的“模块”指 `.ko` 内核模块，不是模块页的 KernelSU ZIP。列表最终进入内核原生 `module_blacklist` 机制，阻止后续相应模块加载，不能卸载当前已加载模块，也不能禁止已经编进内核的功能。阻止必要的存储、显示或网络驱动可能导致无法启动或硬件失效。

不要把自动填入的名称整体当作推荐列表。只保留已经确认需要阻止的项，先准备可恢复的原镜像。

## 仅更新 ramdisk 配置

此模式仅在“选择需要修补的镜像”流程提供，并与 ImgPatch 内核直嵌互斥。它调用 `boot-patch --no-install`：

- 保留镜像原有的 init、LKM 与 SuperKey，不安装或替换 init/LKM；已有加载链仍可在启动时加载原 LKM；
- 配置修补跳过自动 KMI 选择；新选项仍要求镜像内原有 LKM 支持对应启动参数；
- 根据本次选项重写已知启动设置，包括 shell 授权、模块 rc、preinit、强制 Feature 与内核模块阻止列表；
- 未指定新的 UTS 启动模板时保留原有 UTS 参数；指定时会验证原有 Ramdisk LKM 是否支持；
- 不用于修改 ImgPatch capsule 中的启动配置。

::: warning 这是替换已知设置，不是仅切换一项
页面未自动导入镜像内所有旧选项。再次修补时应完整核对本次希望保留的启动设置，否则旧的 shell 授权、强制值或阻止列表可能被清除。选择此模式也不会为一个完全没有 YukiSU 启动链的镜像安装 Root。
:::

结果仍是输出镜像文件，不会因勾选此项自动刷写。刷入后检查实际功能值、锁定状态、preinit 状态及启动日志。

## 与其他安装选项的关系

“总是给 shell Root”是授权策略，“强制启用 ADB”会改变调试入口，而 `adb_root` 决定 daemon 身份，`shell_su_adb_only` 进一步约束 shell 会话。四者不能互相替代。SuperKey 与早启动 UTS 也各有独立配置：见 [LKM 修补与安装](/manager/install/)、[SuperKey](/manager/superkey/)和 [UTS View](/manager/uts-view/)。

Ramdisk 路径将模块启动参数写入 Ramdisk 配置；ImgPatch 使用 capsule 的模块参数及相应内嵌配置。使用旧版或第三方 LKM 时，先检查它是否接受所选参数；启动后在功能控制页检查值与锁定状态，失败时保留内核日志。

## 源码

[安装页](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt)、[启动选项](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/BootConfigOptions.kt)、[Ramdisk 修补](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp)、[preinit 状态界面](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/ModulePreinitDialog.kt)。
