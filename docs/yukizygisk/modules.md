---
permalink: /yukizygisk/modules/
title: Zygisk 模块兼容性
---

# Zygisk 模块兼容性

兼容 Zygisk Next 的模块，通常按普通模块安装就行，重启后由 YukiZygisk 加载。

## 使用前确认

- 模块作者是否声明支持 Zygisk Next
- 模块是否支持当前 Android 版本
- 模块是否包含应用进程需要的 64 位或 32 位库
- 是否与其他注入框架或同类模块冲突

YukiZygisk 提供标准 [`zygisk.hpp`](https://github.com/Anatdx/YukiSU/blob/main/userspace/zygisk/include/zygisk.hpp)。不过 API 能编译通过，不代表模块能无视 Android 版本和目标进程差异。

## 安装后检查

启用 YukiZygisk 并重启后，可以在管理器中确认：

1. 内核注入处于启用状态。
2. 对应的 64 位或 32 位 Zygote 已被识别。
3. 已加载模块数量符合预期。

显示“已加载”只说明库被装进进程了。模块到底有没有把事情做成，还得看它自己的功能。

## 出现问题时

先只留一个待测模块，确认 Android、目标应用和模块版本都在作者支持范围内。还是没效果，就导出 YukiZygisk 诊断，并附上模块 ID、版本、目标应用和复现步骤。别拿十几个注入模块同时启用的环境让维护者猜冲突。
