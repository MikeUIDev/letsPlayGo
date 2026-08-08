import type { StoneColor } from '../engine/types';

interface StoneProps {
  color: StoneColor;
}

export function Stone({ color }: StoneProps) {
  return <div className={`stone stone--${color}`} aria-hidden="true" />;
}
