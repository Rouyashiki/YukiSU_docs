---
permalink: /modules/overview/
title: 模块系统
---

# 模块系统

YukiSU 延续 KernelSU 的模块格式和启动阶段。普通模块负责“带什么文件、什么时候跑脚本”，MetaModule 负责“怎么把这些文件挂进系统”。

把两者分开后，换挂载实现不用重做整个模块系统；但排查时也要记住：模块脚本正常，不代表挂载一定正常。

## 一个模块里通常有什么

安装后，普通模块位于：

```text
/data/adb/modules/<module-id>/
```

常见文件：

| 文件或目录 | 用来做什么 |
| --- | --- |
| `module.prop` | 模块 ID、名称、版本、作者和说明 |
| `post-fs-data.sh` | 较早运行、会阻塞当前启动阶段的脚本 |
| `service.sh` | 启动后台服务或做异步初始化 |
| `boot-completed.sh` | Android 启动完成后再执行 |
| `system.prop` | 设置系统属性 |
| `sepolicy.rule` | 追加 SELinux 规则 |
| `system/` | 准备挂到系统路径的文件树 |
| `skip_mount` | 明确告诉 MetaModule 不要挂这个模块 |
| `action.sh` | 用户在管理器里手动触发的动作 |
| `webroot/` | 模块 WebUI |

除了 `module.prop`，其他东西都按需出现。一个纯脚本模块没有 `system/` 很正常，一个只带 WebUI 的模块也未必需要 MetaModule。

## “安装了”离“生效了”还有几步

管理器把 ZIP 解进目录后，模块只是**已安装**。后面还有：

- **已启用**：没有 `disable` 标记；
- **脚本已执行**：对应阶段确实跑到了；
- **文件已挂载**：MetaModule 成功处理 `system/`；
- **功能正常**：目标应用真的看到了结果。

所以管理器里有一张模块卡片，只能证明第一步。遇到“装了但没用”，先问它卡在哪一步，别直接重刷 Root。

## 启动阶段

| 阶段 | 适合放什么 | 注意什么 |
| --- | --- | --- |
| `post-fs-data` | 目录、策略、必须尽早完成的准备 | 会挡住后续流程，越短越好 |
| `post-mount` | 依赖系统文件已经挂好的动作 | 在 MetaModule 挂载之后 |
| `service` | 守护进程、后台初始化 | 异步运行 |
| `boot-completed` | 依赖 Android framework 的工作 | 常规阶段里最晚 |

正常启动时，大致顺序是：处理模块更新/卸载和目录上下文 → 加载 SELinux 规则 → 跑 MetaModule 与普通模块的 `post-fs-data.sh` → 加载 `system.prop` → 执行 `metamount.sh` → 进入 `post-mount`。

需要挂载后文件的动作放进 `post-mount`。不要在 `post-fs-data.sh` 里一边等 framework 或网络，一边把整个开机流程堵住。

越狱模式已经错过正常的 `post-fs-data`，模块要改用 `late-load.sh`。详见[越狱模式](/guide/jailbreak-mode/)。

## 什么时候需要 MetaModule

通常**不需要**的情况：

- 只跑脚本；
- 只用 `system.prop`；
- 只加载 `sepolicy.rule`；
- 只提供 Action 或 WebUI，而且功能不依赖系统文件替换。

通常**需要**的情况：

- 要向 `/system`、`vendor`、`product`、`system_ext` 放文件；
- 要替换系统配置、框架资源、原生库或可执行文件；
- 模块明确要求 OverlayFS、bind mount 或某个挂载后端。

YukiSU 同一时间只允许一个活动 MetaModule。接口和生命周期与官方 KernelSU 完全一致，从 KernelSU 切换过来不必因为 Root 方案变化就重装后端。详见 [MetaModule](/modules/meta-module/)。

具体模块仍可能依赖某个 Android 版本、ABI 或 MetaModule 实现。这是模块自己的要求，不是上游协议变了。

## 状态标记

- `disable`：下次启动不执行这个模块；
- `remove`：下次启动时清理；
- `update` 或待更新目录：下次启动应用更新；
- `skip_mount`：不把 `system/` 交给挂载后端。

模块正在更新或卸载时，别一边手改标记一边反复重启。让一次完整启动把状态处理完，再看结果。

## 安全模式

安全模式会跳过常规 `post-fs-data.d` 和模块脚本，并禁用普通模块。它的用途是回答：“不开这些模块，系统能不能正常启动？”

它修不了 KMI 不匹配、启动分区刷错或镜像损坏。如果所有模块都停了还是开不了机，去看[救砖与恢复](/guide/rescue-bootloop/)。

## WebUI 和 Action

### WebUI

模块可以在 `webroot/` 里放 HTML、CSS 和 JavaScript，管理器会用 WebView 打开它，并提供 `kernelsu` JavaScript API。

WebUI 可能执行 Root 命令、读取模块数据或修改系统配置，所以：

- 只装可信来源的模块；
- 不把用户输入直接拼进 shell；
- 少碰不受信任的远程脚本和 iframe；
- 危险操作给用户看目标，并加确认。

### Action

`action.sh` 适合清缓存、重建配置、导出状态这类一次性操作。长期后台任务放 `service.sh`，别要求用户每天点一次按钮给守护进程续命。

## 安装前看什么

至少快速扫一遍：

1. 支持哪些 Android 版本和 ABI；
2. 要不要某个 MetaModule；
3. 是否依赖 Magisk 工具、路径或内置 Zygisk；
4. 有没有原生库、安装脚本或能跑 Root 的 WebUI；
5. 会不会替换启动关键文件，有没有卸载方法；
6. 最近还在不在维护，源码和来源是否可信。

ZIP 能选中、安装日志没有红字，只能证明安装器没当场失败。

## 比较省心的用法

- 基础 Root 正常后再加模块；
- 第一个挂载模块选一个功能单一、结果好确认的；
- 一次别改太多；
- 重要模块更新前留旧版本和配置；
- 出问题先停最近加的模块，不要直接清空全部 `/data/adb`。

## 常见误会

- **“装上了就生效了”**：安装、脚本、挂载、最终功能是四步。
- **“有 `system/` 就会自动挂”**：需要活动 MetaModule，而且不能有 `skip_mount`。
- **“协议跟上游一样，任何模块就都能用”**：模块仍可能绑定 Android、ABI、后端或私有工具。
- **“WebUI 只是个设置页”**：它可能在 Root shell 中执行命令。
- **“模块坏了就重刷 LKM”**：多数模块问题先禁用模块、看日志就够了。

模块没生效时，按[常见问题排查](/troubleshoot/common/)逐层看，不要只截一张模块卡片。
