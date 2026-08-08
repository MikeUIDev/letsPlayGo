import type { BoardSize, Move } from '../engine/types';
import { formatCoordinate } from '../utils/coordinates';
import { StoneIcon } from './StoneIcon';

interface MoveHistoryProps {
  moves: Move[];
  boardSize: BoardSize;
}

function formatMoveDetail(move: Move, boardSize: BoardSize): string {
  switch (move.type) {
    case 'play':
      return formatCoordinate(move.position, boardSize);
    case 'pass':
      return 'Pass';
    case 'resign':
      return 'Resign';
  }
}

export function MoveHistory({ moves, boardSize }: MoveHistoryProps) {
  const visibleMoves = [...moves].reverse();

  return (
    <section className="move-history" aria-label="Move history">
      <div className="move-history__header">
        <h2 className="move-history__title">Move History</h2>
        {moves.length > 0 && <span className="move-history__badge">Latest</span>}
      </div>

      {moves.length === 0 ? (
        <p className="move-history__empty">No moves yet.</p>
      ) : (
        <ol className="move-history__list">
          {visibleMoves.map((move, reverseIndex) => {
            const index = moves.length - 1 - reverseIndex;
            const isLatest = reverseIndex === 0;

            return (
              <li
                key={index}
                className={`move-history__item${isLatest ? ' move-history__item--latest' : ''}`}
              >
                <span className="move-history__number">{index + 1}</span>
                <StoneIcon color={move.color} size="sm" />
                <span className="move-history__detail">
                  {formatMoveDetail(move, boardSize)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
