import { defineCollection, defineCollections } from 'vuepress-theme-plume'

/* =================== locale: zh-CN ======================= */

const zhGuide = defineCollection({
  type: 'doc',
  dir: 'guide',
  linkPrefix: '/guide',
  title: '指南',
})

const zhYukiZygisk = defineCollection({
  type: 'doc',
  dir: 'yukizygisk',
  linkPrefix: '/yukizygisk',
  title: 'YukiZygisk',
})

const zhModules = defineCollection({
  type: 'doc',
  dir: 'modules',
  linkPrefix: '/modules',
  title: '模块',
})

const zhManager = defineCollection({
  type: 'doc',
  dir: 'manager',
  linkPrefix: '/manager',
  title: '管理器',
})

const zhDev = defineCollection({
  type: 'doc',
  dir: 'dev',
  linkPrefix: '/dev',
  title: '开发者',
})

const zhTroubleshoot = defineCollection({
  type: 'doc',
  dir: 'troubleshoot',
  linkPrefix: '/troubleshoot',
  title: '疑难解答',
})

export const zhCollections = defineCollections([
  zhGuide,
  zhYukiZygisk,
  zhModules,
  zhManager,
  zhDev,
  zhTroubleshoot,
])

/* =================== locale: en-US ======================= */

const enGuide = defineCollection({
  type: 'doc',
  dir: 'guide',
  linkPrefix: '/guide',
  title: 'Guide',
})

const enYukiZygisk = defineCollection({
  type: 'doc',
  dir: 'yukizygisk',
  linkPrefix: '/yukizygisk',
  title: 'YukiZygisk',
})

const enModules = defineCollection({
  type: 'doc',
  dir: 'modules',
  linkPrefix: '/modules',
  title: 'Modules',
})

const enManager = defineCollection({
  type: 'doc',
  dir: 'manager',
  linkPrefix: '/manager',
  title: 'Manager',
})

const enDev = defineCollection({
  type: 'doc',
  dir: 'dev',
  linkPrefix: '/dev',
  title: 'Developers',
})

const enTroubleshoot = defineCollection({
  type: 'doc',
  dir: 'troubleshoot',
  linkPrefix: '/troubleshoot',
  title: 'Troubleshoot',
})

export const enCollections = defineCollections([
  enGuide,
  enYukiZygisk,
  enModules,
  enManager,
  enDev,
  enTroubleshoot,
])
