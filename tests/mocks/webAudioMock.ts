/**
 * Synhale 2 - Deterministic Web Audio Mock Harness
 * Supports virtual clock stepping (advanceTime), real DSP calculations,
 * and standard W3C AudioParam automation curves for headless Vitest testing.
 */

export interface ScheduledEvent {
  type: 'setValue' | 'linearRamp' | 'exponentialRamp' | 'setTarget' | 'setValueCurve';
  value: number;
  time: number;
  timeConstant?: number;
  duration?: number;
  curve?: Float32Array;
  startVal?: number;
  startTime?: number;
}

export class MockAudioParam {
  private _value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  context?: MockAudioContext;
  private timeline: ScheduledEvent[] = [];
  private initialValue: number;
  private lastTime = 0;

  constructor(defaultValue: number, min = -Infinity, max = Infinity, context?: MockAudioContext) {
    this._value = defaultValue;
    this.defaultValue = defaultValue;
    this.initialValue = defaultValue;
    this.minValue = min;
    this.maxValue = max;
    this.context = context;
  }

  get value(): number {
    return this._value;
  }

  set value(newVal: number) {
    this._value = this.clamp(newVal);
    this.initialValue = this._value;
    const curTime = this.context ? this.context.currentTime : this.lastTime;
    const existingIndex = this.timeline.findIndex(e => e.time === curTime);
    if (existingIndex !== -1) {
      this.timeline[existingIndex] = { type: 'setValue', value: this._value, time: curTime };
    } else {
      this.timeline.push({ type: 'setValue', value: this._value, time: curTime });
      this.sortTimeline();
    }
  }

  setValueAtTime(value: number, startTime: number): this {
    this.timeline.push({ type: 'setValue', value: this.clamp(value), time: startTime });
    this.sortTimeline();
    return this;
  }

  private computeRampStart(endTime: number, curTime: number): { startTime: number; startVal: number } {
    let priorIndex = -1;
    for (let i = 0; i < this.timeline.length; i++) {
      if (this.timeline[i].time <= endTime) {
        priorIndex = i;
      } else {
        break;
      }
    }

    if (priorIndex === -1) {
      const t0 = Math.min(curTime, endTime);
      return { startTime: t0, startVal: this.initialValue };
    }

    const prior = this.timeline[priorIndex];
    if (prior.type === 'setValueCurve') {
      const curveDur = prior.duration ?? 0;
      const curveEndTime = prior.time + curveDur;
      const lastVal = prior.curve && prior.curve.length > 0
        ? prior.curve[prior.curve.length - 1]
        : prior.value;
      const t0 = Math.min(endTime, Math.max(prior.time, curveEndTime));
      return { startTime: t0, startVal: lastVal };
    }

    if (prior.type === 'setTarget') {
      const t0 = Math.min(endTime, Math.max(prior.time, curTime));
      const v0 = this.computeValueAtTimeInternal(t0, priorIndex);
      return { startTime: t0, startVal: v0 };
    }

    return { startTime: prior.time, startVal: prior.value };
  }

  linearRampToValueAtTime(value: number, endTime: number): this {
    const clamped = this.clamp(value);
    const curTime = this.context ? this.context.currentTime : this.lastTime;
    const { startTime, startVal } = this.computeRampStart(endTime, curTime);
    this.timeline.push({ type: 'linearRamp', value: clamped, time: endTime, startTime, startVal });
    this.sortTimeline();
    return this;
  }

  exponentialRampToValueAtTime(value: number, endTime: number): this {
    const clamped = this.clamp(value);
    const curTime = this.context ? this.context.currentTime : this.lastTime;
    const { startTime, startVal } = this.computeRampStart(endTime, curTime);
    this.timeline.push({ type: 'exponentialRamp', value: clamped, time: endTime, startTime, startVal });
    this.sortTimeline();
    return this;
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number): this {
    const startVal = this.getValueAtTime(startTime);
    this.timeline.push({ type: 'setTarget', value: this.clamp(target), time: startTime, timeConstant, startVal });
    this.sortTimeline();
    return this;
  }

