---
permalink: /modules/meta-module/
title: MetaModule
---

# MetaModule

MetaModule 就是模块系统的“挂载后端”。YukiSU **完全跟随官方 KernelSU 的 MetaModule 约定**：怎么识别、调用哪些脚本、先后顺序如何、只能开一个后端，全都一样。

YukiSU 的 C++ 用户空间负责调用这些接口；到底用 OverlayFS、bind mount 还是其他办法，由 MetaModule 自己决定。这里没有一套“YukiSU 专用元模块格式”。

::: tip 从 KernelSU 切换
从官方 KernelSU 切换过来时，原本正常工作的 MetaModule 直接留着就行，不用重装。后端自己写明的 Android、内核和版本要求还是要看。
:::

## 为什么需要 MetaModule

纯脚本、属性或 SELinux 规则模块通常不需要它。模块要往只读系统路径放文件时，YukiSU 不会自己启动一套固定 Magic Mount，而是让 MetaModule：

- 收集普通模块的文件树；
- 处理目录与文件覆盖关系；
- 建立实际挂载；
- 在模块安装或卸载时维护后端状态；
- 根据自身实现提供回滚与诊断。

这样一来，挂载实现可以单独更新；反过来，所有要改系统文件的模块也都依赖它。MetaModule 一坏，多个模块一起没效果并不奇怪。

## 识别方式与活动实例

MetaModule 在 `module.prop` 中声明：

```properties
metamodule=1
```

写成 `true` 也能识别。安装后，`/data/adb/metamodule/` 会链接到当前后端，YukiSU 就从这里找它。

同一时间只能有一个。两个挂载后端同时接管同一批模块，不会变成双倍性能，只会互相覆盖。

MetaModule 仍是 `/data/adb/modules/` 下的模块，因此普通模块状态也适用于它：`disable` 会让后端脚本停止运行，`remove` 在后续启动阶段真正清理。它不是核心 Root 组件；MetaModule 不可用时，Root 与不依赖挂载的脚本/插件仍可能正常。

## 接口脚本

| 文件 | 调用时机 | 提供的上下文 | 目的 |
| --- | --- | --- | --- |
| `metainstall.sh` | 安装普通模块时 | 普通模块安装环境 | 让后端参与安装与预处理 |
| `post-fs-data.sh` | MetaModule 自身的早期启动阶段 | MetaModule 环境 | 在普通模块脚本前准备后端 |
| `metamount.sh` | 普通模块 `post-fs-data` 和属性加载后 | `MODULE_DIR` | 扫描模块并建立挂载 |
| `metauninstall.sh` | 卸载普通模块时 | `MODULE_ID` | 清理该模块的后端状态 |
| `post-mount.sh`、`service.sh`、`boot-completed.sh` 等 | 对应 YukiSU 生命周期 | MetaModule 环境 | 在普通模块和 Lua 插件之前执行后端的同阶段任务 |

哪个脚本不存在，就跳过哪个接口。后端已经禁用、待卸载或更新到一半时，YukiSU 也不会假装它仍然正常。

## 启动时发生什么

在正常启动中，挂载相关顺序为：

1. 公共 `post-fs-data.d` 脚本先执行；
2. YukiSU 应用待更新/待卸载状态、目录上下文、SELinux 规则与持久功能配置；
3. 执行 MetaModule 的 `post-fs-data.sh`；
4. 执行普通模块的 `post-fs-data.sh`；
5. 执行 Lua 插件的 `post_fs_data` 回调；
6. 加载模块 `system.prop`；
7. 调用活动 MetaModule 的 `metamount.sh`；
8. 应用按应用卸载配置；
9. 进入 `post-mount`，再按公共脚本、MetaModule、普通模块、Lua 插件的顺序派发。

`metamount.sh` 在普通模块早期脚本之后执行，让模块先把要挂的文件准备好。代码必须等挂载完成，就放到 `post-mount` 或更后面；别在 `post-fs-data.sh` 里假设目标路径已经换好了。

