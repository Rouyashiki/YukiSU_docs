---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: A modern root experience for GKI devices
      tagline: Keep the upstream ecosystem. Add the good stuff.
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: Get started →
          link: /en/guide/get-started/
        - theme: alt
          text: Compare with KernelSU →
          link: /en/guide/yukisu-vs-kernelsu/
        - theme: alt
          text: View on GitHub →
          link: https://github.com/Anatdx/YukiSU
  - type: features
    features:
      - title: Kernel-level root
        icon: 🛡️
        details: Root decisions stay in the kernel. You decide which apps get access and how much they receive.
        link: /en/guide/intro/
      - title: A focused technical path
        icon: 🧭
        details: ARM64 GKI 2.0 and LKM only. A smaller scope, with every layer designed to fit together.
        link: /en/guide/yukisu-vs-kernelsu/
      - title: Modern C++ userspace
        icon: ⚙️
        details: ksud, ksuinit and su are rebuilt in C++, not borrowed upstream binaries behind a different UI.
        link: /en/guide/features/
      - title: Flexible module mounting
        icon: 🧩
        details: Fully follows the official KernelSU MetaModule contract. Keep existing modules and choose the backend you want.
        link: /en/modules/meta-module/
      - title: Secure authentication
        icon: 🔐
        details: Official builds use signature trust. Private deployments may use SuperKey, which authenticates the manager—not app root.
        link: /en/manager/superkey/
      - title: Complete management
        icon: 🛠️
        details: App grants, modules, LKM installation, partition backups and Ramdisk tools all live in one manager.
        link: /en/manager/overview/
      - title: YukiZygisk included
        icon: 🧬
        details: Run compatible modules without Magisk or Zygisk Next. Leave it off when you do not need Zygisk.
        link: /en/yukizygisk/intro/
      - title: Jailbreak mode
        icon: 🚀
        details: Try a matching LKM without changing the boot image. Root lasts for the current boot and is gone after reboot.
        link: /en/guide/jailbreak-mode/
---
