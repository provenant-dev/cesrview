// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/cesrview/',
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
          content: 'CESR Viewer | A Development Tool for CESR'
        },
        {
          property: 'og:title',
          content: 'CESR Viewer'
        },
        {
          property: 'og:description',
          content: 'CESR Viewer | A Development Tool for CESR'
        },
      ],
      link: [
        {
          href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css',
          rel: 'stylesheet',
          integrity: "sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC",
          crossorigin: "anonymous"
        },
        {
          href: 'https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap',
          rel: 'stylesheet'
        }
      ],
      script: [
        {
          src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js',
          integrity: "sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM",
          crossorigin: "anonymous"
        }
      ],
    }
  },
  css: [
    '~/assets/scss/cesr-styles.scss'
  ]
})
