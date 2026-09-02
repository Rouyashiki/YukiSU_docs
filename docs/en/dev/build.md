---
permalink: /en/dev/build/
title: Build guide
---

# Build guide

The repository's full build order is DDK LKMs → `ksuinit` → `su` → 64/32-bit YukiZygisk → `ksud` → Manager APK. Each prior output is staged under `userspace/ksud/assets/` before the next configuration step, and the resulting `ksud` is finally packaged into the APK as `libksud.so`.

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
git clone https://github.com/Rouyashiki/YukiSU
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
- the NDK selected by `manager/gradle/libs.versions.toml`, currently `29.0.14206865`;
- usable CMake and Ninja installations under the Android SDK.

SDK resolution checks `ANDROID_SDK_ROOT` / `ANDROID_HOME`, `manager/local.properties` and a small set of known locations. `ANDROID_NDK_HOME` may override NDK location. Treat the script's first missing-dependency error as authoritative.

## Linux / macOS

```sh
git clone https://github.com/Rouyashiki/YukiSU
cd YukiSU
./scripts/build.sh --help
./scripts/build.sh -k android16-6.12 --clean
```

Prepare `ANDROID_NDK_HOME`, Android SDK, JDK, Python 3, CMake, Ninja, Git, Docker and network access required by Gradle. The script selects an available NDK prebuilt from `linux-x86_64`, `darwin-x86_64` or `darwin-arm64`; DDK containers still run as `linux/amd64`.

## Common options

| Option | Current behavior |
| --- | --- |
| `-k, --kmi <KMI>` | Build and package one KMI; omission builds all eight |
| `--clean` | Delete recognized native CMake `build*` directories and clean each DDK target; does not reset Git state |
| `--skip-lkm` | Reuse `out/<KMI>_kernelsu.ko`; every requested target must already exist |
| `--yukizygisk` | Compile YukiZygisk kernel support into LKMs; enabled by default |
| `--yukizygisk-off` | Omit YukiZygisk kernel hooks from LKMs; the full script still builds userspace components |
| `-i, --install` | Install the APK through ADB after building; installs **only the APK**, not LKM/boot changes or a reboot |

`YUKISU_DDK_IMAGE` overrides the DDK image. A multi-KMI build requires a `{KMI}` placeholder and may use `{DDK_RELEASE}`. The current default DDK release is `20260828`.

## How LKMs enter `ksud`

Every selected `out/<KMI>_kernelsu.ko` must exist before `ksud` configuration. The asset generator sorts the files, concatenates their bytes into one solid XZ stream, and records uncompressed offset, length and SHA-256 for every member. Runtime extracts only the requested range while consuming the complete decode stream for validation, then verifies the selected LKM's SHA-256.

Consequences:

- `--skip-lkm` is not “package whichever files happen to exist”; a missing requested target fails the build;
- replacing an asset `.ko` after `ksud` was configured requires reconfiguration/rebuild;
- `boot-info supported-kmis` reports resources actually packaged in that `ksud`, not a theoretical hard-coded list.

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
- `su`: `userspace/su/build/su`
- `ksud`: `userspace/ksud/build/ksud`
- APK: `manager/app/build/outputs/renamed_apk/release/*.apk`

The numeric LKM version follows Git commit count. Full format is `v<version>-<hash>[-nc]@YukiSU`. `-nc` means only that `kernel/` or `uapi/` differs from the current commit; Manager, documentation and other repository changes do not trigger it.

## Build success is not device validation

At minimum, run `git diff --check`, confirm that packaged LKM/`libksud.so` identities belong to the target build, and inspect APK signing. CI success from Android 12/5.10 through Android 17/6.18 is host/KMI build evidence, not proof that a vendor device boots. Installing the APK also does not deploy `/data/adb/ksud`, flash an LKM or reboot; record those states separately.

## Source entry points

- [Windows build script](https://github.com/Rouyashiki/YukiSU/blob/main/scripts/build.ps1)
- [Linux/macOS build script](https://github.com/Rouyashiki/YukiSU/blob/main/scripts/build.sh)
- [CI KMI matrix](https://github.com/Rouyashiki/YukiSU/blob/main/.github/workflows/build-lkm.yml)
- [`ksud` asset packer](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/scripts/embed_assets.py)
