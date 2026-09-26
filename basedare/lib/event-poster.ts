export const MAX_EVENT_POSTER_BYTES = 4 * 1024 * 1024;
export function eventPosterError(file: { size: number; type: string }) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Choose a JPG or PNG poster.';
  if (!file.size || file.size > MAX_EVENT_POSTER_BYTES) return 'Choose a poster smaller than 4 MB.';
  return null;
}

// MIME declarations are not sufficient for public media uploads.
export function eventPosterMatchesBytes(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return type === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
}
