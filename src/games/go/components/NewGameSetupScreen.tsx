import { useEffect, useId, useState } from 'react';
import type { BoardSize, NewGameSetup, StoneColor } from '../engine/types';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import {
  BOARD_SIZE_OPTIONS,
  formatKomiInput,
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

function FirstPlayerOption({
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
    onSetupChange({ ...setup, size });
  }

  function selectFirstPlayer(firstPlayer: StoneColor) {
    onSetupChange({ ...setup, firstPlayer });
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
          <legend className="go-setup__legend">Board Size</legend>
          <div className="go-setup__segmented" role="radiogroup" aria-label="Board size">
            {BOARD_SIZE_OPTIONS.map(({ size, label, descriptor }) => {
              const selected = setup.size === size;
              const id = `board-size-${size}`;

              return (
                <label
                  key={size}
                  htmlFor={id}
                  className={`setup-option setup-option--size${selected ? ' setup-option--selected' : ''}`}
                >
                  <input
                    id={id}
                    type="radio"
                    name="board-size"
                    className="setup-option__input"
                    checked={selected}
                    onChange={() => selectSize(size)}
                  />
                  <span className="setup-option__size-label">{label}</span>
                  <span className="setup-option__descriptor">{descriptor}</span>
                </label>
              );
            })}
          </div>
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

        <fieldset className="go-setup__field">
          <legend className="go-setup__legend">First Player</legend>
          <div className="go-setup__segmented go-setup__segmented--players" role="radiogroup" aria-label="First player">
            <FirstPlayerOption
              color="black"
              selected={setup.firstPlayer === 'black'}
              name="first-player"
              onSelect={() => selectFirstPlayer('black')}
            />
            <FirstPlayerOption
              color="white"
              selected={setup.firstPlayer === 'white'}
              name="first-player"
              onSelect={() => selectFirstPlayer('white')}
            />
          </div>
        </fieldset>

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
