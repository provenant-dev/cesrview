import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { byteToCharacter, utf8Offsets } from './source-locations.js';

export function characterRange(text, range, offsets = utf8Offsets(text)) {
  const from = byteToCharacter(offsets, Math.min(range.start, offsets.at(-1)));
  let to = byteToCharacter(offsets, Math.min(range.end, offsets.at(-1)));
  if (offsets[to] < range.end && to < text.length) to += text.codePointAt(to) > 0xffff ? 2 : 1;
  return { from, to };
}

class EndMarker extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'source-error-end';
    span.textContent = ' end of input';
    return span;
  }
}
export const setHighlights = StateEffect.define();
export const sourceHighlights = StateField.define({
  create: () => Decoration.none,
  update(decorations, transaction) {
    if (transaction.docChanged) decorations = Decoration.none;
    for (const effect of transaction.effects) {
      if (!effect.is(setHighlights)) continue;
      const text = transaction.state.doc.toString();
      const offsets = utf8Offsets(text);
      const marks = [];
      for (const range of effect.value.ranges ?? []) {
        const { from, to } = characterRange(text, range, offsets);
        if (to > from) marks.push(Decoration.mark({ class: 'source-cesr' }).range(from, to));
      }
      const target = effect.value.target;
      if (target) {
        const { from, to } = characterRange(text, target, offsets);
        const error = target.kind === 'error' || target.kind === 'end';
        if (to > from) marks.push(Decoration.mark({ class: error ? 'source-error' : 'source-selected' }).range(from, to));
        else if (error) marks.push(Decoration.widget({ widget: new EndMarker(), side: 1 }).range(from));
      }
      decorations = Decoration.set(marks, true);
    }
    return decorations;
  },
  provide: field => EditorView.decorations.from(field),
});
