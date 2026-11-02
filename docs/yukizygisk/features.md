---
permalink: /yukizygisk/features/
title: YukiZygisk 功能与状态
---

# YukiZygisk 功能与状态

## 两套模块接口

YukiZygisk 当前有两条明确分开的模块链：

- **普通 Zygisk**：读取 `zygisk/<abi>.so`，当前公开 `zygisk.hpp` 为 API v5，运行时接受 API v1 到 v5；
- **Native ZN**：读取 `zn_modules.txt` 并注入指定原生可执行文件，当前头文件为 Zygisk Next native API v4，运行时兼容 v3/v4，并提供可选 HYOS runtime 扩展。

普通 Zygisk 使用 `preAppSpecialize`/`postAppSpecialize` 等回调，Native ZN 使用 `onModuleLoaded`。管理器按目录内的库与清单，将模块标记为 “Zygisk” 或 “Native”；同时提供两种格式的模块会走两条加载路径。

## 加载设置与默认值

状态页把加载器、映射方式、早加载和保护分开设置。未保存配置时的默认值如下：

| 设置 / 配置键 | 默认值 | 作用 |
| --- | --- | --- |
| YukiLinker / `yukilinker` | `true` | 普通 Zygisk 模块优先用自带加载器；关闭后使用系统加载器 |
| 匿名内存 / `anonymous_memory` | `true` | 控制普通 Zygisk 模块的映射策略；Native 模块保留 Bionic 映射 |
| 早加载原生模块 / `early_load` | `false` | 准备下次启动、早于 `post-fs-data` 的 Native 快照 |
| 模块崩溃保护 / `crash_protection` | `true` | 在满足崩溃证据条件时暂停本次开机的普通 Zygisk 模块注入 |
| 拒绝名单 / `denylist_mode` | `0` | `0` 关闭、`1` 强制、`2` 恢复 |
| 镜像日志 / `dmesg_log` | `false` | 将 daemon 日志同时写到 dmesg |

普通 Zygisk 模块带 `PT_TLS` 时直接使用系统 linker；其他库在自带加载器失败后会尝试系统路径。v1.8.0 的 Native ZN 模块固定通过 Bionic 加载，保留系统管理的库句柄、依赖和映射，不受这两个模块加载设置切换。core 使用独立的匿名引导路径。

设置保存在 `/data/adb/ksu/yukizygisk/yzconfig.json`，通过 `yzctl reload` 通知 daemon 并刷新 early 快照。已运行进程不会卸载重载；早加载设置只影响下次启动快照。配置写盘后，运行时已连接就执行 reload；尚未建立运行时通道时，保存配置并更新快照，待 YukiZygisk 启动后读取。reload 失败也会继续尝试刷新 early 快照，返回失败不代表配置回滚。先用 `ksud yzctl config get` 查看保存值，再检查运行状态和错误。

配置文件缺失时使用默认值。JSON 损坏或顶层不是对象时，会重新写入默认配置；读取权限错误或不安全的文件状态会直接报错，不会覆盖。配置修复后，重新检查上表中的设置。

## 拒绝名单模式

状态页提供三种行为：

| 模式 | 普通模块挂载 | 普通 Zygisk 模块 |
| --- | --- | --- |
| 关闭 | 仍由 YukiSU Root profile 决定 | 拒绝名单不额外阻止注入 |
| 强制 | 对命中的应用执行普通模块卸载 | 跳过模块加载与回调 |
| 恢复 | 保留普通模块卸载结果 | 仍执行注入与模块回调 |

拒绝名单判断来自 YukiSU 的 UID profile。它不是 MetaModule 开关，也不会在 specialization 结束后替 Zygisk 模块清理模块自己创建的私有挂载。详见[模块挂载](/modules/magic-mount/)。

`FORCE_DENYLIST_UNMOUNT` 目前只记录选项，不执行额外卸载；模块作者应按上述 UID/profile 和拒绝名单行为处理挂载。

## 64 位与 32 位进程

YukiZygisk 包含 ARM64 与 ARM32 runtime/daemon。32 位 daemon 只在设备有 32 位 Zygote，或 Native 清单包含有效 32 位目标时启动。第三方模块仍必须提供与目标进程一致的库。

普通 Zygisk 模块不会加载进 UID 落在 isolated-process 范围的应用子进程；system_server 走单独的 server specialize 回调。Native ZN 是否匹配则由 `name=`/`path=` 与 ELF class 决定。

## YukiZygisk 注入安全模式

内核按 Zygote socket name 分别记录 PID。首个 PID 建立基线；同名 Zygote 每出现一个不同 PID 就计一次 restart。当某个名称达到 `3` 次 restart，YukiZygisk 进入全局注入安全模式：

- 当前触发的 Zygote 不再注入；
- 后续 Zygote 与 Native 目标也被跳过；
- 管理器报告触发名称与计数；
- Root、MetaModule、普通模块与 Lua 插件不会因此自动停用。

重启计数按 PID 更替累计，触发原因需查看对应的 kernel/daemon 日志。关闭再开启功能不会清零计数；处理问题模块后完整重启，才能重置本次启动的安全模式。重启前先导出诊断报告。

这与 YukiSU **系统安全模式**不同。系统安全模式会跳过模块/插件阶段并禁用 `/data/adb/modules/` 下的模块；YukiZygisk 安全模式只保护注入链。

## 模块崩溃保护

该功能与上面的全局注入安全模式分开。开启模块崩溃保护后，daemon 会将本次开机的 Zygote 退出事件与 tombstone 按进程、ABI、代际和模块文件身份关联。普通 Zygisk 模块位于已关联的直接故障或 system_server 故障的第 0 栈帧时，保护会暂停该模块本次开机的后续注入；32/64 位 daemon 共享暂停结果。

