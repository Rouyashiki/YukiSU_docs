---
permalink: /en/yukizygisk/modules/
title: Zygisk module compatibility
---

# Zygisk module compatibility

YukiZygisk is designed for modules compatible with Zygisk Next. They can usually be installed as ordinary modules and loaded directly by YukiZygisk.

## Before installing

- Check whether the author declares Zygisk Next support.
- Check support for the current Android version.
- Make sure the module includes the required 64-bit or 32-bit libraries.
- Check for conflicts with other injection frameworks or modules.

YukiZygisk ships a standard [`zygisk.hpp`](https://github.com/Anatdx/YukiSU/blob/main/userspace/zygisk/include/zygisk.hpp), but standard API compatibility cannot guarantee that every module works across every Android release.

## After installing

After enabling YukiZygisk and rebooting, use the manager to confirm that kernel injection is active, the relevant 64-bit or 32-bit Zygote is detected, and the module count is as expected.

A loaded module count confirms that loading was attempted. The module's actual feature is still the final compatibility test.

## Troubleshooting

Keep only one test module enabled and reboot. Verify that the module version, Android release and target app are supported by the author. If it still has no effect, export YukiZygisk diagnostics and include the module ID, version, target app and reproduction steps in the report.
