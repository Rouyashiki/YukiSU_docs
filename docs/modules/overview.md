---
permalink: /modules/overview/
title: 模块系统
---

# 模块系统

YukiSU 模块可以提供启动脚本、系统文件、WebUI 和进程注入功能。选择模块前，先看它使用哪些组件：

| 组件 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| YukiSU 核心 Root | 内核授权、`su` 与 `ksud` 主链 | 不依赖普通模块、MetaModule 或 YukiZygisk 才能提供 Root |
| 普通模块 | 安装文件、生命周期脚本、属性与 SELinux 规则 | 不自行决定 `system/` 如何挂载 |
| 内置 Kagami / 外部 MetaModule | 把普通模块文件树映射到系统路径；外部挂载脚本优先 | 不提供 Root，也不是 Zygisk 实现 |
| 一次性脚本 | 从 ZIP 手动执行一次带参数的 Root 操作 | 不安装为常驻模块，不参加后续启动 |
| Lua 插件 | 在 `ksud` 的 Lua 运行时中执行回调 | 不是普通模块，不参与 MetaModule 挂载 |
| 普通 Zygisk 模块 | 在 Zygote 子进程中运行标准 Zygisk 回调 | 需要 YukiZygisk，不能替代 Root 或 MetaModule |
| Native ZN 模块 | 按可执行文件名或路径注入原生进程 | 使用单独的 ZN API，不是普通 Zygisk API |

一个普通模块可以同时带脚本、系统文件、WebUI、Zygisk 库或 Native ZN 清单；每一部分仍沿各自链路生效。

## 最小普通模块包

ZIP 根目录应直接放 `module.prop`，不要把整个外层文件夹压进去。一个只提供手动诊断动作的模块可以是：

```text
example-module.zip
├── module.prop
└── action.sh
```

```properties
id=example.report
name=Example report
version=1.0
versionCode=1
author=Example author
description=Print a diagnostic report
```

```sh
#!/system/bin/sh
MODDIR=${0%/*}
printf 'Module directory: %s\n' "$MODDIR"
uname -r
```

脚本使用 LF 换行；通过脚本自身位置计算模块路径，不写死安装时的 `modules_update` 路径。需要定制安装时添加 `customize.sh`，它由安装器加载，可使用 `MODPATH`、`ui_print` 与 `abort`，安装后会被清理。系统文件放进 `system/`，覆盖方式见[模块挂载](/modules/magic-mount/)。

模块包使用 ZIP 容器。v1.8.0 的解压链支持 Store、Deflate、BZip2、LZMA 和 XZ 条目；这不等于接受 `.tar.xz` 或 `.7z`。面向旧管理器发布时优先使用 Deflate，并实际测试安装。

如果只想运行上述动作一次并立刻清理包内容，使用[一次性脚本](/modules/one-shot/)，无需安装普通模块。

## 安装目录与常见文件

活动模块位于：

```text
/data/adb/modules/<目录 ID>/
```

默认安装/更新先放在 `/data/adb/modules_update/<目录 ID>/`，再于下一次正常启动合并；作者主动请求的[热安装](/modules/hot-install/)可以提前切换活动目录。命令和运行状态使用目录名定位模块；`module.prop` 的 `id` 用于展示与更新。两个目录始终作为两个模块处理。

| 文件或目录 | 用来做什么 | 何时生效 |
| --- | --- | --- |
| `module.prop` | `id`、名称、版本、作者、说明及更新/支持链接等元数据 | 安装与列表读取 |
| `customize.sh` | 自定义 ZIP 安装过程 | 安装时 |
| `post-fs-data.sh` | 必须尽早完成的阻塞式准备 | 正常启动的 early stage |
| `post-mount.sh` | 依赖最终模块挂载的动作 | 内置或外部挂载阶段之后 |
| `service.sh` | 守护进程或异步初始化 | service stage |
| `boot-completed.sh` | 依赖 Android framework 已完成启动的工作 | boot-completed stage |
| `uninstall.sh` | 模块真正清理时的卸载逻辑 | 标记移除后的启动阶段，或完整卸载 YukiSU 时 |
| `system.prop` | 通过 YukiSU 的 `resetprop` 路径设置属性 | `post-fs-data` 脚本之后、挂载之前 |
| `sepolicy.rule` | 追加模块 SELinux 规则 | 普通模块脚本之前 |
| `system/` | 交给内置 Kagami 或外部 MetaModule 的文件树 | 下一次挂载阶段 |
| `skip_mount` | 不把 `system/` 交给挂载后端 | 下一次挂载阶段 |
| `initrc/*.rc` | 合并进 `modules.rc`，供 init 解析 | 下一次完整启动 |
| `preinit/preinit.conf` | SELinux setup 之前的早期动作 | 支持该能力时的下一次完整启动 |
| `action.sh` | 用户在管理器中手动触发的一次性动作 | 点击时立即执行 |
| `webroot/` | 模块 WebUI | 打开时 |
| `zygisk/arm64-v8a.so`、`zygisk/armeabi-v7a.so` | 普通 Zygisk 模块库 | 新的 Zygote/应用进程 |
| `zn_modules.txt` | Native ZN 目标与库清单 | 新的匹配原生进程；早期目标依赖下次启动快照 |

