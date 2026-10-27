// Bottom sheets on phones: the grab bar is the only close control (no ✕). Dragging the sheet's header down past a
// threshold, or a quick flick, dismisses it; tapping the bar does too, so keyboard and screen-reader users keep a close
// button. From md up the same panels are side panels or modals with their own ✕, and none of this applies.
import { useEffect, type RefObject } from 'react';

const PHONE = '(max-width: 767px)';

// `close` decides for itself whether it may close (an editor with unsaved changes refuses and says why); if it
// doesn't, the sheet springs back.
export type SheetClose = () => unknown;

export function useSheetDrag(sheet: RefObject<HTMLElement | null>, close: SheetClose) {
  useEffect(() => {
    const panel = sheet.current;
    if (!panel) return;
    let startY: number | null = null;
    let startAt = 0;
    let dy = 0;
    const start = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const touch = event.touches[0];
      if (!matchMedia(PHONE).matches || event.touches.length !== 1 || !touch) return;
      // The header drags (anywhere but its own controls); the grab bar itself is one of those controls but drags.
      if (!target?.closest('[data-sheet-grab]')) return;
      if (target.closest('button:not([data-sheet-handle]), a, input, textarea, select, label')) return;
      startY = touch.clientY;
      startAt = performance.now();
      dy = 0;
      panel.style.transition = 'none';
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (startY === null || !touch) return;
      dy = Math.max(0, touch.clientY - startY);
      panel.style.transform = `translateY(${String(dy)}px)`;
    };
    const end = () => {
      if (startY === null) return;
      const flicked = dy / (performance.now() - startAt) > 0.6 && dy > 40;
      startY = null;
      panel.style.transition = '';
      panel.style.transform = ''; // the class transform takes over: it animates closed, or springs back
      if (dy > 120 || flicked) close();
    };
    panel.addEventListener('touchstart', start, { passive: true });
    panel.addEventListener('touchmove', move, { passive: true });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
    return () => {
      panel.removeEventListener('touchstart', start);
      panel.removeEventListener('touchmove', move);
      panel.removeEventListener('touchend', end);
      panel.removeEventListener('touchcancel', end);
    };
  }, [sheet, close]);
}

// The bar at the top of a sheet: drawn 40×4, tappable across the sheet's width.
export function SheetGrab({ onClose, label = 'Close' }: { onClose: SheetClose; label?: string }) {
  return (
    <button
      type="button"
      data-sheet-grab
      data-sheet-handle
      onClick={() => {
        onClose();
      }}
      aria-label={label}
      className="md:hidden -mt-3 mb-1 flex h-9 w-full items-center justify-center rounded-t-3xl"
    >
      <span className="w-10 h-1 rounded-full bg-slate-600" />
    </button>
  );
}
