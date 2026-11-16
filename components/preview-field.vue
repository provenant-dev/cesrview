<template>
  <div class="row">
    <div class="col-md-8 my-2">
      <div class="output-container">
        <span v-if="!result">The output will be shown here…</span>
        <template v-else>
          <CesrNode v-for="(node, index) in result.nodes" :key="index" :node="node" @select="select" />
          <details v-if="result.annotations" class="mt-4">
            <summary>Wire annotations</summary>
            <pre class="mt-2">{{ result.annotations }}</pre>
          </details>
        </template>
      </div>
    </div>
    <div class="col-md-4 my-2">
      <div class="card more-info-container">
        <div class="card-header">More info</div>
        <div class="card-body">
          <template v-if="selected">
            <button class="btn btn-outline-success mb-3 w-100" @click="copyToClipboard">
              {{ copied ? 'Copied to clipboard!' : 'Copy CESR text' }}
            </button>
            <p v-if="copyError" role="alert">{{ copyError }}</p>
            <dl>
              <template v-for="(value, label) in selected.meta" :key="label">
                <dt>{{ label }}</dt><dd>{{ value }}</dd>
              </template>
            </dl>
          </template>
          <span v-else>Select a CESR value to get more information.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ result: { type: Object, default: null } });
const selected = ref(null);
const copied = ref(false);
const copyError = ref('');
function select(node) {
  selected.value = node;
  copied.value = false;
  copyError.value = '';
}
watch(() => props.result, () => select(null));
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(selected.value.value);
    copied.value = true;
  } catch {
    copyError.value = 'Clipboard access is unavailable.';
  }
}
</script>

<style scoped>
.output-container { border: 1px solid #ddd; border-radius: 5px; padding: 20px; font-family: 'Ubuntu Mono', monospace; }
.more-info-container { position: sticky; top: 20px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
dd { overflow-wrap: anywhere; }
@media (max-width: 768px) {
  .output-container { max-height: 600px; overflow: auto; }
}
</style>
