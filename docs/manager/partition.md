---
permalink: /manager/partition/
title: 分区与 Ramdisk 工具
---

# 分区与 Ramdisk 工具

::: danger 这里真的会写分区
两个设备都有一个叫 `boot` 的分区，不代表里面的内容能互刷；同一设备的不同固件和槽位也不一定能混用。点“刷写”前看清摘要。
:::

## 分区管理器

管理器可以：

- 查看物理/逻辑分区和 A/B 槽位；
- 选一个目录批量备份，并生成 `manifest.tsv`；
- 单独备份或刷写某个分区；
- 映射未使用槽位里还没有设备节点的逻辑分区；
- 运行受信任的 AnyKernel3 包，并检查它准备操作哪个槽位。

真正写入前，页面会列出镜像、目标分区、容量和槽位。别只核对文件名；一个叫 `boot.img` 的文件并不会因此自动属于当前设备。批量备份还要留意应用缓存空间，备份结束后也记得检查文件大小。

## Ramdisk Editor

管理器通过 `ksud boot-ramdisk-editor` 打开受支持的启动镜像。编辑过程先留在内存里，只有执行 `DUMP` 才会生成输出；直接退出，相当于没保存。

命令行也能使用：

```text
ksud ramdisk-editor <ramdisk.cpio>
ksud boot-ramdisk-editor <source.img> <output.img>
```

boot-image 模式支持标准 AOSP boot/init_boot header v3-v4，并尽量保留原来的 Ramdisk 压缩格式和 AVB footer。它只生成输出文件，**不会自己写入块设备**。

准备开发第三方客户端时，再看完整的 [Ramdisk Editor 协议](/dev/ramdisk-protocol/)；普通用户不需要先读完 17 个 opcode 才能编辑一个镜像。