  setValueCurveAtTime(values: Float32Array | number[], startTime: number, duration: number): this {
    if (!values || values.length === 0) {
      return this;
    }
    const curve = values instanceof Float32Array ? values : new Float32Array(values);
    this.timeline.push({ type: 'setValueCurve', value: curve[curve.length - 1], time: startTime, duration, curve });
    this.sortTimeline();
    return this;
  }

  cancelScheduledValues(cancelTime: number): this {
    this.timeline = this.timeline.filter(e => e.time < cancelTime);
    return this;
  }

  cancelAndHoldAtTime(cancelTime: number): this {
    const holdVal = this.getValueAtTime(cancelTime);
    this.timeline = this.timeline.filter(e => e.time < cancelTime);
    this.setValueAtTime(holdVal, cancelTime);
    return this;
  }

  private computeValueAtTimeInternal(t: number, priorIndex: number): number {
    const prior = this.timeline[priorIndex];
    if (prior.type === 'setTarget' && prior.timeConstant && prior.timeConstant > 0) {
      const v0 = prior.startVal !== undefined ? prior.startVal : this.initialValue;
      const target = prior.value;
      const decay = Math.exp(-(t - prior.time) / prior.timeConstant);
      return this.clamp(target + (v0 - target) * decay);
    }

    if (prior.type === 'setValueCurve' && prior.curve && prior.curve.length > 0 && prior.duration && prior.duration > 0) {
      const relTime = t - prior.time;
      if (relTime >= prior.duration) {
        return this.clamp(prior.curve[prior.curve.length - 1]);
      }
      if (prior.curve.length === 1) {
        return this.clamp(prior.curve[0]);
      }
      const norm = Math.max(0, Math.min(1, relTime / prior.duration));
      const index = norm * (prior.curve.length - 1);
      const lower = Math.floor(index);
      const upper = Math.min(prior.curve.length - 1, Math.ceil(index));
      const frac = index - lower;
      const vLower = prior.curve[lower];
      const vUpper = prior.curve[upper];
      return this.clamp(vLower + (vUpper - vLower) * frac);
    }

    return this.clamp(prior.value);
  }

  getValueAtTime(t: number): number {
    if (this.timeline.length === 0) {
      return this.clamp(this._value);
    }

    if (Number.isNaN(t)) {
      return this.clamp(this.initialValue);
    }

    if (Number.isFinite(t)) {
      this.lastTime = t;
    }

    // Find latest event at or before t
    let priorIndex = -1;
    for (let i = 0; i < this.timeline.length; i++) {
      if (this.timeline[i].time <= t) {
        priorIndex = i;
      } else {
        break;
      }
    }

    if (priorIndex === -1) {
      // t is before the first event: check if first event is a ramp
      const first = this.timeline[0];
      if (first && (first.type === 'linearRamp' || first.type === 'exponentialRamp')) {
        const t0 = first.startTime !== undefined ? first.startTime : 0;
        const v0 = first.startVal !== undefined ? first.startVal : this.initialValue;
        const t1 = first.time;
        const v1 = first.value;

        if (t <= t0) {
          return this.clamp(v0);
        }
        if (t1 <= t0) {
          return this.clamp(v1);
        }

        const progress = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));

        if (first.type === 'linearRamp') {
          return this.clamp(v0 + (v1 - v0) * progress);
        } else {
          const posV0 = Math.max(1e-6, v0);
          const posV1 = Math.max(1e-6, v1);
          return this.clamp(posV0 * Math.pow(posV1 / posV0, progress));
        }
      }
      return this.clamp(this.initialValue);
    }

    const prior = this.timeline[priorIndex];
    const next = this.timeline[priorIndex + 1];

    if (next && next.time > t) {
      // Interpolating between prior and next
      if (next.type === 'linearRamp' || next.type === 'exponentialRamp') {
        let t0 = prior.time;
        let v0 = prior.value;

        if (prior.type === 'setValueCurve') {
          const curveEndTime = prior.time + (prior.duration ?? 0);
          t0 = Math.max(t0, curveEndTime);
          v0 = prior.curve && prior.curve.length > 0 ? prior.curve[prior.curve.length - 1] : prior.value;
        } else if (prior.type === 'setTarget') {
          if (next.startTime !== undefined && next.startTime > prior.time) {
            t0 = next.startTime;
            v0 = next.startVal !== undefined ? next.startVal : this.computeValueAtTimeInternal(t0, priorIndex);
          }
        } else if (next.startTime !== undefined && next.startTime > prior.time) {
          t0 = next.startTime;
          v0 = next.startVal !== undefined ? next.startVal : prior.value;
        }

        if (t < t0) {
          return this.computeValueAtTimeInternal(t, priorIndex);
        }

        const t1 = next.time;
        const v1 = next.value;
        if (t1 <= t0) return this.clamp(v1);
        const progress = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));

        if (next.type === 'linearRamp') {
          return this.clamp(v0 + (v1 - v0) * progress);
        } else {
          const posV0 = Math.max(1e-6, v0);
          const posV1 = Math.max(1e-6, v1);
          return this.clamp(posV0 * Math.pow(posV1 / posV0, progress));
        }
      }
    }

    return this.computeValueAtTimeInternal(t, priorIndex);
  }

  updateValue(currentTime: number): void {
    this._value = this.getValueAtTime(currentTime);
  }

  private clamp(val: number): number {
    return Math.max(this.minValue, Math.min(this.maxValue, val));
  }

  private sortTimeline(): void {
    this.timeline.sort((a, b) => a.time - b.time);
  }
}

