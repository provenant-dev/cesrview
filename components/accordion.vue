<template>
  <div class="accordion-item">
    <h2 class="accordion-header" :id="'heading-'+id">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" :data-bs-target="'#'+id" aria-expanded="true" :aria-controls="id">
        {{ title }}
      </button>
    </h2>
    <div :id="id" class="accordion-collapse collapse show" :aria-labelledby="'heading-'+id" :data-bs-parent="'#'+parentID">
      <div class="accordion-body">
        {{ value }}
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string; value: string; id: string; parentID: string }>();
</script>