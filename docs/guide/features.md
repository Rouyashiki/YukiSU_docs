---
permalink: /guide/features/
title: 功能概览
---

# 功能概览

YukiSU 的功能不少，但不用把所有开关背下来。先分清它们属于哪一层：Root 和授权、C++ 用户空间、模块与挂载、YukiZygisk、管理器工具。哪一层出问题，就去查哪一层。

::: info 看到开关，不代表当前环境一定支持
选项是否可用，会受 LKM 编译配置、管理器、设备里的 `ksud` 和内核能力影响。页面写着“不支持”时，通常不是按钮坏了，而是当前运行环境确实缺这一项。
:::

## 先看功能之间的关系

| 想做什么 | 由谁负责 | 需要 MetaModule | 需要 YukiZygisk |
| --- | --- | --- | --- |
| 给应用 Root | 内核 + 管理器 | 否 | 否 |
| 限制 Root 身份和能力 | App Profile | 否 | 否 |
| 跑模块启动脚本 | `ksud` | 否 | 否 |
| 把文件挂进 `/system` 等路径 | 普通模块 + MetaModule | 是 | 否 |
| 打开模块 WebUI | 管理器 + 模块 | 通常不需要 | 否 |
| 注入 Zygote、加载 Zygisk 模块 | YukiZygisk | 否 | 是 |
| 修补镜像、备份分区 | 管理器 + `ksud` | 否 | 否 |

MetaModule 管文件挂载，YukiZygisk 管 Zygote 注入。两者名字都经常和“模块”一起出现，但完全不是同一件事。

## Feature 编号怎么分

YukiSU 保留上游 Feature `0–4`，自己的扩展从 `100` 开始：

| ID | Feature | 来自哪里 | 简单说 |
| --- | --- | --- | --- |
| 0 | `SU_COMPAT` | 上游 | 兼容的 `su` 调用路径 |
| 1 | `KERNEL_UMOUNT` | 上游 | 为应用环境处理模块挂载卸载 |
| 2 | `SULOG` | 上游 | 记录 `su` 请求和授权结果 |
| 3 | `ADB_ROOT` | 上游 | 让受支持的 ADB 链获得 Root |
| 4 | `SELINUX_HIDE` | 上游 | 隐藏上游定义的 SELinux 状态 |
| 100 | `ENHANCED_SECURITY` | YukiSU | 收紧绕开 YukiSU 的提权与 UID 降级 |
| 101 | `MAGISK_COMPAT` | YukiSU | 给未预先授权的应用弹出兼容式授权请求 |
| 102 | `DEFAULT_NO_NEW_PRIVS` | YukiSU | 默认 Root Profile 带 `no_new_privs` |
| 103 | `YUKIZYGISK` | YukiSU | 开关内置 YukiZygisk |

ADB root、sulog 和 SELinux hide 是 YukiSU 保持兼容的上游功能，不是 YukiSU 独占卖点。SuperKey、动态管理器和 UTS View 虽然也是 YukiSU 功能，但不属于这组 Feature ID。

## Root 授权

### 允许列表

装了 YukiSU，不等于所有应用自动拿 Root。应用请求 `su` 时，内核会看调用方是谁、管理器有没有授权。

撤销权限后，新的 `su` 请求会被拒绝；已经拿到 Root、仍在运行的进程不会突然被打回普通用户。想确认撤销效果，先结束那个应用再测试。

### App Profile

App Profile 不只管“允许/拒绝”，还可以控制 Root 之后的：

- UID、GID 和附加组；
- Linux capabilities；
- SELinux domain；
- namespace；
- `no_new_privs`；
- Root / non-root profile。

默认 Profile 能满足多数情况。只有真的知道应用缺哪项能力时再改；UID、SELinux domain 或 namespace 填错，应用崩溃、看不到存储都不奇怪。详见 [App Profile](/manager/app-profile/)。

## LKM 与 TSR

YukiSU 只运行在 `kernelsu.ko` 中，不提供 built-in 模式。

TSR 是 **Tracepoint Syscall Redirect** 的缩写，实际 Hook 与官方 KernelSU LKM 一致。它不是一套 YukiSU 私有 Hook，也不是选 YukiSU 的理由，只是界面和日志里不想每次写全名。

想让 LKM 正常工作，内核仍要有需要的 syscall tracepoints、Kprobes 和 Kretprobes，LKM 也必须匹配 KMI、符号版本和模块配置。

`CONFIG_KSU_KRETPROBES_SUCOMPAT` 是实验性的 kretprobe sucompat 路径，不是每个构建默认都有。反馈 Hook 问题时，把实际内核配置一起带上。

## C++ 用户空间

### `ksuinit`

它负责在启动阶段把 LKM 接起来。这里出问题时 Android 可能还没启动，管理器自然也帮不上忙，所以原厂镜像、boot log 和 kernel log 很重要。

### `ksud`

它是管理器后端，也是模块运行时。主要工作包括：

- 安装、启停、更新和卸载模块；
- 跑 `post-fs-data`、`service`、`boot-completed` 等阶段；
- 调用 MetaModule；
- 支持镜像修补、LKM 安装和 Ramdisk Editor；
- 处理配置、SELinux 和诊断。

APK 里有一份内置 `ksud`，设备上还有一份真正参与运行的 `/data/adb/ksud`。更新 APK 后看到新界面，不代表设备里的后端已经同步。

