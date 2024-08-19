import { UIManagerBase } from '../../ui_manager';
import { Game } from '../game';

export class UIManager extends UIManagerBase {
  private muteCheck = document.getElementById('muteCheck') as HTMLInputElement;

  constructor(private game: Game) {
    super('gameCanvas');

    this.muteCheck?.addEventListener('click', () => {
      if (this.muteCheck.checked) {
        this.game.soundController.mute();
      } else {
        this.game.soundController.unmute();
      }
    });
  }

  checkValues() {
    if (this.muteCheck.checked) {
      this.game.soundController.mute();
    }
  }
}
