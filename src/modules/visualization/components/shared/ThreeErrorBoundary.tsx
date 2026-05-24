/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { Component, type ReactNode, Suspense } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ThreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
          <div className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>
            WebGL 不可用或初始化失败
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors"
            style={{
              backgroundColor: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LazyThreeProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
}

export function LazyThreeContainer({ children, loadingFallback }: LazyThreeProps) {
  return (
    <ThreeErrorBoundary>
      <Suspense
        fallback={
          loadingFallback ?? (
            <div className="flex items-center justify-center h-full">
              <span className="text-[12px] animate-pulse" style={{ color: "var(--text-muted)" }}>
                加载中…
              </span>
            </div>
          )
        }
      >
        {children}
      </Suspense>
    </ThreeErrorBoundary>
  );
}
