---
permalink: /troubleshoot/asking/
title: 如何有效提问
---

# 如何有效提问

“不能用”“已加载但没效果”“求适配”都没法定位问题。想让别人少猜一点，请把下面这些一次给全：

- 设备型号、Android 版本、完整 `uname -r`；
- 当前槽位、修改的分区、LKM KMI；
- 管理器、LKM、内置/已安装 `ksud` 的完整版本；
- 从正常启动开始，最短的复现步骤；
- 你以为会发生什么，实际发生了什么；
- 管理器日志，以及相关 logcat / kernel 日志；
- 涉及模块时，再带模块 ID、版本、MetaModule 和 YukiZygisk 诊断。

## 发出去之前

1. 用最新正式版或明确注明的 CI 版再试一次；
2. 暂停无关模块，把变量缩到最少；
3. 搜一下 [GitHub Issues](https://github.com/Anatdx/YukiSU/issues)；
4. 从日志里删掉 SuperKey、账号、个人路径和其他隐私信息。

截图适合说明界面长什么样，文本日志才适合搜索和定位。最有价值的通常不是最后一百行重复报错，而是**第一条**真正失败的地方。

反馈渠道：[GitHub Issues](https://github.com/Anatdx/YukiSU/issues) · [Telegram](https://t.me/manosaba)
