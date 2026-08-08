import type { CSSProperties } from 'react';
import type { TerritoryOwner } from '../engine/scoring';
import type { IntersectionState, Position, StoneColor } from '../engine/types';
import { Stone } from './Stone';

interface IntersectionProps {
  position: Position;
  stone: IntersectionState;
  currentPlayer: StoneColor;
  isLegal: boolean;
  isLastMove: boolean;
  isDead: boolean;
  territoryOwner: TerritoryOwner | null;
  showTerritory: boolean;
  canPlay: boolean;
  canMarkDead: boolean;
  readOnly: boolean;
  onPlay: (position: Position) => void;
  onMarkDead: (position: Position) => void;
  style: CSSProperties;
}

export function Intersection({
  position,
  stone,
  currentPlayer,
  isLegal,
  isLastMove,
  isDead,
  territoryOwner,
  showTerritory,
  canPlay,
  canMarkDead,
  readOnly,
  onPlay,
  onMarkDead,
  style,
}: IntersectionProps) {
  const label = stone
    ? `${stone} stone at ${position.row + 1}, ${position.col + 1}${isDead ? ', marked dead' : ''}`
    : territoryOwner && territoryOwner !== 'neutral'
      ? `${territoryOwner} territory at ${position.row + 1}, ${position.col + 1}`
      : `empty intersection at ${position.row + 1}, ${position.col + 1}`;

  const isInteractive =
    !readOnly && ((canMarkDead && stone !== null) || (canPlay && stone === null && isLegal));

  function handleClick() {
    if (readOnly) return;

    if (canMarkDead && stone !== null) {
      onMarkDead(position);
      return;
    }

    if (canPlay && stone === null && isLegal) {
      onPlay(position);
    }
  }

  return (
    <button
      type="button"
      className={`intersection${isLegal ? ' intersection--legal' : ''}${canMarkDead && stone !== null ? ' intersection--scoring-stone' : ''}${readOnly ? ' intersection--readonly' : ''}`}
      style={style}
      aria-label={label}
      aria-disabled={readOnly || !isInteractive}
      disabled={!isInteractive}
      onClick={handleClick}
    >
      {stone ? (
        <Stone color={stone} isLastMove={isLastMove} animate={isLastMove} isDead={isDead} />
      ) : (
        <>
          {showTerritory && territoryOwner && territoryOwner !== 'neutral' && (
            <span
              className={`intersection__territory intersection__territory--${territoryOwner}`}
              aria-hidden="true"
            />
          )}
          {canPlay && isLegal && (
            <span
              className={`intersection__ghost intersection__ghost--${currentPlayer}`}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </button>
  );
}
