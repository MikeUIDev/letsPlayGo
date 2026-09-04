type SwitchProps = {
  id?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Visual-only track for use inside a larger tappable row control. */
  decorative?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

/** Compact iOS-style boolean switch used by Settings rows. */
export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  decorative = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SwitchProps) {
  const className = `ios-switch${checked ? ' ios-switch--on' : ''}`;

  if (decorative) {
    return (
      <span className={className} aria-hidden="true">
        <span className="ios-switch__thumb" />
      </span>
    );
  }

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      className={className}
      onClick={() => onChange?.(!checked)}
    >
      <span className="ios-switch__thumb" aria-hidden="true" />
    </button>
  );
}
