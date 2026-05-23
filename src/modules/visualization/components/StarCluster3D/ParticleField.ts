/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 粒子背景 — Three.js 辅助模块
 */

import * as THREE from "three";

/**
 * 创建星空粒子背景
 */
export function createParticleField(
  count: number,
  isDark: boolean,
  glowIntensity: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 3000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 3000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 3000;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: isDark ? 0x888899 : 0xaaaacc,
    size: 1.2,
    transparent: true,
    opacity: isDark ? 0.4 + glowIntensity * 0.3 : 0.2 + glowIntensity * 0.2,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.userData.isStarfield = true;
  return points;
}
