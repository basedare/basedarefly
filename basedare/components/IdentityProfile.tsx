import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';

export function IdentityProfile({ address }: { address: `0x${string}` }) {
  return (
    <Identity address={address} className="flex items-center gap-2">
      <Avatar className="h-8 w-8 rounded-full" />
      <div className="flex flex-col">
        <Name className="font-bold text-sm text-white" />
        <Address className="text-xs text-gray-400" />
      </div>
    </Identity>
  );
}