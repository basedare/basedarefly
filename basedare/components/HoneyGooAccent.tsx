import Image from 'next/image';

type HoneyGooAccentProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  flip?: boolean;
  priority?: boolean;
};

const sizeClasses: Record<NonNullable<HoneyGooAccentProps['size']>, string> = {
  sm: 'w-[118px] md:w-[138px]',
  md: 'w-[148px] md:w-[172px]',
  lg: 'w-[172px] md:w-[204px]',
};

export default function HoneyGooAccent({
  className = '',
  size = 'md',
  flip = false,
  priority = false,
}: HoneyGooAccentProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/assets/honey-drip-graffiti-v1.webp"
        alt=""
        width={960}
        height={422}
        priority={priority}
        sizes="(min-width: 1280px) 204px, (min-width: 768px) 172px, 118px"
        className={`h-auto w-full opacity-[0.96] [filter:drop-shadow(0_8px_12px_rgba(0,0,0,0.42))_drop-shadow(0_2px_8px_rgba(103,232,223,0.12))] ${
          flip ? '-scale-x-100' : ''
        }`}
      />
    </div>
  );
}
