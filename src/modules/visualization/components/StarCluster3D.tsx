/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as d3Force3d from "d3-force-3d";
import type { GraphNode, GraphEdge } from "../../shared/types/notes";
import { getCategoryColor } from "../utils/colorMap";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore } from "../stores/useGraphStore";
import { useVisibility } from "../hooks/useVisibility";
import { CanvasContainer } from "./shared/CanvasContainer";
import { ClusterToolbar } from "./StarCluster3D/ClusterToolbar";
import { createParticleField } from "./StarCluster3D/ParticleField";
import { addGlowToNode } from "./StarCluster3D/GlowEffect";

interface StarCluster3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxNodes?: number;
}

interface SimNode3D extends d3Force3d.SimulationNodeDatum {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
  category: string;
}

interface SimLink3D extends d3Force3d.SimulationLinkDatum<SimNode3D> {
  source: string | SimNode3D;
  target: string | SimNode3D;
  label: string | null;
  value: number;
}

interface HoverInfo {
  nodeId: string;
  label: string;
  category: string;
  val: number;
  x: number;
  y: number;
}

function resolveThemeColors(): {
  bg: string;
  lineColor: number;
  lightColor: number;
  ambientColor: number;
} {
  if (typeof document === "undefined")
    return {
      bg: "#0d1117",
      lineColor: 0x555555,
      lightColor: 0xffffff,
      ambientColor: 0x666666,
    };
  const theme = document.documentElement.getAttribute("data-theme");
  const isDark = theme === "dark";
  return {
    bg: isDark ? "#0d1117" : "#1a1a2e",
    lineColor: isDark ? 0x444455 : 0x666677,
    lightColor: isDark ? 0xcccccc : 0xffffff,
    ambientColor: isDark ? 0x555555 : 0x777777,
  };
}

const MATERIAL_CACHE = new Map<string, THREE.MeshPhongMaterial>();

function getCachedMaterial(color: string, opacity: number): THREE.MeshPhongMaterial {
  const key = `${color}-${opacity}`;
  let mat = MATERIAL_CACHE.get(key);
  if (!mat) {
    const c = new THREE.Color(color);
    mat = new THREE.MeshPhongMaterial({
      color: c,
      emissive: c.clone().multiplyScalar(0.35),
      shininess: 50,
      transparent: true,
      opacity,
    });
    MATERIAL_CACHE.set(key, mat);
  }
  return mat;
}

function mapNodeSize(val: number, maxVal: number): number {
  if (maxVal <= 0) return 3;
  const minSize = 3;
  const maxSize = 15;
  return minSize + (val / maxVal) * (maxSize - minSize);
}

