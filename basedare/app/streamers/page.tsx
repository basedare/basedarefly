import { redirect } from 'next/navigation';

// Legacy route. The public creator directory now lives at /creators.
export default function StreamersRedirect() {
  redirect('/creators');
}
