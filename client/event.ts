import { io, Socket } from 'socket.io-client';
import { Bomb, Field, FieldDiff, Index, PlayerData } from './interface';
import { Vector3Like } from 'three';
import { PlayerState } from './game/player';

interface GameEventHandler {
  onPlayerCount?: (count: number) => void;
  onErrorTooManyPlayers?: () => void;
  onField?: (data: Field) => void;
  onFieldDiffs?: (diffs: FieldDiff[]) => void;
  onExploded?: (bombIds: string[], diffs: FieldDiff[]) => void;
  onBomb?: (bomb: Bomb) => void;
  onPlayers?: (players: Record<string, PlayerData>) => void;
  onPlayerPosition?: (id: string, pos: Vector3Like) => void;
  onPlayerAngle?: (id: string, angle: number) => void;
  onPlayerState?: (id: string, state: PlayerState) => void;
  onSpeedUp?: () => void;
  onGotItem?: (index: Index) => void;
}

export class GameSocket {
  private socket: Socket;
  private handlers: GameEventHandler[] = [];

  constructor(endpoint: string) {
    this.socket = io(endpoint);

    this.socket.on('connect', () => {
      console.log('connected to server');
    });

    this.socket.on('disconnect', (reason, details) => {
      console.log('disconnected from server');
      console.log(reason, details);
    });

    this.socket.on('player_count', (count) => {
      this.handlers.forEach((h) => h.onPlayerCount?.(count));
    });

    this.socket.on('field', (data) => {
      this.handlers.forEach((h) => h.onField?.(data));
    });

    this.socket.on('field_diffs', (diffs) => {
      this.handlers.forEach((h) => h.onFieldDiffs?.(diffs));
    });

    this.socket.on('bomb', (bomb) => {
      this.handlers.forEach((h) => h.onBomb?.(bomb));
    });

    this.socket.on('explode', (bombIds, diffs) => {
      this.handlers.forEach((h) => h.onExploded?.(bombIds, diffs));
    });

    this.socket.on('players', (players) => {
      this.handlers.forEach((h) => h.onPlayers?.(players));
    });

    this.socket.on('player_position', (id, pos) => {
      this.handlers.forEach((h) => h.onPlayerPosition?.(id, pos));
    });

    this.socket.on('player_angle', (id, angle) => {
      this.handlers.forEach((h) => h.onPlayerAngle?.(id, angle));
    });

    this.socket.on('player_state', (id, state) => {
      this.handlers.forEach((h) => h.onPlayerState?.(id, state));
    });

    this.socket.on('speed_up', () => {
      this.handlers.forEach((h) => h.onSpeedUp?.());
    });

    this.socket.on('got_item', (index) => {
      this.handlers.forEach((h) => h.onGotItem?.(index));
    });

    this.socket.on('error_too_many_players', () => {
      this.handlers.forEach((h) => h.onErrorTooManyPlayers?.());
    });
  }

  get id(): string | undefined {
    return this.socket.id;
  }

  addHandler(handler: GameEventHandler) {
    this.handlers.push(handler);
  }

  removeHandler(handler: GameEventHandler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  join(room: string) {
    this.socket.emit('join', room);
  }

  start() {
    this.socket.emit('start');
  }

  placeBomb(index: Index) {
    this.socket.emit('place_bomb', index);
  }

  kickBomb(index: Index, dir: Index) {
    this.socket.emit('kick_bomb', index, dir);
  }

  stopBomb() {
    this.socket.emit('stop_bomb');
  }

  holdBomb(index: Index) {
    // this.socket.emit("hold_bomb", index);
  }

  punchBomb(index: Index) {
    // this.socket.emit("punch_bomb", index);
  }

  position(pos: Vector3Like) {
    this.socket.emit('position', pos);
  }

  angle(angle: number) {
    this.socket.emit('angle', angle);
  }

  state(state: PlayerState) {
    this.socket.emit('state', state);
  }

  getItem(index: Index) {
    this.socket.emit('get_item', index);
  }
}
