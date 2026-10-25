# Synhale 代码审查与修复记录

日期：2026-10-19。范围：React 界面、Web Audio 图与调制、呼吸时钟、本地预设、音频文件导入、Electron 主进程/预加载桥、构建与依赖。

本次已落实代码修复并完成回归。原有中央倒计时、透明度与精度设置，以及 OSC A 的 0.5 输出增益调整均保留。此记录区分已验证结果与待验证边界，不代表已证明软件不存在任何漏洞。

## 按优先级落实的修复

P1 表示应优先处理的安全、音频状态或数据可靠性问题；P2 表示功能稳定性、交互和维护性问题。这里的优先级不是外部漏洞数据库的严重性评分。

| 优先级 | 原问题与影响 | 已落实修复 | 主要位置 |
| --- | --- | --- | --- |
| P1 | Electron 窗口操作未验证消息来源，外部协议与页面导航边界不足 | IPC 仅接受可信本地页面的主框架；阻止其他导航、子框架、webview 和子窗口；外部打开仅接受不含凭据的 HTTP/HTTPS URL；拒绝不需要的设备权限 | `electron/main.cjs` |
| P1 | 生产页面缺少内容安全策略 | 构建时加入 CSP，限制脚本和网络连接来源，禁止对象、框架、表单提交和修改 base URL；保留界面所需内联样式 | `vite.config.ts` |
| P1 | 振荡器处置顺序导致 stop 被提前返回；单个节点清理失败可能阻断其他清理 | 先停止再标记处置；引擎逐项释放资源；暂停和处置使尚未完成的 resume 失效 | `src/audio/engine.ts`、各声源节点 |
| P1 | 暂停后粒子调度可能重启；异步采样提示音可能晚到并在暂停后发声 | 粒子 purge/restore 状态独立；未缓存提示音按时使用合成回退；暂停时消退已播放的提示音 | `GranularChannel.ts`、`breathCuePlayer.ts` |
| P1 | 首次启动可能忽略播放前编辑的声音，构图阶段可能短暂输出默认声音 | 首次构图静音，加载当前界面参数和路由，再显式恢复；启动期间防止重复操作，失败可重试；提示音预加载复用引擎音频上下文 | `src/App.tsx`、`src/audio/engine.ts` |
| P1 | 异常数值、重复效果器 ID、循环对象和污染键可能进入音频/预设逻辑 | 过滤非有限数值和危险键，限制递归；效果器去重；修复预设字段类型、路由、阶段倍率与曲线 | `parameterSafety.ts`、`userPresets.ts`、`curveValidation.ts`、效果链 |
| P1 | 存储被禁用或额度耗尽时，部分保存操作仍表现为成功 | 读写统一防护；写入失败明确返回或抛错；界面保留编辑状态并显示失败原因；达到数量上限时不静默挤掉旧节律 | `safeStorage.ts`、各预设存储模块及对应界面 |
| P1 | 连续导入可并发解码；同毫秒样本 ID 冲突；跨采样率加载自定义样本变为静音 | 串行导入，卸载后禁止过期结果注册，唯一序号，直接复用原 AudioBuffer；64 MiB 文件上限，256 MiB 原始 PCM 会话预算，最多 128 个自定义样本；导入阶段不预制反向副本 | `GrainSourceVisualizer.tsx`、`GranularSampleLibrary.ts` |
| P1 | 开发依赖包含严重级安全告警 | Vitest 升级并锁定到 4.1.11；为 Tailwind 子依赖限定使用修复后的 postcss-selector-parser 7.1.6 | `package.json`、`package-lock.json` |
| P2 | 生产音频代码含 29 处识别 MockAudioContext、改写私有值或推进模拟时间的分支，降低测试可信度 | 删除这些分支；删除没有实际输出用途的 preMixBus 节点及连接；测试显式等待防爆音渐变，并验证真实路由节点 | 音频引擎、效果节点、相关测试 |
| P2 | 无效或倒退时间戳可重复计算时间；回调中暂停仍可能继续安排下一帧 | 校验时间戳和计数边界；循环代次校验阻止暂停/销毁后的重新调度；自动化配置不暴露工厂对象引用 | `src/breath/stateMachine.ts`、`engine.ts`、`storage.ts` |
| P2 | 环境音绝对资源路径在 Electron 文件页面下指向错误位置 | 改为相对资源路径 | `AmbientSoundscapeLibrary.ts` |
| P2 | 部分弹窗键盘焦点逃逸、叠层 Escape 相互干扰、旋钮长按计时器和试听上下文遗留 | 统一焦点约束与返回、仅关闭最上层弹窗、解除滚动锁；清理计时器/试听资源；文本输入中不执行曲线删除快捷键 | `useModalDialog.ts`、旋钮/推子、曲线与声音面板 |
| P2 | 倒计时透明度降为零时 Hook 顺序变化；隐藏后播放入口不明显；小屏标题栏溢出 | 稳定 Hook 顺序，增加明确的开始/暂停入口与准备状态；调整窄屏按钮和设置布局；完善键盘焦点与减少动态效果偏好 | 倒计时组件、`App.tsx`、`SettingsModal.tsx`、`index.css` |
| P2 | 启动器提前固定打开 3000 端口，端口被其他程序占用时会显示无关应用 | 两个启动器均交由 Vite 在监听成功后打开实际地址，保留端口自动避让 | `start.bat`、`start.ps1` |

