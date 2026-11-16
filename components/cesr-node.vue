<template>
  <div class="cesr-node">
    <div>
      <span v-if="node.label" class="cesr-label">{{ node.label }}: </span>
      <button v-if="node.meta" type="button" class="cesr_code cesr-token"
        :class="`code_${node.meta.Code}`" @click="$emit('select', node)">
        {{ node.value }}
      </button>
      <span v-else>{{ node.value }}</span>
      <span v-if="node.children && !node.children.length" class="text-muted"> (empty)</span>
    </div>
    <div v-if="node.children?.length" class="cesr-children">
      <CesrNode v-for="(child, index) in node.children" :key="index" :node="child"
        @select="$emit('select', $event)" />
    </div>
  </div>
</template>

<script setup>
defineProps({ node: { type: Object, required: true } });
defineEmits(['select']);
</script>

<style scoped>
.cesr-node { margin: 0.4rem 0; overflow-wrap: anywhere; }
.cesr-label { font-weight: 600; }
.cesr-children { margin-left: 1rem; border-left: 1px solid #ddd; padding-left: 0.6rem; }
.cesr-token { border: 0; text-align: left; font: inherit; overflow-wrap: anywhere; max-width: 100%; }
.cesr-token:focus-visible { outline: 2px solid #198754; outline-offset: 2px; }
</style>
