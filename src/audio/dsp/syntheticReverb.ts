/**
 * Synhale 2 - Mathematical Synthetic Impulse Response Generator
 * 
 * Synthesizes diffuse Gaussian decaying reverberation impulse responses directly in memory.
 * Eliminates external WAV asset dependencies while enabling real-time decay and damping adaptation.
 */

/**
 * Computes equal-power crossfade gains for dry and wet audio paths
 * Preserves perceived loudness across the 0% to 100% mix range.
 */
export function computeEqualPowerMix(mix: number): { dry: number; wet: number } {
  const safeMix = Number.isFinite(mix) ? Math.max(0, Math.min(1, mix)) : 0.5;
  const angle = safeMix * (Math.PI / 2);
  return {
    dry: Math.cos(angle),
    wet: Math.sin(angle)
  };
}

/**
 * Generates stereo synthetic impulse response buffer with exponential decay and frequency damping
 * @param ctx BaseAudioContext
 * @param decayTime T60 decay time in seconds (0.5 to 12.0)
 * @param damping High frequency damping ratio (0 = bright air, 1 = heavy absorption)
 */
export function generateSyntheticImpulseResponse(
  ctx: BaseAudioContext,
  decayTime = 2.5,
  damping = 0.5
): AudioBuffer {
  const sampleRate = ctx && Number.isFinite(ctx.sampleRate) && ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
  const safeDecay = Number.isFinite(decayTime) ? Math.max(0.2, Math.min(20.0, decayTime)) : 2.5;
  const safeDamping = Number.isFinite(damping) ? Math.max(0, Math.min(1, damping)) : 0.5;

  // Buffer length: clamped to decayTime, max 10 seconds to prevent excessive memory allocations
  const duration = Math.min(10.0, Math.max(0.2, safeDecay));
  const length = Math.max(128, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(2, length, sampleRate);

  // 1st-order recursive decay multiplier: alpha = exp(-ln(1000) / (decay * Fs))
  // T60 corresponds to -60dB, where ln(0.001) = -6.907755
  const decayMultiplier = Math.exp(-6.907755 / (safeDecay * sampleRate));

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let filterState = 0;
    let envelope = 1.0;
    const baseDamp = 0.2 + safeDamping * 0.75;

    for (let i = 0; i < length; i++) {
      // Fast pseudo-white noise with 1-pole progressive lowpass absorption
      const white = Math.random() * 2 - 1;
      filterState = (1 - baseDamp) * white + baseDamp * filterState;
      data[i] = filterState * envelope;
      envelope *= decayMultiplier;
    }

    // Peak amplitude normalization to ~0.95
    let maxAmp = 0;
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0) {
      const norm = 0.95 / maxAmp;
      for (let i = 0; i < length; i++) {
        data[i] *= norm;
      }
    }
  }

  return buffer;
}
