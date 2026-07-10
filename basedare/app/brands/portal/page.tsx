'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAccount, useConnect, usePublicClient, useWriteContract } from 'wagmi';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  ReceiptText,
  Sparkles,
} from 'lucide-react';
import ParticleNetwork from '@/components/ParticleNetwork';
import { useBountyMode } from '@/hooks/useBountyMode';
import { submitBountyCreation, type BountyApprovalStatus } from '@/lib/bounty-flow';
import { NETWORK_CONFIG } from '@/lib/contracts';

// ============================================================================
// CONTROL MODE - BUYER PORTAL
// Fund useful real-world questions, verify the answers, keep the receipt.
// ============================================================================

import {
  type Brand,
  type BrandVenueRadarItem,
  type Campaign,
  type CampaignFormData,
  type CampaignMatch,
  type CampaignMatchesState,
  type ResponseRailTab,
  type VenueRadarFilter,
  type ComposerPrefill,
  type ReportAttribution,
  type PlaceSearchResult,
  type ActivationPackageId,
  ACTIVATION_PACKAGES,
  TIER_INFO,
  DEFAULT_ACTIVATION_PACKAGE_ID,
  getActivationPackage,
  getActivationPackageForTier,
  buildActivationPackageDescription,
  formatUsdAmount,
  isCampaignTier,
  formatVenueRadarLocation,
  getDefaultResponseTab,
} from './activation-packages';
import PortalGates from './PortalGates';
import PortalStats from './PortalStats';
import VenueRadar from './VenueRadar';
import ActivationComposer from './ActivationComposer';
import ResponseRail from './ResponseRail';

