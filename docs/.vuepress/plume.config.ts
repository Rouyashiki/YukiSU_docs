import { defineThemeConfig } from 'vuepress-theme-plume'
import { enCollections, zhCollections } from './collections'
import { enNavbar, zhNavbar } from './navbar'
import { enSidebar, zhSidebar } from './sidebar'

export default defineThemeConfig({
  logo: '/YukiSU-mini.svg',

  appearance: true,

  social: [
    { icon: 'github', link: 'https://github.com/Rouyashiki/YukiSU' },
  ],
  navbarSocialInclude: ['github'],

  copyright: {
    license: 'CC-BY-NC-SA-4.0',
    author: {
      name: 'Anatdx',
      url: 'https://github.com/Anatdx',
    },
  },

  prevPage: true,
  nextPage: true,

  footer: {
    message: 'Powered by <a target="_blank" href="https://v2.vuepress.vuejs.org/">VuePress</a> & <a target="_blank" href="https://theme-plume.vuejs.press">vuepress-theme-plume</a>',
    copyright: 'Anatdx',
  },

  locales: {
    '/': {
      profile: {
        avatar: '/YukiSU-mini.svg',
        name: 'YukiSU',
        description: '面向 Android 12+ ARM64 GKI 2.0 设备的 LKM Root 方案',
      },

      navbar: zhNavbar,
      collections: zhCollections,
      sidebar: {
        '/': {
          items: zhSidebar,
          prefix: '/',
        },
      },
    },
    '/en/': {
      profile: {
        avatar: '/YukiSU-mini.svg',
        name: 'YukiSU',
        description: 'LKM root for Android 12+ ARM64 GKI 2.0 devices',
      },

      navbar: enNavbar,
      collections: enCollections,
      sidebar: {
        '/': {
          items: enSidebar,
          prefix: '/en/',
        },
      },
    },
  },
})
