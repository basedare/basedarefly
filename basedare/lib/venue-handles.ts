type VenueHandleInput = {
  slug: string | null | undefined;
  city?: string | null;
  country?: string | null;
  metadataJson?: unknown;
};

const VENUE_HANDLE_OVERRIDES: Record<string, string> = {
  hideaway: 'hideaway.siargao',
  'the-cat-and-gun': 'catngun.siargao',
  'siargao-beach-club': 'siargao-beach-club',
  'cloud-9-boardwalk': 'cloud9.siargao',
  'mr-turtle-siargao': 'mr-turtle.siargao',
  'gaya-rooftop-space': 'gaya.siargao',
};

const BASECASH_PILOT_VENUE_SLUGS = new Set(['hideaway', 'the-cat-and-gun']);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getMetadataHandle(metadataJson: unknown) {
  const metadata = asRecord(metadataJson);
  if (!metadata) return null;

  const rawHandle = metadata.handle ?? metadata.venueHandle ?? metadata.venueTag;
  return typeof rawHandle === 'string' ? rawHandle : null;
}

export function normalizeVenueHandle(value: string | null | undefined) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');

  return normalized && normalized.length >= 2 ? normalized : null;
}

export function deriveVenueHandle(input: VenueHandleInput) {
  const metadataHandle = normalizeVenueHandle(getMetadataHandle(input.metadataJson));
  if (metadataHandle) return metadataHandle;

  const slug = normalizeVenueHandle(input.slug);
  if (!slug) return null;

  const override = VENUE_HANDLE_OVERRIDES[slug];
  if (override) return override;

  const city = input.city?.toLowerCase() ?? '';
  const country = input.country?.toLowerCase() ?? '';
  const isSiargaoArea =
    slug.includes('siargao') ||
    city.includes('siargao') ||
    city.includes('general luna') ||
    country.includes('philippines');

  if (!isSiargaoArea) return slug;

  const base = slug.replace(/-?siargao$/g, '').replace(/-?general-luna$/g, '');
  return normalizeVenueHandle(`${base}.siargao`);
}

export function formatVenueHandle(handle: string | null | undefined) {
  const normalized = normalizeVenueHandle(handle);
  return normalized ? `@${normalized}` : null;
}

export function isBaseCashPilotVenue(slug: string | null | undefined) {
  const normalized = normalizeVenueHandle(slug);
  return Boolean(normalized && BASECASH_PILOT_VENUE_SLUGS.has(normalized));
}
