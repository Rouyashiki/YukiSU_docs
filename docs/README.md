---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: 为 Android 12+ ARM64 GKI 设备打造的现代 Root 方案
      tagline: v1.8.0 · 内置模块挂载、YukiZygisk 与完整管理工具
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: 快速开始 →
          link: /guide/get-started/
        - theme: alt
          text: 在 GitHub 上查看 →
          link: https://github.com/Rouyashiki/YukiSU
  - type: features
    features:
      - title: 内核级 Root 能力
        icon: 🛡️
        details: Root 权限在内核侧处理，应用拿不拿得到、拿到多少，都由你决定。
        link: /guide/intro/
      - title: 清晰的技术路线
        icon: 🧭
        details: 只做 Android 12+、ARM64 GKI 2.0 与 LKM；当前完整构建覆盖 5.10 到 6.18 的八组 KMI。
        link: /guide/yukisu-vs-kernelsu/
      - title: 现代 C++ 用户空间
        icon: ⚙️
        details: ksud（含 su）与 ksuinit 使用 C++，维护自己的安装、模块与诊断实现。
        link: /guide/features/
      - title: 灵活模块挂载
        icon: 🧩
        details: 内置 Kagami 提供挂载，外部 MetaModule 可优先接管；Kasumi 提供内核视图能力。
        link: /modules/meta-module/
      - title: 安全认证
        icon: 🔐
        details: 官方管理器默认靠签名认证；私有部署还可以用 SuperKey，但它只认管理器，不管应用 Root。
        link: /manager/superkey/
      - title: 完整管理体验
        icon: 🛠️
        details: 统一的 Material 3 Expressive 界面，集中管理授权、启动配置、模块、AVB 与 Ramdisk 编辑。
        link: /manager/overview/
      - title: YukiZygisk 加持
        icon: 🧬
        details: 普通 Zygisk 模块与 Native ZN 目标分开加载、分开报告；不用时也不影响核心 Root。
        link: /yukizygisk/intro/
      - title: 越狱模式
        icon: 🚀
        details: 不改启动镜像也能临时加载 YukiSU。适合试 LKM、看效果；重启后不会继续保留 Root。
        link: /guide/jailbreak-mode/
---
