---
permalink: /manager/app-profile/
title: App Profile
---

# App Profile

超级用户开关控制 Android UID 的 Root 授权。App Profile 设置获准后的 UID/GID、capability、SELinux domain 与 mount namespace，也设置未获 Root 应用的模块卸载策略。

完整内核 ABI 在 [`uapi/app_profile.h`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/app_profile.h)。当前版本是 `KSU_APP_PROFILE_VER 4`，不要用旧教程里的结构大小或字段顺序直接写配置。

## 策略按 UID 生效

Android 允许多个包共享一个 UID。超级用户页把共享 UID 的包合并成一组，App Profile 顶部也会列出组内应用。

::: warning 共享 UID 不能只授权一个包
内核看到的是同一个 UID。给组内一个包 Root、模块可见性或动态管理器身份，会影响这个 UID 下的其他包。授权前检查组内所有包名；只要其中一个包不应获得这些权限，就不要给该 UID 授权。
:::

修改后下拉刷新超级用户页，查看内核保存的 Profile；新授权在下次申请 Root 时使用。

## 多用户与工作资料

管理器枚举系统中的 Android 用户并按完整 UID 分组；同一个包在主用户、次用户或工作资料中具有不同 UID，授权和模块卸载分别设置。操作前检查卡片的 UID，不要把另一用户的同名应用当作同一授权。

应用列表枚举用户失败时只显示主用户（user 0）的应用；这不代表其他用户的授权已经删除。恢复管理器 Root 通信后刷新列表。授权备份要求成功枚举所有用户，枚举失败会中止，不会导出一份缺少其他用户的备份。

## Root Profile 的三种模式

### 默认

使用内核默认 Root Profile：UID/GID 0、默认组、完整 capability、YukiSU `ksu` SELinux domain（`u:r:ksu:s0`），并继承调用进程的 mount namespace。全局“默认防逃逸（no-new-privs）”在 v1.8.0 默认开启，默认 Profile 的应用继承该限制。升级迁移会启用这一全局默认值；旧自定义 Profile 的 domain 和防逃逸标志保持原设置。

一般 Root 工具使用默认模式。需要限制身份或权限时再选择自定义，并为工具保留实际使用的组和 capability。

### 模板

模板保存一组可复用的 Root Profile。设置页可以：

- 从 KernelSU 模板服务同步在线模板；
- 创建、编辑和删除本地模板；
- 从剪贴板导入一个或多个 JSON 模板；
- 把本地模板导出到剪贴板。

在线模板在管理器中只读，本地模板可编辑。套用模板前检查 UID/GID、组、capability、namespace 和 SELinux rule；模板会直接决定该 UID 的提权权限。

### 自定义

自定义模式提供：

- UID 与 GID；
- 最多 32 个附加组；
- 一组 Linux capability；
- SELinux domain 与附加规则；
- mount namespace：继承、全局或独立；
- `FLAG_KSU_NO_NEW_PRIVS` 防逃逸标志。

#### Capability

UAPI 结构保留 `effective`、`permitted`、`inheritable` 三个 64 位字段，但当前 Manager 只显示和写入**一组** capability 选择。内核以这组 effective 位建立 effective、permitted 与 bounding 集合；它不是三套可在界面独立编辑的列表。

开发第三方配置器时使用 ABI v4 的结构与字段语义，不要按界面的一组选项推导三个集合。

#### Namespace 选择

| 模式 | 行为 | 常见影响 |
| --- | --- | --- |
| 继承 | 保留调用进程当前 mount namespace | 最接近默认应用环境 |
| 全局 | 切换到 YukiSU 保存的全局 mount namespace | 可以看到全局挂载，也扩大可见范围 |
| 独立 | 为提权进程建立独立 mount namespace | 后续挂载改动不一定传播到其他 namespace |

Root shell 已提权但看不到预期文件或挂载时，检查 namespace 选择，并在修改后新建 `su` 会话。

#### SELinux domain 与规则

自定义 Profile 可选择 domain，并把规则交给 `ksud` 保存和应用。保存前会检查规则语法；规则授予哪些访问权限仍由填写的内容决定。

空的自定义 domain 使用 `u:r:ksu:s0`。需要其他 domain 时填写完整名称；出现 SELinux 拒绝时，根据目标操作的 AVC 日志补充所需规则。

#### no-new-privs

开启后，该 Root Profile 会阻止这类已获 Root 的进程再次通过 YukiSU 进行二次提权/逃逸。它不是 Linux 通用 `PR_SET_NO_NEW_PRIVS` UI 的简单别名，也不会替代正确的 UID、capability 与 SELinux 限制。

## Non-root Profile

未授予 Root 的 UID 可以选择是否卸载模块挂载：

- **默认：** 跟随设置页“默认卸载模块”；当前默认全局值为关闭；
- **自定义：** 为该 UID 明确开启或关闭卸载。

这需要全局 Kernel Umount Feature 保持启用。卸载作用于目标应用 namespace 中的模块挂载；其他 Root 通道、属性和文件等检测项不会因此消失。

Profile 在应用进程启动/特化或发起提权时进入相应路径。修改 Non-root 卸载或 namespace 后应彻底结束目标应用再启动；已经运行的进程不会自动重建 namespace。

## WebView Zygote

