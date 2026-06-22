/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import * as d3 from "d3";
import type { NoteMetadata, GraphEdge } from "../../shared/types/notes";
import { getCategoryColor } from "../utils/colorMap";

export interface GalaxyNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: "category" | "note";
  categoryId: string;
  noteId: string;
  val: number;
  fx?: number;
  fy?: number;
}

export interface GalaxyEdge {
  source: string;
  target: string;
  value: number;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  fx?: number;
  fy?: number;
}

interface UseGalaxyLayoutOptions {
  notes: NoteMetadata[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

function mapNoteSize(val: number, maxVal: number): number {
  if (maxVal <= 0) return 16;
  const minSize = 16;
  const maxSize = 32;
  return minSize + (val / maxVal) * (maxSize - minSize);
}

export function useGalaxyLayout({
  notes,
  edges,
  width,
  height,
}: UseGalaxyLayoutOptions): { nodes: GalaxyNode[]; links: GalaxyEdge[] } {
  return useMemo(() => {
    if (width === 0 || height === 0 || notes.length === 0) {
      return { nodes: [], links: [] };
    }

    const categories = new Map<string, NoteMetadata[]>();
    for (const note of notes) {
      const cat = note.category || "未分类";
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
      categories.get(cat)!.push(note);
    }

    const categoryNames = Array.from(categories.keys());
    const centerX = width / 2;
    const centerY = height / 2;
    const categoryRadius = Math.min(width, height) * 0.3;

    const categoryNodes: GalaxyNode[] = categoryNames.map((cat, index) => {
      const angle = (2 * Math.PI * index) / categoryNames.length;
      const x = centerX + categoryRadius * Math.cos(angle);
      const y = centerY + categoryRadius * Math.sin(angle);
      return {
        id: `cat-${cat}`,
        label: cat,
        x,
        y,
        radius: 48,
        color: getCategoryColor(cat),
        type: "category" as const,
        categoryId: cat,
        noteId: "",
        val: 0,
        fx: x,
        fy: y,
      };
    });

    const refCountMap = new Map<string, number>();
    for (const edge of edges) {
      refCountMap.set(edge.target, (refCountMap.get(edge.target) || 0) + 1);
    }

    const maxRefCount = Math.max(...Array.from(refCountMap.values()), 1);

    const noteNodes: GalaxyNode[] = [];
    for (const [cat, catNotes] of categories) {
      const catNode = categoryNodes.find((n) => n.categoryId === cat);
      if (!catNode) continue;

      for (const note of catNotes) {
        const refCount = refCountMap.get(note.id) || 0;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 60 + Math.random() * 80;
        noteNodes.push({
          id: `note-${note.id}`,
          label: note.title || "无标题笔记",
          x: catNode.x + dist * Math.cos(angle),
          y: catNode.y + dist * Math.sin(angle),
          radius: mapNoteSize(refCount, maxRefCount),
          color: getCategoryColor(cat),
          type: "note" as const,
          categoryId: cat,
          noteId: note.id,
          val: refCount,
        });
      }
    }

    const allNodes = [...categoryNodes, ...noteNodes];

    const nodeMap = new Map<string, GalaxyNode>();
    for (const node of allNodes) {
      nodeMap.set(node.id, node);
    }

    const galaxyLinks: GalaxyEdge[] = [];
    const noteIdToNodeId = new Map<string, string>();
    for (const node of noteNodes) {
      noteIdToNodeId.set(node.noteId, node.id);
    }

    for (const edge of edges) {
      const sourceNodeId = noteIdToNodeId.get(edge.source);
      const targetNodeId = noteIdToNodeId.get(edge.target);
      if (sourceNodeId && targetNodeId && sourceNodeId !== targetNodeId) {
        galaxyLinks.push({
          source: sourceNodeId,
          target: targetNodeId,
          value: edge.value,
        });
      }
    }

    if (noteNodes.length > 0) {
      const simNodes: SimNode[] = noteNodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        fx: n.fx,
        fy: n.fy,
      }));

      const simLinks = galaxyLinks.map((l) => ({
        source: l.source,
        target: l.target,
      }));

      const catPositionMap = new Map<string, { x: number; y: number }>();
      for (const catNode of categoryNodes) {
        catPositionMap.set(catNode.id, { x: catNode.x, y: catNode.y });
      }

      const sim = d3
        .forceSimulation<SimNode>(simNodes)
        .force(
          "x",
          d3
            .forceX<SimNode>((d) => {
              const galaxyNode = nodeMap.get(d.id);
              if (galaxyNode) {
                const catPos = catPositionMap.get(`cat-${galaxyNode.categoryId}`);
                if (catPos) return catPos.x;
              }
              return centerX;
            })
            .strength(0.1),
        )
        .force(
          "y",
          d3
            .forceY<SimNode>((d) => {
              const galaxyNode = nodeMap.get(d.id);
              if (galaxyNode) {
                const catPos = catPositionMap.get(`cat-${galaxyNode.categoryId}`);
                if (catPos) return catPos.y;
              }
              return centerY;
            })
            .strength(0.1),
        )
        .force(
          "link",
          d3
            .forceLink(simLinks)
            .id((d: d3.SimulationNodeDatum) => (d as SimNode).id)
            .distance(80)
            .strength(0.3),
        )
        .force("charge", d3.forceManyBody().strength(-30))
        .force(
          "collide",
          d3.forceCollide<SimNode>().radius((d) => {
            const node = nodeMap.get(d.id);
            return node ? node.radius + 4 : 20;
          }),
        )
        .stop();

      for (let i = 0; i < 300; i++) {
        sim.tick();
      }

      for (const simNode of simNodes) {
        const node = nodeMap.get(simNode.id);
        if (node) {
          node.x = simNode.x;
          node.y = simNode.y;
        }
      }
    }

    return {
      nodes: allNodes,
      links: galaxyLinks,
    };
  }, [notes, edges, width, height]);
}
