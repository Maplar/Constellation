#!/usr/bin/env node

/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：Release Notes 生成脚本
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CHANGELOG_PATH = join(process.cwd(), "CHANGELOG.md");
const OUTPUT_DIR = join(process.cwd());

function parseChangelog(content) {
  const sections = {
    added: [],
    changed: [],
    fixed: [],
  };

  let currentSection = null;
  let currentCategory = null;
  let inVersion = false;

  const lines = content.split("\n");

  for (const line of lines) {
    if (line.startsWith("## [3.0.0]")) {
      inVersion = true;
      continue;
    }

    if (inVersion && line.startsWith("## [")) {
      break;
    }

    if (!inVersion) continue;

    if (line.startsWith("### Added")) {
      currentSection = "added";
      currentCategory = null;
      continue;
    }

    if (line.startsWith("### Changed")) {
      currentSection = "changed";
      currentCategory = null;
      continue;
    }

    if (line.startsWith("### Fixed")) {
      currentSection = "fixed";
      currentCategory = null;
      continue;
    }

    if (currentSection && line.startsWith("#### ")) {
      currentCategory = line.replace("#### ", "").trim();
      continue;
    }

    if (currentSection && line.startsWith("- ")) {
      const item = line.replace("- ", "").trim();
      const entry = currentCategory
        ? `[${currentCategory}] ${item}`
        : item;
      sections[currentSection].push(entry);
    }
  }

  return sections;
}

function categorizeFeatures(added) {
  const categories = {
    ai: [],
    performance: [],
    architecture: [],
    sync: [],
    visualization: [],
    commercial: [],
    other: [],
  };

  for (const item of added) {
    const lower = item.toLowerCase();
    if (lower.includes("ai") || lower.includes("搜索") || lower.includes("摘要") || lower.includes("标签")) {
      categories.ai.push(item);
    } else if (lower.includes("性能") || lower.includes("优化") || lower.includes("索引") || lower.includes("worker")) {
      categories.performance.push(item);
    } else if (lower.includes("插件") || lower.includes("plugin") || lower.includes("capacitor") || lower.includes("移动端")) {
      categories.architecture.push(item);
    } else if (lower.includes("同步") || lower.includes("sync") || lower.includes("webdav") || lower.includes("冲突")) {
      categories.sync.push(item);
    } else if (lower.includes("图谱") || lower.includes("连线") || lower.includes("edge") || lower.includes("canvas")) {
      categories.visualization.push(item);
    } else if (lower.includes("pro") || lower.includes("备份") || lower.includes("加密") || lower.includes("license")) {
      categories.commercial.push(item);
    } else {
      categories.other.push(item);
    }
  }

  return categories;
}

function generateReleaseNotes(version, sections) {
  const features = categorizeFeatures(sections.added);
  const date = new Date().toISOString().split("T")[0];

  let notes = `# Constellation v${version} Release Notes

**Release Date:** ${date}

---

## Highlights

Constellation v${version} represents a major milestone in our journey to build the ultimate local-first knowledge base. This release introduces powerful AI capabilities, significant performance improvements, and a robust plugin architecture.

---

## New Features

### AI & Intelligence
`;

  for (const item of features.ai) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  notes += `
### Performance & Optimization
`;

  for (const item of features.performance) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  notes += `
### Architecture & Extensibility
`;

  for (const item of features.architecture) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  notes += `
### Sync & Collaboration
`;

  for (const item of features.sync) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  notes += `
### Visualization & UI
`;

  for (const item of features.visualization) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  notes += `
### Commercial Features
`;

  for (const item of features.commercial) {
    const clean = item.replace(/\[.*?\]\s*/, "");
    notes += `- ${clean}\n`;
  }

  if (features.other.length > 0) {
    notes += `
### Other Improvements
`;
    for (const item of features.other) {
      const clean = item.replace(/\[.*?\]\s*/, "");
      notes += `- ${clean}\n`;
    }
  }

  if (sections.changed.length > 0) {
    notes += `
---

## Changes

`;
    for (const item of sections.changed) {
      notes += `- ${item}\n`;
    }
  }

  if (sections.fixed.length > 0) {
    notes += `
---

## Bug Fixes

`;
    for (const item of sections.fixed) {
      notes += `- ${item}\n`;
    }
  }

  notes += `
---

## Architecture

This release includes significant architectural improvements:

- **Plugin System**: Secure sandbox architecture with permission-based IPC
- **Vector Database**: LanceDB integration for local semantic search
- **Web Worker**: Offloaded graph computation for smoother UI
- **Canvas Rendering**: High-performance graph visualization
- **Mobile Ready**: Capacitor configuration for Android/iOS

---

## Known Issues

- Some visualization components have pre-existing TypeScript warnings (non-blocking)
- WebGPU acceleration requires compatible hardware and browser support

---

## Upgrade Guide

This is a major version upgrade. Please note:

1. **Backup your data** before upgrading
2. The plugin system is new - existing customizations should be reviewed
3. Pro features require activation (demo key: constellation-pro-2026)

---

## Acknowledgments

Special thanks to the open source community and all contributors who made this release possible.

---

**Full Changelog**: See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.
`;

  return notes;
}

function main() {
  try {
    console.log("Reading CHANGELOG.md...");
    const content = readFileSync(CHANGELOG_PATH, "utf-8");

    console.log("Parsing changelog...");
    const sections = parseChangelog(content);

    console.log(`Found ${sections.added.length} new features`);
    console.log(`Found ${sections.changed.length} changes`);
    console.log(`Found ${sections.fixed.length} fixes`);

    console.log("Generating release notes...");
    const notes = generateReleaseNotes("3.0.0", sections);

    const outputPath = join(OUTPUT_DIR, "RELEASE-NOTES-v3.0.md");
    writeFileSync(outputPath, notes, "utf-8");

    console.log(`Release notes generated: ${outputPath}`);
  } catch (error) {
    console.error("Error generating release notes:", error);
    process.exit(1);
  }
}

main();
