/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  analyzeMigration,
  compareGitSnapshot,
  createGitSnapshot,
  enableGitSnapshots,
  executeMigration,
  listGitSnapshots,
  listWorkspaces,
  requestWorkspaceSwitch,
  registerWorkspace,
  restoreGitSnapshot,
  type GitSnapshot,
  type GitSnapshotChange,
  type MigrationAnalysis,
  type MigrationReport,
  type WorkspaceRecord,
} from "../../../core-client";
import {
  createBackup,
  formatBackupDate,
  formatBackupSize,
  loadBackupConfig,
  listBackups,
  restoreBackup,
  saveBackupConfig,
  type BackupMetadata,
} from "../../notes/services/backupService";
import { WorkspaceDirectoryBrowser } from "../../../workspace/components/WorkspaceDirectoryBrowser";
import { SyncSettingsPanel } from "./SyncSettingsPanel";

type Tool = "menu" | "workspaces" | "backup" | "migration" | "git" | "sync";
type BrowserPurpose =
  | "workspace"
  | "backup"
  | "backupRestore"
  | "migrationSource"
  | "migrationTarget"
  | "gitRestore";

interface AdvancedToolsPanelProps {
  notesDir: string;
  onClose: () => void;
}

export function AdvancedToolsPanel({ notesDir, onClose }: AdvancedToolsPanelProps) {
  const [tool, setTool] = useState<Tool>("menu");

  if (tool === "sync") {
    return <SyncSettingsPanel onClose={() => setTool("menu")} />;
  }

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={tool === "menu" ? "数据与高级工具" : toolTitle(tool)}
        onBack={tool === "menu" ? undefined : () => setTool("menu")}
        onClose={onClose}
      />
      {tool === "menu" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <ToolButton title="多工作区" detail="注册、查看并切换独立知识库" onClick={() => setTool("workspaces")} />
          <ToolButton title="加密备份" detail="创建和恢复 Argon2id + XChaCha20-Poly1305 备份" onClick={() => setTool("backup")} />
          <ToolButton title="v3 复制迁移" detail="预览迁移，源工作区保持只读" onClick={() => setTool("migration")} />
          <ToolButton title="Git 快照" detail="创建、比较并恢复到新目录" onClick={() => setTool("git")} />
          <ToolButton title="WebDAV 同步" detail="双向同步、冲突副本和退避重试" onClick={() => setTool("sync")} />
        </div>
      ) : tool === "workspaces" ? (
        <WorkspaceTools notesDir={notesDir} />
      ) : tool === "backup" ? (
        <BackupTools notesDir={notesDir} />
      ) : tool === "migration" ? (
        <MigrationTools />
      ) : (
        <GitTools notesDir={notesDir} />
      )}
    </div>
  );
}

function WorkspaceTools({ notesDir }: { notesDir: string }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    setWorkspaces(await listWorkspaces());
  }, []);

  useEffect(() => {
    void refresh().catch((error) => setStatus(String(error)));
  }, [refresh]);

  const register = async (path: string) => {
    try {
      await registerWorkspace(path);
      await refresh();
      setStatus("工作区已注册");
    } catch (error) {
      setStatus(String(error));
    }
  };

  return (
    <ToolBody>
      <div className="flex gap-2">
        <ActionButton label="注册当前工作区" onClick={() => void register(notesDir)} />
        <ActionButton label="注册其他目录" onClick={() => setBrowserOpen(true)} />
      </div>
      {workspaces.map((workspace) => (
        <div key={workspace.id} className="rounded-xl border border-paper-deep/35 p-3 space-y-2">
          <div className="text-[12px] text-ink-soft">{workspace.name}</div>
          <div className="text-[10px] font-mono text-ink-ghost break-all">{workspace.path}</div>
          <ActionButton
            label={workspace.path === notesDir ? "当前工作区" : "切换"}
            disabled={workspace.path === notesDir}
            onClick={() =>
              void requestWorkspaceSwitch(workspace.id)
                .then(() => setStatus("工作区已切换"))
                .catch((error) => setStatus(String(error)))
            }
          />
        </div>
      ))}
      <StatusText value={status} />
      <WorkspaceDirectoryBrowser
        open={browserOpen}
        initialPath={notesDir}
        title="注册工作区"
        selectLabel="注册此目录"
        onCancel={() => setBrowserOpen(false)}
        onSelect={(path) => {
          setBrowserOpen(false);
          void register(path);
        }}
      />
    </ToolBody>
  );
}

