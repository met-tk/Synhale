/**
 * Synhale 2 - 24 Curated Sound Therapy PeriodicWave Harmonic Coefficient Sets
 * 
 * Each wavetable slice contains band-limited Fourier coefficients (real = cosine, imag = sine).
 * Designed for pure harmonic resonance, vocal formants, Tibetan singing bowl resonances,
 * and high-frequency spectral expansion without aliasing.
 */

export interface WavetableSliceData {
  id: number;
  name: string;
  category: 'Pure Roots' | 'Singing Bowls' | 'Vocal Formants' | 'Spectral Expansion' | 'Bell & Metallic' | 'Spectral Textures' | 'Warm Analog';
  real: Float32Array;
  imag: Float32Array;
}

export interface MultiFrameWavetable {
  id: number;
  name: string;
  category: string;
  sliceIndices: number[];
  description: string;
}

const TABLE_SIZE = 64;

function createHarmonicProfile(
  id: number,
  name: string,
  category: WavetableSliceData['category'],
  harmonicWeights: number[]
): WavetableSliceData {
  const real = new Float32Array(TABLE_SIZE);
  const imag = new Float32Array(TABLE_SIZE);

  // DC offset is 0
  real[0] = 0;
  imag[0] = 0;

  for (let i = 0; i < harmonicWeights.length && i + 1 < TABLE_SIZE; i++) {
    imag[i + 1] = harmonicWeights[i];
  }

  // Normalize harmonic energy
  let sumSq = 0;
  for (let i = 1; i < TABLE_SIZE; i++) {
    sumSq += imag[i] * imag[i];
  }
  if (sumSq > 0) {
    const normFactor = 1 / Math.sqrt(sumSq);
    for (let i = 1; i < TABLE_SIZE; i++) {
      imag[i] *= normFactor;
    }
  }

  return { id, name, category, real, imag };
}

/**
 * 24 Curated Sound Therapy Wavetable Profiles with Distinct Physical & Acoustic Signatures
 */
