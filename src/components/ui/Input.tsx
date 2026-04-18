interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        className={`rounded-[12px] border border-border bg-bg px-4 py-2.5 text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
