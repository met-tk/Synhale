import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../../../src/ui/components/settings/SettingsModal';
import { DEFAULT_CUE_SETTINGS } from '../../../src/audio/cue/breathCueConfig';

describe('SettingsModal UI Component', () => {
  const mockOnClose = vi.fn();
  const mockOnToggleTheme = vi.fn();
  const mockOnCueSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      React.createElement(SettingsModal, {
        isOpen: false,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders settings dialog with theme switcher and breath cue controls when open', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    // Title and Dialog
    expect(screen.getByRole('dialog', { name: /偏好设置/ })).toBeDefined();
    expect(screen.getByText(/系统设置与偏好/)).toBeDefined();

    // Theme Switcher Section
    expect(screen.getByLabelText('深色模式')).toBeDefined();
    expect(screen.getByLabelText('浅色模式')).toBeDefined();

    // Breath Cue Section
    expect(screen.getByText(/呼吸阶段转换提示音/)).toBeDefined();
    expect(screen.getByRole('switch', { name: /提示音总开关/ })).toBeDefined();

    // 4 Transition Nodes
    expect(screen.getByText(/呼气结束 · 开始吸气/)).toBeDefined();
    expect(screen.getByText(/吸气结束 · 开始屏息/)).toBeDefined();
    expect(screen.getByText(/屏息结束 · 开始呼气/)).toBeDefined();
    expect(screen.getByText(/呼气结束 · 空肺静息/)).toBeDefined();

    // 5 Cue Presets
    expect(screen.getByText('颂钵微鸣')).toBeDefined();
    expect(screen.getByText('自然水滴')).toBeDefined();
    expect(screen.getByText('温润暖木')).toBeDefined();
    expect(screen.getByText('空谷风铃')).toBeDefined();
    expect(screen.getByText('暖腹深钵')).toBeDefined();
  });

  it('triggers onToggleTheme when switching theme modes', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    const lightBtn = screen.getByLabelText('浅色模式');
    fireEvent.click(lightBtn);
    expect(mockOnToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('toggles cue sound enabled switch', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    const switchBtn = screen.getByRole('switch', { name: /提示音总开关/ });
    fireEvent.click(switchBtn);

    expect(mockOnCueSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_CUE_SETTINGS,
      enabled: false
    });
  });

  it('toggles transition node check state', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    // Toggle inhale_to_holdIn from false to true
    const holdInNodeBtn = screen.getByRole('button', { name: /节点切换: 吸气结束 · 开始屏息/ });
    fireEvent.click(holdInNodeBtn);

    expect(mockOnCueSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_CUE_SETTINGS,
      nodes: {
        ...DEFAULT_CUE_SETTINGS.nodes,
        inhale_to_holdIn: true
      }
    });
  });

  it('switches cue preset selection', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    const waterDropBtn = screen.getByRole('button', { name: /选择预置: 自然水滴/ });
    fireEvent.click(waterDropBtn);

    expect(mockOnCueSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_CUE_SETTINGS,
      preset: 'zenWaterDrop'
    });
  });

  it('allows auditioning preset sounds via preview button', () => {
    render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    const previewBtn = screen.getByRole('button', { name: /试听当前提示音: 颂钵微鸣/ });
    expect(() => {
      fireEvent.click(previewBtn);
    }).not.toThrow();
  });

  it('strictly adheres to zero-emoji aesthetic', () => {
    const { container } = render(
      React.createElement(SettingsModal, {
        isOpen: true,
        onClose: mockOnClose,
        isDark: true,
        onToggleTheme: mockOnToggleTheme,
        cueSettings: DEFAULT_CUE_SETTINGS,
        onCueSettingsChange: mockOnCueSettingsChange
      })
    );

    const text = container.textContent || '';
    const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);
  });
});
