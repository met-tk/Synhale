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
    description: '西藏颂钵敲击自然实录，悠扬纯净余音，静心入定',
    freqHint: '自然实录',
    tag: '颂钵实录',
    sampleUrl: './audio/cues/singingBowl.ogg'
  },
  zenWaterDrop: {
    id: 'zenWaterDrop',
    name: '自然水滴',
    nameEn: 'Nature Water Droplet',
    description: '天然大自然水滴滴落微澜实录，纯净剔透，宁神舒缓',
    freqHint: '天然水滴',
    tag: '自然水韵',
    sampleUrl: './audio/cues/zenWaterDrop.ogg'
  },
  woodenTemple: {
    id: 'woodenTemple',
    name: '温润暖木',
    nameEn: 'Zen Temple Wood',
    description: '禅刹温润暖木共鸣实录，内敛柔和，绝无刺耳喧闹',
    freqHint: '温润暖木',
    tag: '禅意温木',
    sampleUrl: './audio/cues/woodenTemple.ogg'
  },
  crystalHarmonics: {
    id: 'crystalHarmonics',
    name: '空谷风铃',
    nameEn: 'Valley Wind Chime',
    description: '天然风铃微风拂动原声实录，高阶谐波舒缓自然，空灵轻盈',
    freqHint: '空灵风铃',
    tag: '风铃原声',
    sampleUrl: './audio/cues/crystalHarmonics.ogg'
  },
  deepSubPing: {
    id: 'deepSubPing',
    name: '暖腹深钵',
    nameEn: 'Deep Tibetan Bowl',
    description: '大号低音西藏颂钵原声实录，153Hz 深腹浑厚共振，安定温暖',
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

/**
 * Load cue settings from localStorage with fallback to default
 */
export function loadCueSettings(): BreathCueSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_CUE_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUE_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CUE_SETTINGS };

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CUE_SETTINGS.enabled,
      volume: typeof parsed.volume === 'number' && !isNaN(parsed.volume)
        ? Math.max(0, Math.min(1, parsed.volume))
        : DEFAULT_CUE_SETTINGS.volume,
      preset: parsed.preset in CUE_PRESETS ? parsed.preset : DEFAULT_CUE_SETTINGS.preset,
      nodes: {
        exhale_to_inhale: Boolean(parsed.nodes?.exhale_to_inhale ?? DEFAULT_CUE_SETTINGS.nodes.exhale_to_inhale),
        inhale_to_holdIn: Boolean(parsed.nodes?.inhale_to_holdIn ?? DEFAULT_CUE_SETTINGS.nodes.inhale_to_holdIn),
        holdIn_to_exhale: Boolean(parsed.nodes?.holdIn_to_exhale ?? DEFAULT_CUE_SETTINGS.nodes.holdIn_to_exhale),
        exhale_to_holdOut: Boolean(parsed.nodes?.exhale_to_holdOut ?? DEFAULT_CUE_SETTINGS.nodes.exhale_to_holdOut)
      }
    };
  } catch {
    return { ...DEFAULT_CUE_SETTINGS };
  }
}

/**
 * Save cue settings to localStorage
 */
export function saveCueSettings(settings: BreathCueSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[CueSettings] Failed to save to localStorage:', err);
  }
}
