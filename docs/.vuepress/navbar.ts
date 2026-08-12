import { defineNavbarConfig } from 'vuepress-theme-plume'

export const zhNavbar = defineNavbarConfig([
  { text: '首页', link: '/' },
  { text: '介绍', link: '/guide/intro/' },
  { text: '开始', link: '/guide/get-started/' },
])

export const enNavbar = defineNavbarConfig([
  { text: 'Home', link: '/en/' },
  { text: 'Introduction', link: '/en/guide/intro/' },
  { text: 'Get started', link: '/en/guide/get-started/' },
])
