---
permalink: /en/manager/boot-config/
title: Boot configuration
---

# Boot configuration

After selecting an installation method, expand “Advanced options” to configure boot behavior. These values belong to **the image produced or installed by that operation**; they do not immediately change the running kernel. Check the result after writing the correct partition and slot and fully rebooting.

## Forced features

Each entry offers “Not locked,” “Force on,” and “Force off”:

| Feature | Parameter | ID |
| --- | --- | --- |
| Traditional su compatibility | `su_compat` | 0 |
| Kernel Umount | `kernel_umount` | 1 |
| Superuser logging | `sulog` | 2 |
| ADB Root | `adb_root` | 3 |
| SELinux hide | `selinux_hide` | 4 |
| Shell elevation from trusted sessions only | `shell_su_adb_only` | 6 |

Boot forcing supports the six entries above. Values are the kernel's literal `0/1`: for example, `kernel_umount=0` disables unmounting. Do not interpret it using the inverted runtime label “Disable kernel umount.”

Forced values remain locked for the current boot; Feature controls display that state and reject edits. Choosing “Not locked” changes the next image's configuration, so repatching and rebooting are required to release the existing lock. Repeated runtime saves cannot override it.

## Disabling early module behavior

- **Disable module preinit:** skips module actions before SELinux policy loading.
- **Disable module init.rc:** skips custom `init.rc` files supplied by modules.

These are independent controls, not module deletion or a global module-disable switch. To address a diagnosed early-boot failure, turn on the corresponding “Disable” option to block that stage's module actions. These switches do not directly control ordinary `post-fs-data.sh`, `service.sh`, or module mounting.

The Modules menu also provides a “Module preinit” status dialog showing kernel support, boot count, protection state, and module entries. Cards use `unsupported` for missing kernel support, `no_space` for insufficient storage, `error` for synchronization failure, and `bootloop` for triggered protection. If reading fails, save the command error, restore `ksud` communication, and refresh.

Fix or disable the offending module before resetting the boot count. Resetting permits another attempt on the next eligible boot; it neither runs preinit immediately nor overrides an image configuration that disables preinit.

## Blocking kernel modules at boot

“Block kernel modules” is off by default. The manager may prefill names from currently loaded candidates, but **prefilling does not enable blocking**. The list is passed to the patch operation only after explicit opt-in.

These modules are kernel `.ko` files, not KernelSU ZIP packages. Names feed the kernel's native `module_blacklist` mechanism to prevent subsequent loads. This does not unload existing modules or disable functionality compiled into the kernel. Blocking required storage, display, or networking drivers can prevent boot or break hardware.

Do not treat the prefilled list as a recommended block list. Keep only entries you have identified as necessary and retain a recoverable original image.

## Update ramdisk configuration only

This option is available only for “Select a file to patch” and is mutually exclusive with ImgPatch kernel embedding. It invokes `boot-patch --no-install`:

- preserves the image's existing init, LKM, and SuperKey without installing or replacing init/LKM; an existing boot chain can still load its original LKM;
- skips automatic KMI selection for the configuration patch; new options still require corresponding parameter support in the existing LKM;
- rewrites known boot settings from this operation's choices: shell access, module rc, preinit, forced features, and the kernel-module block list;
- preserves existing UTS parameters when no new template is supplied; supplying one requires the existing Ramdisk LKM to support it;
- does not update boot configuration stored in an ImgPatch capsule.

::: warning Known settings are replaced, not merged as a single toggle
The page does not automatically import every old image setting. Review all settings you intend to retain, or an existing shell grant, forced value, or block list may be cleared. This mode also does not install root into an image without a YukiSU boot chain.
:::

The result is still an output image file; selecting this option does not automatically flash it. After installation, check live Feature values, locks, preinit state, and boot logs.

## Relationship to other installation options

“Always grant shell root” is an authorization policy, “Force enable ADB” changes debug access, `adb_root` selects the daemon identity, and `shell_su_adb_only` restricts shell sessions. They are not interchangeable. SuperKey and early UTS also have separate configuration; see [LKM patching and installation](/en/manager/install/), [SuperKey](/en/manager/superkey/), and [UTS View](/en/manager/uts-view/).

The Ramdisk path stores module parameters in ramdisk configuration; ImgPatch uses capsule module parameters and corresponding embedded configuration. For older or third-party LKMs, first check that they accept the selected parameters. After boot, inspect values and locks in Feature controls and retain kernel logs for failures.

## Source references

[installation page](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/Install.kt), [boot options](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/util/BootConfigOptions.kt), [Ramdisk patcher](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/userspace/ksud/src/boot/boot_patch.cpp), and [preinit status dialog](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/java/com/anatdx/yukisu/ui/screen/ModulePreinitDialog.kt).
