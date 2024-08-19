import * as THREE from 'three';

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private frameKeys: Map<string, boolean> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.set(key, true);
      this.frameKeys.set(key, true);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.set(event.key.toLowerCase(), false);
    });
  }

  isKeyPressing(key: string): boolean {
    return this.keys.get(key) ?? false;
  }

  isKeyPressed(key: string): boolean {
    return this.frameKeys.get(key) ?? false;
  }

  isPlaceBombPressed(): boolean {
    return this.isKeyPressed(' ');
  }

  isKickBombPressed(): boolean {
    return this.isKeyPressed('k');
  }

  isStopBombPressed(): boolean {
    return this.isKeyPressed('l');
  }

  isPunchPressed(): boolean {
    return this.isKeyPressed('p');
  }

  isHoldPressed(): boolean {
    return this.isKeyPressed('h');
  }

  getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();

    if (this.isKeyPressing('w')) direction.z -= 1;
    if (this.isKeyPressing('s')) direction.z += 1;
    if (this.isKeyPressing('a')) direction.x -= 1;
    if (this.isKeyPressing('d')) direction.x += 1;

    if (direction.x !== 0 || direction.z !== 0) {
      direction.normalize();
    }

    return direction;
  }

  postFrame() {
    this.frameKeys.clear();
  }
}
