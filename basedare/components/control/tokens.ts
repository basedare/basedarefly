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
  'bd-surface relative overflow-hidden';

/** Inset tile inside a panel (stats, snapshot rows). */
export const controlInset =
  'bd-well';

/** Grid card (e.g. creator cards) — between panel and inset in weight. */
export const controlSoftCard =
  'bd-card relative overflow-hidden';

/** Mono uppercase micro-label (kicker / field label). */
export const controlMicroLabel =
  'text-[10px] font-black uppercase tracking-[0.22em] text-white/40';

/** Thin gradient hairline drawn across the top of a panel. */
export const controlHairline =
  'pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent';
