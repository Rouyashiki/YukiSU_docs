---
permalink: /modules/overview/
title: 模块系统
---

# 模块系统

YukiSU 的 Root、模块挂载与进程注入不是同一个功能。先分清边界，排查时才不会把“模块文件没挂上”“脚本没执行”和“Zygisk 没注入”混在一起。

| 组件 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| YukiSU 核心 Root | 内核授权、`su` 与 `ksud` 主链 | 不依赖普通模块、MetaModule 或 YukiZygisk 才能提供 Root |
| 普通模块 | 安装文件、生命周期脚本、属性与 SELinux 规则 | 不自行决定 `system/` 如何挂载 |
| MetaModule | 把普通模块文件树挂到系统路径 | 不提供 Root，也不是 Zygisk 实现 |
| Lua 插件 | 在 `ksud` 的 Lua 运行时中执行回调 | 不是普通模块，不参与 MetaModule 挂载 |
| 普通 Zygisk 模块 | 在 Zygote 子进程中运行标准 Zygisk 回调 | 需要 YukiZygisk，不能替代 Root 或 MetaModule |
| Native ZN 模块 | 按可执行文件名或路径注入原生进程 | 使用单独的 ZN API，不是普通 Zygisk API |

一个普通模块可以同时带脚本、系统文件、WebUI、Zygisk 库或 Native ZN 清单；每一部分仍沿各自链路生效。

## 安装目录与常见文件

活动模块位于：

```text
/data/adb/modules/<目录 ID>/
```

更新内容先放在 `/data/adb/modules_update/<目录 ID>/`，再于下一次正常启动合并。运行时真正用来寻址模块的是目录名；`module.prop` 的 `id` 仍用于展示与更新元数据，但不能把两个不同目录合成同一个运行实例。

| 文件或目录 | 用来做什么 | 生效边界 |
| --- | --- | --- |
| `module.prop` | `id`、名称、版本、作者、说明及更新/支持链接等元数据 | 安装与列表读取 |
| `customize.sh` | 自定义 ZIP 安装过程 | 安装时 |
| `post-fs-data.sh` | 必须尽早完成的阻塞式准备 | 正常启动的 early stage |
| `post-mount.sh` | 依赖最终模块挂载的动作 | `metamount.sh` 之后 |
| `service.sh` | 守护进程或异步初始化 | service stage |
| `boot-completed.sh` | 依赖 Android framework 已完成启动的工作 | boot-completed stage |
| `uninstall.sh` | 模块真正清理时的卸载逻辑 | 标记移除后的启动阶段 |
| `system.prop` | 通过 YukiSU 的 `resetprop` 路径设置属性 | `post-fs-data` 脚本之后、挂载之前 |
| `sepolicy.rule` | 追加模块 SELinux 规则 | 普通模块脚本之前 |
| `system/` | 交给 MetaModule 的文件树 | 下一次挂载阶段 |
| `skip_mount` | 不把 `system/` 交给挂载后端 | 下一次挂载阶段 |
| `initrc/*.rc` | 合并进 pre-init `modules.rc` | 下一次完整启动 |
| `action.sh` | 用户在管理器中手动触发的一次性动作 | 点击时立即执行 |
| `webroot/` | 模块 WebUI | 打开时 |
| `zygisk/arm64-v8a.so`、`zygisk/armeabi-v7a.so` | 普通 Zygisk 模块库 | 新的 Zygote/应用进程 |
| `zn_modules.txt` | Native ZN 目标与库清单 | 新的匹配原生进程；早期目标依赖下次启动快照 |

`actionIcon` 与 `webuiIcon` 可以在 `module.prop` 中指向模块目录内的相对文件。绝对路径、包含 `..` 的路径或不存在的文件不会被管理器列表接受。

## “已安装”不等于“已生效”

安装完成后，管理器可以先显示模块卡片，但完整负载仍可能在待更新目录。应分别确认：

1. **已安装**：ZIP 已通过安装器并写入待更新状态；
2. **已启用**：没有 `disable` 或 `remove` 标记；
3. **脚本已执行**：对应启动阶段确实跑到且返回成功；
4. **文件已挂载**：活动 MetaModule 处理了 `system/`；
5. **进程已重新创建**：Zygisk 或 Native ZN 目标不是旧进程；
6. **功能正常**：目标系统组件或应用出现可验证结果。

`disable`、`remove` 与更新状态会立即改变后续扫描，但不会倒转本次启动已经执行的脚本、杀掉已启动的服务、卸下现有挂载或从现有进程中抽出原生库。把一次完整重启当作模块状态收敛的可靠边界。

## 正常启动顺序

在标准 `post-fs-data` 流程中，源码当前执行顺序为：

