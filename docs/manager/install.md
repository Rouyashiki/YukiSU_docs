---
permalink: /manager/install/
title: LKM 修补与安装
---

# LKM 修补与安装

::: danger 这里会接触启动链
“直接安装”和“安装到未使用槽位”会写块设备。镜像修补虽然只生成文件，但之后刷错分区、槽位或固件同样会导致无法启动。开始前准备当前固件的原厂镜像和独立于 Android 的恢复方法。
:::

首页状态卡进入安装页后，当前管理器提供四种来源/目标：

| 方式 | 输入 | 结果 | 主要边界 |
| --- | --- | --- | --- |
| 选择需要修补的镜像 | 本地启动镜像 | 在 Download 目录生成修补结果 | 不写分区；输入必须来自目标固件 |
| 下载镜像 | HTTPS OTA、factory ZIP 或原始 `payload.bin` URL | 提取所选启动分区后生成修补结果 | 服务器必须支持 byte range；当前不提供 ImgPatch 开关 |
| 直接安装 | 当前槽位的启动分区 | 修补并写回当前槽位 | 需要现有 Root；重启后才切换到新启动链 |
| 安装到未使用槽位 | OTA 后的另一槽位 | 修补并写入未使用槽位 | 仅 A/B 设备；只应在 OTA 完成、首次重启之前使用 |

## 先确定目标，不要先猜分区

传统 Ramdisk 路径会根据实际修补目标解析 KMI。管理器依次使用：

- 所选本地镜像中的内核；
- 当前或 OTA 目标槽位中的启动镜像；
- 远程包里 `boot` 或 `vendor_kernel_boot` 的内核数据。

检测值能与 APK 内置 KMI 资源精确匹配时才自动选用；无法可靠解析时，页面会要求手动选择。即使选择了本地 `.ko`，管理器能够继续使用检测到的 KMI，也不代表该 LKM 的符号、配置和构建来源已经验证。

::: warning UTS View 会改变 `uname`
启用 UTS View 后，普通 `uname -r` 可能是修改后的视图。管理器的 KMI 选择以目标镜像或内核保存的原始身份为准；不要把终端显示字符串手工抄成 KMI。
:::

## 两种修补布局

当前安装页同时保留传统 Ramdisk 与内核直嵌两条路径。

| 项目 | Ramdisk 路径 | ImgPatch 内核直嵌 |
| --- | --- | --- |
| 放置位置 | `boot` / `init_boot` 的 KernelSU Ramdisk 载荷 | 直接把 LKM capsule 注入 `boot` 中的 arm64 Linux Image |
| 可处理镜像 | 后端支持的 `boot`、`init_boot`，远程流程还可选择 `vendor_boot` | 只接受包含内核的 AOSP `boot`；拒绝 `init_boot` 与 `vendor_boot` |
| KMI 选择 | 管理器解析并显式传给 `ksud --kmi` | 从目标内核 `linux_banner` 检测，并选择同名内置 LKM；本地 `.ko` 可覆盖 |
| 旧载荷 | 更新传统 KernelSU Ramdisk 内容 | 先移除已知旧 Ramdisk 载荷；设备安装还会清理配套 `init_boot` |
| 首页显示 | `TSR Hook | Ramdisk` | `TSR Hook | ImgPatch` |

“将 LKM 直接嵌入 boot 内核”开关只出现在本地镜像、直接安装和未使用槽位安装中。如果当前系统本来就是 ImgPatch 加载，页面会默认继续使用这一方式；否则默认仍按所选流程显示。

远程 URL 流程当前始终走传统 `boot-patch`，不会因为当前工作模式是 ImgPatch 就自动改成内核直嵌。

## 远程镜像流程

“下载镜像”不是输入一个网页地址后整包落盘。管理器会先通过 HTTP `HEAD` 读取大小，再用 `Range` 请求探测和提取需要的数据。URL 必须满足：

- 使用 HTTPS；
- 返回 `Content-Length`；
- 明确支持 `Accept-Ranges: bytes`；
- 内容为原始 `payload.bin`、包含未压缩 `payload.bin` 的 OTA ZIP，或可识别的 factory ZIP（包括其中未压缩的 `image-*.zip`）。

