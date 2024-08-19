import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { Object3D } from 'three';
import * as THREE from 'three';

const modelLoader = new FBXLoader();
const audioLoader = new THREE.AudioLoader();

export async function loadModel(name: string): Promise<Object3D> {
  const path = `./resources/obj/${name}.fbx`;

  return new Promise((resolve, reject) => {
    modelLoader.load(
      path,
      function (object: THREE.Object3D) {
        object.traverse(
          (node: any) => (node.castShadow = node.receiveShadow = true)
        );
        resolve(object);
      },
      function (xhr: any) {
        const percent = (xhr.loaded / xhr.total) * 100;
        console.log(`${path} ${percent.toFixed(2)}% loaded`);
      },
      function (error: any) {
        console.log(`An error happened while loading ${path}: ${error}`);
        reject(error);
      }
    );
  });
}

export async function loadEffect(
  context: effekseer.EffekseerContext,
  name: string,
  size: number
): Promise<effekseer.EffekseerEffect> {
  const path = `./resources/effect/${name}.efk`;

  return new Promise((resolve, reject) => {
    const effect = context.loadEffect(
      path,
      size,
      function () {
        resolve(effect);
      },
      function (error: any) {
        console.log(`An error happened while loading ${path}: ${error}`);
        reject(error);
      }
    );
  });
}

export async function loadAudio(
  listener: THREE.AudioListener,
  name: string
): Promise<THREE.Audio> {
  const path = `./resources/audio/${name}.mp3`;

  const sound = new THREE.Audio(listener);

  return new Promise((resolve, reject) => {
    audioLoader.load(
      path,
      function (buffer) {
        sound.setBuffer(buffer);
        resolve(sound);
      },
      function (xhr: any) {
        const percent = (xhr.loaded / xhr.total) * 100;
        console.log(`${path} ${percent.toFixed(2)}% loaded`);
      },
      function (error: any) {
        console.log(`An error happened while loading ${path}: ${error}`);
        reject(error);
      }
    );
  });
}
