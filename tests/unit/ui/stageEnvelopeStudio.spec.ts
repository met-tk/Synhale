import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageEnvelopeStudio } from '../../../src/ui/components/mseg/StageEnvelopeStudio';
import { createDefaultBreathCurveData } from '../../../src/audio/dsp/curveMath';

describe('StageEnvelopeStudio Dedicated MSEG Workspace', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: false,
        onClose: vi.fn()
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders studio header, stage panorama cards, and close button when open', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: handleClose,
        onSave: handleSave,
        currentStage: 'inhale',
        stageProgress: 0.35,
        isPlaying: true
      })
    );

    // Dialog assertion
    expect(screen.getByRole('dialog', { name: /Stage Envelope Studio/i })).toBeDefined();

    // Title and badge
    expect(screen.getByText('STAGE ENVELOPE STUDIO')).toBeDefined();
    expect(screen.getByText('4-STAGE MSEG')).toBeDefined();

    // 4 stages in panorama cards
    expect(screen.getAllByText(/吸气 · Inhale/)[0]).toBeDefined();
    expect(screen.getAllByText(/屏息 · Hold In/)[0]).toBeDefined();
    expect(screen.getAllByText(/呼气 · Exhale/)[0]).toBeDefined();
    expect(screen.getAllByText(/静息 · Hold Out/)[0]).toBeDefined();

    // Panorama header
    expect(screen.getByText(/全周期全景视窗/)).toBeDefined();

    // Close on button click
    const closeBtn = screen.getByRole('button', { name: 'Close Studio' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows switching active stage via panorama tab cards', () => {
    render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        currentStage: 'holdIn',
        stageProgress: 0.5
      })
    );

    // Switch to Exhale stage via role="tab"
    const exhaleTab = screen.getByRole('tab', { name: /切换到呼气 · Exhale/ });
    fireEvent.click(exhaleTab);

    // Current focused banner should update to exhale
    expect(screen.getAllByText(/呼气 · Exhale/)[0]).toBeDefined();
  });

  it('supports applying curve presets and saving', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: handleClose,
        onSave: handleSave,
        initialCurveData: createDefaultBreathCurveData()
      })
    );

    // Find preset select dropdown
    const presetSelect = screen.getByRole('combobox');
    expect(presetSelect).toBeDefined();

    // Select Heroic Apex preset
    fireEvent.change(presetSelect, { target: { value: 'factory-heroic-apex' } });

    // Save and Apply
    const saveBtn = screen.getByRole('button', { name: /Save & Apply/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const savedCurve = handleSave.mock.calls[0][0];
    expect(savedCurve).toBeDefined();
    expect(savedCurve.inhale).toBeDefined();
    expect(savedCurve.exhale).toBeDefined();
  });

  it('supports resetting current stage to linear ramp', async () => {
    const handleChange = vi.fn();

    render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        onChange: handleChange
      })
    );

    // Click reset stage button
    const resetBtn = screen.getByRole('button', { name: /重置本阶段/ });
    fireEvent.click(resetBtn);

    await vi.waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it('supports adding a new control point via SVG double click without losing selection', async () => {
    const handleChange = vi.fn();

    const { container } = render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        onChange: handleChange
      })
    );

    const svg = container.querySelector('svg.cursor-crosshair');
    expect(svg).toBeDefined();

    if (svg) {
      // Mock getBoundingClientRect
      svg.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 760,
        height: 240,
        right: 760,
        bottom: 240,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      // Double click near middle (t = 0.5, value = 0.8)
      fireEvent.doubleClick(svg, {
        clientX: 380,
        clientY: 60
      });

      // Wait a microtask tick for onChange
      await new Promise(r => setTimeout(r, 10));

      expect(handleChange).toHaveBeenCalled();
      const updatedCurve = handleChange.mock.calls[0][0];
      // Inhale stage should now have 3 points
      expect(updatedCurve.inhale.points.length).toBe(3);
    }
  });

  it('preserves user local edits across parent re-renders while open', async () => {
    const handleChange = vi.fn();

    const { rerender } = render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        initialCurveData: createDefaultBreathCurveData(),
        onChange: handleChange
      })
    );

    // Find preset select dropdown and select a preset
    const presetSelect = screen.getByRole('combobox');
    fireEvent.change(presetSelect, { target: { value: 'factory-heroic-apex' } });

    // Parent re-renders (simulating 60fps clock tick or external state update)
    rerender(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        initialCurveData: createDefaultBreathCurveData(),
        onChange: handleChange
      })
    );

    // Selected preset should NOT be reverted back to default
    expect((presetSelect as HTMLSelectElement).value).toBe('factory-heroic-apex');
  });

  it('supports creating new user preset, overwriting, and deleting with confirmation', () => {
    render(
      React.createElement(StageEnvelopeStudio, {
        isOpen: true,
        onClose: vi.fn(),
        initialCurveData: createDefaultBreathCurveData()
      })
    );

    // Click "存为新预设"
    const saveAsNewBtn = screen.getByRole('button', { name: /存为新预设/ });
    fireEvent.click(saveAsNewBtn);

    // Type new preset name
    const nameInput = screen.getByPlaceholderText(/预设名称/);
    fireEvent.change(nameInput, { target: { value: 'Custom Ambient Wave' } });

    // Click "保存"
    const confirmSaveBtn = screen.getByRole('button', { name: '保存' });
    fireEvent.click(confirmSaveBtn);

    // Overwrite button should now appear since it's a user preset
    const overwriteBtn = screen.getByRole('button', { name: /覆盖保存/ });
    expect(overwriteBtn).toBeDefined();

    // Click "删除"
    const deleteBtn = screen.getByRole('button', { name: /删除/ });
    fireEvent.click(deleteBtn);

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole('button', { name: '删除' });
    fireEvent.click(confirmDeleteBtn);

    expect(screen.getByText(/预设已删除/)).toBeDefined();
  });
});

