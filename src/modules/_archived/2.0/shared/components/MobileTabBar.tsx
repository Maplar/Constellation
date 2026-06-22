/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { type ReactNode } from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface MobileTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function MobileTabBar({ tabs, activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 bg-cloud/95 backdrop-blur-sm border-t border-paper-deep/30 z-50 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'text-bamboo'
                : 'text-ink-ghost hover:text-ink-faint'
            }`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {tab.icon}
            </span>
            <span className="text-[9px] font-medium tracking-wide">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
