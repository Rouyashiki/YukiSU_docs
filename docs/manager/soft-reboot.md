---
permalink: /manager/soft-reboot/
title: 软重启
---

# 软重启

YukiSU 软重启由设备侧 `ksud` 重启 Android 服务、重新执行模块启动流程，并重建内置挂载与 Kasumi 规则。**内核不会重启**，因此 late-load 加载的 LKM 可以保留；新 LKM、启动镜像、ImgPatch 配置和早启动 UTS 必须完整重启才能生效。

它与电源菜单里的 Android“用户空间重启”是不同操作。后者由系统实现，不能代替 YukiSU 的规则恢复流程。

## 从哪里使用

- 首页右上角电源菜单的“软重启”。
- 设置中的“使用软重启代替重启”，默认关闭，用于模块安装、更新、启停或卸载后的完成按钮。
- late-load 模式在支持软重启时优先使用它，避免完整重启结束本次临时 Root。

管理器从设备侧 `ksud soft-reboot-status --json` 读取支持状态。尚未完成查询、查询失败、daemon 太旧或已有软重启运行时，都不会提供可用的软重启操作。更新 APK 后仍不可用时，先检查首页 `ksud daemon`，同步匹配版本，再处理状态给出的具体原因。

## 支持条件

v1.8.0 不再因为 Kasumi 启用就一律阻止软重启。开始前同时检查：

| 条件 | 不满足时怎么处理 |
| --- | --- |
| APK、`ksud`、运行内核 UAPI 匹配 | 更新配套组件；新 LKM 安装后完整重启 |
| Android 已完成启动，且没有其他软重启执行中 | 等待启动或当前操作结束，不要重复请求 |
| 不在安全模式，也没有 Magisk 启动所有权 | 先修复模块/启动环境，完整重启进入正常状态 |
| 模块挂载未被启动循环保护禁用 | 修复故障模块并处理保护状态，不要通过删除状态文件强行执行 |
| Kagami 配置与持久规则可读、格式有效 | 按错误指出的文件或规则修复配置 |
| 运行中的挂载控制器支持软重启协议 1 | 同步新 `ksud` 后完整重启，换掉仍运行的旧控制器 |
| Kasumi 参与时，状态可确定且支持 `safe_rule_retire` | 更新运行内核/LKM；关闭开关不会给旧内核增加能力 |
| 有持久用户隐藏规则时支持 `managed_hide` | 使用支持恢复该规则的 LKM，或从 Kasumi 页面移除不需要的规则 |

控制器尚未启动时，`ksud` 可以按正常流程启动它；已有旧控制器却不支持协议时，会明确拒绝。界面开关无法绕过这些检查，直接执行 CLI 也受同样限制。

## 执行过程

请求通过预检、独立后台进程和控制器握手后，管理器显示“请求已接受”。之后依次：

1. 准备 Android 服务退出监视，将 `sys.boot_completed` 置为 `0`。
2. 执行 `emulated-soft-reboot` 回调，停止 Android，并等待旧 `system_server` 和相关服务退出。
3. 由控制器安全清理旧挂载与规则，重新执行 `post-fs-data`，处理模块更新、挂载与配置。
4. 恢复保存的用户隐藏规则及其全局/按策略作用域。
5. 启动 Android，执行 service 阶段，等待系统报告启动完成，再执行 boot-completed 阶段。
6. 检查隐藏规则是否恢复，记录完成、等待路径或失败结果。

屏幕暂时变黑、应用退出是 Android 服务重启的一部分。“请求已接受”只是后台流程开始，不能当作最终完成；不要在这时重复点击重启。

## 查看完成结果

返回管理器查看上次结果，也可在有 Root 的终端读取：

```sh
/data/adb/ksud soft-reboot-status --json
```

JSON 顶层的 `supported`、`blocked_reason`、`running` 表示当前可用性；`last` 对象中的 `result`、`phase`、`error`、`pending` 描述上一次流程。

| 状态 | 含义与操作 |
| --- | --- |
| `running: true` / `accepted` | 后台流程仍在执行，等待完成；同时查看 `phase` |
| `completed` | Android 启动流程完成，规则恢复检查通过；再检查需要使用的模块功能 |
| `completed_pending` | Android 已启动，仍有隐藏规则等待尚未创建的父目录；查看 `pending` 数量及 Kasumi 规则状态 |
| `failed` | 读取 `error` 与 `phase`，保留日志并处理该阶段故障 |

父目录不存在时允许规则保持 pending；父目录已存在但规则仍未绑定、规则丢失、作用域不符或绑定报错，属于恢复失败。后续状态查询会重新检查 `completed_pending`，规则绑定完成后更新为 `completed`。

## 失败后怎么办

流程会根据失败阶段恢复启动标志、清理部分重建状态，或重新启动 Android 服务。它不会撤销模块脚本已经写入的任意系统文件，也不能用回滚代替原厂镜像备份。

如果控制器请求超时且尚未确认结束，协调进程**不会立即并发清理或启动 Android**，而是把恢复交给控制器。出现 `controller completion unconfirmed` 时，先检查日志和状态，不要连续发起软重启或手动运行另一套挂载流程。

日志位于 `/data/adb/ksu/kagami/run/soft-reboot.log`；上一次日志为同目录下的 `soft-reboot.log.old`。同时保留状态 JSON、`ksud` 日志与 Kasumi 日志。正常情况下 Android 启动完成的等待上限为 180 秒；超时后会记录失败阶段。如果 Android 无法恢复交互，使用设备的强制重启方式完整重启，再检查故障模块。late-load 环境完整重启后需要重新加载 Root。

## 源码

[Manager 状态与入口](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/SoftReboot.kt)、[执行与状态](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp)、[失败恢复](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/soft_reboot_flow.hpp)、[支持检查](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/core/reboot_state.cpp)、[控制器协议](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/core/daemon.cpp)、[规则恢复检查](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/kasumi.cpp)。
