import * as THREE from 'three';

export interface Field {
  data: number[][][];
  config: FieldConfig;
}

export interface FieldConfig {
  width: number;
  height: number;
  depth: number;

  objectPath: Record<number, string>;
  nonBlocker: number[];
  stunner: number[];
  breakable: number[];
  ignorable: number[];
  items: number[];
  bombs: number[];

  bombSpeed: number;
}

export interface Bomb {
  id: string;
  index: Index;
  state: string;
  dir: Index;
}

export class BombState {
  static moving = 'Moving';
  static placed = 'Placed';
}

export interface FieldDiff {
  index: Index;
  type: number;
}

export interface PlayerData {
  initIndex: Index;
}

export interface Index {
  k: number;
  i: number;
  j: number;
}

export function equalIndex(index1: Index, index2: Index): boolean {
  return index1.k == index2.k && index1.i == index2.i && index1.j == index2.j;
}

export function addIndex(index1: Index, index2: Index): Index {
  return {
    k: index1.k + index2.k,
    i: index1.i + index2.i,
    j: index1.j + index2.j,
  };
}

export function isFourDirection(direction: THREE.Vector3): boolean {
  return Math.abs(direction.x) + Math.abs(direction.z) == 1;
}
