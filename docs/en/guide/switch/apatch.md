---
permalink: /en/guide/switch/apatch/
title: Switch from APatch
---

# Switch from APatch

APatch follows the KernelPatch path, while YukiSU uses a KernelSU-derived LKM. They cannot be replaced in place.

1. Back up APatch settings, module list and exact stock boot images
2. Disable APatch/KPM modules and verify the device still boots
3. Uninstall using APatch's own flow or restore the correct modified boot partition
4. After a clean boot, follow [Get started](/en/guide/get-started/)

APatch/KernelPatch uses SuperKey with the NR45 SuperCall command plane for root, KPM, configuration and other privileged requests. YukiSU submits it through `prctl` only to authenticate the manager UID. The keys, kernel patches and managers are not interchangeable, and KPM modules cannot be loaded as YukiSU modules.
