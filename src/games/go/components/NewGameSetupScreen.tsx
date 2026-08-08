import { useEffect, useId, useState } from 'react';
import type { BoardSize, GameMode, NewGameSetup, StoneColor } from '../engine/types';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import {
  AI_SUPPORTED_BOARD_SIZES,
  BOARD_SIZE_OPTIONS,
  formatKomiInput,
  isAiSupportedBoardSize,
  isValidKomi,
  parseKomiInput,
} from '../utils/gameSetup';
import { StoneIcon } from './StoneIcon';
import { SgfFileInput } from './SgfFileInput';

interface NewGameSetupScreenProps {
  setup: NewGameSetup;
  canCancel: boolean;
  error?: string | null;
  onSetupChange: (setup: NewGameSetup) => void;
  onStart: (setup: NewGameSetup) => void;
  onCancel: () => void;
  onImportSgf: (content: string) => void;
}

function PlayerColorOption({
  color,
  selected,
  name,
  onSelect,
}: {
  color: StoneColor;
  selected: boolean;
  name: string;
  onSelect: () => void;
}) {
  const id = `${name}-${color}`;

  return (
    <label
      htmlFor={id}
      className={`setup-option setup-option--player${selected ? ' setup-option--selected' : ''}`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        className="setup-option__input"
        checked={selected}
        onChange={onSelect}
      />
      <StoneIcon color={color} />
      <span className="setup-option__label">{color === 'black' ? 'Black' : 'White'}</span>
    </label>
  );
}

export function NewGameSetupScreen({
  setup,
  canCancel,
  error = null,
  onSetupChange,
  onStart,
  onCancel,
  onImportSgf,
}: NewGameSetupScreenProps) {
  const komiFieldId = useId();
  const [komiInput, setKomiInput] = useState(formatKomiInput(setup.komi));
  const parsedKomi = parseKomiInput(komiInput);
  const komiValid = isValidKomi(parsedKomi);

  useEffect(() => {
    setKomiInput(formatKomiInput(setup.komi));
  }, [setup.komi]);

  function selectSize(size: BoardSize) {
    if (setup.mode === 'ai' && !isAiSupportedBoardSize(size)) {
      return;
    }
    onSetupChange({ ...setup, size });
  }

  function selectMode(mode: GameMode) {
    if (mode === setup.mode) return;

    if (mode === 'local') {
      onSetupChange({
        mode: 'local',
        size: setup.size,
        komi: setup.komi,
        firstPlayer: setup.mode === 'ai' ? setup.humanColor : setup.firstPlayer,
      });
      return;
    }

    onSetupChange({
      mode: 'ai',
      size: isAiSupportedBoardSize(setup.size) ? setup.size : AI_SUPPORTED_BOARD_SIZES[0],
      komi: setup.komi,
      humanColor: setup.mode === 'local' ? setup.firstPlayer : setup.humanColor,
    });
  }

  function selectFirstPlayer(firstPlayer: StoneColor) {
    if (setup.mode !== 'local') return;
    onSetupChange({ ...setup, firstPlayer });
  }

  function selectHumanColor(humanColor: StoneColor) {
    if (setup.mode !== 'ai') return;
    onSetupChange({ ...setup, humanColor });
  }

  function handleKomiChange(value: string) {
    setKomiInput(value);
    const nextKomi = parseKomiInput(value);
    if (isValidKomi(nextKomi)) {
      onSetupChange({ ...setup, komi: nextKomi });
    }
  }

  function handleStart() {
    if (!komiValid) return;
    onStart({ ...setup, komi: parsedKomi });
  }

  return (
    <main className="go-setup">
      <div className="go-shell go-setup__card">
        <header className="go-setup__header">
          <h1 className="go-setup__title">New Game</h1>
          <p className="go-setup__subtitle">Choose your game settings.</p>
        </header>

        <fieldset className="go-setup__field">
          <legend className="go-setup__legend">Game Mode</legend>
          <div className="go-setup__segmented" role="radiogroup" aria-label="Game mode">
            <label
              htmlFor="game-mode-local"
              className={`setup-option setup-option--mode${setup.mode === 'local' ? ' setup-option--selected' : ''}`}
            >
              <input
                id="game-mode-local"
                type="radio"
                name="game-mode"
                className="setup-option__input"
                checked={setup.mode === 'local'}
                onChange={() => selectMode('local')}
              />
              <span className="setup-option__label">Two Players</span>
            </label>
            <label
              htmlFor="game-mode-ai"
              className={`setup-option setup-option--mode${setup.mode === 'ai' ? ' setup-option--selected' : ''}`}
            >
              <input
                id="game-mode-ai"
                type="radio"
                name="game-mode"
                className="setup-option__input"
                checked={setup.mode === 'ai'}
                onChange={() => selectMode('ai')}
              />
              <span className="setup-option__label">Play AI</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="go-setup__field">
          <legend className="go-setup__legend">Board Size</legend>
          <div className="go-setup__segmented" role="radiogroup" aria-label="Board size">
            {BOARD_SIZE_OPTIONS.map(({ size, label, descriptor }) => {
              const selected = setup.size === size;
              const disabled = setup.mode === 'ai' && !isAiSupportedBoardSize(size);
              const id = `board-size-${size}`;

              return (
                <label
                  key={size}
                  htmlFor={id}
                  className={`setup-option setup-option--size${selected ? ' setup-option--selected' : ''}${disabled ? ' setup-option--disabled' : ''}`}
                  aria-disabled={disabled || undefined}
                >
                  <input
                    id={id}
                    type="radio"
                    name="board-size"
                    className="setup-option__input"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => selectSize(size)}
                  />
                  <span className="setup-option__size-label">{label}</span>
                  <span className="setup-option__descriptor">{descriptor}</span>
                </label>
              );
            })}
          </div>
          {setup.mode === 'ai' && (
            <p className="go-setup__hint">More AI board sizes coming later.</p>
          )}
        </fieldset>

        <div className="go-setup__field">
          <label className="go-setup__legend" htmlFor={komiFieldId}>
            Komi
          </label>
          <input
            id={komiFieldId}
            type="text"
            inputMode="decimal"
            className={`go-setup__input${komiValid ? '' : ' go-setup__input--invalid'}`}
            value={komiInput}
            onChange={(event) => handleKomiChange(event.target.value)}
            aria-invalid={!komiValid}
            aria-describedby={`${komiFieldId}-hint`}
          />
          <p id={`${komiFieldId}-hint`} className="go-setup__hint">
            Points added to White
          </p>
        </div>

        {setup.mode === 'local' ? (
          <fieldset className="go-setup__field">
            <legend className="go-setup__legend">First Player</legend>
            <div className="go-setup__segmented go-setup__segmented--players" role="radiogroup" aria-label="First player">
              <PlayerColorOption
                color="black"
                selected={setup.firstPlayer === 'black'}
                name="first-player"
                onSelect={() => selectFirstPlayer('black')}
              />
              <PlayerColorOption
                color="white"
                selected={setup.firstPlayer === 'white'}
                name="first-player"
                onSelect={() => selectFirstPlayer('white')}
              />
            </div>
          </fieldset>
        ) : (
          <fieldset className="go-setup__field">
            <legend className="go-setup__legend">You Play</legend>
            <div className="go-setup__segmented go-setup__segmented--players" role="radiogroup" aria-label="Your color">
              <PlayerColorOption
                color="black"
                selected={setup.humanColor === 'black'}
                name="human-color"
                onSelect={() => selectHumanColor('black')}
              />
              <PlayerColorOption
                color="white"
                selected={setup.humanColor === 'white'}
                name="human-color"
                onSelect={() => selectHumanColor('white')}
              />
            </div>
          </fieldset>
        )}

        <div className={`go-setup__actions${canCancel ? '' : ' go-setup__actions--solo'}`}>
          {canCancel && (
            <button type="button" className="control-button control-button--secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="control-button control-button--primary go-setup__start"
            disabled={!komiValid}
            onClick={handleStart}
          >
            Start Game
          </button>
        </div>

        <SgfFileInput id="setup-import-sgf" onFileSelected={onImportSgf}>
          {(openFilePicker) => (
            <button type="button" className="go-setup__secondary-button" onClick={openFilePicker}>
              Import SGF
            </button>
          )}
        </SgfFileInput>

        {error && (
          <p className="game-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

export { DEFAULT_NEW_GAME_SETUP };
