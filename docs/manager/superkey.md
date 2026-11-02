---
permalink: /manager/superkey/
title: SuperKey 认证
---

# SuperKey 认证

SuperKey 是可选的**管理器认证密钥**，用于让自签名或私有管理器向内核认证身份。

使用官方管理器时留空，默认通过受信任包名和 APK 签名认证。

::: important 仅用于管理器认证
SuperKey 认证成功后，调用方取得 YukiSU 管理器身份。应用的 Root 授权仍由超级用户列表和 App Profile 控制。
:::

## 与 KernelPatch / APatch 的 SuperKey 不同

两者使用不同的认证入口和权限模型：

| 项目 | YukiSU SuperKey | KernelPatch / APatch SuperKey |
| --- | --- | --- |
| 入口 | `prctl(KSU_PRCTL_SUPERKEY_AUTH, ...)` | syscall **NR45** SuperCall |
| 认证对象 | YukiSU 管理器 | 每次 SuperCall 的调用方 |
| 能力范围 | 验证密钥并登记管理器 UID | 作为通用特权命令面的凭据 |
| 后续操作 | 管理器通过 YukiSU 驱动 / ioctl 继续通信 | NR45 可分派 Root、KPM、配置等多类命令 |
| 是否能直接给应用 Root | 不能 | 取决于对应 SuperCall 命令 |

KernelPatch/APatch 每次调用 NR45 SuperCall 时都会带上 SuperKey，Root、KPM、配置等命令都从这张“总入口”分发。YukiSU 没这么做：第一次通过 `prctl` 验证密钥，登记好管理器 UID，后面的授权、模块和配置继续走 YukiSU 驱动。

所以 APatch 教程里的 `supercall`、KPM 和“SuperKey Root”都不能套到 YukiSU，密钥本身也不能互换。

## 三种信任配置

| SuperKey | APK 签名验证 | 可用认证路径 | 适用场景 |
| --- | --- | --- | --- |
| 留空 | 启用 | 受信任包名与 APK 签名 | 官方构建、首次安装，推荐 |
| 已设置 | 启用 | 签名认证仍可用，另可通过 SuperKey 认证 | 保留官方回退，同时使用自定义管理器 |
| 已设置 | 禁用 | 仅 SuperKey | 私有签名或封闭部署，高风险 |

设置 SuperKey 后仍保留 APK 签名认证；勾选“禁用 APK 签名验证”后才切换为仅 SuperKey。

::: danger 仅 SuperKey 模式必须保管密钥
禁用签名认证后，官方 APK 也需要密钥才能认证。密钥丢失时必须通过外部刷写更换 LKM 或恢复原厂镜像。官方 APK 认证失败时，先检查 APK 来源、包名、签名和 LKM 版本，再决定是否更改认证方式。
:::

## 内核中保存的不是明文

配置时，YukiSU 生成 16 字节随机 salt，保存 `SHA-256(salt || key)` 的前 8 字节和认证模式。认证时用输入密钥重新计算并比较校验值。

LKM 不保存密钥明文，但其中的 salt 和校验值可用于离线猜测。因此应使用长随机密钥，并保管好包含私人 SuperKey 校验数据的 `.ko` 和镜像。

## 密钥如何进入 LKM

在管理器的 LKM 修补/安装页配置 SuperKey。填写后，`ksud` 为本次使用的 LKM 生成随机 salt，并把 salt、校验值和认证模式写进可修补数据块。Ramdisk 与 ImgPatch 两条安装路径都会处理这份数据。

它只影响当前输出或当前安装使用的 LKM，不会追溯修改已经保存的其他镜像或 `.ko`。轮换密钥也必须重新修补并安装。

`CONFIG_KSU_SUPERKEY=y` 只把 SuperKey 实现编入 LKM；当前官方构建脚本会传入它。不要把 `KSU_SUPERKEY="..."` 当作当前源码已经完成的编译时配置入口：现有 `Kbuild` 虽然接收这个宏，但运行时 verifier 实际由 `ksud` 修补流程注入。

所选 LKM 必须包含 SuperKey 可修补数据块。修补失败时保留错误日志，换用支持 SuperKey 的匹配 LKM；安装后完整重启并在首页输入密钥认证。

## 一次认证如何工作

认证流程：

