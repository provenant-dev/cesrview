<template><div ref="host" class="code-editor" /></template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, placeholder, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { characterRange, setHighlights, sourceHighlights } from '~/lib/editor-highlights.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  ranges: { type: Array, default: () => [] },
  target: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'inspect']);
const host = ref(null);
const editable = new Compartment();
let view;
let replacing = false;
const colors = HighlightStyle.define([
  { tag: tags.propertyName, class: 'syntax-key' },
  { tag: tags.string, class: 'syntax-string' },
  { tag: [tags.number, tags.bool, tags.null], class: 'syntax-literal' },
  { tag: [tags.brace, tags.squareBracket, tags.separator], class: 'syntax-punctuation' },
]);
function highlight(scroll = false) {
  if (!view) return;
  const effects = [setHighlights.of({ ranges: props.ranges, target: props.target })];
  if (scroll && props.target) effects.push(EditorView.scrollIntoView(characterRange(props.modelValue, props.target).from, { y: 'center' }));
  view.dispatch({ effects });
}
onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        // Preserve CR bytes and Unicode separators in the original source.
        EditorState.lineSeparator.of('\n'),
        editable.of([EditorState.readOnly.of(props.readonly), EditorView.editable.of(!props.readonly)]),
        EditorView.contentAttributes.of({ id: 'input-textarea', 'aria-label': 'CESR input', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
        lineNumbers(), drawSelection(), history(), EditorView.lineWrapping,
        json(), syntaxHighlighting(colors), sourceHighlights,
        placeholder('Paste CESR data here, or open a file below.'),
        keymap.of([{ key: 'Mod-Enter', run: () => { emit('inspect'); return true; } }, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !replacing) emit('update:modelValue', update.state.doc.toString());
        }),
      ],
    }),
  });
  highlight(true);
});
watch(() => props.modelValue, value => {
  if (view && view.state.doc.toString() !== value) {
    replacing = true;
    try { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }); }
    finally { replacing = false; }
    highlight();
  }
});
watch(() => props.readonly, value => view?.dispatch({ effects: editable.reconfigure([EditorState.readOnly.of(value), EditorView.editable.of(!value)]) }));
watch(() => props.ranges, () => highlight());
watch(() => props.target, () => highlight(true));
onBeforeUnmount(() => view?.destroy());
</script>
