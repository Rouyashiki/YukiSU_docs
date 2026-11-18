---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: Root based on KernelSU
      tagline: The Manager has a new package name and signing certificate in v1.9.0. Follow the upgrade guide if you already use YukiSU.
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: Get started →
          link: /en/guide/get-started/
        - theme: alt
          text: Upgrade from an older version →
          link: /en/guide/update/
  - type: features
    features:
      - title: App permissions
        icon: 🛡️
        details: Choose which apps can use root and set permissions for each one.
        link: /en/guide/intro/
      - title: YukiSU and KernelSU
        icon: 🧭
        details: Compare supported kernels, installation options, and how each project mounts module files.
        link: /en/guide/yukisu-vs-kernelsu/
      - title: Feature guide
        icon: ⚙️
        details: Find the Manager screen and component responsible for a feature, from root grants to image patching.
        link: /en/guide/features/
      - title: Module mounting
        icon: 🧩
        details: Use the built-in Kagami backend to mount module files, or keep using an external MetaModule.
        link: /en/modules/meta-module/
      - title: Manager authentication
        icon: 🔐
        details: The kernel recognizes the official Manager by its signing certificate. Custom builds can use SuperKey.
        link: /en/manager/superkey/
      - title: Manager
        icon: 🛠️
        details: Check root status, install modules, back up partitions, or patch a boot image from your phone.
        link: /en/manager/overview/
      - title: YukiZygisk
        icon: 🧬
        details: Enable YukiZygisk when a module needs it. The status page shows which loads succeeded and which failed.
        link: /en/yukizygisk/intro/
      - title: Jailbreak mode
        icon: 🚀
        details: On supported setups, try a matching LKM for the current boot. A full reboot ends the temporary root session.
        link: /en/guide/jailbreak-mode/
---
