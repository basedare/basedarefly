import Image from 'next/image';

type BaseDareWordmarkProps = {
  className?: string;
  sizes: string;
  priority?: boolean;
  isControlMode?: boolean;
};

/** Clear core lettering on phones; the small X signature has room at larger sizes. */
export default function BaseDareWordmark({ className, sizes, priority = false, isControlMode = false }: BaseDareWordmarkProps) {
  const filter = `${isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95) ' : ''}drop-shadow(0 2px 2px rgba(0,0,0,0.45))`;
  return (
    <picture className="contents">
      <source media="(min-width: 768px)" srcSet="/assets/basedare-wordmark-liquid-x-header-v2.webp" />
      <Image
        src="/assets/basedare-wordmark-liquid-v2.webp"
        alt="BaseDare"
        width={1024}
        height={258}
        sizes={sizes}
        loading={priority ? 'eager' : undefined}
        fetchPriority={priority ? 'high' : undefined}
        className={className}
        style={{ filter, WebkitFilter: filter }}
      />
    </picture>
  );
}
