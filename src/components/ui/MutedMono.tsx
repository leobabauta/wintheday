export default function MutedMono({
  children, className = '',
}: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[10px] tracking-[0.22em] uppercase text-text-muted font-normal ${className}`}>
      {children}
    </span>
  );
}
