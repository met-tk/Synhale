# Project: Synhale 2 数字合成器工程全局纲领与架构规范 (PROJECT.md)

## 1. 架构总览 (Architecture)

Synhale 2 是一款面向身心呼吸训练与电子音乐制作的可游玩半模块化数字合成器与沉浸式声疗乐器。项目采用 React 19 + TypeScript + Vite + Tailwind CSS 技术栈，基于 Web Audio API 构建高质量带限减法合成引擎，并由呼吸宏（Breath Macro）作为一级物理驱动源，深度联动禅意纯净神圣几何视觉与硬件级工业秩序交互 Deck。

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 User Interaction                       │
                               │  - Tap Anywhere Canvas (Play/Pause, AudioContext Init) │
                               │  - Hardware Deck (Bipolar Faders, VU, 320ms Knobs)     │
                               │  - Stage Automation Timeline Editor                    │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             Breath Macro & Clock Core (R2)                                             │
│  - 4-Stage State Machine: Inhale -> Hold In -> Exhale -> Hold Out (0-duration Passthrough, Microsecond Anchor)        │
│  - Breath Macro M ∈ [0, 1] + Local Phase φ ∈ [0, 1]                                                                    │
│  - Stage Automation Timeline (Symmetric Tension Interpolation, 15ms De-zippering Scheduling)                           │
└──────────────────────────┬──────────────────────────────────────────────────────────────┬──────────────────────────────┘
                           │                                                              │
                           ▼                                                              ▼
