interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-navy/70">{label}</label>
      )}
      <input
        className={`rounded-xl border border-lavender-dark bg-white px-4 py-2.5 text-navy outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
