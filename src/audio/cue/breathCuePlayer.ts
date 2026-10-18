/**
 * Synhale 2 - Natural Acoustic Sampled & Synthesized Cue Player
 * 
 * Supports playing high-fidelity, organic natural acoustic recordings:
 * - singingBowl: Authentic Tibetan Singing Bowl tap & rich overtone decay (/audio/cues/singingBowl.ogg)
 * - zenWaterDrop: Natural clear spring droplet recording (/audio/cues/zenWaterDrop.ogg)
 * - woodenTemple: Zen temple bronze gong & wooden chime (/audio/cues/woodenTemple.ogg)
 * - crystalHarmonics: Ethereal metallic wind chime harmonics (/audio/cues/crystalHarmonics.ogg)
 * - deepSubPing: Deep resonance large singing bowl sub fundamental (/audio/cues/deepSubPing.ogg)
 * 
 * Features:
 * - Dual-layer architecture: Cached AudioBuffer playback with seamless synthetic fallback
 * - Anti-pop 5ms attack envelope and smooth release
 * - Single shared fallback AudioContext to eliminate context leakage
 */

import { CUE_PRESETS, type BreathCuePresetId } from './breathCueConfig';

// In-memory cache for decoded AudioBuffer natural samples
const sampleBufferCache = new Map<string, AudioBuffer>();
const pendingSampleFetches = new Map<string, Promise<AudioBuffer | null>>();

// Shared fallback AudioContext singleton (avoid browser context limit)
let sharedFallbackContext: AudioContext | null = null;

function getSharedContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!sharedFallbackContext || sharedFallbackContext.state === 'closed') {
    sharedFallbackContext = new AudioCtxClass();
  }
  return sharedFallbackContext;
}

/**
 * Normalizes sample URLs to ensure compatibility with Electron (file:// protocol)
 * as well as web HTTP dev/production servers.
 */
export function resolveSafeSampleUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return '.' + rawUrl;
  }
  return rawUrl;
}

/**
 * Asynchronously fetch and decode an acoustic sample into memory cache
 */
export async function loadCueSampleBuffer(
  rawSampleUrl: string,
  ctx: BaseAudioContext
): Promise<AudioBuffer | null> {
  const sampleUrl = resolveSafeSampleUrl(rawSampleUrl);
  if (sampleBufferCache.has(sampleUrl)) {
    return sampleBufferCache.get(sampleUrl) || null;
  }
  if (sampleBufferCache.has(rawSampleUrl)) {
    return sampleBufferCache.get(rawSampleUrl) || null;
  }

  if (pendingSampleFetches.has(sampleUrl)) {
    return pendingSampleFetches.get(sampleUrl)!;
  }

  const fetchPromise = (async () => {
    try {
      if (typeof fetch === 'undefined') return null;
      const res = await fetch(sampleUrl);
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      // Decode audio data safely
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      sampleBufferCache.set(sampleUrl, audioBuf);
      sampleBufferCache.set(rawSampleUrl, audioBuf);
      return audioBuf;
    } catch {
      return null;
    } finally {
      pendingSampleFetches.delete(sampleUrl);
    }
  })();

  pendingSampleFetches.set(sampleUrl, fetchPromise);
  return fetchPromise;
}

/**
 * Preload all natural sound cue samples in the background
 */
export function preloadAllCueSounds(externalCtx?: BaseAudioContext | null): void {
  const ctx = externalCtx || getSharedContext();
  if (!ctx) return;

  Object.values(CUE_PRESETS).forEach(preset => {
    if (preset.sampleUrl) {
      loadCueSampleBuffer(preset.sampleUrl, ctx).catch(() => {});
    }
  });
}

function playSingleOscFallback(
  ctx: BaseAudioContext,
  masterGain: GainNode,
  now: number,
  opts: {
    oscType: OscillatorType;
    freqStart: number;
    freqEnd?: { val: number; dur: number };
    filterType: BiquadFilterType;
    filterFreq: number;
    filterQ?: number;
    peakGain: number;
    attackDur: number;
    releaseDur: number;
    stopDur: number;
  }
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = opts.oscType;
  osc.frequency.setValueAtTime(opts.freqStart, now);
  if (opts.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd.val, now + opts.freqEnd.dur);
  }

  filter.type = opts.filterType;
  filter.frequency.setValueAtTime(opts.filterFreq, now);
  if (opts.filterQ !== undefined) {
    filter.Q.setValueAtTime(opts.filterQ, now);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(opts.peakGain, now + opts.attackDur);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.releaseDur);

  osc.connect(gain);
  gain.connect(filter);
  filter.connect(masterGain);

  masterGain.gain.setValueAtTime(1.0, now);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
      filter.disconnect();
      masterGain.disconnect();
    } catch {}
  };
  osc.start(now);
  osc.stop(now + opts.stopDur);
}

/**
 * Synthesize graceful acoustic non-harsh fallback tone
 */
