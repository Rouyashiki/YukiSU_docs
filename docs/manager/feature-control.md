---
permalink: /manager/feature-control/
title: 功能控制
---

# 功能控制

当前管理器把正式内核 Feature 集中到“设置 → 功能控制”。页面以 [`uapi/feature.h`](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/feature.h) 的编号为准：0–99 是上游兼容预留区，YukiSU 明确编号的扩展从 100 开始。

这里目前共有 11 项，而不是旧文档中的 0–4 与 100–103。

## 页面如何读写状态

管理器直接通过 ioctl 读取**正在运行的内核**是否支持某个 Feature 及其当前值。旧 LKM 没有对应 ID 时，开关会显示为不支持并禁用；看到开关不等于当前内核支持它。

修改时，管理器让 `ksud` 执行运行时设置并保存配置。若持久化失败，它会尝试把运行时值回滚到修改前并再次保存。sulog、Magisk 兼容与 YukiZygisk 还需要 `ksud` 完成各自的 daemon 或启动快照副作用，因此不应绕过页面只调用一个内核 setter。

## 管理器的 KernelSU 分组

界面把 0–5 放在“KernelSU 功能”卡片中，但归属不能只看 UI 分组：当前官方 KernelSU `main` 公开的是 0–4；ID 5 的 WebView Zygote Umount 是 YukiSU 在上游预留编号区实现的功能，并非当前两边完全一致的上游 Feature。

| ID | 页面名称 | 实际作用 | 生效提示 |
| --- | --- | --- | --- |
| 0 | 禁用 su 命令 | 反向显示 `SU_COMPAT`；关闭后阻止应用继续通过传统 `su` 入口提权 | 已经运行的 Root 进程不会被撤权 |
| 1 | 关闭内核 umount | 反向显示 `KERNEL_UMOUNT`；关闭内核按 Profile 处理模块卸载的机制 | 会影响后续应用进程的模块可见性 |
| 2 | 超级用户日志 | 记录内核超级用户事件并由 `sulogd` 持久化 | 开启后设置页才显示使用日志查看器 |
| 3 | ADB Root | 让 `adbd` 以 Root 权限运行 | 保存后管理器会重启 `adbd`，当前 ADB 连接可能中断 |
| 4 | SELinux 隐藏 | 对应用侧 SELinux 探测隐藏 YukiSU/KernelSU 策略改动 | 页面明确提示重启后生效 |
| 5 | 为 WebView 卸载模块 | 在 WebView zygote 继承挂载 namespace 前卸载模块挂载 | 依赖全局 Kernel Umount 保持启用；重启后生效；修改 WebView 资源的模块可能失效 |

`KERNEL_UMOUNT` 是全局机制，App Profile 的“卸载模块”和 Feature 5 都是在它之上的具体策略。前者被关掉时，后两者不能凭空完成内核卸载。

## YukiSU Feature 100–104

| ID | 页面名称 | 实际作用 | 生效提示 |
| --- | --- | --- | --- |
| 100 | 使用严格安全策略 | 阻止非 YukiSU 域提权与未授权 app UID 降低 | 是授权边界加固，不是 Root 隐藏 |
| 101 | Magisk 风格 su 弹窗 | 为未在 allowlist 中的应用提供可见 `su` 与首次授权提示，并配合 `msud` | 管理器会执行 `magisk-compat apply`；开启后按提示重启 |
| 102 | 默认防逃逸（no-new-privs） | 让仍使用默认 Root Profile 的调用方默认禁止二次提权，包括管理器与 shell | 主要影响之后应用默认 Profile 的提权；自定义 Profile 可单独决定 |
| 103 | YukiZygisk | 打开内核 Zygote 捕获与内置 YukiZygisk 链路 | 开关只保存主状态，完整重启后验证注入 |
| 104 | 解锁状态隐藏 | 在 service 阶段通过内置 resetprop 把一组 bootloader/verified-boot 属性改成锁定外观 | 开启后重启；关闭后也需重启才能恢复本次开机已改写的属性 |

### 解锁状态隐藏不等于重新上锁

Feature 104 只改 Android 属性视图，例如 `ro.boot.vbmeta.device_state`、`ro.boot.verifiedbootstate` 和部分厂商属性。它不会：

- 重新锁定 bootloader；
- 恢复 AVB 信任链；
- 修复已被修改的启动镜像；
- 保证绕过应用的其他解锁或 Root 检测。

把它当作软属性改写，不要把“显示 locked/green”当作真实启动安全状态。

### Magisk 风格弹窗不替代 App Profile

Feature 101 改变未登记应用第一次调用 `su` 时的交互入口。最终是否允许以及允许后的 UID、capability、SELinux 与 namespace，仍由超级用户列表和 [App Profile](/manager/app-profile/)决定。

### YukiZygisk 开关不证明注入成功

Feature 103 只是总开关。重启后仍需在 YukiZygisk 页面分别检查内核注入、Zygote、Native target 和模块状态。安全模式或 daemon 失败都可能让“已开启”与“已注入”不同。

## 哪些改动要特别小心

- **禁用 su：** 管理器可能仍有驱动权限，但其他依赖 `su` 的工具会立刻失去新建 Root 会话的入口。
- **ADB Root：** 重启 `adbd` 会断开当前传输；在远程调试环境中先准备备用连接。
- **严格安全策略 / no-new-privs：** 错误理解会让原本依赖再次提权或 UID 切换的工具失效。
- **WebView 卸载：** 安全性与修改 WebView 资源的模块存在直接兼容取舍。
- **SELinux/解锁状态隐藏：** 都只处理各自定义的观察面，不是通用隐藏开关。

一次只改一项，记录旧值，并按页面给出的重启要求验证。若保存失败，不要只看开关动画；刷新页面确认运行内核的实际值，并查看 `ksud` 输出。
