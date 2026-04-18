interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  filled:  'bg-accent text-bg hover:bg-accent-dark border border-accent',
  outline: 'bg-transparent text-text border border-border hover:bg-surface',
  text:    'bg-transparent text-text-secondary hover:text-text border-0 px-0',
};

const sizes = {
  sm: 'px-3 py-2 text-[12px]',
  md: 'px-5 py-2.5 text-[13px]',
  lg: 'px-6 py-3 text-[14px]',
};

export default function Button({
  variant = 'outline',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-full font-body font-normal tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
