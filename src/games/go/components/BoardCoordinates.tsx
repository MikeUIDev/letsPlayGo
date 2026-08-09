import type { BoardSize } from '../engine/types';
import {
  intersectionAnchorLeft,
  intersectionAnchorTop,
} from '../coordinates/boardGridGeometry';

type BoardCoordinatesProps = {
  boardSize: BoardSize;
  columns: readonly string[];
  rows: readonly string[];
  visible: boolean;
};

export function BoardCoordinates({ boardSize, columns, rows, visible }: BoardCoordinatesProps) {
  const visibilityClass = visible ? ' board-coordinates--visible' : '';

  return (
    <>
      <div className={`go-board-layout__row-gutter board-coordinates board-coordinates--rows${visibilityClass}`}>
        {rows.map((label, rowIndex) => (
          <span
            key={`row-${label}`}
            className="board-coordinates__label board-coordinates__label--row"
            style={{ top: intersectionAnchorTop(rowIndex, boardSize) }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={`go-board-layout__col-gutter board-coordinates board-coordinates--columns${visibilityClass}`}>
        {columns.map((label, colIndex) => (
          <span
            key={`col-${label}`}
            className="board-coordinates__label board-coordinates__label--col"
            style={{ left: intersectionAnchorLeft(colIndex, boardSize) }}
          >
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
