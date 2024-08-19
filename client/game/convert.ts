import { Index } from '../interface';
import { UNIT } from './obj';
import * as THREE from 'three';

const HALF_UNIT = UNIT / 2;

export type IndexKey = string;

export function convertPositionToIndex(position: THREE.Vector3): Index {
  return {
    k: Math.floor(position.y / UNIT) + 1,
    i: -Math.floor((position.z + HALF_UNIT) / UNIT),
    j: Math.floor((position.x + HALF_UNIT) / UNIT),
  };
}

export function convertIndexToPosition(index: Index): THREE.Vector3 {
  const { k, i, j } = index;
  return new THREE.Vector3(j * UNIT, (k - 1) * UNIT, -i * UNIT);
}

export function convertDirectionToIndex(direction: THREE.Vector3): Index {
  return {
    k: 0,
    i: -direction.z,
    j: direction.x,
  };
}

export function convertIndexToDirection(index: Index): THREE.Vector3 {
  return new THREE.Vector3(index.j, 0, -index.i).multiplyScalar(UNIT);
}

export function convertToIndexKey(index: Index): string {
  return `${index.k},${index.i},${index.j}`;
}
