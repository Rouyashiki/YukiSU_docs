---
permalink: /manager/app-profile/
title: App Profile
---

# App Profile

允许 Root 只是回答“能不能提权”。App Profile 接着回答：“提权以后，用什么身份、带哪些能力、看到哪个 namespace？”

不需要细分权限时，用默认配置就好。这里不是开关越多越安全，填错 UID 或 SELinux domain 反而能让应用当场罢工。

## Root Profile

给应用允许 `su` 后，可以继续调整：

- UID 和 GID；
- 最多 32 个附加组；
- effective、permitted、inheritable capabilities；
- SELinux domain；
- namespace 选项；
- `FLAG_KSU_NO_NEW_PRIVS`。

完整结构在 [`uapi/app_profile.h`](https://github.com/Anatdx/YukiSU/blob/main/uapi/app_profile.h)。当前 UAPI 还带有 `groups_count`、profile 版本和模板字段，别从旧教程里复制一段残缺结构直接写进去。

## Non-root Profile

没拿 Root 的应用，也可以单独设置是否卸载模块挂载。它能减少应用 namespace 中看到的改动，但不等于“一键隐藏 Root”，更不保证绕过检测。

## 修改后为什么没变化

Profile 通常在进程启动或提权时应用。改完后彻底结束目标应用再打开；已经运行的进程不会因为你拨了一下开关就自动重建 UID、capabilities 和 namespace。

真要自定义，建议一次只改一项。应用出问题时，先退回默认 Profile，再判断到底是哪条限制惹的祸。
