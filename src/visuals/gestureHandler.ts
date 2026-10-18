/**
 * Pure Canvas Tap-Anywhere Interaction (F17)
 * Tap detector: deltaT < 220ms and Euclidean distance < 8.0px.
 * Rejects drags and holds.
 * Integrates Web Audio unlock on initial user gesture.
 */

export const TAP_MAX_DURATION_MS = 220;
export const TAP_MAX_DISTANCE_PX = 8.0;

/**
 * Evaluates whether a pointer down/up sequence qualifies as a pure tap gesture.
 */
export function isTapGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number
): boolean {
  if (durationMs >= TAP_MAX_DURATION_MS) {
    return false;
  }
  return Math.hypot(endX - startX, endY - startY) < TAP_MAX_DISTANCE_PX;
}

export interface PointerCoordEvent {
  clientX: number;
  clientY: number;
}

export interface CanvasPointerHandlers {
  onPointerDown: (e: PointerCoordEvent) => void;
  onPointerUp: (e: PointerCoordEvent) => void;
  onPointerCancel: () => void;
}

/**
 * Checks whether pointer coordinates fall within the central geometric breathing visualization area.
 */
export function isWithinGeometry(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number; width: number; height: number },
  ratio = 0.44
): boolean {
  const cx = canvasRect.left + canvasRect.width / 2;
  const cy = canvasRect.top + canvasRect.height / 2;
  const maxRadius = Math.min(canvasRect.width, canvasRect.height) * ratio;
  const dist = Math.hypot(clientX - cx, clientY - cy);
  return dist <= maxRadius;
}

/**
 * Creates lightweight pointer event handlers for canvas touch and mouse interaction.
 */
export function createCanvasPointerHandlers(
  onTap: () => void,
  onFirstAudioUnlock?: () => void | Promise<void>,
  filter?: (e: PointerCoordEvent) => boolean
): CanvasPointerHandlers {
  let downPoint: { x: number; y: number; time: number } | null = null;
  let hasUnlockedAudio = false;

  const onPointerDown = (e: PointerCoordEvent) => {
    downPoint = {
      x: e.clientX,
      y: e.clientY,
      time: typeof performance !== 'undefined' ? performance.now() : Date.now()
    };
  };

  const onPointerUp = async (e: PointerCoordEvent) => {
    if (!downPoint) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = now - downPoint.time;

    if (isTapGesture(downPoint.x, downPoint.y, e.clientX, e.clientY, duration)) {
      if (!filter || filter(e)) {
        if (!hasUnlockedAudio && onFirstAudioUnlock) {
          hasUnlockedAudio = true;
          try {
            const res = onFirstAudioUnlock();
            if (res && typeof (res as Promise<void>).then === 'function') {
              await res;
            }
          } catch {
            // Ignore unlock errors in test environments
          }
        }
        onTap();
      }
    }

    downPoint = null;
  };

  const onPointerCancel = () => {
    downPoint = null;
  };

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel
  };
}
