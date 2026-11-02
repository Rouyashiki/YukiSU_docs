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

请求走标准输入，响应走原始标准输出，日志走标准错误。退出前必须执行 `DUMP` 才能保存修改。boot-image 模式在 `DUMP` 时原子生成输出镜像，不写块设备。

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

## 修订绑定的二进制编辑

协议版本仍为 v3，但当前已有 **20 个 opcode**。十六进制编辑新增以下操作，客户端须先协商 `HELLO` capability bit 16/17：

| Opcode | 操作 | 用途 |
| --- | --- | --- |
| 18 | `BINARY_INFO` | 返回当前 Ramdisk 分片的 revision 和文件大小 |
| 19 | `READ_AT_REVISION` | 只在 revision 一致时读取指定区间 |
| 20 | `APPLY_EDITS` | 检查原始 revision/大小后，一次提交原始片段与插入字节组成的编辑计划 |

revision 属于会话内的 **Ramdisk 分片**，不是单个文件；同分片其他节点发生修改也会让旧 revision 失效。重开进程后必须建立新会话身份，不能复用上次的 revision。版本冲突返回状态码 `7`，客户端应重新读取而非盲目重试。

编辑先完整验证再发布，不会部分替换节点；保留原元数据和硬链接内容共享。`APPLY_EDITS` 只改变内存文档，仍须 `DUMP` 才保存 CPIO/输出镜像。提交后若连接中断且未收到响应，客户端无法确认提交结果。废弃该会话，重新打开已保存的文件；不要重放同一事务。

请求方必须写完完整帧才能等待响应；保存时不能在同一串行会话中嵌套 `READ`。当前内容上限 512 MiB、编辑片段上限 262144，超过限制的编辑请求会被拒绝。

完整节点记录、20 个 opcode、capability mask、状态码、编辑计划布局和 96 字节 ELF header 见[协议规范](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/docs/ramdisk-editor-protocol.md)。客户端应按该规范实现帧解析和错误处理。
