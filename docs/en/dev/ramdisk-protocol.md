---
permalink: /en/dev/ramdisk-protocol/
title: Ramdisk Editor protocol
---

# Ramdisk Editor protocol (YRCP v3)

Two commands expose the same in-process CPIO document protocol:

```text
ksud ramdisk-editor <ramdisk.cpio>
ksud boot-ramdisk-editor <source.img> <output.img>
```

Requests arrive on standard input, responses use the original standard output, and diagnostics use standard error. Closing without `DUMP` discards edits. Boot-image mode creates or replaces its output only on `DUMP` and never writes a block device by itself.

## Frame header

All integers are unsigned little-endian. Each request/response begins with 20 bytes:

| Field | Type | Meaning |
| --- | --- | --- |
| magic | 4 bytes | ASCII `YRCP` |
| version | `u16` | currently `3` |
| opcode | `u16` | responses set bit `0x8000` |
| request ID | `u32` | echoed in the response |
| payload size | `u64` | following payload bytes |

The protocol supports STAT, LIST, ranged READ, replacing/creating/copying/moving/removing nodes, metadata updates, atomic DUMP, multiple Ramdisk fragments and structured ELF header inspection. Node IDs are stable only for the process lifetime; multi-fragment clients must use roots returned by `HELLO` / `LIST_RAMDISKS`.

Read the repository's [complete protocol specification](https://github.com/Anatdx/YukiSU/blob/main/docs/ramdisk-editor-protocol.md) before implementing a client. It defines all node fields, 17 opcodes, capability bits, status codes and the 96-byte ELF header record.
