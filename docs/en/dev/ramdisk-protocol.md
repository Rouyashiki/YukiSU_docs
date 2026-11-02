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

Requests arrive on standard input, responses use the original standard output, and diagnostics use standard error. Send `DUMP` before closing to save edits. Boot-image mode creates or replaces its output only on `DUMP` and never writes a block device by itself.

## Frame header

All integers are unsigned little-endian. Each request/response begins with 20 bytes:

| Field | Type | Meaning |
| --- | --- | --- |
| magic | 4 bytes | ASCII `YRCP` |
| version | `u16` | currently `3` |
| opcode | `u16` | responses set bit `0x8000` |
| request ID | `u32` | echoed in the response |
| payload size | `u64` | following payload bytes |

## Capabilities

The protocol supports STAT, LIST, ranged READ, replacing/creating/copying/moving/removing nodes, metadata updates, atomic DUMP, multiple Ramdisk fragments and structured ELF header inspection. Node IDs are stable only for the process lifetime; multi-fragment clients must use roots returned by `HELLO` / `LIST_RAMDISKS`.

## Revision-bound binary editing

Framing remains v3, but the current protocol has **20 opcodes**. Hex editing adds these operations; clients must negotiate `HELLO` capability bits 16/17 first:

| Opcode | Operation | Purpose |
| --- | --- | --- |
| 18 | `BINARY_INFO` | Return the current Ramdisk-fragment revision and file length |
| 19 | `READ_AT_REVISION` | Read a range only if the revision still matches |
| 20 | `APPLY_EDITS` | Validate original revision/size, then publish an edit plan made of original ranges and inserted bytes |

Revisions belong to a session-local **Ramdisk fragment**, not one file. Editing another node in that fragment also invalidates an old revision. Reopening the process requires a new session identity; never reuse an old revision token. A revision conflict returns status `7`; reread instead of retrying blindly.

The complete edit plan is validated before publication, preserving metadata and shared hard-link content without a partial replacement. `APPLY_EDITS` changes only the in-memory document; `DUMP` is still required to persist the CPIO/output image. If the connection breaks after publication without a response, the client cannot confirm the commit result. Discard the session and reopen the saved file; do not replay the transaction.

Write the entire request before awaiting its response. A save producer must not issue nested `READ` calls on the same serialized session. The current limits remain 512 MiB of content and 262144 edit segments; requests exceeding these limits are rejected.

The [complete protocol specification](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/docs/ramdisk-editor-protocol.md) defines node records, all 20 opcodes, capability bits, status codes, edit-plan layout and the 96-byte ELF header. Use that specification to implement frame parsing and error handling.
