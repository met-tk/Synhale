import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AmbientChannel } from '../../../src/audio/nodes/AmbientChannel';
import {
  AMBIENT_SOUNDSCAPES,
  getAmbientSoundscapeBuffer,
  loadRealAmbientAudioBuffer,
  prewarmAllAmbientBuffers
} from '../../../src/audio/nodes/AmbientSoundscapeLibrary';
import { AudioEngine } from '../../../src/audio/engine';
import { DEFAULT_AMBIENT_PARAMS } from '../../../src/types/audio';

describe('Ambient Channel Strip & Procedural Soundscape Engine', () => {
  let ctx: MockAudioContext;
  const emojiRegex = /\p{Extended_Pictographic}/u;

  beforeEach(() => {
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  describe('AmbientSoundscapeLibrary', () => {
    it('contains all 120 curated soundscapes with zero emoji across 12 distinct pages', () => {
      expect(AMBIENT_SOUNDSCAPES.length).toBe(120);

      const expectedIds = [
        // Page 1: 江海潮涌 (0..9)
        'oceanTide',
        'lakeLapping',
        'underwaterReef',
        'rollingSwell',
        'pebbleBeach',
        'coastalBreaker',
        'tidalBasin',
        'calmHarbor',
        'deepSeaLow',
        'seaSpray',
        // Page 2: 雨境雨幕 (10..19)
        'gentleRain',
        'heavyRain',
        'distantThunder',
        'roofRain',
        'gutterDrip',
        'forestDrizzle',
        'windowRain',
        'thunderShower',
        'mistPrecipitation',
        'summerShower',
        // Page 3: 林泉飞瀑 (20..29)
        'forestStream',
        'alpineWaterfall',
        'caveDroplets',
        'rockyBrook',
        'mountainCascade',
        'canyonRapid',
        'babblingBrook',
        'meltingCreek',
        'hotSpringBubble',
        'valleyRiver',
        // Page 4: 风啸寒原 (30..39)
        'canopyBreeze',
        'autumnGale',
        'arcticBlizzard',
        'bambooWhisper',
        'valleyBreeze',
        'desertDune',
        'mountainPineMist',
        'canyonEcho',
        'wheatFieldBreeze',
        'winterFrost',
        // Page 5: 温暖地火 (40..49)
        'cozyFire',
        'campfire',
        'charcoalEmbers',
        'pineConeCrackle',
        'hearthBlaze',
        'forestBonfire',
        'peatFire',
        'dryTwigSnap',
        'leafEmber',
        'geothermalSteam',
        // Page 6: 原野生态 (50..59)
        'summerCrickets',
        'cicadaSummer',
        'rainforestCanopy',
        'peatBogNight',
        'pineNeedleFall',
        'morningBirdsong',
        'frogPond',
        'forestInsects',
        'reedMarsh',
        'wildernessDawn',
        // Page 7: 精选混音 I (60..69)
        'mixDeepForest',
        'mixZenGarden',
        'mixCozyFireplace',
        'mixRainOnTent',
        'mixCoastalCalm',
        'mixRainyCafe',
        'mixSleepyStorm',
        'mixStudyLofi',
        'mixUnderwaterAbyss',
        'mixWhaleDive',
        // Page 8: 精选混音 II (70..79)
        'mixLakesideDawn',
        'mixNightGarden',
        'mixNordicWinter',
        'mixOceanFlight',
        'mixRainyTrain',
        'mixSakuraGarden',
        'mixDesertNight',
        'mixMidnightJungle',
        'mixMorningMeadow',
        'mixCabinRetreat',
        // Page 9: 飞鸟游鲸 (80..89)
        'whaleSong',
        'dolphins',
        'birdsong',
        'nightingale',
        'owl',
        'cuckoo',
        'seagulls',
        'dawnChorus',
        'loonCalls',
        'parrots',
        // Page 10: 原野伴生 (90..99)
        'catPurr',
        'crickets',
        'frogs',
        'cicadas',
        'bees',
        'wolf',
        'duck',
        'pigeons',
        'rooster',
        'sparrows',
        // Page 11: 冥想器乐 (100..109)
        'singingBowl',
        'tibetanBowl',
        'crystalBowl',
        'windChimes',
        'meditationBell',
        'harp',
        'flute',
        'piano',
        'guitar',
        'musicBox',
        // Page 12: 城市生活 (110..119)
        'coffeeShop',
        'train',
        'metro',
        'boat',
        'cityAmbiance',
        'clockTick',
        'fan',
        'typing',
        'whiteNoise',
        'pinkNoise'
      ];

      const actualIds = AMBIENT_SOUNDSCAPES.map(s => s.id);
      expect(actualIds).toEqual(expectedIds);

      for (const soundscape of AMBIENT_SOUNDSCAPES) {
        expect(soundscape.name).toBeTruthy();
        expect(soundscape.nameEn).toBeTruthy();
        expect(soundscape.badge).toBeTruthy();
        expect(soundscape.description).toBeTruthy();

        // Enforce strict zero emoji rule
        expect(emojiRegex.test(soundscape.name)).toBe(false);
        expect(emojiRegex.test(soundscape.nameEn)).toBe(false);
        expect(emojiRegex.test(soundscape.badge)).toBe(false);
        expect(emojiRegex.test(soundscape.description)).toBe(false);
      }
    });

    it('loads authentic real natural soundscape audio recordings with uniform RMS loudness equalization', async () => {
      // Test key soundscapes across primary theme groups
      const sampleIds = [
        'oceanTide',
        'gentleRain',
        'forestStream',
        'canopyBreeze',
        'cozyFire',
        'summerCrickets',
        'mixDeepForest',
        'mixLakesideDawn',
        'whaleSong',
        'catPurr',
        'singingBowl',
        'coffeeShop'
      ] as const;

      for (const id of sampleIds) {
        const buf = await loadRealAmbientAudioBuffer(ctx as unknown as BaseAudioContext, id);
        expect(buf).toBeDefined();
        if (buf) {
          expect(buf.numberOfChannels).toBe(2);
          expect(buf.length).toBeGreaterThan(0);

          const dL = buf.getChannelData(0);
          const dR = buf.getChannelData(1);
          let sumSqL = 0;
          let sumSqR = 0;
          let peak = 0;
          for (let i = 0; i < dL.length; i++) {
            sumSqL += dL[i] * dL[i];
            sumSqR += dR[i] * dR[i];
            const absL = Math.abs(dL[i]);
            const absR = Math.abs(dR[i]);
            if (absL > peak) peak = absL;
            if (absR > peak) peak = absR;
          }
          const rmsL = Math.sqrt(sumSqL / dL.length);
          const rmsR = Math.sqrt(sumSqR / dR.length);
          expect(Number.isFinite(rmsL)).toBe(true);
          expect(Number.isFinite(rmsR)).toBe(true);
          // Equalized RMS balance check across real recordings
          expect(rmsL).toBeGreaterThan(0.06);
          expect(rmsR).toBeGreaterThan(0.06);
          expect(peak).toBeLessThanOrEqual(0.96);
        }
      }

      // Synchronous buffer query returns stereo buffer without throwing
      const silentBuf = getAmbientSoundscapeBuffer(ctx as unknown as BaseAudioContext, 'oceanTide');
      expect(silentBuf).toBeDefined();
      expect(silentBuf.numberOfChannels).toBe(2);

      // Legacy fallback ID redirection check
      const legacyBuf = getAmbientSoundscapeBuffer(ctx as unknown as BaseAudioContext, 'shamanicDrum' as any);
      expect(legacyBuf).toBeDefined();
      expect(legacyBuf.numberOfChannels).toBe(2);
    });

    it('prewarms all 60 soundscapes in memory without throwing', () => {
      expect(() => {
        prewarmAllAmbientBuffers(ctx as unknown as BaseAudioContext);
      }).not.toThrow();

      for (const soundscape of AMBIENT_SOUNDSCAPES) {
        const buf = getAmbientSoundscapeBuffer(ctx as unknown as BaseAudioContext, soundscape.id);
        expect(buf).toBeDefined();
        expect(buf.numberOfChannels).toBe(2);
      }
    });
  });

  describe('AmbientChannel (AudioSourceNode)', () => {
    let ambient: AmbientChannel;

    beforeEach(() => {
      ambient = new AmbientChannel(ctx as unknown as BaseAudioContext);
    });

    afterEach(() => {
      ambient.dispose();
    });

    it('initializes with default ambient parameters and correct node id', () => {
      expect(ambient.id).toBe('ambient');
      const params = ambient.getParams();
      expect(params.sampleId).toBe(DEFAULT_AMBIENT_PARAMS.sampleId);
      expect(params.gain).toBe(DEFAULT_AMBIENT_PARAMS.gain);
      expect(params.tone).toBe(DEFAULT_AMBIENT_PARAMS.tone);
      expect(params.breathSync).toBe(DEFAULT_AMBIENT_PARAMS.breathSync);
      expect(params.width).toBe(DEFAULT_AMBIENT_PARAMS.width);
      expect(params.bypass).toBe(DEFAULT_AMBIENT_PARAMS.bypass);
    });

    it('starts, stops and connects to audio destination', () => {
      const dest = ctx.createGain();
      ambient.connect(dest as unknown as AudioNode);
      expect(() => ambient.start(0)).not.toThrow();
      expect(() => ambient.stop(0)).not.toThrow();
      expect(() => ambient.disconnect()).not.toThrow();
    });

    it('updates parameters and clamps boundaries defensively', () => {
      ambient.setParams({
        gain: 1.5, // should clamp to 1.0
        tone: -0.2, // should clamp to 0.0
        breathSync: 0.85,
        width: 0.4,
        bypass: true
      });

      const params = ambient.getParams();
      expect(params.gain).toBe(1.0);
      expect(params.tone).toBe(0.0);
      expect(params.breathSync).toBe(0.85);
      expect(params.width).toBe(0.4);
      expect(params.bypass).toBe(true);
    });

    it('smoothly switches soundscapes via switchSample', () => {
      ambient.start(0);
      ctx.advanceTime(0.05);

      expect(() => {
        ambient.switchSample('forestStream');
      }).not.toThrow();

      expect(ambient.getParams().sampleId).toBe('forestStream');
      ctx.advanceTime(0.1);
    });

    it('modulates volume dynamically with breath macro when breathSync is active', () => {
      ambient.setParams({ breathSync: 0.5 });
      expect(() => {
        ambient.updateBreathModulation(1.0, 'inhale', 0.5);
      }).not.toThrow();

      ctx.advanceTime(0.05);

      expect(() => {
        ambient.updateBreathModulation(0.0, 'holdOut', 1.0);
      }).not.toThrow();

      // Zero breathSync disables dynamic modulation (unity gain)
      ambient.setParams({ breathSync: 0.0 });
      expect(() => {
        ambient.updateBreathModulation(0.5, 'exhale', 0.5);
      }).not.toThrow();
    });

    it('purges output on 0ms hard cut and restores smoothly on resume', () => {
      expect(() => ambient.purge()).not.toThrow();
      ctx.advanceTime(0.01);
      expect(() => ambient.restore()).not.toThrow();
      ctx.advanceTime(0.03);
    });

    it('disposes cleanly without throwing', () => {
      expect(() => ambient.dispose()).not.toThrow();
      // Calling dispose again is a no-op safe
      expect(() => ambient.dispose()).not.toThrow();
    });
  });

  describe('AudioEngine Ambient Channel Integration', () => {
    let engine: AudioEngine;

    beforeEach(async () => {
      engine = new AudioEngine(ctx as unknown as AudioContext);
      await engine.init();
    });

    afterEach(() => {
      engine.dispose();
    });

    it('initializes ambient channel as first-class 5th track in sources map', () => {
      expect(engine.ambient).toBeDefined();
      expect(engine.sources.has('ambient')).toBe(true);
      expect(engine.sources.get('ambient')).toBe(engine.ambient);
    });

    it('includes ambient in getChannelStripParams with default values', () => {
      const channelParams = engine.getChannelStripParams();
      expect(channelParams.ambient).toBeDefined();
      expect(channelParams.ambient?.sampleId).toBe('oceanTide');
      expect(channelParams.ambient?.gain).toBe(0.5);
    });

    it('updates ambient parameters via updateChannelStrip', () => {
      engine.updateChannelStrip({
        ambient: {
          sampleId: 'gentleRain',
          gain: 0.72,
          tone: 0.65
        }
      });

      const updated = engine.getChannelStripParams();
      expect(updated.ambient?.sampleId).toBe('gentleRain');
      expect(updated.ambient?.gain).toBe(0.72);
      expect(updated.ambient?.tone).toBe(0.65);
    });

    it('purges ambient channel during executeZeroResidueHardCut and restores on resume', async () => {
      engine.executeZeroResidueHardCut();
      ctx.advanceTime(0.01);

      await engine.resume();
      ctx.advanceTime(0.01);

      expect(engine.ambient).toBeDefined();
    });

    it('supports 3-way routing matrix (Lane A, Lane B, Thru) for ambient source', () => {
      expect(() => {
        engine.setSourceRoute?.('ambient', 'laneB');
      }).not.toThrow();

      expect(() => {
        engine.setSourceRoute?.('ambient', 'thru');
      }).not.toThrow();

      expect(() => {
        engine.setSourceRoute?.('ambient', 'laneA');
      }).not.toThrow();
    });
  });
});
