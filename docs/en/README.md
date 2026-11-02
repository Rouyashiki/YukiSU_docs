---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: A modern root experience for Android 12+ ARM64 GKI devices
      tagline: v1.8.0 · Built-in mounting, YukiZygisk, and management tools
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: Get started →
          link: /en/guide/get-started/
        - theme: alt
          text: View on GitHub →
          link: https://github.com/Rouyashiki/YukiSU
  - type: features
    features:
      - title: Kernel-level root
        icon: 🛡️
        details: Root decisions stay in the kernel. You decide which apps get access and how much they receive.
        link: /en/guide/intro/
      - title: A focused technical path
        icon: 🧭
        details: Android 12+, ARM64 GKI 2.0 and LKM only, with eight current build targets spanning kernel 5.10 through 6.18.
        link: /en/guide/yukisu-vs-kernelsu/
      - title: Modern C++ userspace
        icon: ⚙️
        details: C++ ksud (including su) and ksuinit maintain installation, module handling, and diagnostics.
        link: /en/guide/features/
      - title: Flexible module mounting
        icon: 🧩
        details: Built-in Kagami handles mounts, external MetaModules can take precedence, and Kasumi provides kernel views.
        link: /en/modules/meta-module/
      - title: Secure authentication
        icon: 🔐
        details: Official builds use signature trust. Private deployments may use SuperKey, which authenticates the manager—not app root.
        link: /en/manager/superkey/
      - title: Complete management
        icon: 🛠️
        details: A unified Material 3 Expressive interface for grants, boot configuration, modules, AVB, and Ramdisk editing.
        link: /en/manager/overview/
      - title: YukiZygisk included
        icon: 🧬
        details: Ordinary Zygisk modules and native ZN targets load and report separately; core root stays independent when it is off.
        link: /en/yukizygisk/intro/
      - title: Jailbreak mode
        icon: 🚀
        details: Try a matching LKM without changing the boot image. Root lasts for the current boot and is gone after reboot.
        link: /en/guide/jailbreak-mode/
---
