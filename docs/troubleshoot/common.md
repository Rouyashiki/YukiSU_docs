---
permalink: /troubleshoot/common/
title: 常见问题排查
---

# 常见问题排查

先记下最后一次正常状态、失败前的改动，以及 Manager、运行中 LKM、设备侧 `ksud` 的版本。只更新 APK 不会更新运行中的 LKM；设备侧 `ksud` 也要单独同步。

## 从症状选择入口

| 症状 | 首先核对 |
| --- | --- |
| APK 已安装，但首页未安装/不支持 | 是否真的加载 LKM、KMI、内核能力与认证 |
| 新功能按钮存在，执行却失败 | 设备侧 `ksud` 是否匹配、LKM 是否支持该接口 |
| 模块装好但没有文件效果 | 活动挂载后端、模块状态、目标 namespace |
| 安装后不用重启却报错 | 是否请求并满足热安装条件、脚本是否失败 |
| preinit 显示准备成功但无效果 | 是否完整重启、早期日志、保护计数与实际动作结果 |
| Zygisk 模块无效 | 普通/Native 类型、ABI、目标、注入与退出证据 |
| Android 无法启动 | 修改的镜像/槽位、普通模块或早期 preinit，见[恢复指南](/guide/rescue-bootloop/) |

## Root、管理器与 shell

安装 APK 不等于已加载 LKM。确认 [Android/KMI 范围](/guide/compatibility/)、当前加载方式及认证状态；签名认证失败、SuperKey 不正确和 LKM 未加载是不同问题。

普通应用应先有授权，随后检查 App Profile 的 UID、capabilities、SELinux domain、namespace 与 YukiSU no-new-privs 标记。撤销权限后，已有 Root 进程不会自动降权，应退出后再验证。

shell 已有授权却被拒绝时，检查 Feature 6：它要求可信的 `adbd` 或 YukiSU root-domain 祖先，不能仅凭 UID 2000 推断应该放行。动态管理器的兼容版本覆盖也不会替代授权或新增内核能力。

## `ksud` 完整性告警或版本不一致

Manager 比较 APK 内置 ELF 与 `/data/adb/ksud`。不匹配时不会执行不受信任的文件来查询版本，因此已安装侧显示“未知”可以是预期行为。

保留内置版本、原始显示与告警时间，确认 APK 来源后使用首页详情中的同步功能。冷启动自动同步默认关闭。同步只处理设备侧 `ksud`，不更新 LKM 或启动镜像。

若同步后再次被替换，应排查其他管理器、安装器或启动脚本；记录是哪次操作替换了文件，再停用对应脚本或管理器。见[设置与维护](/manager/settings/)。

## Feature 不支持、回滚或被强制固定

- 显示“不支持”时先核对编号：v1.8.0 已停用 5 和 100，继续升级也不会恢复这两个开关。其他功能则更新配套 `ksud` 和支持它的匹配 LKM，再完整重启。
- 保存失败或后续 ADB/Magisk 操作失败时保留错误，查看运行值与持久化配置是否回滚。
- “强制”表示启动配置固定了该值；需修改相关镜像并完整重启，运行时不能覆盖。
- su 入口是关闭/传统/KSM 的关联设置。Kasumi 未初始化或被禁用时，相关 su 功能会受限。
- 显示由模块管理时，查看管理模块及其 `manage.*` 配置；不要反复覆盖被模块接管的值。详见[模块配置](/modules/module-config/)。
- 早启动配置、preinit 和 LKM 更新需要完整重启。模拟软重启按 daemon 的支持状态开放，Kasumi 规则还需要完成恢复。

完整编号和生效条件见[功能控制](/manager/feature-control/)与[启动配置](/manager/boot-config/)。

## 模块脚本没有运行或启动变慢

确认模块没有 `disable`、待卸载或待更新状态，并检查安全模式、脚本换行/shebang、所用命令和对应阶段日志。

`post-fs-data.sh` 不应等待尚未启动的 framework 或网络。需要挂载后的文件时，使用 `post-mount` 或之后的阶段。late-load 不会补跑 `post-fs-data.sh`，应由模块实现 `late-load.sh`。

普通早期脚本有共享等待期限，但超时停止等待不代表进程已被杀掉；不能依靠它终止失控脚本。preinit 有自己的动作和总阶段终止机制，见[模块系统](/modules/overview/)与 [preinit](/modules/preinit/)。

## 模块文件没有挂载

先确定模块确实有 `system/` 内容且没有 `skip_mount`，再确认实际挂载负责人：

1. 有启用的外部 MetaModule `metamount.sh`：检查它的安装、启动与挂载输出；执行失败不会自动改用 Kagami。
2. 没有该外部脚本：检查内置 Kagami 的设置、实际后端和挂载状态，不要因没装 MetaModule 就判定缺依赖。
3. Kagami `auto` 在条件允许时选择 OverlayFS，否则选择启用的 Magic Mount；挂载执行失败不会自动换后端。Kasumi 后端需显式选择，并依赖内核能力。
4. 全局可见而目标应用不可见时，检查 App Profile、内核卸载、Kasumi 视图和 Feature 107。

