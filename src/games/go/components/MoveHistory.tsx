import type { Move } from '../engine/types';

interface MoveHistoryProps {
  moves: Move[];
}

function formatMove(move: Move, index: number): string {
  const moveNumber = index + 1;

  switch (move.type) {
    case 'play':
      return `${moveNumber}. ${move.color} → (${move.position.row + 1}, ${move.position.col + 1})${
        move.captured.length > 0 ? ` [captures ${move.captured.length}]` : ''
      }`;
    case 'pass':
      return `${moveNumber}. ${move.color} passes`;
    case 'resign':
      return `${moveNumber}. ${move.color} resigns`;
  }
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div className="move-history">
      <h2>Move History</h2>
      {moves.length === 0 ? (
        <p>No moves yet.</p>
      ) : (
        <ol>
          {moves.map((move, index) => (
            <li key={index}>{formatMove(move, index)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
