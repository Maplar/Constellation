/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 粒子背景 — 添加到 Three.js 场景
 * - 随机点范围 -200 ~ 200
 * - 白色 PointsMaterial, size 0.2
 * - 支持更新粒子数（移除旧 Points 再重建）
 */

import * as THREE from "three";

/** 跟踪每个场景的粒子 Points 对象，用于更新时移除 */
const sceneParticleMap = new WeakMap<THREE.Scene, THREE.Points>();

/**
 * 向场景添加粒子背景。
 * 若场景已有粒子，先移除旧的再创建新的。
 * @returns 新创建的 THREE.Points
 */
export function addParticleField(
  scene: THREE.Scene,
  count: number = 500,
): THREE.Points {
  // 移除旧粒子
  const old = sceneParticleMap.get(scene);
  if (old) {
    old.geometry.dispose();
    (old.material as THREE.Material).dispose();
    scene.remove(old);
  }

  // 生成随机位置
  const span = 400; // -200 ~ 200
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * span;
    positions[i * 3 + 1] = (Math.random() - 0.5) * span;
    positions[i * 3 + 2] = (Math.random() - 0.5) * span;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
  sceneParticleMap.set(scene, points);
  return points;
}

/**
 * 更新场景中现有粒子的数量。
 * 直接调用 addParticleField 即可（内部会先移除旧的）。
 */
export function updateParticleField(
  scene: THREE.Scene,
  count: number,
): THREE.Points {
  return addParticleField(scene, count);
}
