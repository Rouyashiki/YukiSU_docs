---
permalink: /en/yukizygisk/intro/
title: YukiZygisk
---

# YukiZygisk

YukiZygisk lets YukiSU use Zygisk modules directly. Enable it in the manager and reboot; modules compatible with Zygisk Next can then work without installing Magisk or Zygisk Next.

::: warning Experimental feature
YukiZygisk is still experimental. Compatibility also depends on the Android version, the module itself and the target app.
:::

## Relationship with Zygisk Next

YukiZygisk does not bundle or run Zygisk Next itself. YukiSU handles Zygote injection and module loading through its own implementation, using modules compatible with Zygisk Next directly.

`zygiskd` is YukiZygisk's own userspace service. It is not Magisk's Zygisk daemon.

## Enabling YukiZygisk

1. Make sure the installed LKM includes YukiZygisk support.
2. Enable YukiZygisk in the manager.
3. Reboot the device to apply the change.

Custom LKM builds require `CONFIG_KSU_YUKIZYGISK=y`. The manager shows injection state, detected Zygotes, module count and diagnostics.

## How it works

1. The kernel enters the injection path when Zygote starts.
2. `zygiskd` discovers enabled modules and prepares their files and runtime configuration.
3. The runtime injected into Zygote loads the modules and invokes standard Zygisk callbacks as app processes are created.

YukiSU itself supports ARM64 devices only. YukiZygisk includes both 64-bit and 32-bit runtime components so it can also cover 32-bit app processes on an ARM64 device.

Continue with [features and runtime status](/en/yukizygisk/features/) or [module compatibility](/en/yukizygisk/modules/).
