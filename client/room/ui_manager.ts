import { Game } from '../game/game';
import { engine } from '../main';
import { getSocket } from '../socket';
import { UIManagerBase } from '../ui_manager';

export class UIManager extends UIManagerBase {
  private playButton = document.getElementById(
    'playButton'
  ) as HTMLButtonElement;
  private playerCountLabel = document.getElementById(
    'playerCountLabel'
  ) as HTMLDivElement;

  constructor() {
    super('roomCanvas');

    this.playButton?.addEventListener('click', () => {
      getSocket().start();
    });
  }

  updatePlayerCount(count: number) {
    this.playerCountLabel.innerText = count.toString();
  }
}