export function StarCluster3D({ nodes, edges, maxNodes = 300 }: StarCluster3DProps) {
  const [visibilityRef, isVisible] = useVisibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const simRef = useRef<d3Force3d.Simulation<SimNode3D, SimLink3D> | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeLinesRef = useRef<THREE.Line[]>([]);
  const animFrameRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const simNodeMapRef = useRef<Map<string, SimNode3D>>(new Map());

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);

  const { notesMetadata, selectNote } = useNoteStore();
  const { selectNode, graphParams, activeFilters } = useGraphStore();

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  /* ── Filter nodes by activeFilters ── */
  const filteredNodes = useMemo(() => {
    if (activeFilters.length === 0) return nodes;
    return nodes.filter((n) => {
      const cat = categoryMap.get(n.noteId) || "未分类";
      return activeFilters.includes(cat);
    });
  }, [nodes, activeFilters, categoryMap]);

  const filteredEdges = useMemo(() => {
    if (activeFilters.length === 0) return edges;
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes, activeFilters]);

  const handleNodeClick = useCallback(
    (noteId: string) => {
      selectNote(noteId);
      selectNode(noteId);
    },
    [selectNote, selectNode],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const width = bounds.width || 800;
    const height = bounds.height || 600;

    if (filteredNodes.length === 0 && filteredEdges.length === 0) return;

    let visibleNodes = filteredNodes;
    if (maxNodes != null && filteredNodes.length > maxNodes) {
      visibleNodes = [...filteredNodes].sort((a, b) => b.val - a.val).slice(0, maxNodes);
    }
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = filteredEdges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
    );

    if (rendererRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      const oldRenderer = rendererRef.current;
      if (container.contains(oldRenderer.domElement)) {
        container.removeChild(oldRenderer.domElement);
      }
      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }
      oldRenderer.dispose();
    }
    if (simRef.current) {
      simRef.current.stop();
    }
    nodeMeshesRef.current.clear();
    edgeLinesRef.current = [];
    simNodeMapRef.current.clear();

    const colors = resolveThemeColors();
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.bg, 800, 2500);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 4000);
    camera.position.set(0, 120, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(colors.ambientColor, 0.5));
    const dirLight = new THREE.DirectionalLight(colors.lightColor, 0.6);
    dirLight.position.set(300, 400, 300);
    scene.add(dirLight);

    /* ── Particle field ── */
    const particles = createParticleField(graphParams.particleCount, isDark, graphParams.glowIntensity);
    scene.add(particles);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 100;
    controls.maxDistance = 1500;
    controls.target.set(0, 0, 0);
    controls.autoRotate = graphParams.autoRotate;
    controls.autoRotateSpeed = 0.3;
    controlsRef.current = controls;

    const maxVal = Math.max(...visibleNodes.map((n) => n.val), 1);

    const simNodes: SimNode3D[] = visibleNodes.map((n) => ({
      id: n.id,
      label: n.label,
      val: n.val,
      color: getCategoryColor(categoryMap.get(n.noteId) || "未分类"),
      noteId: n.noteId,
      category: categoryMap.get(n.noteId) || "未分类",
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 300,
      z: (Math.random() - 0.5) * 300,
    }));

    const simNodeMap = new Map<string, SimNode3D>();
    for (const sn of simNodes) {
      simNodeMap.set(sn.noteId, sn);
      simNodeMapRef.current.set(sn.id, sn);
    }

    const nodeGeometry = new THREE.SphereGeometry(1, 32, 32);

    for (const simNode of simNodes) {
      const scale = mapNodeSize(simNode.val, maxVal);
      const material = getCachedMaterial(simNode.color, 1);

      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.scale.setScalar(scale);
      mesh.position.set(simNode.x ?? 0, simNode.y ?? 0, simNode.z ?? 0);
      mesh.userData = {
        noteId: simNode.noteId,
        label: simNode.label,
        category: simNode.category,
        val: simNode.val,
      };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      /* ── Glow effect using helper ── */
      addGlowToNode(mesh, simNode.color, simNode.val / maxVal, graphParams.glowIntensity);

      scene.add(mesh);
      nodeMeshesRef.current.set(simNode.id, mesh);
    }

    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);

    const edgeMap = new Map<string, { source: string; target: string }>();
    for (const edge of visibleEdges) {
      const key = `${edge.source}-${edge.target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source: edge.source, target: edge.target });
      }
    }

    for (const [, re] of edgeMap) {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: colors.lineColor,
        transparent: true,
        opacity: 0.2,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.userData = { source: re.source, target: re.target };
      edgeGroup.add(line);
      edgeLinesRef.current.push(line);
    }

    const simLinks: SimLink3D[] = visibleEdges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
      value: e.value,
    }));

    const sim = d3Force3d
      .forceSimulation<SimNode3D>(simNodes)
      .force(
        "link",
        d3Force3d
          .forceLink<SimNode3D, SimLink3D>(simLinks)
          .id((d: SimNode3D) => d.id)
          .distance(80)
          .strength((d: SimLink3D) => Math.min(0.4, d.value * 0.15)),
      )
      .force("charge", d3Force3d.forceManyBody<SimNode3D>().strength(-150))
      .force(
        "x",
        d3Force3d
          .forceX<SimNode3D>(0)
          .strength((d: SimNode3D) => (d.val / maxVal) * 0.2),
      )
      .force(
        "y",
        d3Force3d
          .forceY<SimNode3D>(0)
          .strength((d: SimNode3D) => (d.val / maxVal) * 0.2),
      )
      .force(
        "z",
        d3Force3d
          .forceZ<SimNode3D>(0)
          .strength((d: SimNode3D) => (d.val / maxVal) * 0.2),
      )
      .force("center", d3Force3d.forceCenter<SimNode3D>(0, 0, 0).strength(0.03))
      .force(
        "collide",
        d3Force3d
          .forceCollide<SimNode3D>()
          .radius((d: SimNode3D) => mapNodeSize(d.val, maxVal) + 4),
      )
      .on("tick", () => {
        for (const mesh of nodeMeshesRef.current.values()) {
          const nodeId = mesh.userData.noteId as string;
          const simNode = simNodeMap.get(nodeId);
          if (simNode) {
            mesh.position.set(simNode.x ?? 0, simNode.y ?? 0, simNode.z ?? 0);
          }
        }

        for (const line of edgeLinesRef.current) {
          const srcId = line.userData.source as string;
          const tgtId = line.userData.target as string;
          const srcMesh = nodeMeshesRef.current.get(srcId);
          const tgtMesh = nodeMeshesRef.current.get(tgtId);
          if (srcMesh && tgtMesh) {
            const positions = line.geometry.attributes.position;
            positions.setXYZ(0, srcMesh.position.x, srcMesh.position.y, srcMesh.position.z);
            positions.setXYZ(1, tgtMesh.position.x, tgtMesh.position.y, tgtMesh.position.z);
            positions.needsUpdate = true;
          }
        }
      });

    simRef.current = sim;

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const b = container.getBoundingClientRect();
      renderer.setSize(b.width, b.height);
      camera.aspect = b.width / Math.max(1, b.height);
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    const handleClick = (event: MouseEvent) => {
      if (!container || !camera) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const noteId = intersects[0].object.userData.noteId as string;
        if (noteId) handleNodeClick(noteId);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    const handlePointerMove = (event: MouseEvent) => {
      if (!container || !camera) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const noteId = obj.userData.noteId as string;
        const label = obj.userData.label as string;
        const category = obj.userData.category as string;
        const val = obj.userData.val as number;

        const screenPos = obj.position.clone().project(camera);
        const x = ((screenPos.x + 1) / 2) * rect.width;
        const y = ((-screenPos.y + 1) / 2) * rect.height;

        setHoverInfo({ nodeId: noteId, label, category, val, x, y });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoverInfo(null);
        renderer.domElement.style.cursor = "default";
      }
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    let isAnimating = true;
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      if (!isAnimating) return;
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    animate();

    const visibilityCheckInterval = setInterval(() => {
      isAnimating = isVisible;
    }, 500);

    const themeObserver = new MutationObserver(() => {
      if (sceneRef.current) {
        const c = resolveThemeColors();
        sceneRef.current.background = new THREE.Color(c.bg);
        if (sceneRef.current.fog instanceof THREE.Fog) {
          sceneRef.current.fog.color = new THREE.Color(c.bg);
        }
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      clearInterval(visibilityCheckInterval);
      cancelAnimationFrame(animFrameRef.current);
      sim.stop();
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      nodeMeshesRef.current.clear();
      edgeLinesRef.current = [];
      simNodeMapRef.current.clear();
      setHoverInfo(null);
    };
  }, [filteredNodes, filteredEdges, maxNodes, handleNodeClick, isVisible, graphParams.autoRotate, graphParams.glowIntensity, graphParams.particleCount, categoryMap]);

  const infoText = `当前: 引用星团图 | ${filteredNodes.length} 节点 | 3D 模式`;

  return (
    <CanvasContainer toolbar={<ClusterToolbar focusedCategory={focusedCategory} onFocusCategory={setFocusedCategory} />} infoText={infoText}>
      <div
        ref={(el) => {
          containerRef.current = el;
          if (visibilityRef) {
            (visibilityRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        className="w-full h-full min-h-0 overflow-hidden relative"
      >
        {hoverInfo && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg"
            style={{
              left: hoverInfo.x + 12,
              top: hoverInfo.y - 40,
              backgroundColor: "var(--color-cloud)",
              border: "1px solid var(--color-paper-deep)",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              transform: "translateX(-50%)",
            }}
          >
            <div
              className="text-[12px] font-medium whitespace-nowrap"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {hoverInfo.label}
            </div>
            <div
              className="text-[10px] flex items-center gap-2"
              style={{ color: "var(--color-ink-ghost)" }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: getCategoryColor(hoverInfo.category) }}
              />
              {hoverInfo.category} · 被引用 {hoverInfo.val} 次
            </div>
          </div>
        )}
      </div>
    </CanvasContainer>
  );
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat?.dispose();
      }
    }
    if (obj instanceof THREE.Light) {
      obj.dispose();
    }
  });
  scene.clear();
  MATERIAL_CACHE.clear();
}