┌──────────────────────────────────────────────────────┐      ┌──────────────────────────────────────────────────────────┐
│             Core Audio Engine (R1)                   │      │         Sacred Geometry Visual Canvas (R3)               │
│  - Channel Strip:                                    │      │  - HTML5 Canvas 2D + Auto DPR Scaling + Zero GC Batch    │
│    * OSC A: 24 PeriodicWave Slices + Equal-Power Slur│      │  - 4 Modes: Minimal Ring, Sacred Geometry, Zen Waves,    │
│    * OSC B: Paul Kellet Pink Noise + Airway Filter   │      │             Calm Focus                                   │
│    * Sub/Drone: 432Hz Tuning + 0.05Hz Micro-Drift    │      │  - Dynamic Non-linear Breath Deformation                 │
│  - Analog Chain:                                     │      │  - Floating Status Capsule: Stage, Countdown, Breath Dot │
│    * Drive: 4x Oversampled Waveshaper + Loudness Comp│      └──────────────────────────────────────────────────────────┘
│    * Filter: 24dB/oct Cascaded Multimode (LP/HP/BP)  │
│    * Delay: Ping-Pong Stereo + High-Cut Damping      │
│    * Reverb: Math-synthesized IR Convolver           │
│  - 0ms Zero-Residue Hard Cut:                        │
│    * 2.5ms Cosine Micro-ramp                         │
│    * Delay/Reverb Loop Purge                         │
└──────────────────────────────────────────────────────┘
```

---

## 2. 特性清单 (Feature Inventory)

依据前期调研与原始需求，全系统拆解为 27 项明确功能特性，已完成 100% 里程碑归属与来源标定：

| # | 特性名称 (Feature) | 详细描述与规格 | 归属里程碑 | 来源依据 |
|---|-------------------|---------------|-----------|---------|
| F01 | 项目工程脚手架与测试环境 | React 19 + TypeScript + Vite + Tailwind CSS + Lucide + Vitest + Web Audio Mock 基建搭建与 CI 构建验证 | M0 (Scaffold) | R5 / Explorer 3 |
| F02 | OSC A 声疗波表与等功率滑移 | 24 组经典带限 `PeriodicWave` 声疗波表切片，双振荡器等功率交叉渐变（Equal-Power Crossfade）无缝演化 | M1 | R1 / Explorer 1 |
| F03 | OSC B 粉红气流噪声发生器 | Paul Kellet 算法 1/f 立体声无缝循环粉红噪声缓冲，带通呼吸道摩擦滤波与湍流感塑形 | M1 | R1 / Explorer 1 |
| F04 | Sub/Drone 调律基底与微漂移 | 低频正弦/三角深层基底，432Hz 调律换算，0.05Hz（$\pm 4\text{ cents}$）微音高游走 LFO 抗驻波 | M1 | R1 / Explorer 1 |
| F05 | 3 音轨独立增益与硬件旁路 | 3 轨各自独立音量推子，配备 5ms 双增益平滑硬件级真旁路（Bypass）继电器切换网络 | M1 | R1 / Explorer 1 |
| F06 | 4x 过采样软饱和过载 (Drive) | `WaveShaperNode` Tanh 软饱和染色，4x 过采样消除混叠镜像，反向响度自动增益补偿 | M1 | R1 / Explorer 1 |
| F07 | 24dB/oct 级联模拟多模滤波器 | 双阶梯串联双极点（Cascaded Biquad）模拟滤波器，低通/高通/带通无缝切换，品质因数平分抗失真 | M1 | R1 / Explorer 1 |
| F08 | 带阻尼立体声乒乓延迟 (Delay) | 交叉回馈立体声延迟，反馈环路内置高频吸收低通滤波，还原模拟磁带空间渐暗衰减 | M1 | R1 / Explorer 1 |
| F09 | 纯数学高斯合成脉冲混响 (Reverb) | 内存实时生成高斯衰减合成脉冲响应（Synthetic IR），驱动原生 `ConvolverNode`，免外部音频资产 | M1 | R1 / Explorer 1 |
| F10 | 0ms 绝对无残留即停硬切机制 | 2.5ms 余弦抗爆微斜坡瞬切，同步清空 Delay/Reverb 回环增益与切断输入，消除扬声器爆音与鬼影回声 | M1 | R1 / Explorer 1 |
| F11 | 四阶段呼吸状态机与 0 时长穿透 | Inhale/Hold In/Exhale/Hold Out 平稳状态流转，高精度锚点时钟，0 时长阶段瞬时穿透跳步 | M2 | R2 / Explorer 2 |
| F12 | 呼吸宏物理调制与阶段声学规则 | 全局宏 $M \in [0, 1]$ 驱动共鸣腔/气流/声场/音高，实施吸气扩张、屏息悬停、呼气排空、静息虚空声学矩阵 | M2 | R2 / Explorer 2 |
| F13 | 图形化阶段包络编辑器 (Timeline) | 4 阶段成比例视口，端点交互与对称张力曲线（Tension $T \in [-1, 1]$），15ms 抗拉链调度 | M2 | R2 / Explorer 2 |
| F14 | 呼吸参数与包络持久化及预设 | 出厂 5 组生理呼吸节奏与 4 套声疗自动化预设，支持 LocalStorage `schemaVersion: 2` 校验与读写 | M2 | R2 / Explorer 2 |
| F15 | Canvas 2D 纯净视觉渲染引擎 | HTML5 Canvas 2D 硬件加速，DPR 自动像素适配，零 GC 临时变量与 Path2D 批处理，稳定锁定 60fps | M3 | R3 / Explorer 3 |
| F16 | 4 种神圣几何视觉形态预设 | Minimal Ring (光环), Sacred Geometry (麦达昶/双四面体), Zen Waves (涟漪), Calm Focus (脉冲) | M3 | R3 / Explorer 3 |
| F17 | 全画布任意位置轻触播放/暂停 | 画布中央 100% 净空无大圆盘；$d < 8\text{px}, t < 220\text{ms}$ 智能轻触判定；首触解锁 AudioContext | M3 | R3 / Explorer 3 |
| F18 | 底部悬浮微型呼吸状态胶囊 | 悬浮微型胶囊，显示阶段中文名称、毫秒倒计时与平滑呼吸光晕，点击支持抽屉唤出 | M3 | R3 / Explorer 3 |
| F19 | 绝对零 Emoji 规范与单色矢量体系 | 全界面严格禁止使用任何 Emoji 字符，全面采用 Lucide 1.5px 纯净细线单色矢量图标 | M4 | R4 / Explorer 3 |
| F20 | 高对比度工业秩序双主题系统 | 1px 细线精准规整边框，深邃暗黑（Dark Zinc）与明亮日光（Light Sand）硬件级高对比度主题 | M4 | R4 / Explorer 3 |
| F21 | 移动端原生抽屉式选择器 (Drawer) | 专为触控与移动端优化的 Bottom Sheet 抽屉组件，替代原生下拉框，支持平滑手势回弹 | M4 | R4 / Explorer 3 |
| F22 | 硬件调制 Deck 与中心零位 VU 表 | 中心零位双向动态 VU 调制计（$-1.0 \sim +1.0$），双极性磁性推子，实时反映调制量物理消长 | M4 | R4 / Explorer 3 |
| F23 | 320ms 长按旋钮唤起调制卡片 | 旋钮单指旋转调节数值，长按超过 320ms 触发触觉反馈并呼出调制路由挂载卡片 | M4 | R4 / Explorer 3 |
| F24 | 全系统视听与物理时钟总装集成 | 音频通道条、呼吸宏、几何画布、硬件 Deck 全面连通连调，视听时钟微秒级绝对同步 | M5 | R1-R5 / 全局 |
| F25 | 100% 通过 E2E 需求测试套件 | Tier 1 (特性覆盖), Tier 2 (边界极值), Tier 3 (跨特性组合), Tier 4 (真实声疗场景) 测试全过 | Final Phase 1 | R5 / E2E Track |
| F26 | 对抗性覆盖率加固与穿刺加固 | Tier 5 白盒对抗穿刺测试，发现未覆盖边缘缺陷与并发竞态，完成自动化代码加固 | Final Phase 2 | R5 / Challenger |
| F27 | 司法级防作弊与真实现完整性审查 | 启动 Forensic Auditor 审查所有源文件，严禁假实现、硬编码返回值或绕过逻辑 | Final Audit | 规范铁律 |
| F28 | 4 大独立声源彻底解耦与隔离 | 审查 OSC A, GRANULAR CLOUD, OSC B, SUB DRONE 在数据流、音频时钟与视觉渲染上的完全隔离 | M1 (声源解耦) | R1 / Explorer 1 |
| F29 | 粒子视窗回退切断与停帧门禁 | 切除 `engine.getVisualGrains()` 错误退化到 `oscA.getActiveVisualGrains()` 逻辑，`GrainSourceVisualizer` 仅反映 Granular 粒子并受控于 bypass | M1 (声源解耦) | R1 / Explorer 1 |
| F30 | OSC A 遗留调度器切除与解绑 | 切除 `OscAChannel.ts` 内部残留约 300 行遗留粒子调度代码，恢复纯粹波表定位，切除对 Drone 与 ADSR 的绑架 | M1 (声源解耦) | R1 / Explorer 1 |
| F31 | 拓扑图与声源状态 1:1 同步 | `SignalFlowGraph.tsx` 拓扑流光与声源状态 1:1 同步，清理 `oscA.particles` 遗留回退读数 | M1 (声源解耦) | R1 / Explorer 1 |
| F32 | 25ms 平滑常数与调度防斜率突变 | `GainModule.ts` 平滑时间常数升级至 25ms 黄金标准，引入 `cancelScheduledValues(now)` 与当前瞬时值锚定 | M2 (防拉链音) | R2 / Explorer 2 |
| F33 | 12Hz 前置隔直滤波 (DC Blocker) | `GainModule.ts` 内部前级串入 12Hz 高通隔直滤波（Butterworth Q 0.707），阻断直流偏置进入下游高 Q 谐振多模滤波器 | M2 (防拉链音) | R2 / Explorer 2 |
| F34 | 净化引擎调制无效重复覆写 | `engine.ts` `applyLiveModulationRoutes` 增加状态差异门限过滤，消除对 `GainModule` 与 `MultimodeFilter` 60Hz 无效重复 `setParams` 覆写 | M2 (防拉链音) | R2 / Explorer 2 |
| F35 | 音色预设标准化与声源补齐 | 校准 `soundPresets.ts` 12 款出厂预设与 `userPresets.ts`，100% 显式补齐 4 大独立声源与完整效果链参数 | M3 (预设校准) | R3 / Explorer 2 |
| F36 | 消除预设加载与存储交叉污染 | 重构 `App.tsx`、`engine.ts`、`userPresets.ts` 与 `migratePreset`，彻底切除 `oscA.particles` 覆写 `granular` 逻辑 | M3 (预设校准) | R3 / Explorer 2 |
| F37 | 界面与引擎参数 1:1 绝对保真 | 保证预设保存、导入与加载时，旋钮界面数值、内部 AudioEngine 节点参数与保存的预设数据完全 1:1 一致 | M3 (预设校准) | R3 / Explorer 2 |
| F38 | 专业 4 段参量 EQ 引擎 (EqModule) | 实现 `AudioEffectNode` 接口，无缝接入 `EffectChainManager`，级联 4 段原生 `BiquadFilterNode`，15ms 平滑调度，3ms 模式淡出，5ms 旁路 | M4 (参量EQ) | R4 / Explorer 3 |
| F39 | 实时矢量频响示波器 (EqVisualizer) | 基于双二阶滤波器 Cookbook 传递函数精确绘制 20Hz ~ 20kHz 对数频响矢量曲线与 4 频段交互控制手柄 | M4 (参量EQ) | R4 / Explorer 3 |
| F40 | EQ 硬件面板与信号流拓扑适配 | `HardwareDeck.tsx` 提供 4 列紧凑旋钮矩阵 + Low Type 切换 + Bypass 开关；`SignalFlowGraph.tsx` 扩展至 8 列插槽呈现 EQ 与重排 | M4 (参量EQ) | R4 / Explorer 3 |
| F41 | 全量自动化测试回归与补全 | 补齐 `MockBiquadFilterNode` lowshelf/highshelf 计算，新增 R1-R4 针对性测试，全量测试（原有 921 项 + 新增项）100% 绿灯 | M5 (总装守卫) | R5 / Explorer 3 |
| F42 | 生产构建 0 错误 0 警告 | `npm run build` (`tsc -b && vite build`) 0 错误、0 警告完成构建 | M5 (总装守卫) | R5 / Explorer 3 |
| F43 | 零 Emoji 与 S6-5 零黄橙色美学守卫 | 全系统 100% 坚守零 Emoji 规范，严守 S6-5 零黄色/橙色/琥珀色自动化法医测试红线 | M5 (总装守卫) | R5 / Explorer 3 |

---

## 3. 里程碑规划 (Milestones)

### 3.1 当前任务专项里程碑 (R1-R5 核心战役)

| # | 里程碑名称 | 核心范围 (Scope) | 依赖关系 | 预期产出与交付标准 | 当前状态 |
|---|-----------|----------------|---------|-------------------|---------|
| M1 | 声源拓扑治理与彻底解耦 (R1) | F28, F29, F30, F31 (`OscAChannel.ts`, `engine.ts`, `GrainSourceVisualizer.tsx`, `SignalFlowGraph.tsx`) | Survey 完成 | 4 大声源绝对独立，切除粒子回退穿透，清理遗留调度器，测试全绿 | `DONE` |
| M2 | Preamp Gain 防拉链音与隔直 (R2) | F32, F33, F34 (`GainModule.ts`, `engine.ts`) | M1 | 25ms 时间常数，`cancelScheduledValues`，12Hz DC Blocker，消除 60Hz 重复调用，测试全绿 | `IN_PROGRESS` |
| M3 | 音色预设全面校准与去交叉污染 (R3) | F35, F36, F37 (`soundPresets.ts`, `userPresets.ts`, `App.tsx`, `engine.ts`) | M1, M2 | 12 款出厂预设补齐 4 声源与效果链，彻底消除粒子污染，1:1 保真同步，测试全绿 | `PLANNED` |
| M4 | 全新专业参量 EQ 模块研发与适配 (R4) | F38, F39, F40 (`EqModule.ts`, `EqVisualizer.tsx`, `HardwareDeck.tsx`, `SignalFlowGraph.tsx`, `types/audio.ts`, `engine.ts`) | M3 | 4 段参量 EQ 引擎，实时频响示波器，面板旋钮矩阵，信号流图插槽，测试全绿 | `PLANNED` |
| M5 | 全量集成验证与工业科技美学守卫 (R5) | F41, F42, F43 (Mock 补全，全量回归测试，对抗测试，Forensic 审计，生产打包) | M1, M2, M3, M4 | 全量测试 100% 绿灯，`npm run build` 0 错误 0 警告，零 Emoji 零黄橙色 CLEAN 审计 | `PLANNED` |

### 3.2 历史里程碑归档 (M0-M-Final)

| # | 里程碑名称 | 核心范围 (Scope) | 状态 |
|---|-----------|----------------|------|
| M0 | 工程初始化与脚手架基建 | F01 (脚手架、测试 Harness) | `DONE` |
| M1-Hist | 核心声学引擎 | F02-F10 (通道条、滤波、效果链) | `DONE` |
| M2-Hist | 呼吸宏与阶段自动化 | F11-F14 (状态机、调制、包络) | `DONE` |
| M3-Hist | 几何视觉画布 | F15-F18 (Canvas 2D、预设、手势) | `DONE` |
| M4-Hist | 工业秩序界面与调制 Deck | F19-F23 (Deck、推子、旋钮、VU) | `DONE` |
| M5-Hist | 系统总装集成 | F24 (全要素集成) | `DONE` |
| M-Final-Hist | 全量 E2E 验证 | F25-F27 (E2E 测试通过) | `DONE` |

---

## 4. 跨模块接口契约 (Interface Contracts)

### 4.1 音频引擎契约 (`src/types/audio.ts`)

```typescript
export type FilterType = 'lowpass' | 'highpass' | 'bandpass';
export type BreathStage = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export interface ChannelStripParams {
  oscA: {
    wavetableIndex: number; // 0..23
    detune: number;         // cents: -50..+50
    harmonics: number;      // 0..1
    gain: number;           // 0..1
    bypass: boolean;
  };
  oscB: {
    color: number;          // 0..1 (filter center frequency)
    friction: number;       // 0..1 (resonance / Q)
    gain: number;           // 0..1
    bypass: boolean;
  };
  drone: {
    baseFreq: number;       // Hz (e.g. 54Hz for 432Hz tuning)
    pitchDrift: number;     // 0..1
    gain: number;           // 0..1
    bypass: boolean;
  };
}

