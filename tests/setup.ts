import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: any = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    }
    (window as any).PointerEvent = PointerEvent;
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function () {
      return null;
    } as any;
  }
}

// Local audio asset fetch interceptor for Node/Vitest headless testing
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (urlStr.startsWith('./audio/') || urlStr.startsWith('/audio/') || urlStr.startsWith('audio/')) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const cleanPath = urlStr.replace(/^\.?\//, '');
      const fullPath = path.resolve(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        return new Response(buffer, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
      }
    } catch {
      // Fall through to original fetch
    }
  }
  if (originalFetch) {
    try {
      return await originalFetch(input, init);
    } catch {
      return new Response(null, { status: 404 });
    }
  }
  return new Response(null, { status: 404 });
};

