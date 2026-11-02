---
permalink: /manager/kasumi/
title: Kasumi 与挂载配置
---

# Kasumi 与挂载配置

YukiSU v1.8.0 内置 Kasumi API 18 和用户空间 Kagami 控制器。首页右上角的 Kasumi 入口提供状态、设置、规则与日志四页；模块卡片另有逐模块挂载配置。

## 先区分三种控制

| 控制 | 位置 | 作用与时机 |
| --- | --- | --- |
| Kasumi Feature 106 | 设置 → 功能控制 | 控制内置 Kasumi 的启用请求；关闭不会立即拆除现有视图，按提示完整重启 |
| 内置挂载 | 设置 | 选择是否使用内置 Kagami 挂载引擎，保存后重启生效 |
| Kasumi 视图与细项 | Kasumi → 设置 | 配置内核视图、隐藏及相关能力；支持的运行时项保存后尝试应用，挂载后端选项等下一次启动 |

内置挂载不要求另外安装一个 MetaModule。若外部 MetaModule 已取得挂载所有权，页面会显示其 ID，并禁用不再适用的内置挂载配置；不要同时让两套引擎处理同一模块树。挂载选择见 [MetaModule](/modules/meta-module/)。

保存配置后刷新状态。页面报告“已保存，但内核应用失败”时，配置已经落盘，运行时仍未完成；先保留错误，修复原因后使用“重试应用”并刷新状态。

## 状态页

先核对内核能力是否可用、协议是否兼容，以及版本。状态页还显示存储/挂载基础信息、模块实际策略与活动视图；修改模块模式后完整重启，在状态页查看该模块的实际策略。

安装 v1.8.0 APK 不会替换旧 LKM 或正在运行的控制器。提示接口不兼容时，同步同版本 `ksud`、安装匹配 LKM 并完整重启。

API 18 增加逐规则全局作用域；只有内核报告 `rule_bypass` 能力时，管理器才允许开启。软重启还单独检查 `safe_rule_retire` 等能力，不能只按 API 版本判断，见[软重启](/manager/soft-reboot/)。

## 挂载策略与逐模块规则

模块卡片可选择 `auto`、`kasumi`、`overlay`、`magic` 或 `none`，并添加绝对目标路径规则。路径规则还可以使用 `hide`。`none` 是挂载策略，不等于停用整个模块；脚本是否运行仍由模块状态和生命周期决定。

模块页菜单支持按策略筛选、只看 Kasumi 活动模块，以及检查挂载冲突。冲突检查列出竞争同一路径的模块；脚本执行与脚本建立的动态挂载需要查看对应日志。

设置页可控制 OverlayFS、Magic Mount 是否允许参与规划，选择存储文件系统（自动、ext4、erofs、tmpfs），并调整挂载源名、临时目录及镜像路径。改变存储和后端配置后完整重启，重新核对实际策略。

## 内核视图与隐藏规则

细项由运行内核返回的能力决定，包括挂载隐藏、maps 映射、OverlayFS xattr 隐藏、statfs 视图和 SELinux Guard。v1.8.0 已移除“激进挂载隐藏”，不要继续按旧教程配置该模式。

**SELinux Guard** 默认关闭，是对 SELinux context 写入进行有界时序补偿的实验性选项。它不会切换 Enforcing/Permissive，也不会替代 App Profile 的 domain 和 SELinux 规则。排查这类兼容问题时再开启，并对比目标应用行为。

用户隐藏规则需要绝对路径，不能使用该入口隐藏保留的 `/system/bin/su`。规则区分等待、绑定中、已绑定与错误。父目录尚未创建时，规则可以保持等待；路径已存在却持续未绑定或报告错误时，查看日志并重试。maps 规则针对映射的路径、设备号和 inode 等信息，不会改变文件的真实来源。

“清空规则”修改活动规则，不能当作完整卸载或恢复所有持久配置的按钮。修改前记录原配置；模块挂载和视图的最终行为要在目标应用进程中验证。

## 全局规则：绕过进程策略

“全局规则（绕过策略）”让所选 Kasumi 规则绕过通常的进程策略，作用于所有进程，包括通常豁免的管理器或 Root 进程。它不会给应用授予 Root，也不会改变 OverlayFS/Magic Mount 规则。

- **模块级开关：** 对该模块全部 Kasumi 规则开启全局作用域。
- **路径规则开关：** 只对该条规则开启；模块级已开启时，单条关闭不能抵消它。
- **用户隐藏规则：** 已有条目可编辑作用域；输入框旁“将新规则设为全局”只影响下一次点击“添加”的路径。

默认关闭。只有确实需要相同文件视图覆盖 Root 与普通应用时才开启。隐藏管理器或工具必需的路径会让它们失去访问；修改前记录规则，以便从同一页面撤销。保存模块配置后，Kasumi 规则会尝试即时应用，挂载后端变化仍需重启。

## 与其他内核组件冲突

Kasumi 拒绝与已识别的冲突组件同时启用：`kasumi_lkm`、`pathmask`、`procguard`、`nomount`、`susfs_guard_lkm`、`hybridmount`，以及运行内核内建的 `CONFIG_KSU_SUSFS=y`、`CONFIG_NOMOUNT=y`、`CONFIG_HYBRIDMOUNT=y`。Kasumi 已活动时，加载这些冲突 `.ko` 也会被拒绝。

弹窗区分“已有模块阻止 Kasumi 启用”“内建功能冲突”和“新模块加载被拒绝”。“我已知晓”只确认警告，不修改配置、不卸载组件，也不解除限制。

选择保留一种实现：停用冲突模块的加载来源，或关闭 Kasumi，然后完整重启。冲突功能已经编进内核时，保持 Kasumi 关闭，或改用不含该功能的内核。此检查只覆盖已识别组件；没有警告不代表任意内核修改都兼容。

## 重启与排障

v1.8.0 在满足能力和恢复条件时允许 Kasumi 软重启，不再仅因 Kasumi 启用而阻止。以管理器显示的 daemon 支持状态为准；不可用时按[软重启](/manager/soft-reboot/)中的具体原因处理。关闭 Feature 106 后，要完全退出本次内核生命周期仍须完整重启；late-load 的临时 Root 也随完整重启结束。

提交问题时同时提供：

- YukiSU、`ksud`、Kasumi 版本与支持状态；
- 内置挂载开关、外部挂载所有者、全局及逐模块配置；
- 期望策略和状态页实际策略、规则状态；
- 原始日志以及复现进程的文件/挂载观察结果。

Kasumi 日志页提供刷新和清空。清空前先保存相关日志；截图包含实际策略和规则状态，并附上目标进程的文件或挂载结果。

## 源码

[Kasumi 界面](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/KasumiConfig.kt)、[设置与能力](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/KasumiSettings.kt)、[控制器](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/util/KasumiManager.kt)、[内核生命周期](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/kasumi/core/kasumi_bootstrap.c)、[软重启限制](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/init_event.cpp)。

[kasumi.h](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/kasumi.h), [KasumiMountConfigDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/KasumiMountConfigDialog.kt), [sucompat_module_guard.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/feature/sucompat_module_guard.c), [kasumi_config_guard.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/kasumi/core/kasumi_config_guard.c), [KasumiConflictDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/component/KasumiConflictDialog.kt).
