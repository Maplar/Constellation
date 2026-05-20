/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it } from "vitest";
import { parseWikiLinks, parseAllLinks, buildLinkGraph } from "../linkParser";
import type { Note } from "../../shared/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "测试笔记",
    fileName: "test.md",
    category: "",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    wordCount: 10,
    content: "",
    ...overrides,
  };
}

describe("parseWikiLinks", () => {
  it("parses a simple wiki link", () => {
    const links = parseWikiLinks("参见 [[目标笔记]]", "src-1");
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      sourceNoteId: "src-1",
      targetTitle: "目标笔记",
      alias: null,
      rawText: "目标笔记",
    });
  });

  it("parses a wiki link with an alias", () => {
    const links = parseWikiLinks("参见 [[目标笔记|别名显示]]", "src-1");
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      sourceNoteId: "src-1",
      targetTitle: "目标笔记",
      alias: "别名显示",
      rawText: "目标笔记|别名显示",
    });
  });

  it("parses multiple wiki links in the same content", () => {
    const links = parseWikiLinks("从 [[笔记A]] 到 [[笔记B|别名]]", "src-1");
    expect(links).toHaveLength(2);
    expect(links[0].targetTitle).toBe("笔记A");
    expect(links[1].targetTitle).toBe("笔记B");
  });

  it("returns empty array when no wiki links are present", () => {
    const links = parseWikiLinks("普通文本 [not a link] (not a link)", "src-1");
    expect(links).toHaveLength(0);
  });

  it("ignores empty link content", () => {
    const links = parseWikiLinks("[[]] [[ ]]", "src-1");
    expect(links).toHaveLength(0);
  });

  it("handles links with extra whitespace", () => {
    const links = parseWikiLinks("[[  标题有空格  ]]", "src-1");
    expect(links).toHaveLength(1);
    expect(links[0].targetTitle).toBe("标题有空格");
  });

  it("handles alias with empty alias part", () => {
    const links = parseWikiLinks("[[标题|]]", "src-1");
    expect(links).toHaveLength(1);
    expect(links[0].targetTitle).toBe("标题");
    expect(links[0].alias).toBeNull();
  });
});

describe("parseAllLinks", () => {
  it("collects links from multiple notes", () => {
    const notes: Note[] = [
      makeNote({ id: "n1", title: "Note 1", content: "参见 [[Note 2]]" }),
      makeNote({ id: "n2", title: "Note 2", content: "回到 [[Note 1|首页]]" }),
    ];
    const links = parseAllLinks(notes);
    expect(links).toHaveLength(2);
    expect(links[0].sourceNoteId).toBe("n1");
    expect(links[1].sourceNoteId).toBe("n2");
  });
});

describe("buildLinkGraph", () => {
  it("builds nodes and edges from linked notes", () => {
    const notes: Note[] = [
      makeNote({ id: "n1", title: "Note 1", content: "参见 [[Note 2]]" }),
      makeNote({ id: "n2", title: "Note 2", content: "回到 [[Note 1]]" }),
    ];
    const graph = buildLinkGraph(notes);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);

    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toContain("n1");
    expect(nodeIds).toContain("n2");
  });

  it("excludes self-referencing links", () => {
    const notes: Note[] = [
      makeNote({ id: "self", title: "Self Note", content: "参见 [[Self Note]]" }),
    ];
    const graph = buildLinkGraph(notes);
    expect(graph.edges).toHaveLength(0);
  });

  it("excludes links to non-existent notes", () => {
    const notes: Note[] = [
      makeNote({ id: "n1", title: "Note 1", content: "参见 [[不存在的笔记]]" }),
    ];
    const graph = buildLinkGraph(notes);
    expect(graph.edges).toHaveLength(0);
  });

  it("includes all notes as nodes even without links", () => {
    const notes: Note[] = [
      makeNote({ id: "n1", title: "Note 1", content: "无链接" }),
      makeNote({ id: "n2", title: "Note 2", content: "也无链接" }),
    ];
    const graph = buildLinkGraph(notes);
    expect(graph.nodes.length).toBe(2);
  });
});
