import { useEffect, useRef } from 'react';

const openDialogs: HTMLElement[] = [];
let originalBodyOverflow = '';

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, a[href], [tabindex]'
  )).filter(element => {
    if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let node: HTMLElement | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (node === dialog) break;
    }
    return true;
  });
}

function focusDialog(dialog: HTMLElement) {
  (getFocusableElements(dialog)[0] ?? dialog).focus({ preventScroll: true });
}

/** Keep keyboard interaction inside the foremost dialog and restore its opener. */
export function useModalDialog(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogs.length === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(dialog);
    if (!dialog.contains(document.activeElement)) focusDialog(dialog);

    const isForemost = () => openDialogs[openDialogs.length - 1] === dialog;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isForemost() || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const elements = getFocusableElements(dialog);
        const first = elements[0];
        const last = elements[elements.length - 1];
        const active = document.activeElement;
        if (!first) {
          event.preventDefault();
          dialog.focus();
        } else if (!dialog.contains(active) || active === dialog || (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (isForemost() && event.target instanceof Node && !dialog.contains(event.target)) focusDialog(dialog);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      const wasForemost = isForemost();
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      const index = openDialogs.indexOf(dialog);
      if (index !== -1) openDialogs.splice(index, 1);
      if (openDialogs.length === 0) document.body.style.overflow = originalBodyOverflow;
      if (wasForemost) {
        const remaining = openDialogs[openDialogs.length - 1];
        if (opener?.isConnected && (!remaining || remaining.contains(opener))) opener.focus({ preventScroll: true });
        else if (remaining?.isConnected) focusDialog(remaining);
      }
    };
  }, [isOpen]);

  return dialogRef;
}
