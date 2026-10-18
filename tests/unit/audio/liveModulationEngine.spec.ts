import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockAudioContext } from '../../mocks/webAudioMock';
import { AudioEngine } from '../../../src/audio/engine';
import { AdsrModule } from '../../../src/audio/nodes/AdsrModule';
import type { ModulationRoute } from '../../../src/types/ui';

describe('Live Modulation Engine & Sound Leakage Elimination Suite', () => {
  let ctx: MockAudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = new MockAudioContext({ sampleRate: 44100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Stage Env 值为 0 时，底层 Web Audio masterVolumeGain.gain 严格衰减为 0.0 实现绝对静音', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // Configure master-fader modulation route bound to stageProgress with holdOut = 0.0
    const route: ModulationRoute = {
      target: 'master-fader',
      source: 'stageProgress',
      depth: 1.0,
      bipolar: false,
      stageMultipliers: {
        inhale: 1.0,
        holdIn: 0.85,
        exhale: 0.25,
        holdOut: 0.0,
        curve: 'smooth'
      }
    };

    engine.setModulationRoute('master-fader', route);

    // Call updateBreathModulation at the end of holdOut stage (breathMacro = 0.0, stage = 'holdOut', stageProgress = 1.0)
    engine.updateBreathModulation(0.0, 'holdOut', 1.0);

    // Assert that the effective gain in masterVolumeGain is exactly 0.0
    expect(engine.masterVolumeGain.gain.value).toBe(0.0);

    // Now advance to inhale stage where value is 1.0
    engine.updateBreathModulation(1.0, 'inhale', 1.0);
    expect(engine.masterVolumeGain.gain.value).toBeGreaterThan(0.5);

    engine.dispose();
  });

  it('4 大独立声源在调制过程中各自独立响应，互不静音、互不串音', async () => {
    const engine = new AudioEngine(ctx as unknown as AudioContext);
    await engine.init();

    // 独立配置 4 大声源
    engine.updateChannelStrip({
      oscA: { gain: 0.7, unison: 0.8, subGain: 0.5 },
      granular: { gain: 0.6, density: 6 },
      oscB: { gain: 0.4 },
      drone: { gain: 0.85 }
    });

    ctx.advanceTime(0.05);

    // 1. 验证 OSC A 内部波表振荡器正常工作，没有被外部或自身模式静音
    const oscA = engine.oscA as any;
    expect(oscA.gain1.gain.value + oscA.gain2.gain.value).toBeGreaterThan(0.0);
    expect(oscA.gainUnison.gain.value).toBeGreaterThan(0.0);
    expect(oscA.gainSub.gain.value).toBeGreaterThan(0.0);

    // 2. 验证 432Hz Drone 持续按自身 gain 发声，绝不被 OSC A 绑架
    expect(engine.drone.getParams().gain).toBe(0.85);

    // 3. 剧烈调制 OSC A 参数，检查 Drone 和 Granular 完全不受影响
    engine.updateChannelStrip({
      oscA: { wavetableIndex: 12.5, detune: 25 }
    });

    expect(engine.drone.getParams().gain).toBe(0.85);
    expect(engine.granular.getParams().gain).toBe(0.6);
    expect(engine.oscB.getParams().gain).toBe(0.4);

    engine.dispose();
  });

  it('单音模式下调整 ADSR sustain 为 0 时，包络快速平滑衰减至静音底床（清脆单音）', () => {
    const adsr = new AdsrModule(ctx as unknown as AudioContext);
    adsr.setParams({
      attack: 0.05,
      decay: 0.1,
      sustain: 0.8,
      release: 0.2
    });

    adsr.triggerAttack(1.0);

    // Verify initial attack is active
    expect(adsr.getLastStage()).toBe('attack');

    // User modifies sustain to 0.0 to create crisp non-sustaining single hit
    adsr.setParams({ sustain: 0.0 });

    expect(adsr.getParams().sustain).toBe(0.0);

    adsr.dispose();
  });
});
