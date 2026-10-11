# Discovery UI consistency

The homepage remains the visual reference: dark physical surfaces, the bear and its world, gold identity, purple depth and restrained cyan/magenta paint accents. Keep hero art, Chaos/Control transitions, mobile orb and map markers distinct from ordinary content controls.

Public content pages opt into the utilities in app/global.css:

- `bd-page-top`: 32px above content on phones, 40px from 768px. The shared layout already reserves the navbar's height.
- `bd-page-title`: balanced headings, 32–56px, tight tracking and a readable 1.04 line height. The homepage and illustrated display headings retain their own scale.
- `bd-page-copy`: proportional body text, 14–16px, generous line height and an opaque muted lavender for readability over dark panels. Reserve mono lettering for short labels and technical values.
- `bd-page-kicker`: compact cyan labels. Repeated paint strokes were removed in the 12 October refinement.

Reuse `bd-action` for content controls: satin material, a minimum 46px height, visible focus and a pressed state. Gold identifies a main action; muted cyan and violet connect exploration and adventures to the brand. Secondary tools use neutral slate. Keep map controls scoped to their existing map styles. Avoid nesting a button inside a link.

## Quiet physical materials — 12 October 2026

The artwork carries the graffiti character. Ordinary controls should be clear, calm and tactile: smoked panels, inset fields, a short physical underside and one edge highlight. Do not repeat decorative two-line ticks on every button or panel. Preserve the illustrated bear, honey, map objects and orbital homepage.

- `bd-surface` / `bd-card`: consistent dark section panels and smaller cards with neutral edges and modest depth. Cards do not impose positioning, so dropdowns can remain absolute.
- `bd-well` / `bd-field`: inset materials; readable placeholders and a cyan keyboard-focus outline.
- `bd-back`: compact neutral return control with an inset arrow tile. Reuse it for Back to map and keep the caller's destination parameters.
- `bd-segmented`: quiet inset group, with a raised selected segment. Every button is at least 44px.
- `bd-empty`: a calm solid-edge empty state rather than a dashed container.
- `bd-verified`: restrained mint text/edge. Verification is a state, not a gold reward or live-event claim.

Now places meetup/adventure actions above a separate discovery-tools row. Activity/time filters and counts have less visual weight. List view uses sentence case and aligned cards; tape/pins retain its physical board character. Community, My activity, adventures, creator and Control panels reuse the shared materials.

Community identity is account-bound. A failed lookup offers retry; pending names show review status; signed-out visitors get sign-in. Only a successful lookup with no usable name offers Claim @tag, alongside Check account. An explicit different wallet cannot inherit the session account's name. Wallet-address comparisons accept legacy casing without changing ownership rules.

Consumer wording: paid dare, free challenge and meetup. A self-directed catalogue suggestion is a free adventure. Internal Spark/Rally identifiers and route parameters stay unchanged. Homepage participation labels come from the same source as Now. Phone filters form two columns; wider screens use a row. The homepage activity section recovers nested padding below 768px so narrow phone cards and filter labels have room. The hero retains its existing footprint. Compact header navigation is used below 1280px.

Preserve existing proof, safety, payment, network and authentication explanations. Do not imply that free challenges pay cash, or that self-reported adventures are verified activity.