export class MockAudioNode extends EventTarget {
  context: MockAudioContext;
  numberOfInputs = 1;
  numberOfOutputs = 1;
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';
  connectedNodes: Array<MockAudioNode | MockAudioParam> = [];

  constructor(context: MockAudioContext) {
    super();
    this.context = context;
  }

  connect(destination: MockAudioNode | MockAudioParam): MockAudioNode | MockAudioParam {
    this.connectedNodes.push(destination);
    return destination;
  }

  disconnect(destination?: MockAudioNode | MockAudioParam): void {
    if (!destination) {
      this.connectedNodes = [];
    } else {
      this.connectedNodes = this.connectedNodes.filter(n => n !== destination);
    }
  }
}

export class MockAudioDestinationNode extends MockAudioNode {
  maxChannelCount = 2;
}

export class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.gain = new MockAudioParam(1.0, 0, 100);
    context.registerParam(this.gain);
  }
}

export class MockPeriodicWave {
  real: Float32Array;
  imag: Float32Array;
  disableNormalization: boolean;

  constructor(real: Float32Array, imag: Float32Array, disableNormalization = false) {
    this.real = real;
    this.imag = imag;
    this.disableNormalization = disableNormalization;
  }
}

export class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency: MockAudioParam;
  detune: MockAudioParam;
  periodicWave: MockPeriodicWave | null = null;
  started = false;
  stopped = false;
  startTime = 0;
  stopTime = Infinity;
  onended: ((this: MockOscillatorNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440, 0, 24000);
    this.detune = new MockAudioParam(0, -153600, 153600);
    context.registerParam(this.frequency);
    context.registerParam(this.detune);
    context.registerScheduledSource(this);
  }

  setPeriodicWave(wave: MockPeriodicWave): void {
    this.periodicWave = wave;
    this.type = 'custom';
  }

  start(when = 0): void {
    if (this.started) throw new Error('OscillatorNode cannot be started more than once');
    this.started = true;
    this.startTime = when;
  }

  stop(when = 0): void {
    if (this.stopped) throw new Error('OscillatorNode cannot be stopped more than once');
    this.stopped = true;
    this.stopTime = when;
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency: MockAudioParam;
  detune: MockAudioParam;
  Q: MockAudioParam;
  gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(350, 10, 24000);
    this.detune = new MockAudioParam(0, -153600, 153600);
    this.Q = new MockAudioParam(1, 0.0001, 1000);
    this.gain = new MockAudioParam(0, -40, 40);
    context.registerParam(this.frequency);
    context.registerParam(this.detune);
    context.registerParam(this.Q);
    context.registerParam(this.gain);
  }

  /**
   * Computes genuine frequency response magnitude and phase using bilinear transform biquad coefficients
   */
  getFrequencyResponse(frequencyHz: Float32Array, magResponse: Float32Array, phaseResponse: Float32Array): void {
    const f0 = this.frequency.value;
    const fs = this.context.sampleRate;
    const q = Math.max(0.0001, this.Q.value);

    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    let b0 = 1, b1 = 0, b2 = 0;
    let a0 = 1, a1 = 0, a2 = 0;

    switch (this.type) {
      case 'lowpass':
        b0 = (1 - cosw0) / 2;
        b1 = 1 - cosw0;
        b2 = (1 - cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cosw0) / 2;
        b1 = -(1 + cosw0);
        b2 = (1 + cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      case 'bandpass':
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      case 'peaking': {
        const A = Math.pow(10, this.gain.value / 40);
        b0 = 1 + alpha * A;
        b1 = -2 * cosw0;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cosw0;
        a2 = 1 - alpha / A;
        break;
      }
      case 'notch':
        b0 = 1;
        b1 = -2 * cosw0;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      case 'lowshelf': {
        const A = Math.pow(10, this.gain.value / 40);
        const S = 1;
        const alphaShelf = (Math.sin(w0) / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
        const twoSqrtAAlpha = 2 * Math.sqrt(A) * alphaShelf;
        b0 = A * ((A + 1) - (A - 1) * cosw0 + twoSqrtAAlpha);
        b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
        b2 = A * ((A + 1) - (A - 1) * cosw0 - twoSqrtAAlpha);
        a0 = (A + 1) + (A - 1) * cosw0 + twoSqrtAAlpha;
        a1 = -2 * ((A - 1) + (A + 1) * cosw0);
        a2 = (A + 1) + (A - 1) * cosw0 - twoSqrtAAlpha;
        break;
      }
      case 'highshelf': {
        const A = Math.pow(10, this.gain.value / 40);
        const S = 1;
        const alphaShelf = (Math.sin(w0) / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
        const twoSqrtAAlpha = 2 * Math.sqrt(A) * alphaShelf;
        b0 = A * ((A + 1) + (A - 1) * cosw0 + twoSqrtAAlpha);
        b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
        b2 = A * ((A + 1) + (A - 1) * cosw0 - twoSqrtAAlpha);
        a0 = (A + 1) - (A - 1) * cosw0 + twoSqrtAAlpha;
        a1 = 2 * ((A - 1) - (A + 1) * cosw0);
        a2 = (A + 1) - (A - 1) * cosw0 - twoSqrtAAlpha;
        break;
      }
      default:
        // Pass-through flat response
        b0 = 1; b1 = 0; b2 = 0;
        a0 = 1; a1 = 0; a2 = 0;
    }

    // Normalize coefficients
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    for (let i = 0; i < frequencyHz.length; i++) {
      const f = frequencyHz[i];
      const w = (2 * Math.PI * f) / fs;
      const cosw = Math.cos(w);
      const sinw = Math.sin(w);
      const cos2w = Math.cos(2 * w);
      const sin2w = Math.sin(2 * w);

      // Numerator: B(e^jw) = b0 + b1*e^-jw + b2*e^-j2w
      const numRe = b0 + b1 * cosw + b2 * cos2w;
      const numIm = -b1 * sinw - b2 * sin2w;

      // Denominator: A(e^jw) = 1 + a1*e^-jw + a2*e^-j2w
      const denRe = 1 + a1 * cosw + a2 * cos2w;
      const denIm = -a1 * sinw - a2 * sin2w;

      const numMag = Math.sqrt(numRe * numRe + numIm * numIm);
      const denMag = Math.sqrt(denRe * denRe + denIm * denIm);
      if (denMag < 1e-12 || Number.isNaN(denMag) || Number.isNaN(numMag)) {
        magResponse[i] = 0;
        phaseResponse[i] = 0;
      } else {
        magResponse[i] = numMag / denMag;
        const numPhase = Math.atan2(numIm, numRe);
        const denPhase = Math.atan2(denIm, denRe);
        phaseResponse[i] = numPhase - denPhase;
      }
    }
  }
}

export class MockWaveShaperNode extends MockAudioNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';

  constructor(context: MockAudioContext) {
    super(context);
  }
}

export class MockDynamicsCompressorNode extends MockAudioNode {
  threshold: MockAudioParam;
  knee: MockAudioParam;
  ratio: MockAudioParam;
  reduction = 0;
  attack: MockAudioParam;
  release: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.threshold = new MockAudioParam(-24, -100, 0, context);
    this.knee = new MockAudioParam(30, 0, 40, context);
    this.ratio = new MockAudioParam(12, 1, 20, context);
    this.attack = new MockAudioParam(0.003, 0, 1, context);
    this.release = new MockAudioParam(0.25, 0, 1, context);
    context.registerParam(this.threshold);
    context.registerParam(this.knee);
    context.registerParam(this.ratio);
    context.registerParam(this.attack);
    context.registerParam(this.release);
  }
}