只在 WebView sandbox 中缺失时，检查“超级用户 → WebView Zygote”的非 Root 配置及全局 Kernel Umount；v1.8.0 不再使用 Feature 5。保存后完整重启以重建共享 Zygote，再检查目标页面。不要同时切换后端、模块版本和卸载策略。详见[挂载指南](/modules/magic-mount/)。

## 软重启不可用或恢复失败

先查看管理器给出的原因：设备侧 `ksud` 过旧、启动尚未完成、安全模式、规则不可恢复或挂载保护都会阻止请求。同步 v1.8.0 配套 `ksud` 并确认 LKM 版本后再试；修改启动组件后先完整重启。

“请求已接受”只表示流程已经开始，继续等待结果。`completed_pending` 表示 Android 已启动，部分隐藏规则正在等待父目录出现；查看待恢复数量和 Kasumi 规则状态，等对应目录出现后刷新。`failed` 则要检查失败阶段和错误，保存日志并处理故障，必要时完整重启。不要连续重复提交软重启请求。步骤与状态说明见[软重启](/manager/soft-reboot/)。

## 热安装失败或仍提示重启

保存安装器与即时脚本的完整输出。先核对模块是否显式声明支持、是否为普通模块、当前是否处于安全模式以及请求与路径是否有效。

提交新模块目录之后，热安装脚本非零退出或超时不会回滚活动目录，也不会撤销脚本已经做出的系统修改。`init.rc`、preinit 与已有应用进程状态仍需完整启动或进程重建，见[热安装边界](/modules/hot-install/)。

## preinit 未准备、被跳过或保护触发

模块页的“模块 preinit”可以查看内核支持、准备状态与启动失败计数。`unsupported` 的三种原因是 late-load、启动参数 `preinit=0`、LKM 未编译 preinit 支持。`no_space` 时缩小模块的 preinit 内容，不要删除 `/metadata` 中的加密或 OTA 数据。

`ok` 表示启动所需文件已准备好，动作要到下一次完整启动才执行。完整重启后同时查看 runner 的 `ksu_preinit: [模块ID]` 动作诊断与程序输出的 `ksu_preinit[模块ID]:` 日志；连续启动失败触发保护时先修复或禁用问题模块，再重置计数。重置不会立即执行动作。详见[preinit](/modules/preinit/)。

## 一次性脚本找不到、参数失败或结果不适用

一次性脚本不进入已安装或可更新模块列表，结果在最近运行记录中查看。检查 ZIP 结构、`action.sh`、`params.json` 和输入；退出码 2 表示不适用，不应把它误报成普通模块安装成功。

运行结束后会清理临时目录；保留的最近运行记录不等于已安装模块，也不会撤销脚本已做的修改。详见[一次性脚本](/modules/one-shot/)。

## YukiZygisk 已开启但模块无效

1. 先确认基本 Root 与所需文件挂载正常。
2. 检查全局注入安全模式是否触发、待测普通 Zygisk 模块是否被崩溃保护暂停，再核对模块类型、ABI 和支持的目标。
3. 普通 Zygisk 模块检查加载策略；Native ZN 固定走 Bionic，查看对应加载器和依赖错误，切换 YukiLinker 开关不会改变它的路径。修改启动配置后完整重启。
4. 启动目标，再查看进程监视、Native 目标、模块诊断与 daemon 恢复状态。
5. 记录 PID、进程启动时间、注入结果和退出记录，并导出 bugreport。

显示“未观察到”时，先启动目标再刷新。显示“注入失败”时查看对应模块错误。进程在注入成功后退出时，查看退出码和崩溃日志，找到退出原因。

内核的全局 Zygote 保护与模块级崩溃隔离是不同机制。恢复 daemon 不会重新执行已有进程中的模块初始化。恢复成功后重新启动目标应用；如果故障涉及 Zygote、开机服务，或状态显示 `reboot_required`，应完整重启，再检查注入结果。详见[运行状态](/yukizygisk/features/)和 [Native ZN](/yukizygisk/native-zn/)。

## 镜像或恢复操作失败

记录输入来源、SHA-256、目标 KMI、实际分区与槽位、Ramdisk/ImgPatch/仅配置模式。ImgPatch 使用内容关联的备份，恢复时会校验；不要通过重命名旧备份绕过检查。

“仅配置”不安装 LKM；再次修补会重建受管配置，未指定的旧 shell 授权、强制 Feature 和黑名单会被清除。AVB 控制不会替你修复错误镜像。操作步骤见[镜像模式](/guide/install-modes/)、[分区工具](/manager/partition/)与[恢复指南](/guide/rescue-bootloop/)。

## 反馈

给出最短复现、第一条有效错误、完整版本与最后一次改动，并保留失败前后的状态。分享前去掉 SuperKey、账号及其他不必要的个人数据。完整清单见[如何有效提问](/troubleshoot/asking/)。
