---
permalink: /en/yukizygisk/features/
title: YukiZygisk features
---

# YukiZygisk features

## Zygisk Next module compatibility

YukiZygisk can load modules compatible with Zygisk Next when they include the ABI libraries required by the device, without another Zygisk implementation running alongside it.

## 64-bit and 32-bit apps

YukiZygisk includes `arm64-v8a` and `armeabi-v7a` runtime components. This allows it to cover both 64-bit and 32-bit app processes on an ARM64 device. Modules must still include libraries for the relevant ABI.

## Safe mode

YukiZygisk monitors consecutive Zygote crashes. After three consecutive crashes, it enters safe mode and stops further injection to avoid repeatedly returning the device to a broken startup state.

## Native injection

In addition to regular modules loaded through Zygote, YukiZygisk supports Native injection into selected native processes. This is a separate advanced path used only by modules that explicitly support it.

## Visible runtime status

The manager can show:

- Whether kernel injection is active or safe mode has been entered
- Detected 64-bit and 32-bit Zygotes
- The current module count
- Native modules and their target processes
- Diagnostics for the current boot and retained earlier state

These views help separate injection failures from module-loading or module-specific problems. Diagnostics can be exported directly from the manager when reporting an issue.
