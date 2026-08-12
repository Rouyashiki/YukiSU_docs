---
pageLayout: home
externalLinkIcon: false
config:
  - type: doc-hero
    hero:
      name: YukiSU
      text: 为 GKI 设备打造的现代 Root 方案
      tagline: 上游生态照常用，新的东西也不缺
      image:
        src: /YukiSU-mini.svg
        alt: YukiSU
      actions:
        - theme: brand
          text: 快速开始 →
          link: /guide/get-started/
        - theme: alt
          text: 与 KernelSU 对比 →
          link: /guide/yukisu-vs-kernelsu/
        - theme: alt
          text: 在 GitHub 上查看 →
          link: https://github.com/Anatdx/YukiSU
  - type: features
    features:
      - title: 内核级 Root 能力
        icon: 🛡️
        details: Root 权限在内核侧处理，应用拿不拿得到、拿到多少，都由你决定。
        link: /guide/intro/
      - title: 清晰的技术路线
        icon: 🧭
        details: 只做 ARM64 GKI 2.0 与 LKM。范围不大，但每一层都知道自己在做什么。
        link: /guide/yukisu-vs-kernelsu/
      - title: 现代 C++ 用户空间
        icon: ⚙️
        details: ksud、ksuinit 与 su 都用 C++ 重写，不是给上游二进制换个壳继续用。
        link: /guide/features/
      - title: 灵活模块挂载
        icon: 🧩
        details: MetaModule 完全跟随上游。原来能用的继续用，挂载后端也可以自己选。
        link: /modules/meta-module/
      - title: 安全认证
        icon: 🔐
        details: 官方管理器默认靠签名认证；私有部署还可以用 SuperKey，但它只认管理器，不管应用 Root。
        link: /manager/superkey/
      - title: 完整管理体验
        icon: 🛠️
        details: 授权、模块、LKM 安装、分区备份和 Ramdisk 工具，一个管理器里都能找到。
        link: /manager/overview/
      - title: YukiZygisk 加持
        icon: 🧬
        details: 要用 Zygisk 模块时直接开，不用再装 Magisk 或 Zygisk Next；不用时也不影响 Root。
        link: /yukizygisk/intro/
      - title: 越狱模式
        icon: 🚀
        details: 不改启动镜像也能临时加载 YukiSU。适合试 LKM、看效果；重启后不会继续保留 Root。
        link: /guide/jailbreak-mode/
---
