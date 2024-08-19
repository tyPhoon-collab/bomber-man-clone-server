export class UIManagerBase {
  protected parent: HTMLDivElement;
  constructor(name: string) {
    this.parent = document.getElementById(name) as HTMLDivElement;
  }
  show() {
    this.parent.classList.remove('hidden');
  }

  hide() {
    this.parent.classList.add('hidden');
  }
}
