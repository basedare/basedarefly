import Link from '@/components/DiscoveryLink';
import { BookOpen } from 'lucide-react';

/** Personal memories are an optional destination, not a participation step. */
export default function AdventurePassportEntry({ href = '/adventures/passport' }: { href?: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white/60 underline decoration-white/20 underline-offset-4">
    <BookOpen size={16} aria-hidden="true" />Memories / Passport <span className="font-normal text-white/50">· optional</span>
  </Link>;
}
