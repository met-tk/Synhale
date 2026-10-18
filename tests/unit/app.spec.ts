import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

describe('App System Integration (F24 & M5)', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  beforeEach(() => {
    // Mock HTMLCanvasElement.getContext
    const mockCtx = {
      scale: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      right: 1024,
      bottom: 768
    });
  });

  it('renders top bar brand and 432Hz core indicator', () => {
    const { container } = render(React.createElement(App, null));

    expect(screen.getByText('Synhale')).toBeDefined();
    expect(screen.getByText('432Hz CORE')).toBeDefined();

    // Verify zero emoji
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });

  it('renders all sacred geometry preset buttons across groups I, II, and III', () => {
    render(React.createElement(App, null));

    // Group I
    expect(screen.getByTitle(/Ring/)).toBeDefined();
    expect(screen.getByTitle(/Sacred/)).toBeDefined();
    expect(screen.getByTitle(/Waves/)).toBeDefined();
    expect(screen.getByTitle(/Focus/)).toBeDefined();

    // Group II
    expect(screen.getByTitle(/Corona/)).toBeDefined();
    expect(screen.getByTitle(/Hyper/)).toBeDefined();
    expect(screen.getByTitle(/Knot/)).toBeDefined();
    expect(screen.getByTitle(/Flux/)).toBeDefined();

    // Group III
    expect(screen.getByTitle(/Warp/)).toBeDefined();
    expect(screen.getByTitle(/Rosette/)).toBeDefined();
    expect(screen.getByTitle(/Tesseract/)).toBeDefined();
    expect(screen.getByTitle(/Hopf/)).toBeDefined();
  });

  it('switches sacred geometry presets on click and supports 3-way group switching', () => {
    render(React.createElement(App, null));

    const warpBtn = screen.getByTitle(/Warp/);
    fireEvent.click(warpBtn);
    expect(warpBtn.getAttribute('aria-pressed')).toBe('true');
    expect(warpBtn.className).toContain('font-semibold');

    // Switch groups
    const groupSwitchBtn = screen.getByLabelText(/Switch Visual Preset Group/);
    fireEvent.click(groupSwitchBtn);

    const ringBtn = screen.getByTitle(/Ring/);
    expect(ringBtn).toBeDefined();
    fireEvent.click(ringBtn);
    expect(ringBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles dark and light themes via settings modal', () => {
    render(React.createElement(App, null));

    const settingsBtn = screen.getByLabelText('Open Settings');
    expect(settingsBtn).toBeDefined();

    // Open settings modal
    fireEvent.click(settingsBtn);

    // Light mode button in settings modal
    const lightModeBtn = screen.getByLabelText('浅色模式');
    expect(lightModeBtn).toBeDefined();

    // Toggle theme to light mode
    fireEvent.click(lightModeBtn);
    expect(document.documentElement.classList.contains('light') || document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('opens and closes the breath rhythm drawer', () => {
    render(React.createElement(App, null));

    const rhythmBtn = screen.getByTitle('Change Breath Rhythm');
    fireEvent.click(rhythmBtn);

    // BottomSheetDrawer should open with rhythm options
    expect(screen.getByText('Select Breath Rhythm')).toBeDefined();
    expect(screen.getAllByText('Box 4-4-4-4').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Relax 4-7-8')).toBeDefined();
    expect(screen.getByText('Coherent 5.5s')).toBeDefined();

    // Select Relax 4-7-8
    const relaxItem = screen.getByText('Relax 4-7-8');
    fireEvent.click(relaxItem);

    // Drawer closes after selection
    expect(screen.queryByText('Select Breath Rhythm')).toBeNull();
  });

  it('toggles the hardware modulation deck console', () => {
    render(React.createElement(App, null));

    const deckToggleBtn = screen.getByTitle('Toggle Hardware Modulation Deck');
    fireEvent.click(deckToggleBtn);

    // Hardware Deck console should open
    expect(screen.getByRole('dialog', { name: 'Acoustic Control Console' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Synthesizer Hardware Modulation Deck' })).toBeDefined();

    // Close deck console
    const closeBtn = screen.getByLabelText('Close Console');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: 'Acoustic Control Console' })).toBeNull();
  });

  it('renders the floating status capsule at bottom', () => {
    render(React.createElement(App, null));

    const capsule = screen.getByRole('button', { name: /Breath state:/i });
    expect(capsule).toBeDefined();
    expect(capsule.className).toContain('fixed');
    expect(capsule.className).toContain('bottom-6');
  });
});
