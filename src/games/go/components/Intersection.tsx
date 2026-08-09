import type { CSSProperties } from 'react';
import { positionToGoCoordinate } from '../coordinates';
import type { BoardSize } from '../engine/types';
import type { TerritoryOwner } from '../engine/scoring';
import type { IntersectionState, Position, StoneColor } from '../engine/types';
import { Stone } from './Stone';

interface IntersectionProps {
  position: Position;
  boardSize: BoardSize;
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
  candidateRank?: number;
  primaryCandidate?: boolean;
  emphasizeCandidate?: boolean;
  variationMarker?: { step: number; color: StoneColor };
  conceptHighlighted?: boolean;
  allowIllegalPlays?: boolean;
  onPlay: (position: Position) => void;
  onMarkDead: (position: Position) => void;
  style: CSSProperties;
}

export function Intersection({
  position,
  boardSize,
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
  candidateRank,
  primaryCandidate = false,
  emphasizeCandidate = false,
  variationMarker,
  conceptHighlighted = false,
  allowIllegalPlays = false,
  onPlay,
  onMarkDead,
  style,
}: IntersectionProps) {
  const coordinate = positionToGoCoordinate(position, boardSize);
  const label = stone
    ? `${coordinate}, ${stone} stone${isDead ? ', marked dead' : ''}`
    : territoryOwner && territoryOwner !== 'neutral'
      ? `${coordinate}, ${territoryOwner} territory`
      : `${coordinate}, empty intersection`;

  const isInteractive =
    !readOnly &&
    ((canMarkDead && stone !== null) ||
      (canPlay && stone === null && (isLegal || allowIllegalPlays)));

  function handleClick() {
    if (readOnly) return;

    if (canMarkDead && stone !== null) {
      onMarkDead(position);
      return;
    }

    if (canPlay && stone === null && (isLegal || allowIllegalPlays)) {
      onPlay(position);
    }
  }

  return (
    <button
      type="button"
      className={`intersection${isLegal ? ' intersection--legal' : ''}${canMarkDead && stone !== null ? ' intersection--scoring-stone' : ''}${readOnly ? ' intersection--readonly' : ''}${candidateRank ? ' intersection--candidate' : ''}${conceptHighlighted ? ' intersection--concept-highlight' : ''}`}
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
          {canPlay && (isLegal || allowIllegalPlays) && (
            <span
              className={`intersection__ghost intersection__ghost--${currentPlayer}`}
              aria-hidden="true"
            />
          )}
          {!stone && candidateRank && (
            <span
              className={`intersection__candidate-marker${primaryCandidate ? ' intersection__candidate-marker--primary' : ''}${emphasizeCandidate ? ' intersection__candidate-marker--emphasized' : ''}`}
              aria-hidden="true"
            >
              {candidateRank}
            </span>
          )}
          {!stone && !candidateRank && variationMarker && (
            <span
              className={`intersection__variation-marker intersection__variation-marker--${variationMarker.color}`}
              aria-label={`Variation move ${variationMarker.step}`}
            >
              {variationMarker.step}
            </span>
          )}
        </>
      )}
    </button>
  );
}
