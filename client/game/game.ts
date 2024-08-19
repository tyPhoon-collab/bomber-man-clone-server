import { FieldController } from './controller/field_controller';
import * as THREE from 'three';
import { ControllablePlayer, PlayerState, RemotePlayer } from './player';
import { InputManager } from './manager/input_manager';
import { GameSocket } from './event';
import { newBomberManObject, UNIT } from './obj';
import { convertDirectionToIndex, convertIndexToPosition } from './convert';
import { BombController } from './controller/bomb_controller';
import { EffectController } from './controller/effect_controller';
import { SoundController } from './controller/sound_controller';
import {
  Bomb,
  FieldDiff,
  Index,
  isFourDirection,
  PlayerData,
} from '../interface';
import { UIManager } from './manager/ui_manager';
import { EngineContext } from '../engine';
import { getSocket } from '../socket';

export class Game implements EngineContext {
  private player: ControllablePlayer | null = null;
  private players: Map<string, RemotePlayer> = new Map();

  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  private socket: GameSocket;

  animationMixers: Map<THREE.Object3D, THREE.AnimationMixer> = new Map();

  private inputManager: InputManager;
  private uiManager: UIManager;

  bombController: BombController;
  fieldController: FieldController | null = null;
  effectController: EffectController;
  soundController: SoundController;

  constructor() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 1000, 3000 * 3);
    camera.rotation.x -= (Math.PI * 5) / 12;

    this.scene = scene;
    this.camera = camera;

    this.bombController = new BombController(this);
    this.effectController = new EffectController(this);
    this.soundController = new SoundController();

    this.inputManager = new InputManager();
    this.uiManager = new UIManager(this);

    this.socket = getSocket();

    this.socket.addHandler({
      onField: async (field) => {
        this.dispose();
        this.fieldController = new FieldController(field, this);
        this.fieldController.build();
        this.camera.position.set((field.config.width * UNIT) / 2, 5000, 100);

        this.soundController.playBGM();
      },
      onFieldDiffs: (diffs: FieldDiff[]) => {
        this.fieldController?.setAll(diffs);
      },
      onExploded: (bombIds: string[], diffs: FieldDiff[]) => {
        this.bombController.explode(bombIds, diffs);
        this.player?.setDeadIndexes(diffs.map((diff) => diff.index));
      },
      onBomb: (bomb: Bomb) => {
        this.bombController.set(bomb);
      },
      onPlayers: (players) => {
        for (const [id, player] of Object.entries(players)) {
          if (id === getSocket().id) {
            this.buildControllablePlayer(player);
          } else {
            this.buildPlayer(id, player);
          }
        }
      },
      onPlayerPosition: (id, pos) => {
        this.players.get(id)?.setTargetPosition(pos);
      },
      onPlayerAngle: (id, angle) => {
        this.players.get(id)?.setAngle(angle);
      },
      onPlayerState: (id, state) => {
        this.players.get(id)?.setState(state);
      },
      onSpeedUp: () => {
        this.player?.speedUp();
      },
      onGotItem: (index: Index) => {
        this.fieldController?.set({
          index,
          type: 0,
        });
        this.soundController.playGotItem();
      },
    });

    this.initialize();
  }

  async initialize() {
    await this.bombController.initialize();

    await this.effectController.initialize();

    const listener = await this.soundController.initialize();
    this.camera.add(listener);

    this.uiManager.checkValues();
  }

  dispose() {
    this.bombController.dispose();
    this.fieldController?.dispose();
    this.player?.dispose();
    for (const player of this.players.values()) {
      player.dispose();
    }
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D) {
    this.scene.remove(object);
    this.animationMixers.delete(object);
  }

  update(delta: number) {
    if (this.player == null || this.fieldController == null) return;

    const dir = this.inputManager.getDirection();

    this.player.update(delta);
    this.player.move(dir);

    for (const player of this.players.values()) {
      player.update(delta);
    }

    for (const mixer of this.animationMixers.values()) {
      mixer.update(delta);
    }

    this.effectController.update(delta);
    this.bombController.update(delta);

    this.handleInput(dir);

    this.inputManager.postFrame();
  }

  activate() {
    this.uiManager.show();
  }

  deactivate() {
    this.uiManager.hide();
  }

  private handleInput(dir: THREE.Vector3) {
    if (this.player == null) return;

    const state = this.player.getState();

    if (
      state === PlayerState.Dead ||
      state === PlayerState.Stun ||
      state === PlayerState.Misobon
    )
      return;

    if (this.inputManager.isPlaceBombPressed()) {
      this.socket.placeBomb(this.player.index);
    } else if (this.inputManager.isKickBombPressed()) {
      if (isFourDirection(dir)) {
        const dirIndex = convertDirectionToIndex(dir);
        this.socket.kickBomb(this.player.index, dirIndex);
      }
    } else if (this.inputManager.isStopBombPressed()) {
      this.socket.stopBomb();
    } else if (this.inputManager.isPunchPressed()) {
      this.socket.punchBomb(this.player.index);
    } else if (this.inputManager.isHoldPressed()) {
      this.socket.holdBomb(this.player.index);
    }
  }

  private async buildControllablePlayer(playerData: PlayerData) {
    const object = await newBomberManObject(
      convertIndexToPosition(playerData.initIndex)
    );
    this.add(object);

    this.player = new ControllablePlayer(object, this, this.socket);
  }

  private async buildPlayer(id: string, playerData: PlayerData) {
    const object = await newBomberManObject(
      convertIndexToPosition(playerData.initIndex)
    );
    this.add(object);

    this.players.set(id, new RemotePlayer(object, this));
  }
}
