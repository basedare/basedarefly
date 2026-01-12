'use client';
import InfiniteMenu from './InfiniteMenu';

export default function Feed({ initialDares = [] }: { initialDares: any[] }) {
  // Fallback data if DB is empty
  const dataSource = initialDares.length > 0 ? initialDares : [
    { id: '1', title: 'EAT REAPER CHIP', bountyAmount: 5000, streamerHandle: 'KaiCenat', image: 'https://picsum.photos/seed/1/600/800' },
    { id: '2', title: 'SHAVE EYEBROW', bountyAmount: 2500, streamerHandle: 'Speed', image: 'https://picsum.photos/seed/2/600/800' },
    { id: '3', title: 'CALL YOUR EX', bountyAmount: 10000, streamerHandle: 'Adin', image: 'https://picsum.photos/seed/3/600/800' },
    { id: '4', title: 'TATTOO FACE', bountyAmount: 100000, streamerHandle: 'Steve', image: 'https://picsum.photos/seed/4/600/800' },
    { id: '5', title: 'DRINK LAKE WATER', bountyAmount: 1000, streamerHandle: 'Beast', image: 'https://picsum.photos/seed/5/600/800' },
  ];

  // Map your data to what the menu needs
  const menuItems = dataSource.map(d => ({
    id: d.id,
    title: d.title || d.description || d.task || "UNTITLED",
    bounty: d.bountyAmount?.toString() || d.stake_amount?.toString() || d.bounty || "0",
    streamer: d.streamerHandle || d.streamer_name || d.streamer_wallet || "@ANON",
    image: d.image || d.image_url || "https://via.placeholder.com/400x600?text=CYBER+DARE" 
  }));

  return (
    <div className="w-full h-[800px] relative z-10">
      <InfiniteMenu items={menuItems} onStake={(id) => console.log("Stake:", id)} />
    </div>
  );
}
