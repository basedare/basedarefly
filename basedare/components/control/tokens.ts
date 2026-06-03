/**
 * Control Mode design tokens — the single source of truth for the BaseDare
 * "Control" surfaces (First Spark, Creator Radar, Brand Portal).
 *
 * Anchored on the First Spark / control-lobby DNA: subtle borders (white/0.09),
 * dark gradient panels, gold + purple accents, mono uppercase micro-labels.
 *
 * Use these instead of re-declaring per-page `raisedPanelClass` strings so the
 * three sections stay visually identical.
 */

/** Raised hero / section panel. */
export const controlPanel =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

/** Inset tile inside a panel (stats, snapshot rows). */
export const controlInset =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

/** Grid card (e.g. creator cards) — between panel and inset in weight. */
export const controlSoftCard =
  'relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_16%,rgba(12,12,19,0.94)_100%)] shadow-[0_22px_46px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

/** Mono uppercase micro-label (kicker / field label). */
export const controlMicroLabel =
  'text-[10px] font-black uppercase tracking-[0.22em] text-white/40';

/** Thin gradient hairline drawn across the top of a panel. */
export const controlHairline =
  'pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent';