export const WAVETABLE_DEFINITIONS: WavetableSliceData[] = [
  // Category I: Pure Roots (0..3) - Classic Analog Baseline
  createHarmonicProfile(0, 'Pure Sinusoid', 'Pure Roots', [1.0]),
  createHarmonicProfile(1, 'Pure Triangle', 'Pure Roots', [
    1.0, 0, -1 / 9, 0, 1 / 25, 0, -1 / 49, 0, 1 / 81, 0, -1 / 121, 0, 1 / 169, 0, -1 / 225
  ]),
  createHarmonicProfile(2, 'Pure Square', 'Pure Roots', [
    1.0, 0, 1 / 3, 0, 1 / 5, 0, 1 / 7, 0, 1 / 9, 0, 1 / 11, 0, 1 / 13, 0, 1 / 15, 0, 1 / 17, 0, 1 / 19, 0, 1 / 21
  ]),
  createHarmonicProfile(3, 'Pure Sawtooth', 'Pure Roots', [
    1.0, -1 / 2, 1 / 3, -1 / 4, 1 / 5, -1 / 6, 1 / 7, -1 / 8, 1 / 9, -1 / 10, 1 / 11, -1 / 12, 1 / 13, -1 / 14, 1 / 15, -1 / 16, 1 / 17, -1 / 18, 1 / 19, -1 / 20
  ]),

  // Category II: Singing Bowls & Metal Resonators (4..7)
  createHarmonicProfile(4, 'Tibetan Bowl Root', 'Singing Bowls', [
    1.0, 0.05, 0.85, 0.08, 0.12, 0.45, 0.04, 0.25, 0.06, 0.15
  ]),
  createHarmonicProfile(5, 'Singing Bowl 3rd', 'Singing Bowls', [
    0.2, 0.04, 1.0, 0.08, 0.75, 0.05, 0.5, 0.06, 0.35, 0.03, 0.2
  ]),
  createHarmonicProfile(6, 'Temple Bronze Bell', 'Singing Bowls', [
    0.4, 0.85, 0.1, 0.9, 0.15, 0.3, 0.45, 0.12, 0.3, 0.08, 0.2
  ]),
  createHarmonicProfile(7, 'Himalayan Gong', 'Singing Bowls', [
    1.0, 0.85, 0.72, 0.58, 0.45, 0.34, 0.26, 0.19, 0.14, 0.1
  ]),

  // Category III: Vocal Formants & Organic (8..11)
  createHarmonicProfile(8, 'Throat Chant Ohm', 'Vocal Formants', [
    0.6, 0.25, 0.1, 0.2, 0.85, 1.0, 0.8, 0.35, 0.15, 0.08
  ]),
  createHarmonicProfile(9, 'Vocal Aah Formant', 'Vocal Formants', [
    0.25, 0.1, 0.65, 1.0, 0.3, 0.85, 0.45, 0.18, 0.1
  ]),
  createHarmonicProfile(10, 'Deep Chest Ooh', 'Vocal Formants', [
    1.0, 0.75, 0.25, 0.08, 0.03, 0.01
  ]),
  createHarmonicProfile(11, 'Ethereal Whisper', 'Vocal Formants', [
    0.18, 0.06, 0, 0.02, 0, 0.05, 0.3, 0.7, 1.0, 0.85, 0.45, 0.2
  ]),

  // Category IV: Spectral Expansion & Distinct Textures (12..23)
  createHarmonicProfile(12, 'Octave Organ Stack', 'Spectral Expansion', [
    1.0, 0.7, 0, 0.5, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0, 0.25
  ]),
  createHarmonicProfile(13, 'Even Harmonics Velvet', 'Spectral Expansion', [
    0.75, 1.0, 0.05, 0.7, 0.03, 0.45, 0.02, 0.3, 0.01, 0.18
  ]),
  createHarmonicProfile(14, 'Comb Filtered Space', 'Spectral Expansion', [
    0.9, 0.08, 0.05, 1.0, 0.1, 0.06, 0.85, 0.12, 0.08, 0.7, 0.1, 0.05, 0.55
  ]),
  createHarmonicProfile(15, 'Pulse Width 25%', 'Spectral Expansion', [
    0.707, 0.5, 0.236, 0, -0.141, -0.167, -0.101, 0, 0.078, 0.1, 0.064, 0, -0.054, -0.071, -0.047
  ]),
  createHarmonicProfile(16, 'Resonant Peak 5th', 'Spectral Expansion', [
    0.3, 0.2, 0.4, 0.75, 1.0, 0.7, 0.35, 0.15, 0.08
  ]),
  createHarmonicProfile(17, 'Metallic FM Prism', 'Spectral Expansion', [
    0.4, 0.7, 0.2, 0.9, 0.5, 0.8, 0.3, 0.85, 0.45, 0.65, 0.3
  ]),
  createHarmonicProfile(18, 'Sub Heavy Sine 54', 'Spectral Expansion', [
    1.0, 0.12, 0.03, 0.01
  ]),
  createHarmonicProfile(19, 'Digital Bitcrush Stair', 'Spectral Expansion', [
    0.9, 0, -0.3, 0, 0.25, 0, -0.2, 0, 0.18, 0, -0.15, 0, 0.12
  ]),
  createHarmonicProfile(20, 'Shimmer Prism Spectrum', 'Spectral Expansion', [
    0.5, 0.3, 0.45, 0.4, 0.6, 0.55, 0.75, 0.8, 0.9, 0.85, 0.7, 0.55, 0.4
  ]),
  createHarmonicProfile(21, 'Bell Overtones Chime', 'Spectral Expansion', [
    0.7, 0.1, 0.9, 0.05, 0.85, 0.15, 0.7, 0.25, 0.65, 0.1, 0.5
  ]),
  createHarmonicProfile(22, 'Tape Saturator Warmth', 'Spectral Expansion', [
    1.0, 0.05, 0.38, 0.02, 0.2, 0.01, 0.12, 0.008, 0.07
  ]),
  createHarmonicProfile(23, 'Cosmic Drone Wide', 'Spectral Expansion', [
    1.0, 0.6, 0.45, 0.35, 0.28, 0.22, 0.18, 0.15, 0.12, 0.1, 0.08, 0.06
  ])
];

/**
 * Instantiate 24 PeriodicWave objects in AudioContext or MockAudioContext
 */
export function createWavetablePeriodicWaves(ctx: BaseAudioContext | any): any[] {
  return WAVETABLE_DEFINITIONS.map(slice => {
    return ctx.createPeriodicWave(slice.real, slice.imag, { disableNormalization: false });
  });
}

/**
 * Get Fourier coefficient arrays by slice index (0..23 clamped)
 */
export function getWavetableHarmonics(index: number): { real: Float32Array; imag: Float32Array } {
  const clamped = Math.max(0, Math.min(23, Math.floor(index)));
  const def = WAVETABLE_DEFINITIONS[clamped];
  return {
    real: new Float32Array(def.real),
    imag: new Float32Array(def.imag)
  };
}

