import { convertToIndexKey, IndexKey } from '../convert';
import { loadModel } from '../../loader';
import { newGroundObject } from '../obj';
import { newAmbientLight, newDirectionalLight } from '../light';
import { convertIndexToPosition } from '../convert';
import * as THREE from 'three';
import { Game } from '../game';
import { Field, FieldDiff, Index } from '../../interface';

import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

type Objects = Map<IndexKey, THREE.Object3D>;
type ObjectTemplates = Map<number, THREE.Object3D>;

export class FieldController {
  private objects: Objects = new Map();
  private objectTemplates: ObjectTemplates = new Map();

  constructor(
    private field: Field,
    private game: Game,
    private parent: THREE.Object3D = new THREE.Object3D()
  ) {
    console.log(this.field);
  }

  async build() {
    const { parent, objects, objectTemplates } = await buildField(this.field);
    this.parent = parent;
    this.objects = objects;
    this.objectTemplates = objectTemplates;

    this.game.add(parent);
  }

  get(index: Index): number {
    return this.field.data[index.k][index.i][index.j];
  }

  set(fieldDiff: FieldDiff) {
    const { k, i, j } = fieldDiff.index;
    this._remove(fieldDiff.index);
    this.field.data[k][i][j] = fieldDiff.type;
    this._add(fieldDiff.index, fieldDiff.type);
  }

  setAll(fieldDiff: FieldDiff[]) {
    for (const diff of fieldDiff) {
      this.set(diff);
    }
  }

  isNonBlockerIndex(index: Index): boolean {
    return this.field.config.nonBlocker.includes(this.get(index));
  }

  isBlockerIndex(index: Index): boolean {
    return !this.isNonBlockerIndex(index);
  }

  isBreakableIndex(index: Index): boolean {
    return this.field.config.breakable.includes(this.get(index));
  }

  isItemIndex(index: Index): boolean {
    return this.field.config.items.includes(this.get(index));
  }

  isIgnorableIndex(index: Index): boolean {
    return this.field.config.ignorable.includes(this.get(index));
  }

  dispose() {
    this.game.remove(this.parent);
  }

  add(object: THREE.Object3D, index: Index) {
    object.position.copy(convertIndexToPosition(index));

    if (object.animations.length !== 0) {
      const mixer = new THREE.AnimationMixer(object);
      mixer.clipAction(object.animations[0]).play();
      this.game.animationMixers.set(object, mixer);
    }

    this.parent.add(object);
  }

  remove(object: THREE.Object3D) {
    this.parent.remove(object);
    this.game.animationMixers.delete(object);
  }

  getBombSpeedWeight(): number {
    const speed = this.field.config.bombSpeed / 1000 / 1000 / 1000;
    return 1 / speed;
  }

  private _remove(index: Index) {
    const object = this.objects.get(convertToIndexKey(index));
    if (object === undefined) {
      return;
    }

    this.objects.delete(convertToIndexKey(index));

    this.remove(object);
  }

  private _add(index: Index, fieldType: number) {
    if (this.isIgnorableIndex(index)) {
      return;
    }

    const object = this.clone(fieldType);
    this.add(object, index);
    this.objects.set(convertToIndexKey(index), object);

    if (this.isItemIndex(index)) {
      this.game.effectController.playItem(index);
    }
  }

  private clone(fieldType: number): THREE.Object3D {
    const template = this.getObjectTemplate(fieldType);

    return SkeletonUtils.clone(template);
  }

  private getObjectTemplate(fieldType: number): THREE.Object3D {
    const object = this.objectTemplates.get(fieldType);

    if (object === undefined) {
      console.log(this.objectTemplates);
      throw new Error('Unknown object type: ' + fieldType);
    }

    return object;
  }
}

async function buildField(field: Field): Promise<{
  parent: THREE.Object3D;
  objects: Objects;
  objectTemplates: ObjectTemplates;
}> {
  const { width, height, depth, objectPath } = field.config;

  const objectTemplates: ObjectTemplates = new Map();

  for (const key in objectPath) {
    const path = objectPath[key];
    const obj = await loadModel(path);
    objectTemplates.set(Number(key), obj);
  }

  const parent = new THREE.Object3D();
  const objects: Objects = new Map();

  for (let k = 0; k < depth; k++) {
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const fieldType = field.data[k][i][j];
        const objTemplate = objectTemplates.get(fieldType);
        if (objTemplate == null) {
          continue;
        }

        const index = { k, i, j };
        const obj = objTemplate.clone();
        obj.position.copy(convertIndexToPosition(index));
        parent.add(obj);

        objects.set(convertToIndexKey(index), obj);
      }
    }
  }

  parent.add(await newGroundObject(width, height));

  const directionalLight = newDirectionalLight(width, height);
  parent.add(directionalLight);
  parent.add(directionalLight.target);

  const ambientLight = newAmbientLight();
  parent.add(ambientLight);

  return { parent, objects, objectTemplates };
}
