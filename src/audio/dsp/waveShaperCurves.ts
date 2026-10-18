/**
 * Synhale 2 - WaveShaper Saturation Curves and Gain Compensation
 * 
 * Provides soft-clipping and tape/tube harmonic saturation transfer functions.
 * All curves are strictly bounded within [-1.0, 1.0] and monotonic to prevent distortion foldback.
 */

export const DEFAULT_CURVE_SIZE = 2048;

function sanitizeCurveSize(nSamples: number): number {
  return Number.isFinite(nSamples) && nSamples >= 2 ? Math.floor(nSamples) : DEFAULT_CURVE_SIZE;
}

/**
 * Generates a tape warmth curve using hyperbolic tangent
 * f(x, k) = tanh(k * x) / tanh(k)
 */
export function generateTapeCurve(amount: number, nSamples = DEFAULT_CURVE_SIZE): Float32Array {
  const size = sanitizeCurveSize(nSamples);
  const curve = new Float32Array(size);
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const k = 1 + safeAmount * 8; // k in [1, 9]
  const denom = Math.tanh(k) || 1;

  for (let i = 0; i < size; i++) {
    const x = (i * 2) / (size - 1) - 1; // -1 to +1
    const y = Math.tanh(k * x) / denom;
    curve[i] = Math.max(-1, Math.min(1, y));
  }

  return curve;
}

/**
 * Generates an asymmetric vacuum tube saturation curve introducing 2nd-order even harmonics.
 * Employs branch-differing rational soft-clipping to guarantee strict monotonicity
 * (dy/dx > 0 everywhere) while avoiding quadratic foldback and polarity inversion.
 */
export function generateTubeCurve(amount: number, nSamples = DEFAULT_CURVE_SIZE): Float32Array {
  const size = sanitizeCurveSize(nSamples);
  const curve = new Float32Array(size);
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const drive = 1 + safeAmount * 5;
  const cp = 0.2; // Positive branch saturation factor
  const cn = 0.6; // Negative branch saturation factor (asymmetric compression)
  const norm = drive / (1 + cp * drive);

  for (let i = 0; i < size; i++) {
    const x = (i * 2) / (size - 1) - 1;
    const drivenX = x * drive;
    const y = drivenX >= 0
      ? drivenX / (1 + cp * drivenX)
      : drivenX / (1 + cn * Math.abs(drivenX));
    curve[i] = Math.max(-1, Math.min(1, y / norm));
  }

  return curve;
}

/**
 * Generates composite drive curve combining amount (drive level) and tone (spectral character)
 * @param amount 0..1 (0 = linear clean, 1 = heavy saturation)
 * @param tone 0..1 (0 = warm tape low-end roundness, 1 = bright tube harmonic sizzle)
 */
export function generateDriveCurve(
  amount: number,
  tone = 0.5,
  nSamples = DEFAULT_CURVE_SIZE
): Float32Array {
  const size = sanitizeCurveSize(nSamples);
  const clampedAmount = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  const clampedTone = Number.isFinite(tone) ? Math.max(0, Math.min(1, tone)) : 0.5;

  if (clampedAmount <= 0.0001) {
    // Pure linear passthrough
    const linear = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      linear[i] = (i * 2) / (size - 1) - 1;
    }
    return linear;
  }

  const blended = new Float32Array(size);
  const k = 1 + clampedAmount * 8;
  const tapeDenom = Math.tanh(k) || 1;
  const drive = 1 + clampedAmount * 5;
  const cp = 0.2;
  const cn = 0.6;
  const tubeNorm = drive / (1 + cp * drive);

  for (let i = 0; i < size; i++) {
    const linear = (i * 2) / (size - 1) - 1;
    const tapeVal = Math.max(-1, Math.min(1, Math.tanh(k * linear) / tapeDenom));
    const drivenX = linear * drive;
    const rawTube = drivenX >= 0
      ? drivenX / (1 + cp * drivenX)
      : drivenX / (1 + cn * Math.abs(drivenX));
    const tubeVal = Math.max(-1, Math.min(1, rawTube / tubeNorm));

    // Morph between tape (warm) and tube (bright)
    const saturated = tapeVal * (1 - clampedTone) + tubeVal * clampedTone;
    // Blend with clean signal based on amount
    const val = linear * (1 - clampedAmount) + saturated * clampedAmount;
    blended[i] = Math.max(-1, Math.min(1, val));
  }

  return blended;
}

/**
 * Computes automatic makeup gain compensation to prevent perceptual volume leaps when driving
 * G_comp = 1 / sqrt(1 + 0.6 * (effective_drive - 1))
 */
export function computeDriveMakeupGain(amount: number): number {
  const clamped = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  const effectiveDrive = 1 + clamped * 5; // maps 0..1 to 1..6
  return 1 / Math.sqrt(1 + 0.6 * (effectiveDrive - 1));
}
