---
permalink: /modules/preinit/
title: 模块 preinit
---

# 模块 preinit

`preinit/` 让模块在 Android 加载 SELinux 策略、解析常规 init rc 之前执行少量早期动作。它比 `post-fs-data.sh` 更早，使用下文的 `preinit.conf` 配置语言。

启用 preinit 需要内核编译支持、启动参数允许执行，并在 PID 1 运行 `selinux_setup` 前加载 YukiSU。late-load 和 `preinit=0` 会停用这条路径；切回正常开机加载并重新配置启动镜像后，完整重启才会执行。管理器安装选项中的“禁用模块 preinit”对应 `--no-preinit`；详情见[安装管理器与 Root](/manager/install/)。

[模拟软重启](/manager/soft-reboot/)不会再次经过内核 preinit 入口。即使它刷新了快照，仍须完整重启才会执行新动作。

## 模块布局

```text
example-module/
├── module.prop
└── preinit/
    ├── preinit.conf
    └── helper          # optional static executable
```

安装、启用/禁用、移除模块及正常 `post-fs-data` 会同步下次启动使用的副本。`ksud` 优先选择 `/metadata/vold/ksu/`（UAPI 至少为 6 且该目录的父目录存在），否则选择可用的 `/metadata/watchdog/ksu/`，最后回退 `/metadata/ksu/`。副本位于其中的 `preinit/<id>/`，早期动作需要的资源必须随 `preinit/` 一起复制，不能依赖 `/data/adb/modules/` 此时已可访问。

`preinit.conf` 必须是普通文件；同步器只接受普通文件和目录，不接受符号链接或特殊文件。整体存储预算最多 4 MiB（包括按块计费和清单开销），并要求保留 8 MiB 可用空间。把大二进制与普通模块资源放在 `post-fs-data` 或更晚阶段使用。

## 配置语言

每行一个动作，空行与以 `#` 开头的注释被跳过。空白分隔参数，双引号可包住含空白参数，支持 `\"` 和 `\\` 转义；不做 shell 变量展开、管道、重定向或命令替换。

| 动作 | 语法 | 行为 |
| --- | --- | --- |
| `insmod` | `insmod module.ko [name=value ...]` | 加载指定内核模块，仍需满足目标内核要求 |
| `exec` | `exec [-t 毫秒] helper [arg ...]` | 执行程序并转发输出，默认等待 5000 毫秒 |
| `write` | `write /absolute/path "content"` | 向已存在的目标写入指定内容，不自动补换行 |

例如，一个只输出诊断信息的静态 `helper` 可以这样调用：

```text
# helper must be built for the target device
exec -t 1000 ./helper --report
```

`exec` 使用匹配设备 ABI 的静态 ELF，不能依赖此时尚不可用的动态链接器、shell、Java、网络或 `/data/adb` 工具。程序以模块的 preinit 副本目录为工作目录，环境只有明确提供的 `KSU=true`、`KSU_PREINIT=1`、`MODID`、`PREINIT_DIR` 和 `PATH=/system/bin:/vendor/bin`。标准输入关闭；stdout/stderr 被转发到内核日志。

动作名末尾可加 `?`（如 `exec?`、`insmod?`）声明允许该动作失败后继续；这不忽略配置语法错误。模块按 ID 排序执行，模块内按行顺序处理。未标为可选的动作失败会结束该模块的后续动作，然后继续其他模块。整个 worker 有 30 秒总上限，单次 `exec -t` 不会突破这个总上限；监管进程也会清理派生进程，因此 preinit 不适合启动长期守护进程。

## 状态与日志

打开模块页的“模块 preinit”，查看内核支持、启动计数和模块准备状态。Root shell 查询命令：

```sh
ksud module preinit status
ksud module preinit status --json
```

| 状态 | 含义 |
| --- | --- |
| `ok` | 文件已准备，下次完整启动时执行 |
| `unsupported` | 当前内核未报告可用的 preinit 支持 |
| `no_space` | 超出存储预算或剩余空间不足 |
| `error` | 格式、文件或持久化错误 |
| `bootloop` | 同步成功的内容被连续启动失败保护阻止 |

看到 `ok` 后完整重启，再查内核日志：`ksu_preinit: [模块ID]` 记录动作执行结果，`ksu_preinit[模块ID]:` 记录程序输出。尽快导出日志，避免旧内容被覆盖；反馈时附上模块 ID、动作、返回码和本次启动信息。

手工修改模块 `preinit/` 后，可以用 `ksud initrc refresh` 同步下一次启动的快照；该命令会写入状态，也会更新 init rc。它不会在当前系统中运行 preinit。

## 连续启动失败保护

有 preinit 内容时，runner 在执行前持久化尝试计数。连续三次没有到达 YukiSU 的 boot-completed 路径后，下一次启动跳过 preinit，将计数保留为 4。保护触发后，即使随后成功进入系统，也不会自动清除停用状态。

先禁用或修复导致故障的模块，再在管理器中重置计数，或执行：

```sh
ksud module preinit reset
```

重置只解除保护；下次完整启动才会重试。普通成功启动会清除尚未触发保护的尝试计数。源码内容确实变化并成功同步时可以清除计数；仅修复输出副本、重复刷新或迁移旧清单不会被当作新的源码版本来解除保护。

preinit 发生在普通模块安全模式处理之前。遇到 preinit 启动故障，使用本页的保护与重置流程；设备已无法启动时，按[救砖与恢复](/guide/rescue-bootloop/)移除早期快照。[系统安全模式](/modules/overview/)与 YukiZygisk 注入安全模式各自处理后续阶段。

## 与 `initrc/` 的区别

`initrc/*.rc` 会被收集合并为 `modules.rc`，由 Android init 在其 rc 解析阶段处理；`preinit/preinit.conf` 则由早期 runner 解释。`--no-custom-rc` 与 `--no-preinit` 是不同的启动配置，禁用其中一种不等于禁用另一种。

源码依据：[快照、预算与状态](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/preinit.cpp)、[早期 runner](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/preinit/runner/runner.c)、[内核入口](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/preinit/preinit.c)。
