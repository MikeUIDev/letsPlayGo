import { useMemo } from 'react';
import { GoBoard } from '../../components/GoBoard';
import type { DiagramSize } from '../types';
import { buildDiagramState, highlightKeys } from '../utils/staticBoard';
import type { DiagramHighlight, DiagramStone } from '../types';

type GoDiagramProps = {
  size: DiagramSize;
  stones: DiagramStone[];
  highlights?: DiagramHighlight[];
  caption?: string;
  ariaLabel?: string;
  compact?: boolean;
  showCoordinates?: boolean;
};

export function GoDiagram({
  size,
  stones,
  highlights = [],
  caption,
  ariaLabel,
  compact = false,
  showCoordinates = false,
}: GoDiagramProps) {
  const state = useMemo(() => buildDiagramState(size, stones), [size, stones]);
  const conceptHighlightKeys = useMemo(() => highlightKeys(highlights), [highlights]);

  return (
    <figure className={`learn-diagram${compact ? ' learn-diagram--compact' : ''}`}>
      <div className="learn-diagram__board" aria-label={ariaLabel ?? caption ?? 'Go board diagram'}>
        <GoBoard
          state={state}
          lastMove={null}
          territoryMap={new Map()}
          deadStoneKeys={new Set()}
          humanCanPlay={false}
          onPlay={() => {}}
          onMarkDead={() => {}}
          reviewMode
          showCoordinates={showCoordinates}
          conceptHighlightKeys={conceptHighlightKeys}
        />
      </div>
      {caption ? <figcaption className="learn-diagram__caption">{caption}</figcaption> : null}
    </figure>
  );
}
