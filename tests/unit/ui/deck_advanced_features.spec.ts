import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HardwareDeck } from '../../../src/ui/components/deck';
import { ThemeProvider } from '../../../src/ui/theme';
import { DEFAULT_CHANNEL_STRIP } from '../../../src/audio/engine';

describe('Deck Advanced Drag, Staging and Sound Sources', () => {
  it('hides remove buttons visually with sr-only while retaining accessibility', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['gain'],
          laneBOrder: []
        })
      )
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove Preamp Gain from LANE A' });
    expect(removeBtn).toBeDefined();
    expect(removeBtn.className).toContain('sr-only');
  });

  it('renders insertion indicator line during drag-over on rack slot cards', () => {
    const handleDragModuleChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['gain', 'filter'],
          laneBOrder: ['delay'],
          draggingItem: { kind: 'effect', effectId: 'gain', lane: 'laneA', effectName: 'Preamp Gain' },
          onDragModuleChange: handleDragModuleChange
        })
      )
    );

    const filterSlot = screen.getByTestId('effect-rack-slot-filter');
    expect(filterSlot).toBeDefined();

    // Mock bounding rect for card to test top half vs bottom half dragover
    vi.spyOn(filterSlot, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 300,
      width: 300,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => {}
    });

    // Drag over top half (clientY = 120 < midY = 150) -> index = 1
    fireEvent.dragOver(filterSlot, {
      clientY: 120,
      dataTransfer: { dropEffect: 'none', setData: vi.fn(), getData: vi.fn() }
    });

    const indicator = screen.getByTestId('drag-insertion-line');
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain('插入到第');
    expect(indicator.textContent).toMatch(/插入到第 \d 位/);
  });

  it('initiates source dragging with correct payload when sound source card header is dragged', () => {
    const handleDragModuleChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['oscA', 'granular', 'oscB', 'drone', 'ambient'],
          onDragModuleChange: handleDragModuleChange
        })
      )
    );

    const oscAHeader = screen.getByText('OSC A Wavetable').closest('div[draggable="true"]');
    expect(oscAHeader).not.toBeNull();

    const setData = vi.fn();
    fireEvent.dragStart(oscAHeader!, {
      dataTransfer: {
        setData,
        effectAllowed: 'uninitialized'
      }
    });

    expect(handleDragModuleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'source',
        sourceId: 'oscA',
        sourceType: 'oscA',
        sourceName: 'OSC A Wavetable'
      })
    );
  });

  it('renders cloned sound source cards with independent controls and routing', () => {
    const handleChannelStripChange = vi.fn();
    const handleSourceRouteChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['oscA', 'oscA_2'],
          sourceRoutes: { oscA: 'laneA', oscA_2: 'laneB' },
          channelStrip: {
            oscA: { detune: 0 },
            instances: {
              oscA_2: { detune: 50, gain: 0.8, bypass: false }
            }
          },
          onChannelStripChange: handleChannelStripChange,
          onSourceRouteChange: handleSourceRouteChange
        })
      )
    );

    // Both base OSC A and cloned OSC A #2 should be present
    expect(screen.getByText('OSC A Wavetable')).toBeDefined();
    expect(screen.getByText('OSC A Wavetable #2')).toBeDefined();
    expect(screen.getByText('波表振荡器 (克隆通道)')).toBeDefined();

    // Verify cloned instance route is laneB
    const clonedRouteBtn = screen.getByTestId('route-toggle-oscA_2-laneB');
    expect(clonedRouteBtn).toBeDefined();
    expect(clonedRouteBtn.getAttribute('aria-pressed')).toBe('true');

    // Switch cloned route to THRU
    const thruBtn = screen.getByTestId('route-toggle-oscA_2-thru');
    fireEvent.click(thruBtn);
    expect(handleSourceRouteChange).toHaveBeenCalledWith('oscA_2', 'thru');
  });

  it('applies dragging opacity and dashed border to active dragged item', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['oscA', 'granular'],
          laneAOrder: ['gain'],
          draggingItem: { kind: 'source', sourceId: 'oscA' }
        })
      )
    );

    const oscACard = screen.getByText('OSC A Wavetable').closest('.relative.rounded-lg.border');
    expect(oscACard?.className).toContain('opacity-30');
    expect(oscACard?.className).toContain('border-dashed');
  });

  it('renders all 5 generator types and their clones with full hardware controls', () => {
    const handleChannelStripChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['oscA', 'granular', 'granular_2', 'oscB', 'drone', 'drone_2', 'ambient'],
          sourceRoutes: {
            oscA: 'laneA',
            granular: 'laneA',
            granular_2: 'laneB',
            oscB: 'laneA',
            drone: 'laneB',
            drone_2: 'thru',
            ambient: 'laneA'
          },
          channelStrip: {
            oscA: { bypass: false },
            granular: { bypass: false },
            oscB: { bypass: false },
            drone: { bypass: false },
            ambient: { bypass: false },
            instances: {
              granular_2: { bypass: false, density: 8 },
              drone_2: { bypass: false, baseFreq: 108 }
            }
          },
          onChannelStripChange: handleChannelStripChange
        })
      )
    );

    // Verify all primary and cloned generator cards exist
    expect(screen.getByText('OSC A Wavetable')).toBeDefined();
    expect(screen.getByText('Granular Cloud')).toBeDefined();
    expect(screen.getByText('Granular Cloud #2')).toBeDefined();
    expect(screen.getByText('OSC B Pink Noise')).toBeDefined();
    expect(screen.getByText('Sub / Drone (432Hz)')).toBeDefined();
    expect(screen.getByText('Sub / Drone (432Hz) #2')).toBeDefined();
    expect(screen.getByText('Ambient Soundscape')).toBeDefined();
  });

  it('drops staged module onto Lane container and invokes onUnstageEffect', () => {
    const handleUnstage = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['gain'],
          laneBOrder: [],
          draggingItem: { kind: 'effect', effectId: 'filter', lane: 'staged', effectName: 'Analog Filter' },
          onUnstageEffect: handleUnstage
        })
      )
    );

    // Find Lane A Bus container
    const laneAHeading = screen.getByText(/LANE A BUS/);
    const laneAContainer = laneAHeading.closest('.flex.flex-col.gap-3');
    expect(laneAContainer).not.toBeNull();

    fireEvent.drop(laneAContainer!, {
      dataTransfer: {
        getData: (format: string) => {
          if (format === 'application/json') {
            return JSON.stringify({ kind: 'effect', effectId: 'filter', lane: 'staged', effectName: 'Analog Filter' });
          }
          return '';
        }
      }
    });

    expect(handleUnstage).toHaveBeenCalledWith('filter', 'laneA', 1);
  });

  it('drops staged module onto card slot with gap calculation and invokes onUnstageEffect', () => {
    const handleUnstage = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['gain', 'filter'],
          laneBOrder: [],
          draggingItem: { kind: 'effect', effectId: 'eq', lane: 'staged', effectName: 'Parametric EQ' },
          onUnstageEffect: handleUnstage
        })
      )
    );

    const gainSlot = screen.getByTestId('effect-rack-slot-gain');
    expect(gainSlot).toBeDefined();

    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 300,
      width: 300,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => {}
    });

    // clientY = 120 < midY = 150 -> insert before gain (index 0)
    fireEvent.dragOver(gainSlot, {
      clientY: 120,
      dataTransfer: { dropEffect: 'none', setData: vi.fn(), getData: vi.fn() }
    });

    fireEvent.drop(gainSlot, {
      dataTransfer: {
        getData: (format: string) => {
          if (format === 'application/json') {
            return JSON.stringify({ kind: 'effect', effectId: 'eq', lane: 'staged', effectName: 'Parametric EQ' });
          }
          return '';
        }
      }
    });

    rectSpy.mockRestore();
    expect(handleUnstage).toHaveBeenCalledWith('eq', 'laneA', 0);
  });

  it('keeps carousel pagination and category tabs 100% independent across cloned ambient cards', () => {
    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['ambient', 'ambient_1']
        })
      )
    );

    // Both cards should be rendered
    const ambientCards = container.querySelectorAll('[data-testid^="sound-source-ambient"]');
    expect(ambientCards.length).toBe(2);

    const baseCard = ambientCards[0];
    const cloneCard = ambientCards[1];

    // Initially both are on PAGE 1/12 (or their respective initial page)
    const basePageIndicator = baseCard.querySelector('span.text-\\[8px\\].font-mono.font-bold');
    const clonePageIndicator = cloneCard.querySelector('span.text-\\[8px\\].font-mono.font-bold');

    expect(basePageIndicator?.textContent).toBe('PAGE 1/12');
    expect(clonePageIndicator?.textContent).toBe('PAGE 1/12');

    // Find the category tab [101 器乐] inside cloneCard
    const cloneTabs = cloneCard.querySelectorAll('button[role="tab"]');
    expect(cloneTabs.length).toBe(12);

    // Click [101 器乐] on cloneCard (index 10)
    fireEvent.click(cloneTabs[10]);

    // cloneCard should now be on PAGE 11/12
    expect(clonePageIndicator?.textContent).toBe('PAGE 11/12');

    // baseCard MUST remain on PAGE 1/12 and NOT slide!
    expect(basePageIndicator?.textContent).toBe('PAGE 1/12');

    // Next page button on cloneCard
    const cloneNextBtn = cloneCard.querySelector('button[aria-label="Next Soundscape Page"]')!;
    fireEvent.click(cloneNextBtn);

    expect(clonePageIndicator?.textContent).toBe('PAGE 12/12');
    expect(basePageIndicator?.textContent).toBe('PAGE 1/12');
  });

  it('supports modulation modal popover on BUS A and BUS B master faders via long-press / context-menu', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    const busFaderA = screen.getByRole('slider', { name: 'BUS A Master' });
    expect(busFaderA).toBeDefined();

    // Trigger context menu key to simulate long press
    fireEvent.keyDown(busFaderA, { key: 'ContextMenu' });

    // ModulationCard should pop up with BUS A Master Level label
    expect(screen.getByText('BUS A Master Level')).toBeDefined();
    expect(screen.getByRole('dialog', { name: /Modulation assignment for BUS A Master Level/i })).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close modulation card/i });
    fireEvent.click(closeBtn);

    // Test BUS B Master Fader
    const busFaderB = screen.getByRole('slider', { name: 'BUS B Master' });
    expect(busFaderB).toBeDefined();

    fireEvent.keyDown(busFaderB, { key: 'ContextMenu' });
    expect(screen.getByText('BUS B Master Level')).toBeDefined();
    expect(screen.getByRole('dialog', { name: /Modulation assignment for BUS B Master Level/i })).toBeDefined();
  });

  it('guarantees complete parameter and soundscape selection independence between base and cloned sound generators', () => {
    const handleChannelStripChange = vi.fn();

    const { container, rerender } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['ambient', 'ambient_1'],
          channelStrip: {
            ...DEFAULT_CHANNEL_STRIP,
            ambient: {
              sampleId: 'oceanTide',
              gain: 0.5,
              tone: 0.5,
              breathSync: 0.3,
              width: 0.8,
              bypass: false
            },
            instances: {
              ambient_1: {
                sampleId: 'lakeLapping',
                gain: 0.7,
                tone: 0.6,
                breathSync: 0.4,
                width: 0.9,
                bypass: false
              }
            }
          },
          onChannelStripChange: handleChannelStripChange
        })
      )
    );

    const ambientCards = container.querySelectorAll('[data-testid^="sound-source-ambient"]');
    expect(ambientCards.length).toBe(2);
    const baseCard = ambientCards[0];
    const cloneCard = ambientCards[1];

    // Find "海浪拍打沙滩与碎浪退却声" (oceanTide) and "夏日海滩岸边浪潮拍打声" (lakeLapping)
    const baseOceanBtn = baseCard.querySelector('button[title*="海浪拍打沙滩与碎浪退却声"]');
    expect(baseOceanBtn).not.toBeNull();
    expect(baseOceanBtn?.className).toContain('font-semibold');

    const cloneOceanBtn = cloneCard.querySelector('button[title*="海浪拍打沙滩与碎浪退却声"]');
    expect(cloneOceanBtn).not.toBeNull();
    // In cloneCard, oceanTide MUST NOT be selected!
    expect(cloneOceanBtn?.className).not.toContain('font-semibold');

    const cloneLakeBtn = cloneCard.querySelector('button[title*="夏日海滩岸边浪潮拍打声"]');
    expect(cloneLakeBtn).not.toBeNull();
    // In cloneCard, lakeLapping IS selected
    expect(cloneLakeBtn?.className).toContain('font-semibold');

    // Click lakeLapping on baseCard
    const baseLakeBtn = baseCard.querySelector('button[title*="夏日海滩岸边浪潮拍打声"]');
    expect(baseLakeBtn).not.toBeNull();
    fireEvent.click(baseLakeBtn!);

    // Must dispatch to { ambient: { sampleId: 'lakeLapping' } } without touching ambient_1
    expect(handleChannelStripChange).toHaveBeenCalledWith({
      ambient: { sampleId: 'lakeLapping' }
    });

    // Simulate parent state update after clicking baseCard
    rerender(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          activeSources: ['ambient', 'ambient_1'],
          channelStrip: {
            ...DEFAULT_CHANNEL_STRIP,
            ambient: {
              sampleId: 'lakeLapping',
              gain: 0.5,
              tone: 0.5,
              breathSync: 0.3,
              width: 0.8,
              bypass: false
            },
            instances: {
              ambient_1: {
                sampleId: 'underwaterReef',
                gain: 0.7,
                tone: 0.6,
                breathSync: 0.4,
                width: 0.9,
                bypass: false
              }
            }
          },
          onChannelStripChange: handleChannelStripChange
        })
      )
    );

    // In cloneCard, lakeLapping MUST NOT be active because ambient_1 has underwaterReef
    expect(cloneLakeBtn?.className).not.toContain('font-semibold');
    const cloneReefBtn = cloneCard.querySelector('button[title*="水中持续破裂的微小气泡声"]');
    expect(cloneReefBtn?.className).toContain('font-semibold');

    // Clicking oceanTide on cloneCard updates ONLY instances.ambient_1
    fireEvent.click(cloneOceanBtn!);
    expect(handleChannelStripChange).toHaveBeenCalledWith(
      expect.objectContaining({
        instances: {
          ambient_1: expect.objectContaining({
            sampleId: 'oceanTide'
          })
        }
      })
    );
  });
});


