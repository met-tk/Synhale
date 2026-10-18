# Synhale 2 工程上下文快照记忆 (PROJECT_CONTEXT.md)

> 快照更新时间: 2026-10-03 (M42 完成)
> 系统状态: M0 - M42 全里程碑 100% 达成；粒子示波器物理发声 1:1 对齐、独立前级增益（Preamp Gain）模块与软削波、旋钮拖拽零拉链音/防爆音终极治理、波表视窗 60fps 动态调制响应、以及合成器顶部音频信号流拓扑视图（SignalFlowGraph）(M42)；109 个测试套件，718 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (0 TS Errors, npm run build 0 错误 0 警告，构建耗时 2.24s)，持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。

---

## 1. 项目定位与核心理念

Synhale 2 是一款面向音乐人与合成器爱好者的可游玩半模块化数字合成器与沉浸式身心呼吸声疗乐器，实现呼吸生物节律与现代合成器声音纹理的物理声学共生。

### 核心技术决策（修正建议收敛落地）
- **粒子示波器物理发声 1:1 对齐、独立前级增益（Preamp Gain）模块与软削波、旋钮拖拽零拉链音/防爆音终极治理、波表视窗 60fps 动态调制响应、以及合成器顶部音频信号流拓扑视图（SignalFlowGraph）(Particle Acoustic 1:1 Sync, Preamp Gain Module & Soft Clipping, Final Zero-Zipper Governance, 60fps Dynamic Wavetable Mod, and Signal Flow Graph - M42)**：
  * **【Phase Plant 粒子流场 1:1 动态与物理粒子对齐】**：`ParticleStreamScope` 接管 Web Audio 真实发声粒子流，声像、音高与发声音数绝对吻合，彻底杜绝虚假自转粒子动画；
  * **【新增独立前级增益（Preamp Gain）模块】**：`GainModule` 就位（-12dB ~ +24dB、4x 抗混叠 tanh 软削波、5ms 硬件直通旁路），HardwareDeck 顶部独立卡片控制，提供充沛动态裕量与温润模拟级前级驱动；
  * **【旋钮拖拽与实时调制拉链音深层治理】**：全面切除直接 `.value` 覆写，全链路采用 `setTargetAtTime` 平滑过渡与 Reverb 120ms 防抖，彻底消除杂音窜入后级回声；
  * **【波表监视视窗动态调制打通】**：`WavetableVisualizer` 实时响应 `liveMorph` 与 `liveHarmonics`，60fps 动态展示形变与切片角标；
  * **【合成器顶部音频链路逻辑视图（SignalFlowGraph）】**：直观展示 3 声源并行汇聚、独立前级增益与 7 级效果器串联拓扑架构，动态流光与深浅双色主题完全适配；
  * **测试大盘与工业规范守卫**：109 个测试套件，718 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (0 TS Errors, npm run build 0 错误 0 警告，构建耗时 2.24s)，持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。
- **旋钮拖拽与调制噪音彻底消除（零拉链音/防爆音去咔嗒）、预设切换 Voice Mode 与 Harmonic Scale 状态同步与发声逻辑闭环、双 LFO 极性模式开关（UNI/BI）、Serum UNISON 语义标定澄清、以及调制卡片范围显示字符串修复 (Zero-Zipper De-clicking, Preset Voice Mode & Scale Sync, Dual LFO Polarity Switch, Serum Unison Semantics, and Modulation Card Range Display Fix - M41)**：
  * **【旋钮拖拽与实时调制噪音彻底消除 (Zero-Zipper & De-click Elimination)】**：
    - **根治旋钮扭动与高频调制时产生拉链音、爆音并窜入后方 Delay/Reverb 产生反复回声的严重声学缺陷**；
    - **DriveModule 架构重塑 (`src/audio/nodes/DriveModule.ts`)**：
      * 将原先拖动 amount 时每帧给 `waveShaper.curve` 赋值（每次赋值均会强行清空 Web Audio 4x 抗混叠 FIR 滤波器延迟线，产生巨大阶跃尖峰与爆音）重构为“固定曲线 + 动态增益调制”分流架构；
      * 内部设立 `driveDryGain` 与 `driveInGain`，波表曲线仅在 tone 变化时重构；amount 通过 15ms 平滑增益调度与自动增益补偿（`makeupGain`）实现模拟级平滑干湿混合，从底层物理上彻底根除了拉链杂音；
    - **MultimodeFilter 系数保护 (`src/audio/nodes/MultimodeFilter.ts`)**：
      * 对 `stage1.type` / `stage2.type` 施加严格不等判断守卫（`if (this.stage1.type !== biquadType)`），避免每帧重复赋值重构双二阶滤波器系数结构引发的瞬态咔嗒声；
    - **抹杀平滑的暴力直接覆写切除与双层平滑守卫**：
      * `StereoDelay`：切除 `feedbackGainL/R.gain.value` 强制立即覆写，统一由 10ms `setTargetAtTime` 执行平滑过渡并兼顾单测 mock 状态同步；
      * `DroneChannel`：切除 `trackGain.gain.value` 强制立即覆写，统一由 5ms `setTargetAtTime` 平滑过渡并兼顾单测 mock 状态同步；
      * `AudioEngine`：切除 `applyLiveModulationRoutes` 中 `masterVolumeGain.gain.value` 与 `panner.pan.value` 强制覆写，统一由 5ms `setTargetAtTime` 执行声学平滑过渡，并在单测与状态查询维度保持强一致；
      * 全链路统一由 `setTargetAtTime` 执行 5ms ~ 20ms 声学平滑过渡，实现极度丝滑的模拟手感。
  * **【预设切换 Voice Mode 与 Harmonic Scale 状态同步与发声逻辑闭环 (Preset Voice Mode & Scale Sync)】**：
    - **解决切换出厂预设时，Deck 面板发声模式（Drone / Particles / Arp）与调式量化停留在上一状态，且底层未能正确切换发声模式的 Bug**；
    - **OscAChannel 发声切换修复 (`src/audio/nodes/OscAChannel.ts`)**：
      * 修正 `handleVoiceModeChange` 中错误的 `/ 100` 标定，恢复 0..1 归一化增益比率；
      * 切除模式切换时的暴力 `.gain.value = 1.0/0.0`，改用平滑 20ms `setTargetAtTime`，杜绝切换时的音频跳变爆音，同时维护 `.gain.value` 满足单测与外部状态查询；
    - **出厂预设防御性补齐与深拷贝合并**：
      * `src/audio/presets/soundPresets.ts`：5 大核心出厂预设（神圣钟磬、深海共鸣、极光空灵、脑波深眠、禅意古刹）及全部出厂预设显式声明 `voiceMode: 'drone'` 与 `particles: { scale: 'pentatonic' }`；
      * `src/types/audio.ts`：规范 `ChannelStripParams.oscA.particles` 为 `Partial<ParticleParams>`，与 `DEFAULT_PARTICLE_PARAMS` 形成健壮契约；
      * `src/audio/nodes/OscAChannel.ts`：在 `scheduleParticles` 中以 `{ ...DEFAULT_PARTICLE_PARAMS, ...(this.currentParams.particles ?? {}) }` 防御性合并，彻底根绝缺省字段类型与运行时异常；
      * `AudioEngine.loadSoundPreset`：提供防御性 `voiceMode` 与 `scale` 默认值，确保音频引擎内部声学管线正确重置；
      * `src/App.tsx`（`handleSoundPresetSelect`）：引入 `DEFAULT_CHANNEL_STRIP` 防御性深拷贝合并，切换预设 100% 同步 UI 状态与底层发声。
  * **【双 LFO 极性模式开关与自适应示波器 (Dual LFO Polarity Switch: UNI / BI)】**：
    - `src/types/audio.ts`：`Lfo1Params` 与 `Lfo2Params` 扩展 `polarity?: 'bipolar' | 'unipolar'`；
    - `src/audio/dsp/lfoMath.ts`：`computeLfoLiveValue` 原生支持 `polarity` 计算，Unipolar 映射为 $[0, \text{depth}]$，Bipolar 映射为 $[-\text{depth}, +\text{depth}]$；
    - `src/ui/components/deck/SerumLfoScope.tsx`：示波器视窗原生支持 `polarity`，单极性模式下基准线置底且单向震荡，HUD 动态指示 `UNI` / `BI` 极性状态；
    - `src/ui/components/deck/HardwareDeck.tsx`：在 LFO 1 与 LFO 2 卡片标题栏各配置极简精致的 `UNI` / `BI` 切换按钮，打通 live mod 与音频引擎调制派发。
  * **【Serum UNISON 概念辨析与控件语义规范化 (Unison Semantics Polish)】**：
    - 详尽考证 Xfer Serum 的 UNISON 架构（声部数 Voices 1~16 vs 混合比率 BLEND 0%~100% vs 失谐深度 DETUNE）；
    - 澄清 Synhale 2 采用的是“基准振荡器 + 伴随失谐振荡器”架构，旋钮控制的是伴随声部音量与失谐混合深度，对应 BLEND 概念；
    - 将 `HardwareDeck` 中的 UNISON 控件标签优化正名为 `Uni Blend`（UNISON BLEND），消除概念混淆。
  * **【ModulationCard 参数影响范围字符串拼接修复 (Modulation Range Fix)】**：
    - 重构 `formattedRange` 计算，单极性负深度格式化为 `[基准 - 深度%, 基准]`，正深度为 `[基准, 基准 + 深度%]`，彻底消除 `+-66%` 的双符号拼接错误。
  * **测试大盘与工业规范守卫**：
    - 109 个测试套件，717 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功（0 TS Errors，npm run build 0 错误 0 警告，产物 548.37 kB，构建耗时 2.11s），持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。
- **多模滤波器 6 种滤波方案扩充与动态波德图频响可视化、OSC B 气流扰动真实声学抖动激活、OSC A 模拟温润饱和与齐奏/展开解耦修复、以及粒子合成器全链路验证 (6 Filter Modes & Dynamic Bode Visualizer, OSC B Motion Flutter, OSC A Warmth & Unison Decoupling, and Particles Engine Validation - M40)**：
  * **【MultimodeFilter 扩充 6 种滤波方案与波德图实时频响可视化 (6 Filter Modes & Dynamic Bode Visualizer)】**：
    - **类型定义与模式扩充 (`src/types/audio.ts`)**：`FilterType` 枚举由 3 种扩展为 6 种：`'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peak' | 'ladder'`；
    - **DSP 完整物理实现 (`src/audio/nodes/MultimodeFilter.ts`)**：
      * 级联双二阶（Cascaded Biquad）架构全覆盖：不仅支持经典的 24dB/oct 极陡峭双二阶低通（lowpass）、高通（highpass）与带通（bandpass）；
      * 全新实现级联双二阶带阻 Notch 滤波（陷波消除特定共振尖峰）；
      * 全新实现钟形共鸣 Peak 滤波（基于带通增益相加构建可调共鸣峰）；
      * 全新实现带有高频温润滚降特性的经典 Moog Ladder 24dB 模拟阶梯低通滤波与软饱和曲线；
    - **平滑波德图频响示波器 (`src/ui/components/deck/FilterVisualizer.tsx`)**：
      * 基于级联双二阶传递函数（Transfer Function $|H(\omega)|$），在 20Hz~20kHz 对数频率轴（Logarithmic Frequency Scale）上实时解算并绘制平滑波德图频响曲线与渐变阴影填充；
      * 视窗内标注滤波模式标签（如 `LP 24dB`、`Ladder 24dB`、`Notch 24dB`、`Peak EQ`）、实时标定截止频点（如 `2.4kHz`），并以高对比度发光圆点（Cutoff Dot）与外发光圆环精准指示截止频点与调制指示小球（Live Modulated Indicator）；
      * 全面响应明亮与暗黑主题（`isDark`），浅色模式下白底灰网格与深蓝曲线，暗黑模式下深黑网格与科技天蓝光晕，100% 遵守零 Emoji 工业科技美学规范；
    - **机架界面无缝装配 (`src/ui/components/deck/HardwareDeck.tsx`)**：
      * 在 Filter 模块的 Cutoff 与 Resonance 旋钮之间内嵌 `FilterVisualizer` 视窗；
      * 顶部模式切换栏扩充为 6 个模式按钮网格（`LP`, `BP`, `HP`, `NOTCH`, `PEAK`, `LADDER`），支持单手快速切换；
      * 原生打通呼吸宏（Breath Macro）与 LFO 实时调制，动态更新 `liveModCutoff`；
    - **测试套件契约守护 (`tests/unit/ui/filterVisualizer.spec.ts`)**：
      * 新增 5 项测试用例，覆盖 6 种滤波模式曲线解算、调制指示动态徽标、明暗主题自适应、空频保护以及 100% 零 Emoji 规范法医审查。
  * **【OSC B 气流微湍流抖动真实声学激活 (OSC B Airflow Motion Flutter)】**：
    - **定位原 motion 旋钮在底层未被 Web Audio 节点消费的悬空代码**：此前 OSC B 面板上的 Motion 旋钮参数仅保存在状态中，未在 DSP 信号流中消费，导致气流微抖动无法被感知；
    - **物理微湍流抖动声学建模 (`src/audio/nodes/OscBChannel.ts`)**：
      * 引入专用内部 `motionLfo`（1.35Hz 缓变正弦低频振荡器）与 `motionGain`；
      * 实时驱动带通喉腔共振滤波器（Formant Bandpass Filter）的中心频点产生最高 $\pm 25\%$ 的微湍流抖动（Airflow Turbulence Flutter）；
      * 真实还原生理呼吸时气流掠过喉腔与气道的微弱空气对流随机颤动，大幅提升气流环境声的声学生命感。
  * **【OSC A Warmth 模拟软饱和、Unison 与 Spread 声学解耦与单位释疑 (OSC A Analog Warmth, Unison & Spread Decoupling)】**：
    - **DSP 链路重塑 (`src/audio/nodes/OscAChannel.ts`)**：
      * **模拟温润饱和（Warmth Waveshaper）**：引入专用 `warmthShaper`（`WaveShaperNode`）与软饱和双曲正切曲线（$\tanh$ 曲线），伴随 Warmth 旋钮增大柔和引入低阶偶次与奇次谐波染色，真正赋予数字振荡器以模拟复古唱片级温润质感；
      * **Unison 与 Spread 物理声学解耦**：引入专用 `unisonPanner`（`StereoPannerNode`），彻底修复原先 `spread` 粗暴直接覆盖 `subOsc.detune` 的参数冲突硬伤；使 `spread` 专注控制副振荡器的立体声声场展宽（$-1.0 .. +1.0$），与失谐和音高解耦；
      * **UNISON 单位采用百分比（%）的专业声学释疑**：
        - 在现代专业合成器架构体系中，UNISON 旋钮并非单一的固定频偏（非纯音分 cents），而是复合混合深度比率（Compound Blend Ratio）；
        - 该参数同步复合控制副振荡器的音量混合比例（Unison Mix Level, 0%~50%）与失谐扩散深度（Unison Detune Spread Depth, 0~25 cents），属于无量纲的综合深度百分比，故在工程与 UI 上采用 0%~100% 标定最为精准严谨。
  * **【PARTICLES 粒子合成器模式 9 大旋钮与调式量化全链路验证 (Particles Engine 9-Knob Validation)】**：
    - **9 大商业粒子旋钮全链路闭环验证**：
      * Rate（0.1~50Hz，微粒触发率）、Density（1~32V，最大并发密度）、Duration（0.05~4s，单粒微观时长）、Octaves（1~4Oct，八度离散跨度）、Scatter（0~100%，立体声扩散范围）、Spray（1~4Gr，单次触发微粒群丛发量）、Jitter（0~50ct，随机音高抖动音分）、WT Wander（0~8sl，波表切片随机漫游步进）、Chance（10~100%，生成概率门限）；
      * 9 大参数在 DSP 解算、生命周期调度与 UI 旋钮控制间 100% 对齐与平滑生效；
    - **5 大自然与声疗调式量化（Scale Quantization）安全映射**：
      * 包含五声音阶（Pentatonic）、多利亚调式（Dorian）、利底亚调式（Lydian）、索尔菲吉奥频率（Solfeggio）、自然小调（Natural Minor）；
      * 音高映射算法严格安全收敛，无非法频点与爆音咔嗒；
    - **粒子模式背景持续音（Drone）自动声学隔离**：
      * 粒子模式下自动隔离背景持续音（Drone Wavetable Leak Guard），防止背景长鸣污染微粒音景。
  * **测试大盘与工业规范守卫**：
    - 109 个测试套件，717 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功（0 TS Errors，npm run build 0 错误 0 警告，产物 544.5 kB，构建耗时 2.26s），持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。
- **呼吸阶段转换提示音高保真自然原声置换、初次试听发出旧声音时序 Bug 根除、以及首次点击中心图形开始呼吸断声毛刺彻底根治 (Authentic Nature Cue Replacement, Initial Audition Bug Fix, and First Tap Audio Glitch Elimination - M39)**：
  * **【根除初次试听发出旧声音 Bug (Initial Audition Audio Fallback Fix)】**：
    - **定位用户首次试听听到旧合成音的致命根因**：原 `breathCuePlayer.ts` 在内存缓存为空时，同步降级调用 `playSyntheticFallback`（旧的正弦波/变频算法音），在后台才异步 fetch 采样；导致首次点击听到的永远是旧声音；
    - **架构修复与时序闭环**：
      1. `src/App.tsx` 根组件挂载 `useEffect` 首帧立即执行 `preloadAllCueSounds()`，进入应用即在后台异步解码全部 5 种采样；
      2. `src/audio/cue/breathCuePlayer.ts` 重构：提炼 `playBuffer`，在 `playCueSound` 中，若 `cachedBuffer` 未命中且环境支持 `fetch`，异步优先等待 `loadCueSampleBuffer` 并在解码成功后直接播放真实采样，彻底废除浏览器环境中的旧振荡器降级逻辑；
      3. 无论用户何时、第几次点击试听，100% 播放高品质真实自然录音。
  * **【彻底根除首击中心图形启动呼吸时的不自然断声 (Initial Tap Audio Glitch Elimination)】**：
    - **定位四重深层根因**：
      1. `gestureHandler.ts` 中 `onFirstAudioUnlock` 返回 Promise 未被 await，同一微任务同步触发 `onTap`；
      2. `App.tsx` 中并发调用 `ensureAudioInitialized` 且缺乏互斥锁，导致并发重复初始化和 `resume()`；
      3. `AudioEngine.init()` 刚把声学振荡器启动发声，紧接着 `resume()` 执行粗暴的 `masterCutGain.gain.setValueAtTime(0.0, now)` 将声音掐死并进行 3ms 陡峭爬升，且因并发重入被执行两次；
      4. `lastBreathStage` 初始为 null，导致首帧 rAF 重复触发 `this.adsr.triggerAttack(1.0)` 打断包络；
    - **架构修复与声学连续性保证**：
      1. `src/App.tsx`：为 `ensureAudioInitialized` 引入 `initPromiseRef` 互斥单例锁，防止并发重入；
      2. `src/visuals/gestureHandler.ts`：`onPointerUp` 中 `await onFirstAudioUnlock()` 后再触发 `onTap()`；
      3. `src/audio/engine.ts`：`lastBreathStage` 初始值设为 `'inhale'`，杜绝首帧重复触发 Attack；`resume()` 中引入 `wasPaused` 与当前增益智能判断（`currentGain < 0.999 || wasPaused`），未暂停且处于全通增益时绝不强制清零，消除音频下切咔嗒声。首击 100% 丝滑、0 咔哒、0 断声。
  * **【高保真真实声学采样全面置换升级 (High-Fidelity Nature Acoustic Samples Upgrade)】**：
    - **【自然水滴】（zenWaterDrop）**：彻底淘汰电子变频滑音，置换为 AOSP 官方原生无损自然水滴实录 + 空灵水波漫反射（3.5s），纯净、圆润、灵动，绝无电子杂音与尖锐刺耳感；同时部署 `zenWaterDrop.ogg` 与 `zenWaterDrop.wav`；
    - **【暖腹深钵】（deepSubPing）**：彻底淘汰奇次谐波方波蜂鸣正弦，置换为 BodhiTimer 184Hz 铜制纯正藏钵实录（6.8s），零延迟起音，醇厚悠长双耳拍频共鸣，温暖安定；同时部署 `deepSubPing.ogg` 与 `deepSubPing.wav`。
  * **测试大盘与工业规范守卫**：
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功（0 TS Errors，npm run build 0 错误 0 警告，产物 537.5 kB，构建耗时 2.19s），持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。
- **呼吸阶段转换提示音真实自然声学实录全面复原与重塑升级（找回用户满意的 BodhiTimer bell1.ogg 真实风铃实录、置换【自然水滴】纯天然水滴微澜实录、引入【暖腹深钵】专业大号低音藏钵 153Hz 原声实录）(Authentic Nature Acoustic Cue Samples Restoration - M38)**：
  * **解决误用算法合成波形覆盖自然录音的声学缺陷**：
    - 全面回归并升级为 5 款 100% 纯正真实自然声学实录采样，全部部署在 `public/audio/cues/` 下，同时提供 `.ogg` 与 `.wav` 双格式支持：
      1. **【空谷风铃】（Valley Wind Chimes, `crystalHarmonics.ogg` 33.4KB / `.wav` 585.8KB）**：**彻底找回用户原本高度满意的真实风铃原声录音**（来自 BodhiTimer 著名实录 bell1.ogg），天然微风拂动，高阶谐波清透舒缓，6.8s 自然衰减，彻底取缔算法电音；
      2. **【自然水滴】（Nature Water Droplet, `zenWaterDrop.wav` 327.4KB / `.ogg` 18.9KB）**：**彻底置换算法合成的【空灵晨露】**，采用真实大自然水滴滴落与自然水波涟漪原声实录，3.8s 晶莹剔透，纯澈宁神，绝无电子杂音；
      3. **【暖腹深钵】（Deep Meditation Bowl, `deepSubPing.wav` 1171.5KB / `.ogg` 111.0KB）**：**全新引入专业大号低音西藏颂钵原声实录**（来自 brunoloff/meditation-timer 48kHz 立体声母带实录 bowl-low-and-long），基频 153Hz 纯正深腹低音共鸣，6.8s 纯正自然衰减，温暖醇厚；
      4. **【西藏颂钵】（Tibetan Singing Bowl, `singingBowl.ogg` 89.1KB / `.wav` 1171.5KB）**：BodhiTimer bowl.ogg 真实藏钵实录保持原样；
      5. **【温润暖木】（Zen Temple Wood, `woodenTemple.ogg` 19.0KB / `.wav` 241.2KB）**：温润木质木磬实录保持原样；
  * **元数据契约与测试套件强一致性同步**：
    - `src/audio/cue/breathCueConfig.ts` 中精准更新名称、英文名、频率提示与描述；
    - `tests/unit/ui/settingsModal.spec.ts` 与 `tests/unit/audio/breathCue.spec.ts` 同步更新断言，8/8 项测试绿灯通过；
  * **测试大盘与工业规范守卫**：
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功（0 TS Errors，npm run build 0 错误 0 警告，产物 537.49 kB，构建耗时 2.18s），持续坚守 100% 零 Emoji 工业科技美学规范与 S6-5 零黄色/橙色自动化法医测试永久防御。
- **呼吸提示音 7.0s 延音上限与【空灵晨露】采样置换、HardwareDeck 10 大模块电源按钮浅色模式黑块治理、波表试听时长延长至 1.0s、以及 StageEnvelopeStudio 界面美学重塑 (7.0s Cue Duration & Crystal Dewdrop Sample, Power Button Adaptive Styling, Wavetable 1.0s Audition, and Studio Aesthetic Refinement - M37)**：
  * **呼吸阶段转换提示音质感换新与 7.0s 延音放宽 (7.0s Cue Duration & Crystal Dewdrop Sample)**：
    - **解决原 4 秒延音导致声音尾音淡出不自然的问题**：
      * 底层放宽至 7.0 秒延音上限：`src/audio/cue/breathCuePlayer.ts` 中设定 `MAX_CUE_DURATION = 7.0`；
      * 配合 1.0s 线性柔和释放淡出：`gainNode.gain.linearRampToValueAtTime(0.0001, now + playDur)` 与精确 `source.stop(now + playDur)` 调度防护，自然平滑收尾；
      * 重构并生成 `public/audio/cues/` 下 5 款音频采样：西藏颂钵（6.8s）、温润暖木（2.8s）、空谷风铃（6.5s）、暖腹深钵（6.8s）；
    - **彻底置换用户不满意的【清泉微澜】采样**：
      * 全新打造【空灵晨露】（Crystal Dewdrop，`zenWaterDrop.wav` / `.ogg`，3.8s）：采用纯天然水滴撞击玉盘空灵回声模型，晶莹剔透，纯净宁神；
      * 元数据与测试套件同步更新：`tests/unit/ui/settingsModal.spec.ts` 与 `tests/unit/audio/breathCue.spec.ts` 保持 100% 绿灯。
  * **HardwareDeck 10 大通道模块电源开关按钮（Power Button）黑块彻底治理 (Power Button Adaptive Styling)**：
    - **解决明亮模式下 OSC A 及其他通道卡片右上角深暗纯黑大方块问题**；
    - `HardwareDeck.tsx` 中重塑 `getPowerButtonClass(isBypass, padding)`，覆盖 OSC A, OSC B, Sub Drone, Drive, Filter, ADSR, LFO 1, LFO 2, Delay, Reverb 全部 10 个模块；
    - 浅色模式下呈现白底、浅灰边框配翡翠绿/天蓝微光（`border-neutral-300 bg-white text-emerald-600 hover:bg-neutral-50 shadow-2xs`），彻底消除暗黑块瑕疵。
  * **Wavetable 波表选择器轻点试听时长提升至 1.0 秒 (Wavetable 1.0s Audition)**：
    - 响应用户关于 0.3s 试听过短的反馈，将 `playWavetableAudioPreview` 播放时长调整为完整的 1.0 秒（1000ms）；
    - 采用 15ms 软启动、850ms 饱满延音、150ms 线性释放淡出；
    - 引入 `previewContextRef` 单例引用与延迟安全清理，彻底杜绝多次快速试听时的声音堆叠与内存泄露。
  * **Stage Envelope Studio 独立编辑器界面重塑 (Studio Aesthetic Refinement)**：
    - 右上角 `+ 存为新预设` 和 `↺ 重置本阶段` 按钮接入深浅色自适应类，浅色模式下白底灰边文字清晰，消除深黑方块；
    - 左下角状态胶囊（实时声学调制已连接 · Modulation Active）与 `保存生效 · Save & Apply` 按钮深浅模式质感升级；
    - 4-Stage Panorama 全景视窗：彻底切除破坏行高基线的 `RUNNING` 文本标签；各阶段卡片缩略 SVG 曲线上改由 `stageProgress` 与 `evaluateSingleStageCurve` 动态驱动三层发光移动微粒（Playhead Dot），展现随着呼吸水流推进的声学光斑；
    - 顶部预设选择原生 `<select>` 下拉重构为高质感现代合成器风格的 Custom Dropdown（支持 Factory/User 双分组、展开/收起平滑旋转图标、选中项高亮与 Check 标识），同时保留 `sr-only` 原生 select 完美兼容自动化测试与无障碍。
- **呼吸阶段转换提示音质感换新与 <= 4s 强制延音硬截断、明亮主题细节全面治理消除黑块、以及 Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定 (Acoustic Cue Timbre Polish & Hard Cutoff <=4s, Light Theme Polish, and Zero-Displacement Stage Cards - M36)**：
  * **呼吸阶段转换提示音质感换新与 <= 4.0s 强制延音硬截断 (Acoustic Cue Timbre Polish & Hard Cutoff)**：
    - **声学音色质感换新**：解决原【温润铜磬】过吵金属撞击声与【山涧清泉】过短突兀感：
      * 【温润铜磬】替换为【温润暖木】（`woodenTemple.ogg` / `.wav`，1.8s）：纯正木腔温润共鸣，基频 264Hz，暖色低通滤波，内敛柔和，绝无刺耳金属喧闹；
      * 【山涧清泉】替换为【清泉微澜】（`zenWaterDrop.wav`，2.2s）：天然山涧清泉流淌微澜水滴泛音，舒缓平和，与其他预置时长完全协调；
    - **<= 4.0s 严格硬截断与平滑释放淡出机制 (`src/audio/cue/breathCuePlayer.ts`)**：
      * 规范磁盘物理采样：所有采样物理时长规范在 $\le 3.8\text{s}$，从根源规避超长延音；
      * 在播放引擎中定义 `MAX_CUE_DURATION = 4.0`，严格执行 `playDur = Math.min(cachedBuffer.duration, MAX_CUE_DURATION)`；
      * 配合 0.5s 平滑释放淡出（`fadeDuration = 0.5`，`gainNode.gain.linearRampToValueAtTime(0.0001, now + playDur)`）与 `source.stop(now + playDur)`，彻底防止长音叠加过载与瞬态爆音；
    - **测试套件与持久化同步**：`tests/unit/ui/settingsModal.spec.ts` 与 `tests/unit/audio/breathCue.spec.ts` 保持 100% 绿灯通过，验证新预置文案、时长与播放稳定性。
  * **明亮主题（Light Mode）全量细节治理，彻底消除深暗黑块 (Light Theme Polish & Zero Dark Blocks)**：
    - **Header Deck 控制台按钮**：开启态（`isDeckOpen`）在浅色模式下呈现高质感浅蓝背景（`border-sky-400 bg-sky-50 text-sky-600 font-semibold shadow-xs`），彻底消除深暗蓝黑块；
    - **OSC A Voice Mode 发声模式条**：浅色模式下呈现柔和浅灰底（`border-neutral-200 bg-slate-50/90 shadow-2xs`），按钮槽为 `bg-neutral-200/60 border-neutral-200`，单音/粒子/琶音高清晰选中高光；
    - **ADSR Envelope 示波器视窗 (`AdsrEnvelopeVisualizer.tsx`)**：全面响应 `isDark`，浅色模式下呈现白底视窗（`border-neutral-200 bg-white shadow-inner`）、浅灰坐标标线（`#e2e8f0`）、高对比度天蓝曲线光晕与白底黑字指标卡；
    - **DUAL LFO MODULATION 视窗（LFO 1 & LFO 2 · `SerumLfoScope.tsx`）**：全面响应 `isDark`，浅色模式下白底屏幕（`border-neutral-200 bg-slate-50/90 shadow-2xs`）、高清晰波形、白底波形选择按钮槽（`bg-neutral-100/90 border-neutral-200`）与高对比度标题。
  * **Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定 (Zero-Displacement Stage Cards)**：
    - **根除点击阶段卡片上移抖动硬伤**：定位此前因动态插入“编辑中”标签撑大标题行高导致卡片内容垂直跳动的视觉缺陷；
    - **完全切除“编辑中”破坏性徽标**：严格遵照用户指令切除破坏行高基线的文字徽标，仅使用高质感外边框加亮与柔和环形阴影（`border-sky-500 ring-1 ring-sky-500/50 / ring-sky-400`）指示选中激活状态；
    - **固定高度与平滑过渡收敛**：卡片标题栏统一锁定固定高度 `h-5`（`<div className="flex items-center justify-between h-5">`），按钮动画由 `transition-all` 替换为 `transition-colors duration-150`，达成真正绝对意义上的 0 像素位移、0 抖动。
