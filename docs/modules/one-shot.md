---
permalink: /modules/one-shot/
title: 一次性脚本
---

# 一次性脚本

一次性脚本把一个手动 Root 操作打包成 ZIP，由管理器展示说明、参数、源码和执行输出。它不会作为常驻模块安装，也不会自动参加后续开机阶段。执行过的系统修改不会因为临时目录被清理而自动撤销。

需要保留模块时，使用普通模块的 `action.sh` 或[热安装](/modules/hot-install/)；需要启动回调或周期任务时，使用 [Lua 插件](/modules/plugin/)。

## 使用方法

1. 从模块仓库选择标为脚本的条目，或在本地 ZIP 选择器中打开一次性脚本包；
2. 阅读说明和 `action.sh` 源码，确认脚本来自你信任的维护者，再填写参数；
3. 点击运行，查看输出与最终退出状态；
4. 按脚本说明检查结果；失败时保存执行日志。

仓库用 `kind: script` 分类这类条目，并校验下载大小与 SHA-256；准备执行时再次校验内容和模块 ID。本地 ZIP 没有仓库预期摘要；从维护者的正式渠道下载，有校验值时先比对文件。脚本不参与已安装模块和待更新模块统计；管理器记录最近一次运行的版本、时间与退出码。

直接运行脚本即可，无需安装模块。本地入口的“仍作为模块安装”用于主动改走普通模块安装流程。

## ZIP 格式

以下文件直接位于 ZIP 根目录，不要再包一层文件夹：

```text
example-script.zip
├── module.prop
├── action.sh
└── params.json       # optional
```

```properties
id=example.report
name=Example report
version=1.0
versionCode=1
author=Example author
description=Print a device property once
oneshot=true
```

`oneshot=1` 也能识别；`true` 不区分大小写。ID 长度为 2–64 个字符，首字符为英文字母，其余只能是字母、数字、点、下划线和连字符。`action.sh` 必须是普通文件。

执行器最多解压 64 MiB、4096 个条目，`module.prop` 与 `params.json` 各最多 64 KiB；本地 ZIP 本身最多 80 MiB。绝对路径、`..`、重复路径、符号链接和特殊文件会被拒绝。脚本通过校验后以 Root 运行，可以修改系统。

## 参数表单

`params.json` 使用 `schemaVersion: 1`，最多 16 项：

```json
{
  "schemaVersion": 1,
  "params": [
    {
      "key": "DETAILS",
      "type": "bool",
      "label": "Include kernel version",
      "default": false
    },
    {
      "key": "MODE",
      "type": "enum",
      "label": "Report mode",
      "default": "brief",
      "options": [
        { "value": "brief", "label": "Brief" },
        { "value": "full", "label": "Full" }
      ]
    }
  ]
}
```

| 类型 | 约束 | 传入脚本的值 |
| --- | --- | --- |
| `bool` | 默认 `false` | `true` / `false` |
| `enum` | 1–32 个唯一选项；选项值只含字母、数字、点、下划线、连字符，长度 1–64 | 选中的 `value` |
| `string` | 可设 `required`；`maxLength` 默认 256，允许 1–1024；禁止 NUL 与换行 | 原始字符串 |
| `int` | 32 位有符号整数；可设 `min` / `max` | 规范化十进制整数 |

每项必须包含 `key`、`type`、`label`，可带 `description` 和类型对应的 `default`。`key` 必须匹配 `[A-Z][A-Z0-9_]{0,31}` 且不重复；值通过 `KSU_PARAM_<KEY>` 传入。枚举未指定默认值时选第一项；整数未指定时用 `min`，没有 `min` 则为 0。标签和说明去掉首尾空白后为 1–200 个字符。

## 执行环境

管理器为每次运行新建 Root shell，使用全局挂载命名空间与随管理器提供的 BusyBox `sh`。工作目录及 `MODPATH` 指向本次解压目录，标准输入来自 `/dev/null`，因此脚本应通过参数表单收集输入，不使用 `read` 交互。

执行器提供 `ASH_STANDALONE=1`、`KSU=true`、`KSU_VER`、`KSU_VER_CODE`、`KSU_KERNEL_VER_CODE`、`KSU_MODULE`、`KSU_ONESHOT=1`、`MODPATH` 和声明的 `KSU_PARAM_*`；late-load 时另有 `KSU_LATE_LOAD=1`。需要其他模块专用值时，由脚本自行查询。

```sh
#!/system/bin/sh
printf 'Model: %s\n' "$(getprop ro.product.model)"
if [ "$KSU_PARAM_DETAILS" = true ]; then
  uname -r
fi
exit 0
```

管理器会引用环境变量值，脚本自身仍须引用变量；不要对用户参数使用 `eval`。完整源码预览最多显示 256 Ki 个字符，超过后页面会注明截断；额外二进制和被调用脚本仍需单独审查。

| 退出码 | 管理器结果 |
| --- | --- |
| `0` | 成功 |
| `2` | 不适用于当前设备 |
| 其他 | 失败 |

脚本结束后，管理器清理解压目录并记录退出码。离开页面后，正在执行的脚本仍会继续。需要保留的数据应写到脚本自己管理的持久目录；运行后按脚本说明检查目标配置或文件。

源码依据：[包校验](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptPackage.kt)、[参数格式](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptParams.kt)、[执行环境](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/data/script/ScriptCommand.kt)、[运行生命周期](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/viewmodel/ScriptRunViewModel.kt)。
