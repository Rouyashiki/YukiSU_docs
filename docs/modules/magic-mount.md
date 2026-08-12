---
permalink: /modules/magic-mount/
title: 模块挂载
---

# 模块挂载

YukiSU 自己**不内置一套固定的 Magic Mount**。启动时，`ksud` 会调用 MetaModule 的 `metamount.sh`，至于用 bind mount、OverlayFS 还是别的办法，由那个 MetaModule 决定。

所以，下面这些话 YukiSU 都不能替后端保证：

- “肯定是 bind mount”；
- “肯定支持 OverlayFS”；
- “所有 Magisk 模块装上就能挂载”；
- “没装 MetaModule，模块里的 `system/` 也会生效”。

管理器提示“需要元模块”，翻译成人话就是：这个模块有文件要挂进系统，但你还没有挂载后端。先装一个适合设备的 MetaModule，再按它自己的说明配置。

注意，挂载只管模块文件怎么出现在系统路径。`post-fs-data.sh`、`service.sh` 等脚本仍然由 YukiSU 运行。脚本执行了而文件没出现时，先查 MetaModule；不要把两件事混成一个故障。
