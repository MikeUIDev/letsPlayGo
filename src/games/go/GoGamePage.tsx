import { GoBoard } from './components/GoBoard';
import { GameControls } from './components/GameControls';
import { GameStatus } from './components/GameStatus';
import { MoveHistory } from './components/MoveHistory';
import { useGoGame } from './hooks/useGoGame';
import './go.css';

export function GoGamePage() {
  const { state, moves, error, canUndo, canAct, play, dispatchAction } =
    useGoGame(9);

  return (
    <main className="go-game">
      <header>
        <h1>Go (Weiqi)</h1>
        <p>Local 2-player · {state.board.size}×{state.board.size}</p>
      </header>

      <div className="go-game__layout">
        <GoBoard state={state} onPlay={play} />

        <aside className="go-game__sidebar">
          <GameStatus state={state} error={error} />
          <GameControls
            canUndo={canUndo}
            canAct={canAct}
            onAction={dispatchAction}
          />
          <MoveHistory moves={moves} />
        </aside>
      </div>
    </main>
  );
}
