'use client';

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { CONTRACT_VALIDATION, isContractConfigured } from '@/lib/contracts';

interface ContractStatusProps {
  showAll?: boolean;
  className?: string;
}

/**
 * Shows contract configuration status
 * Displays errors if contracts are not properly configured
 */
export default function ContractStatus({ showAll = false, className = '' }: ContractStatusProps) {
  // If all contracts are valid and we're not showing all, render nothing
  if (CONTRACT_VALIDATION.allValid && !showAll) {
    return null;
  }

  const contracts = [
    { name: 'Bounty Contract', key: 'bounty' as const, validation: CONTRACT_VALIDATION.bounty },
    { name: 'USDC Contract', key: 'usdc' as const, validation: CONTRACT_VALIDATION.usdc },
    { name: 'Protocol Contract', key: 'protocol' as const, validation: CONTRACT_VALIDATION.protocol },
  ];

  return (
    <div className={`rounded-xl border bg-black/40 backdrop-blur-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {CONTRACT_VALIDATION.allValid ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        )}
        <h3 className="font-bold text-white text-sm">
          {CONTRACT_VALIDATION.allValid ? 'Contracts Configured' : 'Contract Configuration'}
        </h3>
      </div>

      <div className="space-y-2">
        {contracts.map(({ name, key, validation }) => (
          <div
            key={key}
            className={`flex items-start gap-2 p-2 rounded-lg ${
              validation.isValid
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {name}
              </p>
              {validation.isValid ? (
                <p className="text-[10px] text-green-400/60 font-mono truncate">
                  {validation.address}
                </p>
              ) : (
                <p className="text-[10px] text-red-400/80 mt-0.5">
                  {validation.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!CONTRACT_VALIDATION.allValid && (
        <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-[10px] text-yellow-400">
            <strong>Running in simulation mode.</strong> Deploy contracts and configure .env to enable live transactions.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inline status indicator for forms
 */
export function ContractStatusBadge() {
  if (CONTRACT_VALIDATION.allValid) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span className="text-[9px] font-mono text-green-400 uppercase tracking-wider">Live</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
      <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider">Simulation</span>
    </div>
  );
}
