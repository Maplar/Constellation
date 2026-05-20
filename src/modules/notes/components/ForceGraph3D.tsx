/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceRadial,
  forceCollide,
} from "d3-force-3d";
import type { Simulation, SimulationNodeDatum, SimulationLinkDatum } from "d3-force-3d";
import { useNoteStore } from "../stores/useNoteStore";

interface ForceGraph3DProps {
  onNodeClick?: (noteId: string) => void;
}

interface SimNode3D extends SimulationNodeDatum {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
}

interface SimLink3D extends SimulationLinkDatum<SimNode3D> {
  source: string | SimNode3D;
  target: string | SimNode3D;
  label: string | null;
  value: number;
}

function resolveThemeColors(): { bg: string } {
  if (typeof document === "undefined") return { bg: "#fcfaf6" };
  const theme = document.documentElement.getAttribute("data-theme");
  return { bg: theme === "dark" ? "#1a1a18" : "#fcfaf6" };
}

export function ForceGraph3D({ onNodeClick }: ForceGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const simRef = useRef<Simulation<SimNode3D, SimLink3D> | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeLinesRef = useRef<THREE.Line[]>([]);
  const animFrameRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const linkGraph = useNoteStore((s) => s.linkGraph);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);

  const handleNodeClick = useCallback(
    (noteId: string) => {
      onNodeClick?.(noteId);
    },
    [onNodeClick],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (width === 0 || height === 0) return;

    if (linkGraph.nodes.length === 0 && linkGraph.edges.length === 0) return;

    if (rendererRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      rendererRef.current.dispose();
      if (container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
    }
    if (simRef.current) {
      simRef.current.stop();
    }
    nodeMeshesRef.current.clear();
    edgeLinesRef.current = [];

    const colors = resolveThemeColors();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.Fog(colors.bg, 800, 2000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);
    camera.position.set(0, 120, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x888888, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(300, 400, 300);
    scene.add(dirLight);
    const pointLight1 = new THREE.PointLight(0x7ebea5, 0.8, 800);
    pointLight1.position.set(0, 0, 400);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xa3c9b7, 0.4, 600);
    pointLight2.position.set(0, 0, -300);
    scene.add(pointLight2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 100;
    controls.maxDistance = 1500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const relatedIds = new Set<string>();
    if (selectedNoteId) {
      relatedIds.add(selectedNoteId);
      for (const edge of linkGraph.edges) {
        if (edge.source === selectedNoteId) relatedIds.add(edge.target);
        if (edge.target === selectedNoteId) relatedIds.add(edge.source);
      }
    }

    const simNodes: SimNode3D[] = linkGraph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      val: n.val,
      color: n.color,
      noteId: n.noteId,
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 300,
      z: (Math.random() - 0.5) * 300,
    }));

    const nodeGeometry = new THREE.SphereGeometry(1, 32, 32);

    for (const simNode of simNodes) {
      const nodeColor = new THREE.Color(simNode.color);
      const scale = Math.max(3, simNode.val * 6);
      const isRelated = !selectedNoteId || relatedIds.has(simNode.noteId);

      const material = new THREE.MeshPhongMaterial({
        color: nodeColor,
        emissive: nodeColor.clone().multiplyScalar(0.3),
        shininess: 30,
        transparent: true,
        opacity: isRelated ? 1 : 0.25,
      });

      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.scale.setScalar(scale);
      mesh.position.set(simNode.x ?? 0, simNode.y ?? 0, simNode.z ?? 0);
      mesh.userData = { noteId: simNode.noteId };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
      nodeMeshesRef.current.set(simNode.id, mesh);
    }

    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);

    const edgeMap = new Map<string, { source: string; target: string }>();
    for (const edge of linkGraph.edges) {
      const key = `${edge.source}-${edge.target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source: edge.source, target: edge.target });
      }
    }

    for (const [, re] of edgeMap) {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.3,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.userData = { source: re.source, target: re.target };
      edgeGroup.add(line);
      edgeLinesRef.current.push(line);
    }

    const simLinks: SimLink3D[] = linkGraph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
      value: e.value,
    }));

    const sim = forceSimulation<SimNode3D>(simNodes)
      .force(
        "link",
        forceLink<SimNode3D, SimLink3D>(simLinks)
          .id((d: SimNode3D) => d.id)
          .distance(80)
          .strength((d: SimLink3D) => Math.min(0.4, d.value * 0.15)),
      )
      .force("charge", forceManyBody<SimNode3D>().strength(-200))
      .force("center", forceCenter<SimNode3D>(0, 0, 0).strength(0.05))
      .force(
        "radial",
        forceRadial<SimNode3D>((d: SimNode3D) => 60 / (d.val + 0.8)).strength(
          (d: SimNode3D) => 0.2 + d.val * 0.15,
        ),
      )
      .force("collide", forceCollide<SimNode3D>().radius((d: SimNode3D) => d.val * 6 + 8))
      .on("tick", () => {
        for (const mesh of nodeMeshesRef.current.values()) {
          const nodeId = mesh.userData.noteId as string;
          const simNode = simNodes.find((n) => n.noteId === nodeId);
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

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    animate();

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
      cancelAnimationFrame(animFrameRef.current);
      sim.stop();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      nodeMeshesRef.current.clear();
      edgeLinesRef.current = [];
    };
  }, [linkGraph, selectedNoteId, handleNodeClick]);

  return <div ref={containerRef} className="w-full h-full min-h-0 overflow-hidden relative" />;
}