export default function BrandPortalPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { data: session } = useSession();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const { simulated: isSimulationMode } = useBountyMode();

  // Hydration guard to prevent SSR/client mismatch flickering
  const [mounted, setMounted] = useState(false);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [selectedActivationPackageId, setSelectedActivationPackageId] =
    useState<ActivationPackageId>(DEFAULT_ACTIVATION_PACKAGE_ID);
  const [venueRadarFilter, setVenueRadarFilter] = useState<VenueRadarFilter>('hot');
  const [selectedVenueRadarId, setSelectedVenueRadarId] = useState<string | null>(null);
  const [preferredCreatorTag, setPreferredCreatorTag] = useState<string | null>(null);
  const [reportAttribution, setReportAttribution] = useState<ReportAttribution | null>(null);

  const [formData, setFormData] = useState<CampaignFormData>({
    type: 'PLACE',
    tier: getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID).tier,
    title: '',
    description: '',
    creatorCountTarget: 10,
    payoutPerCreator: getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID).payout,
    syncTime: '',
    targetingCriteria: {
      niche: '',
      minFollowers: 0,
      location: 'anywhere',
      platforms: [],
    },
    verificationCriteria: {
      hashtagsRequired: [],
      minDurationSeconds: 30,
    },
  });
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [recommendedCreators, setRecommendedCreators] = useState<CampaignMatch[]>([]);
  const [recommendedCreatorsLoading, setRecommendedCreatorsLoading] = useState(false);
  const [recommendedCreatorsError, setRecommendedCreatorsError] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<BountyApprovalStatus>('idle');
  const [expandedMatchesCampaignId, setExpandedMatchesCampaignId] = useState<string | null>(null);
  const [responsesTabByCampaign, setResponsesTabByCampaign] = useState<Record<string, ResponseRailTab>>({});
  const [matchesByCampaign, setMatchesByCampaign] = useState<Record<string, CampaignMatchesState>>({});
  const [shortlistedCreators, setShortlistedCreators] = useState<Record<string, string[]>>({});
  const [handledDeepLinkKey, setHandledDeepLinkKey] = useState<string | null>(null);
  const [deepLinkSearch, setDeepLinkSearch] = useState('');
  const venueRadarSectionRef = useRef<HTMLDivElement | null>(null);
  const checkoutSectionRef = useRef<HTMLDivElement | null>(null);
  const campaignSummary = brand?.campaignSummary;
  const liveCampaignCount =
    campaignSummary?.live ?? campaigns.filter((c) => ['RECRUITING', 'LIVE'].includes(c.status)).length;
  const creatorMovementCount =
    campaignSummary?.creatorMovement ??
    campaigns.filter(
      (campaign) =>
        campaign.linkedDare?.claimRequestStatus === 'PENDING' ||
        Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)
    ).length;
  const proofsSubmittedCount =
    campaignSummary?.proofsSubmitted ?? campaigns.filter((campaign) => Boolean(campaign.linkedDare?.videoUrl)).length;
  const claimRequestsPendingCount =
    campaignSummary?.claimRequestsPending ??
    campaigns.filter((campaign) => campaign.linkedDare?.claimRequestStatus === 'PENDING').length;
  const creatorsAttachedCount =
    campaignSummary?.creatorsAttached ??
    campaigns.filter((campaign) => Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)).length;
  const paidOutCount =
    campaignSummary?.paid ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'VERIFIED').length;
  const inReviewCount =
    campaignSummary?.inReview ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_REVIEW').length;
  const payoutQueuedCount =
    campaignSummary?.payoutQueued ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_PAYOUT').length;
  const venueRadar = useMemo(() => brand?.venueRadar ?? [], [brand?.venueRadar]);
  const filteredVenueRadar = venueRadar.filter((venue) => {
    if (venueRadarFilter === 'managed') {
      return venue.claimState === 'claimed' || venue.sponsorReady;
    }

    if (venueRadarFilter === 'claimable') {
      return venue.claimState !== 'claimed';
    }

    return true;
  });
  // Inspect panel opens only on explicit selection (card tap or deep link) —
  // auto-opening the first venue buried the page under an uninvited dashboard.
  const selectedVenueRadar = selectedVenueRadarId
    ? filteredVenueRadar.find((venue) => venue.id === selectedVenueRadarId) ?? null
    : null;
  const selectedActivationPackage = getActivationPackage(selectedActivationPackageId);
  const selectedCheckoutCreator =
    formData.type === 'PLACE'
      ? recommendedCreators.find((match) => match.creator.id === selectedCreatorId) ?? null
      : null;
  const routeParams = useMemo(() => new URLSearchParams(deepLinkSearch), [deepLinkSearch]);
  const cameFromHome = routeParams.get('from') === 'home';
  const controlBackHref = cameFromHome ? '/' : '/?mode=control';
  const controlBackLabel = cameFromHome ? 'Home' : 'Control';
  const hasBrandActivity = Boolean(
    (brand?.totalSpend ?? 0) > 0 ||
      (campaignSummary?.total ?? 0) > 0 ||
      liveCampaignCount > 0 ||
      creatorMovementCount > 0 ||
      proofsSubmittedCount > 0 ||
      paidOutCount > 0 ||
      inReviewCount > 0 ||
      payoutQueuedCount > 0 ||
      campaigns.length > 0
  );

  const selectActivationPackage = useCallback((packageId: ActivationPackageId) => {
    const activationPackage = getActivationPackage(packageId);
    const activeMinPayout = NETWORK_CONFIG.isMainnet
      ? TIER_INFO[activationPackage.tier].minPayout
      : 1;
    const venueName = selectedPlace?.name ?? selectedVenueRadar?.name ?? null;

    setSelectedActivationPackageId(packageId);
    setComposerError(null);
    setFormData((current) => ({
      ...current,
      type: 'PLACE',
      tier: activationPackage.tier,
      // A template can shape proof, but it must never substitute for the
      // buyer's actual real-world question.
      title: current.title,
      description:
        !current.description.trim() ||
        ACTIVATION_PACKAGES.some(
          (template) => current.description.trim() === buildActivationPackageDescription(template, venueName),
        )
          ? buildActivationPackageDescription(activationPackage, venueName)
          : current.description,
      creatorCountTarget: 1,
      payoutPerCreator: Math.max(activationPackage.payout, activeMinPayout),
      targetingCriteria: {
        ...current.targetingCriteria,
        location: 'near-venue',
      },
    }));
  }, [selectedPlace?.name, selectedVenueRadar?.name]);

  const openCampaignComposerForVenue = useCallback((venue: BrandVenueRadarItem, prefillInput?: string | null | ComposerPrefill) => {
    const prefill =
      typeof prefillInput === 'string' || prefillInput === null || prefillInput === undefined
        ? { creatorTag: prefillInput ?? null }
        : prefillInput;
    const displayName = [venue.name, formatVenueRadarLocation(venue)].filter(Boolean).join(', ');
    const activationPackage = getActivationPackageForTier(prefill.tier);
    const nextTier = prefill.tier ?? activationPackage.tier;
    const minimumPayout = NETWORK_CONFIG.isMainnet ? TIER_INFO[nextTier].minPayout : 1;
    const nextPayout = prefill.payoutPerCreator
      ? Math.max(prefill.payoutPerCreator, minimumPayout)
      : Math.max(activationPackage.payout, minimumPayout);

    setSelectedActivationPackageId(activationPackage.id);
    setSelectedPlace({
      id: venue.id,
      name: venue.name,
      displayName,
      city: venue.city,
      country: venue.country,
      placeId: venue.id,
      slug: venue.slug,
    });
    setPlaceQuery(displayName);
    setFormData((current) => ({
      ...current,
      type: 'PLACE',
      tier: nextTier,
      title: prefill.title?.trim() || '',
      description:
        prefill.description?.trim() ||
        buildActivationPackageDescription(activationPackage, venue.name),
      payoutPerCreator: nextPayout,
      creatorCountTarget: 1,
      syncTime: prefill.syncTime ?? current.syncTime,
      targetingCriteria: {
        ...current.targetingCriteria,
        location: 'near-venue',
      },
    }));
    setPreferredCreatorTag(prefill.creatorTag?.trim() || null);
    setComposerError(null);
    setReportAttribution(
      prefill.reportSource === 'venue-report'
        ? {
            source: prefill.reportSource,
            audience: prefill.reportAudience ?? 'venue',
            sessionKey: prefill.reportSessionKey ?? null,
            intent: prefill.reportIntent ?? null,
          }
        : null
    );
    setShowCreateCampaign(true);
    setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const openCampaignComposerForCampaign = useCallback((campaign: Campaign) => {
    if (!campaign.venue) return;

    const matchingVenue = venueRadar.find(
      (venue) => venue.id === campaign.venue?.id || venue.slug === campaign.venue?.slug
    );
    const campaignTier = isCampaignTier(campaign.tier) ? campaign.tier : undefined;

    if (matchingVenue) {
      openCampaignComposerForVenue(matchingVenue, {
        tier: campaignTier,
        payoutPerCreator: campaign.payoutPerCreator,
        title: `${campaign.venue.name} re-verification`,
        description:
          campaign.description?.trim() ||
          `Re-verify the useful place information at ${campaign.venue.name} while the existing signal is still fresh.`,
        reportIntent: 'repeat',
      });
      return;
    }

    const activationPackage = getActivationPackageForTier(campaignTier);
    const nextTier = campaignTier ?? activationPackage.tier;
    const minimumPayout = NETWORK_CONFIG.isMainnet ? TIER_INFO[nextTier].minPayout : 1;
    const displayName = [campaign.venue.name, formatVenueRadarLocation(campaign.venue)]
      .filter(Boolean)
      .join(', ');

    setSelectedActivationPackageId(activationPackage.id);
    setSelectedPlace({
      id: campaign.venue.id,
      name: campaign.venue.name,
      displayName,
      city: campaign.venue.city,
      country: campaign.venue.country,
      placeId: campaign.venue.id,
      slug: campaign.venue.slug,
    });
    setPlaceQuery(displayName);
    setPreferredCreatorTag(null);
    setReportAttribution(null);
    setFormData((current) => ({
      ...current,
      type: 'PLACE',
      tier: nextTier,
      title: `${campaign.venue?.name ?? 'Place'} re-verification`,
      description:
        campaign.description?.trim() ||
        buildActivationPackageDescription(activationPackage, campaign.venue?.name),
      payoutPerCreator: Math.max(campaign.payoutPerCreator || activationPackage.payout, minimumPayout),
      creatorCountTarget: 1,
      targetingCriteria: {
        ...current.targetingCriteria,
        location: 'near-venue',
      },
    }));
    setShowCreateCampaign(true);
    setComposerError(null);
    setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [openCampaignComposerForVenue, venueRadar]);

  const inspectVenueRadar = useCallback((venue: BrandVenueRadarItem) => {
    setSelectedVenueRadarId(venue.id);
    setTimeout(() => {
      venueRadarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  }, []);

  const openActivationBuilder = useCallback(() => {
    if (selectedVenueRadar) {
      openCampaignComposerForVenue(selectedVenueRadar);
      return;
    }

    setShowCreateCampaign(true);
    setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [openCampaignComposerForVenue, selectedVenueRadar]);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRegisterError(null);
  }, [registerName]);

  useEffect(() => {
    setComposerError(null);
  }, [formData.title, formData.description, formData.payoutPerCreator, formData.tier, selectedPlace?.id, selectedCreatorId]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    setDeepLinkSearch(window.location.search);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!brand && campaigns.length === 0) return;

    const params = new URLSearchParams(deepLinkSearch);
    const venueSlug = params.get('venue');
    const campaignId = params.get('campaign');
    const compose = params.get('compose');
    const creatorTag = params.get('creator');
    const tier = params.get('tier');
    const payout = params.get('payout');
    const title = params.get('title');
    const objective = params.get('objective');
    const syncTime = params.get('syncTime');
    const reportSource = params.get('reportSource');
    const reportAudience =
      params.get('reportAudience') === 'sponsor'
        ? 'sponsor'
        : params.get('reportAudience') === 'venue'
          ? 'venue'
          : null;
    const reportSessionKey = params.get('reportSessionKey');
    const reportIntent =
      params.get('reportIntent') === 'repeat'
        ? 'repeat'
        : params.get('reportIntent') === 'activation'
          ? 'activation'
          : null;
    const deepLinkKey = `${venueSlug ?? ''}|${campaignId ?? ''}|${compose ?? ''}|${creatorTag ?? ''}|${tier ?? ''}|${payout ?? ''}|${title ?? ''}|${objective ?? ''}|${syncTime ?? ''}|${reportSource ?? ''}|${reportAudience ?? ''}|${reportSessionKey ?? ''}|${reportIntent ?? ''}`;

    if (handledDeepLinkKey === deepLinkKey) {
      return;
    }

    if (venueSlug) {
      const matchingVenue = venueRadar.find((venue) => venue.slug === venueSlug);
      if (matchingVenue) {
        setSelectedVenueRadarId(matchingVenue.id);

        if (compose === '1') {
          openCampaignComposerForVenue(matchingVenue, {
            creatorTag,
            tier: isCampaignTier(tier) ? tier : undefined,
            payoutPerCreator: payout ? Number.parseInt(payout, 10) : undefined,
            title,
            description: objective,
            syncTime,
            reportSource,
            reportAudience,
            reportSessionKey,
            reportIntent,
          });
        }
      }
    }

    if (campaignId) {
      const matchingCampaign = campaigns.find((campaign) => campaign.id === campaignId);
      if (matchingCampaign) {
        setExpandedMatchesCampaignId(matchingCampaign.id);
        setResponsesTabByCampaign((current) => ({
          ...current,
          [matchingCampaign.id]: current[matchingCampaign.id] ?? getDefaultResponseTab(matchingCampaign),
        }));
        setTimeout(() => {
          document.getElementById(`campaign-${matchingCampaign.id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 120);
      }
    }

    setHandledDeepLinkKey(deepLinkKey);
  }, [
    brand,
    campaigns,
    deepLinkSearch,
    handledDeepLinkKey,
    mounted,
    openCampaignComposerForVenue,
    venueRadar,
  ]);

  // Fetch brand and campaigns
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
        }

        const brandRes = await fetch(`/api/brands?wallet=${address}`);
        const brandData = await brandRes.json();

        if (!cancelled && brandData.success) {
          setBrand(brandData.data);

          const campaignsRes = await fetch(`/api/campaigns?brand=${address}`);
          const campaignsData = await campaignsRes.json();

          if (!cancelled && campaignsData.success) {
            setCampaigns(campaignsData.data);
          }
        } else if (!cancelled && brandData.code === 'NOT_FOUND') {
          setShowRegister(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch brand data:', error);
        }
      } finally {
        if (!cancelled && !isBackgroundRefresh) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    const interval = window.setInterval(() => {
      void fetchData(true);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isConnected, address]);

  useEffect(() => {
    if (formData.type !== 'PLACE') {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }

    const trimmedQuery = placeQuery.trim();
    if (trimmedQuery.length < 2) {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        setPlaceLoading(true);
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!cancelled) {
          const results = payload.success ? payload.data?.results ?? [] : [];
          setPlaceResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to search places:', error);
          setPlaceResults([]);
        }
      } finally {
        if (!cancelled) {
          setPlaceLoading(false);
        }
      }
    };

    const timer = window.setTimeout(run, 220);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [formData.type, placeQuery]);

  useEffect(() => {
    if (!showCreateCampaign || formData.type !== 'PLACE' || !address || !selectedPlace) {
      setRecommendedCreators([]);
      setRecommendedCreatorsLoading(false);
      setRecommendedCreatorsError(null);
      setSelectedCreatorId(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const targetingSignature = JSON.stringify(formData.targetingCriteria);

    const run = async () => {
      try {
        setRecommendedCreatorsLoading(true);
        setRecommendedCreatorsError(null);

        const response = await fetch('/api/campaigns/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            brandWallet: address,
            venueId: selectedPlace.placeId,
            venueCity: selectedPlace.city ?? undefined,
            venueCountry: selectedPlace.country ?? undefined,
            targetingCriteria: JSON.parse(targetingSignature),
            limit: 4,
          }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to load recommended creators');
        }

        if (cancelled) return;

        const matches = payload.data?.matches ?? [];
        setRecommendedCreators(matches);
        setSelectedCreatorId((current) =>
          current && matches.some((match: CampaignMatch) => match.creator.id === current)
            ? current
            : preferredCreatorTag
              ? matches.find((match: CampaignMatch) => match.creator.tag.toLowerCase() === preferredCreatorTag.toLowerCase())?.creator.id ?? matches[0]?.creator.id ?? null
              : matches[0]?.creator.id ?? null
        );
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setRecommendedCreators([]);
        setSelectedCreatorId(null);
        setRecommendedCreatorsError(
          error instanceof Error ? error.message : 'Failed to load recommended creators'
        );
      } finally {
        if (!cancelled) {
          setRecommendedCreatorsLoading(false);
        }
      }
    };

    const timer = window.setTimeout(run, 220);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    showCreateCampaign,
    formData.type,
    address,
    sessionToken,
    selectedPlace,
    preferredCreatorTag,
    formData.targetingCriteria,
  ]);

  const handleRegister = async () => {
    if (!address || !registerName.trim()) return;

    try {
      setRegisterError(null);
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          name: registerName,
          walletAddress: address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBrand(data.data);
        setShowRegister(false);
      } else {
        setRegisterError(data.error || 'Unable to create the buyer profile. Please try again.');
      }
    } catch (error) {
      console.error('Failed to register brand:', error);
      setRegisterError(error instanceof Error ? error.message : 'Unable to create the buyer profile. Please try again.');
    }
  };

  const handleCreateCampaign = async () => {
    if (!address) return;

    try {
      setCreatingCampaign(true);
      setApprovalStatus('idle');
      setComposerError(null);
      const tierConfig = TIER_INFO[formData.tier];
      const activeMinPayout = NETWORK_CONFIG.isMainnet ? tierConfig.minPayout : 1;
      
      if (formData.payoutPerCreator < activeMinPayout) {
        setComposerError(`The minimum reward for ${tierConfig.name} is $${activeMinPayout}.`);
        return;
      }

      if (formData.type === 'PLACE' && !selectedPlace?.placeId) {
        if (
          !selectedPlace?.externalPlaceId ||
          typeof selectedPlace.latitude !== 'number' ||
          typeof selectedPlace.longitude !== 'number'
        ) {
          setComposerError('Choose a valid place for this mission.');
          return;
        }
      }

      let resolvedVenueId = selectedPlace?.placeId;
      if (formData.type === 'PLACE' && !resolvedVenueId && selectedPlace) {
        const resolveResponse = await fetch('/api/places/resolve-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({
            name: selectedPlace.name,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
            address: selectedPlace.address ?? selectedPlace.displayName,
            city: selectedPlace.city,
            country: selectedPlace.country,
            placeSource: selectedPlace.placeSource ?? 'OSM_NOMINATIM',
            externalPlaceId: selectedPlace.externalPlaceId ?? selectedPlace.id,
          }),
        });

        const resolvePayload = await resolveResponse.json();
        if (!resolvePayload.success || !resolvePayload.data?.place?.id) {
          throw new Error(resolvePayload.error || 'Failed to resolve place');
        }

        resolvedVenueId = resolvePayload.data.place.id;
        setSelectedPlace((current) =>
          current
            ? {
                ...current,
                placeId: resolvePayload.data.place.id,
                slug: resolvePayload.data.place.slug ?? current.slug,
                address: resolvePayload.data.place.address ?? current.address,
              }
            : current
        );
      }

      if (formData.type === 'PLACE' && !selectedCreatorId) {
        setComposerError('BaseDare could not route a contributor yet. Try another place or request invoice setup.');
        return;
      }

      const chosenCreator =
        formData.type === 'PLACE'
          ? recommendedCreators.find((match) => match.creator.id === selectedCreatorId) ?? null
          : null;

      if (formData.type === 'PLACE' && !chosenCreator) {
        setComposerError('The routed contributor is no longer available. Refresh the place selection and try again.');
        return;
      }

      let linkedDareId: string | undefined;

      if (formData.type === 'PLACE' && chosenCreator && resolvedVenueId) {
        const connectedWallet = address.toLowerCase();

        const fundedDare = await submitBountyCreation(
          {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            amount: formData.payoutPerCreator,
            streamerTag: chosenCreator.creator.tag,
            streamId: `brand:${Date.now()}`,
            missionMode: 'IRL',
            missionTag: 'brand-campaign',
            isNearbyDare: true,
            latitude: selectedPlace?.latitude,
            longitude: selectedPlace?.longitude,
            locationLabel: selectedPlace?.name || selectedPlace?.displayName || undefined,
            discoveryRadiusKm: 0.5,
            venueId: resolvedVenueId,
            creationContext: 'MAP',
            stakerAddress: connectedWallet,
          },
          {
            sessionToken,
            isSimulationMode,
            publicClient,
            writeContractAsync,
            onApprovalStatusChange: setApprovalStatus,
          }
        );

        linkedDareId = fundedDare.dareId;
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          brandWallet: address,
          ...formData,
          creatorCountTarget: formData.type === 'PLACE' ? 1 : formData.creatorCountTarget,
          venueId: formData.type === 'PLACE' ? resolvedVenueId : undefined,
          selectedCreatorId: formData.type === 'PLACE' ? selectedCreatorId : undefined,
          linkedDareId,
          syncTime: formData.syncTime || undefined,
          reportSource: reportAttribution?.source ?? undefined,
          reportAudience: reportAttribution?.audience ?? undefined,
          reportSessionKey: reportAttribution?.sessionKey ?? undefined,
          reportIntent: reportAttribution?.intent ?? undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCampaigns([data.data, ...campaigns]);
        setComposerError(null);
        setShowCreateCampaign(false);
        setFormData({
          type: 'PLACE',
          tier: getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID).tier,
          title: '',
          description: '',
          creatorCountTarget: 10,
          payoutPerCreator: getActivationPackage(DEFAULT_ACTIVATION_PACKAGE_ID).payout,
          syncTime: '',
          targetingCriteria: { niche: '', minFollowers: 0, location: 'anywhere', platforms: [] },
          verificationCriteria: { hashtagsRequired: [], minDurationSeconds: 30 },
        });
        setSelectedActivationPackageId(DEFAULT_ACTIVATION_PACKAGE_ID);
        setPlaceQuery('');
        setPlaceResults([]);
        setSelectedPlace(null);
        setPreferredCreatorTag(null);
        setReportAttribution(null);
        setRecommendedCreators([]);
        setRecommendedCreatorsError(null);
        setRecommendedCreatorsLoading(false);
        setSelectedCreatorId(null);
      } else if (data.code === 'CREATOR_CAMPAIGNS_DORMANT') {
        setComposerError(data.error || 'This mission type is not available yet.');
      } else {
        setComposerError(
          linkedDareId
            ? `${data.error || 'Mission registration failed.'} Your funded dare is ${linkedDareId}; support can recover it without another payment.`
            : data.error || 'Mission registration failed. Please try again.',
        );
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      const message = error instanceof Error ? error.message : 'Failed to create campaign';
      setComposerError(message);
    } finally {
      setCreatingCampaign(false);
      setApprovalStatus('idle');
    }
  };

  const fetchMatchesForCampaign = async (campaignId: string) => {
    if (!address) return;

    setMatchesByCampaign((current) => ({
      ...current,
      [campaignId]: {
        loading: true,
        data: current[campaignId]?.data ?? [],
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/matches?brandWallet=${encodeURIComponent(address)}`,
        {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
        }
      );
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to load matches');
      }

      setMatchesByCampaign((current) => ({
        ...current,
        [campaignId]: {
          loading: false,
          data: payload.data?.matches ?? [],
          error: null,
        },
      }));
    } catch (error) {
      setMatchesByCampaign((current) => ({
        ...current,
        [campaignId]: {
          loading: false,
          data: current[campaignId]?.data ?? [],
          error: error instanceof Error ? error.message : 'Failed to load matches',
        },
      }));
    }
  };


  const toggleCampaignMatches = async (campaign: Campaign) => {
    const campaignId = campaign.id;
    const willExpand = expandedMatchesCampaignId !== campaignId;
    setExpandedMatchesCampaignId(willExpand ? campaignId : null);
    if (willExpand) {
      setResponsesTabByCampaign((current) => ({
        ...current,
        [campaignId]: current[campaignId] ?? getDefaultResponseTab(campaign),
      }));
    }

    if (!willExpand) return;
    if (matchesByCampaign[campaignId]?.data?.length || matchesByCampaign[campaignId]?.loading) return;

    await fetchMatchesForCampaign(campaignId);
  };

  const toggleShortlistCreator = (campaignId: string, creatorId: string) => {
    setShortlistedCreators((current) => {
      const currentList = current[campaignId] ?? [];
      const nextList = currentList.includes(creatorId)
        ? currentList.filter((id) => id !== creatorId)
        : [...currentList, creatorId];
      return {
        ...current,
        [campaignId]: nextList,
      };
    });
  };


  const calculateBudget = () => {
    const tierConfig = TIER_INFO[formData.tier];
    const effectiveSlotCount = formData.type === 'PLACE' ? 1 : formData.creatorCountTarget;
    const gross = formData.payoutPerCreator * effectiveSlotCount;
    const rake = gross * (parseInt(tierConfig.rake) / 100);
    return { gross, rake, total: gross + rake, effectiveSlotCount };
  };

  const budget = calculateBudget();
  const canLaunchActivation =
    !creatingCampaign &&
    Boolean(formData.title.trim()) &&
    formData.type === 'PLACE' &&
    Boolean(selectedPlace) &&
    !recommendedCreatorsLoading &&
    Boolean(selectedCreatorId);
  const checkoutSteps = [
    {
      label: 'Question',
      detail: formData.title.trim() || selectedActivationPackage.name,
      complete: Boolean(formData.title.trim()),
    },
    {
      label: 'Place',
      detail: selectedPlace?.name ?? 'Choose place',
      complete: Boolean(selectedPlace),
    },
    {
      label: 'Reward',
      detail: `$${formatUsdAmount(formData.payoutPerCreator)}`,
      complete: formData.payoutPerCreator > 0,
    },
    {
      label: 'Fund',
      detail: `$${formatUsdAmount(budget.total)} USDC`,
      complete: false,
    },
  ];

  // Determine current view state
  const showNotConnected = mounted && !isConnected;
  const showLoading = mounted && isConnected && loading;
  const showRegisterView = mounted && isConnected && !loading && showRegister;
  const showDashboard = mounted && isConnected && !loading && !showRegister;
  const showFirstRunOnRamp =
    showDashboard && !hasBrandActivity && !showCreateCampaign;

  return (
    <div className="control-glass-room fixed inset-0 z-[100] overflow-auto bg-[#030305] text-white">
      <style>{`
        .control-glass-room {
          background:
            radial-gradient(circle at 1px 1px, rgba(185,127,255,0.12) 1px, transparent 0) 0 0 / 112px 112px,
            radial-gradient(circle at 14% 8%, rgba(255,213,74,0.16), transparent 34%),
            radial-gradient(circle at 82% 8%, rgba(154,82,255,0.2), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(31,220,255,0.11), transparent 36%),
            linear-gradient(180deg, #05040a 0%, #07020f 48%, #000 100%);
        }

        .control-glass-room header,
        .control-glass-room [class*="bg-white"],
        .control-glass-room [class*="bg-zinc-50"],
        .control-glass-room [class*="bg-zinc-100"] {
          background: linear-gradient(180deg, rgba(255,255,255,0.105), rgba(154,82,255,0.04) 28%, rgba(4,4,10,0.9) 100%) !important;
          border-color: rgba(255,255,255,0.12) !important;
          box-shadow:
            0 22px 58px rgba(0,0,0,0.34),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -14px 22px rgba(0,0,0,0.28) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .control-glass-room [class*="bg-zinc-950"],
        .control-glass-room [class*="bg-zinc-900"] {
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.86)) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }

        .control-glass-room [class*="bg-amber-50"],
        .control-glass-room [class*="bg-yellow-50"] {
          background: linear-gradient(180deg, rgba(255,216,82,0.16), rgba(12,8,0,0.82)) !important;
          border-color: rgba(255,216,82,0.34) !important;
        }

        .control-glass-room [class*="bg-emerald-50"],
        .control-glass-room [class*="bg-green-50"] {
          background: linear-gradient(180deg, rgba(51,255,169,0.14), rgba(0,18,14,0.82)) !important;
          border-color: rgba(51,255,169,0.26) !important;
        }

        .control-glass-room [class*="bg-blue-50"],
        .control-glass-room [class*="bg-cyan-50"],
        .control-glass-room [class*="bg-sky-50"] {
          background: linear-gradient(180deg, rgba(82,222,255,0.14), rgba(0,12,22,0.84)) !important;
          border-color: rgba(82,222,255,0.26) !important;
        }

        .control-glass-room [class*="bg-violet-50"],
        .control-glass-room [class*="bg-purple-50"] {
          background: linear-gradient(180deg, rgba(181,104,255,0.16), rgba(14,5,28,0.84)) !important;
          border-color: rgba(181,104,255,0.28) !important;
        }

        .control-glass-room [class*="bg-red-50"] {
          background: linear-gradient(180deg, rgba(255,92,122,0.16), rgba(30,4,10,0.84)) !important;
          border-color: rgba(255,92,122,0.3) !important;
        }

        .control-glass-room [class*="border-zinc"],
        .control-glass-room [class*="border-yellow"],
        .control-glass-room [class*="border-purple"],
        .control-glass-room [class*="border-cyan"],
        .control-glass-room [class*="border-green"],
        .control-glass-room [class*="border-emerald"] {
          border-color: rgba(255,255,255,0.12) !important;
        }

        .control-glass-room [class*="text-zinc-950"],
        .control-glass-room [class*="text-zinc-900"],
        .control-glass-room [class*="text-zinc-800"],
        .control-glass-room [class*="text-zinc-700"] {
          color: rgba(255,255,255,0.94) !important;
        }

        .control-glass-room [class*="text-zinc-600"],
        .control-glass-room [class*="text-zinc-500"],
        .control-glass-room [class*="text-zinc-400"] {
          color: rgba(226,232,240,0.66) !important;
        }

        .control-glass-room input,
        .control-glass-room textarea,
        .control-glass-room select {
          background: rgba(0,0,0,0.34) !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: rgba(255,255,255,0.94) !important;
        }

        .control-glass-room input::placeholder,
        .control-glass-room textarea::placeholder {
          color: rgba(255,255,255,0.32) !important;
        }

        .activation-shell {
          background:
            radial-gradient(circle at 12% 18%, rgba(255,216,82,0.14), transparent 30%),
            radial-gradient(circle at 88% 8%, rgba(172,92,255,0.24), transparent 31%),
            linear-gradient(135deg, rgba(12,17,30,0.92), rgba(11,4,19,0.94) 48%, rgba(4,5,10,0.96));
          border-color: rgba(255,255,255,0.14);
          box-shadow:
            0 30px 90px rgba(0,0,0,0.44),
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -22px 36px rgba(0,0,0,0.28);
        }

        .activation-raised-gold {
          background: linear-gradient(180deg, #fff4a8 0%, #ffd01d 42%, #bd7d00 100%);
          color: #130d04 !important;
          border-color: rgba(255,239,149,0.78) !important;
          box-shadow:
            0 16px 32px rgba(255,194,0,0.2),
            inset 0 2px 0 rgba(255,255,255,0.48),
            inset 0 -5px 0 rgba(94,55,0,0.42);
        }

        .activation-raised-purple {
          background: linear-gradient(180deg, #d89cff 0%, #9d4edd 48%, #5520a4 100%);
          color: #fff !important;
          border-color: rgba(218,174,255,0.58) !important;
          box-shadow:
            0 16px 34px rgba(157,78,221,0.22),
            inset 0 2px 0 rgba(255,255,255,0.3),
            inset 0 -5px 0 rgba(40,12,76,0.48);
        }

        .activation-raised-cyan {
          background: linear-gradient(180deg, #72f5ff 0%, #22cde8 48%, #06708b 100%);
          color: #031017 !important;
          border-color: rgba(178,250,255,0.64) !important;
          box-shadow:
            0 16px 34px rgba(34,211,238,0.18),
            inset 0 2px 0 rgba(255,255,255,0.35),
            inset 0 -5px 0 rgba(0,68,88,0.42);
        }

        .activation-inset {
          background: linear-gradient(180deg, rgba(0,0,0,0.58), rgba(12,14,24,0.84));
          box-shadow:
            inset 0 2px 9px rgba(0,0,0,0.64),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .activation-soft-button {
          background: linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -4px 8px rgba(0,0,0,0.32),
            0 10px 24px rgba(0,0,0,0.22);
        }

        @media (max-width: 767px) {
          .control-glass-room header,
          .control-glass-room [class*="bg-white"],
          .control-glass-room [class*="bg-zinc-50"],
          .control-glass-room [class*="bg-zinc-100"] {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
        }
      `}</style>
      {/* VHS Scan Lines Overlay - old film aesthetic */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Subtle film grain noise */}
      <div
        className="fixed inset-0 z-[199] pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Keep mobile quiet and legible; the animated layer is desktop ambience only. */}
      <div className="fixed inset-0 z-0 hidden md:block">
        <ParticleNetwork particleCount={48} minDist={132} particleColor="rgba(194, 133, 255, 0.4)" lineColor="rgba(255, 211, 86, 0.14)" speed={0.18} />
      </div>

      {/* Pre-hydration skeleton */}
      {!mounted && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-400">Loading...</div>
        </div>
      )}

      <PortalGates
        address={address}
        connect={connect}
        connectors={connectors}
        controlBackHref={controlBackHref}
        controlBackLabel={controlBackLabel}
        handleRegister={handleRegister}
        registerError={registerError}
        registerName={registerName}
        setRegisterName={setRegisterName}
        showLoading={showLoading}
        showNotConnected={showNotConnected}
        showRegisterView={showRegisterView}
      />

      {/* Main dashboard */}
      {showDashboard && (
        <>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 px-4 py-3 shadow-[0_16px_44px_rgba(0,0,0,0.36)] md:px-6 md:py-4 md:backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Back button */}
            <Link
              href={controlBackHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.15] bg-white/[0.06] px-3 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.28)] transition hover:border-white/25 hover:bg-white/[0.09]"
              aria-label={`Back to ${controlBackLabel}`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden text-xs font-black uppercase tracking-[0.16em] text-white/72 sm:inline">
                {controlBackLabel}
              </span>
            </Link>
            <div>
              <div className="text-[1.05rem] font-black leading-none tracking-[-0.03em] text-white antialiased md:text-2xl">
                BUYER PORTAL
              </div>
              <div className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70 md:block">
                Fund questions · verify answers · keep receipts
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 md:justify-end md:gap-4">
            <div className="text-right">
              <div className="text-sm font-black text-white md:text-base">{brand?.name}</div>
              <div className="font-mono text-xs text-cyan-100/[0.55]">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            {brand?.verified && (
              <div className="rounded-full border border-emerald-300/30 bg-emerald-400/[0.12] px-2 py-1 text-xs text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}

            {/* Return to the public discovery side. */}
            <div className="touch-manipulation" style={{ padding: '8px 8px 16px 8px', margin: '-8px -8px -16px -8px', WebkitTapHighlightColor: 'transparent' }}>
              <Link
                href="/?from=control"
                className="activation-raised-purple inline-flex items-center gap-1 rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition active:translate-y-[1px] md:gap-2 md:px-4 md:py-2 md:text-sm"
                style={{ minHeight: '44px' }}
              >
                <span>EXPLORE</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:py-8">
        {showFirstRunOnRamp ? (
          <section className="activation-shell relative overflow-hidden rounded-[30px] border p-5 backdrop-blur-xl md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(245,197,24,0.12),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(168,85,247,0.14),transparent_34%)]" />
            <div className="relative grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                  <Sparkles className="h-4 w-4" />
                  Start here
                </div>
                <h1 className="mt-5 max-w-3xl text-3xl font-black uppercase italic leading-[0.94] tracking-[-0.055em] text-white sm:text-5xl">
                  Send one useful question into the real world.
                </h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/72">
                  Choose a place or question, fund the reward, and BaseDare returns a verified answer, timestamped place memory, and receipt.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openActivationBuilder}
                    className="activation-raised-gold inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition active:translate-y-[1px]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Create a mission
                  </button>
                  <Link
                    href="/board"
                    className="activation-soft-button inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/[0.13] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white/68 transition hover:border-white/24 hover:text-white"
                  >
                    See verified results
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: <ReceiptText className="h-4 w-4" />,
                    label: '1. Ask',
                    detail: 'One bounded real-world question.',
                  },
                  {
                    icon: <MapPin className="h-4 w-4" />,
                    label: '2. Place',
                    detail: 'Attach it to somewhere real.',
                  },
                  {
                    icon: <CreditCard className="h-4 w-4" />,
                    label: '3. Reward',
                    detail: 'Pay for an approved answer.',
                  },
                  {
                    icon: <CheckCircle2 className="h-4 w-4" />,
                    label: '4. Receipt',
                    detail: 'Verified proof and place memory.',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="activation-inset rounded-2xl border border-white/10 px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
                  >
                    <div className="flex items-center gap-2 text-cyan-100/72">
                      {item.icon}
                      <div className="text-xs font-black text-cyan-100/75">How it works</div>
                    </div>
                    <div className="mt-3 text-sm font-black text-white">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-white/64">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Venue owners land here from the home card too — route them to the
                claim path instead of burying them in sponsor tooling. */}
            <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 md:px-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe785]">
                Own the venue itself?
              </div>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-white/64">
                This portal is for funding missions. Your place profile, corrections and venue console live on the map. Open{' '}
                <Link
                  href="/map"
                  className="font-black text-yellow-100/85 underline decoration-yellow-200/30 underline-offset-4 transition hover:text-yellow-100"
                >
                  your venue on the map
                </Link>
                {' '}and choose “Claim venue”.
              </p>
            </div>
          </section>
        ) : (
          <>
        <div className="activation-shell mb-6 overflow-hidden rounded-[28px] border p-4 backdrop-blur-xl md:mb-8 md:p-6">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">
            Proof-backed fieldwork
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
            Send a verified mission into the real world
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/70">
            Ask one useful place question, fund the reward, and receive verified evidence, place memory, and a durable receipt. BaseDare handles contributor routing.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openActivationBuilder}
              className="activation-raised-gold inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition active:translate-y-[1px]"
            >
              <Sparkles className="h-4 w-4" />
              Create mission
            </button>
            <Link
              href="/board"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/[0.24] bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(0,0,0,0.2)] transition hover:border-cyan-200/40 hover:bg-cyan-400/[0.14]"
            >
              <ReceiptText className="h-4 w-4" />
              See verified results
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/58">
            Managing a venue? Claim it from its page on the map; buyer missions stay here.
          </p>
        </div>

        <ActivationComposer
          approvalStatus={approvalStatus}
          budget={budget}
          canLaunchActivation={canLaunchActivation}
          checkoutSectionRef={checkoutSectionRef}
          checkoutSteps={checkoutSteps}
          creatingCampaign={creatingCampaign}
          formData={formData}
          formError={composerError}
          handleCreateCampaign={handleCreateCampaign}
          placeLoading={placeLoading}
          placeQuery={placeQuery}
          placeResults={placeResults}
          recommendedCreators={recommendedCreators}
          recommendedCreatorsError={recommendedCreatorsError}
          recommendedCreatorsLoading={recommendedCreatorsLoading}
          selectActivationPackage={selectActivationPackage}
          selectedActivationPackage={selectedActivationPackage}
          selectedActivationPackageId={selectedActivationPackageId}
          selectedCheckoutCreator={selectedCheckoutCreator}
          selectedCreatorId={selectedCreatorId}
          selectedPlace={selectedPlace}
          setFormData={setFormData}
          setPlaceQuery={setPlaceQuery}
          setPlaceResults={setPlaceResults}
          setPreferredCreatorTag={setPreferredCreatorTag}
          setSelectedCreatorId={setSelectedCreatorId}
          setSelectedPlace={setSelectedPlace}
          setShowCreateCampaign={setShowCreateCampaign}
          showCreateCampaign={showCreateCampaign}
        />

        {hasBrandActivity ? (
          <>
        <PortalStats
          brand={brand}
          campaignSummary={campaignSummary}
          campaigns={campaigns}
          creatorMovementCount={creatorMovementCount}
          inReviewCount={inReviewCount}
          liveCampaignCount={liveCampaignCount}
          paidOutCount={paidOutCount}
          payoutQueuedCount={payoutQueuedCount}
          proofsSubmittedCount={proofsSubmittedCount}
        />

        {/* A returning buyer's first question is "what happened with my money" —
            their live campaigns come before venue discovery. */}
        <ResponseRail
          campaigns={campaigns}
          claimRequestsPendingCount={claimRequestsPendingCount}
          creatorsAttachedCount={creatorsAttachedCount}
          expandedMatchesCampaignId={expandedMatchesCampaignId}
          inReviewCount={inReviewCount}
          matchesByCampaign={matchesByCampaign}
          openActivationBuilder={openActivationBuilder}
          openCampaignComposerForCampaign={openCampaignComposerForCampaign}
          paidOutCount={paidOutCount}
          payoutQueuedCount={payoutQueuedCount}
          proofsSubmittedCount={proofsSubmittedCount}
          responsesTabByCampaign={responsesTabByCampaign}
          setResponsesTabByCampaign={setResponsesTabByCampaign}
          shortlistedCreators={shortlistedCreators}
          toggleCampaignMatches={toggleCampaignMatches}
          toggleShortlistCreator={toggleShortlistCreator}
        />

        <details className="activation-shell mt-6 rounded-[26px] border p-3 md:p-4" open={Boolean(selectedVenueRadar)}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60">
            <div>
              <div className="text-base font-black text-white">Need place ideas?</div>
              <div className="mt-1 text-sm text-white/58">Browse existing place signals only when they help define the next mission.</div>
            </div>
            <MapPin className="h-5 w-5 shrink-0 text-cyan-200" />
          </summary>
          <VenueRadar
            closeVenueRadarInspect={() => setSelectedVenueRadarId(null)}
            filteredVenueRadar={filteredVenueRadar}
            inspectVenueRadar={inspectVenueRadar}
            openCampaignComposerForVenue={openCampaignComposerForVenue}
            selectedVenueRadar={selectedVenueRadar}
            setVenueRadarFilter={setVenueRadarFilter}
            venueRadarFilter={venueRadarFilter}
            venueRadarSectionRef={venueRadarSectionRef}
          />
        </details>
          </>
        ) : null}

          </>
        )}
      </main>
      </>
      )}
    </div>
  );
}
