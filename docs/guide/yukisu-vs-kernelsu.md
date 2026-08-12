---
permalink: /guide/yukisu-vs-kernelsu/
title: YukiSU 与 KernelSU 的区别
---

# YukiSU 与 KernelSU 的区别

先说最容易被说错的结论：YukiSU 不是官方 KernelSU 换了个管理器，也不是把上游推倒重来。

它继续使用 KernelSU 的授权、App Profile、模块、MetaModule 和 LKM Hook 约定，同时把用户空间重写成 C++，做了自己的管理器，再加上 YukiZygisk、SuperKey 和 100 系列 Feature。**该兼容的地方不乱改，想继续做的地方自己做。**

::: info 对比口径
这里的“KernelSU”指 [tiann/KernelSU](https://github.com/tiann/KernelSU) 官方主线当前实现，不包括 KernelSU-Next、SukiSU-Ultra、APatch 或其他分支。
:::

## 先看结论

设备是 **ARM64、GKI 2.0、Linux 5.10 及以上**，也准备使用 LKM？那两边都能进入候选。想要 C++ 用户空间、YukiSU 管理器、内置 YukiZygisk、SuperKey 或 100 系列 Feature，可以选 YukiSU。

需要 built-in/GKI 内核替换、x86_64，或者就想稳稳跟着官方主线走，选官方 KernelSU 更直接。

## 核心差异一览

| 对比项 | YukiSU | 官方 KernelSU | 是否构成差异 |
| --- | --- | --- | --- |
| 项目定位 | 在 KernelSU 生态基础上独立维护的完整 Root 方案 | KernelSU 官方主线 | 是 |
| 官方支持范围 | ARM64、GKI 2.0、Linux 5.10+ | 支持范围更广，并维护更多集成方式 | 是 |
| 内核部署 | 仅 LKM，`CONFIG_KSU=m` | 支持 LKM，也支持 built-in/GKI 等官方方式 | 是 |
| 用户空间 | `ksud`、`ksuinit`、`su` 以 C++ 实现 | 当前官方主线以 Rust 为主 | 是 |
| 内核 Hook | 与官方 KernelSU LKM 一致；文档和界面中简称 **TSR** | Tracepoint syscall redirect | **一致** |
| App Profile | 遵循上游能力 | 支持 | 一致 |
| Feature 0–4 | 保持 `sucompat`、内核卸载、sulog、ADB root、SELinux hide 兼容 | 上游 Feature | **一致** |
| MetaModule | 完全遵守上游接口、生命周期与单后端约定 | 官方 MetaModule 约定 | **一致** |
| Zygisk | 内置可选的 YukiZygisk | 不内置，通常另装 Zygisk Next | 是 |
| 管理器认证 | 官方签名认证；可选仅用于管理器身份验证的 SuperKey；支持动态管理器 | 官方管理器认证 | 是 |
| YukiSU Feature | 100–103：增强安全、Magisk 兼容授权提示、默认 `no_new_privs`、YukiZygisk | 无这一组 YukiSU 编号 | 是 |
| 其他扩展 | UTS View、分区与 Ramdisk 工具等 | 以官方当前实现为准 | 是 |
| 越狱模式 | 跟随上游 late-load 语义，用户空间流程由 C++ 实现 | 支持 late-load | 语义一致，实现语言不同 |

别把表里所有“YukiSU 有”的东西都当成 YukiSU 发明的。TSR、ADB root、sulog、SELinux hide 和 MetaModule 都是上游能力。真正的区别是 C++ 用户空间、管理器、YukiZygisk、认证扩展与 100 系列 Feature。

## 1. YukiSU 只做 LKM，但不只是一枚 LKM

YukiSU 只以 `kernelsu.ko` 进入内核，不提供 built-in `CONFIG_KSU=y`。但管理器、C++ 用户空间、授权、模块、MetaModule 和 YukiZygisk 一个都没少。“LKM-only”说的是安装方式，不是精简版。

只盯一条路线，安装、更新和诊断都能做得更集中。代价也很明确：设备必须是 ARM64 GKI 2.0、Linux 5.10+，KMI 和内核配置还得匹配。

官方 KernelSU 覆盖得更广。需要 built-in、x86_64 或其他集成方式时，不用纠结，YukiSU 本来就不在候选里。

## 2. TSR 与上游 LKM Hook 一致

**TSR 只是 Tracepoint Syscall Redirect 的缩写。** 文档和管理器嫌全名太长，所以这么写；它不是 YukiSU 新造的一套 Hook。

这一项和官方 KernelSU LKM 完全一致。该检查的 Kprobes、Kretprobes、tracepoints、KMI 和符号照样要检查，但别把 TSR 算进“YukiSU 独占功能”。

## 3. C++ 用户空间是核心工程差异

YukiSU 的 `ksud`、`ksuinit` 与 `su` 使用 C++ 实现，覆盖安装、模块生命周期、授权、Feature 配置、late-load 和管理器后端等工作。官方 KernelSU 当前相应用户空间以 Rust 为主。

先别急着把语言选择脑补成跑分。对用户真正有影响的是：

- 用户空间和管理器可以一起改，不必等另一套实现配合；
- 同名命令、日志和发布时间不一定和官方 KernelSU 一模一样；
- 管理器、LKM 与设备中安装的 `ksud` 应使用互相匹配的 YukiSU 版本；
- 模块应依赖公开生命周期与接口，而不是某一项目未承诺的内部细节。

## 4. 上游 Feature 与 YukiSU 扩展要分开看

YukiSU 保持上游 Feature ID `0–4` 的兼容：

| ID | 能力 | 归属 |
| --- | --- | --- |
| 0 | `sucompat` | 上游兼容 |
| 1 | 内核模块卸载 | 上游兼容 |
| 2 | sulog | 上游兼容 |
| 3 | ADB root | 上游兼容 |
| 4 | SELinux hide | 上游兼容 |

YukiSU 自己增加的 Feature 从 `100` 开始：

| ID | 能力 | 用途 |
| --- | --- | --- |
| 100 | Enhanced Security | 收紧非 YukiSU 路径的提权和未经授权的 UID 降级 |
| 101 | Magisk Compatibility | 为未预先授权的应用提供兼容 Magisk 使用习惯的授权提示 |
| 102 | Default `no_new_privs` | 为默认 Root Profile 增加防止权限再扩张的约束 |
| 103 | YukiZygisk | 控制内置 YukiZygisk 能力 |

详细开关、边界和适用场景见[功能概览](/guide/features/)。

## 5. MetaModule 完全遵循上游

MetaModule 这块没有“差不多”，就是按上游来：接口一样、脚本一样、顺序一样，也同样只允许一个活动后端。从 KernelSU 切换过来，不用把正常工作的 MetaModule 重装一遍。

当然，某个后端自己不支持你的 Android 版本，或者某个模块只认特定挂载实现，那还是它自己的兼容问题，不能算成 YukiSU 和 KernelSU 的 MetaModule 协议不同。

## 6. YukiZygisk 是可选加分项

官方 KernelSU 不内置 Zygisk，常见方案是额外安装 Zygisk Next。YukiSU 内置 YukiZygisk，目标是直接运行使用标准 Zygisk API、并兼容 Zygisk Next 的模块，无需另外安装 Magisk 或 Zygisk Next。

它有内核侧支持，也有自己的用户空间运行时，负责注入 Zygote、找模块和加载模块。要用就开，不用就关；Root、授权、普通模块和 MetaModule 都不靠它活着。

实际兼容性仍取决于 Android 版本、ABI、目标进程和模块实现。详见 [YukiZygisk](/yukizygisk/intro/)。

## 7. SuperKey 只认证管理器

官方管理器默认还是靠包名和 APK 签名认证。SuperKey 是给自定义签名、私有管理器准备的，而且只做一件事：**告诉内核谁是管理器。**

它通过 `prctl` 认证入口提交密钥与时间戳，验证成功后登记管理器 UID，并把后续管理请求交给 YukiSU 驱动接口。它不是 KernelPatch/APatch 的 NR45 SuperCall，也不能拿来直接执行 Root、KPM 或其他通用特权命令。

用官方管理器的话，留空就行。完整原理见 [SuperKey 认证](/manager/superkey/)。

## 8. 越狱模式跟随上游 late-load

“越狱模式”其实就是管理器里的 late-load 入口：Android 都启动完了，再加载匹配 KMI 的 LKM，让 YukiSU 在当前这次开机里跑起来。行为跟上游走，用户空间换成了 C++。

它不会修改启动镜像，重启后自然也就没了。因为错过了 PID 1 的早期阶段，模块要用 `late-load.sh`，不能指望 `post-fs-data.sh` 被补跑。详见[越狱模式](/guide/jailbreak-mode/)。

## 9. 从 KernelSU 切换非常直接

迁移没那么玄学，不用先把模块全删掉再举行一套净化仪式：

- **当前为 built-in KernelSU：** 安装 YukiSU 管理器并由 KernelSU 授予它 Root；恢复当前固件的原厂 boot 后先不要重启，直接在仍有 KernelSU Root 的当前会话里安装 YukiSU，然后重启。
- **当前为 KernelSU LKM：** 不需要还原镜像。安装 YukiSU 管理器、授予 Root，直接安装 YukiSU 即可。

原来的 MetaModule、普通模块和配置都可以保留。YukiSU 启动正常后，把旧 KernelSU 管理器卸掉就行。详见[从 KernelSU 切换](/guide/switch/kernelsu/)。

## 应该选哪一个

选择 YukiSU，如果你：

- 使用受支持的 ARM64 GKI 2.0 设备，并准备走 LKM；
- 喜欢 YukiSU 的 C++ 用户空间与管理器体验；
- 需要内置 YukiZygisk、SuperKey、动态管理器或 100 系列 Feature；
- 希望在保持 KernelSU 模块生态兼容的同时使用这些扩展。

选择官方 KernelSU，如果你：

- 希望紧跟 KernelSU 官方主线；
- 需要 built-in/GKI、x86_64 或 YukiSU 当前范围外的支持；
- 更倾向官方 Rust 用户空间与外部 Zygisk Next；
- 不需要 YukiSU 提供的额外能力。

最后还是看设备能不能装、出事能不能救，以及这些额外功能你到底用不用。功能表打勾最多的那个，不一定最适合你的手机。

## 参考资料

- [YukiSU 中文 README](https://github.com/Anatdx/YukiSU/blob/main/docs/zh/README.md)
- [官方 KernelSU 项目](https://github.com/tiann/KernelSU)
- [官方 KernelSU 安装文档](https://kernelsu.org/guide/installation.html)
- [官方 KernelSU MetaModule 文档](https://kernelsu.org/guide/metamodule.html)
