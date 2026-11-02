---
permalink: /guide/compatibility/
title: 兼容范围
---

# 兼容范围

安装 YukiSU，设备必须满足下面全部要求，并使用匹配目标内核的 LKM。

## 支持哪些设备

设备要求：

- Android 12（API 31）及以上；
- ARM64 设备；
- GKI 2.0、Linux 5.10 及以上；
- 可加载模块模式，即 `CONFIG_MODULES=y`、`CONFIG_KSU=m`；
- `CONFIG_KPROBES=y`、`CONFIG_KRETPROBES=y` 与 `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`；
- LKM 的 KMI、vermagic、符号版本、内核配置与目标内核相容。

Android 11 及以下、GKI 1.0、non-GKI、ARM32、x86_64 和 built-in `CONFIG_KSU=y` 不在 YukiSU 的正式支持范围内。这些设备请使用其他 Root 方案，不要强行加载 YukiSU LKM。

## v1.8.0 包含的 KMI

[v1.8.0 发布页](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0)提供下面 8 个 KMI 的 LKM，名称为 `<KMI>_kernelsu.ko`。仓库完整构建使用同一组目标：

| KMI 目标 | 对应的 GKI 世代 |
| --- | --- |
| `android12-5.10` | Android 12 / 5.10 |
| `android13-5.10` | Android 13 / 5.10 |
| `android13-5.15` | Android 13 / 5.15 |
| `android14-5.15` | Android 14 / 5.15 |
| `android14-6.1` | Android 14 / 6.1 |
| `android15-6.6` | Android 15 / 6.6 |
| `android16-6.12` | Android 16 / 6.12 |
| `android17-6.18` | Android 17 / 6.18 |

这是**构建目标表**，不是“手机系统版本到 LKM”的简单对照表。设备升级到更新 Android 后，仍可能沿用较早的内核 KMI；应从正在运行的内核或准备修补的 `boot` 镜像读取 KMI，不能只看设置里的 Android 版本。

正式的全量 Manager 构建会把这 8 枚 LKM 作为 `ksud` 资源整体打包。使用 `scripts/build.* -k <KMI>` 的本地单目标构建则只包含所选 KMI。管理器没有对应资源时，可以选择设备专用 `.ko`；这仍然不允许忽略模块与内核的 ABI 差异。

::: warning “Linux 5.10+”不是通用模块承诺
内置 LKM 面向标准 GKI。厂商改了导出符号、模块签名要求、vermagic 或内核配置时，请使用为该内核构建的专用 LKM；不要强制加载内置版本。
:::

## 安装前怎样核对

在不改动设备的前提下，可以先记录：

```sh
adb shell getprop ro.build.version.sdk
adb shell uname -m
adb shell uname -r
```

`uname -r` 常能看出 `android14-6.1` 这类 KMI 线索，但经过厂商改写时仍应让管理器读取目标镜像。传统 Ramdisk 修补会先解析当前槽位、未使用槽位或所选镜像的目标 KMI；使用内置 LKM 时，检测结果必须出现在打包资源列表中，否则管理器会要求人工选择而不是静默猜测。

还要分别确认：

1. 目标是当前槽位还是 OTA 后的未使用槽位；
2. 传统 Ramdisk 模式应修补 `boot`、`init_boot` 还是设备实际存在的其他 Ramdisk 分区；
3. ImgPatch 模式只能处理带 ARM64 内核的 AOSP `boot` 镜像；
4. 原厂镜像、恢复命令和正确槽位都已准备好。

安装方式之间的差异见[安装与镜像模式](/guide/install-modes/)，自行构建见[构建指南](/dev/build/)与[内核集成](/dev/integration/)。

## 源码

- [本地/CI KMI 矩阵](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/.github/workflows/build-lkm.yml)
- [Windows 完整构建脚本](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.ps1)
- [Linux/macOS 完整构建脚本](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.sh)
- [用户空间 API 31 编译期门槛](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/common/api_floor.hpp)
