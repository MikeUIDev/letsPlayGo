interface CoordinatesToggleProps {
  checked: boolean;
  onToggle: () => void;
  className?: string;
}

export function CoordinatesToggle({ checked, onToggle, className = '' }: CoordinatesToggleProps) {
  return (
    <label className={`coordinates-toggle ${className}`.trim()}>
      <input
        type="checkbox"
        className="coordinates-toggle__input"
        checked={checked}
        onChange={onToggle}
      />
      <span className="coordinates-toggle__label">Show coordinates</span>
    </label>
  );
}
