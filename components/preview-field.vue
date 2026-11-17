<template>
  <section class="output-pane" aria-labelledby="output-heading" :aria-busy="busy">
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
      <p v-else-if="!result" class="empty-output">{{ busy ? 'Decoding input… You can cancel or edit the input.' : 'Select Inspect to decode the input.' }}</p>
      <div v-else-if="view === 'structure'" class="structure-content">
        <CesrNode v-for="(node, index) in result.nodes.slice(0, visible)" :key="index" :node="node" :selected="selected" :show-labels="showLabels" @select="select" />
        <button v-if="visible < result.nodes.length" type="button" class="text-button" @click="visible += 10">Show next {{ Math.min(10, result.nodes.length - visible) }} entries ({{ result.nodes.length - visible }} remaining)</button>
      </div>
      <template v-else>
        <div v-if="wirePages > 1" class="hex-toolbar">
          <span>Wire annotations</span>
          <div><button type="button" class="text-button" :disabled="wirePage === 0" @click="wirePage--">Previous</button>
            <span>{{ wirePage + 1 }} / {{ wirePages }}</span>
            <button type="button" class="text-button" :disabled="wirePage + 1 >= wirePages" @click="wirePage++">Next</button></div>
        </div>
        <pre class="wire-content">{{ wireText }}</pre>
      </template>
    </div>

    <aside v-if="selected" class="value-inspector" aria-label="Selected value details">
      <div class="inspector-heading">
        <h3>{{ selected.meta?.Name || selected.fieldName || selected.label || 'Value' }}<span v-if="selected.meta">{{ selected.meta.Family }}</span></h3>
        <button v-if="selected.meta || !selected.children" type="button" class="text-button" @click="copyToClipboard">{{ copied ? 'Copied' : 'Copy value' }}</button>
        <button type="button" class="dismiss-button" aria-label="Dismiss value details" @click="select(null)">×</button>
      </div>
      <code class="selected-value">{{ selected.value?.slice(0, 4096) ?? selected.label }}{{ (selected.value?.length ?? 0) > 4096 ? '…' : '' }}</code>
      <p v-if="(selected.value?.length ?? 0) > 4096" class="selection-location">Showing the first 4,096 characters. Copy value includes the complete value.</p>
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
    <div class="output-status" role="status">{{ busy ? 'Decoding…' : result ? (view === 'structure' ? 'Select a value to locate its source and inspect details.' : 'Wire annotations include enclosure information.') : 'No output' }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { InspectionNode, InspectionResult, SourceTarget } from '~/lib/types.ts';

const props = withDefaults(defineProps<{
  result?: InspectionResult | null;
  error?: string;
  errorLocation?: SourceTarget | null;
  busy?: boolean;
}>(), { result: null, error: '', errorLocation: null, busy: false });
const emit = defineEmits<{ locate: [range: SourceTarget | null] }>();
const selected = ref<InspectionNode | null>(null);
const showLabels = ref(true);
const view = ref<'structure' | 'wire'>('structure');
const copied = ref(false);
const copyError = ref('');
const visible = ref(10);
const wirePage = ref(0);
const wirePageSize = 64 * 1024;
const wirePages = computed(() => Math.max(1, Math.ceil((props.result?.annotations.length ?? 0) / wirePageSize)));
const wireText = computed(() => {
  const text = props.result?.annotations ?? '';
  // Never split a surrogate pair across annotation pages.
  const boundary = (index: number) => index > 0 && /[\uDC00-\uDFFF]/.test(text.charAt(index))
    && /[\uD800-\uDBFF]/.test(text.charAt(index - 1)) ? index - 1 : index;
  return text.slice(boundary(wirePage.value * wirePageSize), boundary((wirePage.value + 1) * wirePageSize));
});
function select(node: InspectionNode | null) {
  selected.value = node;
  copied.value = false;
  copyError.value = '';
  emit('locate', node?.source ?? null);
}
watch(() => props.result, () => {
  visible.value = 10;
  wirePage.value = 0;
  selected.value = null;
  copied.value = false;
  copyError.value = '';
  view.value = 'structure';
});
async function copyToClipboard() {
  const node = selected.value;
  if (!node) return;
  copyError.value = '';
  try {
    await navigator.clipboard.writeText(String(node.value ?? node.label));
    if (selected.value === node) copied.value = true;
  } catch {
    if (selected.value === node) copyError.value = 'Clipboard access is unavailable. Select the encoded value above to copy it manually.';
  }
}
</script>