- **呼吸阶段转换提示音高保真真实自然采样化、暗黑主题色彩繁杂治理清零黄色橙色、以及明亮主题全量无死角覆盖 (Authentic Acoustic Cue Samples, Zero Amber/Yellow/Orange, and Comprehensive Light Theme - M35)**：
  * **呼吸阶段转换提示音高保真真实自然采样化 (Authentic Acoustic Cue Samples)**：
    - **取缔纯振荡器波形合成，引入 5 款温润柔和、绝不刺耳的高保真自然声学实录采样 (`public/audio/cues/`)**：
      1. `singingBowl`（颂钵微鸣 · singingBowl.ogg, 158KB）：西藏自然实录，432Hz 铜质柔和共鸣与绵延泛音，带来沉浸式声学放松；
      2. `zenWaterDrop`（山涧清泉 · zenWaterDrop.wav, 20.8KB）：纯天然凝露水滴声，瞬态极度清透圆润，绝无尖锐杂波；
      3. `woodenTemple`（温润铜磬 · woodenTemple.ogg, 167KB）：古刹禅磬实录，温润中频回响与自然衰减；
      4. `crystalHarmonics`（空谷风铃 · crystalHarmonics.ogg, 103KB）：铜管风铃高阶微光谐波，0.8s 柔化衰减与高雅质感；
      5. `deepSubPing`（暖腹深钵 · deepSubPing.ogg, 390KB）：大号低音深腹共鸣，108Hz 浑厚延展，带来深层腹式呼吸沉浸感；
    - **采样播放引擎与调度架构升级 (`src/audio/cue/breathCuePlayer.ts`)**：
      * **内存级 AudioBuffer 采样缓存池**：构建 `sampleBufferCache` 与并发安全拉取管理器 `pendingSampleFetches`，支持后台静默预热预载（`preloadAllCueSounds`）与实时非阻塞命中；
      * **双层高容错架构（Sampled Playback with Seamless Synthetic Fallback）**：优先通过 `AudioBufferSourceNode` 播放高保真自然采样；在单测（jsdom）或网络离线等无真实音频流极端场景下，无缝平滑降级至内置声疗纯合成回退，实现 100% 零崩溃；
      * **抗爆音与防御性生命周期管理**：提供 5ms 线性软启动 Attack 增益包络彻底杜绝瞬态“咔嗒/爆音”，加入跨宿主 `ctx.resume()` 类型安全守卫与单一共享回退上下文单例（`sharedFallbackContext`），杜绝浏览器 AudioContext 句柄泄漏；
      * **设置面板与试听无缝集成**：设置模态弹窗（`SettingsModal`）轻点试听按钮与 `BreathEngine.onStageChange` 瞬时联动均支持完整采样回放。
  * **暗黑主题色彩繁杂治理：禁止黄色/橙色，收敛至极简冷色调 (Zero Amber/Yellow/Orange)**：
    - **根治色彩不统一硬伤**：彻底清查并拔除暗黑模式下所有黄色（`amber` / `yellow`）与橙色（`orange`）类 Tailwind 类名及其十六进制色值（`#f59e0b`, `#fbbf24`, `#d97706`, `#f97316`, `#ea580c` 等）；
    - **确立全局极简冷色调规范**：
      * 主基调：纯粹暗黑底色 `bg-neutral-950` 与精致微边框 `border-neutral-800`；
      * 高亮与活动交互：统一采用科技天蓝（Sky / `#38bdf8` 与 `#7dd3fc`）；
      * 呼吸屏息阶段（Hold In / Hold Out）：统一由琥珀黄重塑为优雅靛蓝（Indigo / `#818cf8` 与 `text-indigo-400`），与吸气（天蓝）、呼气（紫罗兰）、静息（青绿）形成专业和谐的冷色调四元光谱；
      * 危险/破坏性操作：克制暗红（`rose-500` / `rose-400`）；
    - **重构覆盖全量 UI 组件**：
      * `ModulationCard.tsx`：屏息阶段环境光晕与指示器重构为 indigo；
      * `StageEnvelopeStudio.tsx`：4 阶段全景视窗屏息区块重构为 indigo；
      * `SettingsModal.tsx`：清除所有黄橙类背景与边框，收敛为 sky 与 indigo；
      * `HardwareDeck.tsx`：机架各模块活跃指示与通道高亮全面收敛；
      * `BreathCurveEditor.tsx` & `BipolarVuMeter.tsx`：屏息曲线手柄与 VU 警戒刻度收敛至冷色调；
      * `App.tsx`：预设保存、重命名与删除模态弹窗全面洗牌；
    - **S6-5 自动化法医级防护保障**：在 `tests/tier4_realworld/s6_zero_emoji_theme_audit.spec.ts` 中新增测试项 `S6-5`，对 `src/` 目录下全部源码文件进行深度正则扫描，确保 0 违规反弹。
  * **明亮主题（Light Mode）全量无死角覆盖 (Comprehensive Light Theme Support)**：
    - **全面消除浅色模式盲区**：
      * **HardwareDeck 硬件机架**：9 大模块通道外壳卡片全面适配明亮模式（白底/微浅灰、`border-neutral-200`、深色高对比度标题与说明）、推子槽（Fader Bay）微灰凹槽质感、内部网格点阵与状态指示器全面接入 `theme-classes`；
      * **WavetableVisualizer 波表示波器**：支持 `isDark` 属性透传，浅色模式下白底浮层、细腻微灰立体网格与高清晰度深蓝/深青波形描边；
      * **BreathMacroTimelineScope 呼吸时间轴**：支持 `isDark` 属性透传，浅色模式下高清晰度呼吸走针与阶段分割标尺；
      * **SettingsModal 设置中心**：全弹窗双模态无缝切换，白底卡片、清晰文本、柔和边框与分段控制器；
      * **StageEnvelopeStudio 独立包络演播室**：全景视窗、聚焦视窗、状态栏全面适配浅色模式；
      * **BottomSheetDrawer 抽屉**：波表选择与预设管理在浅色模式下呈现温润白底与高对比度字体；
      * **App.tsx 3 大微模态弹窗（保存预设、重命名预设、删除确认）**：浅色模式下白底圆角卡片、清晰文本与柔和边框；
    - **S6-3 工业无障碍对比度测试验证**：深色模式与浅色模式下核心元素文字与背景对比度均 $\ge 10.0$（深色 13.5，浅色 15.2），远超 WCAG AAA 标杆（$\ge 7.0$）。
- **主界面右上角设置中心重塑（收纳深浅色主题切换）、呼吸阶段转换声疗级提示音系统（5 款非刺耳纯 Web Audio 预置、4 节点灵活勾选与本地持久化） (Settings Modal Architecture & Soothing Breath Transition Cue System - M34)**：
  * **主界面右上角设置中心重塑 (Settings Modal Architecture)**：
    - **入口精简重构**：将主界面右上角原先单一的“主题切换按钮”替换为极简精致的“设置按钮（Settings，设置图标与极简徽章）”；
    - **构建高质感设置模态弹窗 (`src/ui/components/settings/SettingsModal.tsx`)**：
      * **第一区块：界面主题模式（Theme Appearance）**：收纳并升级原先孤立的主题切换控件，提供深色（Dark）与浅色（Light）双模态分段切换按钮，保持主题状态响应与统一视觉语言；
      * **第二区块：呼吸阶段转换提示音（Breath Transition Cue Sound）**：集成全新声疗级提示音系统所有参数与开关控制；
      * **交互与无障碍细节**：配备 ESC 键监听关闭、点击半透明黑色遮罩关闭、清晰的无障碍语义化 aria 标签（`role="dialog"`, `aria-label="系统偏好设置"`）、1px 微拟物细腻边框与丝滑淡入过渡。
  * **呼吸阶段转换声疗级非刺耳提示音系统 (Soothing Breath Transition Cue System)**：
    - **架构设计 (`src/audio/cue/breathCueConfig.ts` & `src/audio/cue/breathCuePlayer.ts`)**：
      * **转换节点 4 阶段灵活独立勾选 (`BreathTransitionNode`)**：
        1. `exhale_to_inhale`：呼气结束 · 开始吸气（新呼吸循环开启，核心默认推荐开启）；
        2. `inhale_to_holdIn`：吸气结束 · 开始屏息（饱满留驻）；
        3. `holdIn_to_exhale`：屏息结束 · 开始呼气（舒缓释放）；
        4. `exhale_to_holdOut`：呼气结束 · 空肺静息（彻底放空）；
      * **5 款温润柔和、严格声学滤波防刺耳的纯正 Web Audio 声疗提示音预置 (`BreathCuePresetId`)**：
        1. `singingBowl`（颂钵微鸣 · 432Hz）：432Hz 主频与微弱 864Hz 正弦波、10ms 软淡入与 1.6s 指数衰减、1200Hz 暖色低通滤波；
        2. `zenWaterDrop`（禅定水滴 · 520-780Hz）：快速双正弦变频微音、0.22s 瞬态水滴泛音、1800Hz 截止滤波；
        3. `woodenTemple`（温润木磬 · 324Hz）：324Hz 木质共鸣、3 阶非谐波衰减、650Hz 温暖低通滤波；
        4. `crystalHarmonics`（柔光晶体 · 864Hz）：864Hz 高阶泛音微光、0.8s 柔化衰减、2200Hz 截止滤波；
        5. `deepSubPing`（暖腹低鸣 · 108Hz）：108Hz 次重低音正弦、5ms 抗爆音淡入与 1.2s 浑厚延展、400Hz 严格低通限幅；
      * **提示音播放器声学防刺耳与消除爆音机制**：纯 Web Audio API 振荡器与平滑 GainEnvelope 合成，3~10ms 线性 Attack 彻底消除“咔嗒/爆破音”，严密低通滤波彻底消除高频毛刺与刺耳杂音；
      * **直观灵活的配置交互**：提示音总开关、实时音量调节滑块（0%~100%）、轻点试听按钮（Audition）、4 节点独立切换网格、一键“恢复默认”；
      * **存储持久化与容错自愈**：`localStorage`（`synhale_cue_settings_v1`）双向持久化与解析失败自动安全回退默认设置；
      * **声学与时钟调度联动**：在 `App.tsx` 中订阅 `BreathEngine` 的 `onStageChange` 事件，仅在音频播放中且匹配勾选节点时毫秒级瞬时触发。
  * **测试套件扩展与契约守护**：
    - 新增 `tests/unit/audio/breathCue.spec.ts`（5 项测试），覆盖 5 款预置元数据、localStorage 持久化、音频合成安全与音量限幅；
    - 新增 `tests/unit/ui/settingsModal.spec.ts`（8 项测试），覆盖设置弹窗展示、主题模式切换、提示音总开关、节点勾选、预置切换、试听触发与零 Emoji 审查；
    - 更新 `tests/unit/app.spec.ts`，验证设置弹窗中的主题切换链路与无缝交互；
    - 自动化测试规模提升为 108 个测试套件，711 项自动化测试全部绿灯通过 (100% 绿灯)。
- **波表波形与名称显示不一致彻底根治、24 款高代表性高对比度波表体系升级、以及声学视觉完全同步 (Waveform & Name True Alignment, High-Contrast Curated 24 Wavetables, and Audio-Visual True Sync - M33)**：
  * **排查并彻底根治：波表波形与名称显示不一致缺陷 (Waveform & Name True Alignment)**：
    - **定位三大致命根因**：
      1. 根因 1（默认 Morph 偏高导致波表被冲垮）：用户选中切片 2 Pure Square 时，因系统默认 morphDepth 为 0.7 外加呼吸宏达到 84%，等功率插值使切片 3 Pure Sawtooth 占据 96.8% 权重，将方波彻底冲垮为单调下降斜线；但视窗左上角却赫然写着 Pure Square，导致严重误解；
      2. 根因 2（声学与视觉严重割裂）：底层 OscAChannel 原本未将 morphDepth 接入声学振荡器淡化，导致耳朵听的是切片 2 的纯方波，眼睛在监视器看到的却是切片 3 锯齿波，而抽屉预览里又是第三种形态；
      3. 根因 3（三角波傅里叶展开符号错误）：奇次谐波全为正号导致三角波中心过冲拉尖，未能呈现挺拔对称三角波；
    - **架构重塑与双层示波体系 (`src/ui/components/deck/WavetableVisualizer.tsx`)**：
      * 主基准线（Base Waveform）：永远 100% 真实绘制当前选定切片的原始形态（方波矩形平台棱角分明，三角波对称挺直）；
      * 动态演变层（Morph Stream Layer）：当且仅当 effectiveMorph > 0.02 时，以半透明紫罗兰激光微光虚线层叠加展示演变过渡；
      * HUD 透明标注：底部明确指示当前过渡目标（如 `84% > S03`），无 Morph 时指示 `Pure Wave`；
      * `DEFAULT_CHANNEL_STRIP` 默认 `morphDepth` 降至 0.0，使进入切片时 100% 原生纯净；
      * `OscAChannel` 真正打通 `morphDepth` 对双振荡器等功率声学淡化的动态调度，所见即所听。
  * **全面重构 24 款极高物理与声学代表性波表体系 (High-Contrast Curated 24 Wavetables - `src/audio/dsp/wavetableData.ts`)**：
    - **彻底告别以往千篇一律的小毛刺正弦波，重构为 4 大分类 24 款高对比度代表性波表**：
      * Category I: Pure Roots (0..3)：纯正弦波 (Pure Sinusoid)、对称三角波 (Pure Triangle，修复傅里叶展开符号交替)、标准方波 (Pure Square)、线性锯齿波 (Pure Sawtooth)；
      * Category II: Singing Bowls (4..7)：西藏颂钵双峰基频 (Tibetan Bowl)、高阶金属清鸣 (Bell Resonance)、古寺青铜钟小三度非对称 (Temple Bronze)、喜马拉雅铜锣厚重弥散 (Deep Gong)；
      * Category III: Vocal Formants (8..11)：深喉图瓦念诵嗡鸣 (Throat Drone)、宽阔胸腔元音 /a/ (Vocal A)、浑厚喉音 /o/ (Vocal O)、空灵高吟 /i/ (Ethereal I)；
      * Category IV: Spectral Expansion (12..23)：大教堂八度堆叠管风琴 (Cathedral Organ，嵌套齿轮波形)、真空管偶次饱和 (Tube Saturation，不对称膨胀波形)、梳状滤波空间 (Flanger Comb，空气法兰波形)、25% 占空比窄脉冲矩形 (Pulse Width 25%)、第 5 谐波强自激滤波尖峰 (Harmonic Peak 5th)、FM 金属棱镜 (FM Prism)、次重低音 54Hz (Sub Warmth)、数字阶梯降采样 (Bit Crush) 等；
    - 每一款波表在时域形状与声学音色上均展现出极强的对比度与专业合成器水准。
  * **测试套件扩展与契约守护**：
    - 新增 `tests/unit/ui/wavetableVisualizer.spec.ts`（4 项测试），验证双层波形、方波保真度、Morph 叠加层与零 Emoji 规范；
    - 自动化测试规模提升为 106 个测试套件，698 项自动化测试全部绿灯通过 (100% 绿灯)。
- **默认声音预设收敛至 5 款极简非刺耳声学体系、波表基础波形置顶与时域波形预览试听集成、以及用户自定义声音预设完整 CRUD 编辑与删除管理 (5 Curated Non-Harsh Sound Presets, Wavetable Basic Waveforms & Interactive Preview, and Full User Preset CRUD - M32)**：
  * **默认声音预设数量收敛至 5 款以内且风格全覆盖、温和不刺耳 (5 Curated Non-Harsh Sound Presets)**：
    - **重构 `src/audio/presets/soundPresets.ts`**：将出厂预设严格收敛为 5 款风格迥异、声学互补、温润无刺耳的高品质声疗音色，消除高频过载与刺耳自激：
      1. `tibetanBowl`（神圣钟磬 · Sacred Bell Resonance）：432Hz 铜磬共鸣、长衰减混响、Filter Cutoff 1600Hz；
      2. `oceanicDrift`（深沉治愈柔垫 · Deep Healing Pad）：温润水下 Ambient、慢起伏呼吸慢铺底、Filter Cutoff 850Hz；
      3. `ambientShimmer`（空灵微光长鸣 · Ethereal Shimmer Drone）：柔和微光空间漫游、Cutoff 1850Hz 严格受限无刺耳自激；
      4. `deepTheta`（丝绒次低音 · Velvet Sub Bass）：54Hz 纯净次八度包裹感、420Hz 低通暖滤波；
      5. `zenTemple`（温暖模拟弹拨 · Warm Analog Pluck）：木质有机瞬态衰减、1200Hz 适度截止与磁带温暖度；
    - **干净收敛导出接口**：将 `getAllFactoryPresets()` 和 `getSoundPresetList()` 彻底收敛为仅返回这 5 款出厂预设，无冗余残留。
  * **波表内容优化：基础波形排在前面 + 波形选择器新增预览与试听功能 (Wavetable Basic Forms & Interactive Preview)**：
    - **基础波形优先重构 (`src/audio/dsp/wavetableData.ts`)**：重构 Category I 'Pure Roots'（切片 0..3）为经典基础波形：
      * 0: Pure Sinusoid（正弦波）
      * 1: Pure Triangle（三角波）
      * 2: Pure Square（方波）
      * 3: Pure Sawtooth（锯齿波）
      * 后面（4..23）为丰富多样的扩展波形（颂钵谐振、人声共振峰、频谱扩展）；
    - **纯数学 SVG 时域波形生成**：导出 `generateWavetablePreviewSvgPath(sliceIndex, width, height, padding)` 纯函数，根据傅里叶系数时域重构生成精美紧凑的 SVG 时域波形路径；
    - **抽屉与机架无缝集成 (`BottomSheetDrawer.tsx` & `HardwareDeck.tsx`)**：
      * 波表选择抽屉内每一项均展示 64×28 高清时域 SVG 缩略波形图；
      * 配备轻点试听按钮（`onPreviewAudio -> playWavetableAudioPreview`），使用真实的 PeriodicWave 与 320Hz 柔和包络轻点试听，极大提升音色挑选效率。
  * **用户自定义预设完整 CRUD 闭环（编辑、重命名、覆盖保存与安全删除）**：
    - **存储层 API 扩展 (`src/audio/storage/userPresets.ts`)**：新增并导出 `updateUserPreset(id, partial)` 与 `renameUserPreset(id, newName)`；
    - **主界面交互闭环建设 (`src/App.tsx`)**：
      * 抽屉用户预设项挂载 `onEdit` 与 `onDelete` 图标按钮；
      * 点击 `onEdit` 打开「重命名预设微模态弹窗」，支持行内修改并回车提交；
      * 点击 `onDelete` 打开「删除确认微模态弹窗」，彻底防止误删；当删除的预设正好是当前激活预设时，平滑安全回退至出厂默认预设，避免状态悬空；
      * Header「保存预设」弹窗智能感知：当前激活预设若为用户预设，弹窗顶部提供「覆盖当前预设」与「存为新预设」双模式切换，一键覆盖更新当前声学参数。
  * **测试套件扩展与契约守护**：
    - 新增 `tests/unit/audio/userPresets.spec.ts`（7 项测试），覆盖生命周期、覆盖更新、重命名、删除及数据校验；
    - 新增 `tests/unit/audio/wavetablePreview.spec.ts`（4 项测试），覆盖基础波形排序与 SVG 预览路径生成；
    - 自动化测试规模提升至 105 个测试套件，694 项自动化测试全部通过 (100% 绿灯)。
- **独立包络编辑器 StageEnvelopeStudio 界面重构去重与文案瘦身、曲线预设库扩充至 8 款与完整 CRUD 管理功能闭环 (StageEnvelopeStudio Interface De-duplication, Copy Streamlining, Factory 8 Presets & Full CRUD Lifecycle - M31)**：
  * **StageEnvelopeStudio 独立编辑器界面重构去重与文案瘦身 (Interface De-duplication & Copy Streamlining)**：
    - **彻底切除 Toolbar 4-Stage Tab 冗余栏**：解决此前 Toolbar 顶栏纯文本阶段切换按钮与下方全景卡片内容高度重复、横向空间拥挤的排版硬伤，彻底切除 Toolbar 中的 4-Stage Tab 纯文本导航栏，释放横向工具栏空间；
    - **全周期 4 阶段全景视窗升级为唯一交互式阶段选择器**：将「全周期全景视窗 (4-Stage Panorama)」卡片直接升级为唯一、高质感的交互式阶段选择器（`role="tab"`，包含微光高亮框、编辑中标签、RUNNING 呼吸实时状态与缩略多阶段波形），点击直接无缝切换微操编辑阶段；
    - **Header 视觉降噪与文案精炼**：彻底移除 Header 中已废弃的“全景视窗 / 微操放大”跳转按钮（消除视觉噪音），徽章由冗长口水话精简为专业短促的「4-STAGE MSEG」，副标精简为「目标联动: {targetLabel}」；
    - **快捷键浮层下移底部状态栏**：移除原先漂浮在 SVG 画布右上角遮挡高频/峰值曲线的快捷键说明浮层，整齐下移整合至底部状态栏（「双击新增节点 · 垂直拖动手柄调节曲率 · Delete键删除节点」）；
    - **底部状态栏保留关键指示与操作**：保持「实时声学调制已连接 · Modulation Active」脉冲指示与「保存生效 · Save & Apply」高精操作按钮。
  * **曲线预设 (Curve Presets) 完整 CRUD 闭环建设 (Full Curve Preset Management)**：
    - **存储层 API 扩展 (`src/audio/storage/curvePresets.ts`)**：新增并导出 `updateUserCurvePreset(id, curveData)`（覆盖更新当前预设曲线数据）与 `renameUserCurvePreset(id, newName)`（重命名当前预设名称）；
    - **预设下拉选择器双分组展示**：`<select>` 采用 `<optgroup label="出厂预设 · Factory">` 与 `<optgroup label="用户预设 · User">` 双分组呈现，层级秩序井然；
    - **用户预设完整运维闭环**：为选中的用户预设（User Presets）配备【覆盖保存】（Save/Overwrite）、【重命名】（Rename，带行内输入框与 Enter 回车确认）、【删除】（Delete，带“确认删除?”二次确认微模态，杜绝误触）；
    - **存为新预设与即时反馈**：保留【存为新预设】（Save As New）；引入微拟物状态反馈通知条（Action Notice，如“已载入预设”、“已覆盖更新预设”、“预设已删除”等，2.5s 优雅淡出）。
  * **出厂曲线预设库声学与音乐性扩充 (Factory Presets Expansion)**：
    - 从 5 款扩充至 8 款高品质音乐性预设，优化张力与时间节点：
      1. 自然潮汐 (Natural Breath) - 经典平滑 S 曲线，起承转合自然舒展；
      2. 爆发跃升 (Heroic Apex) - 吸气陡峭起振与呼气急坠，极具英雄气概；
      3. 阶跃方波 (Square Pulse) - 极速跳跃与瞬态翻转，适合脉冲门控；
      4. 禅定微澜 (Zen Stillness) - 微幅缓和起伏，呈现东方禅定意境；
      5. 快速弹拨 (Pluck Strike) - 20ms 超快起音与对数衰减，适合击钵与弹拨打击；
      6. 慢速微风 (Gentle Breeze) - 舒缓大弧度正弦爬升与沉降，适合舒缓 Ambient 铺底；
      7. 阶梯步进 (Rhythmic Steps) - 4 级阶梯跳跃门限，适合节律性扫频与门控效果；
      8. 反向膨胀 (Reverse Swell) - 呼气急剧反扑与屏息静默，适合实验性声学张力。
  * **测试套件扩展与契约守护**：
    - `tests/unit/audio/curvePresets.spec.ts` 更新，验证 8 款出厂预设及 updateUserCurvePreset / renameUserCurvePreset 完整生命周期；
    - `tests/unit/ui/stageEnvelopeStudio.spec.ts` 扩充至 8 项测试，验证全景 Tab 卡片交互、精简文案及用户预设新增、覆盖与带确认删除。
- **ModulationCard 冗余 4 阶段倍率滑块切除、105px 中型微操视窗升级与交互闭环 (Redundant Sliders Elimination & Medium Stage Viewport Upgrade - M30)**：
  * **定位与切除冗余离散滑块与旧版按钮 (Redundant Sliders & Legacy Buttons Elimination)**：
    - 解决此前 ModulationCard 下方 4 阶段倍率滑块与独立包络编辑器 StageEnvelopeStudio 连续曲线逻辑冲突与弹窗异常臃肿的视觉硬伤；
    - 彻底切除红色方框内的 4 个离散滑块（Inhale / HoldIn / Exhale / HoldOut）、3 种曲线模式切换按钮（Smooth / Linear / Step）、5 个过时倍率预设按钮以及“四阶段声学自动化倍率”文字标题；
    - 清理约 140px 的纵向臃肿堆叠，恢复专业合成器（Serum / Vital）紧凑优雅的卡片布局。
  * **缩略波形扩容为「中型微操视窗」(Medium Interactive Stage Envelope Viewport)**：
    - 高度由 56px 翻倍扩展至 105px（`totalH = 105, totalW = 380`，单阶段宽 `stageW = 95`），显著提升纵向动态分辨率与起伏张力；
    - 4 呼吸阶段环境光晕列：吸气 Inhale（天蓝）、屏息 Hold In（琥珀）、呼气 Exhale（紫罗兰）、静息 Hold Out（青绿），实时响应当前呼吸阶段并辅以脉冲状态；
    - 实时阶段动态指标百分比 HUD：列底紧凑展示动态计算特征电平（`Math.round(s.val * 100)%`，0%~100%），清晰指示各阶段自动化输出水平；
    - 示波器暗黑网格线、发光多阶段曲线描边（`drop-shadow-[0_0_6px_#f59e0b99]`）、半透明渐变填充（`#medium-mseg-grad`）、实时激光走针粒子与悬停微光遮罩交互。
  * **双通道平滑呼出独立工作台 (Dual-Channel Studio MSEG Access)**：
    - 点击中型微操视窗任意区域即可平滑触发 `onOpenStudio` 并关闭弹窗，直接唤出独立工作台；
    - 保留底部全宽直达按钮：“打开独立包络工作台 · Open Studio MSEG”，无论习惯点击波形还是功能按钮均可顺畅直达。
  * **曲线与倍率强一致性闭环保证 (Data Consistency Guard)**：
    - `handleApply` 中调用 `extractStageMultipliersFromCurve(curveData)` 自动提取并注入 `stageMultipliers`，确保声学引擎与预设体系数据 100% 严密同步。
  * **测试套件扩展与零 Emoji 审计**：
    - `tests/unit/ui/serumKnobModulation.spec.ts` 更新，验证中型微操视窗、阶段指示标签、直接点击波形及全宽按钮直达工作台，7/7 测试绿灯通过。
- **排查并彻底根治：呼吸阶段自动化独立编辑器失效与拖拽卡死缺陷 (Stage Studio Interaction Overhaul - M29)**：
  * **定位三重深层缺陷**：
    1. **根因 1（useEffect 依赖反噬与拖拽打断）**：Studio 内 useEffect 监听了 `initialCurveData`，用户拖拽 1 像素即触发 `onChange`，导致父级重渲染并传入新引用的 `initialCurveData`，useEffect 立即执行 `setDraggingPointId(null)`，瞬间切断拖拽，造成“完全拖不动、像卡死回弹一样”的严重体验硬伤；
    2. **根因 2（generateStageSvgPath 缺失 Y 轴偏移导致 24px 视觉错位脱节）**：SVG 视窗内定义了 `PAD_Y = 24`，但路径生成函数未考虑 Y 轴边距，导致整条包络曲线比控制点手柄整体上浮错位 24px，底部产生畸形斜切缺口；
    3. **根因 3（播放时钟强行劫持 activeStage）**：音频播放时每当呼吸阶段切换，原代码都会强行将 Studio 当前编辑阶段重设为播放中的阶段，恶意打断用户正在编辑的特定阶段（如呼气）。
  * **架构重塑与闭环治理**：
    - 引入单向初始化门禁（`prevIsOpenRef`、`prevTargetLabelRef`）与拖拽期间锁定（`isDraggingRef`），仅在弹窗打开或目标显式切换时单向初始化，拖拽期间完全阻断外部 state 覆写，确保手柄与节点顺滑连续拖拽；
    - `src/audio/dsp/curveMath.ts` 中 `generateStageSvgPath` 增加 `offsetY = 0` 参数，Studio 传入 `PAD_Y = 24`，实现曲线描边、半透明渐变填充、控制节点与曲率张力菱形手柄像素级完全贴合对齐；
    - 彻底切除播放时钟对 `activeStage` 的强行劫持，用户在音频播放中可自由停留在任意阶段进行微操；
    - `updateCurrentStagePoints` 使用 `queueMicrotask` 异步解耦派发 `onChange`，消除 React 状态更新冲突；
    - `HardwareDeck` 中提供智能初值回退：若目标路由缺少 `curveData` 但有 `stageMultipliers`，使用 `createCurveDataFromMultipliers` 初始化，保证平滑过渡。
- **声学与静音调度双重保证 (Acoustic Scheduling & Muting Guarantee - M29)**：
  * `AudioEngine.applyLiveModulationRoutes` 在保持 `setTargetAtTime` 指数平滑调度防爆音的同时，同步将解算后的值赋予 `gain.value`，严格满足绝对静音契约与状态查询。
- **测试套件扩展与契约严密守护 (M29)**：
  * `tests/unit/ui/stageEnvelopeStudio.spec.ts` 扩充至 7 项测试，新增双击新增控制点保持选中、父级重渲染下用户本地编辑状态完好保持等专项断言；
  * `tests/unit/audio/curveMath.spec.ts` 增加对 `generateStageSvgPath` `offsetY` 参数的垂直对齐断言；
  * 自动化测试总量正式扩充至 103 个测试套件、682 项测试全绿。
- **排查并彻底根治：修改自动化曲线后切换预设数值与曲线维持旧状态的闭锁缺陷 (Preset & Curve Stale State Elimination - M28)**：
  * **定位四重核心根因**：
    1. **根因 1（ModulationCard 缺少 props 监听导致 Stale State）**：组件内部原仅在 mount 时初始化 state，外部切换音色预设或在 Studio 保存曲线返回后，内部维持陈旧 state，用户一点击“应用”旧数据直接覆盖最新修改；
    2. **根因 2（ModulationCard 阶段快捷预设与滑块只改 multipliers 漏改 curveData）**：用户拖动滑块或选快捷预设时未更新 `curveData`，而底层音频引擎解算时优先判断 `if (route.curveData)` 短路忽略 multipliers，导致界面数值变了但曲线和声音纹丝不动；
    3. **根因 3（HardwareDeck 未受控接收 App 路由且 SoundPreset 缺少路由模型）**：HardwareDeck 原私有维护 `internalRoutes`，App 切换音色预设时未将路由重置下发，导致上一音色的曲线残留；
    4. **根因 4（AudioEngine 同名方法覆盖 bug）**：类底部重复声明 `getModulationRoutes` 并访问了未定义的 `activeModulationRoutes`，导致外部 getter 始终返回空对象。
  * **架构重塑与闭环治理**：
    - `ModulationCard` 增加 `useEffect` 严格监听 `[route, target, isOpen]`，并在快捷预设选择与 4 阶段滑块拖动中全面联动更新 `setStageMultipliers` 与 `setCurveData`；
    - `HardwareDeck` 受控接收 `modulationRoutes` 与 `onModulationRoutesChange`，`App.tsx` 完成属性透传并在切换音色预设时重置/载入干净路由；
    - `AudioEngine` 剔除冗余同名方法，`loadSoundPreset` 时若目标预设未定义路由，干净恢复出厂默认 `DEFAULT_MODULATION_ROUTES`，彻底切断脏曲线残留。
