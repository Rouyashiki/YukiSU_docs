---
permalink: /dev/build/
title: 构建指南
---

# 构建指南

仓库的完整构建顺序是：DDK LKM → `ksuinit` → 64/32 位 YukiZygisk → `ksud` → BusyBox → Manager APK。LKM、`ksuinit` 和 YukiZygisk 产物先放进 `userspace/ksud/assets/`，再配置构建 `ksud`；APK 分别打包 `libksud.so` 与 `libbusybox.so`。当前 `su` 路径属于 `ksud` 实现，不再由完整脚本单独构建 `userspace/su`。

## 当前目标与 Android 门槛

不传 `-k` 时，脚本会构建并打包全部 8 个目标：

```text
android12-5.10
android13-5.10
android13-5.15
android14-5.15
android14-6.1
android15-6.6
android16-6.12
android17-6.18
```

所有 YukiSU 用户空间组件都以 API 31（Android 12）构建，并由 `userspace/common/api_floor.hpp` 再做编译期检查。Manager 当前 `minSdk=31`、`targetSdk=37`、`compileSdk=37`；这和 LKM 的 KMI 是两条独立约束。

## Windows

```powershell
git clone --branch v1.8.0 --recurse-submodules https://github.com/Rouyashiki/YukiSU
cd YukiSU
.\scripts\build.bat --help
.\scripts\build.bat -k android16-6.12 --clean
```

当前 `build.ps1` 会检查：

- 64 位 Windows PowerShell 环境与 Git；
- Docker Desktop，DDK 容器以 `linux/amd64` 运行；
- Python 3；
- JDK 17 及以上（推荐 21）；
- Android SDK Platform 37 与 Build Tools 36.1.0；
- `manager/gradle/libs.versions.toml` 指定的 NDK，当前为 `30.0.16248370`；
- Android SDK 下可用的 CMake 与 Ninja。

SDK 从 `ANDROID_SDK_ROOT` / `ANDROID_HOME`、`manager/local.properties` 与少量已知位置解析；NDK 可由 `ANDROID_NDK_HOME` 覆盖。缺少依赖时，先安装错误信息指出的组件，再重新运行脚本。

## Linux / macOS

```sh
git clone --branch v1.8.0 --recurse-submodules https://github.com/Rouyashiki/YukiSU
cd YukiSU
./scripts/build.sh --help
./scripts/build.sh -k android16-6.12 --clean
```

准备 `ANDROID_NDK_HOME`、Android SDK、JDK、Python 3、CMake、Ninja、Git、Docker 和 Gradle 下载所需网络。当前脚本会从 NDK 的 `linux-x86_64`、`darwin-x86_64` 或 `darwin-arm64` 预编译工具链中选择可用项；DDK 容器仍按 `linux/amd64` 运行。

## 子模块与许可证资源

已有工作区先执行 `git submodule update --init --recursive`，使 MagiskbootAlone、YukiPLT、压缩库等依赖与当前提交记录一致。仅下载主仓库源码 ZIP 不能替代带子模块的 Git checkout。

Manager 构建会根据 Maven 依赖与原生子模块版本生成开源许可证清单和文本。生成或校验失败时，按报错补齐子模块、依赖登记或许可证来源，再重新构建。

v1.8.0 使用 YukiPLT 作为 PLT 依赖；Zygote 与 Native core 分别静态链接 `userspace/zygisk/third_party/yukiplt` 的私有副本。不要复用旧 LSPlt 构建目录。切换依赖版本后先初始化子模块，再用 `--clean` 完整构建。

## 常用选项

| 选项 | 当前语义 |
| --- | --- |
| `-k, --kmi <KMI>` | 只构建并打包一个 KMI；省略则构建全部 8 个 |
| `--clean` | 删除脚本认可的原生 CMake `build*` 目录并清理每个 DDK 目标；不会重置 Git 工作区 |
| `--skip-lkm` | 复用 `out/<KMI>_kernelsu.ko`；每个请求目标都必须已经存在 |
| `--yukizygisk` | 编译 LKM 的 YukiZygisk 内核支持；默认开启 |
| `--yukizygisk-off` | 不把 YukiZygisk 内核 Hook 编进 LKM；用户空间组件仍由完整脚本构建 |
| `-i, --install` | 构建后用 ADB 安装 APK；**只安装 APK**，不刷 LKM、不替换启动镜像、不重启 |

Windows 脚本支持用 `YUKISU_DDK_IMAGE` 覆盖 DDK 镜像，多 KMI 构建时必须含 `{KMI}`，可选 `{DDK_RELEASE}`。当前 Bash 脚本直接使用脚本内的 DDK 镜像模板，不读取该覆盖变量。两者默认 DDK release 均为 `20260828`。

## LKM 怎样进入 `ksud`

每个所选 `out/<KMI>_kernelsu.ko` 都要在 `ksud` 配置前存在。资源生成器按文件名排序，把全部 LKM 串成一个 solid XZ 流，并记录每个成员的未压缩偏移、长度与 SHA-256。运行时只提取目标区间，但会消费完整解码流完成校验，并对选出的 LKM 再验 SHA-256。

打包时注意：

- `--skip-lkm` 缺少任一请求目标时会失败；
- 替换 assets 里的 `.ko` 后，重新配置并构建 `ksud`；
- `boot-info supported-kmis` 反映这份 `ksud` 实际打包的资源，可用它检查打包结果。

## 签名

本地 release 签名使用 4 个环境变量：

```text
YUKISU_KEYSTORE
YUKISU_KEYSTORE_PASSWORD
YUKISU_KEY_ALIAS
YUKISU_KEY_PASSWORD
```

要么全部设置，要么全部不设。没有签名配置时可以产出 unsigned release APK，但它不能用 `--install` 当成可安装正式包。不要把密钥写进仓库或命令输出。

## 产物

- LKM：`out/<KMI>_kernelsu.ko`
- `ksuinit`：`userspace/ksuinit/build/ksuinit`
- BusyBox：`userspace/busybox/build/busybox`
- `ksud`：`userspace/ksud/build/ksud`
- APK：`manager/app/build/outputs/renamed_apk/release/*.apk`

LKM 数字版本按 Git 提交计数生成，完整格式是 `v<version>-<hash>[-nc]@YukiSU`。`-nc` 只表示 `kernel/` 或 `uapi/` 相对当前提交有未提交改动；Manager、文档或仓库其他目录的修改不会触发它。

## 构建后检查

运行 `git diff --check`，检查 APK 签名，并核对包内 LKM 与 `libksud.so` 的版本和哈希。CI 覆盖上述 8 个 KMI；厂商设备还需单独完成启动和 Root 测试。

测试设备时，先通过管理器安装匹配的 LKM 与用户空间组件，再重启，检查运行版本和内核日志。记录实际部署的镜像与 LKM 哈希。构建脚本的 `--install` 只安装 APK，后续部署步骤见[更新指南](/guide/update/)。

## 源码入口

- [Windows 构建脚本](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.ps1)
- [Linux/macOS 构建脚本](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/scripts/build.sh)
- [CI KMI 矩阵](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/.github/workflows/build-lkm.yml)
- [`ksud` 资源打包器](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/scripts/embed_assets.py)
- [工具链版本](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/gradle/libs.versions.toml)
- [许可证生成](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/build.gradle.kts)

- [YukiPLT 集成构建](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/zygisk/core/CMakeLists.txt)
