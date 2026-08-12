---
permalink: /guide/intro/
title: 介绍
---

# YukiSU 介绍

YukiSU 是一套面向 **ARM64 GKI 2.0** 设备的内核级 Root 方案，fork 自 [SukiSU-Ultra](https://github.com/ShirkNeko/SukiSU-Ultra)。它能继续使用 KernelSU 的授权、App Profile、模块和 MetaModule 生态，同时换上了一套 C++ 用户空间、自己的管理器，以及 YukiZygisk、SuperKey 等扩展。

如果只想记住一句话：**YukiSU 是一套只做 LKM、兼容 KernelSU 生态，但又不满足于原样照搬上游的完整 Root 方案。**

它不只是一枚 `kernelsu.ko`，也不只是一个管理器 APK。真正跑起来后，内核、`ksud`、管理器、模块和可选的 YukiZygisk 都在各做各的事。

## 为什么会有 YukiSU

我们想要的并不是“再做一个能弹 Root 授权框的管理器”。YukiSU 更在意下面几件事：

- **Root 该归内核管。** 哪个应用能拿 Root、拿到什么身份和能力，都应该有明确规则。
- **用户空间要自己掌握。** `ksud`、`ksuinit` 和 `su` 用 C++ 重写，安装、模块、诊断和新功能不用被另一套实现牵着走。
- **上游生态别瞎折腾。** LKM Hook、Feature 0–4、模块生命周期和 MetaModule 都按官方 KernelSU 的约定来，没必要为了“显得不同”破坏兼容。
- **额外功能按需开启。** YukiZygisk、SuperKey、动态管理器、Feature 100–103 和 UTS View 都是加分项，不会硬塞进基础 Root 链路。
- **管理器得真的能干活。** 除了授权和模块，它还能处理 LKM 安装、分区备份、Ramdisk 编辑与诊断。

这样做有个很实际的好处：哪一层出问题，就查哪一层。Root 正常但 Zygisk 模块没工作时，不必一上来就怀疑 LKM；模块脚本能跑但文件没挂载时，也应该先去看 MetaModule。

## 你的设备能不能用

目前支持范围很明确：

| 项目 | 要求 |
| --- | --- |
| 架构 | ARM64 |
| 内核 | GKI 2.0，Linux 5.10 及以上 |
| 安装方式 | 仅 LKM，`CONFIG_KSU=m` |
| 内核配置 | `CONFIG_KPROBES=y`、`CONFIG_KRETPROBES=y`、`CONFIG_HAVE_SYSCALL_TRACEPOINTS=y` |

下面这些目前不支持：

- GKI 1.0 或 non-GKI；
- ARM32、x86_64；
- built-in `CONFIG_KSU=y`；
- 缺少必要 probe 或 syscall tracepoint 的内核。

YukiZygisk 会附带 64 位和 32 位运行组件，所以能处理 ARM64 手机上的 32 位应用。这里的“32 位”说的是应用进程，不是 ARM32 手机。

::: warning 5.10 对上了，不代表 LKM 就能混用
KMI、符号版本、vermagic、内核配置和厂商改动都得匹配。看到内核版本一样就随手加载别人的 `kernelsu.ko`，是最省时间的开不了机方法之一。
:::

## 它由哪些部分组成

| 部分 | 它在做什么 |
| --- | --- |
| `kernelsu.ko` | 在内核里处理 Root、Hook、App Profile 和 Feature |
| `ksuinit` | 在启动阶段接上 LKM 与 init 环境 |
| `ksud` | 跑模块、处理安装、配置 SELinux，并给管理器提供后端 |
| `su` | 为已经获得授权的调用方打开提权会话 |
| YukiSU Manager | 看状态、批授权、装模块、装 LKM、备份分区和导出诊断 |
| MetaModule | 把模块文件挂到 `/system`、`vendor` 等系统路径 |
| YukiZygisk | 注入 Zygote，并加载兼容 Zygisk Next 的模块 |

排查时也按这个顺序来：先看 LKM 和管理器认证，再看 `ksud` 与 Root 授权，然后是 MetaModule，最后才轮到 YukiZygisk。管理器能打开，只能说明 APK 装上了，不能证明整套环境都在工作。

## 几个最容易误解的地方

### “仅 LKM”不是“只有 LKM”

YukiSU 只是**不提供 built-in 内核集成**。管理器、C++ 用户空间、模块系统和其他能力一个不少，所以别把“LKM-only”理解成某种阉割版。

### TSR 不是 YukiSU 私有 Hook

TSR 只是 **Tracepoint Syscall Redirect** 的缩写。实际 Hook 与官方 KernelSU LKM 一致，这个名字只是为了在界面和日志里少写几个字。

### MetaModule 也没有另起炉灶

YukiSU 完全遵循官方 KernelSU 的 MetaModule 接口、脚本和执行顺序。你原来在 KernelSU 中使用的 MetaModule，切换后不用因为“换了 Root”就重新安装。

### YukiZygisk 是加分项，不是地基

需要 Zygisk 模块时，它能省掉额外安装 Zygisk Next 的步骤；不需要时关着就行。Root、App Profile、普通模块和 MetaModule 都不会因此停摆。

### SuperKey 不是 Root 密码

它只用来告诉内核“这个 UID 是管理器”，不会直接给应用发 Root，也不是 APatch 那套 NR45 通用 SuperCall 密钥。官方管理器正常用签名认证即可，大多数人不需要填它。

## 适合谁

YukiSU 的目标用户不是第一次接触 Root、只想点一下 APK 就完事的人。它更适合：

- 知道 boot、槽位、GKI 和 KMI 分别是什么；
- 能拿到当前固件的原厂镜像，也知道设备出问题后怎么救；
- 愿意尝试更新、更激进的方案，但不会拿主力机闭眼试错；
- 希望保留 KernelSU 模块生态，同时用上 C++ 用户空间、YukiZygisk 或其他扩展。

这不代表文档会故意写得晦涩。你可以懂内核，也完全没必要忍受绕口话。

## YukiSU 不承诺什么

YukiSU 不保证通过所有完整性或 Root 检测，也不保证任意 Magisk、KernelSU 或 Zygisk 模块装上就能用。设备内核、Android 版本、具体 MetaModule 和模块自己的实现都会影响结果。

它也不是官方 KernelSU 的换皮管理器。用户空间和扩展都已经分开维护，遇到问题请带上 YukiSU 自己的 LKM、`ksud` 和管理器版本，不要只写一句“KernelSU 出错了”。

## 接下来去哪

- 准备安装：看[快速开始](/guide/get-started/)；
- 还在选 KernelSU 还是 YukiSU：看[与 KernelSU 的区别](/guide/yukisu-vs-kernelsu/)；
- 想先临时试一下：看[越狱模式](/guide/jailbreak-mode/)；
- 准备装模块：看[模块系统](/modules/overview/)和 [MetaModule](/modules/meta-module/)；
- 已经出问题：从[常见问题排查](/troubleshoot/common/)开始。

## 许可证与社区

- `kernel/`：GPL-2.0-only
- 其他 YukiSU 自有代码：GPL-3.0-or-later
- 项目说明：[YukiSU 中文 README](https://github.com/Anatdx/YukiSU/blob/main/docs/zh/README.md)
- Telegram：[t.me/manosaba](https://t.me/manosaba)
- 问题反馈：[GitHub Issues](https://github.com/Anatdx/YukiSU/issues)
