import { useCallback, useId, useMemo, useRef } from 'react';
import { getStone, positionKey } from '../engine/board';
import { isLegalPlay } from '../engine/legalMoves';
import type { GameState, Position } from '../engine/types';
import type { TerritoryOwner } from '../engine/scoring';
import { getColumnLabels, getRowLabels } from '../coordinates';
import {
  minPlayableBoardSidePx,
  shouldFitBoardInViewport,
} from '../coordinates/boardGridGeometry';
import { shouldUseTouchPlacement, STONE_PLACEMENT_COOLDOWN_MS } from '../placement/touchPlacement';
import { useTouchPlacement } from '../placement/useTouchPlacement';
import { useRovingGrid } from '../../../accessibility/useRovingGrid';
import { BoardCoordinates } from './BoardCoordinates';
import { Intersection } from './Intersection';

interface GoBoardProps {
  state: GameState;
  lastMove: Position | null;
  territoryMap: Map<string, TerritoryOwner>;
  deadStoneKeys: Set<string>;
  humanCanPlay: boolean;
  onPlay: (position: Position) => void;
  onMarkDead: (position: Position) => void;
  reviewMode?: boolean;
  showCoordinates?: boolean;
  candidateMarkers?: Map<string, number>;
  primaryCandidateRank?: number;
  emphasizeBestMove?: boolean;
  variationMarkers?: Map<string, { step: number; color: import('../engine/types').StoneColor }>;
  conceptHighlightKeys?: Set<string>;
  /** Allow clicking empty intersections even when the move would be illegal (tutorial demos). */
  allowIllegalPlays?: boolean;
  /** Override the default grid accessible name. */
  ariaLabel?: string;
  /**
   * Keep cells finger-sized on 13×13 / 19×19 by scaling the board to the viewport.
   * Disable for static diagrams that should shrink to their container.
   */
  touchFriendly?: boolean;
}

function getStarPoints(size: number): Position[] {
  if (size === 5 || size === 7) {
    const center = Math.floor(size / 2);
    return [{ row: center, col: center }];
  }

  if (size === 9) {
    return [
      { row: 2, col: 2 },
      { row: 2, col: 6 },
      { row: 6, col: 2 },
      { row: 6, col: 6 },
      { row: 4, col: 4 },
    ];
  }

  if (size === 13) {
    return [
      { row: 3, col: 3 },
      { row: 3, col: 9 },
      { row: 9, col: 3 },
      { row: 9, col: 9 },
      { row: 6, col: 6 },
    ];
  }

  const marks = [3, 9, 15];
  const points: Position[] = [{ row: 9, col: 9 }];
  for (const row of marks) {
    for (const col of marks) {
      if (row === 9 && col === 9) continue;
      points.push({ row, col });
    }
  }
  return points;
}

function isSamePosition(a: Position | null, b: Position): boolean {
  return a !== null && a.row === b.row && a.col === b.col;
}