## 验证结果

- 审查前基线：137 个测试文件，1117 项测试通过。
- 修复后：145 个测试文件，1151 项测试通过；新增 34 项回归测试，包含全部工厂音色参数的保存/加载一致性检查。
- TypeScript 检查及生产构建通过；差异空白检查通过。
- 浏览器实际操作：开始/暂停、倒计时隐藏/恢复、主题切换、设置关闭与焦点恢复均正常，检查期间无控制台错误或警告。
- 窄屏检查：375 px 与 320 px 下顶部操作完整可见，无页面水平溢出；设置弹窗可滚动，主题按钮不再挤成竖排文字。
- 桌面安全规则通过加载真实 `electron/main.cjs` 的隔离测试验证，包括 IPC 来源、导航、设备权限与外部协议限制。
- 主 JavaScript 从约 875 kB 拆分为应用、音频、视觉、React 四部分，最大块约 373 kB，消除大块构建警告。这是缓存和模块组织优化，不能解读为首屏总下载量同比下降。
- 单独升级样式解析器前后的 CSS SHA-256 完全相同；后续窄屏布局优化有预期样式变化。
- 启动入口补查：现场 3000 端口由 Antigravity 提供分子查看器，Synhale 实际运行于 3002；浏览器已确认正常 Synhale 页面。临时启动检查保留现有端口占用，捕获 Vite 自动打开回调，确认它在监听成功后使用实际分配的 3003 地址，且该地址返回 Synhale 页面；临时服务检查后关闭。PowerShell 启动器语法检查通过。

主要新增测试：`tests/unit/appPlayback.spec.tsx`、`tests/unit/audio/auditSafety.spec.ts`、`storageAudit.spec.ts`、`customSampleSafety.spec.ts`、`tests/unit/breath/auditSafety.spec.ts`、`tests/unit/electron/security.spec.ts`、`tests/unit/ui/modalDialog.spec.tsx`、`audioImportSafety.spec.tsx`。

复现：`npm test`、`npm run build`、`npm audit --registry=https://registry.npmjs.org`、`npm audit --omit=dev --registry=https://registry.npmjs.org`。审查产生的日志保存在忽略跟踪的 `scratch/` 目录。

## 尚存依赖告警

截至本次官方 npm registry 审计：受影响依赖项从 **18 项（2 critical / 5 high / 11 moderate）** 降为 **13 项（0 critical / 5 high / 8 moderate）**。这是含传递依赖的受影响包数量，不能当作 13 个独立漏洞。`--omit=dev` 审计为 **0 项**。

| 上游包 | 告警与调用范围 | 本次处理与后续工作 |
| --- | --- | --- |
| braces ≤ 3.0.3 | 深层嵌套模式可导致栈耗尽，经 Tailwind 的扫描/监听链传播 | 当前版本线没有已发布修复；保留现有构建兼容性。后续迁移 Tailwind 4 时需检查完整样式输出与界面行为 |
| sprintf-js ≤ 1.1.3 | 不受限精度格式可能造成拒绝服务，经 electron-builder 的下载/代理日志依赖链传播 | 当前版本线没有已发布修复；不采用审计工具建议的 electron-builder 大跨度回退。等待上游修复或针对构建链单独替换 |

这些问题位于开发、测试或打包链，不是浏览器运行时业务依赖；开发环境仍有暴露面，不能据此视为零风险。Electron 自身虽然列在 devDependencies，实际也是桌面运行时；上述 `--omit=dev` 结果不是 Electron 安全认证。

参考：[Electron 官方安全建议](https://www.electronjs.org/docs/latest/tutorial/security/)、[braces 上游公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)、[sprintf-js 上游公告](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)、[样式解析器修复记录](https://github.com/postcss/postcss-selector-parser/blob/main/CHANGELOG.md)、[Vitest 文件读取问题](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)。

## 验证边界与后续产品建设

### 后续界面调整（用户指定）

已移除本轮曾添加的顶部开始/暂停按钮及品牌旁的 `432Hz CORE` 标签，保留中心图形和数字的播放操作及重复启动防护。和弦模式选项从 8px 调整到 11px，加大按钮高度；浅色主题使用深色文字，深色主题单独配色，较长的 SACRED 选项占两列。更新现有播放测试的操作入口，4 个相关测试文件共 40 项通过，类型检查和生产构建通过。浏览器已检查浅色、深色主题和 375px 窄屏，和弦文字未被裁切。

### 尚未覆盖的验证

本次没有重新生成和安装签名的 Electron 安装包，也没有完成不同声卡、蓝牙设备、系统休眠及多小时连续播放的硬件测试。模拟 Web Audio 测试验证调度和节点状态，无法替代真实输出的峰值、爆音、声道一致性与听感测量。

自定义导入音频仍是会话内资源，声音预设保存其参数与样本引用，不保存文件内容。本次在保存界面补充了这一说明。后续应将样本持久化、丢失样本重连和项目导出设计为一个完整功能。导入预算限制注册后的 PCM 留存量；压缩文件解码的瞬时内存仍取决于浏览器和原始音频，不能视为解码过程的硬内存隔离。

产品后续优先级：先建立真实离线音频渲染与桌面发布冒烟验证，再完成样本与项目持久化，随后逐步拆分体积较大的 App 与 HardwareDeck。保持现有音色、路由和呼吸行为可比对后再做大范围结构调整。
