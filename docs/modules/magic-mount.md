---
permalink: /modules/magic-mount/
title: 模块挂载
---

# 模块挂载

YukiSU 本体不内置固定的 Magic Mount 后端。正常启动时，`ksud` 在普通模块 `post-fs-data.sh`、Lua 插件 `post_fs_data` 与 `system.prop` 之后调用活动 MetaModule 的 `metamount.sh`；如何处理 `/data/adb/modules/`，由该后端决定。

所以 YukiSU 核心不会替后端承诺：

- 一定使用 bind mount 或 OverlayFS；
- 完全复现 Magisk Magic Mount 的冲突、白化或替换语义；
- 所有 Magisk 模块都能原样挂载；
- 没有 MetaModule 时，普通模块的 `system/` 仍会出现；
- 每个应用命名空间都能看见同一组挂载。

管理器提示“需要 MetaModule”，表示模块有待挂载文件而当前没有活动后端。选择适合该 Android/内核/模块的 MetaModule，并按后端自己的文档验证。详见 [MetaModule](/modules/meta-module/)。

## 挂载、脚本与注入是三条链

- `post-fs-data.sh`、`service.sh` 等脚本由 YukiSU 派发；
- `system/` 文件由 MetaModule 挂载；
- `zygisk/*.so` 与 `zn_modules.txt` 由 YukiZygisk 处理。

所以“脚本成功但系统文件没出现”先查 MetaModule；“系统文件出现但应用里没有”查应用命名空间与卸载策略；“Zygisk 模块没有效果”则查 YukiZygisk，而不是更换挂载后端。

## 按应用卸载

挂载建立后，YukiSU 内核仍可在 Zygote 派生应用时按 Root 配置卸载模块挂载。这个步骤发生在应用自己的命名空间中，不是 MetaModule 重新安装或重新挂载。

因此，shell、管理器、普通应用与隔离进程看到的 mountinfo 可能不同。验证时必须说明从哪个 PID/命名空间观察，不能拿 init namespace 的结果证明所有应用都可见。

## WebView Zygote

“为 WebView 卸载模块”是独立、默认关闭的内核功能。开启后，UID 1053 的 WebView Zygote 在派生阶段先得到已卸载普通模块挂载的命名空间，其后代 WebView 沙箱进程继承该视图。

它的目的在于减少 WebView 进程看到模块挂载信息，但代价也很明确：依赖替换 WebView 资源、库或配置的模块可能失效。切换后应重启，让新的 WebView Zygote 与子进程继承一致状态。

这项功能不等于 YukiZygisk，也不控制 Zygisk 回调是否运行。

## YukiZygisk 拒绝名单与私有挂载

YukiZygisk 的拒绝名单模式会结合 YukiSU 的按应用卸载结果，决定目标应用是否继续运行普通 Zygisk 模块：

- 关闭：拒绝名单不额外改变 YukiZygisk 注入；
- 强制：目标应用卸载普通模块挂载，并跳过 Zygisk 模块注入；
- 恢复：仍注入 Zygisk 模块，但保留普通模块挂载的卸载结果。

集成版 YukiZygisk 不会在应用完成 specialization 后再次扫描并清除应用私有 namespace 中由 Zygisk 模块自己创建的挂载。模块创建的私有挂载由模块自己负责生命周期；不要把它们误算成 MetaModule 的系统文件挂载。

## 最小验证方法

1. 只启用一个结果明确的文件挂载模块；
2. 确认没有 `disable`、`remove` 或 `skip_mount`；
3. 确认唯一 MetaModule 的 `post-fs-data.sh` 与 `metamount.sh` 成功；
4. 重启后分别从 init/root shell 与目标应用 namespace 检查；
5. 若只在 WebView 不可见，检查 WebView Zygote 卸载开关；
6. 禁用测试模块并再次重启，确认目标文件消失。
