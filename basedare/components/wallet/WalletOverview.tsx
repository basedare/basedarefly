'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useBalance, useConfig, useReadContract, useSwitchChain } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, RefreshCw, Wallet } from 'lucide-react';
import { getBaseNetworkConfig } from '@/lib/base-chain';

const network = getBaseNetworkConfig();
const token = network.isMainnet
  ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const simulation = process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES === 'true';

function displayAmount(value: bigint, decimals: number, digits: number) {
  const [whole, fraction = ''] = formatUnits(value, decimals).split('.');
  const precision = fraction.padEnd(digits, '0').slice(0, digits);
  if (value > BigInt(0) && whole === '0' && /^0+$/.test(precision)) return `<0.${'0'.repeat(digits - 1)}1`;
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${precision}`;
}

export function WalletOverview() {
  const { address, chainId, isConnected } = useAccount();
  const config = useConfig();
  const supportedNetwork = config.chains.some((chain) => chain.id === network.chainId);
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);
  useEffect(() => {
    const reveal = () => { if (window.location.hash === '#wallet') setOpen(true); };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  const [feedback, setFeedback] = useState<{ address: string; text: string } | null>(null);
  const enabled = open && isConnected && !!address && !simulation && supportedNetwork;
  const balance = useReadContract({
    address: token, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: network.chainId, query: { enabled, staleTime: 15_000, refetchOnWindowFocus: true },
  });
  const gas = useBalance({ address, chainId: network.chainId, query: { enabled, staleTime: 15_000 } });
  const correctNetwork = chainId === network.chainId;
  const canReceive = isConnected && !!address && correctNetwork && !simulation && supportedNetwork;
  const message = feedback && feedback.address === address ? feedback.text : '';

  return <section id="wallet" className="order-2 mb-6 scroll-mt-28 rounded-3xl border border-white/15 bg-[linear-gradient(135deg,rgba(46,29,70,.8),rgba(8,10,18,.92))] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_10px_24px_rgba(0,0,0,.25)]">
    <button type="button" aria-expanded={open} aria-controls="wallet-content" onClick={() => setOpen(!open)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-3"><Wallet className="h-5 w-5 text-yellow-300" /><span className="font-black">Your wallet</span></span>
      <span className="text-xs text-white/65">{open ? 'Close' : 'Balance & receive'} {open ? '−' : '+'}</span>
    </button>
    {open && <div id="wallet-content" className="mt-4">
      {!isConnected ? <><p className="text-sm text-white/70">Connect your wallet to see your balance and receive USDC.</p><button className="bd-action mt-4" onClick={() => window.dispatchEvent(new Event('basedare:sign-in'))}>Connect wallet</button></> : <>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-100">{network.chainName}{!network.isMainnet ? ' · test funds only' : ''}{simulation ? ' · demo mode' : ''}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="break-all text-2xl font-black sm:text-3xl" title={balance.data === undefined ? undefined : `${formatUnits(balance.data, 6)} USDC`} aria-live="polite">{simulation ? 'Demo mode' : !supportedNetwork ? 'Wallet unavailable on this network' : balance.isError ? 'Balance unavailable' : balance.data === undefined ? 'Loading…' : `${displayAmount(balance.data, 6, 2)} USDC`}</p>
          {!simulation && supportedNetwork && <button className="bd-action" disabled={balance.isFetching || gas.isFetching} onClick={() => { void balance.refetch(); void gas.refetch(); }}><RefreshCw className={`mr-2 h-4 w-4 ${balance.isFetching || gas.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />{balance.isFetching || gas.isFetching ? 'Refreshing…' : 'Refresh'}</button>}
        </div>
        <p className="mt-2 text-sm leading-6 text-white/70">Held in your connected wallet. Pending rewards and BaseCash venue credit are separate.</p>
        {!simulation && supportedNetwork && <p className="mt-2 text-xs text-white/60">Available for network fees: {gas.isError ? 'ETH balance unavailable' : gas.data ? `${displayAmount(gas.data.value, gas.data.decimals, 4)} ETH` : 'loading ETH balance…'}</p>}
        {!simulation && supportedNetwork && balance.isError && <p role="status" className="mt-3 text-sm text-amber-100">We couldn’t refresh your balance. Check your connection and try Refresh.</p>}
        {!simulation && !balance.isError && balance.data === BigInt(0) && <p className="mt-3 text-xs leading-5 text-white/60">No native USDC found on {network.chainName}. Tokens on other networks and balances in other wallets won’t appear here.</p>}
        {!simulation && balance.dataUpdatedAt > 0 && <p className="mt-2 text-xs text-white/50">Last checked {new Date(balance.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
        {!correctNetwork && !simulation && supportedNetwork && <button className="bd-action mt-4" disabled={switching} onClick={async () => {
          try { await switchChainAsync({ chainId: network.chainId }); setFeedback(null); }
          catch { if (address) setFeedback({ address, text: `Switch to ${network.chainName} in your wallet to receive funds here.` }); }
        }}>{switching ? 'Switching…' : `Switch to ${network.chainName}`}</button>}
        {canReceive && <button className="bd-action mt-4" aria-expanded={receiving} onClick={() => setReceiving(!receiving)}>{receiving ? 'Hide receive address' : `Receive ${network.isMainnet ? 'USDC' : 'test USDC'}`}</button>}
        {canReceive && receiving && <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-bold">{network.isMainnet ? 'Send native USDC on Base to this address.' : 'Use Base Sepolia test USDC only. Do not send real funds.'}</p>
          <p className="mt-2 text-xs leading-5 text-white/65">Choose {network.chainName} as the sending network. This is your wallet address, not a BaseDare deposit account. A small amount of ETH may be needed for future transactions.</p>
          <figure className="my-5 flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={address} size={192} level="M" marginSize={4} title={`Receive address on ${network.chainName}`} />
            </div>
            <figcaption className="text-center text-xs text-white/70">Scan to copy your address · select {network.chainName} when sending</figcaption>
          </figure>
          <code className="mt-3 block break-all text-sm text-cyan-100">{address}</code>
          <button className="bd-action mt-3" onClick={async () => {
            try { await navigator.clipboard.writeText(address); setFeedback({ address, text: 'Wallet address copied.' }); }
            catch { setFeedback({ address, text: 'Copy the full wallet address shown above.' }); }
          }}><Copy className="mr-2 h-4 w-4" />Copy wallet address</button>
          <a className="mt-3 block text-xs text-cyan-100 underline" href={`${network.blockExplorer}/token/${token}`} target="_blank" rel="noopener noreferrer">Check the supported USDC token</a>
        </div>}
        {message && <p role="status" className="mt-3 text-sm text-cyan-100">{message}</p>}
      </>}
      <div className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-white/70">
        <p className="font-bold text-white">Spend at a local venue</p>
        <p>At pilot venues, open the place page and look for “Pay with stablecoins using Yodl”. Checkout is in Yodl’s app; its wallet balance is separate from the balance shown here.</p>
        <Link href="/map" className="bd-action mt-3">Find a venue →</Link>
      </div>
    </div>}
  </section>;
}