export interface EffectsChainParams {
  filter: {
    type: FilterType;
    cutoff: number;         // 20..20000 Hz
    resonance: number;      // 0.1..18
    bypass: boolean;
  };
  drive: {
    amount: number;         // 0..1
    tone: number;           // 0..1
    bypass: boolean;
  };
  delay: {
    time: number;           // 0.05..1.5 s
    feedback: number;       // 0..0.85
    damping: number;        // 500..12000 Hz
    mix: number;            // 0..1
    bypass: boolean;
  };
  reverb: {
    decayTime: number;      // 0.5..12.0 s
    damping: number;        // 0..1
    mix: number;            // 0..1
    bypass: boolean;
  };
  masterGain: number;       // 0..1
}

export interface AudioEngineApi {
  init(): Promise<void>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  executeZeroResidueHardCut(): void;
  updateBreathModulation(macroValue: number, stage: BreathStage, stageProgress: number): void;
  updateChannelStrip(params: Partial<ChannelStripParams>): void;
  updateEffects(params: Partial<EffectsChainParams>): void;
  dispose(): void;
}
```

### 4.2 呼吸时钟与包络自动化契约 (`src/types/breath.ts`)

```typescript
export interface BreathRhythmConfig {
  inhale: number;   // seconds >= 0.5
  holdIn: number;   // seconds >= 0.0
  exhale: number;   // seconds >= 0.5
  holdOut: number;  // seconds >= 0.0
}

