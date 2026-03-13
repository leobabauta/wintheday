interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'active';
  className?: string;
}

const variants = {
  default: 'bg-lavender-light text-navy/70',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  active: 'bg-navy text-white',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
