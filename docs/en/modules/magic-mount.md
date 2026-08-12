---
permalink: /en/modules/magic-mount/
title: Module mounting
---

# Module mounting

YukiSU does **not** include a fixed Magic Mount backend. During boot, `ksud` invokes the external MetaModule's `metamount.sh`, which decides how to process `/data/adb/modules/`.

YukiSU itself therefore does not guarantee bind mounts, OverlayFS, universal Magisk module compatibility, or mounting a module's `system/` tree without a MetaModule.

When the manager says a MetaModule is required, the module contains files that need a mount backend but none is available. Select a MetaModule compatible with the device and module, then follow its own installation guide.

Normal lifecycle scripts such as `post-fs-data.sh` and `service.sh` are separate from the mount implementation.