1. 执行 `/data/adb/post-fs-data.d` 中的公共脚本；
2. 应用待更新/待卸载状态，修复目录上下文并加载模块 SELinux 规则；
3. 恢复持久功能配置并启动需要的 YukiSU 用户空间服务；
4. 执行 MetaModule 的 `post-fs-data.sh`；
5. 执行普通模块的 `post-fs-data.sh`；
6. 执行 Lua 插件的 `post_fs_data` 回调；
7. 加载各模块的 `system.prop`；
8. 执行活动 MetaModule 的 `metamount.sh`；
9. 应用按应用卸载配置；
10. 进入 `post-mount`，依次执行公共脚本、MetaModule、普通模块与 Lua 插件回调。

`service` 与 `boot-completed` 也按“公共脚本 → MetaModule → 普通模块 → Lua 插件”顺序派发；这些阶段不是 `post-fs-data` 那样的阻塞式整链等待。

因此：

- 在 `post-fs-data.sh` 中准备待挂载文件，但不要假设最终系统路径已经替换；
- 依赖挂载结果的逻辑放进 `post-mount.sh`；
- 不要在阻塞阶段等待网络或 framework 服务；
- 长期任务放在 `service.sh`，不要靠反复点击 Action 维持。

越狱/late-load 模式已经错过真正的 early boot。普通模块与 MetaModule 改走 `late-load.sh`，随后再加载属性、挂载并进入后续阶段；它不能把代码送回已经过去的 init 或 Zygote 时刻。详见[越狱模式](/guide/jailbreak-mode/)。

## 脚本环境与模块配置

YukiSU 给安装/生命周期脚本提供统一环境，其中包括：

- `KSU=true` 与 `YUKISU=1`；
- `KSU_VER`、`KSU_VER_CODE`、`KSU_KERNEL_VER_CODE` 与 `KSU_UAPI_VER`；
- `KSU_RUNTIME_MODE`；
- 模块脚本中的 `KSU_MODULE=<目录 ID>`；
- 功能已启用时的 `ZYGISK_ENABLED=1`；
- late-load 环境中的 `KSU_LATE_LOAD=1`。

不要仅用 `ZYGISK_ENABLED` 判断某个 Zygote 或模块已经成功注入；它只是当前功能开关状态。

模块脚本还可以使用 `ksud module config` 管理自己的键值：

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config set once 1 --temp
```

命令通过 `KSU_MODULE` 选择模块。持久配置保存在 `/data/adb/ksu/module_configs/<目录 ID>/persist.config`；`--temp` 值优先于持久值，并在下一次 `post-fs-data` 开始时清除。

## 什么时候需要 MetaModule

只跑脚本、设置属性、加载 SELinux 规则，或者提供不依赖系统文件替换的 Action/WebUI，通常不需要 MetaModule。

需要向 `/system`、`vendor`、`product`、`system_ext` 等树暴露文件，或明确依赖 OverlayFS、bind mount、Magic Mount 语义时，则需要一个满足该模块要求的 MetaModule。同一时间只能有一个活动后端。详见 [MetaModule](/modules/meta-module/)与[模块挂载](/modules/magic-mount/)。

## 两种安全模式不要混淆

YukiSU 的**系统安全模式**由 Android 安全模式属性或内核侧音量下键检测触发。`ksud` 会跳过公共/模块/MetaModule/Lua 插件阶段，并给 `/data/adb/modules/` 下的普通模块（包括 MetaModule）写入 `disable`。它用于判断启动故障是否来自模块层。

YukiZygisk 还有一个独立的**注入安全模式**：某个同名 Zygote 达到重启阈值后，只停止本次内核运行期间的 YukiZygisk 注入。它不会关闭核心 Root，也不会替你禁用普通模块或 Lua 插件。详见 [YukiZygisk 功能与状态](/yukizygisk/features/)。

系统安全模式同样修不了 KMI 不匹配、分区刷错或损坏的启动镜像。如果模块全部停用仍无法启动，请看[救砖与恢复](/guide/rescue-bootloop/)。

## 安装前至少核对

1. Android 版本、目标 ABI 与应用版本；
2. 是否需要特定 MetaModule 及其版本；
3. 是否依赖 Magisk 专用工具、路径或另一套 Zygisk 实现；
4. ZIP 中是否含 Root 安装脚本、原生库、WebUI、init rc 或 Native ZN 清单；
5. 哪些变化要等重启，是否有可靠卸载与救援方法；
6. 来源、源码、维护记录与问题反馈渠道是否可信。

模块列表现在会标出普通 Zygisk 或 Native ZN 类型；这只是分类与运行状态线索，不替代对模块实际效果的验证。
