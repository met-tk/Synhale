import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheetDrawer, shouldDismissDrawer } from '../../../src/ui/components/drawer';

describe('Mobile Bottom Sheet Drawer (F21)', () => {
  const sampleItems = [
    { id: 'box', label: 'Box 4-4-4-4', description: 'Tactical Stress Relief' },
    { id: 'relax', label: 'Relax 4-7-8', description: 'Deep Sleep Preparation' },
    { id: 'coherent', label: 'Coherent 5.5s', description: 'Autonomic Balance' }
  ];

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      React.createElement(BottomSheetDrawer, {
        isOpen: false,
        title: 'Presets',
        items: sampleItems,
        onClose: vi.fn(),
        onSelect: vi.fn()
      })
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders drawer container with rounded-t-2xl, bottom-0, and z-50 classes', () => {
    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Rhythm Presets',
        items: sampleItems,
        onClose: vi.fn(),
        onSelect: vi.fn()
      })
    );

    const dialog = screen.getByRole('dialog', { name: 'Rhythm Presets' });
    expect(dialog).toBeDefined();
    expect(dialog.className).toContain('rounded-t-2xl');
    expect(dialog.className).toContain('bottom-0');
    expect(dialog.className).toContain('z-50');
  });

  it('renders items with minimum 48px touch height and dispatches onSelect and onClose on click', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Rhythm Presets',
        items: sampleItems,
        selectedId: 'box',
        onSelect: handleSelect,
        onClose: handleClose
      })
    );

    const relaxBtn = screen.getByText('Relax 4-7-8').closest('button');
    expect(relaxBtn).toBeDefined();
    expect(relaxBtn?.className).toContain('min-h-[48px]');

    fireEvent.click(relaxBtn!);
    expect(handleSelect).toHaveBeenCalledWith('relax');
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();

    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Rhythm Presets',
        items: sampleItems,
        onSelect: vi.fn(),
        onClose: handleClose
      })
    );

    const backdrop = screen.getByRole('presentation', { hidden: true });
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();

    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Rhythm Presets',
        items: sampleItems,
        onSelect: vi.fn(),
        onClose: handleClose
      })
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('shouldDismissDrawer accurately detects swipe distance threshold > 60px', () => {
    expect(shouldDismissDrawer(200, 261)).toBe(true);  // 61px down
    expect(shouldDismissDrawer(200, 259)).toBe(false); // 59px down
    expect(shouldDismissDrawer(200, 260)).toBe(false); // 60px down
    expect(shouldDismissDrawer(200, 150)).toBe(false); // 50px up
  });

  it('handles empty item list without throwing errors', () => {
    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Empty List',
        items: [],
        onSelect: vi.fn(),
        onClose: vi.fn()
      })
    );

    expect(screen.getByText('暂无内容')).toBeDefined();
  });

  it('supports 2-column layout and hides description when hideDescription is true', () => {
    render(
      React.createElement(BottomSheetDrawer, {
        isOpen: true,
        title: 'Sound Presets',
        items: sampleItems,
        columns: 2,
        hideDescription: true,
        onSelect: vi.fn(),
        onClose: vi.fn()
      })
    );

    const dialog = screen.getByRole('dialog', { name: 'Sound Presets' });
    expect(dialog.className).toContain('max-w-2xl');

    // Labels must be visible
    expect(screen.getByText('Box 4-4-4-4')).toBeDefined();
    expect(screen.getByText('Relax 4-7-8')).toBeDefined();

    // Descriptions must NOT be rendered
    expect(screen.queryByText('Tactical Stress Relief')).toBeNull();
    expect(screen.queryByText('Deep Sleep Preparation')).toBeNull();
  });
});

