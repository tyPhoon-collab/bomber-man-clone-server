import { EngineContext } from '../engine';

import * as THREE from 'three';
import { loadModel } from '../loader';
import { UIManager } from './ui_manager';
import { getSocket } from '../socket';
import { Game } from '../game/game';
import { engine } from '../main';

export class Room implements EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  private uiManager: UIManager;

  animationMixers: Map<THREE.Object3D, THREE.AnimationMixer> = new Map();

  constructor() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0xcccccc);
    this.scene.fog = new THREE.FogExp2(0xcccccc, 0.001);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(new THREE.Vector3(0, 300, 500));
    this.camera.lookAt(new THREE.Vector3(0, 100, 0));
    this.uiManager = new UIManager();

    const socket = getSocket();
    const game = new Game(); // create instance here to load and listen socket events

    socket.addHandler({
      onPlayerCount: (count) => {
        this.uiManager.updatePlayerCount(count);
      },
      onErrorTooManyPlayers: () => {
        this.uiManager.failed();
      },
      onField: (_) => {
        // To handle start. the data will be handled in Game
        engine.push(game);
      },
    });

    this.initialize();
  }

  async initialize() {
    this.addGround();
    this.addLights();

    const bomb = await loadModel('bomb2');
    const animationMixer = new THREE.AnimationMixer(bomb);
    animationMixer.clipAction(bomb.animations[0]).play();
    this.animationMixers.set(bomb, animationMixer);

    bomb.position.set(-200, 0, 0);
    this.scene.add(bomb);

    await this.addBomberMan();
  }

  private addLights() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 500, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1000;
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
  }

  private addGround() {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000),
      new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private async addBomberMan() {
    const bomberMan = await loadModel('player/01-2');

    const animationMixer = new THREE.AnimationMixer(bomberMan);
    this.animationMixers.set(bomberMan, animationMixer);
    animationMixer.clipAction(bomberMan.animations[5]).play();

    bomberMan.position.set(200, 0, 0);
    this.scene.add(bomberMan);
  }

  update(delta: number) {
    this.animationMixers.forEach((mixer) => {
      mixer.update(delta);
    });
  }

  activate() {
    this.uiManager.show();
  }

  deactivate() {
    this.uiManager.hide();
  }
}
