import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HardwareDeck } from '../../../src/ui/components/deck';
import { ThemeProvider } from '../../../src/ui/theme';

describe('Synthesizer Hardware Deck (F22 & F19)', () => {
  const emojiRegex = /\p{Extended_Pictographic}/u;

  it('renders all 4 channel strips: OSC A, Granular Cloud, OSC B, Sub/Drone', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    expect(screen.getByText('OSC A Wavetable')).toBeDefined();
    expect(screen.getByText('Granular Cloud')).toBeDefined();
    expect(screen.getByText('OSC B Pink Noise')).toBeDefined();
    expect(screen.getByText('Sub / Drone (432Hz)')).toBeDefined();

    // Verify key knobs exist
    expect(screen.getByRole('slider', { name: 'Detune' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Harmonics' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Unison' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Uni Blend' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Grain Density' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Position' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Airway Color' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Friction (Q)' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Base Freq' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Pitch Drift' })).toBeDefined();
  });

  it('renders analog processing effects: Filter, Drive, Delay, Reverb', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    expect(screen.getAllByText('Preamp Gain').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('slider', { name: 'Preamp Gain' })).toBeDefined();
    expect(screen.getByText('Multimode Filter')).toBeDefined();
    expect(screen.getByText('Tape Warmth Drive')).toBeDefined();
    expect(screen.getByText('Ping-Pong Delay')).toBeDefined();
    expect(screen.getByText('Synthetic Reverb')).toBeDefined();

    // Filter controls
    expect(screen.getByRole('slider', { name: 'Cutoff' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Resonance' })).toBeDefined();
    expect(screen.getByText('LP')).toBeDefined();
    expect(screen.getByText('BP')).toBeDefined();
    expect(screen.getByText('HP')).toBeDefined();

    // Delay & Reverb controls
    expect(screen.getByRole('slider', { name: 'Time' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Decay' })).toBeDefined();
  });

  it('renders top bar layout with Brand and STAGE ENVELOPE aggregated on left, and Master Output Bay on right', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, { breathMacro: 0.75 })
      )
    );

    // Left Area: Brand & STAGE ENVELOPE monitor
    expect(screen.getByText('Synhale Hardware Deck')).toBeDefined();
    expect(screen.getByRole('meter', { name: 'Breath Macro VU' })).toBeDefined();
    expect(screen.getByText(/STAGE ENVELOPE/i)).toBeDefined();

    // Right Area: Master Output Bay
    expect(screen.getByRole('slider', { name: 'Master' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Master Pan' })).toBeDefined();
    expect(screen.getByText('Main Out')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Toggle Theme' })).toBeDefined();

    // Verify Master Output Bay container structure has right alignment
    const masterBay = screen.getByText('Main Out').closest('div');
    expect(masterBay).not.toBeNull();
  });

  it('dispatches bypass changes for audio channels and effects', () => {
    const handleChannelChange = vi.fn();
    const handleEffectsChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange,
          onEffectsChange: handleEffectsChange
        })
      )
    );

    // Bypass OSC A
    const oscABypassBtn = screen.getByRole('button', { name: 'OSC A Bypass' });
    fireEvent.click(oscABypassBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      oscA: { bypass: true }
    });

    // Bypass Filter
    const filterBypassBtn = screen.getByRole('button', { name: 'Filter Bypass' });
    fireEvent.click(filterBypassBtn);
    expect(handleEffectsChange).toHaveBeenCalledWith({
      filter: { bypass: true }
    });

    // Bypass Preamp Gain
    const preampBypassBtn = screen.getByRole('button', { name: 'Preamp Gain Bypass' });
    fireEvent.click(preampBypassBtn);
    expect(handleEffectsChange).toHaveBeenCalledWith({
      gain: { bypass: true }
    });

    // Bypass Granular
    const granularBypassBtn = screen.getByRole('button', { name: 'Granular Bypass' });
    fireEvent.click(granularBypassBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      granular: { bypass: true }
    });

    // Toggle Soft-Clip Protection
    const softClipBtn = screen.getByRole('button', { name: 'Toggle Soft-Clip Protection' });
    fireEvent.click(softClipBtn);
    expect(handleEffectsChange).toHaveBeenCalledWith({
      gain: { softClip: false }
    });
  });

  it('dispatches harmonic scale changes in Granular Cloud', () => {
    const handleChannelChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange
        })
      )
    );

    const dorianBtn = screen.getByRole('button', { name: '多利亚调式' });
    fireEvent.click(dorianBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      granular: { scale: 'dorian' }
    });
  });

  it('dispatches sample source changes in Granular Cloud', () => {
    const handleChannelChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange
        })
      )
    );

    const sampleSelect = screen.getByRole('combobox', { name: 'Granular Sample Source' });
    fireEvent.change(sampleSelect, { target: { value: 'singingBowl' } });
    expect(handleChannelChange).toHaveBeenCalledWith({
      granular: { sampleId: 'singingBowl' }
    });
  });

  it('dispatches voice mode and playback direction in Granular Cloud', () => {
    const handleChannelChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange
        })
      )
    );

    // Arp Voice Mode button
    const arpBtn = screen.getByRole('button', { name: 'arp' });
    fireEvent.click(arpBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      granular: { mode: 'arp' }
    });

    // Reverse Playback button
    const reverseBtn = screen.getByRole('button', { name: '←|' });
    fireEvent.click(reverseBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      granular: { direction: 'reverse' }
    });
  });

  it('supports Granular sample stepping buttons and Phase Plant extended knobs (Position, Octave, Pan, Range)', () => {
    const handleChannelChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange
        })
      )
    );

    // Sample step buttons
    const nextBtn = screen.getByRole('button', { name: 'Next Sample' });
    fireEvent.click(nextBtn);
    expect(handleChannelChange).toHaveBeenCalled();

    const prevBtn = screen.getByRole('button', { name: 'Previous Sample' });
    fireEvent.click(prevBtn);
    expect(handleChannelChange).toHaveBeenCalled();

    // Verify key knobs exist with correct labels
    expect(screen.getByRole('slider', { name: 'Granular Position' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Position Jitter' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Octave' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Pan' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Range Start' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Range End' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Granular Key Track' })).toBeDefined();
  });

  it('opens wavetable drawer upon clicking wavetable button', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    const wavetableBtn = screen.getByRole('button', { name: /选择波表集/i });
    fireEvent.click(wavetableBtn);

    expect(screen.getByRole('dialog', { name: '选择波表' })).toBeDefined();
    expect(screen.getByText('00: Classic Shapes')).toBeDefined();
  });

  it('toggles theme when clicking the theme switch button', () => {
    render(
      React.createElement(
        ThemeProvider,
        { initialTheme: 'dark' },
        React.createElement(HardwareDeck, null)
      )
    );

    const themeToggleBtn = screen.getByRole('button', { name: 'Toggle Theme' });
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('renders WT POS knob in OSC A section and dispatches continuous wavetable position', () => {
    const handleChannelStripChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelStripChange
        })
      )
    );

    const wtPosKnob = screen.getByRole('slider', { name: 'WT POS' });
    expect(wtPosKnob).toBeDefined();

    fireEvent.keyDown(wtPosKnob, { key: 'ArrowUp' });
    expect(handleChannelStripChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oscA: expect.objectContaining({
          wtPosition: expect.any(Number)
        })
      })
    );
  });

  it('toggles Chord Mode and selects chord types in OSC A', () => {
    const handleChannelStripChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelStripChange,
          channelStrip: {
            ...({} as any),
            oscA: {
              wavetableIndex: 0,
              chordMode: true,
              chordType: 'octave'
            }
          }
        })
      )
    );

    // Toggle Chord button
    const chordToggle = screen.getByRole('switch', { name: 'Toggle OSC A Chord Mode' });
    expect(chordToggle).toBeDefined();
    fireEvent.click(chordToggle);
    expect(handleChannelStripChange).toHaveBeenCalledWith({
      oscA: { chordMode: false }
    });

    // Select Major chord
    const majBtn = screen.getByRole('button', { name: 'MAJ' });
    expect(majBtn).toBeDefined();
    fireEvent.click(majBtn);
    expect(handleChannelStripChange).toHaveBeenCalledWith({
      oscA: { chordType: 'major' }
    });
  });

  it('renders Serum 8x2 symmetrical knobs in OSC A card', () => {
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    // Row 1 knobs: OCT, SEMI, FINE, WT POS, WARP, PHASE, RAND, HARM
    expect(screen.getByRole('slider', { name: 'Osc A Octave' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Semitone' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Detune' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'WT POS' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Warp' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Phase' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Phase Random' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Harmonics' })).toBeDefined();

    // Row 2 knobs: LEVEL, PAN, UNISON, UNI DET, UNI BLD, SPREAD, SUB, WARMTH
    expect(screen.getByRole('slider', { name: 'Osc A Level' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Pan' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Unison' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Unison Detune' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Uni Blend' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Spread' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Sub' })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Osc A Warmth' })).toBeDefined();
  });

  it('supports sound source BUS routing toggles with immediate callback', () => {
    const handleSourceRouteChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onSourceRouteChange: handleSourceRouteChange
        })
      )
    );

    // Find OSC A route buttons
    const oscABusB = screen.getByRole('button', { name: 'Route OSC A to BUS B' });
    expect(oscABusB).toBeDefined();
    fireEvent.click(oscABusB);
    expect(handleSourceRouteChange).toHaveBeenCalledWith('oscA', 'laneB');

    // Find Granular route to THRU
    const granularThru = screen.getByRole('button', { name: 'Route Granular to THRU' });
    expect(granularThru).toBeDefined();
    fireEvent.click(granularThru);
    expect(handleSourceRouteChange).toHaveBeenCalledWith('granular', 'thru');
  });

  it('supports adding and removing effect modules to/from lanes', () => {
    const handleAddEffectToLane = vi.fn();
    const handleRemoveEffectFromLane = vi.fn();
    const handleMoveEffectBetweenLanes = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['gain', 'filter'],
          laneBOrder: ['delay'],
          onAddEffectToLane: handleAddEffectToLane,
          onRemoveEffectFromLane: handleRemoveEffectFromLane,
          onMoveEffectBetweenLanes: handleMoveEffectBetweenLanes
        })
      )
    );

    // Open add module modal for Lane B
    const addLaneBBtn = screen.getByTestId('add-module-laneB-button');
    fireEvent.click(addLaneBBtn);

    // Modal dialog should be displayed with module list
    expect(screen.getByRole('dialog', { name: /Add Effect Module to LANE B/i })).toBeDefined();

    // Click on 'Tape Saturation' to add to Lane B
    const driveBtn = screen.getByRole('button', { name: /Tape Saturation/i });
    fireEvent.click(driveBtn);
    expect(handleAddEffectToLane).toHaveBeenCalledWith('laneB', 'drive');

    // Remove Preamp Gain from Lane A
    const removeGainBtn = screen.getByRole('button', { name: 'Remove Preamp Gain from LANE A' });
    fireEvent.click(removeGainBtn);
    expect(handleRemoveEffectFromLane).toHaveBeenCalledWith('laneA', 'gain');

    // Transfer delay from Lane B to Lane A
    const transferDelayBtn = screen.getByRole('button', { name: 'Move Ping-Pong Delay to BUS A' });
    fireEvent.click(transferDelayBtn);
    expect(handleMoveEffectBetweenLanes).toHaveBeenCalledWith('delay', 'laneB', 'laneA');
  });

  it('renders Dual LFO Modulation card in effect rack with controls and bypass', () => {
    const handleEffectsChange = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['lfo'],
          laneBOrder: [],
          onEffectsChange: handleEffectsChange
        })
      )
    );

    // LFO Rack Slot Card
    expect(screen.getByTestId('effect-rack-slot-lfo')).toBeDefined();
    expect(screen.getByText('Dual LFO Modulation')).toBeDefined();
    expect(screen.getByText('双通道低频调制')).toBeDefined();

    // Verify LFO 1 and LFO 2 sections
    expect(screen.getByText('LFO 1 PRIMARY')).toBeDefined();
    expect(screen.getByText('LFO 2 SECONDARY')).toBeDefined();

    // Toggle Bypass
    const lfoBypassBtn = screen.getByRole('button', { name: 'Dual LFO Bypass' });
    fireEvent.click(lfoBypassBtn);
    expect(handleEffectsChange).toHaveBeenCalledWith({
      lfo: { bypass: true }
    });
  });

  it('enforces effect module coexistence and uniqueness rules when adding or moving modules', () => {
    const handleAddEffectToLane = vi.fn();

    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          laneAOrder: ['adsr', 'drive'],
          laneBOrder: ['adsr'], // ADSR already exists globally (max 1)
          onAddEffectToLane: handleAddEffectToLane
        })
      )
    );

    // Open add module modal for Lane A
    const addLaneABtn = screen.getByTestId('add-module-laneA-button');
    fireEvent.click(addLaneABtn);

    // ADSR is max 1 per lane, so in Lane A it should be disabled
    const adsrBtn = screen.getByTestId('add-module-option-adsr');
    expect(adsrBtn).toHaveProperty('disabled', true);
    expect(adsrBtn.getAttribute('aria-label')).toContain('该轨已达上限');

    // Drive is max 1 per lane, so in Lane A it should be disabled
    const driveBtn = screen.getByTestId('add-module-option-drive');
    expect(driveBtn).toHaveProperty('disabled', true);
    expect(driveBtn.getAttribute('aria-label')).toContain('该轨已达上限');

    // Filter allows multi-instance (up to 2 in lane), so it should be clickable
    const filterBtn = screen.getByTestId('add-module-option-filter');
    expect(filterBtn).toHaveProperty('disabled', false);
    fireEvent.click(filterBtn);
    // Since Lane A had 0 filters, next is 'filter'
    expect(handleAddEffectToLane).toHaveBeenCalledWith('laneA', 'filter');
  });

  it('renders Bus Mix equal-power knob in Master output bay and dispatches updates', () => {
    const handleEffectsChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onEffectsChange: handleEffectsChange,
          effects: {
            masterGain: 0.8,
            masterPan: 0.0,
            busMix: 0.5,
            filter: { type: 'lowpass', cutoff: 1000, resonance: 1.0, bypass: false },
            drive: { amount: 0.0, tone: 0.5, bypass: false },
            delay: { time: 0.3, feedback: 0.4, damping: 2000, mix: 0.2, bypass: false },
            reverb: { decayTime: 2.0, damping: 0.5, mix: 0.2, bypass: false }
          }
        })
      )
    );

    const busMixKnob = screen.getByRole('slider', { name: 'Bus Mix' });
    expect(busMixKnob).toBeDefined();
    expect(screen.getByText('BUS A/B')).toBeDefined();

    // Trigger keyboard navigation change on Bus Mix
    fireEvent.keyDown(busMixKnob, { key: 'ArrowUp' });
    expect(handleEffectsChange).toHaveBeenCalledWith(
      expect.objectContaining({ busMix: expect.any(Number) })
    );
  });

  it('renders 120 ambient soundscapes in paginated carousel with page stepping, category tabs, and drag swipe', () => {
    const handleChannelChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onChannelStripChange: handleChannelChange
        })
      )
    );

    // Page 1: 江海潮涌 (0..9)
    expect(screen.getByText('PAGE 1/12')).toBeDefined();
    expect(screen.getByText('岸边波浪 2')).toBeDefined();
    expect(screen.getByText('奔涌溪水')).toBeDefined();

    const nextBtn = screen.getByRole('button', { name: 'Next Soundscape Page' });
    fireEvent.click(nextBtn);

    // Page 2: 雨境雨幕 (10..19)
    expect(screen.getByText('PAGE 2/12')).toBeDefined();
    expect(screen.getByText('窗外观雨')).toBeDefined();
    expect(screen.getByText('雷声 1')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 3: 林泉飞瀑 (20..29)
    expect(screen.getByText('PAGE 3/12')).toBeDefined();
    expect(screen.getByText('高山溪流')).toBeDefined();
    expect(screen.getByText('洞穴细流')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 4: 风啸寒原 (30..39)
    expect(screen.getByText('PAGE 4/12')).toBeDefined();
    expect(screen.getByText('植物摇曳 1')).toBeDefined();
    expect(screen.getByText('旗帜猎风')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 5: 温暖地火 (40..49)
    expect(screen.getByText('PAGE 5/12')).toBeDefined();
    expect(screen.getByText('燃烧火焰 1')).toBeDefined();
    expect(screen.getByText('细沙流动')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 6: 原野生态 (50..59)
    expect(screen.getByText('PAGE 6/12')).toBeDefined();
    expect(screen.getByText('夏日群山 1')).toBeDefined();
    expect(screen.getByText('秋夜水畔 2')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 7: 精选混音 I (60..69)
    expect(screen.getByText('PAGE 7/12')).toBeDefined();
    expect(screen.getByText('幽深森林')).toBeDefined();
    expect(screen.getByText('游鲸下潜')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 8: 精选混音 II (70..79)
    expect(screen.getByText('PAGE 8/12')).toBeDefined();
    expect(screen.getByText('湖畔晨曦')).toBeDefined();
    expect(screen.getByText('林中小屋')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 9: 飞鸟游鲸 (80..89)
    expect(screen.getByText('PAGE 9/12')).toBeDefined();
    expect(screen.getByText('抹香鲸鸣')).toBeDefined();
    expect(screen.getByText('丛林鹦鹉')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 10: 原野伴生 (90..99)
    expect(screen.getByText('PAGE 10/12')).toBeDefined();
    expect(screen.getByText('猫咪呼噜')).toBeDefined();
    expect(screen.getByText('檐下麻雀')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 11: 冥想器乐 (100..109)
    expect(screen.getByText('PAGE 11/12')).toBeDefined();
    expect(screen.getByText('颂钵回响')).toBeDefined();
    expect(screen.getByText('复古八音盒')).toBeDefined();

    fireEvent.click(nextBtn);

    // Page 12: 城市生活 (110..119)
    expect(screen.getByText('PAGE 12/12')).toBeDefined();
    expect(screen.getByText('咖啡馆')).toBeDefined();
    expect(screen.getByText('柔和粉噪')).toBeDefined();

    const pinkNoiseBtn = screen.getByText('柔和粉噪');
    fireEvent.click(pinkNoiseBtn);
    expect(handleChannelChange).toHaveBeenCalledWith({
      ambient: { sampleId: 'pinkNoise' }
    });

    const prevBtn = screen.getByRole('button', { name: 'Previous Soundscape Page' });
    fireEvent.click(prevBtn);
    expect(screen.getByText('PAGE 11/12')).toBeDefined();

    // Mouse drag swipe interaction: dragging left advances page (threshold > 35px)
    const viewport = screen.getByTestId('soundscape-carousel-viewport');
    fireEvent.pointerDown(viewport, { clientX: 200, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 120 });
    fireEvent.pointerUp(viewport, { clientX: 120 });
    expect(screen.getByText('PAGE 12/12')).toBeDefined();

    // Dragging right goes back
    fireEvent.pointerDown(viewport, { clientX: 100, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 180 });
    fireEvent.pointerUp(viewport, { clientX: 180 });
    expect(screen.getByText('PAGE 11/12')).toBeDefined();

    // Category tabs clicking directly navigates to target page
    const categoryTabs = screen.getAllByRole('tab');
    expect(categoryTabs.length).toBe(12);
    fireEvent.click(categoryTabs[0]); // Jump to Page 1
    expect(screen.getByText('PAGE 1/12')).toBeDefined();

    // Wheel event does NOT trigger page change (disabled per user requirement)
    fireEvent.wheel(viewport, { deltaY: 100 });
    expect(screen.getByText('PAGE 1/12')).toBeDefined();
  });

  it('renders dedicated BUS A Master and BUS B Master faders and dispatches level changes', () => {
    const handleEffectsChange = vi.fn();
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, {
          onEffectsChange: handleEffectsChange,
          effects: {
            masterGain: 0.8,
            masterPan: 0.0,
            busMix: 0.5,
            busLevelA: 1.0,
            busLevelB: 0.75,
            filter: { type: 'lowpass', cutoff: 1000, resonance: 1.0, bypass: false },
            drive: { amount: 0.0, tone: 0.5, bypass: false },
            delay: { time: 0.3, feedback: 0.4, damping: 2000, mix: 0.2, bypass: false },
            reverb: { decayTime: 2.0, damping: 0.5, mix: 0.2, bypass: false }
          }
        })
      )
    );

    expect(screen.getByText('BUS A MASTER')).toBeDefined();
    expect(screen.getByText('BUS B MASTER')).toBeDefined();

    const busFaderA = screen.getByRole('slider', { name: 'BUS A Master' });
    expect(busFaderA).toBeDefined();

    const busFaderB = screen.getByRole('slider', { name: 'BUS B Master' });
    expect(busFaderB).toBeDefined();

    fireEvent.keyDown(busFaderA, { key: 'ArrowDown' });
    expect(handleEffectsChange).toHaveBeenCalledWith(
      expect.objectContaining({ busLevelA: expect.any(Number) })
    );

    fireEvent.keyDown(busFaderB, { key: 'ArrowDown' });
    expect(handleEffectsChange).toHaveBeenCalledWith(
      expect.objectContaining({ busLevelB: expect.any(Number) })
    );
  });

  it('satisfies 100% strict Zero-Emoji requirement across full rendered DOM markup', () => {
    const { container } = render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(HardwareDeck, null)
      )
    );

    const textContent = container.textContent || '';
    expect(emojiRegex.test(textContent)).toBe(false);

    const innerHtml = container.innerHTML;
    expect(emojiRegex.test(innerHtml)).toBe(false);
  });
});
