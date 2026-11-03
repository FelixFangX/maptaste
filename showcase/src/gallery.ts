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
    const chips = document.createElement('span');
    chips.className = 'taste-chips';
    chips.textContent = taste.chips;
    card.append(pair, name, school, chips);
    card.addEventListener('click', () => onSelect(id));
    root.append(card);
  }
}

export function markGallery(root: HTMLElement, selected: TasteName) {
  root.querySelectorAll<HTMLButtonElement>('[data-taste]').forEach(card => {
    card.setAttribute('aria-pressed', String(card.dataset.taste === selected));
  });
}