function synthesizeMorphedTimeDomain(
  def1: WavetableSliceData,
  def2: WavetableSliceData,
  morph: number,
  harmonics: number,
  numPoints: number
): number[] {
  const morphAngle = Math.max(0, Math.min(1, morph)) * (Math.PI / 2);
  const g1 = Math.cos(morphAngle);
  const g2 = Math.sin(morphAngle);

  const safeHarmonics = Number.isFinite(harmonics) ? Math.max(0, Math.min(1.0, harmonics)) : 1.0;
  const maxHarmonic = Math.max(1, Math.min(63, Math.round(1 + safeHarmonics * 62)));

  const points: number[] = new Array(numPoints);
  let maxAbs = 1e-4;

  const denom = numPoints > 1 ? numPoints - 1 : 1;
  for (let i = 0; i < numPoints; i++) {
    const t = (2 * Math.PI * i) / denom;
    let sum = 0;
    for (let n = 1; n <= maxHarmonic; n++) {
      const imagVal = g1 * def1.imag[n] + g2 * def2.imag[n];
      const realVal = g1 * def1.real[n] + g2 * def2.real[n];
      const rollOff = n === maxHarmonic ? 0.5 : 1.0;
      sum += (imagVal * Math.sin(n * t) + realVal * Math.cos(n * t)) * rollOff;
    }
    points[i] = sum;
    if (Math.abs(sum) > maxAbs) {
      maxAbs = Math.abs(sum);
    }
  }

  // Normalize to [-0.95, 0.95] for clean aesthetic display
  const scale = 0.95 / maxAbs;
  for (let i = 0; i < numPoints; i++) {
    points[i] *= scale;
  }

  return points;
}

