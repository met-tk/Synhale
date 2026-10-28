/**
 * 性能预算与设备分档
 * 移动端(尤其是中低配 Android WebView)的功耗/CPU 比桌面敏感得多。
 * 这里统一检测设备能力,暴露 PerformanceBudget 给引擎/渲染/UI 三方使用,
 * 让"哪些昂贵的可选计算在当前设备上可以省掉"成为显式决策,而不是散落在各处的猜测。
 */

export type PerformanceTier = 'high' | 'medium' | 'low';

export interface PerformanceBudget {
  tier: PerformanceTier;
  /** 是否为原生 Capacitor 环境 (Android/iOS) */
  isNative: boolean;
  /** 是否为触屏设备 */
  isTouch: boolean;
  /** 建议的 canvas 目标帧率 */
  targetFps: number;
  /** 建议的 canvas DPR 上限 (低端设备降为 1,避免 4x 像素填充) */
  maxDpr: number;
  /** 呼吸调制下发到 AudioParam 的最小间隔 (ms) */
  modulationThrottleMs: number;
  /** 是否允许使用 canvas shadowBlur (Android WebView 上是昂贵的软件渲染) */
  allowShadowBlur: boolean;
  /** 是否允许 4x oversampling (WaveShaper 抗混叠) */
  allow4xOversampling: boolean;
  /** 是否在 bypass 时真正断开昂贵节点 (Convolver, WaveShaper) */
  aggressiveBypassDisconnect: boolean;
}

/** 检测是否在 Capacitor 原生容器中运行 */
function detectNative(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor 7+ 在 window 上注入 Capacitor 对象
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function') {
    try {
      return w.Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }
  return false;
}

/** 检测是否触屏设备 */
function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error legacy
    navigator.msMaxTouchPoints > 0
  );
}

/** 粗略估计设备档位 */
function estimateTier(isNative: boolean, isTouch: boolean): PerformanceTier {
  if (typeof navigator === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency ?? 4;
  // @ts-expect-error deviceMemory 是非标准但广泛支持
  const memoryGB = navigator.deviceMemory ?? 4;

  // 原生移动端且配置偏低 -> low
  if (isNative && (cores <= 4 || memoryGB <= 3)) {
    return 'low';
  }

  // 触屏设备(手机/平板)且非旗舰 -> medium
  if (isTouch && (cores <= 6 || memoryGB <= 6)) {
    return 'medium';
  }

  // 桌面 / 旗舰 -> high
  if (!isTouch && cores >= 8 && memoryGB >= 8) {
    return 'high';
  }

  // 默认中档,保守策略
  return 'medium';
}

let cachedBudget: PerformanceBudget | null = null;

function buildBudget(tier: PerformanceTier, isNative: boolean, isTouch: boolean): PerformanceBudget {
  return {
    tier,
    isNative,
    isTouch,
    targetFps: tier === 'low' ? 30 : 60,
    maxDpr: tier === 'low' ? 1 : tier === 'medium' ? 1.5 : 2,
    modulationThrottleMs: tier === 'low' ? 33 : 16, // 30Hz vs 60Hz
    allowShadowBlur: tier !== 'low',
    allow4xOversampling: tier === 'high',
    aggressiveBypassDisconnect: tier !== 'high', // 中低端更激进
  };
}

/** 获取当前设备的性能预算 (单例,进程内不变) */
export function getPerformanceBudget(): PerformanceBudget {
  if (cachedBudget) return cachedBudget;

  const isNative = detectNative();
  const isTouch = detectTouch();
  const tier = estimateTier(isNative, isTouch);
  cachedBudget = buildBudget(tier, isNative, isTouch);
  return cachedBudget;
}

/** 仅测试用:重置缓存 */
export function __resetPerformanceBudgetForTests(): void {
  cachedBudget = null;
}

/** 仅测试用:强制固定档位 (绕过 navigator 检测,保证回归基线确定性) */
export function __forceTierForTests(tier: PerformanceTier): void {
  cachedBudget = buildBudget(tier, false, false);
}

/**
 * 帧门控:限制 rAF 回调实际执行频率(帧率上限),低配设备降低 CPU/填充率压力。
 * 时间轴基于"上次放行帧"的时间戳,因此 dt 累计不会因跳帧而丢失。
 */
export function createFrameGate(minIntervalMs: number): (now: number) => boolean {
  let lastPass = 0;
  return (now: number): boolean => {
    if (now - lastPass >= minIntervalMs) {
      lastPass = now;
      return true;
    }
    return false;
  };
}

/** 基于性能预算的帧门控 (targetFps) */
export function createBudgetFrameGate(): (now: number) => boolean {
  const budget = getPerformanceBudget();
  const minInterval = 1000 / budget.targetFps;
  return createFrameGate(minInterval);
}

/** 取设备 DPR 并按预算上限封顶 (低端设备避免 2~3x 像素填充) */
export function capDpr(rawDpr: number): number {
  const budget = getPerformanceBudget();
  const dpr = Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1;
  return Math.min(dpr, budget.maxDpr);
}
