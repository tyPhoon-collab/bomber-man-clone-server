import { convertIndexToDirection, convertIndexToPosition } from '../convert';
import { Game } from '../game';
import { Bomb, BombState, equalIndex, FieldDiff, Index } from '../../interface';

import * as THREE from 'three';
import { loadModel } from '../../loader';

import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export class BombController {
  private bombTemplate: THREE.Object3D | null = null;
  private objects = new Map<string, THREE.Object3D>();
  private bombs = new Map<string, Bomb>();

  constructor(private game: Game) {}

  async initialize() {
    this.bombTemplate = await loadModel('bomb2');
  }

  dispose() {
    this.objects.clear();
    this.bombs.clear();
  }

  update(delta: number) {
    for (const bomb of this.bombs.values()) {
      if (bomb.state === BombState.moving) {
        const direction = convertIndexToDirection(bomb.dir).multiplyScalar(
          delta * this.getBombSpeedWeight()
        );
        this.objects.get(bomb.id)!.position.add(direction);
      }
    }
  }

  set(bomb: Bomb) {
    if (!this.bombs.has(bomb.id)) {
      const object = this.clone();

      this.game.fieldController?.add(object, bomb.index);
      this.objects.set(bomb.id, object);
    }

    this.bombs.set(bomb.id, bomb);

    if (bomb.state !== BombState.moving) {
      this.objects
        .get(bomb.id)!
        .position.copy(convertIndexToPosition(bomb.index));
    }
  }

  explode(bombIds: string[], diffs: FieldDiff[]) {
    for (const diff of diffs) {
      this.game.fieldController?.set(diff);
      this.playEffect(diff.index);
    }

    for (const id of bombIds) {
      this.game.fieldController?.remove(this.objects.get(id)!);
      this.bombs.delete(id);
      this.objects.delete(id);
    }

    this.playSound();
  }

  getBomb(index: Index): Bomb | null {
    for (const bomb of this.bombs.values()) {
      if (equalIndex(bomb.index, index)) {
        return bomb;
      }
    }
    return null;
  }

  isStunnerIndex(index: Index) {
    for (const bomb of this.bombs.values()) {
      if (equalIndex(bomb.index, index) && bomb.state === BombState.moving) {
        return true;
      }
    }
    return false;
  }

  private playEffect(index: Index) {
    this.game.effectController.playExplosion(index);
  }
  private playSound() {
    this.game.soundController.playExplosion();
  }

  private clone() {
    if (!this.bombTemplate) {
      throw new Error('Bomb template is not loaded');
    }
    return SkeletonUtils.clone(this.bombTemplate);
  }

  private getBombSpeedWeight(): number {
    return this.game.fieldController?.getBombSpeedWeight() ?? 1;
  }
}
