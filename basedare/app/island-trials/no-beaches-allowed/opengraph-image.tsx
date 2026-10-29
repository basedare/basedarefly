import { adventureOg } from '@/lib/adventure-og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'No Beaches Allowed — BaseDare Island Trial #001';
export default function Image() { return adventureOg({ title: 'No Beaches Allowed.', eyebrow: 'ISLAND TRIAL #001', invitation: 'Pick an island. Show what makes it special without a beach.', footer: 'Free to try · your own attempt · sharing is optional' }); }
