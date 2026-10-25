import { isRecord, readStoredJson, writeStoredJson } from '../storage/safeStorage';

/**
 * Synhale 2 - Breath Transition Cue Sound Configuration & Presets
 * 
 * Defines customizable interval nodes, acoustic non-harsh cue sound presets,
 * and localStorage persistence for stage transition auditory cues.
 */

export type BreathTransitionNode =
  | 'exhale_to_inhale'   // 呼气结束 -> 吸气开始 (新周期开启，核心默认)
  | 'inhale_to_holdIn'   // 吸气结束 -> 屏息开始
  | 'holdIn_to_exhale'   // 屏息结束 -> 呼气开始
  | 'exhale_to_holdOut'; // 呼气结束 -> 静息开始

export type BreathCuePresetId =
  | 'singingBowl'        // 颂钵微鸣 (Tibetan Bowl Tap) - 432Hz 铜质柔和共鸣
  | 'zenWaterDrop'       // 禅定水滴 (Zen Water Drop) - 纯净水润微泛音
  | 'woodenTemple'       // 温润木磬 (Temple Wood Chime) - 有机暖木瞬态，无金属尖刺
  | 'crystalHarmonics'   // 柔光晶体 (Soft Crystal Ping) - 864Hz 微光轻抚
  | 'deepSubPing';       // 暖腹低鸣 (Warm Sub Ping) - 108Hz 纯正弦包裹

export interface BreathCuePresetMeta {
  id: BreathCuePresetId;
  name: string;
  nameEn: string;
  description: string;
  freqHint: string;
  tag: string;
  sampleUrl: string;
}

export const CUE_PRESETS: Record<BreathCuePresetId, BreathCuePresetMeta> = {
  singingBowl: {
    id: 'singingBowl',
    name: '颂钵微鸣',
    nameEn: 'Tibetan Singing Bowl',
    description: '颂钵实录，余音静心',
    freqHint: '自然实录',
    tag: '颂钵实录',
    sampleUrl: './audio/cues/singingBowl.ogg'
  },
  zenWaterDrop: {
    id: 'zenWaterDrop',
    name: '自然水滴',
    nameEn: 'Nature Water Droplet',
    description: '水滴微澜，宁神剔透',
    freqHint: '天然水滴',
    tag: '自然水韵',
    sampleUrl: './audio/cues/zenWaterDrop.ogg'
  },
  woodenTemple: {
    id: 'woodenTemple',
    name: '温润暖木',
    nameEn: 'Zen Temple Wood',
    description: '暖木共鸣，内敛柔和',
    freqHint: '温润暖木',
    tag: '禅意温木',
    sampleUrl: './audio/cues/woodenTemple.ogg'
  },
  crystalHarmonics: {
    id: 'crystalHarmonics',
    name: '空谷风铃',
    nameEn: 'Valley Wind Chime',
    description: '风铃谐波，空灵轻盈',
    freqHint: '空灵风铃',
    tag: '风铃原声',
    sampleUrl: './audio/cues/crystalHarmonics.ogg'
  },
  deepSubPing: {
    id: 'deepSubPing',
    name: '暖腹深钵',
    nameEn: 'Deep Tibetan Bowl',
    description: '低钵深鸣，安定温厚',
    freqHint: '深沉低钵',
    tag: '低音藏钵',
    sampleUrl: './audio/cues/deepSubPing.ogg'
  }
};

export const CUE_PRESET_LIST: BreathCuePresetMeta[] = Object.values(CUE_PRESETS);

export interface BreathCueSettings {
  enabled: boolean;
  volume: number; // 0.0 .. 1.0 (default 0.35)
  preset: BreathCuePresetId;
  nodes: Record<BreathTransitionNode, boolean>;
}

export const DEFAULT_CUE_SETTINGS: BreathCueSettings = {
  enabled: true,
  volume: 0.35,
  preset: 'singingBowl',
  nodes: {
    exhale_to_inhale: true,  // 默认启用转折感最强的“呼转吸”新周期节点
    inhale_to_holdIn: false,
    holdIn_to_exhale: false,
    exhale_to_holdOut: false
  }
};

const STORAGE_KEY = 'synhale_cue_settings_v1';

function repairCueSettings(raw: unknown): BreathCueSettings {
  const parsed = isRecord(raw) ? raw : {};
  const nodes = isRecord(parsed.nodes) ? parsed.nodes : {};
  const enabledNode = (key: BreathTransitionNode) =>
    typeof nodes[key] === 'boolean' ? nodes[key] : DEFAULT_CUE_SETTINGS.nodes[key];
  return {
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CUE_SETTINGS.enabled,
    volume: typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
      ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_CUE_SETTINGS.volume,
    preset: typeof parsed.preset === 'string' && Object.prototype.hasOwnProperty.call(CUE_PRESETS, parsed.preset)
      ? parsed.preset as BreathCuePresetId : DEFAULT_CUE_SETTINGS.preset,
    nodes: {
      exhale_to_inhale: enabledNode('exhale_to_inhale'),
      inhale_to_holdIn: enabledNode('inhale_to_holdIn'),
      holdIn_to_exhale: enabledNode('holdIn_to_exhale'),
      exhale_to_holdOut: enabledNode('exhale_to_holdOut')
    }
  };
}

/** Load independently owned settings, including nested default node flags. */
export function loadCueSettings(): BreathCueSettings {
  return repairCueSettings(readStoredJson(STORAGE_KEY));
}

export function saveCueSettings(settings: BreathCueSettings): void {
  writeStoredJson(STORAGE_KEY, repairCueSettings(settings));
}
