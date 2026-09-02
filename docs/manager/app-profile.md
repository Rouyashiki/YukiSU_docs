---
permalink: /manager/app-profile/
title: App Profile
---

# App Profile

超级用户开关回答“这个 Android UID 能不能通过 YukiSU 提权”。App Profile 再决定：获准后使用什么 UID/GID、capability、SELinux domain 与 mount namespace；未获 Root 时是否卸载模块挂载。

完整内核 ABI 在 [`uapi/app_profile.h`](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/app_profile.h)。当前版本是 `KSU_APP_PROFILE_VER 4`，不要用旧教程里的结构大小或字段顺序直接写配置。

## 策略按 UID 生效

Android 允许多个包共享一个 UID。当前超级用户页会把共享 UID 的包合并成一组，App Profile 顶部也会列出组内应用。

::: warning 共享 UID 不能只授权一个包
内核看到的是同一个 UID。给组内一个包 Root、模块可见性或动态管理器身份，会影响这个 UID 下的其他包。操作前逐一核对组内包名与签名来源。
:::

超级用户页支持下拉刷新，修改后如果列表看起来没更新，先刷新实际内核 Profile，不要只依赖旧的 Compose 页面状态。

## Root Profile 的三种模式

### 默认

使用内核默认 Root Profile：UID/GID 0、默认组、完整 capability、YukiSU `su` SELinux domain，并继承调用进程的 mount namespace。全局“默认防逃逸（no-new-privs）”开启时，仍使用默认 Profile 的应用还会继承该限制。

没有明确隔离需求时优先用默认。自定义不是“更安全”的同义词；少一个组或 capability 就可能让工具悄悄失效。

### 模板

模板保存一组可复用的 Root Profile。设置页可以：

- 从 KernelSU 模板服务同步在线模板；
- 创建、编辑和删除本地模板；
- 从剪贴板导入一个或多个 JSON 模板；
- 把本地模板导出到剪贴板。

在线模板在管理器中只读，本地模板可编辑。模板作者和名字不是安全证明；应用前检查每个字段与 SELinux rule。

### 自定义

当前管理器允许设置：

- UID 与 GID；
- 最多 32 个附加组；
- 一组 Linux capability；
- SELinux domain 与附加规则；
- mount namespace：继承、全局或独立；
- `FLAG_KSU_NO_NEW_PRIVS` 防逃逸标志。

#### Capability 的当前语义

UAPI 结构保留 `effective`、`permitted`、`inheritable` 三个 64 位字段，但当前 Manager 只显示和写入**一组** capability 选择。内核以这组 effective 位建立 effective、permitted 与 bounding 集合；它不是三套可在界面独立编辑的列表。

因此，不要在第三方配置器里把管理器的一组选择误解成三组，也不要复制旧版 `app_profile` 的二进制布局。

#### Namespace 选择

| 模式 | 行为 | 常见影响 |
| --- | --- | --- |
| 继承 | 保留调用进程当前 mount namespace | 最接近默认应用环境 |
| 全局 | 切换到 YukiSU 保存的全局 mount namespace | 可以看到全局挂载，也扩大可见范围 |
| 独立 | 为提权进程建立独立 mount namespace | 后续挂载改动不一定传播到其他 namespace |

namespace 选错时，常见表现不是“Root 失败”，而是 Root shell 看不到预期文件或挂载。

#### SELinux domain 与规则

自定义 Profile 可选择 domain，并把规则交给 `ksud` 保存和应用。管理器在保存前检查规则语法，但“能解析”不代表规则最小授权或安全。

空的自定义 domain 会回退到 `u:r:su:s0`，但不要依赖回退掩盖配置错误。规则过宽会扩大攻击面，规则过窄会让提权后的进程在 SELinux 上继续失败。

#### no-new-privs

开启后，该 Root Profile 会阻止这类已获 Root 的进程再次通过 YukiSU 进行二次提权/逃逸。它不是 Linux 通用 `PR_SET_NO_NEW_PRIVS` UI 的简单别名，也不会替代正确的 UID、capability 与 SELinux 限制。

## Non-root Profile

未授予 Root 的 UID 可以选择是否卸载模块挂载：

- **默认：** 跟随设置页“默认卸载模块”；当前默认全局值为关闭；
- **自定义：** 为该 UID 明确开启或关闭卸载。

这需要全局 Kernel Umount Feature 保持启用。它只改变目标应用 namespace 中的模块挂载可见性，不会撤销别的 Root 通道，也不保证绕过 Root 检测。

Profile 在应用进程启动/特化或发起提权时进入相应路径。修改 Non-root 卸载或 namespace 后应彻底结束目标应用再启动；已经运行的进程不会自动重建 namespace。

## 动态管理器

“设为动态管理器”与“允许超级用户”是两个独立开关。动态管理器会持久信任目标 APK 的签名信息，使该应用能够被内核识别为 YukiSU 管理器；它不是给应用一个普通 Root shell。

默认情况下，这个开关只对预置签名候选或已经信任的动态管理器显示。“更多设置 → 允许授权任何应用为动态管理器”只会把开关展示给所有应用，并不会自动授权它们。

::: danger 管理器身份高于普通 Root grant
管理器能够管理其他应用授权、模块和系统配置。除非你正在部署经过审计的替代 Manager，否则不要开启。测试完成后用同一 App Profile 撤销，并刷新超级用户列表确认信任已移除。
:::

动态管理器信任与 SuperKey 也不同：

- 动态管理器持久化目标 APK 签名，适合明确授权某个替代管理器；
- SuperKey 在当前运行内核中登记成功提交密钥的管理器 UID；
- 普通 Root grant 只决定 UID 能否通过 `su` 提权。

三者不应互相当作回退密码。SuperKey 细节见 [SuperKey 认证](/manager/superkey/)。

## 修改后的验证顺序

1. 记录目标包名、UID，以及是否属于共享 UID 组。
2. 只改一类字段：授权、身份、capability、SELinux、namespace 或模块卸载。
3. 刷新超级用户页，确认内核返回的 Profile。
4. 彻底结束并重启目标应用；Root Profile 还要新建一次 `su` 会话。
5. 在目标进程中检查 `id`、组、capability、SELinux context 和 mount namespace。
6. 出现异常先退回默认 Profile，再判断是否是应用本身问题。

不要用“应用能启动”作为最小权限验证。它可能在真正访问网络、存储、Binder 或模块挂载时才触发缺失权限。
