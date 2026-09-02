---
permalink: /guide/information/
title: 基础概念
---

# 基础概念

下面这些词会在文档里反复出现。不用背定义，知道它们分别管什么就够了。

## LKM、KMI 和启动镜像

YukiSU 的内核部分叫 `kernelsu.ko`，它是一枚 LKM。传统 Ramdisk 布局会把 `ksuinit` 和 LKM 放进合适的启动镜像；ImgPatch 则把启动器与 LKM capsule 直接嵌入 `boot` 内核。两者都是 `CONFIG_KSU=m`，只是加载布局不同。

KMI 可以先粗略理解成“这枚内核模块要对上的接口版本”。两台手机都显示 Linux 6.1，不代表 `.ko` 就能互刷；KMI、符号版本、内核配置和厂商改动都可能不同。

YukiSU 只支持 LKM，也就是 `CONFIG_KSU=m`，不支持把代码直接编进内核的 `CONFIG_KSU=y`。

Android 用户空间最低为 Android 12（API 31）。当前完整构建打包的标准 KMI 从 `android12-5.10` 到 `android17-6.18`，具体 8 个目标见[兼容范围](/guide/compatibility/)。KMI 名称描述内核基线，不等于手机当前 Android 版本。

## 三种加载状态

| 管理器显示 | LKM 从哪里来 | 是否持久 |
| --- | --- | --- |
| Ramdisk | `ksuinit` 在启动 Ramdisk 中加载 `.ko` | 是 |
| ImgPatch | `boot` 内核中的 bootstrap 加载 LKM capsule | 是 |
| late-load | Android 启动后由 `ksud` 临时加载 | 否，重启即失效 |

Ramdisk 与 ImgPatch 的输入、分区和恢复方式不同，见[安装与镜像模式](/guide/install-modes/)。

## `ksuinit`、`ksud`、`su` 分别是什么

- `ksuinit`：启动时把 LKM 加载链接起来；
- `ksud`：负责模块、策略、安装工具和管理器后端；
- `su`：应用真正发起提权时使用的入口；
- `zygiskd` 与相关库：YukiZygisk 的用户空间部分。

APK 里会带一份 `ksud`，设备上 `/data/adb/ksud` 还会有一份已经安装的版本。管理器比较实际 ELF，而不只看版本号：主页可以手动同步；设置中的自动更新在应用冷启动时同步，且默认关闭。运行时监视到该路径被替换后，还会留下证据并发出完整性警报。

这些同步只处理 `/data/adb/ksud`，不会顺便重写启动镜像、替换 LKM 或重启设备。

## 管理器怎么获得信任

正常情况下，内核检查官方管理器的包名和 APK 签名。使用自定义签名或私有管理器时，也可以设置 SuperKey，通过 `prctl` 认证管理器 UID。

动态管理器是另一套“额外信任谁”的机制，不是 SuperKey 的别名。SuperKey 也只认证管理器，不负责给普通应用发 Root。

## 模块和 MetaModule

普通模块都在 `/data/adb/modules/`。生命周期脚本由 YukiSU 执行；模块里的 `system/` 文件要怎样出现在系统路径，则交给 MetaModule。

MetaModule 可以用 OverlayFS、bind mount 或其他做法。YukiSU 负责按上游协议调用它，不替每一种后端承诺相同效果。

## Feature 编号

当前 11 项正式 Feature 分成两段：

- `0–4`：官方 KernelSU 兼容能力，包括 sucompat、内核卸载、sulog、ADB root 和 SELinux hide；
- `5`：位于 KernelSU 预留编号区的 WebView Zygote umount；
- `100–104`：YukiSU 扩展，包括增强安全、Magisk 兼容授权提示、默认 `no_new_privs`、YukiZygisk 和解锁状态隐藏。

这些开关现在集中在管理器的“功能控制”页。源码里有某项能力，不代表你当前 LKM 一定支持；最终应看运行内核报告的状态与 `ksud` 实际保存结果。
