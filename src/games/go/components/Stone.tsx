import type { StoneColor } from '../engine/types';

interface StoneProps {
  color: StoneColor;
  isLastMove?: boolean;
  animate?: boolean;
  isDead?: boolean;
}

export function Stone({ color, isLastMove = false, animate = false, isDead = false }: StoneProps) {
  return (
    <div
      className={`stone stone--${color}${animate ? ' stone--placed' : ''}${isDead ? ' stone--dead' : ''}`}
      aria-hidden="true"
    >
      {isLastMove && !isDead && <span className="stone__last-move-marker" />}
      {isDead && <span className="stone__dead-marker" aria-hidden="true">×</span>}
    </div>
  );
}
