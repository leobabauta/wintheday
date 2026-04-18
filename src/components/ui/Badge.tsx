interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'active';
  className?: string;
}

const variants = {
  default: 'bg-surface text-text-secondary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  active: 'bg-text text-white',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
