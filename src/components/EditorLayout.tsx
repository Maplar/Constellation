/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { MainWindow } from "../modules/notes/components/MainWindow";
import type { AppConfig } from "../modules/shared/types/settings";

interface EditorLayoutProps {
  initialConfig?: AppConfig;
}

export function EditorLayout({ initialConfig }: EditorLayoutProps) {
  return (
    <div className="flex-1 flex min-h-0">
      <MainWindow hideTitleBar initialConfig={initialConfig} />
    </div>
  );
}
