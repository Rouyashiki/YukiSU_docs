---
permalink: /guide/switch/magisk/
title: 从 Magisk 切换
---

# 从 Magisk 切换

Magisk 和 YukiSU 动的启动链不一样，不能像更新同一款软件那样原地切过去。

## 建议流程

1. 备份数据、模块列表和与当前固件匹配的原厂启动镜像
2. 在 Magisk 中停用模块，确认设备能正常启动
3. 使用 Magisk 自身的卸载/恢复流程，或按设备文档恢复它修改过的启动分区
4. 确认已恢复到可启动状态后，再按[快速开始](/guide/get-started/)安装 YukiSU

网上那句 `fastboot flash boot` 不一定属于你的设备。分区和槽位没看清前，别抄。

## 模块

Magisk 模块看起来也有 `module.prop`、`service.sh` 和 `system/`，但安装器、工具和挂载方式可能依赖 Magisk。作者写明兼容再直接用；没写的话，别把整个模块目录搬过去就重启。
