'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
export default function RetryPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="bd-action" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? 'Checking…' : 'Try again'}</button>;
}
