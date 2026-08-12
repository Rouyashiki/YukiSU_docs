import { defineThemeConfig } from 'vuepress-theme-plume'
import { enCollections, zhCollections } from './collections'
import { enNavbar, zhNavbar } from './navbar'
import { enSidebar, zhSidebar } from './sidebar'

export default defineThemeConfig({
  logo: '/YukiSU-mini.svg',

  appearance: true,

  social: [
    { icon: 'github', link: 'https://github.com/Anatdx/YukiSU' },
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
        description: '面向 GKI 2.0 ARM64 设备的 LKM Root 方案',
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
        description: 'Kernel-based Android Root Solution',
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
