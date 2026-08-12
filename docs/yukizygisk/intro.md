---
permalink: /yukizygisk/intro/
title: YukiZygisk 介绍
---

# YukiZygisk

想在 YukiSU 上用 Zygisk 模块，又不想额外装 Magisk 或 Zygisk Next？YukiZygisk 就是干这个的。

在管理器中打开它、重启，然后安装兼容 Zygisk Next 的模块即可。它是 YukiSU 自带的可选运行环境，不是 Root 主链的一部分。

::: warning 目前仍是实验性功能
“兼容标准 API”不等于“所有模块都能用”。Android 版本、32/64 位 ABI、模块实现和目标应用都会影响结果。
:::

## 它不是内置了一份 Zygisk Next

YukiZygisk 会自己注入 Zygote、发现模块并加载模块，只是把 Zygisk Next 兼容模块作为目标。它不是把 Zygisk Next 原封不动打包进 YukiSU。

你会看到一个叫 `zygiskd` 的用户空间服务，它属于 YukiZygisk，也不是 Magisk 的 Zygisk daemon。

## 怎么开

1. 确认当前 LKM 带有 YukiZygisk 支持；
2. 在管理器里打开 YukiZygisk；
3. 重启。

自己编译 LKM 时需要 `CONFIG_KSU_YUKIZYGISK=y`。重启后去 YukiZygisk 页面看注入状态、识别到的 Zygote、模块数量和诊断信息。

## 大致怎么工作

1. Zygote 启动时，内核侧进入注入流程；
2. `zygiskd` 找到已经启用的模块，准备文件和运行配置；
3. 注入 Zygote 的运行库加载模块，并在应用进程创建前后调用标准 Zygisk 回调。

YukiSU 本体只支持 ARM64 设备，但手机上的应用不一定全是 64 位，所以 YukiZygisk 同时带有 64 位和 32 位运行组件。

继续看[功能与状态](/yukizygisk/features/)或[模块兼容性](/yukizygisk/modules/)。
