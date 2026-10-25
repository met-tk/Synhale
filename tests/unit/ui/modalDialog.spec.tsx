import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useModalDialog } from '../../../src/ui/hooks/useModalDialog';

function Dialog({ name, onClose, children }: { name: string; onClose: () => void; children?: React.ReactNode }) {
  const ref = useModalDialog(true, onClose);
  return <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
    <button onClick={onClose}>Close {name}</button>{children}
  </div>;
}

function Harness() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return <>
    <button onClick={() => setOuter(true)}>Open settings</button>
    {outer && <Dialog name="settings" onClose={() => setOuter(false)}>
      <button onClick={() => setInner(true)}>Edit rhythm</button>
      {inner && <Dialog name="rhythm" onClose={() => setInner(false)}><input aria-label="Name" /></Dialog>}
    </Dialog>}
  </>;
}

afterEach(cleanup);

describe('Modal keyboard interaction', () => {
  it('keeps Tab within the dialog and restores the opener and scrolling on close', () => {
    document.body.style.overflow = 'auto';
    render(<Harness />);
    const opener = screen.getByText('Open settings');
    opener.focus();
    fireEvent.click(opener);
    const first = screen.getByText('Close settings');
    const last = screen.getByText('Edit rhythm');
    expect(first).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('closes only the top dialog and returns focus to its parent', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Open settings'));
    const parentOpener = screen.getByText('Edit rhythm');
    parentOpener.focus();
    fireEvent.click(parentOpener);
    expect(screen.getByText('Close rhythm')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'rhythm' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'settings' })).toBeInTheDocument();
    expect(parentOpener).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });
});
