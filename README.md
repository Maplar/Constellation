> **本项目基于 [floral-notepaper](https://github.com/Achilng/floral-notepaper) 二次开发，原始代码采用 MIT 许可证，原始版权归 Achilng 所有。修改部分版权归 Maplar 所有。**

# 星座

星座是一款基于 Tauri 2 + React 构建的轻量、优雅、现代化的本地便签工具。

> 本仓库为二次开发版本，新增分类管理、多窗口池、自动保存、外部文件引用等功能，并规划了 AI 总结、图谱关系、PDF 导出等模块。

## 功能特性

- **Markdown 编辑与预览** — 支持 GitHub Flavored Markdown 语法，三模式切换（编辑 / 分栏 / 预览）
- **分类管理** — 文件夹子目录分类，支持新建、重命名、删除，笔记拖拽移动分类
- **快捷便签** — 通过托盘或全局快捷键（Ctrl+Space / Alt+Space）随时唤出，支持窗口池预热复用
- **磁贴模式** — 将笔记固定在桌面某处，置于顶层，支持跟随系统主题颜色
- **自动保存** — 主窗口笔记与小窗笔记均支持 900ms 防抖自动保存
- **外部文件引用** — 直接打开系统中任意 `.md` 文件，无需导入即可编辑
- **导入导出** — 支持 `.md` 文件的导入和导出，可设为系统默认 Markdown 编辑器
- **托盘菜单** — 关闭到托盘、开机自启、快速记录
- **沉浸式标题栏** — 自绘窗口控制区域，与整体 UI 融合
- **Wiki-Link 解析** — 支持 `[[笔记标题]]` 和 `[[笔记标题|别名]]` 语法，自动解析笔记间引用关系
- **2D 力导向图谱** — 基于 d3-force 的笔记关系图谱可视化，节点大小反映被引次数，支持缩放/拖拽/点击跳转
- **3D 星团图谱** — 基于 d3-force-3d + Three.js 的三维力导向图谱，高被引节点向中心聚集形成星团效果，支持旋转/缩放

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
| 可视化 | d3-force（2D 力导向图谱）+ d3-force-3d + Three.js（3D 星团图谱） | — |

### Tauri 插件

| 插件 | 用途 |
|------|------|
| `tauri-plugin-opener` | 用系统默认程序打开文件/URL |
| `tauri-plugin-dialog` | 文件选择对话框 |
| `tauri-plugin-single-instance` | 单实例限制 + CLI 文件参数转发 |
| `tauri-plugin-autostart` | 开机自启动（通过 desktop.rs） |
| `tauri-plugin-global-shortcut` | 全局快捷键注册（通过 desktop.rs） |

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
│   └── SlidingButtonGroup 滑动按钮组
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
| **多窗口** | 100% | 便签窗口池（预热 2 个）、磁贴窗口、边界动画 |
| **托盘** | 100% | 菜单项完整（显示、快速记录、开关键盘启动、退出） |
| **全局快捷键** | 100% | Ctrl+Space / Alt+Space 唤出便签 |
| **导入导出** | 100% | Markdown 双向导入导出，文件对话框集成 |
| **外部文件引用** | 100% | 直接读写外部 .md 文件 |
| **搜索** | 70% | 基于字符串 `includes` 的简单匹配，未使用 Fuse.js |
| **AI 客户端** | 0% | `src/core/ai-client.ts` 不存在，无 LLM 依赖 |
| **AI 面板** | 0% | `src/components/AiPanel/` 不存在 |
| **Markdown→PDF** | 0% | `src/core/markdown-to-pdf.ts` 不存在，无 PDF 库 |
| **图谱关系** | 85% | Wiki-Link 解析 + 2D d3-force + 3D d3-force-3d/Three.js 星团效果已实现，待添加路径分析 |
| **移动端** | 0% | 仅 lib.rs 有 `#[cfg_attr(mobile)]` 声明，无实际适配 |
| **平台抽象层** | 0% | `src/platforms/desktop.ts` 和 `mobile.ts` 不存在 |

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
│       │   ├── hooks/                # 通用 hooks
│       │   ├── utils/                # 通用工具（noteUtils.ts）
│       │   └── components/           # 通用 UI（ContextMenu, SlidingButtonGroup）
│       ├── notes/                    # 笔记管理模块
│       │   ├── components/           # MainWindow, MarkdownPreview, ForceGraph2D, GraphView
│       │   ├── stores/               # Zustand store（useNoteStore.ts）
│       │   ├── hooks/                # useGraphData, useNotes
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
│       │   ├── noteSurfaceSavePolicy.ts
│       │   └── windowRoutes.ts       # 视图路由
│       ├── settings/                 # 设置模块
│       │   ├── components/           # SettingsPanel
│       │   ├── api.ts, theme.ts, tileColor.ts
│       │   └── types.ts
│       └── visualization/            # 可视化模块（预留 3D 升级）
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
