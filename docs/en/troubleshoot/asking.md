---
permalink: /en/troubleshoot/asking/
title: How to ask
---

# How to ask effectively

Include the device model, Android version, build fingerprint, complete `uname -r`, current slot, actual patched partition, target KMI, and the firmware source of the image. Record full manager/LKM versions, both manager-bundled and device-installed `ksud` versions, and the Hook type and working mode shown on Home (Ramdisk, ImgPatch, or Jailbreak/late-load). If an integrity mismatch makes the installed version read “Unknown,” record that exact state instead.

Give the shortest reproduction from a clean boot, expected and actual results, the last known-good state, and the single change made before failure. Save or share the manager bugreport and attach the complete installation output when relevant. For module issues, include the module ID/version, MetaModule state, YukiZygisk status, target process, module type, and ABI.

Add issue-specific evidence:

| Problem | Also include |
| --- | --- |
| ImgPatch, image patch, or restore | Input provenance, target partition/slot, full patch output, and whether an original-image backup exists |
| Install to inactive slot after OTA | Whether OTA completed, slot before/after the operation, target image, and target KMI |
| Feature switch failed to save | Feature name, before/after state, and whether the manager reported rollback or requested a reboot |
| `ksud` replacement warning | Bundled version, installed-side “Unknown/mismatch” state, warning time, and any root manager or sync action run beforehand |
| YukiZygisk/native module | Module type and ABI, target name/path, and whether status says not observed or injection failed |

Before filing:

1. reproduce on the latest stable or identify the exact CI commit
2. disable unrelated modules to minimize variables
3. search [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues)
4. remove SuperKeys, personal paths, accounts, package lists, and unrelated private data

“It does not work,” a “loaded” label, or screenshots alone are not enough for diagnosis. A manager bugreport can include properties, processes, packages, mounts, kernel data, and YukiZygisk diagnostics; review it before sharing.

Support: [GitHub Issues](https://github.com/Rouyashiki/YukiSU/issues) · [Telegram](https://t.me/manosaba)
