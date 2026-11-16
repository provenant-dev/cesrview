<template>
  <section class="output-pane" aria-labelledby="output-heading">
    <div class="pane-toolbar">
      <h2 id="output-heading">Decoded</h2>
      <div class="view-switch" role="group" aria-label="Output view">
        <button type="button" :aria-pressed="view === 'structure'" @click="view = 'structure'">Structure</button>
        <button type="button" :aria-pressed="view === 'wire'" :disabled="!result?.annotations" @click="view = 'wire'">Wire annotations</button>
      </div>
      <label class="field-label-toggle"><input v-model="showLabels" type="checkbox"> Field names</label>
      <span v-if="result" class="result-size">{{ result.byteLength.toLocaleString() }} bytes</span>
    </div>

    <div class="output-scroll" tabindex="0" aria-label="Decoded output">
      <div v-if="error" class="parse-error" role="alert">
        <h3>Could not decode input</h3>
        <p>{{ error }}</p>
        <button v-if="errorLocation" type="button" class="text-button error-jump" @click="$emit('locate', errorLocation)">{{ errorLocation.kind === 'end' ? 'Input ended' : 'Error' }} at byte {{ errorLocation.start }}. Show in source</button>
        <p v-else class="location-unavailable">The parser did not provide an exact byte location.</p>
        <p>Check the data and inspection mode, then try again.</p>
      </div>
      <p v-else-if="!result" class="empty-output">Select Inspect to decode the input.</p>
      <div v-else-if="view === 'structure'" class="structure-content">
        <CesrNode v-for="(node, index) in result.nodes" :key="index" :node="node" :selected="selected" :show-labels="showLabels" @select="select" />
      </div>
      <pre v-else class="wire-content">{{ result.annotations }}</pre>
    </div>

    <aside v-if="selected" class="value-inspector" aria-label="Selected value details">
      <div class="inspector-heading">
        <h3>{{ selected.meta?.Name || selected.fieldName || selected.label || 'Value' }}<span v-if="selected.meta">{{ selected.meta.Family }}</span></h3>
        <button v-if="selected.meta || !selected.children" type="button" class="text-button" @click="copyToClipboard">{{ copied ? 'Copied' : 'Copy value' }}</button>
        <button type="button" class="dismiss-button" aria-label="Dismiss value details" @click="select(null)">×</button>
      </div>
      <code class="selected-value">{{ selected.value ?? selected.label }}</code>
      <p v-if="selected.source" class="selection-location">Bytes {{ selected.source.start }}–{{ selected.source.end - 1 }} <button type="button" class="text-button" @click="$emit('locate', selected.source)">Show in source</button></p>
      <p v-else class="selection-location">Exact field bytes are unavailable for this encoding.<button v-if="selected.sourceContainer" type="button" class="text-button" @click="$emit('locate', selected.sourceContainer)">Show message body</button></p>
      <dl v-if="selected.meta" class="metadata-list">
        <template v-for="(value, label) in selected.meta" :key="label">
          <div v-if="!['Family', 'Name'].includes(label)"><dt>{{ label }}</dt><dd>{{ value }}</dd></div>
        </template>
      </dl>
      <p v-if="copyError" class="copy-error" role="alert">{{ copyError }}</p>
      <span class="visually-hidden" role="status">{{ copied ? 'CESR text copied to clipboard.' : '' }}</span>
    </aside>
    <div class="output-status" role="status">{{ result ? (view === 'structure' ? 'Select a value to locate its source and inspect details.' : 'Wire annotations include enclosure information.') : 'No output' }}</div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ result: { type: Object, default: null }, error: { type: String, default: '' }, errorLocation: { type: Object, default: null } });
const emit = defineEmits(['locate']);
const selected = ref(null);
const showLabels = ref(true);
const view = ref('structure');
const copied = ref(false);
const copyError = ref('');
function select(node) {
  selected.value = node;
  copied.value = false;
  copyError.value = '';
  emit('locate', node?.source ?? null);
}
watch(() => props.result, () => {
  selected.value = null;
  copied.value = false;
  copyError.value = '';
  view.value = 'structure';
});
async function copyToClipboard() {
  const node = selected.value;
  copyError.value = '';
  try {
    await navigator.clipboard.writeText(String(node.value ?? node.label));
    if (selected.value === node) copied.value = true;
  } catch {
    if (selected.value === node) copyError.value = 'Clipboard access is unavailable. Select the encoded value above to copy it manually.';
  }
}
</script>
