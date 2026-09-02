---
permalink: /dev/boot-images/
title: 启动镜像命令
---

# 启动镜像命令

YukiSU 当前保留两套镜像后端：传统 Ramdisk `boot-patch` 与内核直嵌 `boot-patch-v2`。它们的输入、备份和目标分区不同，自动化工具不应只按“都是 LKM 修补”混用参数。

::: danger 写分区的参数要单独审查
下面不带 `--flash` / `-f` 的文件示例不会写块设备。`--flash`、`-f` 与 `--ota` 会改变设备启动状态；先解析实际槽位和分区，再由操作者明确决定是否执行。
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

`target-kmi --boot` 从给定镜像读取，`--ota` 从未使用槽位的 `boot` 读取。两者不能同时给。`supported-kmis` 只列出这份 `ksud` 实际打包的 LKM，不等于源码理论上能为哪些内核自行构建。

## 传统 Ramdisk：`boot-patch`

只生成文件的最小示例：

```sh
ksud boot-patch \
  --boot /path/to/init_boot.img \
  --out /path/to/output \
  --kmi android14-6.1
```

常用参数以当前内置帮助为准：

| 参数 | 作用与边界 |
| --- | --- |
| `-b, --boot <img>` | 修补指定文件；省略时读取自动选择的设备分区 |
| `-f, --flash` | 把结果写回目标分区；省略时不写任何分区 |
| `-o, --out <dir>` | 输出目录 |
| `-m, --module <ko>` | 使用指定 LKM；省略时按 KMI 选择内置资源 |
| `-u, --ota` | 使用未活动槽位；只应在 OTA 完成、尚未重启时使用 |
| `--partition <name>` | 选择 Ramdisk 目标；公开帮助支持 `boot`、`init_boot` |
| `--kmi <kmi>` | 指定目标 KMI |
| `--backup` | 将所选输入记为原厂备份 |
| `--superkey <key>` | 向 LKM 写入 SuperKey |
| `--signature-bypass` | 只有同时设置 SuperKey 才生效 |
| `--allow-shell` | 在启动配置中允许 shell Root |
| `--enable-adbd` | 写入启动时 ADB 调试配置 |
| `--uts-config <file>` | 写入一份 UTS View 早启动模板，只能出现一次 |

Manager 不再让当前运行内核和修补目标分别猜 KMI：它先通过 `boot-info target-kmi` 解析目标，再总是把验证过的 `--kmi` 交给 `boot-patch`。只有人工调用 CLI 且没有给 `--kmi` 时，`ksud` 才保留自己的自动检测。

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
- 输入必须是含 raw ARM64 kernel 的 AOSP `boot` 镜像，`init_boot` 和 `vendor_boot` 会被拒绝；
- 输出已经存在时默认拒绝，明确给 `--force` 才覆盖；输出不能与 boot 或 module 输入指向同一个文件；
- `--module <ko>` 可覆盖自动 LKM；省略时从内核 `linux_banner` 检测 KMI 并提取内置资源；
- `--superkey`、`--signature-bypass`、`--allow-shell`、`--enable-adbd` 与 `--uts-config` 的含义与传统路径相同，但配置直接写进 LKM；
- `--no-reuse` 只用于强制重新分析已修补内核，通常不需要。

文件模式会在输入旁创建 `<boot.img>.yukisu-original.img`。设备模式的每槽备份位于 `/data/adb/ksu/boot-patch-v2-original<slot>.img`。再次修补会保留已有原厂备份，不能把当前已带 capsule 的镜像冒充原厂输入。

设备模式还会检查对应的 `init_boot`，清除传统 KernelSU/YukiSU Ramdisk 文件。若检测到 Magisk Ramdisk，清理会失败关闭，不会把两套启动注入强行拼在一起。

## 恢复

查看帮助：

```sh
ksud boot-restore --help
```

`boot-restore` 不带 `-f` 时只生成恢复后的镜像；`-f` 才写回分区。当前实现先验证可用备份：ImgPatch 备份必须是不含 capsule 的原始镜像。备份缺失或无效时，会尝试在目标内核中定位并移除可验证的 capsule；无法证明可逆时返回失败。

## 自动化应保留的证据

至少保存：

- 完整命令行（密钥值应脱敏）；
- 输入镜像大小与 SHA-256；
- 解析出的 KMI、分区和槽位；
- 所选 LKM 的版本、大小与 SHA-256；
- `ksud` 标准输出、标准错误和退出码；
- 输出镜像大小与 SHA-256；
- 原厂备份的位置及验证结果。

镜像生成成功只能证明补丁流程完成，不能证明真机启动或 Root 正常。设备证据还应包含实际部署镜像、启动日志、内核日志和管理器报告的运行模式。

## 源码入口

- [`boot-patch`、`boot-restore` 与 `boot-info`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2`](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [ImgPatch LKM 配置 ABI](https://github.com/Rouyashiki/YukiSU/blob/main/uapi/imgpatch_config.h)
- [Manager 命令拼装与 KMI 解析](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt)
