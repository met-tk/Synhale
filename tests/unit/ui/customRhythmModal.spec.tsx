import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomRhythmModal } from '../../../src/ui/components/settings/CustomRhythmModal';

describe('CustomRhythmModal UI Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CustomRhythmModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with 4-stage steppers, template quick-picks, and live SVG curve when open', () => {
    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Dialog title
    expect(screen.getByRole('dialog', { name: '自定义呼吸节律' })).toBeDefined();
    expect(screen.getByText('新增节律')).toBeDefined();

    // 4 stages
    expect(screen.getByText('吸气')).toBeDefined();
    expect(screen.getByText('吸气屏息')).toBeDefined();
    expect(screen.getByText('呼气')).toBeDefined();
    expect(screen.getByText('呼气屏息')).toBeDefined();

    // Template pills
    expect(screen.getByText('四方平衡')).toBeDefined();
    expect(screen.getByText('助眠松弛')).toBeDefined();
    expect(screen.getByText('心率共振')).toBeDefined();

    // Metrics bar
    expect(screen.getByText('单圈周期')).toBeDefined();
    expect(screen.getByText('呼吸频率')).toBeDefined();
    expect(screen.getByText('吸呼比')).toBeDefined();

    // Default 4-4-4-4 total = 16.0s
    expect(screen.getByText('16.0s')).toBeDefined();
  });

  it('applies template presets smoothly when clicking quick buttons', () => {
    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Click 助眠松弛 (4-7-8)
    const sleepTmplBtn = screen.getByText('助眠松弛').closest('button');
    expect(sleepTmplBtn).toBeDefined();
    fireEvent.click(sleepTmplBtn!);

    // Total duration should now be 4 + 7 + 8 + 0 = 19.0s
    expect(screen.getByText('19.0s')).toBeDefined();
  });

  it('increments and decrements stage durations via stepper buttons with bounds checking', () => {
    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Find all Minus and Plus buttons
    const minusButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg')?.classList.contains('lucide-minus'));
    const plusButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg')?.classList.contains('lucide-plus'));

    expect(minusButtons.length).toBe(4);
    expect(plusButtons.length).toBe(4);

    // Click Plus on Inhale (first stepper)
    fireEvent.click(plusButtons[0]);
    // Inhale was 4.0, now 4.5
    expect(screen.getByText('4.5')).toBeDefined();

    // Total duration should be 4.5 + 4 + 4 + 4 = 16.5s
    expect(screen.getByText('16.5s')).toBeDefined();
  });

  it('pre-fills initial rhythm fields when editing an existing user rhythm', () => {
    const existing = {
      id: 'user-rhythm-test',
      name: '深度冥想 5-3-7-3',
      inhale: 5.0,
      holdIn: 3.0,
      exhale: 7.0,
      holdOut: 3.0
    };

    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialRhythm={existing}
      />
    );

    expect(screen.getByText('编辑节律')).toBeDefined();
    const input = screen.getByDisplayValue('深度冥想 5-3-7-3');
    expect(input).toBeDefined();

    // Total: 5 + 3 + 7 + 3 = 18.0s
    expect(screen.getByText('18.0s')).toBeDefined();
  });

  it('submits form, saves to storage, and invokes onSave callback', () => {
    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /保存并应用/ });
    fireEvent.click(submitBtn);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const saved = mockOnSave.mock.calls[0][0];
    expect(saved.id).toContain('user-rhythm-');
    expect(saved.inhale).toBe(4.0);
    expect(saved.holdIn).toBe(4.0);
    expect(saved.exhale).toBe(4.0);
    expect(saved.holdOut).toBe(4.0);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles ESC key press to close the dialog', () => {
    render(
      <CustomRhythmModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
