---
permalink: /dev/ramdisk-protocol/
title: Ramdisk Editor 协议
---

# Ramdisk Editor 协议（YRCP v3）

下面两个命令背后用的是同一套进程内 CPIO 文档协议：

```text
ksud ramdisk-editor <ramdisk.cpio>
ksud boot-ramdisk-editor <source.img> <output.img>
```

请求走标准输入，响应走原始标准输出，日志走标准错误。没执行 `DUMP` 就退出，前面的修改全部作废。boot-image 模式也只会在 `DUMP` 时原子生成输出镜像，不会趁你不注意去写块设备。

## 帧头

所有整数均为无符号小端。请求与响应以 20 字节头开始：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| magic | 4 bytes | ASCII `YRCP` |
| version | `u16` | 当前为 `3` |
| opcode | `u16` | 响应设置 `0x8000` 位 |
| request ID | `u32` | 在响应中回显 |
| payload size | `u64` | 随后的载荷字节数 |

## 主要能力

协议支持 STAT、LIST、分段 READ、替换/创建/复制/移动/删除节点、更新元数据、原子 DUMP、多 Ramdisk 分片以及结构化 ELF header 检查。节点 ID 只在当前进程生命周期内稳定；多分片模式应使用 `HELLO` / `LIST_RAMDISKS` 返回的根 ID。

完整协议还有节点记录、17 个 opcode、capability mask、状态码和 96 字节 ELF header。真要实现客户端，请直接读仓库里的[完整规范](https://github.com/Anatdx/YukiSU/blob/main/docs/ramdisk-editor-protocol.md)；这页是导览，不是拿来猜二进制字段偏移的。
