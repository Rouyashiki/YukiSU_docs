---
permalink: /guide/jailbreak-mode/
title: 越狱模式
---

# 越狱模式

不想先改启动镜像，只想让 YukiSU 在当前这次开机里跑起来？这就是越狱模式。

它本质上是上游的 **late-load**：Android 已经启动后，再加载匹配 KMI 的 `kernelsu.ko`，然后补上 YukiSU 用户空间、模块和管理器环境。行为跟随官方 KernelSU，用户空间流程由 YukiSU 用 C++ 实现。

::: warning 重启后就没了
越狱模式不会把 YukiSU 持久安装进启动镜像。本次开机能用，重启后需要再次越狱，或者改走正常 LKM 安装。
:::

## 什么情况下会出现入口

当前实现要求：

- ARM64、GKI 2.0、Linux 5.10+；
- 当前内核还没有活动的 YukiSU；
- 管理器里带有匹配当前 KMI 的 `kernelsu.ko`；
- **SELinux 当前是 Permissive**；
- 管理器能启动所需服务；自动越狱还要有自启动权限。

Permissive 是引导 late-load 的前提，不代表正常安装 YukiSU 后也得一直关着 SELinux。如果当前是 Enforcing，管理器不会把越狱模式当成通用替代安装法。

## 有 Root 和没 Root，怎么加载

### 已经有 Root shell

管理器直接执行 `ksud late-load`，用现有 Root 把匹配 LKM 加载进内核，然后交给 YukiSU 接着初始化。

### 当前没有 Root

管理器会通过 Magica 服务拿到第一次加载 LKM 所需的临时权限。YukiSU 接手后，Magica 路径还会恢复 ADB 相关属性，并把 SELinux 切回 Enforcing。

两条路最后到的是同一个 late-load 环境，差别只在于“第一把钥匙从哪里来”。

## 加载后发生什么

C++ `ksud` 会依次：

1. 读取当前内核，确定 KMI；
2. 从管理器资源里提取 `<kmi>_kernelsu.ko`；
3. 通过内核模块接口加载它；
4. 准备当前会话需要的 YukiSU 用户空间；
5. 处理模块更新/卸载、目录上下文、SELinux、App Profile 和 Feature；
6. 执行 `late-load.d` 与模块的 `late-load.sh`；
7. 加载 `system.prop`，调用 MetaModule 的 `metamount.sh`；
8. 接着跑 `post-mount`、`service`、`boot-completed`；
9. 刷新管理器状态。

模块和 MetaModule 接口还是上游那套，只是正常开机的早期时机已经错过了。

## 和正常启动差在哪

| 行为 | 正常安装 | 越狱 / late-load |
| --- | --- | --- |
| LKM 什么时候加载 | 启动链中 | Android 启动后 |
| PID 1 早期处理 | 有 | 没有 |
| initrc 注入 | 正常处理 | 跳过 |
| 模块早期脚本 | `post-fs-data.sh` | **`late-load.sh`** |
| 环境标记 | 普通启动 | `KSU_LATE_LOAD=1` |
| `system.prop` | 支持 | 支持 |
| MetaModule | 支持 | 支持 |
| `post-mount` / `service` / `boot-completed` | 支持 | 支持 |
| 音量键安全模式 | 支持 | 赶不上 |
| 早期 boot log | 能抓 | 跳过 |
| 重启后还在吗 | 在 | 不在 |

late-load 还会跳过 Magisk 共存检测、`post-fs-data` 报告等依赖早期启动的步骤。错过了就是错过了，不会在 Android 启动完后倒带重演。

## 模块怎么兼容

需要在越狱模式做早期初始化的模块，应提供：

```text
/data/adb/modules/<module-id>/late-load.sh
```

脚本里可以检查 `KSU_LATE_LOAD=1`。依赖 PID 1、早期 init、解密前目录或音量键安全模式的功能，不能把文件名从 `post-fs-data.sh` 改一下就算适配。

MetaModule、`system.prop`、`post-mount`、`service` 和 `boot-completed` 仍会运行。所以没有 `late-load.sh` 不代表模块所有功能都没了，只是原本只写在 `post-fs-data.sh` 的那部分不会执行。

## 自动越狱

打开自动越狱后，管理器会在自启动时检查条件，满足就再次通过 Magica late-load。

这要求系统真的允许 YukiSU Manager 自启动，也别被省电策略冻在开机阶段。它仍然是“每次开机重新加载”，不是偷偷替你修补了启动镜像。

## 适合怎么用

适合：

- 临时确认某个 KMI 的 LKM 能不能加载；
- 先体验 YukiSU，再决定是否持久安装；
- 测试时不想写启动镜像；
- 为后续正常安装准备一个管理环境。

不太适合长期依赖：

- 你不想为了引导保留 Permissive 条件；
- 模块高度依赖 `post-fs-data` 或 PID 1；
- ROM 经常阻止管理器自启动；
- 你需要每次开机都稳定、无需用户空间再次引导的 Root。

::: danger 别为了 late-load 长期把 SELinux 留在 Permissive
Permissive 会削弱 SELinux 隔离。日常长期使用，正常安装匹配 KMI 的 LKM 仍然更省心。
:::

## 常见问题

### 为什么看不到越狱按钮

确认 YukiSU 是否已经活动、SELinux 是否真的是 Permissive、设备是否在支持范围，以及 APK 里有没有匹配 KMI 的 LKM。

### 提示找不到 LKM

管理器资源里没有匹配当前 KMI 的 `kernelsu.ko`。换带对应资源的构建，或为当前内核编译；别拿另一个 KMI 强行加载。

### 越狱成功，模块却少一半功能

看模块是否把关键逻辑只写在 `post-fs-data.sh`。再检查 `late-load.sh`、`metamount.sh`、`post-mount` 和 `service` 日志。

### 重启后 YukiSU 消失

正常现象，这就是临时模式。要一直保留，请用正常 LKM 安装。

## 参考

- [官方 KernelSU late-load 说明](https://github.com/tiann/KernelSU/blob/main/website/docs/guide/module.md#late-load-mode)
- [YukiSU 快速开始](/guide/get-started/)
- [模块系统](/modules/overview/)
