export function ToggleSwitch({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded border-0 transition-colors ${
        on ? 'bg-accent' : 'bg-admin-hairline'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
