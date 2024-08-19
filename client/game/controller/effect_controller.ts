import { Game } from '../game';
import { loadEffect } from '../../loader';
import { convertIndexToPosition } from '../convert';
import * as THREE from 'three';
import { engine } from '../../main';
import { Index } from '../../interface';

const enum Effect {
  Explosion,
  Dead,
  Item,
}

export class EffectController {
  private context: effekseer.EffekseerContext;
  private effects: Map<Effect, effekseer.EffekseerEffect> = new Map();

  constructor(private game: Game) {
    this.context = effekseer.createContext();
  }

  async load() {
    try {
      this.effects.set(
        Effect.Explosion,
        await loadEffect(this.context, 'exp2', 12)
      );
      this.effects.set(
        Effect.Dead,
        await loadEffect(this.context, 'dead2', 20)
      );
      this.effects.set(Effect.Item, await loadEffect(this.context, 'item', 50));
    } catch (error) {
      console.log(error);
    }
  }

  async initialize() {
    this.context.init(engine.renderer.getContext());

    await this.load();
  }

  playExplosion(index: Index) {
    const effect = this.effects.get(Effect.Explosion)!;
    const pos = convertIndexToPosition(index);
    this.context.play(effect, pos.x, pos.y, pos.z);
  }

  playDead(position: THREE.Vector3) {
    const effect = this.effects.get(Effect.Dead)!;
    this.context.play(effect, position.x, position.y, position.z);
  }

  playItem(index: Index) {
    const effect = this.effects.get(Effect.Item)!;
    const pos = convertIndexToPosition(index);
    this.context.play(effect, pos.x, pos.y, pos.z);
  }

  update(delta: number) {
    this.context.update(delta * 60);

    const camera = this.game.camera;
    this.context.setProjectionMatrix(
      Float32Array.from(camera.projectionMatrix.elements)
    );
    this.context.setCameraMatrix(
      Float32Array.from(camera.matrixWorldInverse.elements)
    );
    this.context.draw();
  }
}
