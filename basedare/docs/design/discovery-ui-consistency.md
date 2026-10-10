# Discovery UI consistency

The homepage remains the visual reference: dark physical surfaces, the bear and its world, gold identity, purple depth and restrained cyan/magenta paint accents. Keep hero art, Chaos/Control transitions, mobile orb and map markers distinct from ordinary content controls.

Public content pages opt into the utilities in app/global.css:

- `bd-page-top`: 32px above content on phones, 40px from 768px. The shared layout already reserves the navbar's height.
- `bd-page-title`: balanced headings, 32–56px, tight tracking and a readable 1.04 line height. The homepage and illustrated display headings retain their own scale.
- `bd-page-copy`: proportional body text, 14–16px, generous line height and an opaque muted lavender for readability over dark panels. Reserve mono lettering for short labels and technical values.
- `bd-page-kicker`: compact cyan labels with a static cyan/magenta paint stroke. Decorative, no animation, no input interception.

Reuse `bd-action` for content controls: raised material, a minimum 44px height, visible focus and a pressed state. Gold identifies a main action, cyan an exploration link, violet an adventure and quiet gold a PeeBear action. Keep map controls scoped to their existing map styles. Avoid nesting a button inside a link.

Consumer wording: paid dare, free challenge and meetup. A self-directed catalogue suggestion is a free adventure. Internal Spark/Rally identifiers and route parameters stay unchanged. Homepage participation labels come from the same source as Now. Phone filters form two columns; wider screens use a row. The homepage activity section recovers nested padding below 768px so narrow phone cards and filter labels have room. The hero retains its existing footprint. Compact header navigation is used below 1280px.

Preserve existing proof, safety, payment, network and authentication explanations. Do not imply that free challenges pay cash, or that self-reported adventures are verified activity.
