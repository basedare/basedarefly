// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// All state lives in the page shell; props are threaded with their original names.
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { CheckCircle2, CreditCard, MapPin, ReceiptText, Sparkles, Target, Users } from 'lucide-react';
import type { BountyApprovalStatus } from '@/lib/bounty-flow';
import { NETWORK_CONFIG } from '@/lib/contracts';
import {
  ACTIVATION_PACKAGES,
  PLATFORM_OPTIONS,
  TIER_INFO,
  buildActivationPackageDescription,
  buildActivationPackageTitle,
  formatCompactAudience,
  formatUsdAmount,
  formatVenueRadarLocation,
  getCreatorInitial,
  getCreatorReliabilityLabel,
  getCreatorStrengthLabel,
  getCreatorVenueFitLabel,
  type ActivationPackage,
  type ActivationPackageId,
  type BrandVenueRadarItem,
  type CampaignFormData,
  type CampaignMatch,
  type PlaceSearchResult,
} from './activation-packages';

type ActivationComposerProps = {
  addHashtag: () => void;
  approvalStatus: BountyApprovalStatus;
  budget: { gross: number; rake: number; total: number; effectiveSlotCount: number };
  canLaunchActivation: boolean;
  checkoutSectionRef: RefObject<HTMLDivElement | null>;
  checkoutSteps: Array<{ label: string; detail: string; complete: boolean }>;
  creatingCampaign: boolean;
  formData: CampaignFormData;
  handleCreateCampaign: () => Promise<void>;
  hashtagInput: string;
  openActivationBuilder: () => void;
  placeLoading: boolean;
  placeQuery: string;
  placeResults: PlaceSearchResult[];
  preferredCreatorTag: string | null;
  recommendedCreators: CampaignMatch[];
  recommendedCreatorsError: string | null;
  recommendedCreatorsLoading: boolean;
  selectActivationPackage: (packageId: ActivationPackageId) => void;
  selectedActivationPackage: ActivationPackage;
  selectedActivationPackageId: ActivationPackageId;
  selectedCheckoutCreator: CampaignMatch | null;
  selectedCreatorId: string | null;
  selectedCreatorLabel: string;
  selectedPlace: PlaceSearchResult | null;
  selectedVenueRadar: BrandVenueRadarItem | null;
  setFormData: Dispatch<SetStateAction<CampaignFormData>>;
  setHashtagInput: Dispatch<SetStateAction<string>>;
  setPlaceQuery: Dispatch<SetStateAction<string>>;
  setPlaceResults: Dispatch<SetStateAction<PlaceSearchResult[]>>;
  setPreferredCreatorTag: Dispatch<SetStateAction<string | null>>;
  setSelectedCreatorId: Dispatch<SetStateAction<string | null>>;
  setSelectedPlace: Dispatch<SetStateAction<PlaceSearchResult | null>>;
  setShowCreateCampaign: Dispatch<SetStateAction<boolean>>;
  showCreateCampaign: boolean;
  togglePreferredPlatform: (platform: string) => void;
};

