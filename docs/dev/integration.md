---
permalink: /dev/integration/
title: 内核集成
---

# 构建 YukiSU LKM

YukiSU 只做 `CONFIG_KSU=m`。下面编译的是外部 `kernelsu.ko`，前提是你手里已经有一棵能为目标设备正常构建的内核树；这不是 built-in 集成教程。

## 前置条件

- ARM64 GKI 2.0 / Linux 5.10 及以上内核
- 与目标设备当前内核匹配的源码、配置和构建输出
- 构建树中存在 `vmlinux`
- `CONFIG_KPROBES=y`
- `CONFIG_KRETPROBES=y`
- `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`
- 可用的 Clang/LLVM 与 Git

## 构建

```sh
export KDIR=<configured kernel build tree>
export CLANG_PATH=<Clang/LLVM bin directory>
export PATH="$CLANG_PATH:$PATH"

export CROSS_COMPILE=aarch64-linux-gnu-
export ARCH=arm64
export LLVM=1
export LLVM_IAS=1

git clone https://github.com/Anatdx/YukiSU
cd YukiSU/kernel

test -f include/uapi/supercall.h

make CONFIG_KSU=m \
    CONFIG_KSU_SUPERKEY=y \
    CONFIG_KSU_YUKIZYGISK=y \
    CC=clang

llvm-strip -d kernelsu.ko
```

成功后，产物在 `YukiSU/kernel/kernelsu.ko`。

如果内核用 `O=out`，`KDIR` 通常要指向已经配置好的输出目录，不是源码根目录。CI 的 DDK LKM 能覆盖常见 KMI，但加载不了时就回到设备内核树重编，别用强制加载把“不匹配”变成“可能不开机”。

Kbuild 会探测不同内核 API 和厂商兼容项。探测成功只说明“这份代码能选到一条可编译路径”，不等于真机已经替你跑过测试。
