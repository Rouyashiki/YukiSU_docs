# YukiSU 文档站

网站使用 [VuePress](https://vuepress.vuejs.org/) 和 [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume) 构建。

产品功能与兼容性描述必须能由文档标注版本的 [YukiSU 源码](https://github.com/Rouyashiki/YukiSU)证实。未经核对，不应直接复制其他 KernelSU 分支的行为。

## 文档基线

本站以 2026-11-02 发布的 [YukiSU v1.8.0](https://github.com/Rouyashiki/YukiSU/releases/tag/v1.8.0) 为基线，对应源码 [`9d046af4`](https://github.com/Rouyashiki/YukiSU/tree/9d046af49e2a43120a05a06d7c9dbc76ca824d76)，管理器版本码为 10670。升级步骤与配置迁移见[更新指南](docs/guide/update.md)。后续开发分支的变化须注明版本，不能直接写成 v1.8.0 已有功能。

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

将 `docs/.vuepress/dist/` 中的全部文件作为静态站点发布到 `https://yukisu.anatdx.com/`。当前 `base` 为 `/`，不是子路径部署；更换域名时还要修改 `docs/.vuepress/config.ts` 的 `hostname` 并重新构建，使 canonical URL、站点地图和 robots.txt 一致。

发布时整体替换旧构建目录，避免已删除的页面和旧搜索资源残留。保留目录结构，使 `/guide/intro/` 等路径访问对应的 `index.html`；不存在的路径应返回 `404.html` 和 HTTP 404。

上传前本地预览：

```sh
pnpm docs:preview
```

确认中英文首页、深层页面、搜索和 404 均正常，再发布同一份产物。仓库不包含托管平台配置或自动发布工作流；构建命令只生成本地静态文件。

## 文档

- [vuepress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