export interface StageAutomationCurve {
  startVal: number; // 0..1
  endVal: number;   // 0..1
  tension: number;  // -1..+1 (0 = linear)
}

export interface ParameterAutomationConfig {
  targetParam: string;
  inhale: StageAutomationCurve;
  holdIn: StageAutomationCurve;
  exhale: StageAutomationCurve;
  holdOut: StageAutomationCurve;
}

export interface BreathClockSnapshot {
  isPlaying: boolean;
  currentStage: BreathStage;
  stageProgress: number;     // 0..1
  stageRemainingSeconds: number;
  cycleProgress: number;     // 0..1
  breathMacro: number;       // 0..1
  cycleCount: number;
}

export interface BreathEngineApi {
  start(): void;
  pause(): void;
  toggle(): void;
  setRhythm(rhythm: BreathRhythmConfig): void;
  setAutomation(config: ParameterAutomationConfig[]): void;
  getSnapshot(): BreathClockSnapshot;
  onTick(callback: (snapshot: BreathClockSnapshot) => void): () => void;
}
```

### 4.3 几何视觉渲染契约 (`src/types/visuals.ts`)

```typescript
export type VisualPresetId = 'minimalRing' | 'sacredGeometry' | 'zenWaves' | 'calmFocus';

export interface VisualRenderParams {
  width: number;
  height: number;
  dpr: number;
  breathMacro: number;     // 0..1
  stage: BreathStage;
  stageProgress: number;   // 0..1
  isDarkTheme: boolean;
  preset: VisualPresetId;
  oscAActivity: number;    // 0..1
  oscBActivity: number;    // 0..1
}

