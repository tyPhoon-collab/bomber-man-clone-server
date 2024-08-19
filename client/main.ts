import { Engine } from './engine';
import { Title } from './title/title';

export const engine = new Engine();

engine.push(new Title());