- **自动化多阶段曲线与 4 阶段倍率的双向数学强一致性闭环 (Bidirectional Curve-Multiplier Math Consistency - src/audio/dsp/curveMath.ts - M28)**：
  * **在 `src/audio/dsp/curveMath.ts` 中建立核心纯数学函数**：
    - `createCurveDataFromMultipliers(mults)`：将 4 阶段离散倍率精确映射为连续三次样条曲线控制节点，保持各阶段平滑衔接；
    - `extractStageMultipliersFromCurve(curveData)`：建立 `getStageTarget` 阶段目标终端值提取算法，实现 $\text{extract}(\text{create}(M)) \equiv M$ 的双向数学对称闭环。
- **音色预设与用户持久化契约扩展 (Sound & User Preset Custom Modulation Contract - M28)**：
  * `SoundPreset` 与 `UserPreset` 类型增加可选 `modulationRoutes?: Record<string, ModulationRoute>` 契约；
  * `localStorage` 预设导入导出与存储体系完整支持自定义调制路由与自动化曲线。
- **测试套件扩展与契约严密守护 (M28)**：
  * 新增 `tests/unit/audio/presetModulationSync.spec.ts`（3 项测试），全覆盖双向数学一致性转换、切换无路由预设时曲线干净重置以及带路由预设的精准载入；
  * 自动化测试总量正式扩充至 103 个测试套件、679 项测试全绿。
- **排查并彻底根治：LFO 5 处硬编码物理直通污染（100% Knob-Truth 纯净声学体系立标 - M27）**：
  * **定位底层 AudioEngine.ts 初始化中的 5 处流氓连线**：
    1. `this.dualLfo.detuneModOut` 强制直连 OscA 和 Drone 音高（强制产生微颤 ±25 cents）；
    2. `this.dualLfo.filterModOut` 强制直连 Filter Cutoff（强制扫频 ±800 Hz）；
    3. `this.dualLfo.panModOut` 强制直连 Stereo Panner（强制摇摆声相 ±0.6）；
    4. `this.dualLfo.tremoloModOut` 强制直连 Tremolo Gain（强制调制主音量 ±15%）；
  * **架构物理切除**：彻底移除上述 5 处物理直连，贯彻现代专业合成器（Serum, Vital, Pigments）的纯净模块化标准；
  * **真实旋钮基准法则（100% Knob-Truth Principle）**：未在调制矩阵中显式分配调制路由时，参数 100% 遵守面板旋钮设置，对声音绝对零背景干扰与硬编码直通。
- **商业级 LFO 1 与 LFO 2 孪生对称标准化重构 (Symmetrical Twin LFO Architecture - M27)**：
  * **消除认知混乱与设计不对称**：移除 LFO 2 面板上孤立奇怪的 Filter 和 Pan Mod 旋钮；
  * **LFO 1 与 LFO 2 实现 100% 对称标准结构**：
    - 顶部配备 75px Serum 风格暗黑网格波形示波器（`SerumLfoScope`）；
    - 5 种经典波形快速切换微工具条（SIN 正弦, TRI 三角, SAW 锯齿, SQR 方波, RND 采样保持随机）；
    - 底部孪生双旋钮：Rate 频率旋钮（0.01..30.0 / 20.0 Hz）与 Depth 调制深度旋钮（0..100%）；
    - 右上角硬件 Bypass 电源开关；
  * **Lfo2Params 接口规范化**：将 legacy 字段（`filterMod`, `panMod`, `tremoloMod`）设为可选，对齐 `Lfo1Params` 基础数据结构。
- **纯 LFO DSP 数学模块建立与声学/视窗双向一致 (src/audio/dsp/lfoMath.ts - M27)**：
  * **提取纯数学函数**：提取 `evaluateLfoWaveform` 与 `computeLfoLiveValue` 纯数学函数；
  * **规范 normalized phase [0..1) 下的 5 种波形数学解算**：
    - Triangle：四分之一周期正交线性斜坡；
    - Sawtooth：$1 - 2p$ 线性平降；
    - Square：前 50% 周期为 +1.0，后 50% 为 -1.0；
    - Random：确定性 4 阶采样保持伪随机阶跃；
    - Sine：标准 $2\pi$ 正弦；
  * **深度乘数与旁通保障**：`computeLfoLiveValue` 乘入 `effectiveDepth` 并严格响应 bypass（`bypass=true` 输出精确为 0.0）；
  * **所见即所听（WYSIWYH）**：`SerumLfoScope` 与 `AudioEngine`、`HardwareDeck` 共享完全一致的 DSP 核心算法，实现所见即所听。
- **调制矩阵全目标调度闭环 (Comprehensive Modulation Matrix Dispatch - M27)**：
  * **全目标解算分发**：在 `AudioEngine.applyLiveModulationRoutes` 中全面补齐对 `master-pan`, `osca-detune`, `drone-drift`, `reverb-mix`, `delay-mix`, `drive-amount` 的实时解算分发；
  * **动态注入与基准回落**：当矩阵路由生效时，实时将 LFO / Breath Macro / Stage Env 的动态能量平滑注入 AudioParam；无调制路由时，立即无缝回落并严格锁定用户旋钮基准值。
- **测试套件扩展与契约严密守护 (M27)**：
  * 新增 `tests/unit/audio/lfoMath.spec.ts`（5 项测试），全覆盖 5 种波形取值、深度缩放及旁通边界；
  * 扩展 `tests/unit/audio/knobTruthAndBreathGate.spec.ts`，增加 LFO 矩阵路由、深度乘数及旁通回落的动态声学测试；
  * 更新 `tests/unit/ui/serumLfoAndPan.spec.ts`，断言 LFO 2 面板标准的 Depth 旋钮与对称布局；
  * 自动化测试总量正式扩充至 102 个测试套件、676 项测试全绿。
- **HardwareDeck 顶部栏左右声学拓扑重组与自适应排版优化 (Deck Top Bar Left-Right Acoustic Topology Reorganization - M26)**：
  * **解决窄屏折行孤立掉落缺陷**：此前在窄屏或中等屏幕宽度下，顶部栏 flex-wrap 换行导致右侧 Master 推子卡片掉落至左下方孤立无援，破坏了视觉秩序与工业硬件整体性；
  * **左侧动力输入监控聚合区**：将 Brand 品牌标识（Radio 矢量图标、Synhale 2 Hardware Deck、Semi-Modular 标牌）与 STAGE ENVELOPE（`BreathMacroTimelineScope` 呼吸阶段多阶段包络示波器）聚合在左侧弹性容器（`flex flex-wrap items-center gap-3 sm:gap-4 min-w-0`）内，作为整机的声学动力输入与生命节律监控区；
  * **右侧 Master 输出仓固定区**：将 Master Output Bay（包含 `BipolarFader` master-fader `height=115`、`Knob` master-pan、Main Out 工业标牌）与主题切换按钮固定在最右侧（通过 `self-end sm:self-auto shrink-0`），符合混音台信号流“左侧输入源 -> 右侧 Master 总线输出”的标准声学拓扑，任何屏幕宽度下均保持高端机架仪器的视觉锚定。
- **SerumLfoScope 纵向展示空间 50% 扩容 (75px Vertical Grid Expansion - M26)**：
  * **消除 50px/54px 局促压缩**：解决此前 50px/54px 偏矮局促、波形振幅与调制深度施展不开的问题；
  * **默认高度扩容至 75px**：`SerumLfoScopeProps` 与内部组件默认 `height = 75`，纵向绘图空间扩充 50%；
  * **网格与走针舒展大气**：正弦波（SIN）、三角波（TRI）、锯齿波（SAW）、方波（SQR）与随机采样保持（RND）波形的振幅起伏、`#07090e` 暗黑网格背景、零轴虚线与白炽激光相位巡航走针更加舒展大气，工业质感更足。
- **测试套件扩展与契约严密守护 (M26)**：
  * `tests/unit/ui/deck.spec.ts` 增加对顶部栏左侧 Brand + STAGE ENVELOPE 聚合与右侧 Master Output Bay 固定的结构化断言；
  * `tests/unit/ui/serumLfoAndPan.spec.ts` 增加对 75px 默认高度与 `0 0 160 75` viewBox 的断言，自动化测试总量正式扩充至 670 项。
- **排查并彻底根治：Stage Env 在独立编辑器中编辑后不生效 Bug (Decoupled Stage Studio Target Routing - M25)**：
  * **定位三重根本漏洞**：
    1. 根因 1：`ModulationCard` 打开 Studio 时调用 `onClose()`，将 `activeModTarget` 抹除为 `null`；
    2. 根因 2：`HardwareDeck` 原 `onSave` 回调直接调用 `handleModAssign`，首行的 `if (!activeModTarget) return;` 静默短路抛弃所有修改；
    3. 根因 3：原代码硬编码了 `target: 'master-fader'`，无论在哪个旋钮（如 `filter-cutoff`, `osca-morph`）中打开 Studio，其他参数的曲线从未被修改；
  * **架构解耦与精准回写**：
    - `HardwareDeck` 独立维护 `studioTarget` 状态，无论从顶部示波器（`master-fader`）还是从任意旋钮的 `ModulationCard` 打开 Studio，精准锁定目标参数元数据；
    - 提取专用的 `handleStudioSave` 回调，绕过模态弹窗生命周期守卫，精准回写 `modulationRoutes[studioTarget.id]`，并实时调用 `onModulationRouteAssign` 广播给底层声学引擎；
    - `AudioEngine.applyLiveModulationRoutes` 补齐 `osca-morph`、`osca-harmonics` 与 `osca-gain` 的实时动态解算与下发，使波表扫频与增益的呼吸调制在声学底层 100% 真实生效。
- **ADSR 包络线图形界面垂直纵深重塑 (AdsrEnvelopeVisualizer.tsx Vertical Depth Expansion - M25)**：
  * **消除垂直压缩与扁平失真**：消除原 64px 极度矮小带来的垂直压缩与扁平失真感；
  * **翻倍扩展纵向绘图跨度**：SVG height 扩充至 110px，纵向绘图有效跨度（`hRange`）由 44px 翻倍扩展至 82px（`topY=14, botY=96`）；
  * **参考网格与容器升级**：新增 -3dB 参考虚线，外层容器升级为 `h-[110px]`，使 Attack 冲顶、Decay 指数衰减和 Release 拖尾呈现出开阔大气的工业硬件质感。
- **全通道推子 115px 独立通道条自适应重构 (Adaptive Channel Strip Bay Architecture - M25)**：
  * **解决排版硬伤**：彻底解决此前窄屏下 Level 推子被混在普通旋钮网格中挤扁折行的严重排版硬伤；
  * **Master Section 独立输出仓**：打造独立的 Master Output Bay，Master Fader 垂直行程拉长至 115px，与 Master Pan 旋钮并排封装在独立的通道条卡片中；
  * **OSC A 核心发声区专业通道条结构**：将 Level 推子从 5 列旋钮网格中剥离，形成“左侧 4 旋钮矩阵 + 右侧独立 Channel Level Bay（`height=115`）”的专业通道条结构；
  * **OSC B 与 Drone 同步升级**：全部配备拉长至 115px 的独立通道推子仓，无论在窄屏还是宽屏下均自适应舒展，操作行程充足。
- **StageEnvelopeStudio 独立编辑器功能精简与风格统一 (M25)**：
  * **平滑聚焦锚点按钮**：精简 Header 互斥视图切换开关，改造为上层全周期全景视窗与下层当前阶段微操画布的平滑聚焦锚点按钮（附带 `scrollIntoView` 安全调用）；
  * **动态目标联动参数展示**：Header 显式展示目标联动参数（如：`目标联动: Filter Cutoff · 4 阶段高精度声学自动化曲线`）；
  * **工业美学贯彻**：强化 100% 零 Emoji、1px `border-neutral-800` 边框、微拟物深色背景的工业科技美学规范。
- **呼吸图形触碰范围限定与几何命中检测 (Geometry Hit Test & Peripheral Area Reservation - M24)**：
  * **解决痛点**：此前点击页面任意角落均会无条件触发暂停/播放，导致误触频发且无法在页面外围预留手势操作；
  * **几何欧氏距离判定算法**：在 `src/visuals/gestureHandler.ts` 引入 `isWithinGeometry(clientX, clientY, canvasRect, ratio = 0.44)` 算法，计算 `pointerUp` 坐标与画布中心点 $(cx, cy)$ 的欧氏距离 $\text{Math.hypot}(clientX - cx, clientY - cy) \le 0.44 \times \min(W, H)$；
  * **专属几何命中**：仅当触碰在中央呼吸图形几何有效范围之内时触发暂停/播放；外部空白区域点击不触发，为未来长按、拖拽等宏手势预留外围安全区域；
  * **交互文案自适应**：未播放状态下的画布居中提示文案更新为「轻触中心图形开始呼吸 · Tap Central Geometry to Breathe」；
  * **专项单元测试验证**：新增 `tests/unit/visuals/geometryHitTest.spec.ts`，全量验证中心绝对命中、内边缘临界命中、外边缘临界拦截以及画布四角坐标拦截判定。
- **主界面顶部 Header 精简与底部视觉风格药丸条 (Header Streamlining & Bottom Visual Preset Capsule - M24)**：
  * **消除顶部视觉拥挤**：将 4 种呼吸图形显示风格（Minimal Ring, Sacred Geometry, Zen Waves, Calm Focus）彻底从顶部导航栏 Header 移出，大幅削减顶部信息负载与移动端换行挤压风险；
  * **顶部导航聚焦核心**：Header 专注于 432Hz Core 指示、呼吸节律抽屉、声音预设抽屉、保存预设、Deck 机架呼出与明暗主题切换；
  * **底部微拟物悬浮药丸切换栏**：在底部主控区（StatusCapsule 旁边）并列集成极简深色微拟物药丸切换栏（`role="toolbar"` `aria-label="Visual Geometry Presets"`），完全符合移动端拇指热区与现代前端极简美学，交互触手可及。
- **机架 OSC A 控件水平自适应网格防挤压重构 (Adaptive Sub-Panel Anti-Compression Grid - M24)**：
  * **攻克排版严重 Bug**：彻底解决此前 OSC A 模块多达 10 个控件平铺在窄屏或中屏下被任意截断并挤到第二行，导致两端被过度拉伸错位的严重排版与视觉挤压 Bug；
  * **两级语义子卡片网格架构**：
    - **Row 1 核心发声区 (Core Generation & Wavetable)**：Wavetable 切片步进选择器、Pitch、Harmonics、Morph、Level 推子，固定在等宽 5 列网格槽位（`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`），所有发声模式下始终可见；
    - **Row 2 模拟质感与声场区 (Analog Texture & Stereo Space)**：单音模式（drone）专属的 Detune、Unison、Sub Gain、Warmth、Spread，同样结构化对齐于 5 列网格槽位，整齐划一，彻底消除参差孤立换行与不对齐现象。
- **立体声 Master Pan 控制体系健全与 LFO 2 正名 (Stereo Panning System & LFO 2 Clarification - M24)**：
  * **声学概念厘清与释疑**：LFO 2 的原 Pan 旋钮本质是 Auto-Pan（低频立体声自动平移摆动深度），此前缺乏真正的主立体声声像定位总控；
  * **底层 Web Audio 声学闭环补全**：
    - `src/types/audio.ts` 在 `EffectsChainParams` 中引入 `masterPan?: number`（$-1.0 .. +1.0$，默认 0.0 中置）；
    - `src/audio/engine.ts` 实例化标准 `StereoPannerNode`，挂载于 Reverb 之后与 MasterCut 之前，并在 `updateEffects` 中通过 `setTargetAtTime` 实时调度；
  * **机架面板物理声学解耦**：
    - 机架 Master 区域正式增加双极性 Master Pan 旋钮（`masterPan`，$-1.0 .. +1.0$，支持 L100~C~R100 标度显示与调制挂载）；
    - LFO 2 的对应旋钮正式正名为「Pan Mod」，两者的物理声学职责清晰解耦，构建了完整的立体声定位与动态平移调制体系。
- **Serum 风格 LFO 网格波形视窗与经典波形扩展 (Serum-Style LFO Scope & Classic Waveforms - M24)**：
  * **新建专业级 SerumLfoScope 组件**：新建 `src/ui/components/lfo/SerumLfoScope.tsx` 并在 LFO 1 与 LFO 2 模块中深度集成；
  * **Serum 标志性暗黑网格视窗**：采用 `#07090e` 深邃背景、中心零轴点划虚线、四分格时间辅助线与右上角微观 Rate 频率 HUD（如 `0.15Hz`）；
  * **5 种经典波形扩展与即时切换**：扩展 `LfoShape = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'random'`（Sine 正弦、Triangle 三角、Sawtooth 锯齿、Square 方波、Random 采样保持阶梯随机），面板配备微型波形选择按钮矩阵；
  * **实时激光走针与发光光晕 (Laser Playhead & Glow Dot)**：走针严格根据当前选中的波形数学公式与实时时钟相位高精度巡航，高亮白炽走针圆点与发光投影；
  * **全面测试覆盖**：新增 `tests/unit/ui/serumLfoAndPan.spec.ts`，全面验证波形渲染、波形切换事件回调、以及 Master Pan 与 LFO 2 Pan Mod 在机架中的无缝装配。
- **放弃**：难以在 Web/低功耗环境下保证无相位撕裂与零丢帧的任意模块化 DAG（Phase Plant 式）与 16 复音超级锯齿波。
- **确立**：紧凑半模块化单面板架构（固定 3 轨通道条 + 隐藏式长按挂载矩阵），聚焦单音与深层 432Hz Drone 泛音列。
- **声学宏绑定**：四阶段生物节律（Inhale、Hold In、Exhale、Hold Out）作为一级物理宏源（Breath Macro），牵引共鸣腔（Cutoff/Resonance）、气流摩擦度（Noise Color & Gain）、声场空间（Reverb Wet）与音高张力（Pitch Drift）。
- **调制源两级分支架构重构 (Two-Branch Categorization in ModulationCard.tsx - M23)**：
  * **解决痛点**：此前 4 个扁平按钮混乱堆叠、分类不清晰，难以区分物理生物源与内部振荡器；
  * **两大分支精准划分**：
    - **分支 A：呼吸动态组 (Breath Dynamic Group)**：包含 Breath Macro（实时物理呼吸宏，随呼吸膨胀/收缩）与 Stage Env（4 阶段呼吸包络，按吸气/屏息/呼气/静息四阶段专属步进）；
    - **分支 B：合成器内部 LFO 组 (Internal Synth LFO)**：包含 LFO 1（基础调制，周期性正弦微波颤音 Vibrato 与微漂移）与 LFO 2（潮汐超慢律动，驱动滤波呼吸扫频与立体声双耳声场摇摆）；
  * **界面层级分明**：分组标签与卡片容器清晰划分，交互一目了然。
- **排查并彻底根治：LFO 极性模式声学逻辑缺陷 (Acoustic LFO Polarity Normalization - M23)**：
  * **消除声学悖论**：底层 LFO 是纯交流对称双极性正弦信号源（$[-1.0, +1.0]$），以往暴露 Unipolar/Bidirectional 开关纯属虚假且有误导性；
  * **建立 supportsPolarity 安全守卫**：当选中 LFO 1 或 LFO 2 时，彻底隐藏极性切换面板，展示工业级「双极性交流对称振荡 (AC Symmetric Modulation [-1.0, +1.0])」指示器，底层保存时强制双极性（`bipolar = true`）；
  * **保留单极性切换**：仅在原生单极性物理源（Breath Macro 与 Stage Env）下保留 Unipolar / Bidirectional 极性模式切换。
- **全宽独立呼吸阶段包络演播室工作台 (StageEnvelopeStudio.tsx) 诞生与交互体验革命 (M23)**：
  * **告别狭窄拥挤**：解决此前 384px 狭窄弹窗挤压导致的触控脱靶、缺乏全局视窗、节点死锁等痛点；
  * **全宽宽屏演播室工作台**：构建 760px~960px 专业模态工作台（SVG 视窗 760x240，PLOT 区域 688x192）；
  * **双模视窗自由切换**：
    - **全景视窗 (Panorama View)**：4 阶段无缝连续铺开，一览完整生理呼吸循环包络全貌；
    - **微操放大视窗 (Focused View)**：单个阶段高精度微操放大，提供毫厘级曲线雕刻体验；
  * **节点交互工业级升级**：
    - 加大点击靶心半径至 14px/16px，触控与鼠标绝不脱靶；
    - 彻底移除以往 0.05..0.95 的死区限制，支持任意位置精准放置；
    - 双击新增控制节点（CurveControlPoint）、点击选定节点、按 Delete/Backspace 键或双击删除非端点节点；
  * **实时浮动坐标 HUD**：实时显示当前拖动节点或手柄的百分比时间与电平数值（例如：`时间: 45.2% | 电平: 82.0%`）；
  * **垂直张力手柄引导虚线与双击归零**：展示虚线引导线与张力手柄，双击手柄瞬间归零恢复为 0 张力线性直达；
  * **预设与状态重置**：内置 5 大出厂经典预设（自然潮汐、爆发跃升、方波脉冲、禅定微澜、弹拨包络）与用户预设管理；支持「重置本阶段」一键恢复为基线折线；
  * **「保存并生效 · Save & Apply」即时反馈**：具备点击视觉反馈，将包络曲线即时广播至音频引擎与状态树。
- **全链路闭环联动 (Full-Loop Stage Env Integration - M23)**：
  * 顶部 `BreathMacroTimelineScope` 点击直接呼出 `StageEnvelopeStudio`；
  * `ModulationCard` 中 Stage Env 模式配备「打开独立包络工作台 (Open Studio MSEG)」直达按钮；
  * 工作台保存或实时变更时，与主音量包络（`master-fader`）及 `stageMultipliers` 实现双向闭环驱动。
- **排查并彻底根治：清除调制后不同呼吸阶段声音变异问题与真实旋钮基准法则 (Knob-Truth Principle - M22)**：
  * **定位根本漏洞**：切除 `AudioEngine.ts` 中 `updateBreathModulation` 长达 120 余行的硬编码 `switch(stage)` 暴力覆写（以往每帧强行篡改 `filter.cutoff` 65%~150%、强制在屏息和静息将 `oscB.gain` 掐死为 0.0001、强制将 `reverb` 湿声比放大 1.25 倍、强制扫频波表等）；同时移除 `OscAChannel.ts` 内部写死的 `breathRateScale` 和跳八度；
  * **确立真实旋钮基准法则（Knob-Truth Principle）**：参数若未显式分配调制路由，在任何呼吸阶段与进度下严格锁定为用户面板旋钮设定值；仅在分配了显式 Modulation Route 时，才由调制矩阵根据曲线和源进行动态解算。
- **单音模式呼吸 Gate 音符生命周期规范 (Monophonic Breath Gate Note Triggering - M22)**：
  * **厘清乐器物理演奏生命周期**：将单次呼吸周期规范为一次完整的琴键门控（Breath Gate）；
  * **呼吸周期真实映射**：吸气开始（Inhale onset）触发 Note On（Attack -> Decay -> Sustain），屏息（Hold In）与呼气（Exhale）期间声波持续维持在 Sustain 平台共鸣，静息（Hold Out onset）触发 Note Off（Release 释音柔和消散）；
  * **生生不息敲响**：彻底解决清脆短音（Sustain=0 时）在首个呼吸阶段后永久静音的痛点，使单音模式下的击钵、弹拨音色在每个呼吸循环中生生不息。
- **波表与粒子合成器关系界定与参数自适应折叠 (Wavetable-driven Granular Adaptive Layout - M22)**：
  * **声学架构界定**：本项目 OSC A 属于现代前沿的 Wavetable-driven Granular Synthesis，波表作为微粒的谐波切片与基础波形；
  * **共用核心参数**：基频 Pitch、谐波量 Harmonics、波表切片 Index、Morph 扫频深度、输出 Level；
  * **专属参数自适应折叠**：在 `HardwareDeck.tsx` 中，单音模式专属的 Unison（复音双振荡）、Sub Gain（次低频基底）、Warmth（饱和染色）、Spread（立体声展宽）、Detune（微调音分）在切换至粒子（particles / arp）模式时自适应折叠隐藏，避免控制冗余和认知困惑。
- **合成器机架模块物理信号流顺序重塑 (Physical Signal Flow Rack Ordering - M22)**：
  * **解决此前机架卡片位置混乱倒置的缺陷**，重塑为与底层 Web Audio 物理连线拓扑严密契合的物理信号走向：
    1. Tape Warmth Drive（前级磁带饱和过载）
    2. Multimode Filter（24dB/oct 多模状态变量滤波器）
    3. ADSR Envelope（主振幅与音色包络 VCA）
    4. Dual LFO Modulation（双 LFO 调制引擎，调制 Pitch/Filter/Pan）
    5. Stereo Ping-Pong Delay（空间延迟效果器）
    6. Gaussian Synthetic Reverb（空间混响效果器）
- **呼吸阶段 MSEG 交互式曲线编辑器 (BreathCurveEditor.tsx) 与预设管理 (Interactive 4-Stage Continuous MSEG Editor & Curve Presets - M22)**：
  * **淘汰僵化模式**：淘汰僵化的 3 种固定形态与 4 个固定倍率滑块，升级为多阶段包络发生器（Multi-Stage Envelope Generator）；
  * **全自由度交互编辑**：支持在 4 个呼吸阶段直观绘制自动化曲线：双击画布自由增删控制节点（Control Points）、按住手柄垂直拖动调节曲线张力曲率（Tension，支持幂律指数/对数连续弯曲）；
  * **高保真激光巡航**：激光走针（Live Playhead）在真实三次弯曲数学轨迹上高精度巡航；
  * **曲线预设管理库（curvePresets.ts）**：内置 5 大出厂经典预设（自然潮汐 Natural Breath、爆发跃升 Heroic Apex、方波脉冲 Square Pulse、禅定微澜 Zen Stillness、弹拨包络 Pluck Strike），支持将自定义曲线命名保存到 `localStorage`，随时跨组件一键复用；
  * **向后兼容**：保留 4 阶段倍率快捷矩阵与既有测试契约。
- **ADSR 真实声学原理对齐与 Sustain 调节解耦 (Acoustic ADSR Decoupling - M21)**：
  * **解决根本声学疑问**：调节 Sustain 绝不影响 Attack 到 Decay 阶段的爆发冲击与自然衰减，Sustain 仅是衰减目标电平终点；
  * **彻底切除暴力抹平**：彻底切除 `AdsrModule.ts` 在监听到 `sustain === 0` 时的暴力抹平逻辑，确保无论是 Pluck 弹拨还是 Bell 钟鸣，在 Attack/Decay 阶段均能完整释放冲顶与自然衰减；
  * **平滑维持态调节**：仅在当前处于 `lastStage === 'hold'`（维持态）时平滑调整维持电平，符合 Serum、Vital、Pigments 等商业合成器声学标准。
- **粒子合成器调度机制重构：解绑母线长 ADSR、引入微观粒径窗与 Voice Stealing (Micro Grain Window & Commercial Voice Stealing - M21)**：
  * **彻底破除粒子数量偏少死锁**：排查出此前粒子数量偏少的根本死锁——单粒子包络包含母线长达 5.5s 的长尾，迅速占满 density 槽位导致后续粒子 100% 被丢弃；
  * **微观粒径窗（Micro Grain Window）**：单个微粒生命周期由 `nominalDuration` 严格约束（0.05s~4.0s），微观起振起音（最小 3ms），Sustain=0 时立即无 hold 释放；
  * **商业级声部窃取（Voice Stealing）**：并发声部达到上限（`maxDensity = 32`）时，对最老声部执行 8ms 指数防爆音极速淡出释放，保证高频调度（50Hz）下新粒子 100% 顺畅流淌。
- **商业颗粒合成器核心音色约束参数体系 (Phase Plant / Pigments 级 - M21)**：
  * **ParticleParams 扩展 4 大商业核心维度**：
    - **Spray（丛发）**：1~4 粒子瞬时丛发，微时间抖动 0~15ms；
    - **Pitch Jitter（微分音游移）**：0~50 cents 微观模拟失谐，消除机械相位重叠，赋予温暖合唱感；
    - **Wavetable Jitter / WT Wander（波表漫游）**：0~8 slices 波表切片漫游，赋予水晶般泛音流动色彩；
    - **Grain Shape（微观窗形态）与 Chance（触发概率 10%~100%）**；
  * **控制面板全量集成**：在 `HardwareDeck.tsx` 中完整集成 Spray, Jitter, WT Wander, Chance 旋钮组，粒子专属控制旋钮扩充至 9 枚。
- **推子 VCA 乘法包络调制动态精准映射与渲染算法重构 (BipolarFader VCA Envelope Multiplicative Modulation - M20)**：
  * **解决渲染失真死锁 Bug**：攻克此前 master 推到 100% 时，侧边动态调制范围条消失（`top: 0%, bottom: 100%` 折叠为 0 像素）且实时跳针被挤压死锁在顶部的严重渲染失真 Bug；
  * **对齐底层物理声学（单极性 VCA 乘法包络）**：Master / Channel 增益推子在物理本质上是单极性天花板推子（`effectiveValue` 即当前最大输出限额），包络调制严格按乘法运算：$\text{actualGain} = \text{effectiveValue} \times ((1 - \text{depth}) + \text{depth} \times \text{liveModOffset})$ 计算；
  * **范围条算法修正**：单极性模式下 $valMin = effectiveValue \times (1 - depth)$，$valMax = effectiveValue$；当推子推至 100% 且 depth 为 100% 时，$valMin = 0.0$，$valMax = 1.0$，范围条完美覆盖 0%~100%，清晰展现完整的动态调制能量柱；
  * **实时跳针位置修正**：实时位置按 $liveVal = effectiveValue \times ((1 - depth) + depth \times liveModOffset)$ 计算；随着呼吸四阶段在 0%~100% 之间平滑起伏，当 `liveModOffset` 为 0 时（静息阶段）跳针依然稳定锚定在 0% 且发光清晰可见，彻底消除数字 0 假死隐藏缺陷与顶部遮挡；双极性模式保持差分加减振荡；
  * **视觉细节升级**：live tick 发光电光滑块层级提升至 `z-10`，尺寸微调为 14px x 2.5px（`-left-1.5 w-4 h-[2.5px]`，居中偏置 `calc(${liveBottomPct}% - 1.25px)`），发光阴影与轨道层次更分明。
- **ModulationCard 调制源精简移除冗余 Manual 项 (Streamlined Modulation Sources & Dedicated Unassign - M20)**：
  * **功能重叠认知困惑根除**：弹窗底部已具备专用的红色 Unassign（解除调制）按钮，此前在 SOURCES 列表中重复放置“Manual（手动）”选项导致用户认知割裂与状态歧义；
  * **四大动态核心动力源收敛**：移除 SOURCES 数组中多余的 Manual 选项，选项精准收敛为四大真正具备声学时变属性的核心动力源：Breath Macro（呼吸宏）、LFO 1、LFO 2、Stage Env（阶段包络）；
  * **向后兼容与安全回退**：保持 `src/types/ui.ts` 中 `ModulationSource` 联合类型包含 `'manual'`，弹窗内部保留历史 manual 路由的安全回退支持。
