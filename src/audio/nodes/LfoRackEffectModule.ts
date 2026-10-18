/**
 * Synhale 2 - LfoRackEffectModule
 * 
 * Modular Rack Effect wrapper for Dual LFO Modulation & Spatial Tremolo.
 * Implements AudioEffectNode so that Dual LFO can be hot-plugged, reordered,
 * and routed across Lane A and Lane B in the effects rack.
 */

import { AudioEffectNode } from '../../types/audio';
import { DualLfoModule } from './DualLfoModule';

export class LfoRackEffectModule implements AudioEffectNode {
  public readonly id: string;
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;
  private passGain: GainNode;
  public bypass = false;
  private dualLfo: DualLfoModule | null = null;

  constructor(ctx: BaseAudioContext, dualLfo?: DualLfoModule | null, id = 'lfo') {
    this.id = id;
    this.dualLfo = dualLfo ?? null;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.passGain = ctx.createGain();
    this.passGain.gain.value = 1.0;

    // Direct, lossless audio pass-through
    this.inputNode.connect(this.passGain);
    this.passGain.connect(this.outputNode);
  }

  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  setBypass(b: boolean): void {
    this.bypass = b;
  }

  setParams(params: any): void {
    if (params?.bypass !== undefined) {
      this.setBypass(params.bypass);
    }
    if (this.dualLfo) {
      if (params?.lfo1) this.dualLfo.setLfo1Params(params.lfo1);
      if (params?.lfo2) this.dualLfo.setLfo2Params(params.lfo2);
    }
  }

  getParams(): any {
    return {
      bypass: this.bypass,
      lfo1: this.dualLfo?.getLfo1Params(),
      lfo2: this.dualLfo?.getLfo2Params()
    };
  }

  disconnect(): void {
    try {
      this.outputNode.disconnect();
    } catch {
      // Safe disconnect
    }
  }

  dispose(): void {
    try {
      this.disconnect();
      this.inputNode.disconnect();
      this.passGain.disconnect();
    } catch {
      // Safe disposal
    }
  }
}
