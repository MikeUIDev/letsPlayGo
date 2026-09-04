import { useId, useState } from 'react';
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
import { GameConfirmSheet } from '../components/GameConfirmSheet';
import { Switch } from '../components/Switch';
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
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const soundLabelId = useId();
  const hapticsLabelId = useId();

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

  const hasSavedGame = Boolean(displaySavedGame);

  return (
    <main className="go-settings" id="main-content" tabIndex={-1}>
      <LiveAnnouncer message={statusMessage || null} />
      <div className="go-shell go-settings__inner">
        <header className="go-settings__header">
          <p className="go-settings__eyebrow">Preferences</p>
          <h1 className="go-settings__title">Settings</h1>
        </header>

        <section className="go-settings__section" aria-labelledby="feedback-setting">
          <h2 id="feedback-setting" className="go-settings__section-title">
            Gameplay feedback
          </h2>
          <div className="go-settings__group">
            <button
              type="button"
              id="feedback-sound"
              className="go-settings__row"
              role="switch"
              aria-checked={feedbackPrefs.sound}
              aria-labelledby={soundLabelId}
              onClick={() => updateFeedbackPreference('sound', !feedbackPrefs.sound)}
            >
              <span className="go-settings__row-copy">
                <span id={soundLabelId} className="go-settings__row-label">
                  Sound
                </span>
                <span className="go-settings__row-description">
                  Placement, capture, and completion cues
                </span>
              </span>
              <Switch checked={feedbackPrefs.sound} decorative />
            </button>
            <button
              type="button"
              id="feedback-haptics"
              className="go-settings__row"
              role="switch"
              aria-checked={feedbackPrefs.haptics}
              aria-labelledby={hapticsLabelId}
              onClick={() => updateFeedbackPreference('haptics', !feedbackPrefs.haptics)}
            >
              <span className="go-settings__row-copy">
                <span id={hapticsLabelId} className="go-settings__row-label">
                  Haptics
                </span>
                <span className="go-settings__row-description">
                  Subtle vibration on supported devices
                </span>
              </span>
              <Switch checked={feedbackPrefs.haptics} decorative />
            </button>
          </div>
        </section>

        <section className="go-settings__section" aria-labelledby="coordinates-setting">
          <h2 id="coordinates-setting" className="go-settings__section-title">
            Board coordinates
          </h2>
          <div className="go-settings__group" role="radiogroup" aria-label="Board coordinates">
            {COORDINATE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              const id = `coordinates-${option.value}`;

              return (
                <label
                  key={option.value}
                  htmlFor={id}
                  className={`go-settings__choice${selected ? ' go-settings__choice--selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                >
                  <input
                    id={id}
                    type="radio"
                    name="coordinates-preference"
                    className="go-settings__choice-input"
                    checked={selected}
                    onChange={() => selectPreference(option.value)}
                  />
                  <span className="go-settings__row-copy">
                    <span className="go-settings__row-label">{option.label}</span>
                    <span className="go-settings__row-description">{option.description}</span>
                  </span>
                  <span
                    className={`go-settings__choice-indicator${selected ? ' go-settings__choice-indicator--selected' : ''}`}
                    aria-hidden="true"
                  >
                    {selected ? '✓' : null}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="go-settings__section" aria-labelledby="saved-game-setting">
          <h2 id="saved-game-setting" className="go-settings__section-title">
            Saved game
          </h2>
          <p className="go-settings__help">
            {hasSavedGame
              ? 'Remove the unfinished game stored on this device. This cannot be undone.'
              : 'No unfinished game is stored on this device.'}
          </p>
          <button
            type="button"
            className="control-button control-button--destructive go-settings__danger"
            aria-describedby="saved-game-setting"
            disabled={!hasSavedGame}
            onClick={() => setDiscardConfirmOpen(true)}
          >
            Discard saved game
          </button>
        </section>
      </div>

      <GameConfirmSheet
        open={discardConfirmOpen}
        title="Discard saved game?"
        message="Your saved game will be permanently removed from this device."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          discardSavedGame();
          setDiscardConfirmOpen(false);
          setStatusMessage('Saved game discarded.');
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </main>
  );
}