function playSyntheticFallback(
  preset: BreathCuePresetId,
  normVol: number,
  ctx: BaseAudioContext
): void {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.connect(ctx.destination);

  switch (preset) {
    case 'singingBowl': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(432, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1192, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      const peakGain = normVol * 0.45;
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(peakGain, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(peakGain * 0.22, now + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.50);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(filter);
      gain2.connect(filter);
      filter.connect(masterGain);

      masterGain.gain.setValueAtTime(1.0, now);
      osc1.onended = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          gain1.disconnect();
          gain2.disconnect();
          filter.disconnect();
          masterGain.disconnect();
        } catch {}
      };
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
      break;
    }

    case 'zenWaterDrop':
      playSingleOscFallback(ctx, masterGain, now, {
        oscType: 'sine',
        freqStart: 520,
        freqEnd: { val: 760, dur: 0.06 },
        filterType: 'lowpass',
        filterFreq: 1400,
        peakGain: normVol * 0.4,
        attackDur: 0.003,
        releaseDur: 0.22,
        stopDur: 0.25
      });
      break;

    case 'woodenTemple':
      playSingleOscFallback(ctx, masterGain, now, {
        oscType: 'triangle',
        freqStart: 324,
        filterType: 'lowpass',
        filterFreq: 650,
        peakGain: normVol * 0.42,
        attackDur: 0.004,
        releaseDur: 0.28,
        stopDur: 0.32
      });
      break;

    case 'crystalHarmonics':
      playSingleOscFallback(ctx, masterGain, now, {
        oscType: 'sine',
        freqStart: 864,
        filterType: 'bandpass',
        filterFreq: 864,
        filterQ: 3.5,
        peakGain: normVol * 0.35,
        attackDur: 0.008,
        releaseDur: 0.7,
        stopDur: 0.75
      });
      break;

    case 'deepSubPing':
      playSingleOscFallback(ctx, masterGain, now, {
        oscType: 'sine',
        freqStart: 108,
        filterType: 'lowpass',
        filterFreq: 320,
        peakGain: normVol * 0.55,
        attackDur: 0.005,
        releaseDur: 0.45,
        stopDur: 0.5
      });
      break;
  }
}

/**
 * Play loaded AudioBuffer with anti-pop attack and generous release fade
 */
function playBuffer(
  cachedBuffer: AudioBuffer,
  normVol: number,
  ctx: BaseAudioContext
): void {
  const source = ctx.createBufferSource();
  source.buffer = cachedBuffer;

  const gainNode = ctx.createGain();
  const now = ctx.currentTime;
  const MAX_CUE_DURATION = 7.0;
  const playDur = Math.min(cachedBuffer.duration, MAX_CUE_DURATION);
  const fadeDuration = 1.0; // 1.0s generous smooth release fade
  const fadeStart = Math.max(0.1, playDur - fadeDuration);

  // Gentle anti-pop soft attack & volume scaling
  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(normVol * 0.85, now + 0.008);
  // Gentle natural fade out before hard cutoff, preventing click and overlap
  gainNode.gain.setValueAtTime(normVol * 0.85, now + fadeStart);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + playDur);

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.onended = () => {
    try {
      source.disconnect();
      gainNode.disconnect();
    } catch {}
  };
  source.start(now);
  source.stop(now + playDur);
}

/**
 * Play a non-harsh breath transition cue sound using natural sample or fallback
 * @param preset Selected cue sound preset
 * @param volume Master gain for the cue [0.0 .. 1.0]
 * @param externalCtx Optional shared AudioContext
 */
export function playCueSound(
  preset: BreathCuePresetId,
  volume = 0.35,
  externalCtx?: BaseAudioContext | null
): void {
  const normVol = Math.max(0, Math.min(1, volume));
  if (normVol <= 0.001) return;

  try {
    const ctx = externalCtx || getSharedContext();
    if (!ctx) return;

    if (ctx.state === 'suspended' && 'resume' in ctx && typeof (ctx as any).resume === 'function') {
      (ctx as any).resume().catch(() => {});
    }

    const presetMeta = CUE_PRESETS[preset];
    const sampleUrl = presetMeta?.sampleUrl;
    const safeUrl = sampleUrl ? resolveSafeSampleUrl(sampleUrl) : null;
    const cachedBuffer =
      (safeUrl ? sampleBufferCache.get(safeUrl) : null) ||
      (sampleUrl ? sampleBufferCache.get(sampleUrl) : null);

    if (cachedBuffer) {
      // 1. Instant playback of cached authentic natural recording
      playBuffer(cachedBuffer, normVol, ctx);
    } else if (safeUrl && typeof fetch !== 'undefined') {
      // 2. Pre-cache not ready yet: Fetch and decode real recording on the fly,
      // and play it immediately without playing obsolete synthetic oscillator tones!
      loadCueSampleBuffer(safeUrl, ctx)
        .then(audioBuf => {
          if (audioBuf) {
            playBuffer(audioBuf, normVol, ctx);
          } else {
            playSyntheticFallback(preset, normVol, ctx);
          }
        })
        .catch(() => {
          playSyntheticFallback(preset, normVol, ctx);
        });
    } else {
      // 3. Fallback for offline / headless test environments without fetch
      playSyntheticFallback(preset, normVol, ctx);
    }
  } catch {
    // Graceful fallback for headless or restricted environments
  }
}
