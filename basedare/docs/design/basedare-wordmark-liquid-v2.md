# Refined liquid wordmark — 12 October 2026

The original liquid BaseDare lettering is the foundation: upright proportions, curly braces, honey-gold BASE and violet DARE. PeeBear contributes bold black contours, a narrow warm cream rim and broad illustrated 3D facets. Controlled short drips replace the previous scratch-heavy lettering. A small black/cream X below the central junction forms an optional larger-size signature.

## Responsive usage

Navbar, Footer and legacy MobileNav use components/BaseDareWordmark.tsx. Native picture selection supplies the X version from 768px; the core uses Next Image optimization on phones. There is one image element, no resize listener or duplicated hidden image. Header uses eager/high-priority loading; other instances retain lazy loading. Intrinsic dimensions and existing fixed header footprints prevent layout movement. Reduced-motion hover and the existing home-link accessible name remain.

Use the core at 96–112px on phones and the signature around 224px in the desktop header. Keep transparent padding, avoid cropping braces/drips, and place it on a plain or visually quiet surface. Business mode uses the existing grayscale treatment. A grayscale presentation is not a one-color vector master.

| Asset | Dimensions | Bytes | Purpose |
| --- | --- | ---: | --- |
| public/assets/basedare-wordmark-liquid-v2.webp | 1024 × 258 | 95,396 | Core and optimized phone source |
| public/assets/basedare-wordmark-liquid-x-v2.webp | 1024 × 261 | 92,574 | Larger signature export |
| public/assets/basedare-wordmark-liquid-x-header-v2.webp | 512 × 130 | 29,122 | Direct desktop header source |

Original BASEDAREGOO.webp, basedare-logo.png and graffiti-v1 artwork remain available. This release supplies transparent raster assets. Editable vector, print, app-icon and true one-color masters are separate future work.

## Generation provenance

Mode: built-in imagegen. The original wordmark was the edit target and PeeBear was a style reference. The signature was a second edit of the generated core, with the bear's crossed eye as reference. Generated PNGs were preserved unchanged outside the repository in this chat's outputs/logo-liquid-v2 directory. Sharp only trimmed transparent margins, resized and encoded production WebP exports.

### Core prompt

```text
Use case: style-transfer / logo-brand.
Asset type: production transparent website wordmark for BaseDare.
Input image 1 is the ORIGINAL BaseDare wordmark and is the edit target. Input image 2, PeeBear, is a STYLE REFERENCE ONLY.
Refine image 1 into a polished, readable premium illustrated 3D wordmark. Text exactly "{BASEDARE}" spelled B A S E D A R E with integrated curly braces. Preserve the original upright block letter proportions, open counters, spacing, and gold BASE / purple DARE split. Keep a compact horizontal silhouette and the original liquid depth. Give letters thick slightly hand-inked black contours similar to PeeBear, a narrow warm cream outer keyline, broad sculpted gold/violet facets and consistent upper-left highlights with a short dark underside. Rich honey gold on BASE, deep saturated purple on DARE. Small deliberate cyan/magenta reflections only at a few edges. Fewer, short controlled honey drips; no tiny scratches or multicolor debris. The result must be very clear at 112px wide and have the confident weight of PeeBear. Slight outer edge roughness, clean interiors.
Composition: ONE centered horizontal core wordmark, roughly 4.5:1, with small transparent margins and every brace/drip fully in frame. Genuinely transparent background.
Do not add the X in this first core variant. No mascot, slogan, badge, panel, scene, glow cloud or extra text. Avoid italic brush graffiti letterforms, angular illegible wildstyle, thin chrome outlines or photoreal reflections. This is original BaseDare liquid 3D identity refined with the bold illustrated finish of PeeBear.
```

### Signature prompt

```text
Use case: precise-object-edit.
Asset type: optional transparent BaseDare signature lockup.
Input image 1 is the approved new core wordmark and is the EDIT TARGET. Input image 2 is PeeBear, a STYLE REFERENCE for the crossed eye only.
Keep image 1's lettering, braces, exact spelling "{BASEDARE}", gold BASE / purple DARE split, contours, lighting, highlights, drips, proportions and arrangement unchanged. Make only one addition: a small PeeBear-style rounded X below the optical centre at the BASE/DARE junction. Give the X a solid near-black interior, warm cream rim, and thick round crossed strokes matching the reference bear's X eye. The X should be about one fifth of a letter's height, with a little clear transparent breathing space below the lettering. Make it a subtle integrated signature; do not intersect or obscure any letters or drips. Keep it black and cream, not red. No circle, badge, glow or other additions. Preserve genuine transparency. Keep the full logo and X within the frame with a small transparent margin. Return one horizontal signature logo only, not a side-by-side sheet.
```