function formatPreviewSvgPath(
  points: number[],
  width: number,
  height: number,
  padding: number
): string {
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;
  const midY = padding + plotH / 2;
  const amp = plotH / 2;

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const x = padding + (i / (points.length - 1)) * plotW;
    const y = midY - points[i] * amp;
    if (i === 0) {
      d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return d;
}

/**
 * Synthesizes time-domain waveform coordinates for visualizer display
 * @param sliceIndex index of current slice (0..23)
 * @param morph morph sweep value (0..1)
 * @param harmonics harmonic cutoff ratio (0..1)
 * @param numPoints number of evaluation points along 1 cycle (default 64)
 * @returns normalized waveform sample points in [-1.0, 1.0]
 */
export function computeWavetableTimeDomain(
  sliceIndex: number,
  morph = 0,
  harmonics = 1.0,
  numPoints = 64
): number[] {
  const clampedIdx = Math.max(0, Math.min(23, Math.floor(sliceIndex)));
  const nextIdx = Math.min(23, clampedIdx + 1);
  return synthesizeMorphedTimeDomain(
    WAVETABLE_DEFINITIONS[clampedIdx],
    WAVETABLE_DEFINITIONS[nextIdx],
    morph,
    harmonics,
    numPoints
  );
}

/**
 * Generates an SVG path data string for a compact preview oscilloscope
 * @param sliceIndex index of current slice (0..23)
 * @param width target width in pixels (default 64)
 * @param height target height in pixels (default 28)
 * @param padding padding around the plot (default 2)
 */
export function generateWavetablePreviewSvgPath(
  sliceIndex: number,
  width = 64,
  height = 28,
  padding = 2
): string {
  const points = computeWavetableTimeDomain(sliceIndex, 0, 1.0, 48);
  return formatPreviewSvgPath(points, width, height, padding);
}

/**
 * Curated 8 Multi-frame Sound Therapy Wavetable Banks with coherent physical evolutions.
 * Each Wavetable contains an ordered set of harmonic slice frames.
 */
export const MULTI_FRAME_WAVETABLES: MultiFrameWavetable[] = [
  {
    id: 0,
    name: 'Classic Shapes',
    category: 'Pure Roots',
    sliceIndices: [0, 1, 3, 2], // Sinusoid -> Triangle -> Sawtooth -> Square
    description: 'Analog baseline morphing from pure sine to bright square'
  },
  {
    id: 1,
    name: 'Tibetan Bowls',
    category: 'Singing Bowls',
    sliceIndices: [4, 5, 6, 7], // Bowl Root -> Bowl 3rd -> Temple Bell -> Himalayan Gong
    description: 'Sacred singing bowl resonances and harmonic overtone clusters'
  },
  {
    id: 2,
    name: 'Vocal Formants',
    category: 'Vocal Formants',
    sliceIndices: [8, 9, 10, 11], // Throat Ohm -> Vocal Aah -> Chest Ooh -> Whisper
    description: 'Organic human vocal resonances from deep chant to ethereal whisper'
  },
  {
    id: 3,
    name: 'Bell & Metallic',
    category: 'Bell & Metallic',
    sliceIndices: [21, 6, 17, 7], // Bell Overtones -> Temple Bell -> Metallic FM -> Himalayan Gong
    description: 'Crisp overtone chimes, temple bronzes, and metallic FM textures'
  },
  {
    id: 4,
    name: 'Spectral Textures',
    category: 'Spectral Textures',
    sliceIndices: [12, 13, 14, 20], // Organ Stack -> Velvet -> Comb Space -> Shimmer Prism
    description: 'Rich harmonic stacks, comb-filtered spaces, and prism shimmer'
  },
  {
    id: 5,
    name: 'Warm Analog Tape',
    category: 'Warm Analog',
    sliceIndices: [18, 22, 15, 19], // Sub Sine -> Tape Saturator -> Pulse Width 25% -> Bitcrush
    description: 'Deep analog foundations with tape saturation and subtle grit'
  },
  {
    id: 6,
    name: 'Cosmic Ethereal',
    category: 'Spectral Textures',
    sliceIndices: [0, 11, 20, 23], // Sine -> Whisper -> Shimmer Prism -> Cosmic Drone
    description: 'Atmospheric ambient sweeps for deep meditative floating states'
  },
  {
    id: 7,
    name: 'Deep Meditation',
    category: 'Singing Bowls',
    sliceIndices: [18, 4, 8, 23], // Sub Sine -> Bowl Root -> Throat Chant -> Cosmic Drone
    description: 'Grounding low frequencies blended with sacred bowls and throat drones'
  }
];

/**
 * Resolves continuous internal position (0..1) within a MultiFrameWavetable to dual slice indices and morph alpha.
 */
export function resolveMultiFramePosition(
  tableIndex: number,
  internalPos: number
): {
  table: MultiFrameWavetable;
  segIdx: number;
  slice1Idx: number;
  slice2Idx: number;
  alpha: number; // 0..1 crossfade between slice1 and slice2
  scaledPos: number; // Position scaled to (numSlices - 1)
} {
  const safeTableIdx = Number.isFinite(tableIndex) ? Math.floor(tableIndex) : 0;
  const clampedTableIdx = Math.max(0, Math.min(MULTI_FRAME_WAVETABLES.length - 1, safeTableIdx));
  const table = MULTI_FRAME_WAVETABLES[clampedTableIdx] ?? MULTI_FRAME_WAVETABLES[0];
  const numSlices = Math.max(2, table.sliceIndices.length);
  const safePos = Number.isFinite(internalPos) ? Math.max(0, Math.min(1.0, internalPos)) : 0.0;

  // Scale continuous position across (numSlices - 1) segment gaps
  const scaledPos = safePos * (numSlices - 1);
  const segIdx = Math.max(0, Math.min(numSlices - 2, Math.floor(scaledPos)));
  const alpha = Math.max(0, Math.min(1.0, scaledPos - segIdx));

  const slice1Idx = table.sliceIndices[segIdx] ?? 0;
  const slice2Idx = table.sliceIndices[Math.min(numSlices - 1, segIdx + 1)] ?? 0;

  return { table, segIdx, slice1Idx, slice2Idx, alpha, scaledPos };
}

/**
 * Computes time domain waveform points for a multi-frame wavetable at internal position (0..1)
 */
export function computeMultiFrameTimeDomain(
  tableIndex: number,
  internalPos: number,
  harmonics = 1.0,
  numPoints = 64
): number[] {
  const { slice1Idx, slice2Idx, alpha } = resolveMultiFramePosition(tableIndex, internalPos);
  const def1 = WAVETABLE_DEFINITIONS[slice1Idx] ?? WAVETABLE_DEFINITIONS[0];
  const def2 = WAVETABLE_DEFINITIONS[slice2Idx] ?? WAVETABLE_DEFINITIONS[0];
  return synthesizeMorphedTimeDomain(def1, def2, alpha, harmonics, numPoints);
}

/**
 * Generates an SVG path data string for a compact multi-frame wavetable preview
 */
export function generateMultiFramePreviewSvgPath(
  tableIndex: number,
  width = 64,
  height = 28,
  padding = 2
): string {
  const points = computeMultiFrameTimeDomain(tableIndex, 0.5, 1.0, 48);
  return formatPreviewSvgPath(points, width, height, padding);
}
