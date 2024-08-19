import * as THREE from 'three';
import { UNIT } from './obj';

export function newDirectionalLight(
  width: number,
  height: number
): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xffffff, 1);

  light.position.set(
    Math.floor(width / 2) * UNIT - 1500,
    1500,
    -Math.floor(height / 2) * UNIT
  );

  light.target.position.set(
    Math.floor(width / 2) * UNIT,
    0,
    -Math.floor(height / 2) * UNIT + 200
  );

  light.castShadow = true;
  light.shadow.camera.left = -UNIT * width;
  light.shadow.camera.right = UNIT * width;
  light.shadow.camera.top = UNIT * height;
  light.shadow.camera.bottom = -UNIT * height;
  light.shadow.camera.near = 10;
  light.shadow.camera.far = 5000;

  return light;
}

export function newAmbientLight(): THREE.AmbientLight {
  const light = new THREE.AmbientLight(0xffffff, 0.8);

  return light;
}
