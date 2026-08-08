import type { BoardSize, GameAction } from '../engine/types';
import { formatBoardSize } from '../utils/coordinates';

interface BoardSizeSelectorProps {
  size: BoardSize;
  disabled?: boolean;
  onChange: (action: GameAction) => void;
}

const SIZES: BoardSize[] = [9, 13, 19];

export function BoardSizeSelector({ size, disabled, onChange }: BoardSizeSelectorProps) {
  return (
    <div className="board-size-selector">
      <label className="board-size-selector__label" htmlFor="board-size">
        <svg
          className="board-size-selector__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Board Size
      </label>
      <select
        id="board-size"
        className="board-size-selector__select"
        value={size}
        disabled={disabled}
        onChange={(event) => {
          const nextSize = Number(event.target.value) as BoardSize;
          onChange({ type: 'restart', size: nextSize });
        }}
      >
        {SIZES.map((option) => (
          <option key={option} value={option}>
            {formatBoardSize(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
