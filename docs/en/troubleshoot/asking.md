---
permalink: /en/troubleshoot/asking/
title: How to ask
---

# How to ask effectively

Include the device model, Android version, complete `uname -r`, current slot and patched partition, LKM KMI, manager/full LKM/embedded and installed `ksud` versions, minimal clean-boot reproduction steps, expected versus actual results, and relevant manager/logcat/kernel logs.

For module issues, also include module ID/version, MetaModule and exported YukiZygisk diagnostics.

Before filing:

1. reproduce on the latest stable or clearly identify the CI build
2. disable unrelated modules to minimize variables
3. search [GitHub Issues](https://github.com/Anatdx/YukiSU/issues)
4. remove SuperKeys, personal paths, accounts and other secrets from logs

“It does not work,” a “loaded” label or screenshots alone are not enough for diagnosis.

Support: [GitHub Issues](https://github.com/Anatdx/YukiSU/issues) · [Telegram](https://t.me/manosaba)