1. 管理器构造包含 SuperKey、Unix 秒级时间戳、结果字段和返回 fd 的认证请求；
2. 管理器调用 `prctl(KSU_PRCTL_SUPERKEY_AUTH, ...)`；
3. YukiSU 的 TSR 路径截获这一专用 `prctl` 请求；
4. 内核校验请求时间、当前认证模式和 SuperKey；
5. 验证成功后，内核把调用方 UID 登记为管理器 UID，并向管理器提供驱动 fd；
6. 后续管理请求通过驱动接口完成，不再把 SuperKey 当成每条 Root 命令的参数。

选 `prctl`，是因为这条入口能在 Android seccomp 环境下工作。管理器取得驱动 fd 后还保留兼容处理，但不管内部怎么走，SuperKey 的公开用途都只有管理器认证，不会变成 NR45 通用 SuperCall。

内核会拒绝：

- 来自未来的时间戳；
- 比当前时间早 30 秒以上的请求；
- 不匹配或被截断的密钥；
- 当前 LKM 未配置 SuperKey 的请求。

请求生成后若等待超过 30 秒，或认证期间系统时钟跳变导致时间戳超出窗口，正确密钥也会被拒绝。管理器身份只保存在当前运行的内核中，重启后需要重新认证。

::: warning 连续失败会触发保护
连续失败 3 次，发起认证的进程会被终止；当前运行内核自启动以来累计失败 10 次，设备会重启。成功只清零连续计数，不清零累计计数。首次失败后先检查密钥与配置，避免连续重试。
:::

## 保存、手动输入与开机认证

管理器提供两项使用设置：

- **不存储 SuperKey**：管理器不保存密钥，每次重启后需要手动输入；
- **开机自动验证 SuperKey**：用户解锁、管理器收到 `BOOT_COMPLETED` 后，用已保存密钥尝试一次认证；需要允许应用自启动，失败不重试。

“不存储”删除管理器保存的密钥并阻止后续保存，LKM 中的 salt 和校验值保持不变。启用后，每次重启需要手动输入密钥。

只要管理器已经保存密钥，打开首页且当前尚未认证时也会尝试使用它。单独开启“开机自动验证”则会在用户解锁后的 `BOOT_COMPLETED` 再启动一次非重试服务；两者都不会在失败后循环猜测。

## 选择与保管

- 使用足够长、随机且每台设备唯一的密钥；
- 限制在 64 个 UTF-8 字节以内；多字节字符更容易在输入端产生截断差异，优先使用可稳定输入的 ASCII；
- 不与锁屏 PIN、账号密码、ADB 密钥口令或磁盘密码复用；
- 避免姓名、设备型号、项目名和可预测短语；
- 使用能在设备键盘上稳定输入的字符；
- 在安全的密码管理器中保存，并标注对应设备和 LKM；
- 不把明文写进公开脚本、shell history、CI 日志或问题报告。

公开构建使用官方签名认证，不应包含私人 SuperKey。私有部署为每台设备设置独立密钥，限制单份镜像泄露的影响范围。

## 更换或撤销 SuperKey

SuperKey 校验数据属于 LKM 的信任配置，不能只在管理器设置里“改密码”完成轮换：

1. 保留与当前固件匹配的原厂镜像和可启动 LKM；
2. 在修补/安装页填入新密钥，重新修补 LKM；
3. 确认是否继续保留 APK 签名认证；
4. 按正常 LKM 安装流程写入明确的目标槽位；
5. 重启并用新密钥认证；
6. 清理旧密钥和包含旧校验数据的制品。

回到纯官方签名认证同样需要安装信任配置符合目标的 LKM，仅卸载重装管理器 APK 不会改变内核中的认证配置。

## 认证失败怎么排查

按这个顺序检查：

1. 管理器首页是否能读取 YukiSU LKM；
2. LKM 是否启用了 SuperKey 并实际配置了密钥；
3. 输入是否含前后空格、全角字符或大小写差异；
4. 认证请求是否因延迟或认证期间时钟跳变超出 30 秒窗口；
5. 管理器是否来自预期构建；
6. 重启后是否因为“不存储 SuperKey”而尚未手动认证；
7. 自动认证是否被系统的自启动限制阻止。

如果签名认证仍启用，可先使用受信任官方管理器进入环境，再安装一份信任配置明确的新 LKM。如果已经进入 SuperKey-only 且密钥丢失，则没有“找回密码”入口，需要用匹配设备、固件和 KMI 的可信 LKM 或原厂镜像重新建立启动链。

## 源码

[superkey.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/manager/superkey.c), [supercall.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/supercall/supercall.c), [ksu.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/cpp/ksu.c).
