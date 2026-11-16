import { cesrBrowserEntry, cesrBrowserPlugin } from './build/cesr-browser.mjs';

export default defineNuxtConfig({
  ssr: false,
  vite: {
    resolve: { alias: [{ find: /^cesr-ts$/, replacement: cesrBrowserEntry }] },
    optimizeDeps: { exclude: ['cesr-ts'] },
    plugins: [cesrBrowserPlugin()],
  },
  app: {
    baseURL: '/',
    head: {
      charset: 'UTF-8',
      title: 'CESR Viewer',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        {
          name: 'X-UA-Compatible',
          content: 'IE=edge'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1'
        },
        {
          hid: 'description',
          name: 'description',
          content: 'Inspect CESR streams, cryptographic primitives, and attachments locally in your browser.'
        },
        {
          property: 'og:title',
          content: 'CESR Viewer'
        },
        {
          property: 'og:description',
          content: 'Inspect CESR streams, cryptographic primitives, and attachments locally in your browser.'
        },
      ],
    }
  },
  css: [
    '~/assets/scss/cesr-styles.scss'
  ]
})
