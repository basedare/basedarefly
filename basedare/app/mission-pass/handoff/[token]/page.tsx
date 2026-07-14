import MissionPassHandoffClient from './MissionPassHandoffClient';

export const metadata = {
  title: 'Open your Mission Pass | BaseDare',
  robots: { index: false, follow: false },
};

export default async function MissionPassHandoffPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <MissionPassHandoffClient token={token} />;
}
