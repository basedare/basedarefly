import Link from 'next/link';

export function PostMissionIdentity() {
  return (
    <div className="mt-5 border-t border-white/10 pt-4 text-center">
      <p className="text-xs leading-5 text-white/45">
        Want a public name for your work? A Baretag is optional and is never required to submit or get paid.
      </p>
      <Link
        href="/claim-tag?source=mission-progress"
        className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-violet-100 underline underline-offset-4"
      >
        Choose a public @tag
      </Link>
    </div>
  );
}
