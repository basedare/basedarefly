'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAddress } from 'viem';

interface ReferralData {
  ref: string;
  dareId: string;
  timestamp: number;
}

const STORAGE_KEY = 'basedare_referral';
const REFERRAL_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to manage referral tracking
 * - Retrieves referral from URL params or sessionStorage
 * - Validates referral format
 * - Returns referrer address for contract calls
 */
export function useReferral() {
  const searchParams = useSearchParams();
  const urlRef = searchParams.get('ref');

  // Get stored referral from sessionStorage
  const getStoredReferral = useCallback((): ReferralData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored) as ReferralData;

      // Check if expired
      if (Date.now() - data.timestamp > REFERRAL_EXPIRY_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, []);

  // Parse referral to get address
  const parseReferralToAddress = useCallback((ref: string): string => {
    if (!ref) return '';

    // If it's a full address, use it
    if (isAddress(ref)) return ref;

    // If it's in @0x1234...5678 format, extract and return as-is (partial)
    // The contract can handle partial addresses for tracking purposes
    const cleanRef = ref.startsWith('@') ? ref.slice(1) : ref;

    // Try to detect if it looks like a truncated address
    if (cleanRef.includes('...') || cleanRef.includes('0x')) {
      // Return zero address as placeholder - backend should resolve full address
      return '0x0000000000000000000000000000000000000000';
    }

    return '';
  }, []);

  // Store referral
  const storeReferral = useCallback((ref: string, dareId: string) => {
    if (typeof window === 'undefined' || !ref) return;

    const data: ReferralData = {
      ref,
      dareId,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  // Clear referral after successful use
  const clearReferral = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get the active referral (URL param takes priority)
  const referralData = useMemo(() => {
    if (urlRef) {
      return { ref: urlRef, source: 'url' as const };
    }

    const stored = getStoredReferral();
    if (stored) {
      return { ref: stored.ref, source: 'storage' as const, dareId: stored.dareId };
    }

    return null;
  }, [urlRef, getStoredReferral]);

  // Get referrer address for contract calls
  const referrerAddress = useMemo(() => {
    if (!referralData) return '0x0000000000000000000000000000000000000000';
    return parseReferralToAddress(referralData.ref);
  }, [referralData, parseReferralToAddress]);

  return {
    referralData,
    referrerAddress,
    referrerTag: referralData?.ref || null,
    storeReferral,
    clearReferral,
    hasReferral: !!referralData,
  };
}
