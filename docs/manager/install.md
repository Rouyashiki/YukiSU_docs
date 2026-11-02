---
permalink: /manager/install/
title: LKM 修补与安装
---

# LKM 修补与安装

::: danger 这里会接触启动链
“直接安装”和“安装到未使用槽位”会写块设备。镜像修补虽然只生成文件，但之后刷错分区、槽位或固件同样会导致无法启动。开始前准备当前固件的原厂镜像和独立于 Android 的恢复方法。
:::

点击首页状态卡进入安装页，选择以下方式：

| 方式 | 输入 | 结果 | 使用条件 |
| --- | --- | --- | --- |
| 选择需要修补的镜像 | 本地启动镜像 | 在 Download 目录生成修补结果 | 不写分区；输入必须来自目标固件 |
| 下载镜像 | HTTPS OTA、factory ZIP 或原始 `payload.bin` URL | 提取所选启动分区后生成修补结果 | 服务器必须支持 byte range；当前不提供 ImgPatch 开关 |
| 直接安装 | 当前槽位的启动分区 | 修补并写回当前槽位 | 需要现有 Root；重启后才切换到新启动链 |
| 安装到未使用槽位 | OTA 后的另一槽位 | 修补并写入未使用槽位 | 仅 A/B 设备；只应在 OTA 完成、首次重启之前使用 |

## 先确定目标，不要先猜分区

正常安装的传统 Ramdisk 路径会根据实际修补目标解析 KMI；“仅更新 ramdisk 配置”不安装新 LKM，会跳过自动 KMI 选择。管理器依次使用：

- 所选本地镜像中的内核；
- 当前或 OTA 目标槽位中的启动镜像；
- 远程包里 `boot` 或 `vendor_kernel_boot` 的内核数据。

检测到的 KMI 与 APK 内置资源完全匹配时，管理器自动选用对应 LKM；无法解析时，手动选择目标 KMI。本地 `.ko` 必须来自适配目标内核的构建，KMI 检测不会检查这个文件的符号和内核配置。

::: warning UTS View 会改变 `uname`
启用 UTS View 并改写 `release` 后，`uname -r` 返回配置的视图。管理器的 KMI 选择以目标镜像或内核保存的原始身份为准；不要把终端显示字符串手工抄成 KMI。
:::

## 两种修补布局

安装页提供传统 Ramdisk 与内核直嵌两条路径。

| 项目 | Ramdisk 路径 | ImgPatch 内核直嵌 |
| --- | --- | --- |
| 放置位置 | `boot` / `init_boot` 的 KernelSU Ramdisk 载荷 | 直接把 LKM capsule 注入 `boot` 中的 arm64 Linux Image |
| 可处理镜像 | 后端支持的 `boot`、`init_boot`，远程流程还可选择 `vendor_boot` | 只接受包含内核的 AOSP `boot`；拒绝 `init_boot` 与 `vendor_boot` |
| KMI 选择 | 管理器解析并显式传给 `ksud --kmi` | 从目标内核 `linux_banner` 检测，并选择同名内置 LKM；本地 `.ko` 可覆盖 |
| 旧载荷 | 更新传统 KernelSU Ramdisk 内容 | 先移除已知旧 Ramdisk 载荷；设备安装还会清理配套 `init_boot` |
| 首页显示 | `TSR Hook \| Ramdisk` | `TSR Hook \| ImgPatch` |

“将 LKM 直接嵌入 boot 内核”开关只出现在本地镜像、直接安装和未使用槽位安装中。如果当前系统本来就是 ImgPatch 加载，页面会默认继续使用这一方式；其他情况下默认使用 Ramdisk。

远程 URL 流程当前始终走传统 `boot-patch`，不会因为当前工作模式是 ImgPatch 就自动改成内核直嵌。

## 远程镜像流程

“下载镜像”通过 HTTP 字节范围请求读取包中的必要数据。首次使用 `GET` 携带 `Range: bytes=0-0` 和 `Accept-Encoding: identity`，从 `Content-Range` 得到文件总长度，再按需读取其他范围。URL 必须满足：

- 使用 HTTPS；
- 对范围请求返回 HTTP `206 Partial Content`，而不是忽略 Range 返回完整文件；
- 首次响应包含有效的 `Content-Range: bytes 0-0/总长度`；
- 内容为原始 `payload.bin`、包含未压缩 `payload.bin` 的 OTA ZIP，或可识别的 factory ZIP（包括其中未压缩的 `image-*.zip`）。

页面只列出包中实际找到的 `boot`、`init_boot`、`vendor_boot`。提取 `payload.bin` 分区后还会核对 manifest 中的新分区哈希；无法识别结构、KMI 或目标分区时，停止操作，换用目标固件的原厂镜像。

远程服务器与固件包都不由 YukiSU 背书。优先使用设备厂商的原始发布地址，并在刷写前另外核对固件版本和输出哈希。

