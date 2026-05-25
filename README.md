> **本项目基于 [floral-notepaper](https://github.com/Achilng/floral-notepaper) 二次开发，原始代码采用 MIT 许可证，原始版权归 Achilng 所有。修改部分版权归 Maplar 所有。**

# 星座

星座是一款基于 Tauri 2 + React 构建的轻量、优雅、现代化的本地便签工具。

> 本仓库为二次开发版本，新增分类管理、多窗口池、自动保存、外部文件引用、AI 总结、PDF 导出等功能，并规划了图谱关系升级等模块。

## 功能特性

- **Markdown 编辑与预览** — 支持 GitHub Flavored Markdown 语法，三模式切换（编辑 / 分栏 / 预览）
- **分类管理** — 文件夹子目录分类，支持新建、重命名、删除，笔记拖拽移动分类
- **快捷便签** — 全局快捷键（Ctrl+Space）唤出独立极简编辑器：独立标题输入+正文编辑区、自动预创建笔记、900ms 自动保存、窗口池预热复用（`notepad:activate` 确保每次全新空白）、一键关闭回池或转为磁贴、冷灰调独立视觉风格（#f3f5f8 / 钢蓝 accent）
- **磁贴模式** — 将笔记固定在桌面某处，置于顶层，支持跟随系统主题颜色 + 深色模式自动适配（#191919），四角 SVG 角标，chroma-js 动态颜色混合，磁贴生命周期事件（`tile-window-closed` / `tile-window-unpinned`）
- **自动保存** — 主窗口笔记与小窗笔记均支持 900ms 防抖自动保存
- **外部文件引用** — 直接打开系统中任意 `.md` 文件，无需导入即可编辑
- **导入导出** — 支持 `.md` 文件的导入和导出，可设为系统默认 Markdown 编辑器
- **托盘菜单** — 关闭到托盘、开机自启、快速记录
- **沉浸式标题栏** — 自绘窗口控制区域（无边框风格），支持最小化/最大化/关闭，顶栏可拖拽移动
- **Wiki-Link 解析** — 支持 `[[笔记标题]]` 和 `[[笔记标题|别名]]` 语法，自动解析笔记间引用关系
- **文件关系图谱** — 基于 d3-force 的 2D 力导向图谱，节点按引用次数线性映射 8~40px（d3.scaleLinear），分类填色（colorMap 10 色调色板 + 暗色模式自适应），白色 2px 描边，标签置顶 4px（11px / var(--text-primary) / 8 字截断），贝塞尔曲线边 + 方向箭头，hover 节点 1.2x + 关联节点 1.1x + 关联边加粗高亮，点击联动 store.setSelectedNode，GraphToolbar（36px / 力强度 0.1~2.0 / 重置）
- **思维导图星系** — React SVG 组件化星系：StarNode（r:30px, CSS @keyframes pulse 呼吸动画 3s, 白描边 2px, d3-drag 可拖拽, 点击聚焦）、PlanetNode（r:6~18px d3.scaleLinear 按引用映射, SVG`<title>` 悬停标题, 白描边 1.5px）、OrbitRing（虚线圆 `stroke:var(--border) stroke-dasharray:4 4`）、GalaxyCanvas（全尺寸 SVG, 恒星圆周布局 + 行星多层环均匀分布, 跨分类贝塞尔虚线连线, 点击恒星聚焦 opacity 0.2 过渡, 缩放 0.2~3x + 平移）
- **引用星团图** — 基于 d3-force 的 2D 力导向引用关系图，展示笔记间引用网络，支持简化模式嵌入卡片
- **图谱仪表盘** — 动态卡片网格（ResizeObserver 1/2/3 列自适应）：统计概览合并卡片、文件关系图、思维导图星系、星团图、分类分布环形图、引用排行；仪表盘编辑模式（TopBar 铅笔按钮切换，编辑模式下卡片显示红色 × 直删 + 底部「添加组件/保存布局」按钮）
- **搜索增强** — 基于 Fuse.js 的模糊搜索 + 图谱节点高亮：2D 关系图 d3 选择器绿色描边高亮匹配节点 + 星系图行星 fill 颜色变化
- **AI 总结** — 支持配置 OpenAI 风格 API，一键对当前笔记生成智能摘要，API Key 本地加密存储
- **一键导出 PDF** — 将当前笔记导出为 PDF 文件，保留 Markdown 样式（代码高亮、表格、图片），支持分页
- **品牌安装界面** — 基于 NSIS 的中国风安装/卸载向导，毛笔字体标题、水墨装饰、篆刻印章，与应用 UI 颜色系统统一
- **跨平台适配** — 支持 Windows/macOS/Linux 桌面端与 Android/iOS 移动端，UI 根据平台自动调整（底部 TabBar、触控优化、侧栏抽屉）
- **全局模式切换** — 48px IconSidebar 常驻左侧，编辑模式（笔记列表+编辑器）与仪表盘模式（图谱网格）一键切换；仪表盘卡片支持拖拽排序 + localStorage 布局持久化

## 技术架构

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React | ^19.1.0 |
| 桌面壳 | Tauri | v2 |
| 样式 | TailwindCSS | ^4.3.0 |
| 构建 | Vite | ^7.0.4 |
| 语言 (前端) | TypeScript | ~5.8.3 |
| 语言 (后端) | Rust | 1.95.0 |
| 测试 | Vitest | ^4.0.0 |
| 状态管理 | Zustand | ^5.0.13 |
| Markdown | react-markdown + remark-gfm + remark-wiki-link | — |
| PDF 导出 | html2pdf.js | ^0.14.0 |
| 可视化 | d3-force（2D 力导向图谱） | — |
| 搜索 | Fuse.js | ^7.3.0 |
| AI | openai (npm) + fetch | — |
| 存储加密 | tauri-plugin-store | v2 |

### Tauri 插件

| 插件 | 用途 |
|------|------|
| `tauri-plugin-opener` | 用系统默认程序打开文件/URL |
| `tauri-plugin-dialog` | 文件选择对话框 |
| `tauri-plugin-single-instance` | 单实例限制 + CLI 文件参数转发 |
| `tauri-plugin-autostart` | 开机自启动（通过 desktop.rs） |
| `tauri-plugin-global-shortcut` | 全局快捷键注册（通过 desktop.rs） |

### 安装程序

安装界面采用 V5 中国风雅韵风格，资源文件位于 `src-tauri/icons/nsis/`。

| 资源 | 文件 | 说明 |
|------|------|------|
| 顶部横幅 | `header.bmp` | 150×57 像素，项目名 + 篆刻印章装饰 |
| 侧边栏 | `sidebar.bmp` | 164×314 像素，水墨山水 + 印章 + slogan |
| 安装图标 | `installer-icon.ico` | 篆刻印章风格的安装程序图标 |

SVG 源文件和转换说明见 `src-tauri/icons/nsis/CONVERT.md`。

### 架构概览

```
前端 (React + TypeScript)              后端 (Rust + Tauri)
─────────────────────────              ─────────────────────
src/
├── App.tsx          入口路由          src-tauri/src/
├── main.tsx         React DOM 挂载    ├── lib.rs        命令注册+事件+插件
├── components/      UI 组件层         ├── desktop.rs    桌面平台逻辑
│   ├── MainWindow   主窗口           │   (多窗口、托盘、快捷键、自启)
│   ├── NotePad      便签小窗         ├── main.rs       入口
│   ├── Tile         磁贴组件         └── services/
│   ├── TileShowcase 磁贴窗口             └── notes.rs   笔记存储引擎
│   ├── SettingsPanel 设置面板              (CRUD、元数据、配置持久化)
│   ├── ContextMenu  右键菜单
│   ├── SlidingButtonGroup 滑动按钮组
│   ├── IconSidebar  模式切换侧栏（48px）
│   ├── TopBar       顶栏（标题+搜索+窗口控制）
│   ├── TopBarSearch 顶栏搜索框
│   ├── NoteListPanel 笔记列表侧栏（提取组件）
│   ├── EditorLayout 编辑布局（NoteListPanel+编辑器）
│   ├── DashboardCard  仪表盘卡片（hover 关闭按钮）
│   └── DashboardView 仪表盘视图
└── features/        功能模块
    ├── notes/       笔记 API + 工具函数
    ├── settings/    配置 API + 主题/颜色
    ├── windows/     多窗口 API + 控制
    ├── markdown/    Markdown 预览
    └── importExport/ 导入导出 API
```

**事件通信**：后端通过 Tauri `emit` 向前端广播 `notes-changed`、`config-changed`、`open-external-file` 事件，前端通过 `listen` 订阅。

## 核心数据模型

| 类型 | 文件路径 | 字段摘要 |
|------|----------|----------|
| `NoteMetadata` | `src/features/notes/types.ts:1-10` | id, title, fileName, category, createdAt, updatedAt, wordCount, preview |
| `Note` | `src/features/notes/types.ts:12-14` | 继承 NoteMetadata（不含 preview），增加 content |
| `SaveNoteRequest` | `src/features/notes/types.ts:16-20` | title, content, category |
| `ExternalFile` | `src/features/notes/types.ts:22-26` | id（文件路径）, title, filePath |
| `AppConfig` | `src/features/settings/types.ts:7-20` | notesDir, globalShortcut, closeToTray, autostart, defaultViewMode, noteAutoSave, noteSurfaceAutoSave, tileColor, tileColorMode, theme, fontSize, surfaceFontSize |
| `CategoryGroup` | `src/features/notes/noteUtils.ts:38-42` | category, notes[], latestUpdatedAt |
| `AppRoute` | `src/features/windows/windowRoutes.ts:3-6` | view ("main" / "notepad" / "tile" / "graph"), noteId? |
| `WikiLink` | `src/modules/shared/types/notes.ts:38-43` | sourceNoteId, targetTitle, alias, rawText |
| `GraphNode` | `src/modules/shared/types/notes.ts:45-52` | id, label, val, color, noteId, x?, y? |
| `GraphEdge` | `src/modules/shared/types/notes.ts:54-59` | source, target, label, value |
| `LinkGraph` | `src/modules/shared/types/notes.ts:61-64` | nodes: GraphNode[], edges: GraphEdge[] |
| `NoteStore` | `src/modules/notes/stores/useNoteStore.ts` | Zustand store（notes, wikiLinks, linkGraph, loadNotes, rebuildGraph） |

**存储方式**：笔记以 `<uuid>_<safe_title>.md` 文件存储在按分类划分子目录的文件夹中，元数据聚合在 `metadata.json`。配置保存在 `config.json`。默认数据目录为 `%USERPROFILE%\Documents\星座`。

## 模块完成度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| **笔记 CRUD** | 100% | 创建、读取、更新、删除，前端 API + Rust 后端完整 |
| **分类管理** | 100% | 增删改查分类，笔记拖拽移动，元数据同步 |
| **配置持久化** | 100% | 读写 config.json，修改后同步运行时（快捷键/自启） |
| **多窗口** | 100% | QuickNote 独立便签（冷灰调视觉+窗口池复用+`recycleCurrentNotepad`）、磁贴窗口、自定义标题栏拖拽 |
| **托盘** | 100% | 菜单项完整（显示、快速记录、开关键盘启动、退出） |
| **全局快捷键** | 100% | Ctrl+Space 唤出快捷便签，窗口池预热 2 个实例，`notepad:activate` 事件确保每次全新空白 |
| **导入导出** | 100% | Markdown 双向导入导出，文件对话框集成 |
| **外部文件引用** | 100% | 直接读写外部 .md 文件 |
| **搜索** | 100% | 基于 Fuse.js 实现模糊搜索，支持相关性排序和关键词高亮 |
| **AI 客户端** | 100% | 支持用户自定义 API Key，可对笔记内容进行 AI 总结 |
| **AI 面板** | 100% | 模态框展示总结结果，支持复制到剪贴板 |
| **Markdown→PDF** | 100% | 基于 html2pdf.js 实现，支持样式保留和分页 |
| **图谱仪表盘** | 100% | 1/2/3 列自适应卡片网格，统计概览合并卡片，编辑模式（铅笔按钮一键切换卡片添加/直删），拖拽排序+localStorage 布局持久化，AddComponentDrawer 右侧抽屉 |
| **文件关系图谱** | 100% | 2D 力导向图，节点 8~40px 白色 2px 描边，11px 标签截断 8 字，贝塞尔曲线边+箭头，光晕效果，hover 高亮关联路径+tooltip，300ms 切换动画，力强度滑块 |
| **思维导图星系** | 100% | 恒星（r:30px 呼吸脉动）/行星（r:6~18px）/轨道线拆分组件，d3-force 模拟，展开距离/轨道密度滑块，轨道/连线开关，点击聚焦分类，flow 动画，activeFilters 联动 |
| **引用星团图** | 100% | 2D 力导向引用关系图，力强度可调，简化模式嵌入卡片 |
| **磁贴系统** | 100% | 基于 chroma-js 动态颜色混合 + 四角 SVG 角标 + 磁贴生命周期事件（`tile-window-closed` / `tile-window-unpinned`）+ 原 Achilng 颜色算法对齐（luminance 0.18 + chroma.mix.alpha） |
| **移动端** | 85% | 底部 TabBar、侧栏抽屉适配、触控优化、核心功能可用（磁贴/便签窗口暂不适用） |
| **平台抽象层** | 100% | `src/modules/shared/platform/` 提供平台检测、usePlatform Hook、响应式尺寸订阅 |
| **全局布局系统** | 100% | IconSidebar、TopBar（无边框窗口控制按钮+仪表盘编辑切换按钮）、DashboardView（1/2/3列自适应+拖拽排序+持久化+编辑模式直删+底部操控栏）、DashboardCard（hover关闭/编辑直删+draggable）、SummaryStatsCard（合并统计）、tileWindowEvents（磁贴生命周期）；useAppModeStore（含 isEditingDashboard）；React.lazy+ErrorBoundary |

## 项目结构

```
floral-notepaper/
├── src/                              # 前端源码
│   ├── main.tsx                      # React 入口
│   ├── App.tsx                       # 根组件（路由分发）
│   ├── App.css
│   ├── vite-env.d.ts
│   ├── components/                   # UI 组件（重构过渡期保留）
│   ├── features/                     # 功能模块（重构过渡期保留）
│   └── modules/                      # ★ 新模块化目录
│       ├── shared/                   # 跨模块共享
│       │   ├── types/                # 全局类型（notes.ts, settings.ts）
│       │   ├── platform/             # 平台抽象层（types.ts, index.ts, usePlatform.ts）
│       │   ├── stores/               # 全局 stores（useAppModeStore.ts）
│       │   ├── hooks/                # 通用 hooks
│       │   ├── utils/                # 通用工具（noteUtils.ts, highlightUtils.tsx）
│       │   └── components/           # 通用 UI（ContextMenu, SlidingButtonGroup, MobileTabBar, MobileBottomSheet）
│       ├── notes/                    # 笔记管理模块
│       │   ├── components/           # MainWindow, MarkdownPreview, ForceGraph2D, GraphView
│       │   ├── stores/               # Zustand store（useNoteStore.ts）
│       │   ├── services/             # 搜索服务（searchService.ts）、AI 服务（aiService.ts）、PDF 导出（pdfExportService.ts）
│       │   ├── hooks/                # useGraphData, useNotes, useDebounce
│       │   ├── api/                  # 笔记 CRUD + 导入导出 API
│       │   ├── linkParser.ts         # Wiki-Link 解析器
│       │   └── noteContextMenu.ts    # 右键菜单
│       ├── windows/                  # 窗口管理模块
│       │   ├── components/           # NotePad, Tile, TileShowcase
│       │   ├── stores/               # 窗口池状态
│       │   ├── api.ts                # 多窗口 API
│       │   ├── controls.ts           # 窗口控制
│       │   ├── surfaceMode.ts        # 便签↔磁贴切换
│       │   ├── surfaceActions.ts     # 右键操作
│       │   ├── tileContextMenu.ts    # 磁贴菜单
│       │   ├── tileWindowEvents.ts   # 磁贴生命周期事件
│       │   ├── noteSurfaceSavePolicy.ts
│       │   └── windowRoutes.ts       # 视图路由
│       ├── settings/                 # 设置模块
│       │   ├── components/           # SettingsPanel
│       │   ├── api.ts, theme.ts, tileColor.ts
│       │   └── types.ts
│       └── visualization/            # 可视化模块
│           ├── components/
│           │   ├── GraphDashboard    # 仪表盘主布局（StatsBar + 画布 + 底部控制栏）
│           │   ├── GraphSidebar      # 侧边栏（视图切换 + 分类筛选 + 图例 + 统计）
│           │   ├── cards/            # 卡片内容组件（RelationGraphCard, GalaxyCard, CategoryDonutCard, CitationRankingCard, SummaryStatsCard）
│           │   ├── RelationGraph/    # 文件关系图（GraphToolbar: 2D/3D 切换+力强度滑块+重置）
│           │   ├── MindMapGalaxy/    # 思维导图星系（GalaxyCanvas+GalaxyToolbar+StarNode+PlanetNode+OrbitRing）
│           │   └── shared/           # CanvasContainer, HoverTooltip
│           ├── stores/               # useGraphStore（graphParams, activeFilters, 模式切换）+ useVisualizationStore（卡片管理）
│           ├── hooks/                # useGalaxyLayout, useVisibility
│           └── utils/                # colorMap（分类颜色映射）
├── src-tauri/                        # Rust 后端
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── LICENSE                           # MIT License
└── README.md
```

## 环境要求

| 工具 | 版本（开发实测） |
|------|-----------------|
| Node.js | v24.15.0（最低 18） |
| Rust (rustc) | 1.95.0 |
| Cargo | 1.95.0 |
| 操作系统 | Windows 11（其他系统未验证） |

## 开发指南

```bash
git clone https://github.com/Achilng/floral-notepaper.git
cd floral-notepaper

npm install

# 开发模式（启动 Vite + Tauri）
npm run tauri dev

# 运行测试
npm run test

# 构建发布版本
npm run tauri build
```

构建产物输出到 `src-tauri/target/release/bundle/`。

开发服务器端口为 `http://localhost:1420`，Tauri 配置的窗口初始大小为 1180×760（最小 900×620）。

## 许可证

本项目基于 [MIT 许可证](LICENSE)。原始版权归 [Achilng](https://github.com/Achilng) 所有，二次开发修改部分版权归 Maplar 所有。
