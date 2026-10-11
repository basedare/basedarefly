// Shared vector contours keep water pins and the surf guide in the same style.
// These are fixed artwork paths, never user-provided markup.
export const SURF_SPOT_PATHS = [
  { className: "surf-art-paint", d: "m4 35 37-7 3 7-35 6Z" },
  { className: "surf-art-body", d: "M4 34c9-2 12-8 15-17C23 5 33 3 42 10c-10-3-18 4-18 12 0 8 9 11 19 7l-3 8H7Z" },
  { className: "surf-art-shade", d: "M5 34c8-1 13-7 16-14-1 12 8 15 20 11l-1 6H7Z" },
  { className: "surf-art-foam", d: "M19 17C23 5 33 3 42 10c-8-2-14 1-17 7-2 4-2 7 0 10-6-4-6-10-2-14l-4 4Z" },
  { className: "surf-swell-crest surf-swell-crest--1", d: "M8 31c5-2 7-5 9-10" },
  { className: "surf-swell-crest surf-swell-crest--2", d: "M28 29c4 2 7 2 11 0" },
  { className: "surf-swell-crest surf-swell-crest--3", d: "m10 37 8-1" },
] as const;
