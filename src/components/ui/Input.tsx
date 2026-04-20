interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// ZHD input: underline-only field. No rounded boxes, no filled background.
// Label (when present) renders as a mono-caps eyebrow above the field.
export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          {label}
        </label>
      )}
      <input
        className={`bg-transparent border-0 border-b border-border focus:border-[var(--color-accent)] py-1 text-[15px] text-text outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