export default function ActivationComposer({
  addHashtag,
  approvalStatus,
  budget,
  canLaunchActivation,
  checkoutSectionRef,
  checkoutSteps,
  creatingCampaign,
  formData,
  handleCreateCampaign,
  hashtagInput,
  openActivationBuilder,
  placeLoading,
  placeQuery,
  placeResults,
  preferredCreatorTag,
  recommendedCreators,
  recommendedCreatorsError,
  recommendedCreatorsLoading,
  selectActivationPackage,
  selectedActivationPackage,
  selectedActivationPackageId,
  selectedCheckoutCreator,
  selectedCreatorId,
  selectedCreatorLabel,
  selectedPlace,
  selectedVenueRadar,
  setFormData,
  setHashtagInput,
  setPlaceQuery,
  setPlaceResults,
  setPreferredCreatorTag,
  setSelectedCreatorId,
  setSelectedPlace,
  setShowCreateCampaign,
  showCreateCampaign,
  togglePreferredPlatform,
}: ActivationComposerProps) {
  return (
    <>
        {/* Value Menu / Launch Activation */}
        {showCreateCampaign ? (
          <div
            ref={checkoutSectionRef}
            className="activation-shell mb-8 overflow-hidden rounded-[28px] border backdrop-blur-md md:backdrop-blur-xl"
          >
            <div className="border-b border-white/10 bg-black/30 px-4 py-4 text-white md:px-6 md:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.15] bg-white/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                      Activation checkout
                    </span>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                      {selectedActivationPackage.eyebrow}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                    Launch one mission
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                    Choose the venue, package, and creator fit. BaseDare tracks proof back to the venue.
                  </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCampaign(false);
                  setPreferredCreatorTag(null);
                }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-zinc-300 transition hover:border-white/20 hover:text-white"
                  aria-label="Close activation checkout"
              >
                ✕
              </button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {checkoutSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className={`rounded-xl border px-2 py-2 text-center md:px-3 md:py-3 ${
                      step.complete
                        ? 'border-emerald-300/25 bg-emerald-400/10'
                        : index === 3
                          ? 'border-[#f5c518]/25 bg-[#f5c518]/10'
                          : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.12] bg-black/20 text-[10px] font-black md:h-7 md:w-7">
                      {step.complete ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" /> : index + 1}
                    </div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white md:text-[10px]">
                      {step.label}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-zinc-400 md:text-xs">
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6">
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <Target className="h-3.5 w-3.5" />
                  Current route
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Venue
                    </div>
                    <div className="mt-1 truncate text-base font-black text-zinc-950">
                      {selectedPlace?.name ?? selectedVenueRadar?.name ?? 'Choose a venue below'}
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500">
                      {selectedPlace?.displayName ?? (selectedVenueRadar ? formatVenueRadarLocation(selectedVenueRadar) : 'Required before launch')}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <Sparkles className="h-3.5 w-3.5" />
                      Package
                    </div>
                    <div className="mt-1 text-base font-black text-zinc-950">{selectedActivationPackage.name}</div>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">{selectedActivationPackage.buyerCopy}</div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <Users className="h-3.5 w-3.5" />
                      Creator
                    </div>
                    <div className="mt-1 truncate text-base font-black text-zinc-950">{selectedCreatorLabel}</div>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">
                      {selectedCheckoutCreator
                        ? selectedCheckoutCreator.reasons.slice(0, 2).join(' • ') || 'Best available venue fit'
                        : 'Auto-ranked after the venue is selected'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Choose package
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Presets keep buyers out of blank-form mode. Details stay editable below.
                    </div>
                  </div>
                  <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    1 creator route
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                {ACTIVATION_PACKAGES.map((activationPackage) => {
                  const info = TIER_INFO[activationPackage.tier];
                  const activeMinPayout = NETWORK_CONFIG.isMainnet ? info.minPayout : 1;
                  const packagePayout = Math.max(activationPackage.payout, activeMinPayout);
                  const packageFee = packagePayout * (parseInt(info.rake) / 100);
                  const packageTotal = packagePayout + packageFee;
                  const isSelected = selectedActivationPackageId === activationPackage.id;
                  return (
                    <button
                      key={activationPackage.id}
                      type="button"
                      onClick={() => selectActivationPackage(activationPackage.id)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? `bg-gradient-to-br ${info.color} border-transparent text-white shadow-[0_18px_42px_rgba(0,0,0,0.18)]`
                          : `bg-white ${info.borderColor} hover:border-zinc-400 text-zinc-900`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${isSelected ? 'text-white/70' : 'text-zinc-500'}`}>
                            {activationPackage.eyebrow}
                          </div>
                          <div className="mt-1 text-lg font-black leading-tight">{activationPackage.name}</div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
                        ) : null}
                      </div>
                      <div className={`mt-2 text-xs leading-5 ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                        {activationPackage.outcome}
                      </div>
                      <div className="mt-4 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Creator escrow:</span>
                          <span>${formatUsdAmount(packagePayout)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>BaseDare fee:</span>
                          <span>${formatUsdAmount(packageFee)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/[0.15] pt-1.5">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Total:</span>
                          <span className="font-black">${formatUsdAmount(packageTotal)}</span>
                        </div>
                        <div className="hidden justify-between md:flex">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Window:</span>
                          <span>{info.window}</span>
                        </div>
                      </div>
                      <div className={`mt-4 rounded-xl border px-3 py-2 text-[11px] leading-4 ${isSelected ? 'border-white/[0.15] bg-white/10 text-white/[0.78]' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
                        {activationPackage.bestFor}
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Editable details
                </div>
                <div className="mt-1 text-sm text-zinc-600">
                  The checkout is ready from the package. Adjust only what the buyer specifically cares about.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-2">Activation name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Hideaway Friday Foot-Traffic Push"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-2">What should the creator do?</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the visit, product moment, or challenge you want filmed..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400 resize-none"
                  />
                </div>

                {formData.type === 'PLACE' ? (
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Target venue</label>
                    <input
                      type="text"
                      value={selectedPlace ? selectedPlace.displayName : placeQuery}
                      onChange={(e) => {
                        setSelectedPlace(null);
                        setPreferredCreatorTag(null);
                        setPlaceQuery(e.target.value);
                      }}
                      placeholder="Search for a venue, landmark, or district..."
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                    <div className="mt-2 text-xs text-zinc-500">
                      Choose where you want the activation to happen. We will attach the live mission to that venue on the map.
                    </div>
                    {placeLoading ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        Searching places...
                      </div>
                    ) : !selectedPlace && placeResults.length > 0 ? (
                      <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                        {placeResults.slice(0, 5).map((place) => (
                          <button
                            key={place.id}
                            onClick={() => {
                              setSelectedPlace(place);
                              setPreferredCreatorTag(null);
                              setPlaceQuery(place.displayName);
                              setPlaceResults([]);
                              setFormData((current) => {
                                const genericPackageTitles = ACTIVATION_PACKAGES.map((activationPackage) =>
                                  buildActivationPackageTitle(activationPackage)
                                );
                                const genericPackageDescriptions = ACTIVATION_PACKAGES.map((activationPackage) =>
                                  buildActivationPackageDescription(activationPackage)
                                );
                                const shouldReplaceTitle =
                                  !current.title.trim() ||
                                  genericPackageTitles.includes(current.title.trim());
                                const shouldReplaceDescription =
                                  !current.description.trim() ||
                                  genericPackageDescriptions.includes(current.description.trim());

                                return {
                                  ...current,
                                  type: 'PLACE',
                                  title: shouldReplaceTitle
                                    ? buildActivationPackageTitle(selectedActivationPackage, place.name)
                                    : current.title,
                                  description: shouldReplaceDescription
                                    ? buildActivationPackageDescription(selectedActivationPackage, place.name)
                                    : current.description,
                                  creatorCountTarget: 1,
                                  targetingCriteria: {
                                    ...current.targetingCriteria,
                                    location: 'near-venue',
                                  },
                                };
                              });
                            }}
                            className="w-full rounded-lg border border-transparent bg-white px-3 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                          >
                            <div className="font-medium text-zinc-900">{place.name}</div>
                            <div className="text-xs text-zinc-500">{place.displayName}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                              {place.placeId ? 'Existing venue' : 'New venue from search'}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : placeQuery.trim().length >= 2 && !selectedPlace ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        No matching place yet. Try a nearby landmark, venue, or district name.
                      </div>
                    ) : null}
                    {selectedPlace ? (
                      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                        <div className="text-sm font-semibold text-emerald-800">{selectedPlace.name}</div>
                        <div className="text-xs text-emerald-700">{selectedPlace.displayName}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-emerald-700">
                          {selectedPlace.placeId ? 'Venue ready' : 'Venue will be created on launch'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {formData.type === 'CREATOR' ? (
                    <div>
                      <label className="block text-sm text-zinc-600 mb-2">Number of creators</label>
                      <input
                        type="number"
                        value={formData.creatorCountTarget}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creatorCountTarget: parseInt(e.target.value) || 1,
                          })
                        }
                        min={1}
                        max={1000}
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-zinc-600 mb-2">Activation count</label>
                      <div className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700">
                        1 live venue activation
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">
                      {formData.type === 'PLACE' ? 'Creator escrow for this activation ($)' : 'Payout per creator ($)'}
                    </label>
                    <input
                      type="number"
                      value={formData.payoutPerCreator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutPerCreator: parseInt(e.target.value) || 0,
                        })
                      }
                      min={NETWORK_CONFIG.isMainnet ? TIER_INFO[formData.tier].minPayout : 1}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {formData.type === 'CREATOR' ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-800">Creator-only campaigns are coming soon</div>
                    <div className="mt-2 text-sm text-amber-700">
                      New creator-only launches are not available yet. Venue activations are the live option today.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-semibold text-zinc-900">How venue activations work</div>
                    <div className="mt-2 text-sm text-zinc-600">
                      This funds one venue mission, routes one recommended creator, shows it on the map, and records the result back into venue memory.
                    </div>
                  </div>
                )}

                {formData.type === 'PLACE' ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Creator speed dial</div>
                      <div className="mt-1 hidden text-sm text-zinc-600 md:block">
                        Best-fit creators for this venue, ranked by venue fit, proof history, and audience signal. Pick one instead of browsing.
                      </div>
                    </div>

                    {!selectedPlace ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-4 text-sm text-zinc-500">
                        Choose a target venue first and BaseDare will surface the best-fit creators here.
                      </div>
                    ) : recommendedCreatorsLoading ? (
                      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-500">
                        Ranking creators for this venue...
                      </div>
                    ) : recommendedCreatorsError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                        {recommendedCreatorsError}
                      </div>
                    ) : recommendedCreators.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                        No strong creator match is ready yet. Broaden the targeting or try another venue.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recommendedCreators.slice(0, 3).map((match) => {
                          const isSelected = selectedCreatorId === match.creator.id;
                          return (
                            <div
                              key={match.creator.id}
                              className={`rounded-xl border p-3 transition ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/[0.06]'
                                  : preferredCreatorTag?.toLowerCase() === match.creator.tag.toLowerCase()
                                    ? 'border-cyan-300 bg-cyan-50'
                                  : 'border-zinc-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-amber-300">
                                  {match.creator.pfpUrl ? (
                                    <img
                                      src={match.creator.pfpUrl}
                                      alt={match.creator.tag}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                      {getCreatorInitial(match.creator.tag)}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-semibold text-zinc-900">{match.creator.tag}</div>
                                    <div className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                                      {getCreatorStrengthLabel(match)}
                                    </div>
                                    {preferredCreatorTag?.toLowerCase() === match.creator.tag.toLowerCase() ? (
                                      <div className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                                        venue favorite
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 hidden text-sm text-zinc-500 md:block">
                                    {match.creator.bio || 'No bio yet. Identity and performance stats still make this creator selectable.'}
                                  </div>
                                  <div className="mt-3 hidden grid-cols-3 gap-2 md:grid">
                                    {[
                                      { label: 'Venue fit', value: getCreatorVenueFitLabel(match) },
                                      { label: 'Reliability', value: getCreatorReliabilityLabel(match) },
                                      { label: 'Audience', value: formatCompactAudience(match.creator.followerCount) },
                                    ].map((item) => (
                                      <div
                                        key={`${match.creator.id}-${item.label}`}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2"
                                      >
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
                                        <div className="mt-1 text-xs font-semibold text-zinc-900">{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 hidden flex-wrap gap-2 md:flex">
                                    {match.reasons.slice(0, 2).map((reason) => (
                                      <span
                                        key={`${match.creator.id}-${reason}`}
                                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600"
                                      >
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCreatorId(match.creator.id);
                                    setPreferredCreatorTag(match.creator.tag);
                                  }}
                                  className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition md:self-start ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-500/[0.12] text-zinc-950'
                                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'Use creator'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="hidden rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4 md:block">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Optional targeting</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Use these if you want to guide creator fit. Most brands can leave them broad.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Creator niche</label>
                    <input
                      type="text"
                      value={formData.targetingCriteria.niche}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: { ...formData.targetingCriteria, niche: e.target.value },
                        })
                      }
                      placeholder="e.g., Surf, Nightlife, Food"
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Minimum audience size</label>
                    <input
                      type="number"
                      value={formData.targetingCriteria.minFollowers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: {
                            ...formData.targetingCriteria,
                            minFollowers: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      min={0}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Preferred platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((platform) => {
                        const active = formData.targetingCriteria.platforms.includes(platform.value);
                        return (
                          <button
                            key={platform.value}
                            type="button"
                            onClick={() => togglePreferredPlatform(platform.value)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? 'border-purple-500 bg-purple-500/[0.08] text-zinc-950'
                                : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400'
                            }`}
                          >
                            {platform.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Location preference</label>
                    <select
                      value={formData.targetingCriteria.location}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: {
                            ...formData.targetingCriteria,
                            location: e.target.value as 'anywhere' | 'near-venue',
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    >
                      <option value="anywhere">Open to creators anywhere</option>
                      <option value="near-venue">Prefer creators already around this venue</option>
                    </select>
                  </div>
                </div>

                <div className="hidden md:block">
                  <label className="block text-sm text-zinc-600 mb-2">Required hashtags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      placeholder="#BaseDare"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                      className="flex-1 px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                    <button
                      onClick={addHashtag}
                      className="px-4 py-3 bg-zinc-100 border border-zinc-300 rounded-lg hover:bg-zinc-200 text-zinc-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.verificationCriteria.hashtagsRequired.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-sm text-purple-700"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              verificationCriteria: {
                                ...formData.verificationCriteria,
                                hashtagsRequired:
                                  formData.verificationCriteria.hashtagsRequired.filter(
                                    (_, idx) => idx !== i
                                  ),
                              },
                            })
                          }
                          className="ml-2 text-purple-600 hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {(formData.tier === 'CHALLENGE' || formData.tier === 'APEX') && (
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">
                      Preferred posting window
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.syncTime}
                      onChange={(e) => setFormData({ ...formData, syncTime: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Checkout Summary */}
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.78fr]">
              <div className="activation-inset rounded-2xl border border-white/10 p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Checkout summary
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="activation-inset rounded-xl border border-white/10 px-3 py-3 text-center">
                    <div className="text-lg font-black text-white md:text-2xl">${formatUsdAmount(budget.gross)}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Creator escrow</div>
                  </div>
                  <div className="rounded-xl border border-purple-400/25 bg-purple-500/[0.08] px-3 py-3 text-center">
                    <div className="text-lg font-black text-[#dba7ff] md:text-2xl">
                      ${formatUsdAmount(budget.rake)}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200/70">
                      BaseDare fee
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] px-3 py-3 text-center">
                    <div className="text-lg font-black text-emerald-200 md:text-2xl">
                      ${formatUsdAmount(budget.total)}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/70">Total budget</div>
                  </div>
                  <div className="activation-inset rounded-xl border border-white/10 px-3 py-3 text-center">
                    <div className="text-lg font-black text-white md:text-2xl">{TIER_INFO[formData.tier].rake}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Platform rate</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.12] to-cyan-500/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Buyer confidence
                </div>
                <div className="mt-3 text-sm font-semibold text-white">
                  Proof is reviewed before completion.
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  The receipt links the venue, creator, payout, proof status, and repeat signal in one place after launch.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-30 -mx-2 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/80 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.45)] backdrop-blur md:static md:mx-0 md:flex-row md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
              <div className="activation-inset flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 md:hidden">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Total</div>
                  <div className="text-lg font-black text-white">${formatUsdAmount(budget.total)} USDC</div>
                </div>
                <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {selectedActivationPackage.name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={!canLaunchActivation}
                className="activation-raised-gold inline-flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-black uppercase tracking-[0.12em] transition active:translate-y-[1px] disabled:opacity-50 md:py-4 md:text-lg"
              >
                {creatingCampaign
                  ? approvalStatus === 'approving'
                    ? 'Approve USDC in wallet...'
                    : approvalStatus === 'funding'
                      ? 'Funding activation...'
                      : approvalStatus === 'verifying'
                        ? 'Registering activation...'
                        : 'Launching activation...'
                  : formData.type === 'PLACE'
                  ? (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span className="md:hidden">Fund ${formatUsdAmount(budget.total)}</span>
                      <span className="hidden md:inline">Fund Activation (${formatUsdAmount(budget.total)} USDC)</span>
                    </>
                  )
                  : 'Creator-Only Coming Soon'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCampaign(false);
                  setPreferredCreatorTag(null);
                }}
                className="activation-soft-button rounded-xl border border-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-200 transition hover:border-white/20 active:translate-y-[1px] md:py-4"
              >
                Cancel
              </button>
            </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openActivationBuilder}
            className="activation-shell group mb-8 w-full rounded-[28px] border p-5 text-left transition hover:border-[#f5c518]/[0.35] md:p-6"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffe785]">
                  Ready to launch
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  Fund one venue mission from the current radar pick.
                </div>
              </div>
              <span className="activation-raised-gold inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-xs font-black uppercase tracking-[0.12em] transition group-active:translate-y-[1px]">
                Launch venue activation
              </span>
            </div>
          </button>
        )}
    </>
  );
}
