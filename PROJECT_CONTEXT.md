# Synhale 工程上下文快照记忆 (PROJECT_CONTEXT.md)

> 快照更新: 2026-10-18 (神圣几何高阶图层解耦复苏 | 全动效屏息时间流速放缓 | 虚线圆彻底切除) | 测试大盘: 136 套件 / 1104 测试 100% 绿灯 | 构建状态: npm run build 0 错误 0 警告 | 严守零 Emoji 与纯单色规范

## 1. 核心定位与技术底线（< 15 行）
- **项目定位**：半模块化 Web Audio 数字合成器与沉浸式呼吸声疗乐器，实现呼吸生物节律与现代合成器声音纹理的物理声学共生。
- **技术底线**：纯原生 Web Audio API 与现代 React/TS，杜绝重量级第三方音频黑盒。全链路参数使用 setTargetAtTime 声学防爆音调度。
- **视觉红线**：100% 零 Emoji 严肃工业科技美学；严禁黄色与橙色（S6-5 自动化法医测试常态守卫），以冷灰、科技天蓝与极光青为主色调；对比度超越 WCAG AAA。

## 2. 关键架构决策（ADR 索引，< 25 行）
- [2026-10-03 / ADR-01 声源层解耦与 4 轨独立发生区落地]：彻底切除 OscAChannel 内部粒子定时器，OSC A 蜕变为纯粹波表振荡器；Deck 发生区升级为 4 大独立声源卡片（OSC A, GRANULAR CLOUD, OSC B, SUB DRONE），Granular 独占 Bypass、调式量化、10 旋钮、推子与 PhasePlantScope 视窗；预设系统双向无损迁移。
- [2026-10-03 / ADR-02 插槽式效果链与 3ms 零爆音重排]：抽象 `AudioEffectNode` 统一规范 6 大效果器；实现 `EffectChainManager` 动态插槽管理，创设 3ms 微淡出抗爆音重排机制（Micro-Ducking Crossfade），彻底杜绝 Web Audio 热插拔爆音。
- [2026-10-03 / ADR-03 动态信号流拓扑与交互重排]：`SignalFlowGraph` 升级为 4 大声源并行汇聚与效果链卡片动态渲染，提供左右微调按钮触发 3ms 无爆音实时拓扑重排与状态同步。
- [2026-10-04 / ADR-04 声学连续性与防拉链音规范]：Drive 模块采用固定曲线+动态增益分流，Filter 避免系数重复赋值，全局切除暴力 direct value 覆写，确保极端调制下纯净无咔嗒。
- [2026-10-02 / ADR-05 声疗自然采样双层回退]：呼吸提示音采用高保真无损自然实录，内存 AudioBuffer 预载 + 极端场景纯合成平滑降级，7.0s 延音硬截断与 1.0s 平滑释放淡出。
- [2026-10-03 / ADR-06~10 Phase Plant 级微粒物理引擎、触发双模态与 8x2 对称机架闭环]：17 款声学与物理建模采样库 + 本地音频拖拽 Dropzone 解析；倒序切片偏移量镜像修正 + Reverse Swell 倒吸包络；GrainEnvelopeScope 120px 交互视窗、GR/HZ 双模态无缝切换与双向换算；Row 1 母体调谐 8 钮 + Row 2 微观随机化 8 钮 1:1 对齐；DSP 声学闭环（panJitter 驱动立体声散布，pitchJitter 半音微调，levelJitter 驱动 VCA 峰值起伏）。
- [2026-10-07 / ADR-11 全景 37 项缺陷（D01-D33）代码级深度重构与物理闭环]：4 大声源 DSP 解耦抢占时钟、AHR 窗函数归一化、波表整数边界防爆音与 4x 过采样温润整形、四色噪声 50ms 尾部修复与 Brown 去直流；全局重构 2.5ms 余弦微斜坡先行硬切；MultimodeFilter 自适应谐振阻尼补偿 $1/\sqrt{1+0.25Q}$，DriveModule 消除 4x 梳状滤波并串联 12Hz 隔直高通；GrainSourceVisualizer 显式释放 tempCtx 根除 6 次导入崩溃。
- [2026-10-08 / ADR-12~16 参量 EQ 研发、乒乓波表、多帧解耦与 12 套声疗预设重构]：GainModule 串联 12Hz 隔直高通；研发 EqModule 4 段参量均衡器（80/432/2160/8000Hz）与 EqVisualizer；OscAChannel 重塑为乒乓交替双振荡器等功率平滑插值与 8 款多帧声疗波表（WT POS 0%..100% 连续扫描），WavetableVisualizer 研发 3D 等轴瀑布流地形；12 套声疗预设从零重构并统一规整 Granular duration 为秒单位（0.35..1.00s），运行态切换预设平滑 triggerAttack 重新触发发声。
- [2026-10-08 / ADR-17~19 Serum 工业标准 OSC A 重塑、4-Voice 和弦模式与微粒功率补偿]：引入 Serum 12-TET 音乐调谐（OCT/SEMI/FINE）、4x 过采样非线性 Warp 塑形器（PWM/Sync/Bend/Mirror）、PHASE/RAND/PAN 及 4-Voice 立体声复音和弦引擎（9 种和弦微选择按钮，声部 1..3 增益 0.82 等响度共鸣，pitchNeedsUpdate 脏值比对根除 60Hz 抖动）；GrainEnvelopeScope 拟对数尺度 + 悬浮 HUD + 原生 SVG 高亮；GranularChannel 重构非相干声学功率补偿 $2.2/\sqrt{\text{maxDensity}}$。
- [2026-10-09 / ADR-20~22 双轨 BUS 全模块对等隔离、等功率 Bus Mix 与核心算法深度防御加固]：EffectChainManager 引入 unregisterEffect 杜绝跨轨串音；全部 8 大效果器模块在 BUS B 完全对等隔离，支持每轨独立 ADSR 与全轨生命周期同步；AudioEngine 实现 $g_A=\cos(\text{busMix}\times\pi/2), g_B=\sin(\text{busMix}\times\pi/2)$ 等功率双轨交叉淡化；全量加固 DSP 数学模块、音频节点、呼吸引擎与 userPresets 防 NaN/Infinity/原型污染/DoS。
- [2026-10-11 / ADR-23 全代码库 100% 审查、死代码清零与 60fps Zero-GC 性能优化]：物理剔除 16 个孤儿业务源码模块、5 个冗余 WAV 资源（瘦身 1.77MB）及残留构建垃圾，补齐 `.gitignore` 与 Barrel 导出；消除 `canvasRenderer`、`sacredGeometry`、`OscAChannel`、`App.tsx` 与 `GrainSourceVisualizer` 60fps 渲染循环中的每帧堆分配与 `getBoundingClientRect()` 同步重排；修复 `breathCuePlayer` 采样节点 `onended` 未 `disconnect()` 的内存泄漏，移除 `AudioEngine` 死节点 `tremoloGain` 并将 Granular 参数同步收敛为单次批量调用。
- [2026-10-11 / ADR-24 纯单色五级光学呼吸动效组（Group II）与双组滑动胶囊]：保留经典 4 款动效为第一组（I），全新研发 100% 纯单色五级光学景深（L0 雾化薄纱 ~ L4 奇点高光）第二组动效（II）：`coronaOrbit`、`hyperMetatron`、`silkCymatics`、`celestialGyro`；底部切换胶囊升级为 1x1 Grid 叠层滑动视窗。
- [2026-10-12 / ADR-25 独立桌面软件工程化与 Windows 客户端打包闭环]：集成 Electron 44 与 electron-builder 桌面运行时架构；主进程配置 backgroundThrottling: false 彻底根除窗口后台/最小化时的音频调度与 60fps 时钟降频停振，配置 autoplay-policy 解除浏览器首触静音限制；Vite 接入 relative base: './' 相对路径加载；成功打包输出 NSIS 标准安装包与绿色版。
- [2026-10-16 / ADR-26 沉浸式一体化硬件机架外壳与无边框桌面端重塑]：彻底根除浏览器套壳割裂感；开启 frame: false 移除操作系统生硬矩形标题栏，主控顶栏直接作为原生窗口拖拽区；内嵌专属设计的精密窗口控制组并联动；外壳集成 rounded-xl 柔和圆角与 1px 微发光倒角金属内衬。
- [2026-10-18 / ADR-27 重塑「调和光结」与「磁通力线」并彻底根除预设重复元素与抖动]：替换「丝绸驻波」与「天体陀螺」为高维 3D「调和光结」与偶极「磁通力线」；切除调和光结基于 isHoldOut 离散布尔跳跃；从「极简圆环」、「平实专注」、「日冕星轨」中彻底剔除内外方向周期抖动，8 套动效实现 100% 独立设计语言与 0% 元素重合。
- [2026-10-18 / ADR-28 神圣几何解耦复苏、全动效屏息时间流速放缓与虚线边界彻底切除]：全面达成两大视觉重构：1) 神圣几何与第一组动效高阶美学图层彻底解耦复苏，4D全息晶体曼陀罗、晶面光感填色、生命之花花瓣及麦尔卡巴立体星芒全量绽放，最外圈虚线参考圆继续严格切除（hideBoundaryGuide: true）；2) 全动效统一落地屏息阶段（Hold In & Hold Out）时间流动放缓机制（calculateTimeDilationRate，Hermite样条 C1-连续积分累加衰减至 0.22~0.28 慢动作），搭配四阶段角位移平衡调谐（Inhale/Exhale 2.80, Hold 0.34），实现极具禅意的悬停沉浸感与绝对零跳变衔接。

## 3. 需求承接与待办清单（TODO，< 15 行）
- [ ] [效果链预设持久化]：支持用户保存/导入自定义效果链拓扑排序（Effect Reorder Chain）至音色预设与 LocalStorage。
- [ ] [宏控制矩阵扩展]：为全新动态效果插槽与粒子参数开放更多呼吸宏与多阶包络（MSEG）深度调制路由。
