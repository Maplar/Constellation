/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：力导向图 Web Worker
 */

import * as d3 from "d3";

interface Node {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string;
  target: string;
  label?: string | null;
  value?: number;
  edgeType?: "wiki" | "markdown" | "embed" | "similar";
}

interface WorkerInput {
  type: "init" | "tick" | "drag" | "reset";
  nodes?: Node[];
  edges?: Edge[];
  width?: number;
  height?: number;
  nodeId?: string;
  x?: number;
  y?: number;
  strength?: number;
}

interface WorkerOutput {
  type: "tick" | "end";
  nodes: Node[];
  edges: Edge[];
  alpha?: number;
}

let simulation: d3.Simulation<Node, Edge> | null = null;
let nodes: Node[] = [];
let edges: Edge[] = [];

function initSimulation(
  inputNodes: Node[],
  inputEdges: Edge[],
  width: number,
  height: number,
  strength: number = 0.1
) {
  const nodeIds = new Set(inputNodes.map((node) => node.id));
  nodes = inputNodes.map((n) => ({
    ...n,
    x: n.x ?? width / 2 + (Math.random() - 0.5) * 100,
    y: n.y ?? height / 2 + (Math.random() - 0.5) * 100,
  }));

  edges = inputEdges
    .filter((edge) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)))
    .map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

  if (simulation) {
    simulation.stop();
  }

  if (nodes.length === 0) {
    self.postMessage({ type: "end", nodes: [], edges: [] } satisfies WorkerOutput);
    return;
  }

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<Node, Edge>(edges)
        .id((d) => d.id)
        .distance(80)
    )
    .force("charge", d3.forceManyBody().strength(-100 * strength))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius((d) => Math.sqrt((d as Node).val) * 2 + 10))
    .alphaDecay(0.02)
    .velocityDecay(0.3);

  simulation.on("tick", () => {
    const output: WorkerOutput = {
      type: "tick",
      nodes: nodes.map((n) => ({
        ...n,
        x: n.x ?? 0,
        y: n.y ?? 0,
      })),
      edges: edges.map((e) => ({
        ...e,
        source: typeof e.source === "object" ? (e.source as Node).id : e.source,
        target: typeof e.target === "object" ? (e.target as Node).id : e.target,
      })),
      alpha: simulation?.alpha(),
    };
    self.postMessage(output);
  });

  simulation.on("end", () => {
    const output: WorkerOutput = {
      type: "end",
      nodes: nodes.map((n) => ({
        ...n,
        x: n.x ?? 0,
        y: n.y ?? 0,
      })),
      edges: edges.map((e) => ({
        ...e,
        source: typeof e.source === "object" ? (e.source as Node).id : e.source,
        target: typeof e.target === "object" ? (e.target as Node).id : e.target,
      })),
    };
    self.postMessage(output);
  });
}

function handleDrag(nodeId: string, x: number, y: number) {
  if (!simulation) return;

  const node = nodes.find((n) => n.id === nodeId);
  if (node) {
    node.fx = x;
    node.fy = y;
    simulation.alpha(0.3).restart();
  }
}

function handleReset() {
  if (!simulation) return;

  nodes.forEach((n) => {
    n.fx = null;
    n.fy = null;
  });
  simulation.alpha(0.3).restart();
}

function updateStrength(strength: number) {
  if (!simulation) return;

  simulation.force("charge", d3.forceManyBody().strength(-100 * strength));
  simulation.alpha(0.3).restart();
}

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const input = event.data;

  switch (input.type) {
    case "init":
      if (input.nodes && input.edges && input.width && input.height) {
        initSimulation(
          input.nodes,
          input.edges,
          input.width,
          input.height,
          input.strength
        );
      }
      break;

    case "drag":
      if (input.nodeId && input.x !== undefined && input.y !== undefined) {
        handleDrag(input.nodeId, input.x, input.y);
      }
      break;

    case "reset":
      handleReset();
      break;

    case "tick":
      if (input.strength !== undefined) {
        updateStrength(input.strength);
      }
      break;
  }
};
