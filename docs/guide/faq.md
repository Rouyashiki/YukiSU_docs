---
permalink: /guide/faq/
title: 常见问题
---

# 常见问题

## YukiSU 是 KernelSU 换皮吗？

不是。它继续兼容 KernelSU 的模块、MetaModule、App Profile 和 LKM Hook，但用户空间已经用 C++ 重写，管理器、认证扩展和 YukiZygisk 也由 YukiSU 自己维护。生态能共用，不代表管理器和 `ksud` 能互换。完整说明见 [YukiSU 与 KernelSU 的区别](/guide/yukisu-vs-kernelsu/)。

## 哪些设备受支持？

当前正式范围是：

- ARM64；
- GKI 2.0；
- Linux 5.10 及以上；
- LKM 模式，`CONFIG_KSU=m`；
- 具备项目要求的 Kprobes、Kretprobes 与 syscall tracepoints。

GKI 1.0、non-GKI、ARM32、x86_64 与 built-in `CONFIG_KSU=y` 不受支持。进入范围也不代表任意 LKM 都能加载，仍需匹配 KMI、符号与内核配置。

## “仅 LKM”是不是只有内核，没有用户空间？

不是。“仅 LKM”说的是 YukiSU 不做 built-in。管理器、C++ `ksud` / `ksuinit` / `su`、模块系统、MetaModule 和 YukiZygisk 一个没少。

## 管理器能一键 Root 所有支持设备吗？

不能。它能帮你修补镜像、直接安装和处理 OTA 槽位，但不知道你手里的镜像是不是当前固件，也不能把错误 KMI 的 `.ko` 变正确。KMI、分区和槽位还是得由你确认。开始前看[快速开始](/guide/get-started/)。

## 只安装管理器 APK 会发生什么？

你会得到一个能打开的管理器，仅此而已。没有兼容 LKM 时显示“未安装”、部分页面不可用都很正常；APK 装上了不等于手机已经 Root。

## 为什么同为 Linux 5.10，LKM 还是不能加载？

因为 `5.10` 只是大版本。KMI、vermagic、符号、配置和厂商补丁只要有一项对不上，模块就可能加载失败。别强制加载，换匹配构建或拿设备对应内核树重编。

## SuperKey 是必须的吗？

不是。官方管理器默认靠包名和 APK 签名认证。只有自定义签名或私有管理器才需要考虑 SuperKey，第一次安装留空就好。

## SuperKey 会替代 APK 签名吗？

不会默认替代。设置 SuperKey 后，签名认证仍可保留；只有另行启用“禁用 APK 签名验证”，才会进入 SuperKey-only。YukiSU 通过 `prctl` 使用它确认管理器 UID，它不是 KernelPatch/APatch 的 NR45 通用 SuperCall 密钥。详见 [SuperKey 认证](/manager/superkey/)。

## 管理器内置 `ksud` 和已安装 `ksud` 有什么区别？

一个装在 APK 里，用来安装或更新；另一个已经落到设备上，真正负责启动和模块处理。所以更新 APK 不等于设备里的 `ksud` 也更新了。两边差太多时，就会出现“界面里有按钮，点了后端却不认识”的情况。

## 每个模块都需要 MetaModule 吗？

不需要。只跑脚本、改属性、加 SELinux 规则或只带 WebUI 的模块，可以完全不挂载系统文件。模块里有 `system/`、要往 `/vendor` 等路径放东西时，才通常需要 MetaModule。

## 为什么模块装上了却没有文件挂载？

因为“已安装”只代表 ZIP 解进了模块目录，不代表文件已经挂出去。看它有没有 `system/`、有没有 `skip_mount`、MetaModule 是否活动，以及 `metamount.sh` 有没有报错。详见[模块系统](/modules/overview/)。

## YukiSU 的 MetaModule 与 KernelSU 一样吗？

一样。YukiSU 完全遵守官方 KernelSU 的 MetaModule 接口、脚本和生命周期，切换时可以保留现有 MetaModule。具体后端或普通模块自己的 Android、ABI 和版本限制仍然有效，但这不是协议差异。

## 什么是越狱模式？

就是 late-load：Android 已经启动后，再临时加载匹配 KMI 的 LKM。它只对本次开机有效，需要 SELinux Permissive，也赶不上 PID 1 的早期阶段。YukiSU 跟随上游行为，用户空间用 C++ 实现。详见[越狱模式](/guide/jailbreak-mode/)。

## 从 KernelSU 切换要先卸载所有模块吗？

不需要。built-in KernelSU 恢复原厂 boot 后不要先重启，直接使用当前会话仍存在的 KernelSU Root 安装 YukiSU；KernelSU LKM 则连镜像都不用恢复，可直接安装。MetaModule 与普通模块可以保留。详见[从 KernelSU 切换](/guide/switch/kernelsu/)。

## Magisk / KernelSU 模块能直接复用吗？

别只看 ZIP 长得像。模块可能偷偷依赖 Magisk 工具、某个挂载后端、WebUI API、Android 版本或 ABI。作者明确写兼容最好；没写的话，至少单独测试，别和十个模块一起装。

## YukiZygisk 是什么？

它是 YukiSU 自带的 Zygisk 运行环境。YukiSU 自己注入 Zygote、自己加载模块，可以直接使用兼容 Zygisk Next 的模块，不用再装 Magisk 或 Zygisk Next。

## 不开启 YukiZygisk，YukiSU 还能用吗？

当然可以。它只是给 Zygisk 模块准备的加分项，Root、App Profile、普通模块和 MetaModule 都不靠它。

## YukiZygisk 是否保证兼容所有模块？

不保证。API 对上只是第一关，Android 版本、ABI、目标进程和模块自己的写法都可能出问题。管理器看到“已加载”，也只能说明库进去了，不能替模块证明功能正常。

## YukiZygisk 为什么进入安全模式？

连续发生 3 次 Zygote 崩溃后，YukiZygisk 会停止注入，避免设备持续陷入进程崩溃循环。应先禁用最近添加的 Zygisk 模块，导出持久化诊断，再恢复功能。

## App Profile 是 YukiSU 独有的吗？

不是，官方 KernelSU 也提供 App Profile。YukiSU 在自己的内核、用户空间和管理器中维护对应实现。配置 UID、capabilities、SELinux domain 或 namespace 时应按当前 YukiSU 行为验证。

## 更新管理器后是否必须立刻更新 LKM？

不一定。APK、设备里的 `ksud`、LKM 和模块不是同一个东西。先看发布说明到底改了哪一层，别每次更新 APK 都顺手把整套环境一起翻新。

## OTA 后应该怎么处理？

先确认设备是否 A/B、OTA 是否已经完成、当前与未使用槽位分别是什么。管理器提供安装到未使用槽位的入口，但目标仍需用户确认。不要在 OTA 状态不明确时猜槽位，也不要用旧固件镜像修补新槽位。

## YukiSU 能保证通过完整性或 Root 检测吗？

不能。检测结果还受 bootloader、ROM、模块和目标应用策略影响。某个隐藏开关在你手机上有效，不代表它是万能通行证。

## 遇到问题应该先发什么？

别只发一句“不能用”。至少带上设备构建指纹、内核与 KMI、LKM/管理器/`ksud` 版本、分区和槽位、模块列表、最后一次改动，以及**第一条**有效错误。YukiZygisk 问题直接导出管理器诊断。模板见[如何有效提问](/troubleshoot/asking/)。
