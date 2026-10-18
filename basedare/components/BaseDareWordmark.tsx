import Image from 'next/image';

type BaseDareWordmarkProps = {
  className?: string;
  sizes: string;
  priority?: boolean;
  isControlMode?: boolean;
};

/** One clear liquid wordmark at every size, with responsive image optimization. */
export default function BaseDareWordmark({ className, sizes, priority = false, isControlMode = false }: BaseDareWordmarkProps) {
  const filter = `${isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95) ' : ''}drop-shadow(0 2px 2px rgba(0,0,0,0.45))`;
  return (
    <Image
      src="/assets/basedare-wordmark-liquid-v2.webp"
      alt="BaseDare"
      width={1024}
      height={258}
      sizes={sizes}
      loading={priority ? 'eager' : undefined}
      fetchPriority={priority ? 'high' : undefined}
      draggable={false}
      className={className}
      style={{ filter, WebkitFilter: filter }}
    />
  );
}
