import type { PackName, TasteName } from './types.js';

export interface TasteTokens {
  paper: string;
  ink: string;
  void: string;
  accent: string;
  halo: string;
  sequential: readonly string[];
  diverging?: readonly string[];
  categorical?: readonly string[];
}

/** Numbers the checker enforces. A taste is this contract plus the tokens, not a color list alone. */
export interface TasteComposition {
  /** paper: light sheet. dark: night ground. muted: hillshade window, neither white nor void. */
  ground: 'paper' | 'dark' | 'muted';
  /** Relative luminance. Paper uses the minimum. Dark uses the maximum. Muted uses both. */
  groundMinL: number;
  groundMaxL: number;
  maxLabelLayers: number;
  contrastMin: number;
  maxFillSaturation: number;
  maxFillStops: number;
  monotonicLightness: boolean;
  maxLineWidth: number;
  maxLineHues: number;
  /** terrain-quiet keeps data fills translucent. Null skips the rule. */
  fillOpacityMax: number | null;
  /** editorial: one headline and a real size step. Null skips the rule. */
  hierarchy: { headlineSize: number; maxHeadlines: number; minSpread: number } | null;
}

export interface Taste {
  id: TasteName;
  title: string;
  school: string;
  summary: string;
  /** Short chips for the gallery card. */
  chips: string;
  /** Legacy `--pack` that resolves to this taste, when one exists. */
  packAlias?: PackName;
  tokens: TasteTokens;
  composition: TasteComposition;
}

export const tastes: Record<TasteName, Taste> = {
  'ink-paper': {
    id: 'ink-paper',
    title: 'Ink & paper',
    school: 'Print cartography',
    summary: 'Print cartography — paper ground, hairline strokes, a short sequential ramp.',
    chips: 'Paper · hairline · sequential',
    packAlias: 'global',
    tokens: {
      paper: '#ebe7df',
      ink: '#1a2a4a',
      void: '#0b0b0b',
      accent: '#1a2a4a',
      halo: '#ebe7df',
      sequential: ['#e4eaf2', '#c5d4e6', '#9eb6d4', '#6d8fb8', '#3d5f8a', '#1a2a4a'],
    },
    composition: {
      ground: 'paper', groundMinL: 0.55, groundMaxL: 1,
      maxLabelLayers: 8, contrastMin: 4.5, maxFillSaturation: 0.55, maxFillStops: 6,
      monotonicLightness: true, maxLineWidth: 1.25, maxLineHues: 2, fillOpacityMax: null, hierarchy: null,
    },
  },
  'night-ops': {
    id: 'night-ops',
    title: 'Night ops',
    school: 'Dark operations',
    summary: 'Dark operations — night ground, 7:1 labels, restrained diverging.',
    chips: 'Night ground · 7:1 labels · diverging',
    tokens: {
      paper: '#121a17',
      ink: '#e7f6ec',
      void: '#0c1210',
      accent: '#9fd9b8',
      halo: '#0c1210',
      sequential: ['#15211e', '#1e3330', '#2c4a44', '#3e655c', '#6d9084', '#c5ddd4'],
      diverging: ['#5d7e99', '#c5d0d4', '#141c1a', '#b7a48a', '#7d6a4e'],
    },
    composition: {
      ground: 'dark', groundMinL: 0, groundMaxL: 0.15,
      maxLabelLayers: 8, contrastMin: 7, maxFillSaturation: 0.55, maxFillStops: 5,
      monotonicLightness: false, maxLineWidth: 2.75, maxLineHues: 3, fillOpacityMax: null, hierarchy: null,
    },
  },
  civic: {
    id: 'civic',
    title: 'Civic',
    school: 'Open-data choropleth',
    summary: 'Open-data choropleth — neutral paper, few classes, lightness that only moves one way.',
    chips: 'Neutral paper · 7 classes · one-way lightness',
    tokens: {
      paper: '#f3f5f7',
      ink: '#1f2933',
      void: '#12171c',
      accent: '#1f4e79',
      halo: '#f3f5f7',
      sequential: ['#f4f7fb', '#d5e2f0', '#a9c4e0', '#6f9ac4', '#3d6fa3', '#1f4e79'],
    },
    composition: {
      ground: 'paper', groundMinL: 0.55, groundMaxL: 1,
      maxLabelLayers: 7, contrastMin: 4.5, maxFillSaturation: 0.65, maxFillStops: 7,
      monotonicLightness: true, maxLineWidth: 2, maxLineHues: 2, fillOpacityMax: null, hierarchy: null,
    },
  },
  editorial: {
    id: 'editorial',
    title: 'Editorial',
    school: 'Magazine story map',
    summary: 'Magazine story map — three labels or fewer, one headline, one accent hue.',
    chips: '≤3 labels · one headline · one hue',
    tokens: {
      paper: '#f7f1e8',
      ink: '#1c1917',
      void: '#1c1917',
      accent: '#9a3412',
      halo: '#f7f1e8',
      sequential: ['#f6f0e8', '#e6d5c6', '#d0b49a', '#8d6b56'],
    },
    composition: {
      ground: 'paper', groundMinL: 0.55, groundMaxL: 1,
      maxLabelLayers: 3, contrastMin: 4.5, maxFillSaturation: 0.55, maxFillStops: 4,
      monotonicLightness: true, maxLineWidth: 1.5, maxLineHues: 1, fillOpacityMax: null,
      hierarchy: { headlineSize: 18, maxHeadlines: 1, minSpread: 4 },
    },
  },
  'cn-metro': {
    id: 'cn-metro',
    title: 'CN metro',
    school: 'Chinese city and transit',
    summary: 'Chinese city and transit — six labels or fewer, route-colored lines. Alias for --pack cn.',
    chips: '≤6 labels · route colors · city admin',
    packAlias: 'cn',
    tokens: {
      paper: '#f4f1ea',
      ink: '#1a1a1a',
      void: '#141414',
      accent: '#d23a3a',
      halo: '#f4f1ea',
      sequential: ['#f6f1e8', '#e4d5c4', '#d2b8a2', '#b48b72', '#8a5e4a', '#4a342c'],
      categorical: ['#d23a3a', '#2a6fdb', '#1f8a4c', '#d4a017'],
    },
    composition: {
      ground: 'paper', groundMinL: 0.55, groundMaxL: 1,
      maxLabelLayers: 6, contrastMin: 4.5, maxFillSaturation: 0.55, maxFillStops: 6,
      monotonicLightness: true, maxLineWidth: 3.5, maxLineHues: 6, fillOpacityMax: null, hierarchy: null,
    },
  },
  'terrain-quiet': {
    id: 'terrain-quiet',
    title: 'Quiet terrain',
    school: 'Hillshade',
    summary: 'Hillshade — muted earth, translucent fills, no blank white ground.',
    chips: 'Muted earth · translucent · hillshade',
    tokens: {
      paper: '#e4e0d8',
      ink: '#2c3426',
      void: '#1c2118',
      accent: '#6d7a5e',
      halo: '#e4e0d8',
      sequential: ['#efe8dc', '#ddd6c6', '#c9cbb8', '#aeb39f', '#8b927c', '#5c6550'],
    },
    composition: {
      ground: 'muted', groundMinL: 0.45, groundMaxL: 0.78,
      maxLabelLayers: 5, contrastMin: 4.5, maxFillSaturation: 0.42, maxFillStops: 5,
      monotonicLightness: true, maxLineWidth: 1.15, maxLineHues: 2, fillOpacityMax: 0.85, hierarchy: null,
    },
  },
};

