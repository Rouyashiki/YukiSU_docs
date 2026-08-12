---
permalink: /en/dev/build/
title: Build guide
---

# Build guide

The repository provides Windows and Linux/macOS entry points. They build the DDK LKM, `ksuinit`, `su`, YukiZygisk, `ksud` and manager APK in order and embed required binaries into downstream artifacts.

## Windows

```powershell
.\scripts\build.bat --help
.\scripts\build.bat -k android16-6.12
```

The full build needs Android SDK/NDK, JDK, Python 3, CMake/Ninja, Git and a working DDK/Docker environment. Exact discovery checks live in `scripts/build.ps1`.

## Linux / macOS

```sh
./scripts/build.sh --help
./scripts/build.sh -k android16-6.12
```

Set `ANDROID_NDK_HOME` and provide CMake, Ninja, JDK, Git, Docker and the Gradle prerequisites.

## Common options

- `-k, --kmi <KMI>`: DDK target
- `--clean`: remove script-approved native build directories
- `--skip-lkm`: reuse `out/<KMI>_kernelsu.ko`
- `--yukizygisk` / `--yukizygisk-off`: control kernel YukiZygisk support
- `-i, --install`: additionally install the APK; it does not authorize or perform `ksud` sync or LKM update

The DDK LKM is copied to `out/<KMI>_kernelsu.ko`; the APK is in the manager release output. Intermediate binaries stay in component build directories and are embedded by the script.

The numeric LKM version derives from Git commit count. Full strings look like `v<version>-<hash>[-nc]@YukiSU`, where `-nc` reflects uncommitted kernel/UAPI source changes.
