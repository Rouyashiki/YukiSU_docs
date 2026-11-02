---
permalink: /dev/boot-images/
title: 启动镜像命令
---

# 启动镜像命令

YukiSU v1.8.0 提供两套镜像后端：传统 Ramdisk `boot-patch` 与内核直嵌 `boot-patch-v2`。按安装方式选择命令；两者的输入、备份和目标分区见下文。

::: danger `--flash` / `-f` 会写分区
下面的文件示例只生成镜像。设备分区模式中的 `--flash` / `-f` 会直接写分区；`--ota` 本身只选择未活动槽位。刷写前，用下面的 `boot-info` 命令确认目标 KMI、槽位与分区。
:::

## 先查询目标

```sh
ksud boot-info current-kmi
ksud boot-info target-kmi --boot /path/to/boot.img
ksud boot-info target-kmi --ota
ksud boot-info supported-kmis
ksud boot-info is-ab-device
ksud boot-info default-partition
ksud boot-info available-partitions
ksud boot-info slot-suffix --ota
```

`target-kmi --boot` 从给定镜像读取，`--ota` 从未使用槽位的 `boot` 读取。两者不能同时给。`supported-kmis` 只列出这份 `ksud` 实际打包的 LKM，可用它确认是否需要通过 `--module` 提供自编译 LKM。

## 传统 Ramdisk：`boot-patch`

只生成文件的最小示例：

```sh
ksud boot-patch \
  --boot /path/to/init_boot.img \
  --out /path/to/output \
  --kmi android14-6.1
```

常用参数如下；其他参数运行 `ksud boot-patch --help` 查看。

| 参数 | 作用与边界 |
| --- | --- |
| `-b, --boot <img>` | 修补指定文件；省略时读取自动选择的设备分区 |
| `-f, --flash` | 设备分区模式下把结果写回所选分区；省略时不写分区 |
| `-o, --out <dir>` | 输出目录，默认当前目录 |
| `--out-name <name>` | 输出镜像文件名 |
| `-k, --kernel <img>` | 用给定内核文件替换解包后的 kernel；与 `--no-install` 互斥 |
| `--cmdline <text>` | 替换整个 boot header 命令行；空字符串清空，禁止换行 |
| `-m, --module <ko>` | 使用指定 LKM；省略时按 KMI 选择内置资源 |
| `-u, --ota` | 使用未活动槽位；只应在 OTA 完成、尚未重启时使用 |
| `--partition <name>` | 选择 Ramdisk 目标；公开帮助支持 `boot`、`init_boot` |
| `--kmi <kmi>` | 指定目标 KMI |
| `--backup` | 在安装路径保存镜像备份；`--no-install` 时跳过 |
| `--superkey <key>` | 向 LKM 写入 SuperKey |
| `--signature-bypass` | 只有同时设置 SuperKey 才生效 |
| `--allow-shell` | 在启动配置中允许 shell Root |
| `--enable-adbd` | 写入启动时 ADB 调试配置 |
| `--adb-debug-prop <text>` | ADB 调试属性的文本内容，不是文件路径 |
| `--uts-config <file>` | 写入一份 UTS View 早启动模板，只能出现一次 |
| `--no-install` | 只更新 Ramdisk 配置，保留现有 init/LKM；不安装新的 Root 实现 |
| `--no-custom-rc` | 写入 `norc=1`，跳过自定义 init.rc 注入 |
| `--no-preinit` | 写入 `preinit=0`，禁用模块 preinit |
| `--force-feature <FEATURE=VALUE>` | 固定支持的启动功能值；可重复传入 |
| `--block-module <NAME>` | 在内核模块黑名单中加入名称；可重复或用逗号分隔 |

### 输出文件、内核替换与命令行

传统 `boot-patch` 和 `boot-restore` 遵循相同的输出规则：

- 指定 `--boot` 输入文件时，会保留输出镜像；相对输入路径在解包前解析。该模式不选择刷写分区，额外传入 `--flash` 也不会把文件刷到设备。
- 从设备分区读取、但不带 `--flash` 时，也会生成输出文件，默认写到当前目录。
- 从分区直接安装或恢复（带 `--flash`）时，默认只写分区；需要额外导出镜像时，加 `--out` 或 `--out-name`。

`--kernel` 接受内核文件，不是完整 `boot.img`。需要替换内核时，应提供带内核的 `boot.img`，并显式选择与**新内核**匹配的 `--module` 或 `--kmi`；该参数不会替你检查新内核与 LKM 是否兼容。

`--cmdline` 是整行替换，不是追加。先保留设备需要的现有参数，再生成完整新值。例如，下面只修改已修补镜像的配置与命令行：

```sh
ksud boot-patch --boot ./boot.img --out ./output \
  --out-name boot-config.img --no-install \
  --cmdline "<complete kernel command line>"
```

`--cmdline ""` 会清空命令行；忘记带上原参数也会删除它们。该选项只改所选镜像的 header 命令行，不同步其他分区，也不修改 Android bootconfig。`boot-patch-v2` 不接受 `--cmdline` 或 `--kernel`。

### 仅修改启动配置

```sh
ksud boot-patch --boot /path/to/init_boot.img \
  --out /path/to/output --no-install --no-preinit
```

`--no-install` 只属于传统 Ramdisk 命令，不能与 `--module`、`--init`、`--kernel`、`--superkey` 或 `--signature-bypass` 混用。显式指定输入镜像、且不需要自动选择 LKM/分区时，可不检测 KMI。配置仍须由设备已有的兼容加载链读取，不会让原厂镜像凭空获得 Root。

