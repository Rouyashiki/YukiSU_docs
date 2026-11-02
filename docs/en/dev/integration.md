---
permalink: /en/dev/integration/
title: Kernel integration
---

# Build the YukiSU LKM

YukiSU supports only external `CONFIG_KSU=m`, not built-in `CONFIG_KSU=y`. This procedure treats `kernel/` as an external module and builds `kernelsu.ko` against an already configured, successfully built target kernel tree.

## Support and prerequisites

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

CI builds these eight standard DDK targets. Vendor kernels still require matching source, configuration and symbol versions. An Android upgrade can retain the existing KMI, so select the KMI from the kernel release in the target `boot` image.

## Build against a target tree

```sh
export KDIR="/path/to/kernel/out"
export CLANG_PATH="/path/to/clang/bin"
export PATH="$CLANG_PATH:$PATH"

export CROSS_COMPILE=aarch64-linux-gnu-
export ARCH=arm64
export LLVM=1
export LLVM_IAS=1

git clone --branch v1.8.0 --recurse-submodules https://github.com/Rouyashiki/YukiSU
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

Android 17/6.18 external modules require separated `M`/`MO` and new `srcroot` handling. Repository `kernel/Makefile` and `Kbuild` handle the standard `android17-6.18` DDK layout. If a custom output-directory name or vendor 6.18 build changes these variables, inspect the logged `KMI`, `KBUILD_ARGS`, `srctree` and `objtree` and confirm that they identify the target source and output trees.

Successful output is:

```text
YukiSU/kernel/kernelsu.ko
```

## Configuration choices

- `CONFIG_KSU_SUPERKEY=y` only compiles the SuperKey verifier and patchable data store. Current effective salt/hash/verification mode is written into the final LKM by `ksud` during image patching; setting `KSU_SUPERKEY=<value>` does not replace the image-patching step. The normal Manager signature path may still be used.
- `CONFIG_KSU_YUKIZYGISK=y` compiles YukiZygisk kernel hooks. Base root, App Profile and module lifecycle still build without it, but userspace files alone cannot restore omitted kernel hooks.
- `CONFIG_KSU_KRETPROBES_SUCOMPAT` remains declared by `Kconfig`, but setting it does not select another sucompat implementation. It is not needed for integration.

## Build requirements for module preinit

The preinit runner is a static nolibc program embedded in the LKM. `Kbuild` checks for `usr/include/linux/unistd.h` in the kernel build tree. If installed kernel UAPI headers are absent, it prints `preinit disabled` and builds with `KSU_NO_PREINIT`. The resulting `.ko` lacks module-preinit support. To enable preinit, install the target kernel's UAPI headers, rebuild, and confirm that `preinit disabled` no longer appears in the log.

## Android 12 through 17 compatibility code

`Kbuild` probes the source tree for SELinux credential, seccomp-filter release, `vfs_getattr`, dcache flush, `path_umount` and other API variants. This is how one source tree selects buildable paths across 5.10, 5.15, 6.1, 6.6, 6.12 and 6.18. When porting to a vendor kernel, also test the behavior of the selected API branches.

New bionic execution paths also use `execveat`. Current TSR covers both syscall paths across ksud integration, sucompat, ADB root, sulog/init tracking and the optional YukiZygisk observer. Test both `execve` and `execveat` when porting or reducing these hooks.

## Validation

At minimum inspect:

```sh
file kernelsu.ko
llvm-readelf -h -S -s kernelsu.ko
modinfo kernelsu.ko
```

Record the source commit, KDIR, config, kernel release, `vmlinux` identity and final LKM SHA-256. For device testing, load the `.ko` with that hash, inspect kernel logs, and test reboot and root authorization.

For repository DDK plus full-APK builds, see [Build guide](/en/dev/build/). For image parameters, see [Boot-image commands](/en/dev/boot-images/).

## Source entry points

- [External-module Makefile](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/Makefile)
- [Kbuild and compatibility probes](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/Kbuild)
- [CI DDK flow](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/.github/workflows/ddk-lkm.yml)
