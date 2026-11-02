---
permalink: /guide/features/
title: 功能概览
---

# 功能概览

YukiSU 提供应用授权、内置模块挂载、YukiZygisk 和启动镜像工具。下表帮你找到对应入口；从旧版本升级时，请同时更新管理器、设备侧 `ksud` 和需要更新的 LKM，步骤见[更新指南](/guide/update/)。

## 各层分别负责什么

| 需求 | 负责组件 | 说明 |
| --- | --- | --- |
| 应用 Root 与权限范围 | 内核、管理器、App Profile | 按应用授权，支持身份、capabilities、SELinux 与 namespace 配置 |
| 模块脚本、属性与策略 | `ksud` | 不要求系统文件挂载或 Zygisk |
| 将模块文件挂到系统路径 | 内置 Kagami 或外部 MetaModule | 有启用的外部 `metamount.sh` 时优先调用它，否则使用内置 Kagami |
| Zygisk / Native ZN 模块 | YukiZygisk | 可独立开关，需核对 ABI、目标进程和模块 API |
| 启动镜像、分区与 AVB 工具 | 管理器与 `ksud` | 文件修补、设备写入和启动配置是不同操作 |
| 一次性维护任务 | 管理器脚本运行器 | 执行后保留历史，不作为已安装模块管理 |

内置 Kagami 的 `auto` 按内核支持、已启用的后端和模块文件布局选择 OverlayFS 或 Magic Mount；实际挂载失败不会自动改走另一个后端。Kasumi 后端需显式选择。外部 MetaModule 脚本执行失败时不会自动再叠加 Kagami 挂载。详见[模块挂载](/modules/magic-mount/)。

## Feature 编号

当前 UAPI 定义 13 项 Feature，ID 并不连续。`0–99` 是 KernelSU 编号区，YukiSU 扩展从 `100` 开始；打开“设置 → 功能控制”即可查看当前内核支持的项目、开关值和强制状态。

| ID | 名称 | 用途 |
| --- | --- | --- |
| 0 | `SU_COMPAT` | 传统 su 入口 |
| 1 | `KERNEL_UMOUNT` | 应用环境中的模块挂载卸载策略 |
| 2 | `SULOG` | su 请求与授权日志 |
| 3 | `ADB_ROOT` | 受支持的 ADB root 链 |
| 4 | `SELINUX_HIDE` | 调整应用侧 SELinux 状态视图 |
| 6 | `SHELL_SU_ADB_ONLY` | shell 已获授权时，进一步限制为可信会话来源 |
| 101 | `MAGISK_COMPAT` | Magisk 风格的 su 授权请求提示 |
| 102 | `DEFAULT_NO_NEW_PRIVS` | 默认 Root Profile 的 YukiSU no-new-privs 标记 |
| 103 | `YUKIZYGISK` | 内置 YukiZygisk 运行时 |
| 104 | `HIDE_BOOTLOADER` | 启动完成后调整 bootloader / Verified Boot 属性视图 |
| 105 | `KASUMI_SUCOMPAT` | Kasumi su 入口 |
| 106 | `KASUMI` | 内置 Kasumi 能力总开关 |
| 107 | `UNSHARE_MNT` | 可选的挂载视图清理 |

管理器将 su 入口呈现为关闭、传统、KSM 三种选择，而非让用户任意组合 ID 0 和 105。禁用 Kasumi 会处理依赖它的 su 设置。配置入口与生效时机见[功能控制](/manager/feature-control/)和[Kasumi](/manager/kasumi/)。

ID 6 不会自动给 shell 授权，也不等于 ADB Root。它在 shell 已获 Root 授权的前提下，检查进程祖先是否来自 `adbd` 或 YukiSU root domain。

v1.8.0 不再使用 ID 5 和 100：WebView 卸载改到“超级用户 → WebView Zygote”的非 Root 配置；“增强安全”已移除。不要在启动配置或脚本中继续设置这两个编号。

## 运行时设置与启动配置

管理器修改 Feature 后会保存配置。ADB Root 还要重启 `adbd`，Magisk 兼容还要调整 su 入口；页面提示失败时，先查看错误并恢复设置。模块接管的 Feature 会标出管理模块，先停用对应模块的接管配置再手动修改。标有“重启生效”的项目，需要完整重启。

启动配置可以强制固定受支持的 Feature。被强制固定的项目会显示对应状态，不能在运行时直接覆盖；要修改它，需要重新修补相关启动镜像并完整重启。安装页面还提供 preinit 开关、启动调试、shell 授权与可选内核模块黑名单。详见[启动配置](/manager/boot-config/)。

这些设置不等价于关闭 SELinux、锁回 bootloader 或保证通过完整性检测。ID 102 是 YukiSU 自己的提权限制标记，也不是通用 Linux `PR_SET_NO_NEW_PRIVS`。

## 模块与运行阶段

- 普通模块使用 `module.prop`、生命周期脚本、`system.prop`、`sepolicy.rule` 等结构。
- [热安装](/modules/hot-install/)要求模块显式支持，并满足当前运行环境条件；它不能即时重放所有启动行为。
- [preinit](/modules/preinit/)在 SELinux setup 之前执行已同步的早期动作，下次完整启动生效，不能靠热安装补跑。
- [一次性脚本](/modules/one-shot/)适合独立维护任务，支持仓库条目和本地 ZIP、参数表单与运行历史。
- [WebUI](/modules/webui/)和 [Lua 插件](/modules/plugin/)是不同扩展入口，应分别核对 API 与权限。

## 授权与认证

Root 授权控制应用能否提权；[App Profile](/manager/app-profile/)进一步约束提权后的身份和环境。撤销授权影响新的请求，已经取得 Root 的进程需退出后再验证。

v1.8.0 的默认 Root SELinux 域为 `u:r:ksu:s0`，默认启用 Feature 102。已有自定义域和逐应用标志继续保留；升级后先测试现有授权，不需要批量重建 Profile。

官方管理器默认通过 APK 身份认证；[SuperKey](/manager/superkey/)和动态管理器提供额外认证入口。动态管理器的兼容版本覆盖只改变它看到的版本值。第三方管理器调用了 YukiSU 没有实现的命令时，改版本值也无法运行该命令。

模块安装使用的全局兼容版本设置与按签名的动态管理器兼容值是两套设置，排查版本限制时要分别记录。

## YukiZygisk

内置运行时支持普通 Zygisk 模块和 Native ZN 目标。管理器提供加载策略、匿名内存选项、进程监视、崩溃保护与恢复状态。开启后完整重启，再启动目标应用，在 YukiZygisk 页面查看注入结果，并检查模块提供的功能是否正常。

关闭 YukiZygisk 后，基础 Root 与普通模块处理仍可使用。详见[功能与状态](/yukizygisk/features/)和 [Native ZN](/yukizygisk/native-zn/)。

## 管理器维护工具

管理器可以修补本地或远程镜像、处理 OTA 槽位、备份与刷写分区、编辑 Ramdisk 文本或二进制、查看与修改 AVB 状态、恢复 App Profile 备份，并导出诊断。使用前核对具体操作写入哪个文件或分区，详见[管理器概览](/manager/overview/)。

管理器统一使用 Material 3 Expressive，提供紧凑布局和动效偏好。Kasumi 规则支持策略绕过、冲突提示与 SELinux Guard；模拟软重启按 daemon 报告的能力开放，并显示规则恢复进度。具体操作见[Kasumi](/manager/kasumi/)和[软重启](/manager/soft-reboot/)。

## 源码

- [Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h)
- [Feature 保存与恢复](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp)
- [挂载后端选择](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp)
