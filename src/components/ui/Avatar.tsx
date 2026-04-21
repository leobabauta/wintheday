import Image from 'next/image';

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size: number;
  textSize?: number;
  className?: string;
}

export default function Avatar({ name, avatarUrl, size, textSize, className = '' }: AvatarProps) {
  const base = 'rounded-full bg-accent-light text-accent flex items-center justify-center flex-shrink-0 overflow-hidden';
  const style = { width: size, height: size, fontSize: textSize ?? Math.round(size / 3) };
  if (avatarUrl) {
    return (
      <div className={`${base} ${className}`} style={style}>
        <Image
          src={avatarUrl}
          alt={name}
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div className={`${base} tracking-wider ${className}`} style={style}>
      {initialsOf(name)}
    </div>
  );
}
