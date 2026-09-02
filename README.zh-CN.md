# YukiSU 文档站

网站使用 [VuePress](https://vuepress.vuejs.org/) 和 [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume) 构建。

产品功能与兼容性描述必须能由当前 [YukiSU 源码仓库](https://github.com/Rouyashiki/YukiSU)证实。未经核对，不应直接复制其他 KernelSU 分支的行为。

## 内容维护规则

- 中英文页面保持成对；新增路由时同步更新两份侧栏。
- KMI 目标以 `scripts/build.ps1`、`scripts/build.sh` 和构建工作流为准。
- Feature 编号与行为必须同时核对 `uapi/feature.h`、内核实现、`ksud` 和当前管理器界面。
- 管理器界面、镜像修补、模块与 YukiZygisk 是不同运行层；界面标签本身不能证明最终效果成功。
- 发布前执行生产构建并检查站内链接。

## Install

```sh
pnpm i
```

## Usage

```sh
# 启动开发服务
pnpm docs:dev
# 构建生产包
pnpm docs:build
# 本地预览生产服务
pnpm docs:preview
# 更新 vuepress 和主题
pnpm vp-update
```

## 文档

- [vuepress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
