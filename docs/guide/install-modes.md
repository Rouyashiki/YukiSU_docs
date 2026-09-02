---
permalink: /guide/install-modes/
title: 安装与镜像模式
---

# 安装与镜像模式

管理器里的“直接安装”“选择镜像”和“内核直嵌”不是同一层概念：前两项决定**镜像从哪里来、结果写到哪里**，后者决定**LKM 怎样进入启动链**。

## 安装入口

| 入口 | 输入 | 输出或写入目标 | 适用场景 |
| --- | --- | --- | --- |
| 选择镜像修补 | 本地镜像 | 在下载目录生成修补镜像 | 首次安装、离线修补、手动刷写 |
| 下载镜像 | HTTPS OTA、factory ZIP 或原始 `payload.bin` | 提取所选启动分区后生成修补镜像 | 不想先下载整包到手机 |
| 直接安装 | 当前设备启动分区 | 当前槽位 | 已有可用 Root 的安装或更新 |
| 安装到未使用槽位 | OTA 后的新槽位 | 非活动槽位，并准备切槽 | OTA 已完成但尚未重启 |
| 使用本地 LKM | 自选 `.ko` | 交给所选修补流程 | 内置资源没有目标 KMI，或使用设备专用构建 |

“直接安装”会写块设备；“选择镜像修补”只生成文件。不要把页面入口的“直接”与下面的“内核直嵌”混为一谈。

## 两种持久安装布局

| 布局 | 后端命令 | 修改位置 | 目标限制 |
| --- | --- | --- | --- |
| 传统 Ramdisk | `ksud boot-patch` | 把 `ksuinit`、LKM 与配置放入启动 Ramdisk | 根据目标 KMI 与设备布局选择 `boot`、`init_boot` 等 Ramdisk 分区 |
| ImgPatch / 内核直嵌 | `ksud boot-patch-v2` | 把启动器与 LKM capsule 直接嵌入 `boot` 中的 ARM64 内核 | **只接受带内核的 AOSP `boot` 镜像**；拒绝 `init_boot` 与 `vendor_boot` |

首页会把当前运行方式区分为 Ramdisk、ImgPatch 或 late-load。这个状态描述的是**正在运行的 LKM 从哪里加载**，不是 Android Root 权限的另一种等级。

### 传统 Ramdisk

管理器会从当前槽位、OTA 目标槽位或所选镜像解析目标 KMI，并将已验证的值通过 `--kmi` 传给 `ksud`。使用内置资源时，KMI 必须在 APK 打包的 LKM 列表中；检测失败或没有匹配项时，页面会要求选择，而不是拿当前 Android 版本猜。

设备存在 `init_boot` 且目标不是 `android12-*` 时，普通 LKM 安装通常优先选择 `init_boot`；没有时回到 `boot`。这是当前通用选择逻辑，不会覆盖设备维护者对特殊分区布局的说明。

### ImgPatch / 内核直嵌

内核直嵌模式从 `boot` 里的 `linux_banner` 识别 KMI；没有手选 `.ko` 时，再提取同名的内置 `<kmi>_kernelsu.ko`。它恢复目标内核所需的 kallsyms/BTF 信息，并把 LKM 与加载信息写入内核镜像。

当前实现还有几条重要边界：

- 只修补 `boot`；所选镜像必须是有效 AOSP boot image，而且其中确实有 ARM64 kernel；
- 设备直装或 OTA 槽位安装会同时检查 `boot` 与 `init_boot`，清理由旧 KernelSU Ramdisk 布局留下的已知文件；
- 遇到 Magisk 修改过的 Ramdisk 时会拒绝清理，先用 Magisk 自己的流程恢复原厂镜像；
- SuperKey、签名回退开关、允许 shell、启动时 ADB 调试与 UTS View 早启动模板会写入所选 LKM，供早期内核初始化读取；
- 再次修补已经含 capsule 的镜像时，会替换 LKM；现有元数据不够用时才退回完整分析；
- `boot-restore` 能使用校验过的原厂备份，缺少可用备份时也会尝试移除可验证的 capsule，恢复修补前的 raw kernel。

::: danger 内核直嵌不是“强制加载万能 LKM”
它改变的是加载布局，不会消除 KMI、vermagic、符号或厂商内核差异。解析、注入或清理任一步失败时，正确做法是停止并保存日志。
:::

## 远程镜像入口

“下载镜像”接受 HTTPS URL，并通过 HTTP Range 读取：

- 原始 `payload.bin`；
- 含未压缩 `payload.bin` 的 OTA ZIP；
- 直接带 `boot.img` / `init_boot.img` / `vendor_boot.img` 的 factory ZIP；
- 外层 factory ZIP 中以 STORED 方式保存的 `image-*.zip`。

服务器必须在 HEAD 响应中提供 `Content-Length` 和 `Accept-Ranges: bytes`。页面先探测包内可用启动分区与 boot KMI，再只提取所选分区。压缩的 `payload.bin`、不支持 Range 的网盘分享页、需要网页登录的跳转链接都不是有效输入。

当前远程入口走传统 `boot-patch`；要用 ImgPatch，请先提供本地 `boot.img`，或在已有 Root 的设备上选择直接/OTA 槽位安装。

## 更新和恢复

- Ramdisk 与 ImgPatch 可以互相切换，但切换逻辑必须先清除另一种布局留下的内容；不要手工只覆盖某个 `.ko`。
- 设备侧 ImgPatch 直装会保留每个槽位的原厂 boot 备份；仍应另存当前固件的原厂镜像，不能把设备内唯一备份当成救砖方案。
- “恢复原厂镜像”和“永久卸载”不是一回事。前者处理启动镜像，后者还会移除 YukiSU 用户空间与模块数据。
- APK 安装不会修改 LKM 或启动镜像；`ksud` 也有独立的同步与完整性状态，见[更新 YukiSU](/guide/update/)。

需要精确 CLI 参数时继续看[启动镜像命令](/dev/boot-images/)。

## 事实来源

- [管理器安装流程](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt)
- [`boot-patch` 与恢复实现](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch.cpp)
- [`boot-patch-v2` ImgPatch 实现](https://github.com/Rouyashiki/YukiSU/blob/main/userspace/ksud/src/boot/boot_patch_v2.cpp)
- [远程镜像提取实现](https://github.com/Rouyashiki/YukiSU/blob/main/manager/app/src/main/java/com/anatdx/yukisu/core/tasks/ExtractImage.kt)
