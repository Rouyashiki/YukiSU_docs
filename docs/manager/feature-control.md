---
permalink: /manager/feature-control/
title: 功能控制
---

# 功能控制

入口为“设置 → 功能控制”。YukiSU 定义 13 个 Feature：`0–4`、`6` 和 `101–107`。su 模式选择器同时管理 ID 0、105 和关联的 101，其余功能按页面控制。

## 支持、当前值与启动锁定

管理器读取正在运行的内核返回的支持状态、当前值与强制标记。旧 LKM 未实现的功能会显示不支持；APK 更新不会自动给旧内核增加功能。

普通修改由 `ksud` 设置运行时值并保存，失败时尝试回滚，页面随后读取实际值。sulog、Magisk 兼容和 YukiZygisk 还有 daemon 或启动状态处理，因此直接调用内核 setter 不等同于完整设置流程。

被启动配置**强制开启或关闭**的功能会显示锁定，运行时修改被拒绝。解除锁定需要在安装页改为“不锁定”、重新修补并刷入目标镜像，再完整重启；重装 APK 或清除管理器数据不能解锁。见[启动配置](/manager/boot-config/)。

## Feature 编号与作用

`0–99` 是上游兼容预留区。旧 ID 5（WebView 卸载）和 ID 100（严格安全策略）已移除并保留为空位，不要再写入旧配置。WebView 卸载改在[超级用户页的 WebView Zygote Profile](/manager/app-profile/)中设置。

| ID | 功能 | 当前行为与生效条件 |
| --- | --- | --- |
| 0 | 传统 su 兼容 | su 三态中的“传统”；与 Kasumi su 兼容互斥 |
| 1 | Kernel Umount | 按 Profile 卸载模块挂载的全局机制；界面“关闭内核 umount”是反向开关 |
| 2 | 超级用户日志 | 记录内核超级用户事件，由 `sulogd` 持久化；开启后设置页显示使用日志查看器 |
| 3 | ADB Root | 使 `adbd` 以 Root 身份运行；保存后管理器重启 `adbd`，当前 ADB 会话需要重连 |
| 4 | SELinux 隐藏 | 处理应用侧特定 SELinux 策略观察路径；按页面提示重启验证 |
| 6 | 限制 Shell 仅可通过 ADB 获取 Root | 在已有 shell 授权之上，要求调用进程的祖先链包含 `adbd` 或 YukiSU Root 域进程；默认关闭 |
| 101 | Magisk 风格授权弹窗 | 在 Kasumi su 模式中向未授权应用提供首次请求交互；最终授权仍受 App Profile 控制 |
| 102 | 默认防逃逸（no-new-privs） | 默认开启；默认 Root Profile 阻止再次通过 YukiSU 提权，自定义 Profile 单独决定 |
| 103 | YukiZygisk | 内置注入链路总开关；完整重启后分别验证 Zygote、Native 目标和模块状态 |
| 104 | 解锁状态隐藏 | 在 service 阶段改写部分 bootloader/verified-boot 属性；启停均需重启验证 |
| 105 | Kasumi su 兼容 | su 三态中的“Kasumi（实验性功能）”；需要对应内核能力与可用的 Kasumi |
| 106 | Kasumi | 内置 Kasumi 功能开关；与“内置挂载”设置不同，按页面提示重启 |
| 107 | 挂载视图整理 | 模块卸载后重建 mount namespace，并整理相应可见编号；重启目标应用后生效 |

Kernel Umount、App Profile 的“卸载模块”、WebView 卸载和挂载视图整理是关联但不同的控制。关闭全局卸载后，其余选项不能替代被关闭的机制；已启动应用也不会自动重建 namespace。

## 升级后的默认值与模块接管

升级到 v1.8.0 后，`ksud` 会执行一次默认值迁移，将 Feature 102 开启并持久化，包括旧配置中保存为关闭的情况。迁移完成后，你再次手动关闭的值会保留。旧自定义 Root Profile 的防逃逸标志与 SELinux domain 不会被全局默认值覆盖；需要调整时逐项编辑对应 Profile。

显示“由模块管理”的功能不能直接从管理器或普通 `ksud feature set/set-save` 修改。到接管模块的配置中修改，或停用该模块、重启后再使用功能控制页。su 兼容的 0、101、105 是关联组：模块接管其中一项时，整个模式组由它控制；关闭 Kasumi 所需的关联转换也受此限制。启动强制值仍优先于模块接管。

排查“保存值与当前值不同”时分别查询：

```sh
/data/adb/ksud feature list
/data/adb/ksud feature get default_no_new_privs
/data/adb/ksud feature get default_no_new_privs --config
```

普通 `get` 读取运行内核；`--config` 只读取持久配置，未保存时显示 `Not set in config`。模块接管、启动强制或尚未恢复配置都需要结合 `list` 状态判断，不要反复写值覆盖负责该功能的模块。

## su 三种模式

| 模式 | 含义 |
| --- | --- |
| 关闭 | 同时关闭传统与 Kasumi su 兼容入口；不撤销已经运行的 Root 进程 |
| 传统 | 使用传统 su 兼容路径，关闭 Kasumi su 兼容与 Magisk 风格弹窗 |
| Kasumi（实验性功能） | 使用 Kasumi VFS su 入口；支持自定义 su 路径及单独开启 Magisk 风格弹窗 |

切换模式会保存关联 Feature，失败时尝试恢复原状态。启动配置强制了 `su_compat` 时，关联模式、路径与弹窗控件也会受到限制。

自定义 su 路径默认是 `/system/bin/su`，仅在 Kasumi 模式下可编辑。必须是有效绝对路径，父目录已经存在，不能覆盖现有文件。更改后同步更新工具中的 su 路径；只搜索原路径的工具将找不到新入口。

## Shell 授权的三个独立概念

- **总是给 shell Root：** 安装时的 shell 授权策略。
- **ADB Root（ID 3）：** 决定 `adbd` 自身是否以 Root 运行。
- **Shell 仅限可信会话（ID 6）：** 进一步限制已经获准的 shell 从哪些进程链提权。

ID 6 不会自动授权 shell，也不等同于开启 USB 调试。UID 2000 的 shell 祖先链中没有 `adbd` 或 YukiSU Root 域进程时会被拒绝，即使授权查询显示已允许。脱离原会话、被 init 接管后，也必须满足同一祖先链检查。

## 隐藏功能改动的内容

解锁状态隐藏只改属性视图，例如 `ro.boot.vbmeta.device_state`、`ro.boot.verifiedbootstate`。它不会重新锁定 bootloader、重建 AVB 签名或修复已修改的镜像。“locked/green”文本不等于真实启动安全状态。

SELinux 隐藏处理策略查询，Kasumi 处理配置的文件与挂载视图，挂载视图整理处理 namespace 和可见编号。应用仍可从其他接口检测 Root。Kasumi 详细设置见 [Kasumi 与挂载配置](/manager/kasumi/)。

一次只改一项，保存后核对实际值与错误输出；按要求重启应用或设备。开启 YukiZygisk 后完整重启，再按[注入状态检查](/yukizygisk/intro/)查看 Zygote 与目标进程。

## 源码

[Feature UAPI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/feature.h)、[FeatureControlScreen.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/feature/FeatureControlScreen.kt)、[SuCompatMode.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/feature/SuCompatMode.kt)、[shell_su_adb_only.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/feature/shell_su_adb_only.c)。

[Feature persistence and ownership](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp).