v1.8.0 把原 Feature 5 移到超级用户页的 **WebView Zygote** 条目（UID 1053）。进入该条目的 App Profile，选择默认 Non-root 策略，或用自定义策略开启/关闭“卸载模块”。该条目不会被“隐藏系统应用”过滤掉，也不能授予 Root 或动态管理器身份。

它使用与其他 Non-root Profile 相同的卸载逻辑，仍要求全局 Kernel Umount 开启；默认模式跟随“默认卸载模块”。旧 Feature 5 配置不会继续生效，升级后请在这里重新选择所需策略。保存后完整重启，让 WebView Zygote 和之后创建的 WebView 进程使用新策略。

## 动态管理器

“设为动态管理器”与“允许超级用户”是两个独立开关。动态管理器会持久信任目标 APK 的签名信息，使该应用能够被内核识别为 YukiSU 管理器；它不是给应用一个普通 Root shell。

默认情况下，这个开关只对预置签名候选或已经信任的动态管理器显示。“更多设置 → 允许授权任何应用为动态管理器”只会把开关展示给所有应用，并不会自动授权它们。

::: danger 管理器身份高于普通 Root grant
管理器能够管理其他应用授权、模块和系统配置。仅为需要这些能力的受信任替代管理器开启。停止使用后，在同一 App Profile 撤销并刷新超级用户列表。
:::

### 兼容设置与签名作用域

开启动态管理器时，页面读取目标 APK；没有内置 `ksud` 时会要求确认，继续授权不会为它安装 daemon。签名读取、APK 格式或信任保存失败时，按页面错误修正 APK 或恢复管理器通信，再重新授权；保存成功后刷新授权状态。

当前还可为该签名设置内核版本码、UAPI 版本和完整版本字符串。数字留空或填 0、完整版本留空时使用内核真实值。**配置对相同签名的应用生效，不仅限于当前包名或 UID**；撤销这份签名信任会同时撤销其他同签名管理器通过该信任获得的身份。

兼容设置只改版本查询结果，不会实现缺失的 ioctl 或改变真实 ABI。仅在目标管理器因版本检查而拒绝运行、所需接口实际受支持时使用。保存后重新打开目标管理器，并测试需要的授权、模块和配置操作；接口不兼容时改用支持当前 YukiSU 的构建。模块脚本的全局版本兼容是[模块页的另一项设置](/manager/settings/)。

动态管理器信任与 SuperKey 也不同：

- 动态管理器持久化目标 APK 签名，适合明确授权某个替代管理器；
- SuperKey 在当前运行内核中登记成功提交密钥的管理器 UID；
- 普通 Root grant 只决定 UID 能否通过 `su` 提权。

SuperKey 的配置与认证步骤见 [SuperKey 认证](/manager/superkey/)。

## 备份与恢复授权

在超级用户页菜单导出或恢复授权备份。新备份使用 `yukisu.allowlist` JSON v2，最多 4 MiB，保存 Profile、附加 SELinux 规则、全局默认卸载值以及包签名信息；不是直接复制内核 `.allowlist` 二进制文件。

恢复时先查看预览：

- 按同一 Android 用户中的包名和签名匹配，允许安装后的 UID 变化；共享 UID 必须仍包含相同包集合。
- 缺失的单包应用可手动映射到同一用户内、签名相符且不共享 UID 的候选应用。不会自动跨用户授予 Root。
- 签名不符、包信息不可读、共享 UID 变化或 SELinux 规则冲突的条目不能应用；管理器自身、其他受保护管理器身份及 WebView Zygote 特殊 Profile 不包含在普通授权备份中，也不能通过恢复覆盖。
- 默认合并选中项；“替换”只在全部条目可完整匹配且当前授权可识别时开放，会重置未包含的普通授权。恢复全局默认卸载是独立选项。
- 旧 JSON v1 可以读取，但缺少签名记录；它不能提供 v2 的签名校验与缺失包映射。其他旧格式会被拒绝。

应用前再次检查包身份。若期间安装、卸载或更新了应用，管理器会要求更新预览。写入失败会尝试恢复原 Profile 和规则；若提示回滚不完整，逐项检查授权，保留错误并重新导出当前状态。恢复成功后刷新列表，重启目标应用或新建 `su` 会话。

## 保存与排错

1. 记录目标包名、UID，以及是否属于共享 UID 组。
2. 只改一类字段：授权、身份、capability、SELinux、namespace 或模块卸载。
3. 刷新超级用户页，确认内核返回的 Profile。
4. 彻底结束并重启目标应用；Root Profile 还要新建一次 `su` 会话。
5. 在目标进程中检查 `id`、组、capability、SELinux context 和 mount namespace。
6. 自定义 Profile 下操作失败时，先恢复默认 Profile 并新建 `su` 会话；默认模式正常后，再逐项收紧自定义权限。

测试工具实际使用的网络、存储、Binder 和模块文件操作；这些操作缺少权限时，即使应用已正常启动也会失败。

## 源码

[AppProfile.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/AppProfile.kt)、[DynamicManagerCompatDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/component/DynamicManagerCompatDialog.kt)、[KsuCli.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt)。

[allowlist.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/policy/allowlist.c), [selinux.h](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/selinux/selinux.h), [KsuService.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/KsuService.kt), [AllowlistPlan.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistPlan.kt), [AllowlistRestore.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistRestore.kt).

[SuperUserViewModel.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/viewmodel/SuperUserViewModel.kt), [AllowlistBackup.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/module/AllowlistBackup.kt).
