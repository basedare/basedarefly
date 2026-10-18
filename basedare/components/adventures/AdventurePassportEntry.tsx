import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function AdventurePassportEntry({ completed, href, storageUnavailable }: {
  completed: number;
  href: string;
  storageUnavailable: boolean;
}) {
  return <Link href={href} className="bd-card mt-5 flex min-h-20 items-center gap-3 p-4 sm:p-5" aria-label="Open your Adventure Passport">
    <BookOpen className="shrink-0 text-violet-200" size={22} aria-hidden="true" />
    <div className="min-w-0 flex-1"><h2 className="text-base font-bold text-white">Your Adventure Passport</h2>
      <p className={`mt-1 text-sm leading-6 ${storageUnavailable ? 'text-amber-100' : 'text-white/65'}`}>{storageUnavailable ? 'Storage unavailable · saved for this visit only' : completed ? `${completed} ${completed === 1 ? 'memory' : 'memories'} · your stamps and progress` : 'Your memories and stamps, when you’re ready'}</p>
    </div><ArrowRight className="shrink-0 text-violet-100" size={18} aria-hidden="true" />
  </Link>;
}
