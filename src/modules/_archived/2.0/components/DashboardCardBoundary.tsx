/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
  retryKey: number;
}

export class DashboardCardBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error: error.message || "卡片加载失败" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard card failed", error, info);
  }

  private retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
          <p className="text-[12px] text-red-500">{this.state.error}</p>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-lg border border-bamboo/40 px-3 py-1.5 text-[11px] text-bamboo"
          >
            重试
          </button>
        </div>
      );
    }
    return <div key={this.state.retryKey} className="h-full">{this.props.children}</div>;
  }
}
