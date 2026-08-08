export type StoneColor = 'black' | 'white';

export type GridPosition = {
  x: number;
  y: number;
};

export type ApiMove =
  | { color: StoneColor; type: 'pass' }
  | { color: StoneColor; x: number; y: number };

export type AiMoveRequest = {
  boardSize: 9;
  komi: number;
  colorToMove: StoneColor;
  moves: ApiMove[];
};

export type AiMoveResponse =
  | {
      move: {
        type: 'play';
        position: GridPosition;
      };
    }
  | {
      move: {
        type: 'pass';
      };
    };

export type GenerateMoveResult =
  | { type: 'play'; position: GridPosition }
  | { type: 'pass' };

export type KataGoProcessStatus = 'starting' | 'ready' | 'stopped' | 'error';

export type HealthResponse = {
  status: 'ok';
  katago: 'ready' | 'unavailable';
  message?: string;
};
