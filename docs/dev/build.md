---
permalink: /dev/build/
title: 构建指南
---

# 构建指南

想把整套 YukiSU 一次构建出来，直接用仓库脚本。它会按依赖顺序处理 DDK LKM、`ksuinit`、`su`、YukiZygisk、`ksud` 和管理器 APK，再把前面的产物塞进后面的包里。

## Windows

```powershell
.\scripts\build.bat --help
.\scripts\build.bat -k android16-6.12
```

需要 Android SDK/NDK、JDK、Python 3、CMake/Ninja、Git，以及能工作的 DDK/Docker 环境。脚本会从环境变量和常见目录找工具；找不到时看 `scripts/build.ps1` 报的第一项缺失，不用先手动猜一遍所有路径。

## Linux / macOS

```sh
./scripts/build.sh --help
./scripts/build.sh -k android16-6.12
```

需要设置 `ANDROID_NDK_HOME`，并准备 CMake、Ninja、JDK、Git、Docker 与 Gradle 所需环境。

## 常用选项

- `-k, --kmi <KMI>`：选择 DDK 目标
- `--clean`：清理脚本认可的原生构建目录
- `--skip-lkm`：复用 `out/<KMI>_kernelsu.ko`
- `--yukizygisk` / `--yukizygisk-off`：控制内核侧 YukiZygisk
- `-i, --install`：顺便安装 APK；**只装 APK**，不会替你刷 LKM、同步 `ksud` 或做其他设备改动

## 产物与版本

最终 DDK LKM 在 `out/<KMI>_kernelsu.ko`，APK 在管理器的 release 输出目录。其他中间产物留在各自构建目录，脚本会负责嵌入，不需要手动复制来复制去。

LKM 数字版本按 Git 提交计数生成，完整格式是 `v<version>-<hash>[-nc]@YukiSU`。看到 `-nc` 不代表“夜版”或“非官方”，它只表示 kernel/UAPI 相对当前提交还有未提交改动。
