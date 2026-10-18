import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Knob, ModulationCard } from '../../../src/ui/components/knob';
import type { ModulationRoute } from '../../../src/types';

describe('Serum-Style Knob Modulation Ring & 4-Stage Automation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Serum-style dynamic live sweep arc and playhead dot when liveModOffset is active', () => {
    const assignedRoute: ModulationRoute = {
      target: 'serum-knob',
      source: 'lfo1',
      depth: 0.5,
      bipolar: true
    };

    const { container } = render(
      React.createElement(Knob, {
        id: 'serum-knob',
        label: 'Morph',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        assignedModulation: assignedRoute,
        liveModOffset: 0.8, // Live positive offset
        onChange: vi.fn()
      })
    );

    // Check SVG container contains path and circle elements
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // Track + Value Arc + Live Sweep Arc

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1); // Live playhead dot
  });

  it('ModulationCard provides medium interactive stage envelope viewport for stageProgress source', () => {
    const handleAssign = vi.fn();
    const handleUnassign = vi.fn();
    const handleClose = vi.fn();
    const handleOpenStudio = vi.fn();

    render(
      React.createElement(ModulationCard, {
        target: 'filter-cutoff',
        targetLabel: 'Filter Cutoff',
        isOpen: true,
        onAssign: handleAssign,
        onUnassign: handleUnassign,
        onClose: handleClose,
        onOpenStudio: handleOpenStudio,
        isPlaying: true,
        breathMacro: 0.75,
        clockSnapshot: {
          currentStage: 'inhale',
          stageProgress: 0.4
        }
      })
    );

    // Switch to stageProgress source
    const stageBtn = screen.getByText('Stage Env');
    fireEvent.click(stageBtn);

    // Check medium interactive stage envelope viewport is displayed
    expect(screen.getByText(/全呼吸阶段包络 · 连续全景视窗/)).toBeDefined();
    expect(screen.getByText('吸气 Inhale')).toBeDefined();
    expect(screen.getByText('屏息 Hold In')).toBeDefined();
    expect(screen.getByText('呼气 Exhale')).toBeDefined();
    expect(screen.getByText('静息 Hold Out')).toBeDefined();

    // Check entry button to open studio MSEG
    const openStudioBtn = screen.getByRole('button', { name: /打开独立包络工作台/i });
    expect(openStudioBtn).toBeDefined();

    // Click confirm / assign
    const confirmBtn = screen.getByRole('button', { name: /Assign/i });
    fireEvent.click(confirmBtn);

    expect(handleAssign).toHaveBeenCalledTimes(1);
    const assigned = handleAssign.mock.calls[0][0] as ModulationRoute;
    expect(assigned.source).toBe('stageProgress');
    expect(assigned.stageMultipliers).toBeDefined();
    expect(assigned.curveData).toBeDefined();
  });

  it('ModulationCard freezes dynamic updates when isPlaying is false', () => {
    const handleAssign = vi.fn();

    const { rerender } = render(
      React.createElement(ModulationCard, {
        target: 'osca-morph',
        targetLabel: 'OSC A Morph',
        isOpen: true,
        onAssign: handleAssign,
        onUnassign: vi.fn(),
        onClose: vi.fn(),
        isPlaying: false, // Paused
        breathMacro: 0.2
      })
    );

    // When paused, paused indicator is present
    expect(screen.getByText(/已暂停/)).toBeDefined();

    // Re-render as playing
    rerender(
      React.createElement(ModulationCard, {
        target: 'osca-morph',
        targetLabel: 'OSC A Morph',
        isOpen: true,
        onAssign: handleAssign,
        onUnassign: vi.fn(),
        onClose: vi.fn(),
        isPlaying: true, // Playing
        breathMacro: 0.8
      })
    );

    expect(screen.getByText(/实时驱动/)).toBeDefined();
  });

  it('ModulationCard allows clicking the medium waveform viewport to directly open Studio MSEG', () => {
    const handleOpenStudio = vi.fn();
    const handleClose = vi.fn();

    render(
      React.createElement(ModulationCard, {
        target: 'osca-morph',
        targetLabel: 'OSC A Morph',
        isOpen: true,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onClose: handleClose,
        onOpenStudio: handleOpenStudio,
        isPlaying: true,
        clockSnapshot: {
          currentStage: 'holdIn',
          stageProgress: 0.6
        }
      })
    );

    // Switch to Stage Env
    fireEvent.click(screen.getByText('Stage Env'));

    // Click the medium interactive waveform container
    const viewport = screen.getByTitle('点击全景波形视窗进入独立包络工作台');
    expect(viewport).toBeDefined();
    fireEvent.click(viewport);

    expect(handleOpenStudio).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('ModulationCard provides vertical bipolar depth fader with default 0.0 value and target preview', () => {
    const handleAssign = vi.fn();

    render(
      React.createElement(ModulationCard, {
        target: 'filter-cutoff',
        targetLabel: 'Filter Cutoff',
        isOpen: true,
        onAssign: handleAssign,
        onUnassign: vi.fn(),
        onClose: vi.fn(),
        isPlaying: true
      })
    );

    // Assert accessible range slider is present with default 0.0 value
    const depthInput = screen.getByLabelText('Modulation Depth') as HTMLInputElement;
    expect(depthInput).toBeDefined();
    expect(parseFloat(depthInput.value)).toBe(0.0);

    // Assert vertical scale ticks exist
    expect(screen.getByText('+100%')).toBeDefined();
    expect(screen.getByText('-100%')).toBeDefined();

    // Assert target control preview exists
    expect(screen.getByText('控制旋钮大样')).toBeDefined();

    // Adjust depth to 0.75 via input change
    fireEvent.change(depthInput, { target: { value: '0.75' } });
    expect(parseFloat(depthInput.value)).toBe(0.75);

    // Click assign
    const confirmBtn = screen.getByRole('button', { name: /Assign/i });
    fireEvent.click(confirmBtn);

    expect(handleAssign).toHaveBeenCalledTimes(1);
    const assigned = handleAssign.mock.calls[0][0] as ModulationRoute;
    expect(assigned.depth).toBe(0.75);
  });

  it('ModulationCard supports polarity mode toggle for LFO source and organizes into two branches', () => {
    const handleAssign = vi.fn();
    render(
      React.createElement(ModulationCard, {
        target: 'filter-resonance',
        targetLabel: 'Filter Resonance',
        isOpen: true,
        onAssign: handleAssign,
        onUnassign: vi.fn(),
        onClose: vi.fn()
      })
    );

    // Assert two branches exist
    expect(screen.getByText(/呼吸动态组 · Breath Dynamic Group/)).toBeDefined();
    expect(screen.getByText(/合成器内部 LFO 组 · Internal Synth LFO/)).toBeDefined();

    // Default Breath Macro shows polarity mode
    expect(screen.getByText(/极性模式 · Polarity Mode/)).toBeDefined();

    // Switch to LFO 1
    const lfo1Btn = screen.getByText('LFO 1');
    fireEvent.click(lfo1Btn);

    // Polarity Mode section should remain accessible for LFO 1
    expect(screen.getByText(/极性模式 · Polarity Mode/)).toBeDefined();
    const polarityToggleBtn = screen.getByRole('button', { name: /Bidirectional/i });
    expect(polarityToggleBtn).toBeDefined();

    // Toggle to Unipolar
    fireEvent.click(polarityToggleBtn);
    expect(screen.getByRole('button', { name: /Unipolar/i })).toBeDefined();

    // Click assign to confirm unipolar route assignment
    const confirmBtn = screen.getByRole('button', { name: /Assign/i });
    fireEvent.click(confirmBtn);

    expect(handleAssign).toHaveBeenCalledTimes(1);
    const assigned = handleAssign.mock.calls[0][0] as ModulationRoute;
    expect(assigned.source).toBe('lfo1');
    expect(assigned.bipolar).toBe(false);
  });

  it('ModulationCard renders Open Studio MSEG button for stageProgress and triggers callback', () => {
    const handleOpenStudio = vi.fn();
    const handleClose = vi.fn();

    render(
      React.createElement(ModulationCard, {
        target: 'master-fader',
        targetLabel: 'Master Volume',
        isOpen: true,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onClose: handleClose,
        onOpenStudio: handleOpenStudio
      })
    );

    // Switch to Stage Env
    const stageBtn = screen.getByText('Stage Env');
    fireEvent.click(stageBtn);

    // Find and click Open Studio button
    const openStudioBtn = screen.getByText(/打开独立包络工作台/);
    expect(openStudioBtn).toBeDefined();
    fireEvent.click(openStudioBtn);

    expect(handleOpenStudio).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