export const tasteNames = Object.keys(tastes) as TasteName[];

/** `--pack global` is ink-paper. `--pack cn` is cn-metro. */
export const packAlias = { global: 'ink-paper', cn: 'cn-metro' } as const satisfies Record<PackName, TasteName>;

export function isTaste(value: string): value is TasteName {
  return Object.prototype.hasOwnProperty.call(tastes, value);
}

export function resolveTaste(options: { pack?: string; taste?: string } = {}): TasteName {
  const taste = options.taste;
  const pack = options.pack;
  if (taste !== undefined && !isTaste(taste)) throw new TypeError('Unknown taste');
  if (pack !== undefined && pack !== 'global' && pack !== 'cn') throw new TypeError('Unknown pack');
  if (taste && pack && packAlias[pack] !== taste) throw new TypeError(`Pack ${pack} aliases ${packAlias[pack]}, not ${taste}`);
  if (taste) return taste;
  if (pack) return packAlias[pack];
  return 'ink-paper';
}

export function tasteByName(name: TasteName): Taste {
  return tastes[name];
}

/** One sentence an agent can follow without reading the rule source. Built from the numbers the checker uses. */
export function tasteRules(taste: Taste): string {
  const c = taste.composition;
  const ground = c.ground === 'dark'
    ? `Near-black ground (luminance ≤ ${c.groundMaxL})`
    : c.ground === 'muted'
      ? `Muted ground (luminance ${c.groundMinL}–${c.groundMaxL}, not white and not night)`
      : `Paper ground (luminance ≥ ${c.groundMinL})`;
  const parts = [
    ground,
    `strokes ≤ ${c.maxLineWidth}`,
    `≤ ${c.maxLabelLayers} text layers`,
    c.monotonicLightness ? `≤ ${c.maxFillStops} sequential classes` : `≤ ${c.maxFillStops} classes, diverging allowed`,
    `≤ ${c.maxLineHues} line hues`,
    `label contrast ≥ ${c.contrastMin}`,
    `fill saturation ≤ ${c.maxFillSaturation}`,
  ];
  if (c.fillOpacityMax != null) parts.push(`fill opacity ≤ ${c.fillOpacityMax}`);
  if (c.hierarchy) parts.push(`one headline (≥ ${c.hierarchy.headlineSize}) and a size step of ${c.hierarchy.minSpread}`);
  return `${parts.join(', ')}.`;
}

export function tasteCatalog() {
  return tasteNames.map(id => {
    const taste = tastes[id];
    return {
      id: taste.id,
      title: taste.title,
      school: taste.school,
      summary: taste.summary,
      chips: taste.chips,
      packAlias: taste.packAlias ?? null,
      tokens: taste.tokens,
      composition: taste.composition,
      rules: tasteRules(taste),
    };
  });
}

/** Ramp shown on a gallery card: diverging at night, route colors for cn-metro, otherwise sequential. */
export function signatureRamp(taste: Taste): readonly string[] {
  if (taste.id === 'night-ops' && taste.tokens.diverging) return taste.tokens.diverging;
  if (taste.id === 'cn-metro' && taste.tokens.categorical) return taste.tokens.categorical;
  return taste.tokens.sequential;
}
