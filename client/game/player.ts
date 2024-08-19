import * as THREE from 'three';
import { convertPositionToIndex } from './convert';
import { PLAYER_RADIUS, UNIT } from './obj';
import { Game } from './game';
import { randomId } from '../random';
import { GameSocket } from './event';
import { BombState, equalIndex, Index } from '../interface';
import { engine } from '../main';

export enum PlayerState {
  Idle,
  HoldingIdle,
  Walking,
  HoldingWalking,
  Stun,
  Dead,
  Misobon,
}

export class Player {
  private animationMixer: THREE.AnimationMixer;
  private actions: Map<PlayerState, THREE.AnimationAction>;
  private currentAction: THREE.AnimationAction;
  private state: PlayerState;

  constructor(
    private object: THREE.Object3D,
    protected game: Game
  ) {
    this.animationMixer = new THREE.AnimationMixer(this.object);

    const anim = this.object.animations;

    const idle = this.animationMixer.clipAction(anim[5]);
    const holdingIdle = this.animationMixer.clipAction(anim[4]);
    const stun = this.animationMixer.clipAction(anim[1]);
    const walk = this.animationMixer.clipAction(anim[2]);
    const holdingWalk = this.animationMixer.clipAction(anim[0]);

    this.actions = new Map<PlayerState, THREE.AnimationAction>([
      [PlayerState.Idle, idle],
      [PlayerState.HoldingIdle, holdingIdle],
      [PlayerState.Walking, walk],
      [PlayerState.HoldingWalking, holdingWalk],
      [PlayerState.Stun, stun],
      [PlayerState.Dead, stun],
      [PlayerState.Misobon, holdingIdle],
    ]);

    this.state = PlayerState.Idle;
    this.currentAction = idle;
    this.currentAction.play();
  }

  // remove from scene. object was managed by this class
  dispose() {
    this.animationMixer.stopAllAction();

    this.game.remove(this.object);
  }

  getState() {
    return this.state;
  }

  update(delta: number) {
    if (this.state == PlayerState.Dead) {
      const angle = this.object.rotation.y;
      const dir = new THREE.Vector3(Math.sin(angle), 3, Math.cos(angle));

      this.pos.add(dir.normalize().multiplyScalar(40));

      this.game.effectController.playDead(this.pos);
    }

    this.animationMixer.update(delta);
  }

  /// short hand for this.object.position
  protected get pos(): THREE.Vector3 {
    return this.object.position;
  }

  get index(): Index {
    return convertPositionToIndex(this.pos);
  }

  setState(state: PlayerState): boolean {
    if (state == this.state) {
      return false;
    }

    this.currentAction.stop();

    this.state = state;
    this.currentAction = this.actions.get(state)!;
    this.currentAction.reset();
    this.currentAction.play();

    return true;
  }

  setAngle(angle: number) {
    this.object.rotation.y = angle;
  }

  setDead() {
    this.setState(PlayerState.Dead);
  }
}

export class RemotePlayer extends Player {
  private targetPosition: THREE.Vector3;

  constructor(
    object: THREE.Object3D,
    game: Game,
    private lerpRate = 0.3
  ) {
    super(object, game);

    this.targetPosition = object.position.clone();
  }

  update(delta: number): void {
    super.update(delta);

    const state = this.getState();

    if (state != PlayerState.Dead && state != PlayerState.Misobon) {
      this.pos.lerp(this.targetPosition, this.lerpRate);
    }
  }

  setTargetPosition(pos: THREE.Vector3Like) {
    this.targetPosition.copy(pos);
  }

  setPosition(pos: THREE.Vector3Like) {
    this.pos.copy(pos);
  }
}

export class ControllablePlayer extends Player {
  private positionSyncController: SyncController;
  private moveWeight = 5;
  private deadIndexes: Map<string, Index[]> = new Map();

  constructor(
    object: THREE.Object3D,
    game: Game,
    private socket: GameSocket
  ) {
    super(object, game);

    this.positionSyncController = new SyncController(() => {
      this.socket.position(this.pos);
    });
  }

  setDeadIndexes(indexes: Index[]) {
    const key = randomId();
    this.deadIndexes.set(key, indexes);

    setTimeout(() => {
      this.deadIndexes.delete(key);
    }, 1000);
  }

  update(delta: number): void {
    super.update(delta);

    if (this.getState() != PlayerState.Dead) {
      this.checkDead();
    }
  }

  move(direction: THREE.Vector3) {
    const state = this.getState();
    if (
      state == PlayerState.Dead ||
      state == PlayerState.Misobon ||
      state == PlayerState.Stun
    ) {
      return;
    }

    if (this.isStunnerIndex(this.index)) {
      this.setState(PlayerState.Stun);
      setTimeout(() => {
        if (this.getState() !== PlayerState.Dead) {
          this.setState(PlayerState.Idle);
        }
      }, 1500);

      return;
    }

    if (direction.x == 0 && direction.z == 0) {
      this.setState(PlayerState.Idle);
      return;
    }

    if (this.canMove(direction)) {
      this.setState(PlayerState.Walking);
      this.pos.add(direction.clone().multiplyScalar(this.moveWeight));

      const currentIndex = this.index;

      if (this.game.fieldController?.isItemIndex(currentIndex)) {
        this.socket.getItem(currentIndex);
        // To avoid multiple get_item event
        this.game.fieldController.set({
          index: currentIndex,
          type: 0,
        });
      }

      this.positionSyncController.update(engine.frameCount);
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.setAngle(angle);

    this.socket.angle(angle);
  }

  speedUp() {
    this.moveWeight *= 1.1;
  }

  setState(state: PlayerState): boolean {
    const changed = super.setState(state);

    if (changed) {
      this.socket.state(state);
    }

    return changed;
  }

  private canMove(direction: THREE.Vector3): boolean {
    const pos = this.pos.clone();
    const currentIndex = this.index;

    let checkSize: number;

    if (this.isPlacedBombIndex(currentIndex)) {
      checkSize = UNIT;
    } else {
      checkSize = PLAYER_RADIUS;
    }

    pos.add(direction.clone().multiplyScalar(checkSize));

    const targetIndex = convertPositionToIndex(pos);

    const isNonBlockerIndex =
      this.game.fieldController?.isNonBlockerIndex(targetIndex) ?? false;
    const isBombIndex = this.isPlacedBombIndex(targetIndex);
    return isNonBlockerIndex && !isBombIndex;
  }

  private checkDead() {
    for (const indexes of this.deadIndexes.values()) {
      for (const index of indexes) {
        if (equalIndex(index, this.index)) {
          this.setState(PlayerState.Dead);

          this.game.soundController.playDead();

          setTimeout(() => {
            this.setState(PlayerState.Misobon);
          }, 3000);
        }
      }
    }
  }

  private isPlacedBombIndex(index: Index): boolean {
    const bomb = this.game.bombController.getBomb(index);
    return bomb !== null && bomb.state === BombState.placed;
  }

  private isStunnerIndex(index: Index): boolean {
    const bomb = this.game.bombController.getBomb(index);
    return bomb !== null && bomb.state === BombState.moving;
  }
}

class SyncController {
  private nextSyncFrameCount = -1;

  constructor(
    private sync: () => void,
    private interval = 6
  ) {}

  update(frameCount: number) {
    if (this.nextSyncFrameCount < frameCount) {
      this.sync();

      this.nextSyncFrameCount = frameCount + this.interval;
    }
  }
}