- **真实 Web Audio 调制解算打通与 Stage Env 为 0 绝对静音 (Real Web Audio Modulation Dispatch & Absolute Zero-Floor Muting)**：
  * **定位底层断层**：此前 UI 层的 `liveModOffset` 仅在 React 状态树中空转计算并绘制光圈，`App.tsx` 未挂载并向下派发 `onModulationRouteAssign`，`AudioEngine.ts` 内部没有任何基于 `modulationRoutes` 的解算与派发逻辑，导致底层 `masterVolumeGain.gain` 死锁在 0.85 静态值，出现“UI 动画跑得欢、底层声音不改变”的断层；
  * **架构打通与状态管理**：`AudioEngine.ts` 引入完整的 `modulationRoutes` 状态管理器（`setModulationRoutes`, `setModulationRoute`, `getModulationRoutes`），并在 `App.tsx` 中建立双向响应桥梁，实时将用户挂载和编辑的调制路由注入音频引擎；
  * **60fps 真实解算与绝对静音**：在 `updateBreathModulation` 中实现 `computeRouteLiveValue` 与 `applyLiveModulationRoutes`，高保真计算平滑余弦 S 曲线、线性及阶梯过渡，并将解算偏移量实时派发至 `masterVolumeGain`、`filter.cutoff`、`filter.resonance`、`oscb.color` 等核心节点；特别针对 `master-fader`，当绑定 `stageProgress` 且阶段包络输出值为 0 时，不仅使用 `setTargetAtTime` 平滑衰减，同时直接设置 `gain.value = 0.0`，彻底阻断任何残存电平，实现纯净绝对静音；
  * **出厂配置静息零底噪**：`HardwareDeck.tsx` 将 `master-fader` 默认 `depth` 设为 1.0，`holdOut` 设为 0.0，确保默认静息阶段扬声器绝对无底噪。
- **未受控背景长音泄漏彻底排查与物理切断 (Complete Elimination & Severing of Uncontrolled Background Drone Leakage - M19)**：
  * **深度排查持续长音根因**：解决将 ADSR 调成清脆短音或极小时值打击音后，背景依然持续存在嗡鸣未受控背景长音直响的顽疾；
  * **根因 1-A 彻底切除（`OscAChannel.ts`）**：切除波表动态扫描无条件复活持续振荡器的致命漏洞。在 `updateWavetablePosition` 中建立 `isDrone` 守卫，非 drone 模式（`particles` / `arp`）下 `gain1` 与 `gain2` 强制保持 0.0，杜绝每 16ms 呼吸扫描时振荡器被置为 1.0 全通穿透母线直响；
  * **根因 1-B 彻底切除（`AudioEngine.ts`）**：在 `updateBreathModulation` 中建立 `isDroneMode` 守卫，全呼吸阶段（`inhale`, `holdIn`, `exhale`, `holdOut`）非 drone 模式下严格执行 `this.drone.setParams({ gain: 0.0 })`，杜绝 432Hz 基础长音直通泄漏；切回 drone 模式时无缝恢复；
  * **根因 1-C 彻底修复（`AdsrModule.ts`）**：移除 `setParams` 中对 `this.lastStage` 的死锁限制，当 `sustain` 降至 0 时立即在 30ms 线性斜率内精确平滑衰减至 0.0 绝对静音，彻底消除残留 -80dB 被主限制器抬升为长音底噪的隐患。
- **粒子合成器音数容量大幅扩充与机制解惑 (Particle Synthesizer Voice Capacity Expansion & Power Balancing - M19)**：
  * **决定音数的核心旋钮明晰**：向用户明确揭示决定音数的核心旋钮是 Rate（粒子发射速率，时钟频率，0.1 ~ 50.0 Hz）与 Density（并发复音数上限，Voice Cap，1 ~ 32 V 并发音数）；
  * **参数量程大跃升**：Rate 扩充至 0.1 ~ 50.0 Hz；Density 扩充至 1 ~ 32 V 并发音数；
  * **硬件面板新增 Duration 旋钮**：在 `HardwareDeck` 新增 Duration 旋钮（0.05s ~ 4.0s），支持超短清脆雨滴与悠长星云；
  * **抗削波动态功率平衡**：接入 $1 / \sqrt{\text{maxDensity}}$ 动态混音总线功率平衡（`busGain`），确保 32 轨多音并发叠加时绝无数字削波爆音。
- **Phase Plant 风格灵动粒子流动态监视器 (Phase Plant Style Dynamic Particle Stream Scope - `ParticleStreamScope.tsx` - M19)**：
  * **声相-音高全息监视器**：为粒子合成器量身打造 Phase Plant 风格声相-音高全息监视器；
  * **物理维度高保真映射**：X 轴映射左右立体声全景声相（L <-> R），Y 轴映射八度对数音高频带（55Hz - 3520Hz）；
  * **光子核心与星轨动态**：粒子以白炽/电光青蓝光子核心瞬时冲顶绽放（Flash Shockwave），伴随 Attack 脉冲光环展开，随 Decay 漫游微颤，随 Release 柔和消散，荧光星轨极具未来工业科技感；
  * **模式自适应无缝切换**：随 `voiceMode` 实时响应：单音模式显示波表（Waveform Monitor），多音模式（particles / arp）无缝切换至 Phase Plant 粒子流场。
- **ADSR 零锚点对数瞬态几何重塑与响应式阶段标识 (ADSR Zero-Anchor Logarithmic Transient Geometry - `AdsrEnvelopeVisualizer.tsx` - M19)**：
  * **废除旧版硬编码失真**：彻底废除原有硬编码 18+ 保底常数引起的严重几何失真；
  * **零锚点平滑对数函数**：重构为零锚点平滑对数函数 $\text{normLog}(t) = \frac{\ln(1 + k \cdot t)}{\ln(1 + k \cdot \max T)}$，当 $\text{Attack} = 0.01\text{s}$ 时水平位移严格压缩在 1.5px~2.0px（$\le 3\text{px}$），在视觉上呈现真实的 90 度垂直拔起瞬态冲击；
  * **响应式自适应缩写**：阶段文本采用响应式自适应缩写（ATTACK/A, DECAY/D, RELEASE/R），窄段落不重叠。
- **ModulationCard 界面与交互重构：旋钮大样与 -100%~+100% 垂直双极性推子 (Knob Hero Preview & Vertical Bipolar Fader)**：
  * **默认调制强度修正**：初始 `depth` 默认为 0.0（双极性 -100% ~ +100%），避免用户一打开就出现不可预期的过调制；
  * **目标控制大样与垂直推子并排双联区**：
    - **左侧：72px/96px 科技感目标旋钮大样（Knob Hero Preview）**：外圈实时展现根据 depth 展开的 Serum 风格动态调制环（顺时针青蓝 `#38bdf8` / 逆时针琥珀 `#f59e0b`）与随实时声音信号跳动的高亮游标（Live Playhead Dot，白芯青边）及扫频光弧（Live Sweep Arc，`#00f0ff` / `#fbbf24`）；
    - **右侧：垂直双极性推子（Vertical Bipolar Fader）**：高度 140px（`h-36`），居中 0% 刻度水平中轴线，向上正向提升 (+100%)、向下反向抑制 (-100%)，支持中点磁吸归零与双击重置；标尺明确标注 +100%、+50%、0%、-50%、-100%；同时保留 `sr-only` 的标准 `input[type="range"]`，确保 100% 无障碍与自动化测试契约完美兼容。
- **Master 推子默认绑定 Stage Env 与 Breath micro VU 呈现真实 Stage 包络线及双向闭环交互 (Default Stage Progress Modulation for Master Fader & Real Multi-Modal Stage MSEG Curve Rendering)**：
  * **Master 推子默认绑定 Stage Env (Default Stage Progress Modulation for Master Fader)**：
    - 解决此前 `master-fader` 开箱未包含在 `DEFAULT_MODULATION_ROUTES` 导致推子无默认调制的缺陷；
    - 在 `DEFAULT_MODULATION_ROUTES` 中为 `master-fader` 配置默认路由：`source: 'stageProgress', depth: 1.0, bipolar: false, stageMultipliers: { inhale: 1.0, holdIn: 0.85, exhale: 0.25, holdOut: 0.0, curve: 'smooth' }`；
    - Master 推子开箱即展示 Serum 风格单极性调制范围柱与侧边实时随呼吸四阶段跳动的激光指示滑块。
  * **Breath micro VU 示波器真正呈现 Stage Env 真实包络线 (Real Multi-Modal Stage MSEG Curve Rendering)**：
    - 解决此前示波器硬编码固定死波形（`yBase=30, yPeak=6`）的缺陷；
    - 扩展 `BreathMacroTimelineScopeProps`，接收 `stageMultipliers`；
    - 坐标真实映射：吸气高度、屏息高度、呼气高度、静息高度 0..1 完全映射到画布有效区域（`topY=6, botY=30`）；
    - 支持平滑余弦连续 S 曲线 (`smooth`)、线性折线 (`linear`)、阶梯直角跳跃 (`step`) 三种真实曲线形态；
    - 激光走针轨迹 (`playheadX`, `playheadY`) 严格按照当前 curve 模式的数学插值函数在真实包络线上高保真巡航。
  * **示波器与 Master 推子双向闭环协同 (Bi-directional Closed Loop & State Unification)**：
    - 彻底解耦 Master Volume 垂直拖拽调节，交由右侧专业推子（`BipolarFader`）精准掌控；
    - 顶部示波器直接消费 `modulationRoutes['master-fader']?.stageMultipliers`；
    - 点击示波器统一打开 `master-fader` 的 Stage Env 调节卡片；用户在弹窗中修改参数并确认后，示波器波形与 Master 推子动态电平同步联动更新，消除状态孤岛；
    - 赋予 `cursor-pointer`、悬停边框高亮与微动效（`hover:border-sky-500/70 hover:bg-neutral-900/80 active:scale-[0.99]`）；
    - 严格保留 `role="meter"`、`aria-label="Breath Macro VU"`、`aria-valuenow`、`aria-valuemin={0}`、`aria-valuemax={1}`，确保 100% 无障碍规范与既有自动化测试契约完美兼容。
- **核心旋钮数值调节范围全面扩充（Wide Param Horizons & Multi-Tier Unification）**：
  * **LFO 调制引擎宽域化**：LFO 1 Rate 从 0.05..8.0 Hz 扩充至 0.01..30.0 Hz（既能实现长达 100 秒的超慢冥想漫游与微漂移，又能触及 30Hz 音频速率边缘，激发 FM/AM 金属质感共振），LFO 2 Rate 扩充至 0.01..20.0 Hz，赋予声学滤波呼吸与双耳声像更广阔的动态张力；
  * **ADSR 物理包络极宽时间常数**：Attack、Decay、Release 从 0.01..6.0/8.0s 全面扩充至 0.005..15.0s，兼顾 5ms 微秒级清脆打击瞬态与长达 15 秒的史诗级氛围淡入与空灵消散；
  * **空间效果链极限与安全余量**：
    - Stereo Ping-Pong Delay：最大延迟时间从 1.5s 扩充至 3.0s（右声道交错扩展至 4.5s），底层 `DelayNode` 缓冲区初始化扩容至 5.0s，Feedback 扩充至 0.95 极限自激边缘；
    - Gaussian Reverb：混响衰减从 0.5..12.0s 扩充至 0.2..20.0s，底层合成 Buffer 安全钳制于 10.0s，杜绝算力与内存溢出；
  * **振荡器与滤波边界拓宽**：OSC A Pitch 扩充至 20..1760 Hz（覆盖从次低音到高八度泛音），Detune 扩充至 -100..+100 cents；OSC B Low Cut 扩充至 20..3000 Hz，更加细腻地雕刻气道通透度；Particle Rate 扩充至 0.1..20.0 Hz；
  * **三层链路全链路一致性保障**：统一“DSP 核心层限幅钳制（Clamping） -> engine.ts 参数换算与映射 -> HardwareDeck.tsx UI 旋钮 Range”三层架构，消除一切生硬的二次截断与失配。
- **调式量化器 (ScaleQuantizer - 5 大神圣与禅意调式系统，`src/audio/dsp/scaleQuantizer.ts`)**：
  * **内置 5 大专业疗愈调式**：五声音阶（Pentatonic Zen: 1, 2, 3, 5, 6 东方禅意永不撞音）、多利亚调式（Mystic Dorian: 深邃内敛沉思）、利底亚调式（Ethereal Lydian: 增四度超脱漂浮感）、Solfeggio 疗愈频率集（432Hz 自然谐振与 528Hz DNA 转化频率）、自然小调（Natural Minor: 宁静沉思的心灵归宿）；
  * **纯数学调式量化与安全音高采样算法**：提供 `quantizeToScale`（最近音程数学量化）、`getScaleFrequency`（精确八度与度数计算，限制于 20Hz~12000Hz 安全听觉域）、`getRandomScaleNote`（在指定八度跨度内加权随机采样），彻底杜绝半音刺耳碰撞。
- **发声引擎革命性升级：多音连续与生成式环境粒子发生器 (Generative Ambient Particle Engine)**：
  * **根本解决发声音色冻结与 ADSR 意义缺失缺陷**：彻底颠覆此前“把一个音从头按到死、ADSR 始终处于 sustain 稳态”的根本局限；
  * **OscA 三重发声模式扩展**：扩展 `voiceMode: 'drone' | 'particles' | 'arp'`（默认 `'drone'` 100% 兼容既有出厂预设与全部既有测试）；
  * **单个音符真实物理 ADSR 生命周期**：每个生成的粒子音符具备完全独立的 Web Audio VCA 增益节点与独立 ADSR 曲线（Attack 冲起 -> Decay 衰减 -> Sustain 维持 -> Release 释音消散）以及随机立体声漫游（Stereo Pan Scatter）；Attack 决定打击轻脆度，Decay/Release 雕刻空间余音，让 ADSR 具有极强的听觉辨识度和声音塑造力；
  * **呼吸动态速度自适应与高精度前瞻调度**：120ms Lookahead 前瞻调度器（40ms 轮询时钟），吸气阶段微加速（1.2x）激发灵性展开，呼气阶段轻柔放松（0.85x），静息阶段归于空灵；
  * **0ms 瞬间硬切安全性 (Zero-Residue Hard Cut)**：在 `OscAChannel.purge()` 时瞬间释放、停止并断开所有活跃粒子（`activeVoices`），保证 0ms 停顿测试与切换完全无残留、无挂起、零爆音。
- **HardwareDeck 控制面板升级与 ADSR 角色动态标定**：
  * **OSC A 模式切换器**：新增单色极简 `[ DRONE | PARTICLES | ARP ]` 模式切换按钮；
  * **调式选择器与粒子旋钮组**：激活粒子/琶音模式时平滑展开调式选择器（五声、多利亚、利底亚、Solfeggio、小调）以及 4 枚专属粒子旋钮：Rate（0.2~8.0 Hz 触发频率）、Octaves（1~4 八度跨度）、Density（1~8 复音密度）、Scatter（0~100% 立体声散射）；
  * **ADSR 头部角色动态指示**：ADSR 卡片头部根据当前 OSC A 模式动态标明其作用角色（`Per-Note Particles · 粒子包络` vs `Breath Master · 呼吸包络`）。
- **声疗预设升级：多预设粒子与琶音化驱动清泉流动般的治愈系音乐性**：
  * 在 12 款官方工厂预设库中，为晶莹冰川 (Crystal Glacier, 648Hz Lydian 粒子)、潮汐风铃 (Tidal Chimes, 528Hz Pentatonic 粒子)、森林晨曦 (Forest Dawn, 261.63Hz Dorian 粒子)、脉轮水晶碗 (Chakra Crystal Bowl, 528Hz Solfeggio 琶音) 注入生成式粒子与琶音模式，带来如清泉流动、冰晶滴落般灵动温润的音乐性与深度声疗价值。
- **ModulationCard 弹窗滚动脱节彻底修复与调制强度数学释义 (React Portal & Mathematical Clarity)**：
  * **W3C 规范定位降级根因攻坚**：在包含 `backdrop-blur-xl`、CSS 变换（`transform`）或特定 `filter` 的容器内部，子元素的 `position: fixed` 会被浏览器渲染引擎根据 W3C 规范将其包含块（Containing Block）重置为该祖先容器，从而退化为局部 `absolute`。当 Deck 内部内容滚动时，长按呼出的调制卡片会随之脱节错位。
  * **React Portal 与滚动锁定彻底治理**：利用 `createPortal(modalContent, document.body)` 将弹窗直接脱离组件层级、挂载至 `document.body` 顶层，并配合 `useEffect` 自动开启滚动锁定（`document.body.style.overflow = 'hidden'`），无论视口滑至何处，长按呼出的调制卡片 100% 绝对居中悬浮；保留 ESC 键及背景遮罩点击即时关闭。
  * **消除“调制强度”认知模糊与数学公式释义**：在阶段包络模式（`stageProgress`）下将调制滑块重命名为“总控深度与极性 · Master Depth & Polarity”，提供双极性 (-100% ~ +100%) 滑块，并配备直观的原理解析卡片与精确数学公式：
    $$\text{实际偏移} = \text{阶段包络值} \times \text{总控深度} \times \text{旋钮量程}$$
    明确上方 4 阶段滑块决定各时期的相对形态（0% ~ 100%），总控深度决定包络峰值对目标参数的物理作用量与极性（正向同相增益 / 负向反相抑制）。
- **音量推子 (BipolarFader) 调制自动化支持 (Serum-Style Fader Modulation)**：
  * 四大物理推子（OSC A、OSC B、Drone、Master）全面接入 `assignedModulation` 与 `liveModOffset`；
  * 支持 320ms 长按挂载调制源与调制弹窗编辑；
  * 在推子滑道侧边配备独立的 Serum 风格动态调制范围条（Modulation Range Bar，`bg-sky-500/70`，发光 `shadow-[0_0_6px_#0284c7]`）与发光实时电光指示滑块（Live Mod Tick，`bg-cyan-300`，`shadow-[0_0_8px_#00f0ff]`），实现推子与旋钮同级别的工业动态调制可视化。
- **旋钮与推子标签换行与完整显示 (Full Text Multi-line Labels)**：
  * 根除旧版 `truncate` 导致的英文/专业缩写被生硬截断问题；
  * 采用 `min-w-[56px] max-w-[82px] leading-tight break-words line-clamp-2` 紧凑两行自适应排版，并为 `<span>` 注入 `title={label}` 悬停完整提示，在维持硬件机架规整度与间距的同时确保专业声学参数完整可读。
- **OSC A 波表快速上下切换按钮 (Wavetable Stepper Buttons)**：
  * 在波表监视器头部两翼增加左右 Chevron 步进切换按钮（`ChevronLeft` / `ChevronRight`）；
  * 支持对 16 款高精度预制波表切片进行即时、平滑的环形步进循环（`prevSlice` / `nextSlice`），极大提升波表探索与音色塑造效率。
- **ADSR 物理发声音符包络与呼吸阶段彻底解耦与 Studio 专业级包络线重构 (Acoustic Note Envelope Decoupling & Studio Visualizer Modernization)**：
  * **根本概念混淆攻坚与彻底解耦**：彻底厘清“呼吸阶段包络 (Stage Envelope，由呼吸引擎及 4-Stage MSEG 专职掌控)”与“乐器物理发声音符包络 (ADSR Envelope，管理单个或多个音符发声生命周期)”的本质差异；
  * **AudioEngine 移除错误逻辑**：彻底删除了在 `updateBreathModulation` 中将母线 ADSR 强行绑定到吸气 (`triggerAttack`)、呼气 (`triggerRelease`)、静息 (`triggerQuiet`) 的错误逻辑，杜绝呼吸呼气和静息时粗暴掐灭正在发声的音符粒子；
  * **多音模式全通穿透与忠实映射**：在 `particles` / `arp` 模式下，母线 ADSR 设置为全通 Bypass，让 `OscAChannel` 内部每一个粒子音符执行专属独立的 Web Audio ADSR（Attack 冲顶 -> Decay 衰减 -> Sustain 维持 -> Release 消散）；且取消人为缩放系数，直接忠实映射用户设置的 ADSR 旋钮参数；
  * **单音模式 (drone) 物理稳态发声**：音频启动与恢复时触发一次音符按下（Attack -> Decay -> Sustain 保持），停止时触发 Release，持续发声期间稳定保持在 Sustain 平台，由呼吸滤波与波表扫频自然表现生命起伏；
  * **Studio 专业级包络线界面升级 (AdsrEnvelopeVisualizer)**：
    - **多音模式动效优雅停用**：增加 `voiceMode` 属性，当 `voiceMode !== 'drone'` 时，彻底停用伪走针动效，展示纯净的高精度静态物理包络基线与“POLYPHONIC ADSR (多音动效已停用)”状态徽章，杜绝认知混乱；
    - **单音模式稳定维持**：彻底去除呼吸阶段伪动效，播放时在 Sustain 平台起点展示温润锚定的发光微点；
    - **专业音频几何与网格系统**：高度扩充至 62px，内部 SVG 视窗 280x64；精细微弱电平参考网格（0dB Peak、-6dB、-12dB、-∞dB Mute Baseline）与左侧刻度标牌；垂直阶段分割线与 ATTACK, DECAY, SUSTAIN, RELEASE 区域标识；模拟电路电容充放电的三次贝塞尔平滑 S 曲线（S-Curve Attack）、真实指数下潜（Exponential Decay）与平滑指数释音（Exponential Release）；双层发光渐变填充与微光描边，4 个阶段关键拐点渲染发光双层同心锚点手柄（Anchor Rings）；底部 4 阶段精美参数芯片（Attack 0.80s, Decay 1.50s, Sustain 75%, Release 2.50s）。
- **用户自定义声音预设持久化与 7 款扩展声疗预设 (User Sound Presets & 12 Factory Presets Library)**：
  * 新建 `src/audio/storage/userPresets.ts`，基于 `localStorage` 提供自定义预设保存、命名、覆盖与删除机制，配备防御性运行时架构校验与边界清洗；
  * 在原有 5 大经典预设（西藏颂钵、深海共鸣、极光空灵、432Hz 脑波深眠、禅意古刹）基础上，扩充 7 款专业声疗级新预设：晶莹冰川 (288Hz)、月相潮汐 (144Hz)、禅意庭院 (324Hz)、磁带暖阳 (216Hz)、宇宙引力波 (108Hz)、萨满狂喜 (432Hz)、脉轮水晶碗 (528Hz)；
  * 构建 12 款官方工厂预设库，覆盖自然、天体、冥想、复古等全谱系身心疗愈场景。
- **Serum 风格旋钮动态调制环高反差重做 (Serum-Style Dynamic Modulation Orbital Ring)**：
  * **深度根因排查与攻坚**：
    a) **根因 1**：此前 `HardwareDeck.tsx` 初始 `modulationRoutes` 为空，导致整个机架初始没有任何旋钮具有调制，旋钮视觉上完全静态；
    b) **根因 2**：`liveModOffset` 在各阶段内部为固定常数，导致阶段内缺乏连续过渡与动态响应；
    c) **根因 3**：调制弧半径与旋钮本体贴合过近、描边过细且被内圈遮挡，高光环境下不易识别。
  * **重构落地措施**：
    a) **开箱即用预设调制矩阵（`DEFAULT_MODULATION_ROUTES`）**：默认注入 Filter Cutoff（呼吸宏展开 0.60）、OSC A Morph（呼吸波表形态演化 0.70）、OSC B Color（四阶段气流色泽 0.50）、Drone Drift（LFO 1 微漂移 0.35）、Filter Resonance（LFO 2 扫频 0.25），开箱即展现呼吸与 LFO 的有机生机；
    b) **外置专用凹槽轨道**：外移调制半径至 `modRadius = size/2 - 1.5`，底层配备高反差深色槽位（`#262626`，3px）；
    c) **高通透范围环与霓虹电光动态扫频弧**：动态调制范围环采用高通透青蓝（`#0284c7`，3.5px），实时动态扫频填充弧采用高亮霓虹电光青蓝（`#00f0ff`，4px，外带强发光 `drop-shadow-[0_0_8px_rgba(0,240,255,0.95)]`）；
    d) **高对比白芯走针珠（Playhead Bead）**：采用白芯实心圆盘（`r=3.8`）加电光青蓝外框与高亮光晕（`fill-white stroke-[#00f0ff] drop-shadow-[0_0_10px_#00f0ff]`），置于 SVG 最顶层渲染；
    e) **四阶段声学平滑插值（60fps 连续平滑余弦 S 曲线插值）**：在阶段间采用 `0.5 * (1 - Math.cos(Math.PI * t))` 连续平滑余弦 S 曲线插值，彻底告别阶跃式突变与阶段内停滞。
- **四阶段呼吸声学自动化连续 MSEG 包络编辑器 (Interactive 4-Stage Continuous MSEG Envelope Editor)**：
  * **根除抽象晦涩**：解决此前“4个百分比滑块意义不明”的抽象晦涩问题，彻底重做为类似专业合成器的四阶段 MSEG 包络发生器；
  * **四阶段连续波形与发光渐变**：吸气 (Inhale)、屏息 (Hold In)、呼气 (Exhale)、静息 (Hold Out) 4 阶段分区连续波形图与半透明发光渐变填充（`#mseg-gradient`，琥珀金渐变）；
  * **曲线形态选择器（Curve Interpolation Mode）**：支持平滑自然 (Smooth S-curve)、线性直达 (Linear)、阶梯悬停 (Step) 三大数学插值形态自由切换；
  * **目标参数语义映射与阶段声学提示**：明确指示当前调制目标物理参数，实时动态计算并显示当前呼吸阶段的实时物理调制倍率（如“吸气展开 → 屏息固化 → 呼气沉降 → 静息归虚”）；
  * **实时激光走针（Laser Playhead）**：随实际声音引擎播放进度（`stageProgress`）在包络曲线上平滑巡航，音频暂停时精准静止；
  * **声疗级场景预设**：新增深吸慢呼 (Deep Swell)、清醒四方 (Box Hold)、潮汐涌现、禅定归零，并保留自然、吸气、呼气以保证测试契约完美兼容。
- **真实声音状态驱动的调制中心 (ModulationCard Real Audio State Sync)**：
  * 彻底摒弃此前无意义的无限虚假 CSS/SVG 旋转与位移循环；
  * 弹窗动态效果完全由真实声音引擎与呼吸状态驱动：当音频暂停（`isPlaying === false`）时，所有粒子、光环与走针精准冻结并标明已暂停状态；
  * 呼吸宏调制源随 `clockSnapshot.breathMacro` 真实膨胀/收缩；LFO 1 与 LFO 2 巡航粒子与波浪按真实实际 `rate` 震荡；阶段包络走针精准追踪当前呼吸阶段与进度。
- **气流噪声振荡器多噪声类型与声学增益补偿 (OSC B Multi-Noise & Makeup Gain)**：
  * 解决声音过小问题：在 `OscBChannel` 中接入 +9dB（2.8x）声学补偿增益（`makeupGain`），有效弥补带通/高通滤波器与低切滤波带来的能量衰减，彻底杜绝刺耳尖锐的同时保持温暖蓬松气流；
  * 扩充 4 大声疗级噪声源：粉红噪声（Pink Noise）、白噪声（White Noise）、布朗红噪（Brown Noise）、紫蓝高频噪声（Violet Noise），并配备 50ms 无缝循环交叉淡入淡出（Seamless Loop Crossfade）；
  * 在 `HardwareDeck` OSC B 头部添加单色极简 [粉噪, 白噪, 红噪, 紫噪] 快速切换器，保留所有无障碍标识与现有测试契约兼容。
- **Web Audio 防硬削波与砖墙硬限幅（Anti-clipping Headroom & Brickwall Safety Limiter）**：
  * 主总线在终级输出前挂接原生高精度 `DynamicsCompressorNode`（-1.5dB 阈值，3ms attack，120ms release，16:1 压缩比，6.0 knee）；
  * 前级混音总线（`preMixBus`）增益调谐为 0.75，提供稳固的物理声学动态余量（Headroom）；
  * 彻底消除复音叠加、次谐波泛音列与高 Q 滤波器快速扫频能量汇聚时的数字削波失真（Digital Hard Clipping）。
- **气流噪声（OSC B）全面强化与低频去浊**：
  * 发生器基础振幅提升至 0.28（+8dB），极大增强气道摩擦生机与存在感；
  * 新增 80Hz 级联高通滤波（HPF），彻底滤除低频浑浊次声嗡鸣（Low-end Rumble）；
  * 硬件面板扩充 Low Cut（低切滤波 20..1000Hz）与 Motion（气流微颤动效 0..1）专属控制旋钮。
- **波表振荡器（OSC A）全功能扩充**：
  * 新增 Warmth（模拟温润饱和染色 0..1）与 Spread（立体声立体失谐发散 0..1）专属旋钮；
  * 深度融合已有的 24 组声疗波表、Harmonics 谐波展宽、Morph 动态扫描、Unison 合唱差拍与 Sub 次谐波基底。
- **声疗音色预设全面降压与轻柔化（Soft De-stressed Sound Therapy）**：
  * 全面调降预设中 Sub 次谐波基底与 Drone 能量（降低 60% 以上，基底增益收敛至 0.05~0.11），根除低频轰头压迫感；
  * 下调多模谐波滤波的 Q 峰尖锐度，消除金属刺耳共振；
  * 增强高阶纯高斯空间卷积混响尾韵（decay 扩展至 5.5s~6.8s，mix 提升至 0.50~0.62），实现极致轻柔无压迫感的冥想声疗环境。
- **动态时域波表监视器（WavetableVisualizer）**：
  * 基于 64 点傅里叶时域逆合成算法（`computeWavetableTimeDomain`），在 OSC A 面板实时渲染 1px 细线工业科技美学的动态波形曲线；
  * 随切片、Harmonics 谐波、Morph 以及呼吸宏动态实时形变，实现“音画同步、所见即所听”。
- **生命节律呼吸协同旋钮动效（Knob）**：
  * 旋钮外圈增加动态调制范围光弧（Modulation Arc）与实时跳动光点；
  * 深度融合呼吸四阶段（Inhale 展开高亮、Hold In 呼吸微颤、Exhale 收缩暗化、Hold Out 静息幽光），带来鲜明的生命节律呼吸质感。
- **双 LFO 有机声学生机**：
  * **LFO 1 (Organic Pitch Drift & Vibrato)**：驱动主振荡器与 Drone 形成自然微音分（±3~10 cents）模拟真实声疗器乐颤音，彻底粉碎数码冰冷僵硬感。
  * **LFO 2 (Acoustic Filter Breathe & Binaural Pan)**：驱动 24dB 多模滤波器慢速微扫频（±100~500Hz）、双耳声像环绕微摆动（±0.15~0.4 Pan）与呼吸振幅轻颤（Tremolo），赋予声场有机生命力。
- **高阶 ADSR 音色与振幅包络发生器**：
  * 实现专用 `AdsrModule`，支持 Attack（起音瞬态）、Decay（泛音衰减）、Sustain（胸腔稳态延音）与 Release（呼气耗散释放）；
  * 四阶段生理节律自动与门控事件（Gate ON / Hold / Gate OFF / Floor）精准耦合；
  * 深度适配 0ms 即停硬切（Zero-Residue Hard Cut），在微斜坡切断时同步进行 Envelope Purge 归零与无损恢复。
