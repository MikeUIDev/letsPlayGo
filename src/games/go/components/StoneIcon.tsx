import type { StoneColor } from '../engine/types';

interface StoneIconProps {
  color: StoneColor;
  size?: 'sm' | 'md';
}

export function StoneIcon({ color, size = 'md' }: StoneIconProps) {
  return (
    <span
      className={`stone-icon stone-icon--${color} stone-icon--${size}`}
      aria-hidden="true"
    />
  );
}

interface LogoStoneProps {
  className?: string;
}

export function LogoStone({ className = '' }: LogoStoneProps) {
  return (
    <span className={`logo-stone ${className}`.trim()} aria-hidden="true">
      <span className="logo-stone__disc" />
    </span>
  );
}
