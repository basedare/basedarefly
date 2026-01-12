 'use client';

import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

export function IdentityButton() {
  useAccount();

  return (
    <div className="relative group p-[1.5px] rounded-xl overflow-hidden shadow-2xl">
      <div
        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500"
        aria-hidden="true"
      />

      <Wallet>
        <ConnectWallet className="relative flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-5 py-2 rounded-[10px] w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />

          <span className="relative z-10 text-[10px] font-black tracking-[0.3em] uppercase text-white transition-all duration-300 group-hover:tracking-[0.35em] group-hover:text-white">
            <span className="hidden md:inline">Enter Colosseum</span>
            <span className="md:hidden">Login</span>
          </span>

          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </ConnectWallet>

        <WalletDropdown className="bg-[#050505] border border-white/10 backdrop-blur-2xl">
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name className="text-white" />
            <Address className="text-gray-400" />
          </Identity>
          <WalletDropdownDisconnect className="hover:bg-white/5 text-gray-300" />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}
