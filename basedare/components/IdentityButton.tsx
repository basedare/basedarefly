import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

export function IdentityButton() {
  const { address } = useAccount();

  return (
    <Wallet>
      <ConnectWallet 
        className="bg-cyan-400 text-black font-black uppercase italic px-6 py-2 rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
      >
        <span className="hidden md:inline">Enter Colosseum</span>
        <span className="md:hidden">Login</span>
      </ConnectWallet>
      
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}