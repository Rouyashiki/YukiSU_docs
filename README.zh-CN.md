# YukiSU 文档站

在线阅读：[简体中文](https://yukisu.rouyashiki.org/) · [English](https://yukisu.rouyashiki.org/en/)

网站使用 [VuePress](https://vuepress.vuejs.org/) 和 [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume) 构建。

产品功能与兼容性描述必须能由文档标注版本的 [YukiSU 源码](https://github.com/Rouyashiki/YukiSU)证实。未经核对，不应直接复制其他 KernelSU 分支的行为。

## 文档基线

本文档对应 [YukiSU v1.9.0](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.9.0)，发布于 2026 年 11 月 16 日，管理器版本码为 10745。维护文档时请核对[这次发布的源码](https://github.com/Rouyashiki/YukiSU/tree/a66faee724c6ff2d79757cb1cc8030fdf71a30f8)。旧管理器用户请先看[更新指南](docs/guide/update.md)，里面说明了换包名后的安装顺序和哪些数据需要自己保留。

## 内容维护规则

- 面向用户和开发者写作：直接说怎么做、何时生效、失败后怎么办。实现已经确定的行为，直接给结论。
- 把“可能、通常、视情况”背后的条件写出来。真实限制要保留，但要说清原因和下一步，不反复堆免责句。
- 源码核查过程放在来源和维护说明中；产品页面先介绍功能与用法。
- 中英文页面保持成对；新增路由时同步更新两份侧栏。
- KMI 目标以 `scripts/build.ps1`、`scripts/build.sh` 和构建工作流为准。
- Feature 编号与行为必须同时核对 `uapi/feature.h`、内核实现、`ksud` 和当前管理器界面。
- 管理器界面、镜像修补、模块与 YukiZygisk 是不同运行层；界面标签本身不能证明最终效果成功。
- 来源使用固定提交链接，并核对路径与子模块文件实际存在。
- 区分安装、运行时修改、快照准备与设备上观察到的最终效果。
- 发布前执行生产构建，检查生成路由、站内锚点、中英配对与侧栏入口。

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

## 部署

构建环境须满足 `package.json` 的 Node.js 要求，并使用其中指定的 pnpm 版本。构建需要安装 `devDependencies`：

```sh
pnpm install --frozen-lockfile --prod=false
pnpm docs:build
```

站点部署在域名根路径。将 `docs/.vuepress/dist/` 的内容发布到 [yukisu.rouyashiki.org](https://yukisu.rouyashiki.org/)。更换域名时，修改 `docs/.vuepress/config.ts` 中的 `hostname` 并重新构建，页面地址、站点地图和 robots.txt 会随之更新。

发布时整体替换旧构建目录，避免已删除的页面和旧搜索资源残留。保留目录结构，使 `/guide/intro/` 等路径访问对应的 `index.html`；不存在的路径应返回 `404.html` 和 HTTP 404。

上传前本地预览：

```sh
pnpm docs:preview
```

确认中英文首页、深层页面、搜索和 404 均正常，再发布同一份产物。仓库不包含托管平台配置或自动发布工作流；构建命令只生成本地静态文件。

## 文档

- [vuepress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
