/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface WorkspaceRecord {
  id: string;
  name: string;
  path: string;
  registeredAt: string;
  lastOpenedAt: string;
}

export interface WorkspaceStatus {
  active: WorkspaceRecord | null;
  documentCount: number;
  cachePath: string | null;
}

export interface BrowseEntry {
  name: string;
  path: string;
  isWorkspace: boolean;
  isDirectory: boolean;
}

export function listWorkspaces(): Promise<WorkspaceRecord[]> {
  return invoke("workspace_list");
}

export function registerWorkspace(path: string, name?: string): Promise<WorkspaceRecord> {
  return invoke("workspace_register", { path, name });
}

export function openWorkspace(id: string): Promise<WorkspaceRecord> {
  return invoke("workspace_open", { id });
}

export async function connectWorkspace(path: string, name?: string): Promise<WorkspaceRecord> {
  const workspace = await registerWorkspace(path, name);
  return openWorkspace(workspace.id);
}

export function switchWorkspace(id: string): Promise<WorkspaceRecord> {
  return invoke("workspace_switch", { id });
}

export interface WorkspaceSwitchRequestDetail {
  id: string;
  handled: boolean;
  resolve: (workspace: WorkspaceRecord) => void;
  reject: (error: unknown) => void;
}

export function requestWorkspaceSwitch(id: string): Promise<WorkspaceRecord> {
  return new Promise((resolve, reject) => {
    const detail: WorkspaceSwitchRequestDetail = {
      id,
      handled: false,
      resolve,
      reject,
    };
    window.dispatchEvent(
      new CustomEvent<WorkspaceSwitchRequestDetail>("request-workspace-switch", {
        detail,
      }),
    );
    queueMicrotask(() => {
      if (!detail.handled) {
        void switchWorkspace(id).then(resolve, reject);
      }
    });
  });
}

export function getWorkspaceStatus(): Promise<WorkspaceStatus> {
  return invoke("workspace_status");
}

export function browseWorkspaceDirectories(
  root?: string,
  options?: { includeFiles?: boolean; extensions?: string[] },
): Promise<BrowseEntry[]> {
  return invoke("workspace_browse", {
    root,
    includeFiles: options?.includeFiles,
    extensions: options?.extensions,
  });
}
