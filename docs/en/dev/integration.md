---
permalink: /en/dev/integration/
title: Kernel integration
---

# Build the YukiSU LKM

YukiSU supports only external `CONFIG_KSU=m`, not built-in `CONFIG_KSU=y`. This procedure treats `kernel/` as an external module and builds `kernelsu.ko` against an already configured, successfully built target kernel tree. It does not merge YukiSU into the kernel source.

## Supported surface and prerequisites

- an Android 12 (API 31) or newer ARM64 GKI 2.0 device;
- Linux 5.10 or newer; current CI targets extend through `android17-6.18`;
- source, configuration, symbol versions and build outputs matching the actual device;
- `vmlinux` already present in the build tree;
- `CONFIG_MODULES=y` and YukiSU as `CONFIG_KSU=m`;
- `CONFIG_KPROBES=y`, `CONFIG_KRETPROBES=y` and `CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`;
- usable Clang/LLVM, host C compiler, GNU make, Python 3 and Git.

The maintained standard DDK targets are:

```text
android12-5.10  android13-5.10  android13-5.15  android14-5.15
android14-6.1   android15-6.6   android16-6.12  android17-6.18
```

This is the CI build surface, not a universal ABI promise for vendor kernels. An upgraded Android system may retain an older KMI. Select from the kernel release in target `boot`, not the Android release label.

## Build against a target tree

```sh
export KDIR=<configured kernel build tree>
export CLANG_PATH=<Clang/LLVM bin directory>
export PATH="$CLANG_PATH:$PATH"

export CROSS_COMPILE=aarch64-linux-gnu-
export ARCH=arm64
export LLVM=1
export LLVM_IAS=1

git clone https://github.com/Rouyashiki/YukiSU
cd YukiSU/kernel

test -f include/uapi/supercall.h

make clean
make CONFIG_KSU=m \
    CONFIG_KSU_SUPERKEY=y \
    CONFIG_KSU_YUKIZYGISK=y \
    CC=clang

llvm-strip -d kernelsu.ko
```

`KDIR` must name an **already configured and built** tree. For an `O=out` kernel it normally points to the output tree, not the source root. Keep `vmlinux` there: the final `check_symbol` step uses it to validate unresolved symbols in the completed LKM.

Android 17/6.18 external modules require separated `M`/`MO` and new `srcroot` handling. Repository `kernel/Makefile` and `Kbuild` handle the standard `android17-6.18` DDK layout. If a custom output-directory name or vendor 6.18 build changes these variables, inspect the logged `KMI`, `KBUILD_ARGS`, `srctree` and `objtree`; do not inherit a standard-DDK success claim.

Successful output is:

```text
YukiSU/kernel/kernelsu.ko
```

## Configuration choices

- `CONFIG_KSU_SUPERKEY=y` only compiles the SuperKey verifier and patchable data store. Current effective salt/hash/verification mode is written into the final LKM by `ksud` during image patching; do not treat `KSU_SUPERKEY=<value>` as a complete supported deployment path. The normal Manager signature path may still be used.
- `CONFIG_KSU_YUKIZYGISK=y` compiles YukiZygisk kernel hooks. Base root, App Profile and module lifecycle still build without it, but userspace files alone cannot restore omitted kernel hooks.
- `CONFIG_KSU_KRETPROBES_SUCOMPAT` remains declared by `Kconfig`, but current implementation sources do not consume it to select another sucompat path. Do not treat setting it to `y` as an effective integration step.

## Android 12 through 17 compatibility code

`Kbuild` probes the source tree for SELinux credential, seccomp-filter release, `vfs_getattr`, dcache flush, `path_umount` and other API variants. This is how one source tree selects buildable paths across 5.10, 5.15, 6.1, 6.6, 6.12 and 6.18. A successful probe establishes a compile-time choice, not that a vendor retained identical runtime semantics.

New bionic may also route execution through `execveat`. Current TSR covers both syscall paths across ksud integration, sucompat, ADB root, sulog/init tracking and the optional YukiZygisk observer. A port or reduced build must not validate only `__NR_execve`.

## Validation

At minimum inspect:

```sh
file kernelsu.ko
llvm-readelf -h -S -s kernelsu.ko
modinfo kernelsu.ko
```

Record the source commit, KDIR, config, kernel release, `vmlinux` identity and final LKM SHA-256. A successful `make` and `check_symbol` are host-build evidence. Device evidence requires loading that exact `.ko` hash, checking kernel logs and completing boot/root validation.

For repository DDK plus full-APK builds, see [Build guide](/en/dev/build/). For image parameters, see [Boot-image commands](/en/dev/boot-images/).

## Source entry points

- [External-module Makefile](https://github.com/Rouyashiki/YukiSU/blob/main/kernel/Makefile)
- [Kbuild and compatibility probes](https://github.com/Rouyashiki/YukiSU/blob/main/kernel/Kbuild)
- [CI DDK flow](https://github.com/Rouyashiki/YukiSU/blob/main/.github/workflows/ddk-lkm.yml)
