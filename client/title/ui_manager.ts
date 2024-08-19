import { Game } from '../game/game';
import { engine } from '../main';
import { Room } from '../room/room';
import { UIManagerBase } from '../ui_manager';

export class UIManager extends UIManagerBase {
  private startButton = document.getElementById(
    'startButton'
  ) as HTMLButtonElement;

  constructor() {
    super('titleCanvas');
    this.startButton?.addEventListener('click', () => {
      engine?.push(new Room());
    });
  }
}
