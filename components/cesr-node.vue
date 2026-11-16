<template>
  <div class="cesr-node">
    <details v-if="node.children?.length" open class="node-group">
      <summary class="node-group-heading">
        <span class="cesr-label">{{ node.label || node.meta?.Name || 'Group' }}</span>
        <span v-if="showLabels && node.fieldName" class="field-name">{{ node.fieldName }}</span>
        <button v-if="node.source && !node.meta" type="button" class="text-button locate-group" @click.stop="$emit('select', node)">Show source</button>
        <span v-if="!node.meta && node.value" class="node-description">{{ node.value }}</span>
      </summary>
      <div class="cesr-children">
        <button v-if="node.meta" type="button" class="cesr-token" :class="{ 'is-selected': selected === node }"
          :aria-pressed="selected === node" @click="$emit('select', node)">{{ node.value }}</button>
        <CesrNode v-for="(child, index) in node.children" :key="index" :node="child" :selected="selected" :show-labels="showLabels"
          @select="$emit('select', $event)" />
      </div>
    </details>
    <div v-else class="node-row">
      <span v-if="node.label" class="node-label"><span class="cesr-label">{{ node.label }}</span><span v-if="showLabels && node.fieldName" class="field-name">{{ node.fieldName }}</span></span>
      <button v-if="node.meta || node.source" type="button" class="cesr-token"
        :class="{ 'is-selected': selected === node, 'scalar-token': !node.meta }"
        :aria-pressed="selected === node" :title="`Inspect ${node.fieldName || node.meta?.Name || node.label || 'value'}`" @click="$emit('select', node)">{{ !node.meta && node.children ? (node.value === 'Array' ? '[]' : '{}') : node.value }}</button>
      <span v-else-if="node.children" class="node-empty">{{ node.value === 'Array' ? '[]' : node.value === 'Object' ? '{}' : 'None' }}</span>
      <span v-else class="node-value">{{ node.value }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  node: { type: Object, required: true },
  selected: { type: Object, default: null },
  showLabels: { type: Boolean, default: true },
});
defineEmits(['select']);
</script>
