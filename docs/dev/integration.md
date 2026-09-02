---
permalink: /dev/integration/
title: 内核集成
---

# 构建 YukiSU LKM

YukiSU 只支持外部 `CONFIG_KSU=m`，不支持 built-in `CONFIG_KSU=y`。下面是把 `kernel/` 作为 external module，针对一棵已经配置并成功构建的目标内核树生成 `kernelsu.ko`；它不是把 YukiSU 源码合并进内核的教程。

## 支持面与前置条件

- Android 12（API 31）及以上的 ARM64 GKI 2.0 设备；
- Linux 5.10 及以上；当前 CI 目标覆盖到 `android17-6.18`；
- 与真机完全对应的源码、配置、符号版本和构建输出；
- 构建树中已有 `vmlinux`；
- `CONFIG_MODULES=y`、`CONFIG_KSU=m`；
- `CONFIG_KPROBES=y`、`CONFIG_KRETPROBES=y`、`CONFIG_HAVE_SYSCALL_TRACEPOINTS=y`；
- 可用的 Clang/LLVM、主机 C 编译器、GNU make、Python 3 与 Git。

仓库维护的标准 DDK 目标是：

```text
android12-5.10  android13-5.10  android13-5.15  android14-5.15
android14-6.1   android15-6.6   android16-6.12  android17-6.18
```

这个列表是 CI 构建面，不是厂商内核通用 ABI 承诺。设备升级 Android 后也可能继续使用较早 KMI，按目标 `boot` 的 kernel release 选择，别按系统版本猜。

## 使用目标内核树构建

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

`KDIR` 必须指向**已经配置和构建**的目录。使用 `O=out` 时通常指向 output tree，不是源码根目录；该目录还应保留 `vmlinux`，因为末尾的 `check_symbol` 会用它检查最终 LKM 的未解析符号。

`android17-6.18` 的 external-module 构建需要 `M`/`MO` 分离与新的 `srcroot` 语义，仓库 `kernel/Makefile` 与 `Kbuild` 已处理标准 `android17-6.18` DDK 布局。若自定义输出目录名称或 vendor 6.18 构建系统改变了这些变量，应检查 make 日志打印的 `KMI`、`KBUILD_ARGS`、`srctree`、`objtree`，不要直接套用标准 DDK 成功结论。

成功产物位于：

```text
YukiSU/kernel/kernelsu.ko
```

## 配置选项

- `CONFIG_KSU_SUPERKEY=y` 只编入 SuperKey verifier 与可修补数据区。当前有效 salt/hash/验证模式由 `ksud` 在镜像修补时写进最终 LKM；不要把 `KSU_SUPERKEY=<value>` 当成完整、受支持的部署路径。常规官方 Manager 仍可走 APK 签名认证。
- `CONFIG_KSU_YUKIZYGISK=y` 编入 YukiZygisk 内核 Hook；关闭后基础 Root、App Profile 与模块生命周期仍可构建，但不能只靠用户空间文件补回这些 Hook。
- `CONFIG_KSU_KRETPROBES_SUCOMPAT` 仍由 `Kconfig` 声明，但当前实现源码没有消费它来选择另一条 sucompat 路径；不要把设为 `y` 当作有效集成步骤。

## Android 12 到 17 的兼容代码

`Kbuild` 通过源码探测选择 SELinux credential、seccomp filter release、`vfs_getattr`、dcache flush、`path_umount` 等 API 分支；这也是 5.10、5.15、6.1、6.6、6.12 与 6.18 能共用一套源码的原因。探测成功只说明选到可编译分支，不证明厂商把对应语义保留完整。

新 bionic 还可能把 `execve` 路径转成 `execveat`。当前 TSR 已同时覆盖 ksud 集成、sucompat、ADB root、sulog/init 跟踪与可选 YukiZygisk observer；移植或裁剪 Hook 时不能只验证 `__NR_execve`。

## 验证

至少检查：

```sh
file kernelsu.ko
llvm-readelf -h -S -s kernelsu.ko
modinfo kernelsu.ko
```

还要保留构建使用的 commit、KDIR、配置、kernel release、`vmlinux` 身份和最终 LKM SHA-256。`make` 通过与 `check_symbol` 通过属于主机构建证据；只有加载相同哈希的 `.ko`、检查内核日志并完成启动/Root 测试，才是设备证据。

要直接使用仓库 DDK 与完整 APK 流程，见[构建指南](/dev/build/)；镜像参数见[启动镜像命令](/dev/boot-images/)。

## 源码入口

- [external-module Makefile](https://github.com/Rouyashiki/YukiSU/blob/main/kernel/Makefile)
- [Kbuild 与兼容探测](https://github.com/Rouyashiki/YukiSU/blob/main/kernel/Kbuild)
- [CI DDK 流程](https://github.com/Rouyashiki/YukiSU/blob/main/.github/workflows/ddk-lkm.yml)
