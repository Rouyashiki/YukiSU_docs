---
permalink: /manager/partition/
title: 分区与 Ramdisk 工具
---

# 分区与 Ramdisk 工具

::: danger 这里能直接破坏启动与校准数据
只刷写目标设备、固件和槽位对应的镜像。`persist`、`modem`、`fsg`、`nvram` 等分区保存校准或设备数据；不要用其他设备的备份覆盖。
:::

从安装页未选择修补方式时，可在“高级工具”中进入分区管理器。

## 分区列表与槽位

管理器通过 `ksud flash` 后端读取：

- 当前是否为 A/B 设备，以及当前/另一槽位；
- 常用启动分区：`boot`、`init_boot`、`recovery`、`dtbo`、`vbmeta`、`vendor_boot`、`vendor_kernel_boot`；
- 全部分区扫描结果；
- 物理/逻辑类型、容量、最终块设备与槽位后缀。

页面可以在常用/全部分区之间切换，按名称或块设备搜索，并过滤物理/逻辑分区。切换 A/B 槽位后会重新解析目标，不要从上一槽位的页面截图推断当前目标。

另一槽位的动态分区没有现成设备节点时，页面提供显式映射操作。先等待 OTA 完成，再映射并操作未使用槽位；映射操作不会完成 OTA。

## 备份

### 单分区

选择备份目录后，单分区备份会生成带时间戳的 `.img`。当后端知道分区容量时，管理器要求输出大小与分区大小一致；命令失败或大小不符会删除这份无效输出。

### 批量

批量模式支持选择当前可见分区、选择启动分区集合，以及预估目标目录空间。`userdata` / `data` 被排除在批量备份之外。

每次批量备份创建独立目录并生成 `manifest.tsv`，记录：

- 槽位；
- 分区名与物理/逻辑类型；
- 预期和实际字节数；
- 每项成功/失败状态。

清单不是哈希。备份后仍应在另一存储介质保存 SHA-256，并至少试读文件头。只留在同一手机 Download 目录的“备份”无法应对数据分区损坏或整机丢失。

## 直接刷写镜像

选中文件后，管理器先把它复制到应用缓存，再检查：

- 文件非空；
- 已知分区容量下，镜像不大于目标；
- 应用缓存空间足够暂存；
- 目标块设备能被解析。

预检框显示文件名、大小、分区、块设备、槽位和容量。已知危险分区会额外标记，但列表不可能知道每个厂商的所有私有分区；写入前按设备分区说明确认用途。

::: warning 容量检查不检查镜像内容
“不大于分区容量”只防止明显溢出。它不验证镜像的设备型号、固件版本、AVB 链、header 内容或真实目标用途。
:::

## AnyKernel3

在 `boot` 分区的操作框中可以选择 AnyKernel3 ZIP。管理器先让 `ksud` 识别包，并在预检中显示：

- 包名；
- 内核名称；
- 包声明的设备列表；
- 当前目标槽位；
- 包声明的槽位策略；
- 是否让 AK3 使用 `ksud` 内置 `mkbootfs`。

后端会进行格式与槽位检查，但包内脚本仍由包作者控制。安装前检查发布说明是否支持当前固件，审查 `anykernel.sh` 的目标分区，并准备恢复镜像。设备列表为空时按未知适配处理。

## Ramdisk Editor 入口

页面只在当前布局中最合理的 Ramdisk 载体上显示编辑入口：

- 有 `init_boot` 时，不在 `boot` 上提供入口；
- `init_boot`、`vendor_boot` 与 `recovery` 可以进入；
- 没有 `init_boot` 的设备可从 `boot` 进入。

进入时，管理器先把目标分区备份到应用缓存，再启动持久的 `ksud boot-ramdisk-editor` 会话。读取本身不会修改块设备。

## 当前支持的镜像布局

后端接受普通 AOSP `boot`、`init_boot`、`vendor_boot` header v3–v4，并拒绝它明确无法安全重建的厂商特殊布局。`recovery` 同样要求上述布局；编辑器不支持旧版 v0–v2 或其拒绝的厂商私有 Recovery 镜像。支持的 Ramdisk 压缩包括：

