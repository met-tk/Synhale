import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { SignalFlowGraph } from '../../../src/ui/components/deck/SignalFlowGraph';
import { DEFAULT_CHANNEL_STRIP, DEFAULT_EFFECTS_CHAIN } from '../../../src/audio/engine';

describe('SignalFlowGraph Semi-Modular Topology View', () => {
  it('renders all 4 sound sources (OSC A, GRAIN CLOUD, OSC B, SUB 432Hz)', () => {
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={false}
        isDark={true}
      />
    );

    expect(screen.getByText('OSC A')).toBeDefined();
    expect(screen.getByText('WAVETABLE')).toBeDefined();
    expect(screen.getByText('GRAIN')).toBeDefined();
    expect(screen.getByText('CLOUD')).toBeDefined();
    expect(screen.getByText('OSC B')).toBeDefined();
    expect(screen.getByText('NOISE')).toBeDefined();
    expect(screen.getByText('SUB')).toBeDefined();
    expect(screen.getByText('432Hz')).toBeDefined();
  });

  it('renders default effect chain order (PREAMP, DRIVE, FILTER, ADSR, DELAY, REVERB, OUT)', () => {
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
      />
    );

    expect(screen.getByText('PREAMP')).toBeDefined();
    expect(screen.getByText('DRIVE')).toBeDefined();
    expect(screen.getByText('FILTER')).toBeDefined();
    expect(screen.getByText('ADSR')).toBeDefined();
    expect(screen.getByText('DELAY')).toBeDefined();
    expect(screen.getByText('REVERB')).toBeDefined();
    expect(screen.getByText('OUT')).toBeDefined();
    expect(screen.getByText('LIMITER ON')).toBeDefined();
  });

  it('renders reordered effects based on custom effectOrder prop', () => {
    const customOrder = ['filter', 'drive', 'gain', 'delay', 'reverb', 'adsr'];
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={false}
        effectOrder={customOrder}
      />
    );

    expect(screen.getByText('FILTER')).toBeDefined();
    expect(screen.getByText('DRIVE')).toBeDefined();
    expect(screen.getByText('PREAMP')).toBeDefined();
  });

  it('calls onReorderEffects when move buttons are clicked', () => {
    const onReorder = vi.fn();
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
        effectOrder={['gain', 'drive', 'filter', 'adsr', 'delay', 'reverb']}
        onReorderEffects={onReorder}
      />
    );

    // Click Move Drive Left -> should swap gain and drive
    const moveDriveLeft = screen.getByLabelText('Move Drive Left');
    fireEvent.click(moveDriveLeft);

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(['drive', 'gain', 'filter', 'adsr', 'delay', 'reverb']);
  });

  it('supports drag-and-drop reordering within the same lane', () => {
    const onLaneReorder = vi.fn();
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
        laneAOrder={['gain', 'drive', 'filter']}
        laneBOrder={['delay', 'reverb']}
        onLaneReorder={onLaneReorder}
      />
    );

    const gainNode = screen.getByText('PREAMP').closest('[draggable="true"]')!;
    const filterNode = screen.getByText('FILTER').closest('[draggable="true"]')!;

    // Start drag on gain
    fireEvent.dragStart(gainNode, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move'
      }
    });

    // Drag over filter (mock bounding rect to place it at index 2)
    filterNode.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 100,
      width: 100,
      top: 0,
      bottom: 50,
      right: 200
    });
    const dragOverEv = createEvent.dragOver(filterNode);
    Object.defineProperty(dragOverEv, 'clientX', { value: 180 }); // clientX > midX -> insert after filter (index 3)
    fireEvent(filterNode, dragOverEv);

    // Drop on filter
    fireEvent.drop(filterNode, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ type: 'topology-effect', id: 'gain', sourceLane: 'laneA' }))
      }
    });

    expect(onLaneReorder).toHaveBeenCalledWith('laneA', ['drive', 'filter', 'gain']);
  });

  it('supports cross-bus drag-and-drop between Lane A and Lane B', () => {
    const onMoveEffectBetweenLanes = vi.fn();
    const onLaneReorder = vi.fn();
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
        laneAOrder={['gain', 'drive']}
        laneBOrder={['delay', 'reverb']}
        onLaneReorder={onLaneReorder}
        onMoveEffectBetweenLanes={onMoveEffectBetweenLanes}
      />
    );

    const driveNode = screen.getByText('DRIVE').closest('[draggable="true"]')!;
    const reverbNode = screen.getByText('REVERB').closest('[draggable="true"]')!;

    // Drag DRIVE from Lane A
    fireEvent.dragStart(driveNode, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move'
      }
    });

    // Drag over REVERB in Lane B (midX = 150, clientX = 120 -> insert before reverb, index 1)
    reverbNode.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 100,
      width: 100,
      top: 0,
      bottom: 50,
      right: 200
    });
    const dragOverCrossEv = createEvent.dragOver(reverbNode);
    Object.defineProperty(dragOverCrossEv, 'clientX', { value: 120 });
    fireEvent(reverbNode, dragOverCrossEv);

    // Drop on REVERB in Lane B
    fireEvent.drop(reverbNode, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ type: 'topology-effect', id: 'drive', sourceLane: 'laneA' }))
      }
    });

    expect(onMoveEffectBetweenLanes).toHaveBeenCalledWith('drive', 'laneA', 'laneB');
    expect(onLaneReorder).toHaveBeenCalledWith('laneB', ['delay', 'drive', 'reverb']);
  });

  it('shows empty slot dropzone and allows dropping into an empty bus', () => {
    const onMoveEffectBetweenLanes = vi.fn();
    const onLaneReorder = vi.fn();
    render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
        laneAOrder={['gain', 'drive', 'delay']}
        laneBOrder={[]}
        onLaneReorder={onLaneReorder}
        onMoveEffectBetweenLanes={onMoveEffectBetweenLanes}
      />
    );

    // Empty slot should be rendered
    const emptySlot = screen.getByText('拖入 BUS B');
    expect(emptySlot).toBeDefined();

    const delayNode = screen.getByText('DELAY').closest('[draggable="true"]')!;

    // Drag DELAY from Lane A
    fireEvent.dragStart(delayNode, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move'
      }
    });

    // Drag over empty slot
    fireEvent.dragOver(emptySlot);
    expect(screen.getByText(/释放装载 BUS B/)).toBeDefined();

    // Drop onto empty slot
    fireEvent.drop(emptySlot, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ type: 'topology-effect', id: 'delay', sourceLane: 'laneA' }))
      }
    });

    expect(onMoveEffectBetweenLanes).toHaveBeenCalledWith('delay', 'laneA', 'laneB');
    expect(onLaneReorder).toHaveBeenCalledWith('laneB', ['delay']);
  });

  it('complies strictly with zero emoji standard', () => {
    const { container } = render(
      <SignalFlowGraph
        channelStrip={DEFAULT_CHANNEL_STRIP}
        effects={DEFAULT_EFFECTS_CHAIN}
        isPlaying={true}
        isDark={true}
      />
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });
});