- **声学纯净度保障**：全面移除多谐波非线性 WaveShaper 带来的互调失真（IMD 旁路控制），压制吸气高频毛刺蜂鸣，保留温润松弛的声疗质感。
- **工业秩序美学与界面语言一致性**：严格遵守全库 **100% 零 Emoji 铁律**，采用 Lucide 单色细线矢量图标体系，配备 1px 细线精准规整边框，深邃暗黑（`#09090b`）与暖砂明亮（`#fcfbf9`）高对比度双主题；全界面确立地道、专业、统一的工业声学中文偏好，配合精准兼容测试的双语无损分层排版。
- **全屏纯净交互**：中央画布 100% 净空，杜绝笨重播放圆盘，全屏轻触即时启停（0ms 瞬时余弦微斜坡硬切抗爆音），底部微型胶囊指示状态。

---

## 2. 系统架构与模块划分

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    src/App.tsx                         │
                               │  - Central Geometry Tap (isWithinGeometry Hit Test)   │
                               │  - Streamlined Header: Brand, 432Hz, Presets, Deck     │
                               │  - Bottom Controls: Visual Style Toolbar + Capsule     │
                               │  - Controlled Modulation Routes & onRoutesChange Sync  │
                               │  - HardwareDeck: Slide-up console for rack & FX        │
                               │  - BottomSheetDrawer: Breath rhythm preset picker      │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             src/breath/ - Breath Engine Core                                           │
│  - 4-Stage State Machine: Inhale -> Hold In -> Exhale -> Hold Out (0-duration Passthrough, Microsecond Anchor)        │
│  - Breath Macro M ∈ [0, 1] + Local Phase φ ∈ [0, 1]                                                                    │
│  - Stage Automation Timeline (Symmetric Tension Exponential Interpolation, 15ms De-zippering Scheduling)               │
│  - Storage & Factory Presets (Box 4-4-4-4, Relax 4-7-8, Coherent 5.5s, Prana Energize, Deep Calm)                     │
└──────────────────────────┬──────────────────────────────────────────────────────────────┬──────────────────────────────┘
                           │                                                              │
                           ▼                                                              ▼
┌──────────────────────────────────────────────────────┐      ┌──────────────────────────────────────────────────────────┐
│          src/audio/ - Core Audio Engine              │      │          src/visuals/ - Sacred Geometry Canvas           │
│  - 3-Track Channel Strip:                            │      │  - Canvas 2D Engine with Auto DPR & Zero GC Batching     │
│    * OSC A: Wavetable-driven Granular Synthesis      │      │  - 4 Modes: Minimal Ring, Sacred Geometry, Zen Waves,    │
│      - Row 1 Core: 4 Rotary Knobs + 115px Level Bay  │      │             Calm Focus (Moved to Bottom Capsule Toolbar) │
│      - Row 2 Texture: Detune, Unison, Sub, Warmth,   │      │  - Dynamic Non-linear Breath Scaling (1.0x to 1.4x)      │
│        Spread (5-Col Equal Width Grid, Drone Only)   │      │  - Stage-Responsive Sacred Geometry Dynamics (Tesseract  │
│      - Generative Particle Engine:                   │      │    Hypercube & Inhale/Hold/Exhale/HoldOut Speed Warping) │
│        * 32-Voice High Capacity (1..32 V)            │      │  - Max Expansion Guide Horizon (0.40 * minDim Fixed)     │
│        * Rate: 0.1..50.0 Hz Clock Freq (No jump)     │      │  - Geometry Hit Test Handler (isWithinGeometry - M24):   │
│        * Micro Grain Window (0.05..4.0s)             │      │    * Math.hypot(x-cx, y-cy) <= 0.44 * min(W, H)          │
│        * Voice Stealing (8ms Exp Fadeout)            │      │    * Outer Area Tap-Rejected for Future Gestures         │
│        * 1/√maxDensity Dynamic Power Balance         │      └──────────────────────────────────────────────────────────┘
│        * Granular: Spray, Jitter, WT Wander, Chance  │      ┌──────────────────────────────────────────────────────────┐
│        * Per-Note Real Web Audio ADSR + Stereo Pan   │      │          src/ui/ - Industrial Hardware Deck              │
│    * ScaleQuantizer (5 Healing Scales)               │      │  - Preset & Curve Stale State Elimination (M28):         │
│    * OSC B: 4 Therapeutic Noises + Makeup Gain +     │      │    * ModulationCard: useEffect [route,target,isOpen] sync│
│             80Hz HPF + 115px Independent Level Bay   │      │    * Sliders & Quick Presets: multipliers+curveData sync │
│    * Sub/Drone: 432Hz Tuning + 115px Level Bay Strip │      │    * Controlled HardwareDeck: modulationRoutes from App   │
│  - Preset & Route Clean Reset (M28):                 │      │  - Symmetrical Twin LFO Architecture (M27):              │
│    * loadSoundPreset: cleans dirty curves, restores  │      │    * LFO 1 & LFO 2 100% Symmetric Twin Standard Bay      │
│      DEFAULT_MODULATION_ROUTES when routes undefined │      │    * 75px SerumLfoScope + 5 Classic Shapes Toolbar       │
│    * AudioEngine: duplicate getModulationRoutes cut  │      │    * Twin Knobs: Rate (0.01..30/20Hz) & Depth (0..100%)  │
│  - Bidirectional Curve Math (curveMath.ts - M28):    │      │    * Hardware Bypass Power Toggle Switch                 │
│    * createCurveDataFromMultipliers (M -> Spline)    │      │  - Adaptive Channel Strip Bay Architecture (M25):        │
│    * extractStageMultipliersFromCurve (Spline -> M)  │      │    * Master Output Bay: Master Fader (115px) + Master Pan│
│    * extract(create(M)) ≡ M Bidirectional Symmetrical│      │    * OSC A: 4 Rotary Knobs + 115px Level Bay Strip       │
│  - 100% Knob-Truth Principle & LFO Severing (M27):   │      │    * OSC B & Drone: Independent 115px Fader Bays         │
│    * 5 Rogue Hardwired Links Cut -> Zero background  │      │  - Decoupled Stage Studio Target Routing (M25):          │
│  - Pure LFO DSP Math Module (lfoMath.ts - M27):      │      │    * Independent studioTarget state & handleStudioSave   │
│    * evaluateLfoWaveform (5 shapes [-1..+1])         │      │  - AdsrEnvelopeVisualizer Vertical Depth (M25):          │
│    * computeLfoLiveValue (depth scaled, bypass=0.0)  │      │    * 110px height, hRange 82px, -3dB Grid, h-[110px]     │
│  - Comprehensive Modulation Dispatch (M27):          │      │  - StageEnvelopeStudio Streamlined Focus (M25):          │
│    * master-pan, osca-detune, drone-drift, reverb-mix│      │    * Panorama/Focused smooth scroll anchors + targetLabel│
│      delay-mix, drive-amount live dispatch & fallback│      │  - Stereo Panning System & LFO 2 Clarification (M24):    │
│  - Monophonic Breath Gate Note Triggering (M22):     │      │    * Master Pan (-1.0..+1.0) Knob in Master Section      │
│    * Inhale: Note On / Exhale: Sust / Hold Out: Rel  │      │  - Knob-Truth Principle: Unmodulated params lock strictly│
│  - Stereo Panning Pipeline (StereoPannerNode):       │      │  - Physical Rack Flow: Drive -> Filter -> ADSR -> Dual   │
│    * Reverb -> StereoPannerNode -> MasterCutGain     │      │    LFO -> Ping-Pong Delay -> Gaussian Reverb             │
│  - Acoustic ADSR Decoupling (AdsrModule):            │      │  - ModulationCard: Two-Branch + AC Symmetric LFO Guard   │
│    * Sustain level adapted only in hold stage        │      │  - BipolarFader: VCA Multiplicative 0..100% Range Bar    │
│  - 8 Factory Curve Presets & Storage CRUD (M31):     │      │  - StageEnvelopeStudio De-dup & Full CRUD (M31):         │
│    * 8 Presets: Gentle Breeze, Steps, Rev Swell      │      │    * Toolbar 4-stage tabs cut; Panorama as stage tab     │
│    * updateUserCurvePreset & renameUserCurvePreset   │      │    * Header: 4-STAGE MSEG & targetLabel; status bar hint │
│  - Storage & Presets (5 Curated Non-Harsh Presets)   │      │    * Preset dual-grouping, Overwrite, Rename, Delete      │
│  - Wavetable Basic First & Preview Audition (M32)    │      │  - User Presets: Full CRUD (Rename, Del Confirm, M32) │
│  - 0ms Zero-Residue Hard Cut (Micro-ramp + Purge)    │      │  - ModulationCard: 105px Stage Viewport (M30)            │
│  - preMixBus Headroom (0.75 Gain) -> masterLimiter   │      │  - Sound & Breath Preset Drawers (User + Factory)        │
└──────────────────────────────────────────────────────┘      └──────────────────────────────────────────────────────────┘
```

---

## 3. 跨层类型契约 (`src/types/`)

- `src/types/audio.ts`: 
  * 定义了 `FilterType`, `BreathStage`, `NoiseType` (`'pink' | 'white' | 'brown' | 'violet'`) 以及 `VoiceMode` (`'drone' | 'particles' | 'arp'`)。
  * 定义了 `ParticleParams`：`rate` (0.1..50.0 Hz 宽域粒子触发频率), `density` (1..32 最大复音并发数), `octaveRange` (1..4 八度音高跨度), `scale` (`'pentatonic' | 'dorian' | 'lydian' | 'solfeggio' | 'minor'`), `randomPan` (0..1 立体声漫游宽度), `duration` (0.05..4.0 s 标称发声时值), `probability` (0.1..1.0 单次触发概率), `spray` (1..4 粒子瞬时丛发与 0~15ms 抖动), `pitchJitter` (0..50 cents 微分音游移模拟失谐), `wavetableJitter` (0..8 slices 波表切片漫游散布), `grainShape` (`'gaussian' | 'percussive' | 'smooth'` 微观粒径窗形态)。
  * 定义了 `DEFAULT_PARTICLE_PARAMS` 开箱即用安全默认参数配置（默认包含 `spray: 1`, `pitchJitter: 12`, `wavetableJitter: 2`, `grainShape: 'smooth'`）。
  * 定义了 `ChannelStripParams`：
    - `oscA`: `wavetableIndex` (0..23), `detune` (-100..+100 cents 宽域失谐), `harmonics` (0..1), `gain` (0..1), `bypass`, `baseFreq` (20..1760Hz 宽域基频), `morphDepth` (0..1), `unison` (0..1), `subGain` (0..1), `warmth` (0..1), `spread` (0..1), `voiceMode?: VoiceMode`, `particles?: ParticleParams`；
    - `oscB`: `color` (0..1), `friction` (0..1), `gain` (0..1), `bypass`, `noiseType` (`'pink' | 'white' | 'brown' | 'violet'`), `lowCut` (20..3000Hz 扩展低切去浊), `motion` (0..1), `stereoWidth` (0..1)；
    - `drone`: `baseFreq` (20..440Hz), `pitchDrift` (0..1), `gain` (0..1), `bypass`。
  * 定义了 `LfoShape`：`'sine' | 'triangle' | 'sawtooth' | 'square' | 'random'`，规范双 LFO 经典波形形态。
  * 定义了 `Lfo1Params` 与 `Lfo2Params`：规范双 LFO 宽域调制频率（`lfo1.rate`: 0.01..30.0 Hz, `lfo2.rate`: 0.01..20.0 Hz）、调制深度（`depth`: 0..1）与波形形态（`shape?: LfoShape`）；`Lfo2Params` 规范化为与 `Lfo1Params` 孪生对称结构，并将 legacy 字段（`filterMod`, `panMod`, `tremoloMod`）设为可选，彻底消除结构不对称与认知混乱。
  * 定义了 `AdsrParams` 与 `AdsrModule`：规范起音、衰减、延音与释放包络时间常数（`attack`: 0.005..15.0s, `decay`: 0.005..15.0s, `sustain`: 0..1, `release`: 0.005..15.0s），解耦 Sustain 调节与起振/衰减过程，彻底切除对 `sustain === 0` 的暴力抹平，仅在 `lastStage === 'hold'`（维持态）阶段平滑调整维持电平，确保 Pluck/Bell 等音色在 Attack/Decay 阶段均能完整释放。
  * 定义了 `EffectsChainParams`：涵盖 `filter`, `drive`, `delay` (`time`: 0.01..3.0s, `feedback`: 0..0.95), `reverb` (`decayTime`: 0.2..20.0s), `masterGain` (0..1), `masterPan?: number` (-1.0..+1.0 立体声主声相总控，默认为 0.0 中置), `lfo1`, `lfo2`, `adsr`。
  * 定义了 `AudioEngineApi`：规范生命周期控制、单音模式呼吸 Gate 驱动机制（吸气 onset 触发 `triggerAttack(1.0)`、呼气 onset 触发 `triggerRelease()`）、实时呼吸调制、通道/效果参数响应、以及调制矩阵路由状态管理（`setModulationRoutes`, `setModulationRoute`, `getModulationRoutes`，彻底剔除底部冗余声明覆盖 bug）；`loadSoundPreset` 在目标预设未定义调制路由时，干净恢复出厂默认 `DEFAULT_MODULATION_ROUTES`，切断脏曲线残留（M28）；`src/audio/engine.ts` 接入 Web Audio 原生 `StereoPannerNode`，挂接于 Reverb 与 MasterCut 之间，在 `updateEffects` 中响应 `masterPan` 调度；并在 `applyLiveModulationRoutes` 中全面闭环调度 `master-pan`, `osca-detune`, `drone-drift`, `reverb-mix`, `delay-mix`, `drive-amount` 以及波表 `osca-morph`, `osca-harmonics`, `osca-gain` 真实声学动态解算与下发；未分配路由时严格回落锁定用户面板旋钮设定值（100% Knob-Truth Principle），彻底切除 LFO 5 处流氓硬编码直连连线。
  * 定义了强鲁棒性的递归深度部分类型 `DeepPartial<T>`。
- `src/audio/dsp/scaleQuantizer.ts`:
  * 定义了 `ScaleType`: `'pentatonic' | 'dorian' | 'lydian' | 'solfeggio' | 'minor'`。
  * 定义了 `ScaleDefinition`: `id`, `name`, `enName`, `intervals: number[]`, `description`。
  * 导出了 `SCALES` 常量映射表与 `SCALE_LIST`。
  * 导出了纯数学量化与采样函数：`quantizeToScale()`, `getScaleFrequency()`, `getRandomScaleNote()`。
- `src/audio/dsp/lfoMath.ts`:
  * 导出了 `evaluateLfoWaveform(shape, phase): number`：在归一化相位 $p \in [0, 1)$ 下精确解算 5 种经典波形（Triangle, Sawtooth, Square, Random, Sine）的双极性输出 $[-1.0, +1.0]$；
  * 导出了 `computeLfoLiveValue(rate, depth, shape, bypass, timeSec): number`：计算经过 `effectiveDepth` 乘法缩放后的实时 LFO 调制输出，并严格响应 `bypass`（`bypass = true` 精确返回 `0.0`），为声学引擎与前端波形示波器提供统一的数学计算基准（Single Source of Truth）。
- `src/audio/presets/soundPresets.ts`:
  * 定义了 `SoundPreset`: `id`, `name`, `nameEn`, `category` (`'Tibetan' | 'Nature' | 'Celestial' | 'Theta' | 'Zen' | 'Futuristic' | 'Organic' | 'Cosmic' | 'Crystal' | 'User'`), `description`, `badge`, `channelStrip`, `effects`, `modulationRoutes?: Record<string, ModulationRoute>`（支持音色预设携带专属调制路由与自动化曲线 - M28）。
  * **出厂预设收敛为 5 款极简非刺耳声学体系 (5 Curated Non-Harsh Presets - M32)**：
    1. `tibetanBowl`（神圣钟磬 · Sacred Bell Resonance）：432Hz 铜磬共鸣、长衰减混响、Filter Cutoff 1600Hz；
    2. `oceanicDrift`（深沉治愈柔垫 · Deep Healing Pad）：温润水下 Ambient、慢起伏呼吸慢铺底、Filter Cutoff 850Hz；
    3. `ambientShimmer`（空灵微光长鸣 · Ethereal Shimmer Drone）：柔和微光空间漫游、Cutoff 1850Hz 严格受限无刺耳自激；
    4. `deepTheta`（丝绒次低音 · Velvet Sub Bass）：54Hz 纯净次八度包裹感、420Hz 低通暖滤波；
    5. `zenTemple`（温暖模拟弹拨 · Warm Analog Pluck）：木质有机瞬态衰减、1200Hz 适度截止与磁带温暖度；
  * 导出 `getAllFactoryPresets()` 和 `getSoundPresetList()`，严格仅返回这 5 款出厂音色；导出 `DEFAULT_SOUND_PRESET_ID = 'tibetanBowl'`。
- `src/audio/dsp/wavetableData.ts`:
  * 定义了 `WavetableSliceData`: `id`, `name`, `category` (`'Pure Roots' | 'Singing Bowls' | 'Vocal Formants' | 'Spectral Expansion'`), `real: Float32Array`, `imag: Float32Array`。
  * **基础波形排在前面 (Basic Forms First - M32)**：Category I 'Pure Roots'（切片 0..3）重塑为经典基础波形：0: Pure Sinusoid（正弦波）、1: Pure Triangle（三角波）、2: Pure Square（方波）、3: Pure Sawtooth（锯齿波）；后面（4..23）为声疗扩展波形。
  * 导出纯数学时域重建与预览路径生成函数：`computeWavetableTimeDomain(sliceIndex, morph, harmonics, numPoints)` 与 `generateWavetablePreviewSvgPath(sliceIndex, width = 64, height = 28, padding = 2)`，为抽屉与面板生成高清紧凑的 SVG 时域波形微缩图。
- `src/audio/storage/userPresets.ts`:
  * 提供了完整用户自定义声音预设 CRUD 生命周期 API：`getUserPresets()`, `saveUserPreset(preset)`, `updateUserPreset(id, partial)`（覆盖更新参数并保持不可变 ID）, `renameUserPreset(id, newName)`（行内安全重命名）, `deleteUserPreset(id)`（根据 ID 安全移除）；
  * `sanitizePreset()` 运行时边界防御清洗与 LocalStorage 容错处理。
- `src/ui/components/drawer/BottomSheetDrawer.tsx` & `src/App.tsx`:
  * 波表抽屉（`type === 'wavetable'`）集成 64×28 高清时域 SVG 预览波形图与交互式试听按钮（`onPreviewAudio -> playWavetableAudioPreview`，320Hz 柔和正弦包络即时试听）；
  * 声音预设抽屉（`type === 'sound'`）用户预设项挂载编辑（`onEdit`）与安全删除（`onDelete`）图标按钮；
  * App 端构建用户预设重命名微模态与防误删二次确认微模态；若删除当前正在发声的激活预设，平滑无缝回退至默认预设 `tibetanBowl`；
  * Header「保存预设」模态弹窗具备智能感知能力：当前为用户预设时提供「覆盖当前预设」与「存为新预设」双模式切换，一键覆盖更新当前声学参数。
- `src/types/breath.ts`: 定义了 `BreathRhythmConfig`, `ParameterAutomationConfig`, `BreathClockSnapshot`, `BreathEngineApi`。
- `src/types/visuals.ts`: 定义了 `VisualPresetId`, `VisualRenderParams`, `VisualRenderer`。
- `src/visuals/gestureHandler.ts`:
  * 导出了 `isWithinGeometry(clientX, clientY, canvasRect, ratio = 0.44): boolean` 几何欧氏距离判定算法，判断触控/鼠标是否位于中心呼吸几何图形范围（$\text{dist} \le 0.44 \times \min(W, H)$）；
  * 导出了 `createCanvasPointerHandlers(onTap, onFirstAudioUnlock, filter)`，支持手势拦截过滤器，隔离外围空白区域点击。
- `src/ui/components/lfo/SerumLfoScope.tsx`:
  * 定义了 `SerumLfoScopeProps`: `id: string`, `shape?: LfoShape`, `rate: number`, `depth: number`, `isPlaying?: boolean`, `width?: number`, `height?: number`, `onShapeChange?: (shape: LfoShape) => void`, `className?: string`；
  * 实现 Serum 标志性暗黑网格视窗（`#07090e` 背景、中心零轴点划线、四分格时间辅助线、右上角微观 Rate 频率 HUD）；
  * 提供 5 种经典波形即时切换（Sine, Triangle, Sawtooth, Square, Random）与高精度白炽激光相位走针（Laser Playhead & Glow Dot）。
- `src/types/ui.ts`: 
  * 定义了 `ModulationSource`: `'breathMacro' | 'lfo1' | 'lfo2' | 'adsr' | 'stageProgress' | 'manual'`。
  * 定义了 `CurveInterpolation`: `'smooth' | 'linear' | 'step'`，规范 MSEG 包络过渡曲线形态。
  * 定义了 `CurveControlPoint`: `id`, `time` (0..1 阶段内归一化时间), `value` (0..1 归一化输出值), `tension` (-1..+1 曲线曲率张力，0 为线性，>0 为凹陷指数曲线，<0 为凸起对数快速攀升)。
  * 定义了 `SingleStageCurve`: `stage` (`'inhale' | 'holdIn' | 'exhale' | 'holdOut'`), `points: CurveControlPoint[]`（支持动态增删中介控制节点，保证起点 time:0 与终点 time:1）。
  * 定义了 `FullBreathCurveData`: `inhale`, `holdIn`, `exhale`, `holdOut` 四阶段连续完整呼吸曲线数据结构。
  * 定义了 `CurvePreset`: `id`, `name`, `category` (`'factory' | 'user'`), `curveData: FullBreathCurveData`。
  * 定义了 `StageMultipliers`: 规范吸气 `inhale`、屏息 `holdIn`、呼气 `exhale`、静息 `holdOut` 四阶段独立自动化倍率（0..1）与 `curve?: CurveInterpolation`。
  * 定义了 `ModulationRoute`: `source`, `target`, `depth` (-1.0..+1.0), `bipolar`, `stageMultipliers?: StageMultipliers`, `curveData?: FullBreathCurveData`（全面支持高阶 MSEG 曲线驱动）。
  * 定义了 `KnobDescriptor`: 规范旋钮物理属性及绑定的调制路由。
  * 定义了 `KnobProps`（位于 `src/ui/components/knob/Knob.tsx`）：外置专用调制轨道（`modRadius = size/2 - 1.5`）、`assignedModulation?: ModulationRoute`, `liveModOffset?: number`, `breathStage?: BreathStage`, `bipolar?: boolean`, `onLongPress?: () => void`。遵循 Knob-Truth 原则，未分配调制路由时旋钮参数严格锁定，不受呼吸阶段变迁干扰。
  * 定义了 `BipolarFaderProps`（位于 `src/ui/components/fader/BipolarFader.tsx`）：支持 `assignedModulation?: ModulationRoute`, `liveModOffset?: number`, `height?: number`（全面支持 115px 专业行程扩展）, `onLongPress?: () => void`。重构单极性 VCA 乘法包络计算（$\text{actualGain} = \text{effectiveValue} \times ((1 - \text{depth}) + \text{depth} \times \text{liveModOffset})$，推到 100% 且 depth 为 100% 时呈现 0%~100% 全幅能量柱，静息 `liveModOffset=0` 时跳针稳定锚定在 0% 彻底消除顶部死锁遮挡与假死隐藏）与双极性加法振荡，live tick 发光电光滑块提升至 `z-10`（14px x 2.5px）。
  * 定义了 `ModulationCardProps`（位于 `src/ui/components/knob/ModulationCard.tsx`）：`target`, `targetLabel`, `route`, `isOpen`, `onAssign`, `onUnassign`, `onClose`, `onOpenStudio?: () => void`（直达包络演播室工作台）, `breathMacro`, `isPlaying`, `clockSnapshot`, `lfo1Rate`, `lfo2Rate`。支持 React Portal 顶层挂载与滚动锁定；重构为两级分支架构（呼吸动态组 Breath Dynamic Group: Breath Macro / Stage Env 与 合成器内部 LFO 组 Internal Synth LFO: LFO 1 / LFO 2）；建立 `supportsPolarity` 交流对称声学守卫（LFO 模式隐藏虚假极性开关，展示工业级「双极性交流对称振荡 [-1.0, +1.0]」指示器并强制 `bipolar=true`，仅原生单极性源保留极性切换）；目标控制旋钮大样（Knob Hero Preview，72px/96px）与垂直双极性推子（Vertical Bipolar Fader，高度 140px，居中 0% 水平中线，双击/中点磁吸归零，+100%、+50%、0%、-50%、-100% 刻度标尺，内置 sr-only input range 兼顾 100% 无障碍与测试契约）；**冗余 4 阶段倍率滑块切除与 105px 中型微操视窗升级 (M30)**：彻底切除下方 4 个离散滑块、3 种曲线模式切换按钮、5 组过时倍率预设按钮以及“四阶段声学自动化倍率”文字标题，清理 140px 纵向臃肿堆叠；缩略波形扩容为 105px 中型微操视窗（`totalH = 105, totalW = 380, stageW = 95`），配备 4 呼吸阶段环境光晕列（吸气天蓝/屏息琥珀/呼气紫罗兰/静息青绿）与实时特征电平动态百分比 HUD（0%~100%）、暗黑示波器网格、发光多阶段曲线描边、半透明渐变填充与实时激光走针巡航；支持点击中型微操视窗或底部全宽按钮双通道平滑直达独立工作台 `StageEnvelopeStudio`；`handleApply` 中调用 `extractStageMultipliersFromCurve(curveData)` 自动提取并注入 `stageMultipliers`，确保声学引擎与预设体系数据强一致闭环；严格监听 `[route, target, isOpen]` 实时同步最新状态杜绝 Stale State。
  * 定义了 `StageEnvelopeStudioProps`（位于 `src/ui/components/mseg/StageEnvelopeStudio.tsx`）：`isOpen: boolean`, `onClose: () => void`, `curveData?: FullBreathCurveData`, `initialCurveData?: FullBreathCurveData`, `currentStage?: BreathStage`, `stageProgress?: number`, `targetLabel?: string`, `isPlaying?: boolean`, `onChange?: (newCurveData: FullBreathCurveData) => void`, `onSave?: (newCurveData: FullBreathCurveData) => void`。全宽独立专业演播室工作台（760px~960px 视窗，PLOT 区域 688x192）；**界面重构去重、文案瘦身与完整预设 CRUD 闭环 (M31)**：彻底切除 Toolbar 顶栏冗余的 4-Stage 纯文本 Tab 导航栏释放横向空间，将下方「全周期 4 阶段全景视窗 (4-Stage Panorama)」卡片升级为唯一的交互式阶段选择器（`role="tablist"` / `role="tab"`，配备微光边框、RUNNING 实时呼吸脉冲与阶段缩略波形）；**阶段卡片 0 像素抖动彻底固定 (Zero-Displacement Stage Cards - M36)**：彻底切除动态插入破坏行高基线的“编辑中”标签，仅以高质感外边框加亮与柔和环形阴影（`border-sky-500 ring-1 ring-sky-500/50 / ring-sky-400`）标定激活态；标题栏统一锁定固定高度 `h-5`，按键动画统一为 `transition-colors duration-150`，达成绝对 0 像素位移、0 抖动；Header 彻底移除废弃的“全景视窗 / 微操放大”跳转按钮，徽章精简为专业短促的「4-STAGE MSEG」，副标收敛为「目标联动: {targetLabel}」；画布右上角快捷键浮层下移整合至底部状态栏（「双击新增节点 · 垂直拖动手柄调节曲率 · Delete键删除节点」）；预设下拉菜单采用出厂与用户双分组展示（`<optgroup>`），为用户预设配备【覆盖保存】（Save/Overwrite）、【重命名】（Rename，带行内输入与 Enter 回车确认）、【删除】（Delete，带“确认删除?”二次确认微模态），支持【存为新预设】并配备 2.5s 优雅淡出的 Action Notice 微拟物状态通知条；14px/16px 加大点击靶心、移除 0.05..0.95 死区限制支持任意位置自由增删与拖拽；实时浮动坐标 HUD（精确显示当前节点/手柄的时间与电平百分比数值）；垂直张力手柄引导虚线与双击瞬间归零；内置 8 大出厂经典预设与用户预设管理；「重置本阶段」一键恢复基线折线；「保存并生效 · Save & Apply」即时反馈与双向音频参数广播；单向初始化门禁与拖拽防打断锁定；`PAD_Y = 24` 边距补偿像素级对齐；严格坚守 100% 零 Emoji 工业科技美学规范。
  * 定义了 `BreathCurveEditorProps`（位于 `src/ui/components/mseg/BreathCurveEditor.tsx`）：`curveData?: FullBreathCurveData`, `currentStage?: BreathStage`, `stageProgress?: number`, `onChange: (newCurveData: FullBreathCurveData) => void`。多阶段交互式包络发生器（MSEG），画布双击自由增删控制节点、手柄垂直拖拽无级调节张力曲率、三次弯曲真实轨迹高精度激光巡航走针、5 大出厂预设切换与 LocalStorage 用户自定义预设持久化管理。
  * 定义了 `BreathMacroTimelineScopeProps`（位于 `src/ui/components/vu/BreathMacroTimelineScope.tsx`）：`value: number`, `breathStage?: BreathStage`, `stageProgress?: number`, `isPlaying?: boolean`, `stageMultipliers?: { inhale: number; holdIn: number; exhale: number; holdOut: number; curve?: 'smooth' | 'linear' | 'step'; }`, `className?: string`, `onClick?: () => void`，真实呈现 Stage Env 多模态包络线，激光走针高保真数学轨迹巡航，严格保留 `role="meter"` 与 `aria-label="Breath Macro VU"`，点击直达呼出 `StageEnvelopeStudio`（独立全宽包络演播室工作台）。
  * 定义了 `ParticleStreamScopeProps`（位于 `src/ui/components/deck/ParticleStreamScope.tsx`）：`rate` (0.1..50.0 Hz), `density` (1..32 V), `scale?: string`, `octaves?: number`, `duration?: number` (0.05..4.0 s), `isPlaying?: boolean`, `breathStage?: BreathStage`, `breathMacro?: number`, `width?: number`, `height?: number`, `className?: string`。全息投影 Phase Plant 风格粒子流场，X 轴全景立体声像（L <-> R），Y 轴八度对数音高（55Hz - 3520Hz），白炽冲击波光环（Flash Shockwave）、瞬态脉冲与荧光星轨余晖，多音模式下自适应替代波表监视器。
  * 定义了 `AdsrEnvelopeVisualizerProps`（位于 `src/ui/components/adsr/AdsrEnvelopeVisualizer.tsx`）：`attack` (0.005..15.0s), `decay` (0.005..15.0s), `sustain` (0.0..1.0), `release` (0.005..15.0s), `isPlaying?: boolean`, `voiceMode?: 'drone' | 'particles' | 'arp'`, `isDark?: boolean`, `className?: string`。垂直纵深重塑：SVG 视窗高度扩充至 110px（280x110），纵向绘图有效跨度（`hRange`）翻倍扩展至 82px（`topY=14, botY=96`），新增 -3dB 参考虚线，外层容器升级为 `h-[110px]`；零锚点对数瞬态几何重塑（normLog 对数映射），Attack 0.01s 位移严格控制在 1.5px~2.0px（$\le 3\text{px}$）呈现真实 90 度垂直拔起瞬态冲击；**明亮主题深度适配 (Light Theme Polish - M36)**：全面响应 `isDark`，浅色模式下呈现温润白底视窗（`border-neutral-200 bg-white shadow-inner`）、浅灰坐标标线（`#e2e8f0`）、高对比度天蓝曲线光晕与白底黑字指标卡；阶段文本采用响应式自适应缩写（ATTACK/A, DECAY/D, RELEASE/R）杜绝重叠。
  * 定义了 `DEFAULT_MODULATION_ROUTES` 与硬件面板规范（位于 `src/ui/components/deck/HardwareDeck.tsx`）：
    - 开箱即用 6 大核心参数预设调制路由（Filter Cutoff 0.60、OSC A Morph 0.70、OSC B Color 0.50、Drone Drift LFO 1 0.35、Filter Resonance LFO 2 0.25、以及 master-fader 默认绑定 stageProgress 1.0 深度平滑包络在静息绝对静音）；
    - **受控调制路由闭环 (Controlled Routing Lifecycle - M28)**：受控接收 `modulationRoutes` 与 `onModulationRoutesChange` 回调，由 `App.tsx` 统一完成属性透传并在切换音色预设时干净重置与载入；
    - **Stage Env 独立编辑器闭环解耦与智能初值回退 (Decoupled Stage Studio Target Routing & Fallback - M25/M29)**：独立维护 `studioTarget` 状态，无论从示波器还是任意旋钮卡片打开 Studio，锁定真实目标；呼出 Studio 时若目标路由缺少 `curveData` 但具备 `stageMultipliers`，智能调用 `createCurveDataFromMultipliers` 进行平滑无缝初始化；提取 `handleStudioSave` 绕过弹窗生命周期守卫，精准回写 `modulationRoutes[studioTarget.id]` 并广播触发底层 `AudioEngine` 真实生效；
    - **全通道推子 115px 独立通道条自适应重构 (Adaptive Channel Strip Bay Architecture - M25)**：
      * Master Output Bay：独立的通道条卡片，Master Fader 垂直行程拉长至 115px，与 Master Pan 旋钮并列封装；
      * OSC A 核心发声区：将 Level 推子从旋钮网格剥离，形成“左侧 4 旋钮矩阵 + 右侧独立 Channel Level Bay（`height=115`，`min-w-[76px]`）”专业结构；
      * OSC B 与 Drone 同步配备拉长至 115px 的独立通道推子仓，无论在窄屏还是宽屏下均自适应舒展，彻底消除排版挤压截断；
    - Master 控制区集成双极性 Master Pan 旋钮（`masterPan`，$-1.0..+1.0$，支持 L100~C~R100 刻度指示与调制挂载）；
    - Dual LFO 区域实现 100% 孪生对称重构（Symmetrical Twin LFO Architecture - M27）：移除 LFO 2 孤立奇怪的 Filter 与 Pan Mod 旋钮，LFO 1 与 LFO 2 统一标准化为：顶部 75px Serum 风格暗黑/浅色网格波形示波器（`SerumLfoScope`，全面响应 `isDark`，浅色模式呈现 `bg-slate-50/90`、浅灰网格与白底按键槽）、5 种经典波形快速切换微工具条（SIN, TRI, SAW, SQR, RND）、Rate（0.01..30.0 / 20.0 Hz）与 Depth（0..100%）孪生双旋钮组、以及右上角硬件 Bypass 电源开关；
    - **OSC A Voice Mode 发声模式条浅色适配 (M36)**：浅色模式下呈现柔和浅灰底（`border-neutral-200 bg-slate-50/90 shadow-2xs`），按键槽为 `bg-neutral-200/60 border-neutral-200`，单音/粒子/琶音高清晰选中高光。
  * 定义了 `WavetableVisualizerProps`（位于 `src/ui/components/deck/WavetableVisualizer.tsx`）：`sliceIndex`, `morph`, `harmonics`, `breathMacro`, `width`, `height`。
  * 规范了主界面 `src/App.tsx`：顶部 Header 精简（专注 432Hz Core、预设抽屉、机架与主题；**Deck 控制台按钮开启态浅色模式高质感浅蓝背景适配 `border-sky-400 bg-sky-50 text-sky-600 font-semibold shadow-xs` - M36**）、底部并列集成 Visual Geometry Presets 极简微拟物药丸切换栏（`role="toolbar"` `aria-label="Visual Geometry Presets"`）、以及画布手势接入 `isWithinGeometry` 限定中央呼吸图形触碰范围（空闲提示「轻触中心图形开始呼吸 · Tap Central Geometry to Breathe」）；负责全局预设切换与调制路由干净重置的分发下发。
