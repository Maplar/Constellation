/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { GraphDashboard } from "../../visualization/components/GraphDashboard";

interface GraphViewProps {
  onBack?: () => void;
}

export function GraphView({ onBack }: GraphViewProps = {}) {
  return <GraphDashboard onBack={onBack} />;
}
