/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 辉光效果 — Three.js 辅助模块
 */

import * as THREE from "three";

/**
 * 为高引用节点添加 PointLight 辉光
 */
export function addGlowToNode(
  mesh: THREE.Mesh,
  color: string,
  intensity: number,
  glowIntensity: number,
): THREE.PointLight | null {
  if (intensity <= 0.15) return null;

  const light = new THREE.PointLight(
    new THREE.Color(color),
    (intensity * glowIntensity * 0.5),
    100,
  );
  mesh.add(light);
  return light;
}
