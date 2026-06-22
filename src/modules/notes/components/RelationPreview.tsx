/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：收敛为 1.0 当前文档引用与反向链接面板
 */

import { useEffect, useState } from "react";
import {
  getBacklinksForDocument,
  getReferencesForDocument,
  listDocuments,
  type ReferenceEdge,
} from "../../../core-client";
import { getConfig } from "../../settings/api";

interface RelationPreviewProps {
  noteId: string;
}

export function RelationPreview({ noteId }: RelationPreviewProps) {
  const [incoming, setIncoming] = useState<ReferenceEdge[]>([]);
  const [outgoing, setOutgoing] = useState<ReferenceEdge[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getConfig(), listDocuments()])
      .then(async ([config, documents]) => {
        const titleById = new Map(documents.map((document) => [document.constellationId, document.title]));
        const [nextOutgoing, nextIncoming] = await Promise.all([
          getReferencesForDocument(config.notesDir, noteId),
          getBacklinksForDocument(config.notesDir, noteId),
        ]);
        if (!cancelled) {
          setTitles(titleById);
          setOutgoing(nextOutgoing);
          setIncoming(nextIncoming);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIncoming([]);
          setOutgoing([]);
        }
      });
    return () => { cancelled = true; };
  }, [noteId]);

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full">
      <RelationSection title={`引用此笔记 (${incoming.length})`} edges={incoming} titles={titles} direction="source" />
      <div className="h-px bg-gradient-to-r from-transparent via-paper-deep to-transparent" />
      <RelationSection title={`此笔记引用 (${outgoing.length})`} edges={outgoing} titles={titles} direction="target" />
    </div>
  );
}

function RelationSection({ title, edges, titles, direction }: { title: string; edges: ReferenceEdge[]; titles: Map<string, string>; direction: "source" | "target" }) {
  return <section><h3 className="text-xs font-semibold text-ink-ghost uppercase tracking-wider mb-3">{title}</h3>{edges.length === 0 ? <p className="text-xs text-ink-ghost/60 italic">暂无引用</p> : <div className="space-y-2">{edges.map((edge) => <div key={`${edge.source}-${edge.target}-${edge.relationType}`} className="rounded-lg border border-paper-deep/10 bg-paper-warm/50 px-3 py-2"><strong className="text-[13px] text-ink-soft">{titles.get(edge[direction]) ?? edge[direction]}</strong>{edge.label && <span className="block text-[10px] text-ink-ghost/50 mt-1">{edge.label}</span>}</div>)}</div>}</section>;
}