export interface VisualRenderer {
  render(ctx: CanvasRenderingContext2D, params: VisualRenderParams): void;
  reset(): void;
}
```

### 4.4 硬件 Deck 与调制矩阵契约 (`src/types/ui.ts`)

```typescript
export type ModulationSource = 'breathMacro' | 'lfo1' | 'stageProgress' | 'manual';

export interface ModulationRoute {
  source: ModulationSource;
  target: string;
  depth: number;           // -1.0 .. +1.0 (bipolar)
  bipolar: boolean;
}

export interface KnobDescriptor {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  assignedModulation?: ModulationRoute;
}
```

---

## 5. 代码目录布局 (Code Layout)

```
X:\AI project\Synhale2\
├── .agents/                      # 智能体元数据与交接报告
│   └── teamwork/
│       ├── orchestrator/         # 主编排器工作区
│       ├── e2e_test_orch/        # E2E 测试编排器工作区
│       ├── sub_orch_m1/          # 里程碑 M1 编排工作区
│       ├── sub_orch_m2/          # 里程碑 M2 编排工作区
│       ├── sub_orch_m3/          # 里程碑 M3 编排工作区
│       ├── sub_orch_m4/          # 里程碑 M4 编排工作区
│       └── sub_orch_m5/          # 里程碑 M5 编排工作区
├── public/                       # 静态静态资源 (无音频依赖)
├── src/
│   ├── audio/                    # [M1 专属目录]
│   │   ├── dsp/                  # DSP 纯数学计算 (PeriodicWave, PinkNoise, WaveShaper, IR)
│   │   ├── nodes/                # Web Audio 封装节点 (OscA, OscB, Drone, Filters, Effects)
│   │   ├── engine.ts             # AudioEngine 实现 (通道条、路由、0ms 硬切)
│   │   └── presets.ts            # 声疗波表数据与默认通道参数
│   ├── breath/                   # [M2 专属目录]
│   │   ├── stateMachine.ts       # 四阶段高精度时钟与 0 时长穿透状态机
│   │   ├── macro.ts              # 呼吸宏物理映射与阶段声学规则矩阵
│   │   ├── timeline.ts           # 阶段自动化插值与包络计算器
│   │   └── storage.ts            # LocalStorage 持久化与出厂节律预设
│   ├── visuals/                  # [M3 专属目录]
│   │   ├── presets/              # 4 种神圣几何纯数学渲染器
│   │   │   ├── minimalRing.ts
│   │   │   ├── sacredGeometry.ts
│   │   │   ├── zenWaves.ts
│   │   │   └── calmFocus.ts
│   │   ├── canvasRenderer.ts     # Canvas 2D 硬件加速与批处理调度
│   │   └── gestureHandler.ts     # 全画布点击判定算法 (d<8px, t<220ms)
│   ├── ui/                       # [M4 专属目录]
│   │   ├── components/
│   │   │   ├── deck/             # 硬件调制控制台
│   │   │   ├── fader/            # 磁性双极性推子
│   │   │   ├── knob/             # 320ms 长按旋钮与调制卡片
│   │   │   ├── vu/               # 中心零位双向动态 VU 表
│   │   │   ├── timeline/         # 全屏/弹窗图形化包络编辑器
│   │   │   ├── drawer/           # 移动端原生体验 Bottom Sheet 抽屉
│   │   │   └── capsule/          # 底部微型悬浮状态胶囊
│   │   └── theme/                # 暗黑/明亮高对比度设计令牌系统
│   ├── types/                    # [公共契约目录]
│   │   ├── audio.ts
│   │   ├── breath.ts
│   │   ├── visuals.ts
│   │   └── ui.ts
│   ├── App.tsx                   # [M5 总装集成]
│   ├── main.tsx
│   └── index.css                 # Tailwind 样式与工业质感边框
├── tests/                        # [E2E 与测试轨专属目录]
│   ├── mocks/                    # 虚拟时钟 Web Audio Mock Harness
│   ├── tier1_features/           # Tier 1 特性测试 (5 x N)
│   ├── tier2_boundaries/         # Tier 2 边界与极值测试 (5 x N)
│   ├── tier3_combinations/       # Tier 3 跨特性交互组合测试
│   ├── tier4_realworld/          # Tier 4 真实声疗场景端到端测试
│   └── tier5_adversarial/        # Tier 5 白盒对抗穿刺测试
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```