页面只列出包中实际找到的 `boot`、`init_boot`、`vendor_boot`。提取 `payload.bin` 分区后还会核对 manifest 中的新分区哈希；无法识别结构、KMI 或目标分区时应停止，而不是把相似文件名当成证据。

远程服务器与固件包都不由 YukiSU 背书。优先使用设备厂商的原始发布地址，并在刷写前另外核对固件版本和输出哈希。

## LKM 来源

安装页允许：

- 让管理器根据目标 KMI 使用 APK 内置 LKM；
- 选择本地 `.ko` 覆盖内置资源。

本地文件只检查为 `.ko` 输入，不能替你证明它来自可信构建。至少核对目标 Android/KMI、内核配置、YukiSU 版本、签名/来源，以及它是否支持当前使用的 SuperKey、ImgPatch 配置与 UTS 选项。

## 高级选项会写进哪里

| 选项 | 作用 | 风险与生效边界 |
| --- | --- | --- |
| SuperKey | 给本次使用的 LKM 写入 salt、校验值和认证模式 | 密钥与这份 LKM/镜像绑定；详见 [SuperKey](/manager/superkey/) |
| 仅 SuperKey 模式 | 关闭 APK 签名认证 | 密钥丢失后官方 APK 也不能回退认证 |
| 总是给 shell Root | 允许 `adb shell` 调用 `su` | 扩大调试入口的权限，默认不要开启 |
| 启动时强制启用 ADB | 强制 USB 调试并取消 ADB 认证 | 暴露高风险物理/调试入口，默认不要开启 |
| UTS 启动配置 | 在下一次启动早期应用 UTS 模板 | 修改后必须重新修补并完整重启；详见 [UTS View](/manager/uts-view/) |

传统路径把相应启动配置写入 Ramdisk；ImgPatch 路径把 SuperKey、shell、ADB 与 UTS 启动配置直接嵌入本次注入的 LKM。更改管理器里的开关不会追溯修改已经生成或已经刷入的镜像。

## 备份语义

- 传统“直接安装”会在合适条件下保存原厂启动镜像备份；选择本地镜像时，只有显式启用“作为原厂镜像备份”才会把它登记为备份。
- ImgPatch 设备安装会在 `/data/adb/ksu/` 保留每个目标槽位的原始 `boot` 备份，并在已有备份时保留原文件。
- ImgPatch 的“选择镜像”会在修补输出旁生成对应的 `.yukisu-original.img`。

内置备份有助于恢复，但不能作为唯一救砖方案：它可能属于旧 OTA、旧槽位或已经被其他工具改过。另存厂商原包，并在操作前核对备份大小与哈希。

## 输出与完成后的验证

只修补文件时，结果写入公共 Download 目录；保存页面日志以获得确切文件名。修补成功不代表已经刷写，更不代表能启动。

直接写入后至少检查：

1. 页面日志中的目标分区和槽位是否与计划一致；
2. 修补模式是 Ramdisk 还是 ImgPatch；
3. 使用的是哪个 LKM/KMI，以及是否启用了高风险选项；
4. 重启后首页的完整 YukiSU 版本、UAPI、工作模式与 `ksud` 状态；
5. 原厂镜像和外部恢复入口是否仍可用。

APK 更新、设备侧 `ksud` 同步和 LKM 安装是独立操作。完成其中一个，不要自动推断另外两个也已更新。

需要从架构角度比较两种布局时，继续看[安装与镜像模式](/guide/install-modes/)；需要精确 CLI 参数时看[启动镜像命令](/dev/boot-images/)。

## 越狱安装

当当前 APK 尚未成为 YukiSU 管理器且 SELinux 为 Permissive 时，安装页会开放 late-load 入口。有现成 Root shell 时直接运行 `ksud late-load`，否则尝试用 Magica 引导。

入口可点击只说明前置界面条件满足；实际加载仍取决于匹配的内置 LKM、内核能力与 Magica/Root 环境。late-load 仅作用于本次开机，详见[越狱模式](/guide/jailbreak-mode/)。
