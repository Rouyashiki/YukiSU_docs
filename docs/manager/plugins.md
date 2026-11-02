---
permalink: /manager/plugins/
title: Lua 插件管理
---

# Lua 插件管理

底部导航第二项“插件”管理由 `ksud` 执行的 Lua 插件。安装 Zygisk 或普通 KernelSU 模块请使用“模块”页。

::: danger 插件拥有 Root 级能力
插件回调以 Root 权限执行，可以启动命令、读写文件、修改属性与 sysctl，并启动常驻 daemon。只安装你信任其作者和代码的插件。
:::

## 已安装插件页

页面支持：

- 从本地 ZIP 安装插件；
- 搜索，并选择“已启用优先”排序；
- 下拉刷新实际 `ksud plugin list` 状态；
- 启用或停用插件；
- 在 manifest 声明 Action 时运行 Action；
- 运行 manifest 声明的快捷操作；
- 编辑 manifest 声明的配置字段；
- 查看或清除独立插件日志；
- 卸载插件。

底部导航角标显示已安装插件数量。启用状态和错误显示在各插件卡片中，执行结果见插件日志。

manifest 无效时，卡片显示错误并禁用 Action/快捷操作。重新安装带有正确 manifest 的插件包后再操作。本地插件 ZIP 不得超过 272 MiB。

## 启停与依赖

`ksud` 在启用插件前校验 manifest 和依赖。若有其他已启用插件依赖它，停用或卸载会被拒绝；先停用错误信息列出的依赖方，再重试。

停用先写入禁用状态，再停止该插件登记的 daemon。如果报告“已停用但 daemon 无法停止”，禁用状态已经保存，旧进程仍需处理；查看插件日志，解决停止失败或完整重启。卸载时若回调仍在运行或运行树繁忙，先停用插件，等待回调退出后重试。

启用插件不会补跑已经错过的启动阶段。需要 `post-fs-data`、`post-mount`、`service` 或 `boot-completed` 回调时，启用后完整重启，再查看插件日志。

## Action、快捷操作与配置

- **Action** 只在插件实际声明 Action 时显示；
- **快捷操作** 调用 manifest 指定的 Lua 函数；
- **配置** 把页面字段保存给该插件；只有实现了运行时重读的插件会立即使用新值，其余按插件说明重新运行 Action、重启 daemon 或完整重启；
- **日志** 是插件自己的记录，不等于完整 `ksud`、内核或 logcat 日志。

Action 成功表示该次回调正常返回。运行后检查它要修改的设置或文件；启动回调与 daemon 的结果另见插件日志。停用或卸载不会自动撤销插件已经修改的系统文件和设置，恢复步骤由插件提供。

## 插件仓库

插件页右上角仓库入口可以浏览、搜索、安装、更新或重新安装仓库插件。仓库源页面可以启停、刷新、排序、添加和删除源。

管理器内置一个 **FolkPatch Plugin Mirror** 源。它可以停用，但作为内置源不能删除。用户添加的远程源必须使用 HTTPS；只有 `localhost`、`127.0.0.1` 或 `::1` 测试源允许 HTTP。仓库索引响应不得超过 4 MiB。

::: warning 仓库插件没有 YukiSU 签名背书
YukiSU 不验证仓库插件的作者身份或发布签名。HTTPS 加密传输；添加源和安装插件前仍须确认发布者与下载地址。
:::

安装前至少检查：

1. 源地址与插件主页是否属于预期作者；
2. ZIP 的可复现哈希或发布签名；
3. manifest 的 ID、入口、依赖、回调、Action 与配置；
4. Lua 源码是否执行外部命令、下载代码、改系统属性或写关键路径；
5. 出问题时如何停用、卸载和恢复被修改的系统状态。

## 首次使用与排错

1. 安装后先保持最小配置，确认卡片无 manifest/依赖错误。
2. 启用一个插件并刷新列表。
3. 插件声明了手动 Action 或快捷操作时，先运行所需操作并查看插件日志。
4. 依赖启动阶段时完整重启；出错后保存插件、`ksud` 与内核日志。
5. 行为异常时先停用插件，再卸载；按插件说明恢复它改动的文件和设置。

排查插件与模块冲突时，先停用最近添加的插件并重启，比较故障是否仍出现；每次只变更一个插件或模块。

插件包布局、manifest、Lua API 与资源限制见 [Lua 插件](/modules/plugin/)。

## 源码

[Plugin.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Plugin.kt), [plugin.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/plugin/plugin.cpp).