- gzip / zopfli；
- xz；
- lz4、legacy lz4 与 lz4_lg；
- 未压缩 CPIO。

`vendor_boot` v4 中多个 vendor Ramdisk 分片会分别显示名称、类型、压缩大小与 board ID；所有分片共享同一次编辑会话，并在最终重建时一起写回。

## 编辑器能做什么

当前协议/文件浏览器支持：

- 浏览、搜索与读取目录；
- 新建文件或目录；
- 导入、导出和替换普通文件；
- 重命名、复制、移动、递归删除；
- 创建符号链接和硬链接；
- 修改 mode、UID、GID 等 Unix metadata；
- 编辑不超过 2 MiB 的文本，并选择字符编码；
- 只读查看 ELF 文件头摘要；
- 用集成 YukiFB 十六进制编辑器查看和修改普通文件的二进制内容；
- 计算文件校验值（包括 SHA-256/SHA-512，另有 MD5、SHA-1、CRC32 等）；
- 导出临时副本供外部应用打开或分享。

外部打开/分享会把内容交给选定应用，不会自动把外部编辑结果写回 Ramdisk。需要替换时显式导入。校验值用于比较内容，MD5/CRC32 等不能当作发布者身份或安全签名。

编辑对象保存在内存 CPIO 文档中。对文本或十六进制编辑点“保存”只是写回当前内存文档；还没有生成启动镜像。离开编辑器前还需处理未保存的文件编辑和未导出的重建结果。

## 重建、导出与退出

正确顺序是：

1. 修改文件；
2. 点击“重建启动镜像”（协议中的 `DUMP`），在应用缓存生成结果；
3. 点击“导出重建镜像”，用系统文档接口保存到持久位置；
4. 退出前确认没有未导出的结果。

退出页面会关闭会话，并删除缓存中的源镜像和重建结果。只看到“已在应用缓存中重建”但没有导出，文件不会被永久保留。

Ramdisk Editor **不会自动写入块设备**。导出后若要刷写，仍应回到分区工具，重新完成目标和容量预检。

## AVB / dm-verity 控制

`vbmeta`、`vbmeta_a`、`vbmeta_b` 的操作菜单新增“AVB / dm-verity”。页面读取**所选块设备保存的标志**，分别控制 AVB 验证与 dm-verity；不是从被改写的 Android 属性推断当前启动状态，也不是对所有 `vbmeta_*` 链分区统一操作。

修改前显示目标分区、块设备、槽位并要求确认；管理器重新读取旧状态，保存后再次回读核对。bootloader 报告已锁定时控件禁用。状态读取失败时应刷新并保留错误，不要假定修改成功。

保存后在下一次启动该槽位时才应用。关闭 AVB 验证时，单独开启 dm-verity 标志不能恢复验证；重新启用前须确保受验证镜像及签名有效。先备份该 `vbmeta` 分区，错误改动可能导致无法启动。

## 重建后的 AVB 签名

后端会尽量保留原压缩方式、boot header 布局，以及受支持的 AVB footer/vbmeta 数据位置。但它复制原有 vbmeta 数据，**不会为改过的 Ramdisk 重新生成可信签名**。

修改内容后，原签名不能认证新内容。需要验证启动的设备必须重新生成匹配的哈希和签名；仅保留 footer 无法完成这一步。刷写前确认设备的解锁状态和实际 Verified Boot 要求。

第三方客户端协议见 [Ramdisk Editor 协议](/dev/ramdisk-protocol/)。普通用户应优先保存原始分区备份与导出镜像，再考虑刷写。

## 源码

[PartitionAvbDialog.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/partition/PartitionAvbDialog.kt)、[PartitionManagerHelper.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/partition/PartitionManagerHelper.kt)、[RamdiskEditorScreen.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/ui/screen/ramdisk/RamdiskEditorScreen.kt)。