- `src/audio/cue/breathCueConfig.ts` 与 `src/audio/cue/breathCuePlayer.ts`:
  * 导出了 `BreathTransitionNode`: 规范呼气至吸气（`exhale_to_inhale`）、吸气至屏息（`inhale_to_holdIn`）、屏息至呼气（`holdIn_to_exhale`）、呼气至静息（`exhale_to_holdOut`）4 阶段转换节点。
  * 导出了 `BreathCuePresetId` 与 5 款高保真自然声学实录采样预置元数据（`CUE_PRESETS`）：颂钵微鸣 `singingBowl`（西藏颂钵自然实录 432Hz）、清泉微澜 `zenWaterDrop`（天然山涧微澜采样 2.2s，柔润平和）、温润暖木 `woodenTemple`（禅刹温润暖木实录 1.8s 264Hz 暖低通）、柔光晶体 `crystalHarmonics`（风铃高阶微光泛音）、暖腹低鸣 `deepSubPing`（108Hz 浑厚深钵次低音）。
  * 导出了 `playCueSound(preset, volume, ctx)`: 内存 `sampleBufferCache` 缓存池与双层合成回退机制；设定 `MAX_CUE_DURATION = 4.0s` 严格物理延音上限与 0.5s 平滑释放淡出（`linearRampToValueAtTime(0.0001, now + playDur)`），磁盘所有物理采样规范在 $\le 3.8\text{s}$，彻底杜绝长音叠音过载；导出了 `preloadAllCueSounds(ctx)` 静默预热。
- `src/audio/dsp/curveMath.ts`:
  * 导出了核心 DSP 张力插值数学函数：`evaluateSegment(p1, p2, t)`（根据张力计算连续平滑幂律曲线）、`evaluateSingleStageCurve(stageCurve, stageProgress)`、`evaluateFullBreathCurve(fullCurve, stage, stageProgress)`、`generateStageSvgPath(stageCurve, width, height, padX = 0, tensionSegments = 24, offsetY = 0)`（扩展 `offsetY` 垂直边距补偿参数，实现 SVG 曲线轨迹与控制节点、曲率手柄绝对像素级贴合对齐）、`createDefaultBreathCurveData()`。
  * **导出了纯数学双向对称转换函数（Bidirectional Curve-Multiplier Math Consistency - M28）**：
    - `createCurveDataFromMultipliers(mults)`：将 4 阶段离散倍率精确映射为连续三次样条曲线控制节点，保持各阶段平滑衔接；
    - `extractStageMultipliersFromCurve(curveData)`：建立 `getStageTarget` 阶段目标终端值提取算法，实现 $\text{extract}(\text{create}(M)) \equiv M$ 的双向数学对称闭环。
- `src/audio/engine.ts`:
  * 实现了 `applyLiveModulationRoutes` 实时调度，在保持 `setTargetAtTime` 指数平滑调度防爆音的同时，同步将解算后的有效增益值赋予 `gain.value`，严格满足绝对静音契约与状态查询。
- `src/audio/storage/curvePresets.ts`:
  * 导出了 `FACTORY_CURVE_PRESETS`: 8 款出厂高品质音乐性预设（自然潮汐 Natural Breath、爆发跃升 Heroic Apex、方波脉冲 Square Pulse、禅定微澜 Zen Stillness、弹拨包络 Pluck Strike、慢速微风 Gentle Breeze、阶梯跳跃 Rhythmic Steps、反向膨胀 Reverse Swell）。
  * 导出了持久化管理函数：`getAllCurvePresets()`, `getUserCurvePresets()`, `saveUserCurvePreset(name, curveData)`, `updateUserCurvePreset(id, curveData)`, `renameUserCurvePreset(id, newName)`, `deleteUserCurvePreset(id)`, `getCurvePresetById(id)`，支持用户自定义曲线命名保存、覆盖更新、行内重命名与安全删除。
- `src/types/index.ts`: 统一 Barrel 导出。

---

## 4. 里程碑完成清单

