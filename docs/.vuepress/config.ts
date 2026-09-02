import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

export default defineUserConfig({
  base: '/',
  lang: 'zh-CN',
  locales: {
    '/': {
      title: 'YukiSU',
      lang: 'zh-CN',
      description: 'YukiSU - 面向 Android 12+ ARM64 GKI 2.0 设备的 LKM Root 方案',
    },
    '/en/': {
      title: 'YukiSU',
      lang: 'en-US',
      description: 'YukiSU - LKM root for Android 12+ ARM64 GKI 2.0 devices',
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/YukiSU-mini.svg' }],
  ],

  bundler: viteBundler(),
  shouldPrefetch: false,

  plugins: [
    {
      name: 'yukisu-page-title',
      extendsPage(page) {
        const title = page.frontmatter.title

        if (typeof title === 'string' && title.length > 0) {
          page.data.title = title
        }
      },
    },
  ],

  theme: plumeTheme({
    hostname: 'https://yukisu.anatdx.com',

    docsRepo: 'Rouyashiki/YukiSU_docs',
    docsDir: 'docs',
    docsBranch: 'main',

    // This site is maintained separately from the source repository.
    editLink: false,
    lastUpdated: false,
    contributors: false,
    autoFrontmatter: false,

    plugins: {
      git: false,
    },

    cache: 'filesystem',

    // Keep search local so the site does not depend on an external index.
    search: { provider: 'local' },

    readingTime: true,

    markdown: {
      icon: { provider: 'iconify' },
      collapse: true,
      image: {
        figure: true,
        lazyload: true,
        size: true,
      },
      include: true,
      imageSize: 'local',
    },

  }),
})
