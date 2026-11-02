---
permalink: /modules/module-config/
title: 模块配置与功能托管
---

# 模块配置与功能托管

用 `ksud module config` 保存模块自己的设置。它支持持久值和临时覆盖，也用于声明模块接管哪些 YukiSU 功能。配置属于模块目录 ID；卸载模块时一起删除。

## 读写配置

安装脚本、生命周期脚本和 `action.sh` 已有 `KSU_MODULE` 环境变量，可直接执行：

```sh
ksud module config set mode balanced
ksud module config get mode
ksud module config list
```

在普通 Root shell 中调试时，显式指定实际模块目录 ID：

```sh
KSU_MODULE=example.report ksud module config get mode
```

没有有效 `KSU_MODULE` 时命令失败。模块 ID 至少两个字符，首字符为英文字母，其余只能是英文字母、数字、点、下划线和连字符。`--internal <name>` 选择 `internal.<name>` 命名空间，供内部工具使用；普通模块使用自己的 ID。

| 命令 | 行为 |
| --- | --- |
| `set <key> <value>` | 写入持久值 |
| `set <key> <value> --temp` | 写入临时覆盖值 |
| `get <key>` | 读取临时值；没有时读持久值；两处都没有则非零退出 |
| `list` | 按键排序列出合并后的 `key=value` |
| `delete <key>` | 删除持久值；该层不存在此键则非零退出 |
| `delete <key> --temp` | 删除临时值，之后重新读到持久值 |
| `clear` | 清空持久配置，保留临时配置 |
| `clear --temp` | 清空临时配置，保留持久配置 |

`--temp` 只用于 `set`、`delete`、`clear`；`get` 和 `list` 始终返回合并结果。临时值覆盖同名持久值，因此删掉持久值后，临时值仍可读到。

临时配置在下一次 `post-fs-data` 流程开始时清除；late-load 初始化也会清除。[模拟软重启](/manager/soft-reboot/)重新派发 `post-fs-data`，同样会清除它。不要用临时值保存需要跨这些阶段保留的用户设置。

## 多行值、限制与存储

省略 `VALUE` 或指定 `--stdin` 时，从标准输入读到 EOF；换行会原样保留。用 `printf` 避免无意多写一个换行：

```sh
printf '%s' '{"mode":"balanced","enabled":true}' | ksud module config set settings --stdin
ksud module config get settings
```

- 键长 2–256 字节，首字符为英文字母，其他字符限字母、数字、点、下划线、连字符。
- 值必须是 UTF-8，最多 1 MiB，可以为空或包含换行。
- 每层最多 32 个键；持久层与临时层分别计数。
- `get` 输出值后额外添加一个换行；shell 的 `$(...)` 会去掉末尾换行，不适合逐字节取回多行文本。
- `list` 是便于查看的文本，值可以跨行。不要把输出直接 `source` 或 `eval`。

文件位于 `/data/adb/ksu/module_configs/<目录 ID>/persist.config` 与 `tmp.config`。v1.8.0 使用带长度字段的二进制格式，不要用文本编辑器或 `sed` 修改。旧版 C++ 实现写入的 `key=value` 文件仍可读取，下一次保存时转为新格式。通过命令读写，检查退出码；写入失败时不要把界面显示为保存成功。

## 接管 YukiSU 功能

当模块必须负责某个内核功能时，写入 `manage.<功能名>`。例如，确实要管理 `sulog` 的模块可在 `customize.sh` 中声明：

```sh
ksud module config set manage.sulog true || abort 'Cannot register sulog management'
```

随后在模块自己的启动脚本中设置运行值：

```sh
ksud feature set sulog 1 || exit 1
```

`manage.sulog=true` **只声明管理权，不会启用 sulog**。模块仍须设置功能、检查结果，并提供用户配置及退出托管后的恢复方案。使用 `ksud feature list` 查看功能名；数字 ID 也能作为 `manage.` 后缀。

管理权按以下规则处理：

1. 只扫描 `/data/adb/modules/` 中没有 `disable`、`remove` 的模块；单纯写配置不会创建活动模块。
2. `manage.*` 值去掉首尾空白后，不区分大小写的 `true`、`yes`、`1`、`on` 表示启用，其他值不接管。临时配置仍优先。
3. 恢复功能配置时跳过被托管的功能，由模块脚本设置。
4. 普通 Root shell 或其他模块直接修改受管功能会被拒绝。调用脚本的 `KSU_MODULE` 必须属于该功能的管理模块。
5. 启动配置强制的功能优先于模块，模块也不能改写。

`su_compat`、`magisk_compat`、`kasumi_sucompat` 联动：接管其中一个，会限制整组切换；关闭 Kasumi 时也会检查这组管理权。不要让多个模块分别接管相互联动的 su 模式。

可在 `module.prop` 另外声明：

```properties
managedFeatures=sulog
```

该字段是逗号分隔的安装检查清单，只显示不支持或已被管理的警告。它**不会写入 `manage.*`，不会建立管理权，也不会自动阻止冲突模块安装**。作者必须同时实现实际配置和功能设置。

## 查询与解除托管

```sh
ksud feature check sulog
ksud feature list
ksud feature get sulog
ksud feature get sulog --config
```

`check` 返回 `supported`、`unsupported`、`managed` 或 `forced`；`list` 显示管理模块。`get` 查询当前内核运行值，`get --config` 查询已保存的功能值，未保存时输出 `Not set in config`。保存值不代表本次启动已经应用。

停止托管时，删除或关闭相应 `manage.*` 配置；如果有临时覆盖，先清除它。禁用或卸载模块也会使后续检查不再承认其管理权。这些操作不会撤销已经设置的内核值：先按模块提供的恢复步骤处理，再重启并检查功能状态。

源码：[配置实现](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module_config.cpp)、[命令参数](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/cli_args.cpp)、[功能托管](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/core/feature.cpp)、[模块扫描](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/module/module.cpp)、[安装提示](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/assets/installer.sh)。
