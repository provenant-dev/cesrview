import { addStaticCsp } from './build/static-csp.ts';

const siteUrl = 'https://cesrview.provenant.net/';
const siteTitle = 'CESR Viewer — Online CESR Decoder & Inspector';
const description = 'Decode CESR streams, cryptographic primitives and attachments in your browser. Inspect KERI and ACDC data with source highlighting. No data is uploaded.';
const socialImage = new URL('social-preview.png', siteUrl).href;
const socialImageAlt = 'CESR Viewer: browser-based CESR decoding with linked input and decoded values.';

export default defineNuxtConfig({
  ssr: false,
  vite: { worker: { format: 'es' } },
  app: {
    baseURL: '/',
    head: {
      charset: 'UTF-8',
      title: siteTitle,
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' },
        { rel: 'canonical', href: siteUrl },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: description },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { name: 'theme-color', content: '#014DB5' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'CESR Viewer' },
        { property: 'og:title', content: siteTitle },
        { property: 'og:description', content: description },
        { property: 'og:url', content: siteUrl },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:image', content: socialImage },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: socialImageAlt },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: siteTitle },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: socialImage },
        { name: 'twitter:image:alt', content: socialImageAlt },
      ],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite', '@id': `${siteUrl}#website`,
              name: 'CESR Viewer', url: siteUrl, inLanguage: 'en',
            },
            {
              '@type': 'WebApplication', '@id': `${siteUrl}#application`,
              name: 'CESR Viewer', url: siteUrl, description,
              applicationCategory: 'DeveloperApplication', operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript and a modern web browser.',
              isAccessibleForFree: true, inLanguage: 'en', image: socialImage,
              isPartOf: { '@id': `${siteUrl}#website` },
              featureList: [
                'CESR text and binary inspection',
                'KERI and ACDC message inspection',
                'Source byte highlighting and error locations',
                'Local browser processing without uploads',
              ],
            },
          ],
        }),
      }],
    }
  },
  nitro: {
    hooks: {
      'prerender:generate'(route) {
        if (typeof route.contents !== 'string' || !/<head(?:\s[^>]*)?>/i.test(route.contents)) return;
        if (route.route === '/404.html') {
          // GitHub Pages serves this static document for unknown URLs.
          route.contents = route.contents
            .replace(/<meta name="robots" content="[^"]*"[^>]*>/, '<meta name="robots" content="noindex, nofollow">')
            .replace(/<link rel="canonical"[^>]*>/, '');
        }
        route.contents = addStaticCsp(route.contents);
      },
    },
  },
  css: [
    '~/assets/scss/cesr-styles.scss'
  ]
})
