---
permalink: /guide/faq/
title: 常见问题
---

# 常见问题

这里回答安装、模块、授权和更新中最常见的问题。操作报错时，转到[常见问题排查](/troubleshoot/common/)。

## 哪些设备可以使用？

Android 12（API 31）及以上、ARM64、GKI 2.0、Linux 5.10+，并具备所需模块加载、Kprobes、Kretprobes 与 syscall tracepoints。YukiSU 只支持 `CONFIG_KSU=m`。完整构建有 8 个标准 KMI，但厂商修改了导出符号、vermagic 或模块配置时，要使用该内核的专用 LKM，见[兼容范围](/guide/compatibility/)。

## 只安装 APK 就能 Root 吗？

不能。APK 提供管理界面和配套资源，仍需加载匹配的 LKM。设备还没有 Root 时，先修补原厂启动镜像，再按设备流程刷入；[越狱模式](/guide/jailbreak-mode/)也有独立引导条件。

## Ramdisk、ImgPatch 与仅配置镜像有什么区别？

Ramdisk 用 `ksuinit` 加载 LKM；ImgPatch 把 bootstrap 与 LKM capsule 放进 `boot` 的 ARM64 内核。仅配置 Ramdisk 不安装或替换 LKM，保留已有加载链；它不能给原厂镜像单独增加 Root。三种模式的输入要求和恢复步骤见[安装与镜像模式](/guide/install-modes/)及[启动配置](/manager/boot-config/)。

## 为什么更新 APK 后仍然缺功能？

APK、`/data/adb/ksud` 和正在运行的 LKM 是不同组件。同步 `ksud` 不会改启动镜像，更新磁盘上的 LKM 也要完整重启才能验证运行版本。见[更新指南](/guide/update/)。

## 普通模块还必须安装 MetaModule 吗？

不必。纯脚本、属性和策略模块本来就不需要系统文件挂载；需要挂载的模块可以使用内置 Kagami。启用的外部 MetaModule 提供 `metamount.sh` 时优先由它挂载；没有时用 Kagami。见[模块挂载](/modules/magic-mount/)。

## 已安装成功为什么还没效果？

先看模块是否待重启，再查脚本日志和实际挂载后端。全局文件已变化、应用内却没变化时，检查该应用的挂载隔离设置。Zygisk 模块还要在 YukiZygisk 页面确认 ABI、目标进程和注入结果。

## 所有模块都可以热安装吗？

不能。需要模块作者显式请求、模块不是 MetaModule、未处于安全模式，并通过请求与路径检查。`init.rc`、preinit、启动快照和已运行进程的状态仍需重启；热安装脚本失败后不会自动恢复旧模块目录，也不会撤销脚本已做的修改。见[热安装](/modules/hot-install/)。

## 一次性脚本为什么不在已安装模块列表里？

它只执行一次任务并记录最近运行结果，不保留为模块，也不进入模块更新列表。运行结果和参数见[一次性脚本](/modules/one-shot/)。

## preinit 显示准备成功，是否已经执行？

不是。它表示为下一次启动准备了快照；早期动作结果要查启动日志。连续启动失败会触发独立保护；重置计数不会立即运行动作。见[preinit](/modules/preinit/)。

## Feature 为什么显示“强制”且不能修改？

该值来自启动配置。需要更改启动镜像中的强制项并完整重启，普通运行时开关不能覆盖。见[启动配置](/manager/boot-config/)。

## WebView 卸载和“增强安全”开关去哪了？

v1.8.0 将 WebView 卸载移到“超级用户 → WebView Zygote”的非 Root 配置，修改后重新启动受影响的进程；要重建共享 WebView Zygote，完整重启设备。Feature 5 已停用，“增强安全”及 Feature 100 已移除。旧教程中的这两个编号不再适用。见[App Profile](/manager/app-profile/)。

## 升级后默认 Root 域和防逃逸设置为什么变了？

v1.8.0 默认使用 `u:r:ksu:s0`，首次迁移将 Feature 102 设为开启。已有自定义域和逐应用标志继续保留，旧 `su` 策略保留兼容处理。需要调整时打开该应用的 App Profile，先确认使用的是默认配置还是自定义配置，再修改对应设置。

## 已给 shell Root，为什么仍被拒绝？

检查 ID 6 `SHELL_SU_ADB_ONLY`。它会在已有授权之外要求 `adbd` 或 YukiSU root-domain 祖先；找不到这两类祖先的 shell 会被拒绝。它和 ADB Root、普通应用授权不是同一个设置。

## SuperKey 是否必须？

不是。官方管理器默认靠 APK 身份认证。设置 SuperKey 不会自动关闭签名回退；只有另行禁用签名验证才改变这一点。它用于认证管理器 UID，不是普通应用的 Root 密码。见[SuperKey](/manager/superkey/)。

## 动态管理器或版本兼容设置会改变内核吗？

不会。它们改变特定对象看到的兼容值，不更换实际版本，也不自动兼容第三方管理器的私有命令。模块安装的全局覆盖与动态管理器的按签名覆盖应分别配置。

## 不启用 YukiZygisk，Root 能用吗？

能。基础 Root、App Profile 与普通模块处理不依赖它。需要普通 Zygisk 或 Native ZN 模块时再开启它，并按模块作者要求选择 Android 版本、ABI 与目标进程。

## YukiZygisk 的安全模式和模块崩溃保护是一回事吗？

不是。同名 Zygote PID 更替达到内核阈值会触发全局注入保护。模块崩溃保护则在崩溃证据满足关联条件时，暂停对应普通 Zygisk 模块在本次开机的后续注入；它不暂停 Native ZN 模块，也不卸载已加载的代码。进程退出后，查看退出码、崩溃日志和被暂停的模块列表，再决定停用哪个模块。见[功能与状态](/yukizygisk/features/)。

## 软重启能代替完整重启吗？

不能。软重启不会重新加载内核或执行 bootloader、早启动配置和 preinit。v1.8.0 在 daemon 确认支持恢复后允许模拟软重启，并恢复 Kasumi 规则；条件不满足时会显示原因。请求已接受后仍要等待最终恢复结果，失败时保存日志并完整重启。见[软重启](/manager/soft-reboot/)。

## 切换 Root 方案要清空所有模块吗？

保留配置与恢复镜像，不要先清空模块目录，再按 [KernelSU](/guide/switch/kernelsu/)、[Magisk](/guide/switch/magisk/)或 [APatch](/guide/switch/apatch/)的路径迁移，逐项验证后端与模块。

## 隐藏功能能保证通过检测吗？

不能。属性视图、UTS、挂载清理或 SELinux Hide 都有明确作用范围，不等于重新锁定 bootloader，也不改变远端认证或硬件证明结果。

## 开不了机时怎么办？

区分镜像/LKM、普通模块和 preinit 问题，使用[救砖与恢复](/guide/rescue-bootloop/)的对应步骤。反馈时保留完整版本、分区/槽位、最后一次改动和第一条有效错误，见[如何提问](/troubleshoot/asking/)。