export function GoBoard({
  state,
  lastMove,
  territoryMap,
  deadStoneKeys,
  humanCanPlay,
  onPlay,
  onMarkDead,
  reviewMode = false,
  showCoordinates = false,
  candidateMarkers = new Map<string, number>(),
  primaryCandidateRank = 1,
  emphasizeBestMove = false,
  variationMarkers = new Map<string, { step: number; color: import('../engine/types').StoneColor }>(),
  conceptHighlightKeys = new Set<string>(),
  allowIllegalPlays = false,
  ariaLabel,
  touchFriendly = true,
}: GoBoardProps) {
  const boardInstructionsId = useId();
  const boardHintId = useId();
  const { board, phase, currentPlayer } = state;
  const { size } = board;
  const canPlay = phase === 'playing' && humanCanPlay && !reviewMode;
  const canMarkDead = phase === 'scoring' && !reviewMode;
  const showTerritory = !reviewMode && (phase === 'scoring' || phase === 'ended');
  const readOnly = reviewMode || phase === 'ended';
  const starPoints = getStarPoints(size);
  const fitInViewport = shouldFitBoardInViewport(size, touchFriendly);
  const touchPlacementEnabled = shouldUseTouchPlacement(size, touchFriendly);
  const viewportRef = useRef<HTMLDivElement>(null);
  const intersectionsRef = useRef<HTMLDivElement>(null);
  const lastPlayAtRef = useRef(0);

  const handlePlay = useCallback(
    (position: Position) => {
      const now = Date.now();
      if (now - lastPlayAtRef.current < STONE_PLACEMENT_COOLDOWN_MS) {
        return;
      }
      lastPlayAtRef.current = now;
      onPlay(position);
    },
    [onPlay],
  );

  const touchPlacementResetKey = useMemo(
    () =>
      [
        size,
        phase,
        currentPlayer,
        state.history.length,
        humanCanPlay,
        reviewMode,
        allowIllegalPlays,
      ].join(':'),
    [
      allowIllegalPlays,
      currentPlayer,
      humanCanPlay,
      phase,
      reviewMode,
      size,
      state.history.length,
    ],
  );

  const { pendingPosition, touchPlacementActive, touchLayerHandlers } = useTouchPlacement({
    enabled: touchPlacementEnabled && !reviewMode,
    boardSize: size,
    state,
    canPlay,
    allowIllegalPlays,
    onPlay: handlePlay,
    intersectionsRef,
    resetKey: touchPlacementResetKey,
  });

  const boardHint =
    phase === 'scoring'
      ? 'Tap stones to mark dead groups'
      : phase === 'playing'
        ? touchPlacementActive
          ? 'Tap a point, then tap again to place'
          : 'Tap intersections to play'
        : null;

  const boardAccessibleName = useMemo(() => {
    if (ariaLabel) {
      return ariaLabel;
    }

    const turnLabel =
      phase === 'playing'
        ? `${currentPlayer === 'black' ? 'Black' : 'White'} to play`
        : phase === 'scoring'
          ? 'Scoring phase'
          : 'Game ended';

    return `Go board ${size} by ${size}, ${turnLabel}`;
  }, [ariaLabel, currentPlayer, phase, size]);

  const { gridRef, getTabIndex, handleGridKeyDown } = useRovingGrid({
    size,
    enabled: !reviewMode,
    lastMove,
  });

  const shellStyle = {
    ['--grid-size' as string]: size,
    ...(fitInViewport
      ? {}
      : { ['--board-side-min' as string]: `${Math.ceil(minPlayableBoardSidePx(size))}px` }),
  };

  return (
    <div
      className={`go-board-frame${fitInViewport ? ' go-board-frame--fit' : ''}${touchPlacementActive ? ' go-board-frame--touch-placement' : ''}`}
    >
      {boardHint ? (
        <p id={boardHintId} className="go-board-fit-hint">
          {boardHint}
        </p>
      ) : null}
      <p id={boardInstructionsId} className="visually-hidden">
        Use arrow keys to move between intersections. Press Enter or Space to play or mark stones.
      </p>
      <div
        ref={viewportRef}
        className={`go-board-viewport${fitInViewport ? ' go-board-viewport--fit' : ''}`}
      >
        <div className={`go-board-shell${fitInViewport ? ' go-board-shell--fit' : ''}`} style={shellStyle}>
          <div className="go-board-layout">
            <BoardCoordinates
              boardSize={size}
              columns={getColumnLabels(size)}
              rows={getRowLabels(size)}
              visible={showCoordinates}
            />
            <div className="go-board-layout__board">
              <div
                ref={gridRef}
                className="go-board"
                role="grid"
                aria-rowcount={size}
                aria-colcount={size}
                aria-label={boardAccessibleName}
                aria-describedby={
                  [boardInstructionsId, boardHint ? boardHintId : null].filter(Boolean).join(' ') || undefined
                }
                onKeyDown={handleGridKeyDown}
              >
                <svg
                  className="go-board__lines"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${size - 1} ${size - 1}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {Array.from({ length: size }, (_, row) => (
                    <line
                      key={`h-${row}`}
                      x1={0}
                      y1={row}
                      x2={size - 1}
                      y2={row}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {Array.from({ length: size }, (_, col) => (
                    <line
                      key={`v-${col}`}
                      x1={col}
                      y1={0}
                      x2={col}
                      y2={size - 1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {starPoints.map((point) => (
                    <circle
                      key={`star-${point.row}-${point.col}`}
                      cx={point.col}
                      cy={point.row}
                      r={0.12}
                      className="go-board__star"
                    />
                  ))}
                </svg>

                <div className="go-board__intersections" ref={intersectionsRef}>
                  {board.intersections.map((row, rowIndex) =>
                    row.map((_stone, colIndex) => {
                      const position = { row: rowIndex, col: colIndex };
                      const stone = getStone(board, position);
                      const legality = isLegalPlay(state, position);
                      const span = size - 1;
                      const key = positionKey(position);
                      const isPending =
                        pendingPosition !== null &&
                        pendingPosition.row === rowIndex &&
                        pendingPosition.col === colIndex;

                      return (
                        <Intersection
                          key={`${rowIndex}-${colIndex}`}
                          position={position}
                          boardSize={size}
                          stone={stone}
                          currentPlayer={currentPlayer}
                          isLegal={canPlay && legality.legal}
                          isLastMove={isSamePosition(lastMove, position)}
                          isDead={deadStoneKeys.has(key)}
                          isPending={isPending}
                          suppressPlayGhost={touchPlacementActive}
                          territoryOwner={showTerritory ? (territoryMap.get(key) ?? null) : null}
                          showTerritory={showTerritory}
                          canPlay={canPlay}
                          canMarkDead={canMarkDead}
                          readOnly={readOnly}
                          candidateRank={candidateMarkers.get(key)}
                          primaryCandidate={candidateMarkers.get(key) === primaryCandidateRank}
                          emphasizeCandidate={
                            emphasizeBestMove && candidateMarkers.get(key) === primaryCandidateRank
                          }
                          variationMarker={variationMarkers.get(key)}
                          conceptHighlighted={conceptHighlightKeys.has(key)}
                          allowIllegalPlays={allowIllegalPlays}
                          tabIndex={getTabIndex(rowIndex, colIndex)}
                          onPlay={handlePlay}
                          onMarkDead={onMarkDead}
                          style={{
                            left: `${(colIndex / span) * 100}%`,
                            top: `${(rowIndex / span) * 100}%`,
                          }}
                        />
                      );
                    }),
                  )}
                </div>
                {touchPlacementActive ? (
                  <div
                    className="go-board__touch-layer"
                    aria-hidden="true"
                    {...touchLayerHandlers}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
