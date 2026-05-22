/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { GraphSidebar } from "./GraphSidebar";
import { RelationGraph } from "./RelationGraph";
import { MindMapGalaxy } from "./MindMapGalaxy";
import { StarCluster3D } from "./StarCluster3D";
import { DashboardOverview } from "./DashboardOverview";

export function GraphDashboard() {
  const { activeMode } = useGraphStore();
  const { loadNotes, loadFullNotes, linkGraph } = useNoteStore();

  useEffect(() => {
    void (async () => {
      await loadNotes();
      await loadFullNotes();
    })();
  }, [loadNotes, loadFullNotes]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        useGraphStore.setState({ sidebarCollapsed: true });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <GraphSidebar />
      <main className="flex-1 min-w-0">
        {activeMode === "relation" ? (
          <RelationGraph />
        ) : activeMode === "galaxy" ? (
          <MindMapGalaxy />
        ) : activeMode === "starcluster" ? (
          <StarCluster3D
            nodes={linkGraph.nodes}
            edges={linkGraph.edges}
          />
        ) : (
          <DashboardOverview />
        )}
      </main>
    </div>
  );
}