late-load 模式使用 `late-load.sh` 代替已经错过的 early-boot 阶段，再加载属性并调用 `metamount.sh`。这只是延迟加载路径，不能让需要 init 早期或已启动进程的挂载获得与正常开机相同的时机。

## 安装普通模块时

MetaModule 如果带 `metainstall.sh`，安装普通模块时也会调用它。所以同一个 ZIP 换一个后端，安装过程可能就不一样。

安装前应同时记录：

- YukiSU 版本；
- MetaModule 名称与版本；
- 普通模块名称与版本；
- 安装日志；
- 模块是否声明挂载后端要求。

缺少这些信息时，单凭 ZIP 名称很难复现问题。

## 更换 MetaModule

换 MetaModule 不要直接覆盖。按这个顺序来：

1. 记录当前 MetaModule、普通模块和重要配置；
2. 在管理器中卸载当前 MetaModule；
3. 完整重启，让卸载脚本和状态清理完成；
4. 确认管理器不再显示活动 MetaModule；
5. 安装新的 MetaModule；
6. 再次重启并先验证一个简单挂载模块；
7. 检查其他模块，而不是默认旧后端状态可直接复用。

当前后端还显示待更新、待卸载或禁用时，先重启让它把事情做完。管理器会拦住一部分后端重叠操作，但不要故意和检查机制斗智斗勇。

这项安装拦截只在活动 MetaModule 带 `metainstall.sh` 时保护其自定义安装流程；不能把“管理器允许安装”理解成当前后端已经挂载正常。

## 卸载的影响

卸载 MetaModule 后，普通模块目录和脚本可能还在，但它们的 `system/` 文件不会继续出现在系统路径。所有依赖挂载的模块都会一起受影响。

在移除后端前，应区分：

- 只运行脚本的模块，可能仍能工作；
- 只提供 WebUI 的模块，界面可能仍可打开；
- 依赖系统文件的模块，会失去核心功能；
- 对挂载结果有强依赖的服务，可能异常或反复重启。

## 如何判断 MetaModule 正常

不要只看“已安装”。至少核对：

- 管理器只显示一个活动 MetaModule；
- 它不处于待更新、待卸载或禁用状态；
- 启动日志中 `post-fs-data` 与 `metamount.sh` 没有错误；
- 一个简单测试模块的目标文件在预期 namespace 中可见；
- 禁用测试模块并重启后，目标文件按预期消失；
- 普通模块卸载时，`metauninstall.sh` 没有遗留错误。

shell 里看得到、某个应用里看不到，先查那个应用的 namespace 和模块卸载策略。后端真坏了，通常不会只挑一个应用失明。

若开启“为 WebView 卸载模块”，WebView Zygote 会在自己的命名空间中移除普通模块挂载；修改 WebView 资源的模块可能因此按设计不可见。这属于内核按应用卸载策略，不是 MetaModule 安装失败。详见[模块挂载](/modules/magic-mount/)。

## MetaModule 不会自动承诺这些功能

YukiSU 不保证某个 MetaModule 一定具备：

- Magic Mount 兼容语义；
- OverlayFS；
- 文件冲突自动解决；
- 模块隐藏或完整性规避；
- 跨 Root 方案无缝迁移；
- 设备无法启动时的 Recovery 安装支持。

这些都要看具体后端。MetaModule 会以 Root 处理多个模块的文件和脚本，信任级别非常高；来源、源码、更新记录和卸载方法至少得有一样能让你放心，最好全部都有。

MetaModule 也不处理 `/data/adb/plugins/` 下的 Lua 插件，不负责加载 `zygisk/*.so` 或解释 `zn_modules.txt`。这些路径分别属于 `ksud` 插件运行时与 YukiZygisk。

继续阅读[模块系统](/modules/overview/)了解普通模块，或在挂载失败时前往[常见问题排查](/troubleshoot/common/)。
