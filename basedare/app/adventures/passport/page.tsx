import Link from '@/components/DiscoveryLink';
import AdventurePassport from '@/components/adventures/AdventurePassport';
import { ArrowLeft, Users } from 'lucide-react';

export const metadata = { title: 'Adventure Passport | BaseDare', description: 'Keep a personal journal of your free adventures, collect personal stamps and share something worth trying.', robots: { index: false, follow: false } };

export default function PassportPage() {
  return <main className="bd-page-top relative min-h-screen px-4 pb-32 text-white sm:px-6">
    <div className="relative mx-auto max-w-3xl">
      <nav className="mb-6 flex flex-wrap gap-3" aria-label="Your journey navigation">
        <Link href="/dashboard" className="bd-back"><ArrowLeft size={16} aria-hidden="true" />My activity</Link>
        <Link href="/adventures" className="bd-action ml-auto !text-xs">Find an adventure</Link>
      </nav>
      <h1 className="sr-only">Your Adventure Passport</h1>
      <AdventurePassport />
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/now?participation=meet" className="bd-action !text-xs"><Users size={16} aria-hidden="true" />Find a public plan</Link><Link href="/community?people=1#people" className="bd-action !text-xs">People &amp; friends</Link></div>
    </div>
  </main>;
}
