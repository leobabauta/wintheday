export default function Eyebrow({
  children, className = '',
}: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[11px] tracking-[0.14em] uppercase text-text-muted font-normal mb-2 ${className}`}>
      {children}
    </p>
  );
}
