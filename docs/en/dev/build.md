---
permalink: /en/dev/build/
title: Build guide
---

# Build guide

The repository's full build order is DDK LKMs → `ksuinit` → 64/32-bit YukiZygisk → `ksud` → BusyBox → Manager APK. LKM, `ksuinit` and YukiZygisk outputs are staged under `userspace/ksud/assets/` before configuring `ksud`. The APK packages `libksud.so` and `libbusybox.so` separately. The current `su` path belongs to `ksud`; the full scripts no longer build `userspace/su` separately.

## Current targets and Android floor

Without `-k`, the scripts build and package all eight targets:

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

Every YukiSU userspace component is built for API 31 (Android 12) and checked again at compile time by `userspace/common/api_floor.hpp`. Manager currently uses `minSdk=31`, `targetSdk=37` and `compileSdk=37`. These are separate from LKM KMI requirements.

## Windows

```powershell
git clone --branch v1.9.0 --recurse-submodules https://github.com/Rouyashiki/YukiSU
cd YukiSU
.\scripts\build.bat --help
.\scripts\build.bat -k android16-6.12 --clean
```

Current `build.ps1` checks for:

- a 64-bit Windows PowerShell environment and Git;
- Docker Desktop, with DDK containers running as `linux/amd64`;
- Python 3;
- JDK 17 or newer (21 recommended);
- Android SDK Platform 37 and Build Tools 36.1.0;
- the NDK selected by `manager/gradle/libs.versions.toml`, currently `30.0.16248370`;
- usable CMake and Ninja installations under the Android SDK.

SDK resolution checks `ANDROID_SDK_ROOT` / `ANDROID_HOME`, `manager/local.properties` and a small set of known locations. `ANDROID_NDK_HOME` may override NDK location. Install the component named in the missing-dependency error, then rerun the script.

## Linux / macOS

```sh
git clone --branch v1.9.0 --recurse-submodules https://github.com/Rouyashiki/YukiSU
cd YukiSU
./scripts/build.sh --help
./scripts/build.sh -k android16-6.12 --clean
```

Prepare `ANDROID_NDK_HOME`, Android SDK, JDK, Python 3, CMake, Ninja, Git, Docker and network access required by Gradle. The script selects an available NDK prebuilt from `linux-x86_64`, `darwin-x86_64` or `darwin-arm64`; DDK containers still run as `linux/amd64`.

## Submodules and license assets

For an existing checkout, run `git submodule update --init --recursive` so MagiskbootAlone, YukiPLT, compression libraries and other dependencies match the recorded revisions. A source ZIP of the main repository does not replace a Git checkout with submodules.

The Manager build generates license inventories and texts from Maven dependencies and native submodule revisions. If generation or verification fails, resolve the reported submodule, dependency registration or license source, then rebuild.

YukiZygisk in v1.9.0 depends on both the YukiLinker SDK and YukiPLT. Both are submodules under `userspace/zygisk/third_party/`. After switching to the release tag, initialize the submodules and rebuild with `--clean` so all components come from the same revision.

## Common options

| Option | Current behavior |
| --- | --- |
| `-k, --kmi <KMI>` | Build and package one KMI; omission builds all eight |
| `--clean` | Delete recognized native CMake `build*` directories and clean each DDK target; does not reset Git state |
| `--skip-lkm` | Reuse `out/<KMI>_kernelsu.ko`; every requested target must already exist |
| `--yukizygisk` | Compile YukiZygisk kernel support into LKMs; enabled by default |
| `--yukizygisk-off` | Omit YukiZygisk kernel hooks from LKMs; the full script still builds userspace components |
| `-i, --install` | Install the APK through ADB after building; installs **only the APK**, not LKM/boot changes or a reboot |

The Windows script supports `YUKISU_DDK_IMAGE` overrides. Multi-KMI builds require `{KMI}` and may use `{DDK_RELEASE}`. The Bash script currently uses its own image template and does not read that override. Both default to DDK release `20260828`.

## How LKMs enter `ksud`

Every selected `out/<KMI>_kernelsu.ko` must exist before `ksud` configuration. The asset generator sorts the files, concatenates their bytes into one solid XZ stream, and records uncompressed offset, length and SHA-256 for every member. Runtime extracts only the requested range while consuming the complete decode stream for validation, then verifies the selected LKM's SHA-256.

Packaging requirements:

- `--skip-lkm` fails if any requested target is missing;
- replacing an asset `.ko` after `ksud` was configured requires reconfiguration/rebuild;
- `boot-info supported-kmis` reports resources actually packaged in that `ksud`; use it to check the package contents.

## Signing

Local release signing uses four environment variables:

```text
YUKISU_KEYSTORE
YUKISU_KEYSTORE_PASSWORD
YUKISU_KEY_ALIAS
YUKISU_KEY_PASSWORD
```

Set all four or none. Without signing configuration an unsigned release APK may be produced, but it cannot be treated as an installable release through `--install`. Never place keys in the repository or command output.

## Outputs

- LKM: `out/<KMI>_kernelsu.ko`
- `ksuinit`: `userspace/ksuinit/build/ksuinit`
- BusyBox: `userspace/busybox/build/busybox`
- `ksud`: `userspace/ksud/build/ksud`
- APK: `manager/app/build/outputs/renamed_apk/release/*.apk`

The numeric LKM version follows Git commit count. Full format is `v<version>-<hash>[-nc]@YukiSU`. `-nc` means only that `kernel/` or `uapi/` differs from the current commit; Manager, documentation and other repository changes do not trigger it.

## Checks after building

Run `git diff --check`, inspect the APK signature, and check versions and hashes of the packaged LKM and `libksud.so`. CI covers the eight KMIs above; vendor devices also need boot and root tests.

For device testing, use Manager to install matching LKM and userspace components, reboot, then check running versions and kernel logs. Record the deployed image and LKM hashes. The build script's `--install` installs only the APK; follow the [Update guide](/en/guide/update/) for deployment.

## Source entry points

- [Windows build script](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/scripts/build.ps1)
- [Linux/macOS build script](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/scripts/build.sh)
- [CI KMI matrix](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/.github/workflows/build-lkm.yml)
- [`ksud` asset packer](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/ksud/scripts/embed_assets.py)
- [Toolchain versions](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/gradle/libs.versions.toml)
- [License generation](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/manager/app/build.gradle.kts)

- [YukiPLT integration build](https://github.com/Rouyashiki/YukiSU/blob/a66faee724c6ff2d79757cb1cc8030fdf71a30f8/userspace/zygisk/core/CMakeLists.txt)
