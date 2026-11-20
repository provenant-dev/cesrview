<template>
  <header class="app-header">
    <h1><a href="/">CESR Viewer</a></h1>
    <nav aria-label="Site navigation">
      <details ref="resources" class="resource-menu" @keydown.esc.prevent.stop="closeResources(true)" @focusout="closeOnFocusOut">
        <summary>Resources</summary>
        <div class="resource-panel">
          <h2>Using the viewer</h2>
          <p class="resource-help">Paste data, open a file, or choose an example, then select Inspect. Select a decoded value to highlight its source bytes.</p>
          <section v-for="group in resourceGroups" :key="group.title" class="resource-group" :aria-labelledby="group.id">
            <h2 :id="group.id">{{ group.title }}</h2>
            <ul class="resource-links">
              <li v-for="link in group.links" :key="link.href">
                <a :href="link.href" target="_blank" rel="noopener noreferrer" @click="closeResources()">
                  <span>{{ link.label }}</span>
                  <span class="resource-description">{{ link.description }}</span>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </details>
      <a href="https://github.com/provenant-dev/cesrview" target="_blank" rel="noopener noreferrer">Source</a>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const resources = ref<HTMLDetailsElement | null>(null);
const resourceGroups = [
  {
    id: 'resource-specifications', title: 'Specifications', links: [
      { label: 'CESR', description: 'Encoding and stream framing', href: 'https://trustoverip.github.io/kswg-cesr-specification/' },
      { label: 'KERI', description: 'Identifiers and key events', href: 'https://trustoverip.github.io/kswg-keri-specification/' },
      { label: 'ACDC', description: 'Credential format', href: 'https://trustoverip.github.io/kswg-acdc-specification/' },
    ],
  },
  {
    id: 'resource-learning', title: 'Learning and tools', links: [
      { label: 'KERI resources', description: 'Guides and background reading', href: 'https://keri.one/keri-resources/' },
      { label: 'KERIpy', description: 'Python implementation', href: 'https://github.com/WebOfTrust/keripy' },
    ],
  },
];

function closeResources(restoreFocus = false) {
  if (!resources.value?.open) return;
  resources.value.open = false;
  if (restoreFocus) resources.value.querySelector('summary')?.focus();
}
function closeOutside(event: PointerEvent) {
  if (event.target instanceof Node && !resources.value?.contains(event.target)) closeResources();
}
function closeOnFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && !resources.value?.contains(event.relatedTarget)) closeResources();
}
onMounted(() => document.addEventListener('pointerdown', closeOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside));
</script>
