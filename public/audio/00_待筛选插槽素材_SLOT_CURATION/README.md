# Synhale 2 - 声学插槽缺口分析与素材筛选工作区指引

欢迎进入声音素材筛选工作区。针对您指出的“不知道项目到底缺的是哪些、缺乏什么模块的什么插槽”，本目录已按照 **【模块名称】 -> 【插槽 ID】 -> 【缺口类型与所需数量】** 建立了清晰的独立子文件夹。

---

## 快速导航：项目到底缺什么？

在本项目中，彻底切除代码伪合成噪声与算法伪乐器后，产生缺口的主要集中在以下两大多轨合成模块：

### 模块一：OSC B 呼吸气道与物理噪音生成器
* **原缺口根因**：原 `src/audio/dsp/pinkNoise.ts` 采用 `Math.random()` 代码算法生成假噪音，缺乏真实声学质感，被全盘切除。
* **所需插槽数量**：共需 **4 个**标准物理噪音插槽（各需 1 个文件），另提供扩展候选供您试听选配。

| 插槽目录 | 对应代码 Slot | 缺口需求描述 | 需求数量 | 目录中已放置的候选文件 |
| :--- | :--- | :--- | :--- | :--- |
| `插槽01_pink_粉红噪音_[需1个]` | `noiseType: 'pink'` | 1/f 功率谱粉红噪音实录，模拟人体呼吸气流阻力与肺泡摩擦 | 需 1 个 | `pink_noise.mp3`（解包高品质录音） |
| `插槽02_white_白噪音_[需1个]` | `noiseType: 'white'` | 全频段平坦白噪音实录，清爽开阔气道阻力声 | 需 1 个 | `white_noise.mp3`（解包高品质录音） |
| `插槽03_brown_布朗噪音_[需1个]` | `noiseType: 'brown'` | 1/f² 功率谱布朗红噪音实录，低频深沉温厚，安定神经 | 需 1 个 | `brown_noise.mp3`（解包高品质录音） |
| `插槽04_violet_紫噪音_[需1个]` | `noiseType: 'violet'` | f² 功率谱紫噪音实录，极高频空气丝鸣，清透晶莹 | 需 1 个 | `violet_noise.mp3`、`violet_noise.ogg`（维基共享实录，含无损） |
| `扩展备选_空气与环境噪音_[可选留]` | 扩展选配 | 真实微风、循环扇白噪、高压气流，用于未来丰富呼吸气流模式 | 可选 | `blue_noise.mp3`、`airflow_breeze.mp3`、`home_fan.mp3`、`mechanical_hiss.mp3` |

---

### 模块二：GRANULAR 微粒声学采样合成器
微粒采样合成器（`GranularChannel.ts` / `GranularSampleLibrary.ts`）的缺口分为两大类：

#### 分类 A：核心乐器插槽（原使用借用/替代音频，缺乏真实单音乐器）
* **原缺口根因**：原手碟（handpan）借用了水晶钵音频，卡林巴（kalimba）借用了八音盒，大提琴（celloPad）借用了小提琴，西藏大锣（tibetanGong）借用了颂钵。导致听感名不符实。

| 插槽目录 | 对应代码 Slot | 缺口需求描述 | 需求数量 | 目录中已放置的候选文件 |
| :--- | :--- | :--- | :--- | :--- |
| `插槽_handpan_手碟原声_D3_[需1个]` | `handpan` | D3 基音纯净手碟单音敲击实录，带 3.6s 纯净尾音淡出与五重谐波 | 需 1 个 | 1. `handpan_ding_d3.mp3`（推荐：单音敲击）<br>2. `handpan_hang_drum.mp3`（备选：全曲即兴长采样） |
| `插槽_kalimba_卡林巴琴_C4_[需1个]` | `kalimba` | C4 卡林巴拇指琴单音清脆拨奏，箱体共鸣温暖 | 需 1 个 | 1. `kalimba_pluck.mp3`（推荐：单音拨奏）<br>2. `kalimba_sample.mp3`（备选：多音阶采样） |
| `插槽_celloPad_大提琴弦_C3_[需1个]` | `celloPad` | C3 大提琴松香运弓长音实录，饱满低音微颤音 | 需 1 个 | 1. `cello_bowed_c3.mp3`（推荐：C3长音，Air Studios实录）<br>2. `cello_bowed_c4.mp3`（备选：C4中高音） |
| `插槽_tibetanGong_西藏大锣_G2_[需1个]` | `tibetanGong` | G2 仪式大铜锣深沉撞击实录，层层金属回响 | 需 1 个 | 1. `tibetan_ceremony_gong.mp3`（推荐：仪式单次撞锣）<br>2. `tibetan_vibrant_gong.mp3`（备选：超长双耳拍频） |
| `插槽_singingBowl_西藏颂钵敲击_[需1个]` | `singingBowl` | 尼泊尔纯铜颂钵单次木棒敲击实录，内壁悠长振鸣 | 需 1 个 | `singing_bowl_strike.mp3`（维基共享实录） |

