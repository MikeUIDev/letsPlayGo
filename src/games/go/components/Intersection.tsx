import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { positionToGoCoordinate } from '../coordinates';
import type { BoardSize } from '../engine/types';
import type { TerritoryOwner } from '../engine/scoring';
import type { IntersectionState, Position, StoneColor } from '../engine/types';
import { Stone } from './Stone';

/** Ignore tap if the finger moved farther than this (panning the board). */
const POINTER_DRAG_CANCEL_PX = 14;

interface IntersectionProps {
  position: Position;
  boardSize: BoardSize;
  stone: IntersectionState;
  currentPlayer: StoneColor;
  isLegal: boolean;
  isLastMove: boolean;
  isDead: boolean;
  isPending?: boolean;
  suppressPlayGhost?: boolean;
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
  tabIndex: number;
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
  isPending = false,
  suppressPlayGhost = false,
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
  tabIndex,
  onPlay,
  onMarkDead,
  style,
}: IntersectionProps) {
  const activePointerRef = useRef<{
    id: number;
    x: number;
    y: number;
  } | null>(null);

  const coordinate = positionToGoCoordinate(position, boardSize);
  const label = stone
    ? `${coordinate}, ${stone} stone${isDead ? ', marked dead' : ''}${isLastMove ? ', last move' : ''}`
    : territoryOwner && territoryOwner !== 'neutral'
      ? `${coordinate}, ${territoryOwner} territory`
      : isLegal && canPlay
        ? `${coordinate}, empty, legal move`
        : `${coordinate}, empty intersection`;

  const isInteractive =
    !readOnly &&
    ((canMarkDead && stone !== null) ||
      (canPlay && stone === null && (isLegal || allowIllegalPlays) && !suppressPlayGhost));

  function activate() {
    if (readOnly) return;

    if (canMarkDead && stone !== null) {
      onMarkDead(position);
      return;
    }

    if (canPlay && stone === null && (isLegal || allowIllegalPlays)) {
      onPlay(position);
    }
  }

  function releaseFocus(target: HTMLElement) {
    target.blur();
  }

  function clearActivePointer(pointerId: number) {
    if (activePointerRef.current?.id === pointerId) {
      activePointerRef.current = null;
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isInteractive || event.pointerType === 'mouse') {
      return;
    }

    activePointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isInteractive || event.pointerType === 'mouse') {
      return;
    }

    const active = activePointerRef.current;
    clearActivePointer(event.pointerId);

    if (!active || active.id !== event.pointerId) {
      return;
    }

    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (dx * dx + dy * dy > POINTER_DRAG_CANCEL_PX * POINTER_DRAG_CANCEL_PX) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activate();
    releaseFocus(event.currentTarget);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    clearActivePointer(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!isInteractive) return;

    const pointerType = (event.nativeEvent as PointerEvent).pointerType;
    if (pointerType === 'touch' || event.detail === 0) {
      return;
    }

    activate();
    releaseFocus(event.currentTarget);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  }

  return (
    <div
      role="gridcell"
      className={`intersection${isLegal ? ' intersection--legal' : ''}${isPending ? ' intersection--pending' : ''}${canMarkDead && stone !== null ? ' intersection--scoring-stone' : ''}${readOnly ? ' intersection--readonly' : ''}${candidateRank ? ' intersection--candidate' : ''}${conceptHighlighted ? ' intersection--concept-highlight' : ''}${isInteractive ? ' intersection--interactive' : ''}`}
      style={style}
      data-intersection={`${position.row}-${position.col}`}
      aria-rowindex={position.row + 1}
      aria-colindex={position.col + 1}
      aria-label={label}
      aria-disabled={!isInteractive}
      aria-selected={tabIndex === 0 ? true : undefined}
      tabIndex={tabIndex}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
          {canPlay && !suppressPlayGhost && (isLegal || allowIllegalPlays) && (
            <span
              className={`intersection__ghost intersection__ghost--${currentPlayer}`}
              aria-hidden="true"
            />
          )}
          {isPending && (
            <>
              <span
                className={`intersection__ghost intersection__ghost--${currentPlayer} intersection__ghost--pending`}
                aria-hidden="true"
              />
              <span className="intersection__pending-ring" aria-hidden="true" />
            </>
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
              aria-hidden="true"
            >
              <span className="visually-hidden">Variation move {variationMarker.step}</span>
              <span aria-hidden="true">{variationMarker.step}</span>
            </span>
          )}
        </>
      )}
    </div>
  );
}
