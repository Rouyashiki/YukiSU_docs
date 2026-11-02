---
permalink: /guide/information/
title: 基础概念
---

# 基础概念

## LKM、KMI 与安装布局

`kernelsu.ko` 是 YukiSU 的可加载内核模块（LKM）。YukiSU 只支持 `CONFIG_KSU=m`，不提供 built-in `CONFIG_KSU=y`。最低用户空间为 Android 12（API 31），设备须属于 ARM64 GKI 2.0 范围。

KMI 描述内核模块接口基线，不等于手机当前 Android 版本。同为 Linux 6.1 仍可能存在符号版本、配置或厂商差异；完整目标见[兼容范围](/guide/compatibility/)。

| 运行方式 | 加载位置 | 是否随启动保留 |
| --- | --- | --- |
| Ramdisk | 启动 Ramdisk 的 `ksuinit` 加载 LKM | 是 |
| ImgPatch | `boot` 内核的 bootstrap 加载 capsule 内的 LKM | 是 |
| late-load | Android 启动后临时加载 LKM | 否 |

[仅配置 Ramdisk 修补](/manager/boot-config/)是独立镜像用途，不安装或替换 LKM，不能单独用来首次获得 Root；已有 Ramdisk 加载链可以保留。

## 内核、用户空间与管理器

- LKM 处理授权、内核 Hook、Feature 与 Kasumi 等能力。
- `ksuinit` 连接传统 Ramdisk 启动流程。
- `ksud` 处理模块、策略、镜像、配置和管理器后端，内含 Kagami 等组件。
- `su` 是应用发起提权的用户空间入口，当前命令处理集成在 `ksud` 中；是否允许提权由内核授权和 App Profile 决定。
- Manager 是控制与诊断界面；YukiZygisk daemon/core 是独立的注入运行组件。

APK 内置 `ksud` 与设备上的 `/data/adb/ksud` 分开更新。管理器核对实际 ELF，提供手动同步。自动同步默认关闭；开启后，管理器冷启动时已取得内核认可的管理器身份，才会检查并同步。此时尚未认证会跳过，认证完成后可手动同步。同步不会替你更新 LKM 或启动镜像。

## 模块、MetaModule、Kagami 与 Kasumi

普通模块位于 `/data/adb/modules/`，可以包含脚本、属性、策略、WebUI 与系统文件。脚本由 `ksud` 执行，系统文件由挂载后端处理，Zygisk 库由注入运行时加载；排错时沿对应路径查看日志。

Kagami 是内置挂载实现；启用的外部 MetaModule 提供 `metamount.sh` 时优先由它负责挂载。Kasumi 是内核能力，可用于 su 入口、挂载视图与路径规则；它既不是普通 MetaModule 的别名，也不等于 YukiZygisk。

一次性脚本执行一次任务并记录结果，不保留为已安装模块。preinit 是下次完整启动才运行的早期动作快照。详见[模块系统](/modules/overview/)。

## 授权与认证

管理器认证回答“哪个管理器受内核信任”；应用授权回答“哪个应用可以 Root”。SuperKey 通过 `prctl` 认证管理器 UID，不是通用 Root 密码。动态管理器可以配置额外信任签名，兼容值覆盖不改变实际版本或能力。

## Feature 与视图

当前定义 13 个 Feature：`0–4`、`6`、`101–107`。它们包含 su 入口、卸载策略、日志、ADB、SELinux 视图、shell 会话限制、YukiZygisk 与 Kasumi 等。启动配置强制固定的项目不能直接在运行时修改，见[功能控制](/manager/feature-control/)。

UTS View 改变目标看到的系统标识，不更换真实内核；属性隐藏不重新锁定 bootloader；挂载视图清理不撤销已获得的 Root。验证文件可见性时，从目标应用进程检查。
