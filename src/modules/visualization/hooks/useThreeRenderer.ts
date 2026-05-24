/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * Three.js 渲染器自定义 Hook
 * - 等待容器非零尺寸后初始化
 * - 统一管理 scene/camera/renderer 生命周期
 * - 返回 cleanup 函数确保资源释放
 * - 限制 devicePixelRatio ≤ 2
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

export interface ThreeRendererResult {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  containerWidth: number;
  containerHeight: number;
  isReady: boolean;
}

export function useThreeRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options?: {
    alpha?: boolean;
    antialias?: boolean;
    fov?: number;
    near?: number;
    far?: number;
    background?: string;
  },
) {
  const alpha = options?.alpha ?? true;
  const antialias = options?.antialias ?? true;
  const fov = options?.fov ?? 45;
  const near = options?.near ?? 1;
  const far = options?.far ?? 4000;
  const background = options?.background ?? "#1a1a2e";

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const animFrameRef = useRef<number>(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isReady, setIsReady] = useState(false);

  const initRenderer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const w = bounds.width || 0;
    const h = bounds.height || 0;

    if (w <= 0 || h <= 0) {
      setIsReady(false);
      return;
    }

    disposeIfExists();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov, w / h, near, far);
    camera.position.set(0, 120, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias, alpha });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);
    setSize({ w, h });
    setIsReady(true);
  }, [containerRef, alpha, antialias, fov, near, far, background]);

  const disposeIfExists = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    if (rendererRef.current) {
      const r = rendererRef.current;
      r.dispose();
      try {
        const gl = r.getContext() as WebGLRenderingContext | null;
        if (gl && typeof (gl as WebGL2RenderingContext).getExtension === "function") {
          const ext = (gl as WebGL2RenderingContext).getExtension("WEBGL_lose_context");
          if (ext) ext.loseContext();
        }
      } catch {
        /* WebGL context loss is best-effort */
      }
      if (r.domElement.parentElement) {
        r.domElement.parentElement.removeChild(r.domElement);
      }
      rendererRef.current = null;
    }

    if (sceneRef.current) {
      disposeDeep(sceneRef.current);
      sceneRef.current = null;
    }

    cameraRef.current = null;
    setSize({ w: 0, h: 0 });
    setIsReady(false);
  }, []);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;
    const b = container.getBoundingClientRect();
    const w = b.width || 0;
    const h = b.height || 0;
    if (w <= 0 || h <= 0) return;
    rendererRef.current.setSize(w, h);
    cameraRef.current.aspect = w / Math.max(1, h);
    cameraRef.current.updateProjectionMatrix();
    setSize({ w, h });
  }, [containerRef]);

  const startLoop = useCallback((tick: () => void) => {
    function loop() {
      animFrameRef.current = requestAnimationFrame(loop);
      tick();
    }
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    roRef.current = new ResizeObserver(() => {
      handleResize();
      if (!rendererRef.current) {
        initRenderer();
      }
    });
    roRef.current.observe(container);

    initRenderer();

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
      disposeIfExists();
    };
  }, [containerRef, initRenderer, handleResize, disposeIfExists]);

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    containerWidth: size.w,
    containerHeight: size.h,
    isReady,
    disposeIfExists,
    startLoop,
  };
}

function disposeDeep(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat?.dispose();
      }
    }
    if (child instanceof THREE.Light) {
      child.dispose();
    }
  });
  obj.clear();
}
