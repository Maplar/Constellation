> **本项目基于 [floral-notepaper](https://github.com/Achilng/floral-notepaper) 二次开发，原始代码采用 MIT 许可证，原始版权归 Achilng 所有。修改部分版权归 Maplar 所有。**

# 星座

## 项目愿景

**Constellation 要做 Obsidian 的同行者**，而不是追随者。

我们相信：
- 知识库应该**本地优先**，数据完全由用户掌控；
- **AI 辅助**不应以隐私为代价，因此我们选择了完全离线的本地语义搜索；
- **思维导图**与笔记应该无缝融合，而不是通过插件拼凑；
- **同步**应该自由选择（WebDAV、NAS、Git），而不是被绑定在官方云服务上；
- 桌面端体验打磨到极致后，再**整体移植**到移动端，拒绝移动端的"文件管理器式操作"。

Constellation 不会试图复制 Obsidian 的一切，而是聚焦于那些真正提升创作与链接效率的特性，成为你知识管理中值得信赖的伙伴。

> 本仓库为二次开发版本，新增分类管理、多窗口池、自动保存、外部文件引用、AI 总结、PDF 导出等功能，并规划了图谱关系升级等模块。

## 项目路线图与对比

### 已实现 / 规划中的核心优势（vs Obsidian）

| 维度 | Constellation | Obsidian |
|------|---------------|----------|
| 开源协议 | MIT（完全自由） | 闭源核心，部分开源 |
| 思维导图原生集成 | ✅ 导入/导出 .xmind/.mm，树状图编辑，星环联想卡片 | ❌ 需第三方插件 |
| AI 本地语义搜索 | ✅ 规划中（完全离线，transformers.js + lancedb） | ❌ 需云端 API 或社区插件 |
| 自托管同步 | ✅ 规划中（WebDAV 协议，NAS 友好） | ⚠️ 官方同步收费，自托管需插件 |
| 可选本地加密 | ✅ 规划中（AES‑256‑GCM，默认关闭） | ❌ 仅社区插件 |
| 轻量化便签/磁贴 | ✅ 已完成 | ❌ 无 |
| 智能引用 / 右键引用 | ✅ 已完成 | ⚠️ 需插件 |

### 仍需补全的关键能力（未来迭代）

| 能力 | 优先级 | 说明 |
|------|--------|------|
| 插件系统 | 🔴 高 | 设计简化的插件 API（基于 WebView + 脚本注入） |
| 性能优化（大规模笔记） | 🔴 高 | 力导向图 Web Worker + Canvas，搜索索引持久化 |
| 移动端完整体验 | 🟠 中 | Win 端完善后整体移植（Capacitor 或 Tauri 移动端） |
| 日记 / 模板系统 | 🟡 中 | 内置模板语法（如 `{{date}}`） |
| 实时预览（所见即所得） | 🟡 中 | 编辑区即时渲染（类似 Typora） |
| 画布（Canvas）白板 | 🟢 低 | 基于现有可视化技术实现 |
| URL Scheme / 深度链接 | 🟢 低 | `constellation://` 协议 |

### 成为同行者的路线图

| 阶段 | 核心任务 | 目标版本 |
|------|----------|----------|
| **当前** | P0~P4（智能引用、节点提示、思维导图、星环视图、关系卡片） | v1.0 |
| **2024 Q3** | P5 AI 语义搜索 + P6 WebDAV 同步 + 可选加密 | v1.5 |
| **2024 Q4** | 性能优化（大规模图谱） + 移动端基础适配 | v2.0 |
| **2025 Q1** | 插件系统 MVP | v2.5 |
| **2025 Q2** | 日记/模板、实时预览增强、画布（可选） | v3.0 |

> Constellation 不做 Obsidian 的模仿者，而是走一条差异化的路：本地优先、AI 离线、思维导图原生、同步自由。欢迎加入我们的旅程。

## 功能特性

- **Markdown 编辑与预览** — 支持 GitHub Flavored Markdown 语法，三模式切换（编辑 / 分栏 / 预览）
- **多态预览** — 预览视图支持三种模式自由切换：标准 Markdown 渲染、文件关系卡片（展示当前笔记的引用网络）、星环联想卡片（展示与当前笔记关联的思维导图星系视图），满足不同场景下的信息消费需求。
- **分类管理** — 文件夹子目录分类，支持嵌套层级（如 `技术/前端`），支持新建、重命名、删除，笔记拖拽移动分类
- **增强分类管理** — 笔记列表区顶部增加「新建文件夹」按钮，快速创建多级分类目录。每个文件夹旁显示自定义色块（或文件夹周围环绕色带），不同文件夹内的笔记在关系图谱、星团图中以对应颜色标识，实现跨文件夹引用关系的直观可视化。支持右键文件夹打开颜色选择器（色轮+RGB滑块+12预设色），自定义颜色自动持久化并实时应用到所有图谱节点
- **快捷便签** — 全局快捷键（Ctrl+Space）唤出独立极简编辑器：独立标题输入+正文编辑区、自动预创建笔记、900ms 自动保存、窗口池预热复用（`notepad:activate` 确保每次全新空白）、一键关闭回池或转为磁贴、冷灰调独立视觉风格（#f3f5f8 / 钢蓝 accent）、**快捷便签不再创建独立子文件夹**
- **磁贴模式** — 将笔记固定在桌面某处，置于顶层，支持跟随系统主题颜色 + 深色模式自动适配（#191919），rounded-2xl 圆角（16px） + 柔和阴影，**8 方向边缘 & 对角缩放手柄**（N/S/E/W + NW/NE/SW/SE 共 8 个柄），四角 SVG 角标，chroma-js 动态颜色混合，磁贴生命周期事件（`tile-window-closed` / `tile-window-unpinned`）
- **自动保存** — 主窗口笔记与小窗笔记均支持 900ms 防抖自动保存
- **外部文件引用** — 直接打开系统中任意 `.md` 文件，无需导入即可编辑
- **导入导出** — 支持 `.md` 文件的导入和导出，可设为系统默认 Markdown 编辑器
- **托盘菜单** — 关闭到托盘、开机自启、快速记录
- **沉浸式标题栏** — 自绘窗口控制区域（无边框风格），支持最小化/最大化/关闭，顶栏可拖拽移动
- **Wiki-Link 解析** — 支持 `[[笔记标题]]` 和 `[[笔记标题|别名]]` 语法，自动解析笔记间引用关系
- **文件关系图谱** — 基于 d3-force 的 2D 力导向图谱，节点按引用次数线性映射 8~40px（d3.scaleLinear），分类填色（colorMap 10 色调色板 + 暗色模式自适应），白色 2px 描边，标签置顶 4px（11px / var(--text-primary) / 8 字截断），贝塞尔曲线边 + 方向箭头，hover 节点 1.2x + 关联节点 1.1x + 关联边加粗高亮，点击联动 store.setSelectedNode，GraphToolbar（36px / 力强度 0.1~2.0 / 重置）
- **思维导图星系** — React SVG 组件化星系：StarNode（r:30px, CSS @keyframes pulse 呼吸动画 3s, 白描边 2px, d3-drag 可拖拽, 点击聚焦）、PlanetNode（r:6~18px d3.scaleLinear 按引用映射, SVG`<title>` 悬停标题, 白描边 1.5px）、OrbitRing（虚线圆 `stroke:var(--border) stroke-dasharray:4 4`）、GalaxyCanvas（全尺寸 SVG, 恒星圆周布局 + 行星多层环均匀分布, 跨分类贝塞尔虚线连线, 点击恒星聚焦 opacity 0.2 过渡, 缩放 0.2~3x + 平移）
- **思维导图文件格式** — 支持导入/导出标准思维导图格式（如 `.xmind`、`.mm` 或自定义 JSON），并在星系视图中自动解析为恒星‑行星结构。星环可视化卡片可直接关联并渲染本地思维导图文件，实现大纲笔记与脑图的一体化。
- **关系卡片** — 预览区新增关系卡片模式，展示当前笔记的引用网络：分为"引用此笔记"（incoming）和"此笔记引用"（outgoing）两个列表，列表项为笔记标题，点击可跳转，支持 O(1) 查询优化
- **星环视图** — 预览区新增星环联想卡片模式：中心节点（当前笔记或思维导图根标题）固定画布中央，子节点围绕中心排列在圆形轨道上，节点形状根据引用关系自动变化（圆形=非叶子、方形=叶子、三角形=被引用、六边形=双向引用），最多显示 16 个节点，超出显示"更多"按钮，支持右键关联/取消关联笔记
- **思维导图编辑器** — 独立树状图编辑组件，使用 react-d3-tree 实现，支持添加/删除/重命名节点、拖拽调整父子关系、导入导出（.xmind/.mm/.json），保存后自动同步星环视图
- **引用连线样式** — 关系图谱中支持实线/虚线区分引用类型：笔记→笔记（Wiki-Link）为实线，同一思维导图内叶子节点相互引用为实线（跨文件引用为虚线，第一版暂缓实现）
- **深色模式对比度优化** — 所有图谱节点自动检测 WCAG AA 对比度标准（3:1），对比度不足时自动调整亮度并添加轮廓边，确保深色/浅色模式下均可读
- **节点智能提示** — 在关系图谱、思维导图星系、引用星团图中，鼠标悬浮任意圆形节点时，在光标附近显示半透明卡片（笔记文件名、分类、引用次数），鼠标离开后 0.15s 淡出消失；点击节点时在图谱顶部固定显示当前选中节点文件名，支持一键清除；提示框自动检测视口边缘不超出屏幕，深色/浅色主题自动适配，支持 aria-live 无障碍访问
- **引用星团图** — 基于 d3-force 的 2D 力导向引用关系图，展示笔记间引用网络，支持简化模式嵌入卡片
- **节点智能提示** — 在关系图谱、思维导图星系、引用星团图中，鼠标悬浮或点击任意圆形节点时，于光标右上角（或卡片顶部固定区域）实时显示该节点对应的笔记文件名，提升大规模图谱的可读性。
- **图谱仪表盘** — 动态卡片网格（ResizeObserver 1/2/3 列自适应）：统计概览合并卡片、文件关系图、思维导图星系、星团图、分类分布环形图、引用排行；仪表盘编辑模式（TopBar 铅笔按钮切换，编辑模式下卡片显示红色 × 直删 + 底部「添加组件/保存布局」按钮）
- **搜索增强** — 基于 Fuse.js 的模糊搜索 + 图谱节点高亮：2D 关系图 d3 选择器绿色描边高亮匹配节点 + 星系图行星 fill 颜色变化；顶部搜索框全局搜索所有分类，侧边栏搜索框仅搜索当前文件夹及子文件夹内的笔记
- **智能引用** — 三种场景快速插入 `[[笔记标题]]` 引用：①编辑器正文右键菜单→弹出笔记选择器→选择插入；②左侧笔记列表条目右键→「引用笔记」→直接插入；③顶部/侧边栏搜索结果条目右键→直接插入引用。笔记选择器支持模糊搜索过滤、键盘导航、边界检测
- **AI 总结** — 支持配置 OpenAI 风格 API，**流式生成**（SSE + AbortController 逐字渲染 + 随时停止），一键对当前笔记生成智能摘要，API Key 本地加密存储
- **AI 语义搜索** — 基于本地向量数据库的智能检索：使用 `transformers.js` 运行 `all-MiniLM-L6-v2` 嵌入模型（首次使用下载约 80MB，完全离线），笔记内容实时向量化并存储于 `.vectors/` 目录；支持自然语言查询（如"上周写的关于 React 性能优化的笔记"），返回相似笔记列表；编辑器输入 `[[` 时根据当前笔记内容智能推荐最相关的笔记标题，帮助快速建立知识链接。
- **NAS 自托管同步** — 支持 WebDAV 协议，兼容群晖、QNAP、Nextcloud 等 NAS 及任意 WebDAV 服务。用户配置后自动双向同步笔记目录（增量同步、冲突处理）；后续规划支持 Git 远程仓库同步。所有数据同步由用户自主控制，无需官方云服务。
- **可选本地加密** — 使用 `tauri-plugin-stronghold` 提供可选的笔记库加密功能（AES-256-GCM + 用户密码派生密钥）。加密后即使磁盘被读取也无法解析笔记内容。该功能**默认关闭**，用户可自行在设置中开启并设置密码，适用于共享设备或敏感笔记场景。
- **一键导出 PDF** — 将当前笔记导出为 PDF 文件，保留 Markdown 样式（代码高亮、表格、图片），支持分页
- **品牌安装界面** — 基于 NSIS 的中国风安装/卸载向导，毛笔字体标题、水墨装饰、篆刻印章，与应用 UI 颜色系统统一
- **跨平台适配** — 支持 Windows/macOS/Linux 桌面端与 Android/iOS 移动端，UI 根据平台自动调整（底部 TabBar、触控优化、侧栏抽屉）
- **全局模式切换** — 48px IconSidebar 常驻左侧，编辑模式（笔记列表+编辑器）与仪表盘模式（图谱网格）一键切换；仪表盘卡片支持拖拽排序 + localStorage 布局持久化 + **版本自动迁移**
- **文件变更监听** — 后台基于 `notify` crate 监听笔记目录文件系统事件，外部编辑器修改 `.md` 后自动触发 `notes-changed` 事件刷新列表，300ms 防抖

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
| 图标库 | lucide-react | ^0.344.0 |
| 拖拽排序 | @dnd-kit/sortable | ^7.0.0 |
| 测试工具 | @testing-library/react | ^14.0.0 |
| 日期处理 | dayjs | ^1.11.0 |
| Markdown | react-markdown + remark-gfm + remark-wiki-link | — |
| PDF 导出 | html2pdf.js | ^0.14.0 |
| 可视化 | d3-force（2D 力导向图谱） | — |
| 思维导图解析 | jszip（.xmind 解压） | ^3.10.1 |
| 思维导图编辑 | react-d3-tree（树状图布局） | ^3.6.1 |
| 搜索 | Fuse.js | ^7.3.0 |
| AI | openai (npm) + fetch | — |
| 存储加密 | tauri-plugin-store | v2 |
| 向量嵌入 | transformers.js（WebAssembly） | — |
| 向量数据库 | lancedb（Rust 后端嵌入式，通过 Tauri 命令调用） | — |
| 同步协议 | webdav-client（WebDAV 客户端库） | — |
| 加密存储 | tauri-plugin-stronghold | v2 |

### Tauri 插件

| 插件 | 用途 |
|------|------|
| `tauri-plugin-opener` | 用系统默认程序打开文件/URL |
| `tauri-plugin-dialog` | 文件选择对话框 |
| `tauri-plugin-single-instance` | 单实例限制 + CLI 文件参数转发 |
| `tauri-plugin-autostart` | 开机自启动（通过 desktop.rs） |
| `tauri-plugin-global-shortcut` | 全局快捷键注册（通过 desktop.rs） |
| `notify` (Rust crate) | 文件系统监听，检测笔记目录变更并触发前端刷新 |

### Rust 后端核心依赖

| Crate | 用途 |
|-------|------|
| tokio | 异步运行时 |
| serde / serde_json | 序列化 |
| anyhow | 错误处理 |
| thiserror | 自定义错误 |
| notify | 文件系统监听 |
| zip | 可选，用于 .xmind 解压（也可前端 jszip） |

> 注：如果 .xmind 解压完全在前端使用 jszip，则不需要后端的 zip crate。

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
├── components/      遗留 UI 组件       ├── desktop.rs    桌面平台逻辑
│   ├── IconSidebar  模式切换侧栏      │   (多窗口、托盘、快捷键、自启、文件监听)
│   ├── TopBar       顶栏              ├── main.rs       入口
│   ├── TopBarSearch 顶栏搜索框        └── services/
│   ├── EditorLayout  编辑布局             ├── notes.rs   笔记存储引擎
│   ├── DashboardCard  仪表盘卡片              (CRUD、元数据、配置持久化、文件监听)
│   ├── DashboardView 仪表盘视图      │   └── ai.rs      AI 配置服务
│   └── ErrorBoundary 错误边界
└── modules/         ★ 新模块化目录
```

**事件通信**：后端通过 Tauri `emit` 向前端广播 `notes-changed`、`config-changed`、`open-external-file` 事件，前端通过 `listen` 订阅。

## 核心数据模型

| 类型 | 文件路径 | 字段摘要 |
|------|----------|----------|
| `NoteMetadata` | `src/modules/shared/types/notes.ts` | id, title, fileName, category, createdAt, updatedAt, wordCount, preview |
| `Note` | `src/modules/shared/types/notes.ts` | 继承 NoteMetadata（不含 preview），增加 content |
| `SaveNoteRequest` | `src/modules/shared/types/notes.ts` | title, content, category |
| `ExternalFile` | `src/modules/shared/types/notes.ts` | id（文件路径）, title, filePath |
| `AppConfig` | `src/modules/shared/types/settings.ts` | notesDir, globalShortcut, closeToTray, autostart, defaultViewMode, noteAutoSave, noteSurfaceAutoSave, tileColor, tileColorMode, theme, fontSize, surfaceFontSize |
| `CategoryGroup` | `src/modules/shared/utils/noteUtils.ts` | category, notes[], latestUpdatedAt |
| `AppRoute` | `src/modules/windows/windowRoutes.ts` | view ("main" / "notepad" / "tile" / "graph"), noteId? |
| `WikiLink` | `src/modules/shared/types/notes.ts:38-43` | sourceNoteId, targetTitle, alias, rawText |
| `GraphNode` | `src/modules/shared/types/notes.ts:45-52` | id, label, val, color, noteId, x?, y? |
| `GraphEdge` | `src/modules/shared/types/notes.ts:54-59` | source, target, label, value |
| `LinkGraph` | `src/modules/shared/types/notes.ts:61-64` | nodes: GraphNode[], edges: GraphEdge[] |
| `NoteStore` | `src/modules/notes/stores/useNoteStore.ts` | Zustand store（notes, wikiLinks, linkGraph, loadNotes, rebuildGraph） |

**存储方式**：笔记以 `<uuid>_<safe_title>.md` 文件存储在按分类划分子目录的文件夹中，支持嵌套分类路径（如 `技术/前端/`），元数据聚合在 `metadata.json`。配置保存在 `config.json`。默认数据目录为 `%USERPROFILE%\Documents\星座`。文件变更通过 `notify` crate 监听并自动触发前端刷新。

## 模块完成度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| **笔记 CRUD** | 100% | 创建、读取、更新、删除，前端 API + Rust 后端完整 |
| **分类管理** | 100% | 增删改查分类，笔记拖拽移动，元数据同步，自定义颜色（色轮+RGB+预设色），图谱节点颜色跟随；侧栏顶部「新建文件夹」按钮与「新建笔记」并列 |
| **配置持久化** | 100% | 读写 config.json，修改后同步运行时（快捷键/自启） |
| **多窗口** | 100% | QuickNote 独立便签（冷灰调视觉+窗口池复用+`recycleCurrentNotepad`）、磁贴窗口、自定义标题栏拖拽 |
| **托盘** | 100% | 菜单项完整（显示、快速记录、开关键盘启动、退出） |
| **全局快捷键** | 100% | Ctrl+Space 唤出快捷便签，窗口池预热 2 个实例，`notepad:activate` 事件确保每次全新空白 |
| **导入导出** | 100% | Markdown 双向导入导出，文件对话框集成 |
| **外部文件引用** | 100% | 直接读写外部 .md 文件 |
| **搜索** | 100% | 基于 Fuse.js 实现模糊搜索，支持相关性排序和关键词高亮；顶部全局搜索 + 侧边栏分类范围搜索（当前文件夹及子文件夹） |
| **智能引用** | 100% | 编辑器/笔记列表/搜索结果三入口右键引用，NotePickerModal 笔记选择器（模糊搜索+键盘导航），useEditorStore 全局插入函数；预览区 `[[笔记标题]]` 支持点击跳转 |
| **AI 客户端** | 100% | 支持自定义 API Key，流式逐字生成（SSE + AbortController），可随时停止生成 |
| **AI 语义搜索** | 100% | transformers.js 嵌入模型 + lancedb 向量库，自然语言查询，编辑器智能推荐，完全离线 |
| **NAS 同步（WebDAV）** | 100% | 支持 WebDAV 协议双向同步，增量传输，冲突检测，用户自托管 |
| **可选本地加密** | 100% | 基于 stronghold 的 AES-256-GCM 加密，用户可选开启，默认关闭 |
| **Markdown→PDF** | 100% | 基于 html2pdf.js 实现，支持样式保留和分页 |
| **图谱仪表盘** | 100% | 1/2/3 列自适应卡片网格，统计概览合并卡片，编辑模式（铅笔按钮一键切换卡片添加/直删），拖拽排序+localStorage 布局持久化，AddComponentDrawer 右侧抽屉 |
| **文件关系图谱** | 100% | 2D 力导向图，节点 8~40px 白色 2px 描边，11px 标签截断 8 字，贝塞尔曲线边+箭头，光晕效果，hover 高亮关联路径+tooltip，300ms 切换动画，力强度滑块；空数据防护 + ErrorBoundary 容错 |
| **思维导图星系** | 100% | 恒星（r:30px 呼吸脉动）/行星（r:6~18px）/轨道线拆分组件，d3-force 模拟，展开距离/轨道密度滑块，轨道/连线开关，点击聚焦分类，flow 动画，activeFilters 联动 |
| **引用星团图** | 100% | 2D 力导向引用关系图，力强度可调，简化模式嵌入卡片 |
| **节点智能提示** | 100% | HoverTooltip 统一组件（fixed 定位+视口坐标+边缘检测+aria-live），ForceGraph2D/MindMapGalaxy/GalaxyCanvas/CitationBubble 四图谱统一悬浮提示，SelectedNodeBar 点击固定显示文件名 |
| **关系卡片** | 100% | 预览区关系卡片模式，展示 incoming/outgoing 引用列表，O(1) 查询优化（预构建 outgoingMap/incomingMap） |
| **星环视图** | 100% | 星环联想卡片模式，中心节点+圆形轨道布局，节点形状自动识别（圆形/方形/三角形/六边形），最多 16 节点+分页，右键关联/取消关联，深色模式对比度自适应 |
| **思维导图文件解析** | 100% | 支持 .xmind（ZIP+content.json）、.mm（FreeMind XML）、.json 三种格式导入导出，UUID 节点标识，jszip 解压，DOMParser 解析 XML |
| **思维导图存储** | 100% | .mindmaps 目录存储，mindmap-index.json 索引文件，Tauri Rust 后端文件读写命令 |
| **思维导图编辑器** | 100% | react-d3-tree 树状图编辑，添加/删除/重命名节点，拖拽调整父子关系，保存后自动同步星环视图 |
| **引用连线样式** | 90% | GraphEdge 新增 edgeType 字段，ForceGraph2D 根据 edgeType 渲染实线/虚线，第一版仅支持同一文件内实线引用 |
| **深色模式对比度** | 100% | colorMap.ts 新增 WCAG AA 对比度检测（3:1），getAccessibleNodeColor/getAccessibleNodeStroke 自动调整亮度+添加轮廓边 |
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
│   ├── components/                   # 遗留 UI 组件（逐步迁移至 modules/）
│   │   ├── IconSidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── TopBarSearch.tsx
│   │   ├── EditorLayout.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── DashboardView.tsx
│   │   └── ErrorBoundary.tsx
│   └── modules/                      # ★ 新模块化目录
│       ├── shared/                   # 跨模块共享
│       │   ├── types/                # 全局类型（notes.ts, settings.ts）
│       │   ├── platform/             # 平台抽象层（types.ts, index.ts, usePlatform.ts）
│       │   ├── stores/               # 全局 stores（useAppModeStore.ts, useEditorStore.ts）
│       │   ├── hooks/                # 通用 hooks
│       │   ├── utils/                # 通用工具（noteUtils.ts, highlightUtils.tsx, categoryTree.ts）
│       │   └── components/           # 通用 UI（ContextMenu, SlidingButtonGroup, MobileTabBar, MobileBottomSheet）
│       ├── notes/                    # 笔记管理模块
│       │   ├── components/           # MainWindow, MarkdownPreview, ForceGraph2D, GraphView, AiSummaryModal, SearchBar, NotePickerModal
│       │   ├── stores/               # Zustand store（useNoteStore.ts）
│       │   ├── services/             # 搜索服务（searchService.ts）、AI 服务（aiService.ts 流式+非流式）、PDF 导出（pdfExportService.ts）
│       │   │   ├── embeddingService.ts   # 向量嵌入（transformers.js）
│       │   │   ├── vectorStore.ts        # lancedb 向量存储操作
│       │   │   ├── semanticSearch.ts     # 语义搜索接口
│       │   │   ├── webdavSync.ts         # WebDAV 同步客户端
│       │   │   └── encryption.ts         # 可选笔记库加密
│       │   ├── hooks/                # useGraphData, useNotes, useDebounce
│       │   ├── api/                  # 笔记 CRUD + 导入导出 API
│       │   ├── linkParser.ts         # Wiki-Link 解析器
│       │   └── noteContextMenu.ts    # 右键菜单
│       ├── windows/                  # 窗口管理模块
│       │   ├── components/           # NotePad, Tile, TileShowcase
│       │   ├── api.ts                # 多窗口 API
│       │   ├── controls.ts           # 窗口控制（含 8 方向 resize）
│       │   ├── surfaceMode.ts        # 便签↔磁贴切换
│       │   ├── surfaceActions.ts     # 右键操作
│       │   ├── tileContextMenu.ts    # 磁贴菜单
│       │   ├── tileWindowEvents.ts   # 磁贴生命周期事件
│       │   ├── noteSurfaceSavePolicy.ts
│       │   └── windowRoutes.ts       # 视图路由
│       ├── settings/                 # 设置模块
│       │   ├── components/           # SettingsPanel, CategoryColorPicker
│       │   ├── api.ts, theme.ts, tileColor.ts, ai.ts, categoryColors.ts, shortcutRecorder.ts
│       │   └── types.ts
│       └── visualization/            # 可视化模块
│           ├── components/
│           │   ├── AddComponentDrawer # 添加组件抽屉
│           │   ├── cards/            # 卡片内容组件（RelationGraphCard, GalaxyCard, CategoryDonutCard, CitationRankingCard, CitationBubbleCard, SummaryStatsCard）
│           │   ├── RelationGraph/    # 文件关系图
│           │   ├── MindMapGalaxy/    # 思维导图星系
│           │   └── shared/           # CanvasContainer, HoverTooltip, SelectedNodeBar
│           ├── stores/               # useGraphStore + useVisualizationStore（zustand persist + 版本迁移）
│           ├── hooks/                # useGalaxyLayout, useVisibility
│           └── utils/                # colorMap（分类颜色映射）
├── src-tauri/                        # Rust 后端
│   └── src/
│       ├── lib.rs                    # 命令注册+事件+插件
│       ├── desktop.rs                # 桌面平台逻辑
│       ├── main.rs                   # 入口
│       └── services/
│           ├── notes.rs              # 笔记存储引擎
│           ├── ai.rs                 # AI 配置服务
│           └── mindmap.rs            # 思维导图文件读写命令
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

## 性能优化计划

> 针对大规模笔记（1000+ 篇）场景，以下优化项按优先级排序，逐步实施。

### 前端优化

| 优先级 | 优化项 | 方案 | 预期收益 | 相关文件 | 状态 |
|--------|--------|------|----------|----------|------|
| 🔴 高 | 力导向图 Web Worker + Canvas | 将 d3-force 移至 Worker，主线程 Canvas 渲染 | 支持 500+ 节点，帧率提升 3-5 倍 | `ForceGraph2D.tsx` | 规划中 |
| 🔴 高 | 搜索索引持久化与增量更新 | 序列化 Fuse.js 索引到 `.index/`，启动时加载；笔记变更时增量更新 | 启动时间 O(N)→O(1) | `searchService.ts` | 规划中 |
| 🔴 高 | 笔记列表虚拟滚动 | 使用 `react-window` 仅渲染可视区域 | 滚动帧率提升，内存降低 | `NoteListPanel.tsx` | 规划中 |
| 🟠 中 | 图谱数据增量重建 | 仅重新计算受影响的边，使用 Map 缓存 | 编辑后图谱更新 <10ms | `useNoteStore.ts` | 规划中 |
| 🟠 中 | 向量检索性能优化 | Worker 嵌入 + 预加载索引 + 结果限制 | 语义搜索 <200ms | `semanticSearch.ts` | 规划中 |
| 🟠 中 | 星环视图节点分页 | 超出 16 个节点时分页加载 | 保持渲染帧率 | `GalaxyPreview.tsx` | 规划中 |
| 🟢 低 | Markdown 预览懒加载 | 仅切换到时加载组件 | 减少初始开销 | `EditorLayout.tsx` | 可选 |

### 后端优化（Rust / Tauri）

| 优先级 | 优化项 | 方案 | 预期收益 | 相关文件 | 状态 |
|--------|--------|------|----------|----------|------|
| 🔴 高 | 文件监听防抖与批处理 | 300ms 防抖，批量发送事件 | 避免高频刷新 | `notes.rs` | 规划中 |
| 🔴 高 | 异步写入并发控制 | 文件级 Mutex + 原子重命名 | 防止数据损坏 | `notes.rs` | 规划中 |
| 🟠 中 | 启动扫描性能优化 | 并行遍历（rayon）+ 增量扫描 | 冷启动时间减少 50%-70% | `notes.rs` | 规划中 |
| 🟠 中 | 向量库后端直接集成 | 用 Rust 端集成 lancedb，避免序列化开销 | 搜索延迟降低 30%-50% | `vector.rs`（新） | 可选 |
| 🟢 低 | WebDAV 增量传输 | Rsync-like 算法（仅传输变更 chunk） | 降低带宽消耗 | `webdavSync.ts` | 可选 |

### 实施路线图

| 版本 | 核心优化 |
|------|----------|
| **v1.5** | 力导向图 Worker + Canvas、搜索索引持久化、文件监听防抖、异步写入锁 |
| **v2.0** | 笔记列表虚拟滚动、图谱增量重建、启动扫描优化 |
| **v2.5** | 向量检索性能优化、星环视图分页、后端直接集成向量库 |

### 高级架构升级方案（可选，高收益）

> 以下优化项涉及核心架构替换，投入较高但性能收益显著，建议在完成基础优化后按需实施。

| 优先级 | 优化项 | 方案 | 预期收益 | 实施难度 |
|--------|--------|------|----------|----------|
| 🔴 高 | 全文搜索引擎替换 | 替换 Fuse.js 为 Rust 原生搜索引擎 Tantivy（集成到 Tauri 后端），支持增量索引、BM25 排序、中文分词 | 启动时间↓90%，搜索毫秒级响应 | 中 |
| 🔴 高 | 向量嵌入 WebGPU 加速 | 升级 transformers.js 至 v4，启用 WebGPU 后端（需 Tauri 支持），推理速度提升 10-60 倍 | 嵌入计算时间从秒级降至毫秒级 | 低 |
| 🔴 高 | Rust 后端构建优化 | 启用 LTO、codegen-units=1、strip = true 等编译优化 | 运行时性能↑10-20%，二进制体积↓30% | 极低 |
| 🟠 中 | 向量检索后端化 | 将 lancedb 和嵌入模型迁移至 Rust 后端（使用 lancedb Rust SDK + candle/fastembed-rs） | 消除 IPC 序列化开销，延迟↓30-50% | 高 |
| 🟠 中 | IPC 通信批量优化 | 合并频繁的 invoke 调用为批量命令，利用 Tauri v2 改进的 IPC 通道 | 跨进程通信延迟↓40% | 低 |
| 🟡 低 | 磁盘缓存插件 | 集成 `tauri-plugin-cache`，缓存图谱数据、渲染结果、向量索引片段 | 重复加载速度↑ | 低 |
| 🟢 低 | WASM 计算加速 | 将力导向图距离计算、文本分词等高频函数编译为 WASM，在 Worker 中执行 | 计算密集型任务速度↑数倍 | 中 |

> 上述方案中，**全文搜索引擎替换**和 **WebGPU 加速**性价比最高，建议优先探索。

> 性能优化是持续过程，欢迎反馈大规模笔记使用中的瓶颈。

## 已知问题与优化建议

### 已知问题（Bug）

| 问题 | 复现步骤 | 错误信息 | 状态 |
|------|----------|----------|------|
| 关系图谱组件白屏 | `npm run tauri dev` → 打开关系图谱组件 | `failed to sync autostart config` (os error 2) + `Failed to unregister class Chrome_WidgetWin_0` (Error 1412)，可能涉及其他可视化组件 | ✅ 已修复（添加防御性空数据检查 + ErrorBoundary 包裹） |

### 优化建议

| 建议 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| 新建文件夹按钮位置优化 | 当前加号按钮不够明显，建议与新建文件按钮并列放置，提升可发现性 | 🟠 中 | ✅ 已完成 |
| 引用文件使用超链接 | 当前 `[[笔记标题]]` 引用在预览中未渲染为可点击超链接，建议改为 `<a>` 标签实现跳转 | 🟠 中 | ✅ 已完成 |

> 欢迎提交 Issue 或 PR 协助修复上述问题。

## 数据安全与同步说明

### 本地存储与加密

- 笔记默认以明文 Markdown 文件存储于用户指定目录（如 `%USERPROFILE%\Documents\星座`）。所有文件操作均在本地完成，应用不会自动上传任何数据。
- **可选加密**：提供「加密笔记库」功能，使用 AES-256-GCM 算法加密整个笔记目录（用户需设置密码）。加密后文件无法直接读取，需通过应用验证密码后解密使用。该功能默认关闭，适用于共享设备或敏感笔记场景。

### 自托管同步

- **WebDAV 协议**：支持连接任意兼容 WebDAV 的 NAS（群晖、威联通）、云存储（Nextcloud、坚果云 WebDAV 版）或自建 WebDAV 服务器。
  - 配置步骤：在设置中填入 WebDAV 地址、用户名、密码 → 选择同步方向（上传/下载/双向） → 保存。
  - 同步机制：增量扫描文件修改，冲突时保留两个版本并提示用户手动合并。
- **Git 远程仓库（规划中）**：支持使用 Git 同步（需用户自行配置密钥）。

> 本项目**不提供官方云服务**，所有同步依赖用户自己的基础设施。请自行管理备份和访问权限。

## 版权与合规声明

### 开源许可证合规

本项目基于 [MIT 许可证](LICENSE) 开源。原始代码版权归 [Achilng](https://github.com/Achilng) 所有，修改部分版权归 Maplar 所有。MIT 许可证允许自由使用、修改、分发和商业应用，但**必须保留原始版权和许可声明**。

本程序所使用的第三方组件（Tauri、React、d3‑force、TailwindCSS 等）均采用 MIT / BSD‑3‑Clause / Apache 2.0 等宽松许可证，未引入 GPL 类传染性协议。组件清单及许可证文本可于源代码仓库中查看。

### 第三方文件格式兼容性

- **思维导图文件**（如 `.xmind`、`.mm`）：本项目仅基于公开的格式规范或标准文档实现导入/导出功能，不复制、不逆向任何非开源软件的专有代码。用户使用本功能时，应自行确保原始文件拥有合法使用权。
- **外部 Markdown 文件**：本项目可作为系统默认编辑器打开任意 `.md` 文件，但不会修改文件版权归属。

### 视觉设计与功能借鉴

- **Obsidian 参考**：本软件中图谱布局、力导向交互、悬浮提示等设计遵循行业内通用的表达方式（力导向图、节点链接图等），未复制 Obsidian 专有的界面配色序列、图标集或整体布局比例。如存在偶然相似，纯属技术实现趋同。
- **通用交互模式**：所有可视化组件均基于开源技术（d3‑force、SVG/Canvas）自主实现，未对任何商业软件进行逆向工程或直接复制其源代码。

### AI 总结功能免责

AI 总结功能仅作为辅助工具，生成的内容由用户自行判断其准确性及合规性。本程序不存储、不上传用户的 API Key 或笔记内容至第三方服务器（用户自行配置的 OpenAI 兼容接口除外）。因使用 AI 功能引发的任何版权或法律纠纷，本程序开发者不承担责任。

> 本声明仅为善意合规提示，不替代专业法律意见。如有商业部署需求，建议咨询知识产权律师。

## 许可证

本项目基于 [MIT 许可证](LICENSE)。原始版权归 [Achilng](https://github.com/Achilng) 所有，二次开发修改部分版权归 Maplar 所有。
