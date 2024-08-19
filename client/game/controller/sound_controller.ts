import * as THREE from 'three';
import { loadAudio } from '../../loader';

const enum Sound {
  Explosion,
  GotItem,
  Dead,
}

export class SoundController {
  private listener: THREE.AudioListener | null = null;
  private sounds: Map<Sound, THREE.Audio> = new Map();
  private bgm: THREE.Audio | null = null;

  constructor() {}

  async initialize() {
    this.listener = new THREE.AudioListener();

    await this.load();

    return this.listener;
  }

  async load() {
    try {
      this.sounds.set(
        Sound.Explosion,
        await loadAudio(this.listener!, 'explosion').then((x) =>
          x.setVolume(0.3)
        )
      );
      this.sounds.set(
        Sound.GotItem,
        await loadAudio(this.listener!, 'got_item').then((x) =>
          x.setVolume(0.3)
        )
      );
      this.sounds.set(
        Sound.Dead,
        await loadAudio(this.listener!, 'dead').then((x) => x.setVolume(0.3))
      );

      this.bgm = await loadAudio(this.listener!, 'BGM').then((x) =>
        x.setLoop(true).setVolume(0.2)
      );
    } catch (error) {
      console.log(error);
    }
  }

  playExplosion() {
    const sound = this.sounds.get(Sound.Explosion);

    sound?.stop().play();
  }

  playGotItem() {
    const sound = this.sounds.get(Sound.GotItem);

    sound?.stop().play();
  }

  playDead() {
    const sound = this.sounds.get(Sound.Dead);

    sound?.stop().play();
  }

  playBGM() {
    this.bgm?.play();
  }

  stopBGM() {
    this.bgm?.stop();
  }

  mute() {
    this.listener?.setMasterVolume(0);
  }

  unmute() {
    this.listener?.setMasterVolume(1);
  }
}
