import type { Dispatch, RefObject, SetStateAction } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  MapPin,
  ReceiptText,
  Route,
  Sparkles,
  UserRoundCheck,
  X,
} from 'lucide-react';
import type { BountyApprovalStatus } from '@/lib/bounty-flow';
import { NETWORK_CONFIG } from '@/lib/contracts';
import {
  ACTIVATION_PACKAGES,
  TIER_INFO,
  buildActivationPackageDescription,
  formatUsdAmount,
  type ActivationPackage,
  type ActivationPackageId,
  type CampaignFormData,
  type CampaignMatch,
  type PlaceSearchResult,
} from './activation-packages';

type MissionComposerProps = {
  approvalStatus: BountyApprovalStatus;
  budget: { gross: number; rake: number; total: number; effectiveSlotCount: number };
  canLaunchActivation: boolean;
  checkoutSectionRef: RefObject<HTMLDivElement | null>;
  checkoutSteps: Array<{ label: string; detail: string; complete: boolean }>;
  creatingCampaign: boolean;
  formData: CampaignFormData;
  formError: string | null;
  handleCreateCampaign: () => Promise<void>;
  placeLoading: boolean;
  placeQuery: string;
  placeResults: PlaceSearchResult[];
  recommendedCreators: CampaignMatch[];
  recommendedCreatorsError: string | null;
  recommendedCreatorsLoading: boolean;
  selectActivationPackage: (packageId: ActivationPackageId) => void;
  selectedActivationPackage: ActivationPackage;
  selectedActivationPackageId: ActivationPackageId;
  selectedCheckoutCreator: CampaignMatch | null;
  selectedCreatorId: string | null;
  selectedPlace: PlaceSearchResult | null;
  setFormData: Dispatch<SetStateAction<CampaignFormData>>;
  setPlaceQuery: Dispatch<SetStateAction<string>>;
  setPlaceResults: Dispatch<SetStateAction<PlaceSearchResult[]>>;
  setPreferredCreatorTag: Dispatch<SetStateAction<string | null>>;
  setSelectedCreatorId: Dispatch<SetStateAction<string | null>>;
  setSelectedPlace: Dispatch<SetStateAction<PlaceSearchResult | null>>;
  setShowCreateCampaign: Dispatch<SetStateAction<boolean>>;
  showCreateCampaign: boolean;
};

const sectionClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(4,5,10,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_44px_rgba(0,0,0,0.24)] sm:p-5';
const labelClass = 'mb-2 block text-sm font-black text-white/78';
const inputClass =
  'min-h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-yellow-300/55 focus:ring-2 focus:ring-yellow-300/15';

