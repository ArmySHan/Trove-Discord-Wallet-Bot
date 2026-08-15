import type { Command } from './types';
import { help } from './help';
import { about } from './about';
import { wallet } from './wallet';
import { watchlist } from './watchlist';
import { portfolio } from './portfolio';

/** All registered commands. Add new command modules here. */
export const commands: Command[] = [wallet, portfolio, watchlist, help, about];

/** Fast lookup by command name (used by the interaction router). */
export const commandMap = new Map<string, Command>(commands.map((c) => [c.data.name, c]));
