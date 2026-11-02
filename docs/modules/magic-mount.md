---
permalink: /modules/magic-mount/
title: 模块挂载
---

# 模块挂载

YukiSU 默认用内置 Kagami 处理模块的系统文件，无需另装挂载模块。它支持 OverlayFS、Magic Mount 与显式选择的 Kasumi。启用的外部 [MetaModule](/modules/meta-module/) 提供 `metamount.sh` 时，由它接管挂载，内置挂载流程跳过。

Kagami 在用户空间安排挂载；Kasumi 提供内核映射能力。使用 Kasumi 前，先在管理器中查看内核支持和协议版本；内置 Kagami 不会自动加载外部 Kasumi LKM。

## 模式与默认行为

| 模式 | 选择规则 |
| --- | --- |
| `auto` | 满足条件时用 OverlayFS，否则 Magic Mount；两者都不可用/停用时不挂载 |
| `overlay` | 使用已启用且内核支持的 OverlayFS，否则进入后备选择 |
| `magic` | 使用已启用的 Magic Mount，否则进入后备选择 |
| `kasumi` | 仅在显式选择且 Kasumi 启用、协议可用时使用；否则进入 OverlayFS/Magic Mount 后备选择 |
| `none` | 不挂载该模块的文件；普通生命周期脚本并不会因此禁用 |

默认内置挂载开启，全局模式为 `auto`。**`auto` 不会自动优先启用 Kasumi。** 自动选择还会检查模块布局，例如直接替换分区根目录文件的模块会转向 Magic Mount，而不是强行叠加 OverlayFS。

后备选择发生在挂载执行前。选定后端后若挂载失败，会报告失败，不会自动把该模块改用另一个后端重试。

全局模式非 `auto` 时覆盖逐模块模式；全局为 `auto` 时才按模块配置选择。管理器模块卡片可显示配置模式与当前策略、编辑逐模块规则并检查文件冲突。外部后端接管或内置挂载关闭时，这些内置模块挂载控件不适用。

## 修改后何时生效

保存模式、更新系统文件或改变模块启用状态后，完整重启会重新建立挂载计划。符合条件的设备也可使用[模拟软重启](/manager/soft-reboot/)卸下旧计划、应用更新并重新挂载；它会重启 Android 用户空间，不会执行 preinit 或重新解析模块 init rc。

开机后的普通 Kasumi 刷新只重放本次启动已记录的模块映射，不能借此加入全新模块。需要加入新模块时使用完整重启，或按软重启页面确认条件后执行模拟软重启。

[模块热安装](/modules/hot-install/)只切换活动目录，不主动重新挂载。模块带 `skip_mount`、`disable`、`remove` 标记或选择 `none` 模式时，新的挂载计划会跳过它。

## 挂载、脚本与注入

- `post-fs-data.sh`、`service.sh` 等由 `ksud` 派发；
- `system/` 等文件由内置 Kagami 或外部 MetaModule 处理；
- `zygisk/*.so` 与 `zn_modules.txt` 由 YukiZygisk 处理。

脚本成功但文件没出现时检查挂载计划；系统路径可见而目标应用不可见时检查视图与命名空间；Zygisk 无效果时检查注入状态。

## 按应用卸载与 WebView

内核可以在 Zygote 派生应用时依据 Root 配置，在应用自己的命名空间卸载模块挂载。排查应用内文件不可见时，查看该应用 PID 的命名空间，而不是只查看 Root shell。

v1.8.0 将 WebView 卸载移到应用配置。到超级用户列表中的 **WebView Zygote**（UID 1053），查看并设置“卸载模块”；它不再是全局独立开关。启用后，其后代继承卸载后的视图，无法读取被卸载的 WebView 资源、库或配置替换。依赖这些替换的模块需要在该条目关闭卸载，随后完整重启。该配置不控制 Zygisk 回调；更多说明见[应用配置](/manager/app-profile/)。

YukiZygisk 拒绝名单模式也会结合按应用卸载结果：关闭时不额外改变注入；强制模式跳过目标的普通 Zygisk 注入；恢复模式保留注入，同时保留普通模块挂载的卸载结果。Zygisk 模块自行创建的私有挂载由该模块清理。

## Kasumi 规则与普通隐藏

v1.8.0 使用 Kasumi API 18。只有内核协议匹配且 Kasumi 已启用时，内置后端才使用它。`auto` 的 OverlayFS/Magic Mount 选择不会因此改变。

Kasumi 模块映射可以设置“绕过策略”：

- 默认关闭，规则遵循 Kasumi 的访问策略；
- 模块级开启后，该模块的全部 Kasumi 规则全局生效；
- 规则级开启只影响该条 ADD、MERGE 或 HIDE；模块级已经开启时，单条规则不能再关闭旁路；
- 旁路不改变 OverlayFS 或 Magic Mount 的规则，也不会授予应用 Root 权限。

需要限定哪些进程看到模块内容时保留默认值；确实要求全局可见的规则才开启旁路。具体 UID 策略、共享/隔离视图与用户隐藏规则见 [Kasumi 设置](/manager/kasumi/)。

挂载隐藏现在只有普通开关，默认关闭；“激进隐藏”已移除。隐藏挂载记录与让应用读取原文件是不同操作，不要用挂载隐藏代替应用配置中的卸载模块。SELinux Guard 默认关闭，用于实验性的 context 写入时序补偿；它不关闭 SELinux，也不替代模块必要的 `sepolicy.rule`。

## 排查与恢复

挂载失败时，在 Root shell 中查询后端、配置、模块策略和恢复状态：

```sh
ksud kagami api meta
ksud kagami api backends
ksud kagami config show
ksud kagami module list --all
ksud kagami module check-conflicts
ksud kagami recovery status
```

冲突检查会列出覆盖同一路径的模块。先停用冲突模块，再查看 `module list --all` 选出的策略，完整重启后检查目标应用中的文件。

Kagami 挂载恢复与模块 preinit 使用独立计数。Kagami 保护触发后，先修复故障模块或挂载配置，再使用 Kagami 恢复入口；`ksud module preinit reset` 只重置 preinit。

仍无法定位时，只启用一个简单文件模块，完整重启后检查文件；再禁用它并重启，检查原文件是否恢复。

源码依据：[内置入口](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/embedded.cpp)、[模式选择与挂载计划](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/backend.cpp)、[默认配置](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/include/kagami/config.hpp)、[管理器控制](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/kasumi/util/KasumiManager.kt)。

规则实现：[Kasumi](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/kagami/src/mount/kasumi.cpp).
