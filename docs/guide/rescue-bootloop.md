---
permalink: /guide/rescue-bootloop/
title: 救砖与恢复
---

# 救砖与恢复

先记录最后修改的镜像、分区、槽位或模块，不要靠反复刷写不同镜像判断原因。普通模块问题先用安全模式；preinit 问题清理早期快照；镜像或 LKM 问题恢复对应启动分区。

## Android 还能启动

1. 先导出诊断、安装输出和相关模块状态。
2. 普通模块问题先禁用最近修改的模块，再按其要求完整重启。
3. preinit 问题先查看模块页的“模块 preinit”，修复或禁用问题模块，再考虑重置保护计数。
4. 镜像或 LKM 问题使用已验证的原厂备份恢复，或者准备外部恢复流程。

“恢复原厂镜像”主要处理启动链；“永久卸载”还会移除 YukiSU 用户空间与模块环境。两者目的和数据影响不同。不要把清空 `/data/adb` 作为默认排查步骤。

v1.8.0 的永久卸载先恢复启动镜像，成功后才运行模块卸载脚本并清理用户空间、init rc 与 preinit 残留。恢复失败会停止流程，此时先保留错误、备份和工具，处理镜像恢复问题后再卸载。临时卸载 LKM 的 `ksud unload` 不会恢复磁盘上的启动镜像，不能替代永久卸载。

## 普通模块导致启动异常：安全模式

启动早期连续按音量减键至少 **3 次**。内核在检测窗口内收到三次事件后，会进入安全模式。设备没有响应时，不要反复重启；继续按下面的 preinit 或镜像恢复步骤处理。

`ksud` 检测安全模式后，会禁用模块并跳过普通模块阶段与内置挂载。系统提供的安全模式属性也会被识别。成功进入系统后检查实际禁用状态，只逐个恢复已确认安全的模块。

安全模式不会移除错误 LKM、恢复坏镜像，也无法撤销更早阶段已经执行的 preinit 动作。late-load 赶不上启动音量键检测，不适用这条引导路径。

## preinit 导致更早的启动失败

preinit 在 SELinux setup 之前运行，早于普通模块阶段。runner 执行动作前增加启动计数，成功完成启动后由 `ksud` 清零；连续三次未完成启动后，后续启动会跳过 preinit，并保持保护状态直到有效内容变化或手动重置。

如果设备仍不能启动，需要使用可访问相应分区的 Recovery，或设备支持的原厂镜像临时启动方式。只移除实际存在的 **YukiSU preinit 快照目录**，候选位置为：

- `/metadata/vold/ksu/preinit`
- `/metadata/watchdog/ksu/preinit`
- `/metadata/ksu/preinit`

不要删除整个 `/metadata`、`vold` 或其他加密/OTA 数据。这一操作移除准备的快照，不会自动修复 `/data/adb/modules/` 中的源模块；正常启动后应先禁用或修复来源，避免再次同步。

管理器的重置计数只是允许未来启动重试，不会立即执行动作，也不是修复。若完全不需要 preinit，可以在支持的安装流程中用 `--no-preinit` 重新配置启动镜像。详见[preinit](/modules/preinit/)和[启动配置](/manager/boot-config/)。

## 刷写镜像或更新 LKM 后无法启动

1. 确认当前活动槽位、最后写入的分区和所选模式。
2. 准备**同一设备、同一固件版本**的原厂镜像。
3. 使用设备支持的 bootloader fastboot、Recovery 或厂商恢复流程写回正确目标。
4. 不确定槽位时先查证，不要随机切换，也不要把另一版本固件当成替代品。

Ramdisk 通常修改 `boot` / `init_boot` 中的 Ramdisk；ImgPatch 修改 `boot` 内的 ARM64 内核。恢复必须对应实际修改位置。受管恢复会验证备份和 capsule，缺少可验证内容时应保存错误并改用匹配的外部原厂镜像，见[启动镜像命令](/dev/boot-images/)。

仅配置 Ramdisk 不安装 LKM，但其中的启动设置仍可能影响系统。AVB 开关也不能代替正确镜像或解除所有厂商启动限制。

## YukiZygisk 异常

全局注入安全模式停止注入。模块崩溃保护只暂停符合崩溃关联条件的普通 Zygisk 模块在本次开机的后续注入，不覆盖 Native ZN，也不卸载已加载的代码。这两项都不同于禁用所有普通模块的启动安全模式。保存触发前后的退出记录和崩溃日志，禁用最近加入的注入模块后完整重启。见[YukiZygisk 状态](/yukizygisk/features/)。

## 恢复后保留的信息

保留型号、固件与完整内核版本、APK/`ksud`/LKM 版本、分区槽位、镜像 SHA-256、运行模式、最近模块和配置变化、安装日志，以及能取得的 kernel/preinit/bugreport。按[如何有效提问](/troubleshoot/asking/)整理。

## 源码

- [启动按键检测](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/runtime/ksud_integration.c)
- [安全模式中的模块处理](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp)
- [preinit 同步与状态](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/preinit.cpp)