### `su`

它是授权应用发起提权的用户空间入口。是否放行仍由内核和应用策略决定，单独替换一个 `su` 文件绕不过授权。

## 管理器认证

官方管理器默认使用包名与 APK 签名认证，大多数人到这里就结束了。

需要定制部署时，还有：

- **SuperKey**：通过 `prctl` 认证管理器 UID，只认管理器，不直接给应用 Root；
- **动态管理器**：额外配置信任的管理器；
- **禁用 APK 签名验证**：主动放弃签名回退，只适合你明确知道后果的场景。

设置 SuperKey 不会自动关闭签名认证。详细原理见 [SuperKey 认证](/manager/superkey/)。

## 模块与 MetaModule

### 普通模块

YukiSU 按上游约定处理模块目录、`module.prop` 和各阶段脚本。模块可以只跑脚本、改属性或加 SELinux 规则，完全不碰系统文件挂载。

### MetaModule

模块要把文件放进 `/system`、`vendor`、`product` 等路径时，才轮到 MetaModule。YukiSU 完全跟随官方 KernelSU 的接口和执行顺序，同一时间只允许一个活动后端。

MetaModule 可以自己选择 OverlayFS、bind mount 或其他做法。管理器显示“模块已安装”，只说明 ZIP 写进了模块目录，不代表 `system/` 已经挂出去。详见[模块系统](/modules/overview/)。

### WebUI

模块可以在 `webroot/` 里放一个管理页面，通过 `kernelsu` JavaScript API 执行命令或读取模块信息。这个页面常常能跑 Root 命令，不是普通网页玩具；来源、输入校验和远程脚本都要认真看。

## YukiZygisk

YukiZygisk 是可选的 Zygisk 运行环境，可以直接加载兼容 Zygisk Next 的模块，不需要另外安装 Magisk 或 Zygisk Next。

管理器能显示：

- 总开关和当前注入状态；
- 识别到的 Zygote 与模块；
- 64/32 位运行情况；
- Native 注入目标；
- 当前与跨重启保留的诊断；
- 连续崩溃后的安全模式。

关掉它，Root、App Profile、普通模块和 MetaModule 仍然工作。详见 [YukiZygisk 介绍](/yukizygisk/intro/)。

## 上游兼容 Feature（0–4）

### sucompat

为授权应用提供兼容的 `su` 路径。当前构建没编进对应支持时，管理器会显示不可用。

### 内核卸载

可以减少应用 namespace 中不需要暴露的模块挂载。它不等于撤销 Root，也不是 MetaModule 的替代品。

### sulog

记录谁请求了 `su`、最后放行还是拒绝。日志可能带应用标识和操作上下文，公开前先看一眼。

### ADB root

让支持的 ADB 调试链拿到更高权限。开着无线调试、又连着不可信网络时，最好别顺手再把 ADB root 长期开着。

### SELinux hide

隐藏上游定义的 SELinux 状态。它不是关闭 SELinux，也不保证通过完整性或 Root 检测。策略出问题时留住原始 enforcing 状态和日志，别先全局 permissive 再说。

## YukiSU Feature（100–103）

### 增强安全（100）

阻止某些绕开 YukiSU 的提权，以及未经授权的 UID 降级。它收紧的是提权入口，不是“隐藏 Root”开关。

### Magisk 兼容授权提示（101）

没有预先进入允许列表的应用发起兼容请求时，可以弹出更接近 Magisk 使用习惯的授权提示。最终点允许还是拒绝，仍然由你决定。

### 默认 `no_new_privs`（102）

给默认 Root Profile 加上 `no_new_privs`，防止进程后续继续扩大权限。某些特殊工具真依赖这类行为时，可以单独做 Profile，不用全局关掉。

### YukiZygisk（103）

开关内置 YukiZygisk。它控制 Zygote 注入，不控制基础 Root。

## 其他扩展

### UTS View

改变目标 namespace 中看到的 `uname` 等系统标识。它改的是“看到什么”，不会真的把正在运行的内核换掉。

SuperKey 和动态管理器属于认证扩展，UTS View 属于 namespace 视图功能。它们不占用 `100–103` 这组编号。

## 管理器工具

YukiSU Manager 还可以：

- 修补启动镜像；
- 直接安装到当前槽位；
- OTA 后安装到未使用槽位；
- 使用内置 KMI 资源或本地 LKM；
- 查看、备份和刷写分区；
- 运行受支持的 AnyKernel3 包；
- 编辑 Ramdisk；
- 检查更新包的 PGP 与 APK 签名。

都放在一个 App 里，不代表点起来都一样安全。会写启动分区、切槽位或同步设备侧 `ksud` 的操作，动手前留好日志和原厂镜像。

## 最后再记六句话

- 不开 YukiZygisk，Root 照常用；
- 不装 MetaModule，脚本模块可能照常跑，但 `system/` 不会自己挂载；
- 装 APK 不等于装了 LKM；
- 更新 APK 不等于设备里的 `ksud` 已更新；
- 给应用 Root 不等于 App Profile 一定配置合理；
- 代码里有功能，不等于你的设备和构建一定支持。

还在比较上游项目的话，继续看 [YukiSU 与 KernelSU 的区别](/guide/yukisu-vs-kernelsu/)。
