import { rainbowScale } from '../../src/specimens.js';
import { signatureRamp, tasteNames, tastes } from '../../src/tastes.js';
import type { TasteName } from '../../src/types.js';

function bars(colors: readonly string[], label: string): HTMLElement {
  const mini = document.createElement('span');
  mini.className = 'mini';
  const caption = document.createElement('span');
  caption.className = 'mini-label';
  caption.textContent = label;
  const row = document.createElement('span');
  row.className = 'bars';
  for (const color of colors) {
    const swatch = document.createElement('i');
    swatch.style.background = color;
    row.append(swatch);
  }
  mini.append(caption, row);
  return mini;
}

export function renderGallery(root: HTMLElement, selected: TasteName, onSelect: (id: TasteName) => void) {
  root.replaceChildren();
  for (const id of tasteNames) {
    const taste = tastes[id];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'taste-card';
    card.dataset.taste = id;
    card.setAttribute('aria-pressed', String(id === selected));
    const pair = document.createElement('span');
    pair.className = 'pair';
    pair.append(bars(rainbowScale, 'Before'), bars(signatureRamp(taste), 'After'));
    const name = document.createElement('span');
    name.className = 'taste-id';
    name.textContent = taste.id;
    const school = document.createElement('span');
    school.className = 'taste-school';
    school.textContent = taste.school;
    const grammar = document.createElement('span');
    grammar.className = 'grammar';
    grammar.setAttribute('aria-hidden', 'true');
    const stroke = document.createElement('i');
    stroke.className = 'grammar-stroke';
    stroke.style.height = `${Math.max(2, taste.composition.maxLineWidth * 2.4)}px`;
    const marks = document.createElement('span');
    marks.className = 'grammar-marks';
    for (let index = 0; index < taste.stage.labelRanks; index += 1) {
      const mark = document.createElement('i');
      const headline = taste.stage.type === 'italic-headline' && index === 0;
      mark.style.height = headline ? '14px' : `${5 + (taste.stage.labelRanks - index) * 2}px`;
      mark.style.width = taste.stage.type === 'bold' ? '3px' : '1.5px';
      marks.append(mark);
    }
    grammar.append(stroke, marks);
    const chips = document.createElement('span');
    chips.className = 'taste-chips';
    chips.textContent = taste.chips;
    card.append(pair, grammar, name, school, chips);
    card.addEventListener('click', () => onSelect(id));
    root.append(card);
  }
}

export function markGallery(root: HTMLElement, selected: TasteName) {
  root.querySelectorAll<HTMLButtonElement>('[data-taste]').forEach(card => {
    card.setAttribute('aria-pressed', String(card.dataset.taste === selected));
  });
}