#### 分类 B：自然微粒与声垫插槽（原工程写错路径导致物理文件丢失、完全静音）
* **原缺口根因**：原预设代码指向了不存在的 `./audio/ambient/ocean/01_deep_ocean.mp3`、`01_soft_rain.mp3` 等虚拟文件名，导致在浏览器和测试中直接触发静音 fallback。

| 插槽目录 | 对应代码 Slot | 缺口需求描述 | 需求数量 | 目录中已放置的候选文件 |
| :--- | :--- | :--- | :--- | :--- |
| `插槽_oceanTide_深海潮汐_[需1个]` | `oceanTide` | 纯净海潮拍岸与白浪退潮自然沙沙声 | 需 1 个 | `ocean_tide.mp3`（从解包素材精准提取并修复） |
| `插槽_forestRain_森林细雨_[需1个]` | `forestRain` | 雨滴洒落林间叶片与泥土的自然微粒 | 需 1 个 | `forest_rain.mp3`（从解包素材精准提取并修复） |
| `插槽_windBreeze_松涛微风_[需1个]` | `windBreeze` | 高山松林与原野草甸微风起伏气流 | 需 1 个 | `wind_breeze.mp3`（从解包素材精准提取并修复） |
| `插槽_singingForest_林海幽谷_[需1个]` | `singingForest` | 静谧晨曦林海鸟鸣啼啭 | 需 1 个 | `singing_forest.mp3`（从解包素材精准提取并修复） |
| `插槽_whaleSong_深海巨鲸_[需1个]` | `whaleSong` | 深海座头鲸幽鸣次低音 | 需 1 个 | `whale_song.mp3`（解包优质素材） |
| `插槽_shimmerCloud_流光云垫_[需1个]` | `shimmerCloud` | 纯净空间流动氛围声垫，非代码合成 | 需 1 个 | `shimmer_drone.mp3`（解包优质素材） |
| `插槽_modularSub_暗黑低音_[需1个]` | `modularSubDrone` | 深邃深渊低频驻波共鸣，非代码合成 | 需 1 个 | `modular_sub.mp3`（解包优质素材） |

#### 分类 C：已有解包素材的基础乐器插槽（完整就绪无缺口）
存放于目录：`03_已有解包素材的基础乐器插槽_完整就绪无缺口/`
包含：`crystal_bowl.mp3`、`singing_bowl.mp3`、`tibetan_bowl.mp3`、`meditation_bell.mp3`、`harp.mp3`、`piano.mp3`、`violin.mp3`、`sitar.mp3`、`organ.mp3`、`music_box.mp3`、`wind_chimes.mp3`、`flute.mp3`、`guitar.mp3`、`ukulele.mp3`、`drums.mp3`。这 15 款乐器全部完备，无需额外补充。

---

## 您的筛选操作方式

1. **直接进入各插槽文件夹**：双击试听该插槽内的候选音频；
2. **二选一或剔除**：
   - 例如在 `插槽_handpan_手碟原声_D3_[需1个]` 中，若您喜欢短单音 `handpan_ding_d3.mp3`，可直接删除长采样 `handpan_hang_drum.mp3`；
   - 在 `插槽04_violet_紫噪音_[需1个]` 中，可保留 `.mp3` 并删除备选的 `.ogg`；
   - 在 `扩展备选_空气与环境噪音_[可选留]` 中，如果觉得不需要风扇声或吸气声，可直接删除对应文件；
3. **完成告知**：在聊天窗口回复“**筛选完毕**”，系统将读取您最终留下的文件，自动执行 EBU R128 / RMS 响度均一化与等功率无缝循环交叠，并完成代码引擎无缝集成。
