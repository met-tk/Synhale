/**
 * Synhale 2 - Paul Kellet 1/f Stereo Seamless Looping Pink Noise Generator
 * 
 * Pink noise has a power spectral density proportional to 1/f (-3dB/octave),
 * simulating fluid-dynamic airflow friction in the human respiratory airway.
 * Includes stereo decorrelation and seamless boundary crossfading to prevent clicks when looping.
 */

function sanitizeNoiseParams(ctx: BaseAudioContext, durationSeconds: number): { sampleRate: number; numSamples: number; safeDuration: number } {
  const sampleRate = ctx && Number.isFinite(ctx.sampleRate) && ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.min(60, durationSeconds) : 10;
  const numSamples = Math.max(128, Math.floor(sampleRate * safeDuration));
  return { sampleRate, numSamples, safeDuration };
}

function applyLoopCrossfade(data: Float32Array, sampleRate: number, safeDuration: number): void {
  // 50ms equal-power crossfade for 100% seamless looping without tail corruption
  const numSamples = data.length;
  const fadeDuration = Math.min(0.05, safeDuration * 0.25);
  const fadeSamples = Math.max(1, Math.floor(sampleRate * fadeDuration));
  for (let i = 0; i < fadeSamples; i++) {
    const angle = (i / fadeSamples) * (Math.PI / 2);
    const gHead = Math.sin(angle);
    const gTail = Math.cos(angle);
    const tailIdx = numSamples - fadeSamples + i;
    data[i] = data[i] * gHead + data[tailIdx] * gTail;
  }
}

export function generatePinkNoiseBuffer(ctx: BaseAudioContext, durationSeconds = 10): AudioBuffer {
  const { sampleRate, numSamples, safeDuration } = sanitizeNoiseParams(ctx, durationSeconds);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < numSamples; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.76160 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11;
    }

    applyLoopCrossfade(data, sampleRate, safeDuration);
  }

  return buffer;
}

export function generateWhiteNoiseBuffer(ctx: BaseAudioContext, durationSeconds = 10): AudioBuffer {
  const { sampleRate, numSamples, safeDuration } = sanitizeNoiseParams(ctx, durationSeconds);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }

    applyLoopCrossfade(data, sampleRate, safeDuration);
  }

  return buffer;
}

export function generateBrownNoiseBuffer(ctx: BaseAudioContext, durationSeconds = 10): AudioBuffer {
  const { sampleRate, numSamples, safeDuration } = sanitizeNoiseParams(ctx, durationSeconds);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lastOut = 0;
    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.035 * white) / 1.035;
      data[i] = lastOut * 1.6;
      sum += data[i];
    }

    // Zero-mean DC removal
    const dcOffset = sum / numSamples;
    for (let i = 0; i < numSamples; i++) {
      data[i] -= dcOffset;
    }

    applyLoopCrossfade(data, sampleRate, safeDuration);
  }

  return buffer;
}

export function generateVioletNoiseBuffer(ctx: BaseAudioContext, durationSeconds = 10): AudioBuffer {
  const { sampleRate, numSamples, safeDuration } = sanitizeNoiseParams(ctx, durationSeconds);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lastWhite = 0;
    for (let i = 0; i < numSamples; i++) {
      const white = Math.random() * 2 - 1;
      const violet = (white - lastWhite) * 0.22;
      lastWhite = white;
      data[i] = violet;
    }

    applyLoopCrossfade(data, sampleRate, safeDuration);
  }

  return buffer;
}

export function generateNoiseBufferByType(
  ctx: BaseAudioContext,
  type: 'pink' | 'white' | 'brown' | 'violet' = 'pink',
  durationSeconds = 10
): AudioBuffer {
  const cacheKey = `${type}_${ctx.sampleRate}`;
  if (realNoiseCache.has(cacheKey)) {
    return realNoiseCache.get(cacheKey)!;
  }

  switch (type) {
    case 'white':
      return generateWhiteNoiseBuffer(ctx, durationSeconds);
    case 'brown':
      return generateBrownNoiseBuffer(ctx, durationSeconds);
    case 'violet':
      return generateVioletNoiseBuffer(ctx, durationSeconds);
    case 'pink':
    default:
      return generatePinkNoiseBuffer(ctx, durationSeconds);
  }
}

const realNoiseCache = new Map<string, AudioBuffer>();
const inFlightLoads = new Map<string, Promise<AudioBuffer | null>>();

/**
 * Releases all cached noise AudioBuffers and cancels pending decode requests.
 * Called by AudioEngine.dispose() to prevent unbounded memory growth across
 * engine recreations (each new AudioContext may key on a different sampleRate).
 */
export function clearNoiseCache(): void {
  realNoiseCache.clear();
  // Pending loads will resolve into a null result; we do not abort in-flight
  // fetch/decode since the resulting buffer is simply not retained anymore.
  inFlightLoads.clear();
}

export async function loadRealNoiseBuffer(
  ctx: BaseAudioContext,
  type: 'pink' | 'white' | 'brown' | 'violet'
): Promise<AudioBuffer | null> {
  const cacheKey = `${type}_${ctx.sampleRate}`;
  if (realNoiseCache.has(cacheKey)) {
    return realNoiseCache.get(cacheKey)!;
  }
  if (inFlightLoads.has(cacheKey)) {
    return inFlightLoads.get(cacheKey)!;
  }

  const loadPromise = (async () => {
    if (typeof fetch === 'undefined') return null;
    const url = `/audio/noise/${type}_noise.mp3`;
    try {
      let res = await fetch('.' + url).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(url).catch(() => null);
      }
      if (res && res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (typeof ctx.decodeAudioData === 'function') {
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const safeDuration = decoded.duration;
          for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
            applyLoopCrossfade(decoded.getChannelData(ch), decoded.sampleRate, safeDuration);
          }
          realNoiseCache.set(cacheKey, decoded);
          return decoded;
        }
      }
    } catch {
      // Fall through to null
    }
    return null;
  })();

  inFlightLoads.set(cacheKey, loadPromise);
  try {
    const result = await loadPromise;
    return result;
  } finally {
    inFlightLoads.delete(cacheKey);
  }
}

