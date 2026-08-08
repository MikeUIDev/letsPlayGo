import { getStone, positionKey } from '../engine/board';
import { isLegalPlay } from '../engine/legalMoves';
import type { BoardSize, GameState, Position } from '../engine/types';
import type { TerritoryOwner } from '../engine/scoring';
import { Intersection } from './Intersection';

interface GoBoardProps {
  state: GameState;
  lastMove: Position | null;
  territoryMap: Map<string, TerritoryOwner>;
  deadStoneKeys: Set<string>;
  humanCanPlay: boolean;
  onPlay: (position: Position) => void;
  onMarkDead: (position: Position) => void;
}

function getStarPoints(size: BoardSize): Position[] {
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
}: GoBoardProps) {
  const { board, phase, currentPlayer } = state;
  const { size } = board;
  const canPlay = phase === 'playing' && humanCanPlay;
  const canMarkDead = phase === 'scoring';
  const showTerritory = phase === 'scoring' || phase === 'ended';
  const readOnly = phase === 'ended';
  const starPoints = getStarPoints(size);

  return (
    <div className="go-board-shell">
      <div
        className="go-board"
        style={{ ['--grid-size' as string]: size }}
        role="grid"
        aria-label={`Go board ${size} by ${size}`}
      >
        <svg
          className="go-board__lines"
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

        <div className="go-board__intersections">
          {board.intersections.map((row, rowIndex) =>
            row.map((_stone, colIndex) => {
              const position = { row: rowIndex, col: colIndex };
              const stone = getStone(board, position);
              const legality = isLegalPlay(state, position);
              const span = size - 1;
              const key = positionKey(position);

              return (
                <Intersection
                  key={`${rowIndex}-${colIndex}`}
                  position={position}
                  stone={stone}
                  currentPlayer={currentPlayer}
                  isLegal={canPlay && legality.legal}
                  isLastMove={isSamePosition(lastMove, position)}
                  isDead={deadStoneKeys.has(key)}
                  territoryOwner={showTerritory ? (territoryMap.get(key) ?? null) : null}
                  showTerritory={showTerritory}
                  canPlay={canPlay}
                  canMarkDead={canMarkDead}
                  readOnly={readOnly}
                  onPlay={onPlay}
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
      </div>
    </div>
  );
}
