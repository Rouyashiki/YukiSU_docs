---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: 基于 KernelSU 的 Root 实现
      tagline: v1.9.0 已更换管理器包名和签名。正在用旧版？先看升级指南。
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: 快速开始 →
          link: /guide/get-started/
        - theme: alt
          text: 从旧版升级 →
          link: /guide/update/
  - type: features
    features:
      - title: 应用授权
        icon: 🛡️
        details: 决定哪些应用可以使用 Root，也可以为每个应用单独设置权限。
        link: /guide/intro/
      - title: 与 KernelSU 的区别
        icon: 🧭
        details: 已经用过 KernelSU？看看两者支持哪些内核，以及安装模块时有什么不同。
        link: /guide/yukisu-vs-kernelsu/
      - title: 功能概览
        icon: ⚙️
        details: 从 Root 授权到镜像修补，查一项功能由哪个组件负责、在管理器哪里设置。
        link: /guide/features/
      - title: 模块挂载
        icon: 🧩
        details: Kagami 可以直接挂载模块文件。已经装了 MetaModule 的话，也可以继续交给它。
        link: /modules/meta-module/
      - title: 管理器认证
        icon: 🔐
        details: 官方管理器用签名认证。自己签名的管理器可以用 SuperKey。
        link: /manager/superkey/
      - title: 管理器
        icon: 🛠️
        details: 在手机上查看 Root 状态、安装模块、备份分区或修补启动镜像。
        link: /manager/overview/
      - title: YukiZygisk
        icon: 🧬
        details: 需要 Zygisk 模块时再开启，在状态页查看哪些模块成功加载、哪些出了错。
        link: /yukizygisk/intro/
      - title: 越狱模式
        icon: 🚀
        details: 符合条件的设备可以在本次开机临时加载 LKM。完整重启后，这次加载的 Root 就会消失。
        link: /guide/jailbreak-mode/
---