function BackupTools({ notesDir }: { notesDir: string }) {
  const [backupDir, setBackupDir] = useState("");
  const [password, setPassword] = useState("");
  const [maxBackups, setMaxBackups] = useState(10);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [selected, setSelected] = useState<BackupMetadata | null>(null);
  const [browserPurpose, setBrowserPurpose] = useState<BrowserPurpose | null>(null);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async (directory: string) => {
    if (directory) setBackups(await listBackups(directory));
  }, []);

  useEffect(() => {
    void loadBackupConfig().then((config) => {
      setBackupDir(config.backupDir);
      setMaxBackups(config.maxBackups);
      void refresh(config.backupDir);
    });
  }, [refresh]);

  const create = async () => {
    if (!backupDir || !password) {
      setStatus("请选择备份目录并输入密码");
      return;
    }
    try {
      await saveBackupConfig({
        backupDir,
        autoBackup: false,
        backupInterval: 86400,
        maxBackups,
        encrypt: true,
        compress: true,
        compressionLevel: 6,
      });
      const result = await createBackup(notesDir, backupDir, { password, encrypt: true });
      setStatus(`已创建备份，共 ${result.fileCount} 个文件`);
      await refresh(backupDir);
    } catch (error) {
      setStatus(String(error));
    }
  };

  const restore = async (targetDir: string) => {
    if (!selected) return;
    try {
      const result = await restoreBackup(selected.id, backupDir, targetDir, { password });
      setStatus(`恢复 ${result.restoredFiles} 个文件，跳过 ${result.skippedFiles} 个`);
    } catch (error) {
      setStatus(String(error));
    }
  };

  return (
    <ToolBody>
      <PathRow value={backupDir} button="选择备份目录" onChoose={() => setBrowserPurpose("backup")} />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="备份密码"
        autoComplete="new-password"
        className="w-full h-8 px-2.5 rounded-lg border border-paper-deep/40 bg-paper-warm/70 text-[11px] text-ink outline-none focus:border-bamboo"
      />
      <label className="flex items-center justify-between text-[11px] text-ink-faint">
        <span>最多保留备份</span>
        <input
          type="number"
          min={1}
          max={100}
          value={maxBackups}
          onChange={(event) => setMaxBackups(Math.min(100, Math.max(1, Number(event.target.value) || 10)))}
          className="w-20 h-8 px-2 rounded-lg border border-paper-deep/40 bg-paper-warm/70 text-ink"
        />
      </label>
      <ActionButton label="创建加密备份" onClick={() => void create()} />
      {backups.map((backup) => (
        <button
          key={backup.id}
          type="button"
          onClick={() => setSelected(backup)}
          className={`w-full text-left rounded-xl border p-3 ${selected?.id === backup.id ? "border-bamboo bg-bamboo-mist/40" : "border-paper-deep/35"}`}
        >
          <div className="text-[11px] text-ink-soft">{formatBackupDate(backup.timestamp)}</div>
          <div className="text-[10px] text-ink-ghost">{backup.fileCount} 个文件 · {formatBackupSize(backup.compressedSize)}</div>
        </button>
      ))}
      <ActionButton
        label="恢复所选备份到新目录"
        disabled={!selected}
        onClick={() => setBrowserPurpose("backupRestore")}
      />
      <StatusText value={status} />
      <WorkspaceDirectoryBrowser
        open={browserPurpose !== null}
        initialPath={browserPurpose === "backup" ? backupDir || notesDir : notesDir}
        title={browserPurpose === "backup" ? "选择备份目录" : "选择恢复目标目录"}
        selectLabel="选择此目录"
        onCancel={() => setBrowserPurpose(null)}
        onSelect={(path) => {
          const purpose = browserPurpose;
          setBrowserPurpose(null);
          if (purpose === "backup") {
            setBackupDir(path);
            void refresh(path).catch((error) => setStatus(String(error)));
          } else {
            void restore(path);
          }
        }}
      />
    </ToolBody>
  );
}

