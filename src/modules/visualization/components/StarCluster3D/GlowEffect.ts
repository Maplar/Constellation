/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 辉光效果 — Three.js 辅助模块
 */

import * as THREE from "three";

/**
 * 为引用数 > 3 的节点添加半透明辉光球。
 * 辉光球略大于节点本身，使用 MeshBasicMaterial。
 * @returns 辉光 Mesh 引用，用于后续更新透明度
 */
export function addGlowHalo(
  mesh: THREE.Mesh,
  color: string,
  glowIntensity: number,
): THREE.Mesh | null {
  if (glowIntensity <= 0) return null;

  const glowGeom = new THREE.SphereGeometry(1, 24, 24);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: glowIntensity * 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const halo = new THREE.Mesh(glowGeom, glowMat);
  // 比节点大 1.6 倍（节点 scale 由父 mesh 控制，halo 作为子节点叠加 scale）
  halo.scale.setScalar(1.6);
  mesh.add(halo);

  return halo;
}

/**
 * 更新辉光球透明度（响应 glowIntensity 变化）。
 * 遍历场景中所有带 halo 的节点进行更新。
 */
export function updateGlowIntensity(
  nodeMeshes: Map<string, THREE.Mesh>,
  glowIntensity: number,
): void {
  for (const mesh of nodeMeshes.values()) {
    for (const child of mesh.children) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = glowIntensity * 0.25;
      }
    }
  }
}