暂停记录绑定 boot ID，不等同于写入模块 `disable`，不会自动卸载模块或撤销已经加载的代码。完整重启后不继承上次开机的暂停集合，所以应先处理有问题的模块再重启。Native ZN 也会记录崩溃信息，但不适用普通 Zygisk 的自动模块隔离。

卡片上的“出现在崩溃回溯中”表示模块库出现在栈帧中；是否暂停注入，以卡片的暂停状态为准。排查根因时查看对应 tombstone 的故障位置与完整调用栈。

## 状态含义与排查

管理器每约 2 秒读取一次 `yzctl status --json`。按下面的状态继续检查：

| 显示 | 含义 | 下一步 |
| --- | --- | --- |
| 功能已启用 | 当前内核 feature flag 已开启 | 首次开启后重启，再查看 daemon 和 Zygote 状态 |
| Zygote `injected` | 已收到该 PID/代际的 core 注入完成报告 | 启动目标应用，检查模块状态和功能 |
| Zygote `unknown` | 已检测/重定向，但尚未收到完成或失败结果 | 刷新状态；持续无结果时检查对应 ABI 的 daemon/core 日志，记录 PID 后导出报告 |
| Zygote `failed` | 当前代际注入失败 | 查看同一 PID/代际的 loader/core 日志 |
| 普通模块数量 | 活动目录中含有相应 ABI 的 `zygisk/*.so` | 打开模块状态，查看加载报告 |
| 普通模块 `injected` | 当前受监视 Zygote 的 PID/代际已有该模块注册/加载成功报告 | 测试目标应用中的 pre/post 回调和模块功能 |
| Native `unknown` | 清单已登记，但尚未收到目标的模块结果 | 正常启动目标后刷新；开机服务需要重启设备。仍无结果时检查清单、ABI 和日志 |
| Native `injected` | 已收到该模块、目标类型和目标的完成报告 | 测试模块功能；目标正常退出后仍保留此结果 |
| Native `failed` | 该模块/目标已有失败记录 | 检查对应目标的 loader/core 日志、ELF ABI 和动态依赖 |

Native 汇总键是“模块目录 ID + 目标类型 + 目标值”。一个成功目标随后正常退出时，汇总仍保留 `injected`；配置存在但从未观察到目标时保持 `unknown`。按进程视图会保留原始 PID/进程数据进行分组，但界面名称只显示路径 basename。

汇总时，明确的 `crashed` / `failed` 优先于成功；存在成功且其余范围尚未观察到时仍为 `injected`；全部未观察到才是 `unknown`。进程退出单独显示为 `exited`，保留已有的注入结果。

状态页的“注入次数”只统计有正向 `injected` 基础记录的 Zygote/Native 目标代际，不是所有 exec，也不是模块回调总次数。

## CLI 查询与 daemon 恢复

下面分别查看运行状态与当前配置：

```sh
ksud yzctl status --json
ksud yzctl config get
```

JSON 中的 `kernel_health`、`daemon_health` 与 `native_exit_evidence` 可区分内核功能、daemon 实时响应和历史退出记录。daemon socket 使用随机名称，由内核发布的端点状态发现。脚本应调用 `yzctl status --json` 查询健康状态，不要自行拼接 socket 名称。

daemon 缺失时，在 Root shell 中运行 `ksud yzctl ensure-daemon --abi all`。它只启动当前需要且尚未运行的实例：功能关闭或安全模式下会拒绝启动，已有但无响应的实例保持不动。返回 `reboot_required` 时完整重启；模块库存变更需要重启才能统一加载状态。恢复 daemon 后，通过正常流程重新启动目标；Zygote 和开机服务需要完整重启设备。

`ksud yzctl config set KEY VALUE` 保存配置，并按上面的运行时状态应用设置；布尔值使用 `true` / `false`，拒绝名单使用 `0` / `1` / `2`。例如 `ksud yzctl config set dmesg_log true` 开启 daemon 日志镜像。`ksud yzctl refresh-snapshot` 重建或清除下次启动快照；修改 early 模块后仍需重启。

## 日志与诊断

当前启动的 daemon 日志位于 `/data/adb/ksu/yukizygisk/diagnostics/current/logs/zygiskd64.log` 和 `zygiskd32.log`。打开“镜像到 dmesg”后，daemon 日志也写入 kernel log；内核侧 YukiZygisk 日志本来就进入 dmesg。

YukiSU 会保留 `diagnostics/current` 与上一代 `diagnostics/old`，并记录 boot ID、状态、loader、capture 以及可获得的 tombstone/pstore 文件。通过管理器导出完整 bugreport 时，只要功能开启或已有诊断记录，外层报告会包含 `yukizygisk.tar.gz`。

报告问题至少提供：

1. 实际加载的 LKM/`ksud`/payload 版本或哈希；
2. Android、内核/KMI 与 32/64 位目标；
3. 模块目录 ID、版本、目标与复现步骤；
4. 完整 `yukizygisk.tar.gz`，而不只是状态页截图；
5. 最近一次正常启动和异常启动分别发生了什么。

继续阅读[普通 Zygisk 模块](/yukizygisk/modules/)或 [Native ZN API](/yukizygisk/native-zn/)。

## 源码参考

- [配置默认值](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/settings.hpp)
- [状态与 CLI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yzctl.cpp)
- [daemon 恢复](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/yukizygisk_daemon.cpp)
- [崩溃关联](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/daemon/crash_monitor.cpp)
- [状态页](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/yukizygisk/YukiZygiskScreen.kt)
