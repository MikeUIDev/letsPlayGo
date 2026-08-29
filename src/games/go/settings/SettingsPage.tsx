import { useState } from 'react';
import {
  loadCoordinatesPreference,
  saveCoordinatesPreference,
  type CoordinatesPreference,
} from '../coordinates';
import {
  loadFeedbackPreferences,
  saveFeedbackPreferences,
  type FeedbackPreferences,
} from '../feedback';
import { LiveAnnouncer } from '../accessibility/LiveAnnouncer';
import { useGoGameSession } from '../context/GoGameSessionProvider';
import '../go.css';

const COORDINATE_OPTIONS: ReadonlyArray<{
  value: CoordinatesPreference;
  label: string;
  description: string;
}> = [
  { value: 'default', label: 'Automatic', description: 'On for beginner AI and review' },
  { value: 'on', label: 'Always on', description: 'Show coordinates on every board' },
  { value: 'off', label: 'Always off', description: 'Hide coordinates by default' },
];

export function SettingsPage() {
  const { displaySavedGame, discardSavedGame } = useGoGameSession();
  const [preference, setPreference] = useState<CoordinatesPreference>(() => loadCoordinatesPreference());
  const [feedbackPrefs, setFeedbackPrefs] = useState<FeedbackPreferences>(() => loadFeedbackPreferences());
  const [statusMessage, setStatusMessage] = useState('');

  function selectPreference(next: CoordinatesPreference) {
    saveCoordinatesPreference(next);
    setPreference(next);
    const label = COORDINATE_OPTIONS.find((option) => option.value === next)?.label ?? next;
    setStatusMessage(`Board coordinates set to ${label}.`);
  }

  function updateFeedbackPreference(key: keyof FeedbackPreferences, enabled: boolean) {
    const next = { ...feedbackPrefs, [key]: enabled };
    saveFeedbackPreferences(next);
    setFeedbackPrefs(next);
    const label = key === 'sound' ? 'Sound' : 'Haptics';
    setStatusMessage(`${label} ${enabled ? 'enabled' : 'disabled'}.`);
  }

  return (
    <main className="go-settings" id="main-content" tabIndex={-1}>
      <LiveAnnouncer message={statusMessage || null} />
      <div className="go-shell go-settings__card">
        <header className="go-settings__header">
          <h1 className="go-settings__title">Settings</h1>
        </header>

        <section className="go-settings__section" aria-labelledby="feedback-setting">
          <h2 id="feedback-setting" className="go-settings__section-title">Gameplay feedback</h2>
          <div className="go-settings__toggles">
            <label className="go-settings__toggle" htmlFor="feedback-sound">
              <span className="go-settings__toggle-copy">
                <span className="go-settings__toggle-label">Sound</span>
                <span className="go-settings__toggle-description">Placement, capture, and completion cues</span>
              </span>
              <input
                id="feedback-sound"
                type="checkbox"
                className="go-settings__toggle-input"
                checked={feedbackPrefs.sound}
                onChange={(event) => updateFeedbackPreference('sound', event.target.checked)}
              />
            </label>
            <label className="go-settings__toggle" htmlFor="feedback-haptics">
              <span className="go-settings__toggle-copy">
                <span className="go-settings__toggle-label">Haptics</span>
                <span className="go-settings__toggle-description">Subtle vibration on supported devices</span>
              </span>
              <input
                id="feedback-haptics"
                type="checkbox"
                className="go-settings__toggle-input"
                checked={feedbackPrefs.haptics}
                onChange={(event) => updateFeedbackPreference('haptics', event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="go-settings__section" aria-labelledby="coordinates-setting">
          <h2 id="coordinates-setting" className="go-settings__section-title">Board coordinates</h2>
          <div className="go-settings__options" role="radiogroup" aria-label="Board coordinates">
            {COORDINATE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              const id = `coordinates-${option.value}`;

              return (
                <label
                  key={option.value}
                  htmlFor={id}
                  className={`go-settings__option${selected ? ' go-settings__option--selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                >
                  <input
                    id={id}
                    type="radio"
                    name="coordinates-preference"
                    className="setup-option__input"
                    checked={selected}
                    onChange={() => selectPreference(option.value)}
                  />
                  <span className="go-settings__option-label">{option.label}</span>
                  <span className="go-settings__option-description">{option.description}</span>
                </label>
              );
            })}
          </div>
        </section>

        {displaySavedGame ? (
          <section className="go-settings__section" aria-labelledby="saved-game-setting">
            <h2 id="saved-game-setting" className="go-settings__section-title">Saved game</h2>
            <p className="go-settings__help">
              Remove the unfinished game stored on this device. This cannot be undone.
            </p>
            <button
              type="button"
              className="control-button control-button--secondary go-settings__danger"
              aria-describedby="saved-game-setting"
              onClick={() => discardSavedGame()}
            >
              Discard saved game
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
