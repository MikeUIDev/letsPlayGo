import type { GameAction } from '../engine/types';

interface GameControlsProps {
  canUndo: boolean;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

export function GameControls({ canUndo, canAct, onAction }: GameControlsProps) {
  return (
    <div className="game-controls">
      <button type="button" disabled={!canAct} onClick={() => onAction({ type: 'pass' })}>
        Pass
      </button>
      <button type="button" disabled={!canAct} onClick={() => onAction({ type: 'resign' })}>
        Resign
      </button>
      <button type="button" disabled={!canUndo} onClick={() => onAction({ type: 'undo' })}>
        Undo
      </button>
      <button type="button" onClick={() => onAction({ type: 'restart' })}>
        Restart
      </button>
    </div>
  );
}