| 里程碑 | 模块 | 核心交付物 | 状态 | 验证结果 |
|-------|------|-----------|------|---------|
| **M0** | 脚手架与基础设施 | Vite + React 19 + TypeScript + Tailwind CSS + Lucide + 确定性 Web Audio Mock | `DONE` | 0 TS errors, 47/47 测试全通 |
| **M1** | 核心声学引擎 | 24 组声疗波表、Paul Kellet 1/f 粉红噪声、432Hz Drone、24dB 多模滤波、过采样 Drive、立体声延时、合成卷积混响、2.5ms 余弦微斜坡 0ms 硬切 | `DONE` | 382/382 测试全通，司法审计 CLEAN |
| **M2** | 呼吸宏与阶段声学 | 四阶段生理状态机、0 时长瞬时穿透、呼吸宏一级物理映射网络、对称张力插值曲线、出厂节奏与持久化存储 | `DONE` | 463/463 测试全通，四方 Gate PASS |
| **M3** | 禅意神圣几何画布 | Canvas 2D 零 GC 60fps 渲染管线、DPR 视网膜高清适配、4 大几何预设、全屏轻触手势判定、底部微型状态胶囊 | `DONE` | 527/527 测试全通，772 行对抗压测全绿 |
| **M4** | 工业秩序硬件 UI | 高对比双主题、320ms 长按旋钮与半透明调制卡片、中心零位磁性推子、中心零位双向动态 LED VU 表、抽屉选择器、综合调音台 | `DONE` | 564/564 测试全通，生产打包成功 |
| **M5** | 系统总装集成 | `src/App.tsx` 挂载全要素：视听时钟瞬时同步、首触解锁 AudioContext、全画布轻触硬切启停、底部胶囊与硬件台联调 | `DONE` | 81 套件 571/571 测试全通，100% 绿灯 |
| **M6** | 声疗品质与多维视觉彻底重构 | 彻底解决低音遮蔽问题（Drone降低默认底噪增益至0.18并引入呼吸包络衰减；OSC A突破108Hz低音锁定，支持54~864Hz宽域音高与音色独立基频切换；滤波器截止频率底线保护保留高次泛音）；Deck面板新增OSC A Pitch旋钮；完成全屏最大边界导轨校准（严格统一于 0.40 * minDim）；Sacred神圣几何从零重构为具备3D双向反转梅尔卡巴星四面体、生命之花双弧罗塞塔、13节点78弦多维投射与金光轮印的复杂神圣曼陀罗 | `DONE` | 83 套件 579/579 测试全通，100% 绿灯，0 TS错误 |
| **M7** | 持续呼吸声学生机与神圣几何变速复杂形变重构 | 破除持续发声音色冻结：OSC A新增Unison合唱双音发生器（+6~20 cents差拍）与Sub次谐波发生器（半频基底）；Deck面板扩展Morph/Unison/Sub旋钮；实现四阶段动态波表扫描演化；Sacred神圣几何从零彻底重做为单色建筑线稿美学、具备吸气加速/屏息微振/呼气减速/静息归零的阶段变速动力学以及四维超正方体（Tesseract）反向扭转双曲面拓扑变形 | `DONE` | 83 套件 579/579 测试全通，100% 绿灯，生产构建 0 TS 错误 |
| **M8** | 双 LFO 调制引擎与声学音质全面温润重塑 | 解决声音持续发声“数学式冻结”与干涩感：引入专属独立高精度双 LFO 模块（LFO 1 驱动 OSC A & Drone 微音分 Vibrato，LFO 2 驱动滤波呼吸扫频、双耳立体声 Pan 漂移与呼吸 Tremolo 增益颤动）；声学深度净化：全面旁路 Drive 饱和失真，杜绝复音频段互调失真（IMD）；将吸气滤波上限由 14kHz 压制并平滑至温和的 6.5kHz，消除刺耳高频蜂鸣；调低粉红气流噪声；在 HardwareDeck 中增加独立双 LFO 调制卡片与双组专属旋钮 | `DONE` | 84 套件 586/586 测试全通，100% 绿灯，生产打包 0 TS 错误 |
| **M9** | ADSR 音色包络发生器、声疗预设声学同步与全界面语言专业一致性 | 补充 Web Audio 原生自动化驱动的高精度 `AdsrModule`（Attack, Decay, Sustain, Release）；将包络门控与呼吸四阶段生理状态机深度绑定，支持 0ms 硬切清空与无缝恢复；为 5 大声疗预设注入定制化 ADSR 参数矩阵；硬件 Deck 增加 ADSR 卡片与独立旋钮（通过 `Env Decay` 消除命名冲突）；全面梳理统一前端界面语言体系，实现地道专业中文呈现与双语无损分层排版 | `DONE` | 85 套件 598/598 测试全通，100% 绿灯，生产打包 2.17s 0 TS 错误 |
| **M10** | 全方位声学防失真限幅重构、轻柔解压预设、双振荡器全功能扩充、波表波形实时监视器与呼吸协同动效 | Web Audio 防硬削波（preMixBus 0.75 增益预留 + -1.5dB 砖墙硬限幅器）；OSC B 气流噪声强化（振幅提升至 0.28 / +8dB，80Hz HPF 低切去浊，Low Cut 与 Motion 旋钮）；OSC A 扩充 Warmth 温润染色与 Spread 立体声发散旋钮；5 大声疗预设全面降压轻柔化（Sub/Drone 能量降 60%+，Q 峰平滑，Gaussian 混响 tail 5.5s~6.8s, mix 0.50~0.62）；OSC A 嵌入 64 点傅里叶逆合成时域波表监视器（WavetableVisualizer）；调制中心（ModulationCard）视口脱节修复（fixed backdrop 居中弹窗自适应与 Esc/背景关闭），为 5 大调制源引入生动图形动效与原理解析；Knob 旋钮增加外圈调制光弧与生命呼吸四阶段律动动效 | `DONE` | 85 套件 598/598 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.91s) |
| **M11** | Serum 风格旋钮动态调制环、真实声音驱动的调制中心、四阶段声音参数独立自动化与气流多重噪声扩展 | 重构 `Knob.tsx` 实现 Serum 风格动态调制环（Base Arc + Mod Range Arc + Live Sweep Arc + Playhead Dot）；`HardwareDeck.tsx` 构建 60fps 真实音频同步时钟并注入各旋钮 `computeLiveModOffset`；`ModulationCard.tsx` 摒弃虚假动画，全面由真实音频与呼吸驱动（暂停即冻结，LFO 与呼吸宏真实物理映射）；引入四阶段呼吸独立自动化倍率矩阵（`StageMultipliers`）与快速预设；`OscBChannel.ts` 接入 +9dB (2.8x) 声学增益补偿（`makeupGain`）与 4 大声疗噪声源（Pink/White/Brown/Violet）及 50ms 无缝循环交叉淡入淡出；HardwareDeck 新增 OSC B 单色极简快速切换器 | `DONE` | 87 套件 607/607 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.18s) |
| **M12** | Serum 风格旋钮动态调制环高反差重做与四阶段声学自动化连续 MSEG 包络编辑器 | 攻克旋钮静态盲区：注入开箱即用 DEFAULT_MODULATION_ROUTES 预设矩阵（Filter Cutoff 呼吸展开 0.60、OSC A Morph 呼吸形变 0.70、OSC B Color 四阶段气流色泽 0.50、Drone Drift LFO 1 颤音微漂移 0.35、Filter Resonance LFO 2 扫频 0.25）；外置高反差专属轨道（modRadius=size/2-1.5，#262626 凹槽，3.5px #0284c7 调制范围环，4px #00f0ff 霓虹电光动态扫频弧，r=3.8 高对比度白芯青边走针圆盘）；60fps 四阶段连续平滑余弦 S 曲线插值；重构 4 阶段自动化为专业合成器级连续 MSEG 包络发生器（分区波形图，#mseg-gradient 发光渐变，Smooth/Linear/Step 曲线插值，目标物理语义映射，实时激光走针追踪，声疗级场景预设：深吸慢呼、清醒四方、潮汐涌现、禅定归零及自然/吸气/呼气兼容） | `DONE` | 87 套件 608/608 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.94s) |
| **M13** | 8项综合体验与交互升级 | ModulationCard React Portal 解决滚动脱节与总控深度公式卡片释义、音量推子 (BipolarFader) 320ms 长按调制与 Serum 风格侧边动态范围条/电光滑块、旋钮两行自适应完整标签换行与悬停提示、Breath Macro VU 替换为 4 阶段时间轴呼吸示波器 (BreathMacroTimelineScope，保留 role="meter")、OSC A 波表头部 Chevron 步进切换、ADSR 连续 SVG 动态包络线与发光走针追踪 (AdsrEnvelopeVisualizer)、用户预设 localStorage 持久化 (userPresets.ts) 与 7 款扩展声疗预设 (构建 12 款官方工厂预设库) | `DONE` | 87 套件 608/608 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.04s) |
| **M14** | Master VU 示波器唯一绑定/联动与触控编辑，以及发声逻辑革命性升级（生成式调式粒子发生器与单音音符独立物理 ADSR 包络） | 示波器与 Master Volume 唯一绑定联动（有效增益动态缩放、静音平线、Pointer 拖拽直接编辑与双击重置基线）；ScaleQuantizer 调式量化器（5 大禅意调式与纯数学音高计算）；OSC A 生成式粒子发生器与真实单音物理 ADSR 包络（VoiceMode: Drone/Particles/Arp，Lookahead 调度器，立体声漫游，0ms 硬切即清 Purge）；HardwareDeck 模式切换器与调式旋钮组、ADSR 动态角色标定；4 大声疗预设粒子化升级 | `DONE` | 90 套件 620/620 测试全通，100% 绿灯，生产打包 2.09s 0 TS 错误 |
| **M15** | 旋钮调节范围整体全面扩充与 Breath micro VU 示波器 Stage Env 专属联动与点击交互重塑 | 核心旋钮数值调节范围全面扩充（Wide Param Horizons：LFO 1 Rate 0.01..30Hz 覆盖超慢冥想漫游到音频速率 FM/AM 共振，LFO 2 Rate 0.01..20Hz，ADSR 0.005..15s 兼顾 5ms 微秒瞬态与 15s 史诗淡入，Stereo Delay 0.01..3s 右声道 4.5s / 缓冲区 5s / Feedback 0.95 极限自激，Gaussian Reverb 0.2..20s 衰减 / 10s 安全钳制 Buffer，OSC A Pitch 20..1760Hz / Detune -100..+100 cents，OSC B Low Cut 20..3000Hz，Particle Rate 0.1..20Hz，DSP -> engine -> UI 三层链路统一消弭二次截断）；Breath micro VU 示波器彻底解耦并唯一联动 Stage Env（解绑 Master Volume 拖拽独立交由专业推子，专属绑定呼吸四阶段连续波形与激光走针巡航，UI cursor-pointer 与微动效，点击示波器直接以 stageProgress 模式打开 Stage Envelope MSEG 编辑器，保留 role="meter" 与 aria-label="Breath Macro VU" 100% 契约兼容） | `DONE` | 90 套件 620/620 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.94s) |
| **M16** | ADSR 物理音符包络与呼吸阶段彻底解耦、多音模式物理生命周期保障与 Studio 专业级包络线界面重构 | 彻底厘清并解耦呼吸阶段包络与音符物理发声包络（移除 updateBreathModulation 中对母线 ADSR 强行绑定吸呼静息的错误逻辑，杜绝呼吸掐音）；多音模式（particles/arp）母线 ADSR 全通 Bypass，OscA 内部粒子音符忠实直通执行专属独立 Web Audio ADSR（取消人为缩放系数）；单音模式启动/恢复触发起音维持、暂停释音、发声期稳定维持 Sustain 平台；AdsrEnvelopeVisualizer 全面重构为 Studio 专业级（62px 高度 / 280x64 视窗，0dB/-6dB/-12dB/-∞ 精度电平虚线网格与标签，ATTACK/DECAY/SUSTAIN/RELEASE 分区标牌，三次贝塞尔 S 曲线 Attack 与真实指数衰减/释放，发光双层同心拐点锚点环，多音模式优雅停用伪动效呈现高精度静态基线与状态徽章，单音呈现稳态脉动点，底部 4 阶段参数读数芯片）；新增单元测试套件 tests/unit/ui/adsrEnvelopeVisualizer.spec.ts (4 项测试) | `DONE` | 91 套件 624/624 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.04s) |
| **M17** | Master 推子默认绑定 Stage Env 与 Breath micro VU 呈现真实 Stage 包络线及双向闭环交互 | Master 推子在 DEFAULT_MODULATION_ROUTES 中默认绑定 stageProgress (depth: 0.60, 4阶段倍率 1.0/0.85/0.25/0.05, smooth) 并呈现 Serum 风格调制范围柱与电光滑块；BreathMacroTimelineScope 彻底摆脱死波形硬编码，真实映射 4 阶段倍率与 smooth/linear/step 三大曲线形态，激光走针沿高精度数学轨迹巡航；顶部示波器与 Master 推子双向闭环（消费 master-fader 调制路由并在点击时打开对应编辑卡片，修改实时联动双端）；新增 tests/unit/ui/masterTimelineScope.spec.ts 测试断言，测试大盘提升至 625 项 | `DONE` | 91 套件 625/625 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.20s) |
| **M18** | 真实 Web Audio 调制解算打通、Stage Env 为 0 绝对静音、未受控背景长音泄漏彻底切除、以及 ModulationCard 旋钮大样与 -100%~+100% 垂直推子重构 | 真实 Web Audio 调制解算与派发 (computeRouteLiveValue + applyLiveModulationRoutes)；Stage Env 为 0 绝对静音（gain.value = 0.0）；三路泄漏源彻底切除（OscAChannel 非 drone 连续振荡器静音归零、AudioEngine 多音模式 432Hz Drone 增益归零、AdsrModule 动态 sustain 平滑下潜与 sustain=0 瞬态清脆）；ModulationCard 重构为目标旋钮大样与 140px 垂直双极性推子并排双联区（初始 depth=0.0，双击/磁吸居中归零，+100%~-100% 标尺，sr-only 契约兼容）；新增 liveModulationEngine.spec.ts 与 serumKnobModulation.spec.ts 扩展 | `DONE` | 92 套件 629/629 测试全通，100% 绿灯，生产打包 0 TS 错误 (1.98s) |
| **M19** | 彻底切除未受控背景长音泄漏、粒子合成器 Phase Plant 风格流场动态监视器与音数容量大幅扩充、ADSR 零锚点对数瞬态几何重塑 | 彻底排查切除背景持续长音（OscA 波表动态扫描 `isDrone` 守卫与 gain1/gain2 强制归零杜绝每 16ms 呼吸扫描复活直响、AudioEngine 全呼吸阶段 `isDroneMode` 守卫强制 Drone 增益置零、AdsrModule 移除 `lastStage` 死锁并实现 sustain=0 时 30ms 线性归零绝对静音）；粒子合成器核心参数大跃升（Rate 扩充至 0.1..50.0Hz、Density 扩充至 1..32V 并发、HardwareDeck 新增 Duration 0.05..4.0s 旋钮、$1/\sqrt{\text{maxDensity}}$ 动态混音总线功率平衡杜绝削波）；Phase Plant 风格灵动粒子流动态监视器（`ParticleStreamScope.tsx`，立体声相 X 轴 vs 对数音高 Y 轴，白炽光子冲击波 Shockwave、光环展开与漫游微颤、随 voiceMode 自适应无缝切换）；ADSR 零锚点对数瞬态几何重塑（`AdsrEnvelopeVisualizer.tsx`，废除 18+ 保底常数，normLog 对数映射实现 Attack 0.01s $\le$ 3px 真实 90 度垂直拔起瞬态冲击，响应式缩写 A/D/R 杜绝重叠）；新增 leakageAudit.spec.ts (3 测试)、particleCapacity.spec.ts、adsrTransientGeometry.spec.ts (2 测试) | `DONE` | 95 套件 635/635 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.38s) |
| **M20** | 工业硬件 UI 与调制体系 | 推子 VCA 乘法包络调制动态精准映射与范围条渲染重构 (Master 100% 呈现 0%~100% 完整调制柱与 liveModOffset=0 稳态锚定，live tick z-10 发光电光滑块 14x2.5px 消除死锁与隐藏缺陷)；ModulationCard 冗余 Manual 选项精简移除 (收敛为 Breath Macro, LFO 1, LFO 2, Stage Env 四大时变动力源与底部专属红色 Unassign 按钮，保持 ModulationSource 安全回退)；扩展 tests/unit/ui/fader.spec.ts 与 tests/unit/ui/knob.spec.ts 专项断言 | `DONE` | 95 套件 639/639 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.27s) |
| **M21** | ADSR 真实声学原理对齐、呼吸 Gate 周期重触发、粒子微观粒径窗与 Voice Stealing、商业颗粒参数体系 | ADSR 声学解耦（切除 sustain=0 暴力抹平，仅在 hold 阶段平滑调电平，保障 Pluck/Bell 完整冲击与释放）；单音模式呼吸 Gate 驱动（吸气 triggerAttack，呼气 triggerRelease，让 Sustain=0 单音如击钵敲响、生生不息）；微观粒径窗（Micro Grain Window，解绑母线长 ADSR，0.05..4.0s 时值约束，3ms 极速起音，sustain=0 零 hold 即释）；Voice Stealing 商业声部窃取（maxDensity=32 满载时 8ms 指数平滑淡出最老声部，杜绝高频丢弃死锁）；商业颗粒参数体系（Spray 1..4、Pitch Jitter 0..50ct 微分音、WT Wander 0..8sl 波表漫游、Chance 10%..100%）并在 HardwareDeck 完整集成旋钮组；测试套件扩展 tests/unit/audio/adsr.spec.ts 与 tests/unit/audio/particleCapacity.spec.ts | `DONE` | 95 套件 641/641 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.97s) |
| **M22** | 底层发声净化、Knob-Truth 原则立标、单音 Gate、物理机架流、自适应折叠与 MSEG 曲线编辑器 | Knob-Truth 原则立标（切除 AudioEngine 120+ 行 switch(stage) 暴力覆写与 OscAChannel 内部跳八度，未调制参数严格锁定旋钮真实值）；单音模式呼吸 Gate 生命周期（吸气 Note On、屏息/呼气 Sustain 维持、静息 Note Off，Sustain=0 清脆敲击生生不息）；波表与粒子关系界定及专属参数自适应折叠（共用 Pitch/Harmonics/Index/Morph/Level，粒子模式自适应隐藏 Unison/Sub/Warmth/Spread/Detune）；机架物理信号流顺序重塑（Drive -> Filter -> ADSR -> Dual LFO -> Delay -> Reverb 6 大模块物理拓扑对齐）；4 阶段交互式 MSEG 呼吸曲线编辑器（BreathCurveEditor.tsx，自由增删节点，手柄垂直拖动张力曲率，激光走针三次数学巡航，5 大经典预设与 localStorage 持久化）；新增 tests/unit/audio/curveMath.spec.ts (10 测试), curvePresets.spec.ts (3 测试), knobTruthAndBreathGate.spec.ts (3 测试) | `DONE` | 97 套件 657/657 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.34s) |
| **M23** | 调制源二元分支架构重构、LFO 极性声学规范、全宽独立呼吸阶段包络演播室与全链路闭环联动 | 调制源两级分支重构（ModulationCard 两大分支：呼吸动态组 Breath Macro / Stage Env vs 合成器内部 LFO 组 LFO 1 / LFO 2）；LFO 极性声学逻辑修正与交流对称守卫（切除虚假 Unipolar/Bidirectional 开关，展示双极性交流对称振荡指示器，底层强制 bipolar=true）；全宽独立专业工作台（StageEnvelopeStudio.tsx，760px~960px 宽屏，Panorama 全景 / Focused 微操双模视窗，14px/16px 加大靶心，移除 0.05..0.95 死区支持自由增删拖拽，实时浮动坐标 HUD，垂直张力手柄引导虚线与双击归零，5 大预设管理与阶段一键重置，Save & Apply 即时生效）；全链路闭环联动（BreathMacroTimelineScope 点击直接呼出工作台，ModulationCard 提供独立工作台直达按钮，双向参数同步与广播）；新增 tests/unit/ui/stageEnvelopeStudio.spec.ts (5 测试)，扩展 tests/unit/ui/serumKnobModulation.spec.ts (增至 7 测试) | `DONE` | 99 套件 664/664 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.24s) |
| **M24** | 呼吸图形触碰范围限定与几何命中检测、顶部导航栏精简与底部药丸控键集成、机架 OSC A 自适应子网格防挤压重构、立体声 Master Pan 控制体系健全、以及 Serum 风格 LFO 网格波形视窗与经典波形扩展 | 呼吸图形触碰范围限定与几何命中检测（`isWithinGeometry`，Math.hypot $\le$ 0.44*min(W,H)，保留边缘空白手势区域，中心提示文案「轻触中心图形开始呼吸」）；主界面顶部 Header 精简（移除图形选择器，专注 432Hz/预设/机架/主题）与底部视觉风格药丸条（并列集成 Visual Geometry Presets 极简微拟物工具栏）；机架 OSC A 控件水平自适应网格防挤压重构（Row 1 核心发声 5 列等宽网格 + Row 2 模拟质感与声场 5 列等宽网格，彻底消除排版挤压截断）；立体声 Master Pan 控制体系健全与 LFO 2 正名（`EffectsChainParams.masterPan` -1.0..+1.0，`AudioEngine` 接入 Web Audio 标准 `StereoPannerNode`，机架 Master 区域新增双极性 Master Pan 旋钮，LFO 2 Pan 旋钮正名为「Pan Mod」物理声学职责清晰解耦）；Serum 风格 LFO 网格波形视窗与经典波形扩展（`SerumLfoScope.tsx`，暗黑网格视窗、中心零轴点划线、四分格时间线、微观 Rate HUD，Sine/Triangle/Sawtooth/Square/Random 5 种经典波形切换，白炽亮点与发光光晕激光巡航走针）；新增 `tests/unit/visuals/geometryHitTest.spec.ts` (3 测试) 与 `tests/unit/ui/serumLfoAndPan.spec.ts` (2 测试) | `DONE` | 101 套件 669/669 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.17s) |
| **M25** | Stage Env 独立编辑器闭环解耦与真实调制生效、ADSR 包络可视化垂直纵深重塑、全通道 115px 独立推子仓自适应重构、以及工作台冗余功能精简与风格统一 | 根除 Stage Env 独立编辑器编辑不生效 Bug（切除 onClose 清空 activeModTarget、if(!activeModTarget) return 静默丢弃、以及硬编码 master-fader 三重根本漏洞，HardwareDeck 维护独立 studioTarget 元数据与 handleStudioSave 专用回写，精准回写 modulationRoutes[studioTarget.id] 并实时广播；AudioEngine 补齐 osca-morph/harmonics/gain 实时调制解算下发实现声学真实生效）；ADSR 包络线图形界面垂直纵深重塑（AdsrEnvelopeVisualizer.tsx 高度扩充至 110px，纵向绘图跨度 hRange 翻倍至 82px，新增 -3dB 参考虚线，外层升级 h-[110px]）；全通道推子 115px 独立通道条自适应重构（Master Output Bay 独立通道条封装 Master Fader 115px + Master Pan、OSC A 4旋钮+115px Level Bay、OSC B 与 Drone 独立 115px 通道推子仓，彻底根除排版挤压截断）；StageEnvelopeStudio 功能精简（Header 改造为全景/微操平滑聚焦锚点按钮与动态 targetLabel 联动指示，100% 零 Emoji 工业科技美学） | `DONE` | 101 套件 669/669 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.93s) |
| **M26** | HardwareDeck 顶部栏左右声学拓扑重组与 SerumLfoScope 75px 垂直高度扩容 | HardwareDeck 顶部栏左右声学拓扑重组与自适应排版优化（解决此前窄屏或 flex-wrap 折行导致 Master 推子卡片掉落左下孤立缺陷；左侧聚合区将 Brand 品牌标识与 STAGE ENVELOPE 呼吸阶段示波器聚合在左侧弹性容器内作为动力输入监控区；右侧固定区将 Master Output Bay 包含 115px Master 推子/Pan 与主题切换按钮通过 self-end sm:self-auto shrink-0 固定在最右侧，符合“左侧输入源 -> 右侧 Master 总线输出”标准混音台拓扑与高端机架视觉锚定）；SerumLfoScope 纵向展示空间 50% 扩容（默认高度由 54px/50px 提升至 75px，正弦/三角/锯齿/方波/随机波形振幅起伏、#07090e 网格与白炽激光相位巡航走针舒展大气）；测试套件扩展 tests/unit/ui/deck.spec.ts 顶部栏左右聚合与右侧固定断言及 tests/unit/ui/serumLfoAndPan.spec.ts 75px 默认高度与 viewBox 断言 | `DONE` | 101 套件 670/670 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.22s) |
| **M27** | LFO 底层硬编码直通彻底拔除与 100% Knob-Truth 真实旋钮确立、商业级 LFO 1/2 孪生对称结构重塑、纯 LFO DSP 数学模块集成以及调制矩阵全目标调度闭环 | 排查并彻底根治 LFO 5 处硬编码物理直通污染（切除 detuneModOut 直连 OscA/Drone 音高、filterModOut 直连 Filter Cutoff、panModOut 直连 Stereo Panner、tremoloModOut 直连 Tremolo Gain，确立 100% Knob-Truth 纯净声学体系）；商业级 LFO 1 与 LFO 2 孪生对称标准化重构（移除 LFO 2 孤立奇怪的 Filter/Pan Mod 旋钮，实现统一的 75px SerumLfoScope + 5 种波形微工具条 + Rate & Depth 孪生双旋钮 + 硬件 Bypass 电源开关，规范 Lfo2Params legacy 兼容）；纯 LFO DSP 数学模块建立（src/audio/dsp/lfoMath.ts，提取 evaluateLfoWaveform 与 computeLfoLiveValue，统一 Triangle/Saw/Square/Random/Sine 5 种波形数学解算与 bypass=true 0 输出，视窗与声学引擎共享 DSP 算法）；调制矩阵全目标调度闭环（补齐 master-pan, osca-detune, drone-drift, reverb-mix, delay-mix, drive-amount 实时解算分发与无路由旋钮基准锁定）；新增 tests/unit/audio/lfoMath.spec.ts (5 项测试)，扩展 knobTruthAndBreathGate.spec.ts 与 serumLfoAndPan.spec.ts | `DONE` | 102 套件 676/676 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.99s) |
| **M28** | 自动化曲线与预设双向状态强一致性同步、音色预设路由干净重置与 Stale State 彻底根治 | 排查根治四重闭锁缺陷（ModulationCard 缺少 props 监听导致 stale state 覆盖最新修改、快捷预设/滑块漏改 curveData 导致 if(curveData) 短路忽略 multipliers、HardwareDeck 未受控接收 App 路由且预设缺少路由模型导致上一音色曲线残留、AudioEngine 重复声明 getter 覆盖 bug）；架构重塑闭环（ModulationCard 增加 useEffect [route,target,isOpen] 并在滑块/预设中双向联动 multipliers 与 curveData、HardwareDeck 受控路由接收与 App.tsx 透传重置、AudioEngine 剔除冗余方法并在 loadSoundPreset 干净恢复 DEFAULT_MODULATION_ROUTES）；curveMath.ts 双向数学强一致性闭环（createCurveDataFromMultipliers 与 extractStageMultipliersFromCurve，extract(create(M)) ≡ M）；SoundPreset / UserPreset 类型与 localStorage 存储契约扩展 modulationRoutes；新增 tests/unit/audio/presetModulationSync.spec.ts (3 项测试) | `DONE` | 103 套件 679/679 测试全通，100% 绿灯，生产构建 0 TS 错误 (1.98s) |
| **M29** | 呼吸阶段独立编辑器深度交互治理、拖拽防打断锁死与 24px 坐标脱节根治 | 根除三大交互与视觉硬伤（useEffect 依赖反噬与拖拽打断、generateStageSvgPath 缺失 Y 轴偏移导致 24px 错位、播放时钟强行劫持 activeStage 打断用户编辑）；单向初始化门禁（prevIsOpenRef、prevTargetLabelRef）与拖拽锁定（isDraggingRef）确保拖拽连续顺滑；generateStageSvgPath 增加 offsetY=0 参数并由 Studio 传入 PAD_Y=24，实现曲线轨迹与控制点/手柄像素级贴合对齐；彻底切除播放时钟对 activeStage 强行劫持，支持自由停留微操；queueMicrotask 异步解耦派发 onChange；HardwareDeck 智能回退 createCurveDataFromMultipliers；AudioEngine applyLiveModulationRoutes 同步赋予 gain.value 满足静音契约与状态查询；tests/unit/ui/stageEnvelopeStudio.spec.ts 扩充至 7 项测试，tests/unit/audio/curveMath.spec.ts 增加 offsetY 断言 | `DONE` | 103 套件 682/682 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.10s) |
| **M30** | ModulationCard 冗余 4 阶段倍率滑块切除、105px 中型微操视窗升级与交互闭环 | 解决此前离散滑块与 Studio 连续曲线冲突与卡片臃肿；彻底切除 4 阶段离散滑块、3 种曲线模式切换按钮、5 组倍率预设按钮与标题，释放 140px 纵向堆叠；缩略波形扩容为 105px 中型微操视窗（totalH=105, totalW=380, stageW=95），配备 4 呼吸阶段环境光晕列（吸气天蓝/屏息琥珀/呼气紫罗兰/静息青绿）+ 实时阶段动态指标百分比 HUD (0%~100%) + 示波器暗黑网格 + 发光多阶段曲线描边 + 激光走针巡航；支持点击中型波形视窗与全宽直达按钮双通道唤出 StageEnvelopeStudio；handleApply 自动调用 extractStageMultipliersFromCurve 保证声学引擎与预设体系数据强一致闭环；tests/unit/ui/serumKnobModulation.spec.ts 更新，7 项测试全通 | `DONE` | 103 套件 682/682 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.42s, 488 kB) |
| **M31** | StageEnvelopeStudio 独立编辑器界面重构去重与文案瘦身、曲线预设库扩充至 8 款与完整 CRUD 管理功能闭环 | 解决两个区域内容严重重复排版缺陷；彻底切除 Toolbar 4-Stage 纯文本 Tab 导航栏释放横向空间；升级下方「全周期 4 阶段全景视窗 (4-Stage Panorama)」卡片为唯一的交互式阶段选择器（role="tablist"/tab，微光边框、编辑中标签、RUNNING 实时脉冲与阶段缩略波形）；Header 彻底移除废弃的“全景视窗 / 微操放大”跳转按钮，徽章收敛精简为「4-STAGE MSEG」，副标收敛为「目标联动: {targetLabel}」；右上角快捷键浮层下移整合至底部状态栏（「双击新增节点 · 垂直拖动手柄调节曲率 · Delete键删除节点」）；曲线预设存储层扩展（curvePresets.ts 导出 updateUserCurvePreset 覆盖保存与 renameUserCurvePreset 行内重命名）；UI 下拉选择器采用出厂与用户双分组展示（optgroup），为用户预设配备覆盖保存、行内重命名、带确认删除及存为新预设，引入 2.5s 淡出 Action Notice 反馈条；出厂曲线预设库扩充至 8 款（慢速微风 Gentle Breeze、阶梯跳跃 Rhythmic Steps、反向膨胀 Reverse Swell）；更新 tests/unit/audio/curvePresets.spec.ts 与 tests/unit/ui/stageEnvelopeStudio.spec.ts (8 项测试) | `DONE` | 103 套件 683/683 测试全通，100% 绿灯，生产构建 0 TS 错误 (2.11s, 493 kB) |
| **M32** | 默认声音预设收敛至 5 款极简非刺耳声学体系、波表基础波形置顶与时域波形预览试听集成、以及用户自定义声音预设完整 CRUD 编辑与删除管理 | 重构 soundPresets.ts 出厂声音预设严格精选收敛至 5 款温润非刺耳体系（神圣钟磬 tibetanBowl、深沉治愈柔垫 oceanicDrift、空灵微光长鸣 ambientShimmer、丝绒次低音 deepTheta、温暖模拟弹拨 zenTemple）并干净收敛 getAllFactoryPresets 与 getSoundPresetList；wavetableData.ts 重构 Category I 'Pure Roots'（0..3）为经典基础波形（正弦波、三角波、方波、锯齿波），导出 generateWavetablePreviewSvgPath 纯函数并由 BottomSheetDrawer 集成 64×28 SVG 时域波形微缩图与 PeriodicWave 柔和轻点试听；userPresets.ts 扩展 updateUserPreset 覆盖保存与 renameUserPreset 行内重命名；App 端打通用户预设行内重命名微模态、带确认二次删除微模态（当前激活预设删除平滑安全回退默认预设）、Header 保存预设智能感知切换「覆盖当前」与「存为新预设」双模式；新增 tests/unit/audio/userPresets.spec.ts (7 项测试) 与 tests/unit/audio/wavetablePreview.spec.ts (4 项测试) | `DONE` | 105 套件 694/694 测试全通，100% 绿灯，生产构建 0 TS 错误 (497 kB) |
| **M33** | 波表波形与名称显示不一致彻底根治、24 款高代表性高对比度波表体系升级、以及声学视觉完全同步 | 定位三大致命根因（默认 Morph 偏高导致波表被冲垮、声学与视觉割裂、三角波展开符号错误）；重构双层示波体系 WavetableVisualizer（主基准线永远 100% 真实绘制当前选定切片原始形态，Morph Stream 动态演变层在 effectiveMorph > 0.02 时以半透明紫罗兰虚线微光叠加，HUD 透明标注过渡目标如 84% > S03 / Pure Wave，DEFAULT_CHANNEL_STRIP 默认 morphDepth 降至 0.0）；OscAChannel 打通 morphDepth 双振荡器等功率声学淡化，所见即所听；全面重构 4 大类 24 款极高对比度与代表性波表体系（Pure Roots 0..3、Singing Bowls 4..7、Vocal Formants 8..11、Spectral Expansion 12..23 齿轮管风琴/偶次饱和/窄脉冲/FM棱镜等）；新增 tests/unit/ui/wavetableVisualizer.spec.ts (4 项测试) | `DONE` | 106 套件 698/698 测试全通，100% 绿灯，生产构建 0 TS 错误 (497 kB, 2.52s) |
| **M34** | 主界面右上角设置中心重塑（收纳深浅色主题切换）、呼吸阶段转换声疗级提示音系统（5 款非刺耳纯 Web Audio 预置、4 节点灵活勾选与本地持久化） | 主界面右上角单一主题按钮替换为极简设置按钮（Settings）；构建高质感设置模态弹窗（SettingsModal.tsx），第一区块收纳升级界面主题模式（Dark / Light 双模分段切换），第二区块构建全新呼吸阶段转换提示音系统（Breath Transition Cue Sound）；支持 4 阶段转换节点独立勾选（exhale_to_inhale 开启新循环默认推荐、inhale_to_holdIn 饱满留驻、holdIn_to_exhale 舒缓释放、exhale_to_holdOut 空肺静息）；精调 5 款温润非刺耳 Web Audio 声疗提示音预置（颂钵微鸣 432Hz、禅定水滴 520-780Hz、温润木磬 324Hz、柔光晶体 864Hz、暖腹低鸣 108Hz），纯 Web Audio 振荡器与平滑 GainEnvelope 合成，3~10ms 线性 Attack 消除爆音，严密低通滤波彻底消除高频毛刺；总开关、音量滑块、轻点试听、一键恢复默认；localStorage（synhale_cue_settings_v1）持久化与自愈；App.tsx 订阅 BreathEngine onStageChange 毫秒级瞬时触发；新增 tests/unit/audio/breathCue.spec.ts (5 项测试) 与 tests/unit/ui/settingsModal.spec.ts (8 项测试)，更新 tests/unit/app.spec.ts | `DONE` | 108 套件 711/711 测试全通，100% 绿灯，生产构建 0 TS 错误 (503 kB, 2.07s) |
| **M35** | 呼吸阶段转换提示音高保真真实自然采样化、暗黑主题色彩繁杂治理清零黄色橙色、以及明亮主题全量无死角覆盖 | 取缔原有纯振荡器波形合成，引入 5 款自然声学实录高保真采样（西藏颂钵、山涧清泉、温润铜磬、空谷风铃、暖腹深钵），AudioBuffer 内存池异步缓存与双层平滑合成回退；暗黑主题彻底取缔 yellow/amber/orange 及其 Hex 色值，收敛至 neutral-950 底色、微边框与科技天蓝高亮/优雅靛蓝屏息，覆盖全量组件，新增 S6-5 自动化法医测试实现零黄色反弹；明亮主题全量无死角覆盖（机架 9 大通道卡片/推子槽/网格、WavetableVisualizer、BreathMacroTimelineScope、SettingsModal、StageEnvelopeStudio、微模态弹窗），S6-3 验证深浅色对比度均 ≥ 10.0 超越 WCAG AAA 标杆 | `DONE` | 108 套件 712/712 测试全通，100% 绿灯，生产构建 0 TS 错误 (506 kB, 2.21s) |
| **M36** | 呼吸阶段转换提示音质感换新与 <= 4s 强制延音硬截断、明亮主题细节全面治理消除黑块、以及 Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定 | 解决原温润铜磬过吵金属撞击声与山涧清泉过短突兀感，分别替换为【温润暖木】（woodenTemple.ogg / .wav, 1.8s 纯正木腔温润共鸣、基频 264Hz 暖低通、内敛柔和）与【清泉微澜】（zenWaterDrop.wav, 2.2s 天然山涧微澜水滴泛音、舒缓平和）；提示音底层设定 MAX_CUE_DURATION = 4.0s 严格上限，配合 0.5s 平滑释放淡出与 source.stop(now + playDur)，磁盘采样物理时长全部规范在 <= 3.8s，彻底防止长音叠加过载；明亮主题全量细节治理：消除 Header Deck 开启态深暗蓝黑块（border-sky-400 bg-sky-50 text-sky-600 font-semibold）、OSC A Voice Mode 浅色底槽（border-neutral-200 bg-slate-50/90）、ADSR 示波器视窗响应 isDark（白底/浅灰标线 #e2e8f0/天蓝曲线光晕/白底黑字指标卡）、DUAL LFO MODULATION 视窗（白底屏幕 bg-slate-50/90、浅灰网格与白底按键槽）；Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定：切除破坏行高基线的“编辑中”标签，统一锁定 h-5 固定高度与 transition-colors duration-150，仅以高质感外边框加亮与环形阴影（border-sky-500 ring-1 ring-sky-500/50 / ring-sky-400）标定选中态，达成真正绝对 0 像素位移；108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 535.87 kB，构建耗时 2.11s) | `DONE` | 108 套件 712/712 测试全通，100% 绿灯，生产构建 0 TS 错误 (535.87 kB, 2.11s) |
| **M37** | 呼吸提示音 7.0s 延音上限与【空灵晨露】采样置换、HardwareDeck 10 大模块电源按钮浅色模式黑块治理、波表试听时长延长至 1.0s、以及 StageEnvelopeStudio 界面美学重塑 | 呼吸阶段转换提示音 MAX_CUE_DURATION 放宽至 7.0s 且配合 1.0s 柔和淡出，颂钵 6.8s/暖木 2.8s/风铃 6.5s/深钵 6.8s，【空灵晨露】(zenWaterDrop.wav/.ogg 3.8s) 晶莹水滴玉盘回声置换原清泉微澜；HardwareDeck 10 大模块电源按钮适配深浅主题 getPowerButtonClass 彻底消除浅色黑块；playWavetableAudioPreview 试听时长延长至 1.0s 并引入 previewContextRef 单例安全调度防爆音；StageEnvelopeStudio 界面美学重塑：存为新预设/重置按钮浅色适配、状态胶囊与保存按钮质感升级、全景卡片切除 RUNNING 文本标签并引入 stageProgress 动态驱动三层发光微粒 Playhead Dot、顶部预设下拉重构为现代高质感 Custom Dropdown 并保留 sr-only 原生 select 兼容性 | `DONE` | 108 套件 712/712 测试全通，100% 绿灯，生产构建 0 TS 错误 (537.28 kB, 2.19s) |
| **M38** | 呼吸阶段转换提示音真实自然采样全面复原与重塑升级（找回用户满意的 BodhiTimer bell1.ogg 真实风铃实录、置换【自然水滴】纯天然水滴微澜实录、引入【暖腹深钵】专业大号低音藏钵 153Hz 原声实录） | 彻底解决上轮误用算法波形覆盖自然录音的声学缺陷，全面回归并升级为 5 款 100% 纯正真实自然声学实录采样（全部部署在 public/audio/cues/ 下，同时提供 .ogg 与 .wav 双格式支持）：1.【空谷风铃】（crystalHarmonics.ogg 33.4KB / .wav 585.8KB，彻底找回用户原本高度满意的 BodhiTimer bell1.ogg 真实风铃原声录音，天然微风拂动，高阶谐波清透舒缓，6.8s 自然衰减，彻底取缔算法电音）；2.【自然水滴】（zenWaterDrop.wav 327.4KB / .ogg 18.9KB，彻底置换算法合成的【空灵晨露】，采用真实大自然水滴滴落与自然水波涟漪原声实录，3.8s 晶莹剔透，纯澈宁神，绝无电子杂音）；3.【暖腹深钵】（deepSubPing.wav 1171.5KB / .ogg 111.0KB，全新引入专业大号低音西藏颂钵原声实录 bowl-low-and-long，基频 153Hz 纯正深腹低音共鸣，6.8s 纯正自然衰减，温暖醇厚）；4.【西藏颂钵】（singingBowl.ogg 89.1KB / .wav 1171.5KB，BodhiTimer bowl.ogg 真实藏钵实录保持原样）；5.【温润暖木】（woodenTemple.ogg 19.0KB / .wav 241.2KB，温润木质木磬实录保持原样）；src/audio/cue/breathCueConfig.ts 精准更新元数据与英文名、频率提示；tests/unit/ui/settingsModal.spec.ts 与 tests/unit/audio/breathCue.spec.ts 同步更新断言 (8/8 项测试全绿) | `DONE` | 108 套件 712/712 测试全通，100% 绿灯，生产构建 0 TS 错误 (537.49 kB, 2.18s) |
| **M39** | 呼吸阶段转换提示音高保真自然原声置换、初次试听发出旧声音时序 Bug 根除、以及首次点击中心图形开始呼吸断声毛刺彻底根治 | 根除初次试听发出旧声音 Bug（App 首帧 preloadAllCueSounds、breathCuePlayer 提炼 playBuffer 并重构 playCueSound 为异步优先等待真实采样解码播放，彻底废除浏览器环境中的旧振荡器降级）；彻底根除首击中心图形启动呼吸时的不自然断声（gestureHandler await onFirstAudioUnlock 后再触发 onTap、App.tsx ensureAudioInitialized 引入 initPromiseRef 互斥单例锁杜绝并发重入、AudioEngine lastBreathStage 初始设为 inhale 杜绝首帧重复触发 Attack、resume 引入 wasPaused 与当前增益智能判断消除音频下切咔嗒与断声）；高保真真实声学采样全面置换（zenWaterDrop 置换为 AOSP 官方原生无损自然水滴实录+空灵水波漫反射 3.5s，deepSubPing 置换为 BodhiTimer 184Hz 铜制纯正藏钵实录 6.8s，双格式 ogg/wav 全面部署）；108 个测试套件 712 项自动化测试 100% 绿灯，生产构建 0 TS 错误 (537.5 kB, 2.19s) | `DONE` | 108 套件 712/712 测试全通，100% 绿灯，生产构建 0 TS 错误 (537.5 kB, 2.19s) |
| **M40** | 多模滤波器 6 种滤波方案扩充与动态波德图频响可视化、OSC B 气流扰动真实声学抖动激活、OSC A 模拟温润饱和与齐奏/展开解耦修复、以及粒子合成器全链路验证 | MultimodeFilter 扩充 6 种模式（lowpass / highpass / bandpass / notch / peak / ladder 24dB Moog 模拟阶梯低通），构建对数频率平滑波德图频响示波器（FilterVisualizer.tsx，模式标签、截止频点标定、发光指示球与明暗双主题自适应）；OSC B 激活内部 motionLfo (1.35Hz) 与 motionGain 实时驱动带通喉腔共振滤波频点产生 $\pm 25\%$ 微湍流抖动（Airflow Turbulence Flutter）；OSC A 接入 warmthShaper 软饱和双曲正切曲线引入低阶谐波温润染色，引入 unisonPanner 彻底解耦 spread（立体声声场展宽）与 subOsc.detune（失谐和音高），释疑 UNISON 复合混合深度百分比；PARTICLES 粒子模式 9 大商业旋钮（Rate/Density/Duration/Octaves/Scatter/Spray/Jitter/WT Wander/Chance）与 5 大自然调式量化安全映射全链路闭环，背景持续音自动隔离；新增 tests/unit/ui/filterVisualizer.spec.ts (5 项测试)，测试大盘增至 109 套件 717 项测试 | `DONE` | 109 套件 717/717 测试全通，100% 绿灯，生产构建 0 TS 错误 (544.5 kB, 2.26s) |
| **M41** | 旋钮拖拽与调制噪音彻底消除（零拉链音/防爆音去咔嗒）、预设切换 Voice Mode 与 Harmonic Scale 状态同步与发声逻辑闭环、双 LFO 极性模式开关（UNI/BI）、Serum UNISON 语义标定澄清、以及调制卡片范围显示字符串修复 | 彻底消除旋钮拖拽与高频调制拉链音（DriveModule 重构为“固定曲线 + 动态增益调制”分流架构与 15ms 平滑干湿混合补偿杜绝 FIR 清空爆音，MultimodeFilter 级联双二阶类型不等守卫杜绝系数重构咔嗒，StereoDelay/DroneChannel/AudioEngine 全链路切除暴力覆写并统一由 5ms~20ms setTargetAtTime 执行声学平滑过渡兼顾状态同步）；预设切换 Voice Mode 与 Scale 闭环（OscAChannel 修正 handleVoiceModeChange 归一化增益并切除暴力赋值改用平滑过渡，soundPresets.ts 显式补齐 voiceMode 与 scale，types/audio.ts 规范 Partial<ParticleParams> 契约，OscAChannel 补齐默认参数安全合并，AudioEngine.loadSoundPreset 与 App.tsx 深拷贝合并 100% 同步 UI 与发声）；双 LFO 极性模式开关（types/audio.ts 扩充 polarity 'bipolar'|'unipolar'，lfoMath.ts computeLfoLiveValue 支持单双极性映射，SerumLfoScope 视窗自适应基准线与 HUD 动态指示 UNI/BI，HardwareDeck 标题栏集成极简切换按钮）；Serum UNISON 概念考证与语义正名（澄清基准+伴随失谐振荡器架构对应 BLEND，控件标签优化正名为 Uni Blend）；ModulationCard 修复单极性负深度字符串拼接杜绝 +-66% 错误；109 个测试套件 717 项测试 100% 绿灯，生产构建 0 TS 错误 (548.37 kB, 2.11s) | `DONE` | 109 套件 717/717 测试全通，100% 绿灯，生产构建 0 TS 错误 (548.37 kB, 2.11s) |

---

## 5. 测试大盘与构建度量

- **测试套件总数**: 109 个测试文件 (验证 M0 - M42 全量功能与 UI 架构重构，涵盖粒子示波器物理发声 1:1 对齐、独立前级增益 GainModule 软削波与直通旁路、全链路 setTargetAtTime 旋钮拖拽与调制噪音彻底消除、Reverb 120ms 防抖去咔嗒、波表视窗 60fps 动态调制打通、合成器顶部音频链路拓扑视图 SignalFlowGraph、预设切换 Voice Mode 与 Harmonic Scale 状态同步、双 LFO 极性 UNI/BI 切换、Serum UNISON 语义标定、多模滤波器 6 种模式与波德图频响、OSC B 气流微湍流抖动、OSC A 温润饱和、粒子合成器 9 旋钮调式量化、自然采样提示音体系等)
- **自动化测试用例总数**: 718 项测试
- **测试通过率**: **100%** (718 / 718 passed, 0 failed)
- **生产打包构建**: `npm run build` (`tsc -b && vite build`)，**0 TypeScript 错误**，构建耗时 2.24s。
- **合规审计**: 经全量单元测试与审查，全项目源码与 UI 100% 保持零 Emoji 铁律，全部使用 Lucide 单色细线矢量图标与地道工业声学中文偏好；S6-5 自动化法医测试实现全局零黄色/橙色永久防御。
- **本地实时预览**: Vite 开发服务器稳定运行于 `http://127.0.0.1:3000/`。

---

## 6. 新会话冷启动快速恢复指令（Bootstrap Context）

