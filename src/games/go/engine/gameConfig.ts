import type { AIGameConfig, GameConfig, LocalGameConfig, NewGameSetup, StoneColor } from './types';
import { OPPONENT } from './types';

export function isLocalGameConfig(config: GameConfig): config is LocalGameConfig {
  return config.mode === 'local';
}

export function isAiGameConfig(config: GameConfig): config is AIGameConfig {
  return config.mode === 'ai';
}

export function getHumanColor(config: GameConfig): StoneColor | null {
  return config.mode === 'ai' ? config.humanColor : null;
}

export function getAiColor(config: GameConfig): StoneColor | null {
  if (config.mode !== 'ai') return null;
  return OPPONENT[config.humanColor];
}

/** Opening player for a new game. In AI mode Black always opens. */
export function getStartingPlayer(setup: NewGameSetup): StoneColor {
  if (setup.mode === 'local') return setup.firstPlayer;
  return 'black';
}

export function setupToConfig(setup: NewGameSetup): GameConfig {
  if (setup.mode === 'local') {
    return {
      mode: 'local',
      size: setup.size,
      komi: setup.komi,
      firstPlayer: setup.firstPlayer,
    };
  }

  return {
    mode: 'ai',
    size: setup.size,
    komi: setup.komi,
    humanColor: setup.humanColor,
  };
}

export function configToSetup(config: GameConfig): NewGameSetup {
  if (config.mode === 'local') {
    return {
      mode: 'local',
      size: config.size,
      komi: config.komi,
      firstPlayer: config.firstPlayer,
    };
  }

  return {
    mode: 'ai',
    size: config.size,
    komi: config.komi,
    humanColor: config.humanColor,
  };
}

export function isHumanTurn(config: GameConfig, currentPlayer: StoneColor): boolean {
  if (config.mode === 'local') return true;
  return currentPlayer === config.humanColor;
}

export function isAiTurn(config: GameConfig, currentPlayer: StoneColor): boolean {
  if (config.mode !== 'ai') return false;
  return currentPlayer === OPPONENT[config.humanColor];
}
