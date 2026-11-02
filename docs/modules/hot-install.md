---
permalink: /modules/hot-install/
title: 模块热安装
---

# 模块热安装

热安装在安装器完成后立即启用新模块目录。需要即时初始化的模块可以同时运行一个热安装脚本；系统文件挂载、启动脚本和已有进程里的原生库仍按下表处理。

用户无需为所有模块手动开启开关。没有主动请求热安装的 ZIP 仍使用正常安装流程。

## 作者如何请求

安装器导出 `KSU_HAS_HOT_INSTALL=true`。模块可以在 `customize.sh` 中检查它，再设置：

```sh
if [ "$KSU_HAS_HOT_INSTALL" = true ]; then
  MODULE_HOT_INSTALL_REQUEST=true
  MODULE_HOT_RUN_SCRIPT=hot-install.sh
fi
```

`MODULE_HOT_RUN_SCRIPT` 是可选的模块内相对路径。脚本留在最终模块目录中，由 `ksud` 在切换完成后运行；不要把需要保留的逻辑放进安装后会清理的 `customize.sh`。请求值必须是精确的 `true`。不要在 ZIP 中直接放 `.ksu_hot_install` 标记：它由完成安装的安装器生成。

脚本路径不能是绝对路径或包含 `..`，解析后必须是模块树内的普通文件。不存在的脚本会提示并跳过；其他无效路径会放弃本次热切换。

## 实际发生的动作

1. ZIP 正常解压和安装到 `/data/adb/modules_update/<id>/`；
2. `ksud` 检查请求及路径，MetaModule 或安全模式下不执行热切换；
3. 原活动目录移入按本次启动分组的暂存区，再把待更新目录切换到 `/data/adb/modules/<id>/`；
4. 尝试应用新模块的 `sepolicy.rule`；
5. 如果配置了有效脚本，在全局挂载命名空间运行它；
6. 刷新供后续启动使用的 init rc、preinit 和 YukiZygisk 早期快照。

热脚本继承普通模块脚本环境与 `KSU_MODULE`，标准输入重定向到 `/dev/null`。`ksud` 最多等待 30 秒，超时后报告失败并停止等待，脚本继续运行。作者必须自行处理任务退出和失败清理；关闭安装页面不会停止服务。

## 哪些仍然需要重启

| 内容 | 热安装后的行为 |
| --- | --- |
| 普通文件、WebUI、Action | 活动目录已换成新版本；重新打开页面或文件读取新内容，旧文件句柄仍指向旧文件 |
| `sepolicy.rule` | 尝试立即应用；失败会在安装日志中报告 |
| `system/` 等分区文件 | 安装器不重新挂载，等完整重启或符合条件的模拟软重启重建计划 |
| `system.prop` 与普通启动脚本 | 不会自动补跑；需要模块显式处理或等待相应启动阶段 |
| `initrc/`、`preinit/` | 更新下次完整启动的内容，不在本次安装时执行 |
| Zygisk / Native ZN 库 | 不会从已有进程卸载旧库并注入新库；依赖后续进程与注入生命周期 |
| MetaModule | 始终按正常重启流程生效 |

[模拟软重启](/manager/soft-reboot/)可以在满足条件时重新应用模块脚本和挂载；它是独立操作，不属于热安装的自动收尾，不能执行 preinit 或 init rc。

## 失败与回退

检查或目录切换失败时，日志会显示 `Hot install skipped` 并提示重启；安装流程继续保留正常的待更新路径。旧目录已移走而新目录切换失败时，`ksud` 会尝试恢复旧目录，恢复错误会另行记录。

目录切换成功后，SELinux 规则应用失败、热脚本非零退出或超时**不会自动回滚活动目录**。出现 `Hot install script failed` 时，新目录已经生效。需要恢复旧配置或撤销系统修改的模块，必须在脚本中实现恢复逻辑。

旧目录保留在 `/data/adb/ksu/hot_install_trash/` 的本次启动分组中，供仍在使用旧内容的进程继续访问；后续启动自动清理旧分组。保留这些目录至重启，管理器不提供通过它们回滚版本的入口。

源码依据：[安装器变量](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh)、[热安装实现](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/hot_install.cpp)、[脚本执行与安装收尾](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp)。
