<template>
  <NuxtLayout>
    <main id="main-content" class="error-page">
      <h2>{{ error?.statusCode === 404 ? 'Page not found' : 'Could not open the viewer' }}</h2>
      <p>{{ error?.statusCode === 404 ? 'This address does not exist. Return to the viewer to inspect a CESR stream.' : 'Return to the viewer and try again.' }}</p>
      <button type="button" class="button button-primary" @click="clearError({ redirect: '/' })">Return to viewer</button>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { clearError } from '#app';
import type { NuxtError } from '#app';

// Nuxt's default error page injects an inline back-button script at runtime.
// Vue event handlers keep recovery working with the static site's strict CSP.
defineProps<{ error?: NuxtError }>();
</script>

<style scoped>
.error-page { max-width: 42rem; margin: 12vh auto; padding: 24px; }
h2 { font-size: 24px; margin-bottom: 16px; }
p { line-height: 1.6; margin-bottom: 24px; }
</style>
