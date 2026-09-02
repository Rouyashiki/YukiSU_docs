---
permalink: /guide/compatibility/
title: 兼容范围
---

# 兼容范围

YukiSU 的“支持”要拆成三层看：Android 用户空间版本、内核形态，以及有没有与目标内核匹配的 LKM。只满足其中一层，不能推出设备可用。

## 正式支持边界

当前 `main` 的边界是：

- Android 12（API 31）及以上；
- ARM64 设备；
- GKI 2.0、Linux 5.10 及以上；
- 可加载模块模式，即 `CONFIG_MODULES=y`、`CONFIG_KSU=m`；
- `CONFIG_KPROBES=y`、`CONFIG_KRETPROBES=y` 与 `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`；
- LKM 的 KMI、vermagic、符号版本、内核配置与目标内核相容。

Android 11 及以下、GKI 1.0、non-GKI、ARM32、x86_64 和 built-in `CONFIG_KSU=y` 不在 YukiSU 的正式支持范围内。源码能在某棵特殊内核树上编译，不会自动把它变成受支持设备。

## 当前 CI 与完整构建包含的 KMI

仓库脚本与 CI 当前维护下面 8 个 DDK 目标：

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
同为 `android14-6.1`，厂商仍可能改动导出符号、模块签名、vermagic 或配置。CI LKM 是项目维护的标准 GKI 构建面，不保证能加载到每一棵厂商内核。
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

## 事实来源

- [本地/CI KMI 矩阵](https://github.com/Rouyashiki/YukiSU/blob/main/.github/workflows/build-lkm.yml)
- [Windows 完整构建脚本](https://github.com/Rouyashiki/YukiSU/blob/main/scripts/build.ps1)
- [Linux/macOS 完整构建脚本](https://github.com/Rouyashiki/YukiSU/blob/main/scripts/build.sh)
- [用户空间 API 31 编译期门槛](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/common/api_floor.hpp)