function MigrationTools() {
  const [sourceDir, setSourceDir] = useState("");
  const [targetDir, setTargetDir] = useState("");
  const [analysis, setAnalysis] = useState<MigrationAnalysis | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [browserPurpose, setBrowserPurpose] = useState<BrowserPurpose | null>(null);
  const [status, setStatus] = useState("");

  const analyze = async () => {
    try {
      setAnalysis(await analyzeMigration(sourceDir, targetDir));
      setReport(null);
      setStatus("分析完成，源工作区未被修改");
    } catch (error) {
      setStatus(String(error));
    }
  };

  const execute = async () => {
    try {
      setReport(await executeMigration(sourceDir, targetDir));
      setStatus("复制迁移完成");
    } catch (error) {
      setStatus(String(error));
    }
  };

  return (
    <ToolBody>
      <PathRow value={sourceDir} button="选择 v3 源目录" onChoose={() => setBrowserPurpose("migrationSource")} />
      <PathRow value={targetDir} button="选择 v4 目标目录" onChoose={() => setBrowserPurpose("migrationTarget")} />
      <div className="flex gap-2">
        <ActionButton label="分析与预览" disabled={!sourceDir || !targetDir} onClick={() => void analyze()} />
        <ActionButton label="执行复制迁移" disabled={!analysis} onClick={() => void execute()} />
      </div>
      {analysis && (
        <InfoBox text={`Markdown ${analysis.markdownFiles}，附件 ${analysis.attachmentFiles}，旧可视化文件 ${analysis.legacyVisualFiles}`} />
      )}
      {report && (
        <InfoBox text={`复制 Markdown ${report.copiedMarkdown}，附件 ${report.copiedAttachments}，归档 legacy ${report.archivedLegacyFiles}，错误 ${report.errors.length}`} />
      )}
      <StatusText value={status} />
      <WorkspaceDirectoryBrowser
        open={browserPurpose !== null}
        initialPath={browserPurpose === "migrationSource" ? sourceDir : targetDir}
        title={browserPurpose === "migrationSource" ? "选择只读源工作区" : "选择迁移目标目录"}
        selectLabel="选择此目录"
        onCancel={() => setBrowserPurpose(null)}
        onSelect={(path) => {
          if (browserPurpose === "migrationSource") setSourceDir(path);
          else setTargetDir(path);
          setAnalysis(null);
          setReport(null);
          setBrowserPurpose(null);
        }}
      />
    </ToolBody>
  );
}