它会重写 `allow_shell`、`norc`、`preinit`、`force_feature`、`block_modules` 这些受管理项：**本次未指定的旧受管理项会被清除**，不是逐项叠加修改。其他既有配置保留；指定新 UTS 模板时才替换旧的 UTS 配置。

### 启动固定值与内核模块黑名单

当前 `--force-feature` 接受名称或数字 ID：`su_compat`（0）、`kernel_umount`（1）、`sulog`（2）、`adb_root`（3）、`selinux_hide`（4）、`shell_su_adb_only`（6）。ID 5 保留。布尔开关使用 `0` / `1`；被启动配置固定的功能在当前启动期间不能通过普通功能开关覆盖，修改后须重新部署镜像并重启。

`--block-module` 接收内核模块名，不是 YukiSU 模块目录 ID。每个名称由字母、数字、下划线组成，最长 64 字节，合并列表最长 255 字节。它阻止后续加载，不会卸载已经加载的内核模块。只有明确传入才启用，避免把设备所需驱动加入名单。

Manager 在安装/更新 LKM 时先通过 `boot-info target-kmi` 解析目标，再把验证过的 `--kmi` 交给 `boot-patch`；仅修改配置模式跳过 LKM/KMI 选择。人工调用 CLI 未给 `--kmi` 时，`ksud` 只在需要自动选择 LKM 或分区时检测 KMI。

## ImgPatch：`boot-patch-v2`

只生成文件：

```sh
ksud boot-patch-v2 \
  --boot /path/to/boot.img \
  --output /path/to/patched.img
```

直接处理设备当前槽位或 OTA 槽位：

```sh
ksud boot-patch-v2 --flash
ksud boot-patch-v2 --flash --ota
```

这套命令的约束比传统路径更窄：

- 文件模式必须同时给 `--boot` 与 `--output`；设备模式只给 `--flash`，不能再给这两个文件参数；
- `--ota` 只允许和 `--flash` 一起使用；
- 输入必须是能解包得到受支持 raw ARM64 kernel 的 AOSP `boot` 镜像，`init_boot` 和 `vendor_boot` 会被拒绝；
- 输出已经存在时默认拒绝，明确给 `--force` 才覆盖；输出不能与 boot 或 module 输入指向同一个文件；
- `--module <ko>` 可覆盖自动 LKM；省略时从内核 `linux_banner` 检测 KMI 并提取内置资源；
- `--superkey`、`--signature-bypass`、`--allow-shell`、`--enable-adbd` 与 `--uts-config` 的含义与传统路径相同，其中 SuperKey/ADB/UTS 配置修补到 LKM，其他加载参数由 capsule 传递；
- 同样支持 `--no-custom-rc`、`--no-preinit`、`--force-feature` 与 `--block-module`；**不支持 `--no-install`**。新的 capsule 参数布局也支持更新旧 capsule 时升级配置；
- `--no-reuse` 只用于强制重新分析已修补内核，通常不需要。

备份统一存为 `ksu_backup_<原始镜像 SHA-1>`，优先位于 `/data/adb/ksu/`；无此目录写权限时会尝试当前 Android 用户的 Manager 私有目录 `boot_backup/`。ImgPatch 另存 `imgpatch_backup_<修补后镜像标识>.sha1`，把输出镜像与原始备份绑定，并在恢复时验证备份内容。恢复时使用上述备份与绑定记录。

保存日志报告的实际备份位置，并另行保留可在 fastboot/recovery 使用的原厂镜像；清除 Manager 数据可能同时删除私有目录备份。再次修补优先复用经验证的原始备份；没有备份时只能从可逆 capsule/旧 Ramdisk 恢复原始内容，失败就停止。

设备模式还会检查对应的 `init_boot`，清除传统 KernelSU/YukiSU Ramdisk 文件。若检测到 Magisk Ramdisk，清理会停止并返回错误；先恢复对应分区的原厂镜像，再重新安装。

## 恢复

恢复镜像可以单独指定输出目录和文件名：

```sh
ksud boot-restore --boot ./boot.img --out ./output --out-name restored.img
ksud boot-restore --help
```

`boot-restore` 不带 `-f` 时只生成恢复后的镜像；省略 `--boot`、从设备分区读取时，`-f` 才写回该分区。恢复路径取决于镜像布局：

- **ImgPatch**：优先使用校验通过、不含 capsule 的原始备份；没有有效备份时，尝试从目标内核移除可逆 capsule，再重新打包。
- **传统 Ramdisk**：优先使用与 Ramdisk 中记录的哈希匹配的有效备份；没有有效备份时，移除 `kernelsu.ko` 和旧 `kasumi.ko`，存在 `init.real` 时将其恢复为 `init`，再重新打包。

命令返回错误时停止，保存错误并使用自行保留的原厂镜像恢复。回退路径重新打包的镜像不保证与原厂整镜像逐字节一致。

## 自动化日志与部署检查

至少保存：

- 完整命令行（密钥值应脱敏）；
- 输入镜像大小与 SHA-256；
- 解析出的 KMI、分区和槽位；
- 所选 LKM 的版本、大小与 SHA-256；
- `ksud` 标准输出、标准错误和退出码；
- 输出镜像大小与 SHA-256；
- 原厂备份的位置及验证结果。

部署生成的镜像后，重启并检查 Root 授权和管理器显示的运行模式。若启动失败，结合实际部署镜像的哈希、启动日志和内核日志定位问题。

## 源码入口

- [`boot-patch`、`boot-restore` 与 `boot-info`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2`](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [ImgPatch LKM 配置 ABI](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/uapi/imgpatch_config.h)
- [Manager 命令拼装与 KMI 解析](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt)
- [启动参数校验](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_config.hpp)
- [备份与镜像绑定](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_backup.cpp)
