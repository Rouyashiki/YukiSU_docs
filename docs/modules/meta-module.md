---
permalink: /modules/meta-module/
title: MetaModule
---

# MetaModule

MetaModule 是外部模块挂载后端。普通系统文件模块默认使用内置 Kagami；模块作者要求某个后端，或你要使用该后端的功能时，再安装 MetaModule。

## 与内置 Kagami 的选择关系

挂载阶段会检查活动 MetaModule 是否存在启用的 `metamount.sh`：

- 存在：执行外部脚本，并跳过内置 Kagami 挂载；
- 不存在或后端已禁用：交给内置 Kagami；“内置挂载”开启时按配置执行挂载，关闭时跳过；
- 外部脚本运行失败：记录错误，不在同一次调用中自动改走内置挂载。

外部挂载失败时，先读 `metamount.sh` 输出并修复后端；要切回 Kagami，禁用或卸载外部后端，开启内置挂载后完整重启。详见[模块挂载](/modules/magic-mount/)。

## 识别方式

MetaModule 在 `module.prop` 中声明：

```properties
metamodule=1
```

`true` 也能识别。它仍位于 `/data/adb/modules/<id>/`，活动后端通过 `/data/adb/metamodule/` 链接寻址。同一时间只维护一个外部 MetaModule；`disable`、`remove` 和待更新状态仍遵循普通模块流程。

YukiSU 使用下表的 KernelSU 风格 MetaModule 接口。安装前按后端文档检查 Android、内核版本和迁移要求。

## 接口脚本

| 文件 | 调用时机 | 额外上下文 |
| --- | --- | --- |
| `metainstall.sh` | 普通模块已预解压后，接管安装 | `ZIPFILE`、`KSU_MODULE` 与安装器辅助函数 |
| `post-fs-data.sh` | 普通模块早期脚本之前 | MetaModule 自身脚本环境 |
| `metamount.sh` | 普通模块早期脚本、Lua `post_fs_data` 和属性加载之后 | `MODULE_DIR` 指向模块根目录 |
| `metauninstall.sh` | 移除普通模块时清理后端状态 | `MODULE_ID` 为被卸载模块 |
| `post-mount.sh`、`service.sh`、`boot-completed.sh` | 对应生命周期，在普通模块与 Lua 插件之前 | MetaModule 自身脚本环境 |
| `late-load.sh` | 越狱/late-load 的延迟阶段 | 不能替代真正 early boot |

缺少的接口会跳过；其中没有启用的挂载接口时，按前述规则选择内置后端。`metamount.sh` 阻塞等待完成，不受普通早期脚本的 35 秒共享等待截止约束，后端应避免在此等待网络或长期服务。

## 安装与更换

外部后端提供 `metainstall.sh` 时，YukiSU 先把普通模块预解压到 `/data/adb/modules_update/<id>/`，排除 ZIP 自带的 `.ksu_hot_install`，再加载该脚本接管安装。原活动模块目录此时保留。自定义安装进程失败时会清理本次暂存目录；后端脚本遇到错误要调用 `abort` 或明确非零退出，不能只让某条命令失败后继续执行。

预解压支持 ZIP 中的 LZMA/XZ 等条目，路径与类型校验由 YukiSU 解压器执行。后端仍须完成自己的格式转换、必要清理和安装完成标记，不能把“已经解压”当作安装完成。反馈安装失败时，提供 YukiSU、后端、普通模块的版本和完整日志。

更换外部后端时：

1. 记录当前后端、依赖模块与配置；
2. 在管理器中卸载旧后端，并完整重启完成移除；
3. 确认旧后端不再接管挂载；如返回内置 Kagami，检查内置挂载开关与模式；
4. 若要使用另一个外部后端，安装后再次重启；
5. 用一个简单文件模块验证结果，再检查其他模块。

MetaModule 不支持[热安装](/modules/hot-install/)。管理器对带 `metainstall.sh` 的后端还会限制待更新、待卸载或禁用时的普通模块安装；安装后仍需重启执行挂载。

卸载外部后端后，旧挂载不会立即消失；下一次启动会重新选择后端。内置 Kagami 开启时会按自己的模式处理文件模块；外部后端的私有数据和专有配置需按该后端的文档迁移。

## 卸载钩子

普通模块真正移除时，先调用仍启用的后端 `metauninstall.sh`（存在时），再调用模块自身的 `uninstall.sh`。`MODULE_ID` 标识待移除的普通模块，`KSU_MODULE` 标识执行钩子的 MetaModule。两种钩子都会等待完成；非零退出记录警告，文件清理继续。

一次移除多个模块时，MetaModule 最后移除。完整卸载 YukiSU 也遵守这一顺序，但先恢复启动镜像；镜像恢复失败不会开始模块清理。后端应让清理可重复执行，并在卸载钩子中保留其他模块仍需使用的资源。

## 挂载失败时

先看后端脚本日志，再检查目标文件。Root shell 能看到文件、应用看不到时，检查该应用的模块卸载、WebView 卸载和 Kasumi 视图设置。禁用测试模块后完整重启，检查原文件是否恢复。

MetaModule 不提供核心 Root，不负责 `/data/adb/plugins/` 下的 Lua 插件，也不加载 `zygisk/*.so` 或解释 `zn_modules.txt`。系统文件挂载问题请从后端脚本和目标路径排查。

源码依据：[后端选择与接口派发](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/metamodule.cpp)、[安装及模块状态](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp)。
