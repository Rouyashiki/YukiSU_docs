---
permalink: /en/dev/integration/
title: Kernel integration
---

# Build the YukiSU LKM

YukiSU supports only `CONFIG_KSU=m`. This builds an external LKM against an already configured kernel tree; it is not built-in kernel integration.

## Requirements

- ARM64 GKI 2.0 / Linux 5.10 or newer
- source, configuration and build output matching the target kernel
- `vmlinux` present in the build tree
- `CONFIG_KPROBES=y`
- `CONFIG_KRETPROBES=y`
- `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`
- Clang/LLVM and Git

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

The output is `YukiSU/kernel/kernelsu.ko`. With an `O=out` kernel build, `KDIR` should normally point at the configured output directory.

CI DDK builds cover common KMI targets, but a module that does not load should be rebuilt against the device kernel instead of forced past compatibility checks. Kbuild API probes select source paths; they are not device runtime validation.
