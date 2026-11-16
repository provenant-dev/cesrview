<template>
  <div ref="root" class="workbench" :class="{ 'is-resizing': dragging }" :style="{ '--source-width': `${width}%` }">
    <slot name="source" />
    <div class="pane-divider" role="separator" tabindex="0" aria-label="Resize input pane"
      aria-orientation="vertical" aria-controls="source-pane" :aria-valuenow="width" :aria-valuemin="25" :aria-valuemax="70"
      :aria-valuetext="`Input pane ${width} percent`" title="Drag to resize; arrow keys adjust; double-click resets"
      @pointerdown="startDrag" @pointermove="move" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="dragging = false"
      @keydown="resizeWithKey" @dblclick="setWidth(38)" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
const root = ref<HTMLElement | null>(null);
const width = ref(38);
const dragging = ref(false);
const preference = 'cesr-viewer-input-width';
function setWidth(value: number) {
  width.value = Math.round(Math.max(25, Math.min(70, value)));
  try { localStorage.setItem(preference, String(width.value)); } catch { /* Storage is optional. */ }
}
function startDrag(event: PointerEvent) {
  if (event.button !== 0) return;
  dragging.value = true;
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.setPointerCapture(event.pointerId);
  event.preventDefault();
}
function move(event: PointerEvent) {
  if (!dragging.value || !root.value) return;
  const bounds = root.value.getBoundingClientRect();
  setWidth(100 * (event.clientX - bounds.left) / bounds.width);
}
function stopDrag(event: PointerEvent) {
  dragging.value = false;
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
}
function resizeWithKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2;
  const sizes: Record<string, number> = { ArrowLeft: width.value - step, ArrowRight: width.value + step, Home: 25, End: 70 };
  if (!(event.key in sizes)) return;
  event.preventDefault();
  setWidth(sizes[event.key]!);
}
onMounted(() => {
  try {
    const saved = localStorage.getItem(preference);
    if (saved !== null && Number.isFinite(Number(saved))) setWidth(Number(saved));
  } catch { /* Storage is optional. */ }
});
</script>