`actionIcon` 与 `webuiIcon` 可以在 `module.prop` 中指向模块目录内的相对文件。绝对路径、包含 `..` 的路径或不存在的文件不会被管理器列表接受。

## Action 与桌面快捷方式

已安装、已启用、没有待更新或待卸载状态且包含 `action.sh` 的模块，才能从管理器执行 Action。模块卡片和桌面快捷方式都在执行前重新读取状态；旧快捷方式不能绕过这些条件。待更新时先完成重启或作者支持的热安装。

在模块的快捷方式设置中选择 Action 或 WebUI，设置名称和图标后添加到桌面。Action 快捷方式打开执行页，动作结束后关闭；从模块卡片运行则保留输出页，便于保存日志。桌面固定操作还需启动器支持及相应权限。

快捷方式使用带本机管理器令牌的 `ksu://action` 或 `ksu://webui` 链接。需要自动化调用时，用管理器的“复制 URL Scheme”生成，不要手工猜令牌，也不要公开分享完整链接。Action 以 Root 执行；脚本处理特定应用时应明确目标 Android 用户，不能仅凭包名假定它属于主用户。

## 安装后怎样生效

普通安装完成后，管理器先显示模块卡片，完整文件在下次启动时合并。检查模块是否生效时，按以下顺序查看：

1. **已安装**：ZIP 已通过安装器，进入待更新目录或完成热切换；
2. **已启用**：没有 `disable` 或 `remove` 标记；
3. **脚本已执行**：对应启动阶段确实跑到且返回成功；
4. **文件已映射**：实际挂载后端处理了 `system/`；
5. **进程已重新创建**：Zygisk 或 Native ZN 目标不是旧进程；
6. **功能正常**：打开目标应用或系统组件，检查模块提供的功能。

`disable`、`remove` 与更新状态会立即改变后续扫描，但不会倒转本次启动已经执行的脚本、杀掉已启动的服务、卸下现有挂载或从现有进程中抽出原生库。修改模块状态后完整重启，让文件、服务和目标进程使用同一版本。符合条件的设备也可使用[模拟软重启](/manager/soft-reboot/)重新应用模块流程；它不执行 preinit、init rc 或重新加载内核。

## 正常启动顺序

更早的 [preinit](/modules/preinit/) 与 init rc 使用前一次同步的快照。在标准 `post-fs-data` 流程中，主要执行顺序为：

1. 执行 `/data/adb/post-fs-data.d` 中的公共脚本；
2. 应用待更新/待卸载状态，修复目录上下文并加载模块 SELinux 规则；
3. 恢复持久功能配置并启动需要的 YukiSU 用户空间服务；
4. 执行 MetaModule 的 `post-fs-data.sh`；
5. 执行普通模块的 `post-fs-data.sh`；
6. 执行 Lua 插件的 `post_fs_data` 回调；
7. 加载各模块的 `system.prop`；
8. 执行活动外部 MetaModule 的 `metamount.sh`；没有启用的外部挂载脚本时进入内置 Kagami；
9. 应用按应用卸载配置；
10. 进入 `post-mount`，依次执行公共脚本、MetaModule、普通模块与 Lua 插件回调。

普通 `post-fs-data`、`post-mount` 公共脚本和模块脚本共享 35 秒等待期限。到期后 `ksud` 继续启动流程，脚本进程继续运行。Lua 回调单次上限为 120 秒；外部 `metamount.sh` 会一直等待至结束。

启动阶段等待到脚本非零退出或被信号终止时，会记录警告并继续派发，不因脚本退出码单独中断启动流程。无法创建进程、切换工作目录或执行 shell 则属于执行失败。`service`、`boot-completed` 的异步启动只确认进程成功启动，不等待业务完成。作者应在脚本里检查关键命令、输出失败原因；不要用模块卡片或阶段完成消息判断脚本完成预期操作。

`metamount.sh`、热安装脚本和手动 Action 会检查退出结果，处理方式见各自页面。

`service` 与 `boot-completed` 也按“公共脚本 → MetaModule → 普通模块 → Lua 插件”顺序派发；这些阶段不是 `post-fs-data` 那样的阻塞式整链等待。

因此：

- 在 `post-fs-data.sh` 中准备待挂载文件，此时系统路径尚未替换；
- 依赖挂载结果的逻辑放进 `post-mount.sh`；
- 不要在阻塞阶段等待网络或 framework 服务；
- 长期任务放在 `service.sh`。

越狱/late-load 模式已经错过真正的 early boot。普通模块与 MetaModule 改走 `late-load.sh`，随后再加载属性、挂载并进入后续阶段；需要早期 init 或 Zygote 时机的功能应使用正常开机加载。详见[越狱模式](/guide/jailbreak-mode/)。

## 脚本环境与模块配置

YukiSU 给安装/生命周期脚本提供统一环境，其中包括：

