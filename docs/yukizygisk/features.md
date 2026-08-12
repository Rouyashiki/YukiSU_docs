---
permalink: /yukizygisk/features/
title: YukiZygisk 功能
---

# YukiZygisk 功能

## 兼容 Zygisk Next 的模块

模块兼容 Zygisk Next、也带了设备需要的 ABI 库，就可以直接交给 YukiZygisk 加载，不用再并行跑另一套 Zygisk。

## 同时覆盖 64 位与 32 位应用

YukiZygisk 自己同时提供 `arm64-v8a` 和 `armeabi-v7a` 组件，所以 ARM64 手机上那些仍为 32 位的应用也能覆盖。模块自己没带对应 ABI 库的话，运行时再齐也没用。

## 安全模式

如果 Zygote 连续崩溃 3 次，YukiZygisk 会停下注入并进入安全模式。目的很朴素：别让一个坏模块把 Zygote 一遍遍撞死。

## Native 注入

除了普通 Zygisk 模块，它还能向指定原生进程做 Native 注入。这不是普通模块自动获得的“增强模式”，只有明确按这套接口开发的模块才会用到。

## 可查看的运行状态

管理器的 YukiZygisk 页面可以查看：

- 内核注入是否启用，以及是否进入安全模式
- 已注入的 64 位与 32 位 Zygote
- 当前识别到的模块数量
- Native 模块及其目标进程
- 本次启动与历史保留的诊断信息

看到这里，你至少能分清是“根本没注入”“模块没加载”，还是“模块加载了但自己没干活”。反馈问题时直接从管理器导出诊断，比截一张开关页面有用得多。
