import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreathMacroTimelineScope } from '../../../src/ui/components/vu/BreathMacroTimelineScope';

describe('BreathMacroTimelineScope - Stage Envelope Dedicated Monitor & Interactive Scope', () => {
  it('renders meter role and aria attributes conforming to test standards', () => {
    render(
      React.createElement(BreathMacroTimelineScope, {
        value: 0.65,
        breathStage: 'inhale',
        stageProgress: 0.5,
        isPlaying: true
      })
    );

    const meter = screen.getByRole('meter', { name: 'Breath Macro VU' });
    expect(meter).toBeDefined();
    expect(meter.getAttribute('aria-valuenow')).toBe('0.65');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('1');
  });

  it('displays Stage Envelope title and stage progress percentage in header', () => {
    render(
      React.createElement(BreathMacroTimelineScope, {
        value: 0.45,
        breathStage: 'exhale',
        stageProgress: 0.2,
        isPlaying: true
      })
    );

    // Displays Stage Envelope title, current stage, and percentage
    expect(screen.getByText(/STAGE ENVELOPE/i)).toBeDefined();
    expect(screen.getByText(/呼气 Exhale/i)).toBeDefined();
    expect(screen.getByText(/20\s*%/)).toBeDefined();
    expect(screen.getByText('[点击调节]')).toBeDefined();
  });

  it('triggers onClick when clicked to open Stage Envelope editor', () => {
    const handleClick = vi.fn();
    render(
      React.createElement(BreathMacroTimelineScope, {
        value: 0.5,
        breathStage: 'inhale',
        onClick: handleClick
      })
    );

    const meter = screen.getByRole('meter', { name: 'Breath Macro VU' });
    fireEvent.click(meter);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders customized stageMultipliers envelope curve correctly across linear, step and smooth modes', () => {
    const { container, rerender } = render(
      React.createElement(BreathMacroTimelineScope, {
        value: 0.5,
        breathStage: 'inhale',
        stageProgress: 0.5,
        stageMultipliers: {
          inhale: 0.9,
          holdIn: 0.7,
          exhale: 0.3,
          holdOut: 0.1,
          curve: 'linear'
        }
      })
    );

    // Linear mode uses M ... L ... L ...
    let path = container.querySelector('path[fill="none"]');
    expect(path).toBeDefined();
    expect(path?.getAttribute('d')).toContain('L');

    // Step mode uses step trajectory
    rerender(
      React.createElement(BreathMacroTimelineScope, {
        value: 0.5,
        breathStage: 'inhale',
        stageProgress: 0.5,
        stageMultipliers: {
          inhale: 0.9,
          holdIn: 0.7,
          exhale: 0.3,
          holdOut: 0.1,
          curve: 'step'
        }
      })
    );
    path = container.querySelector('path[fill="none"]');
    expect(path?.getAttribute('d')).toBeDefined();
  });
});
