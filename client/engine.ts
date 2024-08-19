import * as THREE from 'three';

export interface EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  activate: () => void;
  deactivate: () => void;

  update: (delta: number) => void;
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  private currentContext: EngineContext | null = null;
  private contexts: EngineContext[] = [];
  private clock: THREE.Clock;
  private _frameCount = 0;

  constructor() {
    const renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    this.renderer = renderer;
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.resize.bind(this));
    renderer.setAnimationLoop(this.update.bind(this));
  }

  get frameCount(): number {
    return this._frameCount;
  }

  push(context: EngineContext) {
    this.currentContext?.deactivate();
    context.activate();
    this.currentContext = context;
    this.resize();

    this.contexts.push(context);
  }

  pop() {
    if (this.contexts.length <= 1) {
      return;
    }

    this.currentContext?.deactivate();
    this.currentContext = this.contexts.pop()!;
    this.currentContext.activate();
  }

  update() {
    this.render();

    const delta = this.clock.getDelta();
    this.currentContext?.update(delta);
  }

  private render() {
    this._frameCount++;
    if (this.currentContext == null) {
      return;
    }
    this.renderer.render(this.currentContext.scene, this.currentContext.camera);
  }

  resize() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.currentContext == null) {
      return;
    }
    this.currentContext.camera.aspect = window.innerWidth / window.innerHeight;
    this.currentContext.camera.updateProjectionMatrix();
  }
}
