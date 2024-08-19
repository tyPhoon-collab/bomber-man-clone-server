import { loadModel } from '../loader';
import * as THREE from 'three';

export const UNIT = 220;
export const PLAYER_RADIUS = 80;

export const EmptyValue = 0;

export async function newBomberManObject(position: THREE.Vector3) {
  const bomberMan = await loadModel('player/01-2');
  bomberMan.position.copy(position);

  return bomberMan;
}

export async function newGroundObject(width: number, height: number) {
  const ground = await loadModel('ground1');
  ground.position.set(
    Math.floor(width / 2) * UNIT,
    -30,
    -Math.floor(height / 2) * UNIT
  );
  ground.scale.set(16, 16, 16);

  return ground;
}

export async function newBombObject(position: THREE.Vector3) {
  const bomb = await loadModel('bomb2');
  bomb.position.copy(position);

  return bomb;
}
