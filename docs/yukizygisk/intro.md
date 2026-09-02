---
permalink: /yukizygisk/intro/
title: YukiZygisk 介绍
---

# YukiZygisk

YukiZygisk 是 YukiSU 集成的可选进程注入环境。它让普通 Zygisk 模块和 Native ZN 模块在不安装 Magisk 或另一套 Zygisk 实现的情况下运行，但它不是核心 Root 主链的一部分。

关闭 YukiZygisk 不会撤销 YukiSU 的 Root；反过来，Root 正常也不代表 YukiZygisk 的内核钩子、守护进程、运行库和第三方模块都已正常。

::: warning 实验性功能
YukiZygisk 仍是实验性功能。兼容结果同时受 Android 版本、Zygote 签名、目标 ABI、模块 API、目标应用/原生进程以及实际部署的 LKM 与用户空间版本影响。
:::

## 它不是内置了一份 Zygisk Next

YukiZygisk 自己实现内核观测、入口重定向、Zygote 运行库、模块代理和诊断；它只把兼容的模块 ABI 作为目标。设备上的 `zygiskd64`/`zygiskd32` 是 YukiZygisk 的用户空间代理，不是 Magisk daemon，也不是把 Zygisk Next 完整打包后启动。

内置 YukiZygisk 与第三方 Zygisk 实现不能并行。功能开启时，模块列表会强制给目录 ID 为 `zygisksu`、`rezygisk` 或 `yukizygisk` 的实现写入 `disable`，其中 `yukizygisk` 指独立模块版 YukiZygisk。

## 启用条件

1. 当前加载的 `kernelsu.ko` 必须包含 `CONFIG_KSU_YUKIZYGISK=y`；
2. 设备侧 `/data/adb/ksud` 与 YukiZygisk payload 必须来自匹配的构建；
3. 在管理器的“设置 → 功能控制”中开启 YukiZygisk；
4. 完整重启。

官方构建脚本当前默认启用 YukiZygisk，也可用 `--yukizygisk-off` 明确关闭；手工构建 LKM 时仍要设置对应 Kconfig。若运行内核不支持 feature ID，管理器不能仅靠更新 APK 补出内核能力。

开关会同时写入当前内核状态和 `ksud` 持久配置，但启用时所需 daemon 只在 `post-fs-data` 完整拉起，已有 Zygote/应用也不会被倒灌注入。因此管理器明确要求重启，不能用开关刚变亮作为成功证据。

## 当前架构

1. 内核侧观察 `execve` 与 `execveat`，识别 Zygote 或已登记的原生目标；
2. 在目标进程真正进入用户入口前，内核准备 loader/core 文件描述符并改写 `AT_ENTRY`；
3. `zygiskd64` 总是为已启用功能提供模块、配置和 companion 代理；存在 32 位 Zygote 或 32 位 Native 目标时再启动 `zygiskd32`；
4. Zygote core 在派生的应用或 system_server 进程中加载普通 Zygisk 模块并调用标准回调；
5. 独立的 Native core 按 `zn_modules.txt` 把 ZN 模块加载进匹配原生进程。

模块映像通过受控文件描述符/内存文件交接；目标进程不需要直接读取 `/data/adb` 下的 payload 路径。普通 Zygisk 与 Native ZN 共用部分注入基础设施，但清单、入口符号、API 和生命周期不同。

## 64 位与 32 位

YukiSU LKM 只支持 ARM64 内核设备。YukiZygisk payload 同时包含 `arm64-v8a` 和 `armeabi-v7a` 运行组件，以覆盖 ARM64 设备上的 64 位与 32 位进程。

这不等于自动补齐第三方模块 ABI：

- 普通 Zygisk 模块要提供相应的 `zygisk/arm64-v8a.so` 或 `zygisk/armeabi-v7a.so`；
- Native ZN 每条清单引用的 ELF class 必须与目标进程一致；
- 设备没有 32 位 Zygote/目标时，不会仅为了一个无用库启动 32 位 daemon。

## 当前启动与下一次启动

| 操作 | 当前进程 | 新进程/下一次启动 |
| --- | --- | --- |
| 开启功能 | 不会注入已存在 Zygote，daemon 也不保证已完整启动 | 重启后在 `post-fs-data` 恢复配置并完整启用 |
| 关闭功能 | 停止新的内核注入路径，但已加载代码不会从现有进程消失 | 重启后以无 YukiZygisk 的干净进程树启动 |
| 安装/更新/启停普通 Zygisk 模块 | 现有应用与 Zygote 保持旧状态 | 重启后 daemon 重新扫描并由新进程加载 |
| 安装/更新/启停 Native ZN 模块 | 已运行目标不会卸载或补载 | 新目标使用已登记清单；early 目标以预先生成的下次启动快照为准 |
| 修改 loader/拒绝名单/日志设置 | `yzctl reload` 通知 daemon，主要影响后续加载与 specialization | 重启后所有进程统一使用保存值 |

模块安装、启用、禁用和卸载会刷新 early Native 快照，但快照的意义正是“给下一次启动早于 `post-fs-data` 的目标使用”。不要把快照刷新成功写成当前进程已经重新注入。

## 从哪里看状态

主页识别到集成版 YukiZygisk 后，可以进入专用状态页。页面轮询内核运行快照，显示：

- 功能是否启用、是否进入 YukiZygisk 注入安全模式；
- 各 Zygote 的 ABI、PID 与注入状态；
- 已发现的普通 Zygisk 模块；
- Native ZN 的模块视图、进程视图、目标与 companion；
- 匿名 loader、拒绝名单与 dmesg 镜像设置。

“已发现模块”是清单/文件库存，不等于模块业务回调已完成。状态字段的准确含义见[功能与状态](/yukizygisk/features/)，普通模块格式见[普通 Zygisk 模块](/yukizygisk/modules/)，原生接口见 [Native ZN API](/yukizygisk/native-zn/)。