function GitTools({ notesDir }: { notesDir: string }) {
  const [message, setMessage] = useState("");
  const [snapshots, setSnapshots] = useState<GitSnapshot[]>([]);
  const [selected, setSelected] = useState<GitSnapshot | null>(null);
  const [changes, setChanges] = useState<GitSnapshotChange[]>([]);
  const [restoreBrowser, setRestoreBrowser] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    try {
      setSnapshots(await listGitSnapshots(notesDir));
    } catch {
      setSnapshots([]);
    }
  }, [notesDir]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ToolBody>
      <div className="flex gap-2">
        <ActionButton
          label="明确启用 Git"
          onClick={() =>
            void enableGitSnapshots(notesDir)
              .then(() => {
                setStatus("Git 快照已启用");
                return refresh();
              })
              .catch((error) => setStatus(String(error)))
          }
        />
        <ActionButton
          label="创建快照"
          onClick={() =>
            void createGitSnapshot(notesDir, message)
              .then(() => {
                setMessage("");
                setStatus("快照已创建");
                return refresh();
              })
              .catch((error) => setStatus(String(error)))
          }
        />
      </div>
      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="快照说明（可选）"
        className="w-full h-8 px-2.5 rounded-lg border border-paper-deep/40 bg-paper-warm/70 text-[11px] text-ink outline-none focus:border-bamboo"
      />
      {snapshots.map((snapshot) => (
        <button
          key={snapshot.id}
          type="button"
          onClick={() => {
            setSelected(snapshot);
            void compareGitSnapshot(notesDir, snapshot.id)
              .then(setChanges)
              .catch((error) => setStatus(String(error)));
          }}
          className={`w-full text-left rounded-xl border p-3 ${selected?.id === snapshot.id ? "border-bamboo bg-bamboo-mist/40" : "border-paper-deep/35"}`}
        >
          <div className="text-[11px] text-ink-soft">{snapshot.message}</div>
          <div className="text-[10px] text-ink-ghost">{new Date(snapshot.createdAt).toLocaleString()} · {snapshot.id.slice(0, 8)}</div>
        </button>
      ))}
      {selected && (
        <>
          <InfoBox text={changes.length ? changes.map((change) => `${change.status}: ${change.path}`).join("\n") : "当前工作区与该快照没有差异"} />
          <ActionButton label="恢复所选快照到新目录" onClick={() => setRestoreBrowser(true)} />
        </>
      )}
      <StatusText value={status} />
      <WorkspaceDirectoryBrowser
        open={restoreBrowser}
        initialPath={notesDir}
        title="选择 Git 快照恢复目录"
        selectLabel="恢复到此目录"
        onCancel={() => setRestoreBrowser(false)}
        onSelect={(path) => {
          setRestoreBrowser(false);
          if (!selected) return;
          void restoreGitSnapshot(notesDir, selected.id, path)
            .then((count) => setStatus(`已恢复 ${count} 个文件`))
            .catch((error) => setStatus(String(error)));
        }}
      />
    </ToolBody>
  );
}

function PanelHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <header className="h-11 px-4 flex items-center justify-between border-b border-paper-deep/30">
      <div className="flex items-center gap-2">
        {onBack && <button type="button" onClick={onBack} className="text-[11px] text-bamboo">返回</button>}
        <h2 className="text-[13px] text-ink-soft">{title}</h2>
      </div>
      <button type="button" onClick={onClose} className="text-[11px] text-ink-faint">关闭</button>
    </header>
  );
}

function ToolBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>;
}

function ToolButton({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-paper-deep/35 p-3 text-left hover:bg-bamboo-mist/40">
      <div className="text-[12px] text-ink-soft">{title}</div>
      <div className="text-[10px] text-ink-ghost mt-1">{detail}</div>
    </button>
  );
}

function ActionButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex-1 min-h-8 px-3 rounded-lg border border-bamboo/40 text-[11px] text-bamboo disabled:opacity-35">
      {label}
    </button>
  );
}

function PathRow({ value, button, onChoose }: { value: string; button: string; onChoose: () => void }) {
  return (
    <div className="space-y-1.5">
      <div className="min-h-8 px-2.5 py-2 rounded-lg border border-paper-deep/35 bg-paper-warm/60 text-[10px] font-mono text-ink-faint break-all">
        {value || "尚未选择目录"}
      </div>
      <ActionButton label={button} onClick={onChoose} />
    </div>
  );
}

function StatusText({ value }: { value: string }) {
  return value ? <div className="rounded-lg bg-paper-warm/60 p-2.5 text-[10px] text-ink-faint break-words">{value}</div> : null;
}

function InfoBox({ text }: { text: string }) {
  return <pre className="whitespace-pre-wrap rounded-lg border border-paper-deep/30 p-2.5 text-[10px] text-ink-faint">{text}</pre>;
}

function toolTitle(tool: Tool): string {
  return {
    menu: "数据与高级工具",
    workspaces: "多工作区",
    backup: "加密备份",
    migration: "v3 复制迁移",
    git: "Git 快照",
    sync: "WebDAV 同步",
  }[tool];
}