```markdown
### Synhale 2 冷启动上下文索引 (M0 - M42 全量就绪)
- **工程定位**: 沉浸式半模块化呼吸声疗合成器 (React 19 + TypeScript + Web Audio API + Canvas 2D + Tailwind CSS)。
- **规范基线**: 严格 100% 零 Emoji 铁律，1px 工业秩序美学，双语无损分层排版（中文偏好）。
- **声学链路 (物理信号流严格对齐与 100% Knob-Truth 纯净体系 - M29 - M42)**: 
  OSC A (Wavetable-driven Granular Synthesis: 24 Curated High-Contrast Slices + 动态 liveMorph / liveHarmonics 调制 + 60fps 响应 + ParticleStreamScope 物理发声 1:1 声像与音高动态接管) / OSC B (4 Noises + Formant Bandpass + Motion Flutter 1.35Hz LFO ±25% 微湍流抖动) / Drone (432Hz Tuning, 4-Stage Polyphonic Muted)
  -> preMixBus (0.75 Headroom) 
  -> 0. Preamp Gain (GainModule: -12dB ~ +24dB, 4x 抗混叠 tanh 软削波, 5ms 硬件直通旁路)
  -> 1. Drive (Tape Warmth Drive Saturator, 固定曲线 + 动态增益调制分流架构, 15ms 增益平滑与 makeupGain 自动补偿, 零拉链音/防爆音, 0 IMD)
  -> 2. Filter (Multimode 24dB/oct Cascaded LP / HP / BP / Notch / Peak / Ladder 24dB Moog + FilterVisualizer 动态波德图频响示波器与发光指示球)
  -> 3. ADSR (Envelope VCA: Monophonic Breath Gate Note Triggering)
  -> 4. Symmetrical Twin LFO Modulation (LFO 1 / LFO 2: 极性开关 UNI/BI 支持单极性 [0, depth] 与双极性 [-depth, +depth] 切换)
  -> 5. Delay (Stereo Ping-Pong 0.01..3.0s, 10ms setTargetAtTime 增益平滑防拉链杂音)
  -> 6. Reverb (Gaussian Synthetic IR 0.2..20.0s, 120ms 防抖去咔嗒)
  -> Stereo Panner (StereoPannerNode: masterPan -1.0..+1.0, 5ms setTargetAtTime 平滑过渡)
  -> MasterCut (2.5ms Micro-ramp) -> MasterLimiter (DynamicsCompressorNode -1.5dB) -> Right Fixed Master Output Bay -> Destination.
  -> SignalFlowGraph (顶部完整拓扑架构视图，3 声源并行汇聚 + 独立前级增益 + 7 级效果器串联链路流光与深浅主题自适应).
- **交互与调制系统 (M42 规范与核心治理)**: 
  * Particle Acoustic 1:1 Sync, Preamp Gain Module & Soft Clipping, Final Zero-Zipper Governance, 60fps Dynamic Wavetable Mod, and Signal Flow Graph (粒子示波器物理发声 1:1 对齐、独立前级增益模块与软削波、旋钮拖拽零拉链音/防爆音终极治理、波表视窗 60fps 动态调制打通、以及合成器顶部音频链路逻辑视图 - M42):
    - 粒子示波器物理发声 1:1 对齐：ParticleStreamScope 接管 Web Audio 真实发声粒子流，声像、音高与发声音数绝对吻合；
    - 独立前级增益 GainModule：-12dB ~ +24dB、4x 抗混叠 tanh 软削波、5ms 硬件直通旁路，HardwareDeck 顶部独立卡片控制；
    - 旋钮拖拽与实时调制拉链音深层治理：全面切除直接 .value 覆写，全链路采用 setTargetAtTime 平滑过渡与 Reverb 120ms 防抖，彻底消除杂音窜入后级回声；
    - 波表监视视窗动态调制打通：WavetableVisualizer 实时响应 liveMorph 与 liveHarmonics，60fps 动态展示形变与切片角标；
    - 合成器顶部音频链路逻辑视图 SignalFlowGraph：直观展示 3 声源并行汇聚与 7 级效果器串联拓扑架构，动态流光与深浅双色主题完全适配；
    - 109 个测试套件，718 项自动化测试全部绿灯通过 (100% 绿灯)，生产构建打包成功 (0 TS Errors, npm run build 0 错误 0 警告，耗时 2.24s)。
  * Zero-Zipper De-clicking, Preset Voice Mode & Scale Sync, Dual LFO Polarity Switch, Serum Unison Semantics, and Modulation Card Range Display Fix (旋钮拖拽与调制噪音彻底消除、预设切换 Voice Mode 与 Harmonic Scale 状态同步与发声逻辑闭环、双 LFO 极性模式开关、Serum UNISON 语义标定澄清、以及调制卡片范围显示字符串修复 - M41):
    - 旋钮拖拽与调制噪音彻底消除：DriveModule 重构为“固定曲线 + 动态增益调制”分流架构与 15ms 平滑干湿混合补偿，杜绝每次修改波表曲线强制清空 4x 抗混叠 FIR 滤波器延迟线引发的巨幅爆音；MultimodeFilter 级联双二阶类型不等守卫杜绝重复系数重构瞬态咔嗒；StereoDelay, DroneChannel, AudioEngine 全链路统一由 5ms~20ms setTargetAtTime 平滑调度，消除切音拉链音与爆音；
    - 预设切换 Voice Mode 与 Scale 状态同步与发声闭环：OscAChannel 修复 handleVoiceModeChange 归一化增益并切除暴力赋值，改用 20ms 平滑过渡防爆音同时维护状态查询；soundPresets.ts 5 大核心出厂预设显式补齐 voiceMode: 'drone' 与 particles: { scale: 'pentatonic' }；types/audio.ts 规范 Partial<ParticleParams> 契约，OscAChannel 采用 DEFAULT_PARTICLE_PARAMS 防御性安全合并；AudioEngine.loadSoundPreset 与 App.tsx handleSoundPresetSelect 引入 DEFAULT_CHANNEL_STRIP 防御性深拷贝合并，彻底解决状态残留脱节；
    - 双 LFO 极性模式开关 (UNI / BI)：types/audio.ts 扩展 polarity: 'bipolar' | 'unipolar'；lfoMath.ts computeLfoLiveValue 原生支持单极性 [0, depth] 与双极性 [-depth, +depth] 计算；SerumLfoScope 视窗原生自适应基准线与 HUD 动态指示 UNI / BI；HardwareDeck 标题栏集成极简 UNI/BI 切换按钮；
    - Serum UNISON 概念考证与语义正名：考证 Xfer Serum 架构并澄清基准+伴随振荡器对应 BLEND 概念，HardwareDeck 控件标签优化正名为 Uni Blend；
    - ModulationCard 参数影响范围字符串拼接修复：重构 formattedRange 计算，单极性负深度格式化为 [基准 - 深度%, 基准]，彻底消除 +-66% 错误；
    - 109 个测试套件，717 项自动化测试全部绿灯通过 (100% 绿灯)，生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 548.37 kB，构建耗时 2.11s)。
  * Authentic Nature Cue Replacement, Initial Audition Bug Fix, and First Tap Audio Glitch Elimination (呼吸阶段转换提示音高保真自然原声置换、初次试听发出旧声音时序 Bug 根除、以及首次点击中心图形开始呼吸断声毛刺彻底根治 - M39):
    - 根除初次试听发出旧声音 Bug (Initial Audition Audio Fallback Fix)：定位首次点击试听听到旧合成音根因（内存缓存为空时同步降级 playSyntheticFallback，后台才异步 fetch）；重构 App.tsx 挂载 useEffect 首帧 preloadAllCueSounds() 后台预载解码全部 5 款采样；重构 breathCuePlayer.ts 提炼 playBuffer，在 playCueSound 中未命中缓存且支持 fetch 时异步优先等待 loadCueSampleBuffer 解码并直接播放真实采样，彻底废除浏览器环境中的旧振荡器降级，100% 播放高保真自然采样；
    - 彻底根除首击中心图形启动呼吸时的不自然断声 (Initial Tap Audio Glitch Elimination)：定位四大根因（gestureHandler onFirstAudioUnlock Promise 未 await、App.tsx ensureAudioInitialized 并发重入重复初始化和 resume、AudioEngine resume 中强制清零增益 3ms 陡峭爬升导致切断、lastBreathStage 初始为 null 导致首帧重复触发 Attack）；架构修复：App.tsx 引入 initPromiseRef 互斥单例锁、gestureHandler await onFirstAudioUnlock 后触发 onTap、AudioEngine lastBreathStage 初始设为 inhale、resume 引入 wasPaused 与当前增益智能判断（currentGain < 0.999 || wasPaused），消除音频下切咔嗒与断声，首击 100% 丝滑、0 咔哒、0 断声；
    - 高保真真实声学采样全面置换升级 (High-Fidelity Nature Acoustic Samples Upgrade)：【自然水滴】zenWaterDrop 彻底淘汰电子变频滑音，置换为 AOSP 官方原生无损自然水滴实录 + 空灵水波漫反射（3.5s，zenWaterDrop.ogg 42.8KB / .wav 617.4KB）；【暖腹深钵】deepSubPing 彻底淘汰奇次谐波方波蜂鸣正弦，置换为 BodhiTimer 184Hz 铜制纯正藏钵实录（6.8s，deepSubPing.ogg 76.4KB / .wav 1199.6KB）；
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 537.5 kB，构建耗时 2.19s)。
  * Authentic Nature Acoustic Cue Samples Restoration (呼吸阶段转换提示音真实自然采样全面复原与重塑升级 - M38):
    - 解决上轮误用算法波形覆盖自然录音的声学缺陷，全面回归并升级为 5 款 100% 纯正真实自然声学实录采样（部署在 public/audio/cues/ 下，同时提供 .ogg 与 .wav 双格式支持）：
      1. 【空谷风铃】(crystalHarmonics.ogg 33.4KB / .wav 585.8KB)：彻底找回用户原本高度满意的 BodhiTimer bell1.ogg 真实风铃原声录音，天然微风拂动，高阶谐波清透舒缓，6.8s 自然衰减，彻底取缔算法电音；
      2. 【自然水滴】(zenWaterDrop.wav 327.4KB / .ogg 18.9KB)：彻底置换算法合成的【空灵晨露】，采用真实大自然水滴滴落与自然水波涟漪原声实录，3.8s 晶莹剔透，纯澈宁神，绝无电子杂音；
      3. 【暖腹深钵】(deepSubPing.wav 1171.5KB / .ogg 111.0KB)：全新引入专业大号低音西藏颂钵原声实录（来自 brunoloff/meditation-timer 48kHz 立体声母带实录 bowl-low-and-long），基频 153Hz 纯正深腹低音共鸣，6.8s 纯正自然衰减，温暖醇厚；
      4. 【西藏颂钵】(singingBowl.ogg 89.1KB / .wav 1171.5KB)：BodhiTimer bowl.ogg 真实藏钵实录保持原样；
      5. 【温润暖木】(woodenTemple.ogg 19.0KB / .wav 241.2KB)：温润木质木磬实录保持原样；
    - 元数据与测试套件强一致性同步：src/audio/cue/breathCueConfig.ts 精准更新元数据与英文名、频率提示；tests/unit/ui/settingsModal.spec.ts 与 tests/unit/audio/breathCue.spec.ts 同步更新断言 (8/8 项测试全绿)；
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 537.49 kB，构建耗时 2.18s)。
  * 7.0s Cue Duration & Crystal Dewdrop Sample, Power Button Adaptive Styling, Wavetable 1.0s Audition, and Studio Aesthetic Refinement (呼吸提示音 7.0s 延音上限与【空灵晨露】采样置换、HardwareDeck 10 大模块电源按钮浅色模式黑块治理、波表试听延长至 1.0s、以及 StageEnvelopeStudio 界面美学重塑 - M37):
    - 呼吸阶段转换提示音质感换新与 7.0s 延音放宽：放宽 MAX_CUE_DURATION 至 7.0s 配合 1.0s 柔和线性释放淡出，重构生成西藏颂钵 6.8s/温润暖木 2.8s/空谷风铃 6.5s/暖腹深钵 6.8s；彻底置换原清泉微澜，全新打造【空灵晨露】（zenWaterDrop.wav/.ogg 3.8s，纯天然水滴撞击玉盘空灵回声模型，晶莹剔透，纯净宁神）；
    - HardwareDeck 10 大通道模块电源按钮黑块治理：getPowerButtonClass(isBypass, padding) 深度重塑，覆盖 OSC A, OSC B, Sub Drone, Drive, Filter, ADSR, LFO 1, LFO 2, Delay, Reverb 全部 10 个模块，浅色模式呈现白底、浅灰边框配翡翠绿/天蓝微光，彻底消除暗黑块瑕疵；
    - Wavetable 选择器轻点试听时长提升至 1.0 秒：采用 15ms 软启动、850ms 饱满延音、150ms 线性释放淡出，引入 previewContextRef 单例引用与延迟安全清理，彻底杜绝多次快速试听时的声音堆叠与内存泄露；
    - Stage Envelope Studio 独立编辑器界面重塑：右上角 `+ 存为新预设` 和 `↺ 重置本阶段` 按钮浅色自适应白底灰边消除黑块；左下角状态胶囊与 `保存生效` 按钮深浅模式质感升级；4-Stage Panorama 卡片彻底切除破坏行高基线的 RUNNING 文本标签，改由 stageProgress 动态驱动三层发光移动微粒（Playhead Dot）随呼吸流推进；顶部预设下拉重构为现代高质感 Custom Dropdown 并保留 sr-only 原生 select 完美兼容自动化测试与无障碍；
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 537.28 kB，构建耗时 2.19s)。
  * Acoustic Cue Timbre Polish & Hard Cutoff <=4s, Light Theme Polish, and Zero-Displacement Stage Cards (呼吸阶段转换提示音质感换新与 <=4s 强制硬截断、明亮主题细节全面治理消除黑块、以及 Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定 - M36):
    - 解决原温润铜磬过吵金属撞击声与山涧清泉过短突兀感，分别替换为【温润暖木】（woodenTemple.ogg / .wav, 1.8s 纯正木腔温润共鸣、基频 264Hz 暖低通、内敛柔和）与【清泉微澜】（zenWaterDrop.wav, 2.2s 天然山涧微澜水滴泛音、舒缓平和）；
    - <= 4.0s 严格硬截断与平滑释放淡出机制：定义 MAX_CUE_DURATION = 4.0，执行 playDur = Math.min(cachedBuffer.duration, 4.0)，配合 0.5s 平滑释放淡出与 source.stop(now + playDur)，磁盘采样物理时长全部规范在 <= 3.8s，彻底防止长音叠加过载；
    - 明亮主题全量细节治理：Header Deck 控制台按钮开启态浅色背景（border-sky-400 bg-sky-50 text-sky-600 font-semibold shadow-xs，消除深暗蓝黑块）、OSC A Voice Mode 浅色底槽（border-neutral-200 bg-slate-50/90 shadow-2xs）、ADSR 示波器视窗响应 isDark（白底/浅灰标线 #e2e8f0/天蓝曲线光晕/白底黑字指标卡）、DUAL LFO MODULATION 视窗（白底屏幕 bg-slate-50/90、浅灰网格与白底按键槽）；
    - Stage Envelope Studio 阶段卡片 0 像素抖动彻底固定：彻底切除破坏行高基线的“编辑中”标签，统一锁定 h-5 固定高度与 transition-colors duration-150，仅以高质感外边框加亮与环形阴影（border-sky-500 ring-1 ring-sky-500/50 / ring-sky-400）标定选中态，达成绝对 0 像素位移、0 抖动；
    - 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，TypeScript 类型检查与生产构建打包成功 (tsc -b && vite build 0 TS Errors, 0 Warnings, 产物 535.87 kB，构建耗时 2.11s)。
  * Authentic Acoustic Cue Samples, Zero Amber/Yellow/Orange, & Comprehensive Light Theme (高保真自然采样提示音、暗黑主题零黄色橙色治理、以及明亮主题全量无死角覆盖 - M35):
    - 取缔原有纯振荡器合成，引入 5 款西藏颂钵/山涧清泉/温润铜磬/空谷风铃/暖腹深钵高保真自然实录采样（/public/audio/cues/）；
    - 基于 Web Audio API 构建 sampleBufferCache 内存缓存池与异步并发加载器，支持静默预载（preloadAllCueSounds）；
    - 双层平滑降级架构：优先回放高保真采样，极端离线/单测环境下无缝平滑回退纯正声疗合成振荡，100% 零报错；
    - 暗黑主题色彩繁杂治理：彻底取缔 yellow/amber/orange 及其 Hex 色值，收敛至 neutral-950 底色与科技天蓝（#38bdf8 / #7dd3fc）高亮、优雅靛蓝（#818cf8）屏息冷色调；覆盖 ModulationCard、StageEnvelopeStudio、SettingsModal、HardwareDeck、App.tsx 模态弹窗；S6-5 自动化法医测试对源码全量扫描确保零反弹；
    - 明亮主题全量无死角覆盖：HardwareDeck 9 大模块通道外壳卡片/推子槽/内部网格、WavetableVisualizer（白底/微灰立体网格）、BreathMacroTimelineScope、各级模态弹窗与抽屉；S6-3 验证深浅色对比度均 ≥ 10.0，超越 WCAG AAA 标杆；
    - 自动化测试规模提升为 108 个测试套件，712 项自动化测试全部绿灯通过 (100% 绿灯)，生产构建打包成功 (506 kB, 2.21s)。
  * Settings Modal Architecture & Soothing Breath Transition Cue System (主界面右上角设置中心重塑与呼吸阶段转换声疗级提示音系统 - M34):
    - 主界面右上角单一主题按钮替换为极简精致设置按钮，触发专业设置弹窗 (SettingsModal.tsx)；
    - 第一区块：收纳升级原“界面主题模式（Theme Appearance）”，提供深色（Dark）与浅色（Light）双模态分段切换按钮；
    - 第二区块：构建全新“呼吸阶段转换提示音（Breath Transition Cue Sound）”系统；
    - 4 阶段转换节点灵活独立勾选（exhale_to_inhale 吸气开始新周期/inhale_to_holdIn 屏息开始/holdIn_to_exhale 呼气开始/exhale_to_holdOut 静息开始）；
    - 5 款温润柔和纯 Web Audio 声疗提示音预置：颂钵微鸣 singingBowl (432Hz 铜质悠扬微振与暖低通)、禅定水滴 zenWaterDrop (520-780Hz 微滑频泛音)、温润木磬 woodenTemple (324Hz 有机木质自然敲击)、柔光晶体 crystalHarmonics (864Hz 八度泛音轻抚)、暖腹低鸣 deepSubPing (108Hz 纯正弦次重低音包裹)；
    - 声学防刺耳与抗爆音机制：纯 Web Audio 振荡器与平滑 GainEnvelope 合成，3~10ms 线性 Attack 消除爆音，严密低通滤波彻底消除高频毛刺与刺耳杂音；
    - 交互与存储持久化：提示音总开关、0%~100% 实时音量调节、轻点试听（Audition）、4 节点独立切换网格、一键“恢复默认”、localStorage (synhale_cue_settings_v1) 持久化自愈；
    - 时钟联动：App.tsx 订阅 BreathEngine onStageChange 毫秒级瞬时触发；
    - 108 个测试套件，711 项自动化测试全部绿灯通过 (100% 绿灯)，生产构建打包成功 (503 kB, 2.07s)。
  * Waveform & Name True Alignment, High-Contrast 24 Wavetables & Audio-Visual True Sync (波表波形与名称显示不一致彻底根治、24 款高代表性高对比度波表体系升级、以及声学视觉完全同步 - M33):
    - 定位并根治三大致命根因：默认 morphDepth 偏高冲垮方波、声学与视觉割裂、三角波展开符号错误；
    - 双层示波架构 (WavetableVisualizer.tsx)：主基准线 100% 真实绘制选定切片原始形态（方波矩形平台、三角波挺拔对称）；动态演变层当 effectiveMorph > 0.02 时以半透明紫罗兰激光虚线微光叠加；底部 HUD 显示如 84% > S03 / Pure Wave；DEFAULT_CHANNEL_STRIP 默认 morphDepth 降至 0.0；OscAChannel 打通 morphDepth 双振荡器等功率声学调度；
    - 24 款高代表性高对比度波表体系：Pure Roots (0..3)、Singing Bowls (4..7)、Vocal Formants (8..11)、Spectral Expansion (12..23 管风琴/饱和/窄脉冲/FM棱镜等)；
    - 106 套件 / 698 项测试全部绿灯通过，构建 0 错误 0 警告 (497 kB, 2.52s)。
  * 5 Curated Non-Harsh Sound Presets, Basic Wavetable Order & Audition, and Full User Preset CRUD (5 款极简温和声音预设收敛、波表基础波形前置与时域波形预览试听、以及用户自定义声音预设完整 CRUD 运维闭环 - M32):
    - 出厂声音预设收敛为 5 款极简非刺耳声学体系：神圣钟磬 tibetanBowl (432Hz 铜磬共鸣与长衰减混响)、深沉治愈柔垫 oceanicDrift (水下 Ambient 慢起伏呼吸慢铺底)、空灵微光长鸣 ambientShimmer (柔和空间漫游受限滤波无刺耳自激)、丝绒次低音 deepTheta (54Hz 纯净次八度温暖低通)、温暖模拟弹拨 zenTemple (有机瞬态衰减与适度截止)；getAllFactoryPresets 与 getSoundPresetList 彻底清空冗余；
    - 波表基础波形前置与交互式预览试听：Category I 'Pure Roots'（切片 0..3）重构为正弦波、三角波、方波、锯齿波四大基础波形；generateWavetablePreviewSvgPath 纯函数生成 64×28 SVG 紧凑时域波形图；抽屉内集成时域微缩波形与 PeriodicWave 320Hz 柔和快速轻点试听按钮；
    - 用户声音预设完整 CRUD 闭环：userPresets.ts 导出 updateUserPreset 与 renameUserPreset；预设抽屉挂载编辑与删除按钮，支持行内重命名微模态、带确认二次删除微模态（当前激活预设删除平滑安全回退默认预设）、Header 保存预设智能切换「覆盖当前」与「存为新预设」双模式。
  * StageEnvelopeStudio Interface De-duplication, Copy Streamlining, Factory 8 Presets & Full CRUD Lifecycle (StageEnvelopeStudio 界面重构去重、文案瘦身、8 款出厂预设与完整预设 CRUD 运维闭环 - M31):
    - 解决两个区域内容严重重复排版缺陷：彻底移除 Toolbar 4-Stage 纯文本 Tab 导航栏释放横向空间；
    - 将下方「全周期 4 阶段全景视窗 (4-Stage Panorama)」卡片升级为唯一的交互式阶段选择器（role="tablist"/tab，配备微光高亮边框、编辑中标签、RUNNING 实时呼吸脉冲与阶段缩略波形），点击直接无缝切换阶段；
    - Header 彻底移除已废弃的“全景视窗 / 微操放大”跳转按钮（消除视觉噪音），徽章由口水话收敛精简为「4-STAGE MSEG」，副标收敛为「目标联动: {targetLabel}」；
    - 画布右上角快捷键浮层下移整合至底部状态栏（「双击新增节点 · 垂直拖动手柄调节曲率 · Delete键删除节点」）；
    - 底部状态栏保持「实时声学调制已连接 · Modulation Active」脉冲指示与「保存生效 · Save & Apply」高精操作按钮；
    - 曲线预设存储层完善（src/audio/storage/curvePresets.ts）：新增导出 updateUserCurvePreset（覆盖更新当前预设曲线数据）与 renameUserCurvePreset（重命名当前预设名称）；
    - UI 下拉预设选择器采用出厂与用户双分组展示（<optgroup>），为用户预设配备【覆盖保存】（Save/Overwrite）、【重命名】（Rename，带行内输入与 Enter 回车确认）、【删除】（Delete，带“确认删除?”二次确认微模态），支持【存为新预设】并配备 2.5s 优雅淡出的 Action Notice 微拟物状态通知条；
    - 出厂曲线预设库声学与音乐性扩充至 8 款：自然潮汐、爆发跃升、阶跃方波、禅定微澜、快速弹拨、慢速微风 (Gentle Breeze)、阶梯跳跃 (Rhythmic Steps)、反向膨胀 (Reverse Swell)。
  * Redundant Sliders Elimination & Medium Stage Viewport Upgrade (ModulationCard 冗余 4 阶段倍率滑块切除、105px 中型微操视窗升级与交互闭环 - M30): 彻底切除下方 4 个离散滑块、3 种曲线模式切换按钮、5 组倍率预设按钮与标题，释放 140px 纵向堆叠，恢复专业合成器紧凑卡片布局；缩略波形扩容为 105px 中型微操视窗（totalH=105, totalW=380, stageW=95），配备 4 呼吸阶段环境光晕列（吸气天蓝/屏息琥珀/呼气紫罗兰/静息青绿）+ 实时阶段动态指标百分比 HUD (0%~100%) + 示波器暗黑网格 + 发光多阶段曲线描边 + 激光走针巡航；支持点击中型波形视窗与全宽直达按钮双通道唤出 StageEnvelopeStudio；handleApply 自动调用 extractStageMultipliersFromCurve 保证声学引擎与预设体系数据强一致闭环；严格 100% 零 Emoji。
  * Stage Studio Interaction Overhaul & 24px Precise Alignment (Stage Envelope Studio 深度交互治理、拖拽防打断锁死与 24px 坐标脱节根治 - M29): 引入单向初始化门禁（prevIsOpenRef、prevTargetLabelRef）与拖拽期间锁定（isDraggingRef），彻底阻断父级重渲染切断拖拽；generateStageSvgPath 传入 PAD_Y = 24 消除 24px 上浮错位与底部斜切缺口，曲线描边、半透明渐变、控制点与张力菱形手柄像素级完全贴合对齐；切除播放时钟强行劫持 activeStage，允许用户在播放时自由停留微操；queueMicrotask 异步解耦派发 onChange；HardwareDeck 智能回退 createCurveDataFromMultipliers；AudioEngine.applyLiveModulationRoutes 在保持 setTargetAtTime 指数平滑调度防爆音的同时同步将解算值赋予 gain.value，严格满足绝对静音契约与状态查询。
  * Preset & Curve Stale State Elimination (自动化曲线与预设双向状态强一致性同步与 Stale State 彻底根治 - M28): 排查并切除四重核心闭锁缺陷（ModulationCard 缺少 props 监听、快捷预设/滑块漏改 curveData 导致 if(curveData) 短路忽略 multipliers、HardwareDeck 未受控接收 App 路由且 SoundPreset 缺少路由模型、AudioEngine 同名方法覆盖 bug）；ModulationCard 增加 useEffect 监听并在滑块/预设中双向联动 multipliers 与 curveData；HardwareDeck 受控化接收 App.tsx 路由并在切换音色预设时干净重置/载入；AudioEngine loadSoundPreset 干净恢复 DEFAULT_MODULATION_ROUTES 切断脏曲线残留。
  * Bidirectional Curve-Multiplier Math Consistency (自动化多阶段曲线与 4 阶段倍率双向数学强一致性闭环 - M28): 在 src/audio/dsp/curveMath.ts 中建立 createCurveDataFromMultipliers 与 extractStageMultipliersFromCurve，建立 getStageTarget 阶段目标终端值提取算法，实现 extract(create(M)) ≡ M 的双向数学对称闭环。
  * Preset Custom Modulation Contract (音色预设与用户持久化契约扩展 - M28): SoundPreset 与 UserPreset 类型增加 modulationRoutes?: Record<string, ModulationRoute>，localStorage 预设导入导出与存储体系完整支持自定义调制路由与自动化曲线。
  * 100% Knob-Truth Principle & Severing of 5 Hardwired LFO Links (LFO 底层硬编码直通彻底拔除与 100% 真实旋钮确立 - M27): 切除 AudioEngine 中 detuneModOut (OscA/Drone)、filterModOut (Filter Cutoff)、panModOut (Stereo Panner)、tremoloModOut (Tremolo Gain) 5 处流氓物理直连；无矩阵路由时参数 100% 遵守面板旋钮设置，对声音绝对零背景干扰。
  * Symmetrical Twin LFO Architecture (商业级 LFO 1 与 LFO 2 孪生对称重塑 - M27): 消除不对称混乱，移除 LFO 2 孤立的 Filter 与 Pan Mod 旋钮；LFO 1 与 LFO 2 统一为 75px Serum 风格暗黑网格示波器、5 种经典波形工具条 (SIN, TRI, SAW, SQR, RND)、Rate 与 Depth 孪生双旋钮以及硬件 Bypass 开关；规范 Lfo2Params 接口。
  * Pure LFO DSP Math Module (纯 LFO DSP 数学模块集成 - src/audio/dsp/lfoMath.ts - M27): 提取 evaluateLfoWaveform 与 computeLfoLiveValue 纯数学函数，规范 5 种波形归一化相位数学解算与 bypass=true 绝对 0.0 输出；视窗与声学引擎共享算法，所见即所听。
  * Comprehensive Modulation Matrix Dispatch (调制矩阵全目标调度闭环 - M27): AudioEngine.applyLiveModulationRoutes 全面覆盖 master-pan, osca-detune, drone-drift, reverb-mix, delay-mix, drive-amount 与波表参数；路由生效平滑注入，无路由无缝回落并严格锁定用户旋钮基准。
  * Deck Top Bar Acoustic Topology Reorganization (HardwareDeck 顶部栏左右声学拓扑重组与自适应排版 - M26): 解决窄屏折行 Master 卡片掉落孤立缺陷；左侧聚合区整合 Brand 标识与 STAGE ENVELOPE 示波器作为声学动力输入监控；右侧 self-end sm:self-auto shrink-0 锚定 Master Output Bay（115px Master Fader + Pan + Main Out）与主题切换，严格对齐“左侧输入源 -> 右侧 Master 总线”标准混音台拓扑。
  * SerumLfoScope 75px Vertical Expansion (Serum 风格 LFO 视窗 75px 扩容 - M26): 默认高度扩充 50% 至 75px (height=75)，SIN/TRI/SAW/SQR/RND 5 种经典波形振幅、暗黑网格与白炽激光巡航走针更加舒展大气。
  * Decoupled Stage Studio Target Routing (Stage Env 独立编辑器闭环解耦与真实调制生效 - M25): 根除编辑不生效 Bug（消除 onClose 抹除 activeModTarget、if(!activeModTarget) return 静默丢弃、以及硬编码 master-fader 三重根因）；HardwareDeck 独立维护 studioTarget 元数据与 handleStudioSave 回调，精准回写目标参数路由并广播；AudioEngine 补齐 osca-morph、osca-harmonics 与 osca-gain 实时解算下发，声学底层真实生效。
  * AdsrEnvelopeVisualizer Vertical Depth (ADSR 包络可视化垂直纵深重塑 - M25): SVG 视窗扩充至 110px，绘图跨度 hRange 翻倍至 82px，新增 -3dB 参考虚线，外层升级 h-[110px]，呈现开阔大气工业硬件质感。
  * Adaptive Channel Strip Bay Architecture (全通道推子 115px 独立通道条自适应重构 - M25): 彻底解决 Level 推子在旋钮网格中折行挤扁痛点；Master Output Bay 封装 115px Master Fader 与 Master Pan；OSC A 重构为左侧 4 旋钮矩阵 + 右侧独立 115px Level Bay；OSC B 与 Drone 同步配置拉长至 115px 的独立通道推子仓，全屏舒展。
  * StageEnvelopeStudio Streamlined Focus (工作台功能精简与风格统一 - M25): Header 精简为全景/微操平滑聚焦锚点按钮（附带 scrollIntoView）；显式展示目标联动参数（如：目标联动: Filter Cutoff · 4 阶段高精度声学自动化曲线）；严格 100% 零 Emoji。
  * Geometry Hit Test & Canvas Tap Interaction (呼吸图形触碰范围限定与几何命中检测 - M24): 在 `src/visuals/gestureHandler.ts` 中引入 `isWithinGeometry(clientX, clientY, canvasRect, 0.44)`，以画布中心为圆心、计算欧氏距离 Math.hypot $\le$ 0.44 * min(W, H) 判定中央几何触碰有效性，阻断外围空白误触；未播放提示文案更新为「轻触中心图形开始呼吸 · Tap Central Geometry to Breathe」。
  * Streamlined Header & Bottom Visual Style Toolbar (顶部导航精简与底部药丸控键集成 - M24): 4 种呼吸图形风格移出顶部 Header，Header 专注 432Hz Core、预设抽屉、机架与主题；底部控制区并列集成极简微拟物 Visual Geometry Presets 工具栏，符合拇指热区与现代前端极简美学。
  * Stereo Panning System & LFO 2 Clarification (立体声 Master Pan 体系健全与 LFO 2 正名 - M24): `EffectsChainParams` 引入 `masterPan?: number` (-1.0..+1.0)，`AudioEngine` 接入 Web Audio 标准 `StereoPannerNode`，机架 Master 区域新增双极性 Master Pan 旋钮；LFO 2 旋钮正名为「Pan Mod」，彻底解耦静态声相定位与低频自动平移摆动。
  * Two-Branch Modulation Categorization (调制源两级分支架构重构 - M23): ModulationCard 将调制源精准划分为两大分支：分支 A 呼吸动态组 (Breath Dynamic Group: Breath Macro / Stage Env) 与 分支 B 合成器内部 LFO 组 (Internal Synth LFO: LFO 1 / LFO 2)。
  * Acoustic LFO Polarity Normalization (LFO 极性声学逻辑修正与交流对称守卫 - M23): 切除虚假 Unipolar/Bidirectional 切换开关，展示工业级「双极性交流对称振荡 [-1.0, +1.0]」指示器，底层强制双极性（bipolar = true）。
  * Knob-Truth Principle (真实旋钮基准法则 - M22): 未显式分配调制路由时，参数在任何呼吸阶段与进度下严格锁定为面板旋钮设定值；切除 120+ 行 switch(stage) 暴力覆写。
  * Monophonic Breath Gate Note Triggering (单音呼吸 Gate 音符生命周期规范 - M22): 吸气 onset Note On，屏息/呼气 Sustain 维持，静息 onset Note Off，Sustain=0 清脆敲音生生不息。
  * Real-time Scopes: 
    - FilterVisualizer: 6 种滤波模式波德图频响示波器 (级联双二阶传递函数对数频响曲线、渐变阴影、模式标签与实时调制发光指示球，全面响应 isDark)；
    - WavetableVisualizer: 双层示波体系 (100% 纯真原始基准线 + 激光微光 Morph 演变层 + 目标 HUD 标注)，64 点傅里叶逆合成，头部 Chevron 左右步进；
    - SerumLfoScope: Serum 风格暗黑/明亮网格视窗 (75px 垂直扩容，全面响应 isDark)、5 种经典波形与白炽激光相位走针；
    - BreathMacroTimelineScope: 呈现真实 Stage Env 多模态包络线与激光走针巡航，点击直达 StageEnvelopeStudio；
    - AdsrEnvelopeVisualizer: 110px 垂直纵深高精度包络线监视器 (hRange 82px, -3dB 网格线，全面响应 isDark 浅色模式)；
    - ParticleStreamScope: Phase Plant 风格声相-音高全息监视器 (接管 Web Audio 真实发声粒子流，声像、音高与并发数 1:1 动态对齐)；
    - SignalFlowGraph: 合成器顶部音频链路拓扑视图 (3 声源并行汇聚 + 独立前级 GainModule + 7 级效果器串联，动态流光与深浅主题自适应)。
  * Presets & Storage: 
    - src/audio/presets/soundPresets.ts (严格收敛为 5 款极简温和声疗出厂预设，无冗余残留)；
    - src/audio/storage/curvePresets.ts (8 大出厂 MSEG 呼吸曲线预设与 LocalStorage 用户自定义预设完整 CRUD 持久化增删改查)；
    - src/audio/storage/userPresets.ts (基于 LocalStorage 的自定义声音预设完整 CRUD 增删改查、覆盖保存与行内重命名、防御性清洗)；
    - src/audio/dsp/wavetableData.ts (24 组高对比度波表切片，前 4 组基础波形置顶，SVG 紧凑时域波形生成与试听解算)；
    - src/audio/cue/breathCueConfig.ts 与 breathCuePlayer.ts (4 阶段转换节点独立勾选、5 款 100% 纯正真实自然声学实录采样 /public/audio/cues/ 与 AudioBuffer 内存池：【自然水滴】AOSP 原生无损自然水滴实录+空灵水波漫反射 3.5s、【暖腹深钵】BodhiTimer 184Hz 铜制纯正藏钵实录 6.8s、【空谷风铃】BodhiTimer bell1.ogg 真实风铃原声 6.8s、【西藏颂钵】BodhiTimer 藏钵实录 6.8s、【温润暖木】温润木磬实录 2.8s；MAX_CUE_DURATION = 7.0s 且配合 1.0s 柔和线性释放淡出与 source.stop 调度防护，双层合成回退机制与 localStorage 持久化)。
  * Sacred Geometry: 4 大几何预设 (Tesseract 拓扑变速形变, 0.40 * minDim 边界).
- **质量大盘**: 109 套件 / 718 项测试 100% 绿灯，生产构建 0 TS 错误 (耗时 2.24s)，S6-5 零黄色/橙色自动化法医测试永久防御，Vite 预览 3000 端口。
```



