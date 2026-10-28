/**
 * 静态触屏能力检测（模块加载时一次性求值）。
 *
 * 触屏设备上 HTML5 Drag & Drop 不触发，因此启用
 * "点击托举 → 点击放置"（tap-to-carry / tap-to-place）的拖拽替代交互；
 * 桌面端保持原生 HTML5 拖放行为不变。
 */
export const IS_TOUCH_DEVICE: boolean =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  (('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0);
