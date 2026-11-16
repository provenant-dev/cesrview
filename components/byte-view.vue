<template>
  <div class="byte-view">
    <div class="hex-toolbar">
      <span>Hex bytes <span class="hex-help">Offsets in decimal</span></span>
      <div><button type="button" class="text-button" :disabled="page === 0" @click="page--">Previous</button>
        <span>{{ page + 1 }} / {{ pages }}</span>
        <button type="button" class="text-button" :disabled="page + 1 >= pages" @click="page++">Next</button></div>
    </div>
    <div class="hex-scroll" tabindex="0" aria-label="Original file bytes">
      <div v-for="row in rows" :key="row.offset" class="hex-row">
        <span class="hex-offset">{{ row.offset }}</span>
        <code class="hex-values"><span v-for="cell in row.cells" :key="cell.offset" :class="{ 'source-selected': includes(cell.offset) && !isError, 'source-error': includes(cell.offset) && isError }">{{ cell.value.toString(16).padStart(2, '0') }} </span></code>
        <code class="hex-ascii" aria-hidden="true">{{ row.cells.map(cell => cell.value >= 32 && cell.value <= 126 ? String.fromCharCode(cell.value) : '.').join('') }}</code>
      </div>
      <p v-if="target?.start === bytes.length && page === pages - 1" class="source-error-end">End of input at byte {{ bytes.length }}</p>
      <p v-if="!bytes.length" class="empty-output">The file contains no bytes.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
const props = defineProps({ bytes: { type: Uint8Array, required: true }, target: { type: Object, default: null } });
const page = ref(0);
const pageSize = 256;
const pages = computed(() => Math.max(1, Math.ceil(props.bytes.length / pageSize)));
const isError = computed(() => ['error', 'end'].includes(props.target?.kind));
const rows = computed(() => {
  const result = [];
  for (let offset = page.value * pageSize; offset < Math.min(props.bytes.length, (page.value + 1) * pageSize); offset += 16) {
    result.push({ offset, cells: Array.from(props.bytes.subarray(offset, offset + 16), (value, index) => ({ value, offset: offset + index })) });
  }
  return result;
});
function includes(offset) { return props.target && offset >= props.target.start && offset < props.target.end; }
watch(() => props.bytes, () => { page.value = 0; });
watch(() => props.target, target => {
  if (target) page.value = Math.min(pages.value - 1, Math.floor(target.start / pageSize));
}, { immediate: true });
</script>