export default function ActivationComposer({
  approvalStatus,
  budget,
  canLaunchActivation,
  checkoutSectionRef,
  checkoutSteps,
  creatingCampaign,
  formData,
  formError,
  handleCreateCampaign,
  placeLoading,
  placeQuery,
  placeResults,
  recommendedCreators,
  recommendedCreatorsError,
  recommendedCreatorsLoading,
  selectActivationPackage,
  selectedActivationPackage,
  selectedActivationPackageId,
  selectedCheckoutCreator,
  selectedCreatorId,
  selectedPlace,
  setFormData,
  setPlaceQuery,
  setPlaceResults,
  setPreferredCreatorTag,
  setSelectedCreatorId,
  setSelectedPlace,
  setShowCreateCampaign,
  showCreateCampaign,
}: MissionComposerProps) {
  if (!showCreateCampaign) return null;

  const closeComposer = () => {
    setShowCreateCampaign(false);
    setPreferredCreatorTag(null);
  };

  const selectPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    setPreferredCreatorTag(null);
    setPlaceQuery(place.displayName);
    setPlaceResults([]);
    setFormData((current) => {
      const genericDescriptions = ACTIVATION_PACKAGES.map((template) => buildActivationPackageDescription(template));
      const replaceDescription =
        !current.description.trim() || genericDescriptions.includes(current.description.trim());

      return {
        ...current,
        type: 'PLACE',
        title: current.title,
        description: replaceDescription
          ? buildActivationPackageDescription(selectedActivationPackage, place.name)
          : current.description,
        creatorCountTarget: 1,
        targetingCriteria: { ...current.targetingCriteria, location: 'near-venue' },
      };
    });
  };

  const routingLabel = !selectedPlace
    ? 'Choose a place first'
    : recommendedCreatorsLoading
      ? 'Finding the best fit…'
      : recommendedCreatorsError
        ? 'Routing needs attention'
        : selectedCheckoutCreator
          ? 'Best-fit contributor ready'
          : 'No contributor ready yet';

  const disabledReason = !formData.title.trim()
    ? 'Add the real-world question to continue.'
    : !selectedPlace
      ? 'Choose the place where the answer should be verified.'
      : recommendedCreatorsLoading
        ? 'BaseDare is finding the best available contributor.'
        : !selectedCreatorId
          ? recommendedCreatorsError || 'No suitable contributor is ready for this place yet.'
          : null;

  return (
    <section
      ref={checkoutSectionRef}
      className="activation-shell mb-8 overflow-hidden rounded-[30px] border backdrop-blur-md md:backdrop-blur-xl"
      aria-labelledby="mission-builder-title"
    >
      <div className="border-b border-white/10 bg-black/30 px-4 py-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300/[0.09] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
              <Sparkles className="h-4 w-4" />
              New field mission
            </div>
            <h2 id="mission-builder-title" className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              Send one useful question into the real world.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Choose what should be verified, where it should happen, and the reward. BaseDare routes the contributor, checks the proof, and returns a receipt.
            </p>
          </div>
          <button
            type="button"
            onClick={closeComposer}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/72 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60"
            aria-label="Close mission builder"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Mission setup progress">
          {checkoutSteps.map((step, index) => (
            <li
              key={step.label}
              className={`rounded-2xl border px-3 py-3 ${
                step.complete
                  ? 'border-emerald-300/30 bg-emerald-400/10'
                  : index === 3
                    ? 'border-yellow-300/30 bg-yellow-300/[0.08]'
                    : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 text-xs font-black text-white">
                  {step.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white">{step.label}</div>
                  <div className="truncate text-xs text-white/55">{step.detail}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        <section className={sectionClass} aria-labelledby="mission-question-heading">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-300/25 bg-purple-400/10 text-purple-100">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-100/75">Step 1</p>
              <h3 id="mission-question-heading" className="text-xl font-black text-white">What do you want verified?</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {ACTIVATION_PACKAGES.map((template) => {
              const selected = selectedActivationPackageId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectActivationPackage(template.id)}
                  aria-pressed={selected}
                  className={`min-h-[168px] rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60 ${
                    selected
                      ? 'border-yellow-200/55 bg-[linear-gradient(180deg,rgba(245,197,24,0.18),rgba(8,7,12,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_34px_rgba(0,0,0,0.28)]'
                      : 'border-white/10 bg-black/25 hover:border-white/22 hover:bg-white/[0.055]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-yellow-100/80">{template.eyebrow}</div>
                    {selected ? <CheckCircle2 className="h-5 w-5 text-yellow-200" /> : null}
                  </div>
                  <div className="mt-3 text-lg font-black text-white">{template.name}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{template.outcome}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="mission-title" className={labelClass}>The question</label>
              <input
                id="mission-title"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                placeholder="e.g. What is the best quiet-work café near Cloud 9 right now?"
                className={inputClass}
              />
              <p className="mt-2 text-sm leading-6 text-white/55">Keep it bounded enough that one person can answer it honestly.</p>
            </div>
            <div>
              <label htmlFor="mission-proof" className={labelClass}>What should the answer include?</label>
              <textarea
                id="mission-proof"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Ask for the useful fact, photo or clip, and any detail that must be current."
                rows={4}
                className={`${inputClass} resize-none leading-6`}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="mission-place-heading">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/75">Step 2</p>
              <h3 id="mission-place-heading" className="text-xl font-black text-white">Where should it happen?</h3>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="mission-place" className={labelClass}>Place, landmark or local area</label>
            <input
              id="mission-place"
              value={selectedPlace ? selectedPlace.displayName : placeQuery}
              onChange={(event) => {
                setSelectedPlace(null);
                setSelectedCreatorId(null);
                setPreferredCreatorTag(null);
                setPlaceQuery(event.target.value);
              }}
              placeholder="Search for a real place…"
              className={inputClass}
              autoComplete="off"
            />
            <p className="mt-2 text-sm leading-6 text-white/55">The approved answer becomes timestamped memory for this place.</p>

            {placeLoading ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/65">Searching places…</div>
            ) : !selectedPlace && placeResults.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/35 p-2">
                {placeResults.slice(0, 5).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="min-h-14 w-full rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                  >
                    <div className="font-black text-white">{place.name}</div>
                    <div className="mt-1 text-sm text-white/58">{place.displayName}</div>
                  </button>
                ))}
              </div>
            ) : placeQuery.trim().length >= 2 && !selectedPlace ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/65">
                No match yet. Try a nearby landmark, venue or district.
              </div>
            ) : null}

            {selectedPlace ? (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/[0.09] px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                <div>
                  <div className="font-black text-white">{selectedPlace.name}</div>
                  <div className="mt-1 text-sm text-white/65">{selectedPlace.displayName}</div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="mission-reward-heading">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-100">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/75">Step 3</p>
              <h3 id="mission-reward-heading" className="text-xl font-black text-white">Set the reward</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.78fr_1.22fr]">
            <div>
              <label htmlFor="mission-reward" className={labelClass}>Reward for an approved answer</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-black text-white/55">$</span>
                <input
                  id="mission-reward"
                  type="number"
                  value={formData.payoutPerCreator}
                  onChange={(event) => setFormData({ ...formData, payoutPerCreator: Number.parseInt(event.target.value, 10) || 0 })}
                  min={NETWORK_CONFIG.isMainnet ? TIER_INFO[formData.tier].minPayout : 1}
                  inputMode="numeric"
                  className={`${inputClass} pl-8`}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-white/55">Payment releases only after the proof clears review.</p>
            </div>

            <div className="activation-inset grid grid-cols-3 gap-2 rounded-2xl border border-white/10 p-3">
              {[
                ['Reward', budget.gross],
                ['BaseDare fee', budget.rake],
                ['Total', budget.total],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-center">
                  <div className="text-lg font-black tabular-nums text-white">${formatUsdAmount(Number(value))}</div>
                  <div className="mt-1 text-xs font-semibold text-white/58">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="mission-review-heading">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.09] text-yellow-100">
              <Route className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-100/75">Step 4</p>
              <h3 id="mission-review-heading" className="text-xl font-black text-white">Review and fund</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="activation-inset rounded-2xl border border-white/10 px-4 py-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Mission</div>
              <div className="mt-2 font-black text-white">{formData.title.trim() || 'Add your question'}</div>
              <div className="mt-1 text-sm leading-6 text-white/58">{selectedActivationPackage.name}</div>
            </div>
            <div className="activation-inset rounded-2xl border border-white/10 px-4 py-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Place</div>
              <div className="mt-2 font-black text-white">{selectedPlace?.name ?? 'Choose a place'}</div>
              <div className="mt-1 text-sm leading-6 text-white/58">Timestamped place memory</div>
            </div>
            <div className="activation-inset rounded-2xl border border-white/10 px-4 py-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Routing</div>
              <div className="mt-2 font-black text-white">{routingLabel}</div>
              <div className="mt-1 text-sm leading-6 text-white/58">BaseDare chooses by local fit and proof history</div>
            </div>
          </div>

          {recommendedCreatorsError ? (
            <div className="mt-3 rounded-2xl border border-red-300/25 bg-red-400/[0.08] px-4 py-3 text-sm font-semibold text-red-100" role="alert">
              {recommendedCreatorsError}
            </div>
          ) : null}

          {recommendedCreators.length > 0 ? (
            <details className="mt-3 rounded-2xl border border-white/10 bg-black/20">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60">
                <span className="inline-flex items-center gap-2">
                  <UserRoundCheck className="h-4 w-4 text-cyan-200" />
                  Choose a specific contributor instead
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-3 md:grid-cols-3">
                {recommendedCreators.slice(0, 3).map((match) => {
                  const selected = selectedCreatorId === match.creator.id;
                  return (
                    <button
                      key={match.creator.id}
                      type="button"
                      onClick={() => {
                        setSelectedCreatorId(match.creator.id);
                        setPreferredCreatorTag(match.creator.tag);
                      }}
                      className={`min-h-14 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 ${
                        selected
                          ? 'border-cyan-300/45 bg-cyan-400/10'
                          : 'border-white/10 bg-white/[0.035] hover:border-white/22'
                      }`}
                    >
                      <div className="font-black text-white">{match.creator.tag}</div>
                      <div className="mt-1 text-sm text-white/58">{match.reasons.slice(0, 1).join('') || 'Available for this place'}</div>
                    </button>
                  );
                })}
              </div>
            </details>
          ) : null}

          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-4">
            <div className="flex items-center gap-2 font-black text-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
              What comes back
            </div>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Verified execution, supporting media or field notes, a timestamped place record, payout status, and a durable receipt. GPS proves presence—not a purchase or guaranteed business result.
            </p>
          </div>

          {formError ? (
            <div className="mt-4 rounded-2xl border border-red-300/30 bg-red-400/[0.09] px-4 py-3 text-sm font-semibold leading-6 text-red-100" role="alert">
              {formError}
            </div>
          ) : disabledReason ? (
            <p className="mt-4 text-sm font-semibold text-white/60">{disabledReason}</p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCreateCampaign}
              disabled={!canLaunchActivation}
              className="activation-raised-gold inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.1em] transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100/70"
            >
              <CreditCard className="h-4 w-4" />
              {creatingCampaign
                ? approvalStatus === 'approving'
                  ? 'Approve USDC in wallet…'
                  : approvalStatus === 'funding'
                    ? 'Funding mission…'
                    : approvalStatus === 'verifying'
                      ? 'Registering mission…'
                      : 'Creating mission…'
                : `Fund mission · $${formatUsdAmount(budget.total)} USDC`}
            </button>
            <Link
              href="/activations?source=buyer-portal&missionType=field-mission"
              className="activation-soft-button inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 py-3 text-sm font-black text-white/78 transition hover:border-white/24 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Request invoice setup
            </Link>
            <button
              type="button"
              onClick={closeComposer}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-sm font-black text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
