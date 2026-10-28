/**
 * Synhale 2 - Audio Preload Orchestrator
 *
 * Coordinates eager loading of all real-recorded sample libraries so that the very first
 * playback session is free of "silent buffer → real buffer" crossfade artifacts and of
 * any decoding-induced main-thread jank (a known cause of audio glitches on Android WebView).
 *
 * Strategy:
 *  - Load the 6 primary Ambient soundscapes used by the default preset
 *  - Load all stock Granular samples (small one-shots)
 *  - Load the 4 noise floor buffers (pink/white/brown/violet)
 *  - Report aggregate progress (0..1) so the UI can render a deterministic loading bar
 *  - Never reject: individual failures are tolerated (the lazy fallback path still works)
 */

import { loadRealAmbientAudioBuffer } from './nodes/AmbientSoundscapeLibrary';
import { loadGranularSampleBuffer, GRANULAR_SAMPLE_PRESETS } from './nodes/GranularSampleLibrary';
import { loadRealNoiseBuffer } from './dsp/pinkNoise';

export interface PrewarmProgress {
  /** 0..1 overall progress */
  progress: number;
  /** Number of items finished so far */
  completed: number;
  /** Total number of items scheduled */
  total: number;
  /** Short human-readable label of the item currently loading (best-effort) */
  currentLabel: string;
}

const PRIMARY_AMBIENT_IDS = [
  'oceanTide',
  'gentleRain',
  'forestStream',
  'canopyBreeze',
  'cozyFire',
  'summerCrickets'
] as const;

const NOISE_TYPES = ['pink', 'white', 'brown', 'violet'] as const;

/**
 * Eagerly preloads every sample the default playback path might touch.
 * Resolves when all buffers are in cache (or have permanently failed).
 *
 * Safe to call multiple times — underlying libraries already dedupe in-flight loads
 * and skip cached entries.
 */
export async function prewarmAllAudioSamples(
  ctx: BaseAudioContext,
  onProgress?: (p: PrewarmProgress) => void
): Promise<void> {
  const granularIds = Object.keys(GRANULAR_SAMPLE_PRESETS);
  const total = PRIMARY_AMBIENT_IDS.length + granularIds.length + NOISE_TYPES.length;
  let completed = 0;

  const report = (label: string) => {
    onProgress?.({
      progress: total === 0 ? 1 : completed / total,
      completed,
      total,
      currentLabel: label
    });
  };

  const runOne = async (label: string, task: () => Promise<unknown>) => {
    report(label);
    try {
      await task();
    } catch {
      // Individual load failure is non-fatal — lazy fallback covers it at first use
    } finally {
      completed++;
      report(label);
    }
  };

  // Kick off in parallel; decoding is async and not bound by network on Capacitor.
  const jobs: Promise<void>[] = [];

  for (const id of PRIMARY_AMBIENT_IDS) {
    jobs.push(runOne(`ambient:${id}`, async () => {
      await loadRealAmbientAudioBuffer(ctx, id);
    }));
  }

  for (const id of granularIds) {
    jobs.push(runOne(`granular:${id}`, async () => {
      await loadGranularSampleBuffer(ctx, id);
    }));
  }

  for (const t of NOISE_TYPES) {
    jobs.push(runOne(`noise:${t}`, async () => {
      await loadRealNoiseBuffer(ctx, t);
    }));
  }

  await Promise.all(jobs);

  onProgress?.({
    progress: 1,
    completed: total,
    total,
    currentLabel: 'ready'
  });
}