export class MockDelayNode extends MockAudioNode {
  delayTime: MockAudioParam;
  maxDelayTime: number;

  constructor(context: MockAudioContext, maxDelayTime = 1.0) {
    super(context);
    this.maxDelayTime = maxDelayTime;
    this.delayTime = new MockAudioParam(0, 0, maxDelayTime);
    context.registerParam(this.delayTime);
  }
}

export class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new Error(`Channel index ${channel} out of bounds`);
    }
    return this.channelData[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const src = this.getChannelData(channelNumber);
    destination.set(src.subarray(bufferOffset, bufferOffset + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const dest = this.getChannelData(channelNumber);
    dest.set(source, bufferOffset);
  }
}

export class MockConvolverNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  normalize = true;

  constructor(context: MockAudioContext) {
    super(context);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  playbackRate: MockAudioParam;
  detune: MockAudioParam;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  started = false;
  stopped = false;
  startTime = 0;
  stopTime = Infinity;
  onended: ((this: MockAudioBufferSourceNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.playbackRate = new MockAudioParam(1, 0, 1024);
    this.detune = new MockAudioParam(0, -153600, 153600);
    context.registerParam(this.playbackRate);
    context.registerParam(this.detune);
    context.registerScheduledSource(this);
  }

  start(when = 0): void {
    if (this.started) throw new Error('Cannot start AudioBufferSourceNode more than once');
    this.started = true;
    this.startTime = when;
  }

  stop(when = 0): void {
    if (this.stopped) throw new Error('Cannot stop AudioBufferSourceNode more than once');
    this.stopped = true;
    this.stopTime = when;
  }
}

export class MockStereoPannerNode extends MockAudioNode {
  pan: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.pan = new MockAudioParam(0, -1, 1);
    context.registerParam(this.pan);
  }
}

export class MockConstantSourceNode extends MockAudioNode {
  offset: MockAudioParam;
  started = false;
  stopped = false;

  constructor(context: MockAudioContext) {
    super(context);
    this.offset = new MockAudioParam(1, -Infinity, Infinity);
    context.registerParam(this.offset);
  }

  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}

export class MockChannelMergerNode extends MockAudioNode {
  constructor(context: MockAudioContext, numberOfInputs = 6) {
    super(context);
    this.numberOfInputs = numberOfInputs;
    this.numberOfOutputs = 1;
  }
}

export class MockChannelSplitterNode extends MockAudioNode {
  constructor(context: MockAudioContext, numberOfOutputs = 6) {
    super(context);
    this.numberOfInputs = 1;
    this.numberOfOutputs = numberOfOutputs;
  }
}

interface ScheduledSource {
  stopped: boolean;
  stopTime: number;
  onended: ((ev: Event) => void) | null;
  dispatchEvent: (ev: Event) => boolean;
}

export class MockAudioContext extends EventTarget {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination: MockAudioDestinationNode;

  private registeredParams: Set<MockAudioParam> = new Set();
  private registeredSources: Set<ScheduledSource> = new Set();
  private static originalAudioContext: unknown = null;
  private static originalWebkitAudioContext: unknown = null;

  constructor(options?: AudioContextOptions) {
    super();
    if (options?.sampleRate) {
      this.sampleRate = options.sampleRate;
    }
    this.destination = new MockAudioDestinationNode(this);
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode(this);
  }

  createWaveShaper(): MockWaveShaperNode {
    return new MockWaveShaperNode(this);
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    return new MockDynamicsCompressorNode(this);
  }

  createDelay(maxDelayTime = 1.0): MockDelayNode {
    return new MockDelayNode(this, maxDelayTime);
  }

  createConvolver(): MockConvolverNode {
    return new MockConvolverNode(this);
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(numberOfChannels, length, sampleRate);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode(this);
  }

  createPeriodicWave(real: Float32Array, imag: Float32Array, constraints?: PeriodicWaveConstraints): MockPeriodicWave {
    return new MockPeriodicWave(real, imag, constraints?.disableNormalization ?? false);
  }

  createStereoPanner(): MockStereoPannerNode {
    return new MockStereoPannerNode(this);
  }

  createConstantSource(): MockConstantSourceNode {
    return new MockConstantSourceNode(this);
  }

  createChannelMerger(numberOfInputs = 6): MockChannelMergerNode {
    return new MockChannelMergerNode(this, numberOfInputs);
  }

  createChannelSplitter(numberOfOutputs = 6): MockChannelSplitterNode {
    return new MockChannelSplitterNode(this, numberOfOutputs);
  }

  async decodeAudioData(audioData: ArrayBuffer): Promise<MockAudioBuffer> {
    const length = Math.max(128, Math.floor(audioData.byteLength / 4));
    const buf = new MockAudioBuffer(2, length, this.sampleRate);
    if (audioData.byteLength >= 2) {
      const view = new DataView(audioData);
      const lData = buf.getChannelData(0);
      const rData = buf.getChannelData(1);
      const step = Math.max(1, Math.floor((audioData.byteLength - 2) / length));
      for (let i = 0; i < length; i++) {
        const byteOffset = Math.min(i * step, audioData.byteLength - 2);
        const val = view.getInt16(byteOffset, true) / 32768.0;
        lData[i] = val;
        rData[i] = val;
      }
    }
    return buf;
  }

  registerParam(param: MockAudioParam): void {
    param.context = this;
    this.registeredParams.add(param);
  }

  registerScheduledSource(source: ScheduledSource): void {
    this.registeredSources.add(source);
  }

  /**
   * Deterministic virtual clock advancement:
   * Moves currentTime forward by seconds, evaluates all registered AudioParams,
   * and fires onended handlers for stopped sources whose stopTime has passed.
   */
  advanceTime(seconds: number): void {
    if (seconds < 0) {
      throw new Error('Cannot advance time backwards');
    }
    this.currentTime += seconds;

    // Update all audio parameters to the new current time
    for (const param of this.registeredParams) {
      param.updateValue(this.currentTime);
    }

    // Check stopped sources
    for (const source of this.registeredSources) {
      if (source.stopped && source.stopTime <= this.currentTime) {
        this.registeredSources.delete(source);
        const endEvent = new Event('ended');
        if (source.onended) {
          source.onended(endEvent);
        }
        source.dispatchEvent(endEvent);
      }
    }
  }

  /**
   * Installs this mock as globalThis.AudioContext and window.AudioContext
   */
  static installGlobal(): void {
    if (typeof globalThis !== 'undefined') {
      MockAudioContext.originalAudioContext = (globalThis as any).AudioContext;
      MockAudioContext.originalWebkitAudioContext = (globalThis as any).webkitAudioContext;
      (globalThis as any).AudioContext = MockAudioContext;
      (globalThis as any).webkitAudioContext = MockAudioContext;
    }
  }

  /**
   * Restores original global AudioContext
   */
  static restoreGlobal(): void {
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).AudioContext = MockAudioContext.originalAudioContext;
      (globalThis as any).webkitAudioContext = MockAudioContext.originalWebkitAudioContext;
    }
  }
}
