<template>
  <div class="cesr-node">
    <details v-if="node.children?.length" :open="expanded" class="node-group" @toggle="toggle">
      <summary class="node-group-heading">
        <span class="cesr-label">{{ node.label || node.meta?.Name || 'Group' }}</span>
        <span v-if="showLabels && node.fieldName" class="field-name">{{ node.fieldName }}</span>
        <button v-if="node.source && !node.meta" type="button" class="text-button locate-group" @click.stop="$emit('select', node)">Show source</button>
        <span v-if="!node.meta && node.value" class="node-description">{{ node.value }}</span>
      </summary>
      <div v-if="expanded" class="cesr-children">
        <button v-if="node.meta" type="button" class="cesr-token" :class="{ 'is-selected': selected === node }"
          :aria-pressed="selected === node" @click="$emit('select', node)">{{ preview(node.value) }}</button>
        <CesrNode v-for="(child, index) in node.children.slice(0, visible)" :key="index" :node="child" :selected="selected" :show-labels="showLabels" :depth="depth + 1"
          @select="$emit('select', $event)" />
        <button v-if="visible < node.children.length" type="button" class="text-button" @click="visible += 50">Show next {{ Math.min(50, node.children.length - visible) }} items ({{ node.children.length - visible }} remaining)</button>
      </div>
    </details>
    <div v-else class="node-row">
      <span v-if="node.label" class="node-label"><span class="cesr-label">{{ node.label }}</span><span v-if="showLabels && node.fieldName" class="field-name">{{ node.fieldName }}</span></span>
      <button v-if="node.meta || node.source" type="button" class="cesr-token"
        :class="{ 'is-selected': selected === node, 'scalar-token': !node.meta }"
        :aria-pressed="selected === node" :title="`Inspect ${node.fieldName || node.meta?.Name || node.label || 'value'}`" @click="$emit('select', node)">{{ !node.meta && node.children ? (node.value === 'Array' ? '[]' : '{}') : preview(node.value) }}</button>
      <span v-else-if="node.children" class="node-empty">{{ node.value === 'Array' ? '[]' : node.value === 'Object' ? '{}' : 'None' }}</span>
      <span v-else class="node-value">{{ preview(node.value) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { InspectionNode } from '~/lib/types.ts';

const props = withDefaults(defineProps<{
  node: InspectionNode;
  selected?: InspectionNode | null;
  showLabels?: boolean;
  depth?: number;
}>(), { selected: null, showLabels: true, depth: 0 });
defineEmits<{ select: [node: InspectionNode] }>();
const expanded = ref(props.depth < 2);
const visible = ref(50);
function preview(value: string | undefined) {
  return value && value.length > 4096 ? `${value.slice(0, 4096)}…` : value;
}
function toggle(event: Event) {
  expanded.value = (event.currentTarget as HTMLDetailsElement).open;
}
watch(() => props.node, () => { expanded.value = props.depth < 2; visible.value = 50; });
</script>
