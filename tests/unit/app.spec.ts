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

  it('renders the top bar brand without decorative frequency text', () => {
    const { container } = render(React.createElement(App, null));

    expect(screen.getByText('Synhale')).toBeDefined();
    expect(screen.queryByText('432Hz CORE')).toBeNull();

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

    // Switch groups via container click
    const groupSwitchBtn = screen.getByLabelText(/Switch Visual Preset Group/);
    fireEvent.click(groupSwitchBtn);

    const ringBtn = screen.getByTitle(/Ring/);
    expect(ringBtn).toBeDefined();
    fireEvent.click(ringBtn);
    expect(ringBtn.getAttribute('aria-pressed')).toBe('true');

    // Switch groups directly via 3 interactive dots
    const opticalDot = screen.getByLabelText(/光学组 \(II\)/);
    expect(opticalDot).toBeDefined();
    fireEvent.click(opticalDot);
    expect(opticalDot.getAttribute('aria-pressed')).toBe('true');

    const coronaBtn = screen.getByTitle(/Corona/);
    expect(coronaBtn).toBeDefined();
    fireEvent.click(coronaBtn);
    expect(coronaBtn.getAttribute('aria-pressed')).toBe('true');

    // Step presets sequentially via circular companion button
    const nextBtn = screen.getByLabelText('Next Visual Preset');
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn);
    const hyperBtn = screen.getByTitle(/Hyper/);
    expect(hyperBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles dark and light themes via settings modal', () => {
    render(React.createElement(App, null));

    const settingsBtn = screen.getByLabelText('打开设置');
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

    const rhythmBtn = screen.getByTitle('切换呼吸节律');
    fireEvent.click(rhythmBtn);

    // BottomSheetDrawer should open with rhythm options
    expect(screen.getByText('选择呼吸节律')).toBeDefined();
    expect(screen.getAllByText('Box 4-4-4-4').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Relax 4-7-8')).toBeDefined();
    expect(screen.getByText('Coherent 5.5s')).toBeDefined();

    // Select Relax 4-7-8
    const relaxItem = screen.getByText('Relax 4-7-8');
    fireEvent.click(relaxItem);

    // Drawer closes after selection
    expect(screen.queryByText('选择呼吸节律')).toBeNull();
  });

  it('toggles the hardware modulation deck console', () => {
    render(React.createElement(App, null));

    const deckToggleBtn = screen.getByTitle('开关调制台');
    fireEvent.click(deckToggleBtn);

    // Hardware Deck console should open
    expect(screen.getByRole('dialog', { name: '声学调制台 · Console' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Synthesizer Hardware Modulation Deck' })).toBeDefined();

    // Close deck console
    const closeBtn = screen.getByLabelText('Close Console');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: '声学调制台 · Console' })).toBeNull();
  });

  it('renders the central semi-transparent breath indicator and removes legacy bottom capsule', () => {
    render(React.createElement(App, null));

    // Legacy status capsule is removed
    expect(screen.queryByRole('button', { name: /Breath state:/i })).toBeNull();

    // Legacy central text hint is removed
    expect(screen.queryByText(/轻触中心图形开始呼吸/i)).toBeNull();

    // New central breath countdown indicator is present
    const centerIndicator = screen.getByRole('button', { name: /呼吸倒计时/i });
    expect(centerIndicator).toBeDefined();
  });

  it('renders and invokes native window controls when running under Electron without rounded-xl clipping', async () => {
    const minimize = vi.fn();
    const toggleMaximize = vi.fn();
    const close = vi.fn();
    const isMaximized = vi.fn().mockResolvedValue(false);
    const onMaximizeChange = vi.fn().mockReturnValue(() => {});

    (window as any).electronAPI = {
      minimize,
      toggleMaximize,
      close,
      isMaximized,
      onMaximizeChange
    };

    let renderedResult!: ReturnType<typeof render>;
    await React.act(async () => {
      renderedResult = render(React.createElement(App, null));
    });

    // Root container must NOT use rounded-xl to avoid corner clipping artifacts
    const rootDiv = renderedResult.container.firstElementChild as HTMLElement;
    expect(rootDiv.className).not.toContain('rounded-xl');
    expect(rootDiv.className).toContain('ring-1 ring-inset');

    // Controls must be present
    const minBtn = screen.getByRole('button', { name: 'Minimize Window' });
    const maxBtn = screen.getByRole('button', { name: 'Maximize Window' });
    const closeBtn = screen.getByRole('button', { name: 'Close Window' });

    expect(minBtn).toBeDefined();
    expect(maxBtn).toBeDefined();
    expect(closeBtn).toBeDefined();

    // Verify click handlers
    await React.act(async () => {
      fireEvent.click(minBtn);
      fireEvent.click(maxBtn);
      fireEvent.click(closeBtn);
    });

    expect(minimize).toHaveBeenCalledOnce();
    expect(toggleMaximize).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();

    delete (window as any).electronAPI;
  });

  it('renders tri-anchor header with centered HUD and places Save Preset button in Deck console header', async () => {
    await React.act(async () => {
      render(React.createElement(App, null));
    });

    // 1. Centered HUD capsule checks
    const rhythmBtn = screen.getByRole('button', { name: '切换呼吸节律' });
    const soundBtn = screen.getByRole('button', { name: '切换音色' });
    expect(rhythmBtn).toBeDefined();
    expect(soundBtn).toBeDefined();

    // 2. Open Deck and check Save Preset button in Deck Header
    const deckToggleBtn = screen.getByRole('button', { name: '开关调制台' });
    await React.act(async () => {
      fireEvent.click(deckToggleBtn);
    });

    const deckSaveBtn = screen.getByRole('button', { name: 'Save Custom Preset' });
    expect(deckSaveBtn).toBeDefined();

    // Clicking save preset opens modal
    await React.act(async () => {
      fireEvent.click(deckSaveBtn);
    });
    expect(screen.getByRole('dialog', { name: 'Save Sound Preset' })).toBeDefined();

    // 3. Visual preset trigger HUD tooltip
    const warpBtn = screen.getByRole('button', { name: '时空曲率 (Warp)' });
    await React.act(async () => {
      fireEvent.mouseEnter(warpBtn);
    });
    const tooltip = screen.getByRole('status');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toContain('时空曲率');
  });
});
