---
permalink: /en/manager/superkey/
title: SuperKey authentication
---

# SuperKey authentication

SuperKey is an optional **manager authentication key** for custom-signed or private managers to authenticate with the kernel.

Leave it empty when using the official manager. The trusted package name and APK signature provide authentication by default.

::: important Manager authentication only
Successful SuperKey authentication gives the caller YukiSU manager identity. Superuser grants and App Profile still control application root access.
:::

## Different from KernelPatch / APatch SuperKey

The name is shared, but the call model and scope are not.

| Area | YukiSU SuperKey | KernelPatch / APatch SuperKey |
| --- | --- | --- |
| Entry | `prctl(KSU_PRCTL_SUPERKEY_AUTH, ...)` | syscall **NR45** SuperCall |
| Authenticates | YukiSU manager identity | Caller of each SuperCall |
| Scope | Verify key and record manager UID | Credential for a general privileged command plane |
| Operations after auth | Manager continues through YukiSU driver/ioctl | NR45 dispatches root, KPM, configuration and other commands |
| Direct application root | No | Depends on the selected SuperCall command |

KernelPatch/APatch carries SuperKey into NR45 to protect a family of SuperCall operations. YukiSU does not copy that interface. Its manager submits the key through a dedicated `prctl` authentication request; the kernel establishes manager identity, then authorization, modules and configuration continue through YukiSU's management interface.

The two keys are not interchangeable. APatch instructions for `supercall`, KPM or “SuperKey root” do not apply to YukiSU.

## Trust configurations

| SuperKey | APK signature verification | Available path | Intended use |
| --- | --- | --- | --- |
| Empty | Enabled | Trusted package and APK signature | Official builds and first install; recommended |
| Set | Enabled | Signature remains available; SuperKey is added | Keep official fallback with a custom manager |
| Set | Disabled | SuperKey only | Closed private deployment; high risk |

Setting SuperKey retains APK signature authentication. Selecting “Disable APK signature verification” switches to SuperKey-only authentication.

::: danger Keep the key for SuperKey-only mode
After disabling signature authentication, even the official APK needs the key. If it is lost, replace the LKM or restore stock images through external flashing. If the official APK cannot authenticate, check its source, package name, signature, and LKM version before changing authentication methods.
:::

## The kernel does not keep plaintext

When configured, YukiSU creates a random 16-byte salt and stores the first eight bytes of `SHA-256(salt || key)` as the verifier, together with the authentication mode. Runtime verification recomputes the value from the submitted key and stored salt.

The final LKM therefore does not need a directly readable plaintext SuperKey, but it still contains material for offline analysis. Short or predictable keys remain guessable, and a private `.ko`, patched image or build artifact must still be treated as sensitive.

## Provisioning the key

Configure SuperKey on the manager's LKM patch/install page. After a key is entered, `ksud` creates a random salt and writes the salt, verifier, and authentication mode into the patchable data block of the LKM used for that operation. Both ramdisk and ImgPatch installation paths handle this data.

Only that output or installation is affected; existing images and `.ko` files are not modified retroactively. Rotation therefore also requires a new patch and installation.

`CONFIG_KSU_SUPERKEY=y` compiles SuperKey support into the LKM, and current official build scripts pass it. Do not treat `KSU_SUPERKEY="..."` as a complete compile-time provisioning path in current source: `Kbuild` accepts the macro, but the runtime verifier is actually injected by the `ksud` patch flow.

The selected LKM must contain the SuperKey patchable block. If patching fails, retain the error log and select a compatible LKM with SuperKey support. After installation, fully reboot and authenticate from Home with the key.

## How authentication works

1. The manager creates a request containing SuperKey, a Unix-seconds timestamp, result field and returned fd.
2. It calls `prctl(KSU_PRCTL_SUPERKEY_AUTH, ...)`.
3. YukiSU's TSR path intercepts this dedicated request.
4. The kernel verifies time, authentication mode and key.
5. On success it records the caller UID as manager UID and supplies the manager driver fd.
6. Subsequent management requests use the driver interface rather than passing SuperKey to every root command.

