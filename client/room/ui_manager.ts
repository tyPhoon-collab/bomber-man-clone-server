import { getSocket } from '../socket';
import { UIManagerBase } from '../ui_manager';

export class UIManager extends UIManagerBase {
  private playButton = document.getElementById(
    'playButton'
  ) as HTMLButtonElement;

  private playerCountLabel = document.getElementById(
    'playerCountLabel'
  ) as HTMLDivElement;

  private joinButton = document.getElementById(
    'joinButton'
  ) as HTMLButtonElement;

  private statusLabel = document.getElementById(
    'statusLabel'
  ) as HTMLParagraphElement;

  private roomNameInput = document.getElementById(
    'roomNameInput'
  ) as HTMLInputElement;

  private joinContainer = document.getElementById(
    'joinContainer'
  ) as HTMLDivElement;

  private roomContainer = document.getElementById(
    'roomContainer'
  ) as HTMLDivElement;

  constructor() {
    super('roomCanvas');

    this.joinButton.addEventListener('click', () => {
      if (this.roomNameInput.value == '') {
        this.statusLabel.innerText = 'Please enter room name';
        return;
      }
      this.statusLabel.innerText = '';
      getSocket().join(this.roomNameInput.value);
      this.joinContainer.classList.add('hidden');
    });

    this.playButton.addEventListener('click', () => {
      getSocket().start();
    });
  }

  updatePlayerCount(count: number) {
    this.roomContainer.classList.remove('hidden');
    console.log(count);
    this.playerCountLabel.innerText = count.toString();
  }

  failed() {
    this.joinContainer.classList.remove('hidden');
    this.statusLabel.innerText = 'Room is full';
  }
}
