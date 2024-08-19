import { GameSocket } from './game/event';

// const ENDPOINT = 'http://localhost:8000';
const ENDPOINT = 'https://bomber-man-pw7szx6oxa-an.a.run.app';

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (socket == null) {
    console.log('create socket at ' + ENDPOINT);
    socket = new GameSocket(ENDPOINT);
  }
  return socket;
}
