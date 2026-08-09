import type { BoardSize, GameState, Move, Position, StoneColor } from '../engine/types';

export type AnalysisRequest = {
  boardSize: BoardSize;
  komi: number;
  colorToMove: StoneColor;
  moves: Move[];
  state: GameState;
};

export type AnalysisWinRate = {
  black: number;
  white: number;
};

export type AnalysisScoreLead = {
  leader: StoneColor;
  points: number;
};

export type VariationMove = {
  color: StoneColor;
  position: Position | 'pass';
};

export type AnalysisCandidate =
  | {
      type: 'play';
      position: Position;
      winRate: number;
      scoreLead: number;
      visits: number;
      variation?: VariationMove[];
    }
  | {
      type: 'pass';
      winRate: number;
      scoreLead: number;
      visits: number;
      variation?: VariationMove[];
    };

export type AnalysisResult = {
  winRate: AnalysisWinRate;
  scoreLead: AnalysisScoreLead;
  candidates: AnalysisCandidate[];
};

export type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface GoAnalysisService {
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
}