`prctl` provides a first-authentication path usable under Android seccomp. The current manager retains compatibility handling after it already has a driver fd, but the public model is unchanged: YukiSU SuperKey authenticates the manager and is not an NR45 general SuperCall.

The kernel rejects future timestamps, requests older than 30 seconds, mismatched or truncated keys, and requests when no SuperKey was configured. A delay longer than 30 seconds after request creation, or a clock jump during authentication that moves the timestamp outside that window, rejects even a correct key. Authentication state belongs to the running kernel and must be established again after reboot.

::: warning Failed-attempt protection
Three consecutive failures terminate the authenticating process; ten total failures since the current kernel boot trigger a device reboot. Success resets only the consecutive counter, not the total. Check the key and configuration after the first failure before retrying.
:::

## Storage and boot authentication

- **Do not store SuperKey:** the manager retains no original key and requires manual input after reboot.
- **Authenticate SuperKey at boot:** after user unlock and `BOOT_COMPLETED`, the manager uses a saved key for one authentication attempt. App autostart permission is required; failure is not retried.

“Do not store” deletes the saved key and prevents further storage. The LKM's salt and verifier remain unchanged. Enter the key manually after each reboot when this option is enabled.

Whenever a key is already saved, opening Home while the app is not yet authenticated also makes an attempt with it. Enabling the separate boot option starts one non-retrying service after user unlock and `BOOT_COMPLETED`; neither path loops on failure.

## Choosing and protecting a key

- Use a sufficiently long, random, per-device value.
- Keep it within 64 UTF-8 bytes. Multibyte characters are easier to truncate differently at input boundaries, so prefer reliably entered ASCII.
- Never reuse a lock-screen PIN, account password, ADB key passphrase or disk password.
- Avoid names, device models, project names and predictable phrases.
- Prefer characters that can be entered reliably on the device keyboard.
- Store it in a secure password manager with the corresponding device and LKM noted.
- Never expose plaintext in public scripts, shell history, CI logs or issue reports.

Public release builds should normally rely on official signature authentication without a private SuperKey. Personal and small deployments should separate keys by device or environment so that one leaked artifact does not affect every installation.

## Rotating or removing a key

The verifier is part of the LKM trust configuration; changing an app setting cannot rotate it.

1. Keep stock images and a bootable LKM matching current firmware.
2. Enter the new key on the patch/install page and repatch the LKM.
3. Decide whether APK signature authentication remains enabled.
4. Install through the normal LKM flow to a verified slot.
5. Reboot and authenticate with the new key.
6. Remove the old key and artifacts containing its verifier.

Returning to signature-only trust also requires an LKM with that trust configuration. Reinstalling only the APK is insufficient.

## Troubleshooting

Check in this order:

1. Home can read the YukiSU LKM.
2. The LKM has SuperKey support and a provisioned key.
3. The input has no surrounding spaces, full-width variants, or case differences.
4. Request delays or clock jumps during authentication have not exceeded the 30-second window.
5. The manager comes from the intended build.
6. Manual authentication has been completed after reboot if “Do not store SuperKey” is enabled.
7. App autostart restrictions have not blocked automatic authentication.

If signature authentication remains enabled, use the trusted official manager and install an LKM with a known trust configuration. If signatures were disabled and the key is lost, there is no password-recovery path in the current LKM; restore trust using a compatible LKM or stock image matching the device, firmware and KMI.

## Source references

[superkey.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/manager/superkey.c), [supercall.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/kernel/supercall/supercall.c), [ksu.c](https://github.com/Rouyashiki/YukiSU/blob/9d046af49e2a43120a05a06d7c9dbc76ca824d76/manager/app/src/main/cpp/ksu.c).
