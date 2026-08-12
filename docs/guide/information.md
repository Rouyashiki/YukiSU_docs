---
permalink: /guide/information/
title: 基础概念
---

# 基础概念

下面这些词会在文档里反复出现。不用背定义，知道它们分别管什么就够了。

## LKM、KMI 和启动镜像

YukiSU 的内核部分叫 `kernelsu.ko`，它是一枚 LKM。要让它每次开机都被加载，管理器会把 `ksuinit` 和 LKM 放进合适的启动镜像。

KMI 可以先粗略理解成“这枚内核模块要对上的接口版本”。两台手机都显示 Linux 6.1，不代表 `.ko` 就能互刷；KMI、符号版本、内核配置和厂商改动都可能不同。

YukiSU 只支持 LKM，也就是 `CONFIG_KSU=m`，不支持把代码直接编进内核的 `CONFIG_KSU=y`。

## `ksuinit`、`ksud`、`su` 分别是什么

- `ksuinit`：启动时把 LKM 加载链接起来；
- `ksud`：负责模块、策略、安装工具和管理器后端；
- `su`：应用真正发起提权时使用的入口；
- `zygiskd` 与相关库：YukiZygisk 的用户空间部分。

APK 里会带一份 `ksud`，设备上 `/data/adb/ksud` 还会有一份已经安装的版本。更新 APK 不代表后一份自动跟着更新，所以管理器会把两边版本分开显示。

## 管理器怎么获得信任

正常情况下，内核检查官方管理器的包名和 APK 签名。使用自定义签名或私有管理器时，也可以设置 SuperKey，通过 `prctl` 认证管理器 UID。

动态管理器是另一套“额外信任谁”的机制，不是 SuperKey 的别名。SuperKey 也只认证管理器，不负责给普通应用发 Root。

## 模块和 MetaModule

普通模块都在 `/data/adb/modules/`。生命周期脚本由 YukiSU 执行；模块里的 `system/` 文件要怎样出现在系统路径，则交给 MetaModule。

MetaModule 可以用 OverlayFS、bind mount 或其他做法。YukiSU 负责按上游协议调用它，不替每一种后端承诺相同效果。

## Feature 编号

这组编号很好分：

- `0–4`：上游兼容能力，包括 sucompat、内核卸载、sulog、ADB root 和 SELinux hide；
- `100–103`：YukiSU 扩展，包括增强安全、Magisk 兼容授权提示、默认 `no_new_privs` 和 YukiZygisk。

源码里有某项能力，不代表你当前 LKM 一定编进去了。最终还是看管理器显示和实际构建配置。