- `KSU=true` 与 `YUKISU=1`；
- `KSU_VER`、`KSU_VER_CODE`、`KSU_KERNEL_VER_CODE` 与 `KSU_UAPI_VER`；
- `KSU_RUNTIME_MODE`；
- 模块脚本中的 `KSU_MODULE=<目录 ID>`；
- 功能已启用时的 `ZYGISK_ENABLED=1`；
- late-load 环境中的 `KSU_LATE_LOAD=1`。

`ZYGISK_ENABLED` 表示功能开关。模块注入结果请查看 [YukiZygisk 状态](/yukizygisk/features/)。

模块版本兼容设置可以改写模块脚本看到的版本环境，并通过继承的 `YUKISU_MODULE_COMPAT` 影响对应 `ksud` 版本查询。实际内核和 UAPI 保持原版本，模块仍须满足它们的要求。排查版本拒绝时，先关闭覆盖，再用真实版本重试。一次性脚本与 preinit 各自使用独立环境，见对应页面。

模块脚本还可以使用 `ksud module config` 管理自己的键值：

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config set once 1 --temp
```

命令通过 `KSU_MODULE` 选择模块。`--temp` 值优先于持久值，并在下一次 `post-fs-data` 开始时清除，包括模拟软重启。配置文件使用二进制格式，通过 CLI 读写。完整命令、多行值、限制和 `manage.*` 功能托管见[模块配置](/modules/module-config/)。

## 如何选择挂载后端

内置 Kagami 默认开启，自动模式选择 OverlayFS / Magic Mount；使用 Kasumi 时需显式选择。系统文件模块默认交给内置挂载，要求指定外部后端的模块则按作者说明安装 MetaModule。纯脚本、属性、规则和不依赖文件替换的界面无需挂载。

外部 MetaModule 的挂载脚本优先于内置 Kagami，不同时重复建立两套计划。详见 [MetaModule](/modules/meta-module/)与[模块挂载](/modules/magic-mount/)。

## 安全模式与早期保护

YukiSU 的**系统安全模式**由 Android 安全模式属性或内核侧音量下键检测触发。`ksud` 会跳过公共/模块/MetaModule/Lua 插件阶段，并给 `/data/adb/modules/` 下的普通模块（包括 MetaModule）写入 `disable`。它用于判断启动故障是否来自模块层。管理器在安全模式下拒绝模块安装，包括从文件管理器或分享入口传入的模块 ZIP；先修复故障并退出安全模式，再安装新模块。

YukiZygisk 还有一个独立的**注入安全模式**：某个同名 Zygote 达到重启阈值后，只停止本次内核运行期间的 YukiZygisk 注入。它不会关闭核心 Root，也不会替你禁用普通模块或 Lua 插件。详见 [YukiZygisk 功能与状态](/yukizygisk/features/)。

[preinit 连续失败保护](/modules/preinit/)与 Kagami 挂载恢复另有各自的计数和恢复入口。preinit 先于普通模块安全模式处理；preinit 启动故障请使用其专门的恢复步骤。

系统安全模式同样修不了 KMI 不匹配、分区刷错或损坏的启动镜像。如果模块全部停用仍无法启动，请看[救砖与恢复](/guide/rescue-bootloop/)。

## 卸载时的清理

在管理器卸载模块先写入 `remove`；真正清理时，普通模块先调用仍启用的外部后端提供的 `metauninstall.sh`，再执行自己的 `uninstall.sh`，最后删除模块配置与目录。MetaModule 在普通模块清理后移除，使后端钩子仍可供普通模块使用。卸载脚本会等待完成；非零退出会记录警告，随后继续删除。作者应让清理脚本可重复执行，不在其中等待网络或用户输入。

完整卸载 YukiSU 时，先恢复并写回启动镜像；恢复失败就停止，保留工具、备份和模块。恢复成功后再运行模块卸载钩子并清理 YukiSU 文件。不要依赖完整卸载跳过 `uninstall.sh`，也不要在钩子中再次刷写启动分区。

## 安装前检查

1. Android 版本、目标 ABI 与应用版本；
2. 实际使用的挂载后端，是否要求特定 MetaModule 版本；
3. 是否依赖 Magisk 专用工具、路径或另一套 Zygisk 实现；
4. ZIP 中是否含 Root 安装脚本、原生库、WebUI、init rc 或 Native ZN 清单；
5. 哪些变化要等重启，是否有可靠卸载与救援方法；
6. 来源、源码、维护记录与问题反馈渠道是否可信。

模块列表会同时标出模块包含的普通 Zygisk 和 Native ZN 类型，不再用单个“已加载”状态概括所有进程。使用这两类模块时，还需启用 YukiZygisk，并查看目标进程的注入状态。

源码依据：[module.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp)、[init_event.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp)、[installer.sh](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh)、[module_compat.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module_compat.cpp)。

另见 [ZIP](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/archive_zip.cpp), [Action](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/ModuleActionAvailability.kt), [Uninstall](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/utils.cpp).
