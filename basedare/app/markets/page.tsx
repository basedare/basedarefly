import { redirect } from 'next/navigation';

// The standalone Markets page duplicated the homepage Markets section.
// Old links land on the same content at its one home: /#markets.
export default function MarketsRoutePage() {
  redirect('/#markets');
}
