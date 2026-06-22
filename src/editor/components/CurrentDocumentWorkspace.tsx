/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useCallback, useEffect, useState } from "react";
import {
  createDocument,
  listDocuments,
  readDocument,
  toCoreError,
  updateDocument,
  type DocumentSummary,
} from "../../core-client";
import { toDocumentUpdateRequest } from "../documentOperations";
import {
  openDocumentSession,
  updateDocumentDraft,
  type DocumentSession,
} from "../documentSession";

export function CurrentDocumentWorkspace() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (relativePath: string) => {
    try {
      setError(null);
      setSession(openDocumentSession(await readDocument(relativePath)));
    } catch (reason) {
      setError(toCoreError(reason).message);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await listDocuments();
      setDocuments(next);
      if (!session && next[0]) await open(next[0].relativePath);
    } catch (reason) {
      setError(toCoreError(reason).message);
    }
  }, [open, session]);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = async () => {
    try {
      const document = await createDocument({ title: "未命名笔记", content: "" });
      await refresh();
      setSession(openDocumentSession(document));
    } catch (reason) { setError(toCoreError(reason).message); }
  };

  const save = async () => {
    if (!session || session.status !== "dirty") return;
    try {
      setSession({ ...session, status: "saving" });
      setSession(openDocumentSession(await updateDocument(toDocumentUpdateRequest(session))));
      await refresh();
    } catch (reason) {
      const coreError = toCoreError(reason);
      setError(coreError.message);
      setSession({ ...session, status: coreError.code === "revisionConflict" ? "conflict" : "error" });
    }
  };

  return <div className="flex flex-1 min-h-0"><aside className="w-72 shrink-0 border-r border-paper-deep/40 bg-cloud p-3"><div className="mb-3 flex justify-between"><strong>我的知识库</strong><button onClick={() => void create()}>＋ 新建</button></div>{documents.map((item) => <button key={item.relativePath} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-bamboo-mist" onClick={() => void open(item.relativePath)}>{item.title}</button>)}</aside><main className="flex-1 min-w-0 p-8"><div className="mx-auto max-w-3xl">{error && <p className="mb-3 text-sm text-red-600">{error}</p>}{session ? <><input className="mb-4 w-full bg-transparent text-3xl font-display outline-none" value={session.title} onChange={(e) => setSession(updateDocumentDraft(session, { title: e.target.value, content: session.content }))}/><textarea className="min-h-[420px] w-full resize-none bg-transparent leading-8 outline-none" value={session.content} onChange={(e) => setSession(updateDocumentDraft(session, { title: session.title, content: e.target.value }))}/><button className="mt-4 rounded-lg bg-bamboo px-4 py-2 text-white disabled:opacity-50" disabled={session.status !== "dirty"} onClick={() => void save()}>{session.status === "saving" ? "保存中" : "保存"}</button></> : <p className="text-ink-faint">创建或打开一篇 Markdown 笔记开始工作。</p>}</div></main></div>;
}