## LKM 来源

安装页允许：

- 让管理器根据目标 KMI 使用 APK 内置 LKM；
- 选择本地 `.ko` 覆盖内置资源。

选择与目标 Android/KMI、内核配置和 YukiSU 版本匹配的 `.ko`，并确认构建来源。启用 SuperKey、ImgPatch 或 UTS 时，该 LKM 还必须支持相应配置块或启动参数。文件选择器不执行这些兼容检查。

## 高级选项会写进哪里

高级选项默认折叠，选择修补方式后展开。除下表外，还包括启动强制 Feature、禁用模块 preinit、禁用模块 init.rc、显式启用的内核模块阻止列表，以及仅适用于本地镜像的“仅更新 ramdisk 配置”。完整说明见[启动配置](/manager/boot-config/)。

| 选项 | 作用 | 使用条件与生效时间 |
| --- | --- | --- |
| SuperKey | 给本次使用的 LKM 写入 salt、校验值和认证模式 | 密钥与这份 LKM/镜像绑定；详见 [SuperKey](/manager/superkey/) |
| 仅 SuperKey 模式 | 关闭 APK 签名认证 | 密钥丢失后官方 APK 也不能回退认证 |
| 总是给 shell Root | 允许 `adb shell` 调用 `su` | 扩大调试入口的权限，默认不要开启 |
| 启动时强制启用 ADB | 强制 USB 调试并取消 ADB 认证 | 暴露高风险物理/调试入口，默认不要开启 |
| UTS 启动配置 | 在下一次启动早期应用 UTS 模板 | 修改后必须重新修补并完整重启；详见 [UTS View](/manager/uts-view/) |

传统路径把模块启动参数写入 Ramdisk；ImgPatch 路径使用 capsule 模块参数及内嵌配置。SuperKey 等 LKM 修补数据仍属于本次选用的 LKM。更改管理器里的开关不会追溯修改已经生成或已经刷入的镜像。

## 备份语义

- 传统“直接安装”在目标 Ramdisk 未检测到 KernelSU 载荷时尝试保存原厂备份；已包含该载荷时不重新备份。备份失败会输出警告，但不会中止后续修补和刷写，须检查日志中的备份结果。
- 选择本地镜像时，只有显式启用“作为原厂镜像备份”才会把它登记为备份；该选项也接受已修补镜像，不会替你鉴别它是否为原厂文件。“仅更新 ramdisk 配置”不创建原厂备份。
- ImgPatch 设备安装会在 `/data/adb/ksu/` 保留每个目标槽位的原始 `boot` 备份，并在已有备份时保留原文件。
- ImgPatch 的“选择镜像”会在修补输出旁生成对应的 `.yukisu-original.img`。

另外保存目标固件的厂商原包。恢复前确认备份的固件版本、槽位、大小和哈希；不要把旧 OTA 或已修补镜像当作当前原厂备份。

## 输出与完成后的验证

只修补文件时，结果写入公共 Download 目录，确切文件名显示在日志中。随后将输出刷入匹配的目标分区和槽位，再完整重启检查加载结果。

直接安装当前槽位或未使用槽位时，结果直接写入目标分区，**不会另外导出到 Download**。需要可保存的修补镜像时选择本地镜像修补；备份与刷写结果仍以安装日志为准。

直接安装后检查：

1. 页面日志中的目标分区和槽位是否与计划一致；
2. 修补模式是 Ramdisk 还是 ImgPatch；
3. 使用的是哪个 LKM/KMI，以及是否启用了高风险选项；
4. 重启后首页的完整 YukiSU 版本、UAPI、工作模式与 `ksud` 状态；
5. 原厂镜像和外部恢复入口是否仍可用。

APK、设备侧 `ksud` 和运行中的 LKM 需要分别检查。APK 更新后，按设置手动或自动同步 `ksud`；持久安装的新 LKM 则需写入启动镜像并完整重启后才生效。

需要从架构角度比较两种布局时，继续看[安装与镜像模式](/guide/install-modes/)；需要精确 CLI 参数时看[启动镜像命令](/dev/boot-images/)。

## 越狱安装

当当前 APK 尚未成为 YukiSU 管理器且 SELinux 为 Permissive 时，安装页会开放 late-load 入口。有现成 Root shell 时直接运行 `ksud late-load`，否则尝试用 Magica 引导。

加载需要匹配的内置 LKM，以及可用的 Root shell 或 Magica 引导条件。失败时保留安装日志，不要反复重试同一不匹配 LKM。late-load 仅作用于本次开机，详见[越狱模式](/guide/jailbreak-mode/)。

## 源码

[Install.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt)、[BootConfigOptions.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/BootConfigOptions.kt)、[DataSourceChannel.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/core/utils/DataSourceChannel.kt)、[boot_patch.cpp](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp)。

[KsuCli.kt](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/KsuCli.kt).
