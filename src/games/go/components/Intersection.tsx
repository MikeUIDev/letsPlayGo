import type { CSSProperties } from 'react';
import type { IntersectionState, Position } from '../engine/types';
import { Stone } from './Stone';

interface IntersectionProps {
  position: Position;
  stone: IntersectionState;
  isLegal: boolean;
  disabled: boolean;
  onPlay: (position: Position) => void;
  style: CSSProperties;
}

export function Intersection({
  position,
  stone,
  isLegal,
  disabled,
  onPlay,
  style,
}: IntersectionProps) {
  const label = stone
    ? `${stone} stone at ${position.row + 1}, ${position.col + 1}`
    : `empty intersection at ${position.row + 1}, ${position.col + 1}`;

  return (
    <button
      type="button"
      className={`intersection${isLegal ? ' intersection--legal' : ''}`}
      style={style}
      aria-label={label}
      disabled={disabled || stone !== null}
      onClick={() => onPlay(position)}
    >
      {stone && <Stone color={stone} />}
    </button>
  );
}
